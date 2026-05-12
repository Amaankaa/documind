from __future__ import annotations

import os
from functools import lru_cache

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

    # ── Gemini ────────────────────────────────────────────────────────────────
    gemini_api_key: str
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

    # ── Sentry ────────────────────────────────────────────────────────────────
    sentry_dsn: str = ""

    # ── Chunking ──────────────────────────────────────────────────────────────
    chunk_size: int = 3000
    chunk_overlap: int = 600
    top_k_chunks: int = 12

    # ── File Upload ───────────────────────────────────────────────────────────
    max_upload_bytes: int = 50 * 1024 * 1024  # 50 MB
    allowed_mime_types: list[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/csv",
        "application/csv",
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
