
monadic = {
    "abs":              "A",
    "all":              "Ạ",
    "all_not_empty":    "Ȧ",
    "i_to_b":           "B",
    "b_to_i":           "Ḅ",
    "odd?":             "Ḃ",
    "bits":             "①",
    "not":              "C",
    "ceil":             "Ċ",
    "i_to_d":           "D",
    "d_to_i":           "Ḍ",
    "tail":             "Ḋ",
    "all_eq":           "E",
    "any":              "Ẹ",
    "zip_idx":          "Ė",
    "even?":            "ė",
    "flat":             "F",
    "floor":            "Ḟ",
    "grid":             "G", # don't know what this does
    "idx_part":         "Ġ", # part = partition
    "half":             "H",
    "double":           "Ḥ",
    "head":             "Ḣ",
    "deltas":           "I",
    "inv":              "İ",
    "abs_le_one":       "Ị",
    "iota_len":         "J",
    "join_space":       "K",
    "split_space":      "Ḳ",
    "len":              "L",
    "iota0":            "Ḷ",
    "range0":           "Ḷ",
    "idx_max":          "M",
    "minr":             "Ṃ",
    "maxr":             "Ṁ",
    "neg":              "N",
    "println":          "Ṅ",
    "NOT":              "Ṇ",
    "ord":              "O",
    "chr":              "Ọ",
    "print":            "Ȯ",
    "prod":             "P",
    "pop":              "Ṗ",
    "uniq":             "Q",
    "iota":             "R",
    "range":            "R",
    "rev":              "Ṛ",
    "print_str":        "Ṙ",
    "sum":              "S",
    "sign":             "Ṡ",
    "sort":             "Ṣ",
    "idx":              "T",
    "new_bool_arr":     "Ṭ",
    "last":             "Ṫ",
    "rev_arr":          "U",
    "grade_up":         "Ụ",
    "eval":             "V",
    "uneval":           "Ṿ", # don't know what this does
    "wrap":             "W",
    "sublists":         "Ẇ",
    "len_each":         "Ẉ",
    "rand_elem":        "X",
    "shuffle":          "Ẋ",
    "join_ln":          "Y",
    "split_ln":         "Ỵ",
    "tighten":          "Ẏ", # don't know what this does
    "flip":             "Z",
    "prep_zero":        "Ż",
    "is_prime":         "Ẓ",
    "sum_vec":          "§",
    "sums":             "Ä",
    "factorial":        "!",
    "bit_not":          "~",
    "sq":               "²",
    "sqrt":             "½",
    "deg_to_rad":       "°",
    "NOT_vect":         "¬",
    "add1":             "‘",
    "sub1":             "’",
    "id":               "¹",
    "group":            "Œg",
    "group_len":        "Œɠ",
    "rle":              "Œr",
    "part":             "Ṕ",
    "powerset":         "ŒP",
    "perm_wr":          "Œ!",
    "divisors":         "ÆD",
    "divisor_len":      "Æd",
    "factors":          "Æf",
    "uniq_mask":        "ŒQ",
    "factors_exp":      "ÆF"
}

dyadic = {
    "+":     "+",
    "_":     "_",
    "*":     "×",
    "div":   "÷",
    "pow":   "*",
    "=":     "=",
    "join":  ";",
    "join_with": "j",
    "cut":   "k",
    "mod":   "%",
    "max":   "»",
    "min":   "«",
    "chunk": "s",
    "slide": "ṡ",
    "split_at": "ṣ",
    "<":     "<",
    ">":     ">",
    "l":     "ḷ",
    "r":     "ṛ",
    "and":   "a",
    "or":    "o",
    "pair":      ",",
    "index_of": "i",
    "comb_wr":  "œċ",
    "comb":     "œc",
    "perm":     "œ!",
    "in":       "e",
    "part_wtf": "k",
    "rotate":   "ṙ",
    "keep":     "œp", # TODO rename (this is really `not keep`)
    "at_idx":   "ị",
    "take":     "ḣ",
    "idiv":     ":",
    "filter_out": "ḟ",
    "filter_in":  "f",
    "flip2":      "z", # dyadic transpose
    "divs?":      "ḍ" # divides
}

niladic = {
    "digits": "D"
}

# some of the quicks are AMBIVALENT
quick = {
    "each":         "€",
    "each_over":    "Ɱ",  # maybe rename
    "fold":         "/",  # monadic case
    "chunk_fold":   "/",  # dyadic case
    "scan":         "\\", # monadic case
    "slide_fold":   "\\", # dyadic case
    "prior":        "ṕ",
    "outer":        "þ",
    "w":            "`",
    "c":            "@",
    "filter":       "Ƈ"
}

separators = {
    ".": "µ",
    ":": "ð"
}
