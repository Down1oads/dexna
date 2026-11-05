/*
 * Dexna Python worker.
 * The same script runs in two roles (chosen via ?role=):
 *   kernel – executes user code, REPL, debugger, package installs
 *   lsp    – language services: completion, hover, lint, format, rename…
 */
const params = new URLSearchParams(self.location.search);
const ROLE = params.get("role") || "kernel";
const PYODIDE_URL = params.get("pyodide");
const BASE = new URL("../", self.location.href).href;
const PROJECT = "/home/pyodide/project";

importScripts(PYODIDE_URL + "pyodide.js");

let pyodide = null;
let chan = null; // shared-memory channel for blocking replies (input / debugger)
let interruptBuffer = null;
const synced = new Map(); // path -> content last written to FS
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const post = (type, data = {}) => self.postMessage({ type, ...data });

/* ---------- Blocking channel (SharedArrayBuffer + Atomics) ---------- */
function waitReply(requestType, payload) {
  if (!chan) return null;
  Atomics.store(chan.ctrl, 0, 0);
  post(requestType, payload);
  Atomics.wait(chan.ctrl, 0, 0);
  const len = chan.ctrl[1];
  return decoder.decode(chan.data.slice(0, len));
}

/* ---------- Streaming stdout / stderr ---------- */
function makeWriter(type) {
  const dec = new TextDecoder();
  let pending = "";
  let timer = null;
  const flush = () => { timer = null; if (pending) { post(type, { text: pending }); pending = ""; } };
  return {
    write(buf) {
      pending += dec.decode(buf, { stream: true });
      if (pending.length > 8192) flush();
      else if (!timer) timer = setTimeout(flush, 16);
      return buf.length;
    },
    flush,
  };
}
const outW = makeWriter("stdout");
const errW = makeWriter("stderr");
const flushAll = () => { outW.flush(); errW.flush(); };

/* ---------- File system sync ---------- */
function mkdirp(path) {
  const parts = path.split("/").filter(Boolean);
  let cur = "";
  for (const p of parts) {
    cur += "/" + p;
    try { pyodide.FS.mkdir(cur); } catch (_) { /* exists */ }
  }
}
function rmrf(path) {
  const FS = pyodide.FS;
  let st;
  try { st = FS.stat(path); } catch (_) { return; }
  if (FS.isDir(st.mode)) {
    for (const n of FS.readdir(path)) if (n !== "." && n !== "..") rmrf(path + "/" + n);
    if (path !== PROJECT) FS.rmdir(path);
  } else FS.unlink(path);
}
function writeFile(rel, content) {
  const full = PROJECT + "/" + rel;
  mkdirp(full.slice(0, full.lastIndexOf("/")));
  pyodide.FS.writeFile(full, content);
  synced.set(rel, content);
}
function syncAll(files, dirs = []) {
  rmrf(PROJECT);
  mkdirp(PROJECT);
  synced.clear();
  for (const d of dirs) mkdirp(PROJECT + "/" + d);
  for (const [p, c] of Object.entries(files)) writeFile(p, c);
}
/** Text files the program created or changed during a run. */
function collectChanges() {
  const FS = pyodide.FS;
  const out = {};
  const walk = (dir, rel) => {
    for (const n of FS.readdir(dir)) {
      if (n === "." || n === ".." || n === "__pycache__") continue;
      const full = dir + "/" + n, r = rel ? rel + "/" + n : n;
      const st = FS.stat(full);
      if (FS.isDir(st.mode)) walk(full, r);
      else if (st.size < 512 * 1024) {
        const bytes = FS.readFile(full);
        if (bytes.includes(0)) continue; // binary
        let text;
        try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch (_) { continue; }
        if (synced.get(r) !== text) { out[r] = text; synced.set(r, text); }
      }
    }
  };
  try { walk(PROJECT, ""); } catch (_) {}
  return out;
}

