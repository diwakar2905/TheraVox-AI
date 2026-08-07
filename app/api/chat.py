"""
AI Wellness Companion chat endpoint with persistent session history
and real-time crisis risk detection.

Routes
------
POST   /api/chat                        — send a message (creates or continues a session)
GET    /api/chat/sessions               — list the user's past sessions
GET    /api/chat/sessions/{session_id}  — load all messages for a session
DELETE /api/chat/sessions/{session_id}  — delete a session
"""

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_crisis_detector, get_current_user, get_db
from app.core.config import get_settings
from app.db.models import ChatMessageDB, ChatSession, CrisisAlert, SessionSummary, User
from app.models.schemas import (
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
    ChatSessionDetail,
    ChatSessionResponse,
    SessionSummaryResponse,
)
from app.services.crisis_detector import CrisisDetectorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_TITLE_MAX_LEN = 100       # max characters in a session title column
_TITLE_ELLIPSIS_AT = 97    # truncate here and append ellipsis
_PREVIEW_MAX_LEN = 120     # max characters for the session list preview
_TRANSCRIPT_MAX_CHARS = 12_000  # ~3000 tokens, keeps Groq context manageable

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_BASE_SYSTEM_PROMPT = """\
You are MindfulMind, a compassionate AI wellness companion built into TheraVox AI — \
a multimodal emotion analysis and mental wellness platform.

Your role:
- Provide warm, empathetic, non-judgmental emotional support.
- Offer practical wellness techniques: breathing exercises, mindfulness, journaling prompts.
- Help users understand their emotions and develop healthier patterns.
- Suggest relevant wellness tools when appropriate (breathing coach, mood check, gratitude journaling).

Guidelines:
- Be concise: 2–3 short paragraphs per response at most.
- Use a calm, warm, conversational tone — not clinical or overly formal.
- Never diagnose mental health conditions.
- For serious or ongoing mental health concerns, gently recommend speaking with a professional.
- If a user expresses thoughts of self-harm or suicide, immediately provide crisis resources:
    India: AASRA — 9152987821  |  Tele Manas — 1800-891-4416
    International: https://findahelpline.com
- Avoid generic platitudes ("Everything will be fine!"). Be specific and practical.
- You may occasionally reference the user's wellness data when it helps personalise advice.
"""


def _build_system_prompt(context: dict | None) -> str:
    if not context:
        return _BASE_SYSTEM_PROMPT

    lines: list[str] = []
    if context.get("recent_mood"):
        lines.append(f"- The user's most recent logged mood is: {context['recent_mood']}.")
    if context.get("streak") is not None:
        lines.append(f"- Their current wellness streak is {context['streak']} day(s).")
    if context.get("breathing_minutes") is not None:
        lines.append(f"- They have logged {context['breathing_minutes']} total breathing minutes.")

    if not lines:
        return _BASE_SYSTEM_PROMPT

    context_block = "\n".join(lines)
    return f"{_BASE_SYSTEM_PROMPT}\nUser wellness context (for personalisation):\n{context_block}"


def _make_title(first_user_message: str) -> str:
    """Derive a session title from the user's first message."""
    title = first_user_message.strip().replace("\n", " ")
    return title[:_TITLE_ELLIPSIS_AT] + "…" if len(title) > _TITLE_MAX_LEN else title


