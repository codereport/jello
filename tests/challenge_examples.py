"""Offline source examples shared by the Python, native Rust, and Wasm tests."""

import json
from pathlib import Path

from build_site import read_challenges
from runtime import canonical

ROOT = Path(__file__).resolve().parents[1]


def read_examples():
    sources = json.loads((ROOT / "data/challenge_examples.json").read_text(encoding="utf-8"))
    challenges = read_challenges()
    if set(sources) != {str(challenge["number"]) for challenge in challenges}:
        raise ValueError("Keep data/challenge_examples.json in sync with challenges.md")
    for challenge in challenges:
        source = sources[str(challenge["number"])]
        if not source["examples"]:
            raise ValueError(f"Add source examples for challenge #{challenge['number']}")
        for number, example in enumerate(source["examples"], 1):
            arguments = [json.dumps(value, ensure_ascii=False) for value in example["inputs"]]
            yield challenge, {
                **example,
                "number": number,
                "source": source["source"],
                "arguments": arguments,
                "command": f"{' '.join(arguments)} :: {challenge['expression']}",
            }


def expected_value(example):
    expected = example["expected"]
    if isinstance(expected, bool):
        expected = int(expected)  # Jelly represents booleans as 0 and 1.
    return canonical(expected)
