"""
Seed catalog for AlgoMentor — big-tech interview DSA patterns.

Each entry is a node in the prerequisite DAG. Slugs are stable identifiers
used by the seed script and API.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ConceptSeed:
    slug: str
    title: str
    description: str
    order_index: int
    is_bonus: bool = False
    contributor_wanted: bool = False
    prerequisites: tuple[str, ...] = ()


INTERVIEW_CONCEPTS: tuple[ConceptSeed, ...] = (
    ConceptSeed(
        slug="arrays-and-strings",
        title="Arrays & Strings",
        description="Foundation for most interview problems — indexing, traversal, and in-place manipulation.",
        order_index=1,
    ),
    ConceptSeed(
        slug="hashing",
        title="Hash Maps & Sets",
        description="O(1) lookups for frequency counting, deduplication, and complement searches.",
        order_index=2,
        prerequisites=("arrays-and-strings",),
    ),
    ConceptSeed(
        slug="bit-manipulation",
        title="Bit Manipulation",
        description="XOR tricks, bit masks, and counting bits — common in optimization and state problems.",
        order_index=3,
        prerequisites=("arrays-and-strings",),
    ),
    ConceptSeed(
        slug="sorting",
        title="Sorting",
        description="Custom comparators, stability, and when sorting unlocks greedy or two-pointer solutions.",
        order_index=4,
        prerequisites=("arrays-and-strings",),
    ),
    ConceptSeed(
        slug="two-pointers",
        title="Two Pointers",
        description="Pair scanning on sorted arrays and palindrome-style string problems.",
        order_index=5,
        prerequisites=("arrays-and-strings",),
    ),
    ConceptSeed(
        slug="sliding-window",
        title="Sliding Window",
        description="Fixed and variable windows for substring and subarray optimization.",
        order_index=6,
        prerequisites=("two-pointers", "hashing"),
    ),
    ConceptSeed(
        slug="prefix-sums",
        title="Prefix Sums",
        description="Range queries and subarray sums in O(1) after O(n) preprocessing.",
        order_index=7,
        prerequisites=("arrays-and-strings",),
    ),
    ConceptSeed(
        slug="binary-search",
        title="Binary Search",
        description="Search on sorted data and the 'answer space' variant used in optimization problems.",
        order_index=8,
        prerequisites=("arrays-and-strings", "sorting"),
    ),
    ConceptSeed(
        slug="stack-queue",
        title="Stacks & Queues",
        description="LIFO/FIFO patterns for parsing, BFS layering, and next-greater-element style problems.",
        order_index=9,
        prerequisites=("arrays-and-strings",),
    ),
    ConceptSeed(
        slug="monotonic-stack",
        title="Monotonic Stack",
        description="Maintain increasing/decreasing stacks for histogram and span problems.",
        order_index=10,
        prerequisites=("stack-queue",),
    ),
    ConceptSeed(
        slug="linked-lists",
        title="Linked Lists",
        description="Pointer manipulation, cycle detection, and merge patterns.",
        order_index=11,
        prerequisites=("two-pointers",),
    ),
    ConceptSeed(
        slug="recursion-backtracking",
        title="Recursion & Backtracking",
        description="Choice trees, pruning, and base-case design for combinatorial search.",
        order_index=12,
    ),
    ConceptSeed(
        slug="trees-bst",
        title="Trees & BST",
        description="DFS/BFS traversals, BST invariants, and subtree reasoning.",
        order_index=13,
        prerequisites=("recursion-backtracking", "linked-lists"),
    ),
    ConceptSeed(
        slug="heaps",
        title="Heaps / Priority Queue",
        description="Top-k, merge k sorted streams, and scheduling with O(log n) extractions.",
        order_index=14,
        prerequisites=("trees-bst",),
    ),
    ConceptSeed(
        slug="graphs-bfs-dfs",
        title="Graphs: BFS & DFS",
        description="Adjacency representations, connected components, and shortest unweighted paths.",
        order_index=15,
        prerequisites=("stack-queue", "recursion-backtracking", "hashing", "linked-lists"),
    ),
    ConceptSeed(
        slug="greedy",
        title="Greedy",
        description="Locally optimal choices with exchange-argument or sorting proofs.",
        order_index=16,
        prerequisites=("sorting",),
    ),
    ConceptSeed(
        slug="dynamic-programming",
        title="Dynamic Programming",
        description="1D/2D state transitions, knapsack variants, and overlapping subproblems.",
        order_index=17,
        prerequisites=("recursion-backtracking", "hashing"),
    ),
    ConceptSeed(
        slug="topological-sort",
        title="Topological Sort",
        description="Ordering nodes in a DAG — course schedule and dependency resolution.",
        order_index=18,
        is_bonus=True,
        prerequisites=("graphs-bfs-dfs",),
    ),
    ConceptSeed(
        slug="union-find",
        title="Union-Find (DSU)",
        description="Disjoint set union with path compression for connectivity queries.",
        order_index=19,
        is_bonus=True,
        prerequisites=("graphs-bfs-dfs",),
    ),
    ConceptSeed(
        slug="tries",
        title="Tries",
        description="Prefix trees for autocomplete and word-search patterns.",
        order_index=20,
        is_bonus=True,
        prerequisites=("trees-bst", "arrays-and-strings", "linked-lists"),
    ),
    ConceptSeed(
        slug="intervals",
        title="Intervals",
        description="Merge, insert, and sweep-line techniques on ranges.",
        order_index=21,
        is_bonus=True,
        prerequisites=("sorting",),
    ),
    ConceptSeed(
        slug="segment-trees",
        title="Segment Trees",
        description="Range queries and point updates in O(log n) — rare in most interviews.",
        order_index=22,
        is_bonus=True,
        prerequisites=("trees-bst",),
    ),
)
