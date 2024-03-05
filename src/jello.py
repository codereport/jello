#!/usr/bin/env python3

import multiprocessing
import subprocess
from functools import partial
from itertools import permutations

import algorithm
import arity_notation
import draw
import tokens
import utils
from colorama import Fore, init
from grid import Grid
from prompt_toolkit import prompt
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.history import FileHistory
from prompt_toolkit.shortcuts import CompleteStyle
from utils import Chain, Quick, Separator


def clear_screen():
    subprocess.call("clear", shell=True)

def run_jelly(expr: str, args: list[str], display):
    try:
        command = ["jelly", "eun", expr, *args]
        result = subprocess.run(command, text=True, capture_output=True, check=True)
        output_text = result.stdout.strip()

        if display:
            draw.cprint(output_text, Fore.GREEN, True)
        return output_text
    except subprocess.CalledProcessError as e:
        # Print the stderr output for more information about the error
        if display:
            print(Fore.RED + f"Error: {e}")
            print(Fore.RED + "stderr:", e.stderr)
        else:
            raise

commands = ["--find-by-example"]

completer = WordCompleter(
    [k for k in sorted(
        list(tokens.niladic.keys()) +
        list(tokens.monadic.keys()) +
        list(tokens.dyadic.keys())  +
        list(tokens.quick.keys())   +
        list(tokens.separators.keys()) +
        commands) if len(k) > 1])

history = FileHistory("jello_history.txt")

def is_nilad_array(s: str) -> bool:
    return set(list(s)).issubset(list("0123456789,[]"))

def to_jelly(token: str) -> str:
    if token in tokens.monadic:     return tokens.monadic[token]
    if token in tokens.dyadic:      return tokens.dyadic[token]
    if token in tokens.niladic:     return tokens.niladic[token]
    if token in tokens.quick:       return tokens.quick[token]
    if token in tokens.separators:  return tokens.separators[token]
    if is_nilad_array(token):       return token
    raise Exception(f"{token} is not a valid Jello keyword.")

def convert(expr: list[str]) -> str:
    return "".join([to_jelly(t) for t in expr])

def keyword_arity(k: str) -> int:
    if k in tokens.niladic:    return 0
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

def skip_trace(converted_expr: list[str], i: int) -> bool:
    if converted_expr[i - 1] in list(tokens.separators.values()) + ["Œ", "œ", "Ð"]:
        return True
    if i < len(converted_expr) and converted_expr[i] in tokens.quick.values():
        return True
    return False

def process_combinations(arg, out, combinations):
    for (keyword1, atom1), (keyword2, atom2) in combinations:
        try:
            if atom1 == "":
                continue
            x = run_jelly(atom1, [arg], display=False)
            if x in [arg, out] and atom2 != "":
                continue
            x = run_jelly(atom1 + atom2, [arg], display=False)
        except Exception:
            continue

        if x == out:
            print(f"{arg} :: {keyword1} {keyword2} -> {x}")

if __name__ == "__main__":
    init()  # for colorama

    print("🟢🟡🔴 Jello 🔴🟡🟢\n")

    while True:
        try:
            user_input = prompt("> ",
                                completer=completer,
                                history=history,
                                reserve_space_for_menu=0,
                                complete_style=CompleteStyle.MULTI_COLUMN).strip()

            if user_input.lower() == "q": break
            if user_input == "?":
                arity_notation.explain()
                continue
            if user_input in commands:
                if user_input == "--find-by-example":
                    args   = input("Input arguments and desired result: ")
                    cores  = int(input("Number of cores: "))
                    nested = input("Nested Search (y/n): ").strip().lower() == "y"
                    args   = args.split()
                    if len(args) > 3:
                        print("   error: too inputs (max 3)")
                    elif len(args) == 3:
                        print("   dyadic find-by-example not supported yet")
                    else:
                        [arg, out] = args
                        exclude    = ["rand_elem", "powerset", "perm", "perm_wr", "factorial"]
                        if nested:
                            new_dict = dict(**{k: v for k, v in tokens.monadic.items() if k not in exclude}, **{"": ""})
                            combos   = list(permutations(new_dict.items(), 2))
                        else:
                            combos = [((k, v), ("", "")) for k, v in tokens.monadic.items() if k not in exclude]
                        chunk_size = len(combos) // cores
                        combos = [combos[i:i+chunk_size] for i in range(0, len(combos), chunk_size)]

                        with multiprocessing.Pool(processes=cores) as pool:
                            pool.map(partial(process_combinations, arg, out), combos)

                    continue

            clear_screen()
            print("🟢🟡🔴 Jello 🔴🟡🟢\n")
            if "::" not in user_input:
                print(f"> {user_input}")
                draw.cprint("  error: missing :: after args", Fore.RED, True)
                continue

            [args, expr] = [s.strip() for s in user_input.split("::")] # should consist of keywords

            colored_keywords(args, expr)
            spaced_jelly_atoms(args, expr)

            algorithm.advisor(expr)

            expr = utils.remove_all(utils.split_keep_multiple_delimiters(expr, r" \(\)"), ["", " "])
            args = args.split()

            converted_expr = convert(expr)
            chain_type = Chain.MONADIC if len(args) == 1 else Chain.DYADIC
            for i in range(1, len(converted_expr) + 1):
                if skip_trace(converted_expr, i):
                    continue
                draw.cprint(f"   {converted_expr[:i]:<{len(converted_expr)}}", Fore.YELLOW, False)
                draw.cprint(f" {' '.join(args)} ➡️  ", Fore.BLUE, False)
                run_jelly(converted_expr[:i], args, display=True)

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

        except KeyboardInterrupt:
            print("")
            break
        except Exception as e:
            color = Fore.GREEN if "algorithm" in str(e) else Fore.RED
            draw.cprint(f"    {e}", color, True)
            # noqa print(e.with_traceback())
