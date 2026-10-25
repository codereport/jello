import { test, expect } from "@playwright/test";

const DEFAULT_COMMAND = "4 :: range . sum div len";
const RUST_EXAMPLE = "5 :: range sq sum";

async function openRustExample(page) {
  await page.goto(`./#${new URLSearchParams({ code: RUST_EXAMPLE })}`);
  await expect(page.locator("#runtime-status")).toHaveClass(/ready/, { timeout: 90000 });
  await page.locator("#expression").press("Enter");
}

async function setLiveMode(page, enabled) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Live mode", exact: true }).setChecked(enabled);
  await page.getByRole("button", { name: "Close settings" }).click();
}

test("runs the real interpreter, examples, errors, wordbook, history, and sharing", async ({ page, context }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  const run = page.getByRole("button", { name: "Run expression", exact: true });
  const lastResult = () => page.locator(".result").last();
  const execute = async (command, expected) => {
    await input.fill(command);
    await run.click();
    await expect(lastResult()).toHaveText(expected);
    await expect(run).toBeEnabled();
  };
  await expect(input).toHaveValue(DEFAULT_COMMAND);
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  await expect(page.locator(".entry").first()).toHaveAttribute("data-engine", "rust");
  await expect(page.locator(".entry").first()).toHaveAttribute("data-verification", "match", { timeout: 90000 });
  await expect(page.locator("#verification-status")).toHaveText("✓ match");
  await expect(page.locator("#execution-time")).toHaveText(/^\d+\.\d+ (ms|s)$/);
  await expect(page.getByRole("img", { name: "Python", exact: true })).toBeVisible();
  expect(await page.getByRole("img", { name: "Python", exact: true }).evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator(".trace-step")).toHaveCount(4);
  await expect(page.locator(".chain-info")).toContainText("1-s-1-2-1 · monadic · mB");
  await page.screenshot({ path: testInfo.outputPath("playground.png"), fullPage: true });
  await page.getByRole("button", { name: /Start small/ }).click();
  await expect(lastResult()).toHaveText("[1, 2, 3, 4, 5]");
  await expect(page.locator(".entry").last()).toHaveAttribute("data-engine", "rust");
  await expect(page.locator(".entry").last()).toHaveAttribute("data-verification", "match");
  await page.getByRole("button", { name: /Just the odd ones/ }).click();
  await expect(lastResult()).toHaveText("[1, 3, 5, 7, 9]");
  await execute("[1, 2, 3] :: sum", "6");
  await execute("6 7 :: *", "42");
  await execute("11 :: is_prime", "1");
  await execute("42 :: bits", "3");
  await input.fill("5 :: not_a_keyword");
  await run.click();
  await expect(page.locator(".error-message").last()).toContainText("not_a_keyword is not a valid Jello keyword");
  await expect(page.locator("#execution-time")).toHaveText(/^\d+\.\d+ (ms|s)$/);
  await execute("5 :: range", "[1, 2, 3, 4, 5]");
  await input.fill("draft :: sq");
  await input.press("Escape");
  await input.press("ArrowUp");
  await expect(input).toHaveValue("5 :: range");
  await input.press("ArrowDown");
  await expect(input).toHaveValue("draft :: sq");
  await input.fill("5 :: ran");
  await input.press("Control+Space");
  await input.press("Tab");
  await expect(input).toHaveValue("5 :: range");
  await input.press("Tab");
  await expect(input).toHaveValue("5 :: range0");
  const search = page.getByRole("searchbox", { name: "Search keywords" });
  await search.fill("factors");
  await expect(page.locator(".word")).toHaveCount(2);
  await page.locator(".word").filter({ has: page.locator(".word-name", { hasText: /^factors$/ }) }).click();
  await expect(input).toHaveValue("5 :: range0 factors");
  await search.fill("there_is_no_such_word");
  await expect(page.locator(".empty-words")).toBeVisible();
  await search.fill("");
  await page.getByRole("button", { name: /Dyads/ }).click();
  await expect(page.locator(".word-name", { hasText: /^range$/ })).toHaveCount(0);
  await expect(page.locator(".word-name", { hasText: /^pow$/ })).toBeVisible();
  await input.fill("42 :: bits");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page).toHaveURL(/#code=42/);
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URLSearchParams(new URL(link).hash.slice(1)).get("code")).toBe("42 :: bits");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator(".entry")).toHaveCount(0);
  await expect(page.getByText("Session cleared.")).toBeVisible();
  await expect(page.locator("#execution-status")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("loads a shared expression and can stop a long calculation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Cancellation exercises the same worker on both layouts.");
  await page.addInitScript(() => localStorage.setItem("jello-live-view", "true"));
  await page.goto("./#code=6+7+%3A%3A+*");
  await expect(page.locator("#runtime-status")).toHaveClass(/ready/, { timeout: 90000 });
  await expect(page.locator("#run")).toBeHidden();
  await expect(page.locator(".result")).toHaveCount(0);
  await expect(page.locator("#execution-status")).toBeHidden();
  await page.waitForTimeout(800);
  await expect(page.locator(".result")).toHaveCount(0);
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  await input.press("Enter");
  await expect(page.locator(".result").first()).toHaveText("42", { timeout: 90000 });
  await input.fill("99999999 :: factorial");
  await input.press("Enter");
  await page.getByRole("button", { name: "Stop execution" }).click();
  await expect(page.locator(".error-message").last()).toContainText("Stopped");
  await expect(page.locator("#execution-status")).toBeHidden();
  await expect(page.locator("#runtime-status")).toHaveClass(/ready/, { timeout: 90000 });
  await input.fill("5 :: range");
  await input.press("Enter");
  await expect(page.locator(".result").last()).toHaveText("[1, 2, 3, 4, 5]");
});

