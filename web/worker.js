const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
let runtime;

async function initialize() {
  self.postMessage({ type: "status", message: "loading runtime…" });
  const { loadPyodide } = await import(`${PYODIDE_URL}pyodide.mjs`);
  const pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
  self.postMessage({ type: "status", message: "loading jellyfish…" });
  const response = await fetch(new URL("runtime.zip", self.location.href));
  if (!response.ok) throw new Error("Couldn't download Jello. Please reload and try again.");
  pyodide.FS.mkdirTree("/jello");
  pyodide.unpackArchive(await response.arrayBuffer(), "zip", { extractDir: "/jello" });
  await pyodide.loadPackage(["sympy", "micropip"]);
  await pyodide.runPythonAsync(`
import micropip
await micropip.install("colorama==0.4.6")
import sys
sys.path.insert(0, "/jello")
import runtime
`);
  runtime = pyodide.pyimport("runtime");
  self.postMessage({ type: "ready" });
}

self.onmessage = ({ data }) => {
  if (data.type !== "run" || !runtime) return;
  const started = performance.now();
  try {
    const result = JSON.parse(runtime.evaluate(data.command));
    self.postMessage({ type: "result", id: data.id, ...result, duration: performance.now() - started });
  } catch (error) {
    const lines = String(error.message).trim().split("\n");
    const message = lines.at(-1).replace(/^\w+(?:Error|Exception):\s*/, "");
    self.postMessage({ type: "error", id: data.id, message, duration: performance.now() - started });
  }
};

initialize().catch((error) => {
  self.postMessage({ type: "load-error", message: error.message });
});
