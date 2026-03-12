"""
V1: TF-IDF + vector (ChromaDB) hybrid intent classifier.
Always returns one of the predefined intents — no out_of_scope.
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

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
    "add_user": [
        "add a new user", "invite user", "create user account", "onboard user",
        "assign role", "new user setup", "digital security token", "maker checker",
    ],
    "delete_user": [
        "remove user access", "deactivate user", "delete user", "revoke access",
        "disable user account", "remove employee from Velocity", "offboard user",
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


def classify(query: str) -> tuple[str, float]:
    """
    TF-IDF classification. Always returns exactly one predefined intent.
    """
    scores = _tfidf_scores(query)
    best_intent = max(scores, key=lambda k: scores[k])
    return best_intent, scores[best_intent]
