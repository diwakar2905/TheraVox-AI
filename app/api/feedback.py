"""
Feedback endpoints — requires authentication.

POST /api/feedback        — submit new feedback
GET  /api/feedback        — list the current user's submitted feedback
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.db.models import Feedback, User
from app.models.schemas import FeedbackCreate, FeedbackResponse
from app.services.email_service import send_feedback_notification

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


# ---------------------------------------------------------------------------
# POST /api/feedback
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=FeedbackResponse,
    status_code=201,
    summary="Submit user feedback",
)
async def submit_feedback(
    body: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackResponse:
    entry = Feedback(
        user_id=current_user.id,
        category=body.category,
        subject=body.subject,
        message=body.message,
        rating=body.rating,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    # Fire-and-forget email — won't block the response or fail the request
    send_feedback_notification(
        submitter_name=current_user.full_name,
        submitter_email=current_user.email,
        category=body.category,
        subject=body.subject,
        message=body.message,
        rating=body.rating,
    )

    return FeedbackResponse.model_validate(entry)


# ---------------------------------------------------------------------------
# GET /api/feedback
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=list[FeedbackResponse],
    summary="List the current user's feedback submissions",
)
async def list_feedback(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FeedbackResponse]:
    q = (
        select(Feedback)
        .where(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
    )
    result = await db.execute(q)
    return [FeedbackResponse.model_validate(f) for f in result.scalars().all()]
