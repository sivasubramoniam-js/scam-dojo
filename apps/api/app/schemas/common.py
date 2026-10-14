"""Common schemas, enums and base models."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model with automatic camelCase aliasing for wire JSON."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


Lang = Literal["en", "hi"]
Belt = Literal["white", "yellow", "orange", "green", "blue", "brown", "black"]
Tactic = Literal["urgency", "authority", "fear", "greed", "trust", "isolation"]
Channel = Literal["sms", "chat", "phone_sms", "email", "call"]


class TraceEvent(CamelModel):
    run_id: str
    turn: int | None = None
    agent: str
    model: str | None = None
    kind: Literal["start", "output", "code", "end", "error"]
    latency_ms: int | None = None
    summary: str
    payload: Any = None


class Resource(CamelModel):
    id: str
    name: str
    category: str
    contact_type: Literal["phone", "url", "none"]
    contact_value: str | None = None
    description: str
    when_to_use: str
    verified_on: str | None = None
    source_url: str
