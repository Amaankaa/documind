from __future__ import annotations

from typing import TYPE_CHECKING

from app.config import get_settings

if TYPE_CHECKING:
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

_embeddings_instance: GoogleGenerativeAIEmbeddings | None = None


def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    global _embeddings_instance
    if _embeddings_instance is None:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        settings = get_settings()
        _embeddings_instance = GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
            google_api_key=settings.gemini_api_key,
            output_dimensionality=settings.embedding_dimensions,
        )
    return _embeddings_instance
