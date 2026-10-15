"""Agent runtime, template renderer, and LLM runner.

Supports both live Google ADK / GenAI streaming and deterministic offline fallback.
Follows docs/4.agents.md §2.
"""

import asyncio
import json
import logging
import time
from collections.abc import AsyncGenerator, Callable
from pathlib import Path
from typing import Any, Literal, TypeVar

import jinja2
from pydantic import BaseModel

from app.config import settings
from app.schemas.common import TraceEvent
from app.schemas.train import Debrief, ReplayMoment, TurnAssessment

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Jinja2 environment loading templates from agents/prompts
PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"
jinja_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader(str(PROMPTS_DIR)),
    autoescape=False,
    trim_blocks=True,
    lstrip_blocks=True,
)


def get_lang_instruction(lang: str) -> str:
    if lang == "hi":
        return (
            "Write in simple, natural Hindi (Devanagari) as spoken in everyday India. "
            "Keep standard English loanwords people actually use (OTP, KYC, UPI, bank, link, app). "
            "Do not translate product/brand terms. For the scammer in chat scenarios, follow "
            "the scenario's language_style (devanagari or hinglish)."
        )
    return "Write in clear, simple English suitable for a non-technical adult."


def render_prompt(template_name: str, context: dict[str, Any]) -> str:
    lang = context.get("lang", "en")
    full_context = {
        "lang_instruction": get_lang_instruction(lang),
        **context,
    }
    template = jinja_env.get_template(template_name)
    return template.render(full_context)


def is_live_llm_enabled() -> bool:
    if settings.GOOGLE_GENAI_USE_VERTEXAI and settings.GOOGLE_CLOUD_PROJECT:
        return True
    key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY
    return bool(key and key not in ("test-api-key", "dummy", "fake", ""))


def get_genai_client():
    from google import genai

    if settings.GOOGLE_GENAI_USE_VERTEXAI and settings.GOOGLE_CLOUD_PROJECT:
        return genai.Client(
            vertexai=True,
            project=settings.GOOGLE_CLOUD_PROJECT,
            location=settings.GOOGLE_CLOUD_LOCATION,
        )
    key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY or ""
    return genai.Client(api_key=key)


