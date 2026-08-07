"""
Global Pytest Configuration and Test Fixtures
Provides fixtures for FastAPI async client, test SQLite in-memory database, test user data, and mock services.
"""

import pytest
import asyncio
import uuid
import os
import sys
from unittest.mock import MagicMock, AsyncMock, patch
from typing import AsyncGenerator

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Set test environment variable BEFORE importing app
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-super-secure-32-chars-long"

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db.database import Base
from app.api.dependencies import get_db, get_text_analyzer, get_audio_analyzer, get_vision_analyzer, get_crisis_detector
from app.auth.utils import create_access_token, hash_password
from app.db.models import User

# Check if aiosqlite is available
try:
    import aiosqlite
    HAS_AIOSQLITE = True
except ImportError:
    HAS_AIOSQLITE = False

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
def test_engine():
    if not HAS_AIOSQLITE:
        yield None
        return
        
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async def _init_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    asyncio.run(_init_tables())
    yield engine
    async def _drop_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()
    asyncio.run(_drop_tables())

@pytest.fixture(scope="function")
def db_session(test_engine):
    if not HAS_AIOSQLITE or test_engine is None:
        mock_session = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_result.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        yield mock_session
        return

    session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)
    async def _get_sess():
        async with session_factory() as session:
            return session
    session = asyncio.run(_get_sess())
    yield session

@pytest.fixture
def test_user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        email="testuser@example.com",
        full_name="Test User",
        hashed_password=hash_password("Password123!"),
        is_active=True,
    )
    if HAS_AIOSQLITE and not isinstance(db_session, AsyncMock):
        async def _save():
            db_session.add(user)
            await db_session.commit()
            await db_session.refresh(user)
        asyncio.run(_save())
    return user

@pytest.fixture
def auth_headers(test_user: User) -> dict:
    access_token = create_access_token(test_user.id, test_user.email)
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture
def client(db_session: AsyncSession):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    
    # Mock ML services to keep unit tests fast and offline
    mock_text = MagicMock()
    mock_text.analyze.return_value = ("happy", 0.95, {"happy": 0.95, "neutral": 0.05})
    
    mock_audio = MagicMock()
    mock_audio.analyze.return_value = {
        "dominant_emotion": "calm",
        "confidence": 0.88,
        "emotion_scores": {"calm": 0.88, "happy": 0.12},
        "transcript": "Hello world test audio transcript"
    }

    mock_vision = MagicMock()
    mock_vision.analyze_frame.return_value = {
        "emotion": "happy",
        "confidence": 0.92,
        "face_detected": True
    }

    mock_crisis = MagicMock()
    mock_crisis.analyze.return_value = MagicMock(
        flagged=False,
        severity=MagicMock(value="none"),
        signals=[],
        recommended_action="",
        crisis_resources=[]
    )

    app.dependency_overrides[get_text_analyzer] = lambda: mock_text
    app.dependency_overrides[get_audio_analyzer] = lambda: mock_audio
    app.dependency_overrides[get_vision_analyzer] = lambda: mock_vision
    app.dependency_overrides[get_crisis_detector] = lambda: mock_crisis

    transport = ASGITransport(app=app)
    ac = AsyncClient(transport=transport, base_url="http://test")
    yield ac

    app.dependency_overrides.clear()
