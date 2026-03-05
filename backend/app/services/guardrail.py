"""
Guardrail: validates LLM output before it is shown to users.
Checks for hallucination signals, scope violations, and harmful content.
"""

import json
from openai import AsyncOpenAI
from app.config import settings

GUARDRAIL_PROMPT = """You are a compliance guardrail for a business banking chatbot.

Evaluate the assistant's response against these rules:
1. The response must not contain financial figures, rates, or account details that were not provided in the user query or context.
2. The response must be relevant to business banking — no off-topic content.
3. The response must not contain harmful, offensive, or discriminatory language.
4. The response must not instruct the user to perform irreversible actions without clear warnings.

Respond with JSON only:
{"pass": true/false, "reason": "<brief reason if failed, empty string if passed>"}"""


async def validate(
    user_message: str,
    assistant_response: str,
    intent: str,
) -> tuple[bool, str]:
    """
    Returns (passed, reason).
    If passed=False, the response should not be shown to the user.
    """
    client = AsyncOpenAI(
        api_key=settings.DASHSCOPE_API_KEY,
        base_url=settings.DASHSCOPE_BASE_URL,
    )

    check_input = (
        f"Intent: {intent}\n"
        f"User: {user_message}\n"
        f"Assistant: {assistant_response}"
    )

    response = await client.chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=[
            {"role": "system", "content": GUARDRAIL_PROMPT},
            {"role": "user", "content": check_input},
        ],
        temperature=0,
        response_format={"type": "json_object"},
        extra_body={"enable_thinking": False},
    )

    raw = response.choices[0].message.content
    parsed = json.loads(raw)
    passed = bool(parsed.get("pass", False))
    reason = parsed.get("reason", "")
    return passed, reason


FALLBACK_RESPONSE = (
    "I'm unable to provide a reliable answer to that question. "
    "Please contact OCBC Velocity support for assistance."
)
