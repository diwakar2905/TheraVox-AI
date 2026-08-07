"""
Push Notifications Subscription & Settings Endpoints.
"""

import uuid
from pydantic import BaseModel
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.db.models import PushSubscriptionDB, User

router = APIRouter(prefix="/notifications", tags=["notifications"])

class SubscriptionPayload(BaseModel):
    endpoint: str
    keys: dict
    preferred_time: str = "20:00"

class SettingsPayload(BaseModel):
    preferred_time: str
    is_active: bool = True

@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_push(
    payload: SubscriptionPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register or update Web Push subscription endpoint."""
    result = await db.execute(
        select(PushSubscriptionDB).where(PushSubscriptionDB.endpoint == payload.endpoint)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        sub = PushSubscriptionDB(
            id=uuid.uuid4(),
            user_id=current_user.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.get("p256dh", ""),
            auth=payload.keys.get("auth", ""),
            preferred_time=payload.preferred_time,
            is_active=True,
        )
        db.add(sub)
    else:
        sub.preferred_time = payload.preferred_time
        sub.is_active = True

    await db.commit()
    return {"status": "subscribed", "preferred_time": sub.preferred_time}

@router.patch("/settings")
async def update_notification_settings(
    payload: SettingsPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update preferred notification check-in time."""
    result = await db.execute(
        select(PushSubscriptionDB).where(PushSubscriptionDB.user_id == current_user.id)
    )
    subs = result.scalars().all()
    for s in subs:
        s.preferred_time = payload.preferred_time
        s.is_active = payload.is_active

    await db.commit()
    return {"status": "updated", "preferred_time": payload.preferred_time}
