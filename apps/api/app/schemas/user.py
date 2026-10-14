"""User profile and settings schemas."""

from pydantic import Field

from app.schemas.common import Belt, CamelModel, Lang


class UserStreak(CamelModel):
    current: int = 0
    best: int = 0
    last_active_date: str | None = None


class UserCounts(CamelModel):
    train: int = 0
    check: int = 0
    recover: int = 0


class UserSettings(CamelModel):
    hide_hints: bool = False
    trace_default: bool = False


class Me(CamelModel):
    uid: str
    display_name: str | None = None
    is_anonymous: bool = True
    language: Lang = "en"
    timezone: str = "Asia/Kolkata"
    resilience: int = 0
    belt: Belt = "white"
    belt_progress: float = 0.0
    next_belt: Belt | None = "yellow"
    streak: UserStreak = Field(default_factory=UserStreak)
    counts: UserCounts = Field(default_factory=UserCounts)
    recommended_difficulty: int = 1
    settings: UserSettings = Field(default_factory=UserSettings)


class PatchMeRequest(CamelModel):
    language: Lang | None = None
    display_name: str | None = None
    timezone: str | None = None
    settings: UserSettings | None = None
