"""
Guided Journaling API endpoints.

POST /api/journal/prompt  — Get an AI-generated journaling prompt tailored to the user's mood
POST /api/journal/submit  — Submit a journal entry; returns emotion analysis + AI reflection
"""

import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_current_user, get_text_analyzer
from app.core.config import get_settings
from app.db.models import User
from app.models.schemas import (
    JournalPromptRequest,
    JournalPromptResponse,
    JournalSubmitRequest,
    JournalSubmitResponse,
)
from app.services import TextAnalyzerService
from app.utils.emotion_utils import get_emotion_emoji, get_emotion_description

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/journal", tags=["journal"])

# ---------------------------------------------------------------------------
# Static fallback prompts (used when Groq is unavailable)
# ---------------------------------------------------------------------------

_FALLBACK_PROMPTS: dict[str, str] = {
    "happy": "You're carrying some joy today — what sparked it? Describe a moment or person that made you smile.",
    "joy": "You're carrying some joy today — what sparked it? Describe a moment or person that made you smile.",
    "sad": "What's weighing on your heart right now? This space is just for you — write freely without judgment.",
    "sadness": "What's weighing on your heart right now? This space is just for you — write freely without judgment.",
    "angry": "What has been frustrating or bothering you lately? Sometimes naming it clearly is the first step to releasing it.",
    "anger": "What has been frustrating or bothering you lately? Sometimes naming it clearly is the first step to releasing it.",
    "fear": "What's been making you feel uncertain or anxious? Try writing it down — bringing it into words often makes it feel smaller.",
    "fearful": "What's been making you feel uncertain or anxious? Try writing it down — bringing it into words often makes it feel smaller.",
    "disgust": "Is there something that's been bothering you that you haven't had a chance to express? This is your safe space.",
    "surprise": "Something unexpected happened recently — how did it shift your perspective? Explore what it brought up for you.",
    "neutral": "Take a breath and check in with yourself. How has your day been unfolding, and what has stayed with you most?",
    "calm": "You seem to be in a calm place today. Reflect on what has been grounding you — what practices or moments have helped?",
}

_DEFAULT_PROMPT = (
    "What's on your mind right now? Write whatever feels true — "
    "there's no right or wrong way to journal."
)

# ---------------------------------------------------------------------------
# Groq helpers
# ---------------------------------------------------------------------------

_PROMPT_SYSTEM = """\
You are a compassionate journaling guide for a mental wellness app called TheraVox AI. \
Your job is to write a single, focused journaling prompt tailored to the user's current \
emotional state. The prompt should be warm, non-judgmental, and specific enough to \
spark genuine reflection. Keep it to 1–2 sentences. Do NOT include any preamble, \
explanation, or formatting — output only the prompt itself."""

_REFLECTION_SYSTEM = """\
You are MindfulMind, a compassionate AI wellness companion in TheraVox AI. \
A user has just written a journal entry. You have been given the entry, the prompt \
they were responding to (if any), and the emotion detected in their words. \
Write a warm, personal 2–3 sentence reflection that:
1. Acknowledges the emotion detected without being clinical.
2. Picks out one specific theme or image from their writing.
3. Closes with a gentle insight or encouraging thought.
Output only the reflection — no headers, no bullet points, no preamble."""


def _get_groq_client():
    """Return an initialised Groq client or raise 503."""
    settings = get_settings()
    api_key: str = settings.get("groq_api_key", "")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI journaling is not configured. Please add GROQ_API_KEY to your .env file.",
        )
    try:
        from groq import Groq  # lazy import
        return Groq(api_key=api_key), settings.get("groq_model", "llama-3.1-8b-instant")
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="groq package is not installed. Run: pip install groq",
        )


# ---------------------------------------------------------------------------
# POST /api/journal/prompt
# ---------------------------------------------------------------------------

@router.post(
    "/prompt",
    response_model=JournalPromptResponse,
    summary="Get an AI-generated journaling prompt based on mood",
)
async def get_journal_prompt(
    body: JournalPromptRequest,
    current_user: User = Depends(get_current_user),
) -> JournalPromptResponse:
    """
    Returns a personalised journaling prompt.
    Falls back to a curated static prompt when Groq is unavailable.
    """
    mood = (body.recent_mood or "").lower().strip()

    # Try Groq first
    try:
        client, model = _get_groq_client()
    except HTTPException:
        # Groq unavailable — return a static fallback prompt
        prompt = _FALLBACK_PROMPTS.get(mood, _DEFAULT_PROMPT)
        return JournalPromptResponse(prompt=prompt)

    # Build a context-aware user message for Groq
    mood_context = f"The user's most recent logged mood is: {mood}." if mood else ""
    history_context = ""
    if body.mood_history:
        history_context = f" Their recent mood history is: {', '.join(body.mood_history[-5:])}."

    user_message = (
        f"Generate a journaling prompt for this user. {mood_context}{history_context}"
        if (mood_context or history_context)
        else "Generate a general reflective journaling prompt."
    )

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _PROMPT_SYSTEM},
                {"role": "user", "content": user_message},
            ],
            max_tokens=120,
            temperature=0.9,
        )
        prompt_text = (completion.choices[0].message.content or "").strip()
        if not prompt_text:
            raise ValueError("Empty response from Groq")
        return JournalPromptResponse(prompt=prompt_text)
    except Exception as exc:
        logger.warning("Groq prompt generation failed, using fallback: %s", exc)
        return JournalPromptResponse(prompt=_FALLBACK_PROMPTS.get(mood, _DEFAULT_PROMPT))


