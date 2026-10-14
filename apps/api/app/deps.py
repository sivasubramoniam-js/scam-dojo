"""FastAPI dependency providers for Auth, Database, KB, and Localization."""

from dataclasses import dataclass
from typing import Annotated, Any, Literal

from fastapi import Header, Query, Request

from app.config import settings
from app.errors import UnauthenticatedError
from app.repo.base import Repo
from app.repo.sqlite_repo import SqliteRepo
from app.services.kb import KnowledgeBaseService, kb_service

# Singleton repo instance for local mode
_local_repo = SqliteRepo()


@dataclass
class User:
    uid: str
    is_anonymous: bool
    email: str | None = None
    display_name: str | None = None


async def get_repo() -> Repo:
    return _local_repo


def get_kb() -> KnowledgeBaseService:
    return kb_service


async def get_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    x_dev_user: Annotated[str | None, Header()] = None,
) -> User:
    if settings.AUTH_MODE == "dev":
        uid = x_dev_user or "dev-guest"
        if not uid.startswith("dev-"):
            uid = f"dev-{uid}"
        return User(uid=uid, is_anonymous=False, display_name=uid.replace("dev-", "").title())

    # Production Firebase Auth
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthenticatedError("Missing or malformed Authorization header")

    token = authorization.split("Bearer ", 1)[1].strip()
    try:
        import firebase_admin.auth
        decoded = firebase_admin.auth.verify_id_token(token)
        return User(
            uid=decoded["uid"],
            is_anonymous=decoded.get("firebase", {}).get("sign_in_provider") == "anonymous",
            email=decoded.get("email"),
            display_name=decoded.get("name"),
        )
    except Exception as e:
        raise UnauthenticatedError(f"Invalid authentication token: {e}") from e


async def get_current_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    x_dev_user: Annotated[str | None, Header()] = None,
) -> Any:
    # Avoid circular import by importing Me lazily or at top
    from app.schemas.user import Me

    user = await get_user(request, authorization=authorization, x_dev_user=x_dev_user)
    repo = await get_repo()
    defaults = {
        "uid": user.uid,
        "displayName": user.display_name,
        "isAnonymous": user.is_anonymous,
        "language": "en",
        "timezone": "Asia/Kolkata",
        "resilience": 0,
        "belt": "white",
        "beltProgress": 0.0,
        "nextBelt": "yellow",
        "streak": {"current": 0, "best": 0, "lastActiveDate": None},
        "counts": {"train": 0, "check": 0, "recover": 0},
        "recommendedDifficulty": 1,
        "settings": {"hideHints": False, "traceDefault": False},
    }
    user_doc = await repo.get_or_create_user(user.uid, defaults)
    return Me.model_validate(user_doc)


def get_lang(
    lang: Annotated[str | None, Query()] = None,
    accept_language: Annotated[str | None, Header()] = None,
) -> Literal["en", "hi"]:
    if lang in ("en", "hi"):
        return lang  # type: ignore

    if accept_language:
        preferred = accept_language.split(",")[0].strip().lower()
        if preferred.startswith("hi"):
            return "hi"

    return "en"
