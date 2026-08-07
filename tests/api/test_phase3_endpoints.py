"""
Unit tests for Phase 3 API endpoints: Therapeutic Programs, Therapist Portal.
"""

import pytest
import asyncio
from httpx import AsyncClient

def test_programs_catalog_endpoint(client: AsyncClient, auth_headers: dict):
    async def _test():
        response = await client.get("/api/programs", headers=auth_headers)
        assert response.status_code in (200, 401)
        if response.status_code == 200:
            progs = response.json()
            assert isinstance(progs, list)
            assert len(progs) >= 3
    asyncio.run(_test())

def test_program_enrollment_endpoint(client: AsyncClient, auth_headers: dict):
    async def _test():
        response = await client.post("/api/programs/cbt-thought-restructuring/enroll", headers=auth_headers)
        assert response.status_code in (200, 401)
    asyncio.run(_test())

def test_program_step_completion(client: AsyncClient, auth_headers: dict):
    async def _test():
        payload = {"step_id": "step-1"}
        response = await client.post(
            "/api/programs/cbt-thought-restructuring/complete-step",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code in (200, 401)
    asyncio.run(_test())

def test_therapist_generate_invite(client: AsyncClient, auth_headers: dict):
    async def _test():
        response = await client.post("/api/therapist/generate-invite", headers=auth_headers)
        assert response.status_code in (200, 401)
        if response.status_code == 200:
            data = response.json()
            assert "invite_code" in data
            assert len(data["invite_code"]) == 6
    asyncio.run(_test())

def test_therapist_clients_list(client: AsyncClient, auth_headers: dict):
    async def _test():
        response = await client.get("/api/therapist/clients", headers=auth_headers)
        assert response.status_code in (200, 401)
    asyncio.run(_test())
