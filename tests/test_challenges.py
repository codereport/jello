#!/usr/bin/env -S .venv/bin/python

import argparse
import json
import os
import sys
import unittest
from pathlib import Path

from colorama import Fore, Style

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "scripts"), str(ROOT / "web"), str(ROOT / "src")]

from build_site import read_challenges
from challenge_examples import expected_value, read_examples
from runtime import evaluate


class ChallengeTestResult(unittest.TextTestResult):
    def __init__(self, stream, descriptions, verbosity):
        super().__init__(stream, descriptions, verbosity)
        self.dots = self.showAll = False
        self.passed = 0
        self.use_color = stream.isatty() and "NO_COLOR" not in os.environ

    def colored(self, text, color):
        return f"{color}{text}{Style.RESET_ALL}" if self.use_color else text

    def startTest(self, test):
        super().startTest(test)
        self.stream.writeln(test.shortDescription() or self.getDescription(test))

    def addSubTest(self, test, subtest, err):
        super().addSubTest(test, subtest, err)
        if err is None:
            self.passed += 1
            self.stream.write(self.colored(".", Fore.GREEN))
        elif issubclass(err[0], test.failureException):
            self.stream.write(self.colored("F", Fore.RED))
        else:
            self.stream.write(self.colored("E", Fore.RED))
        self.stream.flush()

    def stopTest(self, test):
        super().stopTest(test)
        self.stream.writeln()

    def printErrorList(self, flavour, errors):
        super().printErrorList(self.colored(flavour, Fore.RED), errors)


class ChallengeTestRunner(unittest.TextTestRunner):
    resultclass = ChallengeTestResult

    def run(self, test):
        result = super().run(test)
        failed, errors, skipped = len(result.failures), len(result.errors), len(result.skipped)
        total = result.passed + failed + errors + skipped
        self.stream.writeln()
        self.stream.writeln(f"Summary: {total} example checks")
        self.stream.writeln(" | ".join((
            result.colored(f"{result.passed} passed", Fore.GREEN),
            result.colored(f"{failed} failed", Fore.RED if failed else Fore.GREEN),
            result.colored(f"{errors} errors", Fore.RED if errors else Fore.GREEN),
            result.colored(f"{skipped} skipped", Fore.YELLOW if skipped else Fore.GREEN),
        )))
        challenges = sorted({
            case.params["challenge"] for case, _ in result.failures + result.errors
            if hasattr(case, "params") and "challenge" in case.params
        })
        if challenges:
            self.stream.writeln(result.colored(
                "Failing challenges: " + ", ".join(f"#{number}" for number in challenges), Fore.RED))
        return result


class ChallengeExampleTests(unittest.TestCase):
    challenge_number = None

    def test_all_source_examples(self):
        """Source examples (. = pass, F = failure, E = error)"""
        for challenge, example in read_examples():
            if self.challenge_number is not None and challenge["number"] != self.challenge_number:
                continue
            with self.subTest(challenge=challenge["number"], example=example["number"],
                              source=example["source"], command=example["command"]):
                result = json.loads(evaluate(example["command"]))
                self.assertEqual(result["code"], challenge["jelly"])
                self.assertEqual(result["value"], expected_value(example),
                                 f"Expected {example['expected']!r}; displayed {result['result']!r}")

    def test_sourced_examples_run_with_the_documented_programs(self):
        """Picker samples (. = pass, F = failure, E = error)"""
        for challenge in read_challenges():
            if self.challenge_number is not None and challenge["number"] != self.challenge_number:
                continue
            with self.subTest(challenge=challenge["number"], command=challenge["command"]):
                result = json.loads(evaluate(challenge["command"]))
                expected = challenge["example"]["expected"]
                if isinstance(expected, bool):
                    expected = int(expected)  # Jelly represents booleans as 0 and 1.
                self.assertEqual(json.loads(result["result"]), expected)
                self.assertEqual(result["code"], challenge["jelly"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run challenge examples with colored results and a summary.",
        epilog="Standard unittest options such as -v, -f, and -k are also supported.",
    )
    parser.add_argument("--challenge", type=int, choices=[challenge["number"] for challenge in read_challenges()],
                        metavar="NUMBER", help="run only this challenge's source examples and picker sample")
    options, unittest_args = parser.parse_known_args()
    ChallengeExampleTests.challenge_number = options.challenge
    unittest.main(argv=[sys.argv[0], *unittest_args], testRunner=ChallengeTestRunner)
