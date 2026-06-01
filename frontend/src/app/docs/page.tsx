"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  KeyRound,
  MessageSquare,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

const NAV = [
  { id: "overview", label: "Overview" },
  { id: "auth", label: "Authentication" },
  { id: "knowledge", label: "Knowledge Bases" },
  { id: "documents", label: "Documents" },
  { id: "querying", label: "Querying" },
  { id: "models", label: "Models" },
];

const endpoints = [
  {
    group: "Knowledge Bases",
    id: "knowledge",
    icon: <Database className="size-5" />,
    items: [
      { method: "GET", path: "/api/kb", description: "List knowledge bases for the authenticated organization." },
      { method: "POST", path: "/api/kb", description: "Create a new knowledge base with a name and optional description." },
    ],
  },
  {
    group: "Documents",
    id: "documents",
    icon: <UploadCloud className="size-5" />,
    items: [
      { method: "GET", path: "/api/kb/:id/documents", description: "Fetch uploaded documents and ingestion status." },
      { method: "POST", path: "/api/kb/:id/documents", description: "Upload a PDF, DOCX, TXT, or CSV file as multipart form data." },
      { method: "DELETE", path: "/api/kb/:id/documents/:docId", description: "Remove a document and its indexed chunks." },
    ],
  },
  {
    group: "Querying",
    id: "querying",
    icon: <MessageSquare className="size-5" />,
    items: [
      { method: "POST", path: "/api/kb/:id/query", description: "Stream a cited RAG answer with Server-Sent Events." },
      { method: "GET", path: "/api/conversations", description: "List saved conversations for a knowledge base." },
    ],
  },
];

const modelRows = [
  { name: "KnowledgeBase", fields: "id, org_id, name, description" },
  { name: "Document", fields: "id, filename, status, progress, chunk_count" },
  { name: "Source", fields: "doc_id, filename, chunk_index, excerpt" },
];

