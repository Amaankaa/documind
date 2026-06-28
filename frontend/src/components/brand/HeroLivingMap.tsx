"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { CircleDotDashed, GitBranch } from "lucide-react";
import type { ConceptNode } from "@/lib/api";
import { STATUS_STYLES } from "@/lib/conceptStatus";

/**
 * HeroLivingMap — the landing-page centerpiece.
 *
 * A presentational, self-contained animation of the prerequisite DAG that powers
 * AlgoMentor's "what to study next" engine. It deliberately mirrors the visual
 * language of the real interactive graph (`ConceptMapCanvas`) via the shared
 * `STATUS_STYLES`, so the marketing page reads as the same product — but runs on a
 * curated static dataset with no backend dependency.
 *
 * On enter it self-assembles: nodes pop in by depth → prerequisite edges draw
 * themselves → the recommended path pulses → the "Up next" badge snaps on.
 * Honors `prefers-reduced-motion` (renders the final state, no loops).
 */

type Status = ConceptNode["status"];

interface HeroNode {
  slug: string;
  title: string;
  status: Status;
  /** 0..1 mastery progress shown as the node's bar. */
  progress: number;
  /** Center coordinates in the shared 1000 x 1180 viewBox. */
  cx: number;
  cy: number;
  depth: number;
  contributorWanted?: boolean;
}

// Curated story: foundations mastered → binary search in progress → sliding window
// is the recommended next step → graphs & DP still locked ahead.
const NODES: HeroNode[] = [
  { slug: "arrays", title: "Arrays", status: "mastered", progress: 1, cx: 500, cy: 96, depth: 0 },
  { slug: "two-pointers", title: "Two pointers", status: "mastered", progress: 1, cx: 205, cy: 376, depth: 1 },
  { slug: "hashing", title: "Hashing", status: "mastered", progress: 1, cx: 500, cy: 376, depth: 1 },
  { slug: "binary-search", title: "Binary search", status: "in_progress", progress: 0.45, cx: 795, cy: 376, depth: 1 },
  { slug: "sliding-window", title: "Sliding window", status: "available", progress: 0, cx: 352, cy: 676, depth: 2 },
  { slug: "graphs", title: "Graphs / BFS", status: "locked", progress: 0, cx: 648, cy: 676, depth: 2 },
  { slug: "dynamic-programming", title: "Dynamic programming", status: "locked", progress: 0, cx: 500, cy: 968, depth: 3, contributorWanted: true },
];

const EDGES: [string, string][] = [
  ["arrays", "two-pointers"],
  ["arrays", "hashing"],
  ["arrays", "binary-search"],
  ["two-pointers", "sliding-window"],
  ["hashing", "sliding-window"],
  ["binary-search", "graphs"],
  ["sliding-window", "graphs"],
  ["graphs", "dynamic-programming"],
];

/** The recommended route the "Up next" engine surfaces — gets the glowing pulse. */
const OPTIMAL_PATH = ["arrays", "two-pointers", "sliding-window"];
const RECOMMENDED_SLUG = "sliding-window";

/** Order the scroll-as-journey spotlight walks through. */
export const HERO_JOURNEY = [
  "arrays",
  "two-pointers",
  "sliding-window",
  "graphs",
  "dynamic-programming",
] as const;

const VIEW_W = 1000;
const VIEW_H = 1180;
const NODE_W = 250;
const NODE_H = 104;

const bySlug = new Map(NODES.map((n) => [n.slug, n]));

