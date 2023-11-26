START = "└"
END   = "┘"
MID   = "┬"
HORIZ = "─"
VERT  = "│"

class Grid:
    def __init__(self, n):
        self.n = n * 2
        self.grid = [[" "] * self.n, [" "] * self.n]

    def add_level(self):
        self.grid.append([" "] * self.n)
        self.grid.append([" "] * self.n)

    def add_subtree(self, level, start, end, s):
        if s in ["W", "m", "mK", "d"]:
            self.grid[level * 2    ][start] = VERT
            self.grid[level * 2 + 1][start] = s
            return
        if (level + 1) * 2 > len(self.grid):
            self.add_level()
        mid = (start + end) // 2
        self.grid[level * 2][start             ] = START
        self.grid[level * 2][end               ] = END
        self.grid[level * 2][start + 1:end     ] = list(HORIZ * (end - start -1 ))
        self.grid[level * 2][(start + end) // 2] = MID
        self.grid[level * 2 + 1][mid - len(s) // 2:mid - len(s) // 2 + len(s)] = list(s)

    def fill_in_vertical_bars(self):
        for column in range(0, self.n):
             found_start_end = False
             for row in reversed(range(len(self.grid))):
                c = self.grid[row][column]
                if c in [START, END]:
                    found_start_end = True
                elif found_start_end:
                    if c == " ":
                        self.grid[row][column] = "⋮" # │ alternative
                    else:
                        found_start_end = False

    # combinator chain sequence
    def ccs(self):
        first_two = "".join("".join(row).strip()[0:2] for row in self.grid)
        no_bars = "".join(c for c in first_two if c not in "─└ ⋮┬│")
        while "h₁" in no_bars:
            no_bars = no_bars.replace("h₁", "")
        return no_bars

    def display(self, indent = 0):
        for row in self.grid:
            print(" " * indent + "".join(row))
