"""
Audit service: persists all chat interactions to SQLite with PII masking.
Uses regex-based masking for common PII patterns found in Singapore banking context.
"""

import re
import sqlite3
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from app.config import settings

# PII masking patterns (Singapore context)
PII_PATTERNS = [
    # NRIC / FIN  e.g. S1234567A
    (re.compile(r"\b[STFGM]\d{7}[A-Z]\b"), "[NRIC/FIN]"),
    # Singapore phone  e.g. +65 9123 4567 / 91234567
    (re.compile(r"(\+65[\s-]?)?\b[689]\d{3}[\s-]?\d{4}\b"), "[PHONE]"),
    # Email
    (re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"), "[EMAIL]"),
    # Bank account (7-12 digit standalone number)
    (re.compile(r"\b\d{7,12}\b"), "[ACCOUNT]"),
    # Credit/debit card  (16 digits, optionally grouped)
    (re.compile(r"\b(?:\d{4}[\s\-]?){3}\d{4}\b"), "[CARD]"),
]


def mask_pii(text: str) -> str:
    for pattern, replacement in PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def _get_db() -> sqlite3.Connection:
    db_path = Path(settings.AUDIT_DB_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  TEXT NOT NULL,
            timestamp   TEXT NOT NULL,
            role        TEXT NOT NULL,
            intent      TEXT,
            content     TEXT NOT NULL,
            guardrail_passed INTEGER
        )
    """)
    conn.commit()
    return conn


async def log_turn(
    session_id: str,
    user_message: str,
    assistant_reply: str,
    intent: str,
    guardrail_passed: bool,
) -> None:
    """Persist one conversation turn (both sides) with PII masked."""
    masked_user = mask_pii(user_message)
    masked_reply = mask_pii(assistant_reply)
    ts = datetime.now(timezone.utc).isoformat()

    def _write():
        conn = _get_db()
        conn.executemany(
            """INSERT INTO audit_log
               (session_id, timestamp, role, intent, content, guardrail_passed)
               VALUES (?, ?, ?, ?, ?, ?)""",
            [
                (session_id, ts, "user", intent, masked_user, None),
                (session_id, ts, "assistant", intent, masked_reply, int(guardrail_passed)),
            ],
        )
        conn.commit()
        conn.close()

    await asyncio.to_thread(_write)
