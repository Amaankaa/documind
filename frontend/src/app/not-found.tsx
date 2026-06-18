import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="grid size-16 place-items-center rounded-[1.5rem] border-2 border-ink bg-sun shadow-[7px_7px_0_var(--color-ink)]">
        <span className="text-2xl font-black">404</span>
      </div>
      <h1 className="font-heading text-4xl font-black tracking-tight text-ink">
        Page not found
      </h1>
      <p className="max-w-sm text-sm font-semibold text-ink/60">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/dashboard">
        <Button className="h-11 rounded-full bg-ink px-6 font-black text-cream hover:bg-ink-soft">
          Back to dashboard
        </Button>
      </Link>
    </div>
  );
}
