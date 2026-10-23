# Jello's Rust evaluator

An independent implementation of the Jellyfish execution rules used by Jello's
challenge programs. The core builds as a native binary and a WebAssembly library.
It uses eager arrays and ordinary reductions; it does not fuse operations or
replace programs with mathematical shortcuts.

Train composition, quicks, vectorization, nested arrays, character values, and
arbitrary-precision integer and finite 64-bit floating-point arithmetic follow the pinned interpreter in
`../jellyfish/`. The port retains the upstream MIT license in `LICENSE.txt`.

Install Rust with [rustup](https://rustup.rs/). The repository's
`rust-toolchain.toml` pins the compiler and browser target. Then run:

```sh
cargo build --locked --release --manifest-path rust/Cargo.toml
.venv/bin/python -m unittest discover -s tests -p 'test_rust.py'
.venv/bin/python scripts/build_wasm.py
```

The native executable `rust/target/release/jello-engine` reads one JSON request per
line and writes one JSON response per line:

```json
{"code":"R²S","arguments":["5"],"prefixes":["R","R²","R²S"],"arities":[1,1,1]}
```

Requests use converted Jelly code and raw argument strings, so the interpreter
does not duplicate Jello's keyword vocabulary. Responses distinguish `result`,
`unsupported`, and `error`. Unsupported atoms and numeric/input domains must fall
back to Python. Numeric support includes mixed integer/float arithmetic,
fractional division, floor division and modulo, powers, square roots, rounding,
reductions, and comparisons. Exact integer division retains its integer type;
fractional division produces a float. JSON decimal/exponent inputs are accepted.
Complex and non-finite values, operations outside the supported numeric domain,
random operations, Python-specific input syntax, and dynamic evaluation remain
on Python. Allocation, recursion, operation, and output limits bound resource use.

The `value` field carries tagged values with decimal integer strings and exact
float bit patterns encoded as 16 hexadecimal digits in big-endian order. It preserves
list structure and values above JavaScript's safe integer range independently
of Jelly's display rules, which unwrap singletons and join character arrays.
Optional keyword arities generate the same combinator diagrams as the Python
renderer without waiting for Python verification.

The Wasm library exports `engine_alloc`, `engine_evaluate`, and `engine_free`.
Requests and responses are UTF-8 JSON. Evaluation returns an `i64` containing the
output pointer in the high 32 bits and its length in the low 32 bits. The worker
copies the output and frees both buffers. No generated JavaScript binding tool
is required.
