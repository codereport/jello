
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
    if c == "d" and initial_call: return 3
    if c in ["Φ", "m", "d", "Φ₁", "εₚ", "Eₚ", "Dₚ", "Δₚ"]: return 5
    if c == "W": return 1
    return 3

def comb_arity(c: str) -> int:
    return 2 if c in ["Φ₁", "B₁", "ε'", "εₚ", "Eₚ"] else 1

def print_bars(ccs: str, i: int, initial_call: bool):
    if ccs:
        for n, c in enumerate(ccs):
            cprint(f"{' ' * (comb_width(c, initial_call) - 2)}⋮", color(i + n + 1), False)
    print()

def single_tree(name: str, width: int, indent: int, ccs: str, i: int, initial_call: bool):
    if width == 1:
        tree = f"{' ' * indent}|"
        label = f"{' ' * indent}{name}"
    else:
        n    = width - 3 # number of arms required
        rarm = "─" * (n // 2)
        larm = rarm + ("─" if n % 2 else "")
        adj = -1 if len(name) == 2 else 0
        tree = f"{' ' * indent}└{larm}┬{rarm}┘"
        label = f"{' ' * (indent + 1 + (n % 2) + (n // 2))}{name}{' ' * (1 + adj + (n // 2))}"
    cprint(tree, color(i), False)
    print_bars(ccs, i, initial_call)
    cprint(label, color(i), False)
    print_bars(ccs, i, initial_call)

def width_adjustment(width: int) -> int :
    return (width - 1) // 2

def quick_adjustment(width: int, quick_info: list[int | None]) -> int:
    if quick_info[width // 2] is None and quick_info[0] is None: return 0
    if quick_info[width // 2]:
        if quick_info[width // 2] == 10: return 2
        return (quick_info[width // 2] - 1) * 2
    return quick_info[0]

def combinator_tree(
        chain:        list[int], # chain_arity
        quick_info:   list[int],
        chain_type:   Chain,
        indent:       int,
        width_adj:    int,
        initial_call: bool,
        output:       bool,
        ccs:          str,
        i:            int):
    is_monadic = chain_type == Chain.MONADIC
    if len(chain) == 0 or (len(chain) == 1 and not initial_call):
        return []
    # TODO: vvv i think we can get rid of this
    if len(chain) == 1 and initial_call:
        if is_monadic: c = "m"  if chain[0] == 1 else "W"
        else:          c = "mK" if chain[0] == 1 else "d"
        if output: single_tree(c, 1, indent, ccs, i, initial_call)
        return [c]

    c = None

    if is_monadic:
        if   chain[:2] == [2, 1]:    c = "S"
        elif chain[:3] == [1, 2, 1]: c = "Φ"
        elif chain[:3] == [1, 2, 0]: c = "Δₚ"
        elif chain[:3] == [1, 0, 2]: c = "Dₚ"
    else:
        if   chain[:2] == [2, 1]:    c = "B₁"
        elif chain[:3] == [2, 2, 2]: c = "Φ₁"
        elif chain[:3] == [2, 2, 0]: c = "εₚ"
        elif chain[:3] == [2, 0, 2]: c = "Eₚ"
        elif chain[:2] == [2, 2]:    c = "ε'"

    if c is None:
        concatenate = chain[:2] in [[2,0], [0,2], [1,0]] and not initial_call
        if concatenate:                     c = "c"
        elif chain[:2] == [1, 2]:           c = "Σ"
        elif chain[:2] == [1, 1]:           c = "B"
        elif chain[:2] in [[2,0], [0,2]]:   c = "d"
        elif chain[0]  == 2 and is_monadic: c = "W"
        elif chain[0]  == 1:                c = "m"


    w = comb_width(c, initial_call)
    wa = w + width_adj + quick_adjustment(w, quick_info)


    if output: single_tree(c, wa, indent, ccs, i, initial_call)

    return [c] + combinator_tree(
        [comb_arity(c)] + chain[((w + 1) // 2):],
        [None] + quick_info[((w + 1) // 2):],
        chain_type,
        indent + wa // 2,
        width_adjustment(wa),
        False,
        output,
        ccs[1:],
        i + 1)
