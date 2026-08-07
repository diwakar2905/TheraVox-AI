"""
OAuth 2.0 social login — Google and GitHub.

GET /api/auth/google/authorize   — redirect to Google consent screen
GET /api/auth/google/callback    — exchange code, upsert user, set refresh cookie
GET /api/auth/github/authorize   — redirect to GitHub consent screen
GET /api/auth/github/callback    — exchange code, upsert user, set refresh cookie

Flow:
  1. Frontend redirects browser to /authorize endpoint (full page navigation).
  2. Backend builds the provider OAuth URL with a signed CSRF state and redirects.
  3. Provider redirects back to /callback with ?code=...&state=...
  4. Backend verifies state, exchanges code, fetches user info, upserts user in DB,
     creates a refresh token, sets it in an httpOnly cookie, then redirects to
     {frontend_url}/oauth/callback
  5. The SPA loads at /oauth/callback. AuthContext's silentRefresh() fires on mount,
     POSTs to /api/auth/refresh (using the cookie just set), gets the access token,
     and stores it in memory. OAuthCallbackPage then navigates to /.
"""

import logging
import secrets
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.auth.utils import create_refresh_token
from app.core.config import get_settings
from app.core.constants import COOKIE_NAME, COOKIE_PATH, COOKIE_SAMESITE
from app.db.models import RefreshToken, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["oauth"])

# State token is valid for 10 minutes (user has that long to complete OAuth flow)
_STATE_MAX_AGE = 600


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_signer() -> URLSafeTimedSerializer:
    """Return a time-stamped signer seeded with the JWT secret key."""
    secret = get_settings().get("jwt_secret_key", "")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY is not configured.")
    return URLSafeTimedSerializer(secret, salt="oauth-state")


def _make_state() -> str:
    """Generate a signed, time-stamped CSRF state token."""
    nonce = secrets.token_urlsafe(16)
    return _get_signer().dumps(nonce)


def _verify_state(state: str) -> None:
    """Raise HTTP 400 if the state is invalid or expired."""
    try:
        _get_signer().loads(state, max_age=_STATE_MAX_AGE)
    except SignatureExpired:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth state expired. Please try again.")
    except BadSignature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state. Please try again.")


def _redirect_base() -> str:
    """Return the base URL used for OAuth redirect URIs (routes through Vite proxy in dev)."""
    return get_settings().get("frontend_url", "http://localhost:5173")


async def _set_refresh_cookie_on_redirect(
    user: User,
    db: AsyncSession,
    redirect_url: str,
) -> RedirectResponse:
    """
    Create a refresh token for *user*, persist it, set the httpOnly cookie on
    a RedirectResponse, and return that response.
    """
    settings = get_settings()
    expire_days: int = settings.get("jwt_refresh_token_expire_days", 7)
    expires_at = datetime.now(timezone.utc) + timedelta(days=expire_days)

    raw_token, token_hash = create_refresh_token()

    db_token = RefreshToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(db_token)
    # Commit NOW, before sending the redirect, so the refresh token exists in the DB
    # by the time the browser follows the redirect and the SPA calls /api/auth/refresh.
    # (get_db's post-yield commit would run after the 302 is already sent — too late.)
    await db.commit()

    max_age = int((expires_at - datetime.now(timezone.utc)).total_seconds())
    is_prod = settings.get("environment", "development") == "production"

    response = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=is_prod,
        samesite=COOKIE_SAMESITE,
        path=COOKIE_PATH,
        max_age=max_age,
    )
    return response


