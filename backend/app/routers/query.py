from __future__ import annotations

import json
import uuid
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_org
from app.database import get_db
from app.models import Conversation, KnowledgeBase, Message, Organization, User
from app.services.llm import stream_rag_response
from app.services.retrieval import retrieve_top_chunks

router = APIRouter(prefix="/api/kb", tags=["query"])

# Number of previous messages to include as conversation context
HISTORY_WINDOW = 10


class QueryRequest(BaseModel):
    question: str
    session_id: str | None = None  # conversation id (UUID str) — None = new conversation


@router.post("/{kb_id}/query")
async def query_kb(
    kb_id: uuid.UUID,
    body: QueryRequest,
    request: Request,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, org = auth

    # Verify KB belongs to org
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id, KnowledgeBase.org_id == org.id
        )
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    # Resolve or create conversation
    conversation: Conversation | None = None
    if body.session_id:
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.id == uuid.UUID(body.session_id),
                Conversation.kb_id == kb_id,
                Conversation.user_id == user.id,
            )
        )
        conversation = conv_result.scalar_one_or_none()

    if conversation is None:
        conversation = Conversation(kb_id=kb_id, user_id=user.id, title=body.question[:80])
        db.add(conversation)
        await db.flush()  # get id without committing

    # Fetch recent conversation history BEFORE adding the current message
    hist_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(HISTORY_WINDOW)
    )
    history: list[tuple[str, str]] = [
        (m.role, m.content) for m in reversed(hist_result.scalars().all())
    ]

    # Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=body.question,
    )
    db.add(user_msg)
    await db.commit()

    # Retrieve top-k chunks (may be empty for conversational / off-topic queries)
    chunks = await retrieve_top_chunks(body.question, kb_id, db)

    sources = [
        {
            "doc_id": str(c.document_id),
            "filename": c.filename,
            "chunk_index": c.chunk_index,
            "excerpt": c.content[:200],
        }
        for c in chunks
    ]

    # Always route through the LLM — it handles both grounded answers and
    # graceful redirections when no document context is available.
    async def _event_stream() -> AsyncIterator[str]:
        full_response: list[str] = []
        async for token in stream_rag_response(
            body.question,
            chunks,
            org_name=org.name,
            history=history,
        ):
            full_response.append(token)
            yield f"data: {json.dumps({'token': token})}\n\n"

        assistant_content = "".join(full_response)
        assistant_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=assistant_content,
            sources=sources or None,
        )
        db.add(assistant_msg)
        await db.commit()

        yield f"data: {json.dumps({'done': True, 'conversation_id': str(conversation.id), 'sources': sources})}\n\n"

    return StreamingResponse(_event_stream(), media_type="text/event-stream")
