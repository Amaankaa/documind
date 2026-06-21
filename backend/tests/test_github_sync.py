"""Tests for bundled community notes and sync."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.data.a2sv_github_resources import all_ingest_entries
from app.data.bundled_notes_loader import read_bundled_note


def test_bundled_notes_exist_for_authored_patterns():
    for slug in ("greedy", "bit-manipulation", "intervals"):
        entry = next(e for e in all_ingest_entries() if e.concept_slug == slug)
        assert entry.bundled_path is not None
        text = read_bundled_note(entry.bundled_path)
        assert text
        assert "## Practice questions" in text


def test_contributor_wanted_concepts_all_claimed():
    from app.data.interview_concepts import INTERVIEW_CONCEPTS

    wanted = {s.slug for s in INTERVIEW_CONCEPTS if s.contributor_wanted}
    assert wanted == set()


@pytest.mark.asyncio
async def test_sync_community_ingests_bundled_notes(db):
    from app.services.github_sync import sync_community_notes

    mock_settings = MagicMock()
    mock_settings.use_celery = False

    with patch("app.services.github_sync.upload_file", new=AsyncMock(side_effect=lambda b, f, **_: f"file:///{f}")):
        with patch("app.services.ingestion.run_ingestion", new=AsyncMock()):
            with patch("app.services.github_sync.get_settings", return_value=mock_settings):
                result = await sync_community_notes(db)

    assert result["bundled"] >= 3
    assert result["created"] + result["updated"] >= 3
