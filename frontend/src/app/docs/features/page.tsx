import { DocCard, DocHero, DocSection } from "@/components/docs/DocsShell";
import { BONUS_PATTERN_COUNT, CORE_PATTERN_COUNT } from "@/lib/brand";

const features = [
  {
    title: "Prerequisite study map",
    body: "Seventeen core DSA patterns arranged as a directed graph. The app uses topological sort to recommend what to study next — the same algorithm concept you will use in interviews, applied to your learning path.",
  },
  {
    title: "Focus & full map modes",
    body: "Focus view highlights your next topic and immediate neighbors. Full map shows the entire graph. Zoom with the mouse wheel; drag to pan.",
  },
  {
    title: "Mastery gating",
    body: "Topics stay locked until prerequisites are mastered. Each pattern tracks verified practice solves — you cannot skip fundamentals by accident.",
  },
  {
    title: "Practice problems",
    body: "Curated LeetCode-style problems per pattern. Verify solves to progress; the map reflects your real readiness.",
  },
  {
    title: "Community corpus",
    body: "Notes from the open-source Algorithm Knowledge Base are synced and embedded for search. Bundled notes ship with the app; upstream GitHub content is pulled on a schedule.",
  },
  {
    title: "Contributor slots",
    body: "Some bonus patterns are marked “Claim” — open slots for contributors to write notes and get credited on the map.",
  },
  {
    title: "Personal workspace",
    body: "Upload a limited set of private documents. Your uploads stay in your workspace; the community corpus is shared read-only.",
  },
  {
    title: "Org workspaces & API keys",
    body: "Organizations can manage usage, analytics, and programmatic API access for integrations.",
  },
  {
    title: "Evaluation harness",
    body: "For developers: build eval sets, run retrieval quality checks, and score answers with automated metrics.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <DocHero
        eyebrow="Features"
        title="Everything in the product"
        description={`A complete picture of what ${CORE_PATTERN_COUNT} core patterns, ${BONUS_PATTERN_COUNT} bonus topics, and the platform around them can do for your interview prep.`}
      />

      <DocSection title="Study path">
        <p>
          The center of AlgoMentor is the <strong>study map</strong>. It answers three questions
          every interview candidate has: <em>What order should I learn things?</em>{" "}
          <em>What am I ready for today?</em> <em>What did I already finish?</em>
        </p>
        <p>
          Status badges, progress bars, and the “Recommended next” card at the top of the map keep
          you oriented without reading a 50-page study plan.
        </p>
      </DocSection>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <DocCard key={feature.title} title={feature.title}>
            {feature.body}
          </DocCard>
        ))}
      </div>

      <DocSection title="What we deliberately do not do">
        <ul className="list-disc space-y-2 pl-5">
          <li>Dump full solutions on demand — the tutor is Socratic</li>
          <li>Replace reading and practice — the map points you to notes and problems</li>
          <li>Cover every niche competitive programming topic — scope is big-tech interviews only</li>
        </ul>
      </DocSection>
    </>
  );
}
