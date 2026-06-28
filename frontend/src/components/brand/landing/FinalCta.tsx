"use client";

import Link from "next/link";
import { BookOpen, GraduationCap, Zap } from "lucide-react";
import { LIVE_APP_URL } from "@/lib/brand";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="relative overflow-hidden rounded-[3rem] border-2 border-ink bg-sun p-8 shadow-[18px_18px_0_var(--color-ink)] md:p-14">
        <div className="absolute right-8 top-8 hidden rotate-12 rounded-full bg-flame px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-ink md:block">
          big-tech ready
        </div>
        <GraduationCap className="mb-8 size-14" />
        <h2 className="max-w-3xl font-heading text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
          Your interview prep deserves a map, not a mess of bookmarks.
        </h2>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <a
            href={LIVE_APP_URL}
            className="inline-flex items-center justify-center gap-3 rounded-full bg-ink px-7 py-4 text-base font-black text-cream transition hover:-translate-y-1"
          >
            Open app.algomentor.me
            <Zap className="size-5" />
          </a>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-ink bg-cream px-7 py-4 text-base font-black text-ink transition hover:-translate-y-1"
          >
            Documentation
            <BookOpen className="size-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
