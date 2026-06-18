"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FlaskConical,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  evalApi,
  api,
  type EvalCase,
  type EvalResult,
  type EvalRun,
  type EvalSetDetail,
  type EvalSetSummary,
} from "@/lib/api";
import { PageHero } from "@/components/brand/PageHero";
import { BrutalCard } from "@/components/brand/BrutalCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fadeIn, staggerContainer } from "@/components/brand/motion";
import { cn } from "@/lib/utils";

interface DocLite {
  id: string;
  filename: string;
  status: string;
}

const POLL_MS = 2500;

function pct(v: number | null | undefined): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

export default function EvalPage() {
  const { id: kbId } = useParams<{ id: string }>();

  const [sets, setSets] = useState<EvalSetSummary[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EvalSetDetail | null>(null);
  const [docs, setDocs] = useState<DocLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [numCases, setNumCases] = useState(6);

  const [question, setQuestion] = useState("");
  const [relevantDocIds, setRelevantDocIds] = useState<string[]>([]);
  const [addingCase, setAddingCase] = useState(false);

  const [run, setRun] = useState<EvalRun | null>(null);
  const [results, setResults] = useState<EvalResult[]>([]);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSets = useCallback(async () => {
    try {
      const res = await evalApi.listSets(kbId);
      setSets(res.data);
      return res.data;
    } catch {
      toast.error("Couldn't load evaluation sets.");
      return [];
    }
  }, [kbId]);

  const loadDetail = useCallback(async (setId: string) => {
    try {
      const res = await evalApi.getSet(setId);
      setDetail(res.data);
    } catch {
      setDetail(null);
    }
  }, []);

  // Initial load: sets + KB documents (for manual ground-truth tagging).
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [loaded] = await Promise.all([
        loadSets(),
        api
          .get<DocLite[]>(`/api/kb/${kbId}/documents`)
          .then((r) => setDocs(r.data))
          .catch(() => setDocs([])),
      ]);
      if (loaded.length > 0) {
        setSelectedSetId(loaded[0].id);
        await loadDetail(loaded[0].id);
        const lr = loaded[0].latest_run;
        if (lr) {
          setRun(lr);
          if (lr.status === "completed") {
            evalApi.getResults(lr.id).then((r) => setResults(r.data)).catch(() => {});
          }
        }
      }
      setLoading(false);
    })();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [kbId, loadSets, loadDetail]);

  const selectSet = async (setId: string) => {
    setSelectedSetId(setId);
    setRun(null);
    setResults([]);
    await loadDetail(setId);
    const summary = sets.find((s) => s.id === setId);
    if (summary?.latest_run) {
      setRun(summary.latest_run);
      if (summary.latest_run.status === "completed") {
        evalApi.getResults(summary.latest_run.id).then((r) => setResults(r.data)).catch(() => {});
      }
    }
  };

  const handleCreateSet = async () => {
    const name = newSetName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await evalApi.createSet(kbId, name);
      setNewSetName("");
      await loadSets();
      setSelectedSetId(res.data.id);
      setDetail(res.data);
      setRun(null);
      setResults([]);
      toast.success("Evaluation set created.");
    } catch {
      toast.error("Couldn't create the set.");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSetId) return;
    setGenerating(true);
    try {
      const res = await evalApi.generate(kbId, selectedSetId, numCases);
      setDetail(res.data);
      await loadSets();
      toast.success(`Generated ${res.data.cases.filter((c) => c.origin === "auto").length} cases.`);
    } catch (e) {
      const detailMsg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Generation failed.";
      toast.error(detailMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddCase = async () => {
    if (!selectedSetId || !question.trim()) return;
    setAddingCase(true);
    try {
      await evalApi.addCase(selectedSetId, question.trim(), relevantDocIds);
      setQuestion("");
      setRelevantDocIds([]);
      await loadDetail(selectedSetId);
      toast.success("Case added.");
    } catch {
      toast.error("Couldn't add the case.");
    } finally {
      setAddingCase(false);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!selectedSetId) return;
    try {
      await evalApi.deleteCase(selectedSetId, caseId);
      await loadDetail(selectedSetId);
    } catch {
      toast.error("Couldn't delete the case.");
    }
  };

  const pollRun = useCallback((runId: string) => {
    const tick = async () => {
      try {
        const res = await evalApi.getRun(runId);
        setRun(res.data);
        if (res.data.status === "completed") {
          const r = await evalApi.getResults(runId);
          setResults(r.data);
          loadSets();
          return;
        }
        if (res.data.status === "failed") {
          toast.error(res.data.error ?? "Evaluation run failed.");
          loadSets();
          return;
        }
        pollRef.current = setTimeout(tick, POLL_MS);
      } catch {
        pollRef.current = setTimeout(tick, POLL_MS);
      }
    };
    pollRef.current = setTimeout(tick, POLL_MS);
  }, [loadSets]);

  const handleRun = async () => {
    if (!selectedSetId) return;
    setResults([]);
    try {
      const res = await evalApi.run(selectedSetId);
      setRun(res.data);
      pollRun(res.data.id);
    } catch (e) {
      const detailMsg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Couldn't start the run.";
      toast.error(detailMsg);
    }
  };

  const toggleDoc = (id: string) =>
    setRelevantDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );

  const cases = detail?.cases ?? [];
  const running = run?.status === "pending" || run?.status === "running";
  const completed = run?.status === "completed";
  const readyDocs = docs.filter((d) => d.status === "ready");

  const metricBars = completed
    ? [
        { name: "Hit rate", value: run?.hit_rate ?? 0 },
        { name: "MRR", value: run?.mrr ?? 0 },
        { name: "Precision", value: run?.avg_precision ?? 0 },
        { name: "Grounded", value: run?.avg_groundedness ?? 0 },
        { name: "Relevance", value: run?.avg_relevance ?? 0 },
      ]
    : [];
  const barColors = [
    "var(--color-sun)",
    "var(--color-mint)",
    "var(--color-teal)",
    "var(--color-violet)",
    "var(--color-lilac)",
  ];

  return (
    <div className="w-full p-5 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHero
          eyebrow={
            <>
              <FlaskConical className="size-4" />
              Quality, measured
            </>
          }
          title="Does it actually answer?"
          description="Score retrieval and answer quality on a labeled test set — hit rate, MRR, groundedness, and relevance — so 'it works' becomes a number."
          tone="bg-violet"
          badge="Evaluation"
        />

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-[2rem] bg-ink/10" />
            ))}
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
            {/* Set picker + create */}
            <motion.div variants={fadeIn}>
              <BrutalCard className="p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  {sets.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectSet(s.id)}
                      className={cn(
                        "cursor-pointer rounded-full border-2 border-ink px-4 py-1.5 text-sm font-black transition",
                        s.id === selectedSetId
                          ? "bg-ink text-cream"
                          : "bg-cream text-ink hover:bg-ink/5",
                      )}
                    >
                      {s.name}
                      <span className="ml-2 text-xs font-bold opacity-60">{s.case_count}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newSetName}
                      onChange={(e) => setNewSetName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateSet()}
                      placeholder="New test set…"
                      className="h-9 w-40 border-2 border-ink"
                    />
                    <Button
                      onClick={handleCreateSet}
                      disabled={creating || !newSetName.trim()}
                      className="h-9 gap-1 border-2 border-ink bg-sun font-black text-ink shadow-[3px_3px_0_var(--color-ink)] hover:bg-sun"
                    >
                      {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                      Set
                    </Button>
                  </div>
                </div>
              </BrutalCard>
            </motion.div>

            {!selectedSetId ? (
              <motion.div variants={fadeIn}>
                <BrutalCard className="flex flex-col items-center gap-3 p-12 text-center">
                  <div className="grid size-12 place-items-center rounded-2xl border-2 border-ink bg-violet">
                    <FlaskConical className="size-6" />
                  </div>
                  <p className="max-w-sm font-bold text-ink/70">
                    Create a test set to start measuring retrieval and answer quality.
                  </p>
                </BrutalCard>
              </motion.div>
            ) : (
              <>
                {/* Build the set: generate + manual */}
                <motion.div variants={fadeIn} className="grid gap-6 lg:grid-cols-2">
                  <BrutalCard className="p-5 md:p-6">
                    <SectionHead icon={<Sparkles className="size-5" />} title="Generate from documents" sub="Gemini writes questions from your docs" />
                    <p className="mt-3 rounded-xl border-2 border-dashed border-ink/25 bg-sun/30 px-3 py-2 text-xs font-semibold text-ink/65">
                      Ground truth is <strong>synthetic</strong>: each question is written from a source
                      chunk, and that chunk&apos;s document is treated as the correct retrieval target.
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={numCases}
                        onChange={(e) => setNumCases(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                        className="h-10 w-20 border-2 border-ink"
                      />
                      <Button
                        onClick={handleGenerate}
                        disabled={generating || readyDocs.length === 0}
                        className="h-10 gap-2 border-2 border-ink bg-mint font-black text-ink shadow-[3px_3px_0_var(--color-ink)] hover:bg-mint"
                      >
                        {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                        Generate cases
                      </Button>
                    </div>
                    {readyDocs.length === 0 && (
                      <p className="mt-2 text-xs font-semibold text-coral">
                        No processed documents yet — upload one first.
                      </p>
                    )}
                  </BrutalCard>

                  <BrutalCard className="p-5 md:p-6">
                    <SectionHead icon={<Target className="size-5" />} title="Add a case manually" sub="Tag the documents that should be retrieved" />
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="What question should this answer?"
                      className="mt-4 h-10 border-2 border-ink"
                    />
                    {readyDocs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {readyDocs.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => toggleDoc(d.id)}
                            className={cn(
                              "max-w-[12rem] truncate rounded-full border-2 border-ink px-2.5 py-1 text-[11px] font-black transition",
                              relevantDocIds.includes(d.id)
                                ? "bg-teal text-ink"
                                : "bg-cream text-ink/70 hover:bg-ink/5",
                            )}
                            title={d.filename}
                          >
                            {d.filename}
                          </button>
                        ))}
                      </div>
                    )}
                    <Button
                      onClick={handleAddCase}
                      disabled={addingCase || !question.trim()}
                      className="mt-4 h-10 gap-2 border-2 border-ink bg-sun font-black text-ink shadow-[3px_3px_0_var(--color-ink)] hover:bg-sun"
                    >
                      {addingCase ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                      Add case
                    </Button>
                  </BrutalCard>
                </motion.div>

                {/* Cases + run */}
                <motion.div variants={fadeIn}>
                  <BrutalCard className="p-5 md:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <SectionHead icon={<FlaskConical className="size-5" />} title={`${cases.length} test case${cases.length === 1 ? "" : "s"}`} sub="Questions + labeled relevant documents" />
                      <Button
                        onClick={handleRun}
                        disabled={running || cases.length === 0}
                        className="h-10 shrink-0 gap-2 border-2 border-ink bg-violet font-black text-ink shadow-[4px_4px_0_var(--color-ink)] hover:bg-violet"
                      >
                        {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                        {running ? "Running…" : "Run evaluation"}
                      </Button>
                    </div>

                    {cases.length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {cases.map((c) => (
                          <CaseRow key={c.id} c={c} onDelete={() => handleDeleteCase(c.id)} />
                        ))}
                      </ul>
                    )}
                  </BrutalCard>
                </motion.div>

                {/* Metrics */}
                {completed && (
                  <>
                    <motion.div variants={fadeIn} className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                      <MetricCard label="Hit rate" value={pct(run?.hit_rate)} tone="bg-sun" hint="≥1 relevant doc retrieved" />
                      <MetricCard label="MRR" value={(run?.mrr ?? 0).toFixed(2)} tone="bg-mint" hint="rank of first hit" />
                      <MetricCard label="Precision@k" value={pct(run?.avg_precision)} tone="bg-teal" hint="retrieved that are relevant" />
                      <MetricCard label="Groundedness" value={pct(run?.avg_groundedness)} tone="bg-violet" hint="claims supported by context" />
                      <MetricCard label="Relevance" value={pct(run?.avg_relevance)} tone="bg-lilac" hint="answers the question" />
                    </motion.div>

                    <motion.div variants={fadeIn}>
                      <BrutalCard className="p-5 md:p-6">
                        <SectionHead icon={<Target className="size-5" />} title="Score profile" sub="All metrics on a 0–1 scale" />
                        <div className="mt-4 h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metricBars} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                              <XAxis dataKey="name" tick={{ fill: "var(--color-ink)", fontSize: 11, fontWeight: 700 }} stroke="var(--color-ink)" />
                              <YAxis domain={[0, 1]} tick={{ fill: "var(--color-ink)", fontSize: 11, fontWeight: 700 }} stroke="var(--color-ink)" width={36} />
                              <Tooltip
                                cursor={{ fill: "color-mix(in oklab, var(--color-ink) 6%, transparent)" }}
                                content={<MetricTooltip />}
                              />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]} stroke="var(--color-ink)" strokeWidth={2}>
                                {metricBars.map((_, i) => (
                                  <Cell key={i} fill={barColors[i % barColors.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </BrutalCard>
                    </motion.div>

                    {results.length > 0 && (
                      <motion.div variants={fadeIn}>
                        <BrutalCard className="overflow-hidden p-5 md:p-6">
                          <SectionHead icon={<FlaskConical className="size-5" />} title="Per-case results" sub="Retrieval hit + judge scores + rationale" />
                          <div className="mt-4 space-y-2">
                            {results.map((r) => (
                              <ResultRow key={r.id} r={r} />
                            ))}
                          </div>
                        </BrutalCard>
                      </motion.div>
                    )}
                  </>
                )}

                {run?.status === "failed" && (
                  <motion.div variants={fadeIn}>
                    <BrutalCard className="border-coral p-5">
                      <p className="text-sm font-black text-ink">Run failed: {run.error}</p>
                    </BrutalCard>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function MetricTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border-2 border-ink bg-cream px-3 py-2 text-xs font-black text-ink shadow-[3px_3px_0_var(--color-ink)]">
      <div className="mb-0.5 text-ink/55">{label}</div>
      {Number(payload[0].value).toFixed(2)}
    </div>
  );
}

function SectionHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-sun text-ink">{icon}</div>
      <div className="min-w-0">
        <h2 className="truncate font-heading text-lg font-black tracking-tight">{title}</h2>
        <p className="truncate text-xs font-bold text-ink/45">{sub}</p>
      </div>
    </div>
  );
}

function CaseRow({ c, onDelete }: { c: EvalCase; onDelete: () => void }) {
  return (
    <li className="group flex items-start gap-2 rounded-xl border-2 border-ink/10 px-3 py-2 hover:border-ink/25">
      <span
        className={cn(
          "mt-0.5 shrink-0 rounded-full border-2 border-ink px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
          c.origin === "auto" ? "bg-mint" : "bg-teal",
        )}
        title={c.origin === "auto" ? "Auto-generated (synthetic ground truth)" : "Manually authored"}
      >
        {c.origin}
      </span>
      <p className="min-w-0 flex-1 text-sm font-semibold text-ink/85">{c.question}</p>
      <span className="mt-0.5 shrink-0 text-[10px] font-bold text-ink/40">
        {(c.relevant_doc_ids?.length ?? 0)} doc{(c.relevant_doc_ids?.length ?? 0) === 1 ? "" : "s"}
      </span>
      <button
        onClick={onDelete}
        aria-label="Delete case"
        className="shrink-0 cursor-pointer rounded-lg p-1 text-ink/35 opacity-0 transition hover:bg-coral/50 hover:text-ink group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}

function MetricCard({ label, value, tone, hint }: { label: string; value: string; tone: string; hint: string }) {
  return (
    <div className={cn("rounded-2xl border-2 border-ink p-4 shadow-[5px_5px_0_var(--color-ink)]", tone)}>
      <div className="font-heading text-3xl font-black tracking-tight text-ink">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-ink">{label}</div>
      <div className="mt-0.5 text-[10px] font-bold leading-tight text-ink/55">{hint}</div>
    </div>
  );
}

function ResultRow({ r }: { r: EvalResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border-2 border-ink/12">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink text-[10px] font-black",
            r.retrieval_hit ? "bg-mint" : "bg-coral",
          )}
          title={r.retrieval_hit ? "Relevant doc retrieved" : "Missed"}
        >
          {r.retrieval_hit ? "✓" : "✕"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink/85">{r.question}</span>
        <span className="shrink-0 text-xs font-black text-ink/70">G {pct(r.groundedness)}</span>
        <span className="shrink-0 text-xs font-black text-ink/70">R {pct(r.relevance)}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t-2 border-ink/10 px-3 py-3 text-xs">
          {r.judge_rationale && (
            <p className="font-semibold text-ink/70">
              <span className="font-black text-ink">Judge:</span> {r.judge_rationale}
            </p>
          )}
          {r.generated_answer && (
            <p className="whitespace-pre-wrap rounded-lg bg-ink/5 p-2 font-medium text-ink/75">
              {r.generated_answer}
            </p>
          )}
          <p className="font-bold text-ink/45">
            MRR {r.reciprocal_rank.toFixed(2)} · Precision@k {pct(r.precision_at_k)}
          </p>
        </div>
      )}
    </div>
  );
}
