"""
Ingest knowledge base markdown files into ChromaDB.
Run this once (and after any KB updates) before starting the backend.

Usage:
    cd backend
    python3 scripts/ingest_knowledge.py
"""

import os
import sys
from pathlib import Path

# Allow imports from backend/app
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

KB_DIR = Path(__file__).parent.parent / "data" / "knowledge_base"
CHROMA_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
COLLECTION_NAME = "velocity_kb"
CHUNK_SIZE = 400  # characters


def chunk_text(text: str, size: int = CHUNK_SIZE) -> list[str]:
    """Split text into overlapping chunks by paragraph, then by size."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) < size:
            current = (current + "\n\n" + para).strip()
        else:
            if current:
                chunks.append(current)
            current = para
    if current:
        chunks.append(current)
    return chunks


def ingest():
    ef = DefaultEmbeddingFunction()
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    # Delete and recreate for a clean ingest
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"Deleted existing collection '{COLLECTION_NAME}'")
    except Exception:
        pass

    collection = client.create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
    )

    total = 0
    for md_file in sorted(KB_DIR.glob("*.md")):
        content = md_file.read_text()
        # Extract intent from first line  e.g. "intent: account_balance"
        lines = content.splitlines()
        intent = md_file.stem  # fallback to filename
        if lines and lines[0].startswith("intent:"):
            intent = lines[0].split(":", 1)[1].strip()
            content = "\n".join(lines[2:])  # skip the intent header

        chunks = chunk_text(content)
        ids = [f"{intent}_{i}" for i in range(len(chunks))]
        metadatas = [{"intent": intent, "source": md_file.name}] * len(chunks)

        collection.add(documents=chunks, ids=ids, metadatas=metadatas)
        print(f"  {md_file.name}: {len(chunks)} chunks ingested (intent={intent})")
        total += len(chunks)

    print(f"\nDone. Total chunks ingested: {total}")


if __name__ == "__main__":
    ingest()
