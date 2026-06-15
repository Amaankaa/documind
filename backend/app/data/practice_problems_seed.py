"""
Curated LeetCode practice picks per concept — mirrors ## Practice questions in
the algorithm-knowledge-base markdown notes. Used when live fetch is unavailable.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProblemSeed:
    leetcode_slug: str
    title: str


# At least 3 problems per core pattern where community notes list them.
PRACTICE_PROBLEMS_BY_SLUG: dict[str, tuple[ProblemSeed, ...]] = {
    "arrays-and-strings": (
        ProblemSeed("remove-duplicates-from-sorted-array", "Remove Duplicates from Sorted Array"),
        ProblemSeed("merge-sorted-array", "Merge Sorted Array"),
        ProblemSeed("valid-palindrome", "Valid Palindrome"),
    ),
    "hashing": (
        ProblemSeed("two-sum", "Two Sum"),
        ProblemSeed("contains-duplicate", "Contains Duplicate"),
        ProblemSeed("group-anagrams", "Group Anagrams"),
    ),
    "sorting": (
        ProblemSeed("sort-colors", "Sort Colors"),
        ProblemSeed("merge-intervals", "Merge Intervals"),
        ProblemSeed("largest-number", "Largest Number"),
    ),
    "two-pointers": (
        ProblemSeed("two-sum-ii-input-array-is-sorted", "Two Sum II"),
        ProblemSeed("3sum", "3Sum"),
        ProblemSeed("container-with-most-water", "Container With Most Water"),
    ),
    "sliding-window": (
        ProblemSeed("maximum-average-subarray-i", "Maximum Average Subarray I"),
        ProblemSeed("longest-substring-without-repeating-characters", "Longest Substring Without Repeating Characters"),
        ProblemSeed("minimum-size-subarray-sum", "Minimum Size Subarray Sum"),
    ),
    "prefix-sums": (
        ProblemSeed("subarray-sum-equals-k", "Subarray Sum Equals K"),
        ProblemSeed("range-sum-query-immutable", "Range Sum Query - Immutable"),
        ProblemSeed("product-of-array-except-self", "Product of Array Except Self"),
    ),
    "binary-search": (
        ProblemSeed("binary-search", "Binary Search"),
        ProblemSeed("search-insert-position", "Search Insert Position"),
        ProblemSeed("find-first-and-last-position-of-element-in-sorted-array", "Find First and Last Position"),
    ),
    "stack-queue": (
        ProblemSeed("valid-parentheses", "Valid Parentheses"),
        ProblemSeed("min-stack", "Min Stack"),
        ProblemSeed("implement-queue-using-stacks", "Implement Queue using Stacks"),
    ),
    "monotonic-stack": (
        ProblemSeed("daily-temperatures", "Daily Temperatures"),
        ProblemSeed("largest-rectangle-in-histogram", "Largest Rectangle in Histogram"),
        ProblemSeed("next-greater-element-i", "Next Greater Element I"),
    ),
    "linked-lists": (
        ProblemSeed("reverse-linked-list", "Reverse Linked List"),
        ProblemSeed("linked-list-cycle", "Linked List Cycle"),
        ProblemSeed("merge-two-sorted-lists", "Merge Two Sorted Lists"),
    ),
    "recursion-backtracking": (
        ProblemSeed("subsets", "Subsets"),
        ProblemSeed("permutations", "Permutations"),
        ProblemSeed("combination-sum", "Combination Sum"),
    ),
    "trees-bst": (
        ProblemSeed("maximum-depth-of-binary-tree", "Maximum Depth of Binary Tree"),
        ProblemSeed("validate-binary-search-tree", "Validate Binary Search Tree"),
        ProblemSeed("binary-tree-level-order-traversal", "Binary Tree Level Order Traversal"),
    ),
    "heaps": (
        ProblemSeed("kth-largest-element-in-an-array", "Kth Largest Element in an Array"),
        ProblemSeed("top-k-frequent-elements", "Top K Frequent Elements"),
        ProblemSeed("find-k-pairs-with-smallest-sums", "Find K Pairs with Smallest Sums"),
    ),
    "graphs-bfs-dfs": (
        ProblemSeed("number-of-islands", "Number of Islands"),
        ProblemSeed("clone-graph", "Clone Graph"),
        ProblemSeed("course-schedule", "Course Schedule"),
    ),
    "greedy": (
        ProblemSeed("assign-cookies", "Assign Cookies"),
        ProblemSeed("jump-game", "Jump Game"),
        ProblemSeed("non-overlapping-intervals", "Non-overlapping Intervals"),
    ),
    "bit-manipulation": (
        ProblemSeed("single-number", "Single Number"),
        ProblemSeed("number-of-1-bits", "Number of 1 Bits"),
        ProblemSeed("counting-bits", "Counting Bits"),
    ),
    "dynamic-programming": (
        ProblemSeed("climbing-stairs", "Climbing Stairs"),
        ProblemSeed("house-robber", "House Robber"),
        ProblemSeed("coin-change", "Coin Change"),
    ),
    "topological-sort": (
        ProblemSeed("course-schedule-ii", "Course Schedule II"),
        ProblemSeed("alien-dictionary", "Alien Dictionary"),
        ProblemSeed("minimum-height-trees", "Minimum Height Trees"),
    ),
    "union-find": (
        ProblemSeed("number-of-provinces", "Number of Provinces"),
        ProblemSeed("redundant-connection", "Redundant Connection"),
        ProblemSeed("accounts-merge", "Accounts Merge"),
    ),
    "intervals": (
        ProblemSeed("merge-intervals", "Merge Intervals"),
        ProblemSeed("insert-interval", "Insert Interval"),
        ProblemSeed("meeting-rooms-ii", "Meeting Rooms II"),
    ),
}

MASTERY_PROBLEM_TARGET = 3


def leetcode_url(slug: str) -> str:
    return f"https://leetcode.com/problems/{slug}/"
