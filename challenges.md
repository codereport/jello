### LeetCode / PWC Problems

|       | Number | Contest |  PWC  |                 Jello Solution                  | Jellyfish Solution |
| :---: | :----: | :-----: | :---: | :---------------------------------------------: | :----------------: |
|   1   |  3005  |  380p1  |       |        `len key . idx_max at_idx . sum`         |     `LƙɠµMịµS`     |
|   2   |  3010  | b122p1  |       |      `tail sort take 2 pair head flat sum`      |     `ḊṢḣ2,ḢFS`     |
|   3   |  3028  |  383p1  |       |                 `sums = 0 sum`                  |       `Ä=0S`       |
|   4   |  3038  | b124p1  |       | `len idiv 2 take c + 2 chunk_fold . = head sum` |   `L:2ḣ@+2/µ=ḢS`   |
|   5   |        |         | 250p1 |        `len iota0 mod 10 = : keep head`         |    `LḶ%10=ðḳḢ`     |
|   6   |  1380  |         | 251p2 |        `minr each rev = maxr * maxr sum`        |   ``z`ṂṚ=Ṁ×Ṁḟ0``   |
|   7   |  2778  |         | 252p1 |              `divs? len * sq sum`               |      `ḍL×²S`       |
|   8   |  1365  |         | 257p1 |              `< outer w sum each`               |     ``<þ`S€``      |
|   9   |  1295  |         | 258p1 |         `i_to_d len_each odd? not sum`          |      `DẈḂCS`       |
|  10   |  2859  |         | 258p2 |          `len iota0 bits = r * l sum`           |     `LḶ①=ṛ×ḷS`     |
|  11   |  3046  |  386p1  |       |               `len key maxr < 3`                |      `LƙɠṀ<3`      |

### Links

1. [3005 - Count Elements With Maximum Frequency](https://leetcode.com/contest/weekly-contest-380/problems/count-elements-with-maximum-frequency/)
2. [3010 - Divide an Array Into Subarrays With Minimum Cost I](https://leetcode.com/contest/biweekly-contest-122/problems/divide-an-array-into-subarrays-with-minimum-cost-i/)
3. [3028 - Ant on the Boundary](https://leetcode.com/contest/weekly-contest-383/problems/ant-on-the-boundary/)
4. [3038 - Maximum Number of Operations With the Same Score I](https://leetcode.com/contest/biweekly-contest-124/problems/maximum-number-of-operations-with-the-same-score-i/)
5. [PWC 250 - Task 1: Smallest Index](https://theweeklychallenge.org/blog/perl-weekly-challenge-250/)
6. [1380. Lucky Numbers in a Matrix](https://leetcode.com/problems/lucky-numbers-in-a-matrix/description/) | [PWC 251 - Task 2: Lucky Numbers](https://theweeklychallenge.org/blog/perl-weekly-challenge-251/)
7. [2778. Sum of Squares of Special Elements](https://leetcode.com/problems/sum-of-squares-of-special-elements/description/) | [PWC 251 - Task 1: Special Numbers](https://theweeklychallenge.org/blog/perl-weekly-challenge-251/)
8. [1365. How Many Numbers Are Smaller Than the Current Number](https://leetcode.com/problems/how-many-numbers-are-smaller-than-the-current-number/description/) | [PWC 257 - Task 1: Smaller than Current](https://theweeklychallenge.org/blog/perl-weekly-challenge-257/)
9. [PWC 258 - Task 1: Count Even Digits Number](https://theweeklychallenge.org/blog/perl-weekly-challenge-258/) | [Find Numbers with Even Number of Digits](https://leetcode.com/problems/find-numbers-with-even-number-of-digits/)
10. [PWC 258 - Task Task 2: Sum of Values](https://theweeklychallenge.org/blog/perl-weekly-challenge-258/) | [2859. Sum of Values at Indices With K Set Bits](https://leetcode.com/problems/sum-of-values-at-indices-with-k-set-bits/description/)
11. [3046. Split the Array](https://leetcode.com/contest/weekly-contest-386/problems/split-the-array/)

### Exploration of #10

This is the solution in various of array languages:

|  Language  |     Explicit Solution      |         Tacit Solution         |
| :--------: | :------------------------: | :----------------------------: |
|   Jello    |             -              |  `len iota0 bits = r * l sum`  |
|    Uiua    |             -              |        `/+×=≡/+⋯⇡⧻⊙:.`         |
| Dyalog APL | `{+/⍵×⍺=+⌿(2⊥⍣¯1⊢)¯1+⍳≢⍵}` | `+/⊢×⊣=(((+⌿2⊥⍣¯1⊢)¯1+⍳∘≢)⍤⊢)` |
|    BQN     |     `{+´𝕩×𝕨=Bits¨↕≠𝕩}`     |      `+´⊢×⊣=·Bits¨↕∘≠∘⊢`       |

* BQN `Bits` is `+´2{⌽𝕗|⌊∘÷⟜𝕗⍟(↕1+·⌊𝕗⋆⁼1⌈⊢)}`
