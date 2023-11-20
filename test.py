#!/usr/bin/env python3

import draw
import jello
from utils import Chain


def unit_test(expr: str, exp_monad_res: str, exp_dyad_res):
    chain_arity = [jello.keyword_arity(e) for e in expr.split()]
    chain_arity_post_hof, quick_info = jello.process_hofs(chain_arity)
    monad_res = "".join(draw.combinator_tree(chain_arity_post_hof, quick_info, Chain.MONADIC, 0, 0, True, False, "", 0))
    dyad_res  = "".join(draw.combinator_tree(chain_arity_post_hof, quick_info, Chain.DYADIC,  0, 0, True, False, "", 0))

    if monad_res == exp_monad_res: print("✅", end="")
    else:                          print(f"\n❌ for Monadic Test of: {expr}")
    if dyad_res  == exp_dyad_res:  print("✅", end="")
    else:                          print(f"\n❌ for Dyadic Test of: {expr}")

if __name__ == "__main__":

    print("🟢🟡🔴 Jello Tests 🔴🟡🟢\n")

    # shorter tests
    unit_test("+ half",              "S",   "B₁")
    unit_test("+ sq *",              "SΣ",  "B₁ε'")
    unit_test("+ * div half",        "WΣΦ", "Φ₁B₁")
    unit_test("half 0",              "mc",  "mc") # TODO should probably be mKc
    unit_test("half",                "m",   "mK")
    unit_test("+",                   "W",   "d")
    unit_test("+ 0",                 "d",   "d")
    unit_test("+ +",                 "WΣ",  "ε'")
    unit_test("sq +",                "Σ",   "Σ")
    unit_test("+ half 1 +",          "SD",  "B₁E")
    unit_test("+ half + 1",          "SΔ",  "B₁ε")
    unit_test("iota odd idx + fold", "BBB", "BBB")

    # longer tests
    unit_test("+ sq * half sqrt _ double ceil", "SΦBΦB", "B₁ε'B₁B₁ε'B₁B₁")

    # top 10 tests
    unit_test("group_len min 2 slide_fold maxr * 2", "BBΔ", "BBΔ") # 5
    unit_test("max scan uniq len",                   "BB",  "BB")  # 9

    print()
