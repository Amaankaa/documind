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

// ── Evaluation harness types ──────────────────────────────────────────────────

export type EvalRunStatus = "pending" | "running" | "completed" | "failed";

export interface EvalRun {
  id: string;
  eval_set_id: string;
  status: EvalRunStatus;
  top_k: number;
  num_cases: number;
  hit_rate: number | null;
  mrr: number | null;
  avg_precision: number | null;
  avg_groundedness: number | null;
  avg_relevance: number | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface EvalCase {
  id: string;
  question: string;
  relevant_doc_ids: string[] | null;
  source_chunk_id: string | null;
  origin: "auto" | "manual";
}

export interface EvalSetSummary {
  id: string;
  kb_id: string;
  name: string;
  created_at: string;
  case_count: number;
  latest_run: EvalRun | null;
}

export interface EvalSetDetail {
  id: string;
  kb_id: string;
  name: string;
  created_at: string;
  cases: EvalCase[];
}

export interface EvalResult {
  id: string;
  question: string;
  generated_answer: string | null;
  retrieved_doc_ids: string[] | null;
  retrieval_hit: boolean;
  reciprocal_rank: number;
  precision_at_k: number;
  groundedness: number | null;
  relevance: number | null;
  judge_rationale: string | null;
}

export const evalApi = {
  listSets: (kbId: string, config?: AxiosRequestConfig) =>
    api.get<EvalSetSummary[]>(`/api/kb/${kbId}/eval-sets`, config),
  createSet: (kbId: string, name: string, config?: AxiosRequestConfig) =>
    api.post<EvalSetDetail>(`/api/kb/${kbId}/eval-sets`, { name }, config),
  getSet: (setId: string, config?: AxiosRequestConfig) =>
    api.get<EvalSetDetail>(`/api/eval-sets/${setId}`, config),
  deleteSet: (setId: string, config?: AxiosRequestConfig) =>
    api.delete(`/api/eval-sets/${setId}`, config),
  generate: (kbId: string, setId: string, numCases: number, config?: AxiosRequestConfig) =>
    api.post<EvalSetDetail>(
      `/api/kb/${kbId}/eval-sets/${setId}/generate`,
      { num_cases: numCases },
      config,
    ),
  addCase: (
    setId: string,
    question: string,
    relevantDocIds: string[],
    config?: AxiosRequestConfig,
  ) =>
    api.post<EvalCase>(
      `/api/eval-sets/${setId}/cases`,
      { question, relevant_doc_ids: relevantDocIds },
      config,
    ),
  deleteCase: (setId: string, caseId: string, config?: AxiosRequestConfig) =>
    api.delete(`/api/eval-sets/${setId}/cases/${caseId}`, config),
  run: (setId: string, config?: AxiosRequestConfig) =>
    api.post<EvalRun>(`/api/eval-sets/${setId}/run`, {}, config),
  getRun: (runId: string, config?: AxiosRequestConfig) =>
    api.get<EvalRun>(`/api/eval-runs/${runId}`, config),
  getResults: (runId: string, config?: AxiosRequestConfig) =>
    api.get<EvalResult[]>(`/api/eval-runs/${runId}/results`, config),
};

// ── AlgoMentor — interview study map ─────────────────────────────────────────

export type ConceptStatus = "locked" | "available" | "in_progress" | "mastered";

export interface GitHubResource {
  title: string;
  url: string;
  raw_url: string | null;
  contributor: string | null;
  kind: "note" | "folder" | "roadmap";
  repo_url: string;
}

export interface PracticeProblem {
  id: string;
  leetcode_slug: string;
  title: string;
  url: string;
  verified: boolean;
}

export interface MasteryProgress {
  required: number;
  verified: number;
  can_master: boolean;
}

export interface ConceptNode {
  id: string;
  slug: string;
  title: string;
  description: string;
  order_index: number;
  is_bonus: boolean;
  contributor_wanted: boolean;
  prerequisites: string[];
  status: ConceptStatus;
  github_resources: GitHubResource[];
  practice_problems: PracticeProblem[];
  mastery: MasteryProgress;
}

export interface ConceptEdge {
  prerequisite_slug: string;
  concept_slug: string;
}

export interface ConceptMapData {
  concepts: ConceptNode[];
  edges: ConceptEdge[];
  next_concept: ConceptNode | null;
  meta: ConceptMapMeta;
}

export interface ConceptMapMeta {
  knowledge_base_repo_url: string;
  knowledge_base_name: string;
  knowledge_base_description: string;
  community_kb_id?: string;
}

export interface Me {
  user_id: string;
  org_id: string;
  org_slug: string;
  community_kb_id: string;
  personal_kb_id: string;
  personal_chunk_count: number;
  personal_chunk_limit: number;
}

export const meApi = {
  get: (config?: AxiosRequestConfig) => api.get<Me>("/api/me", config),
};

export const studyMapApi = {
  getMap: (includeBonus = false, config?: AxiosRequestConfig) =>
    api.get<ConceptMapData>("/api/study-map", {
      ...config,
      params: { include_bonus: includeBonus },
    }),
  getNext: (includeBonus = false, config?: AxiosRequestConfig) =>
    api.get<ConceptNode>("/api/study-map/next", {
      ...config,
      params: { include_bonus: includeBonus },
    }),
  updateProgress: (
    conceptId: string,
    status: "available" | "in_progress" | "mastered",
    config?: AxiosRequestConfig,
  ) =>
    api.patch<ConceptNode>(`/api/study-map/concepts/${conceptId}/progress`, { status }, config),
  verifyProblem: (
    conceptId: string,
    problemId: string,
    proofUrl: string,
    config?: AxiosRequestConfig,
  ) =>
    api.post<PracticeProblem>(
      `/api/study-map/concepts/${conceptId}/problems/${problemId}/verify`,
      { proof_url: proofUrl },
      config,
    ),
  syncCommunity: (config?: AxiosRequestConfig) =>
    api.post<{ created: number; updated: number; skipped: number; errors: string[] }>(
      "/api/community/sync",
      {},
      config,
    ),
};

/** @deprecated Use studyMapApi — kb id is no longer required */
export const conceptsApi = {
  getMap: (kbId: string, includeBonus = false, config?: AxiosRequestConfig) =>
    api.get<ConceptMapData>(`/api/kb/${kbId}/concepts`, {
      ...config,
      params: { include_bonus: includeBonus },
    }),
  getNext: (kbId: string, includeBonus = false, config?: AxiosRequestConfig) =>
    api.get<ConceptNode>(`/api/kb/${kbId}/concepts/next`, {
      ...config,
      params: { include_bonus: includeBonus },
    }),
  updateProgress: (
    kbId: string,
    conceptId: string,
    status: "available" | "in_progress" | "mastered",
    config?: AxiosRequestConfig,
  ) =>
    api.patch<ConceptNode>(
      `/api/kb/${kbId}/concepts/${conceptId}/progress`,
      { status },
      config,
    ),
};
