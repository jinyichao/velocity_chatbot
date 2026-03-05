from pydantic import BaseModel
from typing import Literal


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    intent: str | None
    session_id: str


class IntentResult(BaseModel):
    intent: str  # e.g. "account_balance" or "out_of_scope"
    confidence: float
