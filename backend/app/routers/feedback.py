from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_org
from app.database import get_db
from app.models import Conversation, Feedback, KnowledgeBase, Message, Organization, User

router = APIRouter(prefix="/api/kb", tags=["feedback"])


class FeedbackCreate(BaseModel):
    message_id: uuid.UUID
    rating: str = Field(..., pattern=r"^(positive|negative)$")


@router.post("/{kb_id}/feedback", status_code=201)
async def create_feedback(
    kb_id: uuid.UUID,
    body: FeedbackCreate,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, org = auth

    kb_result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id, KnowledgeBase.org_id == org.id
        )
    )
    if kb_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    msg_result = await db.execute(
        select(Message)
        .join(Conversation, Conversation.id == Message.conversation_id)
        .where(
            Message.id == body.message_id,
            Message.role == "assistant",
            Conversation.kb_id == kb_id,
        )
    )
    if msg_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Message not found")

    existing = await db.execute(
        select(Feedback).where(
            Feedback.message_id == body.message_id, Feedback.user_id == user.id
        )
    )
    feedback = existing.scalar_one_or_none()
    if feedback is not None:
        # Let the user change their mind (👍 → 👎 or vice versa) instead of
        # rejecting the second vote.
        feedback.rating = body.rating
    else:
        feedback = Feedback(
            message_id=body.message_id, user_id=user.id, rating=body.rating
        )
        db.add(feedback)
    await db.commit()
    return {"status": "ok"}


@router.delete("/{kb_id}/feedback/{message_id}", status_code=204)
async def delete_feedback(
    kb_id: uuid.UUID,
    message_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    """Clear the caller's feedback on a message (used when un-toggling a vote)."""
    user, _ = auth
    result = await db.execute(
        select(Feedback).where(
            Feedback.message_id == message_id, Feedback.user_id == user.id
        )
    )
    feedback = result.scalar_one_or_none()
    if feedback is not None:
        await db.delete(feedback)
        await db.commit()
