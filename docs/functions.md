### Compactions

|   Keyword    |  Type   | Arguments  |          Description          |
| :----------: | :-----: | :--------: | :---------------------------: |
|   `filter`   | 1-quick | unary pred | keeps values satisfying pred  |
| `filter_in`  |  dyad   |            |   takes value(s) and keeps    |
| `filter_out` |  dyad   |            |  takes value(s) and removes   |
|    `keep`    |  dyad   |  2 lists   | keeps truthy values from mask |
|  `keep_not`  |  dyad   |  2 lists   | keeps falsy values from mask  |

### Cuts

The name [cut](https://code.jsoftware.com/wiki/Vocabulary/semidot) is borrowed from J. Also, what J calls [infixes](https://code.jsoftware.com/wiki/Vocabulary/bslash#dyadic) (aka `slide`s and `chunk`s) are included here (integer cuts).

There are:

* predicate cuts
* mask cuts
* function (key) cuts
* frequency hash map (fhm) cuts
* integer cuts

Mask cuts and predicate cuts can drop values.

🚧 WIP 🚧

|        Cut        |    Cut Type    |    Cut Mechanism     | Drop? | Unary Op?  | Cut Op? |
| :---------------: | :------------: | :------------------: | :---: | :--------: | :-----: |
| 🟡 `part_by_with`  |   predicate    |   unary predicate    |   🟢   |     🟢      |    🟢    |
|     `part_by`     |   predicate    |   unary predicate    |   🟢   |     no     |    🟢    |
|    `part_with`    | specialization | `> 0 : part_by_with` |   🟢   |     🟢      |   no    |
|    `part_len`     | specialization |   `len part_with`    |   🟢   | 🟢 (`len`)  |   no    |
|      `part`       | specialization |   `> 0 : part_by`    |   🟢   |     no     |   no    |
|   `part_after`    |      mask      |     after truthy     |  no   |     no     |   no    |
| 🟡 `group_by_with` |   predicate    |   binary predicate   |  no   |     🟢      |    🟢    |
|   🟡 `group_by`    |   predicate    |   binary predicate   |  no   |     no     |    🟢    |
|  🟡 `group_with`   |   predicate    |   binary predicate   |  no   |     🟢      |   no    |
|      `group`      | specialization |     `= group_by`     |  no   |     no     |   no    |
|    `group_len`    | specialization |   `group len_each`   |  no   | 🟢 (`len`)  |   no    |
|       `key`       |      fhm       |       identity       |  no   |     🟢      |    -    |
|      `chunk`      |    integer     |       integer        |  no   |     no     |    -    |
|   `chunk_fold`    |    integer     |       integer        |  no   | 🟢 (`fold`) |    -    |
|      `slide`      |    integer     |       integer        |  no   |     no     |    -    |
|   `slide_fold`    |    integer     |       integer        |  no   | 🟢 (`fold`) |    -    |

|   Keyword    |  Type   |  Arguments  |               Description               |
| :----------: | :-----: | :---------: | :-------------------------------------: |
|    `part`    |  monad  |   1 list    |        partitions on values < 1         |
|  `part_by`   | 1-quick |   1 list    |      partitions on unary function       |
|  `part_len`  |  monad  |   1 list    |   length of partitions on values < 1    |
| `part_after` |  dyad   |   2 lists   | partitions on masks after truthy values |
| `group_len`  |  monad  |   1 list    |    length of contiguous equal values    |
|   `group`    |  monad  |   1 list    |     groups contiguous equal values      |
| 🟡 `chunk_by` | 2-quick | binary pred |     group based on satisfying pred      |
|  `key_idx`   |  monad  |   1 list    |          "key" groups indices           |
|  `key_with`  | 1-quick |  unary fn   |  applies fn to values of key (Counter)  |
| 🟡 `key_len`  |  monad  |   1 list    |     len of values of key (Counter)      |

### TODO

* Rename `part` -> something
* Make `part` a quick that takes a unary fn like `key`
* Rename `group`