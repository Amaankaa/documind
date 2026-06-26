"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Info, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import type { ConceptEdge, ConceptNode } from "@/lib/api";
import { cn } from "@/lib/utils";

const NODE_W = 280;
const NODE_H = 140;
const NODE_PROGRESS_Y = NODE_H - 38;
const GAP_X = 120;
const GAP_Y = 140;
const BONUS_SECTION_GAP = 128;

const DEFAULT_ZOOM = 1.4;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;
const PAN_DRAG_THRESHOLD = 4;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

const STATUS_STYLES: Record<
  ConceptNode["status"],
  { fill: string; stroke: string; badge: string; progress: string; glow: string; label: string }
> = {
  locked: {
    fill: "var(--color-cream)",
    stroke: "color-mix(in srgb, var(--color-ink) 25%, transparent)",
    badge: "bg-ink/10 text-ink/45",
    progress: "var(--color-ink)",
    glow: "rgba(20, 17, 15, 0.08)",
    label: "Locked",
  },
  available: {
    fill: "color-mix(in srgb, var(--color-sun) 14%, var(--color-cream))",
    stroke: "var(--color-ink)",
    badge: "bg-sun text-ink",
    progress: "var(--color-sun)",
    glow: "rgba(255, 204, 51, 0.45)",
    label: "Ready",
  },
  in_progress: {
    fill: "color-mix(in srgb, var(--color-lilac) 18%, var(--color-cream))",
    stroke: "var(--color-ink)",
    badge: "bg-violet text-ink",
    progress: "var(--color-violet)",
    glow: "rgba(124, 58, 237, 0.4)",
    label: "Studying",
  },
  mastered: {
    fill: "color-mix(in srgb, var(--color-mint) 24%, var(--color-cream))",
    stroke: "var(--color-ink)",
    badge: "bg-mint text-ink",
    progress: "var(--color-mint)",
    glow: "rgba(167, 243, 208, 0.55)",
    label: "Done",
  },
};

function nodeFill(concept: ConceptNode): string {
  if (concept.contributor_wanted) {
    return "color-mix(in srgb, var(--color-coral) 16%, var(--color-cream))";
  }
  return STATUS_STYLES[concept.status].fill;
}

function nodeStroke(concept: ConceptNode): string {
  if (concept.contributor_wanted) return "var(--color-ink)";
  return STATUS_STYLES[concept.status].stroke;
}

function nodeGlow(concept: ConceptNode, selected: boolean): string {
  if (selected) return "rgba(255, 204, 51, 0.65)";
  if (concept.contributor_wanted) return "rgba(255, 138, 101, 0.45)";
  if (concept.status === "locked") return "transparent";
  return STATUS_STYLES[concept.status].glow;
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

function splitTitle(title: string): string[] {
  if (title.length <= 22) return [title];

  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 22 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 2).map((line, index, all) =>
    index === all.length - 1 && lines.length > 2 ? `${line.slice(0, 19)}...` : line,
  );
}

function statusIconPath(status: ConceptNode["status"]): string {
  switch (status) {
    case "mastered":
      return "M5 11 L9 15 L17 6";
    case "locked":
      return "M6 10 H18 V18 H6 Z M9 10 V7 C9 4.8 10.8 3 13 3 C15.2 3 17 4.8 17 7 V10";
    default:
      return "M8 5 L18 12 L8 19 Z";
  }
}

/** Longest-path depth so multi-parent nodes sit below all prerequisites. */
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
    const d = 1 + Math.max(...concept.prerequisites.map((p) => depthOf(p, visiting)));
    depths.set(slug, d);
    return d;
  };

  for (const concept of concepts) {
    depthOf(concept.slug);
  }
  return depths;
}

