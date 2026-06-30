from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_org
from app.config import get_settings
from app.database import AsyncSessionLocal, get_db
from app.models import (
    EvalCase,
    EvalResult,
    EvalRun,
    EvalSet,
    KnowledgeBase,
    Organization,
    User,
)
from app.services.user_llm_credentials import require_user_api_key

router = APIRouter(prefix="/api", tags=["evaluation"])
settings = get_settings()


# ── Async run dispatch (mirrors documents._dispatch_ingestion) ───────────────


async def _run_eval_inline(run_id: uuid.UUID) -> None:
    from app.services.evaluation import run_evaluation

    async with AsyncSessionLocal() as db:
        await run_evaluation(run_id, db)


def _dispatch_eval_run(run_id: uuid.UUID, background_tasks: BackgroundTasks) -> None:
    """Queue an eval run via Celery, or run it inline as a background task."""
    if settings.use_celery:
        from app.tasks.eval_task import run_eval_task

        run_eval_task.delay(str(run_id))
    else:
        background_tasks.add_task(_run_eval_inline, run_id)


# ── Ownership helpers (tenant scoping) ───────────────────────────────────────


async def _get_kb_for_org(kb_id: uuid.UUID, org: Organization, db: AsyncSession) -> KnowledgeBase:
    kb = (
        await db.execute(
            select(KnowledgeBase).where(
                KnowledgeBase.id == kb_id, KnowledgeBase.org_id == org.id
            )
        )
    ).scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


async def _get_eval_kb(kb_id: uuid.UUID, org: Organization, db: AsyncSession) -> KnowledgeBase:
    """Eval runs only against the caller's personal workspace — not the community corpus."""
    kb = await _get_kb_for_org(kb_id, org, db)
    if kb.is_community:
        raise HTTPException(
            status_code=400,
            detail=(
                "Evaluation runs on your uploaded documents only, not the shared community notes. "
                "Open your personal workspace to upload files and run eval."
            ),
        )
    return kb


async def _get_set_for_org(set_id: uuid.UUID, org: Organization, db: AsyncSession) -> EvalSet:
    eval_set = (
        await db.execute(
            select(EvalSet)
            .join(KnowledgeBase, KnowledgeBase.id == EvalSet.kb_id)
            .where(EvalSet.id == set_id, KnowledgeBase.org_id == org.id)
        )
    ).scalar_one_or_none()
    if eval_set is None:
        raise HTTPException(status_code=404, detail="Eval set not found")
    return eval_set


async def _get_run_for_org(run_id: uuid.UUID, org: Organization, db: AsyncSession) -> EvalRun:
    run = (
        await db.execute(
            select(EvalRun)
            .join(EvalSet, EvalSet.id == EvalRun.eval_set_id)
            .join(KnowledgeBase, KnowledgeBase.id == EvalSet.kb_id)
            .where(EvalRun.id == run_id, KnowledgeBase.org_id == org.id)
        )
    ).scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Eval run not found")
    return run


# ── Schemas ───────────────────────────────────────────────────────────────────


class EvalCaseIn(BaseModel):
    question: str = Field(..., min_length=1)
    relevant_doc_ids: list[uuid.UUID] = []


class EvalSetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    cases: list[EvalCaseIn] = []


class GenerateRequest(BaseModel):
    num_cases: int = Field(8, ge=1, le=20)


class EvalCaseResponse(BaseModel):
    id: uuid.UUID
    question: str
    relevant_doc_ids: list | None
    source_chunk_id: uuid.UUID | None
    origin: str

    model_config = {"from_attributes": True}


class EvalRunResponse(BaseModel):
    id: uuid.UUID
    eval_set_id: uuid.UUID
    status: str
    top_k: int
    num_cases: int
    hit_rate: float | None
    mrr: float | None
    avg_precision: float | None
    avg_groundedness: float | None
    avg_relevance: float | None
    error: str | None
    created_at: datetime
    finished_at: datetime | None

    model_config = {"from_attributes": True}


