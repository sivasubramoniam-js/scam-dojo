"""Tests for /healthz and /readyz."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_healthz():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/healthz")
        assert res.status_code == 200
        assert res.json() == {"ok": True}
        assert "x-request-id" in res.headers


@pytest.mark.asyncio
async def test_readyz():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/readyz")
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert data["kb"] == "v1"
        assert data["scenarioCount"] >= 3
        assert "fast" in data["models"]