/* ---------- Package helpers ---------- */
const PYPI_NAMES = {
  sklearn: "scikit-learn", cv2: "opencv-python", bs4: "beautifulsoup4", yaml: "pyyaml",
  PIL: "Pillow", skimage: "scikit-image", dateutil: "python-dateutil", attr: "attrs",
};
async function ensureMicropip() {
  if (!pyodide._dexnaMicropip) {
    await pyodide.loadPackage("micropip", { messageCallback: () => {} });
    pyodide._dexnaMicropip = pyodide.pyimport("micropip");
  }
  return pyodide._dexnaMicropip;
}
async function installPackages(names, quiet = false) {
  const mp = await ensureMicropip();
  const results = [];
  for (const name of names) {
    try {
      if (!quiet) post("stdout", { text: `\x1b[36mInstalling ${name}...\x1b[0m\n` });
      await mp.install(name);
      results.push({ name, ok: true });
      if (!quiet) post("stdout", { text: `\x1b[32mInstalled ${name}\x1b[0m\n` });
    } catch (e) {
      results.push({ name, ok: false, error: String(e.message || e).split("\n").slice(-2).join(" ") });
      if (!quiet) post("stderr", { text: `Could not install ${name}: ${results.at(-1).error}\n` });
    }
  }
  return results;
}
/** Load Pyodide packages used by `sources`, then optionally micropip-install unknown imports. */
async function prepareImports(sources, autoInstall) {
  for (const src of sources) {
    try {
      await pyodide.loadPackagesFromImports(src, {
        messageCallback: (m) => { if (/^Loading/.test(m)) post("status", { state: "loading", msg: m }); },
        errorCallback: () => {},
      });
    } catch (_) { /* syntax errors are reported when the code runs */ }
  }
  if (!autoInstall) return;
  const fn = pyodide.globals.get("_dexna_missing_imports");
  const missing = fn(sources).toJs();
  fn.destroy();
  if (missing.length) await installPackages(missing.map((m) => PYPI_NAMES[m] || m));
}

/* ---------- Boot ---------- */
async function boot(msg) {
  post("status", { state: "loading", msg: "Loading Python runtime…" });
  pyodide = await loadPyodide({
    indexURL: PYODIDE_URL,
    stdout: () => {}, stderr: () => {},
  });
  pyodide.setStdout({ write: (b) => outW.write(b) });
  pyodide.setStderr({ write: (b) => errW.write(b) });

  if (msg.sab) {
    chan = { ctrl: new Int32Array(msg.sab.ctrl), data: new Uint8Array(msg.sab.data) };
    interruptBuffer = new Int32Array(msg.sab.interrupt);
    pyodide.setInterruptBuffer(interruptBuffer);
  }
  pyodide.setStdin({
    stdin: () => {
      flushAll();
      if (!chan) {
        post("stderr", { text: "\n[Dexna] input() needs cross-origin isolation, which isn't available in this browser session. Reload the page to enable it.\n" });
        return null;
      }
      const r = waitReply("input-request", {});
      return r === "\u0000EOF" ? null : r + "\n";
    },
    isatty: true,
  });

  pyodide.registerJsModule("dexna_bridge", {
    post: (type, data) => { flushAll(); post(type, { data }); },
    wait_reply: (type, data) => { flushAll(); return waitReply(type, { data }); },
    has_channel: () => !!chan,
  });
  mkdirp(PROJECT);
  pyodide.FS.chdir(PROJECT);

  const src = await (await fetch(BASE + `py/${ROLE}.py`)).text();
  pyodide.runPython(src, { filename: `<dexna-${ROLE}>` });

  if (ROLE === "lsp") {
    post("status", { state: "loading", msg: "Loading language tools…" });
    await pyodide.loadPackage(["jedi"], { messageCallback: () => {} });
    pyodide.runPython("_dexna_init_jedi()");
    // Linters/formatters come from PyPI; load them in the background.
    (async () => {
      const r = await installPackages(["pyflakes"], true);
      if (r[0].ok) post("capability", { name: "lint" });
    })();
  }
  const version = pyodide.runPython("import sys; sys.version.split()[0]");
  post("ready", { version, pyodide: pyodide.version, isolated: !!chan });
}

