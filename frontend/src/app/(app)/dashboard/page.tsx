"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeIn, staggerContainer } from "@/components/brand/motion";
import { useCountUp } from "@/components/brand/useCountUp";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  BookOpen,
  Database,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

interface KB {
  id: string;
  name: string;
  description?: string;
  org_id: string;
}

interface Usage {
  total_documents: number;
  total_chunks: number;
  total_messages: number;
}

function StatValue({ value }: { value: number }) {
  const display = useCountUp(value);
  return <p className="mt-2 text-4xl font-black tracking-tight tabular-nums">{display.toLocaleString()}</p>;
}

export default function DashboardPage() {
  const [kbs, setKbs] = useState<KB[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const load = useCallback(async () => {
    try {
      const [kbsRes, usageRes] = await Promise.all([
        api.get<KB[]>("/api/kb"),
        api.get<Usage>("/api/org/usage"),
      ]);
      setKbs(kbsRes.data);
      setUsage(usageRes.data);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const createKB = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post("/api/kb", {
        name: newName,
        description: newDesc || undefined,
      });
      toast.success("Knowledge base created");
      setDialogOpen(false);
      setNewName("");
      setNewDesc("");
      load();
    } catch {
      toast.error("Failed to create knowledge base");
    } finally {
      setCreating(false);
    }
  };

  const stats = [
    {
      label: "Documents",
      value: usage?.total_documents,
      icon: FileText,
      color: "bg-sun",
    },
    {
      label: "Chunks indexed",
      value: usage?.total_chunks,
      icon: Database,
      color: "bg-mint",
    },
    {
      label: "AI responses",
      value: usage?.total_messages,
      icon: MessageSquare,
      color: "bg-coral",
    },
  ];

  return (
    <div className="w-full p-5 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="relative overflow-hidden rounded-[2.5rem] border-2 border-ink bg-sun p-6 shadow-[12px_12px_0_var(--color-ink)] md:p-8"
        >
          <div className="absolute right-6 top-6 hidden rotate-6 rounded-full bg-flame px-4 py-2 text-xs font-black uppercase tracking-[0.18em] md:block">
            Command center
          </div>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cream">
                <Sparkles className="size-4" />
                Workspace pulse
              </div>
              <h1 className="font-heading text-5xl font-black leading-none tracking-[-0.055em] md:text-7xl">
                Your knowledge bases.
              </h1>
              <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-ink/68">
                Build isolated brains for teams, projects, and messy document
                piles that deserve answers with receipts.
              </p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={
                  <Button className="h-12 rounded-full border-2 border-ink bg-ink px-6 font-black text-cream shadow-[6px_6px_0_rgba(20,17,15,0.35)] transition hover:-translate-y-1 hover:bg-ink-soft" />
                }
              >
                <Plus className="mr-2 size-4" />
                New workspace
              </DialogTrigger>
              <DialogContent className="rounded-[2rem] border-2 border-ink bg-cream text-ink shadow-[12px_12px_0_var(--color-ink)] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl font-black">
                    New knowledge base
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-2 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-ink/50">
                      Name
                    </label>
                    <Input
                      placeholder="e.g. HR Policies 2026"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-11 rounded-2xl border-2 border-ink/20 bg-cream text-ink placeholder:text-ink/30 focus-visible:ring-sun"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-ink/50">
                      Description <span className="normal-case">(optional)</span>
                    </label>
                    <Textarea
                      placeholder="What kind of documents will live here?"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      rows={3}
                      className="resize-none rounded-2xl border-2 border-ink/20 bg-cream text-ink placeholder:text-ink/30 focus-visible:ring-sun"
                    />
                  </div>
                  <Button
                    onClick={createKB}
                    disabled={creating || !newName.trim()}
                    className="h-11 w-full rounded-full bg-ink font-black text-cream hover:bg-ink-soft"
                  >
                    {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Create workspace
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

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
              className="group relative overflow-hidden rounded-[2rem] border-2 border-ink bg-cream p-5 shadow-[8px_8px_0_var(--color-ink)] transition duration-200 hover:-translate-y-1 hover:shadow-[11px_11px_0_var(--color-ink)]"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 size-32 -translate-x-2 translate-y-2 rounded-full bg-ink/[0.03] transition duration-500 group-hover:translate-x-0 group-hover:translate-y-0" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/45">
                    {label}
                  </p>
                  {loading ? (
                    <Skeleton className="mt-3 h-9 w-20 rounded-xl bg-ink/10" />
                  ) : (
                    <StatValue value={value ?? 0} />
                  )}
                </div>
                <div className={`grid size-12 place-items-center rounded-2xl border-2 border-ink transition duration-200 group-hover:rotate-6 ${color}`}>
                  <Icon className="size-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <div className="mb-5 flex items-center gap-3">
            <BookOpen className="size-5 text-ink/50" />
            <h2 className="text-xs font-black uppercase tracking-[0.24em] text-ink/55">
              Your workspaces
            </h2>
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-[2rem] bg-ink/10" />
              ))}
            </div>
          ) : kbs.length === 0 ? (
            <div className="rounded-[2.5rem] border-2 border-dashed border-ink bg-cream/60 p-10 text-center shadow-[8px_8px_0_var(--color-ink)]">
              <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border-2 border-ink bg-mint">
                <Search className="size-6" />
              </div>
              <h3 className="text-2xl font-black">No workspaces yet</h3>
              <p className="mx-auto mt-3 max-w-sm font-medium leading-7 text-ink/60">
                Create your first workspace to start uploading documents and
                asking cited questions.
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="mt-6 h-11 rounded-full bg-ink px-6 font-black text-cream hover:bg-ink-soft"
              >
                <Plus className="mr-2 size-4" />
                New workspace
              </Button>
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            >
              {kbs.map((kb, index) => (
                <motion.div key={kb.id} variants={fadeIn}>
                  <Link href={`/kb/${kb.id}/chat`} className="block h-full">
                    <div className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border-2 border-ink bg-cream p-5 shadow-[8px_8px_0_var(--color-ink)] transition duration-200 hover:-translate-y-2 hover:shadow-[13px_13px_0_var(--color-ink)]">
                      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-sun/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <div className="relative mb-8 flex items-start justify-between gap-4">
                        <div className="grid size-12 place-items-center rounded-2xl border-2 border-ink bg-sun">
                          <BookOpen className="size-6" />
                        </div>
                        <Badge className="rounded-full border-2 border-ink bg-mint px-3 py-1 text-xs font-black text-ink">
                          Brain {String(index + 1).padStart(2, "0")}
                        </Badge>
                      </div>
                      <h3 className="relative line-clamp-1 font-heading text-2xl font-black tracking-tight">
                        {kb.name}
                      </h3>
                      <p className="relative mt-3 line-clamp-3 flex-1 text-sm font-medium leading-6 text-ink/58">
                        {kb.description ?? "No description provided."}
                      </p>
                      <div className="relative mt-6 flex items-center gap-2 text-sm font-black text-ink transition group-hover:translate-x-1">
                        Open workspace
                        <ArrowRight className="size-4" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