test("live view debounces edits, replaces one preview, and switches back to manual evaluation", async ({ page }, testInfo) => {
  await page.goto("./");
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  const preview = page.locator(".live-entry");
  const inputBox = await input.boundingBox(), sessionBox = await page.locator("#transcript").boundingBox();
  expect(inputBox.y + inputBox.height).toBeLessThan(sessionBox.y);
  await input.fill("4 :: sq");
  await input.press("Enter");
  await expect(page.locator(".result").last()).toHaveText("16");
  await expect(page.locator(".entry")).toHaveCount(2);
  await expect(page.locator(".entry-command").last()).toBeVisible();
  await setLiveMode(page, true);
  await expect(page.locator(".entry")).toHaveCount(1);
  await expect(preview).toHaveAttribute("data-command", "4 :: sq");
  await expect(preview.locator(".result")).toHaveText("16");
  await expect(preview.locator(".entry-command")).toBeHidden();
  await expect(page.locator("#run")).toBeHidden();
  const suggestions = page.getByRole("listbox", { name: "Keyword suggestions" });
  await input.fill("5 :: ran");
  await input.press("Control+Space");
  await expect(suggestions).toBeVisible();
  await input.press("Tab");
  await expect(input).toHaveValue("5 :: range");
  await expect(input).toBeFocused();
  await expect(suggestions).toBeHidden();
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(preview.locator(".result")).toHaveText("[1, 2, 3, 4, 5]");
  await expect(suggestions).toBeHidden();
  await input.fill("5 :: ran");
  await input.press("Control+Space");
  await input.press("ArrowRight");
  await input.press("Tab");
  await expect(input).toHaveValue("5 :: range0");
  await expect(suggestions).toBeHidden();
  await expect(preview.locator(".result")).toHaveText("[0, 1, 2, 3, 4]");
  await input.press("Tab");
  await expect(input).not.toBeFocused();
  await expect(input).toHaveValue("5 :: range0");
  await expect(suggestions).toBeHidden();
  await input.fill("6 :: sq");
  await expect(preview.locator(".result")).toHaveText("36");
  await input.fill("7 :: sq");
  await page.waitForTimeout(250);
  await expect(preview.locator(".result")).toHaveText("36");
  await input.fill("8 :: sq");
  await page.waitForTimeout(400);
  await expect(preview.locator(".result")).toHaveText("36");
  await expect(preview.locator(".result")).toHaveText("64");
  await expect(preview).toHaveCount(1);
  await expect(page.locator(".entry")).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("jello-history")))).toEqual([DEFAULT_COMMAND, "4 :: sq"]);
  await input.fill("5 :: nonexistent");
  await expect(preview.locator(".error-message")).toContainText("not a valid Jello keyword");
  await input.fill("8 :: sq");
  await expect(preview.locator(".result")).toHaveText("64");
  await expect(preview.locator(".error-message")).toHaveCount(0);
  await expect(page.locator("#run")).toBeHidden();
  await expect(preview.locator(".entry-meta")).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("live-jelly-preview.png"), fullPage: true });
  await setLiveMode(page, false);
  await expect(page.getByRole("button", { name: "Run expression", exact: true })).toBeVisible();
  await expect(preview.locator(".entry-command")).toBeVisible();
  await input.fill("9 :: sq");
  await page.waitForTimeout(800);
  await expect(preview.locator(".result")).toHaveText("64");
  await input.press("Enter");
  await expect(page.locator(".result").last()).toHaveText("81");
  await expect(page.locator(".entry")).toHaveCount(2);
  await expect(page.locator(".entry-command").last()).toBeVisible();
  await setLiveMode(page, true);
  await expect(page.locator(".entry")).toHaveCount(1);
  await expect(preview).toHaveAttribute("data-command", "9 :: sq");
  await expect(preview.locator(".result")).toHaveText("81");
  await expect(preview.locator(".entry-command")).toBeHidden();
});

test("live autocomplete with Tab or Enter skips the typing debounce", async ({ page }) => {
  const now = Date.now();
  await page.clock.install({ time: now });
  await page.goto("./");
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  await page.clock.pauseAt(now + 60_000);
  await setLiveMode(page, true);
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  const preview = page.locator(".live-entry");
  const suggestions = page.getByRole("listbox", { name: "Keyword suggestions" });
  await input.fill("5 :: ran");
  await page.clock.runFor(599);
  await expect(preview).toHaveAttribute("data-command", DEFAULT_COMMAND);
  await expect(preview.locator(".result")).toHaveText("2.5", { timeout: 90000 });
  await input.press("Control+Space");
  await input.press("Tab");
  await expect(suggestions).toBeHidden();
  // The page clock stays paused: a debounced evaluation cannot complete here.
  await expect(preview.locator(".result")).toHaveText("[1, 2, 3, 4, 5]");
  await input.fill("6 :: ran");
  await input.press("Control+Space");
  await input.press("ArrowRight");
  await input.press("Enter");
  await expect(suggestions).toBeHidden();
  await expect(preview.locator(".result")).toHaveText("[0, 1, 2, 3, 4, 5]");
  await input.fill("8 :: double");
  await expect(suggestions).toBeHidden();
  await input.press("Tab");
  await expect(input).not.toBeFocused();
  await expect(preview.locator(".result")).toHaveText("16");
  await input.fill("7 :: sq");
  await input.press("Escape");
  await input.press("Enter");
  await expect(preview.locator(".result")).toHaveText("49");
  const completed = await preview.elementHandle();
  await page.clock.runFor(1000);
  expect(await completed.evaluate((node) => node.isConnected)).toBe(true);
  await expect(preview.locator(".result")).toHaveText("49");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("jello-history")))).toEqual([DEFAULT_COMMAND, "7 :: sq"]);
});

