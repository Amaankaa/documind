# DocuMind

**AI-powered RAG knowledge base SaaS.** Upload your documents (PDF, DOCX, CSV, TXT) and chat with them — getting streaming answers with exact source citations.

Built as a full-stack, production-grade portfolio project.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, TailwindCSS v4, shadcn/ui, Clerk, Zustand, React Query |
| **Backend** | FastAPI, Python 3.11, SQLAlchemy 2.0 async, Alembic |
| **AI / RAG** | LangChain, Google Gemini 2.5 Flash (chat), gemini-embedding-2-preview, pgvector |
| **Queue** | Celery + Redis |
| **Storage** | Supabase Storage |
| **Database** | PostgreSQL 16 + pgvector |
| **Auth** | Clerk (JWT, multi-tenant) |
| **Infra** | Docker Compose |

---

## Features

- Multi-tenant workspaces (one org per team)
- Upload PDF, DOCX, CSV, TXT up to 50 MB
- Async document ingestion pipeline (Celery)
- Chunking with `RecursiveCharacterTextSplitter` (1000 / 200 overlap)
- Cosine similarity retrieval via pgvector `<=>` operator
- Streaming chat responses via SSE (Server-Sent Events)
- Source citations on every AI answer
- Conversation history
- Usage stats dashboard

---

## Local Development

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ and pnpm
- Python 3.11+ and [uv](https://github.com/astral-sh/uv)
- A [Clerk](https://clerk.com) account
- A [Google Gemini](https://aistudio.google.com/app/apikey) API key
- A [Supabase](https://supabase.com) project

### 1. Clone and configure

```bash
git clone https://github.com/your-username/documind.git
cd documind

# Backend env
cp backend/.env.example backend/.env
# → fill in GEMINI_API_KEY, CLERK_SECRET_KEY, CLERK_JWKS_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY

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
| `POST` | `/api/org` | Create organization (onboarding) |
| `GET` | `/api/org/usage` | Usage stats |
| `POST` | `/api/kb` | Create knowledge base |
| `GET` | `/api/kb` | List knowledge bases |
| `DELETE` | `/api/kb/:id` | Delete knowledge base |
| `POST` | `/api/kb/:id/documents` | Upload document |
| `GET` | `/api/kb/:id/documents` | List documents |
| `GET` | `/api/documents/:id/status` | Ingestion status |
| `POST` | `/api/kb/:id/query` | Chat (SSE streaming) |
| `GET` | `/api/kb/:id/conversations` | List conversations |
| `GET` | `/api/conversations/:id` | Get conversation + messages |

---

## License

MIT
