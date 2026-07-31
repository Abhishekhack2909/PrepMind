"""
Seed the knowledge base (Supabase pgvector + Gemini embeddings).

PREREQUISITES:
  1. Run `supabase_rag.sql` in the Supabase SQL Editor (creates the table + RPC)
  2. GEMINI_API_KEY, SUPABASE_URL and SUPABASE_SERVICE_KEY set in .env

USAGE:
  python seed_knowledge.py                 # ingest knowledge_base/upsc_content.txt
  python seed_knowledge.py --stats         # show current chunk count
  python seed_knowledge.py --reset         # delete all chunks, then re-ingest
  python seed_knowledge.py path/to/file.txt --source "NCERT Polity Ch1"
"""

from __future__ import annotations

import argparse
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from services.rag_service import RAG_ENABLED, get_stats, ingest_document, retrieve_context  # noqa: E402

DEFAULT_FILE = os.path.join(os.path.dirname(__file__), "knowledge_base", "upsc_content.txt")


def reset_knowledge() -> None:
    from supabase import create_client
    client = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_KEY", ""))
    # neq on a never-matching id is the supabase-py way to express "all rows".
    client.table("knowledge_chunks").delete().neq("id", -1).execute()
    print("[reset] all knowledge chunks deleted")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed the PrepMind knowledge base")
    parser.add_argument("file", nargs="?", default=DEFAULT_FILE, help="Text file to ingest")
    parser.add_argument("--source", default=None, help="Source label stored with each chunk")
    parser.add_argument("--doc-type", default="ncert", help="ncert | pyq | notes | current_affairs")
    parser.add_argument("--stats", action="store_true", help="Print stats and exit")
    parser.add_argument("--reset", action="store_true", help="Delete existing chunks first")
    parser.add_argument("--test", metavar="QUERY", help="Run a retrieval test query")
    args = parser.parse_args()

    if not RAG_ENABLED:
        print("RAG is disabled (RAG_ENABLED=false). Enable it to seed.")
        return 1

    if args.stats:
        print(get_stats())
        return 0

    if args.test:
        chunks = retrieve_context(args.test, top_k=4)
        if not chunks:
            print("No chunks retrieved (empty knowledge base, or embeddings unavailable).")
            return 0
        print(f"Retrieved {len(chunks)} chunks for: {args.test!r}\n")
        for c in chunks:
            print(f"  [{c['source']}] similarity={c.get('similarity')}")
            print(f"    {c['text'][:160]}...\n")
        return 0

    if args.reset:
        reset_knowledge()

    if not os.path.exists(args.file):
        print(f"File not found: {args.file}")
        return 1

    with open(args.file, "r", encoding="utf-8") as fh:
        text = fh.read()

    if not text.strip():
        print("File is empty — nothing to ingest.")
        return 1

    source = args.source or os.path.splitext(os.path.basename(args.file))[0]
    print(f"Ingesting {len(text.split())} words from {args.file} (source={source!r})...")

    added = ingest_document(text=text, source=source, doc_type=args.doc_type)
    if added == 0:
        print("No chunks added — check GEMINI_API_KEY and that supabase_rag.sql has been run.")
        return 1

    print(f"Added {added} chunks.")
    print("Stats:", get_stats())
    return 0


if __name__ == "__main__":
    sys.exit(main())
