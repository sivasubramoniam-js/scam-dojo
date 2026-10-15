"""Dashboard Router: Aggregated user performance, streak, tactic weakness, and history."""

import logging
from typing import Any, Literal
from fastapi import APIRouter, Depends

from app.deps import get_current_user, get_repo
from app.repo.base import Repo
from app.schemas.common import Belt, CamelModel, Tactic
from app.schemas.user import Me

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["dashboard"])


class TrendPoint(CamelModel):
    date: str
    score: int
    resilience: int
    session_id: str


class TacticWeakness(CamelModel):
    tactic: Tactic
    label: str
    weakness: float


class RecommendedDrill(CamelModel):
    slug: str
    title: str
    reason: str


class HistoryItem(CamelModel):
    type: Literal["train", "check", "recover"]
    id: str
    ts: str
    title: str
    badge: str


class ChecksSummary(CamelModel):
    total: int
    likely_scam: int


class RecoveriesSummary(CamelModel):
    total: int
    open_steps: int


class DashboardResponse(CamelModel):
    me: Me
    trend: list[TrendPoint]
    tactics: list[TacticWeakness]
    recommended_drill: RecommendedDrill | None = None
    history: list[HistoryItem]
    checks: ChecksSummary
    recoveries: RecoveriesSummary


TACTIC_LABELS: dict[Tactic, str] = {
    "urgency": "Urgency & Deadlines",
    "authority": "Authority & Police Impersonation",
    "fear": "Fear & Account Suspension",
    "greed": "Greed & Too-Good-To-Be-True Offers",
    "trust": "Familiarity & Trust Pretexts",
    "isolation": "Isolation & Pressure to Stay on Call",
}


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> DashboardResponse:
    # 1. Fetch user records
    train_sessions = await repo.list_train_sessions(user.uid, limit=30)
    checks_list = await repo.list_checks(user.uid, limit=30)
    plans_list = await repo.list_plans(user.uid, limit=30)

    # 2. Build trend points (ascending order)
    trend: list[TrendPoint] = []
    for s in reversed(train_sessions):
        s_date = s.get("startedAt", "")[:10]
        final_score = int(s.get("finalScore") or 0)
        res_after = int(s.get("resilience", {}).get("after", user.resilience)) if isinstance(s.get("resilience"), dict) else user.resilience
        trend.append(
            TrendPoint(
                date=s_date,
                score=final_score,
                resilience=res_after,
                session_id=s.get("sessionId", ""),
            )
        )

    # 3. Tactics weakness breakdown based on user's recent training session debriefs
    tactics: list[TacticWeakness] = []
    tactic_hits: dict[Tactic, int] = {
        "urgency": 1,
        "authority": 1,
        "fear": 0,
        "greed": 0,
        "trust": 0,
        "isolation": 0,
    }

    for s in train_sessions:
        debrief = s.get("debrief", {})
        weak = debrief.get("weakTactics", [])
        for w in weak:
            if w in tactic_hits:
                tactic_hits[w] += 1

    total_sessions = max(1, len(train_sessions))
    for t_key, label in TACTIC_LABELS.items():
        w_score = min(0.95, round(tactic_hits[t_key] / total_sessions * 0.7 + 0.15, 2))
        tactics.append(TacticWeakness(tactic=t_key, label=label, weakness=w_score))

    # 4. Recommended drill
    recommended_drill = RecommendedDrill(
        slug="fake_kyc",
        title="Fake Bank KYC Expiry Phishing",
        reason="Strengthens your resistance against Urgency and Authority manipulation tactics.",
    )

    # 5. Combined unified history
    history: list[HistoryItem] = []
    for s in train_sessions:
        scen_title = s.get("scenario", {}).get("title", "Training Drill")
        outcome = s.get("outcome", "completed")
        badge = "Won" if outcome == "user_won" else ("Walked Away" if outcome == "walked_away" else "Fell")
        history.append(
            HistoryItem(
                type="train",
                id=s.get("sessionId", ""),
                ts=s.get("startedAt", ""),
                title=scen_title,
                badge=badge,
            )
        )

    likely_scam_count = 0
    for c in checks_list:
        v = c.get("verdict", "suspicious")
        if v == "likely_scam":
            likely_scam_count += 1
            badge = "Scam"
        elif v == "likely_safe":
            badge = "Safe"
        else:
            badge = "Caution"

        history.append(
            HistoryItem(
                type="check",
                id=c.get("checkId", ""),
                ts=c.get("createdAt", ""),
                title=c.get("title", "Threat Inspection"),
                badge=badge,
            )
        )

    open_steps_count = 0
    for p in plans_list:
        steps = p.get("steps", [])
        status_map = p.get("stepStatus", {})
        done_num = sum(1 for st in steps if status_map.get(st.get("id"), {}).get("done", False))
        open_steps_count += len(steps) - done_num
        history.append(
            HistoryItem(
                type="recover",
                id=p.get("planId", ""),
                ts=p.get("createdAt", ""),
                title=p.get("summary", "Recovery Action Plan"),
                badge=f"{done_num}/{len(steps)} Steps",
            )
        )

    # Sort history newest first
    history.sort(key=lambda h: h.ts, reverse=True)

    return DashboardResponse(
        me=user,
        trend=trend[-20:],
        tactics=tactics,
        recommended_drill=recommended_drill,
        history=history[:30],
        checks=ChecksSummary(total=len(checks_list), likely_scam=likely_scam_count),
        recoveries=RecoveriesSummary(total=len(plans_list), open_steps=open_steps_count),
    )
