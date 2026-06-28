"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MessageSquareQuote, Sparkles } from "lucide-react";

/**
 * TutorDemo — a self-typing Socratic exchange that proves the "mentor, not answer
 * key" claim. A student question types in, the tutor "thinks", then a *graduated
 * hint* (never the full solution) types in. Loops through a few exchanges.
 *
 * Honors `prefers-reduced-motion`: renders the first exchange statically.
 */

interface Exchange {
  q: string;
  hint: string;
  source: string;
}

const EXCHANGES: Exchange[] = [
  {
    q: "How do I know when to reach for sliding window?",
    hint: "Look for a contiguous subarray or substring where the constraint changes monotonically as you grow or shrink the window — that monotonicity is the tell.",
    source: "sliding-window.md",
  },
  {
    q: "Is two-sum really a hashing problem?",
    hint: "Ask yourself: do you need to recall whether you've already seen a complement? A hash map gives O(1) lookups for exactly that question.",
    source: "hashing.md",
  },
  {
    q: "When is binary search not about sorted arrays?",
    hint: "Whenever the answer space is monotonic — if “x works ⇒ x+1 works,” you can binary search the answer itself, not the array.",
    source: "binary-search.md",
  },
];

type Phase = "typingQ" | "thinking" | "typingHint" | "hold";

const TYPE_MS = 26;
const THINK_MS = 700;
const HOLD_MS = 2600;

export function TutorDemo() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typingQ");
  const [qText, setQText] = useState("");
  const [hintText, setHintText] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const current = EXCHANGES[index];

  useEffect(() => {
    if (reduce) return; // static render handled below

    const clearAll = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    const typeOut = (
      text: string,
      setter: (v: string) => void,
      done: () => void,
    ) => {
      let i = 0;
      const tick = () => {
        i += 1;
        setter(text.slice(0, i));
        if (i < text.length) {
          timers.current.push(setTimeout(tick, TYPE_MS));
        } else {
          done();
        }
      };
      timers.current.push(setTimeout(tick, TYPE_MS));
    };

    if (phase === "typingQ") {
      // Defer the reset out of the effect body (avoids cascading renders).
      timers.current.push(
        setTimeout(() => {
          setQText("");
          setHintText("");
          typeOut(current.q, setQText, () => setPhase("thinking"));
        }, 0),
      );
    } else if (phase === "thinking") {
      timers.current.push(setTimeout(() => setPhase("typingHint"), THINK_MS));
    } else if (phase === "typingHint") {
      typeOut(current.hint, setHintText, () => setPhase("hold"));
    } else if (phase === "hold") {
      timers.current.push(
        setTimeout(() => {
          setIndex((i) => (i + 1) % EXCHANGES.length);
          setPhase("typingQ");
        }, HOLD_MS),
      );
    }

    return clearAll;
  }, [phase, index, current.q, current.hint, reduce]);

  const showQ = reduce ? current.q : qText;
  const showHint = reduce ? current.hint : hintText;
  const showThinking = !reduce && phase === "thinking";

  return (
    <div className="space-y-3">
      {/* Student question */}
      <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-sm">
        <MessageSquareQuote className="size-5 shrink-0 text-grape" />
        <span className="text-sm font-bold text-ink/75">
          {showQ}
          {!reduce && phase === "typingQ" && <Caret />}
        </span>
      </div>

      {/* Tutor hint */}
      <motion.div
        className="rounded-[1.5rem] bg-ink p-4 text-cream"
        animate={
          reduce
            ? undefined
            : {
                boxShadow: [
                  "0 0 0 rgba(255,204,51,0)",
                  "0 0 35px rgba(255,204,51,0.28)",
                  "0 0 0 rgba(255,204,51,0)",
                ],
              }
        }
        transition={reduce ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sun">
          <Sparkles className="size-4" />
          Hint — not the answer
        </div>
        <p className="min-h-[3.5rem] text-sm leading-6 text-white/80">
          {showThinking ? (
            <ThinkingDots />
          ) : (
            <>
              {showHint}
              {!reduce && phase === "typingHint" && <Caret />}
            </>
          )}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 text-xs font-bold">
        <div className="rounded-2xl border border-ink/10 bg-canvas p-3 text-ink">
          <div className="text-ink/45">Source</div>
          {reduce ? EXCHANGES[0].source : current.source}
        </div>
        <div className="rounded-2xl border border-ink/10 bg-canvas p-3 text-ink">
          <div className="text-ink/45">Mode</div>
          Socratic
        </div>
      </div>
    </div>
  );
}

function Caret() {
  return (
    <motion.span
      className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-current"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    />
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-white/60">
      thinking
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block size-1.5 rounded-full bg-sun"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}
