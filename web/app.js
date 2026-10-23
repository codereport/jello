const $ = (selector) => document.querySelector(selector);
const input = $("#expression");
const transcript = $("#transcript");
const runButton = $("#run");
const welcomeTemplate = $("#welcome").cloneNode(true);
const descriptions = {
  range: "The integers from 1 to your input", iota: "The integers from 1 to your input",
  range0: "Count up from zero", iota0: "Count up from zero", sq: "Square each number",
  sum: "Add everything together", prod: "Multiply everything together", double: "Multiply by two",
  half: "Divide by two", add1: "One more", sub1: "One less", rev: "Reverse the order",
  sort: "Put values in order", uniq: "Keep distinct values", len: "Count the items",
  "odd?": "Is it an odd number?", "even?": "Is it an even number?", bits: "Count the set bits",
  sums: "Keep a running total", filter: "Keep values matching a predicate", each: "Apply to each item",
  fold: "Combine the items", scan: "Combine and keep intermediate results", "+": "Add two values",
  "*": "Multiply two values", "_": "Subtract the right from the left", div: "Divide two values",
  pow: "Raise to a power", min: "The smaller value", max: "The larger value",
  maxr: "The largest item", minr: "The smallest item", head: "The first item", last: "The last item",
  flat: "Flatten nested lists", is_prime: "Is it a prime number?", factors: "Find the prime factors",
  deltas: "Differences between neighbors", keep: "Keep items using a mask", group: "Group equal neighbors",
  factorial: "Multiply the integers up to n", sqrt: "Take the square root", abs: "The absolute value",
};
const typeDescriptions = { monadic: "Monad · one input", dyadic: "Dyad · two inputs", niladic: "Nilad · a constant", quick: "Quick · modifies a function", separators: "Starts a new chain" };
const featuredWords = ["range", "sq", "sum", "rev", "double", "odd?", "filter", "each", "sort", "uniq", "len", "sums"];
let worker, state = "loading", requestId = 0, activeEntry, executionTimer, loadTimer;
let initialRun = true, historyIndex = 0, draft = "", completion;
let history = [], words = [], activeFilter = "all", expandedWords = false;

