"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/brand";

const navItems = [
  { href: "#why", label: "Why us" },
  { href: "#map", label: "Study map" },
  { href: "#workflow", label: "How it works" },
  { href: "/docs", label: "Docs" },
  { href: "#opensource", label: "Open source" },
];

export function LandingNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border border-ink/10 bg-cream/75 px-4 shadow-[0_20px_80px_rgba(20,17,15,0.12)] backdrop-blur-2xl md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-ink text-cream shadow-[0_8px_24px_rgba(20,17,15,0.25)]">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">{PRODUCT_NAME}</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm font-semibold text-ink/60 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink/70 transition hover:bg-ink/5 hover:text-ink sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cream shadow-[0_12px_34px_rgba(20,17,15,0.25)] transition hover:-translate-y-0.5 hover:bg-ink-soft"
          >
            Start prepping
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
