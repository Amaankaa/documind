"use client";

import { motion } from "framer-motion";
import { BookOpen, Map, MessageSquareQuote } from "lucide-react";

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

export function FeatureCards() {
  return (
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
              <h3 className="mb-3 font-heading text-2xl font-black tracking-tight">{card.title}</h3>
              <p className="leading-7 text-cocoa/72">{card.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
