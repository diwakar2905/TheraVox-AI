"""
Emergency Contact Management Endpoints.
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.db.models import EmergencyContactDB, User
from app.models.schemas import EmergencyContactCreate, EmergencyContactResponse

router = APIRouter(prefix="/emergency-contacts", tags=["emergency-contacts"])


@router.get("", response_model=List[EmergencyContactResponse])
async def list_emergency_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all emergency contacts for the authenticated user."""
    result = await db.execute(select(EmergencyContactDB).where(EmergencyContactDB.user_id == current_user.id))
    contacts = result.scalars().all()
    return [
        EmergencyContactResponse(
            id=c.id,
            name=c.name,
            phone=c.phone,
            email=c.email,
            relationship=c.relationship_type,
            created_at=c.created_at,
        )
        for c in contacts
    ]


@router.post("", response_model=EmergencyContactResponse, status_code=status.HTTP_201_CREATED)
async def create_emergency_contact(
    payload: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new emergency contact."""
    contact = EmergencyContactDB(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        relationship_type=payload.relationship,
        is_primary=True,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return EmergencyContactResponse(
        id=contact.id,
        name=contact.name,
        phone=contact.phone,
        email=contact.email,
        relationship=contact.relationship_type,
        created_at=contact.created_at,
    )


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_emergency_contact(
    contact_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an emergency contact."""
    result = await db.execute(
        select(EmergencyContactDB).where(
            EmergencyContactDB.id == contact_id, EmergencyContactDB.user_id == current_user.id
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    await db.delete(contact)
    await db.commit()
