"""Scam Dojo API application entrypoint."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.config import settings
from app.deps import _local_repo
from app.errors import AppError, app_error_handler, generic_error_handler
from app.logging import logger, setup_logging
from app.middleware import setup_middleware
from app.routers import health, me, resources, scenarios, train
from app.services.kb import kb_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging(settings.ENV)
    logger.info("app_starting", env=settings.ENV, store=settings.STORE, auth=settings.AUTH_MODE)

    # Initialize SQLite database if running in sqlite mode
    if settings.STORE == "sqlite":
        await _local_repo.init_tables()
        logger.info("sqlite_repo_initialized", path=settings.SQLITE_PATH)

    # Verify Knowledge Base connection
    try:
        scenarios = kb_service.get_scenarios("en")
        logger.info("knowledge_base_ready", scenario_count=len(scenarios), path=settings.KB_PATH)
    except Exception as e:
        logger.error("knowledge_base_init_failed", error=str(e))
        raise

    yield

    logger.info("app_stopping")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Scam Dojo API",
        version="1.0.0",
        description="Backend API and Google ADK Agent Orchestration for Scam Dojo",
        lifespan=lifespan,
    )

    # Middleware
    setup_middleware(app)

    # Exception Handlers
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Invalid request parameters",
                    "messageKey": "error.validation",
                    "retryable": False,
                    "requestId": req_id,
                    "details": exc.errors(),
                }
            },
            headers={"X-Request-ID": req_id} if req_id else {},
        )

    app.add_exception_handler(Exception, generic_error_handler)

    # Routers
    app.include_router(health.router)
    app.include_router(scenarios.router)
    app.include_router(train.router)
    app.include_router(me.router)
    app.include_router(resources.router)

    return app


app = create_app()
