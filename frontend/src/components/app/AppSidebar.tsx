"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  BrainCircuit,
  Clock,
  Files,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Settings,
} from "lucide-react";
import { api, conversationsApi, type ConversationSummary } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface KnowledgeBaseSummary {
  id: string;
  name: string;
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const normalized = iso.replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(iso: string | null | undefined): string {
  const date = parseDate(iso);
  if (!date) return "";

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getCurrentKbId(pathname: string): string | null {
  const match = pathname.match(/^\/kb\/([^/]+)/);
  return match?.[1] ?? null;
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const selectedConversationId = searchParams.get("conversation");
  const currentKbId = getCurrentKbId(pathname);

  const { data: conversations, isLoading, isError } = useQuery({
    queryKey: ["conversations", "all"],
    queryFn: async () => {
      const token = await getToken();
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined;

      try {
        const res = await conversationsApi.listAll(config);
        return res.data;
      } catch {
        const kbRes = await api.get<KnowledgeBaseSummary[]>("/api/kb", config);
        const conversationLists = await Promise.all(
          kbRes.data.map((kb) =>
            conversationsApi
              .list(kb.id, config)
              .then((res) => res.data)
              .catch(() => []),
          ),
        );

        return conversationLists
          .flat()
          .sort(
            (a, b) =>
              (parseDate(b.created_at)?.getTime() ?? 0) -
              (parseDate(a.created_at)?.getTime() ?? 0),
          );
      }
    },
    enabled: isLoaded && !!isSignedIn,
    staleTime: 10_000,
  });

  const newChatHref = currentKbId ? `/kb/${currentKbId}/chat` : "/dashboard";

  return (
    <aside className="flex h-dvh w-72 shrink-0 flex-col overflow-hidden border-r-2 border-[#14110f] bg-[#fffaf1] text-[#14110f]">
      <div className="shrink-0 px-4 py-4">
        <Link href="/dashboard" className="mb-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-[#14110f] text-[#fffaf1] shadow-[5px_5px_0_#ffcc33]">
            <BrainCircuit className="size-5" />
          </div>
          <div>
            <div className="text-sm font-black leading-none">DocuMind</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#14110f]/55">
              Workspace
            </div>
          </div>
        </Link>

        <Link
          href={newChatHref}
          className="flex w-full items-center gap-2 rounded-full border-2 border-[#14110f] bg-[#ffcc33] px-4 py-2 text-sm font-black text-[#14110f] shadow-[4px_4px_0_#14110f] transition hover:-translate-y-0.5"
        >
          <Plus className="size-4 shrink-0" />
          New chat
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-2 px-4 pb-2">
        <Clock className="size-4 text-[#14110f]/70" />
        <span className="text-xs font-black uppercase tracking-[0.18em] text-[#14110f]/70">
          Recent chats
        </span>
      </div>

      <div className="shrink-0 px-3 pb-2">
        <div className="h-0.5 bg-[#14110f]/10" />
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
        {isLoading ? (
          <div className="space-y-1.5 pt-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-2xl bg-[#14110f]/10" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border-2 border-[#14110f] bg-[#ff8a65] p-3 text-xs font-black leading-5 text-[#14110f]">
            Could not load recent chats.
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-2 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-2xl border-2 border-[#14110f] bg-[#a7f3d0]">
              <MessageSquare className="size-4" />
            </div>
            <p className="text-xs font-bold leading-relaxed text-[#14110f]/65">
              Recent conversations will appear here.
            </p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationLink
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === selectedConversationId}
            />
          ))
        )}
      </div>

      <div className="shrink-0 border-t-2 border-[#14110f]/10 px-3 py-3">
        <div className="space-y-1">
          <BottomLink href="/dashboard" active={pathname === "/dashboard"} icon={<LayoutDashboard className="size-4" />}>
            Dashboard
          </BottomLink>
          {currentKbId && (
            <BottomLink href={`/kb/${currentKbId}/docs`} active={pathname.endsWith("/docs")} icon={<Files className="size-4" />}>
              Documents
            </BottomLink>
          )}
          <BottomLink href="/settings" active={pathname === "/settings"} icon={<Settings className="size-4" />}>
            Settings
          </BottomLink>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full bg-[#14110f]/5 p-2">
          <UserButton />
          <span className="truncate text-sm font-bold text-[#14110f]/75">
            Account
          </span>
        </div>
      </div>
    </aside>
  );
}

function ConversationLink({
  conversation,
  active,
}: {
  conversation: ConversationSummary;
  active: boolean;
}) {
  return (
    <Link
      href={`/kb/${conversation.kb_id}/chat?conversation=${conversation.id}`}
      className={`group flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-150 ${
        active
          ? "border-[#14110f] bg-[#ffcc33] text-[#14110f] shadow-[3px_3px_0_#14110f]"
          : "border-transparent text-[#14110f]/80 hover:bg-[#14110f]/5 hover:text-[#14110f]"
      }`}
    >
      <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-[#14110f]/55 group-hover:text-[#14110f]/75" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[12px] font-black leading-snug">
          {conversation.title ?? "Untitled conversation"}
        </p>
        <p className="mt-0.5 text-[10px] font-bold text-[#14110f]/55">
          {formatDate(conversation.created_at)}
        </p>
      </div>
    </Link>
  );
}

function BottomLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition ${
        active
          ? "bg-[#14110f] text-[#fffaf1]"
          : "text-[#14110f]/75 hover:bg-[#14110f]/5 hover:text-[#14110f]"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
