import {
  ALGOMENTOR_REPO,
  CONTRIBUTING_URL,
  KNOWLEDGE_BASE_REPO,
  OPEN_CONCEPTS_URL,
  PRODUCT_NAME,
} from "@/lib/brand";
import { DocCallout, DocCard, DocHero, DocSection } from "@/components/docs/DocsShell";

export default function ContributorsPage() {
  return (
    <>
      <DocHero
        eyebrow="Contributors"
        title="Help thousands prep — get credited on the map"
        description="A step-by-step guide to claiming a pattern, writing notes, and wiring them into AlgoMentor. No prior open-source experience required."
      />

      <DocSection title="Why contribute?">
        <p>
          {PRODUCT_NAME} is only as good as its notes. Every pattern on the study map points to
          markdown explanations — templates, Big-O intuition, concept checks, and curated LeetCode
          problems. When you claim an open slot, your GitHub username appears on the map and in the
          knowledge base README.
        </p>
      </DocSection>

      <DocSection title="The dual-PR workflow (simple version)">
        <p>Most contributions touch <strong>two repositories</strong>:</p>
        <ol className="list-decimal space-y-4 pl-5">
          <li>
            <strong>Algorithm Knowledge Base</strong> — you write the actual study notes (markdown).
          </li>
          <li>
            <strong>AlgoMentor</strong> — you connect those notes to a node on the study map (a few
            config files).
          </li>
        </ol>
        <p>
          Link both pull requests in their descriptions so reviewers can see the full picture.
        </p>
      </DocSection>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <DocCard title="1. Pick a pattern">
          Browse{" "}
          <a href={OPEN_CONCEPTS_URL} className="font-black underline" target="_blank" rel="noopener noreferrer">
            open concepts
          </a>{" "}
          and open a “Claim pattern” issue so nobody else takes the same slot.
        </DocCard>
        <DocCard title="2. Write notes">
          Follow the knowledge base template on{" "}
          <a href={KNOWLEDGE_BASE_REPO} className="font-black underline" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          . Include Python templates and practice links.
        </DocCard>
        <DocCard title="3. Wire the map">
          Update concept metadata in the AlgoMentor repo so the study map links to your file and
          shows your username.
        </DocCard>
      </div>

      <DocSection title="What makes a great note?">
        <ul className="list-disc space-y-2 pl-5">
          <li>Starts from intuition, not jargon</li>
          <li>Includes a reusable Python template with comments</li>
          <li>States time and space complexity clearly</li>
          <li>Lists 2–4 LeetCode problems at increasing difficulty</li>
          <li>Stays within big-tech interview scope (see INTERVIEW_SCOPE on GitHub)</li>
        </ul>
      </DocSection>

      <DocSection title="For developers">
        <p>
          Clone <a href={ALGOMENTOR_REPO} className="font-black underline" target="_blank" rel="noopener noreferrer">AlgoMentor</a>, run{" "}
          <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-sm">docker compose up</code>{" "}
          locally, and run tests before opening a PR. Full setup lives in the repo README and{" "}
          <a href={CONTRIBUTING_URL} className="font-black underline" target="_blank" rel="noopener noreferrer">
            CONTRIBUTING.md
          </a>
          .
        </p>
      </DocSection>

      <DocCallout title="Questions?" tone="mint">
        Open a discussion or issue on{" "}
        <a href={`${ALGOMENTOR_REPO}/issues`} className="font-black underline" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>{" "}
        — we are happy to pair with first-time contributors.
      </DocCallout>
    </>
  );
}
