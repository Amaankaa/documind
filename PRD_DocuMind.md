# PRD — DocuMind: AI-Powered RAG Knowledge Base SaaS

**Document Version:** 2.1
**Date:** June 18, 2026
**Status:** Built — feature-complete MVP, validated by an 87-test backend suite

> **Changelog (v2.0 → v2.1):** Added a **RAG evaluation harness** — retrieval metrics (hit rate, MRR, precision@k) plus a Gemini LLM-as-judge scoring groundedness and answer relevance, with auto-generated + manual test sets, async run execution, and a results dashboard.
>
> **Changelog (v1.0 → v2.0):** Corrected the tech stack to reflect what was actually built (Google Gemini, not OpenAI/Pinecone). Marked shipped features as done and added features built beyond the original scope: public API keys, usage analytics, citation deep-view, URL ingestion with an SSRF guard, answer feedback, and full chat-history deletion. Removed throwaway portfolio framing.

---

## 1. Product Overview

### 1.1 Vision
DocuMind is a multi-tenant SaaS platform that lets businesses upload their internal documents (PDFs, CSVs, Word files, plain text, or a web page by URL) and instantly get a secure, private AI assistant grounded exclusively in that data — an internal ChatGPT that knows everything the company knows, and nothing it shouldn't.

### 1.2 Problem Statement
Companies sit on massive amounts of knowledge locked in PDFs, SOPs, wikis, and spreadsheets. Employees waste hours searching for answers that are already documented. Generic AI tools like ChatGPT have three hard limits for this use case:
- **They don't know your private data.** Ask about your refund policy or last quarter's onboarding doc and the answer is "I don't know" — or a confident fabrication.
- **They hallucinate without traceability.** There's no way to verify where an answer came from.
- **They're a privacy risk.** Most teams can't paste internal documents into a public chatbot they don't control.

### 1.3 Solution
DocuMind provides a clean web interface where users upload documents, which are chunked, embedded, and stored in a vector database. Users ask natural-language questions and receive accurate, **cited** answers pulled directly from their own documents — every claim links back to the exact source passage. Data is isolated per tenant, and the same knowledge base can be queried programmatically via a public REST API.

### 1.4 Target Users
- **Primary:** SMB owners, operations managers, HR leads, customer support teams
- **Secondary:** Agencies building white-label knowledge tools for clients
- **Tertiary:** Individual consultants managing large document libraries

### 1.5 Differentiation vs. Generic AI
| | ChatGPT (generic) | DocuMind |
|---|---|---|
| Knows your private documents | ✗ | ✓ |
| Answers cite the exact source passage | ✗ | ✓ |
| Refuses to answer outside your data | ✗ | ✓ (guardrailed) |
| Tenant-isolated / private | ✗ | ✓ |
| Programmatic API into *your* knowledge | ✗ | ✓ |

**Engineering showcase:** RAG pipeline, vector search, SSE streaming, multi-tenant isolation, async ingestion (Celery), public API with hashed keys, SSRF-hardened URL ingestion, and a usage analytics dashboard — one project spanning fullstack web, AI integration, and platform/security work.

---

## 2. Goals & Success Metrics

| Goal | Metric | Target | Status |
|------|--------|--------|--------|
| Functional RAG pipeline | Query returns accurate sourced answer | < 3 sec to first token | ✓ |
| Document ingestion | Supports PDF, CSV, DOCX, TXT, URL | All formats working | ✓ |
| Multi-tenancy | Isolated data per user/org | 0 data leakage between tenants | ✓ (tested) |
| Streaming UX | Answers stream token by token | Streaming via SSE | ✓ |
| Programmatic access | REST API authenticated by API key | Dual auth (JWT or key) | ✓ |
| Deploy-readiness | Reproducible container stack | Docker Compose | ✓ |
| Answer quality, measured | Retrieval + groundedness/relevance scoring | Eval harness with metrics | ✓ |
| Test coverage | Automated backend test suite | Core + new surface covered | ✓ (87 tests) |

