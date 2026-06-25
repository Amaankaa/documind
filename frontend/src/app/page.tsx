"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDotDashed,
  ExternalLink,
  GitBranch,
  GraduationCap,
  Layers,
  Map,
  MessageSquareQuote,
  Network,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion, useScroll, useSpring } from "framer-motion";
import { PatternMarquee } from "@/components/brand/PatternMarquee";
import {
  CONTRIBUTING_URL,
  CORE_PATTERN_COUNT,
  KNOWLEDGE_BASE_NAME,
  KNOWLEDGE_BASE_REPO,
  OPEN_CONCEPTS_URL,
  PRODUCT_DESCRIPTION,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from "@/lib/brand";

const navItems = [
  { href: "#map", label: "Study map" },
  { href: "#workflow", label: "How it works" },
  { href: "#opensource", label: "Open source" },
];

const signals = [
  { label: "Core patterns", value: `${CORE_PATTERN_COUNT}`, icon: Network },
  { label: "Community notes", value: "25+", icon: BookOpen },
  { label: "Open to claim", value: "3", icon: Sparkles },
];

const orbitPatterns = [
  "sliding-window",
  "binary-search",
  "graphs-bfs",
  "dynamic-programming",
  "two-pointers",
];

const featureCards = [
  {
    icon: Map,
    title: "Prerequisite study map",
    description:
      "Seventeen core DSA patterns wired as a DAG. Topological sort tells you what to study next — no more random LeetCode grinding.",
  },
  {
    icon: BookOpen,
    title: "Community-written notes",
    description:
      "Every pattern links to open-source explanations with Python templates and curated LeetCode problems — built by learners, for learners.",
  },
  {
    icon: MessageSquareQuote,
    title: "A mentor, not an answer key",
    description:
      "The AI tutor gives graduated hints grounded in those notes. It teaches you to think — it won't dump the full solution on you.",
  },
];

const timeline = [
  {
    step: "01",
    title: "Open your study map",
    body: "See which patterns you've mastered, what's unlocked, and what topological sort recommends next.",
  },
  {
    step: "02",
    title: "Read the community notes",
    body: "Jump to beginner-friendly markdown on GitHub — templates, Big-O, and practice problems for each pattern.",
  },
  {
    step: "03",
    title: "Ask for hints, not answers",
    body: "Stuck on a problem? The tutor nudges you toward the approach with citations — then you mark the pattern mastered.",
  },
];

const proofPoints = [
  "Open-source MIT license",
  "Dual-repo contributions",
  "Cited community notes",
  "Big-tech scope only",
];

const mapNodes = [
  { label: "Arrays", tone: "bg-mint", w: "72%" },
  { label: "Two pointers", tone: "bg-sun", w: "58%" },
  { label: "Sliding window", tone: "bg-violet", w: "44%" },
  { label: "Dynamic programming", tone: "bg-coral/80", w: "20%", dashed: true },
];

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="min-h-screen overflow-hidden bg-canvas text-ink">
      <motion.div
        style={{ scaleX }}
        className="fixed inset-x-0 top-0 z-[60] h-1.5 origin-left bg-flame"
      />
      <div className="pointer-events-none fixed inset-0 z-0">
        <motion.div
          animate={{ x: [0, 80, 10, 0], y: [0, 30, 90, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-ember/30 blur-[90px]"
        />
        <motion.div
          animate={{ x: [0, -60, -20, 0], y: [0, 80, 20, 0], scale: [1, 0.95, 1.08, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[-10rem] top-20 h-[36rem] w-[36rem] rounded-full bg-violet/25 blur-[110px]"
        />
        <motion.div
          animate={{ x: [0, 45, -30, 0], y: [0, -70, -20, 0], scale: [1, 1.12, 0.98, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-teal/25 blur-[100px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,17,15,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(20,17,15,0.055)_1px,transparent_1px)] bg-[size:38px_38px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(245,239,227,0.86)_68%)]" />
      </div>

      <motion.nav
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="fixed inset-x-0 top-0 z-50 px-4 pt-4"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border border-ink/10 bg-cream/75 px-4 shadow-[0_20px_80px_rgba(20,17,15,0.12)] backdrop-blur-2xl md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-ink text-cream shadow-[0_8px_24px_rgba(20,17,15,0.25)]">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">
              {PRODUCT_NAME}
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-semibold text-ink/60 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink/70 transition hover:bg-ink/5 hover:text-ink sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cream shadow-[0_12px_34px_rgba(20,17,15,0.25)] transition hover:-translate-y-0.5 hover:bg-ink-soft"
            >
              Start prepping
            </Link>
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-14 px-6 pb-20 pt-36 lg:grid-cols-[0.92fr_1.08fr] lg:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="mb-7 inline-flex rotate-[-1deg] items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-ink/70 shadow-[0_12px_40px_rgba(20,17,15,0.08)]">
              <Sparkles className="size-4 text-flame" />
              {PRODUCT_TAGLINE}
            </div>

            <h1 className="font-heading text-[clamp(3.2rem,10vw,7.5rem)] font-black leading-[0.86] tracking-[-0.085em] text-ink">
              Stop
              <motion.span
                animate={{ rotate: [2, -1, 2], y: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mx-2 inline-block rounded-[2rem] bg-sun px-4 pb-3 pt-1 shadow-[8px_8px_0_var(--color-ink)]"
              >
                guessing
              </motion.span>
              what to study.
            </h1>

            <p className="mt-8 max-w-2xl text-lg font-medium leading-8 text-cocoa/75 md:text-xl">
              {PRODUCT_DESCRIPTION} Built on open-source community notes and a
              prerequisite graph powered by real algorithms — topological sort,
              not vibes.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-ink px-7 py-4 text-base font-black text-cream shadow-[0_18px_40px_rgba(20,17,15,0.28)] transition hover:-translate-y-1"
              >
                Start your prep path
                <ArrowRight className="size-5 transition group-hover:translate-x-1" />
              </Link>
              <a
                href={KNOWLEDGE_BASE_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-ink bg-cream px-7 py-4 text-base font-black text-ink transition hover:-translate-y-1 hover:bg-white"
              >
                {KNOWLEDGE_BASE_NAME}
                <ExternalLink className="size-5" />
              </a>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {signals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div
                    key={signal.label}
                    className="rounded-[1.5rem] border border-ink/10 bg-white/55 p-4 shadow-[0_12px_38px_rgba(20,17,15,0.08)] backdrop-blur"
                  >
                    <Icon className="mb-3 size-5 text-grape" />
                    <div className="text-xl font-black">{signal.value}</div>
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">
                      {signal.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            id="map"
            initial={{ opacity: 0, scale: 0.94, rotate: 1.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.85, ease: "easeOut", delay: 0.12 }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -16, 0], rotate: [-7, -4, -7] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-6 top-8 z-20 hidden rounded-[2rem] border-2 border-ink bg-mint p-5 shadow-[10px_10px_0_var(--color-ink)] md:block"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-black">
                <CircleDotDashed className="size-4 animate-spin [animation-duration:5s]" />
                Up next
              </div>
              <div className="text-xs font-bold text-ink/70">Sliding window</div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 14, 0], rotate: [6, 3, 6] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-3 bottom-12 z-20 hidden rounded-[2rem] border-2 border-dashed border-ink bg-coral p-5 shadow-[10px_10px_0_var(--color-ink)] md:block"
            >
              <div className="mb-1 text-sm font-black uppercase tracking-[0.14em]">
                Claim me
              </div>
              <div className="text-xs font-bold text-ink/70">Greedy pattern</div>
            </motion.div>

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 z-0 hidden rounded-full md:block"
            >
              {orbitPatterns.map((pattern, index) => (
                <motion.div
                  key={pattern}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transform: `rotate(${index * 72}deg) translateX(18rem) rotate(-${index * 72}deg)`,
                  }}
                >
                  <span className="inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-ink/15 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] shadow-lg backdrop-blur">
                    <GitBranch className="size-3 text-grape" />
                    {pattern}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            <div className="relative overflow-hidden rounded-[3rem] border-2 border-ink bg-cream p-4 shadow-[18px_18px_0_var(--color-ink)]">
              <div className="rounded-[2.35rem] border border-ink/10 bg-ink p-4 text-cream">
                <div className="mb-4 flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-flame" />
                    <span className="size-3 rounded-full bg-sun" />
                    <span className="size-3 rounded-full bg-teal" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                    Study map
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="space-y-3">
                    {mapNodes.map((node) => (
                      <div
                        key={node.label}
                        className={`rounded-[1.4rem] border p-4 ${
                          node.dashed
                            ? "border-dashed border-coral/60 bg-coral/10"
                            : "border-white/10 bg-white/[0.06]"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-sm font-bold">{node.label}</div>
                          {node.dashed ? (
                            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-coral">
                              wanted
                            </span>
                          ) : (
                            <Layers className="size-4 text-sun" />
                          )}
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: node.w }}
                            transition={{ duration: 1.1, ease: "easeOut" }}
                            className={`h-full rounded-full ${node.tone}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[2rem] bg-cream p-5 text-ink">
                    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-sm">
                      <Map className="size-5 text-grape" />
                      <span className="text-sm font-bold text-ink/70">
                        How do I know when to use sliding window?
                      </span>
                    </div>

                    <div className="space-y-3">
                      <motion.div
                        animate={{
                          boxShadow: [
                            "0 0 0 rgba(255,204,51,0)",
                            "0 0 35px rgba(255,204,51,0.28)",
                            "0 0 0 rgba(255,204,51,0)",
                          ],
                        }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                        className="rounded-[1.5rem] bg-ink p-4 text-cream"
                      >
                        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sun">
                          <MessageSquareQuote className="size-4" />
                          Hint — not the answer
                        </div>
                        <p className="text-sm leading-6 text-white/75">
                          Look for contiguous subarrays or substrings where the
                          constraint is monotonic as you expand or shrink the
                          window.
                        </p>
                      </motion.div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                        <div className="rounded-2xl border border-ink/10 bg-canvas p-3">
                          <div className="text-ink/45">Source</div>
                          sliding-window.md
                        </div>
                        <div className="rounded-2xl border border-ink/10 bg-canvas p-3">
                          <div className="text-ink/45">Contributor</div>
                          @Amanuel-Merara
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10">
          <p className="mb-6 text-center text-xs font-black uppercase tracking-[0.28em] text-ink/45">
            Patterns that show up in big-tech interviews
          </p>
          <PatternMarquee />
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-5 md:grid-cols-3">
            {featureCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                  className="group rounded-[2.25rem] border-2 border-ink bg-cream p-7 shadow-[10px_10px_0_rgba(20,17,15,0.95)] transition hover:-translate-y-2 hover:shadow-[16px_16px_0_rgba(20,17,15,0.95)]"
                >
                  <div className="mb-8 grid size-14 place-items-center rounded-2xl bg-ink text-cream transition group-hover:rotate-6">
                    <Icon className="size-7" />
                  </div>
                  <h3 className="mb-3 font-heading text-2xl font-black tracking-tight">
                    {card.title}
                  </h3>
                  <p className="leading-7 text-cocoa/72">{card.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section
          id="workflow"
          className="mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div>
            <div className="mb-5 inline-flex rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-cream">
              How it works
            </div>
            <h2 className="font-heading text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-7xl">
              From overwhelmed to on-path.
            </h2>
          </div>

          <div className="space-y-4">
            {timeline.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="grid gap-5 rounded-[2rem] border-2 border-ink bg-white/70 p-6 shadow-[8px_8px_0_var(--color-ink)] backdrop-blur md:grid-cols-[5rem_1fr]"
              >
                <div className="font-heading text-4xl font-black text-flame">
                  {item.step}
                </div>
                <div>
                  <h3 className="mb-2 text-2xl font-black">{item.title}</h3>
                  <p className="leading-7 text-cocoa/72">{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

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
                  {PRODUCT_NAME} is the study map and tutor. The{" "}
                  {KNOWLEDGE_BASE_NAME} is the textbook. Contributors ship linked
                  PRs to both — add a note, wire the graph, get credited on the map.
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
                  <div
                    key={point}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4"
                  >
                    <CheckCircle2 className="mb-4 size-6 text-mint" />
                    <div className="font-bold">{point}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

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
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-3 rounded-full bg-ink px-7 py-4 text-base font-black text-cream transition hover:-translate-y-1"
              >
                Create your prep workspace
                <Zap className="size-5" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-ink bg-cream px-7 py-4 text-base font-black text-ink transition hover:-translate-y-1"
              >
                API docs
                <ArrowRight className="size-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 px-6 pb-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t-2 border-ink/10 pt-8 text-sm font-bold text-ink/55 md:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5" />
            {PRODUCT_NAME}, 2026
          </div>
          <div className="flex flex-wrap justify-center gap-5">
            <a
              href={KNOWLEDGE_BASE_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-ink"
            >
              Knowledge base
            </a>
            <Link href="/docs" className="transition hover:text-ink">
              API
            </Link>
            <Link href="/sign-in" className="transition hover:text-ink">
              Sign in
            </Link>
            <Link href="/sign-up" className="transition hover:text-ink">
              Start prepping
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
