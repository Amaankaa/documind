"use client";

import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";

const landingFaqs = [
  {
    q: "Do I need to pay?",
    a: "No. AlgoMentor is free and open source.",
  },
  {
    q: "Can I read the docs without signing up?",
    a: "Yes — documentation is public at /docs.",
  },
  {
    q: "Is this a LeetCode replacement?",
    a: "It is the map and mentor on top of LeetCode-style practice — structure, not another problem bank.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-coral/30 px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
            <HelpCircle className="size-4" />
            FAQ
          </div>
          <h2 className="font-heading text-4xl font-black tracking-[-0.04em] md:text-5xl">
            Quick answers
          </h2>
        </div>
        <Link
          href="/docs/faq"
          className="hidden items-center gap-2 font-black text-ink/60 hover:text-ink sm:inline-flex"
        >
          Full FAQ
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {landingFaqs.map((item) => (
          <div
            key={item.q}
            className="rounded-[2rem] border-2 border-ink bg-white/70 p-6 shadow-[8px_8px_0_var(--color-ink)]"
          >
            <h3 className="mb-3 font-heading text-xl font-black">{item.q}</h3>
            <p className="leading-7 text-cocoa/72">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
