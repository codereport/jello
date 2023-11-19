
from colorama import Fore, Style

from utils import Chain

INITIAL_INDENT = 14

def cprint(s: str, c, newline: bool):
    end = "\n" if newline else ""
    print(Style.BRIGHT + c + s + Fore.RESET, end=end)

def color(i: int):
    return [Fore.YELLOW, Fore.GREEN, Fore.BLUE, Fore.MAGENTA][i % 4]

def comb_width(c: str, initial_call: bool) -> int:
    if c == "m" and initial_call: return 1
    if c in ["Φ", "m", "d", "Φ₁", "ε", "E"]: return 5
    if c == "W": return 1
    return 3

def comb_arity(c: str) -> int:
    return 2 if c in ["Φ₁", "B₁", "ε'", "ε", "E"] else 1

def print_bars(ccs: str, i: int, initial_call: bool):
    if ccs:
        for n, c in enumerate(ccs):
            cprint(f"{' ' * (comb_width(c, initial_call) - 2)}⋮", color(i + n + 1), False)
    print()

def single_tree(name: str, width: int, indent: int, ccs: str, i: int, initial_call: bool):
    if width == 1:
        cprint(f"{' ' * indent}|", color(i), False)
        print_bars(ccs, i, initial_call)
        cprint(f"{' ' * indent}{name}", color(i), False)
        print_bars(ccs, i, initial_call)
    else:
        n    = width - 3 # number of arms required
        rarm = "─" * (n // 2)
        larm = rarm + ("─" if n % 2 else "")
        adj = -1 if comb_arity(name) == 2 else 0
        cprint(f"{' ' * indent}└{larm}┬{rarm}┘", color(i), False)
        print_bars(ccs, i, initial_call)
        cprint(f"{' ' * (indent + 1 + (n % 2) + (n // 2))}{name}{' ' * (1 + adj + (n // 2))}", color(i), False)
        print_bars(ccs, i, initial_call)

def width_adjustment(width: int) -> int :
    return (width - 1) // 2

def combinator_tree(
        chain:      list[int],
        chain_type: Chain,
        indent:     int,
        width_adj:  int,
        initial_call: bool,
        output:     bool,
        ccs:        str,
        i:          int):
    if len(chain) == 0 or (len(chain) == 1 and not initial_call):
        return []
    # TODO: vvv i think we can get rid of this
    if len(chain) == 1 and initial_call:
        if chain_type == Chain.MONADIC:
            c = "m" if chain[0] == 1 else "W"
        else:
            c = "mK" if chain[0] == 1 else "d"
        if output: single_tree(c, 1, indent, ccs, i, initial_call)
        return [c]

    if   chain[0]   == 2 and chain_type == Chain.MONADIC: c = "W"
    elif chain[:3]  == [1, 2, 1]: c = "Φ"
    elif chain[:3]  == [2, 2, 2]: c = "Φ₁"
    elif chain[0:3] == [2, 2, 0]: c = "ε"
    elif chain[0:3] == [2, 0, 2]: c = "E"
    elif chain[:2]  == [2, 2]:    c = "ε'"
    elif chain[:2]  == [2, 1]:    c = "S" if chain_type == Chain.MONADIC else "B₁"
    # elif chain[:2]  == [2, 0]:    c = "d"
    # elif chain[:2]  == [0, 2]:    c = "d"
    elif chain[0:3] == [1, 2, 0]: c = "d"
    elif chain[0:3] == [1, 0, 2]: c = "d"
    elif chain[:2]  == [1, 2]:    c = "Σ"
    elif chain[:2]  == [1, 1]:    c = "B"
    elif chain[:2]  == [2, 0]:    c = "c" # concatenation
    elif chain[:2]  == [1, 0] and not initial_call:    c = "c" # concatenation
    elif chain[0]   == 1: c = "m"


    w = comb_width(c, initial_call)
    wa = w + width_adj
    if output: single_tree(c, wa, indent, ccs, i, initial_call)
    return [c] + combinator_tree(
        [comb_arity(c)] + chain[((w + 1) // 2):],
        chain_type,
        indent + wa // 2,
        width_adjustment(wa),
        False,
        output,
        ccs[1:],
        i + 1)
