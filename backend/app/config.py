from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/documind"
    sync_database_url: str = "postgresql://postgres:postgres@localhost:5432/documind"

    # ── Redis / Celery ────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"
    # When False, document ingestion runs in-process via FastAPI BackgroundTasks
    # instead of being dispatched to a Celery worker (needed for free hosting
    # tiers that don't run a separate worker/Redis).
    use_celery: bool = True

    # ── LLM / Embeddings ──────────────────────────────────────────────────────
    # Provider: "gemini" (direct Google) or "laozhang" (OpenAI-compatible proxy).
    llm_provider: Literal["gemini", "laozhang"] = "gemini"
    gemini_api_key: str = ""
    laozhang_api_key: str = ""
    laozhang_base_url: str = "https://api.laozhang.ai/v1"
    embedding_model: str = "gemini-embedding-2-preview"
    chat_model: str = "gemini-2.5-flash"
    embedding_dimensions: int = 1536

    # ── Clerk Auth ────────────────────────────────────────────────────────────
    clerk_secret_key: str
    clerk_jwks_url: str  # e.g. https://<your-clerk-domain>/.well-known/jwks.json

    # ── Storage (Supabase or local disk for dev) ──────────────────────────────
    supabase_url: str = ""
    supabase_service_key: str = ""
    storage_bucket: str = "documents"
    use_local_storage: bool = False
    local_storage_dir: str = ".local_storage"

    # ── CORS ──────────────────────────────────────────────────────────────────
    allowed_origins: list[str] = ["http://localhost:3000"]

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    query_rate_limit: str = "20/minute"
    # Per-user cap on tutor questions per UTC day (0 = unlimited).
    query_daily_limit_per_user: int = 50

    # ── Sentry ────────────────────────────────────────────────────────────────
    sentry_dsn: str = ""

    # ── Chunking ──────────────────────────────────────────────────────────────
    chunk_size: int = 3000
    chunk_overlap: int = 600
    top_k_chunks: int = 12

    # ── File Upload ───────────────────────────────────────────────────────────
    max_upload_bytes: int = 10 * 1024 * 1024  # 10 MB
    max_chunks_per_kb: int = 100
    community_kb_github_repo: str = "BemnetMussa/algorithm-knowledge-base"
    community_kb_github_branch: str = "main"
    community_sync_on_startup: bool = False
    community_sync_interval_hours: float = 6.0  # 0 = disable Celery beat schedule
    allowed_mime_types: list[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/csv",
        "application/csv",
    ]


    @model_validator(mode="after")
    def _validate_llm_credentials(self) -> Settings:
        if self.llm_provider == "laozhang":
            if not self.laozhang_api_key.strip():
                raise ValueError("LAOZHANG_API_KEY is required when LLM_PROVIDER=laozhang")
        elif not self.gemini_api_key.strip():
            raise ValueError("GEMINI_API_KEY is required when LLM_PROVIDER=gemini")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
