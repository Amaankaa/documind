"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Play,
  X,
} from "lucide-react";
import { PracticeProblemsPanel } from "@/components/compass/PracticeProblemsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { studyMapApi, type ConceptNode, type PracticeProblem } from "@/lib/api";
import { OPEN_CONCEPTS_URL } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface ConceptDetailModalProps {
  concept: ConceptNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatKbId: string | null;
  onConceptUpdate: (concept: ConceptNode) => void;
  onProblemVerified: (problem: PracticeProblem) => void;
}

export function ConceptDetailModal({
  concept,
  open,
  onOpenChange,
  chatKbId,
  onConceptUpdate,
  onProblemVerified,
}: ConceptDetailModalProps) {
  const updateProgress = useMutation({
    mutationFn: (args: { conceptId: string; status: "in_progress" | "mastered" }) =>
      studyMapApi.updateProgress(args.conceptId, args.status),
    onSuccess: (res) => {
      onConceptUpdate(res.data);
      toast.success("Progress updated");
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      toast.error(message ?? "Could not update progress");
    },
  });

  if (!concept) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(92vh,880px)] overflow-y-auto rounded-[2rem] border-2 border-ink bg-cream p-0 text-ink shadow-[12px_12px_0_var(--color-ink)] sm:max-w-lg"
      >
        <div
          className={cn(
            "sticky top-0 z-10 border-b-2 border-ink px-6 py-5",
            concept.contributor_wanted && "bg-coral",
            !concept.contributor_wanted && concept.status === "mastered" && "bg-mint",
            !concept.contributor_wanted && concept.status === "in_progress" && "bg-violet",
            !concept.contributor_wanted && concept.status === "available" && "bg-sun",
            !concept.contributor_wanted && concept.status === "locked" && "bg-cream",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <DialogHeader className="text-left">
              <Badge className="mb-2 w-fit border-2 border-ink font-black">
                {concept.contributor_wanted
                  ? "community wanted"
                  : concept.status.replace("_", " ")}
              </Badge>
              <DialogTitle className="font-heading text-2xl font-black tracking-tight">
                {concept.title}
              </DialogTitle>
            </DialogHeader>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border-2 border-ink bg-cream p-2 shadow-[3px_3px_0_var(--color-ink)] transition hover:-translate-y-0.5"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <p className="text-sm font-semibold leading-relaxed text-ink/70">
            {concept.description}
          </p>

          {concept.contributor_wanted && (
            <a
              href={OPEN_CONCEPTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border-2 border-dashed border-ink bg-coral/50 px-3 py-3 text-sm font-bold leading-relaxed text-ink transition hover:bg-coral"
            >
              This pattern needs a contributor — see OPEN_CONCEPTS.md.
            </a>
          )}

          {concept.prerequisites.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/45">
                Prerequisites
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {concept.prerequisites.map((slug) => (
                  <span
                    key={slug}
                    className="rounded-full border border-ink/15 bg-canvas px-2.5 py-1 text-xs font-bold text-ink/70"
                  >
                    {slug.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {concept.github_resources.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/45">
                Community notes
              </p>
              <ul className="mt-2 space-y-2">
                {concept.github_resources.map((resource) => (
                  <li key={resource.url}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 rounded-xl border-2 border-ink/10 bg-canvas px-3 py-2 text-sm font-bold text-ink transition hover:border-ink hover:bg-sun/30"
                    >
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">{resource.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {concept.practice_problems.length > 0 &&
            concept.status !== "locked" &&
            !concept.contributor_wanted && (
              <PracticeProblemsPanel concept={concept} onVerified={onProblemVerified} />
            )}

          <div className="space-y-2 border-t-2 border-ink/10 pt-4">
            {concept.status !== "locked" && concept.status !== "mastered" && (
              <Button
                className="w-full justify-center gap-2 rounded-full border-2 border-ink bg-sun font-black text-ink shadow-[4px_4px_0_var(--color-ink)] hover:-translate-y-0.5"
                disabled={updateProgress.isPending}
                onClick={() =>
                  updateProgress.mutate({
                    conceptId: concept.id,
                    status: "in_progress",
                  })
                }
              >
                {updateProgress.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start studying
              </Button>
            )}

            {concept.status === "in_progress" && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 rounded-full border-2 border-ink bg-mint font-black text-ink shadow-[4px_4px_0_var(--color-ink)] hover:-translate-y-0.5"
                  disabled={updateProgress.isPending || !concept.mastery.can_master}
                  onClick={() =>
                    updateProgress.mutate({
                      conceptId: concept.id,
                      status: "mastered",
                    })
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark mastered
                </Button>
                {!concept.mastery.can_master && (
                  <p className="text-center text-[11px] font-semibold text-ink/50">
                    Verify {concept.mastery.required - concept.mastery.verified} more
                    solve(s) to unlock mastery.
                  </p>
                )}
              </>
            )}

            {concept.status !== "locked" && chatKbId && (
              <Link
                href={`/kb/${chatKbId}/chat?concept=${concept.slug}`}
                className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-canvas px-4 py-2.5 text-sm font-black text-ink shadow-[4px_4px_0_var(--color-ink)] transition hover:-translate-y-0.5"
                onClick={() => onOpenChange(false)}
              >
                Ask the tutor
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
