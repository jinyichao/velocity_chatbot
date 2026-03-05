"""
Vector validation script: verifies ChromaDB is populated correctly and
that retrieval returns relevant chunks for each intent category.

Usage:
    cd backend
    python3 ../scripts/validate_vectors.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
import os

CHROMA_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
COLLECTION_NAME = "velocity_kb"

TEST_QUERIES = {
    "account_balance": "how to check my balance",
    "fund_transfer": "transfer funds to another bank",
    "bill_payment": "pay electricity bill GIRO",
    "transaction_history": "view past transactions",
    "account_statement": "download monthly statement",
    "forex": "foreign exchange rate USD SGD",
    "payroll": "upload payroll file salary",
    "trade_finance": "letter of credit import",
    "user_management": "add new user permissions",
    "alerts_notifications": "set up low balance alert",
    "report_generation": "generate cash flow report",
    "cheque_services": "stop cheque payment",
}


def validate():
    ef = DefaultEmbeddingFunction()
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    try:
        collection = client.get_collection(name=COLLECTION_NAME, embedding_function=ef)
    except Exception as e:
        print(f"ERROR: Could not load collection '{COLLECTION_NAME}': {e}")
        print("Run scripts/ingest_knowledge.py first.")
        sys.exit(1)

    total_docs = collection.count()
    print(f"Collection '{COLLECTION_NAME}': {total_docs} chunks total\n")

    if total_docs == 0:
        print("ERROR: Collection is empty. Run ingest_knowledge.py.")
        sys.exit(1)

    passed = 0
    for intent, query in TEST_QUERIES.items():
        results = collection.query(
            query_texts=[query],
            n_results=2,
            where={"intent": intent},
        )
        docs = results["documents"][0]
        if docs:
            print(f"[PASS] {intent}: retrieved {len(docs)} chunk(s)")
            print(f"       Sample: {docs[0][:80].strip()}...")
            passed += 1
        else:
            print(f"[FAIL] {intent}: no chunks retrieved for query '{query}'")

    print(f"\nResults: {passed}/{len(TEST_QUERIES)} intents have retrievable chunks")
    if passed < len(TEST_QUERIES):
        sys.exit(1)


if __name__ == "__main__":
    validate()
