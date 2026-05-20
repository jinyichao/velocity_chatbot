"""
LLM-based sanity check for a person's full name entered during the add-user
onboarding flow. Single-shot, no conversation context.

Catches things deterministic regex can't: gibberish ("asdfgh"), keyboard
mashing ("qwerty"), placeholder values ("test", "abc"), strings that are
actually a different field (email/ID number), profanity. Stays permissive
toward real international names (CN, MY, IN, etc.) and short single-word
names.
"""

import json
from openai import AsyncOpenAI
from app.config import settings


SYSTEM_PROMPT = """You validate whether a piece of text looks like a plausible person's full name being entered into a Singapore business banking onboarding form.

ACCEPT:
- Real-looking human names: letters, spaces, hyphens, apostrophes, periods.
- International names — Chinese, Tamil, Malay, Western, Indonesian, etc. Non-Latin scripts are fine.
- Single-word names if culturally plausible (e.g. "Lee", "Tan", "Siti").
- Names of 1–6 words.

REJECT:
- Gibberish or keyboard mashing (e.g. "asdfgh", "qwerty", "xxx", "zzz").
- Excessive character repetition (e.g. "aaaaaa", "bbbbb").
- Strings that are obviously a different field: an email, a phone number, an ID number, an address.
- Pure numbers, pure symbols, or single-letter input.
- Profanity, slurs, or offensive content.
- Obvious placeholder values: "test", "test test", "abc", "asdf", "name", "user".

Respond with JSON only:
{"valid": true}
or
{"valid": false, "reason": "<one short user-facing sentence explaining what's wrong, e.g. 'That looks like keyboard input rather than a real name.'>"}

Do not include any explanation outside the JSON."""


_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.DASHSCOPE_API_KEY,
            base_url=settings.DASHSCOPE_BASE_URL,
        )
    return _client


async def validate_name(name: str) -> tuple[bool, str]:
    """Returns (is_valid, reason). Reason is empty when valid."""
    name = (name or "").strip()
    if not name:
        return False, "Please enter the full name."
    if len(name) > 100:
        return False, "That name is too long. Please enter the full name as shown in ID."

    response = await _get_client().chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": name},
        ],
        temperature=0,
        response_format={"type": "json_object"},
        extra_body={"enable_thinking": False},
    )

    parsed = json.loads(response.choices[0].message.content)
    valid = bool(parsed.get("valid", False))
    reason = "" if valid else str(parsed.get("reason") or "That doesn't look like a real name. Please enter the full name as shown in ID.")
    return valid, reason
