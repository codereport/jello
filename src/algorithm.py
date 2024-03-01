
import re

import draw
import utils
from colorama import Fore

advisements = {
    "+ scan":         "sums",
    "1 +":            "add1",
    "+ 1":            "add1",
    "_ 1":            "sub1",
    "group len each": "group_len",
    "group len_each": "group_len",
    "split_at 0":     "part",
    "+ fold":         "sum",
    "* fold":         "prod",
    "len iota ":      "iota_len",
    "len each":       "len_each",
    "iota0 add1":     "iota",
    "iota sub1":      "iota0",
    "2 slide_fold":   "prior",
    "deltas > 0":     "< prior",
    "* 2":            "double",
    "div 2":          "half",
    "odd? not":       "even?",
    "even? not":      "odd?",
    "i_to_b sum":     "bits",
    "sort group_len": "len key",
    "sort group ":    "id key",
    "idx : at_idx":   ": keep",
    "r scan":         "id",
    "r fold":         "last",
    "bits each":      "bits", # TODO: generalize this for all scalar fns
    "max scan":       "maxs",
}

regex_advisements = {
    r"chunk (.+) (.+) fold each": r"\2 \1 chunk_fold",
    r"chunk (.+) sum each": r"+ \1 chunk_fold",
    r"chunk (.+) prod each": r"* \1 chunk_fold",
    r"chunk (.+) maxr each": r"max \1 chunk_fold",
    r"chunk (.+) minr each": r"min \1 chunk_fold",
    # TODO add and/all + or/any advisements
    # TODO fill these out vvv
    r"slide (.+) all each":  r"and \1 slide_fold",
    r"sort group (.+) each":  r"\1 key",
}

def print_advisement(old: str, new: str):
    draw.cprint(f"\n    {(old)} ", Fore.RED, False)
    print("can be replaced with ", end="")
    draw.cprint(new, Fore.GREEN, True)
    print("      ☝️🥳 algorithm advisor 🥳☝️\n")

def advisor(keywords: list[str]):

    # non-regex advisements
    for old, new in advisements.items():
        if utils.is_subseq_of(keywords, old):
            print_advisement(old, new)

    # regex advisements
    for pattern, replacement in regex_advisements.items():
        match = re.search(pattern, keywords)
        if match:
            matched = match.group()
            new = re.sub(pattern, replacement, matched)
            print_advisement(matched, new)
