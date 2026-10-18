import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_recover_create_plan_golden_hour() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/v1/recover/plans",
            json={
                "incident": ["upi_payment", "otp_shared"],
                "timeSince": "just_now",
                "moneyLost": True,
                "amountBand": "10k_50k",
                "paymentMethod": "upi",
                "bank": "HDFC Bank",
                "notes": "Paid via QR code under pressure",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["urgency"] == "critical"
        assert len(data["steps"]) >= 4
        # Verify 1930 is the immediate first step
        step_ids = [s["id"] for s in data["steps"]]
        assert "step_1930" in step_ids
        assert "step_bank_freeze" in step_ids
        assert data["disclaimer"] != ""

        plan_id = data["planId"]

        # Test toggle step
        toggle_res = await ac.patch(
            f"/v1/recover/plans/{plan_id}/steps/step_1930",
            json={"done": True},
        )
        assert toggle_res.status_code == 200
        toggle_data = toggle_res.json()
        assert toggle_data["done"] is True
        assert toggle_data["progress"]["done"] >= 1

        # Test follow-up chat
        chat_res = await ac.post(
            f"/v1/recover/plans/{plan_id}/chat",
            json={"text": "Will 1930 help freeze the scammer's bank account?"},
        )
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert chat_data["role"] == "assistant"
        assert len(chat_data["text"]) > 10
