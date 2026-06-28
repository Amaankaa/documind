import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import {
  BONUS_PATTERN_COUNT,
  CORE_PATTERN_COUNT,
  KNOWLEDGE_BASE_NAME,
  KNOWLEDGE_BASE_REPO,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from "@/lib/brand";
import { DocCallout, DocCard, DocHero, DocSection } from "@/components/docs/DocsShell";
import { DOCS_NAV, LIVE_APP_URL } from "@/components/docs/docs-nav";

export default function DocsWelcomePage() {
  return (
    <>
      <DocHero
        eyebrow="Documentation"
        title={`Welcome to ${PRODUCT_NAME}`}
        description={`${PRODUCT_TAGLINE}. This guide explains what the product does, how to use it, and how the open-source community keeps it growing — in plain language, no engineering degree required.`}
      />

      <DocSection title="What is AlgoMentor?">
        <p>
          AlgoMentor is a free, open-source interview prep platform. Instead of drowning in hundreds
          of random coding problems, you follow a <strong>study map</strong> — a visual path that
          shows which topics build on which, what you have already learned, and what to study next.
        </p>
        <p>
          Each topic links to <strong>community-written notes</strong> (explanations, Python
          templates, and curated LeetCode problems). When you get stuck, an <strong>AI tutor</strong>{" "}
          gives hints grounded in those notes — it nudges you toward the solution without dumping
          the full answer.
        </p>
      </DocSection>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <DocCard title="Study map">
          {CORE_PATTERN_COUNT} core patterns + {BONUS_PATTERN_COUNT} bonus topics, connected as a
          prerequisite graph so you always know what comes next.
        </DocCard>
        <DocCard title="Community notes">
          Explanations live in the open-source {KNOWLEDGE_BASE_NAME}. Anyone can read them; contributors
          can improve them.
        </DocCard>
        <DocCard title="Socratic tutor">
          Ask questions while you practice. Answers cite the notes you are studying — hints, not
          spoilers.
        </DocCard>
      </div>

      <DocSection title="Who is this for?">
        <ul className="list-disc space-y-2 pl-5">
          <li>Students and self-taught developers preparing for big-tech coding interviews</li>
          <li>Learners who want structure instead of endless LeetCode lists</li>
          <li>Contributors who want to write DSA notes and get credited on the map</li>
          <li>Developers who want to explore or integrate with our API</li>
        </ul>
      </DocSection>

      <DocCallout title="Try it live" tone="sun">
        The app is deployed at{" "}
        <a href={LIVE_APP_URL} className="font-black underline">
          app.algomentor.me
        </a>
        . You need an account to use the study map and tutor, but{" "}
        <strong>reading this documentation is always free — no sign-up required</strong>.
      </DocCallout>

      <DocSection title="Explore the docs">
        <div className="grid gap-3 sm:grid-cols-2">
          {DOCS_NAV.filter((item) => item.href !== "/docs").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-2xl border-2 border-ink bg-white/70 px-5 py-4 font-bold shadow-[4px_4px_0_var(--color-ink)] transition hover:-translate-y-0.5 hover:bg-cream"
            >
              {item.label}
              <ArrowRight className="size-4" />
            </Link>
          ))}
        </div>
      </DocSection>

      <DocSection title="Open source">
        <p>
          {PRODUCT_NAME} is MIT-licensed. The study platform and the companion{" "}
          <a
            href={KNOWLEDGE_BASE_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-black underline"
          >
            {KNOWLEDGE_BASE_NAME}
            <ExternalLink className="size-3.5" />
          </a>{" "}
          textbook are built by learners around the world. See{" "}
          <Link href="/docs/contributors" className="font-black underline">
            Contributors
          </Link>{" "}
          to claim a pattern and add your own notes.
        </p>
      </DocSection>
    </>
  );
}
