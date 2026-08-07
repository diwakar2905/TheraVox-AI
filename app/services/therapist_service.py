"""
Professional Therapist Portal Service.
Handles invitation code generation, client consent linking, and aggregate patient analytics.
"""

import uuid
import secrets
import string
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, TherapistClientLinkDB, WellnessEntry, CrisisAlert

class TherapistService:
    """Therapist management & patient monitoring service."""

    def generate_invite_code(self) -> str:
        """Generate a secure 6-character uppercase alphanumeric invitation code."""
        alphabet = string.ascii_uppercase + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(6))

    async def create_invite(self, therapist: User, db: AsyncSession) -> str:
        """Create a new pending invitation code for a therapist."""
        code = self.generate_invite_code()
        link = TherapistClientLinkDB(
            id=uuid.uuid4(),
            therapist_id=therapist.id,
            invite_code=code,
            status="pending",
            consent_shared=True,
        )
        db.add(link)
        await db.commit()
        return code

    async def link_client(self, client: User, invite_code: str, db: AsyncSession) -> bool:
        """Link a client to a therapist using an invitation code."""
        result = await db.execute(
            select(TherapistClientLinkDB).where(
                TherapistClientLinkDB.invite_code == invite_code.upper(),
                TherapistClientLinkDB.status == "pending"
            )
        )
        link = result.scalar_one_or_none()
        if not link:
            return False

        link.client_id = client.id
        link.status = "active"
        await db.commit()
        return True

therapist_service = TherapistService()
