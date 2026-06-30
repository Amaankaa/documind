"""Tests for the RAG evaluation harness.

Covered on the SQLite harness:
  - pure retrieval metrics (eval_metrics) — no DB/LLM
  - judge-response parsing (clamping + safe fallback)
  - eval-set / case CRUD endpoints + tenant scoping
  - run orchestration (run_evaluation) with retrieval/answer/judge patched

NOT covered here (Postgres-only, like the analytics SQL): auto-generation
(`generate_eval_cases` uses `random()`) and the live pgvector retrieval path.
Those are exercised live, not on SQLite.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models import EvalCase, EvalResult, EvalRun, EvalSet
from app.services import eval_metrics
from app.services.evaluation import _parse_judge_json, judge_answer, run_evaluation
from app.services.user_llm_credentials import save_user_api_key
from app.services.retrieval import RetrievedChunk

# NOTE: no module-level asyncio mark — this file mixes pure-sync metric tests
# with async endpoint/orchestration tests. Async tests are decorated explicitly.
asyncio_test = pytest.mark.asyncio


# ── Pure retrieval metrics ────────────────────────────────────────────────────


def test_metrics_hit_and_miss():
    assert eval_metrics.hit({"a"}, ["b", "a", "c"]) is True
    assert eval_metrics.hit({"a"}, ["b", "c"]) is False
    assert eval_metrics.hit({"a"}, []) is False


def test_metrics_reciprocal_rank():
    assert eval_metrics.reciprocal_rank({"a"}, ["a", "b"]) == 1.0
    assert eval_metrics.reciprocal_rank({"a"}, ["b", "a"]) == 0.5
    assert eval_metrics.reciprocal_rank({"a"}, ["x", "y", "a"]) == pytest.approx(1 / 3)
    assert eval_metrics.reciprocal_rank({"a"}, ["x", "y"]) == 0.0


def test_metrics_precision_at_k():
    assert eval_metrics.precision_at_k({"a", "b"}, ["a", "b", "c", "d"]) == 0.5
    assert eval_metrics.precision_at_k({"a"}, []) == 0.0


def test_metrics_dedupe_and_mean():
    assert eval_metrics.dedupe_preserving_order(["a", "a", "b", "a", "c"]) == ["a", "b", "c"]
    assert eval_metrics.mean([1.0, 0.0, None]) == 0.5
    assert eval_metrics.mean([None, None]) is None
    assert eval_metrics.mean([]) is None


# ── Judge response parsing ────────────────────────────────────────────────────


def test_parse_judge_clamps_and_handles_fences():
    parsed = _parse_judge_json('```json\n{"groundedness": 1.4, "relevance": -0.2, "rationale": "ok"}\n```')
    assert parsed["groundedness"] == 1.0
    assert parsed["relevance"] == 0.0
    assert parsed["rationale"] == "ok"


def test_parse_judge_handles_prose_around_json():
    parsed = _parse_judge_json('Sure! {"groundedness": 0.5, "relevance": 0.75, "rationale": "x"} done')
    assert parsed["groundedness"] == 0.5
    assert parsed["relevance"] == 0.75


def test_parse_judge_falls_back_on_garbage():
    parsed = _parse_judge_json("not json at all")
    assert parsed == {"groundedness": 0.0, "relevance": 0.0, "rationale": "Unparseable judge response."}


@asyncio_test
async def test_judge_answer_uses_llm(monkeypatch):
    fake_llm = MagicMock()
    fake_llm.ainvoke = AsyncMock(
        return_value=MagicMock(content='{"groundedness": 0.9, "relevance": 0.8, "rationale": "good"}')
    )
    with patch("app.services.evaluation._judge_llm", return_value=fake_llm):
        out = await judge_answer("q", "a", "context", api_key="sk-test")
    assert out["groundedness"] == 0.9
    assert out["relevance"] == 0.8


# ── Eval-set / case CRUD + tenant scoping ─────────────────────────────────────


@asyncio_test
async def test_create_and_get_eval_set(client, make_user, make_org, make_kb, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.post(
            f"/api/kb/{kb.id}/eval-sets", json={"name": "Golden set"}, headers=headers
        )
        assert resp.status_code == 201
        set_id = resp.json()["id"]
        assert resp.json()["cases"] == []

        detail = await client.get(f"/api/eval-sets/{set_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["name"] == "Golden set"


@asyncio_test
async def test_add_list_delete_case(client, make_user, make_org, make_kb, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        created = await client.post(
            f"/api/kb/{kb.id}/eval-sets", json={"name": "S"}, headers=headers
        )
        set_id = created.json()["id"]

        add = await client.post(
            f"/api/eval-sets/{set_id}/cases",
            json={"question": "What is the refund policy?", "relevant_doc_ids": [str(uuid.uuid4())]},
            headers=headers,
        )
        assert add.status_code == 201
        case_id = add.json()["id"]
        assert add.json()["origin"] == "manual"

        listed = await client.get(f"/api/kb/{kb.id}/eval-sets", headers=headers)
        assert listed.json()[0]["case_count"] == 1

        deleted = await client.delete(f"/api/eval-sets/{set_id}/cases/{case_id}", headers=headers)
        assert deleted.status_code == 204

        detail = await client.get(f"/api/eval-sets/{set_id}", headers=headers)
    assert detail.json()["cases"] == []


@asyncio_test
async def test_eval_set_is_tenant_scoped(client, make_user, make_org, make_kb, mock_auth):
    owner = await make_user(clerk_id="clerk_owner", email="owner@test.com")
    owner_org = await make_org(owner=owner, slug="owner-org")
    owner_kb = await make_kb(org=owner_org)
    with mock_auth(clerk_id=owner.clerk_id, email=owner.email) as headers:
        created = await client.post(
            f"/api/kb/{owner_kb.id}/eval-sets", json={"name": "Private"}, headers=headers
        )
        set_id = created.json()["id"]

    intruder = await make_user(clerk_id="clerk_intruder", email="intruder@test.com")
    await make_org(owner=intruder, slug="intruder-org")
    with mock_auth(clerk_id=intruder.clerk_id, email=intruder.email) as headers:
        resp = await client.get(f"/api/eval-sets/{set_id}", headers=headers)
    assert resp.status_code == 404


@asyncio_test
async def test_run_requires_cases(client, db, make_user, make_org, make_kb, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    await save_user_api_key(db, user, api_key="sk-test-eval-byok-key")
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        created = await client.post(
            f"/api/kb/{kb.id}/eval-sets", json={"name": "Empty"}, headers=headers
        )
        set_id = created.json()["id"]
        resp = await client.post(f"/api/eval-sets/{set_id}/run", headers=headers)
    assert resp.status_code == 400


@asyncio_test
async def test_start_run_creates_pending_run(client, db, make_user, make_org, make_kb, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    await save_user_api_key(db, user, api_key="sk-test-eval-byok-key")
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        created = await client.post(
            f"/api/kb/{kb.id}/eval-sets", json={"name": "S"}, headers=headers
        )
        set_id = created.json()["id"]
        await client.post(
            f"/api/eval-sets/{set_id}/cases",
            json={"question": "q", "relevant_doc_ids": []},
            headers=headers,
        )
        # Don't actually dispatch to Celery/Redis in the test.
        with patch("app.routers.evaluation._dispatch_eval_run", return_value=None):
            resp = await client.post(f"/api/eval-sets/{set_id}/run", headers=headers)
    assert resp.status_code == 201
    assert resp.json()["status"] == "pending"
    assert resp.json()["num_cases"] == 1


@asyncio_test
async def test_run_requires_byok(client, make_user, make_org, make_kb, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        created = await client.post(
            f"/api/kb/{kb.id}/eval-sets", json={"name": "S"}, headers=headers
        )
        set_id = created.json()["id"]
        await client.post(
            f"/api/eval-sets/{set_id}/cases",
            json={"question": "q", "relevant_doc_ids": []},
            headers=headers,
        )
        resp = await client.post(f"/api/eval-sets/{set_id}/run", headers=headers)
    assert resp.status_code == 403
    assert "API key" in resp.json()["detail"]


@asyncio_test
async def test_analytics_eval_routes_require_auth(client):
    resp = await client.get(f"/api/eval-sets/{uuid.uuid4()}")
    assert resp.status_code in (401, 403)


# ── Run orchestration (retrieval/answer/judge patched) ────────────────────────


@asyncio_test
async def test_run_evaluation_scores_and_aggregates(db, make_user, make_org, make_kb):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)

    eval_set = EvalSet(kb_id=kb.id, name="Run set")
    db.add(eval_set)
    await db.flush()

    relevant_doc = uuid.uuid4()
    other_doc = uuid.uuid4()
    # Case 1: relevant doc will be retrieved at rank 1 (hit). Case 2: missed.
    db.add(EvalCase(eval_set_id=eval_set.id, question="q1", relevant_doc_ids=[str(relevant_doc)], origin="manual"))
    db.add(EvalCase(eval_set_id=eval_set.id, question="q2", relevant_doc_ids=[str(uuid.uuid4())], origin="manual"))
    run = EvalRun(eval_set_id=eval_set.id, status="pending", top_k=5, num_cases=2)
    db.add(run)
    await db.commit()
    await db.refresh(run)

    def fake_retrieve(question, kb_id, session, top_k):
        # q1 retrieves the relevant doc first; q2 retrieves only an unrelated doc.
        doc_id = relevant_doc if question == "q1" else other_doc
        return [
            RetrievedChunk(
                chunk_id=uuid.uuid4(),
                document_id=doc_id,
                filename="doc.pdf",
                chunk_index=0,
                content="some content",
                score=0.9,
            )
        ]

    judge_values = {"groundedness": 0.8, "relevance": 1.0, "rationale": "ok"}

    with (
        patch(
            "app.services.evaluation.get_user_api_key",
            new=AsyncMock(return_value="sk-test-eval-key"),
        ),
        patch("app.services.evaluation.retrieve_top_chunks", new=AsyncMock(side_effect=fake_retrieve)),
        patch("app.services.evaluation.answer_once", new=AsyncMock(return_value="an answer")),
        patch("app.services.evaluation.judge_answer", new=AsyncMock(return_value=judge_values)),
    ):
        await run_evaluation(run.id, db)

    await db.refresh(run)
    assert run.status == "completed"
    assert run.num_cases == 2
    assert run.hit_rate == 0.5  # one hit, one miss
    assert run.mrr == 0.5  # 1.0 (rank 1) and 0.0 averaged
    assert run.avg_groundedness == pytest.approx(0.8)
    assert run.avg_relevance == pytest.approx(1.0)

    results = (
        await db.execute(EvalResult.__table__.select().where(EvalResult.run_id == run.id))
    ).fetchall()
    assert len(results) == 2


@asyncio_test
async def test_run_evaluation_marks_failed_on_error(db, make_user, make_org, make_kb):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    eval_set = EvalSet(kb_id=kb.id, name="Boom set")
    db.add(eval_set)
    await db.flush()
    db.add(EvalCase(eval_set_id=eval_set.id, question="q", relevant_doc_ids=[], origin="manual"))
    run = EvalRun(eval_set_id=eval_set.id, status="pending", top_k=5, num_cases=1)
    db.add(run)
    await db.commit()
    await db.refresh(run)

    with (
        patch(
            "app.services.evaluation.get_user_api_key",
            new=AsyncMock(return_value="sk-test-eval-key"),
        ),
        patch(
            "app.services.evaluation.retrieve_top_chunks",
            new=AsyncMock(side_effect=RuntimeError("retrieval exploded")),
        ),
    ):
        await run_evaluation(run.id, db)

    await db.refresh(run)
    assert run.status == "failed"
    assert "retrieval exploded" in (run.error or "")
