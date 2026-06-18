import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BrutalCardProps {
  children: ReactNode;
  className?: string;
  /** Offset shadow size in px. Defaults to 8. */
  shadow?: 6 | 8 | 12 | 16;
  /** Lift + grow shadow on hover. */
  interactive?: boolean;
}

const SHADOW = {
  6: "shadow-[6px_6px_0_var(--color-ink)]",
  8: "shadow-[8px_8px_0_var(--color-ink)]",
  12: "shadow-[12px_12px_0_var(--color-ink)]",
  16: "shadow-[16px_16px_0_var(--color-ink)]",
} as const;

const HOVER_SHADOW = {
  6: "hover:shadow-[10px_10px_0_var(--color-ink)]",
  8: "hover:shadow-[13px_13px_0_var(--color-ink)]",
  12: "hover:shadow-[16px_16px_0_var(--color-ink)]",
  16: "hover:shadow-[20px_20px_0_var(--color-ink)]",
} as const;

export function BrutalCard({
  children,
  className,
  shadow = 8,
  interactive = false,
}: BrutalCardProps) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border-2 border-ink bg-cream",
        SHADOW[shadow],
        interactive &&
          cn("transition duration-200 hover:-translate-y-1.5", HOVER_SHADOW[shadow]),
        className,
      )}
    >
      {children}
    </div>
  );
}
