"use client";

import { motion } from "framer-motion";
import { FileCode, GitBranch, Quote, ShieldCheck } from "lucide-react";

const floatingNotes = [
  { name: "sliding-window.md", tone: "bg-mint", delay: 0 },
  { name: "binary-search.md", tone: "bg-sun", delay: 0.4 },
  { name: "dynamic-programming.md", tone: "bg-coral", delay: 0.8 },
];

export function AuthShowcase() {
  return (
    <div className="relative mt-10 h-64">
      {floatingNotes.map((note, i) => (
        <motion.div
          key={note.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -10, 0] }}
          transition={{
            opacity: { duration: 0.5, delay: note.delay },
            y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: note.delay },
          }}
          className="absolute flex items-center gap-3 rounded-2xl border-2 border-ink bg-cream px-4 py-3 shadow-[6px_6px_0_var(--color-ink)]"
          style={{ left: `${i * 3}rem`, top: `${i * 4.5}rem` }}
        >
          <span className={`grid size-9 place-items-center rounded-xl border-2 border-ink ${note.tone}`}>
            <FileCode className="size-4" />
          </span>
          <span className="text-sm font-black text-ink">{note.name}</span>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="absolute right-0 top-24 max-w-xs rounded-2xl border-2 border-ink bg-ink p-4 text-cream shadow-[6px_6px_0_var(--color-sun)]"
      >
        <Quote className="mb-2 size-4 text-sun" />
        <p className="text-sm font-bold leading-6 text-white/80">
          Try shrinking the window from the left when the sum exceeds k — what
          invariant are you preserving?
        </p>
        <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-mint">
          <ShieldCheck className="size-3.5" />
          Hint from sliding-window.md
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-white/45">
          <GitBranch className="size-3" />
          Socratic mode — no full solution
        </div>
      </motion.div>
    </div>
  );
}
