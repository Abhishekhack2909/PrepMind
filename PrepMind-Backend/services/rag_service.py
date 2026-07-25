"""
RAG Service — Retrieval Augmented Generation (crash-safe, optional)

HOW RAG WORKS (Learning):
  1. INDEXING (once): documents → chunks → embeddings → ChromaDB
  2. RETRIEVAL (per query): question → embedding → top-K similar chunks
  3. GENERATION: chunks + question → LLM → grounded answer

⚠️  ENVIRONMENT NOTE (why RAG can be disabled):
  On some Windows setups the native pieces of the vector stack crash the whole
  Python process (not a catchable exception):
    - chromadb 1.5.x's Rust core can segfault on `add`/`count`/`query`
    - onnxruntime's DLL can fail to initialise
    - torch inference crashes when numpy 2.x is installed (needs numpy<2)
  A native crash cannot be caught with try/except, so if the vector stack is
  unhealthy it takes the API server down with it.

  To stay reliable we gate ALL vector work behind `RAG_ENABLED`:
    - RAG_ENABLED=false (default) → ChromaDB/torch are never imported or called.
      retrieve_context() returns [] and every AI feature falls back to the LLM's
      own (strong) UPSC knowledge. The app works end-to-end.
    - RAG_ENABLED=true → the knowledge base is used (only flip this on once the
      native stack is verified healthy on the host).
"""

import os
from typing import List, Dict, Any

RAG_ENABLED = os.getenv("RAG_ENABLED", "false").strip().lower() in ("1", "true", "yes", "on")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_db")

# These are created lazily only when RAG is enabled, so a broken native stack
# never loads at import time.
_client = None
_collection = None
_init_error: str | None = None


def _get_collection():
    """Lazily create the ChromaDB collection. Returns None if RAG is disabled
    or initialisation fails (Python-level failures only — see the env note)."""
    global _client, _collection, _init_error
    if not RAG_ENABLED:
        return None
    if _collection is not None:
        return _collection
    if _init_error is not None:
        return None
    try:
        import chromadb
        from chromadb.utils import embedding_functions

        _client = chromadb.PersistentClient(path=DB_PATH)
        embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        _collection = _client.get_or_create_collection(
            name="prepmind_knowledge",
            embedding_function=embedding_fn,
            metadata={"hnsw:space": "cosine"},
        )
        return _collection
    except Exception as e:  # noqa: BLE001
        _init_error = str(e)
        print(f"[WARN] RAG init failed, disabling knowledge base: {e}")
        return None


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    """Split a large document into overlapping ~chunk_size-word chunks."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        start += chunk_size - overlap
    return chunks


def ingest_document(text: str, source: str, doc_type: str = "notes") -> int:
    """Ingest a document into ChromaDB. No-op (returns 0) when RAG is disabled."""
    collection = _get_collection()
    if collection is None:
        return 0
    chunks = chunk_text(text)
    existing = collection.count()
    ids = [f"{source}_{existing + i}" for i in range(len(chunks))]
    metadatas = [{"source": source, "type": doc_type, "chunk": i} for i in range(len(chunks))]
    collection.add(documents=chunks, ids=ids, metadatas=metadatas)
    return len(chunks)


def retrieve_context(query: str, top_k: int = 4) -> List[Dict[str, Any]]:
    """Return the most relevant chunks for a question.

    Always returns [] when RAG is disabled/unavailable so callers transparently
    fall back to the LLM's own knowledge instead of crashing.
    """
    collection = _get_collection()
    if collection is None:
        return []
    try:
        if collection.count() == 0:
            return []
        results = collection.query(
            query_texts=[query],
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )
        chunks = []
        for i, doc in enumerate(results["documents"][0]):
            chunks.append({
                "text": doc,
                "source": results["metadatas"][0][i].get("source", "unknown"),
                "distance": results["distances"][0][i],
            })
        return chunks
    except Exception as e:  # noqa: BLE001
        print(f"[WARN] retrieve_context failed: {e}")
        return []


def get_stats() -> Dict[str, Any]:
    """Return knowledge base statistics (or a disabled marker)."""
    if not RAG_ENABLED:
        return {"enabled": False, "total_chunks": 0, "note": "RAG disabled (set RAG_ENABLED=true to enable)"}
    collection = _get_collection()
    if collection is None:
        return {"enabled": False, "total_chunks": 0, "error": _init_error}
    try:
        return {"enabled": True, "total_chunks": collection.count(), "db_path": DB_PATH}
    except Exception as e:  # noqa: BLE001
        return {"enabled": False, "total_chunks": 0, "error": str(e)}
