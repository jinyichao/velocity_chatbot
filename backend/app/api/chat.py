import traceback
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.models.schemas import ChatRequest, ChatResponse
from app.services import intent_classifier, rag, guardrail, audit, v3_direct
from app.services import v1_classifier
from app.config import settings

router = APIRouter()


@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        history = [m.model_dump() for m in req.history]

        # ── V1: TF-IDF only, always maps to a known intent ─────────────────
        if req.version == 1:
            intent, confidence = v1_classifier.classify(req.message)
            reply = f"> Analyzing your request…\n- [x] **{intent.replace('_', ' ').title()}**"
            await audit.log_turn(req.session_id, req.message, reply, intent, True)
            return ChatResponse(reply=reply, intents=[intent], session_id=req.session_id)

        # ── V3: Direct LLM, no classification, no guardrail ────────────────
        if req.version == 3:
            reply = await v3_direct.respond(req.message, history)
            await audit.log_turn(req.session_id, req.message, reply, "direct", True)
            return ChatResponse(reply=reply, intents=[], session_id=req.session_id)

        # ── V2: LLM classification + guardrail + out-of-scope control ──────
        intents, confidence = await intent_classifier.classify_intent(req.message, history)

        if intents == ["out_of_scope"]:
            reply = settings.OUT_OF_SCOPE_MESSAGE
            await audit.log_turn(req.session_id, req.message, reply, "out_of_scope", True)
            return ChatResponse(reply=reply, intents=intents, session_id=req.session_id)

        if intents == ["greeting"]:
            reply = await rag.generate_greeting(req.message, history)
            await audit.log_turn(req.session_id, req.message, reply, "greeting", True)
            return ChatResponse(reply=reply, intents=intents, session_id=req.session_id)

        SKIP = {"greeting", "out_of_scope"}
        scoped = [i for i in intents if i not in SKIP]
        lines = "\n".join(f"- [x] **{i.replace('_', ' ').title()}**" for i in scoped)
        reply = f"> Analyzing your request…\n{lines}"

        await audit.log_turn(req.session_id, req.message, reply, ", ".join(intents), True)
        return ChatResponse(reply=reply, intents=intents, session_id=req.session_id)

    except Exception as e:
        tb = traceback.format_exc()
        print(f"ERROR: {e}\n{tb}")
        return JSONResponse(status_code=500, content={"error": str(e), "detail": tb})
