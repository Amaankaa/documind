"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, FileText, MessageSquare, ThumbsUp } from "lucide-react";
import { api, type Analytics } from "@/lib/api";
import { PageHero } from "@/components/brand/PageHero";
import { BrutalCard } from "@/components/brand/BrutalCard";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeIn, staggerContainer } from "@/components/brand/motion";

const ACCENTS = ["var(--color-sun)", "var(--color-mint)", "var(--color-coral)", "var(--color-violet)", "var(--color-teal)", "var(--color-lilac)"];

function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
  formatLabel,
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string }[];
  label?: string | number;
  unit?: string;
  formatLabel?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const shownLabel =
    label != null ? (formatLabel ? formatLabel(String(label)) : String(label)) : "";
  return (
    <div className="rounded-xl border-2 border-ink bg-cream px-3 py-2 text-xs font-black text-ink shadow-[3px_3px_0_var(--color-ink)]">
      {shownLabel && <div className="mb-0.5 text-ink/55">{shownLabel}</div>}
      {payload.map((p, i) => (
        <div key={i}>
          {p.value}
          {unit}
          {p.name ? ` ${p.name}` : ""}
        </div>
      ))}
    </div>
  );
}

function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function truncate(name: string, max = 22) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Analytics>("/api/org/analytics")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const totalQueries = data?.queries_over_time.reduce((s, d) => s + d.count, 0) ?? 0;
  const fbTotal = (data?.feedback.positive ?? 0) + (data?.feedback.negative ?? 0);
  const satisfaction = fbTotal > 0 ? Math.round(((data?.feedback.positive ?? 0) / fbTotal) * 100) : null;

  const feedbackData = [
    { name: "Helpful", value: data?.feedback.positive ?? 0, color: "var(--color-mint)" },
    { name: "Not helpful", value: data?.feedback.negative ?? 0, color: "var(--color-coral)" },
  ];

  return (
    <div className="w-full p-5 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHero
          eyebrow={
            <>
              <BarChart3 className="size-4" />
              Workspace signal
            </>
          }
          title="Signal from the noise."
          description="See what your team asks, which documents earn their keep, and whether the answers land."
          tone="bg-mint"
          badge="Analytics"
        />

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-[2rem] bg-ink/10" />
            ))}
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid gap-6 lg:grid-cols-2"
          >
            {/* Queries over time */}
            <motion.div variants={fadeIn} className="lg:col-span-2">
              <BrutalCard className="p-5 md:p-6">
                <ChartHeading icon={<MessageSquare className="size-5" />} title="Queries over time" sub={`${totalQueries} answers · last 14 days`} />
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.queries_over_time ?? []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="q" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-sun)" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="var(--color-sun)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "var(--color-ink)", fontSize: 11, fontWeight: 700 }} stroke="var(--color-ink)" interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fill: "var(--color-ink)", fontSize: 11, fontWeight: 700 }} stroke="var(--color-ink)" width={32} />
                      <Tooltip content={<ChartTooltip unit=" queries" formatLabel={shortDate} />} cursor={{ stroke: "var(--color-ink)", strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="count" stroke="var(--color-ink)" strokeWidth={2.5} fill="url(#q)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </BrutalCard>
            </motion.div>

            {/* Top documents */}
            <motion.div variants={fadeIn}>
              <BrutalCard className="h-full p-5 md:p-6">
                <ChartHeading icon={<FileText className="size-5" />} title="Most-cited documents" sub="By citations in answers" />
                {data && data.top_documents.length > 0 ? (
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.top_documents} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                        <XAxis type="number" allowDecimals={false} hide />
                        <YAxis type="category" dataKey="filename" tickFormatter={truncate} width={130} tick={{ fill: "var(--color-ink)", fontSize: 11, fontWeight: 700 }} stroke="var(--color-ink)" />
                        <Tooltip content={<ChartTooltip unit=" citations" />} cursor={{ fill: "color-mix(in oklab, var(--color-ink) 6%, transparent)" }} />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]} stroke="var(--color-ink)" strokeWidth={2}>
                          {data.top_documents.map((_, i) => (
                            <Cell key={i} fill={ACCENTS[i % ACCENTS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart label="No citations yet — ask your knowledge base some questions." />
                )}
              </BrutalCard>
            </motion.div>

            {/* Feedback */}
            <motion.div variants={fadeIn}>
              <BrutalCard className="h-full p-5 md:p-6">
                <ChartHeading icon={<ThumbsUp className="size-5" />} title="Answer quality" sub="From thumbs up / down" />
                {fbTotal > 0 ? (
                  <div className="mt-4 flex h-64 items-center gap-2">
                    <div className="relative h-full flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={feedbackData} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={3} strokeWidth={2} stroke="var(--color-ink)">
                            {feedbackData.map((d, i) => (
                              <Cell key={i} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-heading text-4xl font-black text-ink">{satisfaction}%</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/45">helpful</span>
                      </div>
                    </div>
                    <div className="space-y-2 pr-2">
                      <Legend swatch="bg-mint" label="Helpful" value={data?.feedback.positive ?? 0} />
                      <Legend swatch="bg-coral" label="Not helpful" value={data?.feedback.negative ?? 0} />
                    </div>
                  </div>
                ) : (
                  <EmptyChart label="No feedback yet — rate answers with 👍 / 👎 in chat." />
                )}
              </BrutalCard>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ChartHeading({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-2xl border-2 border-ink bg-sun text-ink">{icon}</div>
      <div>
        <h2 className="font-heading text-xl font-black tracking-tight">{title}</h2>
        <p className="text-xs font-bold text-ink/45">{sub}</p>
      </div>
    </div>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-4 rounded-md border-2 border-ink ${swatch}`} />
      <span className="text-sm font-black text-ink">{value}</span>
      <span className="text-xs font-bold text-ink/50">{label}</span>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="mt-4 flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-ink/20 px-6 text-center text-sm font-semibold text-ink/50">
      {label}
    </div>
  );
}
