"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="grid size-16 place-items-center rounded-[1.5rem] border-2 border-ink bg-coral shadow-[7px_7px_0_var(--color-ink)]">
        <span className="text-2xl">!</span>
      </div>
      <h1 className="font-heading text-4xl font-black tracking-tight text-ink">
        Something went wrong
      </h1>
      <p className="max-w-sm text-sm font-semibold text-ink/60">
        An unexpected error occurred. Please try again.
      </p>
      <Button
        onClick={reset}
        className="h-11 rounded-full bg-ink px-6 font-black text-cream hover:bg-ink-soft"
      >
        Try again
      </Button>
    </div>
  );
}
