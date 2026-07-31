"""
RAG Service — Retrieval Augmented Generation (Supabase pgvector + Gemini embeddings)

HOW RAG WORKS:
  1. INDEXING (once):  documents → chunks → embeddings → knowledge_chunks table
  2. RETRIEVAL (per query): question → embedding → nearest chunks (cosine)
  3. GENERATION: chunks + question → LLM → answer grounded in real source text

WHY THIS IMPLEMENTATION:
  The original version used ChromaDB + sentence-transformers. Both caused hard
  failures: ChromaDB's Rust core segfaulted the process on some Windows hosts,
  and torch (needed by sentence-transformers) is ~200MB and OOMs small cloud
  instances. Neither is catchable in Python, so a single RAG call could take the
  whole API server down.

  Now: Postgres (which we already have via Supabase) + the pgvector extension,
  with embeddings from the Gemini HTTP API. Zero native dependencies, so it runs
  the same on a laptop and on a 512MB server.

SETUP: run `supabase_rag.sql` once to create the table + match_knowledge() RPC.

Every function degrades gracefully — if embeddings or the DB are unavailable,
retrieval returns [] and callers fall back to the LLM's own knowledge rather
than erroring out.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List

from services.embeddings import EMBED_DIMS, embed_documents, embed_query

# RAG can be force-disabled without touching code (e.g. if the Gemini quota is
# exhausted). Defaults to ON now that there's no native crash risk.
RAG_ENABLED = os.getenv("RAG_ENABLED", "true").strip().lower() in ("1", "true", "yes", "on")

_supabase = None


def _get_supabase():
    """Lazily create the Supabase client (service key — bypasses RLS to write)."""
    global _supabase
    if _supabase is None:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY not configured")
        _supabase = create_client(url, key)
    return _supabase


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    """Split a document into overlapping ~chunk_size-word chunks.

    The overlap matters: without it, a fact sitting on a chunk boundary gets cut
    in half and neither chunk retrieves well.
    """
    words = text.split()
    if not words:
        return []
    chunks: List[str] = []
    start = 0
    step = max(1, chunk_size - overlap)
    while start < len(words):
        chunks.append(" ".join(words[start:min(start + chunk_size, len(words))]))
        start += step
    return chunks


def ingest_document(text: str, source: str, doc_type: str = "notes") -> int:
    """Chunk + embed a document and store it. Returns the number of chunks added."""
    if not RAG_ENABLED:
        return 0

    chunks = chunk_text(text)
    if not chunks:
        return 0

    total = 0
    # Batch to stay well within API payload limits on large documents.
    BATCH = 50
    for i in range(0, len(chunks), BATCH):
        batch = chunks[i:i + BATCH]
        vectors = embed_documents(batch)
        if not vectors:
            print("[WARN] ingest aborted — embeddings unavailable")
            break
        rows = [
            {
                "content": chunk,
                "source": source,
                "doc_type": doc_type,
                "chunk_index": i + j,
                "embedding": vectors[j],
            }
            for j, chunk in enumerate(batch)
        ]
        try:
            _get_supabase().table("knowledge_chunks").insert(rows).execute()
            total += len(rows)
        except Exception as e:  # noqa: BLE001
            print(f"[WARN] failed to store chunk batch: {e}")
            break
    return total


def retrieve_context(query: str, top_k: int = 4) -> List[Dict[str, Any]]:
    """Return the most semantically similar chunks for a question.

    Returns [] (never raises) when RAG is disabled or anything is unavailable, so
    callers transparently fall back to the LLM's own knowledge.
    """
    if not RAG_ENABLED or not query.strip():
        return []

    vector = embed_query(query)
    if vector is None:
        return []

    try:
        res = _get_supabase().rpc(
            "match_knowledge",
            {
                "query_embedding": vector,
                "match_count": top_k,
                # Filters out weak matches so we don't feed the LLM irrelevant
                # context, which is worse than giving it none at all.
                "min_similarity": 0.35,
            },
        ).execute()
        rows = res.data or []
    except Exception as e:  # noqa: BLE001
        print(f"[WARN] retrieve_context failed: {e}")
        return []

    return [
        {
            "text": r.get("content", ""),
            "source": r.get("source", "unknown"),
            # Kept for API compatibility with the old ChromaDB shape, where
            # lower distance = closer. similarity 1.0 → distance 0.0
            "distance": round(1.0 - float(r.get("similarity", 0.0)), 4),
            "similarity": round(float(r.get("similarity", 0.0)), 4),
        }
        for r in rows
    ]


def get_stats() -> Dict[str, Any]:
    """Knowledge base statistics (never raises — used by a public endpoint)."""
    if not RAG_ENABLED:
        return {"enabled": False, "total_chunks": 0, "note": "RAG disabled (set RAG_ENABLED=true)"}
    try:
        res = _get_supabase().table("knowledge_chunks").select("id", count="exact").limit(1).execute()
        return {
            "enabled": True,
            "total_chunks": res.count or 0,
            "backend": "supabase pgvector",
            "embedding_model": "gemini-embedding-001",
            "dimensions": EMBED_DIMS,
        }
    except Exception as e:  # noqa: BLE001
        return {"enabled": False, "total_chunks": 0, "error": str(e)}