function spreadLayerX(layer: ConceptNode[], xs: Map<string, number>) {
  if (layer.length === 0) return;
  layer.sort((a, b) => {
    const dx = (xs.get(a.slug) ?? 0) - (xs.get(b.slug) ?? 0);
    return dx !== 0 ? dx : a.order_index - b.order_index;
  });

  const minStep = NODE_W + GAP_X;
  const totalWidth = layer.length * NODE_W + (layer.length - 1) * GAP_X;
  const avgBary =
    layer.reduce((sum, node) => sum + (xs.get(node.slug) ?? 0), 0) / layer.length;
  const startX = avgBary - totalWidth / 2 + NODE_W / 2;

  layer.forEach((node, index) => {
    xs.set(node.slug, startX + index * minStep);
  });
}

function layoutNodes(concepts: ConceptNode[]) {
  const core = concepts.filter((c) => !c.is_bonus);
  const bonus = concepts.filter((c) => c.is_bonus);

  const layoutSection = (section: ConceptNode[], yOffset: number) => {
    if (section.length === 0) {
      return { positions: new Map<string, { x: number; y: number }>(), height: 0 };
    }

    const depths = computeDepths(section);
    const layers = new Map<number, ConceptNode[]>();
    for (const concept of section) {
      const depth = depths.get(concept.slug) ?? 0;
      const layer = layers.get(depth) ?? [];
      layer.push(concept);
      layers.set(depth, layer);
    }

    const xs = new Map<string, number>();
    const sortedDepths = [...layers.keys()].sort((a, b) => a - b);

    const layer0 = layers.get(sortedDepths[0] ?? 0) ?? [];
    layer0.sort((a, b) => a.order_index - b.order_index);
    layer0.forEach((node, i) => {
      const totalWidth = layer0.length * NODE_W + (layer0.length - 1) * GAP_X;
      const start = -totalWidth / 2 + NODE_W / 2;
      xs.set(node.slug, start + i * (NODE_W + GAP_X));
    });

    for (const depth of sortedDepths.slice(1)) {
      const layer = layers.get(depth) ?? [];
      for (const node of layer) {
        const parents = node.prerequisites.filter((p) =>
          section.some((c) => c.slug === p),
        );
        if (parents.length > 0) {
          const avg =
            parents.reduce((sum, p) => sum + (xs.get(p) ?? 0), 0) / parents.length;
          xs.set(node.slug, avg);
        } else {
          xs.set(node.slug, 0);
        }
      }
      spreadLayerX(layer, xs);
    }

    const positions = new Map<string, { x: number; y: number }>();
    let maxDepth = 0;
    for (const depth of sortedDepths) {
      maxDepth = Math.max(maxDepth, depth);
      for (const node of layers.get(depth) ?? []) {
        positions.set(node.slug, {
          x: xs.get(node.slug) ?? 0,
          y: yOffset + depth * (NODE_H + GAP_Y),
        });
      }
    }

    const height = (maxDepth + 1) * NODE_H + maxDepth * GAP_Y;
    return { positions, height };
  };

  const coreLayout = layoutSection(core, 0);
  const bonusY = coreLayout.height + (bonus.length > 0 ? BONUS_SECTION_GAP : 0);
  const bonusLayout = layoutSection(bonus, bonusY);

  const positions = new Map([...coreLayout.positions, ...bonusLayout.positions]);
  const bonusLabelY = bonus.length > 0 ? bonusY - BONUS_SECTION_GAP / 2 : null;

  let maxLayerWidth = 0;
  for (const { x } of positions.values()) {
    maxLayerWidth = Math.max(maxLayerWidth, Math.abs(x) * 2 + NODE_W);
  }

  const totalHeight =
    coreLayout.height +
    (bonus.length > 0 ? BONUS_SECTION_GAP + bonusLayout.height : 0);

  return {
    positions,
    width: maxLayerWidth,
    height: totalHeight,
    bonusLabelY,
    hasBonus: bonus.length > 0,
  };
}

interface ConceptMapCanvasProps {
  concepts: ConceptNode[];
  edges: ConceptEdge[];
  selectedSlug: string | null;
  focusSlug?: string | null;
  focusMode?: boolean;
  onSelect: (concept: ConceptNode) => void;
  fullscreen?: boolean;
}

