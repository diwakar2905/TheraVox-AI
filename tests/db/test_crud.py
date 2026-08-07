"""
Unit tests for Database CRUD operations and SQLAlchemy ORM models.
"""

import pytest
import asyncio
import uuid
from unittest.mock import AsyncMock
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, RefreshToken, WellnessEntry
from app.auth.utils import hash_password

def test_user_creation_and_query(db_session: AsyncSession):
    if isinstance(db_session, AsyncMock):
        pytest.skip("aiosqlite not installed locally")
    async def _test():
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="crud_test@example.com",
            full_name="CRUD Test User",
            hashed_password=hash_password("Secret123!"),
            is_active=True
        )
        db_session.add(user)
        await db_session.commit()

        result = await db_session.execute(select(User).where(User.id == user_id))
        fetched_user = result.scalar_one_or_none()
        assert fetched_user is not None
        assert fetched_user.email == "crud_test@example.com"
        assert fetched_user.is_active is True
    asyncio.run(_test())

def test_wellness_entry_crud(db_session: AsyncSession, test_user: User):
    if isinstance(db_session, AsyncMock):
        pytest.skip("aiosqlite not installed locally")
    async def _test():
        entry = WellnessEntry(
            id=uuid.uuid4(),
            user_id=test_user.id,
            entry_type="journal",
            content="Testing wellness entry creation",
            mood_score=4.0
        )
        db_session.add(entry)
        await db_session.commit()

        result = await db_session.execute(select(WellnessEntry).where(WellnessEntry.user_id == test_user.id))
        entries = result.scalars().all()
        assert len(entries) >= 1
        assert entries[0].content == "Testing wellness entry creation"
    asyncio.run(_test())
