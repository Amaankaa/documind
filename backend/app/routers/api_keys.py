from __future__ import annotations

import secrets
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import API_KEY_PREFIX, get_current_user_org, hash_api_key
from app.database import get_db
from app.models import ApiKey, Organization, User

router = APIRouter(prefix="/api/api-keys", tags=["api-keys"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    prefix: str
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreated(ApiKeyResponse):
    # The full secret — returned exactly once, at creation time.
    key: str


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.org_id == org.id, ApiKey.revoked_at.is_(None))
        .order_by(ApiKey.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: ApiKeyCreate,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth

    raw_secret = secrets.token_urlsafe(32)
    full_key = f"{API_KEY_PREFIX}{raw_secret}"

    key = ApiKey(
        org_id=org.id,
        name=body.name,
        prefix=full_key[:11],
        key_hash=hash_api_key(full_key),
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)

    return ApiKeyCreated(
        id=key.id,
        name=key.name,
        prefix=key.prefix,
        last_used_at=key.last_used_at,
        created_at=key.created_at,
        key=full_key,
    )


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.org_id == org.id)
    )
    key = result.scalar_one_or_none()
    if key is None or key.revoked_at is not None:
        raise HTTPException(status_code=404, detail="API key not found")

    key.revoked_at = func.now()
    await db.commit()
