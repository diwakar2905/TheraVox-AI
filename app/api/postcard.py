"""
Emotion Postcard endpoint.

POST /api/postcard  — Generate postcard data (quote, palette, patterns)
                       for a given emotion analysis result.
"""

import random
from fastapi import APIRouter

from app.models.schemas import PostcardRequest, PostcardResponse

router = APIRouter(prefix="/api/postcard", tags=["postcard"])

# ---------------------------------------------------------------------------
# Curated inspiring quotes per emotion
# ---------------------------------------------------------------------------

EMOTION_QUOTES: dict[str, list[dict[str, str]]] = {
    "happy": [
        {"text": "Happiness is not something ready-made. It comes from your own actions.", "author": "Dalai Lama"},
        {"text": "The most wasted of days is one without laughter.", "author": "E.E. Cummings"},
        {"text": "Joy is the simplest form of gratitude.", "author": "Karl Barth"},
        {"text": "Keep your face always toward the sunshine, and shadows will fall behind you.", "author": "Walt Whitman"},
        {"text": "The purpose of our lives is to be happy.", "author": "Dalai Lama"},
        {"text": "Happiness blooms from within.", "author": "TheraVox AI"},
    ],
    "sad": [
        {"text": "Even the darkest night will end, and the sun will rise.", "author": "Victor Hugo"},
        {"text": "The wound is the place where the light enters you.", "author": "Rumi"},
        {"text": "Stars can't shine without darkness.", "author": "D.H. Sidebottom"},
        {"text": "You are allowed to feel. You are allowed to heal.", "author": "TheraVox AI"},
        {"text": "Tears are words that need to be written.", "author": "Paulo Coelho"},
        {"text": "After every storm, the sun shows its face once more.", "author": "TheraVox AI"},
    ],
    "angry": [
        {"text": "For every minute you remain angry, you give up sixty seconds of peace of mind.", "author": "Ralph Waldo Emerson"},
        {"text": "Holding on to anger is like drinking poison and expecting the other person to die.", "author": "Buddha"},
        {"text": "The best fighter is never angry.", "author": "Lao Tzu"},
        {"text": "Speak when you are angry and you will make the best speech you'll ever regret.", "author": "Ambrose Bierce"},
        {"text": "Channel the fire within — let it forge, not consume.", "author": "TheraVox AI"},
        {"text": "Breathe. You are stronger than this moment.", "author": "TheraVox AI"},
    ],
    "surprise": [
        {"text": "The only way to make sense out of change is to plunge into it.", "author": "Alan Watts"},
        {"text": "Life is either a daring adventure or nothing at all.", "author": "Helen Keller"},
        {"text": "The greatest glory in living lies not in never falling, but in rising every time we fall.", "author": "Nelson Mandela"},
        {"text": "Be curious, not judgmental.", "author": "Walt Whitman"},
        {"text": "Every moment holds the seed of wonder.", "author": "TheraVox AI"},
        {"text": "Surprise is the beginning of discovery.", "author": "TheraVox AI"},
    ],
    "fear": [
        {"text": "Everything you've ever wanted is on the other side of fear.", "author": "George Addair"},
        {"text": "Courage is not the absence of fear, but the triumph over it.", "author": "Nelson Mandela"},
        {"text": "You gain strength, courage, and confidence by every experience in which you stop to look fear in the face.", "author": "Eleanor Roosevelt"},
        {"text": "Fear is a reaction. Courage is a decision.", "author": "Winston Churchill"},
        {"text": "The cave you fear to enter holds the treasure you seek.", "author": "Joseph Campbell"},
        {"text": "You are braver than you believe.", "author": "A.A. Milne"},
    ],
    "disgust": [
        {"text": "In the middle of difficulty lies opportunity.", "author": "Albert Einstein"},
        {"text": "What we dislike in others often illuminates what we can grow in ourselves.", "author": "Carl Jung"},
        {"text": "Turn your wounds into wisdom.", "author": "Oprah Winfrey"},
        {"text": "Not everything that is faced can be changed, but nothing can be changed until it is faced.", "author": "James Baldwin"},
        {"text": "Let discomfort be the compass to your growth.", "author": "TheraVox AI"},
        {"text": "From the mud, the lotus blooms.", "author": "TheraVox AI"},
    ],
    "neutral": [
        {"text": "Be where you are, not where you think you should be.", "author": "TheraVox AI"},
        {"text": "Almost everything will work again if you unplug it for a few minutes — including you.", "author": "Anne Lamott"},
        {"text": "The present moment is filled with joy and happiness. If you are attentive, you will see it.", "author": "Thich Nhat Hanh"},
        {"text": "Stillness is where creativity and solutions are found.", "author": "Eckhart Tolle"},
        {"text": "Peace is the result of retraining your mind to process life as it is.", "author": "Wayne Dyer"},
        {"text": "In stillness, you find yourself.", "author": "TheraVox AI"},
    ],
}

