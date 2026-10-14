"""Deterministic scoring and progression engine for Train mode.

Follows specifications in docs/4.agents.md §3.4 and docs/3.backend.md §8.
"""

from datetime import datetime
from math import floor
from typing import Literal
from zoneinfo import ZoneInfo

from app.schemas.common import Belt, Tactic
from app.schemas.scenario import ScenarioSpec
from app.schemas.train import ScoreBreakdown, TurnAssessment

DIFFICULTY_MULT = {
    1: 0.85,
    2: 0.92,
    3: 1.00,
    4: 1.06,
    5: 1.12,
}

BELT_RANGES: list[tuple[Belt, int, int]] = [
    ("white", 0, 19),
    ("yellow", 20, 34),
    ("orange", 35, 49),
    ("green", 50, 64),
    ("blue", 65, 76),
    ("brown", 77, 89),
    ("black", 90, 100),
]

LEAK_WEIGHTS = {
    "otp": 1.0,
    "upi_pin": 1.0,
    "card": 1.0,
    "cvv": 1.0,
    "payment_sent": 1.0,
    "remote_app_installed": 1.0,
    "bank_login": 0.8,
    "aadhaar": 0.5,
    "pan": 0.5,
    "phone": 0.1,
}


def compute_session_score(
    assessments: list[TurnAssessment],
    scenario: ScenarioSpec,
    outcome: Literal["user_won", "user_fell", "walked_away", "max_turns"],
    user_turn_count: int,
    coach_adjustment: int = 0,
    max_turns: int = 14,
) -> ScoreBreakdown:
    """Compute score breakdown (0-100) deterministically from assessments and outcome."""

    # 1. Outcome points (0-40)
    if outcome == "user_won":
        outcome_points = 40
    elif outcome == "walked_away":
        outcome_points = 30 if user_turn_count >= 2 else 15
    elif outcome == "max_turns":
        outcome_points = 20
    else:  # user_fell
        outcome_points = 0

    # 2. Flag points (0-25)
    # Deduplicate spotted flags across all turn assessments
    spotted_flag_ids = set()
    for a in assessments:
        spotted_flag_ids.update(a.red_flags_spotted)

    flag_map = {f.id: f for f in scenario.ground_truth_flags}
    total_flag_weight = sum(f.weight for f in scenario.ground_truth_flags)
    spotted_weight = sum(flag_map[fid].weight for fid in spotted_flag_ids if fid in flag_map)

    if total_flag_weight > 0:
        ratio = (spotted_weight / total_flag_weight) * 1.25
        flag_points = round(25 * min(1.0, ratio))
    else:
        flag_points = 0

    # 3. Verify points (0-20)
    # 20 if verification_attempted in any turn; scaled by earliness
    first_verify_turn = None
    for idx, a in enumerate(assessments, start=1):
        if a.verification_attempted:
            first_verify_turn = idx
            break

    if first_verify_turn is not None:
        scaled = 20 * (1 - 0.5 * (first_verify_turn - 1) / max_turns)
        verify_points = round(max(10.0, min(20.0, scaled)))
    else:
        verify_points = 0

    # 4. Data points (0-15)
    # 15 * (1 - leak_penalty)
    all_leaked = set()
    for a in assessments:
        all_leaked.update(a.leaked_data_types)

    total_leak_weight = sum(LEAK_WEIGHTS.get(item, 0.5) for item in all_leaked)
    leak_penalty = min(1.0, total_leak_weight)
    data_points = round(15 * (1.0 - leak_penalty))

    # Coach adjustment clamped to [-5, 5]
    clamped_coach_adj = max(-5, min(5, coach_adjustment))

    raw_score = outcome_points + flag_points + verify_points + data_points
    final_score = max(0, min(100, round(raw_score + clamped_coach_adj)))

    return ScoreBreakdown(
        final=final_score,
        outcome_points=outcome_points,
        flag_points=flag_points,
        verify_points=verify_points,
        data_points=data_points,
        coach_adj=clamped_coach_adj,
    )


def compute_resilience(
    old_resilience: int | None,
    final_score: int,
    difficulty: int,
) -> int:
    """Compute new resilience score using EMA formula."""
    mult = DIFFICULTY_MULT.get(difficulty, 1.0)
    effective_score = final_score * mult

    if old_resilience is None or old_resilience <= 0:
        new_res = round(effective_score)
    else:
        new_res = round(0.7 * old_resilience + 0.3 * effective_score)

    return max(0, min(100, new_res))


