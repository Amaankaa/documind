import { create } from "zustand";
import { Source } from "@/lib/stream";
import type { MessageItem } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

interface ChatStore {
  messages: Message[];
  conversationId: string | null;
  isLoading: boolean;
  addUserMessage: (content: string) => string;
  startAssistantMessage: () => string;
  appendToken: (id: string, token: string) => void;
  finalizeMessage: (id: string, sources: Source[], conversationId: string) => void;
  loadConversation: (msgs: MessageItem[], conversationId: string) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  conversationId: null,
  isLoading: false,

  addUserMessage: (content) => {
    const id = crypto.randomUUID();
    set((s) => ({ messages: [...s.messages, { id, role: "user", content }] }));
    return id;
  },

  startAssistantMessage: () => {
    const id = crypto.randomUUID();
    set((s) => ({
      messages: [...s.messages, { id, role: "assistant", content: "", isStreaming: true }],
    }));
    return id;
  },

  appendToken: (id, token) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + token } : m
      ),
    })),

  finalizeMessage: (id, sources, conversationId) =>
    set((s) => ({
      conversationId,
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, sources, isStreaming: false } : m
      ),
    })),

  loadConversation: (msgs, conversationId) =>
    set({
      conversationId,
      isLoading: false,
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ?? undefined,
      })),
    }),

  setLoading: (v) => set({ isLoading: v }),
  reset: () => set({ messages: [], conversationId: null, isLoading: false }),
}));