---

## 3. Tech Stack

### 3.1 Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui (neo-brutalist theme) |
| Server state | TanStack Query |
| Chat UI | Custom SSE streaming component |
| Auth UI | Clerk (pre-built components) |
| Charts | Recharts |
| Toasts | sonner |

### 3.2 Backend
| Layer | Technology |
|-------|-----------|
| API Framework | FastAPI (Python 3.11+, async) |
| LLM Orchestration | LangChain (`langchain-google-genai`) |
| LLM Provider | **Google Gemini 2.5 Flash** |
| Embeddings | **Gemini embeddings** (1536-dim output) |
| Vector Store | pgvector (PostgreSQL extension) |
| Document Parsing | PyMuPDF (PDF), python-docx, pandas (CSV), BeautifulSoup4 + lxml (HTML/URL) |
| Task Queue | Celery + Redis (async ingestion; optional inline mode for single-node) |
| ORM / Migrations | SQLAlchemy 2.0 (async) + Alembic |
| Rate Limiting | slowapi (Redis-backed) |
| Package Manager | uv |

### 3.3 Infrastructure
| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL 16 + pgvector |
| File Storage | Supabase Storage **or** local disk (`USE_LOCAL_STORAGE`) |
| Containerization | Docker Compose (backend, celery worker, postgres, redis) |
| Auth | Clerk (JWT verified server-side via JWKS) |
| Queue / Cache | Redis |

---

## 4. Core Features

### 4.1 Shipped — MVP (formerly P0)
- [x] User authentication (sign up, login, logout) via Clerk
- [x] Organization/workspace creation
- [x] Document upload (PDF, TXT, DOCX, CSV)
- [x] Async document ingestion pipeline (chunking → embedding → storage)
- [x] Ingestion progress indicator (processing / ready / failed states, with failure reason)
- [x] Chat interface with streaming responses (SSE)
- [x] Source citation in every answer (which doc, which chunk)
- [x] Conversation history (stored per user/KB)
- [x] Document library view (list, delete documents)
- [x] Multi-tenancy (every query scoped to `kb_id` verified against `org_id`)

### 4.2 Shipped — Post-MVP (formerly P1/P2)
- [x] Multiple knowledge bases per organization
- [x] **Usage analytics dashboard** — queries over time, top-queried documents, document status breakdown, positive/negative feedback ratio (Recharts)
- [x] **Answer feedback** — 👍/👎 per assistant message, with toggle-to-clear, persistence across reloads, and live reflection in analytics
- [x] **Public API keys** — generate `dm_`-prefixed keys (shown once, stored hashed with SHA-256); query the API with `X-API-Key` instead of a Clerk JWT; revocable
- [x] **Web URL ingestion** — paste a URL, server fetches and extracts readable text, ingests like any document
- [x] **Citation deep-view** — click a citation to read the cited passage in context (neighbouring chunks)
- [x] **Chat-history management** — delete an individual conversation, or clear the entire history at once (scoped to the caller)
- [x] **RAG evaluation harness** — build labeled test sets (auto-generated from documents *and* manual), then score each case on retrieval (hit rate, MRR, precision@k vs. labeled docs) and generation (Gemini LLM-as-judge: groundedness/faithfulness + answer relevance, 0–1 with rationale). Runs execute asynchronously via Celery with status polling; results render in a dashboard with metric cards, a score-profile chart, and a per-case table. Auto-generated ground truth is labeled *synthetic* for honesty.

### 4.3 Security hardening (built)
- [x] **SSRF guard on URL ingestion** — resolves the host and rejects private, loopback, link-local, reserved, multicast, and cloud-metadata (169.254.169.254) targets; non-`http(s)` schemes rejected at validation
- [x] **Hashed API keys** — only a SHA-256 hash is stored; the raw secret is returned exactly once
- [x] **Rate limiting** on the query endpoint (default 20/min)

