"""Encrypted per-user LLM API keys (BYOK for tutor chat)."""
from __future__ import annotations

import base64
import hashlib
import uuid
from datetime import UTC, datetime

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Conversation, Message, User, UserLlmCredential


def _fernet() -> Fernet:
    secret = get_settings().llm_credentials_secret.strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="BYOK is not configured on this server (missing LLM_CREDENTIALS_SECRET).",
        )
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def encrypt_api_key(raw_key: str) -> str:
    return _fernet().encrypt(raw_key.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    try:
        return _fernet().decrypt(encrypted.encode()).decode()
    except InvalidToken:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored credential could not be decrypted — re-save your API key.",
        )


def key_hint(raw_key: str) -> str:
    trimmed = raw_key.strip()
    if len(trimmed) <= 4:
        return "****"
    return f"…{trimmed[-4:]}"


async def get_credential_row(
    db: AsyncSession, user_id: uuid.UUID
) -> UserLlmCredential | None:
    result = await db.execute(
        select(UserLlmCredential).where(UserLlmCredential.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_user_api_key(db: AsyncSession, user_id: uuid.UUID) -> str | None:
    row = await get_credential_row(db, user_id)
    if row is None:
        return None
    return decrypt_api_key(row.encrypted_api_key)


EVAL_BYOK_MESSAGE = (
    "Evaluation requires your own LLM API key. Add one in Settings — "
    "case generation and harness runs use your key, not the shared tutor quota."
)


async def require_user_api_key(db: AsyncSession, user_id: uuid.UUID) -> str:
    """Return the user's decrypted API key or raise if eval/chat BYOK is missing."""
    key = await get_user_api_key(db, user_id)
    if not key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=EVAL_BYOK_MESSAGE,
        )
    return key


async def save_user_api_key(
    db: AsyncSession,
    user: User,
    *,
    api_key: str,
    provider: str | None = None,
) -> UserLlmCredential:
    raw = api_key.strip()
    if len(raw) < 8:
        raise HTTPException(status_code=422, detail="API key is too short.")

    settings = get_settings()
    resolved_provider = provider or settings.llm_provider

    row = await get_credential_row(db, user.id)
    if row is None:
        row = UserLlmCredential(
            user_id=user.id,
            provider=resolved_provider,
            encrypted_api_key=encrypt_api_key(raw),
            key_hint=key_hint(raw),
        )
        db.add(row)
    else:
        row.provider = resolved_provider
        row.encrypted_api_key = encrypt_api_key(raw)
        row.key_hint = key_hint(raw)
        row.updated_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(row)
    return row


async def delete_user_api_key(db: AsyncSession, user_id: uuid.UUID) -> bool:
    row = await get_credential_row(db, user_id)
    if row is None:
        return False
    await db.delete(row)
    await db.commit()
    return True


async def count_user_questions_today(db: AsyncSession, user_id: uuid.UUID) -> int:
    day_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        await db.execute(
            select(func.count())
            .select_from(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.user_id == user_id,
                Message.role == "user",
                Message.created_at >= day_start,
            )
        )
    ).scalar_one()
