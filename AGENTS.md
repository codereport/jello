# Agent instructions

- Prefix commit messages with a Gitmoji shortcode, matching the existing history (for example, `:bug:` for fixes or `:memo:` for documentation).
- After each completed logical change, run the relevant checks, commit, and push the current branch. Report any commit or push failure.
- Keep commits focused and preserve unrelated user changes. Do not force-push or rewrite published history unless explicitly requested.
- Use the repo's `.venv` for Python commands and dependencies. Run Jello from the repo root with `.venv/bin/python src/jello.py`.
- Initialize dependencies with `git submodule update --init --recursive`, then install `requirements.txt` into `.venv`. If pip is unavailable, use `uv pip install --python .venv/bin/python -r requirements.txt`.
- Treat `jellyfish/` as an external dependency: keep its submodule revision pinned and change it only when the task requires it. Jello must use the same Python environment for Jellyfish rather than depend on a global `jelly` command.
- Run the existing tests from `src/` with `../.venv/bin/python test.py`. Confirm there are no `❌` results; the runner does not signal failures with its exit status.
- For interpreter changes, also check that `5 :: range` returns `[1, 2, 3, 4, 5]` in the REPL.
- Update `README.md` when setup or user-facing behavior changes. Keep changes small and follow the surrounding code style.
- The browser UI lives in `web/`; build it with `python3 scripts/build_site.py`. Do not commit `_site/`. Both REPLs share `src/language.py`, `src/tokens.py`, and the pinned Jellyfish interpreter.
- For browser changes, run `npm test` (Playwright, desktop and mobile). For runtime changes, also run `.venv/bin/python -m unittest discover -s tests -p 'test_*.py'`. GitHub Actions deploys Pages after tests pass.
