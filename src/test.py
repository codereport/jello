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

def challenge_tests():
    res = []
    with open("../challenges.md") as file:
        for line in file:
            if line and line[0] == "|":
                t = line.split("|")
                if len(t) == 9:
                    a = t[6].strip()
                    b = t[7].strip()
                    if a[0] == '`':
                        t = 2 if b[:2] == "``" else 1
                        res.append((a[1:-1], b[t:-t]))
    if not res:
        raise ValueError("No challenge solutions found in challenges.md")
    return res

if __name__ == "__main__":

    print("🟢🟡🔴 Jello Tests 🔴🟡🟢\n")

    print("Unit Tests:")

    # shorter tests
    unit_test("+ half",               "S",   "B₁")
    unit_test("max scan",             "",    "")
    unit_test("+ sq *",               "SΣ",  "B₁ε'")
    unit_test("+ * div half",         "WΣΦ", "Φ₁B₁")
    unit_test("half 0",               "mc",  "mc")
    unit_test("half",                 "m",   "m")
    unit_test("+",                    "W",   "d")
    unit_test("+ 0",                  "d",   "d")
    unit_test("+ +",                  "WΣ",  "ε'")
    unit_test("sq +",                 "Σ",   "Δ")
    unit_test("+ half 1 +",           "SDₚ",  "B₁Eₚ")
    unit_test("+ half + 1",           "SΔₚ",  "B₁εₚ")
    unit_test("iota odd? idx + fold", "BBB", "BBB")

    # longer tests
    unit_test("+ sq * half sqrt _ double ceil", "SΦBΦB", "B₁ε'B₁B₁ε'B₁B₁")
    unit_test("rev max scan rev min max scan",  "BBΦ",   "BBΔB")
    unit_test("len group min prior maxr * 2",   "BBΔₚ",   "BBεₚ")
    unit_test("rev max scan rev = . idx sub1",  "BBΣB",  "BBΔB")

    # top 10 tests
    unit_test("rev max scan rev min max scan _ . sum",       "BBΦΣB", "BBΔBΔB")  # 1
    unit_test("split_at 0 len_each maxr",                    "dBB",   "dBB")     # 2.1
    # noqa unit_test("+ * r . scan maxr")                                        # 2.2 TODO
    unit_test("sum group each maxr",                         "B",     "B")      # 2.3
    unit_test("< prior : + * r . scan maxr add1",            "BB",    "BB")     # 3.1
    unit_test("< prior split_at 0 len_each maxr add1",       "ΔₚBBB", "εₚB₁B₁B₁") # 3.3 (previous)
    unit_test("< prior len part maxr add1",                  "BBBB",  "BBBB")    # 3.3
    unit_test("< prior sum group each add1",                 "BB",    "BB")     # 3.3
    # noqa unit_test("+ max r . scan maxr",                         "Φ₁B",   "") # 4 TODO
    unit_test("len group min prior maxr double",             "BBB",   "BBB")     # 5
    unit_test("sort deltas maxr",                            "BB",    "BB")      # 6
    unit_test("sort deltas idx_max len",                     "BBB",   "BBB")     # 7
    unit_test("odd? and 3 slide_fold any",                   "BB",    "BB")      # 8.1
    unit_test("odd? : + * r . scan maxr > 2",                "mBB",   "mBB")     # 8.2
    unit_test("odd? split_at 0 len_each maxr > 2",           "ΔₚBBΔₚ", "εₚB₁B₁εₚ") # 8.3
    unit_test("odd? sum group each maxr > 2",                "BBΔₚ",   "BBεₚ")    # 8.4
    unit_test("max scan uniq len",                           "BB",    "BB")      # 9
    unit_test("rev max scan rev : r = prior _ c = idx sub1", "BBΣ", "BBΔ")       # 10

    print("\n\nChallenges.md Tests:")

    for a, b in challenge_tests():
        try:
            c = jello.convert(a.split())
            if b == c: print("✅", end="")
            else:      print(f"\n❌ {b} should be {c}")
        except Exception as e:
            print(e)

    print()
