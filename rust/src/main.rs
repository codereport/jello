use std::io::{self, BufRead};

fn main() {
    for line in io::stdin().lock().lines() {
        match line {
            Ok(line) => println!("{}", jello_engine::evaluate_json(&line)),
            Err(_) => break,
        }
    }
}
