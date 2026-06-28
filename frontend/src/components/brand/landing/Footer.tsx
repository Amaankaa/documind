"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { KNOWLEDGE_BASE_REPO, PRODUCT_NAME } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="relative z-10 px-6 pb-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t-2 border-ink/10 pt-8 text-sm font-bold text-ink/55 md:flex-row">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-5" />
          {PRODUCT_NAME}, 2026
        </div>
        <div className="flex flex-wrap justify-center gap-5">
          <a
            href={KNOWLEDGE_BASE_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-ink"
          >
            Knowledge base
          </a>
          <Link href="/docs" className="transition hover:text-ink">
            Documentation
          </Link>
          <Link href="/docs/api" className="transition hover:text-ink">
            API
          </Link>
          <Link href="/sign-in" className="transition hover:text-ink">
            Sign in
          </Link>
          <Link href="/sign-up" className="transition hover:text-ink">
            Start prepping
          </Link>
        </div>
      </div>
    </footer>
  );
}
