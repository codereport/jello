
from colorama import Fore, Style

INITIAL_INDENT = 14

def cprint(s: str, c, newline: bool):
    end = "\n" if newline else ""
    print(Style.BRIGHT + c + s + Fore.RESET, end=end)

def color(i: int):
    return [Fore.YELLOW, Fore.GREEN, Fore.BLUE, Fore.MAGENTA][i % 4]

def comb_width(c: str) -> int:
    return 5 if c in "Φmd" else 3

def print_bars(ccs: str, i: int):
    if ccs:
        for n, c in enumerate(ccs):
            cprint(f"{' ' * (comb_width(c) - 2)}⋮", color(i + n + 1), False)
    print()

def single_tree(name: str, width: int, indent: int, ccs: str, i: int):
    if width == 1:
        cprint(f"{' ' * indent}|", color(i), True)
        cprint(f"{' ' * indent}{name}", color(i), True)
    else:
        n    = width - 3 # number of arms required
        rarm = "─" * (n // 2)
        larm = rarm + ("─" if n % 2 else "")
        cprint(f"{' ' * indent}└{larm}┬{rarm}┘", color(i), False)
        print_bars(ccs, i)
        cprint(f"{' ' * (indent + 1 + (n % 2) + (n // 2))}{name}{' ' * (1 + (n // 2))}", color(i), False)
        print_bars(ccs, i)

def width_adjustment(width: int) -> int :
    return (width - 1) // 2

def combinator_tree(chain: list[int], indent: int, width_adj: int, output: bool, ccs: str, i: int):
    initial_call = width_adj == 0
    if len(chain) == 0 or (len(chain) == 1 and not initial_call):
        return ""
    if len(chain) == 1 and initial_call:
        c = "f" if chain[0] == 1 else "W" # f is for Function appliction
        if output: single_tree(c, 1, indent, ccs, i)
        return "W"

    if   chain[:3] == [1, 2, 1]: c = "Φ"
    elif chain[:2] == [2, 1]:    c = "S"
    elif chain[:2] == [2, 0]:    c = "d"
    elif chain[:2] == [0, 2]:    c = "d"
    elif chain[:3] == [1, 2, 0]: c = "d"
    elif chain[:3] == [1, 0, 2]: c = "d"
    elif chain[:2] == [1, 2]:    c = "Σ"
    elif chain[:2] == [1, 1]:    c = "B"

    w = comb_width(c)
    wa = w + width_adj
    if output: single_tree(c, wa, indent, ccs, i)
    return c + combinator_tree([1] + chain[((w + 1) // 2):], indent + wa // 2, width_adjustment(wa), output, ccs[1:], i + 1)
