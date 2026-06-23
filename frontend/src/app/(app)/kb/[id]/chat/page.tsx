"use client";

import { Suspense, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import {
  api,
  conversationsApi,
  type ConversationSummary,
  type MessageItem,
} from "@/lib/api";
import { consumeSSEStream } from "@/lib/stream";
import type { Message } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SUGGESTED_PROMPTS = [
  "When should I use sliding window vs two pointers?",
  "Walk me through the approach — don't give the full solution",
  "What's the time complexity of this pattern?",
  "Which LeetCode problems should I practice next?",
];

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: kbId } = use(params);
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatPageInner kbId={kbId} />
    </Suspense>
  );
}

function ChatLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-ink/40" />
    </div>
  );
}

function ChatPageInner({ kbId }: { kbId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const selectedConvId = searchParams.get("conversation");
  const conceptSlug = searchParams.get("concept");

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldFocusInputRef = useRef(false);
  const loadedConversationIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageContent = messages[messages.length - 1]?.content;

  const handleFeedback = useCallback(
    async (messageId: string, rating: "positive" | "negative" | null) => {
      try {
        if (rating === null) {
          await api.delete(`/api/kb/${kbId}/feedback/${messageId}`);
        } else {
          await api.post(`/api/kb/${kbId}/feedback`, { message_id: messageId, rating });
          toast.success("Thanks for the feedback!");
        }
      } catch {
        toast.error("Couldn't save your feedback — please try again.");
      }
    },
    [kbId],
  );

  const syncConversationCache = useCallback(
    (conversation: ConversationSummary) => {
      const touch = (existing: ConversationSummary) => ({
        ...existing,
        created_at: conversation.created_at,
        title: existing.title ?? conversation.title,
      });

      for (const key of [
        ["conversations", kbId],
        ["conversations", "all"],
      ]) {
        queryClient.setQueryData<ConversationSummary[]>(key, (prev) => {
          const existing = prev?.find((item) => item.id === conversation.id);
          if (existing) {
            return [touch(existing), ...(prev ?? []).filter((item) => item.id !== conversation.id)];
          }

          return [conversation, ...(prev ?? [])];
        });
      }
    },
    [kbId, queryClient],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastMessageContent]);

  const focusInput = useCallback(() => {
    const tryFocus = (attempt: number) => {
      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (!input) return;
        if (input.disabled) {
          if (attempt < 5) window.setTimeout(() => tryFocus(attempt + 1), 40);
          return;
        }

        input.focus({ preventScroll: true });
      });
    };

    tryFocus(0);
  }, []);

  useEffect(() => {
    if (!shouldFocusInputRef.current || isSending || historyLoading) return;

    shouldFocusInputRef.current = false;
    focusInput();
  }, [focusInput, historyLoading, isSending]);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedConversation() {
      if (!selectedConvId) {
        loadedConversationIdRef.current = null;
        setMessages([]);
        setConversationId(null);
        setHistoryLoading(false);
        return;
      }

      if (!isLoaded) {
        setHistoryLoading(true);
        return;
      }

      if (!isSignedIn) {
        loadedConversationIdRef.current = null;
        setMessages([]);
        setConversationId(null);
        setHistoryLoading(false);
        return;
      }

      if (selectedConvId === loadedConversationIdRef.current) {
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");

        const res = await conversationsApi.get(selectedConvId, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;

        setConversationId(res.data.id);
        loadedConversationIdRef.current = res.data.id;
        setMessages(res.data.messages.map(toChatMessage));
      } catch {
        if (cancelled) return;
        loadedConversationIdRef.current = null;
        setConversationId(null);
        setMessages([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    loadSelectedConversation();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, selectedConvId]);

  const handleSubmit = async () => {
    const question = inputValue.trim();
    if (!question || isSending || historyLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setInputValue("");
    setMessages((current) => [...current, userMessage, assistantMessage]);
    shouldFocusInputRef.current = true;
    setIsSending(true);

    if (conversationId) {
      syncConversationCache({
        id: conversationId,
        title: question.slice(0, 80),
        kb_id: kbId,
        created_at: new Date().toISOString(),
      });
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      await consumeSSEStream(
        `${API_URL}/api/kb/${kbId}/query`,
        { question, session_id: conversationId ?? undefined, concept_slug: conceptSlug ?? undefined },
        token,
        (tokenChunk) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + tokenChunk }
                : message,
            ),
          );
        },
        ({ conversation_id, message_id, sources }) => {
          const createdAt = new Date().toISOString();

          setConversationId(conversation_id);
          loadedConversationIdRef.current = conversation_id;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    // Adopt the real DB id so feedback (like/dislike) targets
                    // the persisted message rather than a client-only UUID.
                    id: message_id ?? message.id,
                    isStreaming: false,
                    sources,
                  }
                : message,
            ),
          );
          setIsSending(false);
          abortControllerRef.current = null;

          syncConversationCache({
            id: conversation_id,
            title: question.slice(0, 80),
            kb_id: kbId,
            created_at: createdAt,
          });

          if (!selectedConvId) {
            const conceptQuery = conceptSlug ? `&concept=${encodeURIComponent(conceptSlug)}` : "";
            router.replace(`/kb/${kbId}/chat?conversation=${conversation_id}${conceptQuery}`);
          }

          queryClient.invalidateQueries({ queryKey: ["conversations", kbId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", "all"] });
        },
        (error) => {
          if (error.name === "AbortError") return;
          showAssistantError(assistantId, error.message);
          setIsSending(false);
          abortControllerRef.current = null;
        },
        controller.signal,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      showAssistantError(assistantId, message);
      setIsSending(false);
    }
  };

  const showAssistantError = (assistantId: string, errorMessage: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              content: `${message.content}\n\n*${errorMessage}*`,
              isStreaming: false,
            }
          : message,
      ),
    );
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas/60">
      {conceptSlug ? (
        <div className="border-b-2 border-ink bg-mint px-4 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-ink">
          Socratic tutor · {conceptSlug.replace(/-/g, " ")}
        </div>
      ) : null}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8">
        {historyLoading ? (
          <CenteredState>
            <Loader2 className="h-5 w-5 animate-spin text-ink/40" />
            <p className="text-sm font-semibold text-ink/45">
              Loading conversation...
            </p>
          </CenteredState>
        ) : messages.length === 0 ? (
          <CenteredState>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="grid size-16 place-items-center rounded-[1.5rem] border-2 border-ink bg-mint shadow-[7px_7px_0_var(--color-ink)]"
            >
              <MessageSquare className="size-7" />
            </motion.div>
            <div className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cream">
              <Sparkles className="size-4" />
              Ready to learn
            </div>
            <p className="font-heading text-4xl font-black tracking-[-0.04em] text-ink">
              Ask your mentor
            </p>
            <p className="max-w-sm text-sm font-semibold leading-6 text-ink/55">
              Ask for hints on a pattern or problem. Answers are grounded in your
              notes with citations — no full solutions unless you ask.
            </p>
            <div className="mt-2 flex max-w-lg flex-wrap items-center justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <motion.button
                  key={prompt}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
                  onClick={() => {
                    setInputValue(prompt);
                    shouldFocusInputRef.current = true;
                    focusInput();
                  }}
                  className="rounded-full border-2 border-ink bg-cream px-4 py-2 text-xs font-black text-ink shadow-[3px_3px_0_var(--color-ink)] transition hover:-translate-y-0.5 hover:bg-sun"
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </CenteredState>
        ) : (
          <div className="flex min-h-full flex-col justify-end">
            <div className="mx-auto w-full max-w-3xl space-y-6 pb-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} kbId={kbId} onFeedback={handleFeedback} />
              ))}
            </div>
          </div>
        )}

      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className="flex shrink-0 items-center border-t-2 border-ink bg-cream/95 px-4 py-4 backdrop-blur"
      >
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            ref={inputRef}
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            disabled={isSending || historyLoading}
          />
        </div>
      </form>
    </section>
  );
}

function CenteredState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
      {children}
    </div>
  );
}

function toChatMessage(message: MessageItem): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    sources: message.sources ?? undefined,
    feedback: message.feedback ?? null,
  };
}
