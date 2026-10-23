use crate::{Error, Result};
use num_bigint::BigInt;
use num_traits::{Signed, ToPrimitive, Zero};
use serde_json::{json, Value as Json};
use std::{cmp::Ordering, rc::Rc};

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum Value {
    Int(BigInt),
    Char(char),
    List(Rc<Vec<Value>>),
}

impl Value {
    pub fn int(n: impl Into<BigInt>) -> Self {
        Self::Int(n.into())
    }
    pub fn list(v: Vec<Self>) -> Self {
        Self::List(Rc::new(v))
    }
    pub fn integer(&self) -> Result<&BigInt> {
        match self {
            Self::Int(n) => Ok(n),
            _ => Err(Error::unsupported("non-integer arithmetic")),
        }
    }
    pub fn size(&self) -> Result<usize> {
        self.integer()?
            .to_usize()
            .filter(|&n| n <= 2_000_000)
            .ok_or_else(|| Error::unsupported("input exceeds Rust's allocation limit"))
    }
    pub fn depth(&self) -> usize {
        match self {
            Self::List(v) => 1 + v.iter().map(Self::depth).max().unwrap_or(0),
            _ => 0,
        }
    }
    pub fn truth(&self) -> bool {
        match self {
            Self::Int(n) => !n.is_zero(),
            Self::Char(_) => true,
            Self::List(v) => !v.is_empty(),
        }
    }
    pub fn items(&self) -> Vec<Self> {
        match self {
            Self::List(v) => v.as_ref().clone(),
            _ => vec![self.clone()],
        }
    }
    pub fn digits(&self, base: u32) -> Result<Vec<Self>> {
        let n = self.integer()?;
        let sign = if n.is_negative() { -1 } else { 1 };
        Ok(n.abs()
            .to_radix_be(base)
            .1
            .iter()
            .map(|&d| Self::int(i32::from(d) * sign))
            .collect())
    }
    pub fn digit_items(&self) -> Result<Vec<Self>> {
        match self {
            Self::Int(_) => self.digits(10),
            _ => Ok(self.items()),
        }
    }
    pub fn range_items(&self) -> Result<Vec<Self>> {
        match self {
            Self::Int(n) if n.is_negative() => Ok(vec![]),
            Self::Int(_) => Ok((1..=self.size()?).map(Self::int).collect()),
            _ => Ok(self.items()),
        }
    }
    pub fn compare(&self, other: &Self) -> Result<Ordering> {
        match (self, other) {
            (Self::Int(a), Self::Int(b)) => Ok(a.cmp(b)),
            (Self::Char(a), Self::Char(b)) => Ok(a.cmp(b)),
            (Self::List(a), Self::List(b)) => {
                for (a, b) in a.iter().zip(b.iter()) {
                    let order = a.compare(b)?;
                    if order != Ordering::Equal {
                        return Ok(order);
                    }
                }
                Ok(a.len().cmp(&b.len()))
            }
            _ => Err(Error::unsupported("ordering mixed types")),
        }
    }
    pub fn canonical(&self) -> Json {
        match self {
            Self::Int(n) => json!(["integer", n.to_string()]),
            Self::Char(c) => json!(["character", c.to_string()]),
            Self::List(v) => json!(["list", v.iter().map(Self::canonical).collect::<Vec<_>>()]),
        }
    }
    pub fn from_json(value: &Json, depth: usize) -> Result<Self> {
        if depth > 64 {
            return Err(Error::unsupported("deeply nested input"));
        }
        match value {
            Json::Number(n) => n
                .to_string()
                .parse::<BigInt>()
                .map(Self::Int)
                .map_err(|_| Error::unsupported("floating-point input")),
            Json::String(s) => Ok(Self::list(s.chars().map(Self::Char).collect())),
            Json::Array(a) => Ok(Self::list(
                a.iter()
                    .map(|v| Self::from_json(v, depth + 1))
                    .collect::<Result<_>>()?,
            )),
            Json::Bool(_) => Err(Error::unsupported("boolean input syntax")),
            _ => Err(Error::unsupported("this input type")),
        }
    }
}

pub fn parse_input(raw: &str) -> Result<Value> {
    // Python literals preserve surrogate escapes as separate code points, while
    // JSON combines pairs. Keep those inputs on Python rather than changing them.
    let lower = raw.to_lowercase();
    if [
        "\\ud8", "\\ud9", "\\uda", "\\udb", "\\udc", "\\udd", "\\ude", "\\udf", "\\/",
    ]
    .iter()
    .any(|escape| lower.contains(escape))
    {
        return Err(Error::unsupported("Python-specific string escapes"));
    }
    match serde_json::from_str::<Json>(raw) {
        Ok(value) => Value::from_json(&value, 0),
        Err(_) => Err(Error::unsupported("Python-specific input syntax")),
    }
}

// Match Jelly's stringify rules (including singleton unwrapping), then Python repr.
enum DisplayValue {
    Scalar(String),
    Text(String),
    List(Vec<DisplayValue>),
}
fn stringify(value: &Value, recurse: bool) -> DisplayValue {
    match value {
        Value::Int(n) => DisplayValue::Scalar(n.to_string()),
        Value::Char(c) => DisplayValue::Text(c.to_string()),
        Value::List(v) if v.len() == 1 => stringify(&v[0], true),
        Value::List(v) => {
            if v.is_empty()
                || (v.iter().any(|v| matches!(v, Value::Char(_)))
                    && !v.iter().any(|v| matches!(v, Value::List(_))))
            {
                return DisplayValue::Text(
                    v.iter()
                        .map(|v| match v {
                            Value::Char(c) => c.to_string(),
                            Value::Int(n) => n.to_string(),
                            _ => unreachable!(),
                        })
                        .collect(),
                );
            }
            let values: Vec<_> = v.iter().map(|v| stringify(v, true)).collect();
            if recurse && values.len() == 1 {
                return values.into_iter().next().unwrap();
            }
            if recurse
                && values.iter().any(|v| matches!(v, DisplayValue::Text(_)))
                && !values.iter().any(|v| matches!(v, DisplayValue::List(_)))
            {
                DisplayValue::Text(
                    values
                        .into_iter()
                        .map(|v| match v {
                            DisplayValue::Scalar(s) | DisplayValue::Text(s) => s,
                            _ => unreachable!(),
                        })
                        .collect(),
                )
            } else {
                DisplayValue::List(values)
            }
        }
    }
}
fn repr(value: &DisplayValue, nested: bool, output: &mut String) -> Result<()> {
    if output.len() > 20_000 {
        return Err(Error::output_limit());
    }
    match value {
        DisplayValue::Scalar(s) => output.push_str(s),
        DisplayValue::Text(s) if !nested => output.push_str(s),
        DisplayValue::Text(s) => {
            output.push('\'');
            for c in s.chars() {
                match c {
                    '\'' => output.push_str("\\'"),
                    '\\' => output.push_str("\\\\"),
                    '\n' => output.push_str("\\n"),
                    '\r' => output.push_str("\\r"),
                    '\t' => output.push_str("\\t"),
                    _ => output.push(c),
                }
            }
            output.push('\'');
        }
        DisplayValue::List(v) => {
            output.push('[');
            for (i, item) in v.iter().enumerate() {
                if i > 0 {
                    output.push_str(", ");
                }
                repr(item, true, output)?;
            }
            output.push(']');
        }
    }
    if output.len() > 20_000 {
        return Err(Error::output_limit());
    }
    Ok(())
}
pub fn display(value: &Value) -> Result<String> {
    let mut result = String::new();
    repr(&stringify(value, true), false, &mut result)?;
    Ok(result.trim().to_owned())
}
