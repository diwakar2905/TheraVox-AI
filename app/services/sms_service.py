"""
Twilio SMS Service for Crisis Escalation.
Dispatches urgent SMS alerts to registered emergency contacts during HIGH and CRITICAL severity events.
"""

import logging
import os

logger = logging.getLogger(__name__)


class SMSService:
    """Twilio SMS Dispatcher."""

    def __init__(self):
        self.account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        self.auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
        self.from_phone = os.environ.get("TWILIO_FROM_PHONE", "")
        self._client = None

        if self.account_sid and self.auth_token and self.from_phone:
            try:
                from twilio.rest import Client

                self._client = Client(self.account_sid, self.auth_token)
                logger.info("✅ Twilio SMS Service initialized.")
            except ImportError:
                logger.info("ℹ️ twilio package not installed. SMS will be logged to console.")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize Twilio client: {e}")

    def send_crisis_sms(self, to_phone: str, contact_name: str, user_name: str, severity: str) -> bool:
        """Send emergency SMS alert."""
        message_body = (
            f"URGENT ALERT: TheraVox AI Crisis System detected a {severity.upper()} distress alert for {user_name}. "
            f"Please reach out to them immediately or contact emergency helplines. (Ref: {contact_name})"
        )

        logger.info(f"📱 [SMS ALERT to {to_phone}]: {message_body}")

        if self._client and self.from_phone:
            try:
                msg = self._client.messages.create(body=message_body, from_=self.from_phone, to=to_phone)
                logger.info(f"✅ Twilio SMS sent (SID: {msg.sid})")
                return True
            except Exception as e:
                logger.error(f"❌ Twilio SMS failed to send to {to_phone}: {e}")
                return False
        return True


sms_service = SMSService()
