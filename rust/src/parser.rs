use crate::{
    atoms,
    value::{parse_input, Value},
    Error, Result,
};

#[derive(Clone, Debug)]
pub struct Link {
    pub arity: i8,
    pub kind: Kind,
}

#[derive(Clone, Debug)]
pub enum Kind {
    Atom(String),
    Literal(Value),
    Chain(Vec<Link>),
    Each(Box<Link>),
    EachRight(Box<Link>),
    Swap(Box<Link>),
    Reflex(Box<Link>),
    Outer(Box<Link>),
    Sort(Box<Link>),
    Reduce(Vec<Link>),
    Scan(Vec<Link>),
    Prior(Box<Link>),
    Group(Box<Link>),
    Key(Box<Link>),
    Filter(Box<Link>),
    Partition(Box<Link>),
}

fn pop(chain: &mut Vec<Link>, chains: &mut Vec<Link>) -> Result<Link> {
    chain
        .pop()
        .or_else(|| chains.pop())
        .ok_or_else(|| Error::unsupported("incomplete quick"))
}

pub fn parse(code: &str) -> Result<Link> {
    if code.chars().count() > 2000 {
        return Err(Error::unsupported("long program"));
    }
    let mut chains = vec![];
    let mut chain = vec![];
    let mut arity = -1;
    let chars: Vec<char> = code.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c.is_whitespace() {
            i += 1;
            continue;
        }
        if c == 'µ' || c == 'ð' {
            if !chain.is_empty() {
                chains.push(Link {
                    arity,
                    kind: Kind::Chain(std::mem::take(&mut chain)),
                });
            }
            arity = if c == 'µ' { 1 } else { 2 };
            i += 1;
            continue;
        }
        if c.is_ascii_digit() || c == '-' || c == '[' {
            let start = i;
            if c == '[' {
                let mut depth = 0;
                loop {
                    if i >= chars.len() {
                        return Err(Error::unsupported("unclosed literal"));
                    }
                    if chars[i] == '[' {
                        depth += 1;
                    }
                    if chars[i] == ']' {
                        depth -= 1;
                    }
                    i += 1;
                    if depth == 0 {
                        break;
                    }
                    if depth > 64 {
                        return Err(Error::unsupported("deep literal"));
                    }
                }
            } else {
                i += 1;
                while i < chars.len() && chars[i].is_ascii_digit() {
                    i += 1;
                }
            }
            let literal: String = chars[start..i].iter().collect();
            let value = if literal == "-" {
                Value::int(-1)
            } else {
                parse_input(&literal)?
            };
            chain.push(Link {
                arity: 0,
                kind: Kind::Literal(value),
            });
            continue;
        }
        let token = if matches!(c, 'Œ' | 'œ' | 'Æ' | 'æ' | 'Ð') {
            if i + 1 >= chars.len() {
                return Err(Error::unsupported("incomplete atom"));
            }
            i += 2;
            chars[i - 2..i].iter().collect::<String>()
        } else {
            i += 1;
            c.to_string()
        };
        if matches!(
            token.as_str(),
            "€" | "Ɱ" | "@" | "`" | "þ" | "Þ" | "ṕ" | "Œg" | "ƙ" | "Ƈ" | "Ṕ" | "/" | "\\"
        ) {
            let last = pop(&mut chain, &mut chains)?;
            let a = last.arity;
            if matches!(token.as_str(), "@" | "`" | "þ" | "ṕ") && a != 2 && a != -1 {
                return Err(Error::unsupported("a non-dyadic link in this quick"));
            }
            if matches!(token.as_str(), "Œg" | "ƙ" | "Ṕ") && a != 1 && a != -1 {
                return Err(Error::unsupported("a non-monadic link in this quick"));
            }
            let (arity, kind) = match token.as_str() {
                "€" => (a.max(1), Kind::Each(Box::new(last))),
                "Ɱ" => (a.max(1), Kind::EachRight(Box::new(last))),
                "@" => (2, Kind::Swap(Box::new(last))),
                "`" => (1, Kind::Reflex(Box::new(last))),
                "þ" => (2, Kind::Outer(Box::new(last))),
                "Þ" => (a, Kind::Sort(Box::new(last))),
                "ṕ" => (1, Kind::Prior(Box::new(last))),
                "Œg" => (1, Kind::Group(Box::new(last))),
                "ƙ" => (2, Kind::Key(Box::new(last))),
                "Ƈ" => (a, Kind::Filter(Box::new(last))),
                "Ṕ" => (1, Kind::Partition(Box::new(last))),
                "/" | "\\" => {
                    let links = if a == 0 {
                        vec![pop(&mut chain, &mut chains)?, last]
                    } else {
                        vec![last]
                    };
                    if links[0].arity != 2 && links[0].arity != -1 {
                        return Err(Error::unsupported("a non-dyadic reduction"));
                    }
                    (
                        1,
                        if token == "/" {
                            Kind::Reduce(links)
                        } else {
                            Kind::Scan(links)
                        },
                    )
                }
                _ => unreachable!(),
            };
            chain.push(Link { arity, kind });
        } else if let Some(arity) = atoms::arity(&token) {
            chain.push(Link {
                arity,
                kind: Kind::Atom(token),
            });
        } else {
            return Err(Error::unsupported(&format!("atom {token}")));
        }
    }
    chains.push(Link {
        arity,
        kind: Kind::Chain(chain),
    });
    Ok(Link {
        arity: -1,
        kind: Kind::Chain(chains),
    })
}