test("suggestions complete the current keyword and syntax colors follow keyword types", async ({ page }, testInfo) => {
  await page.goto("./");
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  const suggestions = page.getByRole("listbox", { name: "Keyword suggestions" });
  const conversion = page.locator("#converted-expression");
  await expect(conversion).toHaveText("RµS÷L");
  await input.fill("5 :: ran");
  await expect(conversion).toBeHidden();
  await expect(conversion).toBeEmpty();
  await input.press("Control+Space");
  await expect(suggestions).toBeVisible();
  await expect(suggestions.getByRole("option").first()).toContainText("range");
  await page.screenshot({ path: testInfo.outputPath("autocomplete.png"), fullPage: true });
  await input.press("ArrowRight");
  await input.press("Enter");
  await expect(input).toHaveValue("5 :: range0");
  await expect(suggestions).toBeHidden();
  await input.press("Enter");
  await expect(page.locator(".result").last()).toHaveText("[0, 1, 2, 3, 4]");
  await input.fill("5 :: ra sum");
  await input.evaluate((node) => { node.setSelectionRange(7, 7); node.dispatchEvent(new Event("click")); });
  await input.press("Control+Space");
  await suggestions.getByRole("option").filter({ has: page.locator(".suggestion-word", { hasText: /^range$/ }) }).click();
  await expect(input).toHaveValue("5 :: range sum");
  await input.fill("6 7 :: range + each : digits 3");
  await expect(conversion).toHaveText("R+€ðD3");
  const highlight = page.locator("#expression-highlight");
  await expect(highlight.locator(".token-monadic")).toHaveText("range");
  await expect(highlight.locator(".token-dyadic")).toHaveText("+");
  await expect(highlight.locator(".token-quick")).toHaveText("each");
  await expect(highlight.locator(".token-niladic")).toHaveText(["digits", "3"]);
  await expect(highlight.locator(".token-separators")).toHaveText(["::", ":"]);
  const colors = await highlight.locator(".token-monadic, .token-dyadic, .token-quick").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).color));
  expect(new Set(colors).size).toBe(3);
  await input.fill("5 :: range + fold");
  await page.getByRole("button", { name: "Run expression", exact: true }).click();
  const entry = page.locator(".entry").last();
  await expect(entry.locator(".result")).toHaveText("15");
  await expect(entry.locator(".command-code .token-dyadic")).toHaveText("+");
  await expect(entry.locator(".jelly-code .token-quick")).toHaveText("/");
  await expect(conversion).toHaveText(await entry.locator(".jelly-code").textContent());
  const inputBox = await input.boundingBox(), conversionBox = await conversion.boundingBox();
  expect(conversionBox.x).toBeGreaterThan(inputBox.x + inputBox.width);
  expect(await conversion.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThan(12);
  await input.fill("0 :: [-2,3] rev");
  await expect(conversion).toHaveText("[-2,3]Ṛ");
  await input.fill(`5 :: ${"range ".repeat(30)}sum`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await input.fill("5");
  await expect(conversion).toBeHidden();
});

test("autocomplete opens only on Ctrl+Space and filters until dismissed", async ({ page }) => {
  let releaseKeywords;
  const keywordsReady = new Promise((resolve) => { releaseKeywords = resolve; });
  await page.route("**/keywords.json", async (route) => { await keywordsReady; await route.continue(); });
  await page.goto(`./#${new URLSearchParams({ code: "5 :: ran" })}`);
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  const suggestions = page.getByRole("listbox", { name: "Keyword suggestions" });
  const options = suggestions.getByRole("option");
  await input.fill("5 :: ran");
  await input.click();
  await expect(suggestions).toBeHidden();
  releaseKeywords();
  await expect(page.locator(".word").first()).toBeVisible();
  // Loading vocabulary while the editor is focused must not open the grid.
  await expect(suggestions).toBeHidden();
  await input.press("Home");
  await input.press("End");
  await expect(suggestions).toBeHidden();
  await input.press("Tab");
  await expect(input).not.toBeFocused();
  await expect(input).toHaveValue("5 :: ran");
  await expect(suggestions).toBeHidden();

  await page.keyboard.press("Control+Space");
  await expect(input).toBeFocused();
  await expect(suggestions).toBeVisible();
  await expect(input).toHaveValue("5 :: ran");
  await expect(options.first().locator(".suggestion-word")).toHaveText("range");
  const matches = await options.count();
  await input.fill("5 :: range0");
  await expect(options).toHaveCount(1);
  await expect(options.locator(".suggestion-word")).toHaveText("range0");
  await input.fill("5 :: no_such_prefix");
  await expect(suggestions).toBeHidden();
  await input.fill("5 :: ran");
  await expect(suggestions).toBeVisible();
  await expect(options).toHaveCount(matches);

  await input.press("Escape");
  await input.pressSequentially("g");
  await expect(input).toHaveValue("5 :: rang");
  await input.click();
  await expect(suggestions).toBeHidden();
  await input.press("Control+Space");
  await expect(suggestions).toBeVisible();
  await input.fill("5 :: ");
  expect(await options.count()).toBeGreaterThan(100);
  await page.locator(".session-label").click();
  await page.keyboard.press("Space");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("5 :: ");
  await expect(suggestions).toBeHidden();
  await input.press("Control+Space");
  await input.press("Enter");
  await expect(input).toHaveValue("5 :: range");
  await input.press("Space");
  await expect(input).toHaveValue("5 :: range ");
  await expect(suggestions).toBeHidden();
  // Real desktop input may report "Unidentified" or a control character in `key`.
  for (const key of ["Unidentified", "\u0000"]) {
    await input.evaluate((node, key) => node.dispatchEvent(new KeyboardEvent("keydown", { key, code: "Space", ctrlKey: true, bubbles: true, cancelable: true })), key);
    await expect(suggestions).toBeVisible();
    await expect(input).toHaveValue("5 :: range ");
    await input.press("Escape");
  }
});

