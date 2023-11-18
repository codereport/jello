#!/usr/bin/env python3

import subprocess

from colorama import Fore, Style, init


def cprint(s: str, c, newline: bool):
    end = "" if newline else "\n"
    print(Style.BRIGHT + c + s + Fore.RESET, end=end)

def run_jelly(expr: str, arg: str):
    try:
        command = ["jelly", "eun", expr, arg]
        result = subprocess.run(command, text=True, capture_output=True, check=True)
        output_text = result.stdout.strip()

        cprint(output_text, Fore.GREEN, False)

    except subprocess.CalledProcessError as e:
        # Print the stderr output for more information about the error
        print(Fore.RED + f"Error: {e}")
        print(Fore.RED + "stderr:", e.stderr)

def to_jelly(token: str) -> str:
    if token == "abs":            return "A"
    if token == "all":            return "Ạ"
    if token == "all_not_empty":  return "Ȧ"
    if token == "i_to_b":         return "B"
    if token == "b_to_i":         return "Ḅ"
    if token == "odd":            return "Ḃ"
    if token == "not":            return "C"
    if token == "ceil":           return "Ċ"
    if token == "tail":           return "Ḋ"
    if token == "all_eq":         return "E"
    if token == "any":            return "Ẹ"
    if token == "zip_idx":        return "Ė"
    if token == "grid":           return "G" # don't know what this does
    if token == "half":           return "H"
    if token == "double":         return "Ḥ"
    if token == "head":           return "Ḣ"
    if token == "iota":           return "R"
    if token == "rev":            return "Ṛ"
    if token == "idx":            return "T"
    return None

def convert(expr: list[str]) -> str:
    return "".join([to_jelly(t) for t in expr])

if __name__ == "__main__":
    init() # folor colorama

    print("🟢🟡🔴 Jello 🔴🟡🟢\n")

    while True:
        expr = input("> ").strip().split()
        arg = expr[-1]
        converted_expr = convert(expr[:-1])
        for i in range(1, len(converted_expr) + 1):
            cprint(f"   {converted_expr[:i]:<{len(converted_expr)}}", Fore.YELLOW, True)
            cprint(f" {arg} ➡️ ", Fore.BLUE, True)
            run_jelly(converted_expr[:i], arg)
