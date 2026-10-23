// The combinator diagram rules mirror src/draw.py and src/grid.py.
#[derive(Clone)]
struct Node {
    arity: i32,
    x: usize,
    level: usize,
}
struct Grid {
    width: usize,
    rows: Vec<Vec<char>>,
}
type Result<T> = std::result::Result<T, ()>;

impl Grid {
    fn subtree(&mut self, level: usize, start: usize, end: usize, label: &str) -> Result<()> {
        if start >= self.width || end >= self.width || start > end {
            return Err(());
        }
        if ["W", "m", "d"].contains(&label) {
            if level * 2 + 1 >= self.rows.len() {
                return Err(());
            }
            self.rows[level * 2][start] = '│';
            self.rows[level * 2 + 1][start] = label.chars().next().ok_or(())?;
            return Ok(());
        }
        while self.rows.len() < (level + 1) * 2 {
            self.rows.push(vec![' '; self.width]);
        }
        let mid = (start + end) / 2;
        self.rows[level * 2][start] = '└';
        self.rows[level * 2][end] = '┘';
        for x in start + 1..end {
            self.rows[level * 2][x] = '─';
        }
        self.rows[level * 2][mid] = '┬';
        let chars: Vec<_> = label.chars().collect();
        let first = mid.checked_sub(chars.len() / 2).ok_or(())?;
        if first + chars.len() > self.width {
            return Err(());
        }
        self.rows[level * 2 + 1][first..first + chars.len()].copy_from_slice(&chars);
        Ok(())
    }
    fn finish(mut self) -> Result<(String, String)> {
        for column in 0..self.width {
            let mut started = false;
            for row in self.rows.iter_mut().rev() {
                if ['└', '┘'].contains(&row[column]) {
                    started = true;
                } else if started {
                    if row[column] == ' ' {
                        row[column] = '⋮';
                    } else {
                        started = false;
                    }
                }
            }
        }
        let mut chain = String::new();
        for row in &self.rows {
            let text: String = row.iter().collect();
            let first = text.trim().chars().next().ok_or(())?;
            if first != '⋮' {
                chain.extend(
                    text.trim()
                        .chars()
                        .take(3)
                        .filter(|c| !"─└ ⋮┬│┘".contains(*c)),
                );
            }
        }
        chain = chain.replace("h₁", "");
        let tree = self
            .rows
            .iter()
            .map(|row| row.iter().collect::<String>().trim_end().to_owned())
            .collect::<Vec<_>>()
            .join("\n");
        Ok((chain, tree))
    }
}

fn quick(arity: i32) -> bool {
    [3, 10, 50].contains(&arity)
}
fn combinator(a: &[i32], monadic: bool, initial: bool) -> Result<&'static str> {
    if a.len() == 1 && initial {
        return Ok(if monadic {
            if a[0] == 1 {
                "m"
            } else {
                "W"
            }
        } else if a[0] == 1 {
            "m"
        } else {
            "d"
        });
    }
    if monadic {
        if a.starts_with(&[2, 1]) {
            return Ok("S");
        }
        if a.starts_with(&[1, 2, 1]) {
            return Ok("Φ");
        }
        if a.starts_with(&[1, 2, 0]) {
            return Ok("Δₚ");
        }
        if a.starts_with(&[1, 0, 2]) {
            return Ok("Dₚ");
        }
        if a.starts_with(&[1, 2]) {
            return Ok("Σ");
        }
    } else {
        if a.starts_with(&[2, 1]) {
            return Ok("B₁");
        }
        if a.starts_with(&[2, 2, 2]) {
            return Ok("Φ₁");
        }
        if a.get(1..).is_some_and(|a| a.starts_with(&[2, 0])) {
            return Ok("εₚ");
        }
        if a.get(1..).is_some_and(|a| a.starts_with(&[0, 2])) {
            return Ok("Eₚ");
        }
        if a.starts_with(&[1, 2, 2]) {
            return Ok("Φ.₂");
        }
        if a.starts_with(&[1, 2]) {
            return Ok("Δ");
        }
        if a.get(1) == Some(&2) {
            return Ok("ε'");
        }
    }
    if !initial && (a.starts_with(&[2, 0]) || a.starts_with(&[0, 2]) || a.starts_with(&[1, 0])) {
        return Ok("c");
    }
    if a.starts_with(&[1, 1]) {
        return Ok("B");
    }
    if a.starts_with(&[2, 0]) || a.starts_with(&[0, 2]) {
        return Ok("d");
    }
    if a.first() == Some(&2) && monadic {
        return Ok("W");
    }
    if a.first() == Some(&1) {
        return Ok("m");
    }
    Err(())
}

