"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ApiKeysPanel from "@/components/app/ApiKeysPanel";
import LlmKeyPanel from "@/components/app/LlmKeyPanel";
import { AlertCircle, Building2, Bot, Key, User } from "lucide-react";

interface OrgData {
  id: string;
  name: string;
  slug: string;
}

export default function SettingsPage() {
  const { user } = useUser();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  useEffect(() => {
    api
      .get<OrgData>("/api/org")
      .then((res) => setOrg(res.data))
      .catch(() => setOrg(null))
      .finally(() => setOrgLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="rounded-[2.5rem] border-2 border-ink bg-mint p-6 shadow-[12px_12px_0_var(--color-ink)] md:p-8"
      >
        <div className="mb-4 inline-flex rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cream">
          Control room
        </div>
        <h1 className="font-heading text-5xl font-black leading-none tracking-[-0.055em] md:text-7xl">
          Settings with receipts.
        </h1>
        <p className="mt-4 max-w-xl font-semibold leading-7 text-ink/65">
          Account identity, workspace metadata, and API keys for your prep
          workspace.
        </p>
      </motion.div>

      <div className="grid gap-5">
        <SettingsCard icon={<User className="size-5" />} label="Account" color="bg-sun">
          <DetailRow label="Name" value={user?.fullName ?? "-"} />
          <DetailRow label="Email" value={user?.primaryEmailAddress?.emailAddress ?? "-"} />
          <DetailRow label="User ID" value={user?.id ?? "-"} mono />
        </SettingsCard>

        <SettingsCard icon={<Building2 className="size-5" />} label="Workspace" color="bg-coral">
          {orgLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-full rounded-xl bg-ink/10" />
              <Skeleton className="h-5 w-2/3 rounded-xl bg-ink/10" />
            </div>
          ) : org ? (
            <>
              <DetailRow label="Name" value={org.name} />
              <DetailRow label="Slug" value={org.slug} mono />
              <DetailRow label="Org ID" value={org.id} mono />
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-ink/45">
                  Role
                </span>
                <Badge className="rounded-full border-2 border-ink bg-mint px-3 py-1 text-xs font-black text-ink">
                  Owner
                </Badge>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-ink/25 p-4 text-sm font-semibold text-ink/55">
              <AlertCircle className="size-4 shrink-0" />
              No organization linked. Complete onboarding first.
            </div>
          )}
        </SettingsCard>

        <SettingsCard icon={<Bot className="size-5" />} label="Tutor API Key" color="bg-mint">
          <LlmKeyPanel />
        </SettingsCard>

        <SettingsCard icon={<Key className="size-5" />} label="API Keys" color="bg-lilac">
          <ApiKeysPanel />
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  icon,
  label,
  color,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-[2rem] border-2 border-ink bg-cream p-5 shadow-[8px_8px_0_var(--color-ink)]"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className={`grid size-11 place-items-center rounded-2xl border-2 border-ink ${color}`}>
          {icon}
        </div>
        <h2 className="font-heading text-2xl font-black">{label}</h2>
      </div>
      <div className="space-y-1">{children}</div>
    </motion.section>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-ink/10 py-3 last:border-0">
      <span className="shrink-0 text-xs font-black uppercase tracking-[0.18em] text-ink/45">
        {label}
      </span>
      <span
        className={`min-w-0 truncate rounded-full bg-ink/5 px-3 py-1 text-right text-sm font-bold text-ink/75 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
