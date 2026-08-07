"""Text emotion analysis API endpoints with crisis detection."""

import logging
import asyncio
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse

from app.api.dependencies import get_text_analyzer, get_crisis_detector
from app.services import TextAnalyzerService
from app.services.crisis_detector import CrisisDetectorService
from app.models.schemas import EmotionResponse
from app.utils.emotion_utils import get_emotion_emoji, get_emotion_description

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze_text", response_model=EmotionResponse)
async def analyze_text(
    request: Request,
    analyzer: TextAnalyzerService = Depends(get_text_analyzer),
    crisis_detector: CrisisDetectorService = Depends(get_crisis_detector),
):
    """
    Analyze text for emotion.
    
    Accepts both JSON and form data.
    Includes real-time crisis risk detection — the response will contain a
    ``crisis`` key when risk signals are found.
    """
    try:
        # Handle both JSON and form data
        content_type = request.headers.get("content-type", "")
        
        if "application/json" in content_type:
            data = await request.json()
            text = data.get("text", "")
        else:
            form_data = await request.form()
            text = form_data.get("text", "")
        
        # Run emotion analysis in executor to avoid blocking event loop
        loop = asyncio.get_running_loop()
        emotion, confidence, scores = await loop.run_in_executor(
            None,
            analyzer.analyze,
            text
        )
        
        # Get additional info
        emoji = get_emotion_emoji(emotion)
        description = get_emotion_description(emotion, confidence)

        # ── Crisis detection (fast, regex-only — no executor needed) ──
        crisis_assessment = crisis_detector.analyze(text)

        response_data: dict = {
            "emotion": emotion,
            "confidence": confidence,
            "emoji": emoji,
            "description": description,
            "scores": scores,
        }

        if crisis_assessment.flagged:
            response_data["crisis"] = crisis_assessment.to_dict()

        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"Text analysis error: {e}", exc_info=True)
        return JSONResponse(
            content={"error": "Analysis failed. Please try again."},
            status_code=500
        )
