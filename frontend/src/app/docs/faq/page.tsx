import Link from "next/link";
import { DocCallout, DocHero } from "@/components/docs/DocsShell";
import { LIVE_APP_URL } from "@/lib/brand";

const faqs = [
  {
    q: "Do I need an account to read the documentation?",
    a: "No. This docs site is public. You only need to sign up when you want to use the study map, track progress, or chat with the tutor.",
  },
  {
    q: "Is AlgoMentor free?",
    a: "Yes. The platform is free and open source. The AI tutor has a daily question limit on the shared key; you can add your own API key in Settings for unlimited usage.",
  },
  {
    q: "How is this different from LeetCode?",
    a: "LeetCode is a huge problem bank. AlgoMentor is a structured path: which patterns to learn, in what order, with community notes and a tutor grounded in those notes. You still practice on LeetCode (or similar) — we point you to the right problems.",
  },
  {
    q: "Why are some map nodes dashed?",
    a: "Those are contributor slots — patterns we want on the map but do not have community notes for yet. Claim one and help fill the gap.",
  },
  {
    q: "What does “mastered” mean?",
    a: "You have read the notes and verified enough practice solves for that pattern. Mastering unlocks downstream topics on the prerequisite graph.",
  },
  {
    q: "Can I upload my own PDFs or notes?",
    a: "Yes, in your personal workspace. The tutor can search them alongside the community corpus. Upload limits apply per account.",
  },
  {
    q: "Where is my data stored?",
    a: "Account data is managed through Clerk. Your progress, uploads, and encrypted API keys live in our PostgreSQL database on the production server. Community notes are public on GitHub.",
  },
  {
    q: "Can I use the API without the website?",
    a: "Yes. Organizations can create API keys and query knowledge bases programmatically. See the API reference for endpoints and authentication.",
  },
  {
    q: "Something is broken — where do I report it?",
    a: "Open an issue on GitHub or reach out through the repository’s issue tracker. Include what you expected, what happened, and screenshots if possible.",
  },
];

export default function FaqPage() {
  return (
    <>
      <DocHero
        eyebrow="FAQ"
        title="Common questions"
        description="Quick answers for learners, parents, and contributors — no account required."
      />

      <div className="mt-10 space-y-4">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group rounded-[1.75rem] border-2 border-ink bg-cream shadow-[6px_6px_0_var(--color-ink)] open:bg-white/80"
          >
            <summary className="cursor-pointer list-none p-6 font-heading text-lg font-black tracking-tight marker:content-none [&::-webkit-details-marker]:hidden">
              {item.q}
            </summary>
            <p className="border-t-2 border-ink/10 px-6 pb-6 text-base font-medium leading-7 text-ink/70">
              {item.a}
            </p>
          </details>
        ))}
      </div>

      <DocCallout title="Ready to try it?" tone="sun">
        Head to{" "}
        <a href={LIVE_APP_URL} className="font-black underline">
          app.algomentor.me
        </a>{" "}
        or read the <Link href="/docs/getting-started" className="font-black underline">getting started</Link>{" "}
        guide.
      </DocCallout>
    </>
  );
}
