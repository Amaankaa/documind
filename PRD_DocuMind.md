# PRD — DocuMind: AI-Powered RAG Knowledge Base SaaS

**Document Version:** 1.0  
**Date:** April 22, 2026  
**Status:** Ready for Development  
**Target Upwork Skills:** Fullstack Web Development · AI Integration · RAG

---

## 1. Product Overview

### 1.1 Vision
DocuMind is a multi-tenant SaaS platform that lets businesses upload their internal documents (PDFs, CSVs, Notion exports, Word files) and instantly get a secure, private AI assistant trained exclusively on that data — an internal ChatGPT that knows everything the company knows.

### 1.2 Problem Statement
Companies sit on massive amounts of knowledge locked in PDFs, SOPs, wikis, and spreadsheets. Employees waste hours searching for answers that are already documented. Generic AI tools like ChatGPT hallucinate and don't know company-specific data. There is no affordable, easy-to-deploy solution that lets a non-technical business owner point AI at their own documents.

### 1.3 Solution
DocuMind provides a clean web interface where users upload documents, which are then chunked, embedded, and stored in a vector database. Users can then ask natural language questions and receive accurate, cited answers pulled directly from their own documents.

### 1.4 Target Users
- **Primary:** SMB owners, operations managers, HR leads, customer support teams
- **Secondary:** Agencies building white-label knowledge tools for clients
- **Tertiary:** Individual consultants managing large document libraries

### 1.5 Upwork Portfolio Value
- Live demo URL to share in proposals
- Showcases: LangChain, OpenAI, pgvector/Pinecone, Next.js, FastAPI, multi-tenancy, streaming
- One project covers 3 Upwork service categories simultaneously

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Functional RAG pipeline | Query returns accurate sourced answer | < 3 sec response time |
| Document ingestion | Supports PDF, CSV, DOCX, TXT | All 4 formats working |
| Multi-tenancy | Isolated data per user/org | 0 data leakage between tenants |
| Demo-readiness | Loom video + live URL | Deployed on Vercel + Railway |
| Streaming UX | Answers stream token by token | Streaming via SSE/WebSocket |

---

## 3. Tech Stack

### 3.1 Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | TailwindCSS + shadcn/ui |
| State Management | Zustand or React Context |
| File Upload | react-dropzone |
| Chat UI | Custom streaming component |
| Auth UI | Clerk (pre-built components) |
| Charts/Stats | Recharts |

### 3.2 Backend
| Layer | Technology |
|-------|-----------|
| API Framework | FastAPI (Python 3.11+) |
| LLM Orchestration | LangChain |
| LLM Provider | OpenAI (gpt-4o) with Anthropic fallback |
| Embeddings | OpenAI text-embedding-3-small |
| Vector Store | pgvector (primary) / Pinecone (optional) |
| Document Parsing | PyMuPDF (PDF), python-docx, pandas (CSV) |
| Task Queue | Celery + Redis (async ingestion) |
| ORM | SQLAlchemy + Alembic |

### 3.3 Infrastructure
| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL (Supabase or Railway) |
| File Storage | Supabase Storage or AWS S3 |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway or Render |
| Auth | Clerk |
| Caching | Redis (Upstash) |
| Monitoring | Sentry (error tracking) |

---

## 4. Core Features

### 4.1 Feature List by Priority

#### P0 — Must Have (MVP)
- [ ] User authentication (sign up, login, logout, email verification)
- [ ] Organization/workspace creation
- [ ] Document upload (PDF, TXT, DOCX, CSV — max 50MB per file)
- [ ] Async document ingestion pipeline (chunking → embedding → storage)
- [ ] Ingestion progress indicator (processing / ready states)
- [ ] Chat interface with streaming responses
- [ ] Source citation in every answer (which doc, which chunk)
- [ ] Conversation history (stored per session)
- [ ] Document library view (list, delete documents)
- [ ] Multi-tenancy (each user/org has isolated vector namespace)

#### P1 — Should Have (Post-MVP)
- [ ] Multiple knowledge bases per organization
- [ ] Invite team members to a workspace
- [ ] Role-based access (Admin, Editor, Viewer)
- [ ] Usage dashboard (tokens used, queries/day, top documents queried)
- [ ] Re-ingestion (update a document without full re-upload)
- [ ] Feedback on answers (thumbs up/down for RLHF data collection)
- [ ] API key generation (let devs query via REST API)

#### P2 — Nice to Have (Future)
- [ ] Web URL ingestion (scrape a webpage and add to knowledge base)
- [ ] Notion integration (OAuth → pull Notion pages)
- [ ] Slack bot integration
- [ ] White-label / custom domain per org
- [ ] Billing via Stripe (free tier + paid plans)

