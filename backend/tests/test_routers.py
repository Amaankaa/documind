from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest


pytestmark = pytest.mark.asyncio


# ── Health ────────────────────────────────────────────────────────────────────


async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ── Org ──────────────────────────────────────────────────────────────────────


async def test_create_org(client, make_user, mock_auth):
    user = await make_user()
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.post(
            "/api/org",
            json={"name": "Acme", "slug": "acme"},
            headers=headers,
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Acme"
    assert data["slug"] == "acme"


async def test_create_org_invalid_slug(client, make_user, mock_auth):
    user = await make_user()
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.post(
            "/api/org",
            json={"name": "Acme", "slug": "Invalid Slug!"},
            headers=headers,
        )
    assert resp.status_code == 422


async def test_get_org(client, make_user, make_org, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get("/api/org", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == str(org.id)


# ── Knowledge Bases ──────────────────────────────────────────────────────────


async def test_create_kb(client, make_user, make_org, mock_auth):
    user = await make_user()
    await make_org(owner=user)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.post(
            "/api/kb",
            json={"name": "HR Docs", "description": "Policies"},
            headers=headers,
        )
    assert resp.status_code == 201
    assert resp.json()["name"] == "HR Docs"


async def test_list_kbs(client, make_user, make_org, make_kb, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    await make_kb(org=org, name="KB One")
    await make_kb(org=org, name="KB Two")
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get("/api/kb", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_delete_kb(client, make_user, make_org, make_kb, mock_auth):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.delete(f"/api/kb/{kb.id}", headers=headers)
    assert resp.status_code == 204


async def test_delete_kb_not_found(client, make_user, make_org, mock_auth):
    user = await make_user()
    await make_org(owner=user)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.delete(f"/api/kb/{uuid.uuid4()}", headers=headers)
    assert resp.status_code == 404


# ── Conversations (multi-tenancy) ───────────────────────────────────────────


async def test_list_conversations_org_scoped(
    client, make_user, make_org, make_kb, make_conversation, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    conv = await make_conversation(kb=kb, user=user)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get(f"/api/kb/{kb.id}/conversations", headers=headers)
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert str(conv.id) in ids


async def test_get_conversation_org_scoped(
    client, make_user, make_org, make_kb, make_conversation, make_message, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    conv = await make_conversation(kb=kb, user=user)
    await make_message(conversation=conv, role="user", content="Hello")
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get(f"/api/conversations/{conv.id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == str(conv.id)
    assert len(resp.json()["messages"]) == 1


async def test_delete_conversation_org_scoped(
    client, make_user, make_org, make_kb, make_conversation, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    conv = await make_conversation(kb=kb, user=user)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.delete(f"/api/conversations/{conv.id}", headers=headers)
    assert resp.status_code == 204


async def test_clear_all_conversation_history(
    client, make_user, make_org, make_kb, make_conversation, make_message, mock_auth
):
    """DELETE /api/conversations wipes the caller's whole history (convs +
    messages) and leaves nothing behind."""
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    for _ in range(3):
        conv = await make_conversation(kb=kb, user=user)
        await make_message(conversation=conv, role="user", content="hi")
        await make_message(conversation=conv, role="assistant", content="hello")

    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.delete("/api/conversations", headers=headers)
        assert resp.status_code == 204
        listed = await client.get("/api/conversations", headers=headers)
    assert listed.json() == []


async def test_clear_all_conversation_history_is_tenant_scoped(
    client, make_user, make_org, make_kb, make_conversation, mock_auth
):
    """Clearing history must not touch another tenant's conversations."""
    me = await make_user(clerk_id="clerk_me", email="me@test.com")
    my_org = await make_org(owner=me, slug="me-org")
    my_kb = await make_kb(org=my_org)
    await make_conversation(kb=my_kb, user=me)

    other = await make_user(clerk_id="clerk_other", email="other@test.com")
    other_org = await make_org(owner=other, slug="other-org")
    other_kb = await make_kb(org=other_org)
    other_conv = await make_conversation(kb=other_kb, user=other)

    with mock_auth(clerk_id=me.clerk_id, email=me.email) as headers:
        resp = await client.delete("/api/conversations", headers=headers)
    assert resp.status_code == 204

    # The other tenant's conversation is still there.
    with mock_auth(clerk_id=other.clerk_id, email=other.email) as headers:
        listed = await client.get("/api/conversations", headers=headers)
    ids = [c["id"] for c in listed.json()]
    assert str(other_conv.id) in ids


# ── Query ────────────────────────────────────────────────────────────────────


async def test_query_invalid_session_id(
    client, make_user, make_org, make_kb, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        with patch("app.routers.query.retrieve_top_chunks", new=AsyncMock(return_value=[])):
            with patch("app.routers.query.stream_rag_response") as mock_stream:
                async def _fake_stream(*args, **kwargs):
                    yield "Hello"
                mock_stream.return_value = _fake_stream()
                resp = await client.post(
                    f"/api/kb/{kb.id}/query",
                    json={"question": "test", "session_id": "not-a-uuid"},
                    headers=headers,
                )
    assert resp.status_code == 422


# ── Feedback ─────────────────────────────────────────────────────────────────


async def test_create_feedback(
    client, make_user, make_org, make_kb, make_conversation, make_message, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    conv = await make_conversation(kb=kb, user=user)
    msg = await make_message(conversation=conv, role="assistant", content="Answer")
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.post(
            f"/api/kb/{kb.id}/feedback",
            json={"message_id": str(msg.id), "rating": "positive"},
            headers=headers,
        )
    assert resp.status_code == 201
    assert resp.json()["status"] == "ok"


async def test_create_feedback_upsert(
    client, make_user, make_org, make_kb, make_conversation, make_message, mock_auth
):
    """A second vote updates the existing rating (👍 → 👎) instead of 409-ing."""
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
        resp = await client.post(
            f"/api/kb/{kb.id}/feedback",
            json={"message_id": str(msg.id), "rating": "negative"},
            headers=headers,
        )
    assert resp.status_code == 201

    # The conversation detail should now reflect the updated rating, and only
    # one feedback row should exist for this (user, message).
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        detail = await client.get(f"/api/conversations/{conv.id}", headers=headers)
    assert detail.status_code == 200
    answer_msg = next(m for m in detail.json()["messages"] if m["id"] == str(msg.id))
    assert answer_msg["feedback"] == "negative"


async def test_create_feedback_message_not_found(
    client, make_user, make_org, make_kb, mock_auth
):
    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.post(
            f"/api/kb/{kb.id}/feedback",
            json={"message_id": str(uuid.uuid4()), "rating": "positive"},
            headers=headers,
        )
    assert resp.status_code == 404
