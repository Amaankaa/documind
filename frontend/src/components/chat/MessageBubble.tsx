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
import { Message } from "@/store/chat";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { user, isLoaded: userLoaded } = useUser();
  const isThinking = !isUser && message.isStreaming && message.content.length === 0;
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "relative mt-0.5 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#14110f] text-xs font-black shadow-[3px_3px_0_#14110f]",
          isUser
            ? "bg-[#ffcc33] text-[#14110f]"
            : "bg-[#a7f3d0] text-[#14110f]"
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
            "rounded-[1.5rem] border-2 border-[#14110f] px-5 py-3.5 text-sm font-medium leading-relaxed shadow-[5px_5px_0_rgba(20,17,15,0.2)]",
          isUser
            ? "rounded-tr-sm bg-[#14110f] text-[#fffaf1]"
            : "rounded-tl-sm bg-[#fffaf1] text-[#14110f]"
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
              className="cursor-pointer rounded-full p-1.5 text-[#14110f]/45 transition-colors duration-150 hover:bg-[#14110f]/10 hover:text-[#14110f]"
              title="Copy"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button className="cursor-pointer rounded-full p-1.5 text-[#14110f]/45 transition-colors duration-150 hover:bg-[#a7f3d0]/45 hover:text-[#14110f]" title="Good response">
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button className="cursor-pointer rounded-full p-1.5 text-[#14110f]/45 transition-colors duration-150 hover:bg-[#ff8a65]/40 hover:text-[#14110f]" title="Bad response">
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && !message.isStreaming && (
          <div className="w-full">
            <button
              onClick={() => setSourcesOpen((o) => !o)}
              className="flex cursor-pointer items-center gap-1.5 text-xs font-black text-[#14110f]/50 transition-colors duration-150 hover:text-[#14110f]"
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
                  <SourceCitation key={i} source={src} />
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
    return <span className="block size-5 rounded-full bg-[#14110f]/15 animate-pulse" aria-hidden />;
  }
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
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
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#fffaf1_0,#a7f3d0_38%,#22c55e_100%)]" />
      <BrainCircuit className="relative h-4 w-4" />
      <Sparkles className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[#ffcc33] p-0.5" />
    </>
  );
}

function ThinkingDots() {
  return (
    <div className="flex h-6 items-center gap-1.5" aria-label="Assistant is thinking">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 animate-bounce rounded-full bg-[#14110f]"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function SourceCitation({ source }: { source: Source }) {
  return (
    <div className="flex gap-2 rounded-2xl border-2 border-[#14110f] bg-[#ffcc33] p-3 text-xs shadow-[4px_4px_0_#14110f]">
      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#14110f]" />
      <div className="min-w-0">
        <p className="truncate font-black text-[#14110f]">{source.filename}</p>
        <p className="mt-0.5 line-clamp-2 font-medium leading-relaxed text-[#14110f]/70">{source.excerpt}</p>
      </div>
    </div>
  );
}
