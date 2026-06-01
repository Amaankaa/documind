"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, BrainCircuit, Loader2, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSlug = (name: string) => {
    setOrgName(name);
    setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !slug.trim()) return;
    setLoading(true);
    try {
      const token = await getToken();
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      await api.post("/api/org", { name: orgName, slug });
      toast.success("Organization created!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to create organization";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5efe3] px-4 py-10 text-[#14110f]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-0 h-96 w-96 rounded-full bg-[#ff7a59]/25 blur-[90px]" />
        <div className="absolute right-[-8rem] top-24 h-96 w-96 rounded-full bg-[#7c3aed]/20 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,17,15,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(20,17,15,0.055)_1px,transparent_1px)] bg-[size:38px_38px]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="mb-8 inline-flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-[#14110f] text-[#fffaf1] shadow-[6px_6px_0_#ffcc33]">
              <BrainCircuit className="size-6" />
            </div>
            <span className="font-heading text-2xl font-black">DocuMind</span>
          </div>

          <div className="inline-flex rotate-[-1deg] items-center gap-2 rounded-full border border-[#14110f]/10 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.24em]">
            <Sparkles className="size-4 text-[#ff5c35]" />
            First brain setup
          </div>
          <h1 className="mt-6 max-w-3xl font-heading text-6xl font-black leading-[0.9] tracking-[-0.06em] md:text-8xl">
            Name the place where answers live.
          </h1>
          <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-[#14110f]/65">
            Create your organization, then start turning scattered files into
            searchable, cited knowledge.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, rotate: 2, scale: 0.96 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
          className="rounded-[2.5rem] border-2 border-[#14110f] bg-[#fffaf1] p-6 shadow-[16px_16px_0_#14110f] md:p-8"
        >
          <div className="mb-7 rounded-[1.75rem] border-2 border-[#14110f] bg-[#ffcc33] p-5">
            <h2 className="font-heading text-3xl font-black tracking-tight">
              Create your workspace
            </h2>
            <p className="mt-2 font-medium leading-6 text-[#14110f]/65">
              This becomes the home base for your knowledge bases.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.18em] text-[#14110f]/50" htmlFor="org-name">
                Organization name
              </label>
              <Input
                id="org-name"
                placeholder="Acme Corp"
                value={orgName}
                onChange={(e) => handleSlug(e.target.value)}
                required
                className="h-12 rounded-2xl border-2 border-[#14110f]/20 bg-white text-[#14110f] placeholder:text-[#14110f]/30 focus-visible:ring-[#ffcc33]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.18em] text-[#14110f]/50" htmlFor="slug">
                Workspace URL
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="rounded-full bg-[#14110f]/5 px-3 py-2 text-sm font-black text-[#14110f]/55">
                  documind.app/
                </span>
                <Input
                  id="slug"
                  placeholder="acme-corp"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  className="h-12 rounded-2xl border-2 border-[#14110f]/20 bg-white text-[#14110f] placeholder:text-[#14110f]/30 focus-visible:ring-[#ffcc33]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !orgName.trim()}
              className="mt-2 h-12 w-full rounded-full bg-[#14110f] font-black text-[#fffaf1] shadow-[6px_6px_0_rgba(20,17,15,0.25)] transition hover:-translate-y-1 hover:bg-[#2a211e]"
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 size-4" />
              )}
              Get started
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