class FakeTrainLlm:
    """Deterministic, high-fidelity offline LLM simulator for Train mode."""

    @staticmethod
    def assess_turn(context: dict[str, Any]) -> TurnAssessment:
        last_user_text = str(context.get("last_user_text", "")).lower()
        pii_found = [str(x).lower() for x in context.get("pii_found", [])]
        turn_index = int(context.get("turn_index", 1))
        stage = str(context.get("stage", "hook"))
        prev_tension = int(context.get("prev_tension", 0))

        # Check for leaked sensitive info
        leaked_types = []
        if any("otp" in p for p in pii_found) or "otp" in last_user_text:
            leaked_types.append("otp")
        if any("pin" in p for p in pii_found) or "upi_pin" in pii_found or "pin" in last_user_text:
            leaked_types.append("upi_pin")
        if any("cvv" in p for p in pii_found) or "cvv" in last_user_text:
            leaked_types.append("cvv")
        if any("card" in p for p in pii_found):
            leaked_types.append("card")

        # Did the user spot red flags?
        flags_spotted = []
        flags_compact = context.get("flags_compact", [])
        if "otp" in last_user_text and "asks_otp" in str(flags_compact):
            flags_spotted.append("asks_otp")
        if ("official" in last_user_text or "branch" in last_user_text or "call" in last_user_text) and "unofficial_link" in str(flags_compact):
            flags_spotted.append("unofficial_link")

        # Independent verification
        verif = False
        if any(w in last_user_text for w in ["call my bank", "visit branch", "helpline", "check app", "official website", "not clicking"]):
            verif = True

        # User action
        if leaked_types:
            action = "complied"
        elif verif:
            action = "verified_independently"
        elif any(w in last_user_text for w in ["no", "never", "won't", "stop", "scam", "fraud", "police"]):
            action = "resisted"
        elif any(w in last_user_text for w in ["why", "who are you", "what is this", "proof", "id"]):
            action = "questioned"
        elif any(w in last_user_text for w in ["bye", "hang up", "leaving"]):
            action = "left"
        else:
            action = "partially_complied" if turn_index > 1 else "questioned"

        # Determine terminal condition
        terminal = "none"
        if leaked_types and stage in ("pressure", "extraction"):
            terminal = "user_fell"
        elif (verif or action in ("resisted", "left")) and turn_index >= 3:
            terminal = "user_won"

        next_stages = ["hook", "trust", "pressure", "extraction"]
        curr_idx = next_stages.index(stage) if stage in next_stages else 0
        next_stage = next_stages[min(len(next_stages) - 1, curr_idx + 1)]

        new_tension = min(10, prev_tension + 2) if action in ("complied", "partially_complied") else max(0, prev_tension - 1)

        return TurnAssessment(
            user_action=action,  # type: ignore
            leaked_data_types=leaked_types,  # type: ignore
            red_flags_spotted=flags_spotted,
            verification_attempted=verif,
            suspicion_level=8 if verif else (6 if action == "resisted" else 2),
            pressure_recommendation="escalate" if action == "resisted" else ("close_in" if action == "complied" else "hold"),
            tactic_to_use="urgency" if stage in ("hook", "pressure") else "authority",
            next_stage=next_stage,  # type: ignore
            terminal=terminal,  # type: ignore
            tension=new_tension,
            safety_concern=False,
            rationale=f"User {action} on turn {turn_index}."[:240],
        )

    @staticmethod
    async def stream_scammer_reply(context: dict[str, Any]) -> AsyncGenerator[str, None]:
        if context.get("safety_break"):
            text = (
                "[Sensei] This is a practice scenario in Scam Dojo. Everything is simulated. "
                "If you are dealing with a real scam or incident, please open Recover mode for verified steps."
            )
            for token in text.split(" "):
                yield token + " "
                await asyncio.sleep(0.01)
            return

        scenario = context.get("scenario")
        stage = str(context.get("stage", "hook"))
        lang = str(context.get("lang", "en"))
        fallback_lines = scenario.fallback_lines if scenario else {}

        if fallback_lines and stage in fallback_lines:
            text = fallback_lines[stage]
        elif lang == "hi":
            if stage == "trust":
                text = "जी सर, आपकी सुरक्षा के लिए Orion Bank की ओर से यह प्रक्रिया आवश्यक है। कृपया सहयोग करें।"
            elif stage == "pressure":
                text = "अगर आपने 5 मिनट में सत्यापन पूरा नहीं किया तो आपका खाता आज ही ब्लॉक कर दिया जाएगा।"
            elif stage == "extraction":
                text = "आपके फ़ोन पर जो 6 अंकों का OTP आया है, उसे तुरंत बताइए ताकि हम आपका खाता सक्रिय रख सकें।"
            else:
                text = "सर, Orion Bank के सर्वर पर आपका विवरण अपडेट होना बाकी है।"
        else:
            if stage == "trust":
                text = "Sir, this is standard procedure from Orion Bank to protect your account. Please confirm your details."
            elif stage == "pressure":
                text = "If this verification is not completed within 5 minutes, your account will be suspended today."
            elif stage == "extraction":
                text = "Please share the 6-digit OTP sent to your registered mobile number so I can authenticate your access."
            else:
                text = "Sir, we noticed an issue on your Orion Bank profile that requires immediate confirmation."

        tokens = text.split(" ")
        for i, token in enumerate(tokens):
            yield token + (" " if i < len(tokens) - 1 else "")
            await asyncio.sleep(0.01)

    @staticmethod
    def generate_coach_debrief(context: dict[str, Any]) -> Debrief:
        scenario_title = str(context.get("scenario_title", "Simulation"))
        outcome = str(context.get("outcome", "user_won"))
        available_slugs = context.get("available_slugs", ["upi_collect_refund", "fake_kyc", "job_offer_task"])
        transcript_and_assessments = context.get("transcript_and_assessments", [])

        moments: list[ReplayMoment] = []
        blocked_count = 0
        total_moves = 0

        for item in transcript_and_assessments:
            turn_idx = item.get("turn_index", 1)
            scammer_line = item.get("scammer_line", "Scammer message")
            user_line = item.get("user_line")
            assessment = item.get("assessment", {})

            action = assessment.get("user_action", "complied")
            result: Literal["landed", "blocked", "neutral"] = "neutral"
            if action in ("resisted", "verified_independently"):
                result = "blocked"
                blocked_count += 1
            elif action in ("complied", "partially_complied"):
                result = "landed"

            total_moves += 1
            moments.append(
                ReplayMoment(
                    turn_index=turn_idx,
                    scammer_line=scammer_line[:120],
                    user_line=user_line[:120] if user_line else None,
                    result=result,
                    tactic=assessment.get("tactic_to_use", "urgency"),
                    what_happened="The scammer attempted to build urgency." if result == "landed" else "You paused and pushed back on the scammer's demands.",
                    better_reply="I will verify this directly by calling the official helpline number on my bank card." if result == "landed" else None,
                )
            )

        if outcome == "user_won":
            headline = f"You held firm for {blocked_count} of {max(1, total_moves)} moves."
            summary = f"In this {scenario_title} drill, you successfully recognised the deception and maintained your boundaries."
        elif outcome == "user_fell":
            headline = f"The pressure broke through on move {total_moves}."
            summary = f"In this {scenario_title} drill, the scammer leveraged urgency and authority to push for sensitive credentials."
        else:
            headline = f"You stepped away after {total_moves} moves."
            summary = f"In this {scenario_title} drill, disengaging from suspicious contact was a safe response."

        # Pick next drill slug
        current_slug = context.get("scenario_slug", "")
        candidates = [s for s in available_slugs if s != current_slug]
        next_drill = candidates[0] if candidates else (available_slugs[0] if available_slugs else "fake_kyc")

        return Debrief(
            headline=headline[:120],
            summary=summary[:500],
            moments=moments,
            tactics_felt={"urgency": 4, "authority": 3, "fear": 2, "greed": 1, "trust": 3, "isolation": 1},
            lessons=[
                "No real bank or customer care ever asks for an OTP or PIN over chat or phone.",
                "Always verify through an independent channel: call the number on your card or official app.",
                "Urgency is a psychological tactic designed to stop you from thinking clearly.",
            ],
            next_drill_slug=next_drill,
            next_drill_reason="Practice defending against different emotional pressure tactics.",
            score_adjustment=0,
            adjustment_reason=None,
        )


