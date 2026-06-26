"""Tests for BYOK tutor API keys and free-tier daily limits."""
from __future__ import annotations

import pytest

from app.services.user_llm_credentials import encrypt_api_key, save_user_api_key


@pytest.mark.asyncio
async def test_llm_key_status_unconfigured(client, make_user, mock_auth):
    user = await make_user()
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        resp = await client.get("/api/me/llm-key", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is False
    assert data["using_own_key"] is False
    assert data["questions_daily_limit"] == 3


@pytest.mark.asyncio
async def test_save_and_remove_llm_key(client, make_user, mock_auth):
    user = await make_user()
    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        save = await client.put(
            "/api/me/llm-key",
            json={"api_key": "sk-test-user-laozhang-key-12345"},
            headers=headers,
        )
        assert save.status_code == 200
        assert save.json()["configured"] is True
        assert save.json()["using_own_key"] is True
        assert save.json()["questions_daily_limit"] is None
        assert "2345" in save.json()["key_hint"]

        status = await client.get("/api/me/llm-key", headers=headers)
        assert status.json()["configured"] is True

        delete = await client.delete("/api/me/llm-key", headers=headers)
        assert delete.status_code == 204

        status2 = await client.get("/api/me/llm-key", headers=headers)
        assert status2.json()["configured"] is False


@pytest.mark.asyncio
async def test_encrypt_roundtrip():
    raw = "sk-roundtrip-test-key"
    assert encrypt_api_key(raw) != raw


@pytest.mark.asyncio
async def test_byok_skips_daily_limit(
    client, db, make_user, make_org, make_kb, mock_auth, monkeypatch
):
    from unittest.mock import AsyncMock

    from app.routers import query as query_module

    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)

    await save_user_api_key(db, user, api_key="sk-byok-unlimited-key-99")

    async def _fake_stream(*_args, **_kwargs):
        yield "hint"

    monkeypatch.setattr(query_module, "stream_rag_response", _fake_stream)
    monkeypatch.setattr(
        query_module,
        "retrieve_top_chunks_for_kbs",
        AsyncMock(return_value=[]),
    )

    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        for _ in range(4):
            resp = await client.post(
                f"/api/kb/{kb.id}/query",
                json={"question": "test byok"},
                headers=headers,
            )
            assert resp.status_code == 200, resp.text


@pytest.mark.asyncio
async def test_free_tier_daily_limit(
    client, db, make_user, make_org, make_kb, mock_auth, monkeypatch
):
    from unittest.mock import AsyncMock

    from app.routers import query as query_module

    user = await make_user()
    org = await make_org(owner=user)
    kb = await make_kb(org=org)

    async def _fake_stream(*_args, **_kwargs):
        yield "ok"

    monkeypatch.setattr(query_module, "stream_rag_response", _fake_stream)
    monkeypatch.setattr(
        query_module,
        "retrieve_top_chunks_for_kbs",
        AsyncMock(return_value=[]),
    )

    with mock_auth(clerk_id=user.clerk_id, email=user.email) as headers:
        for i in range(3):
            resp = await client.post(
                f"/api/kb/{kb.id}/query",
                json={"question": f"q{i}"},
                headers=headers,
            )
            assert resp.status_code == 200

        blocked = await client.post(
            f"/api/kb/{kb.id}/query",
            json={"question": "one too many"},
            headers=headers,
        )
        assert blocked.status_code == 429
        assert "Settings" in blocked.json()["detail"]
