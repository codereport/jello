use crate::{Error, Result};
use num_bigint::BigInt;
use num_traits::{FromPrimitive, Signed, ToPrimitive, Zero};
use serde_json::{json, Value as Json};
use std::{
    cmp::Ordering,
    hash::{Hash, Hasher},
    rc::Rc,
};

#[derive(Clone, Debug)]
pub enum Value {
    Int(BigInt),
    // Only finite values enter the engine, through Value::float.
    Float(f64),
    Char(char),
    List(Rc<Vec<Value>>),
}

impl PartialEq for Value {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::Int(a), Self::Int(b)) => a == b,
            (Self::Float(a), Self::Float(b)) => a == b,
            (Self::Int(a), Self::Float(b)) | (Self::Float(b), Self::Int(a)) => {
                b.fract() == 0.0 && BigInt::from_f64(*b).as_ref() == Some(a)
            }
            (Self::Char(a), Self::Char(b)) => a == b,
            (Self::List(a), Self::List(b)) => a == b,
            _ => false,
        }
    }
}
impl Eq for Value {}
impl Hash for Value {
    fn hash<H: Hasher>(&self, state: &mut H) {
        match self {
            Self::Int(n) => {
                0u8.hash(state);
                n.hash(state);
            }
            Self::Float(n) if n.fract() == 0.0 => {
                0u8.hash(state);
                BigInt::from_f64(*n).unwrap().hash(state);
            }
            Self::Float(n) => {
                1u8.hash(state);
                n.to_bits().hash(state);
            }
            Self::Char(c) => {
                2u8.hash(state);
                c.hash(state);
            }
            Self::List(v) => {
                3u8.hash(state);
                v.hash(state);
            }
        }
    }
}

impl Value {
    pub fn int(n: impl Into<BigInt>) -> Self {
        Self::Int(n.into())
    }
    pub fn list(v: Vec<Self>) -> Self {
        Self::List(Rc::new(v))
    }
    pub fn float(n: f64) -> Result<Self> {
        if n.is_finite() {
            Ok(Self::Float(n))
        } else {
            Err(Error::unsupported("non-finite numeric results"))
        }
    }
    pub fn number(&self) -> Result<f64> {
        match self {
            Self::Float(n) => Ok(*n),
            Self::Int(n) => n
                .to_f64()
                .filter(|n| n.is_finite())
                .ok_or_else(|| Error::unsupported("integers outside the floating-point range")),
            _ => Err(Error::unsupported("non-numeric arithmetic")),
        }
    }
    pub fn truncated(&self) -> Result<BigInt> {
        match self {
            Self::Int(n) => Ok(n.clone()),
            Self::Float(n) => {
                BigInt::from_f64(*n).ok_or_else(|| Error::unsupported("non-finite integers"))
            }
            _ => Err(Error::unsupported("non-numeric arithmetic")),
        }
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
            Self::Float(n) => *n != 0.0,
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
            Self::Float(_) => Err(Error::unsupported("digits of a floating-point scalar")),
            _ => Ok(self.items()),
        }
    }
    pub fn range_items(&self) -> Result<Vec<Self>> {
        match self {
            Self::Int(_) | Self::Float(_) => {
                let n = Self::Int(self.truncated()?);
                if n.integer()?.is_negative() {
                    Ok(vec![])
                } else {
                    Ok((1..=n.size()?).map(Self::int).collect())
                }
            }
            _ => Ok(self.items()),
        }
    }
    pub fn compare(&self, other: &Self) -> Result<Ordering> {
        match (self, other) {
            (Self::Int(a), Self::Int(b)) => Ok(a.cmp(b)),
            (Self::Float(a), Self::Float(b)) => Ok(a.partial_cmp(b).unwrap()),
            (Self::Int(a), Self::Float(b)) => Ok(compare_int_float(a, *b)),
            (Self::Float(a), Self::Int(b)) => Ok(compare_int_float(b, *a).reverse()),
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
            Self::Float(n) => json!(["float", format!("{:016x}", n.to_bits())]),
            Self::Char(c) => json!(["character", c.to_string()]),
            Self::List(v) => json!(["list", v.iter().map(Self::canonical).collect::<Vec<_>>()]),
        }
    }
    pub fn from_json(value: &Json, depth: usize) -> Result<Self> {
        if depth > 64 {
            return Err(Error::unsupported("deeply nested input"));
        }
        match value {
            Json::Number(n) => {
                let raw = n.to_string();
                if raw.contains(['.', 'e', 'E']) {
                    Self::float(
                        raw.parse()
                            .map_err(|_| Error::unsupported("this floating-point input"))?,
                    )
                } else {
                    raw.parse::<BigInt>()
                        .map(Self::Int)
                        .map_err(|_| Error::unsupported("this integer input"))
                }
            }
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

fn compare_int_float(integer: &BigInt, float: f64) -> Ordering {
    let order = integer.cmp(&BigInt::from_f64(float).unwrap());
    if order != Ordering::Equal || float.fract() == 0.0 {
        order
    } else if float.is_sign_negative() {
        Ordering::Greater
    } else {
        Ordering::Less
    }
}

// Python's shortest float representation uses signed, two-digit exponents.
fn float_repr(n: f64) -> String {
    let text = format!("{n:?}");
    if let Some((mantissa, exponent)) = text.split_once('e') {
        let exponent: i32 = exponent.parse().unwrap();
        format!("{mantissa}e{exponent:+03}")
    } else {
        text
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
        Value::Float(n) => DisplayValue::Scalar(float_repr(*n)),
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
                            Value::Float(n) => float_repr(*n),
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