test("autocomplete browses every prefix match and scrolls the full keyword grid", async ({ page }, testInfo) => {
  await page.goto(`./#${new URLSearchParams({ code: "10 :: a" })}`);
  const vocabulary = await (await page.request.get("./keywords.json")).json();
  const words = [...new Set(vocabulary.map(({ word }) => word))];
  const prefixMatches = words.filter((word) => word.toLowerCase().startsWith("a"));
  expect(prefixMatches.length).toBeGreaterThan(8);
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  const suggestions = page.getByRole("listbox", { name: "Keyword suggestions" });
  const options = suggestions.getByRole("option");
  await input.click();
  await input.press("Control+Space");
  await expect(options).toHaveCount(prefixMatches.length);
  expect((await suggestions.locator(".suggestion-word").allTextContents()).sort()).toEqual(prefixMatches.sort());
  await expect(options.filter({ hasText: "all_not_empty" })).toBeVisible();
  const firstOption = await options.first().elementHandle();
  await input.press("ArrowUp");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  for (let i = 0; i < prefixMatches.length; i++) await input.press("ArrowDown");
  for (let i = 0; i < prefixMatches.length; i++) await input.press("ArrowRight");
  await expect(options.last()).toHaveAttribute("aria-selected", "true");
  // Browsing keeps the existing cells and stops at the end instead of cycling.
  expect(await firstOption.evaluate((node) => node.isConnected)).toBe(true);
  const finalMatch = await options.last().locator(".suggestion-word").textContent();
  await input.press("Enter");
  await expect(input).toHaveValue(`10 :: ${finalMatch}`);
  await expect(suggestions).toBeHidden();

  for (const command of ["10 :: ", "10 :: range "]) {
    await input.fill(command);
    await input.press("Control+Space");
    await expect(options).toHaveCount(words.length);
    expect((await suggestions.locator(".suggestion-word").allTextContents()).sort()).toEqual([...words].sort());
    await expect(page.locator("#keyword-match-count")).toHaveText(`${words.length} matches`);
  }
  const columns = await suggestions.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
  expect(columns).toBeGreaterThan(1);
  expect(await suggestions.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  const pageScroll = await page.evaluate(() => scrollY);
  const popup = await suggestions.boundingBox();
  await page.mouse.move(popup.x + popup.width / 2, popup.y + popup.height / 2);
  await page.mouse.wheel(0, 10000);
  await expect.poll(() => suggestions.evaluate((node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 1)).toBe(true);
  // Scrolling at the end stays in the popup, without moving the whole page.
  await page.mouse.wheel(0, 500);
  expect(await page.evaluate(() => scrollY)).toBe(pageScroll);
  const lastWord = await options.last().locator(".suggestion-word").textContent();
  await options.last().click();
  await expect(input).toHaveValue(`10 :: range ${lastWord}`);
  await expect(input).toBeFocused();
  await expect(suggestions).toBeHidden();

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Theme", { exact: true }).selectOption("dracula");
  await page.getByRole("switch", { name: "Presentation mode", exact: true }).check();
  await page.getByRole("button", { name: "Close settings" }).click();
  await input.fill("10 :: ");
  await input.press("Control+Space");
  await expect(options).toHaveCount(words.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("autocomplete-grid.png"), fullPage: true });
});

test("all four arrows navigate autocomplete rows and columns without moving the expression cursor", async ({ page }) => {
  await page.goto(`./#${new URLSearchParams({ code: "10 :: " })}`);
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  const suggestions = page.getByRole("listbox", { name: "Keyword suggestions" });
  const options = suggestions.getByRole("option");
  await input.click();
  await input.press("Control+Space");
  await expect(page.locator("#keyword-match-count")).toHaveText(/^\d+ matches$/);
  const count = await options.count();
  const columns = await suggestions.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
  expect(columns).toBeGreaterThan(1);
  expect(count).toBeGreaterThan(columns * 2);
  const command = await input.inputValue();
  const caret = await input.evaluate((node) => [node.selectionStart, node.selectionEnd]);
  const selected = async (index) => {
    await expect(options.nth(index)).toHaveAttribute("aria-selected", "true");
    await expect(input).toHaveAttribute("aria-activedescendant", `keyword-option-${index}`);
    expect(await input.evaluate((node) => [node.selectionStart, node.selectionEnd])).toEqual(caret);
    await expect(input).toHaveValue(command);
    await expect(input).toBeFocused();
  };
  await input.press("ArrowRight");
  await selected(1);
  await input.press("ArrowDown");
  await selected(columns + 1);
  await input.press("ArrowLeft");
  await selected(columns);
  await input.press("ArrowUp");
  await selected(0);
  await input.press("ArrowUp");
  await input.press("ArrowLeft");
  await selected(0);
  for (let i = 0; i < columns; i++) await input.press("ArrowRight");
  await selected(columns - 1);
  for (let i = 0; i < Math.ceil(count / columns); i++) await input.press("ArrowDown");
  await input.press("ArrowRight");
  await selected(count - 1);
  expect(await suggestions.evaluate((node) => {
    const bounds = node.getBoundingClientRect(), option = node.querySelector(".active").getBoundingClientRect();
    return option.top >= bounds.top - 1 && option.bottom <= bounds.bottom + 1;
  })).toBe(true);
  const word = await options.last().locator(".suggestion-word").textContent();
  await input.press("Enter");
  await expect(input).toHaveValue(command + word);
  await expect(suggestions).toBeHidden();
  // Escape returns horizontal arrows to normal expression editing.
  await input.fill("10 :: ran");
  await input.press("Escape");
  await input.press("ArrowLeft");
  expect(await input.evaluate((node) => node.selectionStart)).toBe("10 :: ran".length - 1);
  await expect(suggestions).toBeHidden();
  await input.press("ArrowLeft");
  expect(await input.evaluate((node) => node.selectionStart)).toBe("10 :: ran".length - 2);
  await input.press("ArrowRight");
  expect(await input.evaluate((node) => node.selectionStart)).toBe("10 :: ran".length - 1);
  await expect(suggestions).toBeHidden();
});

test("Space focuses the expression while text fields and dialogs keep their normal keyboard behavior", async ({ page }) => {
  await page.goto(`./#${new URLSearchParams({ code: "10 :: sq" })}`);
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  const suggestions = page.getByRole("listbox", { name: "Keyword suggestions" });
  await input.fill("10 :: sq");
  const caret = await input.evaluate((node) => node.selectionStart);
  await page.locator(".session-label").click();
  await expect(input).not.toBeFocused();
  await page.keyboard.press("Control+Space");
  await expect(input).toBeFocused();
  await expect(suggestions).toBeVisible();
  await input.press("Escape");
  await page.locator(".session-label").click();
  await expect(input).not.toBeFocused();
  await page.keyboard.press("Space");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("10 :: sq");
  expect(await input.evaluate((node) => node.selectionStart)).toBe(caret);
  await page.keyboard.press("Space");
  await expect(input).toHaveValue("10 :: sq ");
  await expect(suggestions).toBeHidden();
  const search = page.getByRole("searchbox", { name: "Search keywords", exact: true });
  await search.fill("range");
  await search.press("Space");
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("range ");
  await search.press("Control+Space");
  await expect(search).toBeFocused();
  await expect(suggestions).toBeHidden();

  const gear = page.getByRole("button", { name: "Settings", exact: true });
  await gear.click();
  const examples = page.getByRole("switch", { name: "Show examples", exact: true });
  await examples.focus();
  await examples.press("Space");
  await expect(examples).not.toBeChecked();
  await expect(examples).toBeFocused();
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(gear).toBeFocused();
  await page.keyboard.press("Space");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("10 :: sq ");
  await expect(page.getByRole("dialog", { name: "settings", exact: true })).toBeHidden();

  await page.keyboard.press("Shift+C");
  const challengeSearch = page.getByRole("searchbox", { name: "Search challenges", exact: true });
  await challengeSearch.fill("score");
  await challengeSearch.press("Space");
  await expect(challengeSearch).toBeFocused();
  await expect(challengeSearch).toHaveValue("score ");
});

test("the compact regular REPL fits the window and resizes its session without page scrolling", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("jello-settings", JSON.stringify({
    liveMode: true, showExamples: false, showKeywords: false, theme: "dracula", presentationMode: false,
  })));
  await page.goto("./");
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  await expect(page.locator("#verification-status")).toHaveText("✓ match", { timeout: 90000 });
  const transcript = page.locator("#transcript");
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  const expectPageFits = async () => {
    await expect.poll(() => page.evaluate(() => {
      const root = document.documentElement;
      const footer = document.querySelector(".site-footer").getBoundingClientRect();
      return root.scrollHeight <= innerHeight && root.scrollWidth <= innerWidth && footer.bottom <= innerHeight + 1;
    })).toBe(true);
    await expect(input).toBeInViewport();
    await expect(page.locator("#execution-status")).toBeInViewport();
  };
  const original = page.viewportSize();
  const initialHeight = await transcript.evaluate((node) => node.clientHeight);
  await expectPageFits();
  await page.screenshot({ path: testInfo.outputPath("viewport-fit.png"), fullPage: true });

  await input.fill("4 :: range ");
  await input.press("Control+Space");
  const suggestions = page.getByRole("listbox", { name: "Keyword suggestions" });
  await expect(suggestions).toBeVisible();
  await page.setViewportSize({ width: original.width, height: original.width > 800 ? 600 : 650 });
  await expectPageFits();
  expect(await transcript.evaluate((node) => node.clientHeight)).toBeLessThan(initialHeight);
  // The completion grid must remain scrollable inside the shorter REPL.
  await expect.poll(() => page.locator("#autocomplete").evaluate((node) =>
    node.getBoundingClientRect().bottom <= node.closest(".repl").getBoundingClientRect().bottom + 1)).toBe(true);
  await suggestions.getByRole("option").last().scrollIntoViewIfNeeded();
  expect(await suggestions.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await input.press("Escape");
  await expect(page.locator(".result").last()).toHaveText("[1, 2, 3, 4]");

  await setLiveMode(page, false);
  for (const value of [1, 2, 3]) {
    await input.fill(`${value} :: sq`);
    await input.press("Enter");
    await expect(page.locator(".result").last()).toHaveText(String(value * value));
  }
  expect(await transcript.evaluate((node) => node.scrollHeight > node.clientHeight && node.scrollTop > 0)).toBe(true);
  await expectPageFits();
  const shorterHeight = await transcript.evaluate((node) => node.clientHeight);
  await page.setViewportSize(original);
  await expectPageFits();
  expect(await transcript.evaluate((node) => node.clientHeight)).toBeGreaterThan(shorterHeight);

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Show keywords", exact: true }).check();
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.locator(".wordbook")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
});