# Fallback quotes used when emotion isn't found in the map
_FALLBACK_QUOTES = [
    {"text": "You are doing better than you think.", "author": "TheraVox AI"},
    {"text": "Every day is a fresh start.", "author": "TheraVox AI"},
    {"text": "Be gentle with yourself — you're doing the best you can.", "author": "TheraVox AI"},
]

# ---------------------------------------------------------------------------
# Color palettes per emotion (gradient stops, text accents)
# ---------------------------------------------------------------------------

EMOTION_PALETTES: dict[str, dict] = {
    "happy": {
        "gradient": ["#FFF7E6", "#FFE8A3", "#FFD666"],
        "accent": "#E6A817",
        "text": "#5C4813",
        "glow": "rgba(230, 168, 23, 0.3)",
        "pattern": "sunburst",
    },
    "sad": {
        "gradient": ["#E8F0FE", "#B8D4F0", "#7EB3E0"],
        "accent": "#4A7FB5",
        "text": "#1E3A5C",
        "glow": "rgba(74, 127, 181, 0.3)",
        "pattern": "rain",
    },
    "angry": {
        "gradient": ["#FEE8E8", "#F0B8B8", "#E07E7E"],
        "accent": "#C04040",
        "text": "#5C1E1E",
        "glow": "rgba(192, 64, 64, 0.3)",
        "pattern": "fire",
    },
    "surprise": {
        "gradient": ["#F0E8FE", "#D4B8F0", "#B880E0"],
        "accent": "#8040C0",
        "text": "#3B1E5C",
        "glow": "rgba(128, 64, 192, 0.3)",
        "pattern": "sparkle",
    },
    "fear": {
        "gradient": ["#EDE8FE", "#C8B8F0", "#A080E0"],
        "accent": "#6A40C0",
        "text": "#2E1E5C",
        "glow": "rgba(106, 64, 192, 0.3)",
        "pattern": "mist",
    },
    "disgust": {
        "gradient": ["#E8FEF0", "#B8F0D0", "#7EE0A8"],
        "accent": "#40A06B",
        "text": "#1E5C3A",
        "glow": "rgba(64, 160, 107, 0.3)",
        "pattern": "waves",
    },
    "neutral": {
        "gradient": ["#F5F2ED", "#E3DFD8", "#D0CCC5"],
        "accent": "#8A857B",
        "text": "#4A4640",
        "glow": "rgba(138, 133, 123, 0.3)",
        "pattern": "dots",
    },
}

_FALLBACK_PALETTE = EMOTION_PALETTES["neutral"]


# ---------------------------------------------------------------------------
# POST /api/postcard
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=PostcardResponse,
    summary="Generate an emotion postcard with a quote and visual theme",
)
async def generate_postcard(body: PostcardRequest) -> PostcardResponse:
    emotion_key = body.emotion.lower().strip()

    # Pick a random quote for the emotion
    quotes = EMOTION_QUOTES.get(emotion_key, _FALLBACK_QUOTES)
    quote = random.choice(quotes)

    # Pick palette
    palette = EMOTION_PALETTES.get(emotion_key, _FALLBACK_PALETTE)

    return PostcardResponse(
        emotion=body.emotion,
        emoji=body.emoji,
        confidence=body.confidence,
        quote_text=quote["text"],
        quote_author=quote["author"],
        gradient=palette["gradient"],
        accent=palette["accent"],
        text_color=palette["text"],
        glow=palette["glow"],
        pattern=palette["pattern"],
    )
