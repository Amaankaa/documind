from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_current_user_org
from app.database import get_db
from app.models import KnowledgeBase, Organization, User
from app.routers.study_map import (
    ConceptMapResponse,
    ConceptOut,
    ProgressUpdate,
    _build_map_response,
    update_concept_progress as update_study_progress,
)

router = APIRouter(prefix="/api/kb", tags=["concepts"])


async def _verify_kb(
    kb_id: uuid.UUID,
    org: Organization,
    db: AsyncSession,
) -> KnowledgeBase:
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == kb_id, KnowledgeBase.org_id == org.id)
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


@router.get("/{kb_id}/concepts", response_model=ConceptMapResponse)
async def get_concept_map_legacy(
    kb_id: uuid.UUID,
    include_bonus: bool = Query(False),
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    """Legacy alias — study map is global; kb_id is ignored except for access check."""
    user, org = auth
    await _verify_kb(kb_id, org, db)
    return await _build_map_response(db, user, include_bonus=include_bonus)


@router.get("/{kb_id}/concepts/next", response_model=ConceptOut)
async def get_next_concept_legacy(
    kb_id: uuid.UUID,
    include_bonus: bool = Query(False),
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, org = auth
    await _verify_kb(kb_id, org, db)
    data = await _build_map_response(db, user, include_bonus=include_bonus)
    if data.next_concept is None:
        raise HTTPException(status_code=404, detail="No available concepts — great work!")
    return data.next_concept


@router.patch("/{kb_id}/concepts/{concept_id}/progress", response_model=ConceptOut)
async def update_concept_progress_legacy(
    kb_id: uuid.UUID,
    concept_id: uuid.UUID,
    body: ProgressUpdate,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, org = auth
    await _verify_kb(kb_id, org, db)
    return await update_study_progress(concept_id, body, user, db)
