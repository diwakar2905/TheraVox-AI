"""
Unit tests for OAuth authentication endpoints and flows (Google / Social login mocks).
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock
from httpx import AsyncClient

def test_oauth_google_callback_mock(client: AsyncClient):
    async def _test():
        with patch("httpx.AsyncClient.post") as mock_post, patch("httpx.AsyncClient.get") as mock_get:
            token_response = MagicMock()
            token_response.status_code = 200
            token_response.json.return_value = {"access_token": "mock-google-token"}
            mock_post.return_value = token_response

            user_info_response = MagicMock()
            user_info_response.status_code = 200
            user_info_response.json.return_value = {
                "id": "google-123456",
                "email": "oauthuser@gmail.com",
                "name": "OAuth Google User",
                "verified_email": True
            }
            mock_get.return_value = user_info_response

            response = await client.post("/auth/oauth/google/callback", json={"code": "mock-auth-code"})
            assert response.status_code in (200, 201)
    asyncio.run(_test())
