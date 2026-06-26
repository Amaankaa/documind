"""
Learning-path engine for AlgoMentor.

Uses Kahn's algorithm (topological sort) over the interview concept DAG to
recommend the next pattern a student should study.
"""
from __future__ import annotations

import uuid
from collections import defaultdict, deque
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.interview_concepts import INTERVIEW_CONCEPTS, ConceptSeed
from app.models import Concept, ConceptEdge, ConceptProgress


class CycleError(ValueError):
    """Raised when the concept graph contains a cycle."""


@dataclass(frozen=True)
class ConceptNode:
    id: uuid.UUID
    slug: str
    title: str
    description: str
    order_index: int
    is_bonus: bool
    contributor_wanted: bool
    prerequisites: tuple[str, ...]
    status: str  # locked | available | in_progress | mastered


def topological_sort(slugs: list[str], edges: list[tuple[str, str]]) -> list[str]:
    """
    Kahn's algorithm. *edges* are (prerequisite_slug, concept_slug) pairs.
    Returns a total order or raises CycleError.
    """
    in_degree: dict[str, int] = {slug: 0 for slug in slugs}
    adjacency: dict[str, list[str]] = defaultdict(list)

    for prereq, concept in edges:
        if prereq not in in_degree or concept not in in_degree:
            continue
        adjacency[prereq].append(concept)
        in_degree[concept] += 1

    queue = deque(sorted(slug for slug, deg in in_degree.items() if deg == 0))
    order: list[str] = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in sorted(adjacency[node]):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(order) != len(slugs):
        raise CycleError("Concept graph contains a cycle")

    return order


def compute_effective_status(
    slug: str,
    prereq_slugs: list[str],
    progress_by_slug: dict[str, str],
) -> str:
    """Derive locked/available from prerequisites when no explicit row exists."""
    stored = progress_by_slug.get(slug)
    if stored in ("in_progress", "mastered"):
        return stored

    if not prereq_slugs:
        return "available"

    if all(progress_by_slug.get(p) == "mastered" for p in prereq_slugs):
        return stored or "available"

    return "locked"


async def seed_interview_concepts(db: AsyncSession) -> int:
    """
    Idempotently insert the global interview concept catalog.
    Returns the number of newly created concepts.
    """
    result = await db.execute(select(Concept.slug))
    existing = set(result.scalars().all())
    created = 0

    slug_to_id: dict[str, uuid.UUID] = {}

    for seed in INTERVIEW_CONCEPTS:
        if seed.slug in existing:
            row = await db.execute(select(Concept).where(Concept.slug == seed.slug))
            concept = row.scalar_one()
            concept.title = seed.title
            concept.description = seed.description
            concept.order_index = seed.order_index
            concept.is_bonus = seed.is_bonus
            concept.contributor_wanted = seed.contributor_wanted
            slug_to_id[seed.slug] = concept.id
            continue

        concept = Concept(
            slug=seed.slug,
            title=seed.title,
            description=seed.description,
            order_index=seed.order_index,
            is_bonus=seed.is_bonus,
            contributor_wanted=seed.contributor_wanted,
        )
        db.add(concept)
        await db.flush()
        slug_to_id[seed.slug] = concept.id
        created += 1

    for seed in INTERVIEW_CONCEPTS:
        concept_id = slug_to_id[seed.slug]
        for prereq_slug in seed.prerequisites:
            prereq_id = slug_to_id[prereq_slug]
            edge_exists = await db.execute(
                select(ConceptEdge).where(
                    ConceptEdge.prerequisite_id == prereq_id,
                    ConceptEdge.concept_id == concept_id,
                )
            )
            if edge_exists.scalar_one_or_none() is None:
                db.add(ConceptEdge(prerequisite_id=prereq_id, concept_id=concept_id))

    # Drop stale edges when the catalog prerequisites change.
    catalog_ids = set(slug_to_id.values())
    expected: set[tuple[uuid.UUID, uuid.UUID]] = set()
    for seed in INTERVIEW_CONCEPTS:
        concept_id = slug_to_id[seed.slug]
        for prereq_slug in seed.prerequisites:
            expected.add((slug_to_id[prereq_slug], concept_id))

    edges_result = await db.execute(
        select(ConceptEdge).where(ConceptEdge.concept_id.in_(catalog_ids))
    )
    for edge in edges_result.scalars().all():
        pair = (edge.prerequisite_id, edge.concept_id)
        if pair not in expected:
            await db.delete(edge)

    await db.commit()
    return created


async def load_concept_graph(db: AsyncSession) -> tuple[list[Concept], list[ConceptEdge]]:
    concepts_result = await db.execute(
        select(Concept).order_by(Concept.order_index, Concept.title)
    )
    concepts = list(concepts_result.scalars().all())

    edges_result = await db.execute(select(ConceptEdge))
    edges = list(edges_result.scalars().all())

    return concepts, edges


async def get_progress_map(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> dict[uuid.UUID, ConceptProgress]:
    result = await db.execute(
        select(ConceptProgress).where(ConceptProgress.user_id == user_id)
    )
    return {row.concept_id: row for row in result.scalars().all()}


def build_concept_nodes(
    concepts: list[Concept],
    edges: list[ConceptEdge],
    progress_map: dict[uuid.UUID, ConceptProgress],
) -> list[ConceptNode]:
    id_to_slug = {c.id: c.slug for c in concepts}
    prereqs_by_id: dict[uuid.UUID, list[str]] = defaultdict(list)

    for edge in edges:
        prereqs_by_id[edge.concept_id].append(id_to_slug[edge.prerequisite_id])

    progress_by_slug: dict[str, str] = {}
    for concept in concepts:
        row = progress_map.get(concept.id)
        if row:
            progress_by_slug[concept.slug] = row.status

    nodes: list[ConceptNode] = []
    for concept in concepts:
        prereq_slugs = sorted(prereqs_by_id.get(concept.id, []))
        status = compute_effective_status(concept.slug, prereq_slugs, progress_by_slug)
        nodes.append(
            ConceptNode(
                id=concept.id,
                slug=concept.slug,
                title=concept.title,
                description=concept.description,
                order_index=concept.order_index,
                is_bonus=concept.is_bonus,
                contributor_wanted=concept.contributor_wanted,
                prerequisites=tuple(prereq_slugs),
                status=status,
            )
        )

    return nodes


def recommend_next(nodes: list[ConceptNode], *, include_bonus: bool = False) -> ConceptNode | None:
    """First available or in-progress concept in topological order."""
    slugs = [n.slug for n in nodes]
    edges = [(p, n.slug) for n in nodes for p in n.prerequisites]
    try:
        order = topological_sort(slugs, edges)
    except CycleError:
        order = sorted(slugs)

    by_slug = {n.slug: n for n in nodes}
    for slug in order:
        node = by_slug[slug]
        if not include_bonus and node.is_bonus:
            continue
        if node.status in ("available", "in_progress"):
            return node
    return None


def seeds_for_catalog() -> tuple[ConceptSeed, ...]:
    return INTERVIEW_CONCEPTS
