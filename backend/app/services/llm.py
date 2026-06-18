from __future__ import annotations

from typing import AsyncIterator

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.services.retrieval import RetrievedChunk

settings = get_settings()

SYSTEM_PROMPT = """\
You are a friendly, knowledgeable assistant for {org_name}. \
Your role is to help users explore and understand their uploaded documents.

Guidelines:
- Answer questions **exclusively** from the provided context documents. \
  Never use outside knowledge or invent information.
- When the context contains the answer, reply clearly and naturally. \
  Cite the source document in a conversational way \
  (e.g., "According to the Employee Handbook..." or "The policy document mentions...").
- When the context does **not** contain the answer, be honest and warm — \
  acknowledge the question, let the user know it isn't covered in the available documents, \
  and (when possible) suggest a related topic they could ask about instead. \
  Vary your phrasing; never repeat the same canned phrase every time.
- For conversational exchanges — greetings, follow-up clarifications, \
  questions about what was said earlier in this conversation — respond \
  naturally and briefly without requiring document evidence.
- Use the conversation history to understand follow-up questions, \
  pronoun references, and context from earlier in the chat.
- Keep your tone warm, clear, and professional. Be helpful, not robotic.
"""

RAG_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="history", optional=True),
        ("human", "{human_turn}"),
    ]
)


def _build_context(chunks: list[RetrievedChunk]) -> str:
    parts: list[str] = []
    for chunk in chunks:
        parts.append(f"[{chunk.filename} — chunk {chunk.chunk_index}]\n{chunk.content}")
    return "\n\n---\n\n".join(parts)


def _build_history(raw: list[tuple[str, str]]) -> list[BaseMessage]:
    messages: list[BaseMessage] = []
    for role, content in raw:
        if role == "user":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))
    return messages


async def stream_rag_response(
    question: str,
    chunks: list[RetrievedChunk],
    org_name: str = "your organization",
    history: list[tuple[str, str]] | None = None,
) -> AsyncIterator[str]:
    """Yields streamed token deltas from the LLM."""
    llm = ChatGoogleGenerativeAI(
        model=settings.chat_model,
        google_api_key=settings.gemini_api_key,
        streaming=True,
        temperature=1.0,
    )

    if chunks:
        context = _build_context(chunks)
        human_turn = (
            f"Context Documents:\n{context}\n\n"
            f"---\n"
            f"Question: {question}\n\n"
            f"Answer using only the context above."
        )
    else:
        human_turn = (
            f"[No relevant document content was found for this query.]\n\n"
            f"Question: {question}"
        )

    chain = RAG_PROMPT | llm

    async for chunk in chain.astream(
        {
            "org_name": org_name,
            "history": _build_history(history or []),
            "human_turn": human_turn,
        }
    ):
        yield chunk.content


def _build_human_turn(question: str, chunks: list[RetrievedChunk]) -> str:
    if chunks:
        context = _build_context(chunks)
        return (
            f"Context Documents:\n{context}\n\n"
            f"---\n"
            f"Question: {question}\n\n"
            f"Answer using only the context above."
        )
    return f"[No relevant document content was found for this query.]\n\nQuestion: {question}"


async def answer_once(
    question: str,
    chunks: list[RetrievedChunk],
    org_name: str = "your organization",
    history: list[tuple[str, str]] | None = None,
) -> str:
    """Non-streaming sibling of stream_rag_response — returns the full answer.

    Used by the evaluation harness, which needs the complete answer to judge
    rather than a token stream. Shares the same prompt and context builder so
    it evaluates the exact behaviour the live chat path produces.
    """
    llm = ChatGoogleGenerativeAI(
        model=settings.chat_model,
        google_api_key=settings.gemini_api_key,
        streaming=False,
        temperature=1.0,
    )
    chain = RAG_PROMPT | llm
    result = await chain.ainvoke(
        {
            "org_name": org_name,
            "history": _build_history(history or []),
            "human_turn": _build_human_turn(question, chunks),
        }
    )
    content = result.content
    return content if isinstance(content, str) else str(content)
