from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_current_user_org
from app.database import get_db
from app.models import KnowledgeBase, Organization, User

router = APIRouter(prefix="/api/kb", tags=["knowledge-bases"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class KBCreate(BaseModel):
    name: str
    description: str | None = None


class KBResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    org_id: uuid.UUID

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("", response_model=KBResponse, status_code=status.HTTP_201_CREATED)
async def create_kb(
    body: KBCreate,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    kb = KnowledgeBase(org_id=org.id, name=body.name, description=body.description)
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return kb


@router.get("", response_model=list[KBResponse])
async def list_kbs(
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.org_id == org.id))
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
    await db.delete(kb)
    await db.commit()
