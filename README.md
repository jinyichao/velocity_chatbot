# Velocity Chatbot

A business banking chatbot POC for OCBC Velocity. Classifies user queries into predefined intent categories, retrieves grounded answers via RAG, and validates all responses through a guardrail before display.

## Features

- **Intent classification** — identifies one or multiple intents from a single query
- **RAG pipeline** — answers grounded in a Velocity knowledge base (ChromaDB)
- **Guardrail** — LLM-based output validation before responses reach the user
- **Audit logging** — full chat history persisted to SQLite with PII masked
- **Chat UI** — floating chat widget replicating the OCBC Emma interface

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | Qwen (Alibaba DashScope) |
| Vector store | ChromaDB |
| Backend | FastAPI (Python) |
| Frontend | React + Vite |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- [DashScope API key](https://dashscope.aliyun.com)

### Backend

```bash
cd backend
cp .env.example .env        # add your DASHSCOPE_API_KEY
pip install -r requirements.txt
python3 scripts/ingest_knowledge.py   # populate ChromaDB
uvicorn app.main:app --reload         # runs on :8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev     # runs on :5173
```

Open `http://localhost:5173` and click the red chat bubble.

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/chat.py              # POST /api/chat
│   │   ├── services/
│   │   │   ├── intent_classifier.py # multi-intent classification
│   │   │   ├── rag.py               # retrieval + response generation
│   │   │   ├── guardrail.py         # output validation
│   │   │   └── audit.py             # PII-masked audit logging
│   │   └── config.py
│   ├── data/knowledge_base/         # one .md file per intent category
│   └── scripts/
│       └── ingest_knowledge.py      # load KB into ChromaDB
├── frontend/
│   └── src/
│       └── components/
│           ├── ChatWidget.jsx
│           ├── MessageBubble.jsx
│           └── InputBar.jsx
├── scripts/
│   ├── evaluate_prompts.py          # intent regression tests
│   └── validate_vectors.py          # ChromaDB retrieval validation
└── render.yaml                      # Render deployment blueprint
```

## Supported Intents

`account_balance` · `fund_transfer` · `bill_payment` · `transaction_history` · `account_statement` · `forex` · `payroll` · `trade_finance` · `user_management` · `alerts_notifications` · `report_generation` · `cheque_services`

Queries outside these categories receive a fixed out-of-scope response.

## Testing

```bash
# Intent classifier regression (15 golden cases)
cd backend && python3 ../scripts/evaluate_prompts.py

# ChromaDB retrieval coverage
cd backend && python3 ../scripts/validate_vectors.py
```

## Deployment

Deployed via [Render](https://render.com) using `render.yaml`:

1. **New → Blueprint** → connect this repo
2. Set `DASHSCOPE_API_KEY` in the backend service environment variables
3. Deploy — Render builds and wires both services automatically
