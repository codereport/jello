#!/usr/bin/env python3

import subprocess

from colorama import Fore, Style, init
from prompt_toolkit import prompt
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.history import FileHistory

import draw
import tokens


def cprint(s: str, c, newline: bool):
    end = "\n" if newline else ""
    print(Style.BRIGHT + c + s + Fore.RESET, end=end)

def run_jelly(expr: str, arg: str):
    try:
        command = ["jelly", "eun", expr, arg]
        result = subprocess.run(command, text=True, capture_output=True, check=True)
        output_text = result.stdout.strip()

        cprint(output_text, Fore.GREEN, True)

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

    user_input = ""

    while user_input != "q":
        user_input = prompt("> ", completer=completer, history=history)

        expr = user_input.strip().split()   # should consist of keywords
        arg = expr[-1]                      # this is the argument
        converted_expr = convert(expr[:-1]) # this will consist of jelly atoms
        for i in range(1, len(converted_expr) + 1):
            cprint(f"   {converted_expr[:i]:<{len(converted_expr)}}", Fore.YELLOW, False)
            cprint(f" {arg} ➡️ ", Fore.BLUE, False)
            run_jelly(converted_expr[:i], arg)

        if user_input != "q":

            chain = [keyword_arity(e) for e in expr[:-1]]
            chain_type = "-".join([str(e) for e in chain])
            print("    This is a ", end="")
            cprint(chain_type, Fore.RED, False)
            print(" monadic chain") # TODO update this when we allow dyadic chain

            draw.combinator_tree(chain, draw.INITIAL_INDENT, True)