async def run_observer(
    context: dict[str, Any],
    on_trace: Callable[[TraceEvent], None] | None = None,
) -> TurnAssessment:
    """Run Observer agent with live LLM or offline fallback."""
    start_time = time.time()
    if on_trace:
        on_trace(
            TraceEvent(
                run_id=context.get("run_id", "trace_obs"),
                turn=context.get("turn_index"),
                agent="observer_agent",
                model=settings.MODEL_LITE,
                kind="start",
                summary="Observer referee evaluating user move",
            )
        )

    if not is_live_llm_enabled():
        assessment = FakeTrainLlm.assess_turn(context)
        latency = int((time.time() - start_time) * 1000)
        if on_trace:
            on_trace(
                TraceEvent(
                    run_id=context.get("run_id", "trace_obs"),
                    turn=context.get("turn_index"),
                    agent="observer_agent",
                    model=settings.MODEL_LITE,
                    kind="output",
                    latency_ms=latency,
                    summary=f"Action: {assessment.user_action}, Terminal: {assessment.terminal}",
                    payload=assessment.model_dump(),
                )
            )
        return assessment

    # Live Gemini call via google-genai
    try:
        from google.genai import types

        client = get_genai_client()
        prompt_text = render_prompt("observer.md.j2", context)

        config = types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=TurnAssessment,
        )

        resp = await client.aio.models.generate_content(
            model=settings.MODEL_LITE,
            contents=prompt_text,
            config=config,
        )

        parsed_json = json.loads(resp.text or "{}")
        assessment = TurnAssessment.model_validate(parsed_json)
        latency = int((time.time() - start_time) * 1000)
        if on_trace:
            on_trace(
                TraceEvent(
                    run_id=context.get("run_id", "trace_obs"),
                    turn=context.get("turn_index"),
                    agent="observer_agent",
                    model=settings.MODEL_LITE,
                    kind="output",
                    latency_ms=latency,
                    summary=f"Action: {assessment.user_action}, Terminal: {assessment.terminal}",
                    payload=assessment.model_dump(),
                )
            )
        return assessment
    except Exception as e:
        logger.warning("Live observer call failed, using fallback: %s", e)
        return FakeTrainLlm.assess_turn(context)


