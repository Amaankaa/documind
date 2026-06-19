from __future__ import annotations

from typing import AsyncIterator

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.services.llm_factory import get_chat_llm
from app.services.retrieval import RetrievedChunk

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

SOCRATIC_TUTOR_PROMPT = """\
You are AlgoMentor — a Socratic DSA interview tutor helping a student study \
**{concept_title}** for big-tech coding interviews.

Your job is to teach thinking, not to hand out full solutions.

Guidelines:
- Ground hints in the provided community notes and context documents when available.
- Ask guiding questions before revealing the next step. Prefer "What invariant can \
  you maintain?" over dumping the algorithm.
- Never paste a complete LeetCode solution or full working code unless the student \
  has explicitly struggled through at least two hints and asks for a nudge on a \
  specific line.
- If they ask for the answer outright, redirect: offer a smaller hint, a pattern \
  reminder, or a sanity-check question.
- Keep responses concise (2–4 short paragraphs max). Use bullet steps only when \
  outlining an approach at a high level.
- Reference time/space complexity when it helps cement the pattern.
- Encourage them to try a concrete example on paper before coding.
- Tone: supportive peer who did A2SV-style prep, not a lecturing professor.
"""

RAG_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="history", optional=True),
        ("human", "{human_turn}"),
    ]
)

TUTOR_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", SOCRATIC_TUTOR_PROMPT),
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
    *,
    tutor_mode: bool = False,
    concept_title: str | None = None,
) -> AsyncIterator[str]:
    """Yields streamed token deltas from the LLM."""
    llm = get_chat_llm(streaming=True, temperature=1.0)

    if chunks:
        context = _build_context(chunks)
        human_turn = (
            f"Context Documents:\n{context}\n\n"
            f"---\n"
            f"Question: {question}\n\n"
            f"Answer using the context above."
        )
    else:
        human_turn = (
            f"[No relevant document content was found for this query.]\n\n"
            f"Question: {question}"
        )

    prompt = TUTOR_PROMPT if tutor_mode and concept_title else RAG_PROMPT
    chain = prompt | llm

    payload: dict = {
        "history": _build_history(history or []),
        "human_turn": human_turn,
    }
    if tutor_mode and concept_title:
        payload["concept_title"] = concept_title
    else:
        payload["org_name"] = org_name

    async for chunk in chain.astream(payload):
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
    llm = get_chat_llm(streaming=False, temperature=1.0)
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
