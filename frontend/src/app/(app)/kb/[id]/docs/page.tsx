"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Trash2, UploadCloud, AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Link2, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Doc {
  id: string;
  filename: string;
  file_type: string;
  status: "processing" | "ready" | "failed";
  progress: number;
  chunk_count: number | null;
  error_message: string | null;
}

const STATUS_MAP = {
  processing: { label: "Processing", color: "bg-sun text-ink border-ink", icon: Clock },
  ready: { label: "Ready", color: "bg-mint text-ink border-ink", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-coral text-ink border-ink", icon: AlertCircle },
};

function getProgressStage(progress: number): string {
  if (progress === 0)  return "Queued…";
  if (progress <= 10)  return "Downloading…";
  if (progress <= 25)  return "Parsing…";
  if (progress <= 35)  return "Splitting…";
  if (progress <= 90)  return "Embedding…";
  if (progress <= 95)  return "Saving…";
  return "Finishing…";
}

export default function DocsPage() {
  const { id: kbId } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);
  const [reingesting, setReingesting] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [ingestingUrl, setIngestingUrl] = useState(false);

  const loadDocs = useCallback(async () => {
    const token = await getToken();
    const res = await api.get<Doc[]>(`/api/kb/${kbId}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDocs(res.data);
    setLoading(false);
  }, [kbId, getToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDocs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDocs]);

  // Poll processing docs every 3s
  useEffect(() => {
    const processing = docs.some((d) => d.status === "processing");
    if (!processing) return;
    const timer = setInterval(loadDocs, 3000);
    return () => clearInterval(timer);
  }, [docs, loadDocs]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      setUploading(true);
      setUploadProgress(0);

      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        const formData = new FormData();
        formData.append("file", file);
        try {
          const token = await getToken();
          await api.post(`/api/kb/${kbId}/documents`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          });
          toast.success(`${file.name} uploaded`);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
        setUploadProgress(Math.round(((i + 1) / accepted.length) * 100));
      }

      setUploading(false);
      setUploadProgress(0);
      loadDocs();
    },
    [kbId, getToken, loadDocs],
  );

  const handleUrlIngest = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

    setIngestingUrl(true);
    try {
      const token = await getToken();
      await api.post(
        `/api/kb/${kbId}/documents/url`,
        { url: normalized },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Page queued for ingestion");
      setUrl("");
      loadDocs();
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Failed to ingest URL");
    } finally {
      setIngestingUrl(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
    },
    maxSize: 50 * 1024 * 1024,
    disabled: uploading,
  });

  const handleReingest = async (doc: Doc) => {
    setReingesting(doc.id);
    try {
      const token = await getToken();
      await api.post(
        `/api/kb/${kbId}/documents/${doc.id}/reingest`,
        undefined,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(`Re-processing ${doc.filename}...`);
      loadDocs();
    } catch {
      toast.error("Failed to re-process document");
    } finally {
      setReingesting(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = await getToken();
      await api.delete(`/api/kb/${kbId}/documents/${deleteTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Document deleted");
      setDeleteTarget(null);
      loadDocs();
    } catch {
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      <div className="rounded-[2.5rem] border-2 border-ink bg-sun p-6 shadow-[12px_12px_0_var(--color-ink)]">
        <div className="mb-4 inline-flex rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cream">
          Source vault
        </div>
        <h2 className="font-heading text-5xl font-black leading-none tracking-[-0.055em]">
          Feed the brain.
        </h2>
        <p className="mt-4 max-w-xl font-semibold leading-7 text-ink/65">
          Upload documents to add them to this knowledge base. DocuMind will
          parse, chunk, embed, and keep the proof ready for chat.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "group relative overflow-hidden rounded-[2rem] border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 shadow-[8px_8px_0_var(--color-ink)]",
          isDragActive
            ? "scale-[1.01] border-ink bg-mint"
            : "border-ink bg-cream hover:-translate-y-1 hover:bg-cream",
          uploading && "opacity-50 pointer-events-none",
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className={cn(
            "mx-auto mb-4 size-12 text-ink transition-transform duration-300",
            isDragActive ? "-translate-y-1 scale-110" : "group-hover:-translate-y-0.5",
          )}
        />
        <p className="text-lg font-black">
          {isDragActive ? "Drop to ingest" : "Drag & drop files, or click to browse"}
        </p>
        <p className="mt-2 text-sm font-semibold text-ink/55">PDF, DOCX, TXT, CSV - max 50 MB</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {["PDF", "DOCX", "TXT", "CSV"].map((ext) => (
            <span
              key={ext}
              className="rounded-full border-2 border-ink bg-sun px-2.5 py-0.5 text-[10px] font-black tracking-wide text-ink"
            >
              {ext}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border-2 border-ink bg-cream p-5 shadow-[8px_8px_0_var(--color-ink)]">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-2xl border-2 border-ink bg-mint">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-black leading-none">Ingest from a web page</p>
            <p className="mt-1 text-xs font-semibold text-ink/55">
              Paste a public URL — we&apos;ll fetch and index the page text.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !ingestingUrl) handleUrlIngest();
              }}
              placeholder="https://example.com/article"
              disabled={ingestingUrl}
              className="h-11 rounded-full border-2 border-ink bg-canvas pl-9 font-semibold text-ink placeholder:text-ink/40 focus-visible:ring-0"
            />
          </div>
          <Button
            onClick={handleUrlIngest}
            disabled={ingestingUrl || !url.trim()}
            className="h-11 shrink-0 cursor-pointer rounded-full border-2 border-ink bg-sun px-5 font-black text-ink shadow-[4px_4px_0_var(--color-ink)] transition hover:-translate-y-0.5 hover:bg-sun-light disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {ingestingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add page"}
          </Button>
        </div>
      </div>

      {uploading && (
        <div className="space-y-2 rounded-2xl border-2 border-ink bg-cream p-4 shadow-[6px_6px_0_var(--color-ink)]">
          <div className="flex items-center gap-2 text-sm font-black text-ink/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
          <Progress value={uploadProgress} className="h-2 bg-ink/10 [&>div]:bg-sun" />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-[1.5rem] bg-ink/10" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-ink bg-cream/60 py-12 text-center text-sm font-semibold text-ink/55 shadow-[8px_8px_0_var(--color-ink)]">
          No documents yet. Upload one above to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const s = STATUS_MAP[doc.status];
            const Icon = s.icon;
            return (
              <div
                key={doc.id}
                className="rounded-[1.5rem] border-2 border-ink bg-cream px-4 py-3 shadow-[6px_6px_0_var(--color-ink)] transition hover:-translate-y-1"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-sun">
                    {doc.file_type === "url" ? <Globe className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-black">{doc.filename}</p>
                    <p className="mt-0.5 text-xs font-semibold text-ink/45">
                      {doc.chunk_count != null ? `${doc.chunk_count} chunks` : doc.file_type.toUpperCase()}
                    </p>
                  </div>
                  <Badge
                    className={cn("flex shrink-0 items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-black", s.color)}
                  >
                    <Icon className="h-3 w-3" />
                    {s.label}
                  </Badge>
                  <button
                    onClick={() => handleReingest(doc)}
                    disabled={reingesting === doc.id || doc.status === "processing"}
                    className="cursor-pointer rounded-full p-2 text-ink/45 transition hover:bg-ink/10 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Re-process document"
                    title="Re-process with current settings"
                  >
                    {reingesting === doc.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RefreshCw className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="cursor-pointer rounded-full p-2 text-ink/45 transition hover:bg-coral/35 hover:text-ink"
                    aria-label="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Failure reason */}
                {doc.status === "failed" && doc.error_message && (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl border-2 border-ink bg-coral/30 px-3 py-2 text-xs font-semibold leading-5 text-ink">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 break-words">{doc.error_message}</span>
                  </div>
                )}

                {/* Processing progress bar */}
                {doc.status === "processing" && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-ink/65">
                        {getProgressStage(doc.progress)}
                      </span>
                      <span className="text-[11px] font-black tabular-nums text-ink/45">
                        {doc.progress}%
                      </span>
                    </div>
                    <Progress
                      value={doc.progress}
                      className="h-2 bg-ink/10 [&>div]:bg-sun [&>div]:transition-all [&>div]:duration-700"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-[2rem] border-2 border-ink bg-cream text-ink shadow-[12px_12px_0_var(--color-ink)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-black">Delete document?</DialogTitle>
            <DialogDescription className="font-medium text-ink/60">
              <strong className="text-ink">{deleteTarget?.filename}</strong> and all its indexed chunks will be permanently
              removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="cursor-pointer rounded-full border-2 border-ink bg-cream text-ink hover:bg-ink/5">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="cursor-pointer rounded-full border-2 border-ink bg-coral font-black text-ink hover:bg-coral/80"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
