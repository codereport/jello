#!/usr/bin/env python3
"""Compile the pinned Rust evaluator for the browser."""

import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build_wasm():
    cargo = shutil.which("cargo")
    if not cargo:
        raise SystemExit("Install Rust with rustup before building the browser backend; see README.md.")
    subprocess.run([
        cargo, "build", "--locked", "--release", "--lib",
        "--target", "wasm32-unknown-unknown", "--manifest-path", str(ROOT / "rust/Cargo.toml"),
    ], cwd=ROOT, check=True)
    metadata = json.loads(subprocess.check_output([
        cargo, "metadata", "--locked", "--format-version", "1",
        "--manifest-path", str(ROOT / "rust/Cargo.toml"),
    ], cwd=ROOT))
    notices = []
    for package in metadata["packages"]:
        if package["name"] == "jello-engine":
            continue
        directory = Path(package["manifest_path"]).parent
        for path in sorted(directory.glob("LICENSE*")):
            if path.is_file():
                notices.append(f"{package['name']} {package['version']} — {path.name}\n{path.read_text(encoding='utf-8')}\n")
    (ROOT / "rust/target/THIRD-PARTY-LICENSES.txt").write_text("\n".join(notices), encoding="utf-8")
    return ROOT / "rust/target/wasm32-unknown-unknown/release/jello_engine.wasm"


if __name__ == "__main__":
    print(build_wasm())
