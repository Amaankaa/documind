"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleDotDashed,
  FileText,
  Fingerprint,
  FolderKanban,
  Layers3,
  LockKeyhole,
  MessageSquareQuote,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { href: "#cockpit", label: "Cockpit" },
  { href: "#workflow", label: "Workflow" },
  { href: "#trust", label: "Trust" },
];

const signals = [
  { label: "Upload", value: "247 files", icon: UploadCloud },
  { label: "Chunks", value: "18.4k", icon: Layers3 },
  { label: "Confidence", value: "96%", icon: ShieldCheck },
];

const orbitDocs = [
  "policy.pdf",
  "runbook.md",
  "renewals.csv",
  "handbook.docx",
  "sop.txt",
];

const intelligenceCards = [
  {
    icon: Search,
    title: "Source-aware search",
    description:
      "Ask a messy question and get the exact policy, contract clause, or spreadsheet row that proves the answer.",
  },
  {
    icon: Bot,
    title: "A teammate, not a search bar",
    description:
      "DocuMind remembers the thread, asks for missing context, and keeps citations close to every claim.",
  },
  {
    icon: Fingerprint,
    title: "Tenant-native control",
    description:
      "Knowledge bases stay isolated by organization with Clerk-backed auth and a backend built around scoped access.",
  },
];

const timeline = [
  {
    step: "01",
    title: "Drop in the library",
    body: "PDFs, docs, and CSVs get parsed into clean chunks with metadata that survives the whole pipeline.",
  },
  {
    step: "02",
    title: "Build the map",
    body: "Embeddings turn scattered files into a searchable memory layer powered by vector retrieval.",
  },
  {
    step: "03",
    title: "Ask like a person",
    body: "Streaming answers arrive with citations, so teams can move quickly without losing proof.",
  },
];

