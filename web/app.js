import { KeywordEditor } from "./editor.js";
import { PlaygroundSettings } from "./settings.js";
import { ChallengePicker } from "./challenges.js";

const $ = (selector) => document.querySelector(selector);
const input = $("#expression");
const transcript = $("#transcript");
const runButton = $("#run");
const LIVE_DELAY = 600;
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
let initialRun = true, historyIndex = 0, draft = "";
let liveEnabled = false, liveTimer, queuedLive = null, liveEntry = null, activeRun = null;
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
  $("#welcome h3").textContent = "Shared expression loaded.";
  $("#welcome p").textContent = "Review the expression above, then press Enter.";
}

const settings = new PlaygroundSettings((key, value) => {
  if (key === "liveMode") {
    liveEnabled = value;
    initialRun = false;
    updateLiveMode();
    if (liveEnabled) scheduleLive();
    else cancelPendingLive();
  }
});
liveEnabled = settings.values.liveMode;

const editor = new KeywordEditor(input, {
  onChange: expressionChanged,
  onHistory: recallHistory,
  onStop: () => { if (state === "running") stopExecution(); else cancelPendingLive(); },
  closeOnTab: () => liveEnabled,
});

new ChallengePicker(input, editor, (command) => {
  editor.setValue(command, { notify: true });
  input.focus({ preventScroll: true });
  editor.closeSuggestions();
});

function cancelPendingLive() {
  clearTimeout(liveTimer);
  queuedLive = null;
}

function expressionChanged() {
  initialRun = false;
  if (activeRun?.live) activeRun.entry.hidden = activeRun.command !== input.value.trim();
  scheduleLive();
}

function scheduleLive() {
  cancelPendingLive();
  if (!liveEnabled || !input.value.trim()) return;
  liveTimer = setTimeout(() => {
    queuedLive = input.value.trim();
    flushLive();
  }, LIVE_DELAY);
}

function flushLive() {
  if (!liveEnabled || !queuedLive || editor.composing) return;
  if (queuedLive !== input.value.trim()) { queuedLive = null; return; }
  if (state === "running" && activeRun?.live) {
    // A paused edit supersedes a slow preview; never queue obsolete programs in the worker.
    clearTimeout(executionTimer);
    worker.terminate();
    ++requestId;
    activeEntry.remove();
    if (liveEntry === activeEntry) liveEntry = null;
    activeEntry = activeRun = null;
    initialRun = false;
    startWorker();
    return;
  }
  if (state !== "ready") return;
  const command = queuedLive;
  queuedLive = null;
  execute(command, { live: true, remember: false });
}

function updateLiveMode() {
  $(".repl").classList.toggle("live-mode", liveEnabled);
  $("#session-mode").textContent = liveEnabled ? "/ live" : "/ session";
  if (liveEntry?.isConnected) liveEntry.querySelector(".entry-badge").textContent = liveEnabled ? "live" : "preview";
}

