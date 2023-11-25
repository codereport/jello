START = "└"
END   = "┘"
MID   = "┬"
LINE  = "─"

class Grid:
    def __init__(self, n):
        self.n = n
        self.grid = [[" "] * n, [" "] * n]

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

    def display(self, indent = 0):
        for row in self.grid:
            print(" " * indent + "".join(row))
