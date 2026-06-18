"""Tests for the document ingestion pipeline."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Document, DocumentChunk


@pytest.mark.asyncio
class TestRunIngestion:
    """Tests for app.services.ingestion.run_ingestion."""

    async def test_successful_ingestion(self, db: AsyncSession, make_user, make_org, make_kb, make_document):
        """Full pipeline: download → parse → split → embed → persist → mark ready."""
        user = await make_user()
        org = await make_org(user)
        kb = await make_kb(org)
        doc = await make_document(kb, filename="report.txt", file_type="txt", status="processing")

        fake_text = "This is a test document. " * 50  # ~1250 chars
        fake_embedding = [0.1] * 10

        with patch("app.services.ingestion.download_file", new=AsyncMock(return_value=fake_text.encode())), \
             patch("app.services.ingestion.get_embeddings") as mock_embed, \
             patch("app.services.ingestion._splitter") as mock_splitter:

            mock_splitter.split_text.return_value = [
                "chunk one text",
                "chunk two text",
                "chunk three text",
            ]
            mock_embed.return_value.aembed_documents = AsyncMock(
                side_effect=[[fake_embedding]] * 3
            )

            from app.services.ingestion import run_ingestion
            await run_ingestion(doc.id, db)

        await db.refresh(doc)
        assert doc.status == "ready"
        assert doc.chunk_count == 3
        assert doc.progress == 100

        result = await db.execute(
            select(DocumentChunk).where(DocumentChunk.document_id == doc.id)
        )
        chunks = result.scalars().all()
        assert len(chunks) == 3
        assert chunks[0].content == "chunk one text"
        assert chunks[1].chunk_index == 1
        assert chunks[2].kb_id == kb.id

    async def test_ingestion_missing_document(self, db: AsyncSession):
        """Ingestion should return silently for a non-existent document."""
        fake_id = uuid.uuid4()

        with patch("app.services.ingestion.download_file", new=AsyncMock()), \
             patch("app.services.ingestion.get_embeddings", new=MagicMock()), \
             patch("app.services.ingestion._splitter", new=MagicMock()):

            from app.services.ingestion import run_ingestion
            await run_ingestion(fake_id, db)

    async def test_ingestion_failure_marks_document_failed(
        self, db: AsyncSession, make_user, make_org, make_kb, make_document
    ):
        """When ingestion errors, the document status should be 'failed'."""
        user = await make_user()
        org = await make_org(user)
        kb = await make_kb(org)
        doc = await make_document(kb, filename="data.txt", file_type="txt", status="processing")

        with patch("app.services.ingestion.download_file", new=AsyncMock(side_effect=ConnectionError("network down"))), \
             patch("app.services.ingestion.get_embeddings", new=MagicMock()), \
             patch("app.services.ingestion._splitter", new=MagicMock()):

            from app.services.ingestion import run_ingestion
            with pytest.raises(ConnectionError):
                await run_ingestion(doc.id, db)

        await db.refresh(doc)
        assert doc.status == "failed"
        assert "network down" in doc.error_message

    async def test_ingestion_progress_updates(
        self, db: AsyncSession, make_user, make_org, make_kb, make_document
    ):
        """Progress should increase through the pipeline stages."""
        user = await make_user()
        org = await make_org(user)
        kb = await make_kb(org)
        doc = await make_document(kb, filename="notes.txt", file_type="txt", status="processing")

        progress_values: list[int] = []

        async def _capture_progress(document_id, progress, db_session):
            progress_values.append(progress)
            await db_session.execute(
                update(Document).where(Document.id == document_id).values(progress=progress)
            )
            await db_session.commit()

        fake_text = "Some text content for chunking."

        with patch("app.services.ingestion.download_file", new=AsyncMock(return_value=fake_text.encode())), \
             patch("app.services.ingestion.get_embeddings") as mock_embed, \
             patch("app.services.ingestion._splitter") as mock_splitter, \
             patch("app.services.ingestion._set_progress", side_effect=_capture_progress):

            mock_splitter.split_text.return_value = ["chunk"]
            mock_embed.return_value.aembed_documents = AsyncMock(return_value=[[0.1] * 10])

            from app.services.ingestion import run_ingestion
            await run_ingestion(doc.id, db)

        # Progress should be monotonically increasing
        for i in range(1, len(progress_values)):
            assert progress_values[i] >= progress_values[i - 1], \
                f"Progress decreased: {progress_values[i-1]} -> {progress_values[i]}"

    async def test_chunk_metadata_contains_filename(
        self, db: AsyncSession, make_user, make_org, make_kb, make_document
    ):
        """Each chunk's metadata should include the source filename."""
        user = await make_user()
        org = await make_org(user)
        kb = await make_kb(org)
        doc = await make_document(kb, filename="policy.txt", file_type="txt", status="processing")

        with patch("app.services.ingestion.download_file", new=AsyncMock(return_value=b"Policy content here.")), \
             patch("app.services.ingestion.get_embeddings") as mock_embed, \
             patch("app.services.ingestion._splitter") as mock_splitter:

            mock_splitter.split_text.return_value = ["policy chunk"]
            mock_embed.return_value.aembed_documents = AsyncMock(return_value=[[0.5] * 10])

            from app.services.ingestion import run_ingestion
            await run_ingestion(doc.id, db)

        result = await db.execute(
            select(DocumentChunk).where(DocumentChunk.document_id == doc.id)
        )
        chunk = result.scalars().first()
        assert chunk is not None
        assert chunk.metadata_["filename"] == "policy.txt"
        assert chunk.metadata_["chunk_index"] == 0
