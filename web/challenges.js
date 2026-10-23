export class ChallengePicker {
  constructor(input, editor, onSelect) {
    this.input = input;
    this.editor = editor;
    this.onSelect = onSelect;
    this.dialog = document.querySelector("#challenges-dialog");
    this.search = document.querySelector("#challenge-search");
    this.list = document.querySelector("#challenge-list");
    this.count = document.querySelector("#challenge-count");
    this.retry = document.querySelector("#retry-challenges");
    this.items = null;
    this.loading = false;
    this.selected = null;
    document.querySelector("#challenges-close").addEventListener("click", () => this.dialog.close());
    this.dialog.addEventListener("close", () => {
      if (this.selected) {
        const command = this.selected.command;
        this.selected = null;
        this.onSelect(command);
      } else this.opener?.focus({ preventScroll: true });
    });
    this.dialog.addEventListener("click", (event) => {
      if (event.target !== this.dialog) return;
      const box = this.dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) this.dialog.close();
    });
    document.querySelector("#browse-challenges").addEventListener("click", () => {
      const settings = document.querySelector("#settings-dialog");
      settings.addEventListener("close", () => this.open(document.querySelector("#settings-toggle")), { once: true });
      settings.close();
    });
    document.addEventListener("keydown", (event) => {
      if (!event.shiftKey || event.key.toLowerCase() !== "c" || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.isComposing) return;
      if (document.querySelector("dialog[open]")) return;
      // Allow the requested shortcut in the REPL, but keep other text fields editable.
      const target = event.target;
      if (target !== input && target instanceof Element && (target.closest("input, textarea, select") || target.isContentEditable)) return;
      event.preventDefault();
      this.open();
    });
    this.search.addEventListener("input", () => this.render());
    this.search.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      const buttons = [...this.list.querySelectorAll("button")];
      if (!buttons.length) return;
      if (event.key === "Enter") {
        event.preventDefault();
        buttons[0].click();
      } else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        (event.key === "ArrowDown" ? buttons[0] : buttons.at(-1)).focus();
      }
    });
    this.list.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
      const buttons = [...this.list.querySelectorAll("button")];
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length].focus();
    });
    this.retry.addEventListener("click", async () => {
      await this.load();
      if (this.dialog.open) this.search.focus();
    });
  }

  open(opener = document.activeElement) {
    if (document.querySelector("dialog[open]")) return;
    this.opener = opener;
    this.search.value = "";
    this.editor.closeSuggestions();
    this.dialog.showModal();
    this.search.focus();
    this.load();
  }

  async load() {
    if (this.items) { this.render(); return; }
    if (this.loading) return;
    this.loading = true;
    this.retry.hidden = true;
    this.count.textContent = "Loading challenges…";
    try {
      const response = await fetch(new URL("./challenges.json", import.meta.url), { cache: "no-cache" });
      if (!response.ok) throw new Error("Challenges unavailable");
      const items = await response.json();
      if (!Array.isArray(items)) throw new Error("Invalid challenge catalog");
      this.items = items;
      this.render();
    } catch {
      this.count.textContent = "Couldn't load challenges. Try again.";
      this.retry.hidden = false;
    } finally { this.loading = false; }
  }

  render() {
    if (!this.items) return;
    const terms = this.search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const filtered = this.items.filter((item) => {
      const text = `#${item.number} ${item.title} ${this.sources(item)} ${item.command} ${item.jelly}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    });
    this.count.textContent = `${filtered.length} ${filtered.length === 1 ? "challenge" : "challenges"}`;
    this.list.replaceChildren();
    for (const item of filtered) {
      const row = document.createElement("div");
      row.className = "challenge-item";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "challenge-option";
      const heading = document.createElement("span");
      heading.className = "challenge-heading";
      const title = document.createElement("span");
      title.className = "challenge-title";
      title.textContent = `#${item.number} ${item.title}`;
      const tags = document.createElement("span");
      tags.className = "challenge-tags";
      tags.textContent = this.sources(item);
      heading.append(title, tags);
      const code = document.createElement("code");
      code.className = "challenge-expression";
      this.editor.renderCommand(code, item.command);
      button.append(heading, code);
      button.addEventListener("click", () => {
        this.selected = item;
        this.dialog.close();
      });
      const source = document.createElement("a");
      source.className = "challenge-sample-source";
      source.href = item.example.source;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "Sample source ↗";
      source.setAttribute("aria-label", `Sample source for ${item.title}`);
      row.append(button, source);
      this.list.append(row);
    }
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "challenge-empty";
      empty.textContent = "No challenges found. Try another search.";
      this.list.append(empty);
    }
    this.list.scrollTop = 0;
  }

  sources(item) {
    return [item.leetcode && `LeetCode ${item.leetcode}`, item.pwc && `PWC ${item.pwc}`, `Added ${item.added}`, item.contest && `Contest ${item.contest}`].filter(Boolean).join(" · ");
  }
}
