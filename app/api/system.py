"""System endpoints (health, screenshot, etc)."""

import os
import base64
import logging
import asyncio
from datetime import datetime
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse

from app.api.dependencies import get_audio_analyzer
from app.services import AudioAnalyzerService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check(
    analyzer: AudioAnalyzerService = Depends(get_audio_analyzer)
):
    """Health check endpoint."""
    try:
        status = {
            "status": "ok",
            "text_ready": True,
            "audio_loaded": analyzer._hf_model is not None,
        }
        
        # Get audio library status
        try:
            audio_status = analyzer.get_status()
            status["audio_libs"] = bool(audio_status.get("hf_libs_available"))
        except Exception:
            status["audio_libs"] = False
        
        return JSONResponse(content=status)
        
    except Exception as e:
        return JSONResponse(
            content={"status": "error", "error": str(e)},
            status_code=500
        )


@router.post("/save_screenshot")
async def save_screenshot(request: Request):
    """Save a screenshot from the client."""
    try:
        # Parse request
        content_type = request.headers.get("content-type", "")
        
        if "application/json" in content_type:
            body = await request.json()
            image_data = body.get("image")
            
            if not image_data:
                return JSONResponse(
                    content={"error": "No image data provided"},
                    status_code=400
                )
            
            # Decode base64 image
            if image_data.startswith("data:image"):
                header, encoded = image_data.split(",", 1)
                file_extension = ".png"
                if "jpeg" in header:
                    file_extension = ".jpg"
            else:
                encoded = image_data
                file_extension = ".png"
            
            data = base64.b64decode(encoded)
            
        else:
            # Handle multipart file upload
            form = await request.form()
            file = form.get("file")
            
            if not file or not hasattr(file, "read"):
                return JSONResponse(
                    content={"error": "No file provided"},
                    status_code=400
                )
            
            data = await file.read()
            file_extension = os.path.splitext(getattr(file, "filename", ""))[1] or ".jpg"
        
        # Save file
        screenshots_dir = "screenshots"
        os.makedirs(screenshots_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshot_{timestamp}{file_extension}"
        file_path = os.path.join(screenshots_dir, filename)
        
        # Write in executor to avoid blocking
        loop = asyncio.get_event_loop()
        
        def write_file():
            with open(file_path, "wb") as f:
                f.write(data)
            if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
                raise Exception("File was not written correctly")
        
        await loop.run_in_executor(None, write_file)
        
        return JSONResponse(content={
            "success": True,
            "filename": filename,
            "path": file_path,
            "message": f"Screenshot saved successfully as {filename}"
        })
        
    except Exception as e:
        logger.error(f"Screenshot save error: {str(e)}")
        return JSONResponse(
            content={"error": f"Failed to save screenshot: {str(e)}"},
            status_code=500
        )
