"""Scenarios router."""

from fastapi import APIRouter, Depends, Query

from app.deps import get_current_user, get_repo
from app.repo.base import Repo
from app.schemas.common import Belt, Lang
from app.schemas.scenario import ScenarioListResponse, ScenarioSummary
from app.schemas.user import Me
from app.services.kb import kb_service

router = APIRouter(prefix="/v1", tags=["scenarios"])

BELT_RANKS: dict[Belt, int] = {
    "white": 0,
    "yellow": 1,
    "orange": 2,
    "green": 3,
    "blue": 4,
    "brown": 5,
    "black": 6,
}


@router.get("/scenarios", response_model=ScenarioListResponse)
async def list_scenarios(
    lang: Lang = Query("en"),
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> ScenarioListResponse:
    user_rank = BELT_RANKS.get(user.belt, 0)
    raw_scenarios = kb_service.get_scenarios(lang=lang)

    # Get user's session history for best score and completion counts
    sessions = await repo.list_train_sessions(user.uid, limit=100)
    scores_by_slug: dict[str, list[int]] = {}
    for s in sessions:
        scen = s.get("scenario", {})
        slug = scen.get("slug")
        score = s.get("finalScore")
        if slug and score is not None:
            scores_by_slug.setdefault(slug, []).append(int(score))

    items: list[ScenarioSummary] = []
    for sc in raw_scenarios:
        min_belt: Belt = sc.get("minBelt", "white")
        min_rank = BELT_RANKS.get(min_belt, 0)
        is_locked = user_rank < min_rank
        locked_reason = f"Requires {min_belt.title()} Belt" if is_locked else None

        slug = sc["slug"]
        slug_scores = scores_by_slug.get(slug, [])
        best_score = max(slug_scores) if slug_scores else None
        times_completed = len(slug_scores)

        items.append(
            ScenarioSummary(
                slug=slug,
                custom=False,
                title=sc["title"],
                blurb=sc["blurb"],
                scam_type=sc["scamType"],
                channel=sc["channel"],
                difficulty_range=sc["difficultyRange"],
                est_minutes=sc["estMinutes"],
                min_belt=min_belt,
                locked=is_locked,
                locked_reason=locked_reason,
                best_score=best_score,
                times_completed=times_completed,
                recommended=False,
            )
        )

    # Include user's custom forged scenarios
    custom_scenarios = await repo.list_custom_scenarios(user.uid)
    for cs in custom_scenarios:
        c_slug = cs.get("slug", "")
        c_title = cs.get("title", {})
        if isinstance(c_title, dict):
            c_title_str = c_title.get(lang) or c_title.get("en", "Custom Drill")
        else:
            c_title_str = str(c_title)

        c_blurb = cs.get("blurb", {})
        if isinstance(c_blurb, dict):
            c_blurb_str = c_blurb.get(lang) or c_blurb.get("en", "Custom forged drill")
        else:
            c_blurb_str = str(c_blurb)

        items.insert(
            0,
            ScenarioSummary(
                slug=c_slug,
                custom=True,
                title=c_title_str,
                blurb=c_blurb_str,
                scam_type=cs.get("scam_type", "custom"),
                channel=cs.get("channel", "sms"),
                difficulty_range=cs.get("difficulty_range", [2, 4]),
                est_minutes=cs.get("est_minutes", 3),
                min_belt="white",
                locked=False,
                locked_reason=None,
                best_score=None,
                times_completed=0,
                recommended=True,
            ),
        )

    # Mark first unlocked as recommended if none completed, else scenario with fewest completions
    if items:
        has_custom = any(it.custom for it in items)
        if not has_custom:
            unlocked = [item for item in items if not item.locked]
            if unlocked:
                unlocked.sort(key=lambda x: x.times_completed)
                unlocked[0].recommended = True

    return ScenarioListResponse(items=items)