/* ---------- Message handling ---------- */
let queue = Promise.resolve();
self.onmessage = (e) => {
  const msg = e.data;
  if (msg.cmd === "init") { queue = queue.then(() => boot(msg)).catch((err) => post("fatal", { error: String(err) })); return; }
  queue = queue.then(() => handle(msg)).catch((err) => {
    flushAll();
    post("reply", { id: msg.id, error: String(err && err.message || err) });
  });
};

async function handle(msg) {
  const { id } = msg;
  const reply = (result) => post("reply", { id, result });
  switch (msg.cmd) {
    case "sync": syncAll(msg.files, msg.dirs); return reply(true);
    case "write": writeFile(msg.path, msg.content); return reply(true);
    case "remove": { rmrf(PROJECT + "/" + msg.path); synced.delete(msg.path); return reply(true); }

    // ----- kernel -----
    case "run": {
      post("status", { state: "busy", msg: "Preparing…" });
      await prepareImports(msg.sources, msg.autoInstall);
      post("status", { state: "busy", msg: msg.debug ? "Debugging" : "Running" });
      const run = pyodide.globals.get("_dexna_run");
      let res;
      try { res = run(msg.path, !!msg.debug, JSON.stringify(msg.breakpoints || {}), !!msg.stopOnEntry); }
      finally { run.destroy(); }
      flushAll();
      if (interruptBuffer) interruptBuffer[0] = 0;
      return reply({ ...JSON.parse(res), changes: collectChanges() });
    }
    case "repl": {
      post("status", { state: "busy", msg: "Running" });
      await prepareImports([msg.code], msg.autoInstall);
      pyodide.globals.set("_dexna_src", msg.code);
      const res = await pyodide.runPythonAsync("await _dexna_repl(_dexna_src)");
      flushAll();
      if (interruptBuffer) interruptBuffer[0] = 0;
      return reply({ ...JSON.parse(res), changes: collectChanges() });
    }
    case "complete-check":
      return reply(pyodide.globals.get("_dexna_is_complete")(msg.code));
    case "vars":
      return reply(JSON.parse(pyodide.runPython("_dexna_vars()")));
    case "inspect":
      return reply(JSON.parse(pyodide.globals.get("_dexna_inspect")(msg.name)));
    case "reset-ns":
      pyodide.runPython("_dexna_reset()");
      return reply(true);
    case "install": {
      post("status", { state: "busy", msg: "Installing packages…" });
      return reply(await installPackages(msg.packages, !!msg.quiet));
    }
    case "uninstall": {
      const mp = await ensureMicropip();
      try { mp.uninstall(msg.name); return reply({ ok: true }); }
      catch (e) { return reply({ ok: false, error: String(e.message || e).split("\n").slice(-1)[0] }); }
    }
    case "list-packages": {
      await ensureMicropip();
      return reply(JSON.parse(pyodide.runPython("_dexna_list_packages()")));
    }

    // ----- lsp -----
    case "lsp": {
      if (msg.method === "lint" && msg.loadImports) {
        // make third-party modules visible to jedi (fire & forget)
        pyodide.loadPackagesFromImports(msg.args[0], { messageCallback: () => {} }).catch(() => {});
      }
      if (msg.method === "format" || msg.method === "sort_imports") {
        const pkg = msg.method === "format" ? "black" : "isort";
        if (!pyodide.runPython(`import importlib.util; importlib.util.find_spec("${pkg}") is not None`)) {
          await installPackages([pkg], true);
        }
      }
      const fn = pyodide.globals.get("lsp_" + msg.method);
      try { return reply(JSON.parse(fn(...msg.args))); } finally { fn.destroy(); }
    }
    case "read-file": {
      try { return reply(pyodide.FS.readFile(msg.path, { encoding: "utf8" })); }
      catch (_) { return reply(null); }
    }
  }
}
