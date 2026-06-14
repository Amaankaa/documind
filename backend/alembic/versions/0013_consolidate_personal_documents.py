"""consolidate legacy workspace uploads into personal KB

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-26

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Move documents + chunks from legacy org KBs into each org's canonical personal KB.
    op.execute(
        sa.text(
            """
            WITH personal AS (
                SELECT DISTINCT ON (org_id) org_id, id AS personal_kb_id
                FROM knowledge_bases
                WHERE is_personal = true
                ORDER BY org_id, created_at ASC
            ),
            legacy AS (
                SELECT kb.id AS legacy_kb_id, p.personal_kb_id
                FROM knowledge_bases kb
                JOIN personal p ON p.org_id = kb.org_id
                WHERE kb.is_community = false
                  AND kb.is_personal = false
            )
            UPDATE documents d
            SET kb_id = l.personal_kb_id
            FROM legacy l
            WHERE d.kb_id = l.legacy_kb_id
            """
        )
    )
    op.execute(
        sa.text(
            """
            WITH personal AS (
                SELECT DISTINCT ON (org_id) org_id, id AS personal_kb_id
                FROM knowledge_bases
                WHERE is_personal = true
                ORDER BY org_id, created_at ASC
            ),
            legacy AS (
                SELECT kb.id AS legacy_kb_id, p.personal_kb_id
                FROM knowledge_bases kb
                JOIN personal p ON p.org_id = kb.org_id
                WHERE kb.is_community = false
                  AND kb.is_personal = false
            )
            UPDATE document_chunks dc
            SET kb_id = l.personal_kb_id
            FROM legacy l
            WHERE dc.kb_id = l.legacy_kb_id
            """
        )
    )
    op.execute(
        sa.text(
            """
            DELETE FROM knowledge_bases kb
            WHERE kb.is_community = false
              AND kb.is_personal = false
              AND NOT EXISTS (
                  SELECT 1 FROM documents d WHERE d.kb_id = kb.id
              )
            """
        )
    )


def downgrade() -> None:
    pass