# ---------------------------------------------------------------------------
# POST /api/journal/submit
# ---------------------------------------------------------------------------

@router.post(
    "/submit",
    response_model=JournalSubmitResponse,
    summary="Submit a journal entry and receive emotion analysis + reflection",
)
async def submit_journal(
    body: JournalSubmitRequest,
    current_user: User = Depends(get_current_user),
    analyzer: TextAnalyzerService = Depends(get_text_analyzer),
) -> JournalSubmitResponse:
    """
    Analyzes the emotion in a journal entry and returns a personalised AI reflection.
    The reflection gracefully degrades to a template if Groq is unavailable.
    """
    # 1. Run emotion analysis (offloaded to thread pool)
    loop = asyncio.get_event_loop()
    try:
        emotion, confidence = await loop.run_in_executor(None, analyzer.analyze, body.text)
    except Exception as exc:
        logger.error("Text analysis error in journal submit: %s", exc)
        emotion, confidence = "neutral", 0.5

    emoji = get_emotion_emoji(emotion)
    description = get_emotion_description(emotion, confidence)

    # 2. Generate AI reflection
    reflection = await _generate_reflection(body.text, body.prompt, emotion, confidence)

    return JournalSubmitResponse(
        emotion=emotion,
        confidence=confidence,
        emoji=emoji,
        description=description,
        reflection=reflection,
    )


async def _generate_reflection(text: str, prompt: str | None, emotion: str, confidence: float) -> str:
    """Generate a personalised reflection using Groq, falling back to a template."""
    try:
        client, model = _get_groq_client()
    except HTTPException:
        return _template_reflection(emotion, confidence)

    prompt_context = f'They were responding to this journaling prompt: "{prompt}"\n\n' if prompt else ""
    user_message = (
        f"{prompt_context}"
        f'Here is the journal entry:\n"""\n{text[:2000]}\n"""\n\n'
        f"Detected emotion: {emotion} (confidence: {confidence:.0%})"
    )

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _REFLECTION_SYSTEM},
                {"role": "user", "content": user_message},
            ],
            max_tokens=200,
            temperature=0.75,
        )
        reflection = (completion.choices[0].message.content or "").strip()
        if reflection:
            return reflection
    except Exception as exc:
        logger.warning("Groq reflection generation failed, using template: %s", exc)

    return _template_reflection(emotion, confidence)


def _template_reflection(emotion: str, confidence: float) -> str:
    """Fallback reflection templates when Groq is unavailable."""
    templates: dict[str, str] = {
        "happy": (
            "Your words carry a warmth and lightness that's wonderful to see. "
            "Hold onto whatever is bringing you joy right now — you deserve it. "
            "Keep nurturing the moments and connections that make you feel this way."
        ),
        "joy": (
            "Your words carry a warmth and lightness that's wonderful to see. "
            "Hold onto whatever is bringing you joy right now — you deserve it. "
            "Keep nurturing the moments and connections that make you feel this way."
        ),
        "sad": (
            "It takes real courage to sit with difficult feelings and write them down. "
            "Whatever you're carrying right now, know that it's okay to feel this way. "
            "Be gentle with yourself today — healing isn't linear, and small steps matter."
        ),
        "angry": (
            "Your writing shows something important is on your mind. "
            "Anger often points us toward what we value and what boundaries need tending. "
            "Take a breath — you've already done something powerful by naming what you feel."
        ),
        "fear": (
            "Writing about what scares us is one of the bravest things we can do. "
            "Your concerns are valid, and naming them is the first step toward navigating them. "
            "Remember: you have handled difficult things before, and you have that strength now too."
        ),
        "disgust": (
            "Something has clearly affected you deeply, and your feelings are completely valid. "
            "Writing it out is a healthy way to process and release what's been bothering you. "
            "Trust that awareness is always the first step toward resolution."
        ),
        "surprise": (
            "Life has handed you something unexpected, and you're taking time to process it — that's wise. "
            "Unexpected events can shake us but also open new doors we hadn't considered. "
            "Give yourself the space to sit with what this experience is teaching you."
        ),
        "neutral": (
            "A calm, reflective moment like this is genuinely valuable — not every entry needs high emotion. "
            "Consistent check-ins with yourself build self-awareness over time. "
            "Well done for showing up for your journaling practice today."
        ),
    }
    return templates.get(emotion, (
        "Thank you for taking time to check in with yourself today. "
        "Journaling is a powerful act of self-care, and your words reflect real honesty. "
        "Keep showing up for yourself — it matters more than you know."
    ))
