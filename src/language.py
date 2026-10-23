"""Jello keyword conversion shared by the terminal and browser REPLs."""

import tokens
from utils import Quick, Separator


def is_nilad_array(s: str) -> bool:
    return set(s).issubset("-0123456789,[]")


def to_jelly(token: str) -> str:
    for vocabulary in (tokens.monadic, tokens.dyadic, tokens.niladic, tokens.quick, tokens.separators):
        if token in vocabulary:
            return vocabulary[token]
    if is_nilad_array(token):
        return token
    raise ValueError(f"{token} is not a valid Jello keyword.")


def convert(expr: list[str]) -> str:
    return "".join(to_jelly(token) for token in expr)


def keyword_arity(k: str) -> int:
    if k in tokens.niladic:    return 0
    if k in tokens.monadic:    return 1
    if k in tokens.dyadic:     return 2
    if k == "each":            return Quick.EACH
    if k == "c":               return Quick.FLIP
    if k in tokens.quick:      return Quick.QUICK
    if k == ".":               return Separator.MONADIC
    if k == ":":               return Separator.DYADIC
    if is_nilad_array(k):       return 0
    raise ValueError(f"{k} not handled in keyword_arity function.")


def arity_chain_repr(i: int) -> str:
    if i in (Quick.QUICK, Quick.EACH, Quick.FLIP): return "q"
    if i in (Separator.MONADIC, Separator.DYADIC): return "s"
    return str(i)


def chain_arity_to_string(chain_arity: list[int]) -> str:
    return "-".join(arity_chain_repr(arity) for arity in chain_arity)


def skip_trace(converted_expr: str, i: int) -> bool:
    if converted_expr[i - 1] in list(tokens.separators.values()) + ["Œ", "œ", "Ð"]:
        return True
    return i < len(converted_expr) and converted_expr[i] in tokens.quick.values()
