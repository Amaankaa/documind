"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
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
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-[1.5rem] border-2 border-ink bg-coral shadow-[6px_6px_0_var(--color-ink)]">
        <span className="text-xl">!</span>
      </div>
      <h2 className="font-heading text-2xl font-black tracking-tight text-ink">
        Something went wrong
      </h2>
      <Button
        onClick={reset}
        className="h-10 rounded-full bg-ink px-5 text-sm font-black text-cream hover:bg-ink-soft"
      >
        Try again
      </Button>
    </div>
  );
}
