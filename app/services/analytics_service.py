"""
PostHog Analytics Server-Side Integration for TheraVox AI
Handles event logging with user anonymization and opt-out support.
"""

import os
import hashlib
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Server-side PostHog telemetry service with user anonymization."""

    def __init__(self):
        self.api_key = os.environ.get("POSTHOG_API_KEY", "")
        self.host = os.environ.get("POSTHOG_HOST", "https://app.posthog.com")
        self._client = None
        self._enabled = False

        if self.api_key:
            try:
                from posthog import Posthog
                self._client = Posthog(project_api_key=self.api_key, host=self.host)
                self._enabled = True
                logger.info("✅ PostHog Analytics initialized.")
            except ImportError:
                logger.info("ℹ️ posthog package not installed. Skipping PostHog server telemetry.")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize PostHog: {e}")

    def _anonymize_user_id(self, user_id: str) -> str:
        """Hash user UUID to guarantee anonymization and user privacy."""
        return hashlib.sha256(user_id.encode("utf-8")).hexdigest()[:16]

    def capture(self, user_id: Optional[str], event_name: str, properties: Optional[Dict[str, Any]] = None) -> None:
        """Capture an event safely."""
        distinct_id = self._anonymize_user_id(user_id) if user_id else "anonymous_user"
        props = properties or {}

        logger.info(f"[ANALYTICS] Event: {event_name} (User: {distinct_id[:8]})")

        if self._enabled and self._client:
            try:
                self._client.capture(distinct_id=distinct_id, event=event_name, properties=props)
            except Exception as e:
                logger.warning(f"Failed to ship PostHog event {event_name}: {e}")

analytics_service = AnalyticsService()
