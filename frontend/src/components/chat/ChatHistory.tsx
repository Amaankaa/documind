"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserButton } from "@clerk/nextjs";
import {
  BrainCircuit,
  Clock,
  Files,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { conversationsApi, type ConversationSummary } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ChatHistoryProps {
  kbId: string;
  selectedConvId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  // Truncate Python microseconds (6 digits) → JS milliseconds (3 digits)
  const normalized = iso.replace(/(\.\d{3})\d+/, "$1");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(iso: string | null | undefined): string {
  const date = parseDate(iso);
  if (!date) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatHistory({
  kbId,
  selectedConvId,
  onSelect,
  onNewChat,
}: ChatHistoryProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", kbId],
    queryFn: async () => {
      const res = await conversationsApi.list(kbId);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (convId: string) => conversationsApi.delete(convId),
    onSuccess: (_data, convId) => {
      queryClient.setQueryData<ConversationSummary[]>(
        ["conversations", kbId],
        (prev) => prev?.filter((c) => c.id !== convId) ?? []
      );
      if (selectedConvId === convId) onNewChat();
      toast.success("Conversation deleted");
    },
    onError: () => toast.error("Failed to delete conversation"),
    onSettled: () => setDeletingId(null),
  });

  const handleDelete = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setDeletingId(convId);
    deleteMutation.mutate(convId);
  };

  return (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col overflow-hidden border-r-2 border-[#14110f] bg-[#fffaf1]">
      <div className="flex-shrink-0 px-4 py-4">
        <Link href="/dashboard" className="mb-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-[#14110f] text-[#fffaf1] shadow-[5px_5px_0_#ffcc33]">
            <BrainCircuit className="size-5" />
          </div>
          <div>
            <div className="text-sm font-black leading-none">DocuMind</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#14110f]/55">
              Knowledge chat
            </div>
          </div>
        </Link>

        <button
          onClick={onNewChat}
          className={cn(
            "flex w-full items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-black transition-all duration-150",
            selectedConvId === null
              ? "border-[#14110f] bg-[#ffcc33] text-[#14110f] shadow-[4px_4px_0_#14110f]"
              : "border-[#14110f]/25 bg-white/80 text-[#14110f]/80 hover:border-[#14110f] hover:text-[#14110f]"
          )}
        >
          <Plus className="h-3.5 w-3.5 flex-shrink-0" />
          New chat
        </button>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 px-4 pb-2">
        <Clock className="h-4 w-4 text-[#14110f]/70" />
        <span className="text-xs font-black uppercase tracking-[0.18em] text-[#14110f]/70">
          Recent chats
        </span>
      </div>

      <div className="flex-shrink-0 px-3 pb-2">
        <div className="h-0.5 bg-[#14110f]/10" />
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-1">
        {isLoading ? (
          <div className="space-y-1.5 pt-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-2xl bg-[#14110f]/10" />
            ))}
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-2 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-2xl border-2 border-[#14110f] bg-[#a7f3d0]">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs font-bold leading-relaxed text-[#14110f]/65">
              Your conversations will appear here
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={conv.id === selectedConvId}
              isDeleting={deletingId === conv.id}
              onSelect={() => onSelect(conv.id)}
              onDelete={(e) => handleDelete(e, conv.id)}
            />
          ))
        )}
      </div>

      <div className="flex-shrink-0 border-t-2 border-[#14110f]/10 px-3 py-3">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-[#14110f]/75 transition hover:bg-[#14110f]/5 hover:text-[#14110f]"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
          <Link
            href={`/kb/${kbId}/docs`}
            className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-[#14110f]/75 transition hover:bg-[#14110f]/5 hover:text-[#14110f]"
          >
            <Files className="size-4" />
            Documents
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-[#14110f]/75 transition hover:bg-[#14110f]/5 hover:text-[#14110f]"
          >
            <Settings className="size-4" />
            Settings
          </Link>
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

interface ConversationItemProps {
  conv: ConversationSummary;
  isActive: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function ConversationItem({ conv, isActive, isDeleting, onSelect, onDelete }: ConversationItemProps) {
  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-2.5 rounded-2xl border-2 px-3 py-3 text-left transition-all duration-150",
        isActive
          ? "border-[#14110f] bg-[#ffcc33] text-[#14110f] shadow-[4px_4px_0_#14110f]"
          : "border-transparent text-[#14110f]/80 hover:bg-[#14110f]/5 hover:text-[#14110f]",
        isDeleting && "opacity-50 pointer-events-none"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={isDeleting}
        className="flex min-w-0 flex-1 items-start gap-2.5 text-left disabled:cursor-not-allowed"
      >
        <MessageSquare
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 mt-0.5",
            isActive ? "text-[#14110f]" : "text-[#14110f]/50 group-hover:text-[#14110f]/75"
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-black leading-snug">
            {conv.title ?? "Untitled conversation"}
          </p>
          <p className="mt-1 text-[11px] font-bold text-[#14110f]/55">{formatDate(conv.created_at)}</p>
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className={cn(
          "flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100",
          "text-[#14110f]/55 hover:text-[#ff5c35]"
        )}
        title="Delete conversation"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
