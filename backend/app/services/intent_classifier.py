"""
Intent classifier: uses the LLM to map user input to one of the predefined
Velocity categories, or marks it as out_of_scope.
"""

import json
from openai import AsyncOpenAI
from app.config import settings

INTENTS = {
    "greeting": "Greetings, pleasantries, or small talk such as hi, hello, good morning, how are you",
    "account_balance": "Check current balance of business accounts",
    "fund_transfer": "Transfer funds between accounts or to third parties",
    "bill_payment": "Pay bills, GIRO, or recurring payments",
    "transaction_history": "View or search past transactions",
    "account_statement": "Download or request account statements",
    "forex": "Foreign exchange rates, FX conversion, or FX transactions",
    "payroll": "Payroll processing, salary disbursement, or GIRO payroll setup",
    "trade_finance": "Letters of credit, trade financing, or documentary collections",
    "user_management": "Add/remove users, assign roles, or manage access rights",
    "alerts_notifications": "Set up or manage transaction alerts and notifications",
    "report_generation": "Generate financial or transaction reports",
    "cheque_services": "Stop cheques, order cheque books, or cheque enquiries",
}

INTENT_LIST = "\n".join(f"- {k}: {v}" for k, v in INTENTS.items())

SYSTEM_PROMPT = f"""You are an intent classifier for the OCBC Velocity business banking chatbot.

A user message may contain one or more intents. Identify ALL intents present from this list:
{INTENT_LIST}
- out_of_scope: The query is unrelated to any of the above categories.

Rules:
- Return every intent found in the message, in the order they appear.
- If any part is unrelated to the above categories, include out_of_scope.
- If the entire message is unrelated, return only ["out_of_scope"].

Respond with JSON only in this format:
{{"intents": ["<intent_1>", "<intent_2>"], "confidence": <0.0-1.0>}}

Do not include any explanation."""


_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.DASHSCOPE_API_KEY,
            base_url=settings.DASHSCOPE_BASE_URL,
        )
    return _client


VALID_INTENTS = set(INTENTS.keys()) | {"out_of_scope"}


async def classify_intent(message: str, history: list[dict]) -> tuple[list[str], float]:
    """Returns (list of intent names, confidence)."""
    recent_context = ""
    if history:
        last = history[-1]
        recent_context = f"\n\nPrevious turn: {last.get('role')}: {last.get('content', '')}"

    response = await get_client().chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message + recent_context},
        ],
        temperature=0,
        response_format={"type": "json_object"},
        extra_body={"enable_thinking": False},
    )

    raw = response.choices[0].message.content
    parsed = json.loads(raw)
    intents = parsed.get("intents", ["out_of_scope"])
    confidence = float(parsed.get("confidence", 0.0))

    # Sanitise: keep only known intents, preserve order, deduplicate
    seen = set()
    clean = []
    for intent in intents:
        if intent in VALID_INTENTS and intent not in seen:
            clean.append(intent)
            seen.add(intent)

    return clean or ["out_of_scope"], confidence
