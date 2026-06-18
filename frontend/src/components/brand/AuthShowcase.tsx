"use client";

import { motion } from "framer-motion";
import { FileText, Quote, ShieldCheck } from "lucide-react";

const floatingDocs = [
  { name: "policy_2026.pdf", tone: "bg-mint", delay: 0 },
  { name: "vendor_master.csv", tone: "bg-coral", delay: 0.4 },
  { name: "handbook.docx", tone: "bg-lilac", delay: 0.8 },
];

export function AuthShowcase() {
  return (
    <div className="relative mt-10 h-64">
      {floatingDocs.map((doc, i) => (
        <motion.div
          key={doc.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -10, 0] }}
          transition={{
            opacity: { duration: 0.5, delay: doc.delay },
            y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: doc.delay },
          }}
          className="absolute flex items-center gap-3 rounded-2xl border-2 border-ink bg-cream px-4 py-3 shadow-[6px_6px_0_var(--color-ink)]"
          style={{ left: `${i * 3}rem`, top: `${i * 4.5}rem` }}
        >
          <span className={`grid size-9 place-items-center rounded-xl border-2 border-ink ${doc.tone}`}>
            <FileText className="size-4" />
          </span>
          <span className="text-sm font-black text-ink">{doc.name}</span>
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
          Four contracts renew before June 30.
        </p>
        <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-mint">
          <ShieldCheck className="size-3.5" />
          Cited from vendor_master.csv
        </div>
      </motion.div>
    </div>
  );
}
