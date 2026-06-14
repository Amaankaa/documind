from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Users  (mirrored from Clerk)
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organizations: Mapped[list["Organization"]] = relationship(back_populates="owner")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user")


# ---------------------------------------------------------------------------
# Organizations  (tenants)
# ---------------------------------------------------------------------------
class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped["User"] = relationship(back_populates="organizations")
    knowledge_bases: Mapped[list["KnowledgeBase"]] = relationship(back_populates="organization")


# ---------------------------------------------------------------------------
# Knowledge Bases
# ---------------------------------------------------------------------------
class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_community: Mapped[bool] = mapped_column(Boolean, default=False)
    is_personal: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization: Mapped["Organization"] = relationship(back_populates="knowledge_bases")
    documents: Mapped[list["Document"]] = relationship(back_populates="knowledge_base")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="knowledge_base")


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kb_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String, nullable=False)
    file_type: Mapped[str] = mapped_column(String, nullable=False)  # pdf | docx | csv | txt
    file_url: Mapped[str] = mapped_column(String, nullable=False)
    # Optional link to an interview-pattern concept (AlgoMentor study map).
    concept_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("concepts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String, default="processing")  # processing | ready | failed
    progress: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    chunk_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    knowledge_base: Mapped["KnowledgeBase"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Document Chunks  (with pgvector embeddings)
# ---------------------------------------------------------------------------
class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kb_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    # pgvector column — 1536 dims for gemini-embedding-2-preview
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document: Mapped["Document"] = relationship(back_populates="chunks")


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------
class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kb_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    knowledge_base: Mapped["KnowledgeBase"] = relationship(back_populates="conversations")
    user: Mapped["User"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------
class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String, nullable=False)  # user | assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # [{doc_id, filename, chunk_index, excerpt}]
    sources: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


# ---------------------------------------------------------------------------
# API Keys  (programmatic access scoped to an organization)
# ---------------------------------------------------------------------------
class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    # First few characters of the key, shown in the UI to identify it.
    prefix: Mapped[str] = mapped_column(String, nullable=False)
    # SHA-256 hex digest of the full key — the raw key is never stored.
    key_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Feedback  (thumbs up / down on assistant messages)
# ---------------------------------------------------------------------------
class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    rating: Mapped[str] = mapped_column(String, nullable=False)  # positive | negative
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Evaluation harness
#
# Measures RAG quality along two axes:
#   - retrieval (deterministic: hit rate, MRR, precision@k vs. labeled docs)
#   - generation (Gemini LLM-as-judge: groundedness + answer relevance)
# An EvalSet holds labeled cases; an EvalRun executes them and stores
# per-case EvalResults plus aggregate metrics.
# ---------------------------------------------------------------------------
class EvalSet(Base):
    __tablename__ = "eval_sets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kb_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cases: Mapped[list["EvalCase"]] = relationship(
        back_populates="eval_set", cascade="all, delete-orphan"
    )
    runs: Mapped[list["EvalRun"]] = relationship(
        back_populates="eval_set", cascade="all, delete-orphan"
    )


class EvalCase(Base):
    __tablename__ = "eval_cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    eval_set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("eval_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    # Ground truth: document ids that *should* be retrieved (list of uuid strings).
    relevant_doc_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # For auto-generated cases, the chunk the question was written from.
    source_chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    origin: Mapped[str] = mapped_column(String, default="manual")  # auto | manual
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    eval_set: Mapped["EvalSet"] = relationship(back_populates="cases")


class EvalRun(Base):
    __tablename__ = "eval_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    eval_set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("eval_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String, default="pending")  # pending|running|completed|failed
    top_k: Mapped[int] = mapped_column(Integer, nullable=False)
    num_cases: Mapped[int] = mapped_column(Integer, default=0)
    # Aggregate metrics (null until the run completes).
    hit_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    mrr: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_precision: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_groundedness: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_relevance: Mapped[float | None] = mapped_column(Float, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    eval_set: Mapped["EvalSet"] = relationship(back_populates="runs")
    results: Mapped[list["EvalResult"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class EvalResult(Base):
    __tablename__ = "eval_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("eval_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("eval_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)  # snapshot
    generated_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    retrieved_doc_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    retrieved_chunk_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    retrieval_hit: Mapped[bool] = mapped_column(Boolean, default=False)
    reciprocal_rank: Mapped[float] = mapped_column(Float, default=0.0)
    precision_at_k: Mapped[float] = mapped_column(Float, default=0.0)
    groundedness: Mapped[float | None] = mapped_column(Float, nullable=True)
    relevance: Mapped[float | None] = mapped_column(Float, nullable=True)
    judge_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    run: Mapped["EvalRun"] = relationship(back_populates="results")


# ---------------------------------------------------------------------------
# AlgoMentor — interview concept DAG + per-user mastery
# ---------------------------------------------------------------------------
class Concept(Base):
    __tablename__ = "concepts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_bonus: Mapped[bool] = mapped_column(Boolean, default=False)
    contributor_wanted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    prerequisites: Mapped[list["ConceptEdge"]] = relationship(
        back_populates="concept",
        foreign_keys="ConceptEdge.concept_id",
        cascade="all, delete-orphan",
    )
    dependents: Mapped[list["ConceptEdge"]] = relationship(
        back_populates="prerequisite",
        foreign_keys="ConceptEdge.prerequisite_id",
    )


class ConceptEdge(Base):
    __tablename__ = "concept_edges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prerequisite_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    concept_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True
    )

    prerequisite: Mapped["Concept"] = relationship(
        back_populates="dependents", foreign_keys=[prerequisite_id]
    )
    concept: Mapped["Concept"] = relationship(
        back_populates="prerequisites", foreign_keys=[concept_id]
    )


class ConceptProgress(Base):
    __tablename__ = "concept_progress"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    concept_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # locked | available | in_progress | mastered
    status: Mapped[str] = mapped_column(String, nullable=False, default="available")
    hints_used: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    concept: Mapped["Concept"] = relationship()


class PracticeProblem(Base):
    __tablename__ = "practice_problems"
    __table_args__ = (
        UniqueConstraint("concept_id", "leetcode_slug", name="uq_practice_problem_slug"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    concept_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    leetcode_slug: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    concept: Mapped["Concept"] = relationship()
    submissions: Mapped[list["ProblemSubmission"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan"
    )


class ProblemSubmission(Base):
    __tablename__ = "problem_submissions"
    __table_args__ = (
        UniqueConstraint("user_id", "problem_id", name="uq_problem_submission"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("practice_problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    proof_url: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    problem: Mapped["PracticeProblem"] = relationship(back_populates="submissions")
