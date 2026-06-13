# AlgoMentor

**Open-source, graph-guided prep for big-tech coding interviews.**

AlgoMentor tells you *what* to study next (prerequisite DAG + topological sort), links you to
*community-written notes* with Python templates and LeetCode picks, and grounds an AI tutor in
those materials — without giving away full solutions.

Companion textbook:
[Algorithm Knowledge Base](https://github.com/BemnetMussa/algorithm-knowledge-base) — collaborative
DSA notes built by learners, open to everyone.

---

## Why two repos?

| Repo | Role |
|------|------|
| **AlgoMentor** (this repo) | Study map, progress tracking, RAG tutor |
| **[algorithm-knowledge-base](https://github.com/BemnetMussa/algorithm-knowledge-base)** | Markdown notes, code templates, practice links |

Contributors typically ship **two linked PRs** — one for content, one to wire the pattern into
the study map. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [OPEN_CONCEPTS.md](./OPEN_CONCEPTS.md).

---

## Features

- **Interview pattern map** — 17 core + 5 bonus patterns as a prerequisite DAG
- **"Up next" engine** — Kahn's topological sort recommends your next topic
- **Community wanted slots** — dashed nodes for patterns needing contributors
- **GitHub note links** — every concept points to the knowledge-base markdown
- **RAG chat** — streaming answers with citations (Socratic tutor mode in progress)
- **Document ingestion** — PDF, DOCX, CSV, TXT, and URL import
- **Multi-tenant workspaces** — orgs, API keys, analytics, eval harness

---

## Tech stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, Clerk |
| **Backend** | FastAPI, SQLAlchemy 2.0 async, Alembic |
| **AI / RAG** | LangChain, Google Gemini, pgvector |
| **Queue** | Celery + Redis |
| **Database** | PostgreSQL 16 + pgvector |

---

## Local development

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ and pnpm
- Python 3.11+ and [uv](https://github.com/astral-sh/uv)
- [Clerk](https://clerk.com) account
- [Google Gemini](https://aistudio.google.com/app/apikey) API key

### Setup

```bash
git clone https://github.com/your-org/algomentor.git
cd algomentor

cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
# Fill in GEMINI_API_KEY, Clerk keys, NEXT_PUBLIC_API_URL

docker compose up postgres redis -d

cd backend && uv sync && uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# separate terminal
uv run celery -A app.tasks.ingest_task worker --loglevel=info

cd frontend && pnpm install && pnpm dev
```

- App: http://localhost:3000  
- API docs: http://localhost:8000/docs  

### Tests

```bash
cd backend && uv run pytest -q
```

---

## Contributing

1. Read [INTERVIEW_SCOPE.md](./INTERVIEW_SCOPE.md)
2. Claim a pattern from [OPEN_CONCEPTS.md](./OPEN_CONCEPTS.md)
3. Open a **Claim pattern** issue
4. Submit linked PRs to this repo and the [knowledge base](https://github.com/BemnetMussa/algorithm-knowledge-base)

---

## License

[MIT](./LICENSE) — free for learners and contributors.

---

## Acknowledgments

Built with the [Algorithm Knowledge Base](https://github.com/BemnetMussa/algorithm-knowledge-base)
community. Study notes are written by contributors like [@BemnetMussa](https://github.com/BemnetMussa)
and [@Amanuel-Merara](https://github.com/Amanuel-Merara) — among many others.
