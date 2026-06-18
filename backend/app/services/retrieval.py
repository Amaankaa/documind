from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import DocumentChunk, Document
from app.services.embeddings import get_embeddings

settings = get_settings()


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
    *,
    extra_kb_ids: list[uuid.UUID] | None = None,
) -> list[RetrievedChunk]:
    """
    Embed the question and perform cosine similarity search
    against document_chunks scoped to one or more knowledge bases.
    """
    kb_ids = [kb_id]
    if extra_kb_ids:
        for extra in extra_kb_ids:
            if extra != kb_id and extra not in kb_ids:
                kb_ids.append(extra)
    return await retrieve_top_chunks_for_kbs(question, kb_ids, db, top_k=top_k)


async def retrieve_top_chunks_for_kbs(
    question: str,
    kb_ids: list[uuid.UUID],
    db: AsyncSession,
    top_k: int | None = None,
    *,
    concept_id: uuid.UUID | None = None,
) -> list[RetrievedChunk]:
    if not kb_ids:
        return []

    chunks = await _retrieve_top_chunks_for_kbs(
        question, kb_ids, db, top_k=top_k, concept_id=concept_id
    )
    if concept_id and not chunks:
        chunks = await _retrieve_top_chunks_for_kbs(
            question, kb_ids, db, top_k=top_k, concept_id=None
        )
    return chunks


async def _retrieve_top_chunks_for_kbs(
    question: str,
    kb_ids: list[uuid.UUID],
    db: AsyncSession,
    top_k: int | None = None,
    *,
    concept_id: uuid.UUID | None = None,
) -> list[RetrievedChunk]:
    if not kb_ids:
        return []

    k = top_k or settings.top_k_chunks
    query_embedding: list[float] = await get_embeddings().aembed_query(question)

    if len(kb_ids) == 1:
        kb_filter = "dc.kb_id = :kb_id"
        params: dict = {"kb_id": str(kb_ids[0])}
    else:
        placeholders = ", ".join(f":kb_{i}" for i in range(len(kb_ids)))
        kb_filter = f"dc.kb_id IN ({placeholders})"
        params = {f"kb_{i}": str(kid) for i, kid in enumerate(kb_ids)}

    concept_filter = ""
    if concept_id is not None:
        concept_filter = "AND d.concept_id = CAST(:concept_id AS uuid)"

    stmt = text(
        f"""
        SELECT
            dc.id           AS chunk_id,
            dc.document_id,
            d.filename,
            dc.chunk_index,
            dc.content,
            1 - (dc.embedding <=> CAST(:embedding AS vector)) AS score
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE {kb_filter}
        {concept_filter}
        ORDER BY dc.embedding <=> CAST(:embedding AS vector)
        LIMIT :k
        """
    )

    bind = {
        "embedding": str(query_embedding),
        **params,
        "k": k,
    }
    if concept_id is not None:
        bind["concept_id"] = str(concept_id)

    result = await db.execute(stmt, bind)
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
