"""Browser adapter for the same keyword converter and Jellyfish used by the CLI."""

import io
import json
import struct
from contextlib import redirect_stdout

import draw
import jelly
from grid import Grid
from language import chain_arity_to_string, convert, keyword_arity, skip_trace, to_jelly
from utils import Chain

ARGUMENT_ATOMS = {symbol: jelly.atoms[symbol].call for symbol in "³⁴⁵⁶⁷⁸⁹"}


class OutputBuffer(io.StringIO):
    def write(self, value):
        if self.tell() + len(value) > 20_000:
            raise ValueError("The result is too long to display. Try a smaller input.")
        return super().write(value)


def split_arguments(text):
    """Keep quoted strings and lists together, including embedded spaces."""
    result, current, brackets = [], [], []
    quote, escaped = None, False
    for char in text.strip():
        if quote:
            current.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in "\"'":
            quote = char
            current.append(char)
        elif char in "[({":
            brackets.append(char)
            current.append(char)
        elif char in "])}":
            if not brackets or "[({"["])}".index(char)] != brackets.pop():
                raise ValueError("Check the brackets in your input.")
            current.append(char)
        elif char.isspace() and not brackets:
            if current:
                result.append("".join(current))
                current = []
        else:
            current.append(char)
    if quote or brackets:
        raise ValueError("Close the quotes and brackets in your input.")
    if current:
        result.append("".join(current))
    if len(result) > 2:
        raise ValueError("Use at most two inputs, for example: 6 7 :: *")
    return result


def canonical(value):
    """Lossless values for comparisons; Jelly's display unwraps singleton lists."""
    if type(value) == int:
        return ["integer", str(value)]
    if type(value) == str:
        return ["character" if len(value) == 1 else "string", value]
    if type(value) == list:
        return ["list", [canonical(item) for item in value]]
    if type(value) == float:
        return ["float", struct.pack(">d", value).hex()]
    return ["other", repr(value)]


def run_value(code, arguments):
    # The CLI starts a fresh process for every prefix. Reset input atoms here too.
    for symbol, call in ARGUMENT_ATOMS.items():
        jelly.atoms[symbol].call = call
    output = OutputBuffer()
    with redirect_stdout(output):
        parsed = [jelly.try_eval(arg) for arg in arguments]
        for index, argument in enumerate(parsed):
            jelly.atoms["³⁴⁵⁶⁷⁸⁹"[index]].call = lambda literal=argument: literal
        value = jelly.jelly_eval(code, parsed)
        jelly.output(value, "\n")
    return output.getvalue().strip(), value


def run(code, arguments):
    return run_value(code, arguments)[0]


def evaluate(command):
    if "::" not in command:
        raise ValueError("Separate your input and keywords with ::, for example: 5 :: range")
    raw_args, expression = command.split("::", 1)
    keywords = expression.split()
    if not keywords:
        raise ValueError("Add a keyword after ::. Try range, sq, or sum.")
    if len(command) > 2_000 or len(keywords) > 80:
        raise ValueError("Try a shorter expression (up to 80 keywords).")
    arguments = split_arguments(raw_args)
    code = convert(keywords)
    result, value = run_value(code, arguments)
    result_value = canonical(value)
    steps, prefix = [], ""
    for keyword in keywords:
        prefix += to_jelly(keyword)
        if skip_trace(code, len(prefix)):
            continue
        try:
            value = result if prefix == code else run(prefix, arguments)
            steps.append({"code": prefix, "result": value})
        except Exception:
            # A partial train can be incomplete even when the full program is valid.
            continue

    chain = tree = ""
    arities = [keyword_arity(keyword) for keyword in keywords]
    chain_type = Chain.MONADIC if len(arguments) <= 1 else Chain.DYADIC
    try:
        grid = Grid(len(arities))
        draw.combinator_tree([(arity, i * 2, 0) for i, arity in enumerate(arities)], chain_type, True, grid)
        grid.fill_in_vertical_bars()
        chain = grid.ccs()
        tree = "\n".join("".join(row).rstrip() for row in grid.grid)
    except Exception:
        # Diagramming is optional; unsupported patterns must still evaluate.
        pass
    return json.dumps({
        "code": code,
        "result": result,
        "value": result_value,
        "steps": steps,
        "arity": chain_arity_to_string(arities),
        "chainType": chain_type.name.lower(),
        "chain": chain,
        "tree": tree,
    })
