"""Compare the actual native Rust engine with the pinned Python interpreter."""

import io
import json
import random
import shutil
import struct
import subprocess
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "scripts"), str(ROOT / "web"), str(ROOT / "src")]

import jelly
from build_site import read_challenges
from build_wasm import build_wasm
from language import convert, keyword_arity
from runtime import ARGUMENT_ATOMS, evaluate, split_arguments


def canonical(value):
    if type(value) == int:
        return ["integer", str(value)]
    if type(value) == str:
        return ["character", value]
    if type(value) == list:
        return ["list", [canonical(item) for item in value]]
    if type(value) == float:
        return ["float", struct.pack(">d", value).hex()]
    return ["other", repr(value)]


def reference(code, arguments):
    for symbol, call in ARGUMENT_ATOMS.items():
        jelly.atoms[symbol].call = call
    parsed = [jelly.try_eval(argument) for argument in arguments]
    for index, argument in enumerate(parsed):
        jelly.atoms["³⁴⁵⁶⁷⁸⁹"[index]].call = lambda literal=argument: literal
    output = io.StringIO()
    with redirect_stdout(output):
        value = jelly.jelly_eval(code, parsed)
        jelly.output(value, "\n")
    return output.getvalue().strip(), canonical(value)


class RustEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cargo = shutil.which("cargo")
        if not cargo:
            raise RuntimeError("Install Rust with rustup to run the Rust backend tests; see README.md.")
        subprocess.run([cargo, "build", "--locked", "--release", "--manifest-path", str(ROOT / "rust/Cargo.toml")], check=True, capture_output=True)

    def setUp(self):
        self.engine = subprocess.Popen([str(ROOT / "rust/target/release/jello-engine")], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        self.addCleanup(self.close_engine)

    def close_engine(self):
        self.engine.stdin.close()
        self.engine.wait(timeout=10)
        self.engine.stdout.close()

    def request(self, code, arguments, prefixes=(), arities=()):
        self.engine.stdin.write(json.dumps({"code": code, "arguments": arguments, "prefixes": prefixes, "arities": arities}) + "\n")
        self.engine.stdin.flush()
        line = self.engine.stdout.readline()
        self.assertTrue(line, f"Rust exited while evaluating {code} {arguments}")
        return json.loads(line)

    def compare(self, code, arguments):
        expected, value = reference(code, arguments)
        actual = self.request(code, arguments)
        self.assertEqual(actual["type"], "result", actual)
        self.assertEqual(actual["result"], expected)
        self.assertEqual(actual["value"], value)
        return actual

    def test_all_thirty_challenge_programs(self):
        for challenge in read_challenges():
            with self.subTest(challenge=challenge["number"]):
                self.compare(challenge["jelly"], [json.dumps(v) for v in challenge["example"]["inputs"]])

    def test_challenge_programs_with_varied_inputs(self):
        rng = random.Random(42)
        for challenge in read_challenges():
            for sample in range(12):
                arguments = []
                for original in challenge["example"]["inputs"]:
                    if isinstance(original, str):
                        value = "".join(rng.choices("abZé😀", k=rng.randrange(1, 10)))
                    elif isinstance(original, list) and original and isinstance(original[0], list):
                        value = [[rng.randrange(1, 20) for _ in range(3)] for _ in range(3)]
                    elif isinstance(original, list):
                        value = [rng.randrange(1, 10) for _ in range(rng.randrange(2, 10))]
                    else:
                        value = rng.randrange(1, 12)
                    arguments.append(json.dumps(value, ensure_ascii=False))
                with self.subTest(challenge=challenge["number"], sample=sample, arguments=arguments):
                    self.compare(challenge["jelly"], arguments)

    def test_basics_nested_arrays_unicode_and_large_integers(self):
        commands = [
            "5 :: range", "5 :: range sq sum", "10 :: range odd? filter",
            "[3,1,4,1,5] :: sums", "6 7 :: *", "42 :: bits", "11 :: is_prime",
            "12 :: factors", '"hello world" :: rev', '"😀é" :: ord',
            "5 :: range + fold", "5 :: range max scan", "[] :: sum", "[] :: prod",
            "[] :: all", "[0] :: rev", "[[1,2],[3]] :: sum", "[1,2] [3,4,5] :: +",
            "[1,2,3] 7 :: +", "7 [1,2,3] :: _", "[1,2,3] :: len group",
            "2 :: pow 100", "9223372036854775808 9223372036854775808 :: *",
            "[9007199254740993,9007199254740994] :: sum", "30 :: factorial",
            "[-2,-1,0,1,2] :: odd?", "[-12,0,12] :: i_to_d", "-6 :: bits",
            "[1,2,3] :: < prior", "[1,1,2,3,3] :: sum group", "[1,1,0,2,2] :: len part",
            "[2,3,4] :: + sq . each", "[-2,3] :: + sq . sort_by", "[0,1,2] :: odd? not . filter",
            "[1,0,1] :: i part_by", '"hi" :: head head',
        ]
        for command in commands:
            with self.subTest(command=command):
                inputs, keywords = command.split("::", 1)
                self.compare(convert(keywords.split()), split_arguments(inputs))

    def test_trace_prefixes_use_the_same_semantics(self):
        actual = self.request("R²S", ["5"], ["R", "R²", "R²S"])
        self.assertEqual(actual["steps"], [
            {"code": "R", "result": "[1, 2, 3, 4, 5]"},
            {"code": "R²", "result": "[1, 4, 9, 16, 25]"},
            {"code": "R²S", "result": "55"},
        ])

    def test_challenge_diagrams_match_the_existing_renderer(self):
        for challenge in read_challenges():
            with self.subTest(challenge=challenge["number"]):
                keywords = challenge["expression"].split()
                arities = [getattr(keyword_arity(word), "value", keyword_arity(word)) for word in keywords]
                arguments = [json.dumps(v) for v in challenge["example"]["inputs"]]
                actual = self.request(challenge["jelly"], arguments, arities=arities)
                expected = json.loads(evaluate(challenge["command"]))
                for key in ("tree", "chain", "arity", "chainType"):
                    self.assertEqual(actual[key], expected[key], key)

    def test_unsupported_domains_explicitly_fall_back(self):
        for code, arguments in [("½", ["-4"]), ("X", ["5"]), ("R", ["2000001"]), ("÷", ["1", "0"]), ("×", ["1e308", "2.0"]), ("S", ["'hello'"]), ("L", ["true"]), ("L", ['"\\ud83d\\ude00"']), ("M", ["5"]), ("Æf", ["0"])]:
            with self.subTest(code=code, arguments=arguments):
                self.assertEqual(self.request(code, arguments)["type"], "unsupported")
        self.compare("R", ["5"])

    def test_floating_point_arithmetic_and_numeric_types(self):
        commands = [
            "4 :: range . sum div len", "3 :: half", "4 :: half", "4.0 :: half",
            "81 :: sqrt", "2 :: sqrt", "4 :: inv", "0.5 :: double",
            "[1.5,2,3.25] :: sum", "[1.5,2,3.25] :: prod",
            "[1.5,2,3.25] :: sums", "[1.5,2,3.25] :: deltas",
            "[1.5,-2.25,0.0] :: abs", "[1.5,-2.25,-0.0] :: neg",
            "[1.5,-2.25,-0.0] :: sign", "[1.5,-2.25,0.0] :: ceil",
            "[1.5,-2.25,-0.0] :: floor", "[0.5,-1.5] :: add1 sub1 sq",
            "[1.5,2.5] :: odd?", "[1.5,2.5] :: even?",
            "[0.5,-1.5] :: abs_le_one", "0.5 :: not",
            "3.9 :: range", "3.9 :: iota0", "-0.5 :: range",
            "[1.0,1,2.5,2.5,-0.0,0] :: uniq",
            "[1.0,1,2.5,2.5,-0.0,0] :: len key",
            "[9007199254740993,9007199254740992.0,-1.5,0] :: sort",
            "[[0.5,1],[2.5]] :: sum", '["x",1.0,1e-7] :: i',
            "1 2 :: div", "4 2 :: div", "4.0 2 :: div",
            "1.0 0.1 :: idiv", "-1.0 0.1 :: idiv",
            "0.0 -3.0 :: mod", "-3.5 2 :: mod", "3.5 -2 :: mod",
            "2 -1 :: pow", "1.5 3 :: pow", "4 0.5 :: pow",
            "9007199254740993 9007199254740992.0 :: =",
            "9007199254740993 9007199254740992.0 :: >",
            "1 1.0 :: =", "-0.0 0 :: =", "0.5 1.5 :: divs?",
        ]
        for command in commands:
            with self.subTest(command=command):
                inputs, keywords = command.split("::", 1)
                self.compare(convert(keywords.split()), split_arguments(inputs))

    def test_float_formatting_and_lossless_values(self):
        rng = random.Random(73)
        values = [0.0, -0.0, 1.0, 1e-4, 1e-5, 1e15, 1e16, 1e20,
                  5e-324, 2.2250738585072014e-308, 1.7976931348623157e308]
        while len(values) < 600:
            number = struct.unpack(">d", rng.getrandbits(64).to_bytes(8, "big"))[0]
            if float("-inf") < number < float("inf"):
                values.append(number)
        for value in values:
            with self.subTest(value=value):
                self.compare("¹", [repr(value)])

    def test_fractional_division_rounding_with_large_integers(self):
        rng = random.Random(19)
        for _ in range(100):
            numerator = rng.randrange(-(10 ** 100), 10 ** 100)
            denominator = rng.randrange(1, 10 ** 100)
            self.compare("÷", [str(numerator), str(denominator)])
        self.compare("÷", [str(10 ** 400 + 1), str(3 * 10 ** 400)])

    def test_mixed_float_arithmetic_matches_python(self):
        rng = random.Random(88)
        pairs = [(1.0, 0.1), (-0.0, -3.0), (0.1, -0.01), (2 ** 53 + 1, 0.5)]
        pairs += [(rng.uniform(-1e8, 1e8), rng.uniform(-10, 10)) for _ in range(100)]
        for left, right in pairs:
            for atom in ("+", "_", "×", "÷", "%", ":", "<", "=", "»"):
                with self.subTest(left=left, right=right, atom=atom):
                    self.compare(atom, [repr(left), repr(right)])

    def test_floating_point_default_traces(self):
        command = "4 :: range . sum div len"
        expected = json.loads(evaluate(command))
        actual = self.request(expected["code"], ["4"], [step["code"] for step in expected["steps"]])
        self.assertEqual(actual["type"], "result", actual)
        self.assertEqual(actual["steps"], expected["steps"])
        self.assertEqual(actual["value"], expected["value"])


class WasmEngineTests(RustEngineTests):
    @classmethod
    def setUpClass(cls):
        build_wasm()

    def setUp(self):
        script = """
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createEvaluator } from './web/wasm.js';
const evaluate = await createEvaluator(readFileSync('rust/target/wasm32-unknown-unknown/release/jello_engine.wasm'));
for await (const line of createInterface({ input: process.stdin })) {
  console.log(JSON.stringify(evaluate(JSON.parse(line))));
}
"""
        self.engine = subprocess.Popen(["node", "--input-type=module", "-e", script], cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        self.addCleanup(self.close_engine)


if __name__ == "__main__":
    unittest.main()
