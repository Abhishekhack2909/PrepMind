"""
Embeddings Service — Gemini API (no native dependencies)

WHY AN API INSTEAD OF A LOCAL MODEL:
  The original stack used sentence-transformers (`all-MiniLM-L6-v2`), which
  requires torch. That caused two hard problems:
    1. torch inference crashed the whole process on some Windows hosts
       (native crash, so not catchable with try/except)
    2. torch is ~200MB and OOMs small cloud instances (e.g. Render free tier)

  Gemini's embedding endpoint is a plain HTTPS call — no torch, no onnxruntime,
  no native wheels — so it works identically on dev machines and tiny servers.

Model: gemini-embedding-001.
  It returns 3072 dimensions by default, but we request 768 because pgvector's
  ivfflat index only supports up to 2000 dimensions (and 768 is plenty for this
  corpus while keeping the table small).

  This model uses Matryoshka representation learning, so shorter vectors are
  valid prefixes — but Google only L2-normalises the full-length output, so we
  re-normalise after truncation. Cosine similarity assumes unit vectors, and
  skipping this quietly degrades ranking quality.

  `task_type` matters: use RETRIEVAL_DOCUMENT when indexing and RETRIEVAL_QUERY
  when searching. Google trains these asymmetrically, so matching them up gives
  noticeably better retrieval than using one type for both.
"""

from __future__ import annotations

import math
import os
from typing import List, Optional

EMBED_MODEL = "gemini-embedding-001"
EMBED_DIMS = 768


def _normalize(vector: List[float]) -> List[float]:
    """L2-normalise so cosine distance behaves correctly after MRL truncation."""
    norm = math.sqrt(sum(v * v for v in vector))
    if norm == 0:
        return vector
    return [v / norm for v in vector]

_client = None


def _get_client():
    """Lazily build the Gemini client so importing this module never fails."""
    global _client
    if _client is None:
        from google import genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set — cannot create embeddings")
        _client = genai.Client(api_key=api_key)
    return _client


def _embed(texts: List[str], task_type: str) -> Optional[List[List[float]]]:
    """Embed a batch of texts. Returns None on failure (callers degrade gracefully)."""
    if not texts:
        return []
    try:
        from google.genai import types
        client = _get_client()
        result = client.models.embed_content(
            model=EMBED_MODEL,
            contents=texts,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=EMBED_DIMS,
            ),
        )
        return [_normalize(list(e.values)) for e in result.embeddings]
    except Exception as e:  # noqa: BLE001
        print(f"[WARN] embedding failed ({task_type}): {e}")
        return None


def embed_documents(texts: List[str]) -> Optional[List[List[float]]]:
    """Embed chunks for storage in the knowledge base."""
    return _embed(texts, "RETRIEVAL_DOCUMENT")


def embed_query(text: str) -> Optional[List[float]]:
    """Embed a single search query. Returns None if embedding is unavailable."""
    vectors = _embed([text], "RETRIEVAL_QUERY")
    if not vectors:
        return None
    return vectors[0]