# ---------------------------------------------------------------------------
# POST /api/chat — send a message, persist to DB, return reply + session_id
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=None,  # we return JSONResponse to add optional crisis key
    summary="Send a message to the AI wellness companion",
)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    crisis_detector: CrisisDetectorService = Depends(get_crisis_detector),
):
    settings = get_settings()
    api_key: str = settings.get("groq_api_key", "")
    model: str = settings.get("groq_model", "llama-3.1-8b-instant")

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI companion is not configured. Please add GROQ_API_KEY to your .env file.",
        )

    try:
        from groq import Groq
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="groq package is not installed. Run: pip install groq",
        )

    # ------------------------------------------------------------------
    # Resolve or create the session
    # ------------------------------------------------------------------
    session: ChatSession | None = None

    if body.session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == body.session_id,
                ChatSession.user_id == current_user.id,
            )
        )
        session = result.scalar_one_or_none()
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found.",
            )

    # ------------------------------------------------------------------
    # Call Groq
    # ------------------------------------------------------------------
    context_dict = body.context.model_dump() if body.context else None
    system_prompt = _build_system_prompt(context_dict)

    groq_messages = [{"role": "system", "content": system_prompt}]
    for msg in body.messages:
        if msg.role not in ("user", "assistant"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid message role: {msg.role!r}. Must be 'user' or 'assistant'.",
            )
        groq_messages.append({"role": msg.role, "content": msg.content})

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=model,
            messages=groq_messages,
            max_tokens=512,
            temperature=0.75,
        )
        reply = completion.choices[0].message.content or ""
        reply = reply.strip()
    except Exception as exc:
        logger.error("Groq API error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI companion is temporarily unavailable. Please try again shortly.",
        ) from exc

    # ------------------------------------------------------------------
    # Persist: create session on first message, then save user+assistant msgs
    # ------------------------------------------------------------------
    # The last message in body.messages is always the new user turn
    new_user_content = body.messages[-1].content

    if session is None:
        session = ChatSession(
            user_id=current_user.id,
            title=_make_title(new_user_content),
            message_count=0,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(session)
        await db.flush()  # populate session.id

    # Save new user message + assistant reply
    db.add(ChatMessageDB(session_id=session.id, role="user", content=new_user_content))
    db.add(ChatMessageDB(session_id=session.id, role="assistant", content=reply))
    session.message_count = (session.message_count or 0) + 2
    session.updated_at = datetime.now(timezone.utc)
    # db commit handled by get_db dependency

    # ── Crisis detection on the latest user message ──
    crisis_assessment = crisis_detector.analyze(new_user_content)
    crisis_data = None
    if crisis_assessment.flagged:
        crisis_data = crisis_assessment.to_dict()
        # Persist alert
        signals_json_str = json.dumps(
            [{"phrase": s.phrase, "category": s.category, "severity": s.severity.value}
             for s in crisis_assessment.signals]
        )
        db.add(CrisisAlert(
            user_id=current_user.id,
            severity=crisis_assessment.severity.value,
            source="chat",
            input_snippet=new_user_content[:500],
            signals_json=signals_json_str,
            recommended_action=crisis_assessment.recommended_action,
            escalation_sent=False,
            resolved=False,
        ))
        # Fire-and-forget escalation email for HIGH / CRITICAL
        if crisis_assessment.severity.value in ("high", "critical"):
            from app.services.crisis_escalation import fire_escalation_async
            fire_escalation_async(current_user, crisis_assessment)

    response_payload = {
        "reply": reply,
        "model": model,
        "session_id": str(session.id),
    }
    if crisis_data:
        response_payload["crisis"] = crisis_data

    from fastapi.responses import JSONResponse
    return JSONResponse(content=response_payload)


# ---------------------------------------------------------------------------
# GET /api/chat/sessions — list user's sessions (most recent first)
# ---------------------------------------------------------------------------

@router.get(
    "/sessions",
    response_model=list[ChatSessionResponse],
    summary="List all past chat sessions for the current user",
)
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ChatSessionResponse]:
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()

    # For each session fetch the last assistant message as a preview
    out: list[ChatSessionResponse] = []
    for s in sessions:
        preview_result = await db.execute(
            select(ChatMessageDB.content)
            .where(
                ChatMessageDB.session_id == s.id,
                ChatMessageDB.role == "assistant",
            )
            .order_by(ChatMessageDB.created_at.desc())
            .limit(1)
        )
        preview_row = preview_result.scalar_one_or_none()
        preview = preview_row[:_PREVIEW_MAX_LEN] + "…" if preview_row and len(preview_row) > _PREVIEW_MAX_LEN else preview_row

        out.append(
            ChatSessionResponse(
                id=s.id,
                title=s.title,
                message_count=s.message_count,
                created_at=s.created_at,
                updated_at=s.updated_at,
                preview=preview,
            )
        )
    return out


# ---------------------------------------------------------------------------
# GET /api/chat/sessions/{session_id} — load full message history
# ---------------------------------------------------------------------------

