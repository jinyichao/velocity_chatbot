"""
V1: TF-IDF + vector (ChromaDB) hybrid intent classifier.
Always returns one of the predefined intents — no out_of_scope.
"""

import asyncio
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.services.rag import get_collection

# Example queries per intent used to build the TF-IDF corpus
INTENT_EXAMPLES: dict[str, list[str]] = {
    "account_balance": [
        "check my account balance", "what is my current balance",
        "how much money is in my account", "available balance",
        "ledger balance", "view balance",
    ],
    "fund_transfer": [
        "transfer money to another bank", "send funds", "make a FAST transfer",
        "GIRO payment", "telegraphic transfer", "PayNow transfer",
        "MEPS high value transfer", "set up standing instruction",
    ],
    "bill_payment": [
        "pay my electricity bill", "GIRO arrangement", "pay SP Group",
        "pay IRAS", "CPF payment", "pay telco bill", "schedule bill payment",
    ],
    "transaction_history": [
        "view my past transactions", "show recent transactions",
        "search for a payment", "debit credit history", "transaction list",
        "find a transaction by date",
    ],
    "account_statement": [
        "download my statement", "get monthly statement", "PDF statement",
        "SWIFT MT940", "request bank statement", "certified statement",
    ],
    "forex": [
        "foreign exchange rate", "USD to SGD", "convert currency",
        "FX transaction", "buy USD", "FX forward", "exchange rate today",
    ],
    "payroll": [
        "process payroll", "upload salary file", "disburse salaries",
        "GIRO payroll", "CPF contribution", "pay employees", "payroll schedule",
    ],
    "trade_finance": [
        "letter of credit", "trust receipt", "shipping guarantee",
        "documentary collection", "bank guarantee", "trade financing",
        "import LC", "export LC",
    ],
    "user_management": [
        "add a new user", "remove user access", "assign role", "maker checker",
        "change permissions", "deactivate user", "digital security token",
    ],
    "alerts_notifications": [
        "set up alert", "low balance notification", "transaction alert",
        "email notification", "SMS alert", "login alert", "configure alerts",
    ],
    "report_generation": [
        "generate report", "cash flow report", "payroll report",
        "transaction report", "download financial report", "scheduled report",
    ],
    "cheque_services": [
        "stop a cheque", "order cheque book", "cheque enquiry",
        "cancel cheque", "cheque status", "cheque return",
    ],
    "greeting": [
        "hi", "hello", "good morning", "good afternoon", "hey there",
        "how are you", "good day",
    ],
}

INTENTS = list(INTENT_EXAMPLES.keys())

# Build TF-IDF matrix at import time
_corpus: list[str] = []
_labels: list[str] = []
for intent, examples in INTENT_EXAMPLES.items():
    for ex in examples:
        _corpus.append(ex)
        _labels.append(intent)

_vectorizer = TfidfVectorizer(ngram_range=(1, 2))
_tfidf_matrix = _vectorizer.fit_transform(_corpus)


def _tfidf_scores(query: str) -> dict[str, float]:
    """Return per-intent max cosine similarity using TF-IDF."""
    qvec = _vectorizer.transform([query])
    sims = cosine_similarity(qvec, _tfidf_matrix)[0]
    scores: dict[str, float] = {intent: 0.0 for intent in INTENTS}
    for sim, label in zip(sims, _labels):
        if sim > scores[label]:
            scores[label] = float(sim)
    return scores


def _vector_scores(query: str) -> dict[str, float]:
    """Return per-intent scores via ChromaDB embedding similarity."""
    scores: dict[str, float] = {intent: 0.0 for intent in INTENTS}
    try:
        collection = get_collection()
        if collection.count() == 0:
            return scores
        results = collection.query(query_texts=[query], n_results=10)
        distances = results.get("distances", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        for dist, meta in zip(distances, metadatas):
            intent = meta.get("intent", "")
            if intent in scores:
                # Convert L2 distance to similarity score
                sim = 1.0 / (1.0 + dist)
                if sim > scores[intent]:
                    scores[intent] = sim
    except Exception:
        pass
    return scores


def classify(
    query: str,
    tfidf_weight: float = 0.4,
    vector_weight: float = 0.6,
    secondary_threshold: float = 0.6,  # fraction of top score to include as extra intent
    min_score: float = 0.05,           # absolute minimum score to be considered
) -> tuple[list[str], float]:
    """
    Hybrid TF-IDF + vector multi-intent classification.
    Always returns at least one predefined intent.
    Additional intents are included when their score is >= secondary_threshold * top_score.
    """
    tfidf = _tfidf_scores(query)
    vector = _vector_scores(query)

    combined: dict[str, float] = {}
    for intent in INTENTS:
        combined[intent] = tfidf_weight * tfidf[intent] + vector_weight * vector[intent]

    sorted_intents = sorted(combined.items(), key=lambda x: x[1], reverse=True)
    top_score = sorted_intents[0][1]

    results = []
    for intent, score in sorted_intents:
        if score >= max(min_score, secondary_threshold * top_score):
            results.append(intent)

    # Always return at least the top intent
    if not results:
        results = [sorted_intents[0][0]]

    return results, top_score
