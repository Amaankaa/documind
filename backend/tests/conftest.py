"""
Shared test configuration and fixtures for DocuMind backend tests.

Provides:
- An in-process async SQLite database (no PostgreSQL needed)
- Mock fixtures for Clerk auth, Supabase storage, and Gemini AI
- Factory helpers for creating test entities (users, orgs, KBs, documents)
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import Text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.types import TypeDecorator

# ─── Patch pgvector BEFORE any model import ──────────────────────────────────
# SQLite doesn't understand the pgvector Vector type.  We replace it with
# a JSON-serialized Text column so embeddings round-trip in tests.
import pgvector.sqlalchemy

_OrigVector = pgvector.sqlalchemy.Vector


class _FakeVector(TypeDecorator):
    """Drop-in replacement for pgvector.Vector that SQLite can handle."""

    impl = Text
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__()

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, list):
            return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            return json.loads(value)
        return value


pgvector.sqlalchemy.Vector = _FakeVector          # type: ignore[misc]

# Also patch the settings so module-level imports don't blow up
# trying to read .env secrets that aren't present in CI.
os.environ.setdefault("GEMINI_API_KEY", "fake-gemini-key")
os.environ.setdefault("CLERK_SECRET_KEY", "fake-clerk-key")
os.environ.setdefault("CLERK_JWKS_URL", "https://fake.clerk.dev/.well-known/jwks.json")
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "fake-supabase-key")
os.environ.setdefault("USE_LOCAL_STORAGE", "true")

# Now it's safe to import application code
from app.database import Base, get_db
from app.models import (
    Conversation,
    Document,
    DocumentChunk,
    KnowledgeBase,
    Message,
    Organization,
    User,
)


# ─── Event loop ──────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ─── In-memory SQLite async engine ───────────────────────────────────────────

_TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

_test_engine = create_async_engine(_TEST_DATABASE_URL, echo=False)
_TestSessionLocal = async_sessionmaker(
    bind=_test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(autouse=True)
async def _setup_db():
    """Create all tables before each test, drop after."""
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with _TestSessionLocal() as session:
        yield session


# ─── FastAPI test client with DB override ────────────────────────────────────

@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator:
    """Provide an httpx AsyncClient wired to the FastAPI app with mocked deps."""
    from httpx import ASGITransport, AsyncClient as HttpxAsyncClient

    # Patch module-level singletons that hit external services
    mock_embeddings_factory = MagicMock()
    patches = [
        patch("app.services.embeddings.get_embeddings", new=mock_embeddings_factory),
        patch("app.services.ingestion.get_embeddings", new=mock_embeddings_factory),
        patch("app.services.retrieval.get_embeddings", new=mock_embeddings_factory),
        patch("app.services.ingestion._splitter", new=MagicMock()),
    ]
    for p in patches:
        p.start()

    from app.main import app

    async def _override_db():
        yield db

    app.dependency_overrides[get_db] = _override_db

    transport = ASGITransport(app=app)
    async with HttpxAsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    for p in patches:
        p.stop()


# ─── Auth mock fixture ──────────────────────────────────────────────────────

@pytest.fixture
def mock_auth():
    """
    Context manager that patches Clerk JWT verification to return a fake payload.
    Usage:
        with mock_auth(clerk_id="user_abc", email="test@example.com") as headers:
            response = await client.get("/api/kb", headers=headers)
    """
    from contextlib import contextmanager

    @contextmanager
    def _mock(clerk_id: str = "clerk_test_user", email: str = "test@test.com"):
        payload = {
            "sub": clerk_id,
            "email": email,
            "email_addresses": [{"email_address": email}],
        }
        with patch("app.auth.verify_clerk_token", new=AsyncMock(return_value=payload)):
            yield {"Authorization": "Bearer fake-jwt-token"}

    return _mock


# ─── Entity factories ────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def make_user(db: AsyncSession):
    """Factory to create a User row."""
    async def _factory(
        clerk_id: str = "clerk_test_user",
        email: str = "test@test.com",
    ) -> User:
        user = User(clerk_id=clerk_id, email=email)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    return _factory


@pytest_asyncio.fixture
async def make_org(db: AsyncSession):
    """Factory to create an Organization row."""
    async def _factory(
        owner: User,
        name: str = "Test Org",
        slug: str = "test-org",
    ) -> Organization:
        org = Organization(name=name, slug=slug, owner_id=owner.id)
        db.add(org)
        await db.commit()
        await db.refresh(org)
        return org
    return _factory


@pytest_asyncio.fixture
async def make_kb(db: AsyncSession):
    """Factory to create a KnowledgeBase row."""
    async def _factory(
        org: Organization,
        name: str = "Test KB",
        description: str | None = "A test knowledge base",
    ) -> KnowledgeBase:
        kb = KnowledgeBase(org_id=org.id, name=name, description=description)
        db.add(kb)
        await db.commit()
        await db.refresh(kb)
        return kb
    return _factory


@pytest_asyncio.fixture
async def make_document(db: AsyncSession):
    """Factory to create a Document row."""
    async def _factory(
        kb: KnowledgeBase,
        filename: str = "test.pdf",
        file_type: str = "pdf",
        file_url: str = "https://storage.example.com/test.pdf",
        status: str = "ready",
        chunk_count: int | None = 5,
    ) -> Document:
        doc = Document(
            kb_id=kb.id,
            filename=filename,
            file_type=file_type,
            file_url=file_url,
            status=status,
            chunk_count=chunk_count,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc
    return _factory


@pytest_asyncio.fixture
async def make_chunk(db: AsyncSession):
    """Factory to create a DocumentChunk row (without real embedding)."""
    async def _factory(
        document: Document,
        content: str = "This is a test chunk of text.",
        chunk_index: int = 0,
    ) -> DocumentChunk:
        chunk = DocumentChunk(
            document_id=document.id,
            kb_id=document.kb_id,
            content=content,
            chunk_index=chunk_index,
            embedding=None,
            metadata_={"filename": document.filename, "chunk_index": chunk_index},
        )
        db.add(chunk)
        await db.commit()
        await db.refresh(chunk)
        return chunk
    return _factory


@pytest_asyncio.fixture
async def make_conversation(db: AsyncSession):
    """Factory to create a Conversation row."""
    async def _factory(
        kb: KnowledgeBase,
        user: User,
        title: str = "Test Conversation",
    ) -> Conversation:
        conv = Conversation(kb_id=kb.id, user_id=user.id, title=title)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv
    return _factory


@pytest_asyncio.fixture
async def make_message(db: AsyncSession):
    """Factory to create a Message row."""
    async def _factory(
        conversation: Conversation,
        role: str = "user",
        content: str = "Hello, this is a test message.",
        sources: list | None = None,
    ) -> Message:
        msg = Message(
            conversation_id=conversation.id,
            role=role,
            content=content,
            sources=sources,
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg
    return _factory
