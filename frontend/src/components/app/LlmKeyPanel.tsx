"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { llmKeyApi, type LlmKeyStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyRound, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function LlmKeyPanel() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<LlmKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const authConfig = useCallback(async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [getToken]);

  const load = useCallback(async () => {
    try {
      const res = await llmKeyApi.status(await authConfig());
      setStatus(res.data);
    } catch {
      toast.error("Failed to load tutor API key status");
    } finally {
      setLoading(false);
    }
  }, [authConfig]);

  useEffect(() => {
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const res = await llmKeyApi.save(apiKey.trim(), await authConfig());
      setStatus(res.data);
      setApiKey("");
      toast.success("Tutor API key saved — unlimited questions enabled");
    } catch {
      toast.error("Could not save API key");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await llmKeyApi.remove(await authConfig());
      await load();
      toast.success("Tutor API key removed");
    } catch {
      toast.error("Could not remove API key");
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-full rounded-xl bg-ink/10" />
        <Skeleton className="h-10 w-full rounded-xl bg-ink/10" />
      </div>
    );
  }

  const limit = status?.questions_daily_limit;
  const used = status?.questions_used_today ?? 0;
  const remaining =
    limit != null ? Math.max(0, limit - used) : null;

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold leading-relaxed text-ink/65">
        The free tutor uses our shared API key —{" "}
        <strong className="text-ink">
          {limit ?? 3} questions per day
        </strong>
        . Add your own LaoZhang or Gemini key for unlimited Socratic tutoring;
        your key is encrypted and only used for chat (not embeddings).
      </p>

      {!status?.configured && remaining !== null && (
        <div className="rounded-2xl border-2 border-ink bg-sun/40 px-4 py-3 text-sm font-bold text-ink">
          <Sparkles className="mb-1 inline h-4 w-4" />{" "}
          {remaining > 0
            ? `${remaining} free question${remaining === 1 ? "" : "s"} left today`
            : "Free daily limit reached — add your key below"}
        </div>
      )}

      {status?.configured ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-mint/50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <KeyRound className="h-4 w-4" />
            <span>
              Your key {status.key_hint} · {status.provider} · unlimited
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={removing}
            onClick={handleRemove}
            className="rounded-full border-2 border-ink font-black"
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="mr-1 h-4 w-4" />
                Remove
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            placeholder="sk-… or Gemini API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="rounded-2xl border-2 border-ink font-mono text-sm"
            autoComplete="off"
          />
          <Button
            type="button"
            disabled={saving || !apiKey.trim()}
            onClick={handleSave}
            className="shrink-0 rounded-full border-2 border-ink bg-ink font-black text-cream shadow-[4px_4px_0_var(--color-sun)]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
          </Button>
        </div>
      )}

      <p className="text-xs font-semibold text-ink/45">
        Uses the same provider as the server (
        <Link href="https://docs.laozhang.ai" className="underline" target="_blank" rel="noreferrer">
          LaoZhang
        </Link>{" "}
        by default). Keys are never shown again after saving.
      </p>
    </div>
  );
}
