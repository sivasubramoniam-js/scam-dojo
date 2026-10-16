import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_check_message_high_risk():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/v1/check",
            json={
                "text": "Your SBI account is blocked today due to KYC. Download AnyDesk or click http://bit.ly/sbi-verify to update immediately."
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["score"] >= 75
        assert data["riskLevel"] == "high"
        assert len(data["reasons"]) > 0
        assert len(data["actions"]) > 0


@pytest.mark.asyncio
async def test_check_message_safe():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/v1/check",
            json={
                "text": "Hey, let's meet tomorrow evening for tea at the coffee shop near office."
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["riskLevel"] == "safe"
        assert data["score"] <= 25


@pytest.mark.asyncio
async def test_check_to_drill_forge():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/v1/check",
            json={
                "text": "URGENT: Electricity department will disconnect your power tonight at 9:30 PM. Call officer at 9876543210 immediately."
            },
        )
        assert res.status_code == 200
        chk_data = res.json()
        cid = chk_data["checkId"]

        # Forge custom drill
        forge_res = await ac.post(f"/v1/check/{cid}/to-drill")
        assert forge_res.status_code == 201
        forge_data = forge_res.json()
        assert forge_data["scenarioSlug"].startswith("custom:")
        assert "Electricity" in forge_data["title"] or "Live Drill" in forge_data["title"]

        # Launch train session with the forged custom scenario
        train_res = await ac.post(
            "/v1/train/sessions",
            json={"scenarioSlug": forge_data["scenarioSlug"]},
        )
        assert train_res.status_code == 201
        train_data = train_res.json()
        assert train_data["scenario"]["slug"] == forge_data["scenarioSlug"]
        assert len(train_data["messages"]) == 1


@pytest.mark.asyncio
async def test_check_message_typosquatted_bank_email_otp():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/v1/check",
            json={
                "text": "share your OTP to this secured email hdfcbank@gmall.com"
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["score"] >= 90
        assert data["riskLevel"] == "high"
        assert data["verdict"] == "likely_scam"
        # Must identify the red flags
        tags = [rf["why"] for rf in data["redFlags"]]
        rf_text = " ".join(tags)
        assert "gmall.com" in rf_text or "Typo-squatted" in rf_text or "OTP" in rf_text


