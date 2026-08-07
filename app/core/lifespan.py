"""Application lifespan management."""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.core.config import get_settings
from app.utils.file_utils import create_directories


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("🔧 Configuring environment...")
    
    settings = get_settings()
    
    # Set environment variables for optimization
    os.environ["OPENCV_NUM_THREADS"] = str(settings.get("opencv_threads", 2))
    os.environ["TORCH_NUM_THREADS"] = str(settings.get("torch_threads", 2))
    os.environ["OMP_NUM_THREADS"] = str(settings.get("torch_threads", 2))
    logger.info(f"✓ Thread limits set (OpenCV: {settings.get('opencv_threads', 2)}, PyTorch: {settings.get('torch_threads', 2)})")
    
    # Create necessary directories
    try:
        create_directories()
        logger.info("✓ Directories ready")
    except Exception as e:
        logger.warning(f"⚠ Failed to create directories: {str(e)}")
    
    logger.info("✅ TheraVox AI ready! Server starting...")
    logger.info("💡 Note: AI models will load lazily on first request (this is normal)")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down TheraVox AI...")
