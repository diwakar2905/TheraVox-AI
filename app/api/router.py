"""Main API router combining all route modules."""

from fastapi import APIRouter

from app.api.text import router as text_router
from app.api.audio import router as audio_router
from app.api.vision import router as vision_router
from app.api.system import router as system_router
from app.api.auth import router as auth_router
from app.api.oauth import router as oauth_router
from app.api.wellness import router as wellness_router
from app.api.feedback import router as feedback_router
from app.api.chat import router as chat_router
from app.api.journal import router as journal_router
from app.api.postcard import router as postcard_router
from app.api.crisis import router as crisis_router
from app.api.logs import router as logs_router
from app.api.recommendations import router as recommendations_router
from app.api.emergency_contacts import router as emergency_contacts_router
from app.api.notifications import router as notifications_router
from app.api.programs import router as programs_router
from app.api.therapist import router as therapist_router

# Create main API router
api_router = APIRouter()

# Include API routes with /api prefix
api_router.include_router(text_router, prefix="/api", tags=["text"])
api_router.include_router(audio_router, prefix="/api", tags=["audio"])
api_router.include_router(vision_router, prefix="/api", tags=["vision"])
api_router.include_router(system_router, prefix="/api", tags=["system"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(oauth_router, tags=["oauth"])
api_router.include_router(wellness_router, tags=["wellness"])
api_router.include_router(feedback_router, tags=["feedback"])
api_router.include_router(chat_router, tags=["chat"])
api_router.include_router(journal_router, tags=["journal"])
api_router.include_router(postcard_router, tags=["postcard"])
api_router.include_router(crisis_router, tags=["crisis"])
api_router.include_router(logs_router, prefix="/api", tags=["logs"])
api_router.include_router(recommendations_router, prefix="/api", tags=["recommendations"])
api_router.include_router(emergency_contacts_router, prefix="/api", tags=["emergency-contacts"])
api_router.include_router(notifications_router, prefix="/api", tags=["notifications"])
api_router.include_router(programs_router, prefix="/api", tags=["programs"])
api_router.include_router(therapist_router, prefix="/api", tags=["therapist"])