function recallHistory(direction) {
  if (!history.length) return;
  if (historyIndex === history.length) draft = input.value;
  historyIndex = Math.max(0, Math.min(history.length, historyIndex + direction));
  editor.setValue(historyIndex === history.length ? draft : history[historyIndex], { notify: true });
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
  if (next !== "ready") updateExecutionTime();
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
  setState("loading", "initializing…");
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
        setState("ready", "ready");
        if (initialRun) {
          initialRun = false;
          execute(input.value);
        } else flushLive();
      } else if (data.type === "load-error") {
        console.error("Interpreter initialization:", data.message);
        showLoadError();
      } else if (data.id === requestId && (data.type === "result" || data.type === "error")) {
        clearTimeout(executionTimer);
        const current = !activeRun?.live || activeRun.command === input.value.trim();
        if (current) renderResponse(activeEntry, data);
        else {
          activeEntry?.remove();
          if (liveEntry === activeEntry) liveEntry = null;
        }
        activeEntry = activeRun = null;
        setState("ready", "ready");
        if (current) $("#input-state").textContent = data.type === "error" ? "exit: error" : "exit: 0";
        flushLive();
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

function createEntry(command, live) {
  $("#welcome")?.remove();
  const entry = element("article", "entry");
  entry.dataset.command = command;
  const row = element("div", "entry-command");
  row.append(element("span", "entry-prompt", "›"));
  const commandText = element("div", "command-code");
  editor.renderCommand(commandText, command);
  row.append(commandText);
  if (live) row.append(element("span", "entry-badge", "live"));
  entry.append(row, element("div", "entry-meta pending", "Thinking…"));
  if (live) {
    entry.classList.add("live-entry");
    if (liveEntry?.isConnected) liveEntry.replaceWith(entry);
    else transcript.prepend(entry);
    liveEntry = entry;
  } else transcript.append(entry);
  while (transcript.children.length > 30) {
    [...transcript.children].find((child) => child !== liveEntry).remove();
  }
  transcript.scrollTop = live ? 0 : transcript.scrollHeight;
  return entry;
}

function execute(command, { live = liveEnabled, remember = true } = {}) {
  if (state !== "ready") return;
  command = command.trim();
  if (!command) { input.focus(); return; }
  if (remember) {
    cancelPendingLive();
    editor.setValue(command);
    if (history.at(-1) !== command) history.push(command);
    history = history.slice(-100);
    historyIndex = history.length;
    draft = "";
    try { localStorage.setItem("jello-history", JSON.stringify(history)); } catch { /* Optional persistence. */ }
  }
  setState("running", "running…");
  activeEntry = createEntry(command, live);
  activeRun = { command, live, entry: activeEntry };
  worker.postMessage({ type: "run", id: ++requestId, command });
  executionTimer = setTimeout(() => stopExecution("That took more than 10 seconds. Try a smaller input or a shorter program."), 10000);
}

function stopExecution(message = "Stopped. Try a smaller input or a different expression.") {
  if (state !== "running") return;
  clearTimeout(executionTimer);
  cancelPendingLive();
  worker.terminate();
  ++requestId;
  renderResponse(activeEntry, { type: "error", message });
  activeEntry = activeRun = null;
  initialRun = false;
  startWorker();
}

function renderResponse(entry, data) {
  if (!entry) return;
  updateExecutionTime(data.duration);
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
    const jellyCode = element("code", "jelly-code");
    editor.renderAtoms(jellyCode, data.code, entry.dataset.command);
    meta.append(element("span", "", "JELLY"), jellyCode, element("span", "meta-divider", "·"), element("span", "timing", formatDuration(data.duration)));
    entry.append(output, meta);
    if (data.steps.length || data.tree) {
      const details = element("details", "trace");
      if ((entry === liveEntry || transcript.children.length === 1) && !matchMedia("(max-width: 480px)").matches) details.open = true;
      details.append(element("summary", "", "Follow the chain"));
      const content = element("div", "trace-content");
      const steps = element("div");
      steps.append(element("div", "trace-label", "ONE STEP AT A TIME"));
      for (const step of data.steps) {
        const row = element("div", "trace-step");
        const code = element("span");
        editor.renderAtoms(code, step.code, entry.dataset.command);
        row.append(code, element("span", "step-arrow", "→"), element("span", "", step.result));
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
  transcript.scrollTop = entry === liveEntry ? 0 : transcript.scrollHeight;
}

function formatDuration(duration) {
  return duration < 1000 ? `${duration.toFixed(1)} ms` : `${(duration / 1000).toFixed(2)} s`;
}

function updateExecutionTime(duration) {
  const valid = Number.isFinite(duration) && duration >= 0;
  $("#execution-status").hidden = !valid;
  $("#execution-time").textContent = valid ? formatDuration(duration) : "";
}

$("#repl-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (state === "running") stopExecution();
  else execute(input.value);
});
$("#retry").addEventListener("click", startWorker);
$("#clear").addEventListener("click", () => {
  cancelPendingLive();
  editor.closeSuggestions();
  if (state === "running") stopExecution();
  transcript.replaceChildren(welcomeTemplate.cloneNode(true));
  updateExecutionTime();
  liveEntry = null;
  $("#welcome h3").textContent = "Session cleared.";
  $("#welcome p").textContent = "Enter an expression above or select an example.";
  $("#input-state").textContent = "";
  input.focus();
});
$("#share").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.hash = new URLSearchParams({ code: input.value.trim() }).toString();
  window.history.replaceState(null, "", url);
  try { await navigator.clipboard.writeText(url.href); notify("Expression link copied."); }
  catch { notify("Your link is ready in the address bar."); }
});
document.querySelectorAll(".example").forEach((example) => {
  example.addEventListener("click", () => {
    if (state === "running") { notify("Stop the current expression to try another."); return; }
    editor.setValue(example.dataset.command);
    execute(input.value);
    input.focus({ preventScroll: true });
    if (matchMedia("(max-width: 760px)").matches) $(".repl").scrollIntoView({ block: "start", behavior: "smooth" });
  });
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
    line.append(element("span", `word-name token-${word.type}`, word.word), element("span", `word-atom token-${word.type}`, word.atom));
    button.append(line, element("span", "word-description", descriptions[word.word] || typeDescriptions[word.type]));
    button.title = `${typeDescriptions[word.type]} — add ${word.word}`;
    button.addEventListener("click", () => {
      const value = input.value.includes("::") ? input.value : `${input.value.trim()} ::`;
      editor.setValue(`${value.trimEnd()} ${word.word}`, { notify: true });
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
      notify(`Added ${word.word} to your expression.`);
    });
    grid.append(button);
  }
  if (!visible.length) grid.append(element("p", "empty-words", "No words found. Try another search."));
  $("#word-count").textContent = `${filtered.length} words`;
  $("#show-words").hidden = Boolean(search) || activeFilter !== "all" || filtered.length <= 12;
  $("#show-words").textContent = expandedWords ? "Show fewer ↑" : `Show all ${words.length} keywords ↓`;
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
}).then((vocabulary) => {
  words = editor.setVocabulary(vocabulary);
  document.querySelectorAll(".example").forEach((example) => editor.renderCommand(example.querySelector("code"), example.dataset.command));
  renderWords();
}).catch(() => {
  $("#word-grid").append(element("p", "empty-words", "The wordbook couldn't load. Reload to try again."));
});
updateLiveMode();
startWorker();
