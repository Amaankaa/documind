"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/brand";
import { DOCS_NAV, LIVE_APP_URL } from "./docs-nav";
import { cn } from "@/lib/utils";

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas text-ink">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-ember/20 blur-[90px]" />
        <div className="absolute right-[-10rem] top-20 h-[36rem] w-[36rem] rounded-full bg-violet/15 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,17,15,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(20,17,15,0.04)_1px,transparent_1px)] bg-[size:38px_38px]" />
      </div>

      <nav className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border border-ink/10 bg-cream/80 px-4 shadow-[0_20px_80px_rgba(20,17,15,0.1)] backdrop-blur-2xl md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-ink text-cream">
              <BrainCircuit className="size-5" />
            </span>
            <span className="font-heading text-lg font-black">{PRODUCT_NAME}</span>
            <span className="hidden text-sm font-black uppercase tracking-[0.18em] text-ink/35 sm:inline">
              Docs
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={LIVE_APP_URL}
              className="hidden rounded-full px-4 py-2 text-sm font-bold text-ink/60 transition hover:text-ink sm:block"
            >
              Open app
            </a>
            <Link
              href="/sign-up"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-black text-cream"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto flex max-w-7xl gap-8 px-4 pt-28 md:px-6">
        <aside className="sticky top-28 hidden h-[calc(100vh-7rem)] w-64 shrink-0 self-start overflow-y-auto pb-8 lg:block">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-ink/45">
            Documentation
          </p>
          <nav className="space-y-1">
            {DOCS_NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 text-sm font-bold transition",
                    active
                      ? "border-ink bg-sun text-ink shadow-[4px_4px_0_var(--color-ink)]"
                      : "border-transparent text-ink/55 hover:border-ink/10 hover:bg-white/60 hover:text-ink",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="mt-8 rounded-2xl border border-ink/10 bg-white/50 p-4 text-xs leading-6 text-ink/55">
            No account needed to read this documentation. Sign up only when you want to use the study
            map and tutor.
          </p>
        </aside>

        <main className="min-w-0 flex-1 pb-24">
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {DOCS_NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-full border-2 px-4 py-2 text-xs font-black",
                    active
                      ? "border-ink bg-sun text-ink"
                      : "border-ink/15 bg-white/60 text-ink/55",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function DocHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="rounded-[2.5rem] border-2 border-ink bg-sun p-8 shadow-[14px_14px_0_var(--color-ink)] md:p-10">
      <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-ink/55">{eyebrow}</p>
      <h1 className="font-heading text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
        {title}
      </h1>
      <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-ink/70">{description}</p>
    </header>
  );
}

export function DocSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="mb-5 font-heading text-2xl font-black tracking-tight md:text-3xl">{title}</h2>
      <div className="space-y-4 text-base font-medium leading-7 text-ink/72">{children}</div>
    </section>
  );
}

export function DocCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border-2 border-ink bg-cream p-6 shadow-[6px_6px_0_var(--color-ink)]">
      <h3 className="mb-3 font-heading text-xl font-black">{title}</h3>
      <div className="text-sm font-medium leading-7 text-ink/68">{children}</div>
    </div>
  );
}

export function DocCallout({
  title,
  children,
  tone = "mint",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "mint" | "sun" | "coral";
}) {
  const bg = tone === "mint" ? "bg-mint" : tone === "sun" ? "bg-sun" : "bg-coral/80";
  return (
    <div className={cn("rounded-[1.5rem] border-2 border-ink p-5 shadow-[4px_4px_0_var(--color-ink)]", bg)}>
      <p className="mb-2 font-black">{title}</p>
      <div className="text-sm font-medium leading-7 text-ink/75">{children}</div>
    </div>
  );
}