async def run_scammer(
    context: dict[str, Any],
    on_trace: Callable[[TraceEvent], None] | None = None,
) -> AsyncGenerator[str, None]:
    """Run Scammer agent streaming tokens."""
    start_time = time.time()
    if on_trace:
        on_trace(
            TraceEvent(
                run_id=context.get("run_id", "trace_scam"),
                turn=context.get("turn_index"),
                agent="scammer_agent",
                model=settings.MODEL_FAST,
                kind="start",
                summary="Scammer generating adaptive move",
            )
        )

    if context.get("safety_break"):
        safety_text = (
            "[Sensei] This is a practice scenario in Scam Dojo. Everything is simulated. "
            "If you are dealing with a real scam or incident, please open Recover mode for verified steps."
        )
        for token in safety_text.split(" "):
            yield token + " "
        return

    if not is_live_llm_enabled():
        async for token in FakeTrainLlm.stream_scammer_reply(context):
            yield token
        latency = int((time.time() - start_time) * 1000)
        if on_trace:
            on_trace(
                TraceEvent(
                    run_id=context.get("run_id", "trace_scam"),
                    turn=context.get("turn_index"),
                    agent="scammer_agent",
                    model=settings.MODEL_FAST,
                    kind="end",
                    latency_ms=latency,
                    summary="Scammer response streaming completed",
                )
            )
        return

    # Live streaming Gemini call
    try:
        from google.genai import types

        client = get_genai_client()
        prompt_text = render_prompt("scammer.md.j2", context)

        config = types.GenerateContentConfig(
            temperature=0.9,
            top_p=0.95,
            max_output_tokens=160,
        )

        response_stream = await client.aio.models.generate_content_stream(
            model=settings.MODEL_FAST,
            contents=prompt_text,
            config=config,
        )

        async for chunk in response_stream:
            if chunk.text:
                yield chunk.text

        latency = int((time.time() - start_time) * 1000)
        if on_trace:
            on_trace(
                TraceEvent(
                    run_id=context.get("run_id", "trace_scam"),
                    turn=context.get("turn_index"),
                    agent="scammer_agent",
                    model=settings.MODEL_FAST,
                    kind="end",
                    latency_ms=latency,
                    summary="Scammer response streaming completed",
                )
            )
    except Exception as e:
        logger.warning("Live scammer streaming failed, falling back: %s", e)
        async for token in FakeTrainLlm.stream_scammer_reply(context):
            yield token


async def run_coach(
    context: dict[str, Any],
    on_trace: Callable[[TraceEvent], None] | None = None,
) -> Debrief:
    """Run Coach agent with live LLM or offline fallback."""
    start_time = time.time()
    if on_trace:
        on_trace(
            TraceEvent(
                run_id=context.get("run_id", "trace_coach"),
                agent="coach_agent",
                model=settings.MODEL_PRO,
                kind="start",
                summary="Sensei Coach generating post-session debrief",
            )
        )

    if not is_live_llm_enabled():
        debrief = FakeTrainLlm.generate_coach_debrief(context)
        latency = int((time.time() - start_time) * 1000)
        if on_trace:
            on_trace(
                TraceEvent(
                    run_id=context.get("run_id", "trace_coach"),
                    agent="coach_agent",
                    model=settings.MODEL_PRO,
                    kind="output",
                    latency_ms=latency,
                    summary=f"Debrief: {debrief.headline}",
                    payload=debrief.model_dump(),
                )
            )
        return debrief

    # Live Gemini call
    try:
        from google.genai import types

        client = get_genai_client()
        prompt_text = render_prompt("coach.md.j2", context)

        config = types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
            response_schema=Debrief,
        )

        resp = await client.aio.models.generate_content(
            model=settings.MODEL_PRO,
            contents=prompt_text,
            config=config,
        )

        parsed_json = json.loads(resp.text or "{}")
        debrief = Debrief.model_validate(parsed_json)
        latency = int((time.time() - start_time) * 1000)
        if on_trace:
            on_trace(
                TraceEvent(
                    run_id=context.get("run_id", "trace_coach"),
                    agent="coach_agent",
                    model=settings.MODEL_PRO,
                    kind="output",
                    latency_ms=latency,
                    summary=f"Debrief: {debrief.headline}",
                    payload=debrief.model_dump(),
                )
            )
        return debrief
    except Exception as e:
        logger.warning("Live coach call failed, using fallback: %s", e)
        return FakeTrainLlm.generate_coach_debrief(context)
