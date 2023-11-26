#!/usr/bin/env python3

import draw
import jello
from utils import Chain


def unit_test(expr: str, exp_monad_res: str, exp_dyad_res):
    chain_arity = [jello.keyword_arity(e) for e in expr.split()]
    monad_res = "".join(draw.combinator_chain_sequence(chain_arity, Chain.MONADIC))
    dyad_res  = "".join(draw.combinator_chain_sequence(chain_arity, Chain.DYADIC))

    if monad_res == exp_monad_res: print("✅", end="")
    else:                          print(f"\n❌ for Monadic Test of: {expr}")
    if dyad_res  == exp_dyad_res:  print("✅", end="")
    else:                          print(f"\n❌ for Dyadic Test of: {expr}")

if __name__ == "__main__":

    print("🟢🟡🔴 Jello Tests 🔴🟡🟢\n")

    # shorter tests
    unit_test("+ half",              "S",   "B₁")
    unit_test("max scan",            "",    "")
    unit_test("+ sq *",              "SΣ",  "B₁ε'")
    unit_test("+ * div half",        "WΣΦ", "Φ₁B₁")
    unit_test("half 0",              "mc",  "mc") # TODO should probably be mKc
    unit_test("half",                "m",   "mK")
    unit_test("+",                   "W",   "d")
    unit_test("+ 0",                 "d",   "d")
    unit_test("+ +",                 "WΣ",  "ε'")
    unit_test("sq +",                "Σ",   "Δ")
    unit_test("+ half 1 +",          "SDₚ",  "B₁Eₚ")
    unit_test("+ half + 1",          "SΔₚ",  "B₁εₚ")
    unit_test("iota odd idx + fold", "BBB", "BBB")

    # longer tests
    unit_test("+ sq * half sqrt _ double ceil", "SΦBΦB", "B₁ε'B₁B₁ε'B₁B₁")
    unit_test("rev max scan rev min max scan",  "BBΦ",   "BBΔB")
    unit_test("group_len min prior maxr * 2",   "BBΔₚ", "BBεₚ")

    # top 10 tests
    unit_test("rev max scan rev min max scan _ . sum", "BBΦΣB", "BBΔBΔB")  # 1
    unit_test("split_at 0 len_each maxr",              "dBB", "dBB") # 2.1
    # noqa unit_test("+ * r . scan maxr") # 2.2 TODO
    unit_test("group sum each maxr",                   "BB", "BB") # 2.3
    unit_test("group_len min prior maxr double",       "BBB",   "BBB")     # 5
    unit_test("sort deltas maxr",                      "BB",    "BB")      # 6
    unit_test("sort deltas idx_max len",               "BBB",   "BBB")     # 7
    unit_test("max scan uniq len",                     "BB",    "BB")      # 9
    unit_test("rev max scan rev = . idx sub1",         "BBΣBB", "BBΔBB")   # 10

    print()