@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionDetail,
    summary="Load all messages for a specific chat session",
)
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatSessionDetail:
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    msgs_result = await db.execute(
        select(ChatMessageDB)
        .where(ChatMessageDB.session_id == session_id)
        .order_by(ChatMessageDB.created_at)
    )
    messages = msgs_result.scalars().all()

    return ChatSessionDetail(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        messages=[
            ChatMessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


# ---------------------------------------------------------------------------
# POST /api/chat/sessions/{session_id}/summary — generate AI summary
# ---------------------------------------------------------------------------

_SUMMARY_SYSTEM_PROMPT = """\
You are MindfulMind's session analyst. Your job is to review a therapy-style \
chat conversation and produce a structured JSON summary.

Respond ONLY with valid JSON — no markdown fences, no extra text.
Use this exact schema:
{
  "summary": "<A concise 2-3 sentence summary of what was discussed>",
  "key_themes": ["<theme1>", "<theme2>", "<theme3>"],
  "action_items": [
    "<Specific, actionable step the user can take>",
    "<Another actionable step>",
    "<One more actionable step>"
  ],
  "mood_arc": "<One word describing the overall emotional trajectory, e.g. improving, stable, declining, mixed>"
}

Guidelines:
- summary: Capture the main topic and emotional tone in 2-3 sentences.
- key_themes: Extract 2-4 core themes (e.g. "anxiety management", "sleep quality", "work stress").
- action_items: Provide 2-3 concrete, practical next steps the user can take today or this week.
- mood_arc: One word summarising the emotional trajectory across the conversation.
- Be warm and specific — avoid vague platitudes.
"""


@router.post(
    "/sessions/{session_id}/summary",
    response_model=SessionSummaryResponse,
    summary="Generate an AI summary and action plan for a chat session",
)
async def generate_session_summary(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionSummaryResponse:
    settings = get_settings()
    api_key: str = settings.get("groq_api_key", "")
    model: str = settings.get("groq_model", "llama-3.1-8b-instant")

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI is not configured. Please add GROQ_API_KEY.",
        )

    # ── Fetch session + messages ──
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    # Check if summary already exists
    existing_result = await db.execute(
        select(SessionSummary).where(SessionSummary.session_id == session_id)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return _summary_to_response(existing)

    # Need at least 2 messages (one user + one assistant) for a meaningful summary
    msgs_result = await db.execute(
        select(ChatMessageDB)
        .where(ChatMessageDB.session_id == session_id)
        .order_by(ChatMessageDB.created_at)
    )
    messages = msgs_result.scalars().all()

    if len(messages) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Session needs at least one exchange before generating a summary.",
        )

    # ── Build transcript for the LLM ──
    transcript_lines = []
    for m in messages:
        label = "User" if m.role == "user" else "MindfulMind"
        transcript_lines.append(f"{label}: {m.content}")
    transcript = "\n\n".join(transcript_lines)

    # Truncate to stay within context window
    if len(transcript) > _TRANSCRIPT_MAX_CHARS:
        transcript = transcript[:_TRANSCRIPT_MAX_CHARS] + "\n\n[…conversation truncated…]"

    # ── Call Groq ──
    try:
        from groq import Groq
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="groq package is not installed.",
        )

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": f"Here is the conversation transcript:\n\n{transcript}"},
            ],
            max_tokens=512,
            temperature=0.4,
        )
        raw_reply = completion.choices[0].message.content or ""
        raw_reply = raw_reply.strip()
    except Exception as exc:
        logger.error("Groq summary generation error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate summary. Please try again.",
        ) from exc

    # ── Parse JSON response ──
    parsed = _parse_summary_json(raw_reply)

    # ── Persist ──
    summary_obj = SessionSummary(
        session_id=session_id,
        summary=parsed["summary"],
        key_themes=json.dumps(parsed["key_themes"]),
        action_items=json.dumps(parsed["action_items"]),
        mood_arc=parsed.get("mood_arc"),
        model_used=model,
    )
    db.add(summary_obj)
    await db.flush()

    return _summary_to_response(summary_obj)


# ---------------------------------------------------------------------------
# GET /api/chat/sessions/{session_id}/summary — retrieve existing summary
# ---------------------------------------------------------------------------

@router.get(
    "/sessions/{session_id}/summary",
    response_model=SessionSummaryResponse,
    summary="Get the existing summary for a chat session",
)
async def get_session_summary(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionSummaryResponse:
    # Verify ownership
    sess_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    if sess_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    result = await db.execute(
        select(SessionSummary).where(SessionSummary.session_id == session_id)
    )
    summary = result.scalar_one_or_none()
    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No summary exists for this session yet. Generate one first.",
        )
    return _summary_to_response(summary)


# ---------------------------------------------------------------------------
# Helpers: summary parsing and serialisation
# ---------------------------------------------------------------------------

def _parse_summary_json(raw: str) -> dict:
    """Best-effort parse of the LLM's JSON output."""
    import re as _re

    # Strip markdown fences if present
    cleaned = _re.sub(r"^```(?:json)?\s*", "", raw, flags=_re.MULTILINE)
    cleaned = _re.sub(r"\s*```\s*$", "", cleaned, flags=_re.MULTILINE)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse summary JSON, using fallback. Raw: %s", raw[:200])
        data = {
            "summary": raw[:500],
            "key_themes": ["conversation"],
            "action_items": ["Reflect on today's conversation and journal your thoughts."],
            "mood_arc": "mixed",
        }

    # Ensure required keys
    data.setdefault("summary", "Session summary unavailable.")
    data.setdefault("key_themes", [])
    data.setdefault("action_items", [])
    data.setdefault("mood_arc", "mixed")

    # Enforce types
    if isinstance(data["key_themes"], str):
        data["key_themes"] = [data["key_themes"]]
    if isinstance(data["action_items"], str):
        data["action_items"] = [data["action_items"]]

    return data


def _summary_to_response(obj: SessionSummary) -> SessionSummaryResponse:
    """Convert ORM object → Pydantic response, deserialising JSON fields."""
    try:
        key_themes = json.loads(obj.key_themes)
    except (json.JSONDecodeError, TypeError):
        key_themes = []
    try:
        action_items = json.loads(obj.action_items)
    except (json.JSONDecodeError, TypeError):
        action_items = []

    return SessionSummaryResponse(
        id=obj.id,
        session_id=obj.session_id,
        summary=obj.summary,
        key_themes=key_themes,
        action_items=action_items,
        mood_arc=obj.mood_arc,
        model_used=obj.model_used,
        created_at=obj.created_at,
    )


# ---------------------------------------------------------------------------
# DELETE /api/chat/sessions/{session_id} — delete a session + all its messages
# ---------------------------------------------------------------------------

@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a chat session and all its messages",
)
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    await db.delete(session)
    # cascade deletes all ChatMessageDB rows via FK constraint


