# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Intent classification chatbot for OCBC Velocity (business banking). Classifies user queries into 12 predefined categories, retrieves answers via RAG, validates output through a guardrail, and logs all turns with PII masked.

**Stack:** FastAPI + ChromaDB + Qwen (DashScope) backend · React + Vite frontend

## Commands

### Backend
```bash
cd backend
cp .env.example .env          # then fill in DASHSCOPE_API_KEY
pip install -r requirements.txt
python3 -m spacy download en_core_web_lg   # for PII detection
python3 scripts/ingest_knowledge.py        # populate ChromaDB (run once, and after KB edits)
uvicorn app.main:app --reload              # starts on :8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # starts on :5173 with /api proxy to :8000
npm run build
```

### Testing & Validation
```bash
# From repo root, with backend venv active:
python3 scripts/evaluate_prompts.py    # intent classifier regression tests
python3 scripts/validate_vectors.py   # verify ChromaDB retrieval per intent
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
RAG Retrieve (ChromaDB)          ← app/services/rag.py
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
| `user_management` | Users, roles, Maker-Checker, DST |
| `alerts_notifications` | Balance/transaction/login alerts |
| `report_generation` | Cash flow, payroll, transaction reports |
| `cheque_services` | Stop cheques, order books, enquiry |
| `out_of_scope` | → fixed fallback message |

## Key Files

- `backend/app/services/intent_classifier.py` — system prompt + intent list; edit here to tune classification
- `backend/app/services/guardrail.py` — guardrail rules; edit here to change compliance checks
- `backend/app/config.py` — all env-backed settings, including `OUT_OF_SCOPE_MESSAGE`
- `backend/data/knowledge_base/*.md` — one file per intent; edit/add KB content here, then re-run ingest
- `backend/scripts/ingest_knowledge.py` — chunks and embeds KB into ChromaDB
- `scripts/evaluate_prompts.py` — golden test set for intent classification
- `scripts/validate_vectors.py` — verifies ChromaDB retrieval coverage

## Maker-Checker Workflow

Velocity enforces a two-person rule for sensitive operations (transfers, user changes). The chatbot is aware of this pattern and references it in answers for relevant intents.

## PII Masking

`audit.py` regex-masks NRIC/FIN, Singapore phone numbers, email addresses, bank account numbers (7–12 digits), and card numbers before writing to `audit.db`.
