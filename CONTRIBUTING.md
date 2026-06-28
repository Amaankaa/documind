# Contributing to AlgoMentor

Thank you for helping students prep for big-tech interviews.

AlgoMentor is the **study map + AI mentor**. The explanations and code templates live in our
sibling project, the open-source
[Algorithm Knowledge Base](https://github.com/BemnetMussa/algorithm-knowledge-base)
built by A2SV trainees and contributors worldwide.

**Most contributions touch both repos.** That is intentional.

---

## Quick start

1. Read [INTERVIEW_SCOPE.md](./INTERVIEW_SCOPE.md) — is your pattern in scope?
2. Pick an unclaimed pattern from [OPEN_CONCEPTS.md](./OPEN_CONCEPTS.md).
3. Open a **Claim pattern** issue.
4. Ship two linked PRs (knowledge base + AlgoMentor).
5. Get credited on the study map and in the knowledge-base README.

---

## The dual-PR workflow

### 1. Knowledge base PR (content)

Repo: https://github.com/BemnetMussa/algorithm-knowledge-base

- Follow their [CONTRIBUTING.md](https://github.com/BemnetMussa/algorithm-knowledge-base/blob/main/CONTRIBUTING.md)
  and note template.
- Add your markdown file in the correct topic folder.
- Include Python templates, Big-O, concept questions, and LeetCode links.
- Update their claim table in README.

### 2. AlgoMentor PR (platform wiring)

Repo: this repository

Edit **only what you need** — typically three files:

| File | What to change |
|------|----------------|
| `backend/app/data/interview_concepts.py` | Title, description, prerequisites, `contributor_wanted=False` |
| `backend/app/data/a2sv_github_resources.py` | Link to your new markdown path + `@your-username` |
| `OPEN_CONCEPTS.md` | Mark pattern as claimed / completed |

**New pattern?** Also add a `ConceptSeed` row and prerequisite edges. Run:

```bash
cd backend && uv run pytest tests/test_concepts.py -q
```

to verify the graph still has no cycles.

### 3. Link the PRs

In both PR descriptions:

```markdown
Companion PR: <url>
Claim issue: #<number>
```

Maintainers will not merge one without the other unless explicitly agreed.

---

## Claim an existing open slot

Use the GitHub issue template: **Claim pattern**

Or comment on [OPEN_CONCEPTS.md](./OPEN_CONCEPTS.md) with:

```markdown
Claim: Greedy (`greedy`) — @your-username
```

---

## Local development

See [README.md](./README.md). Minimum path:

```bash
docker compose up postgres redis -d
cd backend && uv sync && uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
cd frontend && pnpm install && pnpm dev
```

---

## Code style

- **Python:** match existing FastAPI / SQLAlchemy patterns; run `uv run pytest -q`
- **TypeScript:** match neo-brutalist UI conventions; run `pnpm lint`
- Keep PRs focused — one pattern per PR pair when possible

**CI** runs on every push and PR (backend tests + frontend lint/build).  
**CD** auto-deploys to production on push to `main` when `ENABLE_CD=true` — see [DEPLOY.md](./DEPLOY.md).

---

## What not to commit

- `.env`, API keys, Clerk secrets, Gemini keys
- Personal deployment URLs with private tokens
- Content plagiarized from other sites — write for students in your own words

---

## Recognition

Contributors are credited:

- On the AlgoMentor study map (`contributor` field on GitHub resource links)
- In the knowledge-base README claim table
- In git history — your handle, your work

---

## Questions?

Open a [GitHub Discussion](https://github.com/Amaankaa/documind/discussions) or issue.
For knowledge-base content questions, use their repo's issues.

**Built for learners preparing for big-tech interviews — by learners who've been there.**
