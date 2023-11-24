
import re
from enum import Enum
from itertools import groupby


class Chain(Enum):
    MONADIC = 1
    DYADIC  = 2

class Separator(Enum):
    MONADIC = 20
    DYADIC  = 21

class Quick(Enum):
    QUICK = 3
    EACH  = 10

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

def split_keep(text: str, delimiter: str) -> str:
    return [match.group() for match in re.finditer(f"[^{delimiter}]+|{delimiter}", text)]

def split_keep_multiple_delimiters(text, delimiters):
    pattern = "|".join(map(re.escape, delimiters))
    return re.split(f"({pattern})", text)

def remove_all(seq, remove):
    return [e for e in seq if e not in remove]

def list_split(seq: list, delimeter):
    return [list(group) for key, group in groupby(seq, key=lambda x: x == delimeter) if not key]
