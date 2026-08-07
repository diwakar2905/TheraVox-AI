"""Authentication utilities: password hashing, JWT creation/verification, refresh tokens."""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# ---------------------------------------------------------------------------
# JWT access tokens
# ---------------------------------------------------------------------------

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def create_access_token(user_id: uuid.UUID, email: str) -> str:
    """
    Create a short-lived JWT access token.

    Claims:
        sub   – user UUID (str)
        email – user email
        iat   – issued at (UTC)
        exp   – expiry (UTC)
    """
    settings = get_settings()
    expire_minutes: int = settings.get("jwt_access_token_expire_minutes", 15)
    algorithm: str = settings.get("jwt_algorithm", "HS256")
    secret_key: str = settings.get("jwt_secret_key", "")

    if not secret_key:
        raise RuntimeError("JWT_SECRET_KEY is not configured.")

    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=expire_minutes),
    }
    return jwt.encode(payload, secret_key, algorithm=algorithm)


def verify_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT access token.

    Returns the token payload dict on success.
    Raises HTTP 401 on any failure (expired, tampered, missing claims).
    """
    settings = get_settings()
    algorithm: str = settings.get("jwt_algorithm", "HS256")
    secret_key: str = settings.get("jwt_secret_key", "")

    if not secret_key:
        raise RuntimeError("JWT_SECRET_KEY is not configured.")

    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        if payload.get("sub") is None:
            raise _CREDENTIALS_EXCEPTION
        return payload
    except JWTError:
        raise _CREDENTIALS_EXCEPTION


# ---------------------------------------------------------------------------
# Opaque refresh tokens
# ---------------------------------------------------------------------------

def create_refresh_token() -> tuple[str, str]:
    """
    Generate a cryptographically secure opaque refresh token.

    Returns:
        raw_token  – the token to send to the client (in httpOnly cookie)
        token_hash – SHA-256 hex digest to store in the database
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = _hash_token(raw_token)
    return raw_token, token_hash


def hash_refresh_token(raw_token: str) -> str:
    """Hash a raw refresh token for DB lookup."""
    return _hash_token(raw_token)


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()
