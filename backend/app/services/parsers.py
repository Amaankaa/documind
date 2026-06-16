from __future__ import annotations

import io
import logging
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)


def parse_document(file_bytes: bytes, filename: str) -> str:
    """
    Parse raw file bytes into a plain-text string.
    Supports: PDF, DOCX, TXT, CSV
    """
    suffix = Path(filename).suffix.lower()

    if suffix == ".pdf":
        return _parse_pdf(file_bytes)
    elif suffix in (".docx", ".doc"):
        return _parse_docx(file_bytes)
    elif suffix in (".txt", ".md", ".markdown"):
        return file_bytes.decode("utf-8", errors="replace")
    elif suffix == ".csv":
        return _parse_csv(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


def _parse_pdf(data: bytes) -> str:
    import fitz  # PyMuPDF

    pages: list[str] = []
    blank_count = 0

    with fitz.open(stream=data, filetype="pdf") as doc:
        total_pages = len(doc)
        for page in doc:
            raw = page.get_text().strip()
            if not raw:
                blank_count += 1
                continue
            # Prefix each page's text with its page number so the LLM can cite accurately
            pages.append(f"[Page {page.number + 1}]\n{raw}")

    if blank_count > 0:
        logger.warning(
            "PDF had %d/%d blank pages (likely scanned/image pages with no extractable text)",
            blank_count,
            total_pages,
        )

    if not pages:
        raise ValueError(
            "No text could be extracted from this PDF. "
            "It appears to be a scanned document. Please use a text-based PDF."
        )

    return "\n\n".join(pages)


def _parse_docx(data: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def _parse_csv(data: bytes) -> str:
    df = pd.read_csv(io.BytesIO(data))
    # Convert every row to a readable key:value sentence for embedding
    rows: list[str] = []
    for _, row in df.iterrows():
        row_text = " | ".join(f"{col}: {val}" for col, val in row.items() if pd.notna(val))
        rows.append(row_text)
    return "\n".join(rows)


def parse_html(data: bytes) -> tuple[str, str]:
    """Extract a (title, plain-text) pair from a fetched web page.

    Drops boilerplate (scripts, styles, nav, header, footer, asides) and
    collapses whitespace so the result reads like a document body.
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(data, "lxml")

    for tag in soup(["script", "style", "noscript", "nav", "header", "footer", "aside", "form"]):
        tag.decompose()

    title = soup.title.get_text(strip=True) if soup.title else ""

    main = soup.find("main") or soup.find("article") or soup.body or soup
    lines = [line.strip() for line in main.get_text("\n").splitlines()]
    text = "\n".join(line for line in lines if line)

    if not text.strip():
        raise ValueError("No readable text could be extracted from this page.")

    return title, text
