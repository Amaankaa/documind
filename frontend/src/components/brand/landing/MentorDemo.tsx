"use client";

import { motion } from "framer-motion";
import { MessageSquareQuote } from "lucide-react";
import { TutorDemo } from "@/components/brand/TutorDemo";

/**
 * MentorDemo — gives the self-typing Socratic tutor room to breathe. Proves the
 * "mentor, not answer key" claim live instead of just asserting it.
 */
export function MentorDemo() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-cream">
            <MessageSquareQuote className="size-4" />
            See the mentor
          </div>
          <h2 className="font-heading text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
            Hints that build intuition.
          </h2>
          <p className="mt-5 text-lg font-medium leading-8 text-cocoa/72">
            Ask anything about a pattern. The tutor nudges you toward the approach — grounded in the
            community notes, with the source cited — and stops short of the full solution. You still
            do the thinking.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-[3rem] border-2 border-ink bg-cream p-5 shadow-[16px_16px_0_var(--color-sun)] md:p-7"
        >
          <TutorDemo />
        </motion.div>
      </div>
    </section>
  );
}
