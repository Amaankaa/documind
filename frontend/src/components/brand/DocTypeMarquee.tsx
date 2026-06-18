"use client";

import { motion } from "framer-motion";
import {
  FileText,
  FileSpreadsheet,
  FileType,
  FileCode,
  FileImage,
  Presentation,
} from "lucide-react";

const DOC_TYPES = [
  { label: "PDF", icon: FileText, tone: "bg-coral" },
  { label: "DOCX", icon: FileType, tone: "bg-mint" },
  { label: "CSV", icon: FileSpreadsheet, tone: "bg-sun" },
  { label: "TXT", icon: FileCode, tone: "bg-lilac" },
  { label: "MARKDOWN", icon: FileCode, tone: "bg-mint" },
  { label: "SLIDES", icon: Presentation, tone: "bg-coral" },
  { label: "SCANS", icon: FileImage, tone: "bg-sun" },
];

function Track() {
  return (
    <div className="flex shrink-0 items-center gap-4 pr-4">
      {DOC_TYPES.map(({ label, icon: Icon, tone }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-full border-2 border-ink bg-cream px-5 py-3 shadow-[5px_5px_0_var(--color-ink)]"
        >
          <span className={`grid size-8 place-items-center rounded-full border-2 border-ink ${tone}`}>
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-black uppercase tracking-[0.16em] text-ink">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DocTypeMarquee() {
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
