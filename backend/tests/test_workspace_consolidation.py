"""Tests for consolidating legacy workspace KBs into the personal workspace."""
from __future__ import annotations

import pytest

from sqlalchemy import select

from app.models import Document, KnowledgeBase
from app.services.community import consolidate_workspace_documents, ensure_personal_kb

pytestmark = pytest.mark.asyncio


async def test_consolidate_legacy_documents_into_personal_kb(
    db, make_user, make_org, make_kb, make_document
):
    user = await make_user()
    org = await make_org(owner=user)

    legacy_kb = await make_kb(org=org, name="Old workspace")
    personal_kb = KnowledgeBase(
        org_id=org.id,
        name="My notes",
        description="Personal",
        is_personal=True,
    )
    db.add(personal_kb)
    await db.commit()
    await db.refresh(personal_kb)

    legacy_doc = await make_document(kb=legacy_kb, filename="lecture-notes.pdf")
    personal_doc = await make_document(kb=personal_kb, filename="cheatsheet.txt")

    moved = await consolidate_workspace_documents(db, org, personal_kb)
    assert moved == 1

    legacy_row = await db.get(KnowledgeBase, legacy_kb.id)
    assert legacy_row is None

    legacy_doc_row = await db.get(Document, legacy_doc.id)
    assert legacy_doc_row is not None
    assert legacy_doc_row.kb_id == personal_kb.id

    personal_doc_row = await db.get(Document, personal_doc.id)
    assert personal_doc_row.kb_id == personal_kb.id


async def test_ensure_personal_kb_consolidates_on_access(db, make_user, make_org, make_kb, make_document):
    user = await make_user()
    org = await make_org(owner=user)
    legacy_kb = await make_kb(org=org, name="Pre-migration workspace")
    await make_document(kb=legacy_kb, filename="hidden.pdf")

    personal_kb = await ensure_personal_kb(db, user, org)

    result = await db.execute(
        select(Document).where(Document.kb_id == personal_kb.id)
    )
    rows = result.scalars().all()
    assert len(rows) == 1
    assert rows[0].filename == "hidden.pdf"
