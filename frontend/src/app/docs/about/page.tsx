import Link from "next/link";
import {
  ALGOMENTOR_REPO,
  BONUS_PATTERN_COUNT,
  CORE_PATTERN_COUNT,
  KNOWLEDGE_BASE_NAME,
  LIVE_API_URL,
  LIVE_APP_URL,
  PRODUCT_NAME,
} from "@/lib/brand";
import { DocCallout, DocCard, DocHero, DocSection } from "@/components/docs/DocsShell";

const milestones = [
  {
    title: "Live product",
    body: `${PRODUCT_NAME} runs in production at app.algomentor.me with Google sign-in, a managed database, and automatic deploys when code merges to main.`,
  },
  {
    title: "Study map",
    body: `${CORE_PATTERN_COUNT} core interview patterns plus ${BONUS_PATTERN_COUNT} bonus topics, wired as a prerequisite graph with focus mode, zoom, progress tracking, and mastery gating.`,
  },
  {
    title: "Community textbook",
    body: `Notes from the open-source ${KNOWLEDGE_BASE_NAME} are bundled and synced. Contributors improve the corpus; learners read it for free on GitHub.`,
  },
  {
    title: "AI tutor",
    body: "Retrieval-augmented hints grounded in those notes — Socratic, cited, and scoped to the pattern you are studying. Free daily tier plus bring-your-own-key for power users.",
  },
  {
    title: "Contributor program",
    body: "Open slots on the map for patterns that need writers. Dual-PR workflow links content on GitHub to nodes on the study map, with credit on both.",
  },
  {
    title: "Developer platform",
    body: "REST API for knowledge bases, documents, streaming queries, study-map progress, org analytics, and evaluation harnesses — documented for integrators.",
  },
];

export default function AboutProjectPage() {
  return (
    <>
      <DocHero
        eyebrow="About the project"
        title="What we have built so far"
        description="A plain-language summary of AlgoMentor today — for learners, contributors, and anyone curious how an open-source interview prep platform comes together."
      />

      <DocSection title="The mission">
        <p>
          Big-tech coding interviews reward <em>pattern recognition</em>, not memorizing 500 random
          problems. {PRODUCT_NAME} exists so you always know which pattern to learn next, where to
          read about it, and how to get unstuck — without someone handing you the full solution.
        </p>
        <p>
          Everything is MIT-licensed on{" "}
          <a href={ALGOMENTOR_REPO} className="font-black underline" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          . The live app is free to use.
        </p>
      </DocSection>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {milestones.map((item) => (
          <DocCard key={item.title} title={item.title}>
            {item.body}
          </DocCard>
        ))}
      </div>

      <DocSection title="How it is hosted (simple version)">
        <p>
          The website you sign into (<a href={LIVE_APP_URL} className="font-black underline">{LIVE_APP_URL.replace("https://", "")}</a>)
          talks to an API server (<a href={LIVE_API_URL} className="font-black underline">{LIVE_API_URL.replace("https://", "")}</a>).
          Both run in Docker on a cloud server. When we merge improvements on GitHub, an automated
          pipeline updates production — so fixes and new features reach learners quickly.
        </p>
        <p>
          You do not need to understand any of that to use the product. It is here so parents,
          teachers, or hiring managers can see this is a real, maintained system — not a weekend
          prototype.
        </p>
      </DocSection>

      <DocSection title="What is next">
        <ul className="list-disc space-y-2 pl-5">
          <li>More community-written patterns filling the “Claim me” slots on the map</li>
          <li>Richer practice verification and progress analytics</li>
          <li>Continued polish on the study map and tutor experience</li>
        </ul>
      </DocSection>

      <DocCallout title="Want to help?" tone="mint">
        Read the <Link href="/docs/contributors" className="font-black underline">Contributors</Link>{" "}
        guide or browse open patterns on{" "}
        <a href={`${ALGOMENTOR_REPO}/blob/main/OPEN_CONCEPTS.md`} className="font-black underline" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        .
      </DocCallout>
    </>
  );
}
