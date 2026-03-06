"""
Audit service: logs all chat interactions to stdout with PII masking.
Stdout logging is compatible with serverless platforms (Vercel, Railway, etc.).
"""

import re
import json
from datetime import datetime, timezone

# PII masking patterns (Singapore context)
PII_PATTERNS = [
    (re.compile(r"\b[STFGM]\d{7}[A-Z]\b"), "[NRIC/FIN]"),
    (re.compile(r"(\+65[\s-]?)?\b[689]\d{3}[\s-]?\d{4}\b"), "[PHONE]"),
    (re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"), "[EMAIL]"),
    (re.compile(r"\b\d{7,12}\b"), "[ACCOUNT]"),
    (re.compile(r"\b(?:\d{4}[\s\-]?){3}\d{4}\b"), "[CARD]"),
]


def mask_pii(text: str) -> str:
    for pattern, replacement in PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


async def log_turn(
    session_id: str,
    user_message: str,
    assistant_reply: str,
    intent: str,
    guardrail_passed: bool,
) -> None:
    """Log one conversation turn (both sides) with PII masked."""
    ts = datetime.now(timezone.utc).isoformat()
    record = {
        "ts": ts,
        "session_id": session_id,
        "intent": intent,
        "guardrail_passed": guardrail_passed,
        "user": mask_pii(user_message),
        "assistant": mask_pii(assistant_reply),
    }
    print(json.dumps(record, ensure_ascii=False))