fn reduce(
    mut nodes: Vec<Node>,
    monadic: bool,
    mut initial: bool,
    grid: &mut Grid,
) -> Result<Vec<Node>> {
    if nodes.iter().any(|n| [20, 21].contains(&n.arity)) {
        let mut reduced = vec![];
        let mut section = vec![];
        let mut mode = monadic;
        for node in nodes {
            if [20, 21].contains(&node.arity) {
                reduced.extend(reduce(std::mem::take(&mut section), mode, initial, grid)?);
                mode = node.arity == 20;
            } else {
                section.push(node);
            }
        }
        reduced.extend(reduce(section, mode, initial, grid)?);
        nodes = reduced;
    }
    let count = nodes.iter().take_while(|n| quick(n.arity)).count();
    if count >= nodes.len() {
        return Ok(nodes);
    }
    let mut prefix = nodes[..count].to_vec();
    nodes = nodes[count..].to_vec();
    while let Some(i) = nodes.iter().position(|n| quick(n.arity)) {
        let start = if i >= 2 && nodes[i - 2].arity == 2 && nodes[i - 1].arity == 0 {
            i - 2
        } else if i > 0 && [1, 2].contains(&nodes[i - 1].arity) {
            i - 1
        } else {
            return Err(());
        };
        let a = &nodes[start];
        let b = &nodes[i];
        let level = a.level.max(b.level);
        let arity = if b.arity == 50 { 2 } else { 1 };
        grid.subtree(level, a.x, b.x, if b.arity == 50 { "h₂" } else { "h₁" })?;
        let node = Node {
            arity,
            x: (a.x + b.x) / 2,
            level: level + 1,
        };
        nodes.splice(start..=i, [node]);
        initial = false;
    }
    while nodes.len() > 1 || initial {
        let arities: Vec<_> = nodes.iter().map(|n| n.arity).collect();
        let c = combinator(&arities, monadic, initial)?;
        let width = if c == "m" && initial {
            1
        } else if c == "d" && initial {
            2
        } else if ["Φ", "m", "d", "Φ₁", "Φ.₂", "εₚ", "Eₚ", "Dₚ", "Δₚ"].contains(&c)
        {
            3
        } else if c == "W" {
            1
        } else {
            2
        };
        let off = if ["Φ", "Φ₁", "Φ.₂", "Δₚ", "εₚ", "Eₚ"].contains(&c) {
            2
        } else {
            1
        };
        let a = nodes.first().ok_or(())?;
        let b = if ["W", "m", "d"].contains(&c) {
            a
        } else {
            nodes.get(off).ok_or(())?
        };
        let level = a.level.max(b.level);
        grid.subtree(level, a.x, b.x, c)?;
        let node = Node {
            arity: if ["Φ₁", "Φ.₂", "B₁", "ε'", "εₚ", "Eₚ"].contains(&c) {
                2
            } else {
                1
            },
            x: (a.x + b.x) / 2,
            level: level + 1,
        };
        nodes.splice(0..width.min(nodes.len()), [node]);
        initial = false;
    }
    prefix.extend(nodes);
    Ok(prefix)
}

pub fn draw(arities: &[i32], monadic: bool) -> Option<(String, String)> {
    if arities.is_empty() || arities.len() > 80 {
        return None;
    }
    let mut grid = Grid {
        width: arities.len() * 2,
        rows: vec![vec![' '; arities.len() * 2]; 2],
    };
    let nodes = arities
        .iter()
        .enumerate()
        .map(|(i, &arity)| Node {
            arity,
            x: i * 2,
            level: 0,
        })
        .collect();
    reduce(nodes, monadic, true, &mut grid).ok()?;
    grid.finish().ok()
}
