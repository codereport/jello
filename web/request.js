// The vocabulary is generated from src/tokens.py; preserve its lookup precedence.
export function prepareRequest(command, words) {
  const separator = command.indexOf("::");
  if (separator < 0) throw new Error("Separate your input and keywords with ::, for example: 5 :: range");
  const keywords = command.slice(separator + 2).trim().split(/\s+/).filter(Boolean);
  if (!keywords.length) throw new Error("Add a keyword after ::. Try range, sq, or sum.");
  if (command.length > 2000 || keywords.length > 80) throw new Error("Try a shorter expression (up to 80 keywords).");
  const vocabulary = new Map();
  for (const word of words) if (!vocabulary.has(word.word)) vocabulary.set(word.word, word.atom);
  const arities = keywords.map((keyword) => {
    if (words.some((word) => word.word === keyword && word.type === "niladic")) return 0;
    if (words.some((word) => word.word === keyword && word.type === "monadic")) return 1;
    if (words.some((word) => word.word === keyword && word.type === "dyadic")) return 2;
    if (keyword === "each") return 10;
    if (keyword === "c") return 50;
    if (words.some((word) => word.word === keyword && word.type === "quick")) return 3;
    if (keyword === ".") return 20;
    if (keyword === ":") return 21;
    return 0;
  });
  const atoms = keywords.map((keyword) => {
    if (vocabulary.has(keyword)) return vocabulary.get(keyword);
    if (/^[-\d,\[\]]+$/.test(keyword)) return keyword;
    throw new Error(`${keyword} is not a valid Jello keyword.`);
  });
  const code = atoms.join("");
  const quicks = new Set(words.filter((word) => word.type === "quick").map((word) => word.atom));
  const separators = new Set(words.filter((word) => word.type === "separators").map((word) => word.atom));
  let prefix = "";
  const prefixes = [];
  for (const atom of atoms) {
    prefix += atom;
    if (separators.has(prefix.at(-1)) || ["Œ", "œ", "Ð"].includes(prefix.at(-1))) continue;
    if (prefix.length < code.length && quicks.has(code[prefix.length])) continue;
    prefixes.push(prefix);
  }
  return { code, arguments: splitArguments(command.slice(0, separator)), prefixes, arities };
}

function splitArguments(text) {
  const result = [], brackets = [];
  let current = "", quote = null, escaped = false;
  for (const char of text.trim()) {
    if (quote) {
      current += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
      current += char;
    } else if ("[({".includes(char)) {
      brackets.push(char);
      current += char;
    } else if ("])}".includes(char)) {
      if (!brackets.length || "[({"["])}".indexOf(char)] !== brackets.pop()) throw new Error("Check the brackets in your input.");
      current += char;
    } else if (/\s/.test(char) && !brackets.length) {
      if (current) { result.push(current); current = ""; }
    } else current += char;
  }
  if (quote || brackets.length) throw new Error("Close the quotes and brackets in your input.");
  if (current) result.push(current);
  if (result.length > 2) throw new Error("Use at most two inputs, for example: 6 7 :: *");
  return result;
}