/** Curved path from a parent node's bottom edge to a child node's top edge. */
function edgePath(from: HeroNode, to: HeroNode): string {
  const x1 = from.cx;
  const y1 = from.cy + NODE_H / 2;
  const x2 = to.cx;
  const y2 = to.cy - NODE_H / 2;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function optimalPathD(): string {
  // Join the real prerequisite edges along the route. Each segment keeps its own
  // `M` (a disjoint sub-path); the short gap across each pass-through node is
  // hidden behind the node card, which renders above the SVG.
  const segs: string[] = [];
  for (let i = 0; i < OPTIMAL_PATH.length - 1; i++) {
    segs.push(edgePath(bySlug.get(OPTIMAL_PATH[i])!, bySlug.get(OPTIMAL_PATH[i + 1])!));
  }
  return segs.join(" ");
}

interface HeroLivingMapProps {
  /** Optional slug to spotlight (drives the scroll-as-journey highlight). */
  spotlightSlug?: string;
}

export function HeroLivingMap({ spotlightSlug }: HeroLivingMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const active = !!reduce || inView;
  const spotlight = spotlightSlug ?? RECOMMENDED_SLUG;

  // Depth-based timing so children animate after their prerequisites.
  const nodeDelay = (n: HeroNode) => (reduce ? 0 : 0.12 + n.depth * 0.32);
  const edgeDelay = (childDepth: number) => (reduce ? 0 : 0.12 + childDepth * 0.32);
  const recommendedNode = bySlug.get(RECOMMENDED_SLUG)!;

  return (
    <div ref={ref} className="relative">
      {/* ── Desktop / tablet: full DAG ─────────────────────────────── */}
      <div
        className="relative mx-auto hidden w-full max-w-[34rem] md:block"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      >
        {/* Edge layer (SVG, behind nodes) */}
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="hlm-optimal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-mint)" />
              <stop offset="50%" stopColor="var(--color-sun)" />
              <stop offset="100%" stopColor="var(--color-flame)" />
            </linearGradient>
          </defs>

          {EDGES.map(([fromSlug, toSlug]) => {
            const from = bySlug.get(fromSlug)!;
            const to = bySlug.get(toSlug)!;
            return (
              <motion.path
                key={`${fromSlug}-${toSlug}`}
                d={edgePath(from, to)}
                fill="none"
                stroke="color-mix(in srgb, var(--color-ink) 22%, transparent)"
                strokeWidth={3}
                strokeLinecap="round"
                initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
                animate={active ? { pathLength: 1, opacity: 1 } : {}}
                transition={{ duration: 0.5, ease: "easeInOut", delay: edgeDelay(to.depth) }}
              />
            );
          })}

          {/* Recommended-path pulse: a bright stroke that draws, then breathes. */}
          <motion.path
            d={optimalPathD()}
            fill="none"
            stroke="url(#hlm-optimal)"
            strokeWidth={5}
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 6px rgba(255,204,51,0.55))" }}
            initial={{ pathLength: reduce ? 1 : 0, opacity: 0 }}
            animate={
              active
                ? reduce
                  ? { pathLength: 1, opacity: 0.9 }
                  : { pathLength: 1, opacity: [0, 1, 0.65, 1] }
                : {}
            }
            transition={
              reduce
                ? { duration: 0 }
                : {
                    pathLength: { duration: 0.9, ease: "easeInOut", delay: 1.5 },
                    opacity: { duration: 3.2, ease: "easeInOut", delay: 1.5, repeat: Infinity },
                  }
            }
          />
        </svg>

        {/* Node layer (HTML, aligned to the SVG coordinate space) */}
        {NODES.map((n) => {
          const style = STATUS_STYLES[n.status];
          const isSpotlight = n.slug === spotlight;
          return (
            <motion.div
              key={n.slug}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(n.cx / VIEW_W) * 100}%`,
                top: `${(n.cy / VIEW_H) * 100}%`,
                width: `${(NODE_W / VIEW_W) * 100}%`,
              }}
              initial={{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.8, y: reduce ? 0 : 12 }}
              animate={active ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ duration: 0.45, ease: "easeOut", delay: nodeDelay(n) }}
            >
              <motion.div
                className="rounded-2xl border-2 px-3 py-2.5 shadow-[5px_5px_0_var(--color-ink)]"
                style={{
                  background: n.contributorWanted
                    ? "color-mix(in srgb, var(--color-coral) 16%, var(--color-cream))"
                    : style.fill,
                  borderColor: n.contributorWanted ? "var(--color-ink)" : style.stroke,
                  color: "var(--color-ink)",
                }}
                animate={
                  reduce || n.status === "locked"
                    ? undefined
                    : {
                        boxShadow: [
                          "5px 5px 0 var(--color-ink)",
                          `5px 5px 0 var(--color-ink), 0 0 22px ${style.glow}`,
                          "5px 5px 0 var(--color-ink)",
                        ],
                      }
                }
                transition={
                  reduce
                    ? undefined
                    : { duration: 3, ease: "easeInOut", repeat: Infinity, delay: n.depth * 0.4 }
                }
              >
                {isSpotlight && !reduce && (
                  <motion.span
                    className="pointer-events-none absolute -inset-1 rounded-[1.1rem] border-2 border-flame"
                    animate={{ opacity: [0.9, 0.25, 0.9], scale: [1, 1.04, 1] }}
                    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                  />
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[clamp(0.7rem,1.4vw,0.9rem)] font-black tracking-tight">
                    {n.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.08em] ${
                      n.contributorWanted ? "bg-coral text-ink" : style.badge
                    }`}
                  >
                    {n.contributorWanted ? "Claim" : style.label}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: style.progress }}
                    initial={{ width: reduce ? `${n.progress * 100}%` : 0 }}
                    animate={active ? { width: `${n.progress * 100}%` } : {}}
                    transition={{ duration: 0.8, ease: "easeOut", delay: nodeDelay(n) + 0.3 }}
                  />
                </div>
              </motion.div>
            </motion.div>
          );
        })}

        {/* "Up next" badge — snaps onto the recommended node. */}
        <motion.div
          className="absolute z-20 -translate-x-1/2"
          style={{
            left: `${(recommendedNode.cx / VIEW_W) * 100}%`,
            top: `${((recommendedNode.cy - NODE_H / 2 - 64) / VIEW_H) * 100}%`,
          }}
          initial={{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.4, y: reduce ? 0 : 10 }}
          animate={active ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={
            reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 16, delay: 1.4 }
          }
        >
          <div className="flex items-center gap-2 whitespace-nowrap rounded-full border-2 border-ink bg-sun px-3 py-1.5 text-xs font-black shadow-[3px_3px_0_var(--color-ink)]">
            <CircleDotDashed
              className={`size-4 ${reduce ? "" : "animate-spin [animation-duration:4s]"}`}
            />
            Up next
          </div>
        </motion.div>
      </div>

      {/* ── Mobile: simplified vertical stack ──────────────────────── */}
      <div className="space-y-2.5 md:hidden">
        {NODES.map((n, i) => {
          const style = STATUS_STYLES[n.status];
          return (
            <motion.div
              key={n.slug}
              initial={{ opacity: reduce ? 1 : 0, x: reduce ? 0 : -16 }}
              animate={active ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, ease: "easeOut", delay: reduce ? 0 : i * 0.08 }}
              className="flex items-center gap-3 rounded-2xl border-2 px-4 py-3 shadow-[4px_4px_0_var(--color-ink)]"
              style={{
                background: n.contributorWanted
                  ? "color-mix(in srgb, var(--color-coral) 16%, var(--color-cream))"
                  : style.fill,
                borderColor: "var(--color-ink)",
              }}
            >
              <GitBranch className="size-4 shrink-0 text-grape" />
              <span className="flex-1 truncate text-sm font-black text-ink">{n.title}</span>
              {n.slug === RECOMMENDED_SLUG ? (
                <span className="rounded-full border-2 border-ink bg-sun px-2 py-0.5 text-[0.6rem] font-black uppercase">
                  Up next
                </span>
              ) : (
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6rem] font-black uppercase ${
                    n.contributorWanted ? "bg-coral text-ink" : style.badge
                  }`}
                >
                  {n.contributorWanted ? "Claim" : style.label}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
