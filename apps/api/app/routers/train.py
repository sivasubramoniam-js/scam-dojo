"""Train mode router: sessions, messages with SSE, and scoring/debrief."""

import json
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse

from app.agents.runtime import run_coach
from app.agents.train.pipeline import TrainPipeline
from app.agents.train.scoring import (
    compute_belt,
    compute_resilience,
    compute_session_score,
    recommend_difficulty,
    update_streak,
    update_weak_tactics,
)
from app.deps import get_current_user, get_repo
from app.errors import AppError as ApiError
from app.repo.base import Repo
from app.routers.scenarios import BELT_RANKS
from app.schemas.common import Tactic
from app.schemas.scenario import ScenarioSpec
from app.schemas.train import (
    BeltDelta,
    ChatMessage,
    CreateSessionRequest,
    CreateSessionResponse,
    Debrief,
    EndSessionRequest,
    EndSessionResponse,
    NextDrillInfo,
    ResilienceDelta,
    ScenarioInfo,
    SendMessageRequest,
    SendMessageResponse,
    StreakInfo,
    TrainSessionDetail,
    TrainSessionListResponse,
    TrainSummary,
    TurnAssessment,
)
from app.schemas.user import Me
from app.services.kb import kb_service

router = APIRouter(prefix="/v1/train", tags=["train"])


