// Independent workers let Python verification time out without losing Rust output.
const EXECUTION_LIMIT = 10_000;
const LOAD_LIMIT = 90_000;

export class Backends {
  constructor() {
    this.states = { rust: "loading", python: "loading" };
    this.workers = {};
    this.loadTimers = {};
    this.runTimers = {};
    this.ready = false;
    this.closed = false;
    this.current = null;
    this.pythonTask = null;
    this.pendingPython = null;
    queueMicrotask(() => { if (!this.closed) { this.start("rust"); this.start("python"); } });
  }

  get pythonUnavailable() { return this.states.python === "error"; }
  emit(data) { if (!this.closed) this.onmessage?.({ data }); }

  start(engine) {
    this.workers[engine]?.terminate();
    clearTimeout(this.loadTimers[engine]);
    clearTimeout(this.runTimers[engine]);
    this.states[engine] = "loading";
    this.emit({ type: "backend-status", engine, state: "loading" });
    const path = engine === "rust" ? "./rust-worker.js" : "./worker.js";
    try {
      const worker = new Worker(new URL(path, import.meta.url), { type: "module" });
      this.workers[engine] = worker;
      this.loadTimers[engine] = setTimeout(() => this.failed(engine, "Interpreter loading timed out."), LOAD_LIMIT);
      worker.onmessage = ({ data }) => {
        if (this.closed || this.workers[engine] !== worker) return;
        if (data.type === "ready") {
          clearTimeout(this.loadTimers[engine]);
          this.states[engine] = "ready";
          this.announceReady();
          this.emit({ type: "backend-status", engine, state: "ready" });
          if (engine === "python") this.flushPython();
          else if (this.current && !this.current.primaryDone && !this.pythonTask) this.runRust(this.current);
        } else if (data.type === "load-error") this.failed(engine, data.message);
        else if (data.type !== "status") {
          if (engine === "rust") this.rustResponse(data);
          else this.pythonResponse(data);
        }
      };
      worker.onerror = (event) => { event.preventDefault(); if (this.workers[engine] === worker) this.failed(engine, "The interpreter stopped unexpectedly."); };
    } catch (error) { this.failed(engine, error.message); }
  }

  announceReady() {
    if (!this.ready && Object.values(this.states).includes("ready")) { this.ready = true; this.emit({ type: "ready" }); }
    else if (!this.ready && Object.values(this.states).every((state) => state === "error")) this.emit({ type: "load-error", message: "Neither interpreter could load." });
  }

  failed(engine, message) {
    clearTimeout(this.loadTimers[engine]);
    clearTimeout(this.runTimers[engine]);
    this.workers[engine]?.terminate();
    this.workers[engine] = null;
    this.states[engine] = "error";
    this.emit({ type: "backend-status", engine, state: "error", message });
    if (engine === "rust" && this.current && !this.current.primaryDone) {
      this.current.rustReason = "unavailable";
      this.queuePython(this.current, false);
    } else if (engine === "python") {
      const task = this.pythonTask || this.pendingPython;
      this.pythonTask = this.pendingPython = null;
      if (task) this.pythonFailure(task, "unavailable", message);
    }
    this.announceReady();
  }

  postMessage(data) {
    if (data.type !== "run") return;
    this.cancel();
    this.current = { id: data.id, command: data.command, primaryDone: false };
    if (this.states.rust === "ready") this.runRust(this.current);
    else if (this.states.rust === "error") { this.current.rustReason = "unavailable"; this.queuePython(this.current, false); }
  }

  runRust(job) {
    if (job.rustStarted) return;
    job.rustStarted = true;
    this.workers.rust.postMessage({ type: "run", id: job.id, command: job.command });
    this.runTimers.rust = setTimeout(() => {
      if (this.current !== job || job.primaryDone) return;
      job.rustReason = "timeout";
      this.start("rust");
      this.queuePython(job, false);
    }, EXECUTION_LIMIT);
  }

  rustResponse(data) {
    const job = this.current;
    if (!job || data.id !== job.id || job.primaryDone) return;
    clearTimeout(this.runTimers.rust);
    if (data.type === "result") {
      job.primaryDone = true;
      job.rustResult = data;
      this.emit({ ...data, engine: "rust", verification: "pending" });
      this.queuePython(job, true);
    } else {
      job.rustReason = "unsupported";
      this.queuePython(job, false);
    }
  }

  queuePython(job, verify) {
    if (this.current !== job) return;
    this.pendingPython = { job, verify, startedAt: performance.now() };
    if (this.states.python === "error") {
      const task = this.pendingPython;
      this.pendingPython = null;
      this.pythonFailure(task, "unavailable", "Python couldn't load. Use Retry to try again.");
    } else this.flushPython();
  }

  flushPython() {
    if (this.states.python !== "ready" || this.pythonTask || !this.pendingPython) return;
    const task = this.pendingPython;
    this.pendingPython = null;
    this.pythonTask = task;
    this.workers.python.postMessage({ type: "run", id: task.job.id, command: task.job.command });
    this.runTimers.python = setTimeout(() => {
      if (this.pythonTask !== task) return;
      this.pythonTask = null;
      this.pythonFailure(task, "timeout", "Python took more than 10 seconds. Try a smaller input or a shorter program.");
      this.start("python");
    }, EXECUTION_LIMIT);
  }

  pythonResponse(data) {
    const task = this.pythonTask;
    if (!task || data.id !== task.job.id) return;
    data = { ...data, totalDuration: performance.now() - task.startedAt };
    clearTimeout(this.runTimers.python);
    this.pythonTask = null;
    if (task.verify) {
      const rust = task.job.rustResult;
      const match = data.type === "result" && data.value !== undefined && JSON.stringify(rust.value) === JSON.stringify(data.value) && rust.result === data.result;
      this.emit({ type: "verification", id: data.id, status: data.type === "result" ? (match ? "match" : "mismatch") : "error", python: data });
    } else {
      task.job.primaryDone = true;
      this.emit({ ...data, engine: "python", verification: task.job.rustReason || "unsupported" });
    }
    this.flushPython();
  }

  pythonFailure(task, status, message) {
    if (task.verify) this.emit({ type: "verification", id: task.job.id, status, message });
    else {
      task.job.primaryDone = true;
      this.emit({ type: "error", id: task.job.id, engine: "python", message });
    }
  }

  retryPython() {
    if (this.current?.rustResult) {
      this.emit({ type: "verification", id: this.current.id, status: "pending" });
      this.pendingPython = { job: this.current, verify: true, startedAt: performance.now() };
    }
    this.pythonTask = null;
    this.start("python");
  }

  cancel() {
    const job = this.current;
    if (job?.rustResult && (this.pythonTask || this.pendingPython)) this.emit({ type: "verification", id: job.id, status: "cancelled" });
    this.pendingPython = null;
    if (this.pythonTask) { this.pythonTask = null; this.start("python"); }
    clearTimeout(this.runTimers.rust);
    if (job && !job.primaryDone && this.states.rust === "ready") this.start("rust");
    this.current = null;
  }

  terminate() {
    this.closed = true;
    for (const engine of ["rust", "python"]) {
      clearTimeout(this.loadTimers[engine]); clearTimeout(this.runTimers[engine]);
      this.workers[engine]?.terminate();
    }
  }
}
