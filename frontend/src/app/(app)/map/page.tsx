"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["study-map"],
    queryFn: async () => (await studyMapApi.getMap()).data,
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
  const masteredCount = data?.concepts.filter((c) => c.status === "mastered").length ?? 0;
  const coreCount = data?.concepts.filter((c) => !c.is_bonus).length ?? 17;

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
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-ink/45">
              Progress
            </p>
            <p className="font-heading text-xl font-black tabular-nums">
              {masteredCount}/{coreCount}
            </p>
          </div>
        </div>
      </motion.header>

      <motion.div
        className="min-h-0 flex-1 overflow-hidden p-3 md:p-4"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <ConceptMapCanvas
          concepts={data.concepts}
          edges={data.edges}
          selectedSlug={selected?.slug ?? data.next_concept?.slug ?? null}
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
