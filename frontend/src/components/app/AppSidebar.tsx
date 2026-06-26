"use client";

import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Clock,
  Files,
  FlaskConical,
  LayoutDashboard,
  Loader2,
  Map,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { api, conversationsApi, type ConversationSummary } from "@/lib/api";
import { PRODUCT_NAME } from "@/lib/brand";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SIDEBAR_COLLAPSED_KEY = "algomentor.sidebarCollapsed";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const selectedConversationId = searchParams.get("conversation");
  const currentKbId = getCurrentKbId(pathname);
  const [clearOpen, setClearOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true",
  );

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const { data: me } = useMe();

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
        // Fallback: aggregate per-KB. A new user mid-onboarding has no org yet,
        // so this can also fail — treat that as "no chats", not an error.
        try {
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
        } catch {
          return [] as ConversationSummary[];
        }
      }
    },
    enabled: isLoaded && !!isSignedIn,
    staleTime: 10_000,
  });

  const { data: firstKbId } = useQuery({
    queryKey: ["kb", "first-id"],
    queryFn: async () => {
      const token = await getToken();
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined;
      try {
        const res = await api.get<KnowledgeBaseSummary[]>("/api/kb", config);
        return res.data[0]?.id ?? null;
      } catch {
        return null;
      }
    },
    enabled: isLoaded && !!isSignedIn,
    staleTime: 30_000,
  });

  const communityKbId = me?.community_kb_id ?? null;
  const personalKbId = me?.personal_kb_id ?? currentKbId ?? conversations?.[0]?.kb_id ?? firstKbId ?? null;
  const newChatHref = communityKbId ? `/kb/${communityKbId}/chat` : "/map";
  const mapHref = "/map";
  const workspaceHref = "/dashboard";
  const docsHref = personalKbId ? `/kb/${personalKbId}/docs` : "/dashboard";
  const evalHref = personalKbId ? `/kb/${personalKbId}/eval` : "/dashboard";

  // Drop a deleted conversation out of every cached list so the sidebar updates
  // instantly, without waiting for a refetch.
  const dropFromCaches = (convId: string) => {
    queryClient.setQueriesData<ConversationSummary[]>(
      { queryKey: ["conversations"] },
      (prev) => (Array.isArray(prev) ? prev.filter((c) => c.id !== convId) : prev),
    );
  };

  const deleteOne = useMutation({
    mutationFn: (convId: string) => conversationsApi.delete(convId),
    onSuccess: (_data, convId) => {
      dropFromCaches(convId);
      // If the open conversation was deleted, leave it for a fresh chat.
      if (convId === selectedConversationId && currentKbId) {
        router.push(`/kb/${currentKbId}/chat`);
      }
    },
    onError: () => toast.error("Couldn't delete that chat. Please try again."),
  });

  const clearAll = useMutation({
    mutationFn: () => conversationsApi.deleteAll(),
    onSuccess: () => {
      queryClient.setQueriesData<ConversationSummary[]>(
        { queryKey: ["conversations"] },
        (prev) => (Array.isArray(prev) ? [] : prev),
      );
      setClearOpen(false);
      toast.success("Chat history cleared.");
      if (selectedConversationId && currentKbId) {
        router.push(`/kb/${currentKbId}/chat`);
      }
    },
    onError: () => toast.error("Couldn't clear your history. Please try again."),
  });

  const hasConversations = !!conversations && conversations.length > 0;

  return (
    <aside
      className={`flex h-dvh shrink-0 flex-col overflow-hidden border-r-2 border-ink bg-cream text-ink transition-[width] duration-200 ease-out ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className={collapsed ? "shrink-0 px-3 py-4" : "shrink-0 px-4 py-4"}>
        <div className={collapsed ? "mb-4 flex flex-col items-center gap-3" : "mb-4 flex items-center gap-2"}>
          <Link
            href="/map"
            className={collapsed ? "grid size-11 place-items-center" : "flex min-w-0 flex-1 items-center gap-3"}
            title={PRODUCT_NAME}
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-cream shadow-[5px_5px_0_var(--color-sun)]">
              <BrainCircuit className="size-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-black leading-none">{PRODUCT_NAME}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-ink/55">
                  Workspace
                </div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-cream text-ink shadow-[3px_3px_0_var(--color-ink)] transition hover:-translate-y-0.5 hover:bg-sun/40"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <Link
          href={newChatHref}
          title="New chat"
          className={`flex w-full items-center rounded-full border-2 border-ink bg-sun text-sm font-black text-ink shadow-[4px_4px_0_var(--color-ink)] transition hover:-translate-y-0.5 ${
            collapsed ? "justify-center px-0 py-2.5" : "gap-2 px-4 py-2"
          }`}
        >
          <Plus className="size-4 shrink-0" />
          {collapsed ? <span className="sr-only">New chat</span> : "New chat"}
        </Link>
      </div>

      {!collapsed && (
        <>
          <div className="flex shrink-0 items-center gap-2 px-4 pb-2">
            <Clock className="size-4 text-ink/70" />
            <span className="text-xs font-black uppercase tracking-[0.18em] text-ink/70">
              Recent chats
            </span>
            {hasConversations && (
              <button
                type="button"
                onClick={() => setClearOpen(true)}
                className="ml-auto cursor-pointer rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-ink/45 transition-colors hover:bg-coral/40 hover:text-ink"
                title="Clear all chat history"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="shrink-0 px-3 pb-2">
            <div className="h-0.5 bg-ink/10" />
          </div>

          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
            {isLoading ? (
              <div className="space-y-1.5 pt-1">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-2xl bg-ink/10" />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-2xl border-2 border-ink bg-coral p-3 text-xs font-black leading-5 text-ink">
                Could not load recent chats.
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-2 py-10 text-center">
                <div className="flex size-10 items-center justify-center rounded-2xl border-2 border-ink bg-mint">
                  <MessageSquare className="size-4" />
                </div>
                <p className="text-xs font-bold leading-relaxed text-ink/65">
                  Recent conversations will appear here.
                </p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <ConversationLink
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === selectedConversationId}
                  onDelete={() => deleteOne.mutate(conversation.id)}
                  deleting={deleteOne.isPending && deleteOne.variables === conversation.id}
                />
              ))
            )}
          </div>
        </>
      )}

      {collapsed && <div className="min-h-0 flex-1" />}

      <div className="shrink-0 border-t-2 border-ink/10 px-3 py-3">
        <div className="space-y-1">
          <BottomLink collapsed={collapsed} href={mapHref} active={pathname.endsWith("/map")} icon={<Map className="size-4" />}>
            Study map
          </BottomLink>
          <BottomLink collapsed={collapsed} href={workspaceHref} active={pathname === "/dashboard"} icon={<LayoutDashboard className="size-4" />}>
            My workspace
          </BottomLink>
          <BottomLink collapsed={collapsed} href={docsHref} active={pathname.endsWith("/docs")} icon={<Files className="size-4" />}>
            My documents
          </BottomLink>
          <BottomLink collapsed={collapsed} href={evalHref} active={pathname.endsWith("/eval")} icon={<FlaskConical className="size-4" />}>
            Evaluation
          </BottomLink>
          <BottomLink collapsed={collapsed} href="/analytics" active={pathname === "/analytics"} icon={<BarChart3 className="size-4" />}>
            Analytics
          </BottomLink>
          <BottomLink collapsed={collapsed} href="/settings" active={pathname === "/settings"} icon={<Settings className="size-4" />}>
            Settings
          </BottomLink>
        </div>

        <div className={collapsed ? "mt-3 flex flex-col items-center gap-2" : "mt-3 flex items-center gap-2"}>
          <div className={collapsed ? "flex items-center justify-center rounded-full bg-ink/5 p-2" : "flex flex-1 items-center gap-2 rounded-full bg-ink/5 p-2"}>
            <UserButton />
            <span className={collapsed ? "sr-only" : "truncate text-sm font-bold text-ink/75"}>
              Account
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <Dialog open={clearOpen} onOpenChange={(o) => !clearAll.isPending && setClearOpen(o)}>
        <DialogContent className="rounded-[2rem] border-2 border-ink bg-cream text-ink shadow-[12px_12px_0_var(--color-ink)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-black">
              Clear all chat history?
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-ink/65">
              This permanently deletes every conversation and its messages across
              all your knowledge bases. Your documents are not affected. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <button
                  type="button"
                  disabled={clearAll.isPending}
                  className="cursor-pointer rounded-full border-2 border-ink px-4 py-2 text-sm font-black text-ink transition hover:bg-ink/5 disabled:opacity-50"
                >
                  Cancel
                </button>
              }
            />
            <button
              type="button"
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-ink bg-coral px-4 py-2 text-sm font-black text-ink shadow-[4px_4px_0_var(--color-ink)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {clearAll.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Clearing…
                </>
              ) : (
                "Delete everything"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function ConversationLink({
  conversation,
  active,
  onDelete,
  deleting,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
    // The row is a Link — keep the click from navigating into the chat.
    e.preventDefault();
    e.stopPropagation();
    onDelete();
  };

  return (
    <Link
      href={`/kb/${conversation.kb_id}/chat?conversation=${conversation.id}`}
      className={`group flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-150 ${
        active
          ? "border-ink bg-sun text-ink shadow-[3px_3px_0_var(--color-ink)]"
          : "border-transparent text-ink/80 hover:bg-ink/5 hover:text-ink"
      }`}
    >
      <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-ink/55 group-hover:text-ink/75" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[12px] font-black leading-snug">
          {conversation.title ?? "Untitled conversation"}
        </p>
        <p className="mt-0.5 text-[10px] font-bold text-ink/55">
          {formatDate(conversation.created_at)}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Delete conversation"
        title="Delete conversation"
        className="mt-0.5 shrink-0 cursor-pointer rounded-lg p-1 text-ink/40 opacity-0 transition-all duration-150 hover:bg-coral/50 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
      >
        {deleting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
      </button>
    </Link>
  );
}

function BottomLink({
  href,
  active,
  icon,
  collapsed,
  children,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  collapsed: boolean;
  children: ReactNode;
}) {
  const label = typeof children === "string" ? children : undefined;

  return (
    <Link
      href={href}
      title={label}
      className={`flex items-center rounded-2xl text-sm font-black transition ${
        collapsed ? "justify-center px-0 py-2.5" : "gap-2 px-3 py-2"
      } ${
        active
          ? "bg-ink text-cream"
          : "text-ink/75 hover:bg-ink/5 hover:text-ink"
      }`}
    >
      {icon}
      {collapsed ? <span className="sr-only">{children}</span> : children}
    </Link>
  );
}
