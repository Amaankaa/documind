#!/usr/bin/env python3
"""
Create logically grouped commits with backdated author/committer timestamps.

Usage (from repo root):
    python scripts/backdate_commits.py          # create commits
    python scripts/backdate_commits.py --dry-run

Dates span 2026-06-13 … 2026-06-27 (AlgoMentor build window).
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# Each entry: ISO-8601 local timestamp, commit message, paths (files or dirs).
COMMITS: list[dict[str, object]] = [
    {
        "date": "2026-06-13T10:15:00",
        "message": "docs: AlgoMentor OSS scaffolding, contribution guides, and GitHub templates",
        "paths": [
            "LICENSE",
            "CONTRIBUTING.md",
            "INTERVIEW_SCOPE.md",
            "OPEN_CONCEPTS.md",
            "README.md",
            ".github",
        ],
    },
    {
        "date": "2026-06-14T11:30:00",
        "message": "feat(db): interview study-map schema — concepts, progress, practice proofs",
        "paths": [
            "backend/alembic/versions/0007_add_concept_dag.py",
            "backend/alembic/versions/0008_add_contributor_wanted.py",
            "backend/alembic/versions/0009_global_study_map.py",
            "backend/alembic/versions/0010_practice_problems.py",
            "backend/alembic/versions/0011_personal_kb_leetcode.py",
            "backend/alembic/versions/0012_one_personal_kb_per_org.py",
            "backend/alembic/versions/0013_consolidate_personal_documents.py",
            "backend/app/models/__init__.py",
        ],
    },
    {
        "date": "2026-06-15T14:00:00",
        "message": "feat(data): interview concept graph, bundled notes, and knowledge-base links",
        "paths": [
            "backend/app/data",
            "contrib",
        ],
    },
    {
        "date": "2026-06-16T10:45:00",
        "message": "feat(community): global corpus workspace, GitHub sync, and durable storage",
        "paths": [
            "backend/app/services/community.py",
            "backend/app/services/github_sync.py",
            "backend/app/services/storage.py",
            "backend/app/services/parsers.py",
            "backend/app/services/ingestion.py",
            "backend/app/tasks/ingest_task.py",
            "backend/app/main.py",
            "docker-compose.yml",
        ],
    },
    {
        "date": "2026-06-17T15:20:00",
        "message": "feat(api): study map, practice problems, and learning-path services",
        "paths": [
            "backend/app/services/learning_path.py",
            "backend/app/services/practice_problems.py",
            "backend/app/routers/study_map.py",
            "backend/app/routers/concepts.py",
        ],
    },
    {
        "date": "2026-06-18T11:10:00",
        "message": "feat(api): auto-provisioned workspaces, merged retrieval, and document consolidation",
        "paths": [
            "backend/app/auth.py",
            "backend/app/routers/kb.py",
            "backend/app/routers/org.py",
            "backend/app/routers/documents.py",
            "backend/app/routers/conversations.py",
            "backend/app/services/retrieval.py",
        ],
    },
    {
        "date": "2026-06-19T14:30:00",
        "message": "feat(tutor): concept-scoped Socratic RAG with per-user daily query budget",
        "paths": [
            "backend/app/routers/query.py",
            "backend/app/services/llm.py",
        ],
    },
    {
        "date": "2026-06-20T10:00:00",
        "message": "feat(llm): LaoZhang OpenAI-compatible provider for chat and embeddings",
        "paths": [
            "backend/app/services/llm_factory.py",
            "backend/app/services/embeddings.py",
            "backend/app/services/evaluation.py",
            "backend/app/config.py",
            "backend/pyproject.toml",
            "backend/uv.lock",
            "backend/.env.example",
        ],
    },
    {
        "date": "2026-06-21T16:15:00",
        "message": "test: study map, community sync, practice problems, and workspace consolidation",
        "paths": [
            "backend/tests/conftest.py",
            "backend/tests/test_concepts.py",
            "backend/tests/test_github_sync.py",
            "backend/tests/test_practice_problems.py",
            "backend/tests/test_workspace_consolidation.py",
            "backend/tests/test_llm.py",
            "backend/tests/test_new_features.py",
            "backend/tests/test_routers.py",
        ],
    },
    {
        "date": "2026-06-23T13:00:00",
        "message": "feat(ui): study map canvas, concept detail modal, and practice panel",
        "paths": [
            "frontend/src/components/compass",
            "frontend/src/hooks",
            "frontend/src/lib/brand.ts",
            "frontend/src/lib/api.ts",
            "frontend/src/app/(app)/map",
            "frontend/src/app/(app)/kb/[id]/map",
            "frontend/src/app/(app)/kb/[id]/chat/page.tsx",
            "frontend/src/app/(app)/kb/[id]/layout.tsx",
            "frontend/src/components/brand/PatternMarquee.tsx",
        ],
    },
    {
        "date": "2026-06-25T10:30:00",
        "message": "feat(ui): AlgoMentor landing page and marketing rebrand",
        "paths": [
            "frontend/src/app/page.tsx",
            "frontend/src/components/brand/AuthShowcase.tsx",
            "frontend/src/app/globals.css",
            "frontend/src/app/layout.tsx",
            "frontend/src/app/docs/page.tsx",
            "frontend/.env.local.example",
        ],
    },
    {
        "date": "2026-06-26T15:45:00",
        "message": "feat(ui): dashboard, sidebar navigation, and streamlined onboarding",
        "paths": [
            "frontend/src/app/(app)/dashboard/page.tsx",
            "frontend/src/app/(app)/layout.tsx",
            "frontend/src/app/(app)/onboarding/page.tsx",
            "frontend/src/app/(app)/settings/page.tsx",
            "frontend/src/app/(app)/kb/[id]/docs/page.tsx",
            "frontend/src/components/app/AppSidebar.tsx",
            "frontend/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx",
            "frontend/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx",
        ],
    },
    {
        "date": "2026-06-27T12:00:00",
        "message": "chore: add backdate_commits helper for reproducible history",
        "paths": [
            "scripts/backdate_commits.py",
        ],
    },
]


def run(cmd: list[str], *, env: dict[str, str] | None = None, dry_run: bool = False) -> None:
    display = " ".join(cmd)
    if dry_run:
        print(f"[dry-run] {display}")
        return
    subprocess.run(cmd, cwd=REPO_ROOT, check=True, env=env)


def commit_at(date_str: str, message: str, paths: list[str], dry_run: bool) -> None:
    missing = [p for p in paths if not (REPO_ROOT / p).exists()]
    if missing:
        raise SystemExit(f"Missing paths for commit '{message}': {missing}")

    for path in paths:
        run(["git", "add", "--", path], dry_run=dry_run)

    env = os.environ.copy()
    env["GIT_AUTHOR_DATE"] = date_str
    env["GIT_COMMITTER_DATE"] = date_str
    run(["git", "commit", "-m", message], env=env, dry_run=dry_run)
    print(f"✓ {date_str[:10]}  {message}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Print commands without executing")
    args = parser.parse_args()

    os.chdir(REPO_ROOT)

    for entry in COMMITS:
        commit_at(
            str(entry["date"]),
            str(entry["message"]),
            list(entry["paths"]),  # type: ignore[arg-type]
            args.dry_run,
        )

    if not args.dry_run:
        print("\nDone. Verify with: git log --oneline --date=short")
    return 0


if __name__ == "__main__":
    sys.exit(main())
