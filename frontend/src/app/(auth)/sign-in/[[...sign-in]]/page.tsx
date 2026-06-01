import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { BrainCircuit, Sparkles } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center overflow-hidden bg-[#f5efe3] px-4 py-10 text-[#14110f]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-0 h-96 w-96 rounded-full bg-[#ff7a59]/25 blur-[90px]" />
        <div className="absolute right-[-8rem] top-24 h-96 w-96 rounded-full bg-[#7c3aed]/20 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,17,15,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(20,17,15,0.055)_1px,transparent_1px)] bg-[size:38px_38px]" />
      </div>
      <div className="relative grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div className="hidden lg:block">
          <Link href="/" className="mb-8 inline-flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-[#14110f] text-[#fffaf1] shadow-[6px_6px_0_#ffcc33]">
              <BrainCircuit className="size-6" />
            </span>
            <span className="font-heading text-2xl font-black">DocuMind</span>
          </Link>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#14110f] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#fffaf1]">
            <Sparkles className="size-4" />
            Welcome back
          </div>
          <h1 className="font-heading text-7xl font-black leading-[0.9] tracking-[-0.06em]">
            Reopen the company brain.
          </h1>
        </div>
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: "bg-[#14110f] hover:bg-[#2a211e] text-[#fffaf1] rounded-full font-bold",
            card: "rounded-[2rem] shadow-[14px_14px_0_#14110f] border-2 border-[#14110f] bg-[#fffaf1]",
            headerTitle: "text-[#14110f] font-black",
            headerSubtitle: "text-[#14110f]/60 font-medium",
            socialButtonsBlockButton: "border-2 border-[#14110f]/15 hover:bg-[#14110f]/5 text-[#14110f] rounded-2xl",
            socialButtonsBlockButtonText: "text-[#14110f] font-semibold",
            dividerLine: "bg-[#14110f]/15",
            dividerText: "text-[#14110f]/45 font-bold",
            formFieldLabel: "text-[#14110f]/75 font-bold",
            formFieldInput: "bg-white border-2 border-[#14110f]/20 text-[#14110f] rounded-2xl",
            footerActionText: "text-[#14110f]/60",
            footerActionLink: "text-[#14110f] hover:text-[#ff5c35] font-bold",
            identityPreviewText: "text-[#14110f]",
            identityPreviewEditButton: "text-[#14110f] hover:text-[#ff5c35]",
          }
        }}
      />
      </div>
    </div>
  );
}
