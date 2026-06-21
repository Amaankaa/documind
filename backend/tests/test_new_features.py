"""Tests for the features added on top of the core RAG pipeline:

- API keys (issue / list / revoke) and programmatic auth on the query endpoint
- Citation deep-view (chunk context endpoint)
- URL ingestion with an SSRF guard
- Feedback toggle (delete) and per-message feedback persistence
- Analytics endpoint auth protection

The analytics *aggregation* itself relies on PostgreSQL-only SQL
(generate_series, json_array_elements, FILTER), so on the SQLite test harness
we only assert that the endpoint is auth-protected, not its computed payload.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.auth import hash_api_key
from app.models import ApiKey, Feedback

pytestmark = pytest.mark.asyncio


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _make_api_key(db, org, raw_key: str = "dm_test_secret_key", name: str = "ci") -> ApiKey:
    key = ApiKey(
        org_id=org.id,
        name=name,
        prefix=raw_key[:11],
        key_hash=hash_api_key(raw_key),
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return key


def _patch_query_pipeline():
    """Patch retrieval + LLM streaming so the query endpoint runs without
    external services."""
    async def _fake_stream(*args, **kwargs):
        yield "Hello"

    return (
        patch("app.routers.query.retrieve_top_chunks_for_kbs", new=AsyncMock(return_value=[])),
        patch("app.routers.query.stream_rag_response", return_value=_fake_stream()),
    )


# ── API keys: CRUD ───────────────────────────────────────────────────────────


async def test_create_api_key_returns_secret_once(client, make_user, make_org, mock_auth):
    user = await make_user()
    await make_org(owner=user)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.post("/api/api-keys", json={"name": "Prod"}, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["key"].startswith("dm_")
    assert data["name"] == "Prod"
    assert data["prefix"] == data["key"][:11]


async def test_list_api_keys_hides_secret(client, db, make_user, make_org, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    await _make_api_key(db, org, raw_key="dm_listed_key", name="listed")
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get("/api/api-keys", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["name"] == "listed"
    assert "key" not in items[0]  # raw secret must never be returned on list


async def test_revoke_api_key(client, db, make_user, make_org, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    key = await _make_api_key(db, org, raw_key="dm_to_revoke")
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.delete(f"/api/api-keys/{key.id}", headers=headers)
        assert resp.status_code == 204
        listed = await client.get("/api/api-keys", headers=headers)
    assert listed.json() == []  # revoked keys are filtered out


# ── API keys: programmatic auth on the query endpoint ────────────────────────


async def test_query_with_valid_api_key(client, db, make_user, make_org, make_kb):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    await _make_api_key(db, org, raw_key="dm_valid_key")

    p_retrieve, p_stream = _patch_query_pipeline()
    with p_retrieve, p_stream:
        resp = await client.post(
            f"/api/kb/{kb.id}/query",
            json={"question": "What is this?"},
            headers={"X-API-Key": "dm_valid_key"},
        )
    assert resp.status_code == 200


async def test_query_with_invalid_api_key_rejected(client, make_user, make_org, make_kb):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    resp = await client.post(
        f"/api/kb/{kb.id}/query",
        json={"question": "What is this?"},
        headers={"X-API-Key": "dm_does_not_exist"},
    )
    assert resp.status_code == 401


async def test_query_with_revoked_api_key_rejected(client, db, make_user, make_org, make_kb):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    key = await _make_api_key(db, org, raw_key="dm_revoked_key")
    from sqlalchemy import func, update

    await db.execute(update(ApiKey).where(ApiKey.id == key.id).values(revoked_at=func.now()))
    await db.commit()

    resp = await client.post(
        f"/api/kb/{kb.id}/query",
        json={"question": "What is this?"},
        headers={"X-API-Key": "dm_revoked_key"},
    )
    assert resp.status_code == 401


async def test_query_without_any_auth_rejected(client, make_user, make_org, make_kb):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    resp = await client.post(
        f"/api/kb/{kb.id}/query",
        json={"question": "What is this?"},
    )
    assert resp.status_code in (401, 403)


# ── Citation deep-view: chunk context ────────────────────────────────────────


async def test_chunk_context_returns_neighbors(
    client, make_user, make_org, make_kb, make_document, make_chunk, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    doc = await make_document(kb=kb)
    for i in range(5):
        await make_chunk(document=doc, content=f"chunk {i}", chunk_index=i)

    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get(
            f"/api/kb/{kb.id}/documents/{doc.id}/context",
            params={"chunk_index": 2, "window": 1},
            headers=headers,
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["target_index"] == 2
    indices = [c["chunk_index"] for c in data["chunks"]]
    assert indices == [1, 2, 3]  # target plus one neighbour on each side


async def test_chunk_context_document_not_found(
    client, make_user, make_org, make_kb, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get(
            f"/api/kb/{kb.id}/documents/{uuid.uuid4()}/context",
            params={"chunk_index": 0},
            headers=headers,
        )
    assert resp.status_code == 404


# ── URL ingestion: SSRF guard ────────────────────────────────────────────────


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/admin",
        "http://127.0.0.1:8000/",
        "http://169.254.169.254/latest/meta-data/",  # cloud metadata
        "http://10.0.0.5/internal",
        "http://192.168.1.1/",
    ],
)
async def test_url_ingestion_blocks_non_public_targets(
    client, make_user, make_org, make_kb, mock_auth, url
):
    """The SSRF guard rejects private/loopback/link-local targets with 400."""
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.post(
            f"/api/kb/{kb.id}/documents/url",
            json={"url": url},
            headers=headers,
        )
    assert resp.status_code == 400


async def test_url_ingestion_rejects_non_http_scheme(
    client, make_user, make_org, make_kb, mock_auth
):
    """Non-http(s) schemes are rejected by HttpUrl validation (422)."""
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.post(
            f"/api/kb/{kb.id}/documents/url",
            json={"url": "ftp://example.com/file"},
            headers=headers,
        )
    assert resp.status_code == 422


async def test_url_ingestion_accepts_public_url(
    client, make_user, make_org, make_kb, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    # 8.8.8.8 is a public address (passes the SSRF guard); patch dispatch so no
    # Celery/network work runs during the test.
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        with patch("app.routers.documents._dispatch_ingestion", return_value=None):
            resp = await client.post(
                f"/api/kb/{kb.id}/documents/url",
                json={"url": "http://8.8.8.8/page"},
                headers=headers,
            )
    assert resp.status_code == 201
    assert resp.json()["file_type"] == "url"


# ── Feedback: persistence + toggle (delete) ──────────────────────────────────


async def test_conversation_returns_feedback_for_caller(
    client, make_user, make_org, make_kb, make_conversation, make_message, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    conv = await make_conversation(kb=kb, user=user)
    msg = await make_message(conversation=conv, role="assistant", content="Answer")
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        await client.post(
            f"/api/kb/{kb.id}/feedback",
            json={"message_id": str(msg.id), "rating": "positive"},
            headers=headers,
        )
        resp = await client.get(f"/api/conversations/{conv.id}", headers=headers)
    assert resp.status_code == 200
    answer = next(m for m in resp.json()["messages"] if m["id"] == str(msg.id))
    assert answer["feedback"] == "positive"


async def test_delete_feedback_clears_vote(
    client, db, make_user, make_org, make_kb, make_conversation, make_message, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    conv = await make_conversation(kb=kb, user=user)
    msg = await make_message(conversation=conv, role="assistant", content="Answer")
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        await client.post(
            f"/api/kb/{kb.id}/feedback",
            json={"message_id": str(msg.id), "rating": "positive"},
            headers=headers,
        )
        resp = await client.delete(f"/api/kb/{kb.id}/feedback/{msg.id}", headers=headers)
        assert resp.status_code == 204

        detail = await client.get(f"/api/conversations/{conv.id}", headers=headers)
    answer = next(m for m in detail.json()["messages"] if m["id"] == str(msg.id))
    assert answer["feedback"] is None

    remaining = await db.execute(
        Feedback.__table__.select().where(Feedback.message_id == msg.id)
    )
    assert remaining.first() is None


async def test_delete_feedback_idempotent_when_absent(
    client, make_user, make_org, make_kb, make_conversation, make_message, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    conv = await make_conversation(kb=kb, user=user)
    msg = await make_message(conversation=conv, role="assistant", content="Answer")
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.delete(f"/api/kb/{kb.id}/feedback/{msg.id}", headers=headers)
    assert resp.status_code == 204  # no-op delete still succeeds


# ── Analytics: auth protection (aggregation needs PostgreSQL) ─────────────────


async def test_analytics_requires_auth(client):
    resp = await client.get("/api/org/analytics")
    assert resp.status_code in (401, 403)
