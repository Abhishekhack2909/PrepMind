"""
RAG Service — Retrieval Augmented Generation

HOW RAG WORKS (Learning):
  1. INDEXING (done once):
     - Take documents (NCERT chapters, PYQs, notes)
     - Split into small chunks (~300 words each)
     - Convert each chunk to a vector (embedding) — a list of 384 numbers
       that captures the "meaning" of the text
     - Store all vectors in ChromaDB (a vector database)

  2. RETRIEVAL (at query time):
     - Convert the user's question to a vector (same embedding model)
     - Find the top-K chunks whose vectors are closest to the question vector
     - "Closest" = most semantically similar, even without exact word matches

  3. GENERATION:
     - Pass retrieved chunks + question to Groq LLM
     - LLM generates an answer grounded in the retrieved content
     - This prevents "hallucination" — the LLM can only use what we give it

WHY ChromaDB:
  - Stores vectors + metadata (doc name, page, chunk_id)
  - Fast similarity search (cosine distance)
  - Runs locally — no cloud needed during dev
  - Persists to disk (chroma_db/ folder)

WHY Groq for generation (not Gemini):
  - Groq runs llama3 on custom hardware — extremely fast (tokens/sec)
  - Free tier is generous for dev use
  - Gemini is better for Vision tasks; Groq for fast text generation
"""

import os
from typing import List, Dict, Any
import chromadb
from chromadb.utils import embedding_functions

# ── ChromaDB Setup ─────────────────────────────────────────────────────────────
# PersistentClient saves the vector store to disk so data survives restarts
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
client = chromadb.PersistentClient(path=DB_PATH)

# Use SentenceTransformer for embeddings — all-MiniLM-L6-v2 is fast and good
# It converts text → 384-dimensional vector or we can use other
embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# Get or create the collection (like a table in a regular DB)
collection = client.get_or_create_collection(
    name="prepmind_knowledge",
    embedding_function=embedding_fn,
    metadata={"hnsw:space": "cosine"}  # Use cosine similarity
)


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    """
    Split a large document into overlapping chunks.

    Why overlap? If an answer spans two chunks, the overlap ensures
    the context isn't cut off abruptly.

    chunk_size=400 words is a balance:
    - Too small: loses context
    - Too large: dilutes relevance, costs more tokens
    """
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap  # overlap keeps context at boundaries
    return chunks


def ingest_document(text: str, source: str, doc_type: str = "notes") -> int:
    """
    Ingest a document into ChromaDB.

    Args:
        text: Full document text
        source: Name/title of document (e.g., "NCERT Polity Ch1")
        doc_type: Category — "ncert", "pyq", "notes", "current_affairs"

    Returns:
        Number of chunks added
    """
    chunks = chunk_text(text)
    existing = collection.count()

    ids = [f"{source}_{existing + i}" for i in range(len(chunks))]
    metadatas = [{"source": source, "type": doc_type, "chunk": i} for i in range(len(chunks))]

    collection.add(documents=chunks, ids=ids, metadatas=metadatas)
    return len(chunks)


def retrieve_context(query: str, top_k: int = 4) -> List[Dict[str, Any]]:
    """
    Find the most relevant chunks for a question.

    Args:
        query: User's question
        top_k: Number of chunks to return (4 is usually enough context)

    Returns:
        List of dicts with 'text', 'source', 'distance'
    """
    if collection.count() == 0:
        return []

    results = collection.query(
        query_texts=[query],
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"]
    )

    chunks = []
    for i, doc in enumerate(results["documents"][0]):
        chunks.append({
            "text": doc,
            "source": results["metadatas"][0][i].get("source", "unknown"),
            "distance": results["distances"][0][i],  # Lower = more similar
        })
    return chunks


def get_stats() -> Dict[str, Any]:
    """Return knowledge base statistics."""
    return {
        "total_chunks": collection.count(),
        "db_path": DB_PATH,
    }
