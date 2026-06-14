"""practice problems + submission proof for mastery gate

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-26

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "practice_problems",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "concept_id",
            UUID(as_uuid=True),
            sa.ForeignKey("concepts.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("leetcode_slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("concept_id", "leetcode_slug", name="uq_practice_problem_slug"),
    )

    op.create_table(
        "problem_submissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "problem_id",
            UUID(as_uuid=True),
            sa.ForeignKey("practice_problems.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("proof_url", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "problem_id", name="uq_problem_submission"),
    )


def downgrade() -> None:
    op.drop_table("problem_submissions")
    op.drop_table("practice_problems")
