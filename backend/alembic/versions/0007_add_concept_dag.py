"""add interview concept DAG tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-26

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "concepts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(), nullable=False, unique=True, index=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_bonus", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "concept_edges",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "prerequisite_id",
            UUID(as_uuid=True),
            sa.ForeignKey("concepts.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "concept_id",
            UUID(as_uuid=True),
            sa.ForeignKey("concepts.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.UniqueConstraint("prerequisite_id", "concept_id", name="uq_concept_edge"),
    )

    op.create_table(
        "concept_progress",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "kb_id",
            UUID(as_uuid=True),
            sa.ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "concept_id",
            UUID(as_uuid=True),
            sa.ForeignKey("concepts.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("status", sa.String(), nullable=False, server_default="available"),
        sa.Column("hints_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "kb_id", "concept_id", name="uq_concept_progress"),
    )

    op.add_column(
        "documents",
        sa.Column(
            "concept_id",
            UUID(as_uuid=True),
            sa.ForeignKey("concepts.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_documents_concept_id", "documents", ["concept_id"])


def downgrade() -> None:
    op.drop_index("ix_documents_concept_id", table_name="documents")
    op.drop_column("documents", "concept_id")
    op.drop_table("concept_progress")
    op.drop_table("concept_edges")
    op.drop_table("concepts")