async def _get_or_create_oauth_user(
    db: AsyncSession,
    provider: str,
    oauth_id: str,
    email: str,
    full_name: str,
    email_verified: bool = True,
) -> User:
    """
    Find or create a User for an OAuth login.

    Priority:
      1. Existing user matched by (provider, oauth_id) — return as-is.
      2. Existing user matched by email — only link if email_verified is True.
      3. No match — create a new user with no password (OAuth-only account).
    """
    # 1. Look up by provider + id
    result = await db.execute(
        select(User).where(
            User.oauth_provider == provider,
            User.oauth_id == oauth_id,
        )
    )
    user: Optional[User] = result.scalar_one_or_none()
    if user:
        return user

    # 2. Look up by email (link existing account — only if provider verified the email)
    if email_verified:
        result = await db.execute(select(User).where(User.email == email.lower()))
        user = result.scalar_one_or_none()
        if user:
            user.oauth_provider = provider
            user.oauth_id = oauth_id
            return user

    # 3. Create new OAuth-only account
    user = User(
        email=email.lower(),
        full_name=full_name.strip() or email.split("@")[0],
        hashed_password=None,   # No password for OAuth accounts
        oauth_provider=provider,
        oauth_id=oauth_id,
    )
    db.add(user)
    await db.flush()  # populate user.id before we return
    return user


# ---------------------------------------------------------------------------
# Google
# ---------------------------------------------------------------------------

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.get("/google/authorize", summary="Redirect to Google OAuth consent screen")
async def google_authorize() -> RedirectResponse:
    settings = get_settings()
    client_id = settings.get("google_client_id", "")
    if not client_id or client_id == "your_google_client_id_here":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env",
        )

    redirect_uri = f"{_redirect_base()}/api/auth/google/callback"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": _make_state(),
        "access_type": "online",
    }
    url = _GOOGLE_AUTH_URL + "?" + urllib.parse.urlencode(params)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get("/google/callback", summary="Handle Google OAuth callback")
