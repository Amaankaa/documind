"""Tests for the LLM / RAG chain service."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.retrieval import RetrievedChunk


@pytest.mark.asyncio
class TestStreamRagResponse:
    """Tests for app.services.llm.stream_rag_response."""

    async def test_stream_yields_tokens(self):
        """The generator should yield string tokens from the LLM chain."""
        import uuid

        from app.services import llm as llm_module

        chunks = [
            RetrievedChunk(
                chunk_id=uuid.uuid4(),
                document_id=uuid.uuid4(),
                filename="handbook.pdf",
                chunk_index=0,
                content="The vacation policy allows 20 days per year.",
                score=0.95,
            )
        ]

        mock_chain_output = [
            MagicMock(content="The"),
            MagicMock(content=" vacation"),
            MagicMock(content=" policy"),
            MagicMock(content=" is 20 days."),
        ]

        mock_chain = MagicMock()

        async def _fake_astream(inputs):
            for item in mock_chain_output:
                yield item

        mock_chain.astream = _fake_astream

        mock_llm = MagicMock()
        mock_prompt = MagicMock()
        mock_prompt.__or__ = MagicMock(return_value=mock_chain)

        with patch.object(llm_module, "get_chat_llm", return_value=mock_llm), \
             patch.object(llm_module, "RAG_PROMPT", mock_prompt):
            tokens = []
            async for token in llm_module.stream_rag_response(
                "What is the vacation policy?",
                chunks,
                org_name="Acme Corp",
            ):
                tokens.append(token)

        assert len(tokens) == 4
        assert tokens[0] == "The"
        assert "".join(tokens) == "The vacation policy is 20 days."

    async def test_stream_with_empty_chunks(self):
        """When no chunks are retrieved, should still stream a response."""
        from app.services import llm as llm_module

        mock_chain_output = [
            MagicMock(content="I couldn't find that in the documents."),
        ]

        mock_chain = MagicMock()

        async def _fake_astream(inputs):
            assert "No relevant document content" in inputs["human_turn"]
            for item in mock_chain_output:
                yield item

        mock_chain.astream = _fake_astream

        mock_llm = MagicMock()
        mock_prompt = MagicMock()
        mock_prompt.__or__ = MagicMock(return_value=mock_chain)

        with patch.object(llm_module, "get_chat_llm", return_value=mock_llm), \
             patch.object(llm_module, "RAG_PROMPT", mock_prompt):
            tokens = []
            async for token in llm_module.stream_rag_response(
                "random question", [], org_name="Test"
            ):
                tokens.append(token)

        assert len(tokens) == 1

    async def test_stream_includes_history(self):
        """Conversation history should be passed to the chain."""
        from app.services import llm as llm_module

        captured_inputs: dict = {}

        mock_chain = MagicMock()

        async def _fake_astream(inputs):
            captured_inputs.update(inputs)
            yield MagicMock(content="Response")

        mock_chain.astream = _fake_astream

        history = [
            ("user", "What does the handbook say?"),
            ("assistant", "The handbook covers policies."),
        ]

        mock_llm = MagicMock()
        mock_prompt = MagicMock()
        mock_prompt.__or__ = MagicMock(return_value=mock_chain)

        with patch.object(llm_module, "get_chat_llm", return_value=mock_llm), \
             patch.object(llm_module, "RAG_PROMPT", mock_prompt):
            async for _ in llm_module.stream_rag_response(
                "Tell me more", [], history=history
            ):
                pass

        assert len(captured_inputs["history"]) == 2


class TestBuildContext:
    """Tests for the context builder helper."""

    def test_build_context_formats_chunks(self):
        import uuid
        from app.services.llm import _build_context

        chunks = [
            RetrievedChunk(
                chunk_id=uuid.uuid4(),
                document_id=uuid.uuid4(),
                filename="doc.pdf",
                chunk_index=0,
                content="First chunk content.",
                score=0.9,
            ),
            RetrievedChunk(
                chunk_id=uuid.uuid4(),
                document_id=uuid.uuid4(),
                filename="doc.pdf",
                chunk_index=1,
                content="Second chunk content.",
                score=0.8,
            ),
        ]

        result = _build_context(chunks)
        assert "[doc.pdf — chunk 0]" in result
        assert "First chunk content." in result
        assert "---" in result  # separator
        assert "[doc.pdf — chunk 1]" in result

    def test_build_context_empty(self):
        from app.services.llm import _build_context
        assert _build_context([]) == ""


class TestBuildHistory:
    """Tests for the history builder helper."""

    def test_build_history_creates_messages(self):
        from app.services.llm import _build_history
        from langchain_core.messages import AIMessage, HumanMessage

        raw = [("user", "Hello"), ("assistant", "Hi there!")]
        messages = _build_history(raw)

        assert len(messages) == 2
        assert isinstance(messages[0], HumanMessage)
        assert isinstance(messages[1], AIMessage)
        assert messages[0].content == "Hello"
        assert messages[1].content == "Hi there!"

    def test_build_history_empty(self):
        from app.services.llm import _build_history
        assert _build_history([]) == []
