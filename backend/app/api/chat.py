from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services import intent_classifier, rag, guardrail, audit
from app.config import settings

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    history = [m.model_dump() for m in req.history]

    # 1. Classify intent
    intent, confidence = await intent_classifier.classify_intent(req.message, history)

    # 2. Short-circuit intents that don't need RAG
    if intent == "out_of_scope":
        reply = settings.OUT_OF_SCOPE_MESSAGE
        await audit.log_turn(req.session_id, req.message, reply, intent, True)
        return ChatResponse(reply=reply, intent=intent, session_id=req.session_id)

    if intent == "greeting":
        reply = await rag.generate_greeting(req.message, history)
        await audit.log_turn(req.session_id, req.message, reply, intent, True)
        return ChatResponse(reply=reply, intent=intent, session_id=req.session_id)

    # 3. Return intent confirmation
    intent_label = intent.replace("_", " ")
    reply = f"Intent identified: **{intent_label}**"

    # 4. Audit log
    await audit.log_turn(req.session_id, req.message, reply, intent, True)

    return ChatResponse(reply=reply, intent=intent, session_id=req.session_id)
