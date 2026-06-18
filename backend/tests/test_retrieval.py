"""Tests for the vector retrieval service."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DocumentChunk


@pytest.mark.asyncio
class TestRetrieveTopChunks:
    """Tests for app.services.retrieval.retrieve_top_chunks.

    Since SQLite doesn't support pgvector, we test the retrieval
    interface by mocking the database execute call and verifying
    the data transformation logic.
    """

    async def test_retrieve_returns_chunks(self, db: AsyncSession, make_user, make_org, make_kb, make_document, make_chunk):
        """Retrieval should return RetrievedChunk objects with correct fields."""
        user = await make_user()
        org = await make_org(user)
        kb = await make_kb(org)
        doc = await make_document(kb, filename="manual.pdf")
        chunk1 = await make_chunk(doc, content="The return policy is 30 days.", chunk_index=0)
        chunk2 = await make_chunk(doc, content="Contact support at help@acme.com.", chunk_index=1)

        # Mock the embedding call and the raw SQL execution
        fake_embedding = [0.1] * 10

        mock_row_1 = MagicMock()
        mock_row_1.chunk_id = chunk1.id
        mock_row_1.document_id = doc.id
        mock_row_1.filename = "manual.pdf"
        mock_row_1.chunk_index = 0
        mock_row_1.content = "The return policy is 30 days."
        mock_row_1.score = 0.92

        mock_row_2 = MagicMock()
        mock_row_2.chunk_id = chunk2.id
        mock_row_2.document_id = doc.id
        mock_row_2.filename = "manual.pdf"
        mock_row_2.chunk_index = 1
        mock_row_2.content = "Contact support at help@acme.com."
        mock_row_2.score = 0.85

        mock_result = MagicMock()
        mock_result.fetchall.return_value = [mock_row_1, mock_row_2]

        with patch("app.services.retrieval.get_embeddings") as mock_embed:
            mock_embed.return_value.aembed_query = AsyncMock(return_value=fake_embedding)

            # Patch db.execute for the raw SQL query
            original_execute = db.execute

            async def _mock_execute(stmt, params=None):
                # If it's a text() query (the vector search), return our mock
                if hasattr(stmt, 'text') and 'dc.embedding' in str(stmt):
                    return mock_result
                return await original_execute(stmt, params)

            with patch.object(db, 'execute', side_effect=_mock_execute):
                from app.services.retrieval import retrieve_top_chunks
                results = await retrieve_top_chunks("return policy", kb.id, db)

        assert len(results) == 2
        assert results[0].filename == "manual.pdf"
        assert results[0].content == "The return policy is 30 days."
        assert results[0].score == 0.92
        assert results[1].chunk_index == 1

    async def test_retrieve_empty_kb(self, db: AsyncSession, make_user, make_org, make_kb):
        """Querying an empty KB should return no chunks."""
        user = await make_user()
        org = await make_org(user)
        kb = await make_kb(org)

        fake_embedding = [0.1] * 10

        mock_result = MagicMock()
        mock_result.fetchall.return_value = []

        with patch("app.services.retrieval.get_embeddings") as mock_embed:
            mock_embed.return_value.aembed_query = AsyncMock(return_value=fake_embedding)

            with patch.object(db, 'execute', return_value=mock_result):
                from app.services.retrieval import retrieve_top_chunks
                results = await retrieve_top_chunks("anything", kb.id, db)

        assert results == []

    async def test_retrieve_respects_top_k(self, db: AsyncSession, make_user, make_org, make_kb):
        """Custom top_k should be passed to the query LIMIT."""
        user = await make_user()
        org = await make_org(user)
        kb = await make_kb(org)

        fake_embedding = [0.1] * 10
        captured_params: dict = {}

        mock_result = MagicMock()
        mock_result.fetchall.return_value = []

        async def _capture_execute(stmt, params=None):
            if params and "k" in params:
                captured_params.update(params)
            return mock_result

        with patch("app.services.retrieval.get_embeddings") as mock_embed:
            mock_embed.return_value.aembed_query = AsyncMock(return_value=fake_embedding)

            with patch.object(db, 'execute', side_effect=_capture_execute):
                from app.services.retrieval import retrieve_top_chunks
                await retrieve_top_chunks("query", kb.id, db, top_k=3)

        assert captured_params.get("k") == 3
