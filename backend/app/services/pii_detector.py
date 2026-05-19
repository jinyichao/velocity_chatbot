"""
Multi-country PII detection for SG, MY, CN, HK.

Used by:
- audit.py — country-aware mask labels in logs
- chat.py — A2 prepend heads-up for add_user/delete_user intents

NOTE: Keep regex patterns in sync with frontend/src/utils/piiDetection.js.
The FE and BE modules serve different consumers (FE: interactive validation,
BE: log masking), but the patterns themselves should mean the same thing.
"""

import re
from typing import Optional

# (label, country, regex). Order matters — more specific patterns first
# so they claim spans before more permissive patterns (like ACCOUNT) match.
PATTERNS = [
    # IDs — checked before phones/account to avoid digit-string collisions
    ("CN_ID",    "CN",   re.compile(r"\b\d{17}[\dXx]\b")),
    ("MY_IC",    "MY",   re.compile(r"\b\d{6}-?\d{2}-?\d{4}\b")),
    ("SG_NRIC",  "SG",   re.compile(r"\b[STFGMstfgm]\d{7}[A-Za-z]\b")),
    ("HK_ID",    "HK",   re.compile(r"\b[A-Z]{1,2}\d{6}\(?[\dA]\)?")),

    # Email and card
    ("EMAIL",    None,   re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")),
    ("CARD",     None,   re.compile(r"\b(?:\d{4}[\s\-]?){3}\d{4}\b")),

    # Phones — CN first (11 digits, distinctive prefix), then MY (9-11 digits),
    # then SG (8 digits 8/9), then HK (8 digits 5/6/8/9 — SG-overlap on 8/9
    # already claimed by SG above).
    ("CN_PHONE", "CN",   re.compile(r"(?:\+?86[-\s]?)?\b1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}\b")),
    ("MY_PHONE", "MY",   re.compile(r"(?:\+?60[-\s]?)?\b0?1\d[-\s]?\d{3,4}[-\s]?\d{4}\b")),
    ("SG_PHONE", "SG",   re.compile(r"(?:\+?65[-\s]?)?\b[89]\d{3}[-\s]?\d{4}\b")),
    ("HK_PHONE", "HK",   re.compile(r"(?:\+?852[-\s]?)?\b[5689]\d{3}[-\s]?\d{4}\b")),

    # Generic account fallback — must come after all ID patterns above
    ("ACCOUNT",  None,   re.compile(r"\b\d{7,12}\b")),
]


def _overlaps(span_a: tuple[int, int], span_b: tuple[int, int]) -> bool:
    return span_a[0] < span_b[1] and span_b[0] < span_a[1]


def detect_pii(text: str) -> list[dict]:
    """Return non-overlapping PII matches, sorted by position.

    Each match: {type, country, span: (start, end), value}.
    Earlier patterns in PATTERNS win over later ones for overlapping spans.
    """
    claimed: list[tuple[int, int]] = []
    results: list[dict] = []
    for label, country, regex in PATTERNS:
        for m in regex.finditer(text):
            span = m.span()
            if any(_overlaps(span, c) for c in claimed):
                continue
            results.append({
                "type": label,
                "country": country,
                "span": span,
                "value": m.group(),
            })
            claimed.append(span)
    results.sort(key=lambda r: r["span"][0])
    return results


def first_foreign_match(text: str) -> Optional[dict]:
    """Return the first non-SG ID or phone match (for chat.py prepend).

    Prefers ID matches over phone matches when both are present.
    """
    matches = detect_pii(text)
    foreign = [m for m in matches if m["country"] in ("MY", "CN", "HK")]
    # Prefer IDs (more distinctive than phone numbers)
    ids = [m for m in foreign if m["type"] in ("MY_IC", "CN_ID", "HK_ID")]
    if ids:
        return ids[0]
    return foreign[0] if foreign else None


# Display helpers for chat.py prepend
COUNTRY_FLAG = {"SG": "🇸🇬", "MY": "🇲🇾", "CN": "🇨🇳", "HK": "🇭🇰"}
COUNTRY_NAME = {"SG": "Singapore", "MY": "Malaysia", "CN": "China", "HK": "Hong Kong"}
TYPE_LABEL = {
    "SG_NRIC":  "Singapore NRIC",
    "MY_IC":    "Malaysian IC (MyKad)",
    "CN_ID":    "Chinese ID (身份证)",
    "HK_ID":    "Hong Kong HKID",
    "SG_PHONE": "Singapore mobile",
    "MY_PHONE": "Malaysian mobile",
    "CN_PHONE": "Chinese mobile",
    "HK_PHONE": "Hong Kong mobile",
}
