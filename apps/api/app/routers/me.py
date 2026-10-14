"""User profile and settings router."""

from typing import Any

from fastapi import APIRouter, Depends, Response, status
from fastapi.responses import JSONResponse

from app.deps import get_current_user, get_repo
from app.repo.base import Repo
from app.schemas.user import Me, PatchMeRequest

router = APIRouter(prefix="/v1/me", tags=["me"])


@router.get("", response_model=Me)
async def get_me(user: Me = Depends(get_current_user)) -> Me:
    return user


@router.patch("", response_model=Me)
async def patch_me(
    req: PatchMeRequest,
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> Me:
    patch_data: dict[str, Any] = {}
    if req.language is not None:
        patch_data["language"] = req.language
    if req.display_name is not None:
        patch_data["displayName"] = req.display_name
    if req.timezone is not None:
        patch_data["timezone"] = req.timezone
    if req.settings is not None:
        patch_data["settings"] = req.settings.model_dump(by_alias=True)

    if patch_data:
        updated_doc = await repo.update_user(user.uid, patch_data)
        return Me.model_validate(updated_doc)
    return user


@router.delete("/data", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me_data(
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> Response:
    await repo.delete_user_data(user.uid)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/export")
async def export_me_data(
    user: Me = Depends(get_current_user),
    repo: Repo = Depends(get_repo),
) -> JSONResponse:
    data = await repo.export_user_data(user.uid)
    return JSONResponse(content=data)
