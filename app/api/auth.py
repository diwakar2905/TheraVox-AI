"""
Authentication endpoints.

POST  /api/auth/register      — create account
POST  /api/auth/login         — obtain tokens
POST  /api/auth/refresh       — rotate refresh token, get new access token
POST  /api/auth/logout        — revoke refresh token
GET   /api/auth/me            — get current user profile (requires Bearer)
PATCH /api/auth/me            — update full_name and/or email
POST  /api/auth/me/password   — change password
GET   /api/auth/me/stats      — account statistics
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import func as sql_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.auth.utils import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.core.config import get_settings
from app.core.constants import COOKIE_NAME, COOKIE_PATH, COOKIE_SAMESITE
from app.core.limiter import limiter
from app.db.models import RefreshToken, User, WellnessEntry
from app.models.schemas import (
    AccountStatsResponse,
    ChangePasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserLoginRequest,
    UserProfileResponse,
    UserRegisterRequest,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, raw_token: str, expires_at: datetime) -> None:
    """Set the httpOnly refresh token cookie on the response."""
    settings = get_settings()
    is_prod = settings.get("environment", "development") == "production"
    max_age = int((expires_at - datetime.now(timezone.utc)).total_seconds())
    response.set_cookie(
        key=COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=is_prod,
        samesite=COOKIE_SAMESITE,
        path=COOKIE_PATH,
        max_age=max_age,
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Clear the refresh token cookie."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path=COOKIE_PATH,
        samesite=COOKIE_SAMESITE,
    )


async def _issue_refresh_token(
    user: User,
    db: AsyncSession,
    response: Response,
) -> None:
    """Create a new refresh token, persist it, and set the cookie."""
    settings = get_settings()
    expire_days: int = settings.get("jwt_refresh_token_expire_days", 7)
    expires_at = datetime.now(timezone.utc) + timedelta(days=expire_days)

    raw_token, token_hash = create_refresh_token()

    db_token = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(db_token)
    # Caller is responsible for commit (managed by get_db dependency)

    _set_refresh_cookie(response, raw_token, expires_at)


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
@limiter.limit("5/minute")
async def register(
    request: Request,
    body: UserRegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    # Check for existing email — return a generic error to prevent user enumeration
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists",
        )

    user = User(
        email=body.email.lower(),
        full_name=body.full_name.strip(),
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.flush()  # Get user.id without committing yet

    await _issue_refresh_token(user, db, response)
    # get_db commits after the route returns

    access_token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=access_token,
        user=UserProfileResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and obtain tokens",
)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: UserLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user: User | None = result.scalar_one_or_none()

    # OAuth-only accounts have no password — give a helpful message
    if user is not None and user.hashed_password is None:
        provider = user.oauth_provider or "a social provider"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"This account was created with {provider.title()} sign-in. Please use the social login button.",
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not registered. Please register first.",
        )

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # Revoke all existing refresh tokens for this user (single-session policy)
    existing_tokens = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked.is_(False),
        )
    )
    for rt in existing_tokens.scalars():
        rt.revoked = True

    await _issue_refresh_token(user, db, response)

    access_token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=access_token,
        user=UserProfileResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# POST /api/auth/refresh
# ---------------------------------------------------------------------------


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate refresh token and issue new access token",
)
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    theravox_refresh: str | None = Cookie(default=None),
) -> TokenResponse:
    if not theravox_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    token_hash = hash_refresh_token(theravox_refresh)

    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    rt: RefreshToken | None = result.scalar_one_or_none()

    if rt is None or not rt.is_valid:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired",
        )

    user: User | None = await db.get(User, rt.user_id)
    if user is None or not user.is_active:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account disabled",
        )

    # Rotate: revoke old token, issue new one
    rt.revoked = True
    await _issue_refresh_token(user, db, response)
    # Commit NOW so the rotated state is durable before the response reaches
    # the client. Without this, a second concurrent refresh call (e.g. from
    # React StrictMode's double-invocation) could see the old token as still
    # valid and trigger a race condition.
    await db.commit()

    access_token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=access_token,
        user=UserProfileResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke refresh token and clear cookie",
)
@limiter.limit("10/minute")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    theravox_refresh: str | None = Cookie(default=None),
) -> None:
    if theravox_refresh:
        token_hash = hash_refresh_token(theravox_refresh)
        result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        rt: RefreshToken | None = result.scalar_one_or_none()
        if rt and not rt.revoked:
            rt.revoked = True

    _clear_refresh_cookie(response)


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get the current authenticated user's profile",
)
@limiter.limit("60/minute")
async def me(request: Request, current_user: User = Depends(get_current_user)) -> UserProfileResponse:
    return UserProfileResponse.model_validate(current_user)


# ---------------------------------------------------------------------------
# PATCH /api/auth/me
# ---------------------------------------------------------------------------


@router.patch(
    "/me",
    response_model=UserProfileResponse,
    summary="Update full_name and/or email for the current user",
)
async def update_profile(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileResponse:
    if body.full_name is not None:
        current_user.full_name = body.full_name.strip()
    if body.email is not None:
        new_email = body.email.lower()
        if new_email != current_user.email:
            existing = await db.execute(select(User).where(User.email == new_email))
            if existing.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email is already in use by another account",
                )
            current_user.email = new_email
    return UserProfileResponse.model_validate(current_user)


# ---------------------------------------------------------------------------
# POST /api/auth/me/password
# ---------------------------------------------------------------------------


@router.post(
    "/me/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change the current user's password",
)
async def change_password(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses social login and does not have a password.",
        )
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.hashed_password = hash_password(body.new_password)


# ---------------------------------------------------------------------------
# GET /api/auth/me/stats
# ---------------------------------------------------------------------------


@router.get(
    "/me/stats",
    response_model=AccountStatsResponse,
    summary="Get account statistics for the current user",
)
async def get_account_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccountStatsResponse:
    result = await db.execute(select(sql_func.count(WellnessEntry.id)).where(WellnessEntry.user_id == current_user.id))
    count: int = result.scalar_one()
    return AccountStatsResponse(
        wellness_entries_count=count,
        member_since=current_user.created_at,
    )


# ---------------------------------------------------------------------------
# GET /api/auth/me/data — Data Export (User Data Portability)
# ---------------------------------------------------------------------------

_last_export_times: dict[uuid.UUID, datetime] = {}


@router.get(
    "/me/data",
    summary="Download user data as a ZIP archive (rate limited to once per 24 hours)",
)
async def download_user_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.export_service import generate_user_data_export_zip

    now = datetime.now(timezone.utc)
    last_export = _last_export_times.get(current_user.id)
    if last_export and (now - last_export).total_seconds() < 86400:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Data export is rate-limited to once per 24 hours. Please try again later.",
        )

    zip_bytes = await generate_user_data_export_zip(current_user, db)
    _last_export_times[current_user.id] = now

    filename = f"theravox_export_{current_user.id}_{int(now.timestamp())}.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
