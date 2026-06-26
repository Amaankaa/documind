"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "@/components/brand/motion";
import { useCountUp } from "@/components/brand/useCountUp";
import { useMe } from "@/hooks/useMe";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  Globe,
  MessageSquare,
  Upload,
} from "lucide-react";

interface Usage {
  total_documents: number;
  total_chunks: number;
  total_messages: number;
}

interface WorkspaceDoc {
  id: string;
  filename: string;
  file_type: string;
  status: "processing" | "ready" | "failed";
  chunk_count: number | null;
}

function StatValue({ value }: { value: number }) {
  const display = useCountUp(value);
  return <p className="mt-2 text-4xl font-black tracking-tight tabular-nums">{display.toLocaleString()}</p>;
}

export default function WorkspacePage() {
  const { data: me } = useMe();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [docs, setDocs] = useState<WorkspaceDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const personalKbId = me?.personal_kb_id;

  const load = useCallback(async () => {
    try {
      const usageRes = await api.get<Usage>("/api/org/usage");
      setUsage(usageRes.data);
      if (personalKbId) {
        const docsRes = await api.get<WorkspaceDoc[]>(`/api/kb/${personalKbId}/documents`);
        setDocs(docsRes.data);
      } else {
        setDocs([]);
      }
    } catch (error) {
      console.error("Failed to load workspace data", error);
    } finally {
      setLoading(false);
    }
  }, [personalKbId]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const chunkCount = me?.personal_chunk_count ?? usage?.total_chunks ?? 0;
  const chunkLimit = me?.personal_chunk_limit ?? 100;
  const chunkPct = chunkLimit > 0 ? Math.min(100, Math.round((chunkCount / chunkLimit) * 100)) : 0;
  const communityKbId = me?.community_kb_id;

  const stats = [
    { label: "Your documents", value: usage?.total_documents, icon: FileText, color: "bg-sun" },
    { label: "Chunks used", value: chunkCount, icon: Database, color: "bg-mint" },
    { label: "Tutor chats", value: usage?.total_messages, icon: MessageSquare, color: "bg-coral" },
  ];

  return (
    <div className="w-full p-5 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="rounded-[2.5rem] border-2 border-ink bg-violet p-6 shadow-[12px_12px_0_var(--color-ink)] md:p-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/55">
            Personal workspace
          </p>
          <h1 className="mt-2 font-heading text-4xl font-black tracking-tight md:text-5xl">
            Your notes & uploads
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-ink/70 md:text-base">
            Community DSA notes power the study map and tutor. Upload your own
            materials here — they&apos;re merged into tutor answers alongside the
            official corpus.
          </p>

          <div className="mt-6 rounded-2xl border-2 border-ink bg-cream p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black">Personal chunk quota</p>
              <p className="font-heading text-lg font-black tabular-nums">
                {chunkCount} / {chunkLimit}
              </p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-ink bg-canvas">
              <div
                className="h-full rounded-full bg-mint transition-all"
                style={{ width: `${chunkPct}%` }}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {personalKbId && (
              <Link href={`/kb/${personalKbId}/docs`}>
                <Button className="rounded-full border-2 border-ink bg-sun font-black text-ink shadow-[4px_4px_0_var(--color-ink)] hover:-translate-y-0.5">
                  <Upload className="mr-2 h-4 w-4" />
                  Manage documents
                </Button>
              </Link>
            )}
            {communityKbId && (
              <Link href={`/kb/${communityKbId}/chat`}>
                <Button
                  variant="outline"
                  className="rounded-full border-2 border-ink bg-cream font-black text-ink shadow-[4px_4px_0_var(--color-ink)] hover:-translate-y-0.5"
                >
                  Open tutor
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link href="/map">
              <Button
                variant="outline"
                className="rounded-full border-2 border-ink bg-canvas font-black text-ink hover:-translate-y-0.5"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Study map
              </Button>
            </Link>
          </div>
        </motion.section>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid gap-5 md:grid-cols-3"
        >
          {stats.map(({ label, value, icon: Icon, color }) => (
            <motion.div
              key={label}
              variants={fadeIn}
              className="rounded-[2rem] border-2 border-ink bg-cream p-5 shadow-[8px_8px_0_var(--color-ink)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/45">
                    {label}
                  </p>
                  {loading ? (
                    <Skeleton className="mt-3 h-9 w-16 rounded-xl bg-ink/10" />
                  ) : (
                    <StatValue value={value ?? 0} />
                  )}
                </div>
                <div className={`grid size-12 place-items-center rounded-2xl border-2 border-ink ${color}`}>
                  <Icon className="size-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="rounded-[2rem] border-2 border-ink bg-cream p-6 shadow-[8px_8px_0_var(--color-ink)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/45">
                Your uploads
              </p>
              <h2 className="mt-1 font-heading text-2xl font-black tracking-tight">
                Embedded sources
              </h2>
            </div>
            {personalKbId && (
              <Link href={`/kb/${personalKbId}/docs`}>
                <Button
                  variant="outline"
                  className="rounded-full border-2 border-ink bg-canvas font-black text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-y-0.5"
                >
                  Manage all
                </Button>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl bg-ink/10" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <p className="mt-5 text-sm font-semibold text-ink/55">
              No personal uploads yet. Add notes from My documents to merge them into tutor answers.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-canvas px-4 py-3"
                >
                  <div className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-sun">
                    {doc.file_type === "url" ? (
                      <Globe className="size-4" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{doc.filename}</p>
                    <p className="text-xs font-semibold text-ink/45">
                      {doc.chunk_count != null ? `${doc.chunk_count} chunks` : doc.file_type.toUpperCase()}
                    </p>
                  </div>
                  {doc.status === "ready" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-mint px-3 py-1 text-xs font-black">
                      <CheckCircle2 className="size-3" />
                      Ready
                    </span>
                  ) : (
                    <span className="rounded-full border-2 border-ink bg-sun px-3 py-1 text-xs font-black capitalize">
                      {doc.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>
    </div>
  );
}
