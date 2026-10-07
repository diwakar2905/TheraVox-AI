"""
Therapeutic Programs Endpoints.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.db.models import ProgramEnrollmentDB, User
from app.services.program_service import program_service

router = APIRouter(prefix="/programs", tags=["programs"])


class CompleteStepPayload(BaseModel):
    step_id: str


@router.get("", response_model=List[Dict[str, Any]])
async def list_programs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List available therapeutic programs with user enrollment status."""
    catalog = program_service.get_catalog()

    result = await db.execute(select(ProgramEnrollmentDB).where(ProgramEnrollmentDB.user_id == current_user.id))
    enrollments = {e.program_id: e for e in result.scalars().all()}

    output = []
    for p in catalog:
        item = dict(p)
        enr = enrollments.get(p["id"])
        if enr:
            item["is_enrolled"] = True
            item["progress_percent"] = enr.progress_percent
            try:
                item["completed_steps"] = json.loads(enr.completed_steps)
            except Exception:
                item["completed_steps"] = []
            item["badge_earned"] = enr.badge_earned
        else:
            item["is_enrolled"] = False
            item["progress_percent"] = 0.0
            item["completed_steps"] = []
            item["badge_earned"] = None
        output.append(item)

    return output


@router.post("/{program_id}/enroll")
async def enroll_program(
    program_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enroll in a therapeutic program."""
    prog = program_service.get_program_by_id(program_id)
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")

    result = await db.execute(
        select(ProgramEnrollmentDB).where(
            ProgramEnrollmentDB.user_id == current_user.id, ProgramEnrollmentDB.program_id == program_id
        )
    )
    enr = result.scalar_one_or_none()
    if not enr:
        enr = ProgramEnrollmentDB(
            id=uuid.uuid4(),
            user_id=current_user.id,
            program_id=program_id,
            completed_steps="[]",
            progress_percent=0.0,
        )
        db.add(enr)
        await db.commit()

    return {"status": "enrolled", "program_id": program_id}


@router.post("/{program_id}/complete-step")
async def complete_program_step(
    program_id: str,
    payload: CompleteStepPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Complete a course step and update progress & badge status."""
    prog = program_service.get_program_by_id(program_id)
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")

    result = await db.execute(
        select(ProgramEnrollmentDB).where(
            ProgramEnrollmentDB.user_id == current_user.id, ProgramEnrollmentDB.program_id == program_id
        )
    )
    enr = result.scalar_one_or_none()
    if not enr:
        enr = ProgramEnrollmentDB(
            id=uuid.uuid4(),
            user_id=current_user.id,
            program_id=program_id,
            completed_steps="[]",
            progress_percent=0.0,
        )
        db.add(enr)

    try:
        completed = json.loads(enr.completed_steps)
    except Exception:
        completed = []

    if payload.step_id not in completed:
        completed.append(payload.step_id)

    enr.completed_steps = json.dumps(completed)
    total_steps = len(prog["steps"])
    enr.progress_percent = min(100.0, round((len(completed) / total_steps) * 100, 1))

    if enr.progress_percent >= 100.0:
        enr.badge_earned = prog["badge_name"]
        enr.completed_at = datetime.now(timezone.utc)

    await db.commit()
    return {
        "status": "step_completed",
        "progress_percent": enr.progress_percent,
        "badge_earned": enr.badge_earned,
    }
