import Link from "next/link";
import { DocCallout, DocCard, DocHero, DocSection } from "@/components/docs/DocsShell";

export default function TutorDocsPage() {
  return (
    <>
      <DocHero
        eyebrow="AI tutor"
        title="Hints with citations — not answer keys"
        description="How the tutor works, what it will and won't do, and how to get more questions per day."
      />

      <DocSection title="What the tutor is">
        <p>
          The tutor is a chat panel scoped to the pattern you are studying. It searches the{" "}
          <strong>community notes</strong> (and optionally your personal uploads) and answers in
          plain language — with links back to the source passages it used.
        </p>
        <p>
          It is designed to be <strong>Socratic</strong>: nudges, analogies, and “what if you tried
          X?” — not a full LeetCode solution pasted into the chat.
        </p>
      </DocSection>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <DocCard title="Good questions">
          <ul className="list-disc space-y-2 pl-4">
            <li>“When should I use two pointers vs sliding window here?”</li>
            <li>“Can you explain the template in simpler terms?”</li>
            <li>“I tried brute force — what’s the bottleneck?”</li>
            <li>“What edge case am I missing?”</li>
          </ul>
        </DocCard>
        <DocCard title="What to avoid">
          <ul className="list-disc space-y-2 pl-4">
            <li>“Give me the full Python solution for problem #42”</li>
            <li>Asking about patterns you have not unlocked yet</li>
            <li>Expecting answers from the open internet — only your corpus is used</li>
          </ul>
        </DocCard>
      </div>

      <DocSection title="Daily limit & bring your own key">
        <p>
          By default, everyone shares a hosted language-model key with a{" "}
          <strong>daily question limit</strong> so the free tier stays sustainable. When you hit the
          limit, you can wait until the next day or add your own API key under{" "}
          <strong>Settings → Tutor API key</strong>.
        </p>
        <p>
          Your key is encrypted before it is stored. With BYOK (bring your own key), tutor usage is
          unlimited for your account.
        </p>
      </DocSection>

      <DocSection title="How answers are built (non-technical)">
        <ol className="list-decimal space-y-3 pl-5">
          <li>Your question is turned into a search query.</li>
          <li>The system finds the most relevant chunks from community notes (and your uploads).</li>
          <li>A language model writes an answer using only those chunks.</li>
          <li>Source cards appear so you can verify every claim.</li>
        </ol>
      </DocSection>

      <DocSection title="Concept-scoped mode">
        <p>
          When you open the tutor from a pattern on the study map, it already knows which topic you
          are on. That keeps hints aligned with the notes and problems for that pattern — less noise,
          more signal.
        </p>
      </DocSection>

      <DocCallout title="Privacy" tone="sun">
        Personal uploads stay in your workspace. Community notes are shared read-only for all
        learners. See the <Link href="/docs/faq" className="font-black underline">FAQ</Link> for
        more on data handling.
      </DocCallout>
    </>
  );
}