const proofPoints = [
  "Cited RAG responses",
  "Streaming chat",
  "Multi-tenant knowledge bases",
  "Document ingestion queue",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f5efe3] text-[#14110f]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <motion.div
          animate={{ x: [0, 80, 10, 0], y: [0, 30, 90, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-[#ff7a59]/30 blur-[90px]"
        />
        <motion.div
          animate={{ x: [0, -60, -20, 0], y: [0, 80, 20, 0], scale: [1, 0.95, 1.08, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[-10rem] top-20 h-[36rem] w-[36rem] rounded-full bg-[#7c3aed]/25 blur-[110px]"
        />
        <motion.div
          animate={{ x: [0, 45, -30, 0], y: [0, -70, -20, 0], scale: [1, 1.12, 0.98, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-[#19c6a3]/25 blur-[100px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,17,15,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(20,17,15,0.055)_1px,transparent_1px)] bg-[size:38px_38px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(245,239,227,0.86)_68%)]" />
      </div>

      <motion.nav
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="fixed inset-x-0 top-0 z-50 px-4 pt-4"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border border-[#14110f]/10 bg-[#fffaf1]/75 px-4 shadow-[0_20px_80px_rgba(20,17,15,0.12)] backdrop-blur-2xl md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#14110f] text-[#fffaf1] shadow-[0_8px_24px_rgba(20,17,15,0.25)]">
              <BrainCircuit className="size-5" />
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">
              DocuMind
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-semibold text-[#14110f]/60 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[#14110f]"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#14110f]/70 transition hover:bg-[#14110f]/5 hover:text-[#14110f] sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-[#14110f] px-5 py-2.5 text-sm font-bold text-[#fffaf1] shadow-[0_12px_34px_rgba(20,17,15,0.25)] transition hover:-translate-y-0.5 hover:bg-[#2a211e]"
            >
              Start free
            </Link>
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-14 px-6 pb-20 pt-36 lg:grid-cols-[0.92fr_1.08fr] lg:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="mb-7 inline-flex rotate-[-1deg] items-center gap-2 rounded-full border border-[#14110f]/10 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-[#14110f]/70 shadow-[0_12px_40px_rgba(20,17,15,0.08)]">
              <Sparkles className="size-4 text-[#ff5c35]" />
              Knowledge base with a pulse
            </div>

            <h1 className="font-heading text-[clamp(4rem,11vw,8.9rem)] font-black leading-[0.82] tracking-[-0.085em] text-[#14110f]">
              Stop
              <motion.span
                animate={{ rotate: [2, -1, 2], y: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mx-2 inline-block rounded-[2rem] bg-[#ffcc33] px-4 pb-3 pt-1 shadow-[8px_8px_0_#14110f]"
              >
                losing
              </motion.span>
              answers.
            </h1>

            <p className="mt-8 max-w-2xl text-lg font-medium leading-8 text-[#3b312c]/75 md:text-xl">
              DocuMind turns scattered docs into a living, cited AI workspace.
              Upload the chaos, ask the hard questions, and get answers your
              team can actually trust.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#14110f] px-7 py-4 text-base font-black text-[#fffaf1] shadow-[0_18px_40px_rgba(20,17,15,0.28)] transition hover:-translate-y-1"
              >
                Build your brain
                <ArrowRight className="size-5 transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-[#14110f] bg-[#fffaf1] px-7 py-4 text-base font-black text-[#14110f] transition hover:-translate-y-1 hover:bg-white"
              >
                Read the API
                <FileText className="size-5" />
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {signals.map((signal) => {
                const Icon = signal.icon;

                return (
                  <div
                    key={signal.label}
                    className="rounded-[1.5rem] border border-[#14110f]/10 bg-white/55 p-4 shadow-[0_12px_38px_rgba(20,17,15,0.08)] backdrop-blur"
                  >
                    <Icon className="mb-3 size-5 text-[#6d28d9]" />
                    <div className="text-xl font-black">{signal.value}</div>
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#14110f]/45">
                      {signal.label}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#14110f]/55">
              <span className="rounded-full bg-[#14110f] px-3 py-1.5 text-[#fffaf1]">
                Live memory feed
              </span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((dot) => (
                  <motion.span
                    key={dot}
                    animate={{ y: [0, -8, 0], opacity: [0.35, 1, 0.35] }}
                    transition={{
                      duration: 1.25,
                      repeat: Infinity,
                      delay: dot * 0.13,
                      ease: "easeInOut",
                    }}
                    className="size-2 rounded-full bg-[#ff5c35]"
                  />
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            id="cockpit"
            initial={{ opacity: 0, scale: 0.94, rotate: 1.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.85, ease: "easeOut", delay: 0.12 }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -16, 0], rotate: [-7, -4, -7] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-6 top-8 z-20 hidden rounded-[2rem] border-2 border-[#14110f] bg-[#a7f3d0] p-5 shadow-[10px_10px_0_#14110f] md:block"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-black">
                <CircleDotDashed className="size-4 animate-spin [animation-duration:5s]" />
                Live ingest
              </div>
              <div className="space-y-2 text-xs font-bold text-[#14110f]/70">
                <div className="rounded-full bg-white/70 px-3 py-2">
                  board_minutes.pdf
                </div>
                <div className="rounded-full bg-white/70 px-3 py-2">
                  employee_handbook.docx
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 14, 0], rotate: [6, 3, 6] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-3 bottom-12 z-20 hidden rounded-[2rem] border-2 border-[#14110f] bg-[#ff8a65] p-5 shadow-[10px_10px_0_#14110f] md:block"
            >
              <div className="mb-1 text-4xl font-black">0.82s</div>
              <div className="text-xs font-black uppercase tracking-[0.18em]">
                avg answer time
              </div>
            </motion.div>

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 z-0 hidden rounded-full md:block"
            >
              {orbitDocs.map((doc, index) => (
                <motion.div
                  key={doc}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transform: `rotate(${index * 72}deg) translateX(18rem) rotate(-${index * 72}deg)`,
                  }}
                >
                  <span className="inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-[#14110f]/15 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] shadow-lg backdrop-blur">
                    <FileText className="size-3 text-[#6d28d9]" />
                    {doc}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            <div className="relative overflow-hidden rounded-[3rem] border-2 border-[#14110f] bg-[#fffaf1] p-4 shadow-[18px_18px_0_#14110f]">
              <div className="rounded-[2.35rem] border border-[#14110f]/10 bg-[#14110f] p-4 text-[#fffaf1]">
                <div className="mb-4 flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-[#ff5c35]" />
                    <span className="size-3 rounded-full bg-[#ffcc33]" />
                    <span className="size-3 rounded-full bg-[#19c6a3]" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                    Memory cockpit
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                  <div className="space-y-3">
                    {["Policies", "Invoices", "Runbooks", "Sales"].map(
                      (item, index) => (
                        <div
                          key={item}
                          className="rounded-[1.4rem] border border-white/10 bg-white/[0.06] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="text-sm font-bold">{item}</div>
                            <div className="text-xs text-white/40">
                              {index + 12} docs
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${64 + index * 8}%` }}
                              transition={{
                                duration: 1.1,
                                delay: 0.55 + index * 0.15,
                                ease: "easeOut",
                              }}
                              className="h-full rounded-full bg-[#ffcc33]"
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="rounded-[2rem] bg-[#fffaf1] p-5 text-[#14110f]">
                    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#14110f]/10 bg-white px-4 py-3 shadow-sm">
                      <Search className="size-5 text-[#6d28d9]" />
                      <span className="text-sm font-bold text-[#14110f]/70">
                        Which vendor contracts renew this quarter?
                      </span>
                    </div>

                    <div className="space-y-3">
                      <motion.div
                        animate={{
                          boxShadow: [
                            "0 0 0 rgba(255,204,51,0)",
                            "0 0 35px rgba(255,204,51,0.28)",
                            "0 0 0 rgba(255,204,51,0)",
                          ],
                        }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                        className="rounded-[1.5rem] bg-[#14110f] p-4 text-[#fffaf1]"
                      >
                        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ffcc33]">
                          <MessageSquareQuote className="size-4" />
                          Answer with proof
                        </div>
                        <p className="text-sm leading-6 text-white/75">
                          Four contracts renew before June 30. The highest risk
                          item is DataNest because the notice window closes in
                          11 days.
                        </p>
                      </motion.div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                        <div className="rounded-2xl border border-[#14110f]/10 bg-[#f5efe3] p-3">
                          <div className="text-[#14110f]/45">Source</div>
                          vendor_master.csv
                        </div>
                        <div className="rounded-2xl border border-[#14110f]/10 bg-[#f5efe3] p-3">
                          <div className="text-[#14110f]/45">Citation</div>
                          chunk 14, row 82
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-5 md:grid-cols-3">
            {intelligenceCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                  className="group rounded-[2.25rem] border-2 border-[#14110f] bg-[#fffaf1] p-7 shadow-[10px_10px_0_rgba(20,17,15,0.95)] transition hover:-translate-y-2 hover:shadow-[16px_16px_0_rgba(20,17,15,0.95)]"
                >
                  <div className="mb-8 grid size-14 place-items-center rounded-2xl bg-[#14110f] text-[#fffaf1] transition group-hover:rotate-6">
                    <Icon className="size-7" />
                  </div>
                  <h3 className="mb-3 font-heading text-2xl font-black tracking-tight">
                    {card.title}
                  </h3>
                  <p className="leading-7 text-[#3b312c]/72">
                    {card.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section
          id="workflow"
          className="mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div>
            <div className="mb-5 inline-flex rounded-full bg-[#14110f] px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#fffaf1]">
              How it moves
            </div>
            <h2 className="font-heading text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-7xl">
              From dusty archive to instant answer.
            </h2>
          </div>

          <div className="space-y-4">
            {timeline.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="grid gap-5 rounded-[2rem] border-2 border-[#14110f] bg-white/70 p-6 shadow-[8px_8px_0_#14110f] backdrop-blur md:grid-cols-[5rem_1fr]"
              >
                <div className="font-heading text-4xl font-black text-[#ff5c35]">
                  {item.step}
                </div>
                <div>
                  <h3 className="mb-2 text-2xl font-black">{item.title}</h3>
                  <p className="leading-7 text-[#3b312c]/72">{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="trust" className="mx-auto max-w-7xl px-6 py-20">
          <div className="overflow-hidden rounded-[3rem] border-2 border-[#14110f] bg-[#14110f] p-6 text-[#fffaf1] shadow-[18px_18px_0_#ffcc33] md:p-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#a7f3d0]">
                  <LockKeyhole className="size-4" />
                  Built for guarded knowledge
                </div>
                <h2 className="font-heading text-4xl font-black leading-none tracking-[-0.045em] md:text-6xl">
                  The answer is only useful if people trust where it came from.
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62">
                  DocuMind keeps the impressive part attached to the responsible
                  part: secure access, isolated knowledge bases, citations, and
                  a backend path that treats documents as sensitive by default.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {proofPoints.map((point) => (
                  <div
                    key={point}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4"
                  >
                    <CheckCircle2 className="mb-4 size-6 text-[#a7f3d0]" />
                    <div className="font-bold">{point}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="relative overflow-hidden rounded-[3rem] border-2 border-[#14110f] bg-[#ffcc33] p-8 shadow-[18px_18px_0_#14110f] md:p-14">
            <div className="absolute right-8 top-8 hidden rotate-12 rounded-full bg-[#ff5c35] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#14110f] md:block">
              ship it
            </div>
            <FolderKanban className="mb-8 size-14" />
            <h2 className="max-w-3xl font-heading text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
              Give your team the company brain they keep pretending Slack is.
            </h2>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-3 rounded-full bg-[#14110f] px-7 py-4 text-base font-black text-[#fffaf1] transition hover:-translate-y-1"
              >
                Create a knowledge base
                <Zap className="size-5" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-[#14110f] bg-[#fffaf1] px-7 py-4 text-base font-black text-[#14110f] transition hover:-translate-y-1"
              >
                Explore docs
                <ArrowRight className="size-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 px-6 pb-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t-2 border-[#14110f]/10 pt-8 text-sm font-bold text-[#14110f]/55 md:flex-row">
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-5" />
            DocuMind, 2026
          </div>
          <div className="flex gap-5">
            <Link href="/docs" className="transition hover:text-[#14110f]">
              Docs
            </Link>
            <Link href="/sign-in" className="transition hover:text-[#14110f]">
              Sign in
            </Link>
            <Link href="/sign-up" className="transition hover:text-[#14110f]">
              Start free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
