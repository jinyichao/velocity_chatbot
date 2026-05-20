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
    "add_user": "Add a new user, invite a user, or onboard someone to Velocity",
    "delete_user": "Remove, deactivate, or revoke a user's access from Velocity",
    "alerts_notifications": "Set up or manage transaction alerts and notifications",
    "report_generation": "Generate financial or transaction reports",
    "cheque_services": "Stop cheques, order cheque books, or cheque enquiries",
}

INTENT_LIST = "\n".join(f"- {k}: {v}" for k, v in INTENTS.items())

SYSTEM_PROMPT = f"""You are an intent classifier for the OCBC Velocity business banking chatbot.

You will see:
- the full conversation so far,
- an OPEN_TASKS list — intents the user has raised earlier that are still pending,
- the LATEST user message.

Your job is to maintain the user's task list. Output two lists per turn:
- "intents" — new intents activated by the latest message
- "close"   — open tasks the user is cancelling, abandoning, completing, or replacing

Intent list:
{INTENT_LIST}
- out_of_scope: The query is unrelated to any of the above categories.

Carry-over / continuation rules:
- A short follow-up like "yes please" inherits the intent from the assistant's
  most recent QUESTION (when the assistant proposed a new service and the
  user is agreeing to start it).
- "and also X", "plus X", "additionally X" ADD X to "intents" without closing
  prior tasks.

Do-NOT-re-emit rule (important):
- If an intent already appears in OPEN_TASKS, do NOT re-emit it as a new
  intent unless the user is clearly making a NEW, separate request for that
  same intent type (e.g. "I want to add ANOTHER user" while add_user is
  already open).
- Progress confirmations / acknowledgments / continuations while a task is
  in-flight ("confirm", "submit", "done", "next", "ok", "yes please", "go
  ahead") must NOT re-emit the open intent. For these, return intents=[] —
  they are not new requests, they're just acknowledgments.

Distinguish "no new intent" (intents=[]) from "off-topic" (intents=
["out_of_scope"]):
- intents=[] means the message has no NEW intent but is not unrelated —
  typically an acknowledgment, progress confirmation, or pure cancellation
  (paired with non-empty close).
- intents=["out_of_scope"] means the message is unrelated to banking
  (weather, jokes, etc.) AND the user is not confirming or cancelling an
  open task.

Cancellation / replacement rules (populate "close"):
- "nevermind", "cancel that", "forget it", "skip that", "no, don't" → put the
  abandoned task(s) into "close". Only close tasks that actually appear in
  OPEN_TASKS.
- "actually let me X instead" → close the prior task AND put X in "intents".
- "done with X", "finished X", "X is sorted" → close X.
- Do NOT close a task just because the user asked an unrelated or off-topic
  question. Closure must be an explicit user signal of abandonment/completion.

Out-of-scope:
- If the latest message is unrelated to all categories, return intents=["out_of_scope"]
  and close=[] (unless the user also explicitly cancelled an open task).

Respond with JSON only in this format:
{{"intents": ["<intent_1>", ...], "close": ["<intent_1>", ...], "confidence": <0.0-1.0>}}

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


MAX_HISTORY_TURNS = 10


def _dedupe(items: list[str], allowed: set[str]) -> list[str]:
    seen = set()
    out = []
    for x in items:
        if x in allowed and x not in seen:
            out.append(x)
            seen.add(x)
    return out


async def classify_intent(
    message: str,
    history: list[dict],
    open_tasks: list[str] | None = None,
) -> tuple[list[str], list[str], float]:
    """Returns (intents_to_add, intents_to_close, confidence)."""
    open_tasks = open_tasks or []
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for turn in history[-MAX_HISTORY_TURNS:]:
        role = turn.get("role")
        content = turn.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    open_block = (
        "OPEN_TASKS (pending intents from earlier turns): "
        + (", ".join(open_tasks) if open_tasks else "<none>")
    )
    messages.append({"role": "system", "content": open_block})
    messages.append({"role": "user", "content": message})

    response = await get_client().chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=messages,
        temperature=0,
        response_format={"type": "json_object"},
        extra_body={"enable_thinking": False},
    )

    raw = response.choices[0].message.content
    parsed = json.loads(raw)
    intents = _dedupe(parsed.get("intents", []), VALID_INTENTS)
    # Only allow closing tasks that are actually open right now.
    close = _dedupe(parsed.get("close", []), set(open_tasks))
    confidence = float(parsed.get("confidence", 0.0))

    return intents, close, confidence
