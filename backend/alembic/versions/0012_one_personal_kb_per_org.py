"""one personal KB per org — dedupe + unique index

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-26

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Keep the oldest personal KB per org; demote accidental duplicates.
    op.execute(
        sa.text(
            """
            WITH ranked AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY org_id ORDER BY created_at ASC
                       ) AS rn
                FROM knowledge_bases
                WHERE is_personal = true
            )
            UPDATE knowledge_bases
            SET is_personal = false
            WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
            """
        )
    )

    op.create_index(
        "uq_knowledge_bases_one_personal_per_org",
        "knowledge_bases",
        ["org_id"],
        unique=True,
        postgresql_where=sa.text("is_personal = true"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_knowledge_bases_one_personal_per_org",
        table_name="knowledge_bases",
    )
