"""
TheraVox AI - Main Application Entry Point

A modular, scalable emotion analysis system supporting:
- Text emotion analysis
- Audio emotion recognition  
- Vision-based facial emotion detection
"""

import setuptools  # must be first — registers distutils shim for Python 3.12 + TensorFlow
import os
import logging
import sys

# Cap thread usage before any heavy libraries are imported
os.environ.setdefault("OPENCV_THREADS", "2")
os.environ.setdefault("TORCH_NUM_THREADS", "2")
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
try:
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
except ImportError:
    _rate_limit_exceeded_handler = None
    class RateLimitExceeded(Exception):
        pass
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.gzip import GZipMiddleware

from app.core.logging_config import setup_logging
from app.core.middleware import RequestContextMiddleware
from app.core.sentry import init_sentry

# Configure structured JSON logging early
setup_logging(os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# Initialize Sentry Error Tracking
init_sentry(environment=os.environ.get("ENVIRONMENT", "development"))

logger.info("🚀 Initializing TheraVox AI...")

# Import core components (lightweight)
from app.core.lifespan import lifespan
from app.core.config import get_settings
from app.core.limiter import limiter

logger.info("✓ Core modules loaded")

# Get settings
settings = get_settings()
logger.info("✓ Configuration loaded")

# Create FastAPI application
logger.info("📦 Creating FastAPI application...")
app = FastAPI(
    title="TheraVox AI",
    description="Emotion Analysis API supporting text, audio, and vision",
    version="2.0.0",
    lifespan=lifespan
)

# Attach rate limiter
app.state.limiter = limiter
if _rate_limit_exceeded_handler:
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add middleware
app.add_middleware(RequestContextMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)
logger.info("✓ Middleware configured")

# Mount static files
app.mount("/static", StaticFiles(directory=settings.get("static_dir", "static")), name="static")
logger.info("✓ Static files mounted")

# Import and include API router (deferred to avoid loading heavy dependencies)
logger.info("📡 Loading API routes...")
from app.api.router import api_router
app.include_router(api_router)
logger.info("✓ API routes loaded")

# Serve the built React SPA (frontend `npm run build` outputs into static/).
# Implemented as a 404 handler rather than a catch-all route so it never shadows
# API routes, method checks (405) or trailing-slash redirects.
_static_root = Path(settings.get("static_dir", "static")).resolve()
_spa_index = _static_root / "index.html"
_NON_SPA_PREFIXES = ("/api/", "/static/", "/docs", "/redoc", "/openapi.json")


@app.exception_handler(StarletteHTTPException)
async def spa_fallback(request: Request, exc: StarletteHTTPException):
    """Serve static/ files and index.html for client-side routes on unmatched GETs."""
    path = request.url.path
    if (
        exc.status_code == 404
        and request.method in ("GET", "HEAD")
        and not path.startswith(_NON_SPA_PREFIXES)
        and _spa_index.is_file()
    ):
        candidate = (_static_root / path.lstrip("/")).resolve()
        if path != "/" and candidate.is_file() and candidate.is_relative_to(_static_root):
            return FileResponse(candidate)
        return FileResponse(_spa_index)
    return await http_exception_handler(request, exc)


logger.info("✨ TheraVox AI ready! Models will load on first use.")


if __name__ == "__main__":
    import uvicorn
    
    host = settings.get("host", "127.0.0.1")
    port = settings.get("port", 8000)
    
    logger.info(f"Starting TheraVox AI on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
