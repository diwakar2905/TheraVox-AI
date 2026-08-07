"""
Unit tests for Phase 2 API endpoints: Data Export, Recommendations, Emergency Contacts, Notifications.
"""

import pytest
import asyncio
from httpx import AsyncClient

def test_recommendations_endpoint(client: AsyncClient, auth_headers: dict):
    async def _test():
        response = await client.get("/api/recommendations", headers=auth_headers)
        assert response.status_code in (200, 401)
        if response.status_code == 200:
            recs = response.json()
            assert isinstance(recs, list)
            assert len(recs) <= 3
    asyncio.run(_test())

def test_emergency_contacts_list(client: AsyncClient, auth_headers: dict):
    async def _test():
        response = await client.get("/api/emergency-contacts", headers=auth_headers)
        assert response.status_code in (200, 401)
    asyncio.run(_test())

def test_notification_settings_update(client: AsyncClient, auth_headers: dict):
    async def _test():
        payload = {"preferred_time": "21:00", "is_active": True}
        response = await client.patch("/api/notifications/settings", json=payload, headers=auth_headers)
        assert response.status_code in (200, 401)
    asyncio.run(_test())

def test_data_export_endpoint(client: AsyncClient, auth_headers: dict):
    async def _test():
        response = await client.get("/api/auth/me/data", headers=auth_headers)
        assert response.status_code in (200, 401, 429)
    asyncio.run(_test())
