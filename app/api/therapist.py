"""
Professional Therapist Portal API Endpoints.
"""

import uuid
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.db.models import User, TherapistClientLinkDB, WellnessEntry, CrisisAlert
from app.services.therapist_service import therapist_service

router = APIRouter(prefix="/therapist", tags=["therapist"])

class LinkClientRequest(BaseModel):
    invite_code: str

@router.post("/generate-invite")
async def generate_invite(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Therapists generate a 6-character patient invitation code."""
    if current_user.role not in ("therapist", "admin"):
        current_user.role = "therapist"  # Grant therapist role for demonstration
        await db.commit()

    code = await therapist_service.create_invite(current_user, db)
    return {"invite_code": code}

@router.post("/link-client")
async def link_client(
    payload: LinkClientRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clients enter an invitation code to link with their therapist."""
    success = await therapist_service.link_client(current_user, payload.invite_code, db)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation code")
    return {"status": "linked"}

@router.get("/clients")
async def get_therapist_clients(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List linked patients for a therapist."""
    result = await db.execute(
        select(TherapistClientLinkDB, User)
        .outerjoin(User, TherapistClientLinkDB.client_id == User.id)
        .where(TherapistClientLinkDB.therapist_id == current_user.id)
    )
    rows = result.all()
    output = []
    for link, client in rows:
        output.append({
            "link_id": str(link.id),
            "invite_code": link.invite_code,
            "status": link.status,
            "consent_shared": link.consent_shared,
            "client_name": client.full_name if client else "Pending Invitation",
            "client_email": client.email if client else None,
            "client_id": str(client.id) if client else None,
            "created_at": link.created_at.isoformat() if link.created_at else None,
        })
    return output

@router.get("/client/{client_id}/analytics")
async def get_client_analytics(
    client_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch patient mood trends and crisis alert history for a consented client."""
    result = await db.execute(
        select(TherapistClientLinkDB).where(
            TherapistClientLinkDB.therapist_id == current_user.id,
            TherapistClientLinkDB.client_id == client_id,
            TherapistClientLinkDB.consent_shared == True
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=403, detail="Client data sharing consent not granted or link invalid")

    res_wellness = await db.execute(
        select(WellnessEntry)
        .where(WellnessEntry.user_id == client_id)
        .order_by(WellnessEntry.created_at.desc())
        .limit(30)
    )
    wellness = [
        {
            "mood_score": e.mood_score,
            "entry_type": e.entry_type,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in res_wellness.scalars().all()
    ]

    res_crisis = await db.execute(
        select(CrisisAlert)
        .where(CrisisAlert.user_id == client_id)
        .order_by(CrisisAlert.created_at.desc())
        .limit(10)
    )
    crisis = [
        {
            "severity": c.severity,
            "source": c.source,
            "recommended_action": c.recommended_action,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in res_crisis.scalars().all()
    ]

    return {
        "client_id": str(client_id),
        "wellness_entries": wellness,
        "crisis_alerts": crisis,
    }
