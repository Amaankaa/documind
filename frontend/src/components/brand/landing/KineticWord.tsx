"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const GLYPHS = "abcdefghijklmnopqrstuvwxyz";

/**
 * KineticWord — a scramble/decode reveal. Cycles random glyphs that resolve
 * left-to-right into the target word. Keeps a constant character count so it
 * doesn't shift layout. Renders the plain word under prefers-reduced-motion.
 */
export function KineticWord({
  text,
  className,
  delayMs = 350,
}: {
  text: string;
  className?: string;
  delayMs?: number;
}) {
  const reduce = useReducedMotion();
  // Init "" (consistent server/client) so the scramble starts from blank without
  // flashing the answer; reduced-motion renders the plain word via the JSX below.
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (reduce) return;

    let frame = 0;
    let raf = 0;
    const total = text.length;

    const tick = () => {
      frame += 1;
      const revealed = Math.floor(frame / 2.2);
      let out = "";
      for (let i = 0; i < total; i++) {
        if (text[i] === " ") out += " ";
        else if (i < revealed) out += text[i];
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setDisplay(out);
      if (revealed <= total) raf = requestAnimationFrame(tick);
      else setDisplay(text);
    };

    // Defer first state update out of the effect body (avoids cascading renders).
    const timeout = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [text, reduce, delayMs]);

  return <span className={className}>{reduce ? text : display ||" "}</span>;
}
