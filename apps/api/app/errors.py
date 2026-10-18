"""Error hierarchy and handlers matching 6.api-contract.md."""

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorEnvelope(BaseModel):
    code: str
    message: str
    messageKey: str | None = None
    retryable: bool = False
    retryAfterSec: int | None = None
    requestId: str | None = None
    details: list[dict[str, Any]] | None = None


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        message_key: str | None = None,
        retryable: bool = False,
        retry_after_sec: int | None = None,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.message_key = message_key or f"error.{code}"
        self.retryable = retryable
        self.retry_after_sec = retry_after_sec
        self.details = details


class UnauthenticatedError(AppError):
    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(code="unauthenticated", message=message, status_code=401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(code="forbidden", message=message, status_code=403)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(code="not_found", message=message, status_code=404)


class ConflictError(AppError):
    def __init__(self, code: str = "session_not_active", message: str = "Session is not active") -> None:
        super().__init__(code=code, message=message, status_code=409)


class RateLimitedError(AppError):
    def __init__(self, message: str = "Daily limit reached", retry_after_sec: int = 3600) -> None:
        super().__init__(
            code="rate_limited",
            message=message,
            status_code=429,
            retryable=False,
            retry_after_sec=retry_after_sec,
        )


class ModelBusyError(AppError):
    def __init__(self, message: str = "AI Model is currently busy, please retry") -> None:
        super().__init__(
            code="model_busy",
            message=message,
            status_code=503,
            retryable=True,
        )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")
    envelope = ErrorEnvelope(
        code=exc.code,
        message=exc.message,
        messageKey=exc.message_key,
        retryable=exc.retryable,
        retryAfterSec=exc.retry_after_sec,
        requestId=request_id,
        details=exc.details,
    )
    headers = {"X-Request-ID": request_id} if request_id else {}
    if exc.retry_after_sec:
        headers["Retry-After"] = str(exc.retry_after_sec)

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": envelope.model_dump(by_alias=True, exclude_none=True)},
        headers=headers,
    )


async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")
    envelope = ErrorEnvelope(
        code="internal",
        message="An internal server error occurred",
        messageKey="error.internal",
        retryable=True,
        requestId=request_id,
    )
    headers = {"X-Request-ID": request_id} if request_id else {}
    return JSONResponse(
        status_code=500,
        content={"error": envelope.model_dump(by_alias=True, exclude_none=True)},
        headers=headers,
    )
