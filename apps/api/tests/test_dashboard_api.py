import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_dashboard_endpoint() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/v1/dashboard")
        assert res.status_code == 200
        data = res.json()
        assert "me" in data
        assert "trend" in data
        assert "tactics" in data
        assert len(data["tactics"]) >= 4
        assert "checks" in data
        assert "recoveries" in data
        assert "history" in data
