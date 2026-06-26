from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_user_org_flexible
from app.config import get_settings
from app.database import get_db
from app.limiter import limiter
from app.models import Concept, Conversation, Message, Organization, User
from app.services.community import get_kb_for_access, get_personal_kb_optional
from app.services.learning_path import seed_interview_concepts
from app.services.llm import stream_rag_response
from app.services.retrieval import retrieve_top_chunks_for_kbs
from app.services.user_llm_credentials import count_user_questions_today, get_user_api_key

router = APIRouter(prefix="/api/kb", tags=["query"])

settings = get_settings()

# Number of previous messages to include as conversation context
HISTORY_WINDOW = 10


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    session_id: str | None = None  # conversation id (UUID str) — None = new conversation
    concept_slug: str | None = None  # study-map pattern scope for Socratic tutor


async def _enforce_daily_query_budget(
    user: User, db: AsyncSession, *, user_api_key: str | None
) -> None:
    """Cap tutor usage when billing against the server LLM key."""
    if user_api_key:
        return

    limit = settings.query_daily_limit_per_user
    if limit <= 0:
        return

    used = await count_user_questions_today(db, user.id)
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Free tutor limit reached ({limit} questions/day). "
                "Add your own LLM API key in Settings → Tutor API Key for unlimited questions."
            ),
        )


@router.post("/{kb_id}/query")
@limiter.limit(settings.query_rate_limit)
async def query_kb(
    kb_id: uuid.UUID,
    body: QueryRequest,
    request: Request,
    auth: tuple[User, Organization] = Depends(get_user_org_flexible),
    db: AsyncSession = Depends(get_db),
):
    user, org = auth
    user_api_key = await get_user_api_key(db, user.id)
    await _enforce_daily_query_budget(user, db, user_api_key=user_api_key)

    kb = await get_kb_for_access(db, kb_id, org)

    concept_title: str | None = None
    concept_id: uuid.UUID | None = None
    if body.concept_slug:
        await seed_interview_concepts(db)
        concept_row = await db.execute(
            select(Concept).where(Concept.slug == body.concept_slug.strip())
        )
        concept = concept_row.scalar_one_or_none()
        if concept:
            concept_title = concept.title
            concept_id = concept.id

    # Resolve or create conversation
    conversation: Conversation | None = None
    if body.session_id:
        try:
            session_uuid = uuid.UUID(body.session_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="session_id must be a valid UUID")
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.id == session_uuid,
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

    # Retrieve top-k chunks — community tutor also searches personal notes
    kb_ids = [kb_id]
    if kb.is_community:
        personal = await get_personal_kb_optional(db, user, org)
        if personal:
            kb_ids.append(personal.id)

    chunks = await retrieve_top_chunks_for_kbs(
        body.question,
        kb_ids,
        db,
        concept_id=concept_id,
    )

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
            tutor_mode=concept_title is not None,
            concept_title=concept_title,
            user_api_key=user_api_key,
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

        done_payload = {
            "done": True,
            "conversation_id": str(conversation.id),
            "message_id": str(assistant_msg.id),
            "sources": sources,
        }
        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(_event_stream(), media_type="text/event-stream")
