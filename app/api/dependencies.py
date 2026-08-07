"""Dependency injection for API routes."""

import uuid
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.database import get_session_factory
from app.services import TextAnalyzerService, AudioAnalyzerService, VisionAnalyzerService
from app.services.crisis_detector import CrisisDetectorService

_bearer_scheme = HTTPBearer(auto_error=True)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session, committing on success and rolling back on error."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Validate the Bearer JWT and return the corresponding User ORM object."""
    from app.auth.utils import verify_access_token
    from app.db.models import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = verify_access_token(credentials.credentials)  # raises 401 on failure
    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception

    return user


# Singleton instances for services (lazy-loaded)
_text_analyzer = None
_audio_analyzer = None
_vision_analyzer = None
_crisis_detector = None


def get_text_analyzer() -> TextAnalyzerService:
    """Get or create text analyzer instance."""
    global _text_analyzer
    if _text_analyzer is None:
        _text_analyzer = TextAnalyzerService()
    return _text_analyzer


def get_audio_analyzer() -> AudioAnalyzerService:
    """Get or create audio analyzer instance."""
    global _audio_analyzer
    if _audio_analyzer is None:
        _audio_analyzer = AudioAnalyzerService()
    return _audio_analyzer


def get_vision_analyzer() -> VisionAnalyzerService:
    """Get or create vision analyzer instance."""
    global _vision_analyzer
    if _vision_analyzer is None:
        settings = get_settings()
        _vision_analyzer = VisionAnalyzerService(settings)
    return _vision_analyzer


def get_crisis_detector() -> CrisisDetectorService:
    """Get or create crisis detector instance."""
    global _crisis_detector
    if _crisis_detector is None:
        _crisis_detector = CrisisDetectorService()
    return _crisis_detector
