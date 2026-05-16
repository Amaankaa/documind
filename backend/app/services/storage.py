from __future__ import annotations

import logging
import uuid
from pathlib import Path

import httpx
from supabase import create_client

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _normalize_supabase_url(url: str) -> str:
    """Supabase client expects the project root URL, not the REST API path."""
    cleaned = url.rstrip("/")
    if cleaned.endswith("/rest/v1"):
        cleaned = cleaned[: -len("/rest/v1")]
    return cleaned


def _local_storage_root() -> Path:
    root = Path(settings.local_storage_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _supabase_client():
    return create_client(
        _normalize_supabase_url(settings.supabase_url),
        settings.supabase_service_key,
    )


async def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Upload file to Supabase Storage or local disk and return a fetchable URL."""
    if settings.use_local_storage:
        rel_dir = uuid.uuid4().hex
        dest = _local_storage_root() / rel_dir / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(file_bytes)
        return dest.resolve().as_uri()

    client = _supabase_client()
    path = f"{uuid.uuid4()}/{filename}"
    client.storage.from_(settings.storage_bucket).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": content_type},
    )
    signed = client.storage.from_(settings.storage_bucket).create_signed_url(
        path, expires_in=60 * 60 * 24 * 365 * 10
    )
    return signed["signedURL"]


async def download_file(url: str) -> bytes:
    """Download file bytes from a local file URI, signed URL, or HTTPS URL."""
    if url.startswith("file://"):
        return Path(url[7:]).read_bytes()

    async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content
