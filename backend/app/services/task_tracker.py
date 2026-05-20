"""
Session-level open-task tracker (POC).

Sits above the per-turn intent classifier. Each session keeps an ordered list
of intents that the user has raised but not yet closed. A task is opened when
the classifier emits an actionable intent, and closed when the user dismisses
it from the UI (× button) or explicitly cancels it.

In-memory only — process-local, lost on restart. Fine for POC.
"""

from collections import OrderedDict
from threading import Lock

_open: dict[str, "OrderedDict[str, None]"] = {}
_lock = Lock()

# Conversational intents that don't represent pending work.
_NON_TASK = {"greeting", "out_of_scope"}


def add(session_id: str, intents: list[str]) -> None:
    """Add intents to the session's open-task set (deduped, order-preserving)."""
    with _lock:
        bucket = _open.setdefault(session_id, OrderedDict())
        for intent in intents:
            if intent in _NON_TASK:
                continue
            bucket[intent] = None


def close(session_id: str, intent: str) -> bool:
    """Remove one open task. Returns True if it was present."""
    with _lock:
        bucket = _open.get(session_id)
        if not bucket or intent not in bucket:
            return False
        del bucket[intent]
        if not bucket:
            del _open[session_id]
        return True


def list_open(session_id: str) -> list[str]:
    """Snapshot of currently open tasks for a session."""
    with _lock:
        bucket = _open.get(session_id)
        return list(bucket.keys()) if bucket else []


def clear(session_id: str) -> None:
    """Wipe all open tasks for a session (e.g. on a 'start over' action)."""
    with _lock:
        _open.pop(session_id, None)
