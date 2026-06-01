"use client";

import { use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Sparkles } from "lucide-react";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import {
  conversationsApi,
  type ConversationSummary,
  type MessageItem,
} from "@/lib/api";
import { consumeSSEStream } from "@/lib/stream";
import type { Message } from "@/store/chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: kbId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const selectedConvId = searchParams.get("conversation");

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldFocusInputRef = useRef(false);
  const loadedConversationIdRef = useRef<string | null>(null);
  const lastMessageContent = messages[messages.length - 1]?.content;

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

      await consumeSSEStream(
        `${API_URL}/api/kb/${kbId}/query`,
        { question, session_id: conversationId ?? undefined },
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
        ({ conversation_id, sources }) => {
          const createdAt = new Date().toISOString();

          setConversationId(conversation_id);
          loadedConversationIdRef.current = conversation_id;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    isStreaming: false,
                    sources,
                  }
                : message,
            ),
          );
          setIsSending(false);

          syncConversationCache({
            id: conversation_id,
            title: question.slice(0, 80),
            kb_id: kbId,
            created_at: createdAt,
          });

          if (!selectedConvId) {
            router.replace(`/kb/${kbId}/chat?conversation=${conversation_id}`);
          }

          queryClient.invalidateQueries({ queryKey: ["conversations", kbId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", "all"] });
        },
        (error) => {
          showAssistantError(assistantId, error.message);
          setIsSending(false);
        },
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
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5efe3]/60">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8">
        {historyLoading ? (
          <CenteredState>
            <Loader2 className="h-5 w-5 animate-spin text-[#14110f]/40" />
            <p className="text-sm font-semibold text-[#14110f]/45">
              Loading conversation...
            </p>
          </CenteredState>
        ) : messages.length === 0 ? (
          <CenteredState>
            <div className="grid size-16 place-items-center rounded-[1.5rem] border-2 border-[#14110f] bg-[#a7f3d0] shadow-[7px_7px_0_#14110f]">
              <MessageSquare className="size-7" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#14110f] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#fffaf1]">
              <Sparkles className="size-4" />
              Ready for evidence
            </div>
            <p className="font-heading text-4xl font-black tracking-[-0.04em] text-[#14110f]">
              Ask your knowledge base
            </p>
            <p className="max-w-sm text-sm font-semibold leading-6 text-[#14110f]/55">
              Start by asking a question about your uploaded documents. Answers
              will be sourced directly from your content.
            </p>
          </CenteredState>
        ) : (
          <div className="flex min-h-full flex-col justify-end">
            <div className="mx-auto w-full max-w-3xl space-y-6 pb-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
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
        className="flex shrink-0 items-center border-t-2 border-[#14110f] bg-[#fffaf1]/95 px-4 py-4 backdrop-blur"
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
  };
}
