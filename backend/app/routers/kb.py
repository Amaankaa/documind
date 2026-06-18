from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_current_user_org
from app.database import get_db
from app.models import KnowledgeBase, Organization, User
from app.services.community import ensure_personal_kb, ensure_user_org

router = APIRouter(prefix="/api/kb", tags=["knowledge-bases"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class KBCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None


class KBResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    org_id: uuid.UUID
    is_personal: bool = False
    is_community: bool = False

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("", response_model=KBResponse, status_code=status.HTTP_201_CREATED)
async def create_kb(
    body: KBCreate,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    """Manual workspace creation is disabled — use the auto-provisioned personal KB."""
    user, org = auth
    await ensure_personal_kb(db, user, org)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Extra workspaces are disabled. Use your personal workspace for private uploads.",
    )


@router.get("", response_model=list[KBResponse])
async def list_kbs(
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, org = auth
    await ensure_personal_kb(db, user, org)
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.org_id == org.id,
            KnowledgeBase.is_community.is_(False),
        )
    )
    return result.scalars().all()


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kb(
    kb_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == kb_id, KnowledgeBase.org_id == org.id)
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    if kb.is_personal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your personal workspace cannot be deleted.",
        )
    await db.delete(kb)
    await db.commit()
