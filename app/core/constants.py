"""Shared application constants."""

# ---------------------------------------------------------------------------
# Auth cookie configuration — shared between auth.py and oauth.py
# ---------------------------------------------------------------------------

COOKIE_NAME = "theravox_refresh"
COOKIE_PATH = "/"          # Must be "/" so the browser sends it to all /api/auth/* paths
COOKIE_SAMESITE = "lax"
