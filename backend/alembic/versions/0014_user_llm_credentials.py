"""add user_llm_credentials for BYOK tutor keys

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-27

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_llm_credentials",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False, server_default="laozhang"),
        sa.Column("encrypted_api_key", sa.Text(), nullable=False),
        sa.Column("key_hint", sa.String(length=8), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        "ix_user_llm_credentials_user_id",
        "user_llm_credentials",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_user_llm_credentials_user_id", table_name="user_llm_credentials")
    op.drop_table("user_llm_credentials")
