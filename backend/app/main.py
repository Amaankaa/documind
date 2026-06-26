from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.limiter import limiter
from app.routers import (
    api_keys,
    concepts,
    conversations,
    documents,
    evaluation,
    feedback,
    kb,
    llm_credentials,
    org,
    query,
    study_map,
)

logger = logging.getLogger(__name__)
settings = get_settings()


async def _run_startup_community_sync() -> None:
    from app.database import AsyncSessionLocal
    from app.services.github_sync import sync_community_notes
    from app.services.storage import storage_ready

    if not storage_ready():
        logger.warning("Skipping startup community sync — storage not configured")
        return

    try:
        async with AsyncSessionLocal() as db:
            result = await sync_community_notes(db)
        logger.info("Startup community sync: %s", result)
    except Exception:
        logger.exception("Startup community sync failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.community_sync_on_startup:
        asyncio.create_task(_run_startup_community_sync())
    yield


# ── Sentry ────────────────────────────────────────────────────────────────────
if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.2)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AlgoMentor API",
    version="0.2.0",
    description="Graph-guided big-tech interview prep with RAG tutoring",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(study_map.router)
app.include_router(org.router)
app.include_router(kb.router)
app.include_router(documents.router)
app.include_router(documents.status_router)
app.include_router(query.router)
app.include_router(conversations.router)
app.include_router(feedback.router)
app.include_router(api_keys.router)
app.include_router(llm_credentials.router)
app.include_router(evaluation.router)
app.include_router(concepts.router)


@app.get("/health")
async def health():
    from app.services.storage import storage_backend_label, storage_ready

    return {
        "status": "ok",
        "storage": storage_backend_label(),
        "storage_ready": storage_ready(),
        "llm_provider": get_settings().llm_provider,
    }