test("settings persist and keep the REPL usable in presentation mode", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  const gear = page.getByRole("button", { name: "Settings", exact: true });
  const dialog = page.getByRole("dialog", { name: /settings/ });
  const live = dialog.getByRole("switch", { name: "Live mode", exact: true });
  const examples = dialog.getByRole("switch", { name: "Show examples", exact: true });
  const keywords = dialog.getByRole("switch", { name: "Show keywords", exact: true });
  const presentation = dialog.getByRole("switch", { name: "Presentation mode", exact: true });
  const theme = dialog.getByRole("combobox", { name: "Theme", exact: true });
  const close = () => dialog.getByRole("button", { name: "Close settings" }).click();
  await gear.click();
  await expect(dialog).toBeVisible();
  await expect(live).not.toBeChecked();
  await expect(examples).toBeChecked();
  await expect(keywords).toBeChecked();
  await expect(presentation).not.toBeChecked();
  await expect(theme).toHaveValue("terminal");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(gear).toBeFocused();
  await expect(page.getByRole("main").getByRole("switch")).toHaveCount(0);
  await gear.click();
  await live.check();
  await theme.selectOption("dracula");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(40, 42, 54)");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#282a36");
  await page.screenshot({ path: testInfo.outputPath("settings-dracula.png"), fullPage: true });
  await examples.uncheck();
  await keywords.uncheck();
  await close();
  await expect(page.locator(".examples-panel")).toBeHidden();
  await expect(page.locator(".wordbook")).toBeHidden();
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  await input.fill("5 :: ran");
  await input.press("Control+Space");
  await expect(page.getByRole("listbox", { name: "Keyword suggestions" })).toBeVisible();
  await input.press("Tab");
  await expect(input).toHaveValue("5 :: range");
  await expect(page.locator("#converted-expression")).toHaveText("R");
  await expect(page.locator(".live-entry .result")).toHaveText("[1, 2, 3, 4, 5]");
  await gear.click();
  await presentation.check();
  await close();
  for (const selector of [".site-header", ".site-footer", ".syntax-note", ".syntax-legend", ".toolbar-actions", ".input-help", ".timing"]) {
    await expect(page.locator(selector).first()).toBeHidden();
  }
  await expect(gear).toBeVisible();
  await expect(page.locator("#execution-status")).toBeVisible();
  await expect(page.locator("#execution-time")).toHaveText(/^\d+\.\d+ (ms|s)$/);
  const box = await page.locator(".repl").boundingBox();
  const timingBox = await page.locator("#execution-status").boundingBox();
  expect(box.x + box.width - timingBox.x - timingBox.width).toBeGreaterThan(0);
  expect(box.x + box.width - timingBox.x - timingBox.width).toBeLessThan(24);
  expect(box.y + box.height - timingBox.y - timingBox.height).toBeGreaterThan(0);
  expect(box.y + box.height - timingBox.y - timingBox.height).toBeLessThan(16);
  const viewport = page.viewportSize();
  expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
  expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(2);
  await page.screenshot({ path: testInfo.outputPath("presentation-dracula.png"), fullPage: true });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("jello-settings")))).toEqual({
    liveMode: true, showExamples: false, theme: "dracula", showKeywords: false, presentationMode: true,
  });
  await page.reload();
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  await expect(page.locator(".entry")).toHaveCount(1);
  await expect(page.locator(".entry-command")).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dracula");
  await expect(page.locator(".site-header")).toBeHidden();
  await gear.click();
  await expect(live).toBeChecked();
  await expect(examples).not.toBeChecked();
  await expect(keywords).not.toBeChecked();
  await expect(presentation).toBeChecked();
  await expect(theme).toHaveValue("dracula");
  await presentation.uncheck();
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator(".examples-panel")).toBeHidden();
  await expect(page.locator(".wordbook")).toBeHidden();
  await examples.check();
  await keywords.check();
  await live.uncheck();
  await theme.selectOption("terminal");
  await close();
  await expect(page.locator(".examples-panel")).toBeVisible();
  await expect(page.locator(".wordbook")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(11, 14, 17)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("Shift+C opens searchable challenges and loads sample inputs in manual and live modes", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  const dialog = page.getByRole("dialog", { name: /challenges/ });
  const search = dialog.getByRole("searchbox", { name: "Search challenges" });
  const choices = dialog.locator(".challenge-option");
  const keywordSearch = page.getByRole("searchbox", { name: "Search keywords" });
  await keywordSearch.press("Shift+C");
  await expect(keywordSearch).toHaveValue("C");
  await expect(dialog).toBeHidden();
  await input.fill("5 :: sum");
  await input.press("Shift+C");
  await expect(dialog).toBeVisible();
  await expect(search).toBeFocused();
  await expect(choices).toHaveCount(30);
  await expect(choices.first().locator(".challenge-tags")).toHaveText("LeetCode 3005 · Contest 380p1 · Added 2024-02-18");
  await expect(choices.nth(4).locator(".challenge-tags")).toHaveText("PWC 250p1 · Added 2024-02-20");
  await expect(choices.nth(10).locator(".challenge-tags")).toHaveText("LeetCode 3046 · Contest 386p1 · Added 2024-02-26");
  await expect(choices.last().locator(".challenge-tags")).toHaveText("LeetCode 3411 · Contest 431p1 · Added 2025-01-06");
  await expect(input).toHaveValue("5 :: sum");
  await page.screenshot({ path: testInfo.outputPath("challenge-picker.png"), fullPage: true });
  await search.press("Shift+C");
  await expect(search).toHaveValue("C");
  await search.fill("no_such_challenge");
  await expect(choices).toHaveCount(0);
  await expect(dialog.getByText("No challenges found. Try another search.")).toBeVisible();
  await search.fill("2025-01-06");
  await expect(choices).toHaveCount(1);
  await expect(choices.first().locator(".challenge-tags")).toContainText("LeetCode 3411");
  await search.fill("");
  await search.press("ArrowDown");
  await expect(choices.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(choices.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(choices.first()).toBeFocused();
  await choices.last().scrollIntoViewIfNeeded();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("5 :: sum");
  await input.press("Shift+C");
  await expect(choices.first()).toBeInViewport();
  await search.fill("Score of a String");
  await expect(choices).toHaveCount(1);
  await expect(choices.first()).toContainText('"hello" :: ord deltas abs sum');
  await expect(dialog.getByRole("link", { name: "Sample source for Score of a String" })).toHaveAttribute("href", "https://leetcode.com/problems/score-of-a-string/");
  await search.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(input).toHaveValue('"hello" :: ord deltas abs sum');
  await expect(input).toBeFocused();
  await expect(page.locator("#converted-expression")).toHaveText("OIAS");
  await expect(page.locator(".entry")).toHaveCount(1);
  await input.press("Enter");
  await expect(page.locator(".result").last()).toHaveText("13");
  await setLiveMode(page, true);
  await input.fill("99 :: sum");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Presentation mode", exact: true }).check();
  await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption("dracula");
  await page.getByRole("button", { name: /Browse challenges/ }).click();
  await expect(page.getByRole("dialog", { name: /settings/ })).toBeHidden();
  await expect(dialog).toBeVisible();
  await search.fill("3028");
  await expect(choices).toHaveCount(1);
  await expect(choices.first()).toContainText("Ant on the Boundary");
  await choices.first().click();
  await expect(input).toHaveValue("[2,3,-5] :: sums = 0 sum");
  await expect(page.locator(".live-entry .result")).toHaveText("1");
  await expect(input).toBeFocused();
  await input.press("Shift+C");
  await search.fill("1380");
  await choices.first().click();
  await expect(input).toHaveValue("[[3,7,8],[9,11,13],[15,16,17]] :: minr each rev = maxr * maxr sum");
  await expect(page.locator(".live-entry .result")).toHaveText("15");
  await input.press("Shift+C");
  await search.fill("1833");
  await choices.first().click();
  await expect(input).toHaveValue("[1,3,2,4,1] 7 :: sort sums <= sum");
  await expect(page.locator(".live-entry .result")).toHaveText("4");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("the challenge picker can retry a failed catalog download", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Download recovery is independent of layout.");
  await page.route("**/challenges.json", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("./");
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  await input.press("Shift+C");
  const retry = page.getByRole("button", { name: "Retry loading challenges" });
  await expect(retry).toBeVisible();
  await page.unroute("**/challenges.json");
  await retry.click();
  await expect(page.locator(".challenge-option")).toHaveCount(30);
  await expect(page.getByRole("searchbox", { name: "Search challenges" })).toBeFocused();
  await page.getByRole("searchbox", { name: "Search challenges" }).fill("3411");
  await page.locator(".challenge-option").click();
  await expect(input).toHaveValue("[1,2,1,2,1,1,1] :: sublists . gcd fold each * lcm fold each = prod each keep len_each maxr");
});

test("a newer live expression supersedes a busy preview", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Worker cancellation is independent of layout.");
  await page.goto("./");
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  await setLiveMode(page, true);
  await input.fill("99999999 :: factorial");
  await expect(page.getByRole("button", { name: "Stop execution" })).toBeVisible();
  await input.fill("5 :: range");
  await expect(page.locator(".live-entry .result")).toHaveText("[1, 2, 3, 4, 5]", { timeout: 90000 });
  await expect(page.locator(".live-entry")).toHaveCount(1);
  await expect(page.locator(".command-code", { hasText: "99999999" })).toHaveCount(0);
});

test("Python verification can retry without blocking Rust results", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Loading failures use the same UI on both layouts.");
  await page.route("**/worker.js", (route) => route.fulfill({ contentType: "text/javascript", body: 'self.postMessage({type: "load-error", message: "offline"});' }));
  await openRustExample(page);
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  await expect(page.locator(".result").first()).toHaveText("55");
  await expect(page.locator(".entry").first()).toHaveAttribute("data-engine", "rust");
  await expect(page.locator("#verification-status")).toHaveText("unverified");
  await expect(page.getByRole("button", { name: "Run expression", exact: true })).toBeEnabled();
  await page.unroute("**/worker.js");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator("#verification-status")).toHaveText("✓ match", { timeout: 90000 });
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeHidden();
});

test("Rust and Python agree on every challenge program in real workers", async ({ page }) => {
  await openRustExample(page);
  await expect(page.locator(".entry").first()).toHaveAttribute("data-verification", "match", { timeout: 90000 });
  const challenges = await (await page.request.get("challenges.json")).json();
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  for (const challenge of challenges) {
    await input.fill(challenge.command);
    await input.press("Enter");
    const entry = page.locator(".entry").last();
    await expect(entry).toHaveAttribute("data-command", challenge.command);
    await expect(entry).toHaveAttribute("data-engine", "rust");
    await expect(entry).toHaveAttribute("data-verification", "match");
    const expected = typeof challenge.example.expected === "boolean" ? Number(challenge.example.expected) : challenge.example.expected;
    await expect(entry.locator(".result")).toHaveText(JSON.stringify(expected).replaceAll(",", ", "));
  }
  for (const command of [DEFAULT_COMMAND, "0.5 :: double", "81 :: sqrt", "-0.0 :: i", "[1.5,2,3.25] :: sum", "1.0 0.1 :: idiv", "9007199254740993 :: sq", '"😀é" :: ord', "[[1,2],[3]] :: sum"]) {
    await input.fill(command); await input.press("Enter");
    await expect(page.locator(".entry").last()).toHaveAttribute("data-verification", "match");
    await expect(page.locator(".entry").last()).toHaveAttribute("data-engine", "rust");
  }
  await expect(page.getByRole("img", { name: "Rust", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Python", exact: true })).toBeVisible();
  await expect(page.locator("#verification-status")).toHaveText("✓ match");
});

test("unsupported Rust operations and inputs fall back to real Python", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  for (const [command, expected] of [["-1 :: sqrt", "1j"], ["1 0 :: div", "inf"], ["'hello world' :: rev", "dlrow olleh"]]) {
    await input.fill(command);
    await input.press("Enter");
    const entry = page.locator(".entry").last();
    await expect(entry.locator(".result")).toHaveText(expected, { timeout: 90000 });
    await expect(entry).toHaveAttribute("data-engine", "python");
    await expect(page.locator("#verification-status")).toHaveText("Rust unsupported");
    await expect(page.getByRole("img", { name: "Rust", exact: true })).toBeHidden();
    await expect(page.getByRole("img", { name: "Python", exact: true })).toBeVisible();
  }
});

test("a missing Wasm module falls back to Python", async ({ page }) => {
  await page.route("**/jello-engine.wasm", (route) => route.fulfill({ status: 503, body: "offline" }));
  await page.goto("./");
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  await expect(page.locator(".entry").first()).toHaveAttribute("data-engine", "python");
  await expect(page.locator("#verification-status")).toHaveText("Rust unavailable");
});

test("Python total time includes loading wait, retries, and fallback without charging later runs for startup", async ({ page }) => {
  await page.clock.install();
  await page.route("**/worker.js", (route) => route.fulfill({ contentType: "text/javascript", body: `
self.onmessage = ({data}) => { self.pendingRun = data; };
self.ready = () => self.postMessage({type:"ready"});
self.finish = (result, value) => self.postMessage({type:"result",id:self.pendingRun.id,code:self.pendingRun.command === "6 :: sq" ? "²" : "RµS÷L",result,value,steps:[],tree:"",duration:1});
` }));
  const pythonWorker = async (previous) => {
    await expect.poll(() => page.workers().filter((worker) => worker !== previous && worker.url().endsWith("/worker.js")).length).toBe(1);
    return page.workers().find((worker) => worker !== previous && worker.url().endsWith("/worker.js"));
  };
  const finish = (worker, result = "2.5", value = ["float", "4004000000000000"]) => worker.evaluate(({result, value}) => self.finish(result, value), {result, value});
  const pendingId = (worker) => worker.evaluate(() => self.pendingRun?.id);
  await page.goto("./");
  await expect(page.locator(".result")).toHaveText("2.5");
  await expect(page.locator("#python-execution-time")).toHaveText("checking…");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  let python = await pythonWorker();
  await page.clock.runFor(2000);
  await python.evaluate(() => self.ready());
  await expect.poll(() => pendingId(python)).toBeDefined();
  await page.clock.runFor(300);
  await finish(python);
  await expect(page.locator("#verification-status")).toHaveText("✓ match");
  const cold = await page.locator("#python-execution-time").textContent();
  expect(cold).toMatch(/^\d+\.\d{2} s$/);
  expect(parseFloat(cold)).toBeGreaterThanOrEqual(2.3);
  await expect(page.locator("#python-comparison")).toHaveAttribute("title", /evaluation alone: 1.0 ms$/);

  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  let previousId = await pendingId(python);
  await input.press("Enter");
  await expect.poll(() => pendingId(python)).toBeGreaterThan(previousId);
  await page.clock.runFor(50);
  await finish(python);
  await expect(page.locator("#verification-status")).toHaveText("✓ match");
  await expect(page.locator("#python-execution-time")).toHaveText("50.0 ms");

  await python.evaluate(() => self.postMessage({type:"load-error",message:"offline"}));
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator("#python-execution-time")).toHaveText("checking…");
  python = await pythonWorker(python);
  await page.clock.runFor(1000);
  await python.evaluate(() => self.ready());
  await expect.poll(() => pendingId(python)).toBeDefined();
  await page.clock.runFor(50);
  await finish(python);
  await expect(page.locator("#verification-status")).toHaveText("✓ match");
  await expect(page.locator("#python-execution-time")).toHaveText("1.05 s");

  const rust = page.workers().find((worker) => worker.url().endsWith("/rust-worker.js"));
  await rust.evaluate(() => { self.onmessage = ({data}) => self.postMessage({type:"unsupported",id:data.id}); });
  previousId = await pendingId(python);
  await input.fill("6 :: sq");
  await input.press("Enter");
  await expect.poll(() => pendingId(python)).toBeGreaterThan(previousId);
  await page.clock.runFor(75);
  await finish(python, "36", ["integer", "36"]);
  await expect(page.locator(".entry").last()).toHaveAttribute("data-engine", "python");
  await expect(page.locator("#execution-time")).toHaveText("75.0 ms");
  await expect(page.locator(".timing").last()).toHaveText("75.0 ms");
  await expect(page.locator("#execution-status")).toHaveAttribute("title", /Python includes loading wait and response/);
});

test("Rust output survives Python timeout and verification cancellation", async ({ page }) => {
  await page.clock.install();
  await page.route("**/worker.js", (route) => route.fulfill({ contentType: "text/javascript", body: `
self.postMessage({type:"ready"});
self.onmessage = ({data}) => {
  self.lastCommand = data.command;
  if (data.command === "7 :: sq") self.postMessage({type:"result",id:data.id,result:"49",value:["integer","49"],steps:[],tree:"",duration:1});
  else if (data.command === "6 :: sq") setTimeout(() => self.postMessage({type:"result",id:data.id,result:"36",value:["integer","36"],steps:[],tree:"",duration:1}), 2000);
};` }));
  await openRustExample(page);
  await expect(page.locator(".result").first()).toHaveText("55");
  await expect.poll(async () => {
    const python = page.workers().find((worker) => worker.url().endsWith("/worker.js"));
    return python ? python.evaluate(() => self.lastCommand).catch(() => null) : null;
  }).toBe(RUST_EXAMPLE);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.clock.runFor(10_000);
  await expect(page.locator(".entry").first()).toHaveAttribute("data-verification", "timeout");
  await expect(page.locator(".result").first()).toHaveText("55");
  await expect(page.locator("#python-execution-time")).toHaveText("timed out");
  await expect(page.locator("#verification-status")).toHaveText("unverified");
  const input = page.getByRole("combobox", { name: "JELLO EXPRESSION" });
  await input.fill("6 :: sq"); await input.press("Enter");
  await expect(page.locator(".result").last()).toHaveText("36");
  await input.fill("7 :: sq"); await input.press("Enter");
  await expect(page.locator('.entry[data-command="6 :: sq"]')).toHaveAttribute("data-verification", "cancelled");
  await expect(page.locator(".entry").last()).toHaveAttribute("data-verification", "match");
  await expect(page.locator(".result").last()).toHaveText("49");
  await expect(page.locator("#verification-status")).toHaveText("✓ match");
});

test("a Python mismatch or error is visible and keeps the Rust output", async ({ page }) => {
  await page.route("**/worker.js", (route) => route.fulfill({ contentType: "text/javascript", body: `
self.postMessage({type:"ready"});
self.onmessage = ({data}) => self.postMessage(data.command === "6 :: sq"
  ? {type:"error",id:data.id,message:"Verification failed",duration:2}
  : data.command === "7 :: sq" ? {type:"result",id:data.id,result:"49",value:["list",[["integer","49"]]],steps:[],tree:"",duration:2}
  : {type:"result",id:data.id,result:"56",value:["integer","56"],steps:[],tree:"",duration:2});` }));
  await openRustExample(page);
  await expect(page.locator(".entry").first()).toHaveAttribute("data-verification", "mismatch");
  await expect(page.locator(".result").first()).toHaveText("55");
  await expect(page.locator(".python-result")).toHaveText("56");
  await expect(page.locator("#verification-status")).toHaveText("≠ mismatch");
  await page.locator("#expression").fill("6 :: sq");
  await page.locator("#expression").press("Enter");
  await expect(page.locator(".entry").last()).toHaveAttribute("data-verification", "error");
  await expect(page.locator(".result").last()).toHaveText("36");
  await expect(page.locator(".python-result").last()).toHaveText("Verification failed");
  await expect(page.locator("#verification-status")).toHaveText("unverified");
  await page.locator("#expression").fill("7 :: sq");
  await page.locator("#expression").press("Enter");
  await expect(page.locator(".entry").last()).toHaveAttribute("data-verification", "mismatch");
  await expect(page.locator(".result").last()).toHaveText("49");
  await expect(page.locator(".verification-note").last()).toContainText("value types or structure differ");
});

test("a Rust timeout falls back to Python without rerunning the stuck program", async ({ page }) => {
  await page.clock.install();
  await page.route("**/rust-worker.js", (route) => route.fulfill({ contentType: "text/javascript", body: 'self.postMessage({type:"ready"}); self.onmessage=({data})=>{self.lastCommand=data.command;};' }));
  await page.route("**/worker.js", (route) => route.fulfill({ contentType: "text/javascript", body: 'self.postMessage({type:"ready"}); self.onmessage=({data})=>self.postMessage({type:"result",id:data.id,code:"R²S",result:"55",value:["integer","55"],steps:[],tree:"",duration:1});' }));
  await openRustExample(page);
  await expect(page.getByRole("button", { name: "Stop execution" })).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.clock.runFor(10_000);
  await expect(page.locator(".result").first()).toHaveText("55");
  await expect(page.locator(".entry").first()).toHaveAttribute("data-engine", "python");
  await expect(page.locator("#verification-status")).toHaveText("Rust timeout");
  await page.clock.runFor(10_000);
  await expect(page.locator(".result")).toHaveCount(1);
  await expect(page.locator(".error-message")).toHaveCount(0);
});

test("both interpreters can recover from a loading failure", async ({ page }) => {
  const offline = (route) => route.fulfill({ contentType: "text/javascript", body: 'self.postMessage({type:"load-error",message:"offline"});' });
  await page.route("**/rust-worker.js", offline);
  await page.route("**/worker.js", offline);
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  await expect(page.locator("#runtime-status")).toHaveClass(/error/);
  await expect(page.getByRole("button", { name: "Run expression", exact: true })).toBeDisabled();
  await page.unroute("**/rust-worker.js"); await page.unroute("**/worker.js");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator(".result").first()).toHaveText("2.5", { timeout: 90000 });
  await page.locator("#expression").fill(RUST_EXAMPLE);
  await page.locator("#expression").press("Enter");
  await expect(page.locator(".entry").last()).toHaveAttribute("data-verification", "match", { timeout: 90000 });
});
