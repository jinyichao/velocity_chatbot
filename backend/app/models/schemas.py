from pydantic import BaseModel
from typing import Literal


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: str
    history: list[ChatMessage] = []
    version: int = 2  # 1=tfidf+vector, 2=llm+guardrail, 3=direct llm


class ChatResponse(BaseModel):
    reply: str
    intents: list[str]
    session_id: str
    open_tasks: list[str] = []
    # Tasks that were closed THIS turn (cancellation, replacement, completion).
    closed_tasks: list[str] = []


class DismissTaskRequest(BaseModel):
    session_id: str
    intent: str


class NameValidationRequest(BaseModel):
    name: str


class NameValidationResponse(BaseModel):
    valid: bool
    reason: str = ""
