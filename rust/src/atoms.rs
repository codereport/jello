use crate::{
    eval::{groups, Engine},
    numeric,
    value::Value,
    Error, Result,
};
use num_bigint::BigInt;
use num_integer::Integer;
use num_traits::{One, Signed, ToPrimitive, Zero};
use std::{cmp::Ordering, collections::HashSet};

pub fn arity(atom: &str) -> Option<i8> {
    Some(match atom {
        "A" | "Ạ" | "Ȧ" | "B" | "Ḅ" | "Ḃ" | "É" | "①" | "C" | "Ċ" | "D" | "Ḍ" | "Ḋ" | "E" | "Ẹ"
        | "Ė" | "F" | "Ḟ" | "H" | "Ḥ" | "Ḣ" | "I" | "Ď" | "Ị" | "J" | "L" | "Ḷ" | "M" | "Ṃ"
        | "Ṁ" | "N" | "O" | "Ọ" | "P" | "Ṗ" | "Q" | "R" | "Ṛ" | "S" | "Ṡ" | "Ṣ" | "T" | "Ṫ"
        | "U" | "W" | "Ẇ" | "Ẉ" | "Ż" | "Ä" | "!" | "~" | "²" | "‘" | "’" | "¹" | "Œr" | "ÆD"
        | "Æd" | "Æf" | "ÆF" | "Ẓ" | "ℙ" | "½" | "İ" => 1,
        "+" | "_" | "×" | "÷" | "*" | "=" | "⁼" | ";" | "%" | "»" | "«" | "s" | "ṡ" | "<" | ">"
        | "ḷ" | "ṛ" | "a" | "o" | "," | "i" | "e" | "ṙ" | "ḳ" | "ị" | "ḣ" | ":" | "ḟ" | "f"
        | "ḍ" | "≥" | "≤" | "n" | "^" | "g" | "æl" => 2,
        _ => return None,
    })
}

pub fn depths(atom: &str) -> (Option<usize>, Option<usize>) {
    match atom {
        "+" | "_" | "×" | "÷" | "*" | "=" | "%" | "»" | "«" | "<" | ">" | "a" | "o" | ":" | "ḍ"
        | "≥" | "≤" | "n" | "^" | "g" | "æl" => (Some(0), Some(0)),
        "A" | "B" | "Ḃ" | "É" | "①" | "C" | "Ċ" | "D" | "Ḟ" | "H" | "Ḥ" | "Ị" | "Ḷ" | "N" | "O"
        | "Ọ" | "R" | "Ṡ" | "!" | "~" | "²" | "‘" | "’" | "ÆD" | "Æd" | "Æf" | "ÆF" | "Ẓ" | "½"
        | "İ" => (Some(0), None),
        "Ḅ" | "Ḍ" | "I" | "Ď" | "U" => (Some(1), None),
        "ị" => (Some(0), None),
        "s" | "ṡ" | "ḣ" | "ṙ" => (None, Some(0)),
        _ => (None, None),
    }
}

fn boolean(value: bool) -> Value {
    Value::int(u8::from(value))
}
fn sorted(mut items: Vec<Value>) -> Result<Vec<Value>> {
    let mut error = None;
    items.sort_by(|a, b| {
        a.compare(b).unwrap_or_else(|e| {
            error = Some(e);
            Ordering::Equal
        })
    });
    if let Some(error) = error {
        return Err(error);
    }
    Ok(items)
}
fn flatten(value: &Value, output: &mut Vec<Value>) {
    match value {
        Value::List(v) => {
            for v in v.iter() {
                flatten(v, output);
            }
        }
        _ => output.push(value.clone()),
    }
}
fn extrema(arg: &Value, max: bool) -> Result<Value> {
    let mut result = None;
    for value in arg.items() {
        if result
            .as_ref()
            .map(|current| value.compare(current))
            .transpose()?
            .is_none_or(|o| if max { o.is_gt() } else { o.is_lt() })
        {
            result = Some(value);
        }
    }
    Ok(result.unwrap_or_else(|| Value::int(0)))
}
fn factors(engine: &mut Engine, value: &Value) -> Result<Vec<Value>> {
    let mut n = value
        .integer()?
        .abs()
        .to_u64()
        .ok_or_else(|| Error::unsupported("factorization above 64 bits"))?;
    if n == 0 {
        return Err(Error::unsupported("factorization of zero"));
    }
    let mut values = vec![];
    if value.integer()?.is_negative() {
        values.push(Value::int(-1));
    }
    let mut p = 2;
    while p <= n / p {
        engine.tick()?;
        while n % p == 0 {
            values.push(Value::int(p));
            n /= p;
        }
        p += 1;
    }
    if n > 1 {
        values.push(Value::int(n));
    }
    Ok(values)
}

