"""
Personalization & Recommendation Engine for TheraVox AI
Analyzes user mood trends and activity history to yield tailored exercise, journal, and breathing suggestions.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, WellnessEntry


class RecommendationEngine:
    """Rule-based recommendation engine."""

    async def get_user_recommendations(self, user: User, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Analyze user's recent wellness entries to generate 3 personalized suggestions.
        """
        # Fetch entries from last 14 days
        cutoff = datetime.now(timezone.utc) - timedelta(days=14)
        result = await db.execute(
            select(WellnessEntry)
            .where(WellnessEntry.user_id == user.id, WellnessEntry.created_at >= cutoff)
            .order_by(WellnessEntry.created_at.desc())
        )
        recent_entries = result.scalars().all()

        mood_scores = [e.mood_score for e in recent_entries if e.mood_score is not None]
        avg_mood = (sum(mood_scores) / len(mood_scores)) if mood_scores else 7.0

        recommendations = []

        # Rule 1: Low average mood (avg < 5.0) -> Recommend Gratitude & Warm Chat
        if avg_mood < 5.0:
            recommendations.append(
                {
                    "id": "rec_gratitude",
                    "title": "Gratitude Check-in",
                    "category": "journal",
                    "description": "Your recent mood trend shows mild stress. Write down 3 small things that brought warmth today.",
                    "action_label": "Start Gratitude Log",
                    "target_route": "/wellness?tab=gratitude",
                    "icon": "sparkles",
                    "color": "#f59e0b",
                }
            )
            recommendations.append(
                {
                    "id": "rec_breathing_calm",
                    "title": "4-7-8 Deep Calm Breathing",
                    "category": "breathing",
                    "description": "Slow down your heart rate with 4 minutes of guided soothing breathwork.",
                    "action_label": "Begin Breathing",
                    "target_route": "/wellness?tab=breathing",
                    "icon": "wind",
                    "color": "#06b6d4",
                }
            )
        else:
            # Rule 2: High or neutral mood -> Recommend Growth Reflection & Postcard Share
            recommendations.append(
                {
                    "id": "rec_growth_reflection",
                    "title": "Reflect on a Victory",
                    "category": "journal",
                    "description": "You're keeping a strong momentum! Take 2 minutes to log what helped you stay positive.",
                    "action_label": "Write Reflection",
                    "target_route": "/wellness?tab=journal",
                    "icon": "book-open",
                    "color": "#10b981",
                }
            )
            recommendations.append(
                {
                    "id": "rec_postcard",
                    "title": "Create an Emotion Postcard",
                    "category": "creative",
                    "description": "Turn your positive mindset into a beautifully styled artistic card to save or share.",
                    "action_label": "Generate Card",
                    "target_route": "/postcard",
                    "icon": "image",
                    "color": "#8b5cf6",
                }
            )

        # Rule 3: Always include AI Companion conversation
        recommendations.append(
            {
                "id": "rec_companion_chat",
                "title": "Mindful Companion Chat",
                "category": "chat",
                "description": "Talk through your thoughts with MindfulMind AI for empathetic support.",
                "action_label": "Open Chat",
                "target_route": "/chat",
                "icon": "message-square",
                "color": "#ec4899",
            }
        )

        return recommendations[:3]


recommendation_engine = RecommendationEngine()
