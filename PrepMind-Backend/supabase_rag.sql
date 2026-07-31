-- PrepMind RAG storage (pgvector)
-- Paste into Supabase Dashboard → SQL Editor → Run.
--
-- WHY pgvector instead of ChromaDB:
--   ChromaDB's native/Rust core segfaults on some Windows hosts and its
--   sentence-transformers embedder pulls in torch (~200MB), which OOMs small
--   cloud instances. Supabase already gives us Postgres, and pgvector needs no
--   native Python deps at all — embeddings come from the Gemini API instead.
--
-- Embedding model: Gemini gemini-embedding-001, truncated to 768 dimensions
-- (pgvector's ivfflat index supports at most 2000 dims; the model's native 3072
-- would be rejected).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  doc_type TEXT DEFAULT 'notes',
  chunk_index INTEGER DEFAULT 0,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Approximate-nearest-neighbour index for cosine distance.
-- lists=100 suits up to ~100k rows; raise it if the corpus grows a lot.
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx ON knowledge_chunks (source);

-- Similarity search RPC. Returns the closest chunks to a query embedding.
-- `similarity` is 1 - cosine_distance, so 1.0 = identical, 0.0 = unrelated.
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(768),
  match_count INT DEFAULT 4,
  min_similarity FLOAT DEFAULT 0.0
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  source TEXT,
  doc_type TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id,
    kc.content,
    kc.source,
    kc.doc_type,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> query_embedding) >= min_similarity
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- The knowledge base is shared reference material (NCERT/PYQ content), not user
-- data: readable by everyone, writable only by the backend's service key.
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Knowledge is readable by all" ON knowledge_chunks;
CREATE POLICY "Knowledge is readable by all" ON knowledge_chunks
  FOR SELECT USING (true);