pub fn monad(engine: &mut Engine, atom: &str, arg: &Value) -> Result<Value> {
    Ok(match atom {
        "A" | "N" | "C" | "H" | "Ḥ" | "²" | "‘" | "’" | "Ċ" | "Ḟ" | "½" | "İ" => {
            numeric::unary(atom, arg)?
        }
        "Ạ" => boolean(arg.items().iter().all(Value::truth)),
        "Ȧ" => {
            let mut all = vec![];
            flatten(arg, &mut all);
            boolean(!arg.items().is_empty() && all.iter().all(Value::truth))
        }
        "Ẹ" => boolean(arg.items().iter().any(Value::truth)),
        "B" | "D" => Value::list(arg.digits(if atom == "B" { 2 } else { 10 })?),
        "Ḅ" | "Ḍ" => {
            let base = BigInt::from(if atom == "Ḅ" { 2 } else { 10 });
            let mut number = BigInt::zero();
            for digit in arg.items() {
                number = number * &base + digit.integer()?;
            }
            Value::Int(number)
        }
        "Ḃ" | "É" => {
            let remainder = numeric::binary("%", arg, &Value::int(2))?;
            if atom == "É" {
                numeric::binary("_", &Value::int(1), &remainder)?
            } else {
                remainder
            }
        }
        "①" => {
            let digits = arg.digits(2)?;
            Value::Int(
                digits
                    .iter()
                    .map(|v| v.integer().cloned())
                    .collect::<Result<Vec<_>>>()?
                    .into_iter()
                    .sum(),
            )
        }
        "¹" => arg.clone(),
        "Ḋ" => Value::list(arg.items().into_iter().skip(1).collect()),
        "E" => {
            let v = arg.items();
            boolean(v.iter().all(|x| Some(x) == v.first()))
        }
        "Ė" => Value::list(
            arg.items()
                .into_iter()
                .enumerate()
                .map(|(i, v)| Value::list(vec![Value::int(i + 1), v]))
                .collect(),
        ),
        "F" => {
            let mut values = vec![];
            flatten(arg, &mut values);
            Value::list(values)
        }
        "Ḣ" => match arg {
            Value::List(v) => v.first().cloned().unwrap_or_else(|| Value::int(0)),
            Value::Char(_) => arg.clone(),
            _ => Value::int(0),
        },
        "I" => Value::list(
            arg.items()
                .windows(2)
                .map(|v| numeric::binary("_", &v[1], &v[0]))
                .collect::<Result<_>>()?,
        ),
        "Ď" => Value::list(
            arg.items()
                .windows(2)
                .map(|v| boolean(v[0] != v[1]))
                .collect(),
        ),
        "Ị" => boolean(!numeric::unary("A", arg)?.compare(&Value::int(1))?.is_gt()),
        "J" => Value::list((1..=arg.items().len()).map(Value::int).collect()),
        "L" => Value::int(arg.items().len()),
        "Ḷ" | "R" => {
            let integer = Value::Int(arg.truncated()?);
            let n = if integer.integer()?.is_negative() {
                0
            } else {
                integer.size()?
            };
            Value::list(if atom == "R" {
                (1..=n).map(Value::int).collect()
            } else {
                (0..n).map(Value::int).collect()
            })
        }
        "M" => {
            if !matches!(arg, Value::List(_)) {
                return Err(Error::unsupported("maximum indices of a scalar"));
            }
            let maximum = extrema(arg, true)?;
            Value::list(
                arg.items()
                    .iter()
                    .enumerate()
                    .filter(|(_, v)| **v == maximum)
                    .map(|(i, _)| Value::int(i + 1))
                    .collect(),
            )
        }
        "Ṃ" | "Ṁ" => extrema(arg, atom == "Ṁ")?,
        "O" => match arg {
            Value::Char(c) => Value::int(u32::from(*c)),
            _ => arg.clone(),
        },
        "Ọ" => Value::Char(
            char::from_u32(
                arg.integer()?
                    .to_u32()
                    .ok_or_else(|| Error::unsupported("invalid character code"))?,
            )
            .ok_or_else(|| Error::unsupported("invalid character code"))?,
        ),
        "P" | "S" => {
            if matches!(arg, Value::List(_)) {
                let mut result = Value::int(if atom == "P" { 1 } else { 0 });
                for value in arg.items() {
                    result = engine.dyad(if atom == "P" { "×" } else { "+" }, &result, &value)?;
                }
                result
            } else {
                arg.clone()
            }
        }
        "Ṗ" => {
            let mut v = arg.range_items()?;
            v.pop();
            Value::list(v)
        }
        "Q" => {
            let mut seen = HashSet::new();
            Value::list(
                arg.digit_items()?
                    .into_iter()
                    .filter(|v| seen.insert(v.clone()))
                    .collect(),
            )
        }
        "Ṛ" => Value::list(arg.digit_items()?.into_iter().rev().collect()),
        "Ṡ" => Value::int(match arg.compare(&Value::int(0))? {
            Ordering::Less => -1,
            Ordering::Equal => 0,
            Ordering::Greater => 1,
        }),
        "Ṣ" => Value::list(sorted(arg.digit_items()?)?),
        "T" => match arg {
            Value::List(v) => Value::list(
                v.iter()
                    .enumerate()
                    .filter(|(_, v)| v.truth())
                    .map(|(i, _)| Value::int(i + 1))
                    .collect(),
            ),
            _ => return Err(Error::unsupported("indices of a scalar")),
        },
        "Ṫ" => arg.items().last().cloned().unwrap_or_else(|| Value::int(0)),
        "U" => Value::list(arg.items().into_iter().rev().collect()),
        "W" => Value::list(vec![arg.clone()]),
        "Ẇ" => {
            let values = arg.items();
            if values.len().saturating_mul(values.len()) > 2_000_000 {
                return Err(Error::unsupported("large sublist collections"));
            }
            Value::list(
                (1..=values.len())
                    .flat_map(|width| values.windows(width).map(|v| Value::list(v.to_vec())))
                    .collect(),
            )
        }
        "Ẉ" => Value::list(
            arg.range_items()?
                .iter()
                .map(|v| Ok(Value::int(v.digit_items()?.len())))
                .collect::<Result<_>>()?,
        ),
        "Ż" => {
            let mut values = vec![Value::int(0)];
            values.extend(arg.items());
            Value::list(values)
        }
        "Ä" => {
            let mut accumulator = None;
            let mut values = vec![];
            for value in arg.items() {
                let value = if let Some(previous) = accumulator {
                    engine.dyad("+", &previous, &value)?
                } else {
                    value
                };
                accumulator = Some(value.clone());
                values.push(value);
            }
            Value::list(values)
        }
        "!" => {
            let n = arg.size()?;
            if n > 100_000 {
                return Err(Error::unsupported("large factorials"));
            }
            let mut result = BigInt::one();
            for n in 1..=n {
                engine.tick()?;
                result *= n;
            }
            Value::Int(result)
        }
        "~" => Value::Int(!arg.integer()?.clone()),
        "Œr" => Value::list(
            groups(&arg.digit_items()?)
                .into_iter()
                .map(|g| Value::list(vec![g[0].clone(), Value::int(g.len())]))
                .collect(),
        ),
        // Jellyfish defines ℙ as both an atom and a quick; atoms take precedence.
        "ℙ" => {
            let mut lengths = vec![];
            for group in groups(&arg.digit_items()?) {
                if group[0].compare(&Value::int(0))?.is_gt() {
                    lengths.push(Value::int(group.len()));
                }
            }
            Value::list(lengths)
        }
        "Æf" => Value::list(factors(engine, arg)?),
        "ÆF" => Value::list(
            groups(&factors(engine, arg)?)
                .into_iter()
                .map(|g| Value::list(vec![g[0].clone(), Value::int(g.len())]))
                .collect(),
        ),
        "Ẓ" => {
            if arg.integer()? < &BigInt::from(2) {
                boolean(false)
            } else {
                let factors = factors(engine, arg)?;
                boolean(factors.len() == 1)
            }
        }
        "ÆD" | "Æd" => {
            let n = arg
                .integer()?
                .abs()
                .to_u64()
                .ok_or_else(|| Error::unsupported("large divisors"))?;
            let mut values = vec![];
            let mut i = 1;
            while i <= n / i {
                engine.tick()?;
                if n % i == 0 {
                    values.push(Value::int(i));
                    if i != n / i {
                        values.push(Value::int(n / i));
                    }
                }
                i += 1;
            }
            if atom == "Æd" {
                Value::int(values.len())
            } else {
                Value::list(sorted(values)?)
            }
        }
        _ => return Err(Error::unsupported(&format!("atom {atom}"))),
    })
}

