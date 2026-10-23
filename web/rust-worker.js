import { createEvaluator } from "./wasm.js";
import { prepareRequest } from "./request.js";

let evaluate, words;
async function initialize() {
  const [moduleResponse, wordResponse] = await Promise.all([
    fetch(new URL("jello-engine.wasm", import.meta.url)),
    fetch(new URL("keywords.json", import.meta.url)),
  ]);
  if (!moduleResponse.ok || !wordResponse.ok) throw new Error("Couldn't download the Rust interpreter.");
  [evaluate, words] = await Promise.all([createEvaluator(await moduleResponse.arrayBuffer()), wordResponse.json()]);
  self.postMessage({ type: "ready" });
}
self.onmessage = ({ data }) => {
  if (data.type !== "run" || !evaluate) return;
  const started = performance.now();
  try {
    const request = prepareRequest(data.command, words);
    const result = evaluate(request);
    self.postMessage({ ...result, id: data.id, duration: performance.now() - started });
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError) self.postMessage({ type: "load-error", message: "The Rust interpreter stopped unexpectedly." });
    else self.postMessage({ type: "error", id: data.id, message: error.message, duration: performance.now() - started });
  }
};
initialize().catch((error) => self.postMessage({ type: "load-error", message: error.message }));
