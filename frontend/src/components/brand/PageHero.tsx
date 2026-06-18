"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeIn } from "./motion";
import { Pill } from "./Pill";

interface PageHeroProps {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Background fill for the hero block. Defaults to brand yellow. */
  tone?: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  description,
  tone = "bg-sun",
  badge,
  action,
  className,
}: PageHeroProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className={cn(
        "relative overflow-hidden rounded-[2.5rem] border-2 border-ink p-6 shadow-[12px_12px_0_var(--color-ink)] md:p-8",
        tone,
        className,
      )}
    >
      {badge && (
        <div className="absolute right-6 top-6 hidden rotate-6 rounded-full bg-flame px-4 py-2 text-xs font-black uppercase tracking-[0.18em] md:block">
          {badge}
        </div>
      )}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Pill className="mb-4">{eyebrow}</Pill>
          <h1 className="font-heading text-5xl font-black leading-none tracking-[-0.055em] md:text-7xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-ink/68">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </motion.div>
  );
}
