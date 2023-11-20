#!/usr/bin/env python3

import subprocess

from colorama import Fore, init
from prompt_toolkit import prompt
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.history import FileHistory

import draw
import tokens
from utils import Chain


def run_jelly(expr: str, args: list[str]):
    try:
        command = ["jelly", "eun", expr, *args]
        result = subprocess.run(command, text=True, capture_output=True, check=True)
        output_text = result.stdout.strip()

        draw.cprint(output_text, Fore.GREEN, True)

    except subprocess.CalledProcessError as e:
        # Print the stderr output for more information about the error
        print(Fore.RED + f"Error: {e}")
        print(Fore.RED + "stderr:", e.stderr)

completer = WordCompleter(tokens.monadic.keys())
history = FileHistory("jello_history.txt")

def to_jelly(token: str) -> str | None:
    if token in tokens.monadic: return tokens.monadic[token]
    if token in tokens.dyadic:  return tokens.dyadic[token]
    if token.isnumeric():       return token
    return None

def convert(expr: list[str]) -> str:
    return "".join([to_jelly(t) for t in expr])

def keyword_arity(k: str) -> int:
    if k in tokens.monadic: return 1
    if k in tokens.dyadic:  return 2
    assert k.isnumeric()
    return 0

if __name__ == "__main__":
    init()  # for colorama

    print("🟢🟡🔴 Jello 🔴🟡🟢\n")

    while True:
        user_input = prompt("> ", completer=completer, history=history)
        if user_input.strip().lower() == "q": break
        if ":" not in user_input:
            draw.cprint("  error: missing : before args", Fore.RED, True)
            continue

        [expr, args] = [s.strip().split() for s in user_input.strip().split(":")] # should consist of keywords
        converted_expr = convert(expr)
        chain_type = Chain.MONADIC if len(args) == 1 else Chain.DYADIC
        for i in range(1, len(converted_expr) + 1):
            draw.cprint(f"   {converted_expr[:i]:<{len(converted_expr)}}", Fore.YELLOW, False)
            draw.cprint(f" {' '.join(args)} ➡️ ", Fore.BLUE, False)
            run_jelly(converted_expr[:i], args) # TODO this should support the dyadic case

        chain = [keyword_arity(e) for e in expr]
        chain_arity = "-".join([str(e) for e in chain])
        print("    This is a ", end="")
        draw.cprint(chain_arity, Fore.RED, False)
        # TODO create a different function for this vvv
        ccs = draw.combinator_tree(chain, chain_type, 0, 0, True, False, "", 0) # chain combinator sequence
        print(f" {chain_type.name.lower()} chain ({''.join(ccs)})")

        draw.combinator_tree(chain, chain_type, draw.INITIAL_INDENT, 0, True, True, ccs[1:], 0)
