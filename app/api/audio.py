"""Audio emotion analysis API endpoints."""

import os
import uuid
import logging
import asyncio
from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import JSONResponse

from app.api.dependencies import get_audio_analyzer
from app.services import AudioAnalyzerService
from app.models.schemas import EmotionResponse, AudioStatusResponse
from app.utils.emotion_utils import get_emotion_emoji, get_emotion_description

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze_audio", response_model=EmotionResponse)
async def analyze_audio(
    file: UploadFile = File(...),
    analyzer: AudioAnalyzerService = Depends(get_audio_analyzer)
):
    """Analyze audio file for emotion."""
    # Build a unique temp path so concurrent requests never collide.
    os.makedirs("logs", exist_ok=True)

    # Preserve the original extension for format detection on the backend.
    original_name = file.filename or "upload"
    ext = os.path.splitext(original_name)[-1] or ".wav"
    file_path = os.path.join("logs", f"audio_{uuid.uuid4().hex}{ext}")

    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        loop = asyncio.get_running_loop()
        emotion, confidence, scores = await loop.run_in_executor(
            None,
            analyzer.analyze,
            file_path,
        )

        emoji       = get_emotion_emoji(emotion)
        description = get_emotion_description(emotion, confidence)

        return EmotionResponse(
            emotion=emotion,
            confidence=confidence,
            emoji=emoji,
            description=description,
            scores=scores,
        )

    except Exception as e:
        logger.error(f"Audio analysis error: {e}", exc_info=True)
        return JSONResponse(
            content={"error": "Analysis failed. Please try again."},
            status_code=500,
        )
    finally:
        # Always clean up the temp file after analysis.
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except Exception:
            pass


@router.get("/audio_status", response_model=AudioStatusResponse)
async def audio_status(
    analyzer: AudioAnalyzerService = Depends(get_audio_analyzer)
):
    """Get audio analyzer runtime status."""
    try:
        status = analyzer.get_status()
        return AudioStatusResponse(**status)
    except Exception as e:
        logger.error(f"Audio status error: {e}", exc_info=True)
        return JSONResponse(
            content={"error": "Failed to retrieve status."},
            status_code=500,
        )
