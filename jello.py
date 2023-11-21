#!/usr/bin/env python3

import subprocess

from colorama import Fore, init
from prompt_toolkit import prompt
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.history import FileHistory

import draw
import tokens
from utils import Chain, replace


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

completer = WordCompleter(
    list(tokens.monadic.keys()) +
    list(tokens.dyadic.keys())  +
    list(tokens.quick.keys())   +
    list(tokens.separators.keys()))

history = FileHistory("jello_history.txt")

def to_jelly(token: str) -> str:
    if token in tokens.monadic:    return tokens.monadic[token]
    if token in tokens.dyadic:     return tokens.dyadic[token]
    if token in tokens.quick:      return tokens.quick[token]
    if token in tokens.separators: return tokens.separators[token]
    if token.isnumeric():          return token
    raise Exception(f"{token} is not a valid Jello keyword.")

def convert(expr: list[str]) -> str:
    return "".join([to_jelly(t) for t in expr])

def keyword_arity(k: str) -> int:
    if k in tokens.monadic:    return 1
    if k in tokens.dyadic:     return 2
    if k in tokens.quick:      return 3 # not really but we need a way to differentiate
    if k in tokens.separators: return 4 # not really but we need a way to differentiate
    raise Exception(f"{k} not handled in keyword_arity function.")

def chain_arity_to_string(chain_arity: list[int]) -> str:
    return "-".join(["q" if e == 3 else str(e) for e in chain_arity])

# hof (higher order functions) are called quicks in jelly
def process_hofs(chain_arity: list[int]) -> list[int]:
    if 3 not in chain_arity:
        return chain_arity, [None] * len(chain_arity)
    chain_arity = replace(chain_arity[:], [2,0,3], [(1, 3)])
    chain_arity = replace(chain_arity[:], [2, 3], [(1, 2)])
    chain_arity_with_quick_info = [(i, None) if isinstance(i, int) else i for i in chain_arity]
    return ([i for i, _ in chain_arity_with_quick_info],
            [i for _, i in chain_arity_with_quick_info])

if __name__ == "__main__":
    init()  # for colorama

    print("🟢🟡🔴 Jello 🔴🟡🟢\n")

    while True:
        try:
            user_input = prompt("> ", completer=completer, history=history)
            if user_input.strip().lower() == "q": break
            if "::" not in user_input:
                draw.cprint("  error: missing :: after args", Fore.RED, True)
                continue

            [args, expr] = [s.strip().split() for s in user_input.strip().split("::")] # should consist of keywords
            converted_expr = convert(expr)
            chain_type = Chain.MONADIC if len(args) == 1 else Chain.DYADIC
            for i in range(1, len(converted_expr) + 1):
                draw.cprint(f"   {converted_expr[:i]:<{len(converted_expr)}}", Fore.YELLOW, False)
                draw.cprint(f" {' '.join(args)} ➡️ ", Fore.BLUE, False)
                run_jelly(converted_expr[:i], args)

            chain_arity                      = [keyword_arity(e) for e in expr]
            chain_arity_post_hof, quick_info = process_hofs(chain_arity)

            print("    This is a ", end="")
            draw.cprint(chain_arity_to_string(chain_arity), Fore.RED, False)
            # TODO create a different function for this vvv
            ccs = draw.combinator_tree(chain_arity_post_hof, quick_info, chain_type, 0, 0, True, False, "", 0) # chain combinator sequence
            print(f" {chain_type.name.lower()} chain ({''.join(ccs)})")

            draw.combinator_tree(chain_arity_post_hof, quick_info, chain_type, draw.INITIAL_INDENT, 0, True, True, ccs[1:], 0)
        except Exception as e:
            draw.cprint(f"    {e}", Fore.RED, True)
