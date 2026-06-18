from __future__ import annotations

import ipaddress
import socket
import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_org
from app.config import get_settings
from app.database import AsyncSessionLocal, get_db
from app.models import Document, DocumentChunk, KnowledgeBase, Organization, User
from app.services.community import consolidate_workspace_documents, get_kb_for_access, get_kb_for_write
from app.services.storage import upload_file

router = APIRouter(prefix="/api/kb/{kb_id}/documents", tags=["documents"])
status_router = APIRouter(prefix="/api/documents", tags=["documents"])
settings = get_settings()


async def _run_ingestion_inline(document_id: uuid.UUID) -> None:
    """Run the ingestion pipeline in-process with its own DB session.

    Used when Celery is disabled (e.g. free hosting tiers without a worker).
    """
    from app.services.ingestion import run_ingestion

    async with AsyncSessionLocal() as db:
        await run_ingestion(document_id, db)


def _dispatch_ingestion(document_id: uuid.UUID, background_tasks: BackgroundTasks) -> None:
    """Queue ingestion via Celery, or run it inline as a FastAPI background task."""
    if settings.use_celery:
        from app.tasks.ingest_task import ingest_document_task

        ingest_document_task.delay(str(document_id))
    else:
        background_tasks.add_task(_run_ingestion_inline, document_id)


# ── Schemas ───────────────────────────────────────────────────────────────────
class DocumentResponse(BaseModel):
    id: uuid.UUID
    filename: str
    file_type: str
    status: str
    progress: int = 0
    chunk_count: int | None
    error_message: str | None

    model_config = {"from_attributes": True}


class UrlIngestRequest(BaseModel):
    url: HttpUrl


class ChunkContextItem(BaseModel):
    chunk_index: int
    content: str


class ChunkContextResponse(BaseModel):
    document_id: uuid.UUID
    filename: str
    target_index: int
    chunks: list[ChunkContextItem]


# ── Helpers ───────────────────────────────────────────────────────────────────
async def _get_kb_for_org(
    kb_id: uuid.UUID,
    org: Organization,
    db: AsyncSession,
    *,
    write: bool = False,
) -> KnowledgeBase:
    if write:
        return await get_kb_for_write(db, kb_id, org)
    return await get_kb_for_access(db, kb_id, org)


def _validate_public_url(raw_url: str) -> str:
    """Reject anything that isn't a public http(s) URL, to block SSRF against
    internal/metadata addresses. Returns the normalized URL string."""
    parsed = urlparse(raw_url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")
    host = parsed.hostname
    if not host:
        raise HTTPException(status_code=400, detail="URL is missing a host")

    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Could not resolve URL host")

    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise HTTPException(status_code=400, detail="URL resolves to a non-public address")

    return raw_url


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    kb_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_kb_for_org(kb_id, org, db, write=True)

    # Validate size & type server-side
    content_type = file.content_type or ""
    if content_type not in settings.allowed_mime_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")

    file_bytes = await file.read()
    if len(file_bytes) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File exceeds 50 MB limit")

    suffix = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "bin"
    file_url = await upload_file(file_bytes, file.filename or "upload", content_type)

    doc = Document(
        kb_id=kb_id,
        filename=file.filename or "upload",
        file_type=suffix,
        file_url=file_url,
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Queue async ingestion (Celery worker or in-process background task)
    _dispatch_ingestion(doc.id, background_tasks)

    return doc


@router.post("/url", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def ingest_url(
    kb_id: uuid.UUID,
    body: UrlIngestRequest,
    background_tasks: BackgroundTasks,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    """Ingest a public web page into the knowledge base. The page URL is stored
    as the document's source; the ingestion pipeline fetches and extracts it."""
    _, org = auth
    await _get_kb_for_org(kb_id, org, db, write=True)

    url = _validate_public_url(str(body.url))
    parsed = urlparse(url)
    # A readable, deduplicating filename: host + path (trimmed).
    label = (parsed.hostname or url) + parsed.path.rstrip("/")
    filename = label[:200] or url

    doc = Document(
        kb_id=kb_id,
        filename=filename,
        file_type="url",
        file_url=url,
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    _dispatch_ingestion(doc.id, background_tasks)
    return doc


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    kb_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    kb = await _get_kb_for_org(kb_id, org, db)
    if kb.is_personal:
        await consolidate_workspace_documents(db, org, kb)
        # Personal workspace shows every private upload for the org.
        result = await db.execute(
            select(Document)
            .join(KnowledgeBase, KnowledgeBase.id == Document.kb_id)
            .where(
                KnowledgeBase.org_id == org.id,
                KnowledgeBase.is_community.is_(False),
            )
            .order_by(Document.created_at.desc())
        )
    else:
        result = await db.execute(
            select(Document)
            .where(Document.kb_id == kb_id)
            .order_by(Document.created_at.desc())
        )
    return result.scalars().all()


@router.get("/{doc_id}/context", response_model=ChunkContextResponse)
async def get_chunk_context(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    chunk_index: int,
    window: int = 1,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    """Return a cited chunk plus its neighbours, so a citation can be read in
    its surrounding document context."""
    _, org = auth
    await _get_kb_for_org(kb_id, org, db)

    window = max(0, min(window, 3))
    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.kb_id == kb_id)
    )
    doc = doc_result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    rows = await db.execute(
        select(DocumentChunk.chunk_index, DocumentChunk.content)
        .where(
            DocumentChunk.document_id == doc_id,
            DocumentChunk.chunk_index >= chunk_index - window,
            DocumentChunk.chunk_index <= chunk_index + window,
        )
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = [
        ChunkContextItem(chunk_index=r.chunk_index, content=r.content) for r in rows
    ]
    if not chunks:
        raise HTTPException(status_code=404, detail="Chunk not found")

    return ChunkContextResponse(
        document_id=doc_id,
        filename=doc.filename,
        target_index=chunk_index,
        chunks=chunks,
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_kb_for_org(kb_id, org, db, write=True)
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.kb_id == kb_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)
    await db.commit()


@status_router.get("/{doc_id}/status", response_model=DocumentResponse)
async def get_document_status(
    doc_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    # Scope by org: join through the owning KB so a caller can only read the
    # status of documents that belong to their organization.
    result = await db.execute(
        select(Document)
        .join(KnowledgeBase, KnowledgeBase.id == Document.kb_id)
        .where(Document.id == doc_id, KnowledgeBase.org_id == org.id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("/{doc_id}/reingest", response_model=DocumentResponse)
async def reingest_document(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    """Delete existing chunks and re-run the ingestion pipeline with current settings."""
    _, org = auth
    await _get_kb_for_org(kb_id, org, db, write=True)

    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.kb_id == kb_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # Wipe existing chunks so they are re-created with the new chunk size
    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc_id))
    doc.status = "processing"
    doc.chunk_count = None
    await db.commit()
    await db.refresh(doc)

    _dispatch_ingestion(doc.id, background_tasks)
    return doc
