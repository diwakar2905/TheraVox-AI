"""
Data Export Service for User Data Portability.
Compiles user profile, wellness entries, chat histories, crisis alerts, and feedback into a ZIP archive.
"""

import io
import json
import zipfile
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, WellnessEntry, ChatSession, ChatMessageDB, CrisisAlert, Feedback

async def generate_user_data_export_zip(user: User, db: AsyncSession) -> bytes:
    """Generate in-memory ZIP file containing all user data in JSON format."""
    
    # 1. Profile Data
    profile_data = {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }

    # 2. Wellness Entries
    res_wellness = await db.execute(select(WellnessEntry).where(WellnessEntry.user_id == user.id))
    wellness_entries = [
        {
            "id": str(e.id),
            "entry_type": e.entry_type,
            "content": e.content,
            "mood_score": e.mood_score,
            "tags": e.tags,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in res_wellness.scalars().all()
    ]

    # 3. Chat Sessions & Messages
    res_chats = await db.execute(select(ChatSession).where(ChatSession.user_id == user.id))
    chat_sessions = []
    for s in res_chats.scalars().all():
        res_msg = await db.execute(select(ChatMessageDB).where(ChatMessageDB.session_id == s.id))
        msgs = [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in res_msg.scalars().all()
        ]
        chat_sessions.append({
            "id": str(s.id),
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "messages": msgs,
        })

    # 4. Crisis Alerts
    res_crisis = await db.execute(select(CrisisAlert).where(CrisisAlert.user_id == user.id))
    crisis_alerts = [
        {
            "id": str(c.id),
            "severity": c.severity,
            "source": c.source,
            "input_snippet": c.input_snippet,
            "recommended_action": c.recommended_action,
            "resolved": c.resolved,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in res_crisis.scalars().all()
    ]

    # 5. Feedback History
    res_feedback = await db.execute(select(Feedback).where(Feedback.user_id == user.id))
    feedback_history = [
        {
            "id": str(f.id),
            "category": f.category,
            "subject": f.subject,
            "message": f.message,
            "rating": f.rating,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in res_feedback.scalars().all()
    ]

    # Create ZIP buffer
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("profile.json", json.dumps(profile_data, indent=2))
        zip_file.writestr("wellness_entries.json", json.dumps(wellness_entries, indent=2))
        zip_file.writestr("chat_sessions.json", json.dumps(chat_sessions, indent=2))
        zip_file.writestr("crisis_alerts.json", json.dumps(crisis_alerts, indent=2))
        zip_file.writestr("feedback_history.json", json.dumps(feedback_history, indent=2))

    zip_buffer.seek(0)
    return zip_buffer.getvalue()
