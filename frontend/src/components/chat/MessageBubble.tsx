"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Source } from "@/lib/stream";
import type { Message } from "@/lib/types";
import { api, type ChunkContext } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  kbId: string;
  onFeedback?: (messageId: string, rating: "positive" | "negative" | null) => void;
}

export function MessageBubble({ message, kbId, onFeedback }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { user, isLoaded: userLoaded } = useUser();
  const isThinking = !isUser && message.isStreaming && message.content.length === 0;
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(
    message.feedback ?? null,
  );

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (rating: "positive" | "negative") => {
    // Clicking the already-active rating clears it (un-vote).
    const next = feedback === rating ? null : rating;
    setFeedback(next);
    onFeedback?.(message.id, next);
  };

  return (
    <div className={cn("group flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "relative mt-0.5 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink text-xs font-black shadow-[3px_3px_0_var(--color-ink)]",
          isUser
            ? "bg-sun text-ink"
            : "bg-mint text-ink"
        )}
      >
        {isUser ? (
          <UserBubbleAvatar imageUrl={userLoaded ? user?.imageUrl : undefined} initials={userLoaded ? initialsFromUser(user) : undefined} loaded={userLoaded} />
        ) : (
          <AssistantAvatar />
        )}
      </div>

      <div className={cn("max-w-[75%] space-y-2", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-[1.5rem] border-2 border-ink px-5 py-3.5 text-sm font-medium leading-relaxed shadow-[5px_5px_0_rgba(20,17,15,0.2)]",
          isUser
            ? "rounded-tr-sm bg-ink text-cream"
            : "rounded-tl-sm bg-cream text-ink"
          )}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : isThinking ? (
            <ThinkingDots />
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {message.isStreaming && !isThinking && (
            <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>

        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={copy}
              className="cursor-pointer rounded-full p-1.5 text-ink/45 transition-colors duration-150 hover:bg-ink/10 hover:text-ink"
              title="Copy"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => handleFeedback("positive")}
              className={cn(
                "cursor-pointer rounded-full p-1.5 transition-colors duration-150",
                feedback === "positive"
                  ? "bg-mint text-ink"
                  : "text-ink/45 hover:bg-mint/45 hover:text-ink"
              )}
              title="Good response"
              aria-label="Good response"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleFeedback("negative")}
              className={cn(
                "cursor-pointer rounded-full p-1.5 transition-colors duration-150",
                feedback === "negative"
                  ? "bg-coral text-ink"
                  : "text-ink/45 hover:bg-coral/40 hover:text-ink"
              )}
              title="Bad response"
              aria-label="Bad response"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && !message.isStreaming && (
          <div className="w-full">
            <button
              onClick={() => setSourcesOpen((o) => !o)}
              aria-expanded={sourcesOpen}
              className="flex cursor-pointer items-center gap-1.5 text-xs font-black text-ink/50 transition-colors duration-150 hover:text-ink"
            >
              {sourcesOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
            </button>

            {sourcesOpen && (
              <div className="mt-2 space-y-1.5">
                {message.sources.map((src, i) => (
                  <SourceCitation key={i} source={src} kbId={kbId} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function initialsFromUser(
  user:
    | {
        firstName?: string | null;
        lastName?: string | null;
        username?: string | null;
        primaryEmailAddress?: { emailAddress?: string | null } | null;
      }
    | null
    | undefined,
): string {
  if (!user) return "U";
  const first = user.firstName?.trim()?.[0];
  const last = user.lastName?.trim()?.[0];
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  const uname = user.username?.trim();
  if (uname) return uname.slice(0, 2).toUpperCase();
  const emailLocal = user.primaryEmailAddress?.emailAddress?.split("@")[0];
  if (emailLocal && emailLocal.length > 0) return emailLocal.slice(0, 2).toUpperCase();
  return "U";
}

function UserBubbleAvatar({
  imageUrl,
  initials,
  loaded,
}: {
  imageUrl?: string | null;
  initials?: string;
  loaded: boolean;
}) {
  if (!loaded) {
    return <span className="block size-5 rounded-full bg-ink/15 animate-pulse" aria-hidden />;
  }
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt="Your avatar"
        width={36}
        height={36}
        className="size-full object-cover"
        referrerPolicy="no-referrer"
        sizes="36px"
        priority={false}
      />
    );
  }
  return <span>{initials ?? "U"}</span>;
}

function AssistantAvatar() {
  return (
    <>
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--color-cream)_0,var(--color-mint)_38%,var(--color-grass)_100%)]" />
      <BrainCircuit className="relative h-4 w-4" />
      <Sparkles className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-sun p-0.5" />
    </>
  );
}

function ThinkingDots() {
  return (
    <div className="flex h-6 items-center gap-1.5" aria-label="Assistant is thinking">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 animate-bounce rounded-full bg-ink"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function SourceCitation({ source, kbId }: { source: Source; kbId: string }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<ChunkContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadContext = async () => {
    if (context || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.get<ChunkContext>(
        `/api/kb/${kbId}/documents/${source.doc_id}/context`,
        { params: { chunk_index: source.chunk_index, window: 1 } },
      );
      setContext(res.data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) loadContext();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`View source ${source.filename} in context`}
            className="flex w-full cursor-pointer gap-2 rounded-2xl border-2 border-ink bg-sun p-3 text-left text-xs shadow-[4px_4px_0_var(--color-ink)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--color-ink)]"
          />
        }
      >
        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink" />
        <div className="min-w-0">
          <p className="truncate font-black text-ink">{source.filename}</p>
          <p className="mt-0.5 line-clamp-2 font-medium leading-relaxed text-ink/70">{source.excerpt}</p>
        </div>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-hidden rounded-[2rem] border-2 border-ink bg-cream p-0 text-ink shadow-[12px_12px_0_var(--color-ink)] sm:max-w-2xl">
        <DialogHeader className="border-b-2 border-ink/10 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-sun">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate font-heading text-lg font-black">
                {source.filename}
              </DialogTitle>
              <p className="text-xs font-bold text-ink/45">
                Cited passage · chunk {source.chunk_index}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-ink/45">
              <Loader2 className="size-4 animate-spin" />
              Loading passage…
            </div>
          ) : failed ? (
            <div className="rounded-2xl border-2 border-dashed border-ink/25 p-6 text-center text-sm font-semibold text-ink/55">
              Could not load this passage.
            </div>
          ) : (
            context?.chunks.map((chunk) => {
              const isTarget = chunk.chunk_index === context.target_index;
              return (
                <div
                  key={chunk.chunk_index}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-sm leading-relaxed",
                    isTarget
                      ? "border-ink bg-sun/40 font-medium text-ink shadow-[4px_4px_0_var(--color-ink)]"
                      : "border-ink/15 bg-cream font-normal text-ink/55",
                  )}
                >
                  {isTarget && (
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cream">
                      Cited here
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{chunk.content}</p>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
