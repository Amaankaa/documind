"""Tests for AlgoMentor learning-path engine and concepts API."""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select

from app.models import Concept
from app.services.learning_path import (
    CycleError,
    ConceptNode,
    compute_effective_status,
    recommend_next,
    seed_interview_concepts,
    topological_sort,
)


class TestTopologicalSort:
    def test_linear_chain(self):
        slugs = ["a", "b", "c"]
        edges = [("a", "b"), ("b", "c")]
        assert topological_sort(slugs, edges) == ["a", "b", "c"]

    def test_multiple_roots(self):
        slugs = ["a", "b", "c"]
        edges = [("a", "c"), ("b", "c")]
        order = topological_sort(slugs, edges)
        assert order.index("a") < order.index("c")
        assert order.index("b") < order.index("c")

    def test_cycle_raises(self):
        slugs = ["a", "b"]
        edges = [("a", "b"), ("b", "a")]
        with pytest.raises(CycleError):
            topological_sort(slugs, edges)


class TestEffectiveStatus:
    def test_root_available(self):
        assert compute_effective_status("arrays", [], {}) == "available"

    def test_locked_without_prereqs(self):
        assert (
            compute_effective_status("dp", ["recursion"], {"recursion": "available"})
            == "locked"
        )

    def test_available_when_prereqs_mastered(self):
        assert (
            compute_effective_status(
                "dp",
                ["recursion"],
                {"recursion": "mastered"},
            )
            == "available"
        )

    def test_preserves_in_progress(self):
        assert (
            compute_effective_status(
                "dp",
                ["recursion"],
                {"recursion": "mastered", "dp": "in_progress"},
            )
            == "in_progress"
        )


@pytest.mark.asyncio
async def test_seed_interview_concepts_idempotent(db):
    created_first = await seed_interview_concepts(db)
    created_second = await seed_interview_concepts(db)
    assert created_first > 0
    assert created_second == 0


def test_resources_for_slug_includes_sliding_window():
    from app.data.a2sv_github_resources import resources_for_slug

    resources = resources_for_slug("sliding-window")
    assert len(resources) >= 1
    assert "sliding-window" in resources[0]["url"]
    assert resources[0]["contributor"] == "@Amanuel-Merara"


def test_contributor_wanted_concepts():
    from app.data.interview_concepts import INTERVIEW_CONCEPTS

    wanted = {s.slug for s in INTERVIEW_CONCEPTS if s.contributor_wanted}
    assert wanted == set()


def test_resources_for_slug_includes_greedy_and_bit_manipulation():
    from app.data.a2sv_github_resources import resources_for_slug

    greedy = resources_for_slug("greedy")
    assert len(greedy) >= 1
    assert "greedy/greedy.md" in greedy[0]["url"]
    assert greedy[0]["contributor"] == "@Amanuel-Merara"

    bitwise = resources_for_slug("bit-manipulation")
    assert any("bit-manipulation" in r["url"] for r in bitwise)
    assert any(r["contributor"] == "@Amanuel-Merara" for r in bitwise)


@pytest.mark.asyncio
async def test_study_map_endpoint(client, make_user, mock_auth):
    user = await make_user()

    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get("/api/study-map", headers=headers)

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["concepts"]) == 17
    assert data["next_concept"]["slug"] == "arrays-and-strings"
    assert "community_kb_id" in data["meta"]


@pytest.mark.asyncio
async def test_me_endpoint_bootstraps_org(client, make_user, mock_auth):
    user = await make_user()

    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get("/api/me", headers=headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == str(user.id)
    assert data["org_id"]
    assert data["community_kb_id"]
    assert data["personal_kb_id"]
    assert data["personal_chunk_limit"] == 100


@pytest.mark.asyncio
async def test_concept_map_endpoint(client, make_user, make_org, make_kb, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)

    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get(f"/api/kb/{kb.id}/concepts", headers=headers)

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["concepts"]) == 17
    assert data["next_concept"] is not None
    assert data["next_concept"]["slug"] == "arrays-and-strings"
    assert len(data["edges"]) > 0
    assert "meta" in data
    assert "algorithm-knowledge-base" in data["meta"]["knowledge_base_repo_url"]
    binary_search = next(c for c in data["concepts"] if c["slug"] == "binary-search")
    assert len(binary_search["github_resources"]) >= 1


@pytest.mark.asyncio
async def test_update_progress_unlocks_dependents(
    client, db, make_user, make_org, make_kb, mock_auth
):
    from app.models import PracticeProblem
    from app.services.practice_problems import seed_practice_problems

    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    await seed_interview_concepts(db)
    await seed_practice_problems(db)

    sorting = (await db.execute(select(Concept).where(Concept.slug == "sorting"))).scalar_one()

    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        locked = await client.patch(
            f"/api/kb/{kb.id}/concepts/{sorting.id}/progress",
            json={"status": "in_progress"},
            headers=headers,
        )
        assert locked.status_code == 400

        arrays = (
            await db.execute(select(Concept).where(Concept.slug == "arrays-and-strings"))
        ).scalar_one()

        problems = (
            await db.execute(
                select(PracticeProblem).where(PracticeProblem.concept_id == arrays.id)
            )
        ).scalars().all()
        for problem in problems[:3]:
            verify = await client.post(
                f"/api/study-map/concepts/{arrays.id}/problems/{problem.id}/verify",
                json={
                    "proof_url": f"https://leetcode.com/problems/{problem.leetcode_slug}/submissions/1/",
                },
                headers=headers,
            )
            assert verify.status_code == 200

        mastered = await client.patch(
            f"/api/kb/{kb.id}/concepts/{arrays.id}/progress",
            json={"status": "mastered"},
            headers=headers,
        )
        assert mastered.status_code == 200

        now_available = await client.patch(
            f"/api/kb/{kb.id}/concepts/{sorting.id}/progress",
            json={"status": "in_progress"},
            headers=headers,
        )
        assert now_available.status_code == 200
        assert now_available.json()["status"] == "in_progress"


def test_recommend_next_skips_locked():
    nodes = [
        ConceptNode(
            id=uuid.uuid4(),
            slug="arrays-and-strings",
            title="Arrays",
            description="",
            order_index=1,
            is_bonus=False,
            contributor_wanted=False,
            prerequisites=(),
            status="available",
        ),
        ConceptNode(
            id=uuid.uuid4(),
            slug="sorting",
            title="Sorting",
            description="",
            order_index=2,
            is_bonus=False,
            contributor_wanted=False,
            prerequisites=("arrays-and-strings",),
            status="locked",
        ),
    ]
    nxt = recommend_next(nodes)
    assert nxt is not None
    assert nxt.slug == "arrays-and-strings"
