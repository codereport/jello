#!/usr/bin/env python3
"""Build a self-contained static site from the pinned interpreter and Jello sources."""

import json
import runpy
import shutil
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "_site"


def build():
    jelly = ROOT / "jellyfish" / "jelly"
    if not (jelly / "interpreter.py").is_file():
        raise SystemExit("Initialize Jellyfish first: git submodule update --init --recursive")
    if DESTINATION.exists():
        shutil.rmtree(DESTINATION)
    shutil.copytree(ROOT / "web", DESTINATION, ignore=shutil.ignore_patterns("*.py", "__pycache__"))
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
    print(f"Built _site/ with {len(words)} keywords and the pinned Jellyfish interpreter.")


if __name__ == "__main__":
    build()
