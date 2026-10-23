mod atoms;
mod diagram;
mod eval;
mod numeric;
mod parser;
mod value;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value as Json};

type Result<T> = std::result::Result<T, Error>;

#[derive(Debug)]
pub struct Error {
    pub unsupported: bool,
    pub message: String,
}
impl Error {
    fn unsupported(what: &str) -> Self {
        Self {
            unsupported: true,
            message: format!("Rust does not yet support {what}."),
        }
    }
    fn output_limit() -> Self {
        Self {
            unsupported: false,
            message: "The result is too long to display. Try a smaller input.".into(),
        }
    }
    fn invalid(message: &str) -> Self {
        Self {
            unsupported: false,
            message: message.into(),
        }
    }
}

#[derive(Deserialize)]
pub struct Request {
    pub code: String,
    pub arguments: Vec<String>,
    #[serde(default)]
    pub prefixes: Vec<String>,
    #[serde(default)]
    pub arities: Vec<i32>,
}

#[derive(Serialize)]
struct Step {
    code: String,
    result: String,
}

fn evaluate(request: Request) -> Result<Json> {
    if request.arguments.len() > 2 {
        return Err(Error::unsupported("more than two inputs"));
    }
    let arguments = request
        .arguments
        .iter()
        .map(|a| value::parse_input(a))
        .collect::<Result<Vec<_>>>()?;
    let program = parser::parse(&request.code)?;
    let mut engine = eval::Engine::new();
    let result = engine.call(&program, &arguments)?;
    let formatted = value::display(&result)?;
    let mut steps = vec![];
    for code in request.prefixes {
        if code == request.code {
            steps.push(Step {
                code,
                result: formatted.clone(),
            });
            continue;
        }
        if let Ok(prefix) = parser::parse(&code) {
            if let Ok(value) = eval::Engine::new().call(&prefix, &arguments) {
                if let Ok(result) = value::display(&value) {
                    steps.push(Step { code, result });
                }
            }
        }
    }
    let (chain, tree) = diagram::draw(&request.arities, arguments.len() <= 1).unwrap_or_default();
    let arity = request
        .arities
        .iter()
        .map(|a| match a {
            3 | 10 | 50 => "q".to_owned(),
            20 | 21 => "s".to_owned(),
            _ => a.to_string(),
        })
        .collect::<Vec<_>>()
        .join("-");
    Ok(
        json!({"type":"result", "code":request.code, "result":formatted, "value":result.canonical(), "steps":steps, "tree":tree, "chain":chain, "arity":arity, "chainType":if arguments.len() <= 1 { "monadic" } else { "dyadic" }}),
    )
}

pub fn evaluate_json(input: &str) -> String {
    let result = serde_json::from_str::<Request>(input)
        .map_err(|_| Error::invalid("Invalid evaluation request."))
        .and_then(evaluate);
    match result {
        Ok(result) => result.to_string(),
        Err(error) => json!({"type": if error.unsupported { "unsupported" } else { "error" }, "message":error.message}).to_string(),
    }
}

// Minimal UTF-8/JSON ABI. Every allocated buffer is released by the worker.
// Keeping the bridge here avoids a generated JS runtime or a second build tool.
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn engine_alloc(length: usize) -> *mut u8 {
    Box::into_raw(vec![0u8; length].into_boxed_slice()) as *mut u8
}

#[cfg(target_arch = "wasm32")]
#[no_mangle]
/// # Safety
/// The buffer must be a live allocation from `engine_alloc` or `engine_evaluate`
/// with the same length. It must not be accessed or freed again afterward.
pub unsafe extern "C" fn engine_free(pointer: *mut u8, length: usize) {
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(
        pointer, length,
    )));
}

#[cfg(target_arch = "wasm32")]
#[no_mangle]
/// # Safety
/// The input must point to a live `engine_alloc` buffer of the given length.
/// The caller retains ownership of the input and must free the returned buffer.
pub unsafe extern "C" fn engine_evaluate(pointer: *const u8, length: usize) -> u64 {
    let input = std::str::from_utf8(std::slice::from_raw_parts(pointer, length)).unwrap_or("");
    let bytes = evaluate_json(input).into_bytes().into_boxed_slice();
    let length = bytes.len() as u64;
    let pointer = Box::into_raw(bytes) as *mut u8 as u64;
    (pointer << 32) | length
}
