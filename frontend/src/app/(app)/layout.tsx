"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatRoute = /^\/kb\/[^/]+\/chat$/.test(pathname);
  const contentRef = useRef<HTMLDivElement>(null);

  // Prevent the overflow-hidden wrapper from ever accumulating scrollTop.
  // Browsers can still shift scrollTop via scrollIntoView, focus, or content
  // reflows even on overflow-hidden containers. The scroll listener
  // immediately resets any accidental offset.
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const reset = () => { node.scrollTop = 0; };
    reset();
    node.addEventListener("scroll", reset, { passive: true });
    return () => node.removeEventListener("scroll", reset);
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#f5efe3] text-[#14110f]">
      <AppSidebar />
      <div
        ref={contentRef}
        className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#7c3aed]/20 blur-[90px]" />
          <div className="absolute bottom-[-8rem] left-1/4 h-96 w-96 rounded-full bg-[#19c6a3]/20 blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(20,17,15,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(20,17,15,0.045)_1px,transparent_1px)] bg-[size:34px_34px]" />
        </div>
        <main
          className={`relative z-10 min-h-0 flex-1 ${
            isChatRoute ? "overflow-hidden" : "overflow-auto"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
