import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "web"), str(ROOT / "src")]

from runtime import evaluate, split_arguments


class BrowserRuntimeTests(unittest.TestCase):
    def test_matches_terminal_interpreter(self):
        for command in (
            "5 :: range sq sum", "10 :: range odd? filter",
            "[3,1,4,1,5] :: sums", "6 7 :: *", "42 :: bits",
            "11 :: is_prime", "12 :: factors", '"hello world" :: rev',
        ):
            with self.subTest(command=command):
                result = json.loads(evaluate(command))
                args = split_arguments(command.split("::", 1)[0])
                terminal = subprocess.run([sys.executable, "-m", "jelly", "eun", result["code"], *args], check=True, text=True, capture_output=True)
                self.assertEqual(result["result"], terminal.stdout.strip())

    def test_trace_uses_full_prefixes(self):
        result = json.loads(evaluate("5 :: range sq sum"))
        self.assertEqual(result["result"], "55")
        self.assertEqual(result["steps"], [
            {"code": "R", "result": "[1, 2, 3, 4, 5]"},
            {"code": "R²", "result": "[1, 4, 9, 16, 25]"},
            {"code": "R²S", "result": "55"},
        ])
        self.assertEqual(result["arity"], "1-1-1")
        self.assertEqual(result["chain"], "BB")

    def test_spaced_and_quoted_arguments(self):
        self.assertEqual(split_arguments('[1, 2, [3, 4]] "hello world"'), ['[1, 2, [3, 4]]', '"hello world"'])
        self.assertEqual(json.loads(evaluate("[1, 2, 3] :: sum"))["result"], "6")

    def test_invalid_inputs(self):
        for command in ("5 range", "5 ::", "5 :: nonexistent", "1 2 3 :: +", "[1, 2 :: sum", "[1) :: sum"):
            with self.subTest(command=command):
                with self.assertRaises(ValueError):
                    evaluate(command)

    def test_error_does_not_poison_next_evaluation(self):
        with self.assertRaises(ValueError):
            evaluate("5 :: nonexistent")
        self.assertEqual(json.loads(evaluate("5 :: range"))["result"], "[1, 2, 3, 4, 5]")

    def test_comparison_values_preserve_precision_and_structure(self):
        self.assertEqual(json.loads(evaluate("9007199254740993 :: sq"))["value"], ["integer", "81129638414606699710187514626049"])
        self.assertEqual(json.loads(evaluate("[1] :: rev"))["value"], ["list", [["integer", "1"]]])
        self.assertEqual(json.loads(evaluate("1 :: i"))["value"], ["integer", "1"])


if __name__ == "__main__":
    unittest.main()
