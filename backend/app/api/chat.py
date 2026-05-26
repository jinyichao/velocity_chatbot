import traceback
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    DismissTaskRequest,
    NameValidationRequest,
    NameValidationResponse,
)
from app.services import intent_classifier, rag, guardrail, audit, v3_direct, task_tracker
from app.services import v1_classifier, name_validator
from app.services.pii_detector import first_foreign_match, COUNTRY_FLAG, TYPE_LABEL
from app.config import settings

USER_INTENTS = {"add_user", "delete_user"}


def _foreign_heads_up(message: str) -> str | None:
    """If the message contains a non-SG ID/phone, return a prepend note."""
    match = first_foreign_match(message)
    if not match:
        return None
    flag = COUNTRY_FLAG.get(match["country"], "")
    label = TYPE_LABEL.get(match["type"], match["type"])
    return (
        f"{flag} Heads up — that looks like a **{label}**. "
        "You'll be asked to confirm country in the next step."
    )

router = APIRouter()


@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        history = [m.model_dump() for m in req.history]

        # ── V1: TF-IDF only, always maps to a known intent ─────────────────
        if req.version == 1:
            intent, confidence = v1_classifier.classify(req.message)
            reply = f"Intent identified:\n• **{intent.replace('_', ' ')}**"
            await audit.log_turn(req.session_id, req.message, reply, intent, True)
            task_tracker.add(req.session_id, [intent])
            return ChatResponse(
                reply=reply,
                intents=[intent],
                session_id=req.session_id,
                open_tasks=task_tracker.list_open(req.session_id),
            )

        # ── V3: Direct LLM, no classification, no guardrail ────────────────
        if req.version == 3:
            reply = await v3_direct.respond(req.message, history)
            await audit.log_turn(req.session_id, req.message, reply, "direct", True)
            return ChatResponse(reply=reply, intents=[], session_id=req.session_id)

        # ── V2: LLM classification + guardrail + out-of-scope control ──────
        current_open = task_tracker.list_open(req.session_id)
        intents, to_close, confidence = await intent_classifier.classify_intent(
            req.message, history, current_open
        )

        # Close before add so a "X instead of Y" turn doesn't drop Y from the
        # newly-added X due to ordering.
        for intent in to_close:
            task_tracker.close(req.session_id, intent)
        task_tracker.add(req.session_id, intents)
        open_tasks = task_tracker.list_open(req.session_id)

        if to_close and not intents:
            closed_labels = ", ".join(c.replace("_", " ") for c in to_close)
            reply = f"Got it — closed: **{closed_labels}**."
            await audit.log_turn(req.session_id, req.message, reply, f"close:{','.join(to_close)}", True)
            return ChatResponse(reply=reply, intents=[], session_id=req.session_id, open_tasks=open_tasks, closed_tasks=to_close)

        # intents=[] with no close = acknowledgment. Guide rather than fall
        # through to the out-of-scope canned reply.
        if not intents:
            if open_tasks:
                reply = "Please click the **Confirm** button on the form to finalize."
                await audit.log_turn(req.session_id, req.message, reply, "ack", True)
                return ChatResponse(reply=reply, intents=[], session_id=req.session_id, open_tasks=open_tasks, closed_tasks=[])
            intents = ["out_of_scope"]

        if intents == ["out_of_scope"]:
            reply = await rag.generate_out_of_scope(req.message)
            await audit.log_turn(req.session_id, req.message, reply, "out_of_scope", True)
            return ChatResponse(reply=reply, intents=intents, session_id=req.session_id, open_tasks=open_tasks, closed_tasks=to_close)

        if intents == ["greeting"]:
            reply = await rag.generate_greeting(req.message, history)
            await audit.log_turn(req.session_id, req.message, reply, "greeting", True)
            return ChatResponse(reply=reply, intents=intents, session_id=req.session_id, open_tasks=open_tasks, closed_tasks=to_close)

        SKIP = {"greeting", "out_of_scope"}
        scoped = [i for i in intents if i not in SKIP]
        lines = "\n".join(f"• **{i.replace('_', ' ')}**" for i in scoped)
        reply = f"Intent identified:\n{lines}"

        if USER_INTENTS.intersection(scoped):
            note = _foreign_heads_up(req.message)
            if note:
                reply = f"{note}\n\n{reply}"

        await audit.log_turn(req.session_id, req.message, reply, ", ".join(intents), True)
        return ChatResponse(reply=reply, intents=intents, session_id=req.session_id, open_tasks=open_tasks, closed_tasks=to_close)

    except Exception as e:
        tb = traceback.format_exc()
        print(f"ERROR: {e}\n{tb}")
        return JSONResponse(status_code=500, content={"error": str(e), "detail": tb})


@router.post("/tasks/dismiss")
async def dismiss_task(req: DismissTaskRequest):
    """Close an open task. Idempotent — silently no-ops if already closed."""
    closed = task_tracker.close(req.session_id, req.intent)
    return {
        "closed": closed,
        "open_tasks": task_tracker.list_open(req.session_id),
    }


@router.get("/tasks/{session_id}")
async def get_open_tasks(session_id: str):
    return {"open_tasks": task_tracker.list_open(session_id)}


@router.post("/validate/name", response_model=NameValidationResponse)
async def validate_name_endpoint(req: NameValidationRequest):
    """LLM sanity check for the 'Full Name' field in the add-user flow."""
    try:
        valid, reason = await name_validator.validate_name(req.name)
        return NameValidationResponse(valid=valid, reason=reason)
    except Exception as e:
        # On LLM failure, fall back to accepting so the user isn't blocked.
        print(f"name validation failed: {e}")
        return NameValidationResponse(valid=True, reason="")
