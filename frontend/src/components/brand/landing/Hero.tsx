"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { ArrowRight, BookOpen, ExternalLink, Globe, Network, Sparkles } from "lucide-react";
import { HeroLivingMap, HERO_JOURNEY } from "@/components/brand/HeroLivingMap";
import { KineticWord } from "@/components/brand/landing/KineticWord";
import { useCountUp } from "@/components/brand/useCountUp";
import {
  CORE_PATTERN_COUNT,
  KNOWLEDGE_BASE_NAME,
  KNOWLEDGE_BASE_REPO,
  LIVE_APP_URL,
  PRODUCT_DESCRIPTION,
  PRODUCT_TAGLINE,
} from "@/lib/brand";

function StatNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const counted = useCountUp(target);
  return (
    <span>
      {reduce ? target : counted}
      {suffix}
    </span>
  );
}

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [spotlight, setSpotlight] = useState<string>("sliding-window");

  // Scroll-as-journey: walk the spotlight along the learning path as the visitor
  // scrolls out of the hero, tying the narrative to the graph.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduce) return;
    const idx = Math.min(HERO_JOURNEY.length - 1, Math.floor(v * HERO_JOURNEY.length));
    setSpotlight(HERO_JOURNEY[idx]);
  });

  return (
    <section
      ref={heroRef}
      className="mx-auto grid min-h-screen max-w-7xl items-center gap-14 px-6 pb-20 pt-36 lg:grid-cols-[0.92fr_1.08fr] lg:pt-28"
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-3xl"
      >
        <div className="mb-7 flex flex-wrap items-center gap-3">
          <div className="inline-flex rotate-[-1deg] items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-ink/70 shadow-[0_12px_40px_rgba(20,17,15,0.08)]">
            <Sparkles className="size-4 text-flame" />
            {PRODUCT_TAGLINE}
          </div>
          <a
            href={LIVE_APP_URL}
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-mint px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-ink shadow-[4px_4px_0_var(--color-ink)] transition hover:-translate-y-0.5"
          >
            <Globe className="size-3.5" />
            Live now
          </a>
        </div>

        <h1 className="font-heading text-[clamp(3.2rem,10vw,7.5rem)] font-black leading-[0.86] tracking-[-0.085em] text-ink">
          Stop
          <motion.span
            animate={reduce ? undefined : { rotate: [2, -1, 2], y: [0, -4, 0] }}
            transition={reduce ? undefined : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mx-2 inline-block rounded-[2rem] bg-sun px-4 pb-3 pt-1 shadow-[8px_8px_0_var(--color-ink)]"
          >
            <KineticWord text="guessing" />
          </motion.span>
          what to study.
        </h1>

        <p className="mt-8 max-w-2xl text-lg font-medium leading-8 text-cocoa/75 md:text-xl">
          {PRODUCT_DESCRIPTION} Built on open-source community notes and a prerequisite graph
          powered by real algorithms — topological sort, not vibes.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <a
            href={LIVE_APP_URL}
            className="group inline-flex items-center justify-center gap-3 rounded-full bg-ink px-7 py-4 text-base font-black text-cream shadow-[0_18px_40px_rgba(20,17,15,0.28)] transition hover:-translate-y-1"
          >
            Open live app
            <ArrowRight className="size-5 transition group-hover:translate-x-1" />
          </a>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-ink bg-cream px-7 py-4 text-base font-black text-ink transition hover:-translate-y-1 hover:bg-white"
          >
            Read the docs
            <BookOpen className="size-5" />
          </Link>
          <a
            href={KNOWLEDGE_BASE_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-dashed border-ink/40 bg-white/50 px-7 py-4 text-base font-black text-ink transition hover:-translate-y-1 hover:bg-white"
          >
            {KNOWLEDGE_BASE_NAME}
            <ExternalLink className="size-5" />
          </a>
        </div>

        <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
          <div className="glass-card rounded-[1.5rem] p-4 shadow-[0_12px_38px_rgba(20,17,15,0.08)]">
            <Network className="mb-3 size-5 text-grape" />
            <div className="text-xl font-black">
              <StatNumber target={CORE_PATTERN_COUNT} />
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">
              Core patterns
            </div>
          </div>
          <div className="glass-card rounded-[1.5rem] p-4 shadow-[0_12px_38px_rgba(20,17,15,0.08)]">
            <BookOpen className="mb-3 size-5 text-grape" />
            <div className="text-xl font-black">
              <StatNumber target={25} suffix="+" />
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">
              Community notes
            </div>
          </div>
          <div className="glass-card rounded-[1.5rem] p-4 shadow-[0_12px_38px_rgba(20,17,15,0.08)]">
            <Globe className="mb-3 size-5 text-grape" />
            <div className="text-xl font-black">Free</div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">
              Live & open
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        id="map"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.85, ease: "easeOut", delay: 0.12 }}
        className="relative"
      >
        <div className="glass-card relative overflow-hidden rounded-[3rem] border-2 border-ink p-5 shadow-[18px_18px_0_var(--color-ink)] md:p-7">
          <div className="mb-4 flex items-center justify-between rounded-full border border-ink/10 bg-white/50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-flame" />
              <span className="size-3 rounded-full bg-sun" />
              <span className="size-3 rounded-full bg-teal" />
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-ink/40">
              Prerequisite study map
            </div>
          </div>
          <HeroLivingMap spotlightSlug={spotlight} />
        </div>
      </motion.div>
    </section>
  );
}