try {
  const saved = JSON.parse(localStorage.getItem("jello-history") || "[]");
  if (Array.isArray(saved)) history = saved.filter((item) => typeof item === "string").slice(-100);
} catch { /* The playground also works when storage is unavailable. */ }
historyIndex = history.length;
const sharedExpression = new URLSearchParams(location.hash.slice(1)).get("code");
if (sharedExpression) {
  input.value = sharedExpression.slice(0, 2000);
  initialRun = false;
  $("#welcome h3").textContent = "Someone left you a little idea.";
  $("#welcome p").textContent = "Their expression is ready below. Press Run to see what it does.";
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let toastTimer;
function notify(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function setState(next, message) {
  state = next;
  $("#runtime-status").className = `runtime-status ${next}`;
  $("#status-text").textContent = message;
  $("#retry").hidden = next !== "error";
  runButton.disabled = next === "loading" || next === "error";
  runButton.classList.toggle("running", next === "running");
  $("#run-label").textContent = next === "running" ? "Stop" : "Run";
  $("#run-icon").textContent = next === "running" ? "□" : "↵";
  runButton.setAttribute("aria-label", next === "running" ? "Stop execution" : "Run expression");
}

function showLoadError() {
  clearTimeout(loadTimer);
  worker?.terminate();
  setState("error", "Couldn't load the interpreter.");
  const welcome = $("#welcome p");
  if (welcome) welcome.textContent = "Check your connection, then use Retry above. The first visit downloads the interpreter.";
}

function startWorker() {
  worker?.terminate();
  clearTimeout(loadTimer);
  setState("loading", "Waking up the interpreter…");
  try {
    const currentWorker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    worker = currentWorker;
    loadTimer = setTimeout(() => {
      if (worker === currentWorker && state === "loading") showLoadError();
    }, 90000);
    currentWorker.onmessage = ({ data }) => {
      if (worker !== currentWorker) return;
      if (data.type === "status") {
        setState("loading", data.message);
      } else if (data.type === "ready") {
        clearTimeout(loadTimer);
        setState("ready", "Ready when you are");
        if (initialRun) {
          initialRun = false;
          execute(input.value);
        }
      } else if (data.type === "load-error") {
        console.error("Interpreter initialization:", data.message);
        showLoadError();
      } else if (data.id === requestId && (data.type === "result" || data.type === "error")) {
        clearTimeout(executionTimer);
        renderResponse(activeEntry, data);
        activeEntry = null;
        setState("ready", "Ready when you are");
        $("#input-state").textContent = data.type === "error" ? "A little change, another try." : "What happens next?";
      }
    };
    currentWorker.onerror = (event) => {
      event.preventDefault();
      if (worker !== currentWorker) return;
      if (state === "running") stopExecution("The interpreter stopped unexpectedly. Try again in a moment.");
      else showLoadError();
    };
  } catch {
    showLoadError();
  }
}

function createEntry(command) {
  $("#welcome")?.remove();
  const entry = element("article", "entry");
  const row = element("div", "entry-command");
  row.append(element("span", "entry-prompt", "›"));
  const commandText = element("div");
  const separator = command.indexOf("::");
  if (separator < 0) {
    commandText.textContent = command;
  } else {
    commandText.append(element("span", "argument", command.slice(0, separator).trim()));
    commandText.append(element("span", "separator", "::"));
    commandText.append(element("span", "program", command.slice(separator + 2).trim()));
  }
  row.append(commandText);
  entry.append(row, element("div", "entry-meta pending", "Thinking…"));
  transcript.append(entry);
  while (transcript.children.length > 30) transcript.firstElementChild.remove();
  transcript.scrollTop = transcript.scrollHeight;
  return entry;
}

function execute(command) {
  if (state !== "ready") return;
  command = command.trim();
  if (!command) { input.focus(); return; }
  input.value = command;
  completion = null;
  if (history.at(-1) !== command) history.push(command);
  history = history.slice(-100);
  historyIndex = history.length;
  draft = "";
  try { localStorage.setItem("jello-history", JSON.stringify(history)); } catch { /* Optional persistence. */ }
  setState("running", "Following the chain…");
  activeEntry = createEntry(command);
  worker.postMessage({ type: "run", id: ++requestId, command });
  executionTimer = setTimeout(() => stopExecution("That took more than 10 seconds. Try a smaller input or a shorter program."), 10000);
}

function stopExecution(message = "Stopped. Try a smaller input or a different expression.") {
  if (state !== "running") return;
  clearTimeout(executionTimer);
  worker.terminate();
  ++requestId;
  renderResponse(activeEntry, { type: "error", message });
  activeEntry = null;
  initialRun = false;
  startWorker();
}

function renderResponse(entry, data) {
  if (!entry) return;
  entry.querySelector(".pending")?.remove();
  if (data.type === "error") {
    entry.classList.add("error-entry");
    entry.append(element("p", "error-message", data.message || "Something went wrong. Try another expression."));
  } else {
    const output = element("div", "entry-output");
    const result = element("pre", "result", data.result || "(no output)");
    const copy = element("button", "copy-result", "Copy");
    copy.setAttribute("aria-label", "Copy result");
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(data.result); notify("Result copied."); }
      catch { notify("Select the result text to copy it."); }
    });
    output.append(result, copy);
    const meta = element("div", "entry-meta");
    meta.append(element("span", "", "JELLY"), element("code", "jelly-code", data.code), element("span", "meta-divider", "·"), element("span", "", `${Math.max(1, Math.round(data.duration))} ms`));
    entry.append(output, meta);
    if (data.steps.length || data.tree) {
      const details = element("details", "trace");
      if (transcript.children.length === 1 && !matchMedia("(max-width: 480px)").matches) details.open = true;
      details.append(element("summary", "", "Follow the chain"));
      const content = element("div", "trace-content");
      const steps = element("div");
      steps.append(element("div", "trace-label", "ONE STEP AT A TIME"));
      for (const step of data.steps) {
        const row = element("div", "trace-step");
        row.append(element("span", "", step.code), element("span", "step-arrow", "→"), element("span", "", step.result));
        steps.append(row);
      }
      content.append(steps);
      if (data.tree) {
        const tree = element("div");
        tree.append(element("div", "trace-label", "THE COMBINATOR CHAIN"), element("pre", "trace-tree", data.tree), element("div", "chain-info", `${data.arity} · ${data.chainType}${data.chain ? ` · ${data.chain}` : ""}`));
        content.append(tree);
      }
      details.append(content);
      entry.append(details);
    }
  }
  transcript.scrollTop = transcript.scrollHeight;
}

