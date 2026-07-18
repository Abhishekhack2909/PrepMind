import os
import sys
import traceback

try: #try to 
    print("Importing rag_service inside try...")
    from services.rag_service import ingest_document, get_stats
    print("Import successful!")
    
    print("Reading file...")
    with open("knowledge_base/upsc_content.txt", "r", encoding="utf-8") as f:
        text = f.read()
    print("File read successfully, size:", len(text))
    print("Ingesting...")
    chunks = ingest_document(text=text, source="NCERT + Current Affairs Compilation", doc_type="ncert")
    print(f"Added {chunks} chunks successfully!")
    print("Stats:", get_stats())
except Exception as e:
    print(f"CRASHED: {e}")
    traceback.print_exc()
    sys.exit(1)
