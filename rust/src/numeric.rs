//! Numeric promotion follows Jellyfish: exact integer division stays integral.
use crate::{value::Value, Error, Result};
use num_bigint::BigInt;
use num_integer::Integer;
use num_rational::BigRational;
use num_traits::{FromPrimitive, Signed, ToPrimitive, Zero};

pub fn binary(atom: &str, left: &Value, right: &Value) -> Result<Value> {
    if let (Value::Int(a), Value::Int(b)) = (left, right) {
        match atom {
            "+" => return Ok(Value::Int(a + b)),
            "_" => return Ok(Value::Int(a - b)),
            "×" => return Ok(Value::Int(a * b)),
            "÷" | ":" | "%" => {
                if b.is_zero() {
                    return Err(Error::unsupported("division by zero"));
                }
                let (quotient, remainder) = a.div_mod_floor(b);
                if atom == "%" {
                    return Ok(Value::Int(remainder));
                }
                if atom == ":" || remainder.is_zero() {
                    return Ok(Value::Int(quotient));
                }
                let ratio = BigRational::new(a.clone(), b.clone());
                return Value::float(
                    ratio
                        .to_f64()
                        .ok_or_else(|| Error::unsupported("large fractional results"))?,
                );
            }
            "*" if !b.is_negative() => {
                let exponent = right.size()?;
                if a.bits().saturating_mul(exponent as u64) > 20_000_000 {
                    return Err(Error::unsupported("large powers"));
                }
                return Ok(Value::Int(a.pow(exponent as u32)));
            }
            _ => {}
        }
    }
    let a = left.number()?;
    let b = right.number()?;
    match atom {
        "+" => Value::float(a + b),
        "_" => Value::float(a - b),
        "×" => Value::float(a * b),
        "÷" if b != 0.0 => Value::float(a / b),
        "%" | ":" if b != 0.0 => {
            // Derive floor division from the remainder, preserving Python's
            // behavior near quotient boundaries (for example, 1.0 // 0.1).
            let mut remainder = a % b;
            let mut quotient = (a - remainder) / b;
            if remainder != 0.0 {
                if remainder.is_sign_negative() != b.is_sign_negative() {
                    remainder += b;
                    quotient -= 1.0;
                }
            } else {
                remainder = 0.0f64.copysign(b);
            }
            if atom == "%" {
                return Value::float(remainder);
            }
            let floor = quotient.floor();
            let rounded = if quotient - floor > 0.5 {
                floor + 1.0
            } else {
                floor
            };
            BigInt::from_f64(rounded)
                .map(Value::Int)
                .ok_or_else(|| Error::unsupported("non-finite floor division"))
        }
        "*" => Value::float(a.powf(b)),
        _ => Err(Error::unsupported("division by zero")),
    }
}

pub fn unary(atom: &str, arg: &Value) -> Result<Value> {
    match atom {
        "A" => match arg {
            Value::Int(n) => Ok(Value::Int(n.abs())),
            _ => Value::float(arg.number()?.abs()),
        },
        "N" => match arg {
            Value::Int(n) => Ok(Value::Int(-n)),
            _ => Value::float(-arg.number()?),
        },
        "C" => binary("_", &Value::int(1), arg),
        "H" => binary("÷", arg, &Value::int(2)),
        "Ḥ" => binary("×", arg, &Value::int(2)),
        "²" => binary("*", arg, &Value::int(2)),
        "‘" => binary("+", arg, &Value::int(1)),
        "’" => binary("_", arg, &Value::int(1)),
        "İ" => binary("÷", &Value::int(1), arg),
        "Ċ" | "Ḟ" => match arg {
            Value::Float(n) => Ok(Value::Int(
                BigInt::from_f64(if atom == "Ċ" { n.ceil() } else { n.floor() }).unwrap(),
            )),
            _ => Ok(arg.clone()),
        },
        "½" => Value::float(arg.number()?.sqrt()),
        _ => Err(Error::unsupported("this numeric operation")),
    }
}
