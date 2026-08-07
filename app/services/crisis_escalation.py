"""
Crisis escalation email service.

Sends HTML-formatted alert emails to the configured admin/therapist inbox
when HIGH or CRITICAL severity crisis signals are detected.

All errors are swallowed — a failing SMTP server must never break the
crisis detection flow.
"""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from typing import List

import aiosmtplib

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def send_crisis_escalation_email(
    *,
    user_name: str,
    user_email: str,
    severity: str,
    signals: List[dict],
    recommended_action: str,
) -> None:
    """
    Send an urgent escalation email to the admin/therapist inbox.

    This is designed to be called fire-and-forget via ``asyncio.create_task``.
    """
    settings = get_settings()

    smtp_host = settings.get("smtp_host", "")
    smtp_port = int(settings.get("smtp_port", 587))
    smtp_user = settings.get("smtp_user", "")
    smtp_password = settings.get("smtp_password", "")
    from_addr = settings.get("smtp_from", smtp_user)
    to_addr = settings.get("notify_email", "")

    if not all([smtp_host, smtp_user, smtp_password, to_addr]):
        logger.debug("Crisis escalation email skipped — SMTP not configured.")
        return

    severity_upper = severity.upper()
    severity_colors = {
        "LOW": "#f59e0b",
        "MODERATE": "#f97316",
        "HIGH": "#ef4444",
        "CRITICAL": "#dc2626",
    }
    badge_color = severity_colors.get(severity_upper, "#ef4444")

    signals_html = ""
    for s in signals:
        signals_html += (
            f'<tr>'
            f'<td style="padding:6px 12px;border-bottom:1px solid #f0ebe4;">{escape(s.get("phrase",""))}</td>'
            f'<td style="padding:6px 12px;border-bottom:1px solid #f0ebe4;">{escape(s.get("category",""))}</td>'
            f'<td style="padding:6px 12px;border-bottom:1px solid #f0ebe4;">{escape(s.get("severity",""))}</td>'
            f'</tr>'
        )

    signals_text = "\n".join(
        f"  - [{s.get('severity','')}] {s.get('category','')}: \"{s.get('phrase','')}\""
        for s in signals
    )

    email_subject = f"🚨 [{severity_upper}] Crisis Alert — {user_name}"

    html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #fef2f2; margin: 0; padding: 24px; }}
  .card {{ background: #fff; border-radius: 12px; max-width: 600px; margin: 0 auto;
           padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);
           border-top: 4px solid {badge_color}; }}
  .badge {{ display: inline-block; background: {badge_color}; color: #fff; border-radius: 6px;
            padding: 4px 12px; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; }}
  h2 {{ margin: 16px 0 4px; color: #1a1a1a; font-size: 20px; }}
  .meta {{ color: #888; font-size: 13px; margin-bottom: 20px; }}
  .section-label {{ font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase;
                    letter-spacing: 0.08em; margin: 20px 0 8px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
  th {{ text-align: left; padding: 8px 12px; background: #fef2f2; color: #991b1b;
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }}
  .action-box {{ background: #fff7ed; border-left: 3px solid {badge_color}; border-radius: 6px;
                 padding: 14px 16px; color: #333; font-size: 14px; line-height: 1.6; }}
  .footer {{ margin-top: 28px; font-size: 12px; color: #bbb; text-align: center; }}
</style>
</head>
<body>
  <div class="card">
    <div class="badge">🚨 {severity_upper} CRISIS ALERT</div>
    <h2>Crisis Signal Detected</h2>
    <div class="meta">
      User: <strong>{escape(user_name)}</strong> ({escape(user_email)})
    </div>

    <div class="section-label">Detected Signals</div>
    <table>
      <tr><th>Phrase</th><th>Category</th><th>Severity</th></tr>
      {signals_html}
    </table>

    <div class="section-label">Recommended Action</div>
    <div class="action-box">{escape(recommended_action)}</div>

    <div class="footer">
      TheraVox AI — Automated Crisis Escalation<br>
      This is an automated alert. Please review and take appropriate action.
    </div>
  </div>
</body>
</html>
"""

    text_body = (
        f"🚨 [{severity_upper}] CRISIS ALERT\n"
        f"User: {user_name} ({user_email})\n\n"
        f"Detected signals:\n{signals_text}\n\n"
        f"Recommended action:\n{recommended_action}\n\n"
        "-- TheraVox AI Automated Crisis Escalation"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = email_subject
    msg["From"] = f"TheraVox AI Alerts <{from_addr}>"
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
        logger.info(f"🚨 Crisis escalation email sent to {to_addr} — severity={severity_upper}")
    except Exception as exc:
        logger.warning(f"Crisis escalation email failed (non-fatal): {exc}")


def fire_escalation_async(user: object, assessment: object) -> None:
    """
    Fire-and-forget helper: schedule ``send_crisis_escalation_email`` and SMS dispatcher.
    """
    import asyncio
    from app.services.sms_service import sms_service

    severity = getattr(getattr(assessment, "severity", None), "value", "high")
    user_name = getattr(user, "full_name", "User")
    
    # Trigger SMS dispatch
    sms_service.send_crisis_sms(
        to_phone=getattr(user, "phone", "+15550199"),
        contact_name="Emergency Contact",
        user_name=user_name,
        severity=severity
    )

    try:
        loop = asyncio.get_event_loop()
        loop.create_task(
            send_crisis_escalation_email(
                user_name=user_name,
                user_email=getattr(user, "email", ""),
                severity=severity,
                signals=[
                    {
                        "phrase": s.phrase,
                        "category": s.category,
                        "severity": s.severity.value,
                    }
                    for s in getattr(assessment, "signals", [])
                ],
                recommended_action=getattr(assessment, "recommended_action", ""),
            )
        )
    except RuntimeError:
        logger.debug("No running event loop — skipping escalation email.")