---

## 5. User Flows

### 5.1 Onboarding Flow
```
Landing Page
  → Sign Up (Clerk)
  → Email Verification
  → Create Organization (name, slug)
  → Upload First Document (drag & drop modal)
  → Wait for ingestion (progress bar)
  → Redirect to Chat interface
  → First query pre-filled: "What is this document about?"
```

### 5.2 Document Ingestion Flow
```
User uploads file (UI)
  → File stored in S3/Supabase Storage (raw)
  → Celery task queued
  → Document parsed by appropriate parser (PDF/DOCX/CSV/TXT)
  → Text split into chunks (1000 tokens, 200 overlap)
  → Each chunk embedded via OpenAI text-embedding-3-small
  → Embeddings + metadata stored in pgvector
  → Document status updated to "ready"
  → Frontend polls status → shows "Ready" badge
```

### 5.3 Query Flow
```
User types question in chat
  → POST /api/query {question, kb_id, session_id}
  → Backend embeds the question
  → Vector similarity search → top-k chunks retrieved (k=5)
  → Prompt assembled: [System prompt] + [Retrieved context] + [User question]
  → LangChain calls OpenAI gpt-4o (streaming=True)
  → SSE stream returned to frontend
  → Frontend renders tokens as they arrive
  → After stream ends, sources appended below answer
  → Conversation turn saved to DB
```

---

## 6. Data Models

### 6.1 Database Schema (PostgreSQL)

```sql
-- Users (managed by Clerk, mirrored here)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  clerk_id VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
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
  file_type VARCHAR NOT NULL, -- pdf, docx, csv, txt
  file_url VARCHAR NOT NULL,  -- S3/Supabase URL
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
  embedding VECTOR(1536),  -- OpenAI text-embedding-3-small
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
  role VARCHAR NOT NULL, -- user | assistant
  content TEXT NOT NULL,
  sources JSONB,  -- [{doc_id, filename, chunk_index, excerpt}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. API Endpoints

### 7.1 Auth
All endpoints require `Authorization: Bearer <clerk_jwt>` header.

### 7.2 Endpoint Reference

```
# Knowledge Bases
POST   /api/kb                    → Create knowledge base
GET    /api/kb                    → List org knowledge bases
DELETE /api/kb/:id                → Delete knowledge base

# Documents
POST   /api/kb/:id/documents      → Upload document (multipart/form-data)
GET    /api/kb/:id/documents      → List documents in KB
DELETE /api/kb/:id/documents/:doc_id → Delete document

# Ingestion Status
GET    /api/documents/:doc_id/status → Poll ingestion status

# Chat / Query
POST   /api/kb/:id/query          → Query knowledge base (streaming SSE)
  Body: { question: string, session_id: string }
  Response: text/event-stream

# Conversations
GET    /api/kb/:id/conversations  → List conversations
GET    /api/conversations/:id     → Get conversation with messages
DELETE /api/conversations/:id     → Delete conversation

