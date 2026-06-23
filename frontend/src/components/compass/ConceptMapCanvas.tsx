"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ConceptEdge, ConceptNode } from "@/lib/api";
import { cn } from "@/lib/utils";

const NODE_W = 240;
const NODE_H = 104;
const GAP_X = 64;
const GAP_Y = 56;

const STATUS_STYLES: Record<
  ConceptNode["status"],
  { fill: string; stroke: string; badge: string; progress: string }
> = {
  locked: {
    fill: "var(--color-cream)",
    stroke: "color-mix(in srgb, var(--color-ink) 25%, transparent)",
    badge: "bg-ink/10 text-ink/45",
    progress: "var(--color-ink)",
  },
  available: {
    fill: "var(--color-sun)",
    stroke: "var(--color-ink)",
    badge: "bg-sun text-ink",
    progress: "var(--color-sun)",
  },
  in_progress: {
    fill: "var(--color-violet)",
    stroke: "var(--color-ink)",
    badge: "bg-violet text-ink",
    progress: "var(--color-violet)",
  },
  mastered: {
    fill: "var(--color-mint)",
    stroke: "var(--color-ink)",
    badge: "bg-mint text-ink",
    progress: "var(--color-mint)",
  },
};

function nodeFill(concept: ConceptNode): string {
  if (concept.contributor_wanted) return "var(--color-coral)";
  return STATUS_STYLES[concept.status].fill;
}

function nodeStroke(concept: ConceptNode): string {
  if (concept.contributor_wanted) return "var(--color-ink)";
  return STATUS_STYLES[concept.status].stroke;
}

function progressRatio(concept: ConceptNode): number {
  if (concept.status === "mastered") return 1;
  const { required, verified } = concept.mastery;
  if (required <= 0) {
    if (concept.status === "in_progress") return 0.35;
    return 0;
  }
  return Math.min(1, verified / required);
}

function computeDepths(concepts: ConceptNode[]): Map<string, number> {
  const bySlug = new Map(concepts.map((c) => [c.slug, c]));
  const depths = new Map<string, number>();

  const depthOf = (slug: string, visiting: Set<string> = new Set()): number => {
    if (depths.has(slug)) return depths.get(slug)!;
    if (visiting.has(slug)) return 0;
    visiting.add(slug);
    const concept = bySlug.get(slug);
    if (!concept || concept.prerequisites.length === 0) {
      depths.set(slug, 0);
      return 0;
    }
    const d =
      1 +
      Math.max(...concept.prerequisites.map((p) => depthOf(p, visiting)));
    depths.set(slug, d);
    return d;
  };

  for (const concept of concepts) {
    depthOf(concept.slug);
  }
  return depths;
}

