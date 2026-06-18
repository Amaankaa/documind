"""Pure retrieval-quality metrics for the evaluation harness.

These functions are deliberately free of any DB or LLM dependency so they can
be unit-tested directly. They score retrieval at *document* granularity: the
retriever returns one row per chunk, but ground truth is labeled per document,
so we collapse retrieved chunks to their (rank-ordered, de-duplicated) document
ids before scoring.
"""
from __future__ import annotations

from collections.abc import Iterable


def dedupe_preserving_order(doc_ids: Iterable[str]) -> list[str]:
    """Collapse retrieved chunk doc-ids to unique docs, keeping first-seen rank."""
    seen: set[str] = set()
    ordered: list[str] = []
    for doc_id in doc_ids:
        if doc_id not in seen:
            seen.add(doc_id)
            ordered.append(doc_id)
    return ordered


def hit(relevant: set[str], retrieved_ranked: list[str]) -> bool:
    """True if any relevant document appears anywhere in the retrieved list."""
    return any(doc_id in relevant for doc_id in retrieved_ranked)


def reciprocal_rank(relevant: set[str], retrieved_ranked: list[str]) -> float:
    """1 / (rank of the first relevant document), or 0.0 if none retrieved.

    Rank is 1-based, so a relevant doc in the top slot scores 1.0.
    """
    for index, doc_id in enumerate(retrieved_ranked, start=1):
        if doc_id in relevant:
            return 1.0 / index
    return 0.0


def precision_at_k(relevant: set[str], retrieved_ranked: list[str]) -> float:
    """Fraction of retrieved documents that are relevant. 0.0 if nothing retrieved."""
    if not retrieved_ranked:
        return 0.0
    hits = sum(1 for doc_id in retrieved_ranked if doc_id in relevant)
    return hits / len(retrieved_ranked)


def mean(values: Iterable[float | None]) -> float | None:
    """Average of the non-None values, or None if there are none."""
    nums = [v for v in values if v is not None]
    if not nums:
        return None
    return sum(nums) / len(nums)