# Usage
GET    /api/org/usage             → Token usage, query counts
```

---

## 8. UI/UX Specifications

### 8.1 Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Hero, features, pricing, CTA |
| `/sign-up` | Sign Up | Clerk component |
| `/sign-in` | Sign In | Clerk component |
| `/onboarding` | Onboarding | Create org + upload first doc |
| `/dashboard` | Dashboard | KB list, usage stats |
| `/kb/:id` | Knowledge Base | Document list + chat interface |
| `/kb/:id/docs` | Documents | Upload, manage documents |
| `/kb/:id/chat` | Chat | Full-screen chat with KB |
| `/settings` | Settings | Org settings, team, API keys |

### 8.2 Chat Interface Requirements
- Message input with `Shift+Enter` for newline, `Enter` to send
- Streaming tokens rendered in real time with cursor animation
- Each assistant message has collapsible **Sources** section
- Sources show: document name, page/chunk number, highlighted excerpt
- Copy button on every assistant message
- Thumbs up / thumbs down feedback buttons
- Conversation sidebar (list of past sessions)
- "New Chat" button clears context, starts fresh session

### 8.3 Document Library Requirements
- Drag-and-drop upload zone (accepts multiple files)
- Upload queue with per-file progress bars
- Status badges: `Processing`, `Ready`, `Failed`
- File size, upload date, chunk count shown per document
- Delete with confirmation modal

---

## 9. Security Requirements

- [ ] All API routes validate Clerk JWT — no unauthenticated access
- [ ] Vector queries scoped to `kb_id` which is verified against `org_id` → no cross-tenant data leakage
- [ ] OpenAI API key stored as server-side env variable — never exposed to frontend
- [ ] File uploads validated for MIME type and size server-side (not just client-side)
- [ ] File storage URLs are signed/private — not publicly guessable
- [ ] Rate limiting on `/api/query` (e.g., 20 req/min per user) via Redis
- [ ] SQL injection prevented via ORM (SQLAlchemy parameterized queries)
- [ ] CORS restricted to known frontend origin

---

## 10. Project Structure

```
documind/
├── frontend/                     # Next.js 14
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── kb/[id]/
│   │   │   │   ├── page.tsx      # Chat view
│   │   │   │   └── docs/
│   │   │   ├── onboarding/
│   │   │   └── settings/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Landing
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── SourceCitation.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── documents/
│   │   │   ├── DropZone.tsx
│   │   │   ├── DocumentCard.tsx
│   │   │   └── IngestionStatus.tsx
│   │   └── ui/                   # shadcn components
│   ├── lib/
│   │   ├── api.ts                # Axios/fetch wrappers
│   │   └── stream.ts             # SSE streaming helper
│   └── middleware.ts             # Clerk auth middleware
│
├── backend/                      # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py             # Env vars via pydantic-settings
│   │   ├── auth.py               # Clerk JWT verification
│   │   ├── database.py           # SQLAlchemy engine
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── organization.py
│   │   │   ├── knowledge_base.py
│   │   │   ├── document.py
│   │   │   └── conversation.py
│   │   ├── routers/
│   │   │   ├── kb.py
│   │   │   ├── documents.py
│   │   │   ├── query.py
│   │   │   └── conversations.py
│   │   ├── services/
│   │   │   ├── ingestion.py      # Document parse + embed + store
│   │   │   ├── retrieval.py      # Vector search
│   │   │   ├── llm.py            # LangChain chain assembly
│   │   │   └── storage.py        # S3/Supabase file operations
│   │   └── tasks/
│   │       └── ingest_task.py    # Celery task
│   ├── alembic/                  # DB migrations
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## 11. Implementation Phases

### Phase 1 — Core RAG Engine (Week 1)
- [ ] Backend project scaffold (FastAPI + SQLAlchemy + Alembic)
- [ ] PostgreSQL + pgvector setup
- [ ] Document parsing service (PDF, DOCX, TXT, CSV)
- [ ] Chunking strategy (RecursiveCharacterTextSplitter, 1000 tokens, 200 overlap)
- [ ] Embedding pipeline (OpenAI text-embedding-3-small)
- [ ] Vector storage in pgvector
- [ ] Basic query endpoint (embed question → cosine similarity search → return top-5 chunks)
- [ ] LangChain chain: retrieval + prompt + streaming LLM call
- [ ] Test with Postman/pytest

### Phase 2 — Auth & Multi-Tenancy (Week 1–2)
- [ ] Clerk integration (backend JWT verification)
- [ ] User, Organization, KnowledgeBase, Document DB models
- [ ] All API routes scoped to org
- [ ] File storage integration (Supabase Storage)
- [ ] Celery + Redis async ingestion task

### Phase 3 — Frontend (Week 2)
- [ ] Next.js project scaffold + Clerk auth
- [ ] Landing page
- [ ] Onboarding flow
- [ ] Document upload UI (DropZone, progress, status polling)
- [ ] Chat interface with SSE streaming
- [ ] Source citations component
- [ ] Conversation history sidebar

### Phase 4 — Polish & Deploy (Week 3)
- [ ] Usage dashboard (Recharts)
- [ ] Error states, loading skeletons, empty states
- [ ] Mobile responsive
- [ ] Deploy backend to Railway (with Redis + Postgres add-ons)
- [ ] Deploy frontend to Vercel
- [ ] Environment variable setup
- [ ] Record Loom demo (2 min)
- [ ] Write GitHub README with screenshots

---

## 12. Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=sk-...
CLERK_SECRET_KEY=sk_...
CLERK_JWKS_URL=https://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
ALLOWED_ORIGINS=https://documind.vercel.app
```

### Frontend (.env.local)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
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

## 14. Demo Script (for Loom / Upwork Portfolio)

1. Open the app, show the landing page (15 sec)
2. Sign up → create org "Acme Corp" (30 sec)
3. Upload a real company-style PDF (e.g., a product manual or HR policy doc)
4. Watch the processing spinner → status flips to "Ready"
5. Ask: *"What is the return policy?"* — show streaming answer with source citation
6. Ask: *"Summarize the key points of this document"*
7. Ask something NOT in the doc — show the "not found" guardrail response
8. Show conversation history sidebar
9. End with deployed URL + GitHub repo link

---

*End of PRD — DocuMind v1.0*
