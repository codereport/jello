
INITIAL_INDENT = 14

def single_tree(name: str, width: int, indent: int):
    if width == 1:
        print(f"{' ' * indent}|")
        print(f"{' ' * indent}{name}")
    else:
        n    = width - 3 # number of arms required
        rarm = "─" * (n // 2)
        larm = rarm + ("─" if n % 2 else "")
        print(f"{' ' * indent}└{larm}┬{rarm}┘")
        print(f"{' ' * (indent + 1 + (n % 2) + (n // 2))}{name}")

def width_adjustment(width: int) -> int :
    return (width - 1) // 2

def combinator_tree(chain: list[int], indent: int, width_adj: int):
    initial_call = width_adj == 0
    if len(chain) == 0 or (len(chain) == 1 and not initial_call):
        return
    if len(chain) == 1 and initial_call:
        c = "f" if chain[0] == 1 else "W" # f is for Function appliction
        single_tree(c, 1, indent)
        return

    if   chain[:3] == [1, 2, 1]: c = "Φ"
    elif chain[:2] == [2, 1]:    c = "S"
    elif chain[:2] == [1, 2]:    c = "Σ"
    elif chain[:2] == [1, 1]:    c = "B"

    w = 5 if c == "Φ" else 3
    wa = w + width_adj
    single_tree(c, wa, indent)
    combinator_tree([1] + chain[((w + 1) // 2):], indent + wa // 2, width_adjustment(wa))
