"""make user email nullable and normalize empty emails to NULL

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-17

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("users", "email", existing_type=sa.String(), nullable=True)
    # Empty-string emails collide under the unique constraint; NULLs do not.
    op.execute("UPDATE users SET email = NULL WHERE email = ''")


def downgrade() -> None:
    op.execute("UPDATE users SET email = '' WHERE email IS NULL")
    op.alter_column("users", "email", existing_type=sa.String(), nullable=False)
