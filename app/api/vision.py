"""Vision-based emotion analysis API endpoints."""

import base64
import logging
import asyncio
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse

from app.api.dependencies import get_vision_analyzer
from app.services import VisionAnalyzerService
from app.utils.emotion_utils import get_emotion_emoji, get_emotion_description

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze_frame")
async def analyze_frame(
    request: Request,
    analyzer: VisionAnalyzerService = Depends(get_vision_analyzer)
):
    """Analyze video frame for faces and emotions."""
    try:
        # Get image data from request
        data = await request.json()
        image_data = data.get("image", "")
        
        if not image_data:
            return JSONResponse(
                content={"error": "No image data provided"},
                status_code=400
            )
        
        # Process in executor to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, process_frame, image_data, analyzer)
        
        if "error" in result:
            return JSONResponse(
                content={"error": result["error"]},
                status_code=result.get("status", 400)
            )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Frame analysis error: {str(e)}")
        return JSONResponse(
            content={"error": f"Analysis failed: {str(e)}"},
            status_code=500
        )


def process_frame(image_data: str, analyzer: VisionAnalyzerService) -> dict:
    """Process a single frame (runs in executor)."""
    try:
        import cv2
        import numpy as np
        
        # Decode base64 image
        img_data = image_data.split(",")[1] if image_data.startswith("data:image") else image_data
        image_bytes = base64.b64decode(img_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        
        if len(nparr) == 0:
            return {"error": "Empty image data", "status": 400}
        
        # Decode image
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            return {"error": "Could not decode image", "status": 400}
        
        # Analyze frame
        results = analyzer.analyze_frame(image)
        
        if not results:
            return {"faces": []}
        
        # Format results
        face_results = []
        for result in results:
            emotion = result['emotion']
            confidence = result['confidence']
            
            face_results.append({
                "emotion": emotion,
                "confidence": confidence,
                "emoji": get_emotion_emoji(emotion),
                "description": get_emotion_description(emotion, confidence)
            })
        
        return {"faces": face_results}
        
    except Exception as e:
        logger.error(f"Frame processing error: {e}")
        return {"error": str(e), "status": 500}
