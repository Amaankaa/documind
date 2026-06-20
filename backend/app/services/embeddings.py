"""Embedding client — delegates to llm_factory for provider selection."""
from __future__ import annotations

from app.services.llm_factory import get_embeddings

__all__ = ["get_embeddings"]