def compute_belt(
    resilience: int,
    completed_scenarios_at_diff_3_plus: int = 0,
) -> tuple[Belt, Belt | None, float]:
    """Compute current belt, next belt, and progress (0.0 to 1.0) towards next belt.

    Black belt requires >= 3 distinct scenarios completed at difficulty >= 3,
    otherwise capped at Brown.
    """
    current_belt: Belt = "white"
    for belt_name, low, high in BELT_RANGES:
        if low <= resilience <= high:
            current_belt = belt_name
            break

    # Cap at brown if black belt qualification not met
    if current_belt == "black" and completed_scenarios_at_diff_3_plus < 3:
        current_belt = "brown"

    # Find index
    belt_names = [b[0] for b in BELT_RANGES]
    idx = belt_names.index(current_belt)

    if idx == len(BELT_RANGES) - 1 or current_belt == "black":
        return "black", None, 1.0

    next_belt = belt_names[idx + 1]
    curr_low = BELT_RANGES[idx][1]
    next_low = BELT_RANGES[idx + 1][1]

    denom = next_low - curr_low
    progress = max(0.0, min(1.0, (resilience - curr_low) / denom if denom > 0 else 1.0))

    return current_belt, next_belt, round(progress, 2)


def update_weak_tactics(
    current_weak: dict[Tactic, float] | None,
    turn_tactics_and_compliance: list[tuple[Tactic, bool]],
) -> dict[Tactic, float]:
    """Update per-tactic exponential moving average landed rate.

    turn_tactics_and_compliance: list of (tactic_used, complied_or_partially_complied)
    weak[t] = 0.7 * weak[t] + 0.3 * landed_rate_this_session
    """
    all_tactics: list[Tactic] = ["urgency", "authority", "fear", "greed", "trust", "isolation"]
    res = {t: 0.3 for t in all_tactics}
    if current_weak:
        res.update(current_weak)

    # Group this session's events
    tactic_counts: dict[Tactic, int] = {t: 0 for t in all_tactics}
    landed_counts: dict[Tactic, int] = {t: 0 for t in all_tactics}

    for tactic, complied in turn_tactics_and_compliance:
        if tactic in tactic_counts:
            tactic_counts[tactic] += 1
            if complied:
                landed_counts[tactic] += 1

    for t in all_tactics:
        if tactic_counts[t] > 0:
            rate = landed_counts[t] / tactic_counts[t]
            res[t] = round(0.7 * res[t] + 0.3 * rate, 3)

    return res


def recommend_difficulty(
    resilience: int,
    recent_scores: list[int] | None = None,
) -> int:
    """Recommend auto difficulty in range 1..5.

    clamp(1 + floor(resilience / 20), 1, 5)
    +1 if last 2 sessions scored >= 80
    -1 if last 2 sessions scored <= 40
    """
    base = 1 + floor(resilience / 20)
    adjustment = 0
    if recent_scores and len(recent_scores) >= 2:
        last_two = recent_scores[-2:]
        if all(s >= 80 for s in last_two):
            adjustment = 1
        elif all(s <= 40 for s in last_two):
            adjustment = -1

    return max(1, min(5, base + adjustment))


def update_streak(
    current_streak: int,
    best_streak: int,
    last_active_date_str: str | None,
    user_tz_name: str = "Asia/Kolkata",
    now: datetime | None = None,
) -> tuple[int, int, str]:
    """Calculate streak advancement based on user's local date."""
    try:
        tz = ZoneInfo(user_tz_name)
    except Exception:
        tz = ZoneInfo("Asia/Kolkata")

    current_dt = now or datetime.now(tz)
    today_str = current_dt.strftime("%Y-%m-%d")

    if not last_active_date_str:
        return 1, max(1, best_streak), today_str

    if last_active_date_str == today_str:
        return current_streak, best_streak, today_str

    try:
        last_dt = datetime.strptime(last_active_date_str, "%Y-%m-%d").replace(tzinfo=tz)
        diff_days = (current_dt.date() - last_dt.date()).days
    except Exception:
        diff_days = 999

    if diff_days == 1:
        new_curr = current_streak + 1
        return new_curr, max(new_curr, best_streak), today_str
    elif diff_days > 1:
        return 1, max(1, best_streak), today_str
    else:
        return current_streak, best_streak, today_str
