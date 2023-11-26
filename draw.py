
from colorama import Fore, Style

from grid import Grid
from utils import Chain, Quick, Separator

INITIAL_INDENT = 14

def cprint(s: str, c, newline: bool):
    end = "\n" if newline else ""
    print(Style.BRIGHT + c + s + Fore.RESET, end=end)

def color(i: int):
    return [Fore.YELLOW, Fore.GREEN, Fore.BLUE, Fore.MAGENTA][i % 4]

def comb_width(c: str, initial_call: bool) -> int:
    if c == "m" and initial_call: return 1
    if c == "d" and initial_call: return 2
    if c in ["Φ", "m", "d", "Φ₁", "εₚ", "Eₚ", "Dₚ", "Δₚ"]: return 3
    if c == "W": return 1
    return 2

def comb_arity(c: str) -> int:
    return 2 if c in ["Φ₁", "B₁", "ε'", "εₚ", "Eₚ"] else 1

def comb_offset(c: str) -> int:
    return 2 if c in ["Φ₁", "Δₚ", "εₚ", "Eₚ"] else 1

def width_adjustment(width: int) -> int :
    return (width - 1) // 2

def combintor_from_pattern_match(chain: list[int], is_monadic: bool, initial_call: bool) -> str:
    if len(chain) == 1 and initial_call:
        if is_monadic: return "m"  if chain[0] == 1 else "W"
        return "mK" if chain[0] == 1 else "d"
    if is_monadic:
        if chain[:2] == [2, 1]:    return "S"
        if chain[:3] == [1, 2, 1]: return "Φ"
        if chain[:3] == [1, 2, 0]: return "Δₚ"
        if chain[:3] == [1, 0, 2]: return "Dₚ"
        if chain[:2] == [1, 2]:     return "Σ"
    else:
        if chain[:2]  == [2, 1]:    return "B₁"
        if chain[:3]  == [2, 2, 2]: return "Φ₁"
        if chain[1:3] == [2, 0]:    return "εₚ"
        if chain[1:3] == [0, 2]:    return "Eₚ"
        if chain[:2] == [1, 2]:     return "Δ"
        if chain[1:2] == [2]:       return "ε'"

    concatenate = chain[:2] in [[2,0], [0,2], [1,0]] and not initial_call
    if concatenate:                   return "c"
    if chain[:2] == [1, 1]:           return "B"
    if chain[:2] in [[2,0], [0,2]]:   return "d"
    if chain[0]  == 2 and is_monadic: return "W"
    if chain[0]  == 1:                return "m"

    return None

def has(chain_arity_tree: list[tuple], target: list) -> bool:
    for arity, _, _ in chain_arity_tree:
        if arity in target:
            return True
    return False

def has_separator(chain_arity_tree: list[tuple]) -> bool:
    return has(chain_arity_tree, [Separator.DYADIC, Separator.MONADIC])

def has_quick(chain_arity_tree: list[tuple]) -> bool:
    return has(chain_arity_tree, [Quick.EACH, Quick.QUICK])

def firsts(seq: list):
    return [e[0] for e in seq]

def combinator_tree(
        chain:        list[int], # chain_arity_tree
        chain_type:   Chain,
        initial_call: bool,
        grid:         Grid):

    # PROCESS SEPARATORS
    new_chain = []
    if has_separator(chain):
        subchain = []
        sep = None
        for arity, i, level in chain:
            if arity in [Separator.DYADIC, Separator.MONADIC]:
                subchain_type = chain_type if sep is None else sep
                subchain = combinator_tree(subchain, subchain_type, initial_call, grid)
                new_chain += subchain[:]
                subchain.clear()
                sep = arity
            else:
                subchain.append((arity, i, level))
        chain = new_chain + subchain

    # PROCESS QUICKS
    while has_quick(chain):
        for i, (arity, _, _) in enumerate(chain):
            # TODO: clean this up, add outer, part, etc
            if arity in [Quick.EACH, Quick.QUICK]:
                start = None
                if chain[i-1][0] in [2, 1]:        start = i - 1
                if firsts(chain[i-2:i]) == [2, 0]: start = i - 2
                if i is not None:
                    _, a, l1 = chain[start]
                    _, b, l2 = chain[i]
                    lvl = max(l1,l2)
                    chain = chain[0:start] + [(1, (b + a) // 2, lvl + 1)] + chain[i+1:]
                    grid.add_subtree(lvl, a, b, "h₁")
                    initial_call = False
                    break
                print("TODO: implement me")
                breakpoint()

    # PROCESS MONADS and DYADS
    is_monadic = chain_type == Chain.MONADIC

    while len(chain) > 1 or initial_call:
        c   = combintor_from_pattern_match(firsts(chain), is_monadic, initial_call)
        n   = comb_width(c, initial_call) # TODO: pretty sure these two functions can be
        off = comb_offset(c)              # combined into one (as they are doing the same thing)
        a   = comb_arity(c)
        if c in ["W", "m", "mK", "d"]:
            _, x, l1 = chain[0]
            y, lvl = x, l1
        else:
            _, x, l1 = chain[0]
            _, y, l2 = chain[0 + off]
            lvl = max(l1, l2)
        grid.add_subtree(lvl, x, y, c)
        chain = [(a, (x + y) // 2, lvl + 1)] + chain[n:]
        initial_call = False

    return chain

def combinator_chain_sequence(chain: list[int], chain_type: Chain) -> str:
    grid = Grid(len(chain))
    chain_arity_tree = [(e, i * 2, 0) for i, e in enumerate(chain)]
    combinator_tree(chain_arity_tree, chain_type, True, grid)
    grid.fill_in_vertical_bars()
    return grid.ccs()
