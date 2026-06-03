# DocuMind

**AI-powered RAG knowledge base SaaS.** Upload your documents (PDF, DOCX, CSV, TXT) and chat with them — getting streaming answers with exact source citations.

A complete, full-stack portfolio project: multi-tenant FastAPI backend, async document
ingestion pipeline, pgvector retrieval, and a Next.js chat UI — working end to end.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, TailwindCSS v4, shadcn/ui, Clerk, Zustand, React Query |
| **Backend** | FastAPI, Python 3.11, SQLAlchemy 2.0 async, Alembic |
| **AI / RAG** | LangChain, Google Gemini 2.5 Flash (chat), `gemini-embedding-2-preview` (1536-dim), pgvector |
| **Queue** | Celery + Redis |
| **Storage** | Supabase Storage (local-disk fallback for dev) |
| **Database** | PostgreSQL 16 + pgvector |
| **Auth** | Clerk (JWT, multi-tenant) |
| **Observability** | Sentry, SlowAPI rate limiting |
| **Infra** | Docker Compose |

---

## Features

- Multi-tenant workspaces — every knowledge base, document and conversation is scoped to the caller's organization
- Upload PDF, DOCX, CSV, TXT up to 50 MB
- Async document ingestion pipeline (Celery) with live per-document progress
- Chunking with `RecursiveCharacterTextSplitter` (3000 / 600 overlap)
- Top-k (12) cosine similarity retrieval via the pgvector `<=>` operator
- Streaming chat responses via SSE (Server-Sent Events), with conversation history as context
- Source citations on every AI answer
- Usage stats dashboard
- Per-endpoint rate limiting and Sentry error reporting

---

## Local Development

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ and pnpm
- Python 3.11+ and [uv](https://github.com/astral-sh/uv)
- A [Clerk](https://clerk.com) account
- A [Google Gemini](https://aistudio.google.com/app/apikey) API key
- A [Supabase](https://supabase.com) project *(optional — set `USE_LOCAL_STORAGE=true` to store uploads on local disk for dev)*

### 1. Clone and configure

```bash
git clone https://github.com/your-username/documind.git
cd documind

# Backend env
cp backend/.env.example backend/.env
# → fill in GEMINI_API_KEY, CLERK_SECRET_KEY, CLERK_JWKS_URL
# → for storage either set SUPABASE_URL + SUPABASE_SERVICE_KEY, or USE_LOCAL_STORAGE=true

# Frontend env
cp frontend/.env.local.example frontend/.env.local
# → fill in NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_API_URL
# → Clerk v7 uses NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL and NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
```

### 2. Start infrastructure

```bash
docker compose up postgres redis -d
```

### 3. Run migrations

```bash
cd backend
uv sync
uv run alembic upgrade head
```

### 4. Start backend

```bash
# API server
uv run uvicorn app.main:app --reload --port 8000

# Celery worker (separate terminal)
uv run celery -A app.tasks.ingest_task worker --loglevel=info
```

### 5. Start frontend

```bash
cd frontend
pnpm install
pnpm dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### Docker Compose (all services)

```bash
docker compose up --build
```

---

## Project Structure

```
documind/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entry
│   │   ├── config.py          # Settings (pydantic-settings)
│   │   ├── database.py        # Async SQLAlchemy engine
│   │   ├── auth.py            # Clerk JWT verification
│   │   ├── models/            # ORM models
│   │   ├── routers/           # API routes (kb, documents, query, conversations, org)
│   │   ├── services/          # parsers, ingestion, retrieval, llm, storage
│   │   └── tasks/             # Celery ingestion task
│   └── alembic/               # DB migrations
├── frontend/
│   └── src/
│       ├── app/               # Next.js App Router pages
│       ├── components/        # UI components (chat, shadcn)
│       ├── lib/               # API client, SSE stream utils
│       └── store/             # Zustand chat store
└── docker-compose.yml
```

---

## API Overview

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Liveness check |
| `POST` | `/api/org` | Create organization (onboarding) |
| `GET` | `/api/org/usage` | Usage stats |
| `POST` | `/api/kb` | Create knowledge base |
| `GET` | `/api/kb` | List knowledge bases |
| `DELETE` | `/api/kb/:id` | Delete knowledge base |
| `POST` | `/api/kb/:id/documents` | Upload document |
| `GET` | `/api/kb/:id/documents` | List documents |
| `DELETE` | `/api/kb/:id/documents/:doc_id` | Delete document |
| `POST` | `/api/kb/:id/documents/:doc_id/reingest` | Re-run ingestion |
| `GET` | `/api/documents/:id/status` | Ingestion status / progress |
| `POST` | `/api/kb/:id/query` | Chat (SSE streaming) |
| `GET` | `/api/kb/:id/conversations` | List a KB's conversations |
| `GET` | `/api/conversations` | List recent conversations |
| `GET` | `/api/conversations/:id` | Get conversation + messages |
| `DELETE` | `/api/conversations/:id` | Delete conversation |

All `/api/*` routes require a Clerk bearer token and are scoped to the caller's organization.
Interactive docs are available at `http://localhost:8000/docs` when the backend is running.

---

## Testing

The backend ships with a pytest suite (34 tests) that mocks Clerk, Supabase and Gemini and
runs against in-memory SQLite — no Postgres, Redis or network access required.

```bash
cd backend
uv sync --extra dev        # installs test deps (pytest, aiosqlite); --extra dev is required
uv run pytest -q
```

> **Note:** plain `uv sync` installs only runtime dependencies and will *remove* the test
> tooling. Always use `--extra dev` (or `uv run --extra dev pytest`) to run the suite.

---

## License

MIT
