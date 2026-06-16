"""
Global community workspace — shared corpus + auto-provisioned user orgs.

Students do not need to create a workspace manually. The official notes corpus
lives in a single community knowledge base; personal uploads stay in one
auto-provisioned personal KB per user.
"""
from __future__ import annotations

import re
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Document, DocumentChunk, KnowledgeBase, Organization, User

SYSTEM_CLERK_ID = "__algomentor_system__"
COMMUNITY_ORG_SLUG = "algomentor-community"
COMMUNITY_KB_NAME = "Official community notes"
PERSONAL_KB_NAME = "My notes"


async def get_or_create_system_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.clerk_id == SYSTEM_CLERK_ID))
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(clerk_id=SYSTEM_CLERK_ID, email="system@algomentor.local")
    db.add(user)
    await db.flush()
    return user


async def ensure_community_kb(db: AsyncSession) -> KnowledgeBase:
    """Single shared KB for synced GitHub notes — used by all students."""
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.is_community.is_(True))
    )
    kb = result.scalar_one_or_none()
    if kb:
        return kb

    system_user = await get_or_create_system_user(db)
    org_result = await db.execute(
        select(Organization).where(Organization.slug == COMMUNITY_ORG_SLUG)
    )
    org = org_result.scalar_one_or_none()
    if org is None:
        org = Organization(
            name="AlgoMentor Community",
            slug=COMMUNITY_ORG_SLUG,
            owner_id=system_user.id,
        )
        db.add(org)
        await db.flush()

    kb = KnowledgeBase(
        org_id=org.id,
        name=COMMUNITY_KB_NAME,
        description="Synced from the open-source Algorithm Knowledge Base",
        is_community=True,
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return kb


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:48] or "prep"


async def ensure_user_org(db: AsyncSession, user: User) -> Organization:
    """Auto-provision an org on first use — no manual onboarding required."""
    result = await db.execute(
        select(Organization).where(Organization.owner_id == user.id)
    )
    org = result.scalar_one_or_none()
    if org:
        return org

    base = _slugify(user.email.split("@")[0] if user.email else user.clerk_id[-8:])
    slug = base
    for attempt in range(5):
        existing = await db.execute(select(Organization).where(Organization.slug == slug))
        if existing.scalar_one_or_none() is None:
            break
        slug = f"{base}-{attempt + 1}"

    org = Organization(
        name="My Interview Prep",
        slug=slug,
        owner_id=user.id,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


async def _find_personal_kb(db: AsyncSession, org_id: uuid.UUID) -> KnowledgeBase | None:
    """Return the canonical personal KB for an org (oldest if duplicates exist)."""
    result = await db.execute(
        select(KnowledgeBase)
        .where(
            KnowledgeBase.org_id == org_id,
            KnowledgeBase.is_personal.is_(True),
        )
        .order_by(KnowledgeBase.created_at.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def consolidate_workspace_documents(
    db: AsyncSession,
    org: Organization,
    personal_kb: KnowledgeBase,
) -> int:
    """Move uploads from pre-migration org KBs into the single personal workspace."""
    legacy_result = await db.execute(
        select(KnowledgeBase.id).where(
            KnowledgeBase.org_id == org.id,
            KnowledgeBase.is_community.is_(False),
            KnowledgeBase.is_personal.is_(False),
        )
    )
    legacy_ids = list(legacy_result.scalars().all())
    if not legacy_ids:
        return 0

    await db.execute(
        update(Document).where(Document.kb_id.in_(legacy_ids)).values(kb_id=personal_kb.id)
    )
    await db.execute(
        update(DocumentChunk)
        .where(DocumentChunk.kb_id.in_(legacy_ids))
        .values(kb_id=personal_kb.id)
    )

    for legacy_id in legacy_ids:
        legacy_kb = await db.get(KnowledgeBase, legacy_id)
        if legacy_kb is not None:
            await db.delete(legacy_kb)

    await db.commit()
    return len(legacy_ids)


async def ensure_personal_kb(db: AsyncSession, user: User, org: Organization) -> KnowledgeBase:
    """One personal KB per user for optional uploads (chunk-capped)."""
    kb = await _find_personal_kb(db, org.id)
    if not kb:
        kb = KnowledgeBase(
            org_id=org.id,
            name=PERSONAL_KB_NAME,
            description="Your private notes and uploads — merged with community notes in the tutor.",
            is_personal=True,
        )
        db.add(kb)
        try:
            await db.commit()
            await db.refresh(kb)
        except IntegrityError:
            await db.rollback()
            kb = await _find_personal_kb(db, org.id)
            if kb is None:
                raise

    await consolidate_workspace_documents(db, org, kb)
    return kb


async def get_chat_kb_id(db: AsyncSession) -> uuid.UUID:
    """Default retrieval target for the tutor — always the community corpus."""
    kb = await ensure_community_kb(db)
    return kb.id


async def get_kb_for_write(
    db: AsyncSession,
    kb_id: uuid.UUID,
    org: Organization,
) -> KnowledgeBase:
    """Writable KB — personal/org only; community corpus is read-only."""
    kb = await get_kb_for_access(db, kb_id, org)
    if kb.is_community:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Community notes are read-only. Upload to your personal workspace instead.",
        )
    if kb.is_personal and kb.org_id != org.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found")
    return kb


async def get_personal_kb_optional(
    db: AsyncSession,
    user: User,
    org: Organization,
) -> KnowledgeBase | None:
    kb = await _find_personal_kb(db, org.id)
    if kb:
        return kb
    try:
        return await ensure_personal_kb(db, user, org)
    except Exception:
        return None


async def get_kb_for_access(
    db: AsyncSession,
    kb_id: uuid.UUID,
    org: Organization,
) -> KnowledgeBase:
    """
    Resolve a KB the caller may use. Community KB is readable by every org;
    personal/org KBs must belong to the caller's org.
    """
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = result.scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found")
    if kb.is_community or kb.org_id == org.id:
        return kb
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found")


async def count_kb_chunks(db: AsyncSession, kb_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count(DocumentChunk.id)).where(DocumentChunk.kb_id == kb_id)
    )
    return int(result.scalar_one() or 0)


async def assert_chunk_capacity(
    db: AsyncSession,
    kb_id: uuid.UUID,
    *,
    additional_chunks: int,
) -> None:
    """Reject ingestion that would exceed the per-KB chunk cap (personal uploads)."""
    settings = get_settings()
    kb = await db.get(KnowledgeBase, kb_id)
    if kb is None or kb.is_community:
        return

    current = await count_kb_chunks(db, kb_id)
    cap = settings.max_chunks_per_kb
    if current + additional_chunks > cap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Personal knowledge base chunk limit reached ({cap} max). "
                f"You have {current} chunks; this upload would add {additional_chunks} more. "
                "Delete documents or remove older uploads to continue."
            ),
        )
