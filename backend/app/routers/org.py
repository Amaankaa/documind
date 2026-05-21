from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_current_user_org
from app.database import get_db
from app.models import Organization, User

router = APIRouter(prefix="/api/org", tags=["org"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class OrgCreate(BaseModel):
    name: str
    slug: str


class OrgResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}


class UsageResponse(BaseModel):
    total_documents: int
    total_chunks: int
    total_messages: int


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("", response_model=OrgResponse)
async def get_org(
    auth: tuple[User, Organization] = Depends(get_current_user_org),
):
    """Return the current user's organization."""
    _, org = auth
    return org


@router.post("", response_model=OrgResponse, status_code=201)
async def create_org(
    body: OrgCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create organization during onboarding (called once per user)."""
    existing = await db.execute(select(Organization).where(Organization.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug already taken")

    org = Organization(name=body.name, slug=body.slug, owner_id=current_user.id)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    row = await db.execute(
        text(
            """
            SELECT
                COUNT(DISTINCT d.id)::int AS total_documents,
                COALESCE(SUM(d.chunk_count), 0)::int AS total_chunks,
                (
                    SELECT COUNT(*)::int FROM messages m
                    JOIN conversations c ON c.id = m.conversation_id
                    JOIN knowledge_bases kb ON kb.id = c.kb_id
                    WHERE kb.org_id = :org_id AND m.role = 'assistant'
                ) AS total_messages
            FROM documents d
            JOIN knowledge_bases kb ON kb.id = d.kb_id
            WHERE kb.org_id = :org_id
            """
        ),
        {"org_id": str(org.id)},
    )
    r = row.fetchone()
    return UsageResponse(
        total_documents=r.total_documents or 0,
        total_chunks=r.total_chunks or 0,
        total_messages=r.total_messages or 0,
    )
