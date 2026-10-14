"""Helpline and support resources router."""

from fastapi import APIRouter, Depends, Query

from app.deps import get_current_user
from app.schemas.common import CamelModel, Lang, Resource
from app.schemas.user import Me
from app.services.kb import kb_service

router = APIRouter(prefix="/v1", tags=["resources"])


class ResourceListResponse(CamelModel):
    items: list[Resource]
    last_verified: str = "2026-10-14"


@router.get("/resources", response_model=ResourceListResponse)
async def list_resources(
    country: str = Query("IN"),
    category: str | None = Query(None),
    lang: Lang = Query("en"),
    user: Me = Depends(get_current_user),
) -> ResourceListResponse:
    raw_resources = kb_service.get_resources(country=country, category=category, lang=lang)
    items = [
        Resource(
            id=r["id"],
            name=r["name"],
            category=r["category"],
            contact_type=r["contactType"],
            contact_value=r["contactValue"],
            description=r["description"],
            when_to_use=r["whenToUse"],
            verified_on=r["verifiedOn"],
            source_url=r["sourceUrl"],
        )
        for r in raw_resources
    ]
    return ResourceListResponse(items=items, last_verified="2026-10-14")
