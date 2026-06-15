"""
Links each AlgoMentor concept to notes in the community knowledge base.

Repo: https://github.com/BemnetMussa/algorithm-knowledge-base
Built collaboratively by A2SV trainees — templates, explanations, LeetCode picks.

Notes with `bundled_path` are embedded from `app/data/bundled_notes/` during sync
without waiting for an upstream GitHub merge.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.config import get_settings


def _repo_url() -> str:
    settings = get_settings()
    return f"https://github.com/{settings.community_kb_github_repo}"


def _raw_base() -> str:
    settings = get_settings()
    return (
        f"https://raw.githubusercontent.com/{settings.community_kb_github_repo}"
        f"/{settings.community_kb_github_branch}"
    )


@dataclass(frozen=True)
class GitHubResource:
    title: str
    path: str  # relative path inside the community repo
    contributor: str | None = None
    kind: str = "note"  # note | folder | roadmap
    bundled_path: str | None = None  # e.g. greedy/greedy.md under bundled_notes/

    @property
    def blob_url(self) -> str:
        return f"{_repo_url()}/blob/{get_settings().community_kb_github_branch}/{self.path}"

    @property
    def raw_url(self) -> str:
        return f"{_raw_base()}/{self.path}"

    @property
    def tree_url(self) -> str:
        folder = self.path.rsplit("/", 1)[0] if "/" in self.path else self.path
        return f"{_repo_url()}/tree/{get_settings().community_kb_github_branch}/{folder}"


@dataclass(frozen=True)
class IngestEntrySpec:
    concept_slug: str
    filename: str
    bundled_path: str | None
    remote_url: str | None


# slug → curated resources from the community repo
CONCEPT_GITHUB_RESOURCES: dict[str, tuple[GitHubResource, ...]] = {
    "arrays-and-strings": (
        GitHubResource("Two Pointers", "array/two-pointers.md", "@BemnetMussa"),
        GitHubResource("Array techniques folder", "array", kind="folder"),
    ),
    "hashing": (
        GitHubResource("Hash Map & Hash Set", "hash-map/hash-map.md", "@BemnetMussa"),
    ),
    "bit-manipulation": (
        GitHubResource(
            "Bit Manipulation",
            "bit-manipulation/bit-manipulation.md",
            "@Amanuel-Merara",
            bundled_path="bit-manipulation/bit-manipulation.md",
        ),
    ),
    "sorting": (
        GitHubResource("Merge Sort", "sorting/merge-sort.md", "@BemnetMussa"),
        GitHubResource("Quick Sort", "sorting/quick-sort.md", "@BemnetMussa"),
    ),
    "two-pointers": (
        GitHubResource("Two Pointers", "array/two-pointers.md", "@BemnetMussa"),
    ),
    "sliding-window": (
        GitHubResource(
            "Sliding Window",
            "sliding-window/sliding-window.md",
            "@Amanuel-Merara",
        ),
    ),
    "prefix-sums": (
        GitHubResource("Prefix Sum", "prefix-sum/prefix-sum.md", "@BemnetMussa"),
    ),
    "binary-search": (
        GitHubResource("Binary Search", "searching/binary-search.md", "@BemnetMussa"),
        GitHubResource("Exponential Search", "searching/exponential-search.md", "@BemnetMussa"),
    ),
    "stack-queue": (
        GitHubResource("Stack", "stack/stack.md", "@BemnetMussa"),
        GitHubResource("Queue & Deque", "queue/queue.md", "@BemnetMussa"),
    ),
    "monotonic-stack": (
        GitHubResource("Monotonic Stack", "stack/monotonic-stack.md", "@BemnetMussa"),
    ),
    "linked-lists": (
        GitHubResource("Linked List", "linked-list/linked-list.md", "@BemnetMussa"),
    ),
    "recursion-backtracking": (
        GitHubResource("Recursion", "recursion/recursion.md", "@BemnetMussa"),
        GitHubResource("Backtracking", "backtracking/backtracking.md", "@BemnetMussa"),
    ),
    "trees-bst": (
        GitHubResource("Binary Tree & Traversal", "tree/binary-tree.md", "@BemnetMussa"),
        GitHubResource("Binary Search Tree", "tree/binary-search-tree.md", "@BemnetMussa"),
    ),
    "heaps": (
        GitHubResource("Heap", "heap/heap.md", "@BemnetMussa"),
    ),
    "graphs-bfs-dfs": (
        GitHubResource("Breadth-First Search", "graph/bfs.md", "@BemnetMussa"),
        GitHubResource("Depth-First Search", "graph/dfs.md", "@BemnetMussa"),
    ),
    "greedy": (
        GitHubResource(
            "Greedy",
            "greedy/greedy.md",
            "@Amanuel-Merara",
            bundled_path="greedy/greedy.md",
        ),
    ),
    "dynamic-programming": (
        GitHubResource(
            "Dynamic Programming",
            "dynamic-programming/dynamic-programming.md",
            "@BemnetMussa",
        ),
    ),
    "topological-sort": (
        GitHubResource("Topological Sort", "graph/topological-sort.md", "@BemnetMussa"),
    ),
    "union-find": (
        GitHubResource("Union-Find", "union-find/union-find.md", "@BemnetMussa"),
    ),
    "tries": (
        GitHubResource("Trie", "trie/trie.md", "@BemnetMussa"),
    ),
    "intervals": (
        GitHubResource(
            "Intervals",
            "intervals/intervals.md",
            "@Amanuel-Merara",
            bundled_path="intervals/intervals.md",
        ),
    ),
    "segment-trees": (
        GitHubResource("Study roadmap", "ROADMAP.md", kind="roadmap"),
    ),
}


def resources_for_slug(slug: str) -> list[dict]:
    """Serialize GitHub resources for API responses."""
    items = CONCEPT_GITHUB_RESOURCES.get(slug, ())
    return [
        {
            "title": r.title,
            "url": r.blob_url if r.kind == "note" else r.tree_url,
            "raw_url": r.raw_url if r.kind == "note" else None,
            "contributor": r.contributor,
            "kind": r.kind,
            "bundled": r.bundled_path is not None,
            "repo_url": _repo_url(),
        }
        for r in items
    ]


def _filename_from_path(path: str, slug: str) -> str:
    name = path.rsplit("/", 1)[-1]
    return name if name.endswith(".md") else f"{slug}.md"


def all_ingest_entries() -> list[IngestEntrySpec]:
    """Notes to ingest during community sync (bundled and/or remote)."""
    entries: list[IngestEntrySpec] = []
    for slug, resources in CONCEPT_GITHUB_RESOURCES.items():
        for resource in resources:
            if resource.kind != "note":
                continue
            entries.append(
                IngestEntrySpec(
                    concept_slug=slug,
                    filename=_filename_from_path(resource.path, slug),
                    bundled_path=resource.bundled_path,
                    remote_url=resource.raw_url if resource.bundled_path is None else None,
                )
            )
    return entries


def all_ingest_urls() -> list[tuple[str, str]]:
    """Legacy helper — remote-only pairs."""
    return [
        (e.concept_slug, e.remote_url)
        for e in all_ingest_entries()
        if e.remote_url
    ]
