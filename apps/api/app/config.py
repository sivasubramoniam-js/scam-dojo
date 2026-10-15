"""Application configuration using Pydantic Settings."""

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: Literal["local", "staging", "prod"] = "local"
    PORT: int = 8080
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Gemini access
    GOOGLE_GENAI_USE_VERTEXAI: bool = False
    GOOGLE_CLOUD_PROJECT: str | None = None
    GOOGLE_CLOUD_LOCATION: str = "global"
    GOOGLE_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None

    MODEL_LITE: str = "gemini-3.8-flash"
    MODEL_FAST: str = "gemini-3.8-flash"
    MODEL_PRO: str = "gemini-3.8-flash"
    MODEL_FALLBACK: str = "gemini-2.5-flash"

    # Storage
    STORE: Literal["firestore", "sqlite"] = "sqlite"
    SQLITE_PATH: str = "./.local/dojo.sqlite"
    KB_PATH: str = "./data/knowledge.sqlite"
    CACHE_PATH: str = "/tmp/dojo_cache.sqlite"

    # Auth
    AUTH_MODE: Literal["firebase", "dev"] = "dev"
    FIREBASE_PROJECT_ID: str | None = None

    # Features
    WEBRISK_ENABLED: bool = False
    DEMO_MODE: Literal["off", "cached", "record"] = "off"
    TRACE_ENABLED: bool = True
    DAILY_TRAIN_TURNS: int = 120
    DAILY_CHECKS: int = 30
    DAILY_RECOVER_CALLS: int = 20
    MAX_UPLOAD_MB: int = 20

    def get_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def validate_runtime(self) -> None:
        """Fail-fast checks for production environments."""
        if self.ENV != "local" and self.AUTH_MODE == "dev":
            raise ValueError(f"AUTH_MODE=dev is forbidden when ENV={self.ENV}")
        if self.ENV == "prod" and self.STORE == "sqlite":
            raise ValueError("STORE=sqlite is strictly forbidden when ENV=prod")


settings = Settings()
settings.validate_runtime()
