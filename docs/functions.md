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
<!-- |      `part`       |  monad  | specialization |   `> 0 : part_by`    |   🟢   |     no     |   no    | -->
<!-- |    `part_len`     |  monad  | specialization |   `len part`    |   🟢   | 🟢 (`len`)  |   no    | -->
<!-- |     `part_by`     | 2-quick |   predicate    |   unary predicate    |   🟢   |     no     |    🟢    | -->

|     Cut      |  Type   |    Cut Type    |  Cut Mechanism   | Drop? | Unary Op?  | Cut Op? |
| :----------: | :-----: | :------------: | :--------------: | :---: | :--------: | :-----: |
| 🟡 `part_by`  | 2-quick |   predicate    | unary predicate  |   🟢   |     🟢      |    🟢    |
|    `part`    | 1-quick |   predicate    | `> 0 : part_by`  |   🟢   |     🟢      |   no    |
| `part_after` |  dyad   |      mask      |   after truthy   |  no   |     no     |   no    |
| 🟡 `group_by` | 1-quick |   predicate    | binary predicate |  no   |     🟢      |    🟢    |
|   `group`    | 1-quick | specialization |   `= group_by`   |  no   |     🟢      |   no    |
|    `key`     | 1-quick |      fhm       |     identity     |  no   |     🟢      |    -    |
|   `chunk`    |  dyad   |    integer     |     integer      |  no   |     no     |    -    |
| `chunk_fold` | 1-quick |    integer     |     integer      |  no   | 🟢 (`fold`) |    -    |
|   `slide`    |  dyad   |    integer     |     integer      |  no   |     no     |    -    |
| `slide_fold` | 1-quick |    integer     |     integer      |  no   | 🟢 (`fold`) |    -    |
