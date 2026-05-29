import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import type { Source } from "@/lib/stream";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Attach Clerk JWT to every request client-side
if (typeof window !== "undefined") {
  api.interceptors.request.use(async (config) => {
    try {
      // @ts-expect-error – Clerk window global
      const token = await window.Clerk?.session?.getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // unauthenticated
    }
    return config;
  });
}

// ── Conversation types ────────────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  title: string | null;
  kb_id: string;
  created_at: string;
}

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[] | null;
}

export interface ConversationDetail extends ConversationSummary {
  messages: MessageItem[];
}

// ── Conversation API helpers ─────────────────────────────────────────────────

export const conversationsApi = {
  listAll: (config?: AxiosRequestConfig) =>
    api.get<ConversationSummary[]>("/api/conversations", config),
  list: (kbId: string, config?: AxiosRequestConfig) =>
    api.get<ConversationSummary[]>(`/api/kb/${kbId}/conversations`, config),
  get: (convId: string, config?: AxiosRequestConfig) =>
    api.get<ConversationDetail>(`/api/conversations/${convId}`, config),
  delete: (convId: string) =>
    api.delete(`/api/conversations/${convId}`),
};
