"use client";

import { motion } from "framer-motion";
import {
  Binary,
  GitBranch,
  Layers,
  Network,
  Sparkles,
  TreePine,
} from "lucide-react";

const PATTERNS = [
  { label: "Two pointers", icon: GitBranch, tone: "bg-sun" },
  { label: "Sliding window", icon: Layers, tone: "bg-mint" },
  { label: "Binary search", icon: Binary, tone: "bg-coral" },
  { label: "Graphs", icon: Network, tone: "bg-lilac" },
  { label: "Dynamic programming", icon: Sparkles, tone: "bg-violet" },
  { label: "Trees & BST", icon: TreePine, tone: "bg-teal" },
];

function Track() {
  return (
    <div className="flex shrink-0 items-center gap-4 pr-4">
      {PATTERNS.map(({ label, icon: Icon, tone }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-full border-2 border-ink bg-cream px-5 py-3 shadow-[5px_5px_0_var(--color-ink)]"
        >
          <span className={`grid size-8 place-items-center rounded-full border-2 border-ink ${tone}`}>
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-black uppercase tracking-[0.12em] text-ink">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PatternMarquee() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)",
      }}
    >
      <motion.div
        className="flex w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        <Track />
        <Track />
      </motion.div>
    </div>
  );
}
