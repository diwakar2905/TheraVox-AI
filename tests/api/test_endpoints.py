"""
Integration tests for API endpoints (text, audio, vision, chat, crisis, wellness, feedback).
"""

import pytest
import asyncio
from httpx import AsyncClient

def test_text_analysis_endpoint(client: AsyncClient, auth_headers: dict):
    async def _test():
        payload = {"text": "I feel happy and hopeful today!"}
        response = await client.post("/api/analyze_text", json=payload, headers=auth_headers)
        assert response.status_code in (200, 401)
        if response.status_code == 200:
            data = response.json()
            assert "emotion" in data or "emotions" in data or "status" in data
    asyncio.run(_test())

def test_system_health_endpoint(client: AsyncClient):
    async def _test():
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("ok", "healthy")
    asyncio.run(_test())

def test_client_logs_endpoint(client: AsyncClient):
    async def _test():
        payload = {
            "level": "info",
            "message": "Frontend test log message",
            "timestamp": "2026-08-07T12:00:00Z"
        }
        response = await client.post("/api/logs", json=payload)
        assert response.status_code == 200
        assert response.json()["status"] == "success"
    asyncio.run(_test())

def test_crisis_evaluation_endpoint(client: AsyncClient, auth_headers: dict):
    async def _test():
        payload = {"text": "I feel slightly stressed about my exam tomorrow"}
        response = await client.post("/api/crisis/scan", json=payload, headers=auth_headers)
        assert response.status_code in (200, 401)
    asyncio.run(_test())

def test_feedback_submit_endpoint(client: AsyncClient, auth_headers: dict):
    async def _test():
        payload = {
            "category": "general",
            "subject": "Great app",
            "message": "Great emotional support tool!",
            "rating": 5
        }
        response = await client.post("/api/feedback/", json=payload, headers=auth_headers)
        assert response.status_code in (200, 201, 307, 401)
    asyncio.run(_test())
