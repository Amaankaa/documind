"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Files, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function KBLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();

  const tabs = [
    { href: `/kb/${id}/chat`, label: "Chat", icon: MessageSquare },
    { href: `/kb/${id}/docs`, label: "Documents", icon: Files },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!pathname.endsWith("/chat") && (
        <div className="flex flex-shrink-0 gap-2 border-b-2 border-ink bg-cream/75 px-5 py-3 backdrop-blur">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-black transition-all duration-200",
                  active
                    ? "border-ink bg-sun text-ink shadow-[4px_4px_0_var(--color-ink)]"
                    : "border-ink/10 bg-cream/60 text-ink/55 hover:border-ink hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
