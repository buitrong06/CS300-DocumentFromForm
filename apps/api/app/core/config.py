from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env."""

    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", ".env"),  # path to .env
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    app_port: int = 8000
    frontend_origin: str = "http://localhost:5173"

    database_url: str = "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/docfill"

    auth_dev_bypass: bool = True
    auth_dev_user_email: str = "dev@example.com"
    firebase_project_id: str = ""

    storage_backend: Literal["local", "r2"] = "local"
    storage_local_dir: str = "./storage"
    libreoffice_binary: str = "libreoffice"
    # Optional Gotenberg-compatible service (DEC-022); empty runs LibreOffice on this host.
    render_service_url: str = ""
    render_timeout_seconds: int = 60
    render_work_dir: str = str(REPO_ROOT / "tmp" / "render")

    llm_enabled: bool = False
    llm_base_url: str = "http://127.0.0.1:11434"
    llm_model: str = "qwen2.5:7b"

    @model_validator(mode="after")
    def validate_dev_bypass_guard(self) -> "Settings":
        """Prevent accidental dev auth bypass in production."""
        if self.app_env == "production" and self.auth_dev_bypass:
            raise ValueError("AUTH_DEV_BYPASS must be false when APP_ENV=production")
        return self


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
