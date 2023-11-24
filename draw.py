
from colorama import Fore, Style

from utils import Chain, Quick, Separator

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

def bars(ccs: str, i: int, initial_call: bool) -> str:
    if not ccs: return ""
    return "".join(color(i + n + 1) + f"{' ' * (comb_width(c, initial_call) - 2)}⋮" for n, c in enumerate(ccs))

def single_tree(name: str, width: int, ccs: str, i: int, initial_call: bool) -> (str, str):
    if width == 1:
        tree = "|"
        label = name
    else:
        n    = width - 3 # number of arms required
        rarm = "─" * (n // 2)
        larm = rarm + ("─" if n % 2 else "")
        adj = -1 if len(name) == 2 else 0
        tree = f"└{larm}┬{rarm}┘"
        label = f"{' ' * (1 + (n % 2) + (n // 2))}{name}{' ' * (1 + adj + (n // 2))}"
    return (color(i) + tree  + bars(ccs, i, initial_call),
            color(i) + label + bars(ccs, i, initial_call))

# def print_single_tree(tree: (str, str), indent: int):

def print_combinator_tree(tree: list[(int, (str, str))]):
    for indent, (a, b) in tree:
        print(f"{' ' * indent}{a}")
        print(f"{' ' * indent}{b}")

def width_adjustment(width: int) -> int :
    return (width - 1) // 2

def quick_adjustment(width: int, quick_info: list[Quick | None]) -> int:
    if width // 2 >= len(quick_info): return 0
    if quick_info[width // 2] is None and quick_info[0] is None: return 0
    if quick_info[width // 2]:
        if quick_info[width // 2] == Quick.EACH.value: return 0
        return (quick_info[width // 2] - 1) * 2
    if quick_info[0] == Quick.EACH.value: return 0
    return quick_info[0]

def combintor_from_pattern_match(chain: list[int], is_monadic: bool, initial_call: bool) -> str:
    if is_monadic:
        if chain[:2] == [2, 1]:    return "S"
        if chain[:3] == [1, 2, 1]: return "Φ"
        if chain[:3] == [1, 2, 0]: return "Δₚ"
        if chain[:3] == [1, 0, 2]: return "Dₚ"
    else:
        if chain[:2] == [2, 1]:    return "B₁"
        if chain[:3] == [2, 2, 2]: return "Φ₁"
        if chain[:3] == [2, 2, 0]: return "εₚ"
        if chain[:3] == [2, 0, 2]: return "Eₚ"
        if chain[:2] == [2, 2]:    return "ε'"

    concatenate = chain[:2] in [[2,0], [0,2], [1,0]] and not initial_call
    if concatenate:                   return "c"
    if chain[:2] == [1, 2]:           return "Σ"
    if chain[:2] == [1, 1]:           return "B"
    if chain[:2] in [[2,0], [0,2]]:   return "d"
    if chain[0]  == 2 and is_monadic: return "W"
    if chain[0]  == 1:                return "m"

    return None

def combinator_tree(
        chain:        list[int], # chain_arity
        quick_info:   list[int],
        chain_type:   Chain,
        indent:       int,
        width_adj:    int,
        initial_call: bool,
        ccs:          str,
        i:            int):
    is_monadic = chain_type == Chain.MONADIC
    if len(chain) == 0 or (len(chain) == 1 and not initial_call):
        return []
    # TODO: vvv i think we can get rid of this
    if len(chain) == 1 and initial_call:
        if is_monadic: c = "m"  if chain[0] == 1 else "W"
        else:          c = "mK" if chain[0] == 1 else "d"
        return [(indent, single_tree(c, 1, ccs, i, initial_call))]

    if Separator.DYADIC in chain or Separator.MONADIC in chain:
        subchain = []
        sep = None
        for arity in chain:
            if arity in [Separator.DYADIC, Separator.MONADIC]:
                subchain_type = chain_type if sep is None else sep
                subchain_qi = [None] * len(subchain)
                combinator_tree(subchain, subchain_qi, subchain_type, indent, 0, True, "", 0)
                subchain.clear()
                sep = arity
            else:
                subchain.append(arity)

    c  = combintor_from_pattern_match(chain, is_monadic, initial_call)
    w  = comb_width(c, initial_call)
    wa = w + width_adj + quick_adjustment(w, quick_info)

    return [(indent, single_tree(c, wa, ccs, i, initial_call))] + \
        combinator_tree(
            [comb_arity(c)] + chain[((w + 1) // 2):],
            [None] + quick_info[((w + 1) // 2):],
            chain_type,
            indent + wa // 2,
            width_adjustment(wa),
            False,
            ccs[1:],
            i + 1)

def combinator_chain_sequence(
        chain:        list[int], # chain_arity
        chain_type:   Chain,
        initial_call: bool,
        i:            int):
    is_monadic = chain_type == Chain.MONADIC
    if len(chain) == 0 or (len(chain) == 1 and not initial_call):
        return []
    # TODO: vvv i think we can get rid of this
    if len(chain) == 1 and initial_call:
        if is_monadic: c = "m"  if chain[0] == 1 else "W"
        else:          c = "mK" if chain[0] == 1 else "d"
        return [c]

    c = combintor_from_pattern_match(chain, is_monadic, initial_call)
    w = comb_width(c, initial_call)

    return [c] + combinator_chain_sequence(
        [comb_arity(c)] + chain[((w + 1) // 2):],
        chain_type,
        False,
        i + 1)
