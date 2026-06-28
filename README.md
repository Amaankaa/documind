# AlgoMentor

**Open-source, graph-guided prep for big-tech coding interviews.**

**Live app:** https://app.algomentor.me  
**Documentation:** https://app.algomentor.me/docs (no sign-up required)

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

### Study map & learning path
- **Interview pattern map** — 17 core + 5 bonus patterns as a prerequisite DAG
- **Interactive canvas** — zoom, pan, focus mode, balanced layout, progress per node
- **"Up next" engine** — Kahn's topological sort recommends your next topic
- **Mastery gating** — practice problems unlock downstream concepts
- **Concept detail modal** — notes, GitHub links, contributor credits
- **Community wanted slots** — dashed nodes for patterns needing contributors

### AI tutor
- **RAG chat** — streaming answers with citations from community corpus
- **Socratic mode** — concept-scoped tutor grounded in study notes
- **Daily free tier** — shared LLM key with per-user daily limit
- **BYOK** — bring your own API key (Fernet-encrypted in Postgres) for unlimited usage

### Workspaces & content
- **Community corpus** — auto-syncs bundled + GitHub markdown, embeds on startup
- **Personal workspace** — upload PDF, DOCX, CSV, TXT, or URL for private RAG
- **Document ingestion** — chunk → embed → pgvector with progress tracking
- **Multi-tenant orgs** — workspaces, org API keys, usage analytics
- **Eval harness** — eval sets, generated cases, retrieval quality metrics

### Auth & settings
- **Clerk** — email/password and Google OAuth (production)
- **Settings** — tutor API key panel, theme, API keys for programmatic access

---

## Tech stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, Clerk |
| **Backend** | FastAPI, SQLAlchemy 2.0 async, Alembic |
| **AI / RAG** | LangChain, Gemini / LaoZhang (OpenAI-compatible), pgvector |
| **Queue** | Celery + Redis (local dev); in-process ingestion (production) |
| **Database** | PostgreSQL 16 + pgvector |
| **Deploy** | Docker Compose, Caddy, DigitalOcean, GitHub Actions CI/CD |

---

## Local development

### Prerequisites

- Docker + Docker Compose
- Node.js 22+ and pnpm
- Python 3.11+ and [uv](https://github.com/astral-sh/uv)
- [Clerk](https://clerk.com) account (development keys)
- [Google Gemini](https://aistudio.google.com/app/apikey) or LaoZhang API key

### Setup

```bash
git clone https://github.com/Amaankaa/documind.git
cd documind

cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
# Fill in GEMINI_API_KEY, Clerk keys, NEXT_PUBLIC_API_URL

docker compose up postgres redis -d

cd backend && uv sync && uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# separate terminal (optional — set USE_CELERY=false to skip)
uv run celery -A app.tasks.ingest_task worker --loglevel=info

cd frontend && pnpm install && pnpm dev
```

- App: http://localhost:3000
- API docs: http://localhost:8000/docs

### Tests & lint

```bash
cd backend && uv run pytest -q
cd frontend && pnpm lint && pnpm build
```

CI runs the same checks on every push and PR (see `.github/workflows/ci.yml`).

---

## Production deployment

See **[DEPLOY.md](./DEPLOY.md)** for:

- DigitalOcean / VPS setup with `docker-compose.prod.yml`
- Clerk production + DNS
- Caddy HTTPS
- GitHub Actions CD (auto-deploy on push to `main`)

---

## Project docs

| Doc | Purpose |
|-----|---------|
| [DEPLOY.md](./DEPLOY.md) | Production hosting & CI/CD |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contributor workflow |
| [OPEN_CONCEPTS.md](./OPEN_CONCEPTS.md) | Claimable patterns |
| [INTERVIEW_SCOPE.md](./INTERVIEW_SCOPE.md) | What's in scope for the map |
| [PRD_DocuMind.md](./PRD_DocuMind.md) | Historical product spec (DocuMind era) |

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
