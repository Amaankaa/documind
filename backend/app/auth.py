from __future__ import annotations

import hashlib
import logging
from typing import Any

import httpx
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import ApiKey, Organization, User
from app.services.community import ensure_user_org

logger = logging.getLogger(__name__)
settings = get_settings()

bearer_scheme = HTTPBearer(auto_error=False)
api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)

API_KEY_PREFIX = "dm_"


def hash_api_key(raw_key: str) -> str:
    """SHA-256 hex digest used to look up / store keys. The raw key is never persisted."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

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
    global _jwks_cache
    for attempt in range(2):
        try:
            jwks = await _get_jwks()
            payload = jwt.decode(
                token,
                jwks,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
            return payload
        except JWTError as exc:
            if attempt == 0:
                _jwks_cache = None
                continue
            logger.warning("JWT verification failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ---------------------------------------------------------------------------
# FastAPI dependency — resolves to the current User row
# ---------------------------------------------------------------------------
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = await verify_clerk_token(credentials.credentials)
    clerk_id: str = payload.get("sub", "")
    if not clerk_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    if user is None:
        # Auto-provision user on first request (Clerk webhook alternative).
        # A brand-new session fires several requests in parallel, so two can
        # race to insert the same clerk_id — catch the unique violation and
        # re-read the row the winner created.
        email: str | None = payload.get("email") or (
            payload.get("email_addresses") or [{}]
        )[0].get("email_address")
        user = User(clerk_id=clerk_id, email=email or None)
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except IntegrityError:
            await db.rollback()
            result = await db.execute(select(User).where(User.clerk_id == clerk_id))
            user = result.scalar_one()

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


async def _resolve_api_key(api_key: str, db: AsyncSession) -> tuple[User, Organization]:
    """Resolve a raw API key to its (owner, org). The org owner is used as the
    acting user so existing org-scoped queries work unchanged."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_hash == hash_api_key(api_key),
            ApiKey.revoked_at.is_(None),
        )
    )
    key = result.scalar_one_or_none()
    if key is None:
        raise HTTPException(status_code=401, detail="Invalid or revoked API key")

    org = await db.get(Organization, key.org_id)
    if org is None:
        raise HTTPException(status_code=401, detail="API key has no organization")
    owner = await db.get(User, org.owner_id)
    if owner is None:
        raise HTTPException(status_code=401, detail="API key owner not found")

    await db.execute(
        update(ApiKey).where(ApiKey.id == key.id).values(last_used_at=func.now())
    )
    await db.commit()
    return owner, org


async def get_user_org_flexible(
    api_key: str | None = Security(api_key_scheme),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, Organization]:
    """Accept either an `X-API-Key` header or a Clerk bearer token. Used by
    endpoints that should be reachable programmatically (e.g. query)."""
    if api_key:
        return await _resolve_api_key(api_key, db)
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Provide a Clerk token or an X-API-Key header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await get_current_user(credentials, db)
    org = await ensure_user_org(db, user)
    return user, org
