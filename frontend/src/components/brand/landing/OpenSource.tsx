"use client";

import { ArrowRight, BookOpen, CheckCircle2, ExternalLink } from "lucide-react";
import {
  CONTRIBUTING_URL,
  KNOWLEDGE_BASE_NAME,
  OPEN_CONCEPTS_URL,
  PRODUCT_NAME,
} from "@/lib/brand";

const proofPoints = [
  "Open-source MIT license",
  "Live at app.algomentor.me",
  "Cited community notes",
  "Big-tech scope only",
];

export function OpenSource() {
  return (
    <section id="opensource" className="mx-auto max-w-7xl px-6 py-20">
      <div className="overflow-hidden rounded-[3rem] border-2 border-ink bg-ink p-6 text-cream shadow-[18px_18px_0_var(--color-sun)] md:p-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-mint">
              <BookOpen className="size-4" />
              Open source & growing
            </div>
            <h2 className="font-heading text-4xl font-black leading-none tracking-[-0.045em] md:text-6xl">
              Two repos. One mission. Claim a pattern and help thousands prep.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62">
              {PRODUCT_NAME} is the study map and tutor. The {KNOWLEDGE_BASE_NAME} is the textbook.
              Contributors ship linked PRs to both — add a note, wire the graph, get credited on the
              map.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={OPEN_CONCEPTS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-coral bg-coral/20 px-5 py-3 text-sm font-black text-cream transition hover:bg-coral/30"
              >
                Claim a pattern
                <ExternalLink className="size-4" />
              </a>
              <a
                href={CONTRIBUTING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black transition hover:bg-white/15"
              >
                Contributing guide
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {proofPoints.map((point) => (
              <div key={point} className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
                <CheckCircle2 className="mb-4 size-6 text-mint" />
                <div className="font-bold">{point}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