function Method({ method }: { method: string }) {
  const color =
    method === "GET"
      ? "bg-[#a7f3d0]"
      : method === "POST"
        ? "bg-[#ffcc33]"
        : "bg-[#ff8a65]";

  return (
    <span className={`rounded-full border-2 border-[#14110f] px-3 py-1 text-xs font-black ${color}`}>
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
    <div className="overflow-hidden rounded-[1.5rem] border-2 border-[#14110f] bg-[#fffaf1] shadow-[6px_6px_0_#14110f]">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <Method method={method} />
        <code className="min-w-0 flex-1 truncate font-mono text-sm font-bold text-[#14110f]">
          {path}
        </code>
        <ChevronRight className={`size-4 transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t-2 border-[#14110f] bg-white/60 p-4">
          <p className="font-medium leading-7 text-[#14110f]/65">{description}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#14110f] p-4 font-mono text-xs leading-6 text-[#fffaf1]">
{`Authorization: Bearer <clerk-jwt>
Content-Type: application/json`}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5efe3] text-[#14110f]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-[#ff7a59]/25 blur-[90px]" />
        <div className="absolute right-[-10rem] top-20 h-[36rem] w-[36rem] rounded-full bg-[#7c3aed]/20 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,17,15,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(20,17,15,0.055)_1px,transparent_1px)] bg-[size:38px_38px]" />
      </div>

      <nav className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border border-[#14110f]/10 bg-[#fffaf1]/75 px-4 shadow-[0_20px_80px_rgba(20,17,15,0.12)] backdrop-blur-2xl md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#14110f] text-[#fffaf1]">
              <BrainCircuit className="size-5" />
            </span>
            <span className="font-heading text-lg font-black">DocuMind</span>
            <span className="hidden text-sm font-black uppercase tracking-[0.18em] text-[#14110f]/35 sm:inline">
              Docs
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/#workflow" className="hidden text-sm font-bold text-[#14110f]/60 hover:text-[#14110f] md:block">
              Product
            </Link>
            <Link href="/sign-up" className="rounded-full bg-[#14110f] px-5 py-2.5 text-sm font-black text-[#fffaf1]">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto flex max-w-7xl gap-8 px-6 pt-28">
        <aside className="sticky top-28 hidden h-[calc(100vh-7rem)] w-60 shrink-0 self-start overflow-y-auto pb-8 lg:block">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#14110f]/45">
            On this page
          </p>
          <nav className="space-y-2">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className={`block rounded-full border-2 px-4 py-2 text-sm font-black transition ${
                  activeSection === item.id
                    ? "border-[#14110f] bg-[#ffcc33] text-[#14110f] shadow-[4px_4px_0_#14110f]"
                    : "border-transparent text-[#14110f]/50 hover:bg-[#14110f]/5 hover:text-[#14110f]"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-8 rounded-[1.5rem] border-2 border-[#14110f] bg-[#a7f3d0] p-4 shadow-[6px_6px_0_#14110f]">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#14110f]/55">
              Base URL
            </p>
            <code className="break-all font-mono text-xs font-bold">
              {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
            </code>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24">
          <section id="overview" className="scroll-mt-28">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="rounded-[3rem] border-2 border-[#14110f] bg-[#ffcc33] p-8 shadow-[16px_16px_0_#14110f] md:p-12"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#14110f] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#fffaf1]">
                <BookOpen className="size-4" />
                API reference
              </div>
              <h1 className="font-heading text-6xl font-black leading-[0.9] tracking-[-0.06em] md:text-8xl">
                Wire DocuMind into anything.
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#14110f]/68">
                Ingest documents, manage knowledge bases, and stream cited RAG
                answers from your own product surface.
              </p>
            </motion.div>
          </section>

          <section id="auth" className="scroll-mt-28 py-12">
            <SectionHeader icon={<KeyRound className="size-5" />} title="Authentication" />
            <div className="rounded-[2rem] border-2 border-[#14110f] bg-[#fffaf1] p-6 shadow-[8px_8px_0_#14110f]">
              <p className="font-medium leading-7 text-[#14110f]/68">
                All private API calls expect a Clerk JWT in the Authorization
                header. The frontend already attaches this token through the
                shared API client and direct upload/query calls.
              </p>
              <pre className="mt-5 overflow-x-auto rounded-2xl bg-[#14110f] p-5 font-mono text-sm leading-7 text-[#fffaf1]">
{`Authorization: Bearer <clerk-jwt>`}
              </pre>
            </div>
          </section>

          {endpoints.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-28 py-12">
              <SectionHeader icon={group.icon} title={group.group} />
              <div className="space-y-4">
                {group.items.map((item) => (
                  <Endpoint key={`${item.method}-${item.path}`} {...item} />
                ))}
              </div>
            </section>
          ))}

          <section id="models" className="scroll-mt-28 py-12">
            <SectionHeader icon={<Code2 className="size-5" />} title="Data Models" />
            <div className="grid gap-4 md:grid-cols-3">
              {modelRows.map((row) => (
                <div
                  key={row.name}
                  className="rounded-[1.5rem] border-2 border-[#14110f] bg-[#fffaf1] p-5 shadow-[6px_6px_0_#14110f]"
                >
                  <CheckCircle2 className="mb-4 size-6 text-[#14110f]" />
                  <h3 className="font-heading text-xl font-black">{row.name}</h3>
                  <p className="mt-3 font-mono text-xs font-bold leading-6 text-[#14110f]/55">
                    {row.fields}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="py-12">
            <div className="rounded-[3rem] border-2 border-[#14110f] bg-[#14110f] p-8 text-[#fffaf1] shadow-[16px_16px_0_#ffcc33] md:p-10">
              <ShieldCheck className="mb-6 size-10 text-[#a7f3d0]" />
              <h2 className="font-heading text-4xl font-black tracking-[-0.04em]">
                Keep citations attached to the magic.
              </h2>
              <p className="mt-4 max-w-2xl font-medium leading-7 text-white/65">
                Query responses stream tokens first, then return sources so your
                interface can show exactly which document chunks backed the answer.
              </p>
              <Link
                href="/sign-up"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#ffcc33] px-6 py-3 font-black text-[#14110f]"
              >
                Start building
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="grid size-12 place-items-center rounded-2xl border-2 border-[#14110f] bg-[#ff8a65] shadow-[4px_4px_0_#14110f]">
        {icon}
      </div>
      <h2 className="font-heading text-3xl font-black tracking-[-0.035em]">
        {title}
      </h2>
    </div>
  );
}
