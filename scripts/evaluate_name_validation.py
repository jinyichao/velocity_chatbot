"""
POC demo: LLM sanity check for the 'Full Name' field in the add-user flow.

Usage:
    cd backend && source .venv/bin/activate
    python3 ../scripts/evaluate_name_validation.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

from app.services.name_validator import validate_name


CASES = [
    # (input, expected_valid)
    ("Tan Wei Ming", True),
    ("Lee", True),                                # short single-word name, plausible
    ("Siti Nurhaliza binti Abdullah", True),
    ("Muhammad Ali bin Hassan", True),
    ("张伟", True),                                # CN name
    ("Mary-Jane O'Connor", True),                 # hyphen + apostrophe
    # Honorifics: LLM rejects ("name as on ID, no titles") — reasonable
    # for KYC. Keep as a rejection case to lock the behaviour in.
    ("Dr. John Doe Jr.", False),
    # rejections
    ("asdfgh", False),
    ("qwerty", False),
    ("aaaaaaaa", False),
    ("test", False),
    ("test test", False),
    ("123456", False),                            # pure digits
    ("a", False),                                 # single letter
    ("user@example.com", False),                  # email in name field
    ("S1234567A", False),                         # NRIC in name field
    ("!!!!!", False),                             # symbols only
    ("xxx", False),
]


async def main():
    print(f"{'INPUT':<40} {'EXPECTED':<10} {'GOT':<10} REASON")
    print("-" * 100)
    passed = 0
    for value, expected in CASES:
        valid, reason = await validate_name(value)
        ok = valid == expected
        status = "PASS" if ok else "FAIL"
        passed += int(ok)
        print(f"{value!r:<40} {str(expected):<10} {str(valid):<10} {reason}  [{status}]")
    print(f"\n{passed}/{len(CASES)} passed")


if __name__ == "__main__":
    asyncio.run(main())
