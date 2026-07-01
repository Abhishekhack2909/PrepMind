"""
Voice Router — Phase 4 + Phase 10 (Conversational Voice Agent)

Endpoints:
  POST /api/voice/transcribe  — Transcribe audio → text (Groq Whisper)
  POST /api/voice/ask         — Audio → transcribe → RAG answer (combined)
  POST /api/voice/chat        — Text + history → conversational RAG answer (NEW)

Phase 10 — Conversational Agent flow:
  The browser handles STT (Web Speech API) and TTS (speechSynthesis) natively.
  The backend only needs to do: question + history → RAG + LLM → spoken answer.
  This keeps the round-trip fast and avoids audio upload overhead on web.

  Flow:
    1. User speaks → browser transcribes to text
    2. Frontend POSTs { question, history } to /api/voice/chat
    3. Backend: RAG retrieval + Groq LLM with conversation history
    4. Returns { answer, sources, updated_history }
    5. Frontend speaks the answer aloud via speechSynthesis
    6. Browser auto-resumes mic for next turn
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
from groq import AsyncGroq
from services.rag_service import retrieve_context
from services.llm_service import (
    generate_rag_answer,
    generate_simple_answer,
    generate_conversational_answer,
)

router = APIRouter(prefix="/api/voice", tags=["Voice"])

_groq_client: AsyncGroq | None = None

def _get_groq_client() -> AsyncGroq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable is not set")
        _groq_client = AsyncGroq(api_key=api_key)
    return _groq_client


# ── Request/Response Models ────────────────────────────────────────────────────

class ConversationTurn(BaseModel):
    role: str     # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str                        # Latest question from user
    history: List[ConversationTurn] = [] # Past turns in the session
    use_rag: bool = True                 # Retrieve from knowledge base


class ChatResponse(BaseModel):
    success: bool
    answer: str
    sources: List[str] = []
    updated_history: List[ConversationTurn] = []
    context_used: int = 0


# ── POST /api/voice/chat ────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def voice_chat(req: ChatRequest):
    """
    Conversational voice agent endpoint.

    Accepts the user's latest question plus all previous conversation turns.
    Returns a short, spoken-friendly answer and the updated conversation history.

    The response is optimized for voice (80-120 words, no markdown, warm tone).
    The frontend will speak this aloud using speechSynthesis and append it to
    the history before sending the next turn.
    """
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Build history as plain dicts for llm_service
    history_dicts: List[Dict[str, str]] = [
        {"role": t.role, "content": t.content}
        for t in req.history
    ]

    # RAG retrieval
    chunks = []
    if req.use_rag:
        chunks = retrieve_context(question, top_k=3)

    # Generate conversational response
    result = await generate_conversational_answer(
        question=question,
        context_chunks=chunks,
        history=history_dicts,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to generate answer"),
        )

    answer = result["answer"]

    # Append this turn to history so the client can send it back next time
    updated_history = list(req.history) + [
        ConversationTurn(role="user", content=question),
        ConversationTurn(role="assistant", content=answer),
    ]

    return ChatResponse(
        success=True,
        answer=answer,
        sources=result.get("sources", []),
        updated_history=updated_history,
        context_used=len(chunks),
    )


# ── POST /api/voice/transcribe ─────────────────────────────────────────────────

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form(default="en"),     # "en" or "hi" for Hindi
):
    """
    Transcribe audio file to text using Groq Whisper.

    Accepts: .wav, .mp3, .m4a, .webm, .ogg
    Returns: { transcription: str, duration_seconds: float }
    """
    # Read audio bytes
    audio_bytes = await audio.read()

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    if len(audio_bytes) > 25 * 1024 * 1024:  # 25MB limit
        raise HTTPException(status_code=400, detail="Audio file too large (max 25MB)")

    try:
        client = _get_groq_client()
        transcription = await client.audio.transcriptions.create(
            model="whisper-large-v3-turbo",
            file=(audio.filename or "audio.wav", audio_bytes),
            language=language,
            response_format="json",
        )

        return {
            "success": True,
            "transcription": transcription.text,
            "language": language,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# ── POST /api/voice/ask ────────────────────────────────────────────────────────

@router.post("/ask")
async def voice_ask(
    audio: UploadFile = File(...),
    language: str = Form(default="en"),
):
    """
    Combined endpoint: transcribe audio + RAG answer in one call.
    
    Returns:
      { transcription, answer, sources, context_used }
    """
    # Step 1: Transcribe
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        client = _get_groq_client()
        transcription = await client.audio.transcriptions.create(
            model="whisper-large-v3-turbo",
            file=(audio.filename or "audio.wav", audio_bytes),
            language=language,
            response_format="json",
        )
        question = transcription.text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    if not question:
        raise HTTPException(status_code=400, detail="Could not transcribe audio — please speak clearly")

    # Step 2: RAG retrieval + answer
    chunks = retrieve_context(question, top_k=4)
    if chunks:
        result = await generate_rag_answer(question, chunks)
    else:
        result = await generate_simple_answer(question)

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Answer generation failed"))

    return {
        "success": True,
        "transcription": question,
        "answer": result["answer"],
        "sources": result.get("sources", []),
        "context_used": len(chunks),
    }

