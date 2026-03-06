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
    intents: list[str]
    session_id: str
