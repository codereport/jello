### Cuts

The name [cut](https://code.jsoftware.com/wiki/Vocabulary/semidot) is borrowed from J.

|   Keyword    | Type  |  Arguments  |               Description               |
| :----------: | :---: | :---------: | :-------------------------------------: |
|   `filter`   | quick | unary pred  |      keeps values satisfying pred       |
| `filter_in`  | dyad  |             |        takes value(s) and keeps         |
| `filter_out` | dyad  |             |       takes value(s) and removes        |
|    `keep`    | dyad  |   2 lists   |      keeps truthy values from mask      |
|  `keep_not`  | dyad  |   2 lists   |      keeps falsy values from mask       |
|    `part`    | monad |   1 list    |        partitions on values < 1         |
| 🟡 `part_len` | monad |   1 list    |   length of partitions on values < 1    |
| `part_after` | dyad  |   2 lists   | partitions on masks after truthy values |
|   `group`    | monad |   1 list    |     groups contiguous equal values      |
| `group_len`  | monad |   1 list    |    length of contiguous equal values    |
| 🟡 `group_by` | quick | binary pred |     group based on satisfying pred      |
|  `key_idx`   | monad |   1 list    |          "key" groups indices           |
|    `key`     | quick |  unary fn   |  applies fn to values of key (Counter)  |
| 🟡 `key_len`  | monad |   1 list    |     len of values of key (Counter)      |

### TODO

* Rename `part` -> something
* Make `part` a quick that takes a unary fn like `key`
* Rename `group`