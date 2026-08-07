"""
Personalized recommendations endpoint.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.db.models import User
from app.services.recommendation_service import recommendation_engine

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get personalized wellness activity and prompt recommendations."""
    return await recommendation_engine.get_user_recommendations(current_user, db)
