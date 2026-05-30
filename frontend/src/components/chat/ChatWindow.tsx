"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useChatStore } from "@/store/chat";
import { consumeSSEStream } from "@/lib/stream";
import { conversationsApi } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { Loader2, MessageSquare, Sparkles } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ChatWindowProps {
  kbId: string;
  selectedConvId: string | null;
  onConversationCreated?: (kbId: string, convId: string, title: string) => void;
  onConversationTouched?: (kbId: string, convId: string) => void;
}

export function ChatWindow({
  kbId,
  selectedConvId,
  onConversationCreated,
  onConversationTouched,
}: ChatWindowProps) {
  const { getToken } = useAuth();
  const {
    messages,
    conversationId,
    isLoading,
    addUserMessage,
    startAssistantMessage,
    appendToken,
    finalizeMessage,
    loadConversation,
    setLoading,
    reset,
  } = useChatStore();
  const [inputValue, setInputValue] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  // Refs for scroll, focus, and typewriter
  const scrollRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const charQueueRef = useRef<string>("");
  const isAnimatingRef = useRef(false);
  const streamDoneRef = useRef(false);
  const currentAssistantIdRef = useRef<string>("");
  const drainQueueRef = useRef<() => void>(() => {});
  const shouldFocusInputRef = useRef(false);
  const pendingFinalizeRef = useRef<{ sources: { doc_id: string; filename: string; chunk_index: number; excerpt: string }[]; conversationId: string } | null>(null);

  // Scroll to bottom — instant during streaming, smooth otherwise
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (!shouldFocusInputRef.current || isLoading || historyLoading) return;

    shouldFocusInputRef.current = false;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [isLoading, historyLoading]);

  // When selectedConvId changes: reset the store then optionally hydrate from API
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      reset();
      if (!selectedConvId) return;

      setHistoryLoading(true);
      try {
        const res = await conversationsApi.get(selectedConvId);
        if (!cancelled) loadConversation(res.data.messages, selectedConvId);
      } catch {
        if (!cancelled) reset();
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedConvId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Typewriter: drains charQueueRef one character at a time
  const drainQueue = useCallback(() => {
    if (charQueueRef.current.length === 0) {
      // Queue empty — check if stream is also done
      if (streamDoneRef.current && pendingFinalizeRef.current) {
        const { sources, conversationId: convId } = pendingFinalizeRef.current;
        pendingFinalizeRef.current = null;
        finalizeMessage(currentAssistantIdRef.current, sources, convId);
        setLoading(false);
      }
      isAnimatingRef.current = false;
      return;
    }

    // Emit one character per tick
    const char = charQueueRef.current[0];
    charQueueRef.current = charQueueRef.current.slice(1);
    appendToken(currentAssistantIdRef.current, char);
    scrollToBottom();
    setTimeout(() => drainQueueRef.current(), 15);
  }, [appendToken, finalizeMessage, scrollToBottom, setLoading]);

  useEffect(() => {
    drainQueueRef.current = drainQueue;
  }, [drainQueue]);

  const handleSubmit = async () => {
    const question = inputValue.trim();
    if (!question || isLoading) return;

    setInputValue("");
    addUserMessage(question);
    const assistantId = startAssistantMessage();
    if (conversationId) onConversationTouched?.(kbId, conversationId);
    currentAssistantIdRef.current = assistantId;
    charQueueRef.current = "";
    isAnimatingRef.current = false;
    streamDoneRef.current = false;
    pendingFinalizeRef.current = null;
    shouldFocusInputRef.current = true;
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      await consumeSSEStream(
        `${API_URL}/api/kb/${kbId}/query`,
        { question, session_id: conversationId ?? undefined },
        token,
        // onToken: push to queue, start draining if not already
        (tok) => {
          charQueueRef.current += tok;
          if (!isAnimatingRef.current) {
            isAnimatingRef.current = true;
            drainQueue();
          }
        },
        // onDone: if queue is still draining, defer finalize; otherwise finalize now
        ({ conversation_id, sources }) => {
          streamDoneRef.current = true;
          pendingFinalizeRef.current = { sources, conversationId: conversation_id };
          // Notify parent of new conversation so history sidebar can refresh
          if (!conversationId && conversation_id) {
            onConversationCreated?.(kbId, conversation_id, question);
          }
          if (!isAnimatingRef.current) {
            finalizeMessage(assistantId, sources, conversation_id);
            setLoading(false);
          }
        },
        (err) => {
          charQueueRef.current += "\n\n*Error: " + err.message + "*";
          streamDoneRef.current = true;
          pendingFinalizeRef.current = { sources: [], conversationId: conversationId ?? "" };
          if (!isAnimatingRef.current) {
            isAnimatingRef.current = true;
            drainQueue();
          }
        },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      charQueueRef.current += `\n\n*${msg}*`;
      streamDoneRef.current = true;
      pendingFinalizeRef.current = { sources: [], conversationId: conversationId ?? "" };
      if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        drainQueue();
      }
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col overflow-y-auto px-4 py-8"
      >
        {historyLoading ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#14110f]/40" />
            <p className="text-sm font-semibold text-[#14110f]/45">
              Loading conversation...
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
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
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-end">
            <div className="mx-auto w-full max-w-3xl space-y-6 pb-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          </div>
        )}

      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
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
            disabled={isLoading || historyLoading}
          />
        </div>
      </form>
    </section>
  );
}
