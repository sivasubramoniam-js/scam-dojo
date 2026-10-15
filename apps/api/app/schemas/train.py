"""Train mode schemas and domain models."""

import uuid
from typing import Literal

from pydantic import Field

from app.schemas.common import Belt, CamelModel, Channel, Lang, Tactic

# -----------------------------------------------------------------------------
# Domain models used by Agents and Scoring
# -----------------------------------------------------------------------------

UserAction = Literal[
    "complied",
    "partially_complied",
    "resisted",
    "questioned",
    "verified_independently",
    "ignored",
    "left",
    "off_topic",
]

LeakedDataType = Literal[
    "otp",
    "upi_pin",
    "card",
    "cvv",
    "aadhaar",
    "pan",
    "bank_login",
    "phone",
    "remote_app_installed",
    "payment_sent",
]

PressureRecommendation = Literal["escalate", "hold", "ease_off", "change_tactic", "close_in"]
Stage = Literal["hook", "trust", "pressure", "extraction"]
TerminalStatus = Literal["none", "user_fell", "user_won", "max_turns"]


class TurnAssessment(CamelModel):
    user_action: UserAction
    leaked_data_types: list[LeakedDataType] = Field(default_factory=list)
    red_flags_spotted: list[str] = Field(default_factory=list)
    verification_attempted: bool = False
    suspicion_level: int = Field(default=0, ge=0, le=10)
    pressure_recommendation: PressureRecommendation = "hold"
    tactic_to_use: Tactic = "urgency"
    next_stage: Stage = "hook"
    terminal: TerminalStatus = "none"
    tension: int = Field(default=0, ge=0, le=10)
    safety_concern: bool = False
    rationale: str = Field(default="", max_length=240)


class ReplayMoment(CamelModel):
    turn_index: int
    scammer_line: str
    user_line: str | None = None
    result: Literal["landed", "blocked", "neutral"]
    tactic: Tactic
    what_happened: str = Field(max_length=220)
    better_reply: str | None = Field(default=None, max_length=220)


class Debrief(CamelModel):
    headline: str = Field(max_length=120)
    summary: str = Field(max_length=500)
    moments: list[ReplayMoment] = Field(default_factory=list)
    tactics_felt: dict[Tactic, int] = Field(default_factory=dict)
    lessons: list[str] = Field(default_factory=list, min_length=3, max_length=3)
    next_drill_slug: str
    next_drill_reason: str = Field(max_length=200)
    score_adjustment: int = Field(default=0, ge=-5, le=5)
    adjustment_reason: str | None = None


# -----------------------------------------------------------------------------
# API wire request and response models
# -----------------------------------------------------------------------------

class ChatMessage(CamelModel):
    i: int
    role: Literal["scammer", "user", "sensei"]
    text: str
    ts: str
    pii_removed: list[str] = Field(default_factory=list)


class ScenarioInfo(CamelModel):
    slug: str
    title: str
    channel: Channel
    persona_name: str
    org_label: str


class CreateSessionRequest(CamelModel):
    scenario_slug: str
    difficulty: int | Literal["auto"] = "auto"
    lang: Lang = "en"
    demo: bool = False


class CreateSessionResponse(CamelModel):
    session_id: str
    scenario: ScenarioInfo
    difficulty: int
    max_user_turns: int = 14
    tension: int = 0
    stage: str = "hook"
    messages: list[ChatMessage]
    started_at: str


class SendMessageRequest(CamelModel):
    text: str = Field(max_length=500)
    client_msg_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class AckData(CamelModel):
    i: int
    text: str
    pii_removed: list[str] = Field(default_factory=list)


class StateData(CamelModel):
    turn: int
    tension: int
    stage: str
    status: Literal["active", "ending"]


class TokenData(CamelModel):
    delta: str


class MessageEndData(CamelModel):
    i: int
    text: str
    role: Literal["scammer", "sensei"]


class SessionEndData(CamelModel):
    outcome: Literal["user_won", "user_fell", "max_turns", "walked_away"]
    reason: str


class SendMessageResponse(CamelModel):
    ack: AckData
    state: StateData
    message: ChatMessage
    session_end: SessionEndData | None = None


class ScoreBreakdown(CamelModel):
    final: int
    outcome_points: int
    flag_points: int
    verify_points: int
    data_points: int
    coach_adj: int


class ResilienceDelta(CamelModel):
    before: int
    after: int


class BeltDelta(CamelModel):
    before: Belt
    after: Belt
    changed: bool
    progress: float


class StreakInfo(CamelModel):
    current: int
    best: int
    last_active_date: str | None = None


class NextDrillInfo(CamelModel):
    slug: str
    reason: str


class EndSessionRequest(CamelModel):
    reason: Literal["walked_away", "timeout"] | None = None


class EndSessionResponse(CamelModel):
    session_id: str
    outcome: Literal["user_won", "user_fell", "walked_away", "max_turns"]
    score: ScoreBreakdown
    resilience: ResilienceDelta
    belt: BeltDelta
    debrief: Debrief
    degraded: bool = False
    next_drill: NextDrillInfo
    streak: StreakInfo


class TrainSessionDetail(CamelModel):
    session_id: str
    scenario: ScenarioInfo
    status: Literal["active", "ended"]
    difficulty: int
    tension: int
    stage: str
    turn_count: int
    messages: list[ChatMessage]
    outcome: str | None = None
    end: EndSessionResponse | None = None


class TrainSummary(CamelModel):
    session_id: str
    scenario_title: str
    started_at: str
    outcome: str
    final_score: int
    belt: Belt
    difficulty: int


class TrainSessionListResponse(CamelModel):
    items: list[TrainSummary]
    next_cursor: str | None = None
