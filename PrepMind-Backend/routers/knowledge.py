"""
Knowledge Router — Phase 3

Endpoints:
  POST /api/ask      — Ask a question, get RAG-powered answer
  POST /api/ingest   — Upload document text to knowledge base
  GET  /api/kb/stats — Knowledge base stats (chunk count, etc.)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.rag_service import retrieve_context, ingest_document, get_stats
from services.llm_service import generate_rag_answer, generate_simple_answer

router = APIRouter(prefix="/api", tags=["Knowledge"])


# ── Request Models ─────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str                          # Student's question
    use_rag: bool = True                   # Use vector search or just LLM
    top_k: int = 4                         # Number of context chunks to retrieve

class IngestRequest(BaseModel):
    text: str                              # Document content
    source: str                            # e.g., "NCERT Polity Ch 1"
    doc_type: str = "notes"                # "ncert", "pyq", "notes", "current_affairs"

class AskResponse(BaseModel):
    success: bool
    answer: Optional[str] = None
    sources: Optional[list] = None
    context_used: Optional[int] = None    # How many chunks were retrieved
    error: Optional[str] = None


# ── POST /api/ask ──────────────────────────────────────────────────────────────

@router.post("/ask", response_model=AskResponse)
async def ask_question(req: AskRequest):
    """
    RAG Q&A endpoint.

    Flow:
      1. Convert question to embedding vector
      2. Search ChromaDB for top_k most similar chunks
      3. Pass chunks + question to Groq LLM
      4. Return grounded answer with source citations
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if req.use_rag:
        # Retrieve relevant context from knowledge base
        chunks = retrieve_context(req.question, top_k=req.top_k)

        if chunks:
            result = await generate_rag_answer(req.question, chunks)
        else:
            # Knowledge base empty — fall back to general LLM answer
            result = await generate_simple_answer(req.question)
    else:
        # Skip RAG — direct LLM answer
        chunks = []
        result = await generate_simple_answer(req.question)

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate answer"))

    return AskResponse(
        success=True,
        answer=result["answer"],
        sources=result.get("sources", []),
        context_used=len(chunks) if req.use_rag else 0,
    )


# ── POST /api/ingest ───────────────────────────────────────────────────────────

@router.post("/ingest")
async def ingest_doc(req: IngestRequest):
    """
    Add a document to the knowledge base.
    Text is chunked and embedded into ChromaDB.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Document text cannot be empty")

    chunks_added = ingest_document(
        text=req.text,
        source=req.source,
        doc_type=req.doc_type,
    )

    return {
        "success": True,
        "chunks_added": chunks_added,
        "source": req.source,
        "message": f"Added {chunks_added} chunks from '{req.source}' to knowledge base"
    }


# ── GET /api/kb/stats ──────────────────────────────────────────────────────────

@router.get("/kb/stats")
async def kb_stats():
    """Return knowledge base statistics."""
    return get_stats()
