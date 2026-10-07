"""Async SQLAlchemy engine and session factory."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


def normalize_database_url(url: str) -> str:
    """Coerce plain Postgres URLs (as given by Render/Heroku) to the asyncpg driver."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://") :]
    return url


def _get_engine():
    """Create async engine lazily (after settings are loaded)."""
    settings = get_settings()
    database_url = settings.get("database_url")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. Add it to your .env file.\n"
            "Example: DATABASE_URL=postgresql+asyncpg://user:pass@localhost/theravox"
        )
    database_url = normalize_database_url(database_url)
    if database_url.startswith("sqlite"):
        # SQLite (local dev / tests) does not support connection-pool sizing
        return create_async_engine(database_url, echo=False)
    return create_async_engine(
        database_url,
        echo=False,  # Set True for SQL debug logging
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,  # Validates connections before use
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