### 4.4 Future / Not Yet Built
- [ ] Invite team members + role-based access (Admin, Editor, Viewer)
- [ ] Re-ingestion (update a document in place)
- [ ] Notion / Slack integrations
- [ ] White-label / custom domain per org
- [ ] Billing via Stripe (free tier + paid plans)

---

## 5. User Flows

### 5.1 Onboarding Flow
```
Landing Page
  → Sign Up (Clerk)
  → Create Organization (name, slug)
  → Upload First Document (drag & drop) or paste a URL
  → Wait for ingestion (status: processing → ready)
  → Redirect to Chat interface
```

### 5.2 Document Ingestion Flow
```
User uploads file OR submits a URL (UI)
  → File stored in Supabase Storage / local disk (raw)   [URL: server fetches + SSRF-checks the host]
  → Celery task queued (or run inline if USE_CELERY=false)
  → Parsed by the appropriate parser (PDF / DOCX / CSV / TXT / HTML)
  → Text split into chunks (RecursiveCharacterTextSplitter)
  → Each chunk embedded via Gemini embeddings
  → Embeddings + metadata stored in pgvector
  → Document status updated to "ready" (or "failed" with a reason)
  → Frontend polls status → shows badge
```

### 5.3 Query Flow
```
User types question in chat (or calls the REST API with X-API-Key)
  → POST /api/kb/:id/query {question, session_id?}
  → Backend embeds the question (Gemini)
  → Vector similarity search → top-k chunks retrieved
  → Prompt assembled: [System prompt] + [Retrieved context] + [User question]
  → LangChain calls Gemini 2.5 Flash (streaming)
  → SSE stream returned to frontend
  → Frontend renders tokens as they arrive
  → done event carries conversation_id, message_id, and sources
  → Conversation turn saved; user can 👍/👎 the answer or open a citation in context
```

---

## 6. Data Models

### 6.1 Database Schema (PostgreSQL)

```sql
-- Users (mirrored from Clerk)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR UNIQUE NOT NULL,
  email VARCHAR,                       -- nullable (migration 0004)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Bases
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  filename VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL,          -- pdf | docx | csv | txt | url
  file_url VARCHAR NOT NULL,           -- storage URL, or the source URL for url docs
  status VARCHAR DEFAULT 'processing', -- processing | ready | failed
  chunk_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Chunks (with vectors via pgvector)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  kb_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536),              -- Gemini embeddings, 1536-dim
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  title VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL,               -- user | assistant
  content TEXT NOT NULL,
  sources JSONB,                       -- [{doc_id, filename, chunk_index, excerpt}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback (migration 0003) — one rating per (user, message)
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  rating VARCHAR NOT NULL,             -- positive | negative
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys (migration 0005) — programmatic access, hashed
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  prefix VARCHAR NOT NULL,             -- non-secret display prefix (e.g. dm_abcd...)
  key_hash VARCHAR UNIQUE NOT NULL,    -- SHA-256 of the raw key
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. API Endpoints

### 7.1 Auth
Endpoints accept **either** a Clerk JWT (`Authorization: Bearer <jwt>`) **or**, on the query endpoint, a programmatic key (`X-API-Key: dm_...`).

### 7.2 Endpoint Reference

```
# Knowledge Bases
POST   /api/kb                          → Create knowledge base
GET    /api/kb                          → List org knowledge bases
DELETE /api/kb/:id                      → Delete knowledge base

# Documents
POST   /api/kb/:id/documents            → Upload document (multipart/form-data)
POST   /api/kb/:id/documents/url        → Ingest a web page by URL (SSRF-guarded)
GET    /api/kb/:id/documents            → List documents in KB
DELETE /api/kb/:id/documents/:doc_id    → Delete document
GET    /api/kb/:id/documents/:doc_id/context  → Cited passage + neighbours (deep-view)
GET    /api/documents/:doc_id/status    → Poll ingestion status (org-scoped)

# Chat / Query
POST   /api/kb/:id/query                → Query knowledge base (streaming SSE)
  Body: { question: string, session_id?: string }
  Auth: Clerk JWT or X-API-Key
  done event: { conversation_id, message_id, sources }

