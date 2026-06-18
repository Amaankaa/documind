"""Evaluation harness orchestration.

Three responsibilities:
  - generate_eval_cases: write synthetic-ground-truth questions from a KB's own
    document chunks (Gemini), labeling each with its source document.
  - judge_answer: score one answer for groundedness + relevance via an
    LLM-as-judge (Gemini), returning a robustly-parsed, clamped result.
  - run_evaluation: execute every case in a set — retrieve, answer, judge,
    persist per-case results, and roll up aggregate metrics onto the run.

The retrieval metrics themselves live in eval_metrics.py (pure functions).
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import EvalCase, EvalResult, EvalRun, EvalSet
from app.services import eval_metrics
from app.services.llm import answer_once
from app.services.retrieval import retrieve_top_chunks

settings = get_settings()


# ── LLM-as-judge ──────────────────────────────────────────────────────────────

_judge_llm = None


def _get_judge_llm():
    """Lazily build a deterministic (temp 0) Gemini client for judging.

    Isolated in a factory so tests can patch it without importing LangChain.
    """
    global _judge_llm
    if _judge_llm is None:
        from langchain_google_genai import ChatGoogleGenerativeAI

        _judge_llm = ChatGoogleGenerativeAI(
            model=settings.chat_model,
            google_api_key=settings.gemini_api_key,
            temperature=0.0,
        )
    return _judge_llm


_JUDGE_PROMPT = """\
You are a strict evaluator of a retrieval-augmented answer. You are given the \
user's QUESTION, the CONTEXT passages that were retrieved, and the ANSWER the \
system produced. Score the ANSWER on two axes from 0.0 to 1.0:

- groundedness: Is every factual claim in the ANSWER directly supported by the \
CONTEXT? 1.0 = fully supported; 0.0 = contradicted or fabricated (hallucinated). \
If the ANSWER correctly says the information isn't in the documents and the \
CONTEXT indeed lacks it, that is well-grounded (high score).
- relevance: Does the ANSWER actually address the QUESTION? 1.0 = directly and \
completely; 0.0 = off-topic.

Respond with ONLY a JSON object, no prose, no code fences:
{{"groundedness": <float>, "relevance": <float>, "rationale": "<one sentence>"}}

QUESTION:
{question}

CONTEXT:
{context}

ANSWER:
{answer}
"""


def _clamp01(value) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, f))


def _parse_judge_json(raw: str) -> dict:
    """Best-effort parse of the judge's reply into clamped scores.

    Tolerates ```json fences and surrounding prose; falls back to zeros with a
    note rather than raising, so one bad judgement can't fail the whole run.
    """
    text_blob = (raw or "").strip()
    if text_blob.startswith("```"):
        # strip a leading ```json / ``` fence and trailing fence
        text_blob = text_blob.split("```", 2)[1] if "```" in text_blob[3:] else text_blob.strip("`")
        if text_blob.lstrip().startswith("json"):
            text_blob = text_blob.lstrip()[4:]
    # Narrow to the first {...} block if there's extra prose around it.
    start, end = text_blob.find("{"), text_blob.rfind("}")
    if start != -1 and end != -1 and end > start:
        text_blob = text_blob[start : end + 1]
    try:
        data = json.loads(text_blob)
    except (json.JSONDecodeError, ValueError):
        return {"groundedness": 0.0, "relevance": 0.0, "rationale": "Unparseable judge response."}
    return {
        "groundedness": _clamp01(data.get("groundedness")),
        "relevance": _clamp01(data.get("relevance")),
        "rationale": str(data.get("rationale", ""))[:1000],
    }


async def judge_answer(question: str, answer: str, context: str) -> dict:
    """Score one answer for groundedness + relevance. Returns clamped floats."""
    prompt = _JUDGE_PROMPT.format(question=question, context=context, answer=answer)
    result = await _get_judge_llm().ainvoke(prompt)
    content = result.content if hasattr(result, "content") else result
    if not isinstance(content, str):
        content = str(content)
    return _parse_judge_json(content)


# ── Auto-generation of eval cases ───────────────────────────────────────────

_GENERATE_PROMPT = """\
Below is an excerpt from a document. Write ONE clear, natural question that a \
user could ask and that is fully answerable using only this excerpt. Do not \
include the answer. Respond with ONLY the question text, nothing else.

EXCERPT:
{excerpt}
"""


