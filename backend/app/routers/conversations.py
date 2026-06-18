from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_org
from app.database import get_db
from app.models import Conversation, Feedback, KnowledgeBase, Message, Organization, User
from app.services.community import get_kb_for_access

router = APIRouter(prefix="/api", tags=["conversations"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    sources: list | None
    feedback: str | None = None  # the caller's rating: "positive" | "negative" | None

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
    await get_kb_for_access(db, kb_id, org)
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
        .where(
            Conversation.kb_id == kb_id,
            Conversation.user_id == user.id,
        )
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
        .where(
            Conversation.user_id == user.id,
            or_(
                KnowledgeBase.is_community.is_(True),
                KnowledgeBase.org_id == org.id,
            ),
        )
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
    user, org = auth
    result = await db.execute(
        select(Conversation)
        .join(KnowledgeBase, KnowledgeBase.id == Conversation.kb_id)
        .where(
            Conversation.id == conv_id,
            Conversation.user_id == user.id,
            or_(
                KnowledgeBase.is_community.is_(True),
                KnowledgeBase.org_id == org.id,
            ),
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

    # Attach the caller's own feedback (👍/👎) so the UI can restore button state.
    fb_result = await db.execute(
        select(Feedback.message_id, Feedback.rating).where(
            Feedback.user_id == user.id,
            Feedback.message_id.in_([m.id for m in messages]),
        )
    )
    feedback_map = {row.message_id: row.rating for row in fb_result}

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        kb_id=conv.kb_id,
        created_at=conv.created_at,
        messages=[
            MessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                sources=m.sources,
                feedback=feedback_map.get(m.id),
            )
            for m in messages
        ],
    )


@router.delete("/conversations", status_code=204)
async def clear_conversation_history(
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    """Delete the caller's entire chat history within their organization.

    Scoped to (user, org): only the signed-in user's own conversations in
    their org are removed — never another tenant's. Messages and feedback are
    deleted explicitly (rather than relying on DB cascade) so the behaviour is
    identical on PostgreSQL and the SQLite test harness, where FK cascades are
    not enforced by default.
    """
    user, org = auth

    conv_ids_subq = (
        select(Conversation.id)
        .join(KnowledgeBase, KnowledgeBase.id == Conversation.kb_id)
        .where(
            Conversation.user_id == user.id,
            or_(
                KnowledgeBase.is_community.is_(True),
                KnowledgeBase.org_id == org.id,
            ),
        )
        .scalar_subquery()
    )
    msg_ids_subq = (
        select(Message.id)
        .where(Message.conversation_id.in_(conv_ids_subq))
        .scalar_subquery()
    )

    await db.execute(delete(Feedback).where(Feedback.message_id.in_(msg_ids_subq)))
    await db.execute(delete(Message).where(Message.conversation_id.in_(conv_ids_subq)))
    await db.execute(delete(Conversation).where(Conversation.id.in_(conv_ids_subq)))
    await db.commit()


@router.delete("/conversations/{conv_id}", status_code=204)
async def delete_conversation(
    conv_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, org = auth
    result = await db.execute(
        select(Conversation)
        .join(KnowledgeBase, KnowledgeBase.id == Conversation.kb_id)
        .where(
            Conversation.id == conv_id,
            Conversation.user_id == user.id,
            or_(
                KnowledgeBase.is_community.is_(True),
                KnowledgeBase.org_id == org.id,
            ),
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()