# Conversations
GET    /api/kb/:id/conversations        → List conversations in a KB
GET    /api/conversations               → List all the caller's conversations
GET    /api/conversations/:id           → Get conversation with messages (+ caller's feedback)
DELETE /api/conversations/:id           → Delete one conversation
DELETE /api/conversations               → Clear the caller's entire chat history

# Feedback
POST   /api/kb/:id/feedback             → Upsert 👍/👎 for a message
DELETE /api/kb/:id/feedback/:message_id → Clear the caller's feedback (un-vote)

# API Keys
GET    /api/api-keys                    → List active keys (secret never returned)
POST   /api/api-keys                    → Create a key (raw secret returned once)
DELETE /api/api-keys/:id                → Revoke a key

# Analytics
GET    /api/org/analytics               → Queries over time, top docs, status mix, feedback

# Evaluation harness
POST   /api/kb/:id/eval-sets            → Create a test set (optional inline cases)
GET    /api/kb/:id/eval-sets            → List sets w/ case count + latest-run summary
POST   /api/kb/:id/eval-sets/:sid/generate → Auto-generate cases from documents (synthetic ground truth)
GET    /api/eval-sets/:sid              → Set + cases
DELETE /api/eval-sets/:sid              → Delete a set
POST   /api/eval-sets/:sid/cases        → Add a manual case (question + relevant doc ids)
DELETE /api/eval-sets/:sid/cases/:cid   → Remove a case
POST   /api/eval-sets/:sid/run          → Start a run (async via Celery)
GET    /api/eval-runs/:rid              → Run status + aggregate metrics (poll)
GET    /api/eval-runs/:rid/results      → Per-case results (hit, scores, rationale)
```

---

## 8. UI/UX Specifications

### 8.1 Pages & Routes
| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Hero, features, CTA |
| `/sign-up`, `/sign-in` | Auth | Clerk components |
| `/onboarding` | Onboarding | Create org + first document |
| `/dashboard` | Dashboard | KB list, quick actions |
| `/kb/:id/chat` | Chat | Streaming chat with the KB |
| `/kb/:id/docs` | Documents | Upload (file or URL), manage documents |
| `/analytics` | Analytics | Usage charts |
| `/settings` | Settings | Org settings + API keys |

### 8.2 Chat Interface
- `Shift+Enter` newline, `Enter` send
- Streaming tokens rendered live with a cursor animation
- Collapsible **Sources** section per assistant message; clicking a source opens the cited passage in context
- Copy button + 👍/👎 feedback (click again to clear) on every assistant message
- Conversation sidebar: hover to delete a single chat; "Clear all" wipes history (with confirmation)

### 8.3 Document Library
- Drag-and-drop upload **and** a URL field for web ingestion
- Status badges: `Processing`, `Ready`, `Failed` (failed shows the reason)
- Per-document type icon (incl. a globe for URL docs), date, chunk count
- Delete with confirmation

---

## 9. Security Requirements

- [x] All API routes require auth — Clerk JWT, or a valid API key on the query endpoint
- [x] Vector queries scoped to `kb_id` verified against `org_id` → no cross-tenant data leakage (tested)
- [x] Gemini API key + all secrets server-side only — never exposed to the frontend
- [x] File uploads validated for type and size server-side
- [x] **SSRF guard** on URL ingestion (blocks private/loopback/link-local/reserved/multicast/metadata IPs; non-http(s) schemes rejected)
- [x] **API keys stored hashed** (SHA-256); raw secret shown once; revocable
- [x] Rate limiting on `/api/query` via slowapi
- [x] SQL injection prevented via SQLAlchemy parameterized queries
- [x] CORS restricted to the configured frontend origin

---

## 10. Project Structure

```
documind/
├── frontend/                     # Next.js 16
│   ├── src/app/
│   │   ├── (auth)/sign-in, sign-up
│   │   ├── (app)/dashboard, kb/[id]/{chat,docs}, analytics, onboarding, settings
│   │   └── page.tsx              # Landing
│   ├── src/components/
│   │   ├── app/AppSidebar.tsx, ApiKeysPanel.tsx, ThemeToggle.tsx
│   │   ├── chat/{MessageBubble,ChatInput}.tsx
│   │   └── ui/                   # shadcn components
│   └── src/lib/{api.ts, stream.ts, types.ts}
│
├── backend/                      # FastAPI
│   ├── app/
│   │   ├── main.py, config.py, auth.py, database.py, limiter.py
│   │   ├── models/__init__.py    # User, Org, KB, Document, Chunk, Conversation, Message, Feedback, ApiKey
│   │   ├── routers/{kb,documents,query,conversations,feedback,api_keys,org}.py
│   │   ├── services/{ingestion,retrieval,llm,embeddings,parsers,storage}.py
│   │   └── tasks/ingest_task.py  # Celery task
│   ├── alembic/versions/         # Migrations 0001–0005
│   └── tests/                    # pytest (71 tests; SQLite harness)
│
├── docker-compose.yml
└── README.md
```

---

## 11. Implementation Phases (delivered)

- **Phase 1 — Core RAG Engine:** FastAPI + SQLAlchemy + Alembic, pgvector, parsing (PDF/DOCX/TXT/CSV), chunking, Gemini embeddings, retrieval, LangChain + Gemini streaming. ✓
- **Phase 2 — Auth & Multi-Tenancy:** Clerk JWT verification, org-scoped routes, Supabase/local storage, Celery + Redis ingestion. ✓
- **Phase 3 — Frontend:** Next.js + Clerk, landing, onboarding, upload UI with status polling, SSE chat, citations, conversation sidebar. ✓
- **Phase 4 — Platform & Hardening:** analytics dashboard, answer feedback, public API keys, URL ingestion + SSRF guard, citation deep-view, chat-history deletion, rate limiting, Docker Compose, 71-test suite. ✓

---

## 12. Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://...
SYNC_DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GEMINI_API_KEY=...
EMBEDDING_MODEL=gemini-embedding-2-preview
CHAT_MODEL=gemini-2.5-flash
EMBEDDING_DIMENSIONS=1536
CLERK_SECRET_KEY=sk_...
CLERK_JWKS_URL=https://...
SUPABASE_URL=https://...            # or USE_LOCAL_STORAGE=true
SUPABASE_SERVICE_KEY=...
USE_LOCAL_STORAGE=false
USE_CELERY=true
QUERY_RATE_LIMIT=20/minute
ALLOWED_ORIGINS=["http://localhost:3000"]
```

### Frontend (.env.local)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

---

## 13. Prompt Engineering

### 13.1 System Prompt Template
```
You are a helpful AI assistant for {org_name}. You answer questions
exclusively based on the provided context documents.

Rules:
- If the answer is not found in the context, say:
  "I couldn't find that in the uploaded documents."
- Never make up information or use outside knowledge.
- Always be concise and direct.
- When citing information, reference the document name naturally
  (e.g., "According to the Employee Handbook...").
- If asked something outside the documents, politely redirect.
```

### 13.2 RAG Prompt Template
```
Context Documents:
{context}

---
User Question: {question}

Answer based only on the context above. Include the source document
name when relevant.
```

---

## 14. Demo Script

1. Open the app, show the landing page
2. Sign up → create org "Acme Corp"
3. Upload a company-style PDF **and** ingest a public web page by URL
4. Watch status flip from "Processing" to "Ready"
5. Ask *"What is the return policy?"* — show the streaming answer, then click a citation to read it in context
6. 👍 the answer, then open **Analytics** to show it reflected live
7. Ask something not in the docs — show the "not found" guardrail
8. Open **Settings**, create an API key, and hit `/api/kb/:id/query` with `X-API-Key` from the terminal
9. Delete a chat from the sidebar; show "Clear all" wiping history
10. End with the GitHub repo link

---

*End of PRD — DocuMind v2.1*
