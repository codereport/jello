### Compactions

|   Keyword    |  Type   | Arguments  |          Description          |
| :----------: | :-----: | :--------: | :---------------------------: |
|   `filter`   | 1-quick | unary pred | keeps values satisfying pred  |
| `filter_in`  |  dyad   |            |   takes value(s) and keeps    |
| `filter_out` |  dyad   |            |  takes value(s) and removes   |
|    `keep`    |  dyad   |  2 lists   | keeps truthy values from mask |
|  `keep_not`  |  dyad   |  2 lists   | keeps falsy values from mask  |

### Cuts

The name [cut](https://code.jsoftware.com/wiki/Vocabulary/semidot) is borrowed from J. Also, what J calls [infixes](https://code.jsoftware.com/wiki/Vocabulary/bslash#dyadic) (aka `slide`s and `chunk`s) are included here.

There are:

* predicate cuts
* mask cuts
* function (key) cuts
* frequency hash map (fhm) cuts

Mask cuts and predicate cuts can drop values.

🚧 WIP 🚧

|             Cut              |    Cut Type    |  Cut Mechanism   | Drop? |   Fold?   |
| :--------------------------: | :------------: | :--------------: | :---: | :-------: |
|        🟡 `pred_part`         |   predicate    | unary predicate  |   🟢   |    no     |
|            `part`            | specialization |  `<1 pred_part`  |   🟢   |    no     |
|          `part_len`          | specialization | `part len_each`  |   🟢   | 🟢 (`len`) |
| 🟡 `part_by` / `chunk_by_key` |    function    |  unary function  |  no   |    no     |
|         `part_after`         |      mask      |   after truthy   |  no   |    no     |
|  🟡 `group_by` / `chunk_by`   |   predicate    | binary predicate |  no   |    no     |
|           `group`            | specialization |   `= group_by`   |  no   |    no     |
|         `group_len`          | specialization | `group len_each` |  no   | 🟢 (`len`) |
|            `key`             |      fhm       |     identity     |  no   |     🟢     |

> Q: Why do `part`, `pred_part`, `part_by`, `group` and `group_by` all not `fold`? And should there be versions that do like key? Or should they all be converted to version that do.

|   Keyword    |  Type   |  Arguments  |               Description               |      Future       |
| :----------: | :-----: | :---------: | :-------------------------------------: | :---------------: |
|    `part`    |  monad  |   1 list    |        partitions on values < 1         |
| 🟡 `part_by`  | 1-quick |   1 list    |      partitions on unary function       |
| 🟡 `part_len` |  monad  |   1 list    |   length of partitions on values < 1    |
| `part_after` |  dyad   |   2 lists   | partitions on masks after truthy values |
|   `group`    |  monad  |   1 list    |     groups contiguous equal values      |    `id group`     |
| `group_len`  |  monad  |   1 list    |    length of contiguous equal values    |    `len group`    |
|              | 1-quick |             |                                         |      `group`      |
| 🟡 `group_by` | 2-quick | binary pred |     group based on satisfying pred      | `f pred group_by` |
|  `key_idx`   |  monad  |   1 list    |          "key" groups indices           |
|    `key`     | 1-quick |  unary fn   |  applies fn to values of key (Counter)  |       `key`       |
|              | 2-quick |             |                                         |   `f g key_on`    |
| 🟡 `key_len`  |  monad  |   1 list    |     len of values of key (Counter)      |     `len key`     |

### TODO

* Rename `part` -> something
* Make `part` a quick that takes a unary fn like `key`
* Rename `group`