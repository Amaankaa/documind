"""
Practice problem catalog + LeetCode submission proof verification.

Students link a LeetCode submission URL for a problem listed in community notes.
We validate the URL targets the correct problem slug, then count verified solves
toward the mastery gate (default: 3 problems).
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.a2sv_github_resources import CONCEPT_GITHUB_RESOURCES
from app.data.practice_problems_seed import (
    MASTERY_PROBLEM_TARGET,
    PRACTICE_PROBLEMS_BY_SLUG,
    ProblemSeed,
    leetcode_url,
)
from app.models import Concept, PracticeProblem, ProblemSubmission

LEETCODE_LINK_RE = re.compile(
    r"\[([^\]]+)\]\((https?://leetcode\.com/problems/([^/)]+)/?[^)]*)\)",
    re.IGNORECASE,
)

# e.g. https://leetcode.com/problems/two-sum/submissions/2047069614/
LEETCODE_SUBMISSION_URL_RE = re.compile(
    r"^https?://(?:www\.)?leetcode\.com/problems/(?P<slug>[\w-]+)/submissions/(?P<id>\d+)/?$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class MasteryGate:
    required: int
    verified: int
    can_master: bool


def extract_leetcode_problems(markdown: str) -> list[ProblemSeed]:
    """Pull LeetCode links from ## Practice questions sections in community notes."""
    lines = markdown.splitlines()
    in_practice = False
    found: list[ProblemSeed] = []
    seen: set[str] = set()

    for line in lines:
        lower = line.lower()
        if line.startswith("## ") and "practice" in lower:
            in_practice = True
            continue
        if line.startswith("## ") and in_practice:
            break
        if not in_practice:
            continue
        for match in LEETCODE_LINK_RE.finditer(line):
            title, _url, slug = match.group(1), match.group(2), match.group(3).lower()
            if slug in seen:
                continue
            seen.add(slug)
            found.append(ProblemSeed(leetcode_slug=slug, title=title.strip()))

    return found


def verify_leetcode_proof(leetcode_slug: str, proof_url: str) -> bool:
    """
    Accept only LeetCode submission detail URLs, e.g.:
    https://leetcode.com/problems/two-sum/submissions/2047069614/
    """
    match = LEETCODE_SUBMISSION_URL_RE.match(proof_url.strip())
    if not match:
        return False
    return match.group("slug").lower() == leetcode_slug.lower().strip("/")


async def _fetch_markdown(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp.text
    except httpx.HTTPError:
        return None
    return None


async def _problems_for_concept_slug(
    slug: str,
    *,
    prefer_live: bool = False,
) -> list[ProblemSeed]:
    """Curated seed by default; optional live parse from community markdown."""
    if prefer_live:
        for resource in CONCEPT_GITHUB_RESOURCES.get(slug, ()):
            if resource.kind != "note":
                continue
            markdown = await _fetch_markdown(resource.raw_url)
            if markdown:
                parsed = extract_leetcode_problems(markdown)
                if parsed:
                    return parsed

    return list(PRACTICE_PROBLEMS_BY_SLUG.get(slug, ()))


async def seed_practice_problems(db: AsyncSession) -> int:
    result = await db.execute(select(Concept))
    concepts = {c.slug: c for c in result.scalars().all()}
    created = 0

    for slug, concept in concepts.items():
        seeds = await _problems_for_concept_slug(slug)
        if not seeds:
            continue

        existing = await db.execute(
            select(PracticeProblem).where(PracticeProblem.concept_id == concept.id)
        )
        if existing.scalars().first() is not None:
            continue

        for index, seed in enumerate(seeds):
            db.add(
                PracticeProblem(
                    concept_id=concept.id,
                    leetcode_slug=seed.leetcode_slug,
                    title=seed.title,
                    url=leetcode_url(seed.leetcode_slug),
                    order_index=index,
                )
            )
            created += 1

    if created:
        await db.commit()
    return created


async def get_problems_for_concept(
    db: AsyncSession,
    *,
    concept_id: uuid.UUID,
) -> list[PracticeProblem]:
    result = await db.execute(
        select(PracticeProblem)
        .where(PracticeProblem.concept_id == concept_id)
        .order_by(PracticeProblem.order_index)
    )
    return list(result.scalars().all())


async def get_verified_problem_ids(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    concept_id: uuid.UUID,
) -> set[uuid.UUID]:
    result = await db.execute(
        select(ProblemSubmission.problem_id)
        .join(PracticeProblem, PracticeProblem.id == ProblemSubmission.problem_id)
        .where(
            ProblemSubmission.user_id == user_id,
            PracticeProblem.concept_id == concept_id,
        )
    )
    return set(result.scalars().all())


async def batch_mastery_progress(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    concept_ids: list[uuid.UUID],
) -> dict[uuid.UUID, MasteryGate]:
    if not concept_ids:
        return {}

    problem_counts = dict(
        (
            await db.execute(
                select(PracticeProblem.concept_id, func.count(PracticeProblem.id))
                .where(PracticeProblem.concept_id.in_(concept_ids))
                .group_by(PracticeProblem.concept_id)
            )
        ).all()
    )

    verified_counts = dict(
        (
            await db.execute(
                select(PracticeProblem.concept_id, func.count(ProblemSubmission.id))
                .join(ProblemSubmission, ProblemSubmission.problem_id == PracticeProblem.id)
                .where(
                    PracticeProblem.concept_id.in_(concept_ids),
                    ProblemSubmission.user_id == user_id,
                )
                .group_by(PracticeProblem.concept_id)
            )
        ).all()
    )

    out: dict[uuid.UUID, MasteryGate] = {}
    for concept_id in concept_ids:
        total = int(problem_counts.get(concept_id, 0))
        verified = int(verified_counts.get(concept_id, 0))
        if total == 0:
            out[concept_id] = MasteryGate(required=0, verified=0, can_master=True)
        else:
            required = min(MASTERY_PROBLEM_TARGET, total)
            out[concept_id] = MasteryGate(
                required=required,
                verified=verified,
                can_master=verified >= required,
            )
    return out


async def batch_practice_problems(
    db: AsyncSession,
    *,
    concept_ids: list[uuid.UUID],
    user_id: uuid.UUID,
) -> dict[uuid.UUID, list[tuple[PracticeProblem, bool]]]:
    if not concept_ids:
        return {}

    result = await db.execute(
        select(PracticeProblem)
        .where(PracticeProblem.concept_id.in_(concept_ids))
        .order_by(PracticeProblem.concept_id, PracticeProblem.order_index)
    )
    problems = list(result.scalars().all())
    if not problems:
        return {cid: [] for cid in concept_ids}

    problem_ids = [p.id for p in problems]
    verified = set(
        (
            await db.execute(
                select(ProblemSubmission.problem_id).where(
                    ProblemSubmission.user_id == user_id,
                    ProblemSubmission.problem_id.in_(problem_ids),
                )
            )
        ).scalars().all()
    )

    grouped: dict[uuid.UUID, list[tuple[PracticeProblem, bool]]] = {cid: [] for cid in concept_ids}
    for problem in problems:
        grouped.setdefault(problem.concept_id, []).append(
            (problem, problem.id in verified)
        )
    return grouped


async def mastery_gate(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    concept_id: uuid.UUID,
) -> MasteryGate:
    problems = await get_problems_for_concept(db, concept_id=concept_id)
    if not problems:
        return MasteryGate(required=0, verified=0, can_master=True)

    verified_ids = await get_verified_problem_ids(
        db, user_id=user_id, concept_id=concept_id
    )
    required = min(MASTERY_PROBLEM_TARGET, len(problems))
    verified = len(verified_ids)
    return MasteryGate(
        required=required,
        verified=verified,
        can_master=verified >= required,
    )


async def submit_problem_proof(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    problem_id: uuid.UUID,
    proof_url: str,
) -> ProblemSubmission:
    result = await db.execute(
        select(PracticeProblem).where(PracticeProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if problem is None:
        raise ValueError("Problem not found")

    if not verify_leetcode_proof(problem.leetcode_slug, proof_url):
        raise ValueError(
            f"Paste a LeetCode submission URL for “{problem.title}”, e.g. "
            f"https://leetcode.com/problems/{problem.leetcode_slug}/submissions/1234567890/"
        )

    existing = await db.execute(
        select(ProblemSubmission).where(
            ProblemSubmission.user_id == user_id,
            ProblemSubmission.problem_id == problem_id,
        )
    )
    row = existing.scalar_one_or_none()
    if row is None:
        row = ProblemSubmission(
            user_id=user_id,
            problem_id=problem_id,
            proof_url=proof_url.strip(),
        )
        db.add(row)
    else:
        row.proof_url = proof_url.strip()

    await db.commit()
    await db.refresh(row)
    return row
