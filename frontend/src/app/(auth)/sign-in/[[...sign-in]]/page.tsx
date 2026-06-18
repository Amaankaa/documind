import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { BrainCircuit, Sparkles } from "lucide-react";
import { AuthShowcase } from "@/components/brand/AuthShowcase";

export default function SignInPage() {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10 text-ink">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-0 h-96 w-96 rounded-full bg-ember/25 blur-[90px]" />
        <div className="absolute right-[-8rem] top-24 h-96 w-96 rounded-full bg-violet/20 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,17,15,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(20,17,15,0.055)_1px,transparent_1px)] bg-[size:38px_38px]" />
      </div>
      <div className="relative grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div className="hidden lg:block">
          <Link href="/" className="mb-8 inline-flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-ink text-cream shadow-[6px_6px_0_var(--color-sun)]">
              <BrainCircuit className="size-6" />
            </span>
            <span className="font-heading text-2xl font-black">DocuMind</span>
          </Link>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cream">
            <Sparkles className="size-4" />
            Welcome back
          </div>
          <h1 className="font-heading text-7xl font-black leading-[0.9] tracking-[-0.06em]">
            Reopen the company brain.
          </h1>
          <AuthShowcase />
        </div>
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: "bg-ink hover:bg-ink-soft text-cream rounded-full font-bold",
            card: "rounded-[2rem] shadow-[14px_14px_0_var(--color-ink)] border-2 border-ink bg-cream",
            headerTitle: "text-ink font-black",
            headerSubtitle: "text-ink/60 font-medium",
            socialButtonsBlockButton: "border-2 border-ink/15 hover:bg-ink/5 text-ink rounded-2xl",
            socialButtonsBlockButtonText: "text-ink font-semibold",
            dividerLine: "bg-ink/15",
            dividerText: "text-ink/45 font-bold",
            formFieldLabel: "text-ink/75 font-bold",
            formFieldInput: "bg-white border-2 border-ink/20 text-ink rounded-2xl",
            footerActionText: "text-ink/60",
            footerActionLink: "text-ink hover:text-flame font-bold",
            identityPreviewText: "text-ink",
            identityPreviewEditButton: "text-ink hover:text-flame",
          }
        }}
      />
      </div>
    </div>
  );
}