export function ConceptMapCanvas({
  concepts,
  edges,
  selectedSlug,
  focusSlug,
  focusMode = false,
  onSelect,
  fullscreen = false,
}: ConceptMapCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(DEFAULT_ZOOM);
  const suppressClickRef = useRef(false);
  const panSessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isPanning, setIsPanning] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const applyZoomAtPointer = useCallback(
    (nextZoom: number, pointerX: number, pointerY: number) => {
      const container = scrollRef.current;
      if (!container) return;

      const currentZoom = zoomRef.current;
      if (nextZoom === currentZoom) return;

      const scale = nextZoom / currentZoom;
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;

      setZoom(nextZoom);

      requestAnimationFrame(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollLeft = (scrollLeft + pointerX) * scale - pointerX;
        scrollRef.current.scrollTop = (scrollTop + pointerY) * scale - pointerY;
      });
    },
    [],
  );

  const zoomIn = useCallback(() => {
    const container = scrollRef.current;
    if (!container) {
      setZoom((z) => clampZoom(z + ZOOM_STEP));
      return;
    }
    const rect = container.getBoundingClientRect();
    applyZoomAtPointer(
      clampZoom(zoomRef.current + ZOOM_STEP),
      rect.width / 2,
      rect.height / 2,
    );
  }, [applyZoomAtPointer]);

  const zoomOut = useCallback(() => {
    const container = scrollRef.current;
    if (!container) {
      setZoom((z) => clampZoom(z - ZOOM_STEP));
      return;
    }
    const rect = container.getBoundingClientRect();
    applyZoomAtPointer(
      clampZoom(zoomRef.current - ZOOM_STEP),
      rect.width / 2,
      rect.height / 2,
    );
  }, [applyZoomAtPointer]);
  const resetZoom = useCallback(() => setZoom(DEFAULT_ZOOM), []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();

      const rect = container.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const nextZoom = clampZoom(zoomRef.current - event.deltaY * 0.002);
      applyZoomAtPointer(nextZoom, pointerX, pointerY);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [applyZoomAtPointer]);

  const isNodeTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("g[role='button']"));
  };

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (isNodeTarget(event.target)) return;

    const container = scrollRef.current;
    if (!container) return;

    event.preventDefault();
    container.setPointerCapture(event.pointerId);
    panSessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      moved: false,
    };
    setIsPanning(true);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    const container = scrollRef.current;
    if (!session || !container || session.pointerId !== event.pointerId) return;

    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;

    if (!session.moved && Math.hypot(dx, dy) < PAN_DRAG_THRESHOLD) return;

    session.moved = true;
    suppressClickRef.current = true;
    container.scrollLeft = session.scrollLeft - dx;
    container.scrollTop = session.scrollTop - dy;
  }, []);

  const endPan = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    const container = scrollRef.current;
    if (!session || !container || session.pointerId !== event.pointerId) return;

    container.releasePointerCapture(event.pointerId);
    panSessionRef.current = null;
    setIsPanning(false);

    if (session.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  }, []);

  const handleNodeSelect = useCallback(
    (concept: ConceptNode) => {
      if (suppressClickRef.current) return;
      onSelect(concept);
    },
    [onSelect],
  );

  const { positions, width, height, bonusLabelY, hasBonus } = useMemo(
    () => layoutNodes(concepts),
    [concepts],
  );

  const bySlug = useMemo(
    () => new Map(concepts.map((c) => [c.slug, c])),
    [concepts],
  );

  const emphasisSlug = selectedSlug ?? focusSlug ?? null;
  const relatedSlugs = useMemo(() => {
    if (!emphasisSlug) return null;
    const related = new Set<string>([emphasisSlug]);
    for (const edge of edges) {
      if (edge.concept_slug === emphasisSlug) related.add(edge.prerequisite_slug);
      if (edge.prerequisite_slug === emphasisSlug) related.add(edge.concept_slug);
    }
    return related;
  }, [edges, emphasisSlug]);

  const padding = 80;
  const viewW = width + padding * 2;
  const viewH = height + padding * 2 + (hasBonus ? 24 : 0);
  const offsetX = viewW / 2;
  const offsetY = padding;

  const coreConcepts = concepts.filter((c) => !c.is_bonus);
  const masteredCount = coreConcepts.filter((c) => c.status === "mastered").length;
  const coreCount = coreConcepts.length;
  const overallPct = coreCount > 0 ? Math.round((masteredCount / coreCount) * 100) : 0;

  const canvasW = viewW * zoom;
  const canvasH = viewH * zoom;
  const zoomPct = Math.round(zoom * 100);

  const scrollToPoint = useCallback((x: number, y: number, nextZoom = zoomRef.current) => {
    const container = scrollRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        left: x * nextZoom - container.clientWidth / 2,
        top: y * nextZoom - container.clientHeight / 2,
        behavior: "smooth",
      });
    });
  }, []);

  const centerOnFocus = useCallback(() => {
    const slug = emphasisSlug ?? concepts[0]?.slug;
    if (!slug) return;

    const pos = positions.get(slug);
    if (!pos) return;

    scrollToPoint(offsetX + pos.x, offsetY + pos.y);
  }, [concepts, emphasisSlug, offsetX, offsetY, positions, scrollToPoint]);

  const fitFocusedPath = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !relatedSlugs || relatedSlugs.size === 0) {
      resetZoom();
      return;
    }

    const relatedPositions = [...relatedSlugs]
      .map((slug) => positions.get(slug))
      .filter(Boolean) as { x: number; y: number }[];

    if (relatedPositions.length === 0) return;

    const minX = Math.min(...relatedPositions.map((pos) => offsetX + pos.x - NODE_W / 2));
    const maxX = Math.max(...relatedPositions.map((pos) => offsetX + pos.x + NODE_W / 2));
    const minY = Math.min(...relatedPositions.map((pos) => offsetY + pos.y - NODE_H / 2));
    const maxY = Math.max(...relatedPositions.map((pos) => offsetY + pos.y + NODE_H / 2));
    const nextZoom = clampZoom(
      Math.min(
        (container.clientWidth - 96) / Math.max(maxX - minX, NODE_W),
        (container.clientHeight - 96) / Math.max(maxY - minY, NODE_H),
      ),
    );

    setZoom(nextZoom);
    scrollToPoint((minX + maxX) / 2, (minY + maxY) / 2, nextZoom);
  }, [offsetX, offsetY, positions, relatedSlugs, resetZoom, scrollToPoint]);

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

      <div className="relative min-h-0 flex-1">
        <div className="absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-1 rounded-2xl border-2 border-ink bg-cream/95 p-1.5 shadow-[4px_4px_0_var(--color-ink)] backdrop-blur-sm">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="grid size-9 place-items-center rounded-full border border-ink/15 transition hover:bg-sun/40 disabled:opacity-40"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-[10px] font-black tabular-nums text-ink/70">
            {zoomPct}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="grid size-9 place-items-center rounded-full border border-ink/15 transition hover:bg-sun/40 disabled:opacity-40"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="grid size-9 place-items-center rounded-full border border-ink/15 transition hover:bg-mint/50"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={centerOnFocus}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-ink/15 px-2.5 text-[10px] font-black uppercase tracking-wider transition hover:bg-sun/40"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Center
          </button>
          <button
            type="button"
            onClick={fitFocusedPath}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-ink/15 px-2.5 text-[10px] font-black uppercase tracking-wider transition hover:bg-mint/50"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Fit path
          </button>
        </div>

        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          className={cn(
            "h-full overflow-auto touch-none",
            isPanning ? "cursor-grabbing" : "cursor-grab",
            fullscreen ? "min-h-[420px] p-3 md:p-5" : "max-h-[min(78vh,920px)] p-4 md:p-6",
          )}
        >
          <div
            className="inline-block min-w-full"
            style={{ width: canvasW, height: canvasH }}
          >
            <svg
              width={canvasW}
              height={canvasH}
              viewBox={`0 0 ${viewW} ${viewH}`}
              className="block select-none pointer-events-none"
              role="img"
              aria-label="Interview pattern dependency graph"
            >
          <defs>
            <filter id="node-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {hasBonus && bonusLabelY != null && (
            <>
              <line
                x1={padding}
                y1={offsetY + bonusLabelY}
                x2={viewW - padding}
                y2={offsetY + bonusLabelY}
                stroke="var(--color-ink)"
                strokeOpacity={0.12}
                strokeWidth={2}
                strokeDasharray="8 6"
              />
              <text
                x={offsetX}
                y={offsetY + bonusLabelY - 10}
                textAnchor="middle"
                fill="var(--color-ink)"
                opacity={0.45}
                className="text-[11px] font-black uppercase tracking-[0.22em]"
              >
                Bonus topics
              </text>
            </>
          )}

          {edges.map((edge) => {
            const from = positions.get(edge.prerequisite_slug);
            const to = positions.get(edge.concept_slug);
            if (!from || !to) return null;

            const prereq = bySlug.get(edge.prerequisite_slug);
            const active = prereq?.status === "mastered";
            const isRelatedEdge =
              !relatedSlugs ||
              (relatedSlugs.has(edge.prerequisite_slug) && relatedSlugs.has(edge.concept_slug));
            const isEmphasisEdge =
              emphasisSlug != null &&
              (edge.prerequisite_slug === emphasisSlug || edge.concept_slug === emphasisSlug);

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
                strokeWidth={isEmphasisEdge ? 3 : active ? 2.5 : 1.5}
                opacity={isEmphasisEdge ? 0.72 : isRelatedEdge ? (active ? 0.55 : 0.28) : 0.08}
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
            const glow = nodeGlow(concept, selected);
            const showGlow = glow !== "transparent";
            const titleLines = splitTitle(concept.title);
            const isRelatedNode = !relatedSlugs || relatedSlugs.has(concept.slug);
            const isAnchorNode = emphasisSlug === concept.slug;
            const nodeOpacity = focusMode || isRelatedNode ? 1 : 0.36;

            return (
              <g
                key={concept.slug}
                transform={`translate(${x}, ${y})`}
                className="pointer-events-auto cursor-pointer"
                onClick={() => handleNodeSelect(concept)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNodeSelect(concept);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${concept.title}, ${concept.status}`}
                filter={showGlow ? "url(#node-glow)" : undefined}
                opacity={nodeOpacity}
              >
                {showGlow && (
                  <rect
                    x={-4}
                    y={-4}
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    rx={22}
                    fill={glow}
                    opacity={selected ? 0.9 : 0.55}
                  />
                )}

                <motion.rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={18}
                  fill={nodeFill(concept)}
                  stroke={nodeStroke(concept)}
                  strokeWidth={isAnchorNode ? 3 : 2}
                  strokeDasharray={concept.contributor_wanted ? "6 4" : undefined}
                  initial={false}
                  animate={{ y: isAnchorNode ? -4 : 0 }}
                  style={{
                    filter: isAnchorNode
                      ? "drop-shadow(6px 6px 0 var(--color-ink))"
                      : "drop-shadow(3px 3px 0 color-mix(in srgb, var(--color-ink) 20%, transparent))",
                  }}
                />

                <g transform="translate(16 15)">
                  <rect
                    width={concept.status === "in_progress" ? 92 : 74}
                    height={26}
                    rx={13}
                    fill={
                      concept.status === "locked"
                        ? "color-mix(in srgb, var(--color-ink) 10%, var(--color-cream))"
                        : STATUS_STYLES[concept.status].progress
                    }
                    stroke="var(--color-ink)"
                    strokeOpacity={0.22}
                  />
                  <path
                    d={statusIconPath(concept.status)}
                    fill={concept.status === "available" || concept.status === "in_progress" ? "var(--color-ink)" : "none"}
                    stroke="var(--color-ink)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform="translate(0.5 1) scale(0.8)"
                  />
                  <text
                    x={28}
                    y={17}
                    className="fill-ink text-[9px] font-black uppercase tracking-wider"
                  >
                    {STATUS_STYLES[concept.status].label}
                  </text>
                </g>

                {concept.contributor_wanted && (
                  <g transform={`translate(${NODE_W - 89} 15)`}>
                    <rect
                      width={73}
                      height={26}
                      rx={13}
                      fill="var(--color-coral)"
                      stroke="var(--color-ink)"
                      strokeOpacity={0.22}
                    />
                    <path
                      d="M13 5 L15.5 10 L21 10.8 L17 14.6 L18 20 L13 17.3 L8 20 L9 14.6 L5 10.8 L10.5 10 Z"
                      fill="var(--color-ink)"
                      opacity={0.85}
                      transform="scale(0.85)"
                    />
                    <text
                      x={28}
                      y={17}
                      className="fill-ink text-[9px] font-black uppercase tracking-wider"
                    >
                      Claim
                    </text>
                  </g>
                )}

                {concept.is_bonus && !concept.contributor_wanted && (
                  <g transform={`translate(${NODE_W - 75} 15)`}>
                    <rect
                      width={59}
                      height={26}
                      rx={13}
                      fill="var(--color-lilac)"
                      stroke="var(--color-ink)"
                      strokeOpacity={0.18}
                    />
                    <text
                      x={29.5}
                      y={17}
                      textAnchor="middle"
                      className="fill-ink text-[9px] font-black uppercase tracking-wider"
                    >
                      Bonus
                    </text>
                  </g>
                )}

                <text
                  x={NODE_W / 2}
                  y={titleLines.length > 1 ? 64 : 72}
                  textAnchor="middle"
                  className="fill-ink text-[16px] font-black"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {titleLines.map((line, index) => (
                    <tspan key={`${line}-${index}`} x={NODE_W / 2} dy={index === 0 ? 0 : 19}>
                      {line}
                    </tspan>
                  ))}
                </text>

                {concept.mastery.required > 0 && concept.status !== "locked" && (
                  <g transform={`translate(${NODE_W / 2 - 58} ${NODE_PROGRESS_Y})`}>
                    <rect
                      width={116}
                      height={12}
                      rx={6}
                      fill="color-mix(in srgb, var(--color-ink) 9%, transparent)"
                    />
                    <rect
                      width={116 * ratio}
                      height={12}
                      rx={6}
                      fill={STATUS_STYLES[concept.status].progress}
                    />
                    <text
                      x={58}
                      y={24}
                      textAnchor="middle"
                      className="fill-ink/60 text-[9px] font-black"
                    >
                      {concept.mastery.verified}/{concept.mastery.required} solves
                    </text>
                  </g>
                )}
              </g>
            );
          })}
            </svg>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "border-t-2 border-ink/10 text-xs font-bold text-ink/60",
          fullscreen ? "shrink-0 px-3 py-2.5" : "px-4 py-3",
        )}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-[10px] font-semibold text-ink/40">
            Drag to move · Pinch/Ctrl+scroll to zoom · Focus view shows nearby topics first
          </span>
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            aria-expanded={legendOpen}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-3 text-[10px] font-black uppercase tracking-wider transition hover:bg-sun/30"
          >
            <Info className="h-3.5 w-3.5" />
            {legendOpen ? "Hide legend" : "Legend"}
          </button>
        </div>

        {legendOpen && (
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {(["locked", "available", "in_progress", "mastered"] as const).map((status) => (
              <span key={status} className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block h-3 w-3 rounded-full border-2 border-ink",
                    STATUS_STYLES[status].badge,
                  )}
                />
                {STATUS_STYLES[status].label}
              </span>
            ))}
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-ink bg-coral" />
              community wanted
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-sun/80 shadow-[0_0_8px_rgba(255,204,51,0.6)]" />
              highlighted path
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
