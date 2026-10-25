const defaults = {
  liveMode: false,
  showExamples: true,
  theme: "terminal",
  showKeywords: true,
  presentationMode: false,
};

function loadPreferences() {
  const values = { ...defaults };
  try {
    // Keep the live-mode preference saved before the settings panel existed.
    values.liveMode = localStorage.getItem("jello-live-view") === "true";
    const saved = JSON.parse(localStorage.getItem("jello-settings") || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      for (const key of Object.keys(defaults)) {
        if (key === "theme") {
          if (["terminal", "dracula"].includes(saved.theme)) values.theme = saved.theme;
        } else if (typeof saved[key] === "boolean") values[key] = saved[key];
      }
    }
  } catch { /* Defaults and in-memory settings work when storage is unavailable. */ }
  return values;
}

export class PlaygroundSettings {
  constructor(onChange) {
    this.values = loadPreferences();
    this.onChange = onChange;
    this.dialog = document.querySelector("#settings-dialog");
    this.button = document.querySelector("#settings-toggle");
    this.controls = [...this.dialog.querySelectorAll("[data-setting]")];
    this.button.addEventListener("click", () => this.dialog.showModal());
    document.querySelector("#settings-close").addEventListener("click", () => this.dialog.close());
    this.dialog.addEventListener("close", () => {
      // Native focus restoration may finish before this queued event is delivered.
      if (document.activeElement === document.body || this.dialog.contains(document.activeElement)) this.button.focus({ preventScroll: true });
    });
    this.dialog.addEventListener("click", (event) => {
      if (event.target !== this.dialog) return;
      const box = this.dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) this.dialog.close();
    });
    for (const control of this.controls) {
      control.addEventListener("change", () => this.set(control.dataset.setting, control.type === "checkbox" ? control.checked : control.value));
    }
    this.apply();
  }

  set(key, value) {
    if (!(key in defaults)) return;
    if (key === "theme" ? !["terminal", "dracula"].includes(value) : typeof value !== "boolean") return;
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.apply();
    try {
      localStorage.setItem("jello-settings", JSON.stringify(this.values));
      localStorage.setItem("jello-live-view", String(this.values.liveMode));
    } catch { /* Preference changes still apply without persistent storage. */ }
    this.onChange(key, value);
  }

  apply() {
    const root = document.documentElement;
    root.dataset.theme = this.values.theme;
    root.classList.toggle("examples-hidden", !this.values.showExamples);
    root.classList.toggle("keywords-hidden", !this.values.showKeywords);
    root.classList.toggle("presentation-mode", this.values.presentationMode);
    document.querySelector('meta[name="theme-color"]').content = this.values.theme === "dracula" ? "#282a36" : "#0b0e11";
    for (const control of this.controls) {
      if (control.type === "checkbox") control.checked = this.values[control.dataset.setting];
      else control.value = this.values[control.dataset.setting];
    }
  }
}
