"""Health and readiness endpoints."""

from typing import Any

from fastapi import APIRouter, Depends

from app.config import settings
from app.deps import get_kb, get_repo
from app.repo.base import Repo
from app.services.kb import KnowledgeBaseService

router = APIRouter(tags=["Health & Monitoring"])


@router.get("/healthz")
async def healthz() -> dict[str, bool]:
    return {"ok": True}


@router.get("/readyz")
async def readyz(
    kb: KnowledgeBaseService = Depends(get_kb),
    repo: Repo = Depends(get_repo),
) -> dict[str, Any]:
    # Check KB by querying scenarios
    scenarios = kb.get_scenarios("en")
    return {
        "ok": True,
        "kb": "v1",
        "scenarioCount": len(scenarios),
        "store": settings.STORE,
        "models": {
            "fast": settings.MODEL_FAST,
            "lite": settings.MODEL_LITE,
            "pro": settings.MODEL_PRO,
        },
    }


@router.get("/v1/stats/global")
async def global_stats(repo: Repo = Depends(get_repo)) -> dict[str, Any]:
    return await repo.get_global()
