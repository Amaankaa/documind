import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PillProps {
  children: ReactNode;
  className?: string;
  tone?: "ink" | "light";
}

export function Pill({ children, className, tone = "ink" }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.22em]",
        tone === "ink"
          ? "bg-ink text-cream"
          : "border border-ink/10 bg-cream/70 text-ink/70",
        className,
      )}
    >
      {children}
    </span>
  );
}
