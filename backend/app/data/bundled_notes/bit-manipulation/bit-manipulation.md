# Bit Manipulation

## One-sentence definition
Bit manipulation reads and updates individual bits in an integer using operators like `&`, `|`, `^`, and shifts — giving O(1) checks and compact state encoding.

## When to use it (use cases)
- Detect even/odd, powers of two, or single-bit flags without extra memory.
- Find the one missing/duplicate number when XOR cancels pairs.
- Count set bits (popcount) or enumerate subsets with bitmasks.
- Compress multiple boolean states into one integer (DP with bitmask state).
- Replace slow arithmetic when only parity or presence matters.

## Step-by-step explanation (plain language, no code first)

1. **Bits are 0 or 1** — `5` is `101` in binary (least significant bit on the right).
2. **AND (`&`)** — bit is `1` only if both operands have `1` in that position. Use to **test** or **clear** bits.
3. **OR (`|`)** — bit is `1` if either operand has `1`. Use to **set** bits.
4. **XOR (`^`)** — bit is `1` if bits differ. Use to **toggle** or cancel equal values (`a ^ a = 0`).
5. **Shifts (`<<`, `>>`)** — move bits left/right; `1 << k` is a mask with only bit `k` set.
6. **Brian Kernighan trick** — `n & (n - 1)` removes the lowest set bit; repeat to count bits.

## Visual (ASCII)

```
  5  = 0b0101
  3  = 0b0011
  -------- AND
  1  = 0b0001

  5 ^ 5 = 0   (duplicate cancels)
  0 ^ 7 = 7   (missing number trick)
```

## Templates (Python)

### Test, set, clear, toggle the k-th bit (0-indexed from LSB)
```python
def is_set(n: int, k: int) -> bool:
    return (n >> k) & 1 == 1

def set_bit(n: int, k: int) -> int:
    return n | (1 << k)

def clear_bit(n: int, k: int) -> int:
    return n & ~(1 << k)

def toggle_bit(n: int, k: int) -> int:
    return n ^ (1 << k)
```

### Count set bits — Brian Kernighan
```python
def count_bits(n: int) -> int:
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count
```

### Power of two check
```python
def is_power_of_two(n: int) -> bool:
    return n > 0 and (n & (n - 1)) == 0
```

### Missing number — XOR all indices and values
```python
def missing_number(nums: list[int]) -> int:
    xor_all = 0
    for i in range(len(nums) + 1):
        xor_all ^= i
    for x in nums:
        xor_all ^= x
    return xor_all
```

### Counting bits for every value 0..n (DP)
```python
def count_bits_upto_n(n: int) -> list[int]:
    ans = [0] * (n + 1)
    for i in range(1, n + 1):
        ans[i] = ans[i >> 1] + (i & 1)
    return ans
```

## Time & space complexity (Big O)

| Operation | Time | Space |
|---|---|---|
| Single `&`, `|`, `^`, shift | O(1) | O(1) |
| Brian Kernighan per number | O(number of set bits) ≤ O(log n) | O(1) |
| Count bits for `0..n` DP | O(n) | O(n) |

## Practice questions

1. [Single Number — LeetCode 136](https://leetcode.com/problems/single-number/)
2. [Number of 1 Bits — LeetCode 191](https://leetcode.com/problems/number-of-1-bits/)
3. [Counting Bits — LeetCode 338](https://leetcode.com/problems/counting-bits/)

 
 Answers 

1. XOR every element. Pairs cancel; the survivor is the unique value. O(n) time, O(1) space.

2. While `n` is non-zero, do `n &= n - 1` and increment a counter. Each iteration removes one set bit. O(number of set bits).

3. `ans[i] = ans[i >> 1] + (i & 1)` — the popcount of `i` equals popcount of `i//2` plus the least significant bit. O(n) time.

 

## One thing that was confusing to me
Python’s `~n` returns negative numbers because integers use two’s complement with unlimited precision (`~5 == -6`). For interviews, stick to masks like `(1 << k)` and `n & (1 << k)` instead of thinking about `~` unless you are explicitly masking a fixed width.

## See also
- [Bitwise folder (legacy path)](../Bitwise/bitwise.md)
- [Backtracking](../backtracking/backtracking.md) — subset enumeration with bitmasks
- [Dynamic Programming](../dynamic-programming/dynamic-programming.md) — bitmask DP