pub fn dyad(engine: &mut Engine, atom: &str, left: &Value, right: &Value) -> Result<Value> {
    Ok(match atom {
        "+" | "_" | "×" | "÷" | ":" | "%" | "*" => numeric::binary(atom, left, right)?,
        "=" | "⁼" => boolean(left == right),
        "n" => boolean(left != right),
        "<" | ">" | "≤" | "≥" => {
            let c = left.compare(right)?;
            boolean(match atom {
                "<" => c.is_lt(),
                ">" => c.is_gt(),
                "≤" => !c.is_gt(),
                _ => !c.is_lt(),
            })
        }
        "»" | "«" => {
            let c = left.compare(right)?;
            if if atom == "»" { c.is_lt() } else { c.is_gt() } {
                right.clone()
            } else {
                left.clone()
            }
        }
        "ḷ" => left.clone(),
        "ṛ" => right.clone(),
        "a" => {
            if left.truth() {
                right.clone()
            } else {
                left.clone()
            }
        }
        "o" => {
            if left.truth() {
                left.clone()
            } else {
                right.clone()
            }
        }
        "," => Value::list(vec![left.clone(), right.clone()]),
        ";" => {
            let mut v = left.items();
            v.extend(right.items());
            Value::list(v)
        }
        "s" | "ṡ" => {
            let values = left.range_items()?;
            let width = right.size()?;
            if width == 0 {
                return Err(Error::unsupported("zero-width chunks"));
            }
            Value::list(if atom == "s" {
                values
                    .chunks(width)
                    .map(|v| Value::list(v.to_vec()))
                    .collect()
            } else if width > values.len() {
                vec![]
            } else {
                values
                    .windows(width)
                    .map(|v| Value::list(v.to_vec()))
                    .collect()
            })
        }
        "ḣ" => {
            let values = left.items();
            let n = right
                .integer()?
                .to_isize()
                .ok_or_else(|| Error::unsupported("large slice index"))?;
            let end = if n < 0 {
                values.len().saturating_sub(n.unsigned_abs())
            } else {
                values.len().min(n as usize)
            };
            Value::list(values[..end].to_vec())
        }
        "ḳ" => Value::list(
            left.items()
                .iter()
                .zip(right.items())
                .filter(|(m, _)| m.truth())
                .map(|(_, v)| v)
                .collect(),
        ),
        "ị" => {
            let values = right.items();
            if values.is_empty() {
                Value::int(0)
            } else {
                let index = (left.integer()? - BigInt::one())
                    .mod_floor(&BigInt::from(values.len()))
                    .to_usize()
                    .unwrap();
                values[index].clone()
            }
        }
        "i" => Value::int(
            left.items()
                .iter()
                .position(|v| v == right)
                .map_or(0, |i| i + 1),
        ),
        "e" => boolean(right.items().contains(left)),
        "ḟ" | "f" => {
            let mesh = right.items();
            Value::list(
                left.range_items()?
                    .into_iter()
                    .filter(|v| mesh.contains(v) == (atom == "f"))
                    .collect(),
            )
        }
        "ḍ" => boolean(if !left.truth() {
            !right.truth()
        } else {
            !numeric::binary("%", right, left)?.truth()
        }),
        "^" => Value::Int(left.integer()? ^ right.integer()?),
        "g" => Value::Int(left.integer()?.gcd(right.integer()?)),
        "æl" => {
            let a = left.integer()?;
            let b = right.integer()?;
            let divisor = a.gcd(b);
            Value::Int(
                a * b
                    / if divisor.is_zero() {
                        BigInt::one()
                    } else {
                        divisor
                    },
            )
        }
        "ṙ" => {
            let mut values = left.items();
            if !values.is_empty() {
                let shift = right
                    .integer()?
                    .mod_floor(&BigInt::from(values.len()))
                    .to_usize()
                    .unwrap();
                values.rotate_left(shift);
            }
            Value::list(values)
        }
        _ => {
            engine.tick()?;
            return Err(Error::unsupported(&format!("atom {atom}")));
        }
    })
}
