from __future__ import annotations

import logging
import uuid
from pathlib import Path

import httpx
from supabase import create_client

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Stable URI stored in Document.file_url — avoids expiring signed URLs during Celery ingest.
SUPABASE_STORAGE_SCHEME = "supabase-storage://"


def _normalize_supabase_url(url: str) -> str:
    """Supabase client expects the project root URL, not the REST API path."""
    cleaned = url.rstrip("/")
    if cleaned.endswith("/rest/v1"):
        cleaned = cleaned[: -len("/rest/v1")]
    return cleaned


def storage_ready() -> bool:
    if settings.use_local_storage:
        return True
    return bool(settings.supabase_url.strip() and settings.supabase_service_key.strip())


def storage_backend_label() -> str:
    return "local" if settings.use_local_storage else "supabase"


def _local_storage_root() -> Path:
    root = Path(settings.local_storage_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _supabase_client():
    if not storage_ready():
        raise RuntimeError("Supabase storage is not configured")
    return create_client(
        _normalize_supabase_url(settings.supabase_url),
        settings.supabase_service_key,
    )


def _encode_storage_uri(bucket: str, path: str) -> str:
    return f"{SUPABASE_STORAGE_SCHEME}{bucket}/{path}"


def _decode_storage_uri(url: str) -> tuple[str, str]:
    if not url.startswith(SUPABASE_STORAGE_SCHEME):
        raise ValueError(f"Not a Supabase storage URI: {url}")
    rest = url[len(SUPABASE_STORAGE_SCHEME) :]
    bucket, _, path = rest.partition("/")
    if not bucket or not path:
        raise ValueError(f"Invalid Supabase storage URI: {url}")
    return bucket, path


async def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Upload file to Supabase Storage or local disk and return a durable fetch URI."""
    if settings.use_local_storage:
        rel_dir = uuid.uuid4().hex
        dest = _local_storage_root() / rel_dir / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(file_bytes)
        return dest.resolve().as_uri()

    client = _supabase_client()
    path = f"{uuid.uuid4()}/{filename}"
    bucket = settings.storage_bucket
    client.storage.from_(bucket).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    return _encode_storage_uri(bucket, path)


async def download_file(url: str) -> bytes:
    """Download file bytes from a storage URI, local file URI, or HTTPS URL."""
    if url.startswith(SUPABASE_STORAGE_SCHEME):
        bucket, path = _decode_storage_uri(url)
        client = _supabase_client()
        return client.storage.from_(bucket).download(path)

    if url.startswith("file://"):
        return Path(url[7:]).read_bytes()

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    async with httpx.AsyncClient(follow_redirects=True, timeout=60, headers=headers) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content
