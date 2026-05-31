"""
Seed Script — Ingest UPSC content into ChromaDB

Run once:  python seed_knowledge.py

This script:
1. Reads the sample UPSC content file
2. Chunks it into ~400-word segments
3. Embeds each chunk using SentenceTransformer (all-MiniLM-L6-v2)
4. Stores in ChromaDB (persisted to chroma_db/ folder)

After running, the /api/ask endpoint will have knowledge to search.
You can add more content by:
- Placing more .txt files in knowledge_base/
- Calling POST /api/ingest with document text
"""

import os
from dotenv import load_dotenv
load_dotenv()

from services.rag_service import ingest_document, get_stats

# Map of filename pattern → document type
CONTENT_FILES = [
    ("knowledge_base/upsc_content.txt", "NCERT + Current Affairs Compilation", "ncert"),
]

def main():
    print("=" * 60)
    print("PrepMind Knowledge Base Seeder")
    print("=" * 60)

    for filepath, source_name, doc_type in CONTENT_FILES:
        if not os.path.exists(filepath):
            print(f"  SKIP: {filepath} not found")
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            text = f.read()

        print(f"\nIngesting: {source_name}")
        print(f"  File size: {len(text):,} characters")

        chunks = ingest_document(text=text, source=source_name, doc_type=doc_type)
        print(f"  ✅ Added {chunks} chunks to ChromaDB")

    stats = get_stats()
    print(f"\n{'='*60}")
    print(f"Knowledge Base Stats:")
    print(f"  Total chunks: {stats['total_chunks']}")
    print(f"  Storage: {stats['db_path']}")
    print(f"\nDone! Backend will now answer questions from this content.")
    print(f"Test: POST /api/ask  {{\"question\": \"What is the Preamble of the Constitution?\"}}")

if __name__ == "__main__":
    main()
