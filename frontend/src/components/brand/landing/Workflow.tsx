"use client";

import { motion } from "framer-motion";

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

export function Workflow() {
  return (
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
            <div className="font-heading text-4xl font-black text-flame">{item.step}</div>
            <div>
              <h3 className="mb-2 text-2xl font-black">{item.title}</h3>
              <p className="leading-7 text-cocoa/72">{item.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
