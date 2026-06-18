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
      const clerk = (window as unknown as Record<string, unknown>).Clerk as
        | { session?: { getToken?: () => Promise<string | null> } }
        | undefined;
      const token = await clerk?.session?.getToken?.();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // unauthenticated
    }
    return config;
  });
}

// ── API key types ──────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

export const apiKeysApi = {
  list: (config?: AxiosRequestConfig) => api.get<ApiKey[]>("/api/api-keys", config),
  create: (name: string, config?: AxiosRequestConfig) =>
    api.post<ApiKeyCreated>("/api/api-keys", { name }, config),
  revoke: (id: string, config?: AxiosRequestConfig) =>
    api.delete(`/api/api-keys/${id}`, config),
};

// ── Citation context types ────────────────────────────────────────────────────

export interface ChunkContext {
  document_id: string;
  filename: string;
  target_index: number;
  chunks: { chunk_index: number; content: string }[];
}

// ── Analytics types ───────────────────────────────────────────────────────────

export interface Analytics {
  queries_over_time: { date: string; count: number }[];
  top_documents: { filename: string; count: number }[];
  documents_by_status: { status: string; count: number }[];
  feedback: { positive: number; negative: number };
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
  feedback?: "positive" | "negative" | null;
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
  delete: (convId: string, config?: AxiosRequestConfig) =>
    api.delete(`/api/conversations/${convId}`, config),
  deleteAll: (config?: AxiosRequestConfig) =>
    api.delete("/api/conversations", config),
};
