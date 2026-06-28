"use client";

import Link from "next/link";
import { CheckCircle2, Zap } from "lucide-react";

const pricingFeatures = [
  "Full study map & progress tracking",
  "Community notes on every core pattern",
  "Daily AI tutor questions (shared key)",
  "Personal document uploads",
  "Bring your own API key for unlimited tutor",
];

export function Pricing() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="rounded-[3rem] border-2 border-ink bg-ink p-8 text-cream shadow-[16px_16px_0_var(--color-sun)] md:p-10">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-mint">
            Free to start
          </p>
          <div className="font-heading text-7xl font-black tracking-[-0.06em]">$0</div>
          <p className="mt-4 text-lg leading-8 text-white/62">
            No credit card. No paywall on the study map. Open source forever — optional BYOK if you
            want unlimited tutor questions.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-sun px-6 py-3 font-black text-ink"
          >
            Create free account
            <Zap className="size-4" />
          </Link>
        </div>
        <ul className="space-y-4">
          {pricingFeatures.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-4 rounded-[1.75rem] border-2 border-ink bg-cream p-5 shadow-[6px_6px_0_var(--color-ink)]"
            >
              <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-grape" />
              <span className="font-bold leading-7 text-ink/80">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
