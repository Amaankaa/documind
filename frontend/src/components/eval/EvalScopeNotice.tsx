"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, FlaskConical, KeyRound, UploadCloud, X } from "lucide-react";
import { BrutalCard } from "@/components/brand/BrutalCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shown when generate / run need BYOK — tutor free tier does not cover eval. */
export function EvalByokRequired({ settingsHref = "/settings" }: { settingsHref?: string }) {
  return (
    <BrutalCard className="border-2 border-ink bg-coral/25 p-6 md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-ink/55">
            Your API key required
          </p>
          <h2 className="font-heading text-2xl font-black tracking-tight md:text-3xl">
            Eval runs on your key — not our shared tutor quota
          </h2>
          <p className="mt-3 text-sm font-medium leading-7 text-ink/70">
            Generating test questions and running the harness call an LLM for every case (write
            questions, answer them, judge them). That stays on <strong>your</strong> Gemini or
            LaoZhang key — the same one you can add for unlimited tutor chat in Settings.
          </p>
          <ul className="mt-4 space-y-2 text-sm font-semibold text-ink/65">
            <li className="flex gap-2">
              <span className="font-black text-ink">✓</span> Study map &amp; tutor — free daily tier
            </li>
            <li className="flex gap-2">
              <span className="font-black text-ink">✓</span> Manual test cases — no key needed
            </li>
            <li className="flex gap-2">
              <span className="font-black text-coral">→</span> Generate cases &amp; run eval — your key
            </li>
          </ul>
        </div>
        <Button
          asChild
          className="h-11 shrink-0 gap-2 border-2 border-ink bg-ink font-black text-cream shadow-[4px_4px_0_var(--color-sun)] hover:bg-ink"
        >
          <Link href={settingsHref}>
            <KeyRound className="size-4" />
            Add API key in Settings
          </Link>
        </Button>
      </div>
    </BrutalCard>
  );
}

/** Shown at the top of the personal eval workspace — community notes vs your uploads. */
export function EvalScopeExplainer({
  uploadHref,
  readyCount,
  className,
}: {
  uploadHref: string;
  readyCount: number;
  className?: string;
}) {
  return (
    <BrutalCard className={cn("overflow-hidden p-0", className)}>
      <div className="border-b-2 border-ink bg-violet/35 px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-ink text-cream">
              <FlaskConical className="size-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/55">
                How evaluation works
              </p>
              <h2 className="font-heading text-xl font-black tracking-tight md:text-2xl">
                Your uploads only — not the community textbook
              </h2>
            </div>
          </div>
          {readyCount === 0 && (
            <Button
              asChild
              className="h-10 gap-2 border-2 border-ink bg-sun font-black text-ink shadow-[4px_4px_0_var(--color-ink)] hover:bg-sun"
            >
              <Link href={uploadHref}>
                Upload a document
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2">
        <ScopeColumn
          icon={<BookOpen className="size-5" />}
          title="Community notes"
          subtitle="Shared study corpus"
          body="Powers the study map and AI tutor. Everyone reads the same open-source markdown."
          measured={false}
          tone="bg-cream/80"
        />
        <ScopeColumn
          icon={<UploadCloud className="size-5" />}
          title="Your uploads"
          subtitle={readyCount > 0 ? `${readyCount} ready to test` : "Nothing uploaded yet"}
          body="PDFs, DOCX, URLs — files you added to your workspace. The harness scores retrieval and answers against these only."
          measured
          tone="bg-mint/40"
        />
      </div>

      <p className="border-t-2 border-ink/10 px-5 py-3 text-center text-xs font-bold leading-6 text-ink/55 md:px-6">
        Think of it as a <strong className="text-ink">private lab</strong> for your own docs — the
        tutor already knows the community notes; eval tells you if <em>your</em> files are searchable.
      </p>
    </BrutalCard>
  );
}

function ScopeColumn({
  icon,
  title,
  subtitle,
  body,
  measured,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  body: string;
  measured: boolean;
  tone: string;
}) {
  return (
    <div className={cn("border-ink/10 p-5 md:p-6 md:first:border-r-2", tone)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl border-2 border-ink bg-white/70">
            {icon}
          </div>
          <div>
            <p className="font-heading text-base font-black">{title}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">{subtitle}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
            measured ? "bg-mint" : "bg-coral/70",
          )}
        >
          {measured ? (
            <>
              <FlaskConical className="size-3" />
              Evaluated
            </>
          ) : (
            <>
              <X className="size-3" />
              Not evaluated
            </>
          )}
        </span>
      </div>
      <p className="text-sm font-medium leading-7 text-ink/68">{body}</p>
    </div>
  );
}

/** Full-page state when someone opens eval on the community knowledge base. */
export function EvalCommunityBlocked({
  personalEvalHref,
  uploadHref,
}: {
  personalEvalHref: string;
  uploadHref: string;
}) {
  return (
    <BrutalCard className="mx-auto max-w-2xl p-8 text-center md:p-12">
      <div className="mx-auto mb-6 grid size-16 place-items-center rounded-[1.75rem] border-2 border-dashed border-ink bg-coral/25">
        <BookOpen className="size-8" />
      </div>
      <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-ink/50">
        Wrong workspace
      </p>
      <h2 className="font-heading text-3xl font-black tracking-tight md:text-4xl">
        Community notes aren&apos;t graded here
      </h2>
      <p className="mx-auto mt-4 max-w-md text-base font-medium leading-8 text-ink/65">
        The shared Algorithm Knowledge Base feeds the study map and tutor for everyone. The
        evaluation harness is a separate tool — it only measures documents{" "}
        <strong className="text-ink">you uploaded</strong> to your personal workspace.
      </p>

      <div className="mx-auto mt-8 max-w-sm rounded-2xl border-2 border-ink bg-sun/40 p-4 text-left text-sm font-semibold leading-7 text-ink/75">
        <p>
          <span className="font-black text-ink">Community corpus</span> → read &amp; chat
        </p>
        <p className="mt-1">
          <span className="font-black text-ink">Your uploads</span> → upload, then evaluate
        </p>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button
          asChild
          className="h-11 gap-2 border-2 border-ink bg-ink font-black text-cream shadow-[4px_4px_0_var(--color-sun)] hover:bg-ink"
        >
          <Link href={uploadHref}>
            Upload my documents
            <UploadCloud className="size-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 gap-2 border-2 border-ink bg-cream font-black text-ink shadow-[4px_4px_0_var(--color-ink)] hover:bg-cream"
        >
          <Link href={personalEvalHref}>
            Open my eval workspace
            <FlaskConical className="size-4" />
          </Link>
        </Button>
      </div>
    </BrutalCard>
  );
}
