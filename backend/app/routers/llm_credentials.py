from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.models import User
from app.services.user_llm_credentials import (
    count_user_questions_today,
    delete_user_api_key,
    get_credential_row,
    save_user_api_key,
)

router = APIRouter(prefix="/api/me/llm-key", tags=["llm-credentials"])


class LlmKeyStatus(BaseModel):
    configured: bool
    provider: str | None = None
    key_hint: str | None = None
    updated_at: datetime | None = None
    questions_used_today: int
    questions_daily_limit: int | None
    using_own_key: bool


class LlmKeyUpsert(BaseModel):
    api_key: str = Field(..., min_length=8, max_length=512)


@router.get("", response_model=LlmKeyStatus)
async def get_llm_key_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    row = await get_credential_row(db, user.id)
    used = await count_user_questions_today(db, user.id)
    byok = row is not None
    limit = None if byok else (settings.query_daily_limit_per_user or None)
    if limit is not None and limit <= 0:
        limit = None

    return LlmKeyStatus(
        configured=byok,
        provider=row.provider if row else None,
        key_hint=row.key_hint if row else None,
        updated_at=row.updated_at if row else None,
        questions_used_today=used,
        questions_daily_limit=limit,
        using_own_key=byok,
    )


@router.put("", response_model=LlmKeyStatus)
async def upsert_llm_key(
    body: LlmKeyUpsert,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await save_user_api_key(db, user, api_key=body.api_key)
    used = await count_user_questions_today(db, user.id)
    return LlmKeyStatus(
        configured=True,
        provider=row.provider,
        key_hint=row.key_hint,
        updated_at=row.updated_at,
        questions_used_today=used,
        questions_daily_limit=None,
        using_own_key=True,
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def remove_llm_key(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    removed = await delete_user_api_key(db, user.id)
    if not removed:
        raise HTTPException(status_code=404, detail="No LLM key configured")
