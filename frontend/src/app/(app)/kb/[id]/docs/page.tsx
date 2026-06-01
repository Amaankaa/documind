"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Trash2, UploadCloud, AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
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
  processing: { label: "Processing", color: "bg-[#ffcc33] text-[#14110f] border-[#14110f]", icon: Clock },
  ready: { label: "Ready", color: "bg-[#a7f3d0] text-[#14110f] border-[#14110f]", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-[#ff8a65] text-[#14110f] border-[#14110f]", icon: AlertCircle },
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
      <div className="rounded-[2.5rem] border-2 border-[#14110f] bg-[#ffcc33] p-6 shadow-[12px_12px_0_#14110f]">
        <div className="mb-4 inline-flex rounded-full bg-[#14110f] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#fffaf1]">
          Source vault
        </div>
        <h2 className="font-heading text-5xl font-black leading-none tracking-[-0.055em]">
          Feed the brain.
        </h2>
        <p className="mt-4 max-w-xl font-semibold leading-7 text-[#14110f]/65">
          Upload documents to add them to this knowledge base. DocuMind will
          parse, chunk, embed, and keep the proof ready for chat.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "rounded-[2rem] border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-150 shadow-[8px_8px_0_#14110f]",
          isDragActive
            ? "border-[#14110f] bg-[#a7f3d0]"
            : "border-[#14110f] bg-[#fffaf1] hover:-translate-y-1 hover:bg-white",
          uploading && "opacity-50 pointer-events-none",
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className="mx-auto mb-4 size-12 text-[#14110f]"
        />
        <p className="text-lg font-black">
          {isDragActive ? "Drop files here" : "Drag & drop files, or click to browse"}
        </p>
        <p className="mt-2 text-sm font-semibold text-[#14110f]/55">PDF, DOCX, TXT, CSV - max 50 MB</p>
      </div>

      {uploading && (
        <div className="space-y-2 rounded-2xl border-2 border-[#14110f] bg-[#fffaf1] p-4 shadow-[6px_6px_0_#14110f]">
          <div className="flex items-center gap-2 text-sm font-black text-[#14110f]/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
          <Progress value={uploadProgress} className="h-2 bg-[#14110f]/10 [&>div]:bg-[#ffcc33]" />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-[1.5rem] bg-[#14110f]/10" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-[#14110f] bg-white/60 py-12 text-center text-sm font-semibold text-[#14110f]/55 shadow-[8px_8px_0_#14110f]">
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
                className="rounded-[1.5rem] border-2 border-[#14110f] bg-[#fffaf1] px-4 py-3 shadow-[6px_6px_0_#14110f] transition hover:-translate-y-1"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[#14110f] bg-[#ffcc33]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-black">{doc.filename}</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#14110f]/45">
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
                    className="cursor-pointer rounded-full p-2 text-[#14110f]/45 transition hover:bg-[#14110f]/10 hover:text-[#14110f] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Re-process document"
                    title="Re-process with current settings"
                  >
                    {reingesting === doc.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RefreshCw className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="cursor-pointer rounded-full p-2 text-[#14110f]/45 transition hover:bg-[#ff8a65]/35 hover:text-[#14110f]"
                    aria-label="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Processing progress bar */}
                {doc.status === "processing" && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#14110f]/65">
                        {getProgressStage(doc.progress)}
                      </span>
                      <span className="text-[11px] font-black tabular-nums text-[#14110f]/45">
                        {doc.progress}%
                      </span>
                    </div>
                    <Progress
                      value={doc.progress}
                      className="h-2 bg-[#14110f]/10 [&>div]:bg-[#ffcc33] [&>div]:transition-all [&>div]:duration-700"
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
        <DialogContent className="rounded-[2rem] border-2 border-[#14110f] bg-[#fffaf1] text-[#14110f] shadow-[12px_12px_0_#14110f]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-black">Delete document?</DialogTitle>
            <DialogDescription className="font-medium text-[#14110f]/60">
              <strong className="text-[#14110f]">{deleteTarget?.filename}</strong> and all its indexed chunks will be permanently
              removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="cursor-pointer rounded-full border-2 border-[#14110f] bg-white text-[#14110f] hover:bg-[#14110f]/5">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="cursor-pointer rounded-full border-2 border-[#14110f] bg-[#ff8a65] font-black text-[#14110f] hover:bg-[#ff8a65]/80"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
