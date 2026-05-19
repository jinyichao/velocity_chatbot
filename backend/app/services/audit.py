"""
Audit service: logs all chat interactions to stdout with PII masking.
Stdout logging is compatible with serverless platforms (Vercel, Railway, etc.).
"""

import json
from datetime import datetime, timezone

from app.services.pii_detector import detect_pii


def mask_pii(text: str) -> str:
    """Replace each detected PII span with a country-aware label.

    Uses pii_detector.detect_pii for non-overlapping matches, then walks
    the matches in reverse so earlier span indices stay valid as we splice.
    """
    matches = detect_pii(text)
    for m in sorted(matches, key=lambda r: -r["span"][0]):
        start, end = m["span"]
        text = text[:start] + f"[{m['type']}]" + text[end:]
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
