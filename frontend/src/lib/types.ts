import type { Source } from "@/lib/stream";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
  feedback?: "positive" | "negative" | null;
}
