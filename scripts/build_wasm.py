#!/usr/bin/env python3
"""Compile the pinned Rust evaluator for the browser."""

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
    return ROOT / "rust/target/wasm32-unknown-unknown/release/jello_engine.wasm"


if __name__ == "__main__":
    print(build_wasm())
