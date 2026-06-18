"""add evaluation harness tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-18

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "eval_sets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "kb_id",
            UUID(as_uuid=True),
            sa.ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "eval_cases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "eval_set_id",
            UUID(as_uuid=True),
            sa.ForeignKey("eval_sets.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("relevant_doc_ids", sa.JSON(), nullable=True),
        sa.Column("source_chunk_id", UUID(as_uuid=True), nullable=True),
        sa.Column("origin", sa.String(), nullable=False, server_default="manual"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "eval_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "eval_set_id",
            UUID(as_uuid=True),
            sa.ForeignKey("eval_sets.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("top_k", sa.Integer(), nullable=False),
        sa.Column("num_cases", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("hit_rate", sa.Float(), nullable=True),
        sa.Column("mrr", sa.Float(), nullable=True),
        sa.Column("avg_precision", sa.Float(), nullable=True),
        sa.Column("avg_groundedness", sa.Float(), nullable=True),
        sa.Column("avg_relevance", sa.Float(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "eval_results",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("eval_runs.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "case_id",
            UUID(as_uuid=True),
            sa.ForeignKey("eval_cases.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("generated_answer", sa.Text(), nullable=True),
        sa.Column("retrieved_doc_ids", sa.JSON(), nullable=True),
        sa.Column("retrieved_chunk_ids", sa.JSON(), nullable=True),
        sa.Column("retrieval_hit", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("reciprocal_rank", sa.Float(), nullable=False, server_default="0"),
        sa.Column("precision_at_k", sa.Float(), nullable=False, server_default="0"),
        sa.Column("groundedness", sa.Float(), nullable=True),
        sa.Column("relevance", sa.Float(), nullable=True),
        sa.Column("judge_rationale", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("eval_results")
    op.drop_table("eval_runs")
    op.drop_table("eval_cases")
    op.drop_table("eval_sets")
