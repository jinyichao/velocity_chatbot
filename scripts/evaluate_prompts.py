"""
Prompt evaluation script: tests the intent classifier and response pipeline
against a set of golden queries to detect regressions.

Usage:
    cd backend
    python3 ../scripts/evaluate_prompts.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

from app.services.intent_classifier import classify_intent

# Golden test set: (user_message, expected_intent)
GOLDEN_CASES = [
    ("What is my current account balance?", "account_balance"),
    ("How do I transfer money to another bank?", "fund_transfer"),
    ("I want to pay my electricity bill", "bill_payment"),
    ("Show me my transactions from last month", "transaction_history"),
    ("Download my bank statement for December", "account_statement"),
    ("What is the USD to SGD exchange rate?", "forex"),
    ("How do I process payroll for my staff?", "payroll"),
    ("I need a letter of credit for my supplier", "trade_finance"),
    ("How do I add a new user to Velocity?", "user_management"),
    ("Set up a low balance alert for my account", "alerts_notifications"),
    ("Generate a cash flow report for Q4", "report_generation"),
    ("I want to stop a cheque payment", "cheque_services"),
    ("What's the weather like today?", "out_of_scope"),
    ("Tell me a joke", "out_of_scope"),
    ("What are your interest rates for home loans?", "out_of_scope"),
]


async def run_evaluation():
    print("Running prompt evaluation...\n")
    passed = 0
    failed = []

    for message, expected in GOLDEN_CASES:
        intent, confidence = await classify_intent(message, [])
        ok = intent == expected
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] '{message}'")
        print(f"       expected={expected}  got={intent}  confidence={confidence:.2f}")
        if ok:
            passed += 1
        else:
            failed.append((message, expected, intent))

    total = len(GOLDEN_CASES)
    print(f"\n{'='*60}")
    print(f"Results: {passed}/{total} passed ({100*passed//total}%)")

    if failed:
        print("\nFailed cases:")
        for msg, exp, got in failed:
            print(f"  - '{msg}': expected={exp}, got={got}")
        sys.exit(1)
    else:
        print("All cases passed!")


if __name__ == "__main__":
    asyncio.run(run_evaluation())
