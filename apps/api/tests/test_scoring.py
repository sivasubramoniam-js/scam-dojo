"""Comprehensive unit tests for the deterministic scoring and progression engine.

100% test coverage for docs/4.agents.md §3.4 and docs/3.backend.md §8.
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from app.agents.train.scoring import (
    compute_belt,
    compute_resilience,
    compute_session_score,
    recommend_difficulty,
    update_streak,
    update_weak_tactics,
)
from app.schemas.scenario import FakeEntities, GroundTruthFlag, Persona, ScenarioSpec
from app.schemas.train import TurnAssessment


def create_dummy_scenario() -> ScenarioSpec:
    return ScenarioSpec(
        slug="fake_kyc",
        title={"en": "Fake KYC", "hi": "नकली केवाईसी"},
        blurb={"en": "Bank account will be blocked.", "hi": "खाता बंद हो जाएगा।"},
        scam_type="kyc_fraud",
        channel="phone_sms",
        persona=Persona(name="Rakesh", role="Officer", voice="Polite"),
        fake_entities=FakeEntities(
            org="Orion Bank",
            phone="+91 00000 00000",
            link="orion-kyc.example",
            upi="kyc@fakebank",
        ),
        objective="Get the OTP",
        ground_truth_flags=[
            GroundTruthFlag(id="urgency_deadline", text="Urgent block", tactic="urgency", weight=2),
            GroundTruthFlag(id="asks_otp", text="Asks OTP", tactic="authority", weight=3),
            GroundTruthFlag(id="unofficial_link", text="Bad link", tactic="trust", weight=2),
        ],
        verification_actions=["calls bank directly"],
        opening_message={"en": "Hello", "hi": "नमस्ते"},
    )


def test_outcome_points():
    scenario = create_dummy_scenario()
    assessments = [
        TurnAssessment(
            user_action="resisted",
            tactic_to_use="urgency",
            next_stage="trust",
            rationale="User pushed back",
        )
    ]

    # user_won: 40
    res_won = compute_session_score(assessments, scenario, "user_won", user_turn_count=3)
    assert res_won.outcome_points == 40

    # walked_away with >= 2 turns: 30
    res_walk_2 = compute_session_score(assessments, scenario, "walked_away", user_turn_count=2)
    assert res_walk_2.outcome_points == 30

    # walked_away with < 2 turns: 15
    res_walk_1 = compute_session_score(assessments, scenario, "walked_away", user_turn_count=1)
    assert res_walk_1.outcome_points == 15

    # max_turns: 20
    res_max = compute_session_score(assessments, scenario, "max_turns", user_turn_count=14)
    assert res_max.outcome_points == 20

    # user_fell: 0
    res_fell = compute_session_score(assessments, scenario, "user_fell", user_turn_count=2)
    assert res_fell.outcome_points == 0


def test_flag_points():
    scenario = create_dummy_scenario()
    # Total flag weight is 2 + 3 + 2 = 7

    # Spotted asks_otp (weight 3) -> 3 / 7 * 1.25 = 0.5357 -> round(25 * 0.5357) = 13
    a1 = TurnAssessment(
        user_action="questioned",
        red_flags_spotted=["asks_otp"],
        tactic_to_use="urgency",
        next_stage="pressure",
        rationale="",
    )
    res = compute_session_score([a1], scenario, "user_won", user_turn_count=3)
    assert res.flag_points == 13

    # Spotted all flags (weight 7 / 7 * 1.25 > 1.0) -> max 25
    a2 = TurnAssessment(
        user_action="questioned",
        red_flags_spotted=["asks_otp", "urgency_deadline", "unofficial_link"],
        tactic_to_use="urgency",
        next_stage="pressure",
        rationale="",
    )
    res_full = compute_session_score([a2], scenario, "user_won", user_turn_count=3)
    assert res_full.flag_points == 25


def test_verify_points_earliness():
    scenario = create_dummy_scenario()

    # Verified on turn 1 -> 20 * (1 - 0) = 20
    a1 = TurnAssessment(user_action="verified_independently", verification_attempted=True, rationale="")
    res1 = compute_session_score([a1], scenario, "user_won", user_turn_count=3, max_turns=14)
    assert res1.verify_points == 20

    # Verified on turn 14 -> 20 * (1 - 0.5 * 13 / 14) = 20 * 0.5357 = 10.7 -> 11
    a_late = [TurnAssessment(user_action="questioned", rationale="") for _ in range(13)] + [
        TurnAssessment(user_action="verified_independently", verification_attempted=True, rationale="")
    ]
    res_late = compute_session_score(a_late, scenario, "user_won", user_turn_count=14, max_turns=14)
    assert res_late.verify_points >= 10

    # No verification -> 0
    a_none = [TurnAssessment(user_action="questioned", verification_attempted=False, rationale="")]
    res_none = compute_session_score(a_none, scenario, "user_won", user_turn_count=1)
    assert res_none.verify_points == 0


def test_data_points_leak_penalty():
    scenario = create_dummy_scenario()

    # Leaked OTP (weight 1.0) -> leak_penalty 1.0 -> 0 data points
    a_otp = TurnAssessment(user_action="complied", leaked_data_types=["otp"], rationale="")
    res_otp = compute_session_score([a_otp], scenario, "user_fell", user_turn_count=2)
    assert res_otp.data_points == 0

    # Leaked phone (weight 0.1) -> leak_penalty 0.1 -> 15 * 0.9 = 13.5 -> 14
    a_phone = TurnAssessment(user_action="complied", leaked_data_types=["phone"], rationale="")
    res_phone = compute_session_score([a_phone], scenario, "user_won", user_turn_count=3)
    assert res_phone.data_points == 14

    # No leak -> full 15 data points
    a_clean = TurnAssessment(user_action="resisted", leaked_data_types=[], rationale="")
    res_clean = compute_session_score([a_clean], scenario, "user_won", user_turn_count=3)
    assert res_clean.data_points == 15


def test_coach_adjustment_clamping():
    scenario = create_dummy_scenario()
    a = TurnAssessment(user_action="resisted", rationale="")

    # Raw score: won (40) + clean data (15) = 55
    res_adj = compute_session_score([a], scenario, "user_won", user_turn_count=3, coach_adjustment=4)
    assert res_adj.coach_adj == 4
    assert res_adj.final == 59

    # Clamping over +5
    res_max_adj = compute_session_score([a], scenario, "user_won", user_turn_count=3, coach_adjustment=10)
    assert res_max_adj.coach_adj == 5
    assert res_max_adj.final == 60


def test_compute_resilience():
    # First session
    r1 = compute_resilience(old_resilience=None, final_score=80, difficulty=3)
    assert r1 == 80

    # Subsequent session: 0.7 * 80 + 0.3 * (100 * 1.0) = 56 + 30 = 86
    r2 = compute_resilience(old_resilience=80, final_score=100, difficulty=3)
    assert r2 == 86

    # Clamped at 100
    r_max = compute_resilience(old_resilience=98, final_score=100, difficulty=5)
    assert r_max <= 100


def test_belt_progression_and_black_belt_gate():
    # White belt: 0-19
    belt, next_b, prog = compute_belt(10)
    assert belt == "white"
    assert next_b == "yellow"
    assert 0.0 <= prog <= 1.0

    # Yellow belt: 20-34
    belt, next_b, prog = compute_belt(25)
    assert belt == "yellow"
    assert next_b == "orange"

    # Brown belt: 77-89
    belt, next_b, prog = compute_belt(85)
    assert belt == "brown"
    assert next_b == "black"

    # Resilience 95 but only 1 scenario at diff >= 3 -> capped at Brown!
    belt_capped, next_b_capped, prog_capped = compute_belt(95, completed_scenarios_at_diff_3_plus=1)
    assert belt_capped == "brown"
    assert next_b_capped == "black"

    # Resilience 95 with 3 scenarios at diff >= 3 -> Black Belt!
    belt_black, next_b_black, prog_black = compute_belt(95, completed_scenarios_at_diff_3_plus=3)
    assert belt_black == "black"
    assert next_b_black is None
    assert prog_black == 1.0


def test_weak_tactics_update():
    current_weak = {"urgency": 0.2, "authority": 0.5, "fear": 0.3, "greed": 0.3, "trust": 0.3, "isolation": 0.3}
    # User fell for urgency 2 out of 2 times (landed_rate = 1.0)
    # weak["urgency"] = 0.7 * 0.2 + 0.3 * 1.0 = 0.14 + 0.30 = 0.44
    turns = [("urgency", True), ("urgency", True), ("authority", False)]
    updated = update_weak_tactics(current_weak, turns)  # type: ignore
    assert updated["urgency"] == 0.44
    # Authority: 0 landed out of 1 -> landed_rate = 0.0 -> 0.7 * 0.5 + 0.3 * 0 = 0.35
    assert updated["authority"] == 0.35


def test_recommend_difficulty():
    # Resilience 30 -> base 1 + floor(1.5) = 2
    assert recommend_difficulty(30) == 2

    # Resilience 75 -> base 1 + floor(3.75) = 4
    assert recommend_difficulty(75) == 4

    # High streak: last two >= 80 -> +1
    assert recommend_difficulty(30, recent_scores=[85, 90]) == 3

    # Low streak: last two <= 40 -> -1
    assert recommend_difficulty(50, recent_scores=[35, 40]) == 2


def test_streak_advancement():
    tz = "Asia/Kolkata"
    d1 = datetime(2026, 10, 10, 12, 0, tzinfo=ZoneInfo(tz))
    d2 = datetime(2026, 10, 11, 14, 0, tzinfo=ZoneInfo(tz))
    d4 = datetime(2026, 10, 13, 10, 0, tzinfo=ZoneInfo(tz))

    # Day 1 start
    c1, b1, t1 = update_streak(0, 0, None, user_tz_name=tz, now=d1)
    assert c1 == 1 and b1 == 1 and t1 == "2026-10-10"

    # Same day play
    c_same, b_same, _ = update_streak(c1, b1, t1, user_tz_name=tz, now=d1)
    assert c_same == 1 and b_same == 1

    # Next day play -> streak = 2
    c2, b2, t2 = update_streak(c1, b1, t1, user_tz_name=tz, now=d2)
    assert c2 == 2 and b2 == 2 and t2 == "2026-10-11"

    # Skipped day (played on Oct 13) -> resets current to 1, preserves best = 2
    c3, b3, t3 = update_streak(c2, b2, t2, user_tz_name=tz, now=d4)
    assert c3 == 1 and b3 == 2 and t3 == "2026-10-13"
