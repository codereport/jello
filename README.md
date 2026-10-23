# <p align="center">🟢🟡🔴 Jello 🔴🟡🟢</p>

<p align="center">
    <a href="https://github.com/codereport/jello/issues" alt="contributions welcome">
        <img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat" /></a>
    <a href="https://lbesson.mit-license.org/" alt="MIT license">
        <img src="https://img.shields.io/badge/License-MIT-blue.svg" /></a>
    <a href="https://www.python.org/">
        <img src="https://img.shields.io/badge/Python-3-ff69b4.svg"/></a>
    <a href="https://github.com/codereport?tab=followers" alt="GitHub followers">
        <img src="https://img.shields.io/github/followers/codereport.svg?style=social&label=Follow" /></a>
    <a href="https://GitHub.com/codereport/jello/stargazers/" alt="GitHub stars">
        <img src="https://img.shields.io/github/stars/codereport/jello.svg?style=social&label=Star" /></a>
    <a href="https://twitter.com/code_report" alt="Twitter">
        <img src="https://img.shields.io/twitter/follow/code_report.svg?style=social&label=@code_report" /></a>
</p>

## Description

A Python script for wrapping the Jellyfish (a fork of Jelly) executable so you can more easily play with the language.

[**Try the Jello playground →**](https://codereport.github.io/jello/)

![image](https://github.com/codereport/jello/assets/36027403/26c99f84-36a2-4857-b0f0-1b8f5bd4eef9)

## Installation

Jellyfish is included as a Git submodule and installed into the same Python environment as Jello.

```sh
git clone --recurse-submodules https://github.com/codereport/jello.git
cd jello
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python src/jello.py
```

For an existing clone, run `git submodule update --init --recursive` before installing the requirements.

At the prompt, try `5 :: range`. Enter `q` to quit.

## Browser playground

The [playground](https://codereport.github.io/jello/) is a dark, monospace terminal with a Rust/WebAssembly evaluator and the pinned Python/Jellyfish interpreter through Pyodide. The expression bar sits above the evaluation session. It includes examples, evaluation traces, combinator diagrams, a searchable keyword reference, local command history, and shareable expression links. Stop cancels a calculation; each engine has a 10-second execution limit.

Rust runs first and displays its result, trace, and diagram immediately. Python runs afterward in a separate worker and verifies both the output and structured value. **✓ match** appears when they agree, including exact large integers and nested list structure. Python timeouts or errors keep the Rust result visible with an **unverified** status; a mismatch shows both outputs. New evaluations cancel obsolete verification. Unsupported Rust operations or input types fall back to Python, and Rust download failures also leave Python available. If Python cannot load, Rust remains usable and **Retry** reloads Python verification.

Turn **Live mode** on in the **settings gear** to evaluate automatically after a 600 ms typing pause. Accepting an autocomplete suggestion with Tab, Enter, or a click evaluates immediately, skipping the typing delay. With the dropdown closed, Tab also evaluates a pending edit while moving focus normally; Enter submits a complete expression immediately. Edits update one preview, and a newer expression supersedes a slow preview. Turn it off to return to manual evaluation with Enter or Run. Automatic previews do not fill command history; explicit runs are remembered. Shared links still wait for you to edit or run the expression.

The converted Jelly expression appears in larger type to the right of the expression bar and updates as you type. In live mode, Run is hidden; Stop remains available during a calculation. Manual sessions keep Run and the Jelly code alongside each result in their history.

The bottom-right corner shows the [Rust logo](https://github.com/rust-lang/rust-artwork/tree/main/logo), Rust execution time, [Python logo](https://www.python.org/community/logos/), Python time, and verification status. It stays visible in live and presentation modes. Each time includes that engine's traces and diagrams and excludes interpreter loading, the typing delay, and waiting for the other engine. Python fallback shows its own execution time. The Rust logo is used unmodified under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).

Press **Shift+C** to open the searchable challenge picker, including from the expression editor. You can also choose **Browse challenges** in settings. Search by problem title, number, contest, or program; use the arrow keys and Enter to select, or Escape to close. Each challenge loads a complete example with sample inputs and the solution from [challenges.md](challenges.md). For example, Score of a String loads `"hello" :: ord deltas abs sum`, which returns `13`. Live mode evaluates the new expression automatically; manual mode waits for Enter or Run.

The catalog combines `challenges.md` with [sample inputs and expected Jello results](data/challenge_inputs.json) at build time. Samples come from the linked LeetCode and Weekly Challenge problem pages; each picker entry has a **Sample source** link. Inputs follow the argument order expected by the Jello solution. When adding a challenge, add its sourced example to the data file too. The build uses these saved examples and needs no access to the problem sites.

The **settings gear** in the REPL toolbar saves your preferences in this browser: live mode, examples, keywords, theme, and presentation mode. Choose the original **Terminal** theme or [**Dracula**](https://draculatheme.com/contribute). **Presentation mode** centers the REPL, increases the expression and result text size, and hides the surrounding UI. The gear stays available to exit presentation mode; your examples and keywords preferences are preserved. Hiding the keyword reference keeps autocomplete and syntax highlighting available.

Keyword suggestions appear as you type after `::`. Click a suggestion, or use the arrow keys and Enter to select it. In live mode, Tab accepts the selected suggestion and closes the dropdown while keeping focus in the editor. In manual mode, Tab completes and cycles through matches. Escape closes suggestions; the arrow keys then browse command history. Syntax highlighting uses green for monads, cyan for dyads, purple for quicks, amber for nilads and input values, and gray for separators, including in the input and evaluation traces.

The first visit loads the Rust evaluator from this site and downloads the Python runtime and dependencies from jsDelivr and PyPI in the background. Rust results do not wait for Python to initialize. Pyodide is pinned to 0.27.7 (Python 3.12) for compatibility with Jellyfish. There is no application server; both engines execute in dedicated browser workers. Shared links load the expression for you to review and run. Terminal commands such as `--find-by-example` are not included.

To preview locally, initialize the submodule and install [Rust using rustup](https://rustup.rs/), then run:

```sh
python3 scripts/build_site.py
python3 -m http.server 8000 --directory _site
```

Open `http://localhost:8000`. The build compiles `rust/` with the pinned toolchain and locked dependencies into `_site/jello-engine.wasm`, packages Python sources into `_site/runtime.zip`, includes runtime licenses, and generates the wordbook from `src/tokens.py`. Edit the interface in `web/`, then rebuild. Generated files in `_site/` and `rust/target/` are not committed.

To run the browser and adapter tests:

```sh
npm ci
npx playwright install chromium
npm test
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
```

Set `CHROMIUM_PATH` to use an existing Chromium installation. Set `PLAYGROUND_URL` to test a deployed site instead of a local build. GitHub Actions tests both the terminal and browser versions before deploying the static site to GitHub Pages on pushes to `main`. The repository's Pages publishing source should be **GitHub Actions**.

## Rust evaluator

The [Rust evaluator](rust/README.md) implements the Jellyfish operations used by all 30 challenge examples, with Python comparisons covering varied inputs, large integers, Unicode, nested arrays, and diagrams in both native and Wasm builds. Install [Rust using rustup](https://rustup.rs/) to run its tests; `rust-toolchain.toml` pins the toolchain and WebAssembly target. Rust currently supports integer arithmetic; floating-point, complex, random, dynamic evaluation, and Python-specific input syntax use Python. Arrays and reductions remain eager, with allocation, recursion, operation, and output limits. There are no range-sum shortcuts or operation-fusion optimizations.

```sh
cargo build --locked --release --manifest-path rust/Cargo.toml
.venv/bin/python -m unittest discover -s tests -p 'test_rust.py'
.venv/bin/python scripts/build_wasm.py
```

## Links

### Jelly(fish) Links

* [Jelly GitHub Repo](https://github.com/DennisMitchell/jellylanguage/)
* [Jelly Online Interpreter](https://jellyballs.github.io/)
* [Jellyfish Repo 🪼](https://github.com/codereport/jellyfish)

### Livestreams

* [Jello LiveStream I](https://youtube.com/live/jM7UCu220CU)
* [Jello LiveStream II](https://www.youtube.com/watch?v=nnskDAOHRCU)
* [Jello LiveStream III](https://www.youtube.com/watch?v=zOB5D_NgVJU&t)
* [Jello LiveStream IV (Top 10)](https://www.youtube.com/watch?v=XkLsy_I_H6w)
* [Jello LiveStream V (PWC)](https://www.youtube.com/watch?v=tNaZykHHHWs)
* [Jello LiveStream VI (`bits`, `keep`, `cuts.md`, `--find-by-example`)](https://www.youtube.com/watch?v=RAUbKNeA2LA)
* [Jello LiveStream VII (`maxs`, `cuts`, Combinators i.e. `Φ.₂`)](https://www.youtube.com/watch?v=AHLe0wfiu3s)

### YouTube Videos

* [BQN vs Jelly](https://www.youtube.com/watch?v=k9BNn39gWiM)

## Chain Patterns

### Special Chain Names

* **LCC:** [Leading Constant Chain](https://github.com/DennisMitchell/jellylanguage/wiki/Tutorial#whats-the-starting-value)
* **LDC:** Leading Dyadic Chain (described in the first bullet [here](https://github.com/DennisMitchell/jellylanguage/wiki/Tutorial#43dyadic-chains))
* **JL:** Just use Left Arg (as `v`)

### Monadic Chains

**Q: What makes my chain monadic?** <br>
A: If you only pass it one argument (aka `ω`)

|       | Chain pattern | New `v` value | Chain Type |     Name     |  IC   |  SC   |
| :---: | :-----------: | :-----------: | :--------: | :----------: | :---: | :---: |
|   1   |   `+ F ...`   |   `v+F(ω)`    |   `2-1`    | `dyad-monad` |   S   |   Φ   |
|   2   |   `+ 1 ...`   |     `v+1`     |   `2-0`    | `dyad–nilad` |   d   |   Δ   |
|   3   |   `1 + ...`   |     `1+v`     |   `0-2`    | `nilad-dyad` |   d   |   D   |
|   4   |    `+ ...`    |     `v+ω`     |    `2`     |    `dyad`    |   W   |   Σ   |
|   5   |    `F ...`    |    `F(v)`     |    `1`     |   `monad`    |   m   |   B   |

* IC = Initial Combinator
* SC = Subsequent Combinator
* m  = Monadic function application
* d  = Dyadic function application

### Dyadic Chains

**Q: What makes my chain dyadic?** <br>
A: If you pass it two arguments (aka `λ` and `ρ`)

|       | Chain pattern | New `v` value | Chain Type |       Name        |  IC   |  SC   |
| :---: | :-----------: | :-----------: | :--------: | :---------------: | :---: | :---: |
|   1   |  `+ × 1 ...`  |  `(v+ρ)×1`*   |  `2-2-0`   | `dyad-dyad-nilad` |       |       |
|   2   |   `+ × ...`   |   `v+(λ×ρ)`   |   `2-2`    |    `dyad-dyad`    |  Φ₁   |  Φ₁   |
|   3   |   `+ 1 ...`   |     `v+1`     |   `2-0`    |   `dyad-nilad`    |  Kd   |   ε   |
|   4   |   `1 + ...`   |     `1+v`     |   `0-2`    |   `nilad-dyad`    |  πd   |   E   |
|   5   |    `+ ...`    |     `v+ρ`     |    `2`     |      `dyad`       |   d   |  ε'   |
|   6   |    `F ...`    |    `F(v)`     |    `1`     |      `monad`      |  Km   |  B₁   |

## Combinator Table (WIP)

| Combinator | Chain Spelling |
| :--------: | :------------: |
|     S      | `2-1` monadic  |
|     B₁     |  `2-1` dyadic  |
|     E      |
|     ε      |

## Examples

### Example 1 (from [Section 1](https://github.com/DennisMitchell/jellylanguage/wiki/Tutorial#1tacit-programming))

`+H` can be called monadically or dyadically, and is a `2-1` chain.
* If called monadically, its a `2-1` monadic train, aka the `S` combinator.
* If called dyadically, it is a `JL`+`5`+`6`, which ends up being the `B₁` combinator.

### Example 2 (from [Section 4.2](https://github.com/DennisMitchell/jellylanguage/wiki/Tutorial#42monadic-chains))

`+²×` can be called **monadically** or dyadically, and it is a `2-1-2` chain.
* If called monadically, `S` forms a monadic function, that is then used in `Σ`
* If called dyadically, the `2-1` is the `B₁` combinator, and then used in a `Φ₁` where the left dyadic function is `⊢`.

### Example 3 (from [Section 4.3](https://github.com/DennisMitchell/jellylanguage/wiki/Tutorial#43dyadic-chains))

`+×÷H` can be called monadically and **dyadically**, and it is a `2-2-2-1` chain.
* If called monadically, apply `W` is applied, then evalaate the `2-2` part as repeated (or 2) `S` combinators, and then the `2-1` chain at the end matches the `S` combinator.
* If called dyadically, we have a LDC, which means the `2-2-2` forms the `Φ₁` which yield a binary function that is then used in the sits inside a `B₁` along with the final monadic operation.
