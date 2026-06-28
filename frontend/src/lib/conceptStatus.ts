import type { ConceptNode } from "@/lib/api";

/**
 * Visual language for concept/study-map nodes — the single source of truth shared
 * by the live interactive graph (`ConceptMapCanvas`) and the marketing hero graph
 * (`HeroLivingMap`). Keeping these in one place guarantees the landing page reads
 * as the same product as the authenticated app.
 */
export const STATUS_STYLES: Record<
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

/** A pattern open for community contribution gets the coral "claim me" treatment. */
export const CONTRIBUTOR_WANTED_FILL =
  "color-mix(in srgb, var(--color-coral) 16%, var(--color-cream))";
export const CONTRIBUTOR_WANTED_STROKE = "var(--color-ink)";
export const CONTRIBUTOR_WANTED_GLOW = "rgba(255, 138, 101, 0.45)";
export const SELECTED_GLOW = "rgba(255, 204, 51, 0.65)";

export function nodeFill(concept: ConceptNode): string {
  if (concept.contributor_wanted) return CONTRIBUTOR_WANTED_FILL;
  return STATUS_STYLES[concept.status].fill;
}

export function nodeStroke(concept: ConceptNode): string {
  if (concept.contributor_wanted) return CONTRIBUTOR_WANTED_STROKE;
  return STATUS_STYLES[concept.status].stroke;
}

export function nodeGlow(concept: ConceptNode, selected: boolean): string {
  if (selected) return SELECTED_GLOW;
  if (concept.contributor_wanted) return CONTRIBUTOR_WANTED_GLOW;
  if (concept.status === "locked") return "transparent";
  return STATUS_STYLES[concept.status].glow;
}

export function progressRatio(concept: ConceptNode): number {
  if (concept.status === "mastered") return 1;
  const { required, verified } = concept.mastery;
  if (required <= 0) {
    if (concept.status === "in_progress") return 0.35;
    return 0;
  }
  return Math.min(1, verified / required);
}
