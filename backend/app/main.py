from __future__ import annotations

import logging

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.limiter import limiter
from app.routers import (
    api_keys,
    conversations,
    documents,
    evaluation,
    feedback,
    kb,
    org,
    query,
)

settings = get_settings()

# ── Sentry ────────────────────────────────────────────────────────────────────
if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.2)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DocuMind API",
    version="0.1.0",
    description="AI-powered RAG knowledge base SaaS",
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
app.include_router(org.router)
app.include_router(kb.router)
app.include_router(documents.router)
app.include_router(documents.status_router)
app.include_router(query.router)
app.include_router(conversations.router)
app.include_router(feedback.router)
app.include_router(api_keys.router)
app.include_router(evaluation.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
