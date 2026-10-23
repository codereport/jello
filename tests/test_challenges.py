import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "scripts"), str(ROOT / "web"), str(ROOT / "src")]

from build_site import read_challenges
from runtime import evaluate


class ChallengeExampleTests(unittest.TestCase):
    def test_sourced_examples_run_with_the_documented_programs(self):
        for challenge in read_challenges():
            with self.subTest(challenge=challenge["number"], command=challenge["command"]):
                result = json.loads(evaluate(challenge["command"]))
                expected = challenge["example"]["expected"]
                if isinstance(expected, bool):
                    expected = int(expected)  # Jelly represents booleans as 0 and 1.
                self.assertEqual(json.loads(result["result"]), expected)
                self.assertEqual(result["code"], challenge["jelly"])


if __name__ == "__main__":
    unittest.main()
