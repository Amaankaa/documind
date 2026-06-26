"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, GraduationCap, Map, Sparkles, Target } from "lucide-react";
import { ConceptDetailModal } from "@/components/compass/ConceptDetailModal";
import { ConceptMapCanvas } from "@/components/compass/ConceptMapCanvas";
import { fadeIn } from "@/components/brand/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useMe";
import { studyMapApi, type ConceptNode, type PracticeProblem } from "@/lib/api";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";

export default function StudyMapPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ConceptNode | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { data: me } = useMe();

  const [showBonus, setShowBonus] = useState(false);
  const [focusMode, setFocusMode] = useState(true);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["study-map"],
    queryFn: async () => (await studyMapApi.getMap(true)).data,
  });

  const handleSelect = (concept: ConceptNode) => {
    setSelected(concept);
    setModalOpen(true);
  };

  const handleConceptUpdate = (concept: ConceptNode) => {
    setSelected(concept);
    queryClient.invalidateQueries({ queryKey: ["study-map"] });
  };

  const handleProblemVerified = (problem: PracticeProblem) => {
    setSelected((prev) => {
      if (!prev) return prev;
      const practice_problems = prev.practice_problems.map((p) =>
        p.id === problem.id ? problem : p,
      );
      const verified = practice_problems.filter((p) => p.verified).length;
      return {
        ...prev,
        practice_problems,
        mastery: {
          ...prev.mastery,
          verified,
          can_master: verified >= prev.mastery.required,
        },
      };
    });
    queryClient.invalidateQueries({ queryKey: ["study-map"] });
  };

  const chatKbId = me?.community_kb_id ?? data?.meta.community_kb_id ?? null;

  const {
    visibleConcepts,
    visibleEdges,
    nextConcept,
    focusSlug,
    bonusCount,
    masteredCore,
    coreCount,
  } = useMemo(() => {
      const concepts = data?.concepts ?? [];
      const edges = data?.edges ?? [];
      const core = concepts.filter((c) => !c.is_bonus);
      const bonus = concepts.filter((c) => c.is_bonus);
      const baseConcepts = showBonus ? concepts : core;
      const baseSlugs = new Set(baseConcepts.map((c) => c.slug));
      const baseEdges = showBonus
        ? edges
        : edges.filter(
            (edge) => baseSlugs.has(edge.prerequisite_slug) && baseSlugs.has(edge.concept_slug),
          );
      const next =
        data?.next_concept && baseSlugs.has(data.next_concept.slug)
          ? data.next_concept
          : baseConcepts.find((c) => c.status === "available" || c.status === "in_progress") ??
            baseConcepts[0] ??
            null;

      const anchorSlug =
        selected && baseSlugs.has(selected.slug) ? selected.slug : next?.slug ?? null;

      let visible = baseConcepts;
      let filteredEdges = baseEdges;

      if (focusMode && anchorSlug) {
        const focusSlugs = new Set<string>([anchorSlug]);
        for (const edge of baseEdges) {
          if (edge.concept_slug === anchorSlug) focusSlugs.add(edge.prerequisite_slug);
          if (edge.prerequisite_slug === anchorSlug) focusSlugs.add(edge.concept_slug);
        }
        visible = baseConcepts.filter((c) => focusSlugs.has(c.slug));
        filteredEdges = baseEdges.filter(
          (edge) => focusSlugs.has(edge.prerequisite_slug) && focusSlugs.has(edge.concept_slug),
        );
      }

      return {
        visibleConcepts: visible,
        visibleEdges: filteredEdges,
        nextConcept: next,
        focusSlug: anchorSlug,
        bonusCount: bonus.length,
        masteredCore: core.filter((c) => c.status === "mastered").length,
        coreCount: core.length || 17,
      };
    }, [data, focusMode, selected, showBonus]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col p-4">
        <Skeleton className="h-14 w-full max-w-md rounded-2xl" />
        <Skeleton className="mt-4 min-h-0 flex-1 rounded-[2rem]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-[2rem] border-2 border-ink bg-coral p-8 text-center">
          <p className="font-black">Could not load the study map.</p>
          {error instanceof Error && (
            <p className="mt-2 text-xs text-ink/45">{error.message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <motion.header
        className="shrink-0 border-b-2 border-ink/10 bg-cream/80 px-4 py-3 backdrop-blur md:px-6"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl border-2 border-ink bg-violet shadow-[4px_4px_0_var(--color-ink)]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/45">
                {PRODUCT_NAME}
              </p>
              <h1 className="font-heading text-lg font-black md:text-xl">
                {PRODUCT_TAGLINE}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-ink/45">
                Core progress
              </p>
              <p className="font-heading text-xl font-black tabular-nums">
                {masteredCore}/{coreCount}
              </p>
            </div>
            {bonusCount > 0 && (
              <button
                type="button"
                onClick={() => setShowBonus((v) => !v)}
                aria-pressed={showBonus}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-[3px_3px_0_var(--color-ink)] transition hover:-translate-y-0.5 ${
                  showBonus ? "bg-lilac text-ink" : "bg-cream text-ink/55"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Bonus {showBonus ? "on" : "off"} ({bonusCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setFocusMode((v) => !v)}
              aria-pressed={focusMode}
              className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-[3px_3px_0_var(--color-ink)] transition hover:-translate-y-0.5 ${
                focusMode ? "bg-sun text-ink" : "bg-cream text-ink/55"
              }`}
            >
              {focusMode ? <Target className="h-3.5 w-3.5" /> : <Map className="h-3.5 w-3.5" />}
              {focusMode ? "Focus view" : "Full map"}
            </button>
          </div>
        </div>
      </motion.header>

      {nextConcept && (
        <motion.section
          className="shrink-0 border-b-2 border-ink/10 bg-canvas/80 px-3 py-3 md:px-4"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border-2 border-ink bg-cream px-4 py-3 shadow-[5px_5px_0_var(--color-ink)]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-sun">
                <Target className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/45">
                  Recommended next
                </p>
                <h2 className="truncate font-heading text-lg font-black md:text-xl">
                  {nextConcept.title}
                </h2>
                <p className="text-xs font-semibold text-ink/55">
                  We’ll show the prerequisites and the immediate next branches first.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSelect(nextConcept)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink bg-mint px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_var(--color-ink)] transition hover:-translate-y-0.5"
            >
              <Eye className="h-4 w-4" />
              Open lesson
            </button>
          </div>
        </motion.section>
      )}

      <motion.div
        className="min-h-0 flex-1 overflow-hidden p-3 md:p-4"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <ConceptMapCanvas
          concepts={visibleConcepts}
          edges={visibleEdges}
          selectedSlug={selected?.slug ?? nextConcept?.slug ?? null}
          focusSlug={focusSlug}
          focusMode={focusMode}
          onSelect={handleSelect}
          fullscreen
        />
      </motion.div>

      <ConceptDetailModal
        concept={selected}
        open={modalOpen}
        onOpenChange={setModalOpen}
        chatKbId={chatKbId}
        onConceptUpdate={handleConceptUpdate}
        onProblemVerified={handleProblemVerified}
      />
    </div>
  );
}
