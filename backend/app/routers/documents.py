from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_org
from app.config import get_settings
from app.database import get_db
from app.models import Document, DocumentChunk, KnowledgeBase, Organization, User
from app.services.storage import upload_file
from app.tasks.ingest_task import ingest_document_task

router = APIRouter(prefix="/api/kb/{kb_id}/documents", tags=["documents"])
status_router = APIRouter(prefix="/api/documents", tags=["documents"])
settings = get_settings()


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


# ── Helpers ───────────────────────────────────────────────────────────────────
async def _get_kb_for_org(
    kb_id: uuid.UUID,
    org: Organization,
    db: AsyncSession,
) -> KnowledgeBase:
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id, KnowledgeBase.org_id == org.id
        )
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    kb_id: uuid.UUID,
    file: UploadFile = File(...),
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_kb_for_org(kb_id, org, db)

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

    # Queue async ingestion
    ingest_document_task.delay(str(doc.id))

    return doc


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    kb_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_kb_for_org(kb_id, org, db)
    result = await db.execute(select(Document).where(Document.kb_id == kb_id))
    return result.scalars().all()


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_kb_for_org(kb_id, org, db)
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
    doc = await db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("/{doc_id}/reingest", response_model=DocumentResponse)
async def reingest_document(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    """Delete existing chunks and re-run the ingestion pipeline with current settings."""
    _, org = auth
    await _get_kb_for_org(kb_id, org, db)

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

    ingest_document_task.delay(str(doc.id))
    return doc
