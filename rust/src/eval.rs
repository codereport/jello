use crate::{
    atoms,
    parser::{Kind, Link},
    value::Value,
    Error, Result,
};
use std::cmp::Ordering;

pub struct Engine {
    fuel: usize,
    level: usize,
}

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}
impl Engine {
    pub fn new() -> Self {
        Self {
            fuel: 100_000_000,
            level: 0,
        }
    }
    pub fn tick(&mut self) -> Result<()> {
        if self.fuel == 0 {
            return Err(Error::unsupported("programs exceeding the operation limit"));
        }
        self.fuel -= 1;
        Ok(())
    }
    pub fn call(&mut self, link: &Link, args: &[Value]) -> Result<Value> {
        self.tick()?;
        if self.level >= 256 {
            return Err(Error::unsupported("deep evaluation recursion"));
        }
        self.level += 1;
        let args = if link.arity == 1 && args.len() > 1 {
            &args[..1]
        } else {
            args
        };
        let result = self.invoke(link, args);
        self.level -= 1;
        result
    }
    fn invoke(&mut self, link: &Link, args: &[Value]) -> Result<Value> {
        let zero = Value::int(0);
        let x = args.first().unwrap_or(&zero);
        let y = args.get(1).unwrap_or(x);
        match &link.kind {
            Kind::Literal(value) => Ok(value.clone()),
            Kind::Chain(links) => {
                let count = args.len();
                if count == 0 {
                    if let [only] = links.as_slice() {
                        return self.call(only, &[]);
                    }
                    if links.first().is_some_and(|l| l.arity == 0) {
                        let first = self.call(&links[0], &[])?;
                        self.monadic_chain(&links[1..], first)
                    } else {
                        self.monadic_chain(links, zero)
                    }
                } else if count == 1 {
                    self.monadic_chain(links, x.clone())
                } else {
                    self.dyadic_chain(links, x.clone(), y.clone())
                }
            }
            Kind::Atom(name) => {
                if link.arity == 1 {
                    self.monad(name, x)
                } else {
                    if args.len() < 2 {
                        return Err(Error::unsupported("missing right argument"));
                    }
                    self.dyad(name, x, y)
                }
            }
            Kind::Each(inner) => Ok(Value::list(
                x.range_items()?
                    .iter()
                    .map(|v| {
                        if args.len() < 2 {
                            self.call(inner, std::slice::from_ref(v))
                        } else {
                            self.call(inner, &[v.clone(), y.clone()])
                        }
                    })
                    .collect::<Result<_>>()?,
            )),
            Kind::EachRight(inner) => {
                if args.len() < 2 {
                    return Err(Error::unsupported("monadic each_over"));
                }
                Ok(Value::list(
                    y.range_items()?
                        .iter()
                        .map(|v| self.call(inner, &[x.clone(), v.clone()]))
                        .collect::<Result<_>>()?,
                ))
            }
            Kind::Swap(inner) => self.call(inner, &[y.clone(), x.clone()]),
            Kind::Reflex(inner) => self.call(inner, &[x.clone(), x.clone()]),
            Kind::Outer(inner) => {
                let left = x.range_items()?;
                let right = y.range_items()?;
                if left.len().saturating_mul(right.len()) > 2_000_000 {
                    return Err(Error::unsupported("large outer products"));
                }
                Ok(Value::list(
                    right
                        .iter()
                        .map(|r| {
                            Ok(Value::list(
                                left.iter()
                                    .map(|l| self.call(inner, &[l.clone(), r.clone()]))
                                    .collect::<Result<_>>()?,
                            ))
                        })
                        .collect::<Result<_>>()?,
                ))
            }
            Kind::Sort(inner) => {
                let mut keyed = x
                    .range_items()?
                    .into_iter()
                    .map(|v| {
                        Ok((
                            if args.len() < 2 {
                                self.call(inner, std::slice::from_ref(&v))?
                            } else {
                                self.call(inner, &[v.clone(), y.clone()])?
                            },
                            v,
                        ))
                    })
                    .collect::<Result<Vec<_>>>()?;
                let mut error = None;
                keyed.sort_by(|a, b| {
                    a.0.compare(&b.0).unwrap_or_else(|e| {
                        error = Some(e);
                        Ordering::Equal
                    })
                });
                if let Some(error) = error {
                    return Err(error);
                }
                Ok(Value::list(keyed.into_iter().map(|(_, v)| v).collect()))
            }
            Kind::Reduce(links) | Kind::Scan(links) => {
                let items = x.items();
                let scan = matches!(&link.kind, Kind::Scan(_));
                if links.len() == 2 {
                    let width = self.call(&links[1], &[])?.size()?;
                    if width == 0 {
                        return Err(Error::unsupported("zero-width reduction"));
                    }
                    let chunks = if scan {
                        if width > items.len() {
                            vec![]
                        } else {
                            items.windows(width).map(|v| v.to_vec()).collect()
                        }
                    } else {
                        items.chunks(width).map(|v| v.to_vec()).collect::<Vec<_>>()
                    };
                    return Ok(Value::list(
                        chunks
                            .iter()
                            .map(|v| self.reduce(&links[0], v, false))
                            .collect::<Result<_>>()?,
                    ));
                }
                self.reduce(&links[0], &items, scan)
            }
            Kind::Prior(inner) => Ok(Value::list(
                x.items()
                    .windows(2)
                    .map(|v| self.call(inner, v))
                    .collect::<Result<_>>()?,
            )),
            Kind::Group(inner) => Ok(Value::list(
                groups(&x.digit_items()?)
                    .iter()
                    .map(|g| self.call(inner, &[Value::list(g.clone())]))
                    .collect::<Result<_>>()?,
            )),
            Kind::Key(inner) => {
                let mut groups: Vec<(Value, Vec<Value>)> = vec![];
                for (key, value) in x.digit_items()?.into_iter().zip(y.digit_items()?) {
                    if let Some((_, group)) = groups.iter_mut().find(|(k, _)| k == &key) {
                        group.push(value);
                    } else {
                        groups.push((key, vec![value]));
                    }
                }
                Ok(Value::list(
                    groups
                        .into_iter()
                        .map(|(_, g)| self.call(inner, &[Value::list(g)]))
                        .collect::<Result<_>>()?,
                ))
            }
            Kind::Filter(inner) => {
                let mut kept = vec![];
                for v in x.range_items()? {
                    if (if args.len() < 2 {
                        self.call(inner, std::slice::from_ref(&v))?
                    } else {
                        self.call(inner, &[v.clone(), y.clone()])?
                    })
                    .truth()
                    {
                        kept.push(v);
                    }
                }
                Ok(Value::list(kept))
            }
            Kind::Partition(inner) => {
                let mut kept = vec![];
                for group in groups(&x.digit_items()?) {
                    if group[0].compare(&zero)? == Ordering::Greater {
                        kept.push(self.call(inner, &[Value::list(group)])?);
                    }
                }
                Ok(Value::list(kept))
            }
        }
    }
    fn reduce(&mut self, link: &Link, items: &[Value], scan: bool) -> Result<Value> {
        let Some(first) = items.first() else {
            return if scan {
                Ok(Value::list(vec![]))
            } else {
                Err(Error::unsupported("reduction of an empty list"))
            };
        };
        let mut accumulator = first.clone();
        let mut values = vec![accumulator.clone()];
        for v in &items[1..] {
            accumulator = self.call(link, &[accumulator, v.clone()])?;
            if scan {
                values.push(accumulator.clone());
            }
        }
        Ok(if scan {
            Value::list(values)
        } else {
            accumulator
        })
    }
    fn monadic_chain(&mut self, links: &[Link], arg: Value) -> Result<Value> {
        let mut result = arg.clone();
        let arities: Vec<_> = links
            .iter()
            .map(|l| if l.arity < 0 { 1 } else { l.arity })
            .collect();
        let mut i = 0;
        if leading_nilad(&arities) {
            result = self.call(&links[0], &[])?;
            i = 1;
        }
        while i < links.len() {
            self.tick()?;
            let rest = &arities[i..];
            if rest.starts_with(&[2, 1]) {
                let right = self.call(&links[i + 1], std::slice::from_ref(&arg))?;
                result = self.call(&links[i], &[result, right])?;
                i += 2;
            } else if rest.starts_with(&[2, 0]) {
                let right = self.call(&links[i + 1], &[])?;
                result = self.call(&links[i], &[result, right])?;
                i += 2;
            } else if rest.starts_with(&[0, 2]) {
                let left = self.call(&links[i], &[])?;
                result = self.call(&links[i + 1], &[left, result])?;
                i += 2;
            } else if rest[0] == 2 {
                result = self.call(&links[i], &[result, arg.clone()])?;
                i += 1;
            } else if rest[0] == 1 {
                result = self.call(&links[i], &[result])?;
                i += 1;
            } else {
                return Err(Error::unsupported("implicit printing between nilads"));
            }
        }
        Ok(result)
    }
    fn dyadic_chain(&mut self, links: &[Link], left: Value, right: Value) -> Result<Value> {
        let arities: Vec<_> = links
            .iter()
            .map(|l| if l.arity < 0 { 2 } else { l.arity })
            .collect();
        let mut result = left.clone();
        let mut i = 0;
        if arities.starts_with(&[2, 2, 2]) {
            result = self.call(&links[0], &[left.clone(), right.clone()])?;
            i = 1;
        } else if arities.starts_with(&[2, 1, 1]) {
            let a = self.call(&links[1], std::slice::from_ref(&left))?;
            let b = self.call(&links[2], std::slice::from_ref(&right))?;
            result = self.call(&links[0], &[a, b])?;
            i = 3;
        } else if leading_nilad(&arities) {
            result = self.call(&links[0], &[])?;
            i = 1;
        }
        while i < links.len() {
            self.tick()?;
            let rest = &arities[i..];
            if rest.starts_with(&[2, 2, 0]) && leading_nilad(&rest[2..]) {
                let a = self.call(&links[i], &[result, right.clone()])?;
                let b = self.call(&links[i + 2], &[])?;
                result = self.call(&links[i + 1], &[a, b])?;
                i += 3;
            } else if rest.starts_with(&[2, 2]) {
                let b = self.call(&links[i + 1], &[left.clone(), right.clone()])?;
                result = self.call(&links[i], &[result, b])?;
                i += 2;
            } else if rest.starts_with(&[2, 0]) {
                let b = self.call(&links[i + 1], &[])?;
                result = self.call(&links[i], &[result, b])?;
                i += 2;
            } else if rest.starts_with(&[0, 2]) {
                let a = self.call(&links[i], &[])?;
                result = self.call(&links[i + 1], &[a, result])?;
                i += 2;
            } else if rest[0] == 2 {
                result = self.call(&links[i], &[result, right.clone()])?;
                i += 1;
            } else if rest[0] == 1 {
                result = self.call(&links[i], &[result])?;
                i += 1;
            } else {
                return Err(Error::unsupported("implicit printing between nilads"));
            }
        }
        Ok(result)
    }
    pub fn monad(&mut self, atom: &str, arg: &Value) -> Result<Value> {
        self.tick()?;
        if let Some(depth) = atoms::depths(atom).0 {
            let actual = arg.depth();
            if actual < depth {
                return self.monad(atom, &Value::list(vec![arg.clone()]));
            }
            if actual > depth {
                return Ok(Value::list(
                    arg.items()
                        .iter()
                        .map(|v| self.monad(atom, v))
                        .collect::<Result<_>>()?,
                ));
            }
        }
        atoms::monad(self, atom, arg)
    }
    pub fn dyad(&mut self, atom: &str, left: &Value, right: &Value) -> Result<Value> {
        self.tick()?;
        let (ld, rd) = atoms::depths(atom);
        let l = left.depth();
        let r = right.depth();
        if ld.is_some_and(|d| l < d) {
            return self.dyad(atom, &Value::list(vec![left.clone()]), right);
        }
        if rd.is_some_and(|d| r < d) {
            return self.dyad(atom, left, &Value::list(vec![right.clone()]));
        }
        let lm = ld.is_none_or(|d| d == l);
        let rm = rd.is_none_or(|d| d == r);
        if lm && rm {
            return atoms::dyad(self, atom, left, right);
        }
        if rd.is_some()
            && (ld.is_none()
                || l as isize - (r as isize) < ld.unwrap() as isize - rd.unwrap() as isize)
        {
            return Ok(Value::list(
                right
                    .items()
                    .iter()
                    .map(|v| self.dyad(atom, left, v))
                    .collect::<Result<_>>()?,
            ));
        }
        if ld.is_some()
            && (rd.is_none()
                || l as isize - (r as isize) > ld.unwrap() as isize - rd.unwrap() as isize)
        {
            return Ok(Value::list(
                left.items()
                    .iter()
                    .map(|v| self.dyad(atom, v, right))
                    .collect::<Result<_>>()?,
            ));
        }
        let a = left.items();
        let b = right.items();
        let mut values = a
            .iter()
            .zip(&b)
            .map(|(a, b)| self.dyad(atom, a, b))
            .collect::<Result<Vec<_>>>()?;
        values.extend_from_slice(&a[b.len().min(a.len())..]);
        values.extend_from_slice(&b[a.len().min(b.len())..]);
        Ok(Value::list(values))
    }
}

fn leading_nilad(arities: &[i8]) -> bool {
    if arities.is_empty() {
        return false;
    }
    let mut extended = arities.to_vec();
    extended.push(1);
    extended < [0, 2].repeat(arities.len())
}

pub fn groups(items: &[Value]) -> Vec<Vec<Value>> {
    let mut groups: Vec<Vec<Value>> = vec![];
    for value in items {
        if let Some(group) = groups.last_mut() {
            if group.first() == Some(value) {
                group.push(value.clone());
                continue;
            }
        }
        groups.push(vec![value.clone()]);
    }
    groups
}
