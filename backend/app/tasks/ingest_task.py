from __future__ import annotations

import logging
import uuid

from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

celery_app = Celery(
    "documind",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.ingest_task", "app.tasks.eval_task"],
)
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.task_track_started = True

if settings.community_sync_interval_hours > 0:
    hours = max(1, int(settings.community_sync_interval_hours))
    celery_app.conf.beat_schedule = {
        "community-sync": {
            "task": "app.tasks.ingest_task.sync_community_notes_task",
            "schedule": crontab(minute=0, hour=f"*/{hours}"),
        },
    }

_async_engine = None
_AsyncSess = None


def _run_async(coro):
    """Run async code in an isolated loop (safe inside Celery fork workers)."""
    import asyncio

    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
        except Exception:
            pass
        loop.close()
        asyncio.set_event_loop(None)


def _get_async_session():
    global _async_engine, _AsyncSess
    if _async_engine is None:
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

        _async_engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        _AsyncSess = async_sessionmaker(
            _async_engine, class_=AsyncSession, expire_on_commit=False
        )
    return _AsyncSess


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def ingest_document_task(self, document_id: str) -> dict:
    """
    Celery task that runs the ingestion pipeline synchronously.
    Uses a sync SQLAlchemy session since Celery workers are sync.
    """
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

    from app.services.ingestion import run_ingestion

    async def _run():
        engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        try:
            sess_factory = async_sessionmaker(
                engine, class_=AsyncSession, expire_on_commit=False
            )
            async with sess_factory() as db:
                await run_ingestion(uuid.UUID(document_id), db)
        finally:
            await engine.dispose()

    try:
        _run_async(_run())
        return {"status": "success", "document_id": document_id}
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def sync_community_notes_task(self) -> dict:
    """Periodic pull of community markdown into the shared corpus."""
    from app.services.github_sync import sync_community_notes
    from app.services.storage import storage_ready

    if not storage_ready():
        logger.warning("Community sync skipped — storage not configured")
        return {"status": "skipped", "reason": "storage_not_configured"}

    async def _run():
        sess_factory = _get_async_session()
        async with sess_factory() as db:
            return await sync_community_notes(db)

    try:
        result = _run_async(_run())
        return {"status": "success", **result}
    except Exception as exc:
        logger.exception("Community sync failed")
        raise self.retry(exc=exc)
