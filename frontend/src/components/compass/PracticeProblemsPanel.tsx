"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { studyMapApi, type ConceptNode, type PracticeProblem } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PracticeProblemsPanelProps {
  concept: ConceptNode;
  onVerified: (updated: PracticeProblem) => void;
}

export function PracticeProblemsPanel({ concept, onVerified }: PracticeProblemsPanelProps) {
  const [proofByProblem, setProofByProblem] = useState<Record<string, string>>({});

  const verify = useMutation({
    mutationFn: (args: { problemId: string; proofUrl: string }) =>
      studyMapApi.verifyProblem(concept.id, args.problemId, args.proofUrl),
    onSuccess: (res) => {
      onVerified(res.data);
      toast.success("Solve verified — nice work!");
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      toast.error(message ?? "Could not verify that submission link");
    },
  });

  const { mastery, practice_problems: problems } = concept;

  if (problems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/45">
            Prove your solves
          </p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink/65">
            Master this pattern after verifying{" "}
            <span className="font-black text-ink">{mastery.required}</span> LeetCode
            problems from the community notes.
          </p>
        </div>
        <div
          className={cn(
            "shrink-0 rounded-xl border-2 border-ink px-3 py-2 text-center shadow-[3px_3px_0_var(--color-ink)]",
            mastery.can_master ? "bg-mint" : "bg-sun",
          )}
        >
          <p className="text-lg font-black leading-none">
            {mastery.verified}/{mastery.required}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-ink/55">verified</p>
        </div>
      </div>

      <ul className="space-y-3">
        {problems.map((problem) => {
          const pendingId = verify.isPending ? verify.variables?.problemId : null;

          return (
            <li
              key={problem.id}
              className={cn(
                "rounded-xl border-2 p-3",
                problem.verified
                  ? "border-ink bg-mint/40"
                  : "border-ink/15 bg-canvas",
              )}
            >
              <div className="flex items-start gap-2">
                {problem.verified ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
                ) : (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink/40" />
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-black text-ink hover:underline"
                  >
                    {problem.title}
                    <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                  </a>
                  <p className="mt-0.5 text-[10px] font-semibold text-ink/45">
                    leetcode.com/problems/{problem.leetcode_slug}
                  </p>
                </div>
              </div>

              {!problem.verified && concept.status !== "locked" && (
                <div className="mt-3 space-y-2">
                  <Input
                    placeholder="Enter your submission URL"
                    value={proofByProblem[problem.id] ?? ""}
                    onChange={(e) =>
                      setProofByProblem((prev) => ({
                        ...prev,
                        [problem.id]: e.target.value,
                      }))
                    }
                    className="border-2 border-ink bg-cream text-sm font-semibold"
                  />
                  <Button
                    size="sm"
                    className="w-full rounded-full border-2 border-ink bg-violet font-black text-ink shadow-[3px_3px_0_var(--color-ink)]"
                    disabled={pendingId === problem.id || !proofByProblem[problem.id]?.trim()}
                    onClick={() =>
                      verify.mutate({
                        problemId: problem.id,
                        proofUrl: proofByProblem[problem.id].trim(),
                      })
                    }
                  >
                    {pendingId === problem.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verify solve"
                    )}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] font-medium leading-relaxed text-ink/45">
        Solve on LeetCode, open your accepted submission, and copy the URL from
        your browser. It must look like{" "}
        <code className="rounded bg-ink/10 px-1 text-[10px]">
          leetcode.com/problems/slug/submissions/1234567890/
        </code>
        .
      </p>
    </div>
  );
}
