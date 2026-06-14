"""global study map progress + community knowledge base flag

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-26

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "knowledge_bases",
        sa.Column("is_community", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.drop_constraint("uq_concept_progress", "concept_progress", type_="unique")
    op.drop_column("concept_progress", "kb_id")
    op.create_unique_constraint(
        "uq_concept_progress_user_concept",
        "concept_progress",
        ["user_id", "concept_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_concept_progress_user_concept", "concept_progress", type_="unique")
    op.add_column(
        "concept_progress",
        sa.Column("kb_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_concept_progress",
        "concept_progress",
        ["user_id", "kb_id", "concept_id"],
    )
    op.drop_column("knowledge_bases", "is_community")