$("#repl-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (state === "running") stopExecution();
  else execute(input.value);
});
$("#retry").addEventListener("click", startWorker);
$("#clear").addEventListener("click", () => {
  if (state === "running") stopExecution();
  transcript.replaceChildren(welcomeTemplate.cloneNode(true));
  $("#welcome h3").textContent = "A fresh little start.";
  $("#welcome p").textContent = "Try an expression below, or borrow an idea from the examples.";
  input.focus();
});
$("#share").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.hash = new URLSearchParams({ code: input.value.trim() }).toString();
  window.history.replaceState(null, "", url);
  try { await navigator.clipboard.writeText(url.href); notify("Link copied. Share a little discovery."); }
  catch { notify("Your link is ready in the address bar."); }
});
document.querySelectorAll(".example").forEach((example) => {
  example.addEventListener("click", () => {
    if (state === "running") { notify("Stop the current expression to try another."); return; }
    input.value = example.dataset.command;
    execute(input.value);
    input.focus({ preventScroll: true });
    if (matchMedia("(max-width: 760px)").matches) $(".repl").scrollIntoView({ block: "start", behavior: "smooth" });
  });
});

input.addEventListener("input", () => { completion = null; });
input.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state === "running") stopExecution();
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    if (!history.length) return;
    event.preventDefault();
    if (historyIndex === history.length) draft = input.value;
    historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
    input.value = historyIndex === history.length ? draft : history[historyIndex];
    input.setSelectionRange(input.value.length, input.value.length);
    completion = null;
  } else if (event.key === "Tab" && !event.shiftKey) {
    const beforeCaret = input.value.slice(0, input.selectionStart);
    if (!beforeCaret.includes("::")) return;
    if (!completion || completion.value !== input.value || completion.caret !== input.selectionStart) {
      const prefix = beforeCaret.match(/[^\s:]+$/)?.[0];
      if (!prefix) return;
      const matches = words.map((word) => word.word).filter((word) => word.startsWith(prefix)).sort((a, b) => a.length - b.length || a.localeCompare(b));
      if (!matches.length) return;
      completion = { matches, index: 0, start: beforeCaret.length - prefix.length, end: input.selectionStart };
    } else {
      completion.index = (completion.index + 1) % completion.matches.length;
    }
    event.preventDefault();
    const replacement = completion.matches[completion.index];
    input.setRangeText(replacement, completion.start, completion.end, "end");
    completion.end = input.selectionStart;
    completion.value = input.value;
    completion.caret = input.selectionStart;
  } else if (event.key !== "Tab") {
    completion = null;
  }
});

function renderWords() {
  const search = $("#word-search").value.trim().toLowerCase();
  const filtered = words.filter((word) => (activeFilter === "all" || word.type === activeFilter) && `${word.word} ${word.atom} ${descriptions[word.word] || ""}`.toLowerCase().includes(search));
  const showAll = expandedWords || search || activeFilter !== "all";
  const visible = showAll ? filtered : [...filtered].sort((a, b) => {
    const ai = featuredWords.indexOf(a.word), bi = featuredWords.indexOf(b.word);
    return (ai < 0 ? 1000 : ai) - (bi < 0 ? 1000 : bi);
  }).slice(0, 12);
  const grid = $("#word-grid");
  grid.replaceChildren();
  for (const word of visible) {
    const button = element("button", "word");
    const line = element("span", "word-line");
    line.append(element("span", "word-name", word.word), element("span", "word-atom", word.atom));
    button.append(line, element("span", "word-description", descriptions[word.word] || typeDescriptions[word.type]));
    button.title = `${typeDescriptions[word.type]} — add ${word.word}`;
    button.addEventListener("click", () => {
      if (!input.value.includes("::")) input.value = `${input.value.trim()} ::`;
      input.value = `${input.value.trimEnd()} ${word.word}`;
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
      completion = null;
      notify(`Added ${word.word} to your expression.`);
    });
    grid.append(button);
  }
  if (!visible.length) grid.append(element("p", "empty-words", "No words found. Try another search."));
  $("#word-count").textContent = `${filtered.length} words`;
  $("#show-words").hidden = Boolean(search) || activeFilter !== "all" || filtered.length <= 12;
  $("#show-words").textContent = expandedWords ? "A little less ↑" : `Explore all ${words.length} words ↓`;
}
$("#word-search").addEventListener("input", renderWords);
$("#show-words").addEventListener("click", () => { expandedWords = !expandedWords; renderWords(); });
document.querySelectorAll(".filter").forEach((filter) => {
  filter.addEventListener("click", () => {
    activeFilter = filter.dataset.filter;
    document.querySelectorAll(".filter").forEach((button) => {
      const active = button === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderWords();
  });
});

fetch(new URL("./keywords.json", import.meta.url)).then((response) => {
  if (!response.ok) throw new Error("Wordbook unavailable");
  return response.json();
}).then((vocabulary) => { words = vocabulary; renderWords(); }).catch(() => {
  $("#word-grid").append(element("p", "empty-words", "The wordbook couldn't load. Reload to try again."));
});
startWorker();
