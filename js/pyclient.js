// Main-thread client for a Python worker (kernel or language server).
export class PyClient {
  /** @param {"kernel"|"lsp"} role @param {(msg:any)=>void} onEvent */
  constructor(role, onEvent) {
    this.role = role;
    this.onEvent = onEvent;
    this.seq = 0;
    this.pending = new Map();
    this.worker = null;
    this.ready = null;
    this.info = null;
    this.isolated = typeof SharedArrayBuffer !== "undefined" && self.crossOriginIsolated;
  }

  start() {
    const cfg = window.DEXNA_CONFIG;
    const url = new URL(`pyworker.js?role=${this.role}&pyodide=${encodeURIComponent(cfg.pyodide)}`, import.meta.url);
    this.worker = new Worker(url);
    let sab = null;
    if (this.isolated) {
      sab = {
        ctrl: new SharedArrayBuffer(8),
        data: new SharedArrayBuffer(1 << 20),
        interrupt: new SharedArrayBuffer(4),
      };
      this.ctrl = new Int32Array(sab.ctrl);
      this.data = new Uint8Array(sab.data);
      this.interruptBuf = new Int32Array(sab.interrupt);
    }
    this.ready = new Promise((resolve, reject) => {
      this._resolveReady = resolve;
      this._rejectReady = reject;
    });
    this.worker.onmessage = (e) => this._onMessage(e.data);
    this.worker.onerror = (e) => {
      const err = new Error(e.message || "Worker failed to start");
      this._rejectReady?.(err);
      this.onEvent({ type: "fatal", error: err.message });
    };
    this.worker.postMessage({ cmd: "init", sab });
    return this.ready;
  }

  _onMessage(msg) {
    if (msg.type === "reply") {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error !== undefined) p.reject(new Error(msg.error));
      else p.resolve(msg.result);
      return;
    }
    if (msg.type === "ready") { this.info = msg; this._resolveReady(msg); }
    if (msg.type === "fatal") this._rejectReady?.(new Error(msg.error));
    this.onEvent(msg);
  }

  call(cmd, data = {}) {
    if (!this.worker) return Promise.reject(new Error("worker not started"));
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ cmd, id, ...data });
    });
  }

  /** Unblock the worker waiting on input() or the debugger. */
  reply(text) {
    if (!this.ctrl) return false;
    const bytes = new TextEncoder().encode(text);
    const n = Math.min(bytes.length, this.data.length);
    this.data.set(bytes.subarray(0, n));
    this.ctrl[1] = n;
    Atomics.store(this.ctrl, 0, 1);
    Atomics.notify(this.ctrl, 0);
    return true;
  }

  interrupt() {
    if (!this.interruptBuf) return false;
    this.interruptBuf[0] = 2; // SIGINT
    return true;
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    for (const p of this.pending.values()) p.reject(new Error("Kernel restarted"));
    this.pending.clear();
  }

  restart() {
    this.terminate();
    return this.start();
  }
}
