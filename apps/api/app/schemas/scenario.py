"""Scenario schemas and models."""

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import Belt, CamelModel, Channel, Tactic


class GroundTruthFlag(BaseModel):
    id: str
    text: str
    tactic: Tactic
    weight: int = 1


class Persona(BaseModel):
    name: str
    role: str
    voice: str


class FakeEntities(BaseModel):
    org: str
    phone: str
    link: str
    upi: str
    employee_id: str | None = None
    email: str | None = None


class ScenarioSpec(BaseModel):
    slug: str
    title: dict[str, str] | str
    blurb: dict[str, str] | str
    scam_type: str
    channel: Channel
    language_style: dict[str, str] | str = "plain_english"
    min_belt: Belt = "white"
    difficulty_range: list[int] = Field(default_factory=lambda: [1, 5])
    est_minutes: int = 5
    persona: Persona
    fake_entities: FakeEntities
    objective: str
    stages: list[dict[str, Any]] = Field(default_factory=list)
    tactics_priority: list[Tactic] = Field(default_factory=list)
    ground_truth_flags: list[GroundTruthFlag] = Field(default_factory=list)
    verification_actions: list[str] = Field(default_factory=list)
    win_conditions: list[str] = Field(default_factory=list)
    lose_conditions: list[str] = Field(default_factory=list)
    opening_message: dict[str, str]
    fallback_lines: dict[str, str] = Field(default_factory=dict)
    custom: bool = False
    owner_uid: str | None = None

    def get_title(self, lang: str = "en") -> str:
        if isinstance(self.title, dict):
            return self.title.get(lang) or self.title.get("en") or next(iter(self.title.values()), "")
        return str(self.title)

    def get_blurb(self, lang: str = "en") -> str:
        if isinstance(self.blurb, dict):
            return self.blurb.get(lang) or self.blurb.get("en") or next(iter(self.blurb.values()), "")
        return str(self.blurb)

    def get_opening_message(self, lang: str = "en") -> str:
        return self.opening_message.get(lang) or self.opening_message.get("en") or next(iter(self.opening_message.values()), "")


class ScenarioSummary(CamelModel):
    slug: str
    custom: bool = False
    title: str
    blurb: str
    scam_type: str
    channel: Channel
    difficulty_range: list[int]
    est_minutes: int
    min_belt: Belt
    locked: bool = False
    locked_reason: str | None = None
    best_score: int | None = None
    times_completed: int = 0
    recommended: bool | None = None


class ScenarioListResponse(CamelModel):
    items: list[ScenarioSummary]
