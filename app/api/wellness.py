"""
Wellness endpoints — requires authentication.

POST /api/wellness/entries   — create a new wellness entry
GET  /api/wellness/entries   — list the current user's wellness entries
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.db.models import User, WellnessEntry
from app.models.schemas import WellnessEntryCreate, WellnessEntryResponse

router = APIRouter(prefix="/api/wellness", tags=["wellness"])


# ---------------------------------------------------------------------------
# POST /api/wellness/entries
# ---------------------------------------------------------------------------

@router.post(
    "/entries",
    response_model=WellnessEntryResponse,
    status_code=201,
    summary="Create a new wellness entry",
)
async def create_wellness_entry(
    body: WellnessEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WellnessEntryResponse:
    entry = WellnessEntry(
        user_id=current_user.id,
        entry_type=body.entry_type,
        content=body.content,
        mood_score=body.mood_score,
        tags=body.tags,
    )
    db.add(entry)
    await db.flush()  # populate entry.id + created_at without committing yet
    await db.refresh(entry)
    return WellnessEntryResponse.model_validate(entry)


# ---------------------------------------------------------------------------
# GET /api/wellness/entries
# ---------------------------------------------------------------------------

@router.get(
    "/entries",
    response_model=list[WellnessEntryResponse],
    summary="List the current user's wellness entries",
)
async def list_wellness_entries(
    entry_type: str | None = Query(default=None, description="Filter by entry_type"),
    limit: int = Query(default=50, ge=1, le=200, description="Max entries to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WellnessEntryResponse]:
    q = select(WellnessEntry).where(WellnessEntry.user_id == current_user.id)

    if entry_type:
        q = q.where(WellnessEntry.entry_type == entry_type)

    q = q.order_by(WellnessEntry.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(q)
    entries = result.scalars().all()
    return [WellnessEntryResponse.model_validate(e) for e in entries]
