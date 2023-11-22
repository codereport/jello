#!/usr/bin/env python3

from colorama import Fore
from prompt_toolkit import prompt
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.shortcuts import CompleteStyle

import draw
import utils

combinators = {
    "W":  ["1y2",   "fn w(f) = x -> f(x,x)"],
    "C":  ["2y2",   "fn c(f) = x,y -> f(y,x)"],
    "B":  ["1y11",  "fn b(f,g) = x -> f(g(x))"],
    "B₁": ["2y12",  "fn b₁(f,g) = x,y -> f(g(x,y))"],
    "S":  ["1y21",  "fn s(f,g) = x -> f(x,g(x))"],
    "Σ":  ["1y12",  "fn Σ(f,g) = x -> f(g(x),x)"],
    "D":  ["2y21",  "fn D(f,g) = x,y -> f(x,g(y))"],
    "Δ":  ["2y12",  "fn Δ(f,g) = x,y -> f(g(x),y)"],
    "Φ":  ["1y121", "fn Φ(f,g,h) = x -> g(f(x),h(x))"],
    "Ψ":  ["2y21",  "fn Ψ(f,g) = x,y -> f(g(x),g(y))"],
    "Φ₁": ["2y222", "fn Φ₁(f,g,h) = x,y -> g(f(x,y),h(x,y))"]
}

def num_to_greek_arity(i: int) -> str:
    return ["niladic", "monadic", "dyadic", "triadic", "tetradic"][i]

def num_to_latin_arity(i: int) -> str:
    return ["nullary", "unary", "binary", "ternary", "quaternary"][i]

def arity_notation_to_english(an: str, translate) -> str:
    [yielded_arity, args_arity] = an.split("y")
    yielded_arity  = translate(int(yielded_arity))
    function_arity = translate(len(args_arity))
    args_arity     = " and ".join(translate(int(i)) for i in args_arity)
    return f"({an}) is a {yielded_arity} yielding {function_arity} function " + \
           f"with {args_arity} function argument(s)."


def describe(c: str, translate):
    [an, f] = combinators[c]
    draw.cprint(f"\nThe {c} Combinator:\n", Fore.GREEN, True)
    print(f"The {c} combinator {arity_notation_to_english(an, translate)}")
    print("A sample implementation could be the following:")
    draw.cprint(f"\n    {f}\n", Fore.YELLOW, True)

def explain():

    completer  = WordCompleter(list(combinators.keys()) + ["All"])
    user_input = prompt("\nWhich combinator would you like explained? ",
                        completer=completer,
                        complete_style=CompleteStyle.MULTI_COLUMN).strip()

    if user_input in combinators.keys():
        gl = input("With greek (g) or latin (l) terminology? ")
        f = num_to_latin_arity if gl == "l" else num_to_greek_arity
        describe(user_input, f)
    elif user_input == "All":
        print()
        for c, [_, fn] in combinators.items():
            [x, _, y, _, z] = utils.split_keep_multiple_delimiters(fn, ["=", "->"])
            print(f"{c:<3} {x:<13}={y:<5}->{z}")
        print()
    else:
        draw.cprint("   did not enter a valid combinator", Fore.RED, True)
