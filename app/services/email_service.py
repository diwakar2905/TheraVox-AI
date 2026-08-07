"""
Async email notification service.

Uses aiosmtplib + Python's email.mime so there are no heavy dependencies.
All errors are swallowed and logged — a failing SMTP server must never
break the feedback submission response.
"""

import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    import aiosmtplib
except ImportError:
    aiosmtplib = None

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def _send(subject: str, html_body: str, text_body: str) -> None:
    """Internal async send — called fire-and-forget from endpoints."""
    settings = get_settings()

    smtp_host = settings.get("smtp_host", "")
    smtp_port = int(settings.get("smtp_port", 587))
    smtp_user = settings.get("smtp_user", "")
    smtp_password = settings.get("smtp_password", "")
    from_addr = settings.get("smtp_from", smtp_user)
    to_addr = settings.get("notify_email", "")

    if not aiosmtplib or not all([smtp_host, smtp_user, smtp_password, to_addr]):
        logger.debug("Email notification skipped — SMTP not configured or aiosmtplib missing.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"TheraVox AI <{from_addr}>"
    msg["To"] = to_addr
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            start_tls=True,
        )
        logger.info(f"📧 Notification sent to {to_addr}: {subject}")
    except Exception as exc:
        logger.warning(f"Email notification failed (non-fatal): {exc}")


def send_feedback_notification(
    *,
    submitter_name: str,
    submitter_email: str,
    category: str,
    subject: str,
    message: str,
    rating: int | None,
) -> None:
    """
    Fire-and-forget email to the team inbox when new feedback arrives.
    Schedules the coroutine on the running event loop — safe to call from
    any async route handler.
    """
    category_icons = {
        "bug": "🐛",
        "suggestion": "💡",
        "general": "💬",
        "compliment": "🌟",
    }
    icon = category_icons.get(category, "📝")
    stars = ("★" * rating + "☆" * (5 - rating)) if rating else "Not rated"

    email_subject = f"{icon} [{category.upper()}] New Feedback — {subject}"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f0eb; margin: 0; padding: 24px; }}
    .card {{ background: #fff; border-radius: 12px; max-width: 560px; margin: 0 auto;
             padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }}
    .badge {{ display: inline-block; background: #fde8dc; color: #c05e34; border-radius: 6px;
              padding: 3px 10px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }}
    h2 {{ margin: 0 0 4px; color: #1a1a1a; font-size: 20px; }}
    .meta {{ color: #888; font-size: 13px; margin-bottom: 24px; }}
    .stars {{ color: #f59e0b; font-size: 20px; letter-spacing: 2px; }}
    .section-label {{ font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase;
                      letter-spacing: 0.08em; margin: 20px 0 6px; }}
    .message-box {{ background: #f9f6f3; border-left: 3px solid #d97757; border-radius: 6px;
                    padding: 14px 16px; color: #333; font-size: 15px; line-height: 1.6; white-space: pre-wrap; }}
    .footer {{ margin-top: 28px; font-size: 12px; color: #bbb; text-align: center; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">{icon} {category.capitalize()}</div>
    <h2>{subject}</h2>
    <div class="meta">
      From <strong>{submitter_name}</strong> ({submitter_email})
    </div>
    <div class="section-label">Rating</div>
    <div class="stars">{stars}</div>
    <div class="section-label">Message</div>
    <div class="message-box">{message}</div>
    <div class="footer">TheraVox AI — Feedback Notification</div>
  </div>
</body>
</html>
"""

    text_body = (
        f"[{category.upper()}] {subject}\n"
        f"From: {submitter_name} ({submitter_email})\n"
        f"Rating: {stars}\n\n"
        f"{message}\n\n"
        "-- TheraVox AI Feedback Notification"
    )

    # Schedule on the running loop (non-blocking)
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(_send(email_subject, html_body, text_body))
    except RuntimeError:
        logger.debug("No running event loop — skipping email notification.")