class EvalSetResponse(BaseModel):
    id: uuid.UUID
    kb_id: uuid.UUID
    name: str
    created_at: datetime
    case_count: int
    latest_run: EvalRunResponse | None = None


class EvalSetDetail(BaseModel):
    id: uuid.UUID
    kb_id: uuid.UUID
    name: str
    created_at: datetime
    cases: list[EvalCaseResponse]


class EvalResultResponse(BaseModel):
    id: uuid.UUID
    question: str
    generated_answer: str | None
    retrieved_doc_ids: list | None
    retrieval_hit: bool
    reciprocal_rank: float
    precision_at_k: float
    groundedness: float | None
    relevance: float | None
    judge_rationale: str | None

    model_config = {"from_attributes": True}


# ── Eval sets ─────────────────────────────────────────────────────────────────


@router.post("/kb/{kb_id}/eval-sets", response_model=EvalSetDetail, status_code=201)
async def create_eval_set(
    kb_id: uuid.UUID,
    body: EvalSetCreate,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_eval_kb(kb_id, org, db)

    eval_set = EvalSet(kb_id=kb_id, name=body.name)
    db.add(eval_set)
    await db.flush()
    for c in body.cases:
        db.add(
            EvalCase(
                eval_set_id=eval_set.id,
                question=c.question,
                relevant_doc_ids=[str(d) for d in c.relevant_doc_ids],
                origin="manual",
            )
        )
    await db.commit()
    return await _set_detail(eval_set.id, db)


@router.get("/kb/{kb_id}/eval-sets", response_model=list[EvalSetResponse])
async def list_eval_sets(
    kb_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_eval_kb(kb_id, org, db)

    sets = (
        await db.execute(
            select(EvalSet).where(EvalSet.kb_id == kb_id).order_by(EvalSet.created_at.desc())
        )
    ).scalars().all()
    set_ids = [s.id for s in sets]
    if not set_ids:
        return []

    # Case counts per set.
    count_rows = await db.execute(
        select(EvalCase.eval_set_id, func.count(EvalCase.id))
        .where(EvalCase.eval_set_id.in_(set_ids))
        .group_by(EvalCase.eval_set_id)
    )
    counts = {row[0]: row[1] for row in count_rows}

    # Latest run per set (fetch all, keep first seen in desc order).
    run_rows = (
        await db.execute(
            select(EvalRun)
            .where(EvalRun.eval_set_id.in_(set_ids))
            .order_by(EvalRun.created_at.desc())
        )
    ).scalars().all()
    latest: dict[uuid.UUID, EvalRun] = {}
    for run in run_rows:
        latest.setdefault(run.eval_set_id, run)

    return [
        EvalSetResponse(
            id=s.id,
            kb_id=s.kb_id,
            name=s.name,
            created_at=s.created_at,
            case_count=counts.get(s.id, 0),
            latest_run=(
                EvalRunResponse.model_validate(latest[s.id]) if s.id in latest else None
            ),
        )
        for s in sets
    ]


async def _set_detail(set_id: uuid.UUID, db: AsyncSession) -> EvalSetDetail:
    eval_set = (await db.execute(select(EvalSet).where(EvalSet.id == set_id))).scalar_one()
    cases = (
        await db.execute(
            select(EvalCase).where(EvalCase.eval_set_id == set_id).order_by(EvalCase.created_at)
        )
    ).scalars().all()
    return EvalSetDetail(
        id=eval_set.id,
        kb_id=eval_set.kb_id,
        name=eval_set.name,
        created_at=eval_set.created_at,
        cases=[EvalCaseResponse.model_validate(c) for c in cases],
    )


@router.get("/eval-sets/{set_id}", response_model=EvalSetDetail)
async def get_eval_set(
    set_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_set_for_org(set_id, org, db)
    return await _set_detail(set_id, db)


@router.delete("/eval-sets/{set_id}", status_code=204)
async def delete_eval_set(
    set_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    eval_set = await _get_set_for_org(set_id, org, db)
    await db.delete(eval_set)
    await db.commit()


# ── Cases (manual + auto-generate) ───────────────────────────────────────────


@router.post("/eval-sets/{set_id}/cases", response_model=EvalCaseResponse, status_code=201)
async def add_case(
    set_id: uuid.UUID,
    body: EvalCaseIn,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_set_for_org(set_id, org, db)
    case = EvalCase(
        eval_set_id=set_id,
        question=body.question,
        relevant_doc_ids=[str(d) for d in body.relevant_doc_ids],
        origin="manual",
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return EvalCaseResponse.model_validate(case)


@router.delete("/eval-sets/{set_id}/cases/{case_id}", status_code=204)
async def delete_case(
    set_id: uuid.UUID,
    case_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_set_for_org(set_id, org, db)
    case = (
        await db.execute(
            select(EvalCase).where(EvalCase.id == case_id, EvalCase.eval_set_id == set_id)
        )
    ).scalar_one_or_none()
    if case is None:
        raise HTTPException(status_code=404, detail="Eval case not found")
    await db.delete(case)
    await db.commit()


@router.post("/kb/{kb_id}/eval-sets/{set_id}/generate", response_model=EvalSetDetail)
async def generate_cases(
    kb_id: uuid.UUID,
    set_id: uuid.UUID,
    body: GenerateRequest,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    """Auto-generate synthetic-ground-truth cases from the KB's own documents.

    Runs synchronously (small N). The generated questions are LLM-written and
    their ground truth is the source chunk's document — surfaced as 'synthetic'
    in the UI.
    """
    from app.services.evaluation import generate_eval_cases

    user, org = auth
    api_key = await require_user_api_key(db, user.id)
    await _get_eval_kb(kb_id, org, db)
    eval_set = await _get_set_for_org(set_id, org, db)
    if eval_set.kb_id != kb_id:
        raise HTTPException(status_code=404, detail="Eval set not found")

    generated = await generate_eval_cases(kb_id, db, body.num_cases, api_key=api_key)
    if not generated:
        raise HTTPException(
            status_code=400,
            detail="No ready documents to generate questions from. Upload and process a document first.",
        )
    for c in generated:
        db.add(
            EvalCase(
                eval_set_id=set_id,
                question=c["question"],
                relevant_doc_ids=c["relevant_doc_ids"],
                source_chunk_id=c["source_chunk_id"],
                origin=c["origin"],
            )
        )
    await db.commit()
    return await _set_detail(set_id, db)


# ── Runs ──────────────────────────────────────────────────────────────────────


@router.post("/eval-sets/{set_id}/run", response_model=EvalRunResponse, status_code=201)
async def start_run(
    set_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    user, org = auth
    await require_user_api_key(db, user.id)
    await _get_set_for_org(set_id, org, db)
    count = (
        await db.execute(
            select(func.count(EvalCase.id)).where(EvalCase.eval_set_id == set_id)
        )
    ).scalar_one()
    if not count:
        raise HTTPException(status_code=400, detail="Add at least one case before running.")

    run = EvalRun(
        eval_set_id=set_id,
        status="pending",
        top_k=settings.top_k_chunks,
        num_cases=count,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    _dispatch_eval_run(run.id, background_tasks)
    return EvalRunResponse.model_validate(run)


@router.get("/eval-runs/{run_id}", response_model=EvalRunResponse)
async def get_run(
    run_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    run = await _get_run_for_org(run_id, org, db)
    return EvalRunResponse.model_validate(run)


@router.get("/eval-runs/{run_id}/results", response_model=list[EvalResultResponse])
async def get_run_results(
    run_id: uuid.UUID,
    auth: tuple[User, Organization] = Depends(get_current_user_org),
    db: AsyncSession = Depends(get_db),
):
    _, org = auth
    await _get_run_for_org(run_id, org, db)
    results = (
        await db.execute(
            select(EvalResult).where(EvalResult.run_id == run_id).order_by(EvalResult.created_at)
        )
    ).scalars().all()
    return [EvalResultResponse.model_validate(r) for r in results]
