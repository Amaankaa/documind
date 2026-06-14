"""add contributor_wanted flag to concepts

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-26

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "concepts",
        sa.Column("contributor_wanted", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("concepts", "contributor_wanted")
