"""Unit tests for the Train turn pipeline orchestration."""

import pytest

from app.agents.train.pipeline import TrainPipeline
from app.schemas.scenario import FakeEntities, GroundTruthFlag, Persona, ScenarioSpec


def create_mock_scenario() -> ScenarioSpec:
    return ScenarioSpec(
        slug="fake_kyc",
        title={"en": "Fake KYC", "hi": "नकली केवाईसी"},
        blurb={"en": "Account block notice", "hi": "खाता बंद"},
        scam_type="kyc_fraud",
        channel="phone_sms",
        persona=Persona(name="Rakesh", role="Officer", voice="Polite"),
        fake_entities=FakeEntities(
            org="Orion Bank",
            phone="+91 00000 00000",
            link="orion-kyc.example",
            upi="kyc@fakebank",
        ),
        objective="Get the user to share the OTP",
        ground_truth_flags=[
            GroundTruthFlag(id="asks_otp", text="Asks OTP", tactic="authority", weight=3),
        ],
        verification_actions=["says they will call the bank using the number on the card"],
        opening_message={"en": "Sir, your account will be blocked.", "hi": "खाता बंद हो जाएगा।"},
        fallback_lines={"extraction": "Please share the OTP to continue."},
    )


@pytest.mark.asyncio
async def test_pipeline_normal_resistance_turn() -> None:
    scenario = create_mock_scenario()
    session = {
        "sessionId": "ts_test01",
        "stage": "hook",
        "tension": 2,
        "difficulty": 3,
        "lang": "en",
        "messages": [{"role": "scammer", "text": "Your account is expiring."}],
        "assessments": [],
    }

    resp = await TrainPipeline.process_turn_sync(
        session=session,
        scenario=scenario,
        user_text="Who are you? What is your employee id?",
        client_msg_id="msg_01",
    )

    assert resp.ack.i == 2
    assert "Who are you?" in resp.ack.text
    assert resp.state.turn == 1
    assert resp.state.status == "active"
    assert resp.message.role == "scammer"
    assert len(resp.message.text) > 0
    assert resp.session_end is None


@pytest.mark.asyncio
async def test_pipeline_otp_leak_forces_user_fell() -> None:
    scenario = create_mock_scenario()
    session = {
        "sessionId": "ts_test02",
        "stage": "extraction",
        "tension": 7,
        "difficulty": 3,
        "lang": "en",
        "messages": [
            {"role": "scammer", "text": "Please share your OTP."},
        ],
        "assessments": [],
    }

    resp = await TrainPipeline.process_turn_sync(
        session=session,
        scenario=scenario,
        user_text="Okay my otp is 849201",
        client_msg_id="msg_02",
    )

    # Code scrubber removes OTP to [OTP]
    assert "[OTP]" in resp.ack.text
    assert "otp" in resp.ack.pii_removed
    # Server rules force user_fell
    assert resp.session_end is not None
    assert resp.session_end.outcome == "user_fell"


@pytest.mark.asyncio
async def test_pipeline_independent_verification_user_won() -> None:
    scenario = create_mock_scenario()
    session = {
        "sessionId": "ts_test03",
        "stage": "pressure",
        "tension": 6,
        "difficulty": 3,
        "lang": "en",
        "messages": [
            {"role": "scammer", "text": "Hello"},
            {"role": "user", "text": "Who are you?"},
            {"role": "scammer", "text": "Bank officer."},
            {"role": "user", "text": "Why call me?"},
            {"role": "scammer", "text": "Urgent verification."},
        ],
        "assessments": [],
    }

    resp = await TrainPipeline.process_turn_sync(
        session=session,
        scenario=scenario,
        user_text="No, I will call my bank using the official helpline on my card to verify.",
        client_msg_id="msg_03",
    )

    assert resp.session_end is not None
    assert resp.session_end.outcome == "user_won"


@pytest.mark.asyncio
async def test_pipeline_distress_triggers_sensei_safety_break() -> None:
    scenario = create_mock_scenario()
    session = {
        "sessionId": "ts_test04",
        "stage": "pressure",
        "tension": 6,
        "difficulty": 3,
        "lang": "en",
        "messages": [
            {"role": "scammer", "text": "Pay immediately."},
        ],
        "assessments": [],
    }

    resp = await TrainPipeline.process_turn_sync(
        session=session,
        scenario=scenario,
        user_text="I am really scared right now please don't arrest me",
        client_msg_id="msg_04",
    )

    assert session.get("safety_break") is True
    assert "[Sensei]" in resp.message.text
    assert resp.message.role == "sensei"


@pytest.mark.asyncio
async def test_pipeline_sse_event_stream_order() -> None:
    scenario = create_mock_scenario()
    session = {
        "sessionId": "ts_test05",
        "stage": "hook",
        "tension": 2,
        "difficulty": 3,
        "lang": "en",
        "messages": [{"role": "scammer", "text": "Hello"}],
        "assessments": [],
    }

    event_names = []
    tokens = []
    async for ev_name, ev_data in TrainPipeline.process_turn_stream(
        session=session,
        scenario=scenario,
        user_text="Hello, who is this?",
        client_msg_id="msg_05",
    ):
        event_names.append(ev_name)
        if ev_name == "token":
            tokens.append(ev_data.delta)

    # First event must be ack
    assert event_names[0] == "ack"
    # Followed by state
    assert "state" in event_names
    # Multiple token events
    assert "token" in event_names
    assert len(tokens) > 0
    # Followed by message_end
    assert "message_end" in event_names
    # Ends with done
    assert event_names[-1] == "done"
