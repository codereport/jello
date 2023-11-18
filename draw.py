
INITIAL_INDENT = 14

def single_tree(name: str, width: int, indent: int):
    if width == 1:
        print(f"{' ' * indent}┃")
        print(f"{' ' * indent}{name}")
    else:
        n    = width - 3 # number of arms required
        larm = "━" * (n // 2)
        rarm = larm + ("━" if n % 2 else "")
        print(f"{' ' * indent}┗{larm}┳{rarm}┛")
        print(f"{' ' * (indent + 1 + n // 2)}{name}")

def combinator_tree(chain: list[int], indent: int, initial_call: bool):
    if len(chain) == 0:
        return
    if len(chain) == 1 and initial_call:
        c = "f" if chain[0] == 1 else "W" # f is for Function appliction
        single_tree(c, 1, indent)
        return
    if len(chain) > 2:
        if chain[:3] == [1, 2, 1]:
            c = "Φ"
            w = 6
            single_tree(c, w, indent)
            combinator_tree([1] + chain[3:], indent + w // 2, False)
            return
    if chain[:2] == [2, 1]:
        c = "S" if initial_call else "Φ"
        w = 3 if initial_call else 4
        single_tree(c, w, indent)
        combinator_tree([1] + chain[2:], indent + w // 2, False)
    if chain[:2] == [1, 2]:
        c = "Σ"
        w = 4
        single_tree(c, w, indent)
        combinator_tree([1] + chain[2:], indent + w // 2, False)
    if chain[:2] == [1, 1]:
        c = "B"
        w = 3 if initial_call else 4
        single_tree(c, w, indent)
        combinator_tree([1] + chain[2:], indent + w // 2, False)
