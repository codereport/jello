#!/usr/bin/env python3
"""Build a self-contained static site from the pinned interpreter and Jello sources."""

import json
import re
import runpy
import shutil
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from build_wasm import build_wasm

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "_site"


def read_challenges():
    text = (ROOT / "challenges.md").read_text(encoding="utf-8")
    examples = json.loads((ROOT / "data" / "challenge_inputs.json").read_text(encoding="utf-8"))
    titles = {}
    for match in re.finditer(r"^(\d+)\.\s+\[([^\]]+)\]", text, re.MULTILINE):
        titles[int(match[1])] = re.sub(r"^(?:PWC\s+\d+\s*-?\s*Task\s+\d+\s*:\s*|\d+\s*[.\-]\s*)", "", match[2])
    challenges = []
    for line in text.split("### Video Solutions", 1)[0].splitlines():
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        if len(cells) != 6 or not cells[0].isdigit():
            continue
        number = int(cells[0])
        example = examples.get(str(number))
        if not example or not 1 <= len(example["inputs"]) <= 2:
            raise ValueError(f"Add sample inputs for challenge #{number} in data/challenge_inputs.json")
        arguments = " ".join(json.dumps(value, ensure_ascii=False, separators=(",", ":")) for value in example["inputs"])
        expression = cells[4].strip("`")
        challenges.append({
            "number": number,
            "title": titles.get(number, f"LeetCode {cells[1]}" if cells[1] else f"PWC {cells[3]}"),
            "leetcode": cells[1],
            "contest": cells[2],
            "pwc": cells[3],
            "expression": expression,
            "jelly": cells[5].strip("`"),
            "command": f"{arguments} :: {expression}",
            "example": example,
        })
    if not challenges:
        raise ValueError("No solution programs found in challenges.md")
    return challenges


def build():
    jelly = ROOT / "jellyfish" / "jelly"
    if not (jelly / "interpreter.py").is_file():
        raise SystemExit("Initialize Jellyfish first: git submodule update --init --recursive")
    wasm = build_wasm()
    if DESTINATION.exists():
        shutil.rmtree(DESTINATION)
    shutil.copytree(ROOT / "web", DESTINATION, ignore=shutil.ignore_patterns("*.py", "__pycache__"))
    shutil.copyfile(wasm, DESTINATION / "jello-engine.wasm")
    shutil.copyfile(ROOT / "rust/LICENSE.txt", DESTINATION / "RUST-LICENSE.txt")
    shutil.copyfile(ROOT / "rust/target/THIRD-PARTY-LICENSES.txt", DESTINATION / "THIRD-PARTY-LICENSES.txt")
    (DESTINATION / ".nojekyll").touch()
    sources = [(path, f"jelly/{path.name}") for path in sorted(jelly.glob("*.py"))]
    sources += [(ROOT / "src" / name, name) for name in ("tokens.py", "language.py", "utils.py", "draw.py", "grid.py")]
    sources.append((ROOT / "web" / "runtime.py", "runtime.py"))
    sources += [(ROOT / "LICENSE", "JELLO-LICENSE.txt"), (ROOT / "jellyfish" / "LICENSE.txt", "JELLYFISH-LICENSE.txt")]
    with ZipFile(DESTINATION / "runtime.zip", "w", ZIP_DEFLATED) as archive:
        for source, name in sources:
            archive.writestr(ZipInfo(name, date_time=(2024, 1, 1, 0, 0, 0)), source.read_bytes(), compress_type=ZIP_DEFLATED)
    vocabulary = runpy.run_path(str(ROOT / "src" / "tokens.py"))
    words = [
        {"word": word, "atom": atom, "type": category}
        for category in ("monadic", "dyadic", "niladic", "quick", "separators")
        for word, atom in vocabulary[category].items()
    ]
    (DESTINATION / "keywords.json").write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")
    challenges = read_challenges()
    (DESTINATION / "challenges.json").write_text(json.dumps(challenges, ensure_ascii=False), encoding="utf-8")
    print(f"Built _site/ with {len(words)} keywords, {len(challenges)} challenges, and the pinned Jellyfish interpreter.")


if __name__ == "__main__":
    build()
