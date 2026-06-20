"""LLM + embedding clients — Google Gemini direct or LaoZhang OpenAI-compatible proxy."""
from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from app.config import get_settings

if TYPE_CHECKING:
    from langchain_core.embeddings import Embeddings
    from langchain_core.language_models.chat_models import BaseChatModel

_chat_instances: dict[tuple[bool, float], BaseChatModel] = {}
_embeddings_instance: Embeddings | None = None


def get_chat_llm(*, streaming: bool = True, temperature: float = 1.0) -> BaseChatModel:
    """Return a chat model for the configured provider."""
    settings = get_settings()
    cache_key = (streaming, temperature)
    if cache_key in _chat_instances:
        return _chat_instances[cache_key]

    if settings.llm_provider == "laozhang":
        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(
            model=settings.chat_model,
            api_key=settings.laozhang_api_key,
            base_url=settings.laozhang_base_url,
            streaming=streaming,
            temperature=temperature,
        )
    else:
        from langchain_google_genai import ChatGoogleGenerativeAI

        llm = ChatGoogleGenerativeAI(
            model=settings.chat_model,
            google_api_key=settings.gemini_api_key,
            streaming=streaming,
            temperature=temperature,
        )

    _chat_instances[cache_key] = llm
    return llm


def get_embeddings() -> Embeddings:
    """Return an embedding client for the configured provider."""
    global _embeddings_instance
    if _embeddings_instance is not None:
        return _embeddings_instance

    settings = get_settings()
    if settings.llm_provider == "laozhang":
        from langchain_openai import OpenAIEmbeddings

        _embeddings_instance = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.laozhang_api_key,
            base_url=settings.laozhang_base_url,
            dimensions=settings.embedding_dimensions,
        )
    else:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        _embeddings_instance = GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
            google_api_key=settings.gemini_api_key,
            output_dimensionality=settings.embedding_dimensions,
        )

    return _embeddings_instance


def provider_label() -> Literal["gemini", "laozhang"]:
    return get_settings().llm_provider
