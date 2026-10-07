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


def test_journal_submit_uses_analyzer_result(client: AsyncClient, auth_headers: dict):
    """Regression: the analyzer returns (emotion, confidence, scores); unpacking two values
    made every journal entry fall back to neutral/0.5."""
    async def _test():
        response = await client.post(
            "/api/journal/submit",
            json={"text": "I felt wonderful today", "prompt": "How was your day?"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["emotion"] == "happy"
        assert data["confidence"] == 0.95
    asyncio.run(_test())


def test_spa_fallback_serves_index_but_not_for_api(client: AsyncClient):
    async def _test():
        page = await client.get("/wellness")
        assert page.status_code == 200
        assert '<div id="root">' in page.text

        missing_api = await client.get("/api/does-not-exist")
        assert missing_api.status_code == 404
        assert missing_api.json() == {"detail": "Not Found"}
    asyncio.run(_test())


def test_chat_works_offline_without_groq_key(client: AsyncClient, auth_headers: dict, monkeypatch):
    """Without GROQ_API_KEY the companion answers with the offline fallback instead of erroring."""
    from app.core.config import get_settings

    monkeypatch.setitem(get_settings()._config, "groq_api_key", "")

    async def _test():
        response = await client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "I feel so stressed about my exams"}]},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "offline-companion"
        assert "breath" in data["reply"].lower()

        session_id = data["session_id"]
        summary = await client.post(f"/api/chat/sessions/{session_id}/summary", headers=auth_headers)
        assert summary.status_code == 200
        assert "stress" in summary.json()["key_themes"]
    asyncio.run(_test())


def test_offline_reply_points_to_crisis_resources():
    from app.services.offline_companion import offline_reply

    reply = offline_reply("I want to end it all", crisis_flagged=True)
    assert "9152987821" in reply and "988" in reply
