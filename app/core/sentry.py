"""
Sentry Error Tracking Integration for TheraVox AI Backend
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


def init_sentry(dsn: Optional[str] = None, environment: str = "development") -> bool:
    """
    Initializes Sentry SDK if DSN is provided in environment or argument.
    """
    sentry_dsn = dsn or os.environ.get("SENTRY_DSN")
    if not sentry_dsn:
        logger.info("ℹ️ SENTRY_DSN not configured. Skipping Sentry initialization.")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.2")),
            profiles_sample_rate=float(os.environ.get("SENTRY_PROFILES_SAMPLE_RATE", "0.1")),
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
            send_default_pii=False,
        )
        logger.info("✅ Sentry initialized successfully.")
        return True
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize Sentry: {e}")
        return False
