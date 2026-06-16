"""
Sync markdown notes into the community corpus.

Sources (in priority order per note):
  1. Bundled notes in app/data/bundled_notes/ (AlgoMentor-authored patterns)
  2. Remote raw GitHub URLs from a2sv_github_resources
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.data.a2sv_github_resources import all_ingest_entries
from app.data.bundled_notes_loader import read_bundled_note
from app.data.interview_concepts import INTERVIEW_CONCEPTS
from app.models import Concept, Document
from app.services.community import ensure_community_kb
from app.services.storage import storage_ready, upload_file

logger = logging.getLogger(__name__)

GITHUB_RAW_HOST = "raw.githubusercontent.com"


@dataclass(frozen=True)
class IngestEntry:
    concept_slug: str
    filename: str
    bundled_path: str | None
    remote_url: str | None


async def _fetch_markdown(url: str) -> str:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text


async def _load_entry_markdown(entry: IngestEntry) -> tuple[str, str]:
    """Return (markdown, source_label)."""
    if entry.bundled_path:
        text = read_bundled_note(entry.bundled_path)
        if text and text.strip():
            return text, f"bundled:{entry.bundled_path}"

    if entry.remote_url and urlparse(entry.remote_url).hostname == GITHUB_RAW_HOST:
        text = await _fetch_markdown(entry.remote_url)
        return text, entry.remote_url

    raise ValueError(f"No markdown source for {entry.concept_slug}/{entry.filename}")


async def sync_community_notes(db: AsyncSession) -> dict:
    """
    Idempotently ingest community markdown into the shared KB.
    Re-sync updates existing documents matched by filename.
    """
    settings = get_settings()
    if not storage_ready():
        raise RuntimeError(
            "Storage is not configured. Set USE_LOCAL_STORAGE=true or provide "
            "SUPABASE_URL + SUPABASE_SERVICE_KEY in the environment."
        )

    kb = await ensure_community_kb(db)
    slug_to_concept: dict[str, uuid.UUID] = {}
    for seed in INTERVIEW_CONCEPTS:
        row = await db.execute(select(Concept).where(Concept.slug == seed.slug))
        concept = row.scalar_one_or_none()
        if concept:
            slug_to_concept[seed.slug] = concept.id

    created = 0
    updated = 0
    skipped = 0
    bundled = 0
    errors: list[str] = []
    pending_ids: list[uuid.UUID] = []

    for raw_entry in all_ingest_entries():
        entry = IngestEntry(
            concept_slug=raw_entry.concept_slug,
            filename=raw_entry.filename,
            bundled_path=raw_entry.bundled_path,
            remote_url=raw_entry.remote_url,
        )
        concept_id = slug_to_concept.get(entry.concept_slug)

        try:
            text, source = await _load_entry_markdown(entry)
        except Exception as exc:
            logger.warning("Failed to load %s: %s", entry.filename, exc)
            errors.append(f"{entry.concept_slug}: {exc}")
            continue

        if not text.strip():
            skipped += 1
            continue

        if source.startswith("bundled:"):
            bundled += 1

        existing = await db.execute(
            select(Document).where(
                Document.kb_id == kb.id,
                Document.filename == entry.filename,
            )
        )
        doc = existing.scalar_one_or_none()

        file_url = await upload_file(
            text.encode("utf-8"),
            entry.filename,
            content_type="text/markdown",
        )

        if doc is None:
            doc = Document(
                kb_id=kb.id,
                filename=entry.filename,
                file_type="txt",
                file_url=file_url,
                concept_id=concept_id,
                status="processing",
            )
            db.add(doc)
            await db.flush()
            created += 1
        else:
            doc.file_url = file_url
            doc.concept_id = concept_id
            doc.status = "processing"
            updated += 1

        pending_ids.append(doc.id)

    await db.commit()

    from app.database import AsyncSessionLocal
    from app.services.ingestion import run_ingestion

    if settings.use_celery:
        from app.tasks.ingest_task import ingest_document_task

        for doc_id in pending_ids:
            ingest_document_task.delay(str(doc_id))
    else:
        for doc_id in pending_ids:
            async with AsyncSessionLocal() as session:
                await run_ingestion(doc_id, session)

    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "bundled": bundled,
        "errors": errors,
    }
