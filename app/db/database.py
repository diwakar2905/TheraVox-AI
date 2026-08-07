"""Async SQLAlchemy engine and session factory."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


def _get_engine():
    """Create async engine lazily (after settings are loaded)."""
    settings = get_settings()
    database_url = settings.get("database_url")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. Add it to your .env file.\n"
            "Example: DATABASE_URL=postgresql+asyncpg://user:pass@localhost/theravox"
        )
    return create_async_engine(
        database_url,
        echo=False,           # Set True for SQL debug logging
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,   # Validates connections before use
    )


# Lazy engine — created on first access
_engine = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = _get_engine()
    return _engine


def get_session_factory():
    return async_sessionmaker(
        bind=get_engine(),
        class_=AsyncSession,
        expire_on_commit=False,
    )


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass
