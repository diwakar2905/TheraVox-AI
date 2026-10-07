"""Application lifespan management."""

import logging
import os
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
    logger.info(
        f"✓ Thread limits set (OpenCV: {settings.get('opencv_threads', 2)}, "
        f"PyTorch: {settings.get('torch_threads', 2)})"
    )

    # Create necessary directories
    try:
        create_directories()
        logger.info("✓ Directories ready")
    except Exception as e:
        logger.warning(f"⚠ Failed to create directories: {str(e)}")

    # SQLite (local dev) has no Alembic history — the migrations target Postgres —
    # so create the tables directly from the ORM models.
    if str(settings.get("database_url", "")).startswith("sqlite"):
        try:
            import app.db.models  # noqa: F401  — registers models on Base.metadata
            from app.db.database import Base, get_engine

            async with get_engine().begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("✓ SQLite tables ready")
        except Exception as e:
            logger.error(f"⚠ Failed to initialise SQLite database: {e}")

    logger.info("✅ TheraVox AI ready! Server starting...")
    logger.info("💡 Note: AI models will load lazily on first request (this is normal)")

    yield

    # Shutdown
    logger.info("🛑 Shutting down TheraVox AI...")
