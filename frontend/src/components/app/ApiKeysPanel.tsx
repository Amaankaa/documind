"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiKeysApi, type ApiKey, type ApiKeyCreated } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ApiKeysPanel() {
  const { getToken } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  const authConfig = useCallback(async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [getToken]);

  const load = useCallback(async () => {
    try {
      const res = await apiKeysApi.list(await authConfig());
      setKeys(res.data);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [authConfig]);

  useEffect(() => {
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await apiKeysApi.create(name, await authConfig());
      setCreatedKey(res.data);
      setNewName("");
      setCopied(false);
      load();
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    toast.success("Key copied to clipboard");
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(revokeTarget.id);
    try {
      await apiKeysApi.revoke(revokeTarget.id, await authConfig());
      toast.success("API key revoked");
      setRevokeTarget(null);
      load();
    } catch {
      toast.error("Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold leading-6 text-ink/60">
        Create keys to query your knowledge bases from code. Pass the key as an{" "}
        <code className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-xs text-ink">X-API-Key</code>{" "}
        header. Keys are shown once at creation — store them somewhere safe.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !creating) handleCreate();
          }}
          placeholder="Key name (e.g. Production server)"
          disabled={creating}
          className="h-11 rounded-full border-2 border-ink bg-canvas font-semibold text-ink placeholder:text-ink/40 focus-visible:ring-0"
        />
        <Button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="h-11 shrink-0 cursor-pointer gap-1.5 rounded-full border-2 border-ink bg-sun px-5 font-black text-ink shadow-[4px_4px_0_var(--color-ink)] transition hover:-translate-y-0.5 hover:bg-sun-light disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New key
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-2xl bg-ink/10" />
          <Skeleton className="h-14 w-2/3 rounded-2xl bg-ink/10" />
        </div>
      ) : keys.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-ink/25 bg-cream/50 p-5 text-sm font-semibold text-ink/55">
          <KeyRound className="size-5 shrink-0 text-ink" />
          No API keys yet. Create one above to start querying programmatically.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-cream px-4 py-3 shadow-[4px_4px_0_var(--color-ink)]"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-lilac">
                <KeyRound className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{k.name}</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-ink/45">
                  {k.prefix}••••••••
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">
                  Last used
                </p>
                <p className="text-xs font-bold text-ink/65">{formatDate(k.last_used_at)}</p>
              </div>
              <button
                onClick={() => setRevokeTarget(k)}
                disabled={revoking === k.id}
                className="shrink-0 cursor-pointer rounded-full p-2 text-ink/45 transition hover:bg-coral/35 hover:text-ink disabled:opacity-40"
                aria-label="Revoke API key"
                title="Revoke key"
              >
                {revoking === k.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* One-time reveal of a newly created key */}
      <Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent className="rounded-[2rem] border-2 border-ink bg-cream text-ink shadow-[12px_12px_0_var(--color-ink)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-black">Your new API key</DialogTitle>
            <DialogDescription className="font-medium text-ink/60">
              Copy it now — for security, you won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-2xl border-2 border-ink bg-canvas p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-sm font-bold text-ink">
              {createdKey?.key}
            </code>
            <Button
              onClick={handleCopy}
              className="h-9 shrink-0 cursor-pointer gap-1.5 rounded-full border-2 border-ink bg-sun px-3 font-black text-ink hover:bg-sun-light"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="flex items-start gap-2 rounded-xl border-2 border-dashed border-ink/25 bg-sun/20 p-3 text-xs font-semibold text-ink/65">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-ink" />
            Store this key in a secret manager or environment variable. Anyone with it can query
            your knowledge bases.
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <DialogContent className="rounded-[2rem] border-2 border-ink bg-cream text-ink shadow-[12px_12px_0_var(--color-ink)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-black">Revoke key?</DialogTitle>
            <DialogDescription className="font-medium text-ink/60">
              <strong className="text-ink">{revokeTarget?.name}</strong> will stop working
              immediately. Any integrations using it will lose access. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              className="cursor-pointer rounded-full border-2 border-ink bg-cream text-ink hover:bg-ink/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevoke}
              className="cursor-pointer rounded-full border-2 border-ink bg-coral font-black text-ink hover:bg-coral/80"
            >
              Revoke
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