async def generate_eval_cases(
    kb_id: uuid.UUID, db: AsyncSession, num_cases: int = 8
) -> list[dict]:
    """Sample random chunks from the KB's ready documents and have Gemini write
    a question for each. The chunk's document becomes the labeled ground truth.

    Returns case dicts ready to insert as EvalCase rows. Postgres-only (uses
    `random()`), so this runs live, not on the SQLite test harness.
    """
    rows = (
        await db.execute(
            text(
                """
                SELECT dc.id AS chunk_id, dc.document_id, dc.content
                FROM document_chunks dc
                JOIN documents d ON d.id = dc.document_id
                WHERE dc.kb_id = :kb_id AND d.status = 'ready'
                ORDER BY random()
                LIMIT :n
                """
            ),
            {"kb_id": str(kb_id), "n": num_cases},
        )
    ).fetchall()

    llm = _get_judge_llm()
    cases: list[dict] = []
    for row in rows:
        excerpt = (row.content or "")[:2000]
        if not excerpt.strip():
            continue
        try:
            result = await llm.ainvoke(_GENERATE_PROMPT.format(excerpt=excerpt))
            question = (result.content if hasattr(result, "content") else str(result)).strip()
        except Exception:
            continue
        if not question:
            continue
        cases.append(
            {
                "question": question.strip('"'),
                "relevant_doc_ids": [str(row.document_id)],
                "source_chunk_id": row.chunk_id,
                "origin": "auto",
            }
        )
    return cases


# ── Run execution ─────────────────────────────────────────────────────────────


async def run_evaluation(run_id: uuid.UUID, db: AsyncSession) -> None:
    """Execute every case in the run's eval set and store results + aggregates.

    Marks the run running → completed (or failed with an error message). Each
    case: retrieve top-k, score retrieval vs. ground truth, generate an answer,
    judge it. One failing case is recorded but does not abort the run.
    """
    run = (await db.execute(select(EvalRun).where(EvalRun.id == run_id))).scalar_one_or_none()
    if run is None:
        return

    run.status = "running"
    await db.commit()

    try:
        eval_set = (
            await db.execute(select(EvalSet).where(EvalSet.id == run.eval_set_id))
        ).scalar_one()
        cases = (
            await db.execute(select(EvalCase).where(EvalCase.eval_set_id == eval_set.id))
        ).scalars().all()

        hits: list[float] = []
        rrs: list[float] = []
        precisions: list[float] = []
        groundednesses: list[float | None] = []
        relevances: list[float | None] = []

        for case in cases:
            chunks = await retrieve_top_chunks(case.question, eval_set.kb_id, db, run.top_k)
            retrieved_docs = eval_metrics.dedupe_preserving_order(
                [str(c.document_id) for c in chunks]
            )
            relevant = {str(d) for d in (case.relevant_doc_ids or [])}

            hit = eval_metrics.hit(relevant, retrieved_docs)
            rr = eval_metrics.reciprocal_rank(relevant, retrieved_docs)
            prec = eval_metrics.precision_at_k(relevant, retrieved_docs)

            from app.services.llm import _build_context  # local import: avoid cycle at import time

            context = _build_context(chunks)
            answer = await answer_once(case.question, chunks, org_name=eval_set.name)
            judged = await judge_answer(case.question, answer, context)

            hits.append(1.0 if hit else 0.0)
            rrs.append(rr)
            precisions.append(prec)
            groundednesses.append(judged["groundedness"])
            relevances.append(judged["relevance"])

            db.add(
                EvalResult(
                    run_id=run.id,
                    case_id=case.id,
                    question=case.question,
                    generated_answer=answer,
                    retrieved_doc_ids=retrieved_docs,
                    retrieved_chunk_ids=[str(c.chunk_id) for c in chunks],
                    retrieval_hit=hit,
                    reciprocal_rank=rr,
                    precision_at_k=prec,
                    groundedness=judged["groundedness"],
                    relevance=judged["relevance"],
                    judge_rationale=judged["rationale"],
                )
            )

        run.num_cases = len(cases)
        run.hit_rate = eval_metrics.mean(hits)
        run.mrr = eval_metrics.mean(rrs)
        run.avg_precision = eval_metrics.mean(precisions)
        run.avg_groundedness = eval_metrics.mean(groundednesses)
        run.avg_relevance = eval_metrics.mean(relevances)
        run.status = "completed"
        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
    except Exception as exc:  # noqa: BLE001 — surface any failure on the run row
        await db.rollback()
        run = (await db.execute(select(EvalRun).where(EvalRun.id == run_id))).scalar_one_or_none()
        if run is not None:
            run.status = "failed"
            run.error = str(exc)[:2000]
            run.finished_at = datetime.now(timezone.utc)
            await db.commit()
