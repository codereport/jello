#!/usr/bin/env python3

import subprocess

from colorama import Fore, Style, init
from prompt_toolkit import prompt
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.history import FileHistory


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

jelly_tokens = {
    "abs":              "A",
    "all":              "Ạ",
    "all_not_empty":    "Ȧ",
    "i_to_b":           "B",
    "b_to_i":           "Ḅ",
    "odd":              "Ḃ",
    "not":              "C",
    "ceil":             "Ċ",
    "i_to_d":           "D",
    "d_to_i":           "Ḍ",
    "tail":             "Ḋ",
    "all_eq":           "E",
    "any":              "Ẹ",
    "zip_idx":          "Ė",
    "flat":             "F",
    "floor":            "Ḟ",
    "grid":             "G", # don't know what this does
    "group":            "Ġ", # don't know what this does
    "half":             "H",
    "double":           "Ḥ",
    "head":             "Ḣ",
    "first_diff":       "I",
    "reciprocal":       "İ",
    "abs_le_one":       "Ị",
    "iota_len":         "J",
    "join_space":       "K",
    "split_space":      "Ḳ",
    "len":              "L",
    "iota_min":         "Ḷ",
    "idx_max":          "M",
    "min":              "Ṃ",
    "max":              "Ṁ",
    "neg":              "N",
    "println":          "Ṅ",
    "NOT":              "Ṇ",
    "ord":              "O",
    "chr":              "Ọ",
    "print":            "Ȯ",
    "prod_list":        "P",
    "pop":              "Ṗ",
    "uniq":             "Q",
    "iota":             "R",
    "rev":              "Ṛ",
    "print_str":        "Ṙ",
    "sum_list":         "S",
    "sign":             "Ṡ",
    "sort":             "Ṣ",
    "idx":              "T",
    "new_bool_arr":     "Ṭ",
    "last":             "Ṫ",
    "rev_arr":          "U",
    "grade_up":         "Ụ",
    "eval":             "V",
    "uneval":           "Ṿ", # don't know what this does
    "wrap":             "W",
    "sublists":         "Ẇ",
    "len_each":         "Ẉ",
    "rand_elem":        "X",
    "shuffle":          "Ẋ",
    "join_ln":          "Y",
    "split_ln":         "Ỵ",
    "tighten":          "Ẏ", # don't know what this does
    "columns":          "Z",
    "prep_zero":        "Ż",
    "is_prime":         "Ẓ",
    "sum_vect":         "§",
    "cumsum":           "Ä",
    "factorial":        "!",
    "bit_not":          "~",
    "sq":               "²",
    "sqrt":             "½",
    "deg_to_rad":       "°",
    "NOT_vect":         "¬",
    "add1":             "‘",
    "sub1":             "’",
    "identity":         "¹",
}

completer = WordCompleter(jelly_tokens.keys())
history = FileHistory("jello_history.txt")

def to_jelly(token: str) -> str | None:
    if token in jelly_tokens:
        return jelly_tokens[token]
    return None

def convert(expr: list[str]) -> str:
    return "".join([to_jelly(t) for t in expr])

if __name__ == "__main__":
    init()  # for colorama

    print("🟢🟡🔴 Jello 🔴🟡🟢\n")

    while True:
        user_input = prompt("> ", completer=completer, history=history)

        expr = user_input.strip().split()
        arg = expr[-1]
        converted_expr = convert(expr[:-1])
        for i in range(1, len(converted_expr) + 1):
            cprint(f"   {converted_expr[:i]:<{len(converted_expr)}}", Fore.YELLOW, True)
            cprint(f" {arg} ➡️ ", Fore.BLUE, True)
            run_jelly(converted_expr[:i], arg)
