# Intervals

## One-sentence definition
Interval problems treat ranges `[start, end]` as objects to sort, merge, insert, or sweep — often after sorting by start or end time.

## When to use it (use cases)
- Merging overlapping ranges (meetings, time slots).
- Inserting a new interval into a sorted list.
- Scheduling the minimum number of resources (rooms, arrows, platforms).
- Sweep-line / event-based counting when points matter more than full ranges.
- Problems that mention “overlapping”, “scheduling”, or “coverage”.

## Step-by-step explanation (plain language, no code first)

1. **Sort** — usually by `start` (merge/insert) or by `end` (activity-style greedy).
2. **Walk linearly** — compare the current interval with the last kept interval.
3. **Merge rule** — if `current.start <= last.end`, overlap exists; extend `last.end = max(last.end, current.end)`.
4. **Insert rule** — binary-search the position in a sorted list, then merge neighbors if needed.
5. **Resource counting** — sort starts and ends separately; sweep with a counter.

## Visual (ASCII)

```
Input:  [1,3] [2,6] [8,10] [15,18]

Sort by start:
[1,3] merges with [2,6] → [1,6]
[8,10] stands alone
[15,18] stands alone

Output: [1,6] [8,10] [15,18]
```

## Templates (Python)

### Merge overlapping intervals
```python
def merge(intervals: list[list[int]]) -> list[list[int]]:
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0][:]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
```

### Non-overlapping intervals — minimum removals (greedy by end)
```python
def erase_overlap_intervals(intervals: list[list[int]]) -> int:
    intervals.sort(key=lambda x: x[1])
    removals = 0
    prev_end = float("-inf")
    for start, end in intervals:
        if start < prev_end:
            removals += 1
        else:
            prev_end = end
    return removals
```

### Meeting rooms II — min rooms needed (sweep line)
```python
def min_meeting_rooms(intervals: list[list[int]]) -> int:
    starts = sorted(s for s, _ in intervals)
    ends = sorted(e for _, e in intervals)
    rooms = max_rooms = 0
    i = j = 0
    while i < len(starts):
        if starts[i] < ends[j]:
            rooms += 1
            max_rooms = max(max_rooms, rooms)
            i += 1
        else:
            rooms -= 1
            j += 1
    return max_rooms
```

## Time & space complexity (Big O)

| Pattern | Time | Space |
|---|---|---|
| Sort + linear merge | O(n log n) | O(n) output |
| Sweep with two sorted arrays | O(n log n) | O(n) |

## Practice questions

1. [Merge Intervals — LeetCode 56](https://leetcode.com/problems/merge-intervals/)
2. [Insert Interval — LeetCode 57](https://leetcode.com/problems/insert-interval/)
3. [Meeting Rooms II — LeetCode 253](https://leetcode.com/problems/meeting-rooms-ii/)

 
 Answers 

1. Sort by start, merge when `start <= last.end`, else append. O(n log n).

2. Binary search insert position, merge forward while overlaps exist, then merge backward if needed. O(n) after insert in sorted list.

3. Sort all starts and ends; sweep — when next start is before next end, need another room; else a meeting ended and frees a room. Track max concurrent rooms.

 

## One thing that was confusing to me
Sorting by **start** vs **end** changes the algorithm. Merge/insert wants starts; “maximum non-overlapping” / minimum removals wants ends (same greedy as activity selection). Read the question carefully before picking the sort key.

## See also
- [Sorting](../sorting/merge-sort.md)
- [Greedy](../greedy/greedy.md)
