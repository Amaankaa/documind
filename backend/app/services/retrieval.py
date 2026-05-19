from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.config import get_settings
from app.models import DocumentChunk, Document

settings = get_settings()

_embeddings = GoogleGenerativeAIEmbeddings(
    model=settings.embedding_model,
    google_api_key=settings.gemini_api_key,
    output_dimensionality=settings.embedding_dimensions,
)


@dataclass
class RetrievedChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    chunk_index: int
    content: str
    score: float


async def retrieve_top_chunks(
    question: str,
    kb_id: uuid.UUID,
    db: AsyncSession,
    top_k: int | None = None,
) -> list[RetrievedChunk]:
    """
    Embed the question and perform cosine similarity search
    against document_chunks scoped to kb_id.
    """
    k = top_k or settings.top_k_chunks
    query_embedding: list[float] = await _embeddings.aembed_query(question)

    # pgvector cosine distance (1 - cosine_similarity)
    stmt = text(
        """
        SELECT
            dc.id           AS chunk_id,
            dc.document_id,
            d.filename,
            dc.chunk_index,
            dc.content,
            1 - (dc.embedding <=> CAST(:embedding AS vector)) AS score
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE dc.kb_id = :kb_id
        ORDER BY dc.embedding <=> CAST(:embedding AS vector)
        LIMIT :k
        """
    )

    result = await db.execute(
        stmt,
        {
            "embedding": str(query_embedding),
            "kb_id": str(kb_id),
            "k": k,
        },
    )
    rows = result.fetchall()

    return [
        RetrievedChunk(
            chunk_id=row.chunk_id,
            document_id=row.document_id,
            filename=row.filename,
            chunk_index=row.chunk_index,
            content=row.content,
            score=float(row.score),
        )
        for row in rows
    ]
