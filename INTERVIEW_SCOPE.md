# Interview scope — what belongs in AlgoMentor

AlgoMentor is **big-tech coding interview prep**, not a full algorithms encyclopedia.
We optimize for the patterns that show up repeatedly at companies like Google, Meta,
Amazon, Microsoft, and similar — not competitive programming deep dives.

## In scope (core tier)

These ~16 patterns cover the majority of medium coding interview questions:

1. Arrays & strings
2. Hash maps & sets
3. Sorting
4. Two pointers
5. Sliding window
6. Prefix sums
7. Binary search
8. Stacks & queues (+ monotonic stack)
9. Linked lists
10. Recursion & backtracking
11. Trees & BST
12. Heaps / priority queue
13. Graphs (BFS & DFS)
14. Greedy
15. Dynamic programming
16. Bit manipulation

## In scope (bonus tier)

Useful but less frequent — label clearly as **bonus** on the study map:

- Topological sort
- Union-find (DSU)
- Tries
- Intervals
- Segment trees / BIT (rare in most interviews)

## Out of scope

Please **do not** open PRs for:

- Full competitive programming catalogs (suffix automata, heavy number theory, etc.)
- System design, behavioral, or ML interview prep
- Language-specific framework trivia
- Duplicate patterns that differ only by name

When in doubt, ask in a GitHub issue before writing a long note.

## Adding a new pattern

1. Confirm it fits this document.
2. Follow [CONTRIBUTING.md](./CONTRIBUTING.md) — dual PR to AlgoMentor **and**
   the [Algorithm Knowledge Base](https://github.com/BemnetMussa/algorithm-knowledge-base).
3. Update [OPEN_CONCEPTS.md](./OPEN_CONCEPTS.md) when your claim is done.

## Source of truth

| What | Where |
|------|--------|
| Study order & prerequisites | `backend/app/data/interview_concepts.py` |
| Links to community notes | `backend/app/data/a2sv_github_resources.py` |
| Patterns needing contributors | `OPEN_CONCEPTS.md` |
