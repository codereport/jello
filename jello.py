#!/usr/bin/env python3

import subprocess

from colorama import Fore, init
from prompt_toolkit import prompt
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.history import FileHistory
from prompt_toolkit.shortcuts import CompleteStyle

import algorithm
import arity_notation
import draw
import tokens
import utils
from grid import Grid
from utils import Chain, Quick, Separator


def clear_screen():
    subprocess.call("clear", shell=True)

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
    [k for k in sorted(
        list(tokens.monadic.keys()) +
        list(tokens.dyadic.keys())  +
        list(tokens.quick.keys())   +
        list(tokens.separators.keys())) if len(k) > 1])

history = FileHistory("jello_history.txt")

def is_nilad_array(s: str) -> bool:
    return set(list(s)).issubset(list("0123456789,[]"))

def to_jelly(token: str) -> str:
    if token in tokens.monadic:     return tokens.monadic[token]
    if token in tokens.dyadic:      return tokens.dyadic[token]
    if token in tokens.quick:       return tokens.quick[token]
    if token in tokens.separators:  return tokens.separators[token]
    if is_nilad_array(token):       return token
    raise Exception(f"{token} is not a valid Jello keyword.")

def convert(expr: list[str]) -> str:
    return "".join([to_jelly(t) for t in expr])

def keyword_arity(k: str) -> int:
    if k in tokens.monadic:    return 1
    if k in tokens.dyadic:     return 2
    if k == "each":            return Quick.EACH
    if k == "c":               return Quick.FLIP
    if k in tokens.quick:      return Quick.QUICK
    if k == ".":               return Separator.MONADIC
    if k == ":":               return Separator.DYADIC
    if is_nilad_array(k):      return 0
    raise Exception(f"{k} not handled in keyword_arity function.")

def arity_chain_repr(i: int) -> str:
    if i in [Quick.QUICK, Quick.EACH, Quick.FLIP]: return "q"
    if i in [Separator.MONADIC, Separator.DYADIC]: return "s"
    return str(i)

def chain_arity_to_string(chain_arity: list[int]) -> str:
    return "-".join([arity_chain_repr(e) for e in chain_arity])

def keyword_color(k: str):
    if k in tokens.monadic:    return Fore.GREEN
    if k in tokens.dyadic:     return Fore.BLUE
    if k in tokens.quick:      return Fore.RED
    return Fore.WHITE

def colored_keywords(args, expr):
    print(f"> {args} :: {' '.join(keyword_color(k) + k for k in expr.split())}")

def spaced_jelly_atoms(args, expr):
    indent = " " * (2 + len(args) + 4)
    spaced_jelly_atoms = " ".join(to_jelly(k).center(len(k)) for k in expr.split())
    draw.cprint(indent + spaced_jelly_atoms, Fore.YELLOW, True)

if __name__ == "__main__":
    init()  # for colorama

    print("🟢🟡🔴 Jello 🔴🟡🟢\n")

    while True:
        try:
            user_input = prompt("> ",
                                completer=completer,
                                history=history,
                                reserve_space_for_menu=0,
                                complete_style=CompleteStyle.MULTI_COLUMN)

            if user_input.strip().lower() == "q": break
            if user_input.strip() == "?":
                arity_notation.explain()
                continue
            clear_screen()
            print("🟢🟡🔴 Jello 🔴🟡🟢\n")
            if "::" not in user_input:
                print(f"> {user_input}")
                draw.cprint("  error: missing :: after args", Fore.RED, True)
                continue

            [args, expr] = [s.strip() for s in user_input.strip().split("::")] # should consist of keywords

            colored_keywords(args, expr)
            spaced_jelly_atoms(args, expr)

            algorithm.advisor(expr)

            expr = utils.remove_all(utils.split_keep_multiple_delimiters(expr, r" \(\)"), ["", " "])
            args = args.split()

            converted_expr = convert(expr)
            chain_type = Chain.MONADIC if len(args) == 1 else Chain.DYADIC
            for i in range(1, len(converted_expr) + 1):
                if converted_expr[i - 1] in list(tokens.separators.values()) + ["Œ", "œ"]:
                    continue
                draw.cprint(f"   {converted_expr[:i]:<{len(converted_expr)}}", Fore.YELLOW, False)
                draw.cprint(f" {' '.join(args)} ➡️  ", Fore.BLUE, False)
                run_jelly(converted_expr[:i], args)

            chain_arity = [keyword_arity(e) for e in expr if e not in "()"]

            print("    This is a ", end="")
            draw.cprint(chain_arity_to_string(chain_arity), Fore.RED, False)
            ccs = draw.combinator_chain_sequence(chain_arity, chain_type)
            print(f" {chain_type.name.lower()} chain ({''.join(ccs)})")

            chain_arity_tree = [(e, i * 2, 0) for i, e in enumerate(chain_arity)]
            grid = Grid(len(chain_arity))

            draw.combinator_tree(chain_arity_tree, chain_type, True, grid)

            grid.fill_in_vertical_bars()
            grid.display(draw.INITIAL_INDENT)

        except Exception as e:
            color = Fore.GREEN if "algorithm" in str(e) else Fore.RED
            draw.cprint(f"    {e}", color, True)
            print(e.with_traceback())
