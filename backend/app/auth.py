from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import Organization, User

logger = logging.getLogger(__name__)
settings = get_settings()

bearer_scheme = HTTPBearer()

# ---------------------------------------------------------------------------
# JWKS cache  (fetched once on startup, refreshed on key miss)
# ---------------------------------------------------------------------------
_jwks_cache: dict[str, Any] | None = None


async def _get_jwks() -> dict[str, Any]:
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(settings.clerk_jwks_url, timeout=10)
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


async def verify_clerk_token(token: str) -> dict[str, Any]:
    """Verify a Clerk-issued JWT and return the decoded payload."""
    try:
        jwks = await _get_jwks()
        # jose picks the right key from the JWKS set automatically
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# FastAPI dependency — resolves to the current User row
# ---------------------------------------------------------------------------
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = await verify_clerk_token(credentials.credentials)
    clerk_id: str = payload.get("sub", "")
    if not clerk_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    if user is None:
        # Auto-provision user on first request (Clerk webhook alternative)
        email: str = payload.get("email", "") or (payload.get("email_addresses") or [{}])[0].get(
            "email_address", ""
        )
        user = User(clerk_id=clerk_id, email=email)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


async def get_current_user_org(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, Organization]:
    """Returns (user, org) — requires user to have an org."""
    result = await db.execute(
        select(Organization).where(Organization.owner_id == current_user.id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=403, detail="User has no organization. Complete onboarding.")
    return current_user, org
