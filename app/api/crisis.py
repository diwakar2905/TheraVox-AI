"""
Crisis Risk Detection API endpoints.

Routes
------
POST   /api/crisis/scan             — scan arbitrary text for crisis signals
GET    /api/crisis/alerts            — list the current user's past crisis alerts
GET    /api/crisis/alerts/{alert_id} — fetch a single alert detail
POST   /api/crisis/alerts/{alert_id}/resolve — mark an alert as resolved
GET    /api/crisis/resources         — return static list of crisis helplines
"""

import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_crisis_detector, get_current_user, get_db
from app.db.models import CrisisAlert, User
from app.models.schemas import (
    CrisisAlertListResponse,
    CrisisAlertResponse,
    CrisisAssessmentResponse,
    CrisisSignalSchema,
    ScanTextRequest,
)
from app.services.crisis_detector import CrisisAssessment, CrisisDetectorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crisis", tags=["crisis"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _assessment_to_response(assessment: CrisisAssessment) -> CrisisAssessmentResponse:
    return CrisisAssessmentResponse(
        flagged=assessment.flagged,
        severity=assessment.severity.value,
        signals=[
            CrisisSignalSchema(
                phrase=s.phrase,
                category=s.category,
                severity=s.severity.value,
            )
            for s in assessment.signals
        ],
        recommended_action=assessment.recommended_action,
        crisis_resources=assessment.crisis_resources,
    )


async def _persist_alert(
    db: AsyncSession,
    assessment: CrisisAssessment,
    source: str,
    input_text: str,
    user_id: Optional[uuid.UUID] = None,
) -> CrisisAlert:
    """Save a crisis alert to the database and return the ORM instance."""
    signals_data = [
        {"phrase": s.phrase, "category": s.category, "severity": s.severity.value}
        for s in assessment.signals
    ]
    alert = CrisisAlert(
        user_id=user_id,
        severity=assessment.severity.value,
        source=source,
        input_snippet=input_text[:500],
        signals_json=json.dumps(signals_data),
        recommended_action=assessment.recommended_action,
        escalation_sent=False,
        resolved=False,
    )
    db.add(alert)
    await db.flush()
    return alert


def _alert_to_response(alert: CrisisAlert) -> CrisisAlertResponse:
    try:
        signals = json.loads(alert.signals_json)
    except (json.JSONDecodeError, TypeError):
        signals = []
    return CrisisAlertResponse(
        id=alert.id,
        user_id=alert.user_id,
        severity=alert.severity,
        source=alert.source,
        input_snippet=alert.input_snippet,
        signals=[CrisisSignalSchema(**s) for s in signals],
        recommended_action=alert.recommended_action,
        escalation_sent=alert.escalation_sent,
        resolved=alert.resolved,
        created_at=alert.created_at,
    )


# ---------------------------------------------------------------------------
# POST /api/crisis/scan — ad-hoc text scan
# ---------------------------------------------------------------------------


@router.post(
    "/scan",
    response_model=CrisisAssessmentResponse,
    summary="Scan text for crisis-level language",
)
async def scan_text(
    body: ScanTextRequest,
    detector: CrisisDetectorService = Depends(get_crisis_detector),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CrisisAssessmentResponse:
    text = body.text
    source = body.source

    assessment = detector.analyze(text)

    # Persist if flagged
    if assessment.flagged:
        await _persist_alert(db, assessment, source, text, user_id=current_user.id)
        # Fire-and-forget escalation email for HIGH / CRITICAL
        if assessment.severity.value in ("high", "critical"):
            from app.services.crisis_escalation import fire_escalation_async
            fire_escalation_async(current_user, assessment)

    return _assessment_to_response(assessment)


# ---------------------------------------------------------------------------
# GET /api/crisis/alerts — paginated list for current user
# ---------------------------------------------------------------------------


@router.get(
    "/alerts",
    response_model=CrisisAlertListResponse,
    summary="List past crisis alerts for the current user",
)
async def list_alerts(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CrisisAlertListResponse:
    total_result = await db.execute(
        select(func.count(CrisisAlert.id)).where(CrisisAlert.user_id == current_user.id)
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(CrisisAlert)
        .where(CrisisAlert.user_id == current_user.id)
        .order_by(CrisisAlert.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    alerts = result.scalars().all()

    return CrisisAlertListResponse(
        alerts=[_alert_to_response(a) for a in alerts],
        total=total,
    )


# ---------------------------------------------------------------------------
# GET /api/crisis/alerts/{alert_id}
# ---------------------------------------------------------------------------


@router.get(
    "/alerts/{alert_id}",
    response_model=CrisisAlertResponse,
    summary="Get details for a specific crisis alert",
)
async def get_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CrisisAlertResponse:
    result = await db.execute(
        select(CrisisAlert).where(
            CrisisAlert.id == alert_id,
            CrisisAlert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    return _alert_to_response(alert)


# ---------------------------------------------------------------------------
# POST /api/crisis/alerts/{alert_id}/resolve
# ---------------------------------------------------------------------------


@router.post(
    "/alerts/{alert_id}/resolve",
    response_model=CrisisAlertResponse,
    summary="Mark a crisis alert as resolved",
)
async def resolve_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CrisisAlertResponse:
    result = await db.execute(
        select(CrisisAlert).where(
            CrisisAlert.id == alert_id,
            CrisisAlert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

    alert.resolved = True
    return _alert_to_response(alert)


# ---------------------------------------------------------------------------
# GET /api/crisis/resources — static helpline list
# ---------------------------------------------------------------------------


@router.get(
    "/resources",
    summary="Get list of crisis helplines and resources",
)
async def get_resources(
    detector: CrisisDetectorService = Depends(get_crisis_detector),
):
    return {"resources": detector.resources}