@router.post("/sessions", response_model=CreateSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    req: CreateSessionRequest,
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> CreateSessionResponse:
    raw_scenario = kb_service.get_scenario(req.scenario_slug)
    if not raw_scenario:
        raise ApiError(
            code="not_found",
            message=f"Scenario '{req.scenario_slug}' not found",
            message_key="error.scenario_not_found",
            status_code=404,
        )

    scenario_spec = ScenarioSpec.model_validate(raw_scenario)
    user_rank = BELT_RANKS.get(user.belt, 0)
    min_rank = BELT_RANKS.get(scenario_spec.min_belt, 0)
    if user_rank < min_rank:
        raise ApiError(
            code="forbidden",
            message=f"Scenario requires {scenario_spec.min_belt.title()} Belt",
            message_key="error.belt_locked",
            status_code=403,
        )

    # Resolve difficulty
    if req.difficulty == "auto":
        resolved_diff = recommend_difficulty(user.resilience)
    else:
        resolved_diff = int(req.difficulty)

    # Clamp difficulty to scenario range
    diff_range = scenario_spec.difficulty_range or [1, 5]
    resolved_diff = max(diff_range[0], min(diff_range[1], resolved_diff))

    now_iso = datetime.now(UTC).isoformat()
    sid = f"ts_{uuid.uuid4().hex[:12]}"

    opening_text = scenario_spec.get_opening_message(req.lang)
    opening_message = ChatMessage(
        i=1,
        role="scammer",
        text=opening_text,
        ts=now_iso,
        pii_removed=[],
    )

    org_label = f"{scenario_spec.fake_entities.org} (simulated)"
    scen_info = ScenarioInfo(
        slug=scenario_spec.slug,
        title=scenario_spec.get_title(req.lang),
        channel=scenario_spec.channel,
        persona_name=scenario_spec.persona.name,
        org_label=org_label,
    )

    session_doc = {
        "sessionId": sid,
        "scenario": scen_info.model_dump(by_alias=True),
        "difficulty": resolved_diff,
        "maxUserTurns": 14,
        "tension": 0,
        "stage": "hook",
        "status": "active",
        "lang": req.lang,
        "startedAt": now_iso,
        "messages": [opening_message.model_dump(by_alias=True)],
        "assessments": [],
        "seenIds": [],
        "userTurnCount": 0,
        "weakTactics": ["urgency", "authority"],
    }

    await repo.create_train_session(user.uid, session_doc)
    await repo.incr_global("trainSessions")

    # Increment user train count
    await repo.update_user(user.uid, {"counts": {**user.counts.model_dump(by_alias=True), "train": user.counts.train + 1}})

    return CreateSessionResponse(
        session_id=sid,
        scenario=scen_info,
        difficulty=resolved_diff,
        max_user_turns=14,
        tension=0,
        stage="hook",
        messages=[opening_message],
        started_at=now_iso,
    )


@router.post("/sessions/{sid}/messages")
async def send_message(
    sid: str,
    body: SendMessageRequest,
    stream: bool = Query(True),
    trace: int = Query(0),
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> Any:
    sess = await repo.get_train_session(user.uid, sid)
    if not sess:
        raise ApiError(
            code="not_found",
            message="Session not found",
            message_key="error.session_not_found",
            status_code=404,
        )

    if sess.get("status") == "ended":
        raise ApiError(
            code="session_not_active",
            message="Session has already ended",
            message_key="error.session_ended",
            status_code=409,
        )

    scen_slug = sess.get("scenario", {}).get("slug", "")
    raw_scen = kb_service.get_scenario(scen_slug)
    if not raw_scen:
        raise ApiError(
            code="not_found",
            message="Scenario definition missing",
            message_key="error.scenario_not_found",
            status_code=404,
        )
    scenario_spec = ScenarioSpec.model_validate(raw_scen)

    # Check idempotency
    seen_ids: list[str] = sess.get("seenIds", [])
    if body.client_msg_id in seen_ids:
        # Return last response
        messages = sess.get("messages", [])
        last_scammer = next((m for m in reversed(messages) if m.get("role") in ("scammer", "sensei")), None)
        chat_msg = ChatMessage.model_validate(last_scammer) if last_scammer else ChatMessage(i=0, role="scammer", text="", ts="")
        ack_data = sess.get("lastAck", {"i": chat_msg.i - 1, "text": body.text, "piiRemoved": []})
        state_data = {
            "turn": sess.get("turnCount", 1),
            "tension": sess.get("tension", 0),
            "stage": sess.get("stage", "hook"),
            "status": sess.get("status", "active"),
        }
        return SendMessageResponse.model_validate({
            "ack": ack_data,
            "state": state_data,
            "message": chat_msg.model_dump(by_alias=True),
            "sessionEnd": None,
        })

    seen_ids.append(body.client_msg_id)
    sess["seenIds"] = seen_ids

    # Synchronous stream=false mode
    if not stream:
        resp = await TrainPipeline.process_turn_sync(
            sess, scenario_spec, body.text, body.client_msg_id
        )
        # Persist session update
        state_patch = {
            "stage": sess.get("stage"),
            "tension": sess.get("tension"),
            "status": sess.get("status"),
            "outcome": sess.get("outcome"),
            "seenIds": seen_ids,
            "messages": sess.get("messages", []),
            "assessments": sess.get("assessments", []),
        }
        await repo.finish_train_session(user.uid, sid, state_patch)
        return resp

    # SSE Streaming mode
    async def sse_event_generator() -> AsyncGenerator[str, None]:
        try:
            async for ev_name, ev_data in TrainPipeline.process_turn_stream(
                sess, scenario_spec, body.text, body.client_msg_id, trace_enabled=bool(trace)
            ):
                if ev_name == "done":
                    yield "event: done\ndata: {}\n\n"
                elif hasattr(ev_data, "model_dump_json"):
                    yield f"event: {ev_name}\ndata: {ev_data.model_dump_json(by_alias=True)}\n\n"
                else:
                    yield f"event: {ev_name}\ndata: {json.dumps(ev_data)}\n\n"

            # Persist after successful turn stream
            state_patch = {
                "stage": sess.get("stage"),
                "tension": sess.get("tension"),
                "status": sess.get("status"),
                "outcome": sess.get("outcome"),
                "seenIds": seen_ids,
                "messages": sess.get("messages", []),
                "assessments": sess.get("assessments", []),
            }
            await repo.finish_train_session(user.uid, sid, state_patch)
        except Exception as e:
            err_envelope = {
                "error": {
                    "code": "internal",
                    "message": str(e),
                    "retryable": True,
                }
            }
            yield f"event: error\ndata: {json.dumps(err_envelope)}\n\n"
            yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/sessions/{sid}/end", response_model=EndSessionResponse)
async def end_session(
    sid: str,
    req: EndSessionRequest | None = None,
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> EndSessionResponse:
    sess = await repo.get_train_session(user.uid, sid)
    if not sess:
        raise ApiError(
            code="not_found",
            message="Session not found",
            message_key="error.session_not_found",
            status_code=404,
        )

    # If already ended with cached debrief, return stored end response
    if sess.get("status") == "ended" and "endResponse" in sess:
        return EndSessionResponse.model_validate(sess["endResponse"])

    scen_slug = sess.get("scenario", {}).get("slug", "")
    raw_scen = kb_service.get_scenario(scen_slug)
    if not raw_scen:
        raise ApiError(
            code="not_found",
            message="Scenario definition missing",
            message_key="error.scenario_not_found",
            status_code=404,
        )
    scenario_spec = ScenarioSpec.model_validate(raw_scen)

    # Determine outcome
    outcome = sess.get("outcome")
    if not outcome:
        reason = req.reason if req and req.reason else "walked_away"
        outcome = "walked_away" if reason == "walked_away" else "max_turns"

    raw_assessments = sess.get("assessments", [])
    assessments = [TurnAssessment.model_validate(a) for a in raw_assessments]
    messages = sess.get("messages", [])
    user_turn_count = len([m for m in messages if m.get("role") == "user"])

    # 1. Deterministic score calculation
    score_breakdown = compute_session_score(
        assessments=assessments,
        scenario=scenario_spec,
        outcome=outcome,  # type: ignore
        user_turn_count=user_turn_count,
        coach_adjustment=0,
    )

    # 2. Run Sensei Coach
    available_scenarios = kb_service.get_scenarios(lang=sess.get("lang", "en"))
    available_slugs = [s["slug"] for s in available_scenarios]

    transcript_and_assessments = []
    user_turns = [m for m in messages if m.get("role") == "user"]
    scammer_turns = [m for m in messages if m.get("role") in ("scammer", "sensei")]

    for i in range(max(len(user_turns), len(scammer_turns))):
        s_line = scammer_turns[i]["text"] if i < len(scammer_turns) else ""
        u_line = user_turns[i]["text"] if i < len(user_turns) else None
        asst = assessments[i].model_dump() if i < len(assessments) else {}
        transcript_and_assessments.append({
            "turn_index": i + 1,
            "scammer_line": s_line,
            "user_line": u_line,
            "assessment": asst,
        })

    coach_context = {
        "scenario_title": scenario_spec.get_title(sess.get("lang", "en")),
        "scenario_slug": scenario_spec.slug,
        "outcome": outcome,
        "score_breakdown_json": score_breakdown.model_dump_json(),
        "available_slugs": available_slugs,
        "transcript_and_assessments": transcript_and_assessments,
        "lang": sess.get("lang", "en"),
    }

    debrief: Debrief = await run_coach(coach_context)

    # Apply coach adjustment if any
    if debrief.score_adjustment != 0:
        score_breakdown = compute_session_score(
            assessments=assessments,
            scenario=scenario_spec,
            outcome=outcome,  # type: ignore
            user_turn_count=user_turn_count,
            coach_adjustment=debrief.score_adjustment,
        )

    # 3. Progression calculations
    old_resilience = user.resilience
    difficulty = sess.get("difficulty", 3)
    new_resilience = compute_resilience(old_resilience, score_breakdown.final, difficulty)

    # Count completed scenarios >= diff 3
    past_sessions = await repo.list_train_sessions(user.uid, limit=50)
    qualifying = set()
    for ps in past_sessions:
        if ps.get("outcome") == "user_won" and ps.get("difficulty", 0) >= 3:
            s_slug = ps.get("scenario", {}).get("slug")
            if s_slug:
                qualifying.add(s_slug)
    if outcome == "user_won" and difficulty >= 3:
        qualifying.add(scenario_spec.slug)

    curr_belt, next_b, progress = compute_belt(new_resilience, len(qualifying))
    belt_changed = curr_belt != user.belt

    # Streak update
    curr_streak, best_streak, today_str = update_streak(
        current_streak=user.streak.current,
        best_streak=user.streak.best,
        last_active_date_str=user.streak.last_active_date,
        user_tz_name=user.timezone,
    )

    # Weak tactics update
    turn_tactics_compliance = []
    for a in assessments:
        tactic: Tactic = a.tactic_to_use
        complied = a.user_action in ("complied", "partially_complied")
        turn_tactics_compliance.append((tactic, complied))
    new_weak_tactics = update_weak_tactics(None, turn_tactics_compliance)

    # Update user profile in Repo
    user_patch = {
        "resilience": new_resilience,
        "belt": curr_belt,
        "beltProgress": progress,
        "nextBelt": next_b,
        "streak": {"current": curr_streak, "best": best_streak, "lastActiveDate": today_str},
        "weakTactics": new_weak_tactics,
    }
    await repo.update_user(user.uid, user_patch)

    end_resp = EndSessionResponse(
        session_id=sid,
        outcome=outcome,  # type: ignore
        score=score_breakdown,
        resilience=ResilienceDelta(before=old_resilience, after=new_resilience),
        belt=BeltDelta(before=user.belt, after=curr_belt, changed=belt_changed, progress=progress),
        debrief=debrief,
        degraded=False,
        next_drill=NextDrillInfo(
            slug=debrief.next_drill_slug,
            reason=debrief.next_drill_reason,
        ),
        streak=StreakInfo(
            current=curr_streak,
            best=best_streak,
            last_active_date=today_str,
        ),
    )

    # Persist session completion
    finish_patch = {
        "status": "ended",
        "outcome": outcome,
        "finalScore": score_breakdown.final,
        "endResponse": end_resp.model_dump(by_alias=True),
    }
    await repo.finish_train_session(user.uid, sid, finish_patch)

    return end_resp


@router.get("/sessions/{sid}", response_model=TrainSessionDetail)
async def get_session(
    sid: str,
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> TrainSessionDetail:
    sess = await repo.get_train_session(user.uid, sid)
    if not sess:
        raise ApiError(
            code="not_found",
            message="Session not found",
            message_key="error.session_not_found",
            status_code=404,
        )

    end_data = sess.get("endResponse")
    end_obj = EndSessionResponse.model_validate(end_data) if end_data else None

    raw_msgs = sess.get("messages", [])
    messages = [
        ChatMessage(
            i=m.get("i", idx + 1),
            role=m.get("role", "scammer"),
            text=m.get("text", ""),
            ts=m.get("ts", ""),
            pii_removed=m.get("piiRemoved", []),
        )
        for idx, m in enumerate(raw_msgs)
    ]

    return TrainSessionDetail(
        session_id=sid,
        scenario=ScenarioInfo.model_validate(sess.get("scenario", {})),
        status=sess.get("status", "active"),
        difficulty=sess.get("difficulty", 3),
        tension=sess.get("tension", 0),
        stage=sess.get("stage", "hook"),
        turn_count=len([m for m in messages if m.role == "user"]),
        messages=messages,
        outcome=sess.get("outcome"),
        end=end_obj,
    )


@router.get("/sessions", response_model=TrainSessionListResponse)
async def list_train_sessions(
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Query(None),
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> TrainSessionListResponse:
    sessions = await repo.list_train_sessions(user.uid, limit=limit, cursor=cursor)
    items: list[TrainSummary] = []
    for s in sessions:
        scen = s.get("scenario", {})
        title = scen.get("title", "Training Drill")
        final_score = int(s.get("finalScore", 0))
        items.append(
            TrainSummary(
                session_id=s.get("sessionId", ""),
                scenario_title=title,
                started_at=s.get("startedAt", ""),
                outcome=s.get("outcome", "active"),
                final_score=final_score,
                belt=user.belt,
                difficulty=s.get("difficulty", 3),
            )
        )

    return TrainSessionListResponse(items=items)