async def google_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    frontend_callback = f"{_redirect_base()}/oauth/callback"

    # User denied access on Google's consent screen
    if error:
        return RedirectResponse(
            url=f"{frontend_callback}?error={urllib.parse.quote(error)}",
            status_code=status.HTTP_302_FOUND,
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{frontend_callback}?error=missing_params",
            status_code=status.HTTP_302_FOUND,
        )

    _verify_state(state)

    settings = get_settings()
    redirect_uri = f"{_redirect_base()}/api/auth/google/callback"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Exchange authorization code for access token
            token_resp = await client.post(
                _GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.get("google_client_id"),
                    "client_secret": settings.get("google_client_secret"),
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                logger.error("Google token exchange failed: %s", token_resp.text)
                return RedirectResponse(
                    url=f"{frontend_callback}?error=token_exchange_failed",
                    status_code=status.HTTP_302_FOUND,
                )
            token_data = token_resp.json()

            # Fetch user info
            userinfo_resp = await client.get(
                _GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            if userinfo_resp.status_code != 200:
                logger.error("Google userinfo fetch failed: %s", userinfo_resp.text)
                return RedirectResponse(
                    url=f"{frontend_callback}?error=userinfo_failed",
                    status_code=status.HTTP_302_FOUND,
                )
            userinfo = userinfo_resp.json()

    except httpx.RequestError as exc:
        logger.error("HTTP error during Google OAuth: %s", exc)
        return RedirectResponse(
            url=f"{frontend_callback}?error=network_error",
            status_code=status.HTTP_302_FOUND,
        )

    email = userinfo.get("email")
    if not email:
        return RedirectResponse(
            url=f"{frontend_callback}?error=no_email",
            status_code=status.HTTP_302_FOUND,
        )

    user = await _get_or_create_oauth_user(
        db=db,
        provider="google",
        oauth_id=str(userinfo["sub"]),
        email=email,
        full_name=userinfo.get("name", ""),
        email_verified=bool(userinfo.get("email_verified", False)),
    )

    if not user.is_active:
        return RedirectResponse(
            url=f"{frontend_callback}?error=account_disabled",
            status_code=status.HTTP_302_FOUND,
        )

    return await _set_refresh_cookie_on_redirect(user, db, frontend_callback)


# ---------------------------------------------------------------------------
# GitHub
# ---------------------------------------------------------------------------

_GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
_GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
_GITHUB_USER_URL = "https://api.github.com/user"
_GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


@router.get("/github/authorize", summary="Redirect to GitHub OAuth consent screen")
async def github_authorize() -> RedirectResponse:
    settings = get_settings()
    client_id = settings.get("github_client_id", "")
    if not client_id or client_id == "your_github_client_id_here":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env",
        )

    params = {
        "client_id": client_id,
        "scope": "user:email",
        "state": _make_state(),
    }
    url = _GITHUB_AUTH_URL + "?" + urllib.parse.urlencode(params)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get("/github/callback", summary="Handle GitHub OAuth callback")
async def github_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    frontend_callback = f"{_redirect_base()}/oauth/callback"

    if error:
        return RedirectResponse(
            url=f"{frontend_callback}?error={urllib.parse.quote(error)}",
            status_code=status.HTTP_302_FOUND,
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{frontend_callback}?error=missing_params",
            status_code=status.HTTP_302_FOUND,
        )

    _verify_state(state)

    settings = get_settings()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Exchange code for access token
            token_resp = await client.post(
                _GITHUB_TOKEN_URL,
                data={
                    "client_id": settings.get("github_client_id"),
                    "client_secret": settings.get("github_client_secret"),
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
            if token_resp.status_code != 200:
                logger.error("GitHub token exchange failed: %s", token_resp.text)
                return RedirectResponse(
                    url=f"{frontend_callback}?error=token_exchange_failed",
                    status_code=status.HTTP_302_FOUND,
                )
            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error("No access_token in GitHub response: %s", token_data)
                return RedirectResponse(
                    url=f"{frontend_callback}?error=token_exchange_failed",
                    status_code=status.HTTP_302_FOUND,
                )

            gh_headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            }

            # Fetch user profile
            user_resp = await client.get(_GITHUB_USER_URL, headers=gh_headers)
            if user_resp.status_code != 200:
                logger.error("GitHub user fetch failed: %s", user_resp.text)
                return RedirectResponse(
                    url=f"{frontend_callback}?error=userinfo_failed",
                    status_code=status.HTTP_302_FOUND,
                )
            gh_user = user_resp.json()

            # Primary email may be null if the user chose to keep it private
            # We track whether the email was confirmed as verified by GitHub
            email: Optional[str] = None
            gh_email_verified = False

            # Always fetch the emails list to get a verified address
            emails_resp = await client.get(_GITHUB_EMAILS_URL, headers=gh_headers)
            if emails_resp.status_code == 200:
                emails = emails_resp.json()
                # Prefer primary verified email
                for entry in emails:
                    if entry.get("primary") and entry.get("verified"):
                        email = entry["email"]
                        gh_email_verified = True
                        break
                # Fallback: any verified email
                if not email:
                    for entry in emails:
                        if entry.get("verified"):
                            email = entry["email"]
                            gh_email_verified = True
                            break

            # Last resort: use public profile email (unverified)
            if not email:
                email = gh_user.get("email")

    except httpx.RequestError as exc:
        logger.error("HTTP error during GitHub OAuth: %s", exc)
        return RedirectResponse(
            url=f"{frontend_callback}?error=network_error",
            status_code=status.HTTP_302_FOUND,
        )

    if not email:
        return RedirectResponse(
            url=f"{frontend_callback}?error=no_email",
            status_code=status.HTTP_302_FOUND,
        )

    full_name = gh_user.get("name") or gh_user.get("login", "")

    user = await _get_or_create_oauth_user(
        db=db,
        provider="github",
        oauth_id=str(gh_user["id"]),
        email=email,
        full_name=full_name,
        email_verified=gh_email_verified,
    )

    if not user.is_active:
        return RedirectResponse(
            url=f"{frontend_callback}?error=account_disabled",
            status_code=status.HTTP_302_FOUND,
        )

    return await _set_refresh_cookie_on_redirect(user, db, frontend_callback)
