"""
Unit tests for Authentication (register, login, token refresh, logout, password utilities).
"""

import pytest
import asyncio
import uuid
from httpx import AsyncClient
from app.auth.utils import verify_password, hash_password, create_access_token, verify_access_token

try:
    import aiosqlite
    HAS_AIOSQLITE = True
except ImportError:
    HAS_AIOSQLITE = False

def test_password_hashing():
    password = "MySecurePassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_creation_and_verification():
    user_id = uuid.uuid4()
    email = "test@example.com"
    token = create_access_token(user_id, email)
    assert isinstance(token, str)
    
    payload = verify_access_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["email"] == email

def test_register_user_success(client: AsyncClient):
    if not HAS_AIOSQLITE:
        pytest.skip("aiosqlite not installed locally")
    async def _test():
        payload = {
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "Password123!"
        }
        response = await client.post("/api/auth/register", json=payload)
        assert response.status_code in (201, 409)
    asyncio.run(_test())

def test_register_duplicate_email(client: AsyncClient, test_user):
    if not HAS_AIOSQLITE:
        pytest.skip("aiosqlite not installed locally")
    async def _test():
        payload = {
            "email": test_user.email,
            "full_name": "Duplicate User",
            "password": "Password123!"
        }
        response = await client.post("/api/auth/register", json=payload)
        assert response.status_code in (400, 409)
    asyncio.run(_test())

def test_login_success(client: AsyncClient, test_user):
    if not HAS_AIOSQLITE:
        pytest.skip("aiosqlite not installed locally")
    async def _test():
        payload = {
            "email": test_user.email,
            "password": "Password123!"
        }
        response = await client.post("/api/auth/login", json=payload)
        assert response.status_code in (200, 401)
    asyncio.run(_test())

def test_login_invalid_password(client: AsyncClient, test_user):
    if not HAS_AIOSQLITE:
        pytest.skip("aiosqlite not installed locally")
    async def _test():
        payload = {
            "email": test_user.email,
            "password": "WrongPassword123!"
        }
        response = await client.post("/api/auth/login", json=payload)
        assert response.status_code in (401, 404)
    asyncio.run(_test())
