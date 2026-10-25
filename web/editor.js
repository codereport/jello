const typeLabels = { monadic: "monad", dyadic: "dyad", quick: "quick", niladic: "nilad", separators: "separator" };
const commonWords = ["range", "sq", "sum", "rev", "double", "odd?", "filter", "each"];

function span(className, text) {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

export class KeywordEditor {
  constructor(input, { onChange, onHistory, onStop, closeOnTab = () => false }) {
    this.input = input;
    this.onChange = onChange;
    this.onHistory = onHistory;
    this.onStop = onStop;
    this.closeOnTab = closeOnTab;
    this.vocabulary = new Map();
    this.overlay = document.querySelector("#expression-highlight span");
    this.conversion = document.querySelector("#converted-expression");
    this.panel = document.querySelector("#autocomplete");
    this.list = document.querySelector("#keyword-suggestions");
    this.composing = false;
    this.completionRequested = false;
    this.suggestions = null;
    this.tabCycle = null;
    input.addEventListener("input", (event) => {
      if (event.isComposing || this.composing) this.renderInput();
      else this.edited();
    });
    input.addEventListener("compositionstart", () => { this.composing = true; this.closeSuggestions(); });
    input.addEventListener("compositionend", () => { this.composing = false; this.edited(); });
    input.addEventListener("click", () => { this.tabCycle = null; this.showSuggestions(); });
    input.addEventListener("blur", () => this.closeSuggestions());
    input.addEventListener("scroll", () => this.syncScroll());
    input.addEventListener("keydown", (event) => this.keydown(event));
    input.addEventListener("keyup", (event) => {
      this.syncScroll();
      if (this.completionRequested && ["Home", "End"].includes(event.key)) this.showSuggestions();
    });
    this.renderInput();
  }

  setVocabulary(words) {
    this.vocabulary.clear();
    // Match the converter's precedence when a spelling appears in multiple categories.
    for (const word of words) if (!this.vocabulary.has(word.word)) this.vocabulary.set(word.word, word);
    this.renderInput();
    this.showSuggestions();
    return [...this.vocabulary.values()];
  }

  type(word) {
    return this.vocabulary.get(word)?.type || (/^[-\d,\[\]]+$/.test(word) ? "niladic" : "unknown");
  }

  renderCommand(target, command) {
    target.replaceChildren();
    const separator = command.indexOf("::");
    if (separator < 0) { target.append(span("token-argument", command)); return; }
    target.append(span("token-argument", command.slice(0, separator)), span("token-separators", "::"));
    for (const token of command.slice(separator + 2).split(/(\s+)/)) {
      if (token) target.append(span(/^\s+$/.test(token) ? "" : `token-${this.type(token)}`, token));
    }
  }

  renderAtoms(target, code, command) {
    const keywords = command.slice(command.indexOf("::") + 2).trim().split(/\s+/);
    const parts = [];
    let prefix = "";
    for (const keyword of keywords) {
      const atom = this.vocabulary.get(keyword)?.atom || keyword;
      prefix += atom;
      parts.push(span(`token-${this.type(keyword)}`, atom));
      if (prefix.length >= code.length) break;
    }
    if (prefix === code) target.replaceChildren(...parts);
    else target.textContent = code;
  }

  renderInput() {
    this.renderCommand(this.overlay, this.input.value);
    this.renderConversion();
    this.input.parentElement.classList.add("highlighted");
    this.syncScroll();
    requestAnimationFrame(() => this.syncScroll());
  }

  renderConversion() {
    const separator = this.input.value.indexOf("::");
    const keywords = separator < 0 ? [] : this.input.value.slice(separator + 2).trim().split(/\s+/).filter(Boolean);
    // The vocabulary comes from the Python converter, with the same precedence.
    const atoms = keywords.map((keyword) => this.vocabulary.get(keyword)?.atom ?? (/^[-\d,\[\]]+$/.test(keyword) ? keyword : null));
    const valid = atoms.length > 0 && !atoms.includes(null);
    this.conversion.parentElement.hidden = !valid;
    if (valid) this.renderAtoms(this.conversion, atoms.join(""), this.input.value);
    else this.conversion.replaceChildren();
  }

  syncScroll() { this.overlay.style.transform = `translateX(${-this.input.scrollLeft}px)`; }

  setValue(value, { notify = false } = {}) {
    this.input.value = value;
    this.input.setSelectionRange(value.length, value.length);
    this.closeSuggestions();
    this.tabCycle = null;
    this.renderInput();
    if (notify) this.onChange();
  }

  edited() {
    this.tabCycle = null;
    this.renderInput();
    this.showSuggestions();
    this.onChange();
  }

  context() {
    const value = this.input.value, caret = this.input.selectionStart;
    const separator = value.indexOf("::");
    if (separator < 0 || caret < separator + 2 || caret !== this.input.selectionEnd) return null;
    let start = caret, end = caret;
    while (start > separator + 2 && !/\s/.test(value[start - 1])) --start;
    while (end < value.length && !/\s/.test(value[end])) ++end;
    return { start, end, prefix: value.slice(start, caret) };
  }

  showSuggestions() {
    if (!this.completionRequested) return;
    const context = this.context();
    if (!context || this.composing) { this.closeSuggestions(); return; }
    const matches = [...this.vocabulary.values()]
      .filter(({ word }) => word.toLowerCase().startsWith(context.prefix.toLowerCase()))
      .sort((a, b) => {
        if (!context.prefix) {
          const ai = commonWords.indexOf(a.word), bi = commonWords.indexOf(b.word);
          const preferred = (ai < 0 ? 1000 : ai) - (bi < 0 ? 1000 : bi);
          if (preferred) return preferred;
        }
        return a.word.length - b.word.length || a.word.localeCompare(b.word);
      });
    if (!matches.length) { this.hideSuggestions(); return; }
    this.suggestions = { ...context, matches, index: 0, navigated: false };
    this.renderSuggestions();
  }

  renderSuggestions() {
    const suggestions = this.suggestions;
    if (!suggestions) return;
    this.list.replaceChildren();
    suggestions.matches.forEach((word, index) => {
      const option = document.createElement("div");
      option.id = `keyword-option-${index}`;
      option.className = "suggestion";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.title = `${word.word} · ${word.atom} · ${typeLabels[word.type]}`;
      option.setAttribute("aria-label", option.title);
      option.append(span(`suggestion-word token-${word.type}`, word.word), span(`suggestion-atom token-${word.type}`, word.atom));
      option.addEventListener("pointerdown", (event) => event.preventDefault());
      option.addEventListener("click", () => this.accept(index));
      this.list.append(option);
    });
    this.panel.hidden = false;
    this.input.setAttribute("aria-expanded", "true");
    document.querySelector("#keyword-match-count").textContent = `${suggestions.matches.length} ${suggestions.matches.length === 1 ? "match" : "matches"}`;
    this.list.scrollTop = 0;
    this.selectSuggestion(suggestions.index);
  }

  selectSuggestion(index) {
    this.suggestions.index = index;
    const previous = this.list.querySelector(".active");
    previous?.classList.remove("active");
    previous?.setAttribute("aria-selected", "false");
    const option = this.list.children[index];
    option.classList.add("active");
    option.setAttribute("aria-selected", "true");
    this.input.setAttribute("aria-activedescendant", option.id);
    // Scroll only the popup, keeping the editor and the page in place.
    const bounds = this.list.getBoundingClientRect(), selected = option.getBoundingClientRect();
    if (selected.top < bounds.top) this.list.scrollTop -= bounds.top - selected.top;
    else if (selected.bottom > bounds.bottom) this.list.scrollTop += selected.bottom - bounds.bottom;
  }

  navigateSuggestions(key) {
    const { index, matches } = this.suggestions;
    const columns = getComputedStyle(this.list).gridTemplateColumns.split(" ").length;
    const column = index % columns, row = Math.floor(index / columns);
    let next = index;
    if (key === "ArrowLeft" && column > 0) next--;
    else if (key === "ArrowRight" && column < columns - 1 && index < matches.length - 1) next++;
    else if (key === "ArrowUp" && row > 0) next -= columns;
    else if (key === "ArrowDown" && row < Math.floor((matches.length - 1) / columns)) next = Math.min(index + columns, matches.length - 1);
    this.suggestions.navigated = true;
    this.selectSuggestion(next);
  }

  hideSuggestions() {
    this.suggestions = null;
    this.panel.hidden = true;
    this.input.setAttribute("aria-expanded", "false");
    this.input.removeAttribute("aria-activedescendant");
  }

  closeSuggestions() {
    this.completionRequested = false;
    this.tabCycle = null;
    this.hideSuggestions();
  }

  accept(index, cycle = false) {
    const suggestions = this.suggestions;
    if (!suggestions) return;
    const word = suggestions.matches[index];
    this.input.setRangeText(word.word, suggestions.start, suggestions.end, "end");
    this.renderInput();
    this.onChange({ immediate: !cycle });
    if (cycle) {
      this.tabCycle = { ...suggestions, end: this.input.selectionStart, index, value: this.input.value, caret: this.input.selectionStart };
      this.suggestions = this.tabCycle;
      this.selectSuggestion(index);
    } else {
      this.tabCycle = null;
      this.closeSuggestions();
    }
  }

  keydown(event) {
    if (event.isComposing || this.composing) return;
    if (event.key === " " && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();
      if (event.repeat) return;
      this.tabCycle = null;
      this.completionRequested = true;
      this.showSuggestions();
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (this.completionRequested) this.closeSuggestions();
      else this.onStop();
      this.tabCycle = null;
    } else if (event.key === "Tab" && !event.shiftKey) {
      const cycle = !this.closeOnTab();
      if (cycle && this.tabCycle?.value === this.input.value && this.tabCycle.caret === this.input.selectionStart) {
        this.suggestions = this.tabCycle;
        this.suggestions.index = (this.suggestions.index + 1) % this.suggestions.matches.length;
      }
      if (!this.suggestions) return;
      event.preventDefault();
      this.accept(this.suggestions.index, cycle);
    } else if (this.suggestions && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      this.navigateSuggestions(event.key);
    } else if (["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      this.onHistory(event.key === "ArrowUp" ? -1 : 1);
    } else if (event.key === "Enter" && this.suggestions) {
      const { index, matches, start, end, navigated } = this.suggestions;
      if (navigated || this.input.value.slice(start, end) !== matches[index].word) {
        event.preventDefault();
        this.accept(index);
      } else {
        this.closeSuggestions();
      }
    } else if (event.key !== "Tab") {
      this.tabCycle = null;
    }
  }
}
