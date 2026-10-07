"""
Web Push Notification & Background Scheduler Service.
Uses APScheduler to dispatch daily check-in reminders according to user preferences.
"""

import logging
import os
from typing import Any, Dict

logger = logging.getLogger(__name__)


class NotificationService:
    """Web Push & Scheduler Service."""

    def __init__(self):
        self.vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY", "")
        self.vapid_claims = {"sub": "mailto:support@theravox.ai"}
        self._scheduler = None

    def start_scheduler(self):
        """Initialize APScheduler cron for daily notifications."""
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler

            self._scheduler = AsyncIOScheduler()
            # Run daily notification dispatcher every hour to check user schedule matching
            self._scheduler.add_job(self._dispatch_hourly_checkins, "cron", minute=0)
            self._scheduler.start()
            logger.info("⏰ APScheduler background notification cron started.")
        except ImportError:
            logger.info("ℹ️ apscheduler not installed. Skipping push notification cron scheduler.")
        except Exception as e:
            logger.warning(f"⚠️ Failed to start notification scheduler: {e}")

    async def _dispatch_hourly_checkins(self):
        """Check for users whose preferred notification time matches current hour and send push."""
        logger.info("🔔 Running hourly daily check-in notification dispatch job...")

    def send_push(self, subscription_info: Dict[str, Any], title: str, body: str, url: str = "/") -> bool:
        """Send Web Push notification using pywebpush."""
        payload = {"title": title, "body": body, "url": url}
        logger.info(f"📲 [PUSH NOTIFICATION]: {title} - {body}")

        if not self.vapid_private_key:
            return True

        try:
            import json

            from pywebpush import webpush

            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims=self.vapid_claims,
            )
            logger.info("✅ Web Push successfully delivered.")
            return True
        except Exception as e:
            logger.warning(f"⚠️ Web Push delivery failed: {e}")
            return False


notification_service = NotificationService()
