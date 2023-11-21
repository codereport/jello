
from enum import Enum


class Chain(Enum):
    MONADIC = 1,
    DYADIC  = 2

# contiguous subsequence
def index_of_subseq(seq: list, sub: list) -> int:
    for i in range(0, len(seq) - len(sub) + 1):
        if seq[i:i+len(sub)] == sub:
            return i
    return -1

def is_subseq_of(seq: list, sub: list) -> bool:
    return index_of_subseq(seq, sub) != -1

def replace(seq: list, target: list, to: list) -> list:
    i = index_of_subseq(seq, target)
    while i != -1:
        seq = seq[0:i] + to + seq[i + len(target):]
        i = index_of_subseq(seq, target)
    return seq
