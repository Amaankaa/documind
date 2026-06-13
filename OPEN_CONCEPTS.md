# Open concepts — claim a pattern

All **core** study-map patterns now have bundled or upstream notes. Claim a
**proposed** pattern below or improve existing markdown in either repo.

> **Dual contribution:** new patterns require PRs in
> [algorithm-knowledge-base](https://github.com/BemnetMussa/algorithm-knowledge-base)
> **and** this repo. See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Proposed — not on the map yet

Discuss in an issue before building. Must pass [INTERVIEW_SCOPE.md](./INTERVIEW_SCOPE.md).

| Pattern | Suggested slug | Status | Notes |
|---------|----------------|--------|-------|
| 2D arrays / matrices | `matrices` | Unclaimed | Grid traversal, spiral, rotate image |
| Kadane / max subarray | `kadane` | Unclaimed | Could live under `array/` in KB |
| K-way merge | `k-way-merge` | Unclaimed | Often taught with heaps |

---

## Completed patterns

| Pattern | Contributor |
|---------|-------------|
| Greedy | @Amanuel-Merara |
| Bit manipulation | @Amanuel-Merara |
| Intervals | @Amanuel-Merara |
| Sliding window | @Amanuel-Merara |
| Binary search | @BemnetMussa |
| Most core patterns | @BemnetMussa (knowledge base) |

**Bundled in AlgoMentor** (embedded without waiting for upstream merge):
`greedy`, `bit-manipulation`, `intervals` — see `backend/app/data/bundled_notes/`.

---

## AlgoMentor PR checklist (copy into your PR description)

```markdown
- [ ] Slug added or updated in `backend/app/data/interview_concepts.py`
- [ ] GitHub links added in `backend/app/data/a2sv_github_resources.py`
- [ ] Bundled markdown in `backend/app/data/bundled_notes/` (if shipping locally)
- [ ] Row removed or updated in `OPEN_CONCEPTS.md`
- [ ] `contributor_wanted` set to `false` for this concept
- [ ] Linked knowledge-base PR: # (optional when bundled)
- [ ] No cycle introduced in prerequisite graph
```