function layoutNodes(concepts: ConceptNode[]) {
  const depths = computeDepths(concepts);
  const layers = new Map<number, ConceptNode[]>();

  for (const concept of concepts) {
    const depth = depths.get(concept.slug) ?? 0;
    const layer = layers.get(depth) ?? [];
    layer.push(concept);
    layers.set(depth, layer);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const sortedDepths = [...layers.keys()].sort((a, b) => a - b);
  let maxLayerWidth = 0;

  for (const depth of sortedDepths) {
    const layer = (layers.get(depth) ?? []).sort(
      (a, b) => a.order_index - b.order_index,
    );
    maxLayerWidth = Math.max(maxLayerWidth, layer.length);
    const rowWidth = layer.length * NODE_W + (layer.length - 1) * GAP_X;
    const startX = -rowWidth / 2 + NODE_W / 2;

    layer.forEach((concept, index) => {
      positions.set(concept.slug, {
        x: startX + index * (NODE_W + GAP_X),
        y: depth * (NODE_H + GAP_Y),
      });
    });
  }

  const height =
    (sortedDepths.length || 1) * NODE_H + Math.max(0, sortedDepths.length - 1) * GAP_Y;
  const width = maxLayerWidth * NODE_W + Math.max(0, maxLayerWidth - 1) * GAP_X;

  return { positions, width, height };
}

interface ConceptMapCanvasProps {
  concepts: ConceptNode[];
  edges: ConceptEdge[];
  selectedSlug: string | null;
  onSelect: (concept: ConceptNode) => void;
  fullscreen?: boolean;
}

export function ConceptMapCanvas({
  concepts,
  edges,
  selectedSlug,
  onSelect,
  fullscreen = false,
}: ConceptMapCanvasProps) {
  const { positions, width, height } = useMemo(
    () => layoutNodes(concepts),
    [concepts],
  );

  const bySlug = useMemo(
    () => new Map(concepts.map((c) => [c.slug, c])),
    [concepts],
  );

  const padding = 64;
  const viewW = width + padding * 2;
  const viewH = height + padding * 2;
  const offsetX = viewW / 2;
  const offsetY = padding;

  const masteredCount = concepts.filter((c) => c.status === "mastered").length;
  const coreCount = concepts.filter((c) => !c.is_bonus).length;
  const overallPct = coreCount > 0 ? Math.round((masteredCount / coreCount) * 100) : 0;

  const ringR = fullscreen ? 50 : 42;

  return (
    <div
      className={cn(
        "overflow-hidden border-2 border-ink bg-canvas/50 shadow-[8px_8px_0_var(--color-ink)]",
        fullscreen ? "flex h-full flex-col rounded-[1.75rem]" : "rounded-[2rem]",
      )}
    >
      {!fullscreen && (
        <div className="border-b-2 border-ink/10 bg-cream/80 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/45">
                Your path
              </p>
              <p className="font-heading text-lg font-black">
                {masteredCount} of {coreCount} patterns mastered
              </p>
            </div>
            <div className="min-w-[200px] flex-1 max-w-sm">
              <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-canvas">
                <div
                  className="h-full rounded-full bg-mint transition-all duration-500"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] font-bold text-ink/50">
                {overallPct}% complete
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "overflow-auto",
          fullscreen ? "min-h-0 flex-1 p-2 md:p-4" : "p-4 md:p-6",
        )}
      >
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          className={cn(
            "mx-auto w-full",
            fullscreen
              ? "h-full min-h-[520px] min-w-[1100px]"
              : "min-h-[min(72vh,820px)] min-w-[960px]",
          )}
          role="img"
          aria-label="Interview pattern dependency graph"
        >
          <defs>
            <marker
              id="arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-ink)" opacity="0.45" />
            </marker>
            <marker
              id="arrow-active"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-ink)" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const from = positions.get(edge.prerequisite_slug);
            const to = positions.get(edge.concept_slug);
            if (!from || !to) return null;

            const prereq = bySlug.get(edge.prerequisite_slug);
            const active = prereq?.status === "mastered";

            const x1 = offsetX + from.x;
            const y1 = offsetY + from.y + NODE_H / 2;
            const x2 = offsetX + to.x;
            const y2 = offsetY + to.y - NODE_H / 2;
            const midY = (y1 + y2) / 2;

            return (
              <path
                key={`${edge.prerequisite_slug}->${edge.concept_slug}`}
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke={active ? "var(--color-mint)" : "var(--color-ink)"}
                strokeWidth={active ? 3 : 2}
                opacity={active ? 0.75 : 0.18}
                markerEnd={active ? "url(#arrow-active)" : "url(#arrow)"}
              />
            );
          })}

          {concepts.map((concept) => {
            const pos = positions.get(concept.slug);
            if (!pos) return null;

            const x = offsetX + pos.x - NODE_W / 2;
            const y = offsetY + pos.y - NODE_H / 2;
            const selected = selectedSlug === concept.slug;
            const ratio = progressRatio(concept);
            const ringLen = 2 * Math.PI * ringR;
            const dash = ringLen * ratio;

            return (
              <g
                key={concept.slug}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer"
                onClick={() => onSelect(concept)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(concept);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${concept.title}, ${concept.status}`}
              >
                {ratio > 0 && concept.status !== "locked" && (
                  <circle
                    cx={NODE_W / 2}
                    cy={NODE_H / 2}
                    r={ringR}
                    fill="none"
                    stroke={STATUS_STYLES[concept.status].progress}
                    strokeWidth={4}
                    strokeDasharray={`${dash} ${ringLen}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${NODE_W / 2} ${NODE_H / 2})`}
                    opacity={0.85}
                  />
                )}

                <motion.rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={18}
                  fill={nodeFill(concept)}
                  stroke={nodeStroke(concept)}
                  strokeWidth={selected ? 3 : 2}
                  strokeDasharray={concept.contributor_wanted ? "6 4" : undefined}
                  initial={false}
                  animate={{ y: selected ? -4 : 0 }}
                  style={{
                    filter: selected
                      ? "drop-shadow(6px 6px 0 var(--color-ink))"
                      : "drop-shadow(4px 4px 0 color-mix(in srgb, var(--color-ink) 35%, transparent))",
                  }}
                />

                <text
                  x={NODE_W / 2}
                  y={34}
                  textAnchor="middle"
                  className="fill-ink text-[12px] font-black"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {concept.title.length > 22
                    ? `${concept.title.slice(0, 20)}…`
                    : concept.title}
                </text>

                <text
                  x={NODE_W / 2}
                  y={54}
                  textAnchor="middle"
                  className="fill-ink/55 text-[9px] font-bold uppercase tracking-wider"
                >
                  {concept.contributor_wanted
                    ? "claim me"
                    : concept.status.replace("_", " ")}
                </text>

                {concept.mastery.required > 0 && concept.status !== "locked" && (
                  <text
                    x={NODE_W / 2}
                    y={72}
                    textAnchor="middle"
                    className="fill-ink/70 text-[9px] font-black"
                  >
                    {concept.mastery.verified}/{concept.mastery.required} solves
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div
        className={cn(
          "flex flex-wrap justify-center gap-3 border-t-2 border-ink/10 text-xs font-bold text-ink/60",
          fullscreen ? "shrink-0 px-3 py-2" : "px-4 py-3",
        )}
      >
        {(["locked", "available", "in_progress", "mastered"] as const).map((status) => (
          <span key={status} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-3 w-3 rounded-full border-2 border-ink",
                STATUS_STYLES[status].badge,
              )}
            />
            {status.replace("_", " ")}
          </span>
        ))}
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-ink bg-coral" />
          community wanted
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-8 w-8 rounded-full border-2 border-ink bg-canvas p-0.5">
            <span className="block h-full w-3/4 rounded-full bg-mint" />
          </span>
          solve progress ring
        </span>
      </div>
    </div>
  );
}
