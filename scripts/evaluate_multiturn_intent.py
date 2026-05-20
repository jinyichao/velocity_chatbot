"""
POC demo: shows how the intent classifier uses full conversation history
plus the session-level open-task tracker to handle:
  - multi-turn intents that accumulate across turns,
  - cancellation / completion / replacement of in-flight tasks,
  - implicit references like "yes please" / "do the same for…".

Usage:
    cd backend && source .venv/bin/activate
    python3 ../scripts/evaluate_multiturn_intent.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

from app.services.intent_classifier import classify_intent
from app.services import task_tracker


# Each case: (history, latest user message, what we expect to see)
CASES = [
    {
        "label": "Follow-up 'yes please' inherits the prior intent",
        "history": [
            {"role": "user", "content": "Can I download my account statement?"},
            {"role": "assistant", "content": "Yes — would you like me to walk you through e-statement download?"},
        ],
        "message": "yes please",
        "expect": "account_statement",
    },
    {
        "label": "Implicit continuation — 'and also $500 to vendor X' after balance check",
        "history": [
            {"role": "user", "content": "What's my balance on the SGD operating account?"},
            {"role": "assistant", "content": "Your SGD operating account balance is shown on the dashboard. Anything else?"},
        ],
        "message": "and also transfer $500 to vendor X",
        "expect": "fund_transfer (carry-over account_balance optional)",
    },
    {
        "label": "Multiple intents in one message, no prior context",
        "history": [],
        "message": "Show me last month's transactions and set up a low-balance alert",
        "expect": "transaction_history + alerts_notifications",
    },
    {
        "label": "Topic switch — new message is unrelated to prior turn",
        "history": [
            {"role": "user", "content": "What is the USD to SGD rate?"},
            {"role": "assistant", "content": "The current rate is around 1.35."},
        ],
        "message": "How do I stop a cheque?",
        "expect": "cheque_services (NOT forex)",
    },
    {
        "label": "Out-of-scope follow-up after a valid intent",
        "history": [
            {"role": "user", "content": "Add a new user to Velocity"},
            {"role": "assistant", "content": "Sure — what role should they have?"},
        ],
        "message": "what's the weather today?",
        "expect": "out_of_scope",
    },
    {
        "label": "Pronoun reference — 'do the same for my MYR account'",
        "history": [
            {"role": "user", "content": "Download the December statement for my SGD account"},
            {"role": "assistant", "content": "Sure, here's how..."},
        ],
        "message": "do the same for my MYR account",
        "expect": "account_statement",
    },
]


async def run_session(label: str, turns: list[str]):
    print("\n" + "=" * 72)
    print(label)
    print("=" * 72)
    session = f"demo-{abs(hash(label)) % 10000}"
    task_tracker.clear(session)
    history = []

    for msg in turns:
        current_open = task_tracker.list_open(session)
        intents, to_close, _ = await classify_intent(msg, history, current_open)
        for intent in to_close:
            task_tracker.close(session, intent)
        task_tracker.add(session, intents)
        open_tasks = task_tracker.list_open(session)

        print(f"\n  user: {msg}")
        print(f"    open_tasks (before)  : {current_open}")
        print(f"    classifier add       : {intents}")
        print(f"    classifier close     : {to_close}")
        print(f"    open_tasks (after)   : {open_tasks}")

        history.append({"role": "user", "content": msg})
        history.append({"role": "assistant", "content": f"Intent identified: {intents}"})


async def main():
    # Screenshot scenario: two tasks accumulate without "all together".
    await run_session(
        "SCREENSHOT SCENARIO — two tasks accumulate across turns",
        [
            "i just fire a director what should i do",
            "and also a new one came in",
        ],
    )

    # Cancellation: user changes mind, prior task should be closed.
    await run_session(
        "CANCELLATION — 'nevermind' should close the prior task",
        [
            "I want to add a new user",
            "actually nevermind, cancel that",
        ],
    )

    # Replacement: 'instead' should swap one task for another.
    await run_session(
        "REPLACEMENT — 'actually let me X instead' swaps tasks",
        [
            "Add a new user to Velocity",
            "actually let me check my account balance instead",
        ],
    )

    # Completion: 'done with X' closes X but keeps later tasks.
    await run_session(
        "COMPLETION — 'done with X' closes only X",
        [
            "Delete a user and also show my transactions",
            "ok done with the user deletion",
        ],
    )

    # Off-topic shouldn't close anything.
    await run_session(
        "OFF-TOPIC — unrelated question should NOT close open tasks",
        [
            "I need to add a new user",
            "what's the weather today?",
        ],
    )

    print("\n" + "=" * 72)
    print("PER-TURN CLASSIFIER REGRESSION CASES (no open tasks context)")
    print("=" * 72)
    for i, case in enumerate(CASES, 1):
        print(f"\n[{i}] {case['label']}")
        print(f"    expect: {case['expect']}")
        for turn in case["history"]:
            print(f"    {turn['role']}: {turn['content']}")
        print(f"    user (latest): {case['message']}")

        intents, close, confidence = await classify_intent(case["message"], case["history"])
        print(f"    → intents={intents}  close={close}  confidence={confidence:.2f}")


if __name__ == "__main__":
    asyncio.run(main())
