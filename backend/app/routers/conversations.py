from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_org
from app.database import get_db
from app.models import Conversation, KnowledgeBase, Message, Organization, User

router = APIRouter(prefix="/api", tags=["conversations"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    sources: list | None

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: str | None
    kb_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(ConversationResponse):
    messages: list[MessageResponse]


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("/kb/{kb_id}/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    kb_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, org = auth
    last_message_at = (
        select(
            Message.conversation_id,
            func.max(Message.created_at).label("last_message_at"),
        )
        .group_by(Message.conversation_id)
        .subquery()
    )
    result = await db.execute(
        select(Conversation)
        .outerjoin(last_message_at, last_message_at.c.conversation_id == Conversation.id)
        .where(Conversation.kb_id == kb_id, Conversation.user_id == user.id)
        .order_by(
            func.coalesce(last_message_at.c.last_message_at, Conversation.created_at).desc()
        )
    )
    return result.scalars().all()


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_recent_conversations(
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, org = auth
    last_message_at = (
        select(
            Message.conversation_id,
            func.max(Message.created_at).label("last_message_at"),
        )
        .group_by(Message.conversation_id)
        .subquery()
    )
    result = await db.execute(
        select(Conversation)
        .join(KnowledgeBase, KnowledgeBase.id == Conversation.kb_id)
        .outerjoin(last_message_at, last_message_at.c.conversation_id == Conversation.id)
        .where(Conversation.user_id == user.id, KnowledgeBase.org_id == org.id)
        .order_by(
            func.coalesce(last_message_at.c.last_message_at, Conversation.created_at).desc()
        )
    )
    return result.scalars().all()


@router.get("/conversations/{conv_id}", response_model=ConversationDetail)
async def get_conversation(
    conv_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id, Conversation.user_id == user.id
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()
    return {**conv.__dict__, "messages": messages}


@router.delete("/conversations/{conv_id}", status_code=204)
async def delete_conversation(
    conv_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id, Conversation.user_id == user.id
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()
