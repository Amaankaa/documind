"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  KeyRound,
  Map,
  MessageSquare,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { LIVE_API_URL, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { DocHero } from "@/components/docs/DocsShell";

const endpoints = [
  {
    group: "Study map",
    icon: <Map className="size-5" />,
    items: [
      {
        method: "GET",
        path: "/api/study-map",
        description: "Full interview pattern DAG with progress, GitHub links, practice stats, and recommendations.",
      },
      {
        method: "GET",
        path: "/api/study-map/next",
        description: "Single recommended next concept (topological sort over your progress).",
      },
      {
        method: "PATCH",
        path: "/api/study-map/concepts/:conceptId/progress",
        description: "Update mastery status: available, in_progress, or mastered.",
      },
      {
        method: "GET",
        path: "/api/me",
        description: "Current user profile, org, and workspace metadata.",
      },
    ],
  },
  {
    group: "Knowledge bases",
    icon: <Database className="size-5" />,
    items: [
      {
        method: "GET",
        path: "/api/kb",
        description: "List knowledge bases for the authenticated organization.",
      },
      {
        method: "POST",
        path: "/api/kb",
        description: "Create a new knowledge base with a name and optional description.",
      },
      {
        method: "DELETE",
        path: "/api/kb/:id",
        description: "Delete a knowledge base and its indexed content.",
      },
    ],
  },
  {
    group: "Documents",
    icon: <UploadCloud className="size-5" />,
    items: [
      {
        method: "GET",
        path: "/api/kb/:id/documents",
        description: "Fetch uploaded documents and ingestion status.",
      },
      {
        method: "POST",
        path: "/api/kb/:id/documents",
        description: "Upload a PDF, DOCX, TXT, or CSV file as multipart form data.",
      },
      {
        method: "DELETE",
        path: "/api/kb/:id/documents/:docId",
        description: "Remove a document and its indexed chunks.",
      },
    ],
  },
  {
    group: "Querying",
    icon: <MessageSquare className="size-5" />,
    items: [
      {
        method: "POST",
        path: "/api/kb/:id/query",
        description: "Stream a cited RAG answer with Server-Sent Events.",
      },
      {
        method: "GET",
        path: "/api/conversations",
        description: "List saved conversations for the authenticated user.",
      },
    ],
  },
  {
    group: "Legacy concepts",
    icon: <BookOpen className="size-5" />,
    items: [
      {
        method: "GET",
        path: "/api/kb/:id/concepts",
        description: "Concept map scoped to a specific knowledge base (org workspaces).",
      },
      {
        method: "PATCH",
        path: "/api/kb/:id/concepts/:conceptId/progress",
        description: "Update concept progress within a KB-scoped map.",
      },
    ],
  },
];

const modelRows = [
  { name: "KnowledgeBase", fields: "id, org_id, name, description" },
  { name: "Document", fields: "id, filename, status, progress, chunk_count" },
  { name: "Concept", fields: "id, slug, title, status, prerequisites, github_url" },
  { name: "Source", fields: "doc_id, filename, chunk_index, excerpt" },
];

function Method({ method }: { method: string }) {
  const color =
    method === "GET" ? "bg-mint" : method === "POST" ? "bg-sun" : method === "PATCH" ? "bg-violet" : "bg-coral";

  return (
    <span className={`rounded-full border-2 border-ink px-3 py-1 text-xs font-black ${color}`}>
      {method}
    </span>
  );
}

function Endpoint({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border-2 border-ink bg-cream shadow-[6px_6px_0_var(--color-ink)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <Method method={method} />
        <code className="min-w-0 flex-1 truncate font-mono text-sm font-bold text-ink">{path}</code>
        <ChevronRight className={`size-4 shrink-0 transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t-2 border-ink bg-white/60 p-4">
          <p className="font-medium leading-7 text-ink/65">{description}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-xs leading-6 text-cream">
            {`Authorization: Bearer <clerk-jwt-or-org-api-key>
Content-Type: application/json`}
          </pre>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="grid size-12 place-items-center rounded-2xl border-2 border-ink bg-coral shadow-[4px_4px_0_var(--color-ink)]">
        {icon}
      </div>
      <h2 className="font-heading text-3xl font-black tracking-[-0.035em]">{title}</h2>
    </div>
  );
}

export default function ApiDocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? LIVE_API_URL;

  return (
    <>
      <DocHero
        eyebrow="API reference"
        title={`${PRODUCT_NAME} API`}
        description={`${PRODUCT_TAGLINE}. Ingest notes, manage workspaces, stream cited tutor responses, and integrate the study map into your own tools.`}
      />

      <div className="mt-8 rounded-[1.5rem] border-2 border-ink bg-mint p-5 shadow-[6px_6px_0_var(--color-ink)]">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-ink/55">Base URL</p>
        <code className="break-all font-mono text-sm font-bold">{baseUrl}</code>
      </div>

      <section className="py-12">
        <SectionHeader icon={<KeyRound className="size-5" />} title="Authentication" />
        <div className="rounded-[2rem] border-2 border-ink bg-cream p-6 shadow-[8px_8px_0_var(--color-ink)]">
          <p className="font-medium leading-7 text-ink/68">
            Browser sessions use a Clerk JWT in the <code className="font-mono text-sm">Authorization</code>{" "}
            header. Server integrations can use organization API keys created in Settings. The shared
            frontend client attaches tokens automatically.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-2xl bg-ink p-5 font-mono text-sm leading-7 text-cream">
            {`Authorization: Bearer <clerk-jwt>
# or
Authorization: Bearer <org-api-key>`}
          </pre>
        </div>
      </section>

      {endpoints.map((group) => (
        <section key={group.group} className="py-8">
          <SectionHeader icon={group.icon} title={group.group} />
          <div className="space-y-4">
            {group.items.map((item) => (
              <Endpoint key={`${item.method}-${item.path}`} {...item} />
            ))}
          </div>
        </section>
      ))}

      <section className="py-8">
        <SectionHeader icon={<Code2 className="size-5" />} title="Data models" />
        <div className="grid gap-4 md:grid-cols-2">
          {modelRows.map((row) => (
            <div
              key={row.name}
              className="rounded-[1.5rem] border-2 border-ink bg-cream p-5 shadow-[6px_6px_0_var(--color-ink)]"
            >
              <CheckCircle2 className="mb-4 size-6 text-ink" />
              <h3 className="font-heading text-xl font-black">{row.name}</h3>
              <p className="mt-3 font-mono text-xs font-bold leading-6 text-ink/55">{row.fields}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-8">
        <div className="rounded-[3rem] border-2 border-ink bg-ink p-8 text-cream shadow-[16px_16px_0_var(--color-sun)] md:p-10">
          <ShieldCheck className="mb-6 size-10 text-mint" />
          <h2 className="font-heading text-4xl font-black tracking-[-0.04em]">
            Hints with citations — not hallucinations.
          </h2>
          <p className="mt-4 max-w-2xl font-medium leading-7 text-white/65">
            Query responses stream tokens first, then return sources from ingested notes so students
            can verify every hint against the community knowledge base.
          </p>
          <Link
            href="/sign-up"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-sun px-6 py-3 font-black text-ink"
          >
            Create a workspace
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
