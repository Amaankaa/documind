from __future__ import annotations

import logging
import uuid

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Document, DocumentChunk
from app.services.parsers import parse_document
from app.services.storage import download_file

logger = logging.getLogger(__name__)
settings = get_settings()

_embeddings = GoogleGenerativeAIEmbeddings(
    model=settings.embedding_model,
    google_api_key=settings.gemini_api_key,
    output_dimensionality=settings.embedding_dimensions,
)

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.chunk_size,
    chunk_overlap=settings.chunk_overlap,
    length_function=len,
)

# Progress checkpoints (approximate % at the end of each named stage)
_STAGE_DOWNLOAD = 10
_STAGE_PARSE    = 25
_STAGE_SPLIT    = 35
# Embedding runs from 35 → 90 proportionally across chunks
_STAGE_EMBED_END = 90
_STAGE_PERSIST  = 95
_STAGE_DONE     = 100


async def _set_progress(document_id: uuid.UUID, progress: int, db: AsyncSession) -> None:
    await db.execute(
        update(Document)
        .where(Document.id == document_id)
        .values(progress=progress)
    )
    await db.commit()


async def run_ingestion(document_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Full ingestion pipeline:
      1. Download raw file from storage
      2. Parse to text
      3. Split into chunks
      4. Embed each chunk
      5. Persist DocumentChunk rows
      6. Update document status → ready
    """
    doc: Document | None = await db.get(Document, document_id)
    if doc is None:
        logger.error("Document %s not found — skipping ingestion", document_id)
        return

    try:
        # 1. Download
        file_bytes = await download_file(doc.file_url)
        await _set_progress(document_id, _STAGE_DOWNLOAD, db)

        # 2. Parse
        text = parse_document(file_bytes, doc.filename)
        await _set_progress(document_id, _STAGE_PARSE, db)

        # 3. Split
        chunks: list[str] = _splitter.split_text(text)
        logger.info("Document %s split into %d chunks", document_id, len(chunks))
        await _set_progress(document_id, _STAGE_SPLIT, db)

        # 4. Embed one chunk at a time, reporting proportional progress
        embeddings: list[list[float]] = []
        embed_range = _STAGE_EMBED_END - _STAGE_SPLIT
        last_reported = _STAGE_SPLIT

        for i, chunk_text in enumerate(chunks):
            batch = await _embeddings.aembed_documents([chunk_text])
            embeddings.extend(batch)

            # Throttle DB writes: only update when progress crosses a whole integer
            pct = _STAGE_SPLIT + round(embed_range * (i + 1) / max(len(chunks), 1))
            if pct > last_reported:
                await _set_progress(document_id, pct, db)
                last_reported = pct

        if len(embeddings) != len(chunks):
            raise ValueError(
                f"Embedding count mismatch: expected {len(chunks)}, got {len(embeddings)}"
            )

        # 5. Persist chunks
        chunk_rows: list[DocumentChunk] = []
        for idx, (content, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_rows.append(
                DocumentChunk(
                    document_id=doc.id,
                    kb_id=doc.kb_id,
                    content=content,
                    chunk_index=idx,
                    embedding=embedding,
                    metadata_={"filename": doc.filename, "chunk_index": idx},
                )
            )
        db.add_all(chunk_rows)
        await db.commit()
        await _set_progress(document_id, _STAGE_PERSIST, db)

        # 6. Mark ready
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(status="ready", progress=_STAGE_DONE, chunk_count=len(chunk_rows))
        )
        await db.commit()
        logger.info("Ingestion complete for document %s (%d chunks)", document_id, len(chunk_rows))

    except Exception as exc:
        logger.exception("Ingestion failed for document %s", document_id)
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(status="failed", error_message=str(exc))
        )
        await db.commit()
        raise
