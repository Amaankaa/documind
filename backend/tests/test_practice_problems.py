"""Tests for practice problem verification and mastery gating."""
from __future__ import annotations

import pytest
from sqlalchemy import select

from app.models import Concept, PracticeProblem
from app.services.practice_problems import (
    extract_leetcode_problems,
    seed_practice_problems,
    verify_leetcode_proof,
)


SLIDING_WINDOW_MD = """
## Practice questions

1. [Maximum Average Subarray I — LeetCode 643](https://leetcode.com/problems/maximum-average-subarray-i/)
2. [Longest Substring Without Repeating Characters — LeetCode 3](https://leetcode.com/problems/longest-substring-without-repeating-characters/)
"""


def test_extract_leetcode_problems_from_markdown():
    problems = extract_leetcode_problems(SLIDING_WINDOW_MD)
    assert len(problems) == 2
    assert problems[0].leetcode_slug == "maximum-average-subarray-i"


def test_verify_leetcode_proof_accepts_submission_url():
    assert verify_leetcode_proof(
        "binary-search",
        "https://leetcode.com/problems/binary-search/submissions/1234567890/",
    )
    assert verify_leetcode_proof(
        "two-sum",
        "https://leetcode.com/problems/two-sum/submissions/2047069614/",
    )
    assert not verify_leetcode_proof(
        "binary-search",
        "https://leetcode.com/problems/binary-search/",
    )
    assert not verify_leetcode_proof(
        "binary-search",
        "https://leetcode.com/problems/two-sum/submissions/2047069614/",
    )
    assert not verify_leetcode_proof(
        "binary-search",
        "https://example.com/problems/binary-search/submissions/1/",
    )


@pytest.mark.asyncio
async def test_mastery_blocked_without_proof(client, db, make_user, mock_auth):
    from app.services.learning_path import seed_interview_concepts

    user = await make_user()
    await seed_interview_concepts(db)
    await seed_practice_problems(db)

    arrays = (
        await db.execute(select(Concept).where(Concept.slug == "arrays-and-strings"))
    ).scalar_one()
    problem = (
        await db.execute(
            select(PracticeProblem).where(PracticeProblem.concept_id == arrays.id).limit(1)
        )
    ).scalar_one()

    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        start = await client.patch(
            f"/api/study-map/concepts/{arrays.id}/progress",
            json={"status": "in_progress"},
            headers=headers,
        )
        assert start.status_code == 200

        blocked = await client.patch(
            f"/api/study-map/concepts/{arrays.id}/progress",
            json={"status": "mastered"},
            headers=headers,
        )
        assert blocked.status_code == 400
        assert "Verify" in blocked.json()["detail"]

        verify = await client.post(
            f"/api/study-map/concepts/{arrays.id}/problems/{problem.id}/verify",
            json={
                "proof_url": f"https://leetcode.com/problems/{problem.leetcode_slug}/submissions/1/",
            },
            headers=headers,
        )
        assert verify.status_code == 200
        assert verify.json()["verified"] is True


@pytest.mark.asyncio
async def test_study_map_includes_practice_problems(client, make_user, mock_auth):
    user = await make_user()

    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get("/api/study-map", headers=headers)

    assert resp.status_code == 200
    arrays = next(c for c in resp.json()["concepts"] if c["slug"] == "arrays-and-strings")
    assert len(arrays["practice_problems"]) >= 3
    assert arrays["mastery"]["required"] == 3
    assert arrays["mastery"]["verified"] == 0
