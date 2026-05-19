# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Intent classification chatbot for OCBC Velocity (business banking). Classifies user queries into 12 predefined categories, retrieves answers via RAG, validates output through a guardrail, and logs all turns with PII masked.

**Stack:** FastAPI + Qwen (DashScope) backend · React + Vite frontend

## Commands

### Backend — first-time setup
```bash
cd backend
uv venv                                    # create .venv (or python3 -m venv .venv)
source .venv/bin/activate
uv pip install -r requirements.txt          # or: pip install -r requirements.txt
cp .env.example .env                        # then fill in DASHSCOPE_API_KEY
                                            # for international key, also set
                                            # DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

### Backend — run
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8000           # serves on :8000

# Dev with auto-reload — exclude .venv to avoid a watchfiles loop
# that prevents the worker from starting:
uvicorn app.main:app --reload --reload-exclude '.venv/*' --port 8000
```
> Plain `uvicorn --reload` (no exclude) hangs at "Started reloader process" because watchfiles enumerates `.venv` first. Either omit `--reload` or include the exclude.

### Frontend
```bash
cd frontend
npm install
npm run dev      # starts on :5173 with /api proxy to :8000
npm run build
```

### Login
Default user: `admin` / `admin123` (see `USERS` in `backend/.env`).

### Testing & Validation
```bash
# From repo root, with backend venv active:
python3 scripts/evaluate_prompts.py    # intent classifier regression tests
```

## Architecture

```
User message
    │
    ▼
Intent Classifier (LLM)          ← app/services/intent_classifier.py
    │
    ├── out_of_scope → fixed message
    │
    ▼
Response Generator (LLM)         ← app/services/rag.py::generate_response
    │
    ▼
Guardrail Validator (LLM)        ← app/services/guardrail.py
    │
    ├── fail → FALLBACK_RESPONSE
    │
    ▼
Audit Log (SQLite + PII mask)    ← app/services/audit.py
    │
    ▼
ChatResponse → frontend
```

## Intent Categories

| Intent | Description |
|---|---|
| `account_balance` | Check account balances |
| `fund_transfer` | FAST/GIRO/TT/MEPS+/PayNow transfers |
| `bill_payment` | Bills, GIRO arrangements |
| `transaction_history` | View/search/export past transactions |
| `account_statement` | Monthly e-statements, SWIFT MT940 |
| `forex` | FX rates, conversion, forwards |
| `payroll` | Salary disbursement, CPF, GIRO payroll |
| `trade_finance` | LC, TR, shipping guarantee, bank guarantee |
| `add_user` | Onboard a new user, assign roles |
| `delete_user` | Deactivate / revoke a user |
| `alerts_notifications` | Balance/transaction/login alerts |
| `report_generation` | Cash flow, payroll, transaction reports |
| `cheque_services` | Stop cheques, order books, enquiry |
| `out_of_scope` | → fixed fallback message |

## Key Files

- `backend/app/services/intent_classifier.py` — system prompt + intent list; edit here to tune classification
- `backend/app/services/guardrail.py` — guardrail rules; edit here to change compliance checks
- `backend/app/config.py` — all env-backed settings, including `OUT_OF_SCOPE_MESSAGE`
- `backend/data/knowledge_base/*.md` — one file per intent; KB content read directly at runtime
- `scripts/evaluate_prompts.py` — golden test set for intent classification

## Maker-Checker Workflow

Velocity enforces a two-person rule for sensitive operations (transfers, user changes). The chatbot is aware of this pattern and references it in answers for relevant intents.

## PII Masking & Multi-Country Detection

`audit.py` calls `pii_detector.detect_pii()` and replaces each match with a country-aware label: `[SG_NRIC]`, `[MY_IC]`, `[CN_ID]`, `[HK_ID]`, `[SG_PHONE]`, `[MY_PHONE]`, `[CN_PHONE]`, `[HK_PHONE]`, plus `[EMAIL]`, `[CARD]`, `[ACCOUNT]`.

For the `add_user` / `delete_user` flows, the frontend (`frontend/src/utils/piiDetection.js` + `ChatWidget.jsx` + `AddUserForm`) runs **interactive country clarification**: when the user types an ID or phone that matches a non-current-country format, the bot pauses with a button-based clarification ("That looks like a Malaysian IC — register under 🇸🇬 SG or 🇲🇾 MY?"). ID country and phone country are tracked independently so a CN ID with an SG phone is permitted. Phone parsing uses `libphonenumber-js/max` so all standard input formats (with or without `+`, country code, spaces, hyphens) are handled.
