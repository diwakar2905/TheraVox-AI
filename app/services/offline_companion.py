"""Offline fallback for the AI companion when Groq is not configured or unreachable.

Produces short, supportive, rule-based replies and simple session summaries so the
chat experience keeps working (clearly labelled as offline) instead of erroring.
"""

import re
from typing import Dict, List, Optional

OFFLINE_MODEL_NAME = "offline-companion"

_WORD_RE = re.compile(r"[a-z']+")

# (theme, trigger words, reply, suggested action) — first matching theme wins
_THEMES = [
    (
        "stress",
        {"stress", "stressed", "pressure", "overwhelmed", "exam", "exams", "deadline", "deadlines", "work", "busy"},
        "It sounds like a lot is pressing on you right now, and that can feel exhausting. "
        "When everything feels urgent, it can help to pick just one small next step rather than the whole list.",
        "Try a 4-7-8 breath: inhale for 4, hold for 7, exhale for 8 — three rounds. "
        "Then write down the single most important task for the next hour.",
    ),
    (
        "anxiety",
        {"anxious", "anxiety", "worried", "worry", "nervous", "panic", "scared", "afraid", "fear"},
        "Feeling anxious is really uncomfortable, and it makes sense that you'd want it to ease. "
        "Anxiety often pulls our attention into 'what ifs' about the future.",
        "Let's try grounding: name 5 things you can see, 4 you can touch, 3 you can hear, "
        "2 you can smell and 1 you can taste.",
    ),
    (
        "sadness",
        {"sad", "down", "depressed", "unhappy", "crying", "cry", "hurt", "heartbroken", "low", "empty"},
        "I'm sorry you're feeling this way. Sadness can be heavy, and it's okay to let yourself feel it "
        "without judging it.",
        "Would it help to write down what's weighing on you most right now? "
        "Sometimes putting it into words makes it a little lighter.",
    ),
    (
        "loneliness",
        {"lonely", "alone", "isolated", "nobody", "friends", "left"},
        "Feeling lonely can be really painful. Wanting connection is a deeply human need, "
        "and reaching out here is a meaningful step.",
        "Is there one person — a friend, family member or classmate — you could send a short message to today?",
    ),
    (
        "anger",
        {"angry", "anger", "mad", "furious", "annoyed", "frustrated", "irritated", "hate"},
        "It sounds like something really got under your skin. Frustration often points to something "
        "that matters to you.",
        "Before responding to the situation, try stepping away for a few minutes — a short walk or slow "
        "breathing can help the intensity settle.",
    ),
    (
        "sleep",
        {"sleep", "tired", "insomnia", "exhausted", "awake", "rest", "fatigue"},
        "Poor sleep affects how everything else feels, so it's understandable you're worn out.",
        "Tonight, try putting screens away 30 minutes before bed and doing a slow body scan from head to toe.",
    ),
    (
        "positive",
        {"happy", "good", "great", "excited", "grateful", "glad", "proud", "calm", "better", "amazing"},
        "That's really lovely to hear! Noticing the good moments is a powerful habit for wellbeing.",
        "What helped you feel this way? Writing it in your gratitude journal can help you return to it later.",
    ),
]

_DEFAULT_REPLY = "Thank you for sharing that with me. I'm here to listen, and there's no right or wrong way to feel."
_DEFAULT_ACTION = "Can you tell me a little more about what's on your mind right now?"


def _words(text: str) -> set:
    return set(_WORD_RE.findall(text.lower()))


def _match_theme(text: str) -> Optional[tuple]:
    words = _words(text)
    for theme in _THEMES:
        if words & theme[1]:
            return theme
    return None


def offline_reply(user_message: str, context: Optional[Dict] = None, crisis_flagged: bool = False) -> str:
    """Return a supportive rule-based reply to the latest user message."""
    if crisis_flagged:
        return (
            "I'm really glad you told me, and I'm concerned about your safety. You don't have to go through "
            "this alone. Please reach out right now: in India call AASRA at 9152987821 or Tele MANAS at "
            "1800-891-4416; in the US call or text 988; or call your local emergency number. If you can, "
            "let someone you trust know how you're feeling."
        )

    theme = _match_theme(user_message)
    reply, action = (theme[2], theme[3]) if theme else (_DEFAULT_REPLY, _DEFAULT_ACTION)

    streak = (context or {}).get("streak")
    if streak and streak >= 3 and (theme is None or theme[0] != "positive"):
        action += f" And remember — you've kept a {streak}-day wellness streak going, which shows real commitment."

    return f"{reply} {action}"


def offline_summary(messages: List[Dict[str, str]]) -> Dict:
    """Build a simple summary dict (same shape as the LLM JSON) from a transcript."""
    user_texts = [m["content"] for m in messages if m["role"] == "user"]
    themes = []
    for text in user_texts:
        theme = _match_theme(text)
        if theme and theme[0] not in themes:
            themes.append(theme[0])

    first_theme = _match_theme(user_texts[0])[0] if user_texts and _match_theme(user_texts[0]) else None
    last_theme = _match_theme(user_texts[-1])[0] if user_texts and _match_theme(user_texts[-1]) else None
    if first_theme and last_theme == "positive" and first_theme != "positive":
        mood_arc = "improving"
    elif last_theme == "positive":
        mood_arc = "positive"
    elif themes:
        mood_arc = "reflective"
    else:
        mood_arc = "steady"

    actions = [t[3] for t in _THEMES if t[0] in themes][:3] or [
        "Take five minutes today for a breathing exercise.",
        "Write one sentence in your journal about how you feel.",
    ]
    theme_text = ", ".join(themes) if themes else "general wellbeing"
    return {
        "summary": (
            f"In this conversation you shared {len(user_texts)} message(s), touching on {theme_text}. "
            "Taking time to put your feelings into words is a valuable step."
        ),
        "key_themes": themes or ["general wellbeing"],
        "action_items": actions,
        "mood_arc": mood_arc,
    }
