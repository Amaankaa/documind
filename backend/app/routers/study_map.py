from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import get_settings
from app.data.a2sv_github_resources import _repo_url, resources_for_slug
from app.database import get_db
from app.models import ConceptProgress, User
from app.services.community import ensure_community_kb, ensure_personal_kb, ensure_user_org, count_kb_chunks
from app.services.github_sync import sync_community_notes
from app.services.learning_path import (
    build_concept_nodes,
    get_progress_map,
    load_concept_graph,
    recommend_next,
    seed_interview_concepts,
)
from app.services.practice_problems import (
    batch_mastery_progress,
    batch_practice_problems,
    seed_practice_problems,
    submit_problem_proof,
)


router = APIRouter(prefix="/api", tags=["study-map"])


class ConceptEdgeOut(BaseModel):
    prerequisite_slug: str
    concept_slug: str


class PracticeProblemOut(BaseModel):
    id: uuid.UUID
    leetcode_slug: str
    title: str
    url: str
    verified: bool


class MasteryProgressOut(BaseModel):
    required: int
    verified: int
    can_master: bool


class ConceptOut(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    description: str
    order_index: int
    is_bonus: bool
    contributor_wanted: bool
    prerequisites: list[str]
    status: str
    github_resources: list[dict] = Field(default_factory=list)
    practice_problems: list[PracticeProblemOut] = Field(default_factory=list)
    mastery: MasteryProgressOut


class ConceptMapMeta(BaseModel):
    knowledge_base_repo_url: str
    knowledge_base_name: str
    knowledge_base_description: str
    community_kb_id: uuid.UUID


class ConceptMapResponse(BaseModel):
    concepts: list[ConceptOut]
    edges: list[ConceptEdgeOut]
    next_concept: ConceptOut | None
    meta: ConceptMapMeta


class ProgressUpdate(BaseModel):
    status: str = Field(..., pattern="^(available|in_progress|mastered)$")


class ProofSubmit(BaseModel):
    proof_url: HttpUrl


class MeResponse(BaseModel):
    user_id: uuid.UUID
    org_id: uuid.UUID
    org_slug: str
    community_kb_id: uuid.UUID
    personal_kb_id: uuid.UUID
    personal_chunk_count: int
    personal_chunk_limit: int


class SyncResponse(BaseModel):
    created: int
    updated: int
    skipped: int
    bundled: int = 0
    errors: list[str]


def _to_out(
    node,
    *,
    practice_problems: list[PracticeProblemOut],
    mastery: MasteryProgressOut,
) -> ConceptOut:
    return ConceptOut(
        id=node.id,
        slug=node.slug,
        title=node.title,
        description=node.description,
        order_index=node.order_index,
        is_bonus=node.is_bonus,
        contributor_wanted=node.contributor_wanted,
        prerequisites=list(node.prerequisites),
        status=node.status,
        github_resources=resources_for_slug(node.slug),
        practice_problems=practice_problems,
        mastery=mastery,
    )


async def _build_map_response(
    db: AsyncSession,
    user: User,
    *,
    include_bonus: bool,
) -> ConceptMapResponse:
    await seed_interview_concepts(db)
    await seed_practice_problems(db)
    community_kb = await ensure_community_kb(db)
    concepts, edges = await load_concept_graph(db)
    progress_map = await get_progress_map(db, user_id=user.id)
    nodes = build_concept_nodes(concepts, edges, progress_map)
    id_to_slug = {c.id: c.slug for c in concepts}

    if not include_bonus:
        nodes = [n for n in nodes if not n.is_bonus]

    concept_ids = [n.id for n in nodes]
    mastery_by_id = await batch_mastery_progress(db, user_id=user.id, concept_ids=concept_ids)
    problems_by_id = await batch_practice_problems(
        db, concept_ids=concept_ids, user_id=user.id
    )

    def serialize_node(node):
        gate = mastery_by_id.get(node.id)
        mastery_out = (
            MasteryProgressOut(required=0, verified=0, can_master=True)
            if gate is None
            else MasteryProgressOut(
                required=gate.required,
                verified=gate.verified,
                can_master=gate.can_master,
            )
        )
        problems = [
            PracticeProblemOut(
                id=p.id,
                leetcode_slug=p.leetcode_slug,
                title=p.title,
                url=p.url,
                verified=verified,
            )
            for p, verified in problems_by_id.get(node.id, [])
        ]
        return _to_out(node, practice_problems=problems, mastery=mastery_out)

    visible_slugs = {n.slug for n in nodes}
    edge_out = [
        ConceptEdgeOut(
            prerequisite_slug=id_to_slug[e.prerequisite_id],
            concept_slug=id_to_slug[e.concept_id],
        )
        for e in edges
        if id_to_slug[e.prerequisite_id] in visible_slugs
        and id_to_slug[e.concept_id] in visible_slugs
    ]

    next_node = recommend_next(nodes, include_bonus=include_bonus)

    return ConceptMapResponse(
        concepts=[serialize_node(n) for n in nodes],
        edges=edge_out,
        next_concept=serialize_node(next_node) if next_node else None,
        meta=ConceptMapMeta(
            knowledge_base_repo_url=_repo_url(),
            knowledge_base_name="Algorithm Knowledge Base",
            knowledge_base_description=(
                "Collaborative DSA notes — explanations, Python templates, "
                "and LeetCode practice problems."
            ),
            community_kb_id=community_kb.id,
        ),
    )


@router.get("/me", response_model=MeResponse)
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bootstrap org + return ids needed by the client (no manual workspace setup)."""
    settings = get_settings()
    org = await ensure_user_org(db, user)
    community_kb = await ensure_community_kb(db)
    personal_kb = await ensure_personal_kb(db, user, org)
    chunk_count = await count_kb_chunks(db, personal_kb.id)
    return MeResponse(
        user_id=user.id,
        org_id=org.id,
        org_slug=org.slug,
        community_kb_id=community_kb.id,
        personal_kb_id=personal_kb.id,
        personal_chunk_count=chunk_count,
        personal_chunk_limit=settings.max_chunks_per_kb,
    )


@router.get("/study-map", response_model=ConceptMapResponse)
async def get_study_map(
    include_bonus: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ensure_user_org(db, user)
    return await _build_map_response(db, user, include_bonus=include_bonus)


@router.get("/study-map/next", response_model=ConceptOut)
async def get_next_concept(
    include_bonus: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await _build_map_response(db, user, include_bonus=include_bonus)
    if data.next_concept is None:
        raise HTTPException(status_code=404, detail="No available concepts — great work!")
    return data.next_concept


@router.patch("/study-map/concepts/{concept_id}/progress", response_model=ConceptOut)
async def update_concept_progress(
    concept_id: uuid.UUID,
    body: ProgressUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ensure_user_org(db, user)
    await seed_interview_concepts(db)
    await seed_practice_problems(db)

    concepts, edges = await load_concept_graph(db)
    if not any(c.id == concept_id for c in concepts):
        raise HTTPException(status_code=404, detail="Concept not found")

    progress_map = await get_progress_map(db, user_id=user.id)
    nodes = build_concept_nodes(concepts, edges, progress_map)
    current = next((n for n in nodes if n.id == concept_id), None)
    if current is None:
        raise HTTPException(status_code=404, detail="Concept not found")

    if body.status in ("in_progress", "mastered") and current.status == "locked":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete prerequisite concepts first",
        )

    if body.status == "mastered":
        mastery_by_id = await batch_mastery_progress(
            db, user_id=user.id, concept_ids=[concept_id]
        )
        gate = mastery_by_id.get(concept_id)
        if gate and not gate.can_master:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Verify {gate.required} practice solves before mastering "
                    f"({gate.verified}/{gate.required} done). "
                    "Paste a LeetCode submission link for each problem."
                ),
            )

    row = progress_map.get(concept_id)
    if row is None:
        row = ConceptProgress(
            user_id=user.id,
            concept_id=concept_id,
            status=body.status,
        )
        db.add(row)
    else:
        row.status = body.status

    await db.commit()

    data = await _build_map_response(db, user, include_bonus=True)
    updated = next((c for c in data.concepts if c.id == concept_id), None)
    if updated is None:
        raise HTTPException(status_code=404, detail="Concept not found")
    return updated


@router.post(
    "/study-map/concepts/{concept_id}/problems/{problem_id}/verify",
    response_model=PracticeProblemOut,
)
async def verify_practice_problem(
    concept_id: uuid.UUID,
    problem_id: uuid.UUID,
    body: ProofSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ensure_user_org(db, user)
    await seed_practice_problems(db)

    problems_by_id = await batch_practice_problems(
        db, concept_ids=[concept_id], user_id=user.id
    )
    problem_row = next(
        (p for p, _ in problems_by_id.get(concept_id, []) if p.id == problem_id),
        None,
    )
    if problem_row is None:
        raise HTTPException(status_code=404, detail="Practice problem not found")

    try:
        await submit_problem_proof(
            db,
            user_id=user.id,
            problem_id=problem_id,
            proof_url=str(body.proof_url),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return PracticeProblemOut(
        id=problem_row.id,
        leetcode_slug=problem_row.leetcode_slug,
        title=problem_row.title,
        url=problem_row.url,
        verified=True,
    )


@router.post("/community/sync", response_model=SyncResponse)
async def sync_community_corpus(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Pull latest markdown from GitHub into the shared community corpus."""
    await ensure_user_org(db, user)
    result = await sync_community_notes(db)
    return SyncResponse(**result)
