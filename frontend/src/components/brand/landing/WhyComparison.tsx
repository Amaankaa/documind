"use client";

import { PRODUCT_NAME } from "@/lib/brand";

const comparisonRows = [
  {
    without: "Random LeetCode lists with no order",
    with: "Prerequisite map tells you what to study next",
  },
  {
    without: "YouTube rabbit holes and bookmark chaos",
    with: "One link per pattern to curated community notes",
  },
  {
    without: "ChatGPT gives full solutions (or hallucinates)",
    with: "Tutor gives hints grounded in your study notes",
  },
  {
    without: "No idea if you are actually ready",
    with: "Mastery gating + verified practice progress",
  },
];

export function WhyComparison() {
  return (
    <section id="why" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-12 max-w-3xl">
        <div className="mb-5 inline-flex rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-cream">
          Why {PRODUCT_NAME}
        </div>
        <h2 className="font-heading text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
          Structure beats stamina.
        </h2>
        <p className="mt-5 text-lg font-medium leading-8 text-cocoa/72">
          Most prep tools give you problems. We give you a path — notes, practice, and a tutor that
          knows what you are supposed to be learning today.
        </p>
      </div>
      <div className="overflow-hidden rounded-[3rem] border-2 border-ink bg-white/70 shadow-[12px_12px_0_var(--color-ink)]">
        <div className="grid border-b-2 border-ink md:grid-cols-2">
          <div className="border-ink/10 bg-coral/15 p-6 font-black uppercase tracking-[0.14em] text-ink/55 md:border-r-2">
            Without a map
          </div>
          <div className="bg-mint/40 p-6 font-black uppercase tracking-[0.14em] text-ink">
            With {PRODUCT_NAME}
          </div>
        </div>
        {comparisonRows.map((row, index) => (
          <div
            key={row.without}
            className={`grid md:grid-cols-2 ${index < comparisonRows.length - 1 ? "border-b-2 border-ink/10" : ""}`}
          >
            <div className="border-ink/10 p-6 text-cocoa/65 md:border-r-2">{row.without}</div>
            <div className="bg-cream/50 p-6 font-bold text-ink">{row.with}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
