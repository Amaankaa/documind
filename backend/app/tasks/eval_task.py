from __future__ import annotations

import uuid

from app.tasks.ingest_task import _get_async_session, celery_app


@celery_app.task(bind=True, max_retries=1, default_retry_delay=10)
def run_eval_task(self, run_id: str) -> dict:
    """Celery task that executes an evaluation run synchronously.

    Mirrors ingest_document_task: reuses the shared celery_app and async
    session factory, driving the async run_evaluation via asyncio.run.
    """
    import asyncio

    from app.services.evaluation import run_evaluation

    async def _run():
        sess_factory = _get_async_session()
        async with sess_factory() as db:
            await run_evaluation(uuid.UUID(run_id), db)

    asyncio.run(_run())
    return {"status": "done", "run_id": run_id}
