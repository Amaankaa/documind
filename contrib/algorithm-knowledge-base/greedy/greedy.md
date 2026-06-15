# Greedy

## One-sentence definition
Greedy algorithms build a solution by repeatedly making the locally best choice, hoping (and proving) that those choices lead to a globally optimal answer.

## When to use it (use cases)
- The problem has **optimal substructure** — an optimal solution contains optimal solutions to subproblems.
- A **greedy choice property** holds — picking the best-looking option now never blocks a better overall answer.
- Sorting the input (or processing events in time order) makes the next choice obvious.
- Classic signals: activity selection, interval scheduling, Huffman-style merging, minimum coins (with canonical denominations), assigning tasks by deadline or profit.

## Step-by-step explanation (plain language, no code first)

1. **Sort or prioritize** — order items by finish time, profit, ratio, or end coordinate so the “best next pick” is well defined.
2. **Scan once** — walk the sorted list and decide whether to take the current item.
3. **Maintain feasibility** — track the last chosen end time, remaining capacity, or running total so the next choice stays valid.
4. **Prove (or sanity-check) greediness** — ask: “If I skip a better-looking local choice, could I still beat this?” Exchange arguments and “stay ahead” proofs are the interview version of this step.

### Activity selection (template story)
- Sort activities by **finish time**.
- Take the first activity, then always take the next activity that **starts after** the last chosen one ends.
- Why it works: finishing earlier leaves the most room for future activities.

### Interval / merging style
- Sort by start (or end), merge or schedule greedily based on overlap rules.

## Visual (ASCII)

```
Activities (start, end):
  A: |----|
  B:   |------|
  C:       |--|
  D:            |---|

Sort by end: A, C, B, D
Pick A (ends earliest), skip B (overlaps A), pick C, pick D
→ 3 activities
```

## Templates (Python)

### Activity selection — maximum non-overlapping intervals
Use when: intervals have start/end and you want the largest compatible set.
```python
def max_activities(intervals: list[tuple[int, int]]) -> int:
    intervals.sort(key=lambda x: x[1])  # sort by finish time
    count = 0
    last_end = float("-inf")
    for start, end in intervals:
        if start >= last_end:
            count += 1
            last_end = end
    return count
```

### Assign cookies to children (capacity greedy)
Use when: each child wants a minimum size and each cookie satisfies at most one child.
```python
def find_content_children(greed: list[int], cookies: list[int]) -> int:
    greed.sort()
    cookies.sort()
    child = cookie = 0
    while child < len(greed) and cookie < len(cookies):
        if cookies[cookie] >= greed[child]:
            child += 1
        cookie += 1
    return child
```

### Jump game — farthest reach
Use when: each index gives a max jump length and you ask if the end is reachable.
```python
def can_jump(nums: list[int]) -> bool:
    farthest = 0
    for i, jump in enumerate(nums):
        if i > farthest:
            return False
        farthest = max(farthest, i + jump)
    return True
```

## Time & space complexity (Big O)

| Pattern | Time | Space |
|---|---|---|
| Sort + single pass | O(n log n) | O(1) extra (or O(n) if sorting copies) |
| Heap-based greedy (e.g. schedule by profit) | O(n log n) | O(n) |

Brute force trying all subsets is often O(2^n). Greedy reduces to sorting plus a linear scan when the proof holds.

## Practice questions

1. [Assign Cookies — LeetCode 455](https://leetcode.com/problems/assign-cookies/)
2. [Jump Game — LeetCode 55](https://leetcode.com/problems/jump-game/)
3. [Non-overlapping Intervals — LeetCode 435](https://leetcode.com/problems/non-overlapping-intervals/)

 
 Answers 

1. Sort children and cookies. Greedily give the smallest cookie that satisfies the current least-greedy unsatisfied child. Two pointers, O(n log n).

2. Track the farthest index reachable. If `i > farthest`, you are stuck. Otherwise update `farthest = max(farthest, i + nums[i])`. O(n), O(1).

3. Sort intervals by end time. Count how many you can keep by always picking the next interval that starts after the last end. Equivalent to activity selection. O(n log n).

 

## One thing that was confusing to me
Greedy **looks** like it should always work because “take the best now” feels natural, but it does not. Counterexample: coin change with coins `[1, 3, 4]` and amount `6` — greedy takes `4+1+1` (3 coins) but optimal is `3+3` (2 coins). Always ask whether a local choice can block a better global arrangement before coding greedy.

## See also
- [Sorting](../sorting/merge-sort.md)
- [Intervals](../intervals/intervals.md) *(coming soon)*
- [Dynamic Programming](../dynamic-programming/dynamic-programming.md) — when greedy fails
