
from colorama import Fore

import draw
from utils import is_subseq_of

advisements = {
    "+ scan":         "sums",
    "1 +":            "add1",
    "+ 1":            "add1",
    "_ 1":            "sub1",
    "group len each": "group_len"
}

def advisor(keywords: list[str]):
    for old, new in advisements.items():
        if is_subseq_of(keywords, old.split()):
            draw.cprint(f"    {(old)} ", Fore.RED, False)
            print("can be replaced with ", end="")
            draw.cprint(new, Fore.GREEN, True)
            raise Exception("☝️🥳 algorithm advisor 🥳☝️")
