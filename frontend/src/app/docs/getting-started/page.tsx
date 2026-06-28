import Link from "next/link";
import { DocCallout, DocCard, DocHero, DocSection } from "@/components/docs/DocsShell";
import { LIVE_APP_URL } from "@/components/docs/docs-nav";

export default function GettingStartedPage() {
  return (
    <>
      <DocHero
        eyebrow="Getting started"
        title="Your first 15 minutes"
        description="A quick walkthrough from sign-up to your first pattern on the study map — no jargon, just the steps."
      />

      <DocSection title="1. Create a free account">
        <p>
          Visit{" "}
          <a href={LIVE_APP_URL} className="font-black underline">
            app.algomentor.me
          </a>{" "}
          and sign up with email or Google. There is no paid tier — the platform is free to use,
          with a daily limit on AI tutor questions unless you add your own API key (see{" "}
          <Link href="/docs/tutor" className="font-black underline">
            AI tutor
          </Link>
          ).
        </p>
      </DocSection>

      <DocSection title="2. Open your study map">
        <p>
          After sign-in you land on the <strong>Study Map</strong> — a visual graph of interview
          patterns. Each box is a topic (e.g. Arrays &amp; Strings, Hash Maps, Sliding Window).
          Lines show prerequisites: you unlock a topic after you understand the ones above it.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Locked</strong> — prerequisites not finished yet
          </li>
          <li>
            <strong>Ready</strong> — you can start studying
          </li>
          <li>
            <strong>Studying</strong> — in progress
          </li>
          <li>
            <strong>Done</strong> — mastered
          </li>
        </ul>
      </DocSection>

      <DocSection title="3. Use Focus view">
        <p>
          By default, <strong>Focus view</strong> shows your recommended next topic plus its
          neighbors — so the map is not overwhelming on day one. Toggle to <strong>Full map</strong>{" "}
          when you want to see every pattern at once. Scroll the mouse wheel to zoom; drag the
          background to pan.
        </p>
      </DocSection>

      <DocSection title="4. Open a pattern">
        <p>
          Click any unlocked node. A detail panel opens with:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>A link to the community markdown notes on GitHub</li>
          <li>Practice problems with verification links</li>
          <li>Progress toward mastery (solve N problems to mark the topic done)</li>
          <li>A button to open the AI tutor for that specific pattern</li>
        </ul>
      </DocSection>

      <DocSection title="5. Read, practice, ask">
        <ol className="list-decimal space-y-3 pl-5">
          <li>Read the linked notes — templates and Big-O intuition first.</li>
          <li>Try the suggested LeetCode problems.</li>
          <li>
            If stuck, open the <strong>tutor</strong> and ask for a hint (not the full solution).
          </li>
          <li>
            Mark problems as verified when you solve them. After enough solves, mark the pattern{" "}
            <strong>mastered</strong> to unlock what comes next.
          </li>
        </ol>
      </DocSection>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <DocCard title="Personal notes (optional)">
          In your workspace you can upload a small number of private files (PDF, DOCX, etc.). The
          tutor can search those alongside the community corpus. Great for your own cheat sheets.
        </DocCard>
        <DocCard title="Settings">
          Under Settings you can add your own LLM API key for unlimited tutor questions, manage
          theme, and (for advanced users) create org API keys.
        </DocCard>
      </div>

      <DocCallout title="Stuck?" tone="mint">
        See the <Link href="/docs/faq" className="font-black underline">FAQ</Link> or open an issue on{" "}
        <a
          href="https://github.com/Amaankaa/documind/issues"
          className="font-black underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        .
      </DocCallout>
    </>
  );
}
