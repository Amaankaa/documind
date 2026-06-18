from __future__ import annotations

import uuid

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "documind",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.task_track_started = True

_async_engine = None
_AsyncSess = None


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
    import asyncio

    from app.services.ingestion import run_ingestion

    async def _run():
        sess_factory = _get_async_session()
        async with sess_factory() as db:
            await run_ingestion(uuid.UUID(document_id), db)

    try:
        asyncio.run(_run())
        return {"status": "success", "document_id": document_id}
    except Exception as exc:
        raise self.retry(exc=exc)
