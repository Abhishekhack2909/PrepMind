"""
LLM Service — Fast text generation using Groq

Groq runs open-source LLMs (llama3, mixtral) on custom ASIC chips.
Result: extremely fast inference — often 10x faster than OpenAI.

We use Groq for:
  - Generating RAG answers (Phase 3)
  - Voice doubt answers (Phase 4)
  - MCQ generation (Phase 5)
  - Conversational Voice Agent (Phase 10)

The GROQ API is OpenAI-compatible, so the client looks familiar.
"""

import os
from typing import List, Dict, Optional
from groq import AsyncGroq

_groq_client: Optional[AsyncGroq] = None

def _get_groq_client() -> AsyncGroq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable is not set")
        _groq_client = AsyncGroq(api_key=api_key)
    return _groq_client

RAG_SYSTEM_PROMPT = """You are an expert UPSC tutor with deep knowledge of Indian history,
polity, geography, economy, and current affairs.

Ground your answer in the provided context when it is relevant to the question.
If the context is not relevant or doesn't cover the question, answer confidently
from your own UPSC knowledge instead — never refuse a question just because the
context doesn't mention it.

Rules:
- Be concise but thorough (150-250 words ideal)
- Use simple, clear language
- If relevant, mention the source of information
- Structure your answer: key point → explanation → example (if applicable)
- End with a one-line takeaway for quick revision"""

VOICE_AGENT_SYSTEM_PROMPT = """You are PrepMind, a warm and engaging UPSC voice tutor having a real spoken conversation with a student.

Your personality:
- Friendly, encouraging, and clear — like a great human teacher
- You remember what was discussed earlier in this conversation
- You never repeat introductions or greetings after the first turn

Answer rules (CRITICAL — this will be read aloud):
- Keep responses SHORT: 80-120 words maximum
- No bullet points, no markdown, no asterisks — speak naturally
- Use conversational connectors: "So, the key thing here is...", "Building on that...", "Great question!"
- Always end with a follow-up hook: a brief question or invitation to go deeper (e.g., "Want me to explain that in more detail?")
- If context is provided, ground your answer in it; otherwise use your knowledge
- Be factually accurate — UPSC demands precision"""


async def generate_rag_answer(question: str, context_chunks: list) -> dict:
    """
    Generate an answer grounded in retrieved context chunks.

    Args:
        question: Student's question
        context_chunks: List of relevant text chunks from ChromaDB

    Returns:
        dict with 'answer', 'sources', 'model'
    """
    if not context_chunks:
        context_text = "No specific context available."
        sources = []
    else:
        context_text = "\n\n---\n\n".join([
            f"[Source: {c['source']}]\n{c['text']}"
            for c in context_chunks
        ])
        sources = list(set(c["source"] for c in context_chunks))

    user_message = f"""CONTEXT:
{context_text}

QUESTION: {question}

Answer the question. Use the context if helpful; otherwise use your own knowledge."""

    try:
        client = _get_groq_client()
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=400,
        )

        answer = response.choices[0].message.content
        return {
            "success": True,
            "answer": answer,
            "sources": sources,
            "model": "llama3-8b-8192",
            "tokens_used": response.usage.total_tokens,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


async def generate_simple_answer(question: str) -> dict:
    """
    Direct answer without RAG context — for general UPSC questions.
    Used as fallback when knowledge base is empty.
    """
    try:
        client = _get_groq_client()
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are an expert UPSC tutor. Answer concisely in 150-200 words."},
                {"role": "user", "content": question},
            ],
            temperature=0.4,
            max_tokens=300,
        )
        return {
            "success": True,
            "answer": response.choices[0].message.content,
            "sources": ["General Knowledge"],
            "model": "llama3-8b-8192",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def generate_conversational_answer(
    question: str,
    context_chunks: list,
    history: List[Dict[str, str]],
) -> dict:
    """
    Generate a short, spoken-friendly answer for the voice agent.

    Args:
        question: The latest user question
        context_chunks: RAG-retrieved UPSC knowledge chunks
        history: List of past turns — [{"role": "user"|"assistant", "content": "..."}]
                 Only the last 6 turns are used to keep token count manageable.

    Returns:
        dict with 'answer', 'sources', 'success'

    Why shorter answers?
        Voice responses need to be 15-25 seconds long at natural speech rate.
        80-120 words ≈ 20-30 seconds. Longer answers lose the listener.
    """
    # Build context string from retrieved chunks
    if context_chunks:
        context_text = "\n\n---\n\n".join([
            f"[Source: {c['source']}]\n{c['text']}"
            for c in context_chunks
        ])
        sources = list(set(c["source"] for c in context_chunks))
        user_content = f"CONTEXT:\n{context_text}\n\nSTUDENT SAYS: {question}"
    else:
        context_text = ""
        sources = ["General Knowledge"]
        user_content = f"STUDENT SAYS: {question}"

    # Build message array: system → (history last 6 turns) → current question
    recent_history = history[-6:] if len(history) > 6 else history
    messages = [{"role": "system", "content": VOICE_AGENT_SYSTEM_PROMPT}]
    messages.extend(recent_history)
    messages.append({"role": "user", "content": user_content})

    try:
        client = _get_groq_client() # groq client
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.5,
            max_tokens=200,
        )
        answer = response.choices[0].message.content.strip()
        return {
            "success": True,
            "answer": answer,
            "sources": sources,
            "model": "llama-3.1-8b-instant",
            "tokens_used": response.usage.total_tokens,
        }
    except Exception as e: # groq client 
        return {"success": False, "error": str(e)}
