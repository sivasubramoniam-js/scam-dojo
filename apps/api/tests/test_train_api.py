"""Integration tests for Train mode REST & SSE APIs."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_get_scenarios():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Default English
        resp = await client.get("/v1/scenarios", headers={"X-Dev-User": "test-user"})
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        slugs = [s["slug"] for s in data["items"]]
        assert "fake_kyc" in slugs
        assert "upi_collect_refund" in slugs
        assert "job_offer_task" in slugs
        assert "digital_arrest_call" in slugs

        # Hindi
        resp_hi = await client.get("/v1/scenarios?lang=hi", headers={"X-Dev-User": "test-user"})
        assert resp_hi.status_code == 200
        data_hi = resp_hi.json()
        assert len(data_hi["items"]) >= 4


@pytest.mark.asyncio
async def test_get_resources():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/resources", headers={"X-Dev-User": "test-user"})
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert len(data["items"]) >= 10
        # Check verified 1930 helpline
        h1930 = next((r for r in data["items"] if r.get("contactValue") == "1930"), None)
        assert h1930 is not None
        assert h1930["verifiedOn"] == "2026-10-14"


@pytest.mark.asyncio
async def test_user_profile_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"X-Dev-User": "profile-tester"}
        # 1. Get Me (initializes default profile)
        resp = await client.get("/v1/me", headers=headers)
        assert resp.status_code == 200
        me = resp.json()
        assert me["uid"] == "dev-profile-tester"
        assert me["belt"] == "white"
        assert me["resilience"] == 0

        # 2. Patch Me
        patch_resp = await client.patch(
            "/v1/me",
            json={"language": "hi", "displayName": "Arjun"},
            headers=headers,
        )
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert updated["language"] == "hi"
        assert updated["displayName"] == "Arjun"


@pytest.mark.asyncio
async def test_train_session_flow_and_idempotency():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"X-Dev-User": "session-tester"}

        # 1. Create Session
        create_resp = await client.post(
            "/v1/train/sessions",
            json={"scenarioSlug": "fake_kyc", "difficulty": 3, "lang": "en"},
            headers=headers,
        )
        assert create_resp.status_code == 201
        session_data = create_resp.json()
        sid = session_data["sessionId"]
        assert sid.startswith("ts_")
        assert len(session_data["messages"]) == 1
        assert session_data["messages"][0]["role"] == "scammer"

        # 2. Send message with stream=false
        msg_resp = await client.post(
            f"/v1/train/sessions/{sid}/messages?stream=false",
            json={"text": "Why are you calling me? What is your employee id?", "clientMsgId": "msg_idem_01"},
            headers=headers,
        )
        assert msg_resp.status_code == 200
        res_data = msg_resp.json()
        assert res_data["ack"]["text"] == "Why are you calling me? What is your employee id?"
        assert res_data["message"]["role"] in ("scammer", "sensei")
        assert res_data["state"]["turn"] == 1

        # 3. Idempotency test: resending the same clientMsgId
        msg_resp_2 = await client.post(
            f"/v1/train/sessions/{sid}/messages?stream=false",
            json={"text": "Why are you calling me? What is your employee id?", "clientMsgId": "msg_idem_01"},
            headers=headers,
        )
        assert msg_resp_2.status_code == 200
        # Turn count must not have incremented
        get_sess = await client.get(f"/v1/train/sessions/{sid}", headers=headers)
        assert get_sess.status_code == 200
        sess_detail = get_sess.json()
        assert sess_detail["turnCount"] == 1


@pytest.mark.asyncio
async def test_train_session_sse_streaming():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"X-Dev-User": "sse-tester"}
        create_resp = await client.post(
            "/v1/train/sessions",
            json={"scenarioSlug": "upi_collect_refund", "difficulty": "auto", "lang": "en"},
            headers=headers,
        )
        sid = create_resp.json()["sessionId"]

        # Send message with SSE
        stream_resp = await client.post(
            f"/v1/train/sessions/{sid}/messages?stream=true",
            json={"text": "I did not order anything, why would I get a refund?", "clientMsgId": "msg_sse_01"},
            headers=headers,
        )
        assert stream_resp.status_code == 200
        assert "text/event-stream" in stream_resp.headers["content-type"]
        body_text = stream_resp.text
        assert "event: ack" in body_text
        assert "event: state" in body_text
        assert "event: token" in body_text
        assert "event: message_end" in body_text
        assert "event: done" in body_text


@pytest.mark.asyncio
async def test_train_scripted_victory_and_end_debrief():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"X-Dev-User": "winner-tester"}
        create_resp = await client.post(
            "/v1/train/sessions",
            json={"scenarioSlug": "fake_kyc", "difficulty": 3, "lang": "en"},
            headers=headers,
        )
        sid = create_resp.json()["sessionId"]

        # Turn 1: Question
        await client.post(
            f"/v1/train/sessions/{sid}/messages?stream=false",
            json={"text": "Who is this and why are you asking for my details?", "clientMsgId": "win_01"},
            headers=headers,
        )
        # Turn 2: Resist
        await client.post(
            f"/v1/train/sessions/{sid}/messages?stream=false",
            json={"text": "I will not give any password or card number over the phone.", "clientMsgId": "win_02"},
            headers=headers,
        )
        # Turn 3: Verify independently -> Triggers user_won
        turn3 = await client.post(
            f"/v1/train/sessions/{sid}/messages?stream=false",
            json={"text": "I am hanging up now and will call my bank helpline directly.", "clientMsgId": "win_03"},
            headers=headers,
        )
        t3_data = turn3.json()
        assert t3_data.get("sessionEnd") is not None
        assert t3_data["sessionEnd"]["outcome"] == "user_won"

        # End session & Coach Debrief
        end_resp = await client.post(f"/v1/train/sessions/{sid}/end", json={}, headers=headers)
        assert end_resp.status_code == 200
        debrief_data = end_resp.json()
        assert debrief_data["outcome"] == "user_won"
        assert debrief_data["score"]["final"] >= 40
        assert "held firm" in debrief_data["debrief"]["headline"].lower() or len(debrief_data["debrief"]["headline"]) > 0
        assert len(debrief_data["debrief"]["lessons"]) == 3
        assert len(debrief_data["debrief"]["moments"]) >= 3


@pytest.mark.asyncio
async def test_train_scripted_user_fell_on_otp_leak():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"X-Dev-User": "fell-tester"}
        create_resp = await client.post(
            "/v1/train/sessions",
            json={"scenarioSlug": "fake_kyc", "difficulty": 2, "lang": "en"},
            headers=headers,
        )
        sid = create_resp.json()["sessionId"]

        # Directly send OTP
        msg_resp = await client.post(
            f"/v1/train/sessions/{sid}/messages?stream=false",
            json={"text": "Here is the OTP 991823 please verify it", "clientMsgId": "fell_01"},
            headers=headers,
        )
        data = msg_resp.json()
        # [OTP] must be scrubbed in ack
        assert "[OTP]" in data["ack"]["text"]
        assert "otp" in data["ack"]["piiRemoved"]

        # Call /end
        end_resp = await client.post(
            f"/v1/train/sessions/{sid}/end",
            json={"reason": "walked_away"},
            headers=headers,
        )
        assert end_resp.status_code == 200
        end_data = end_resp.json()
        assert end_data["score"]["dataPoints"] == 0
