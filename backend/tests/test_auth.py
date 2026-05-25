"""Tests for the auth module (Clerk JWT verification and user resolution)."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, User


@pytest.mark.asyncio
class TestGetCurrentUser:
    """Tests for the get_current_user dependency."""

    async def test_existing_user_resolved(self, db: AsyncSession, make_user):
        """If a user with the clerk_id exists, return them."""
        user = await make_user(clerk_id="clerk_existing", email="existing@test.com")

        payload = {"sub": "clerk_existing", "email": "existing@test.com"}

        with patch("app.auth.verify_clerk_token", new=AsyncMock(return_value=payload)):
            from app.auth import get_current_user
            from unittest.mock import MagicMock

            # Simulate the FastAPI dependency call
            mock_creds = MagicMock()
            mock_creds.credentials = "fake-token"

            resolved_user = await get_current_user(mock_creds, db)

        assert resolved_user.clerk_id == "clerk_existing"
        assert resolved_user.id == user.id

    async def test_new_user_auto_provisioned(self, db: AsyncSession):
        """First-time users should be auto-created from the JWT payload."""
        payload = {
            "sub": "clerk_new_user",
            "email": "newuser@test.com",
        }

        with patch("app.auth.verify_clerk_token", new=AsyncMock(return_value=payload)):
            from app.auth import get_current_user
            from unittest.mock import MagicMock

            mock_creds = MagicMock()
            mock_creds.credentials = "fake-token"

            resolved_user = await get_current_user(mock_creds, db)

        assert resolved_user.clerk_id == "clerk_new_user"
        assert resolved_user.email == "newuser@test.com"

        # Should be persisted
        result = await db.execute(select(User).where(User.clerk_id == "clerk_new_user"))
        assert result.scalar_one_or_none() is not None

    async def test_missing_subject_raises_401(self, db: AsyncSession):
        """A token without a 'sub' claim should raise 401."""
        payload = {"email": "no-sub@test.com"}

        with patch("app.auth.verify_clerk_token", new=AsyncMock(return_value=payload)):
            from app.auth import get_current_user
            from fastapi import HTTPException
            from unittest.mock import MagicMock

            mock_creds = MagicMock()
            mock_creds.credentials = "fake-token"

            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(mock_creds, db)

            assert exc_info.value.status_code == 401


@pytest.mark.asyncio
class TestGetCurrentUserOrg:
    """Tests for the get_current_user_org dependency."""

    async def test_user_with_org_returns_tuple(self, db: AsyncSession, make_user, make_org):
        """User who completed onboarding should get (user, org) tuple."""
        user = await make_user()
        org = await make_org(user, name="My Org", slug="my-org")

        from app.auth import get_current_user_org

        result = await get_current_user_org(user, db)
        assert result[0].id == user.id
        assert result[1].id == org.id
        assert result[1].slug == "my-org"

    async def test_user_without_org_raises_403(self, db: AsyncSession, make_user):
        """User without an org should get 403."""
        user = await make_user()

        from app.auth import get_current_user_org
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_org(user, db)

        assert exc_info.value.status_code == 403
        assert "onboarding" in exc_info.value.detail.lower()
