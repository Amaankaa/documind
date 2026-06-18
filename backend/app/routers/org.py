from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_current_user_org
from app.database import get_db
from app.models import Organization, User

router = APIRouter(prefix="/api/org", tags=["org"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class OrgCreate(BaseModel):
    name: str
    slug: str = Field(..., pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=63)


class OrgResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}


class UsageResponse(BaseModel):
    total_documents: int
    total_chunks: int
    total_messages: int


class DayCount(BaseModel):
    date: str
    count: int


class DocCount(BaseModel):
    filename: str
    count: int


class StatusCount(BaseModel):
    status: str
    count: int


class FeedbackBreakdown(BaseModel):
    positive: int
    negative: int


class AnalyticsResponse(BaseModel):
    queries_over_time: list[DayCount]
    top_documents: list[DocCount]
    documents_by_status: list[StatusCount]
    feedback: FeedbackBreakdown


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("", response_model=OrgResponse)
async def get_org(
    auth: tuple[User, Organization] = Depends(get_current_user_org),
):
    """Return the current user's organization."""
    _, org = auth
    return org


@router.post("", response_model=OrgResponse, status_code=201)
async def create_org(
    body: OrgCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create organization during onboarding (called once per user)."""
    existing = await db.execute(select(Organization).where(Organization.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug already taken")

    org = Organization(name=body.name, slug=body.slug, owner_id=current_user.id)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    row = await db.execute(
        text(
            """
            SELECT
                COUNT(DISTINCT d.id)::int AS total_documents,
                COALESCE(SUM(d.chunk_count), 0)::int AS total_chunks,
                (
                    SELECT COUNT(*)::int FROM messages m
                    JOIN conversations c ON c.id = m.conversation_id
                    JOIN knowledge_bases kb ON kb.id = c.kb_id
                    WHERE kb.org_id = :org_id AND m.role = 'assistant'
                ) AS total_messages
            FROM documents d
            JOIN knowledge_bases kb ON kb.id = d.kb_id
            WHERE kb.org_id = :org_id
              AND kb.is_community = false
            """
        ),
        {"org_id": str(org.id)},
    )
    r = row.fetchone()
    return UsageResponse(
        total_documents=r.total_documents or 0,
        total_chunks=r.total_chunks or 0,
        total_messages=r.total_messages or 0,
    )


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate analytics for the org: query volume, top-cited documents,
    document pipeline status, and answer feedback."""
    _, org = auth
    org_id = {"org_id": str(org.id)}

    # Assistant messages per day for the last 14 days (zero-filled series).
    queries_rows = await db.execute(
        text(
            """
            SELECT to_char(d.day, 'YYYY-MM-DD') AS date, COALESCE(q.cnt, 0)::int AS count
            FROM generate_series(
                (current_date - interval '13 days'), current_date, interval '1 day'
            ) AS d(day)
            LEFT JOIN (
                SELECT date_trunc('day', m.created_at)::date AS day, COUNT(*) AS cnt
                FROM messages m
                JOIN conversations c ON c.id = m.conversation_id
                JOIN knowledge_bases kb ON kb.id = c.kb_id
                WHERE kb.org_id = :org_id AND m.role = 'assistant'
                GROUP BY 1
            ) q ON q.day = d.day::date
            ORDER BY d.day
            """
        ),
        org_id,
    )

    # Most-cited documents, counted from the sources JSON on assistant messages.
    top_rows = await db.execute(
        text(
            """
            SELECT elem->>'filename' AS filename, COUNT(*)::int AS count
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            JOIN knowledge_bases kb ON kb.id = c.kb_id
            CROSS JOIN LATERAL json_array_elements(m.sources) AS elem
            WHERE kb.org_id = :org_id
              AND m.role = 'assistant'
              AND m.sources IS NOT NULL
              AND json_typeof(m.sources) = 'array'
            GROUP BY filename
            ORDER BY count DESC
            LIMIT 6
            """
        ),
        org_id,
    )

    status_rows = await db.execute(
        text(
            """
            SELECT d.status, COUNT(*)::int AS count
            FROM documents d
            JOIN knowledge_bases kb ON kb.id = d.kb_id
            WHERE kb.org_id = :org_id
            GROUP BY d.status
            """
        ),
        org_id,
    )

    fb_row = await db.execute(
        text(
            """
            SELECT
                COUNT(*) FILTER (WHERE f.rating = 'positive')::int AS positive,
                COUNT(*) FILTER (WHERE f.rating = 'negative')::int AS negative
            FROM feedback f
            JOIN messages m ON m.id = f.message_id
            JOIN conversations c ON c.id = m.conversation_id
            JOIN knowledge_bases kb ON kb.id = c.kb_id
            WHERE kb.org_id = :org_id
            """
        ),
        org_id,
    )
    fb = fb_row.fetchone()

    return AnalyticsResponse(
        queries_over_time=[DayCount(date=r.date, count=r.count) for r in queries_rows],
        top_documents=[DocCount(filename=r.filename, count=r.count) for r in top_rows],
        documents_by_status=[
            StatusCount(status=r.status, count=r.count) for r in status_rows
        ],
        feedback=FeedbackBreakdown(
            positive=(fb.positive if fb else 0) or 0,
            negative=(fb.negative if fb else 0) or 0,
        ),
    )
