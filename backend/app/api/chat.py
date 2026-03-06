from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services import intent_classifier, rag, guardrail, audit
from app.config import settings

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    history = [m.model_dump() for m in req.history]

    # 1. Classify — may return multiple intents
    intents, confidence = await intent_classifier.classify_intent(req.message, history)

    # 2. Pure out-of-scope
    if intents == ["out_of_scope"]:
        reply = settings.OUT_OF_SCOPE_MESSAGE
        await audit.log_turn(req.session_id, req.message, reply, "out_of_scope", True)
        return ChatResponse(reply=reply, intents=intents, session_id=req.session_id)

    # 3. Pure greeting
    if intents == ["greeting"]:
        reply = await rag.generate_greeting(req.message, history)
        await audit.log_turn(req.session_id, req.message, reply, "greeting", True)
        return ChatResponse(reply=reply, intents=intents, session_id=req.session_id)

    # 4. Chain through all in-scope intents (exclude meta-intents)
    SKIP = {"greeting", "out_of_scope"}
    scoped = [i for i in intents if i not in SKIP]

    lines = "\n".join(f"• **{i.replace('_', ' ')}**" for i in scoped)
    reply = f"Intent identified:\n{lines}"

    # 5. Audit log (join intents for storage)
    await audit.log_turn(req.session_id, req.message, reply, ", ".join(intents), True)

    return ChatResponse(reply=reply, intents=intents, session_id=req.session_id)
