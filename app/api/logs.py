"""
Client Logging Endpoint
Receives log payloads from frontend clients for centralized log aggregation.
"""

import logging
from fastapi import APIRouter, Body
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

router = APIRouter(prefix="/logs", tags=["Logs"])
logger = logging.getLogger("theravox.client")

class LogPayload(BaseModel):
    level: str = Field(..., description="Log level: info, warn, error")
    message: str = Field(..., description="Log message content")
    timestamp: Optional[str] = None
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

@router.post("")
async def receive_client_log(payload: LogPayload = Body(...)):
    """Receives frontend logs and writes them to backend structured log stream."""
    level = payload.level.lower()
    extra_data = {
        "client_timestamp": payload.timestamp,
        "user_id": payload.user_id,
        "context": payload.context,
    }
    
    if level == "error":
        logger.error(f"[CLIENT] {payload.message}", extra=extra_data)
    elif level == "warn" or level == "warning":
        logger.warning(f"[CLIENT] {payload.message}", extra=extra_data)
    else:
        logger.info(f"[CLIENT] {payload.message}", extra=extra_data)
        
    return {"status": "success", "received": True}
