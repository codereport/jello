START = "└"
END   = "┘"
MID   = "┬"
LINE  = "─"

class Grid:
    def __init__(self, n):
        self.n = n * 2
        self.grid = [[" "] * self.n, [" "] * self.n]

    def add_level(self):
        self.grid.append([" "] * self.n)
        self.grid.append([" "] * self.n)

    def add_subtree(self, level, start, end, s):
        if (level + 1) * 2 > len(self.grid):
            self.add_level()
        mid = (start + end) // 2
        self.grid[level * 2][start             ] = START
        self.grid[level * 2][end               ] = END
        self.grid[level * 2][start + 1:end     ] = list(LINE * (end - start -1 ))
        self.grid[level * 2][(start + end) // 2] = MID
        self.grid[level * 2 + 1][mid - len(s) // 2:mid - len(s) // 2 + len(s)] = list(s)

    def fill_in_vertical_bars(self):
        for column in range(0, self.n):
             found_lr = False
             for row in reversed(range(len(self.grid))):
                c = self.grid[row][column]
                if self.grid[row][column] in [START, END]:
                    found_lr = True
                elif found_lr:
                    if c == " ":
                        self.grid[row][column] = "⋮" # │ alternative
                    else:
                        break

    def display(self, indent = 0):
        for row in self.grid:
            print(" " * indent + "".join(row))
