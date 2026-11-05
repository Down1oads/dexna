// Dexna runner worker: runs JavaScript, TypeScript (pre-compiled), Lua and SQL.
// One fresh worker per run; the main thread terminates it to stop a program.
const post = (type, data = {}) => self.postMessage({ type, ...data });
const out = (text) => post("stdout", { text });
const err = (text) => post("stderr", { text });

let inputResolve = null;
self.onmessage = (e) => {
  const m = e.data;
  if (m.cmd === "input-reply" && inputResolve) { const r = inputResolve; inputResolve = null; r(m.value); }
  else if (m.cmd === "run") run(m).catch((ex) => { err(String(ex && ex.stack || ex) + "\n"); post("done", { ok: false, time: 0 }); });
};
function readInput(prompt) {
  return new Promise((resolve) => { inputResolve = resolve; post("input-request", { prompt: prompt || "" }); });
}

/* ------------------------------------------------------------------ */
/* console / inspect                                                   */
/* ------------------------------------------------------------------ */
function inspect(v, depth = 2, seen = new Set(), top = true, indent = 0) {
  const t = typeof v;
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (t === "string") return top ? v : "'" + v.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
  if (t === "number" || t === "boolean") return Object.is(v, -0) ? "-0" : String(v);
  if (t === "bigint") return v + "n";
  if (t === "symbol") return v.toString();
  if (t === "function") {
    const cls = /^class\b/.test(Function.prototype.toString.call(v));
    return `[${cls ? "class" : "Function"}${v.name ? (cls ? " " : ": ") + v.name : cls ? "" : " (anonymous)"}]`;
  }
  if (seen.has(v)) return "[Circular]";
  if (v instanceof Error) return v.stack || `${v.name}: ${v.message}`;
  if (v instanceof Date) return isNaN(v) ? "Invalid Date" : v.toISOString();
  if (v instanceof RegExp) return String(v);
  if (v instanceof Promise) return "Promise { <pending> }";
  const name = v.constructor && v.constructor.name;
  const isArr = Array.isArray(v);
  const isMap = v instanceof Map, isSet = v instanceof Set;
  if (depth < 0) return isArr ? "[Array]" : `[${name || "Object"}]`;
  seen.add(v);
  const sub = (x) => inspect(x, depth - 1, seen, false, indent + 2);
  let items = [], open = "{", close = "}", prefix = "";
  if (isArr) {
    open = "["; close = "]";
    let holes = 0;
    for (let i = 0; i < Math.min(v.length, 100); i++) { if (!(i in v)) { holes++; continue; } if (holes) { items.push(`<${holes} empty item${holes > 1 ? "s" : ""}>`); holes = 0; } items.push(sub(v[i])); }
    if (v.length > 100) items.push(`... ${v.length - 100} more items`);
    for (const k of Object.keys(v)) if (!/^\d+$/.test(k)) items.push(`${k}: ${sub(v[k])}`);
  } else if (isMap) {
    prefix = `Map(${v.size}) `; for (const [k, x] of v) items.push(`${sub(k)} => ${sub(x)}`);
  } else if (isSet) {
    prefix = `Set(${v.size}) `; for (const x of v) items.push(sub(x));
  } else {
    if (name && name !== "Object") prefix = name + " ";
    else if (!name) prefix = "[Object: null prototype] ";
    for (const k of Reflect.ownKeys(v)) {
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (!d.enumerable) continue;
      const key = typeof k === "symbol" ? `[${k.toString()}]` : /^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`;
      items.push(`${key}: ${d.get ? (d.set ? "[Getter/Setter]" : "[Getter]") : sub(d.value)}`);
    }
  }
  seen.delete(v);
  if (!items.length) return prefix + open + close;
  const one = `${prefix}${open} ${items.join(", ")} ${close}`;
  if (one.length + indent <= 72 && !one.includes("\n")) return one;
  const pad = " ".repeat(indent + 2);
  return `${prefix}${open}\n${pad}${items.join(",\n" + pad)}\n${" ".repeat(indent)}${close}`;
}

function format(args) {
  if (typeof args[0] === "string" && /%[sdifjoOc%]/.test(args[0]) && args.length > 1) {
    let i = 1;
    const first = args[0].replace(/%([sdifjoOc%])/g, (m, c) => {
      if (c === "%") return "%";
      if (i >= args.length) return m;
      const a = args[i++];
      switch (c) {
        case "s": return typeof a === "string" ? a : inspect(a, 0, new Set(), false);
        case "d": case "i": return typeof a === "bigint" ? a + "n" : String(c === "i" ? parseInt(a) : Number(a));
        case "f": return String(parseFloat(a));
        case "j": try { return JSON.stringify(a); } catch { return "[Circular]"; }
        case "c": return "";
        default: return inspect(a, 4, new Set(), false);
      }
    });
    return [first, ...args.slice(i).map((a) => inspect(a))].join(" ");
  }
  return args.map((a) => inspect(a)).join(" ");
}

function table(data) {
  if (data === null || typeof data !== "object") return inspect(data);
  const rows = Array.isArray(data) ? data.map((v, i) => [String(i), v]) : Object.entries(data);
  const cols = [];
  let hasValues = false;
  const cell = (v) => inspect(v, 0, new Set(), false);
  const body = rows.map(([k, v]) => {
    const r = { "(index)": k };
    if (v !== null && typeof v === "object") for (const c of Object.keys(v)) { if (!cols.includes(c)) cols.push(c); r[c] = cell(v[c]); }
    else { hasValues = true; r.Values = cell(v); }
    return r;
  });
  const head = ["(index)", ...cols, ...(hasValues ? ["Values"] : [])];
  const w = head.map((h) => Math.max(h.length, ...body.map((r) => (r[h] ?? "").length)) + 2);
  const line = (l, m, r) => l + w.map((n) => "─".repeat(n)).join(m) + r;
  const row = (r) => "│" + head.map((h, i) => { const s = r[h] ?? ""; const left = Math.floor((w[i] - s.length) / 2); return " ".repeat(left) + s + " ".repeat(w[i] - s.length - left); }).join("│") + "│";
  return [line("┌", "┬", "┐"), row(Object.fromEntries(head.map((h) => [h, h]))), line("├", "┼", "┤"), ...body.map(row), line("└", "┴", "┘")].join("\n");
}

function makeConsole() {
  let groupIndent = "";
  const counts = new Map(), timers = new Map();
  const emit = (stream, text) => { const t = groupIndent ? text.split("\n").map((l) => groupIndent + l).join("\n") : text; (stream === "err" ? err : out)(t + "\n"); };
  return {
    log: (...a) => emit("out", format(a)), info: (...a) => emit("out", format(a)), debug: (...a) => emit("out", format(a)),
    warn: (...a) => emit("err", format(a)), error: (...a) => emit("err", format(a)),
    trace: (...a) => emit("err", "Trace: " + format(a) + "\n" + (new Error().stack || "").split("\n").slice(2).join("\n")),
    dir: (v) => emit("out", inspect(v, 4, new Set(), false)), table: (d) => emit("out", table(d)),
    assert: (c, ...a) => { if (!c) emit("err", "Assertion failed" + (a.length ? ": " + format(a) : "")); },
    group: (...a) => { if (a.length) emit("out", format(a)); groupIndent += "  "; }, groupEnd: () => { groupIndent = groupIndent.slice(2); },
    count: (l = "default") => { counts.set(l, (counts.get(l) || 0) + 1); emit("out", `${l}: ${counts.get(l)}`); },
    countReset: (l = "default") => counts.delete(l),
    time: (l = "default") => timers.set(l, performance.now()),
    timeEnd: (l = "default") => { if (timers.has(l)) { emit("out", `${l}: ${(performance.now() - timers.get(l)).toFixed(3)}ms`); timers.delete(l); } },
    timeLog: (l = "default") => { if (timers.has(l)) emit("out", `${l}: ${(performance.now() - timers.get(l)).toFixed(3)}ms`); },
  };
}

/* ------------------------------------------------------------------ */
/* JavaScript / TypeScript                                             */
/* ------------------------------------------------------------------ */
const normalize = (p) => { const out = []; for (const s of p.split("/")) { if (!s || s === ".") continue; if (s === "..") out.pop(); else out.push(s); } return out.join("/"); };
const dirOf = (p) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");

async function runJs(m) {
  const files = m.files; // path -> JavaScript source (TypeScript was compiled by the main thread)
  const urlToFile = new Map();
  const built = new Map();
  const SPEC = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"'\n]+)\2/g;

  function find(from, spec) {
    const base = normalize((dirOf(from) ? dirOf(from) + "/" : "") + spec);
    const stem = base.replace(/\.(m?js|ts)$/, "");
    for (const c of [base, base + ".js", base + ".ts", base + ".mjs", stem + ".ts", stem + ".js", base + "/index.js", base + "/index.ts"]) if (c in files) return c;
    return null;
  }
  function build(path, stack) {
    if (built.has(path)) return built.get(path);
    if (stack.includes(path)) throw new Error(`Circular import: ${[...stack, path].join(" -> ")}. Dexna does not support circular imports between files yet.`);
    const code = files[path].replace(SPEC, (all, pre, q, spec) => {
      if (/^\.{1,2}\//.test(spec)) {
        const target = find(path, spec);
        if (!target) throw new Error(`Cannot find module '${spec}' imported from ${path}`);
        return `${pre}${q}${build(target, [...stack, path])}${q}`;
      }
      if (/^(https?:|data:|blob:)/.test(spec)) return all;
      if (pre.trim().startsWith("from") || pre.includes("import")) throw new Error(`Cannot import '${spec}' from ${path}. Bare package names are not supported; use a full URL such as https://esm.sh/${spec}`);
      return all;
    });
    const url = URL.createObjectURL(new Blob([code + `\n//# sourceURL=${path}`], { type: "text/javascript" }));
    urlToFile.set(url, path);
    built.set(path, url);
    return url;
  }

  const cons = makeConsole();
  const timers = new Set();
  const realST = self.setTimeout.bind(self), realSI = self.setInterval.bind(self);
  self.setTimeout = (fn, ms, ...a) => { const id = realST((...x) => { timers.delete(id); try { typeof fn === "function" ? fn(...x) : 0; } catch (ex) { report(ex); } }, ms, ...a); timers.add(id); return id; };
  self.setInterval = (fn, ms, ...a) => { const id = realSI((...x) => { try { fn(...x); } catch (ex) { report(ex); } }, ms, ...a); timers.add(id); return id; };
  const clearT = self.clearTimeout.bind(self), clearI = self.clearInterval.bind(self);
  self.clearTimeout = (id) => { timers.delete(id); clearT(id); };
  self.clearInterval = (id) => { timers.delete(id); clearI(id); };
  self.console = Object.assign(Object.create(null), cons);
  self.input = async (prompt = "") => { out(String(prompt)); const v = await readInput(prompt); return v; };

  let ok = true;
  const clean = (s) => { for (const [u, f] of urlToFile) s = s.split(u).join(f); return s; };
  function report(ex) {
    ok = false;
    const text = ex instanceof Error ? ex.stack || `${ex.name}: ${ex.message}` : "Uncaught " + inspect(ex);
    err(clean(text) + "\n");
  }
  self.addEventListener("unhandledrejection", (e) => { e.preventDefault(); report(e.reason instanceof Error ? e.reason : new Error("Unhandled promise rejection: " + inspect(e.reason))); });
  self.addEventListener("error", (e) => { e.preventDefault(); report(e.error || new Error(e.message)); });

  const t0 = performance.now();
  try {
    const entryUrl = build(m.entry, []);
    await import(entryUrl);
  } catch (ex) {
    report(ex);
  }
  // keep the program alive while timers are pending, like an event loop
  await new Promise((r) => realST(r, 0));
  while (timers.size) await new Promise((r) => realST(r, 25));
  post("done", { ok, time: (performance.now() - t0) / 1000 });
}

/* ------------------------------------------------------------------ */
/* Lua (wasmoon: Lua 5.4 compiled to WebAssembly)                      */
/* ------------------------------------------------------------------ */
async function runLua(m) {
  const base = m.libs.wasmoon;
  const code = await (await fetch(base + "index.js")).text();
  const mod = { exports: {} };
  new Function("module", "exports", code).call(mod.exports, mod, mod.exports);
  const { LuaFactory } = mod.exports;
  const factory = new LuaFactory(base + "glue.wasm");
  for (const [p, c] of Object.entries(m.files)) if (p.endsWith(".lua")) await factory.mountFile("/project/" + p, c);
  const lua = await factory.createEngine();
  const t0 = performance.now();
  let ok = true;
  try {
    lua.global.set("__dx_write", (s) => out(String(s)));
    lua.global.set("__dx_err", (s) => err(String(s)));
    lua.global.set("__dx_read", () => readInput(""));
    lua.global.set("__dx_src", m.files[m.entry]);
    lua.global.set("__dx_name", m.entry);
    await lua.doString(`
      local write, ewrite, read = __dx_write, __dx_err, __dx_read
      package.path = "/project/?.lua;/project/?/init.lua"
      local function fmt(...)
        local t = {}
        for i = 1, select("#", ...) do t[i] = tostring((select(i, ...))) end
        return table.concat(t, "\\t")
      end
      print = function(...) write(fmt(...) .. "\\n") end
      io.write = function(...)
        for i = 1, select("#", ...) do write(tostring((select(i, ...)))) end
      end
      io.stderr = { write = function(_, ...) for i = 1, select("#", ...) do ewrite(tostring((select(i, ...)))) end end }
      io.read = function(f)
        f = tostring(f or "l"):gsub("^%*", "")
        local line = read():await()
        if line == nil then return nil end
        if f == "n" then return tonumber(line) end
        if f == "L" then return line .. "\\n" end
        return line
      end
      io.lines = function() return function() return io.read("l") end end
      os.exit = function() error("os.exit called", 0) end
    `);
    await lua.doString(`
      local f, e = load(__dx_src, "@" .. __dx_name)
      if not f then error(e, 0) end
      f()
    `);
  } catch (ex) {
    ok = false;
    err(String(ex && ex.message || ex).replace(/^Error: /, "") + "\n");
  } finally {
    lua.global.close();
  }
  post("done", { ok, time: (performance.now() - t0) / 1000 });
}

/* ------------------------------------------------------------------ */
/* SQL (SQLite compiled to WebAssembly, in-memory database)            */
/* ------------------------------------------------------------------ */
function renderTable(cols, rows) {
  const show = (v) => (v === null ? "NULL" : typeof v === "object" ? `<blob ${v.length} bytes>` : String(v));
  const cells = rows.map((r) => r.map(show));
  const w = cols.map((c, i) => Math.min(60, Math.max(c.length, ...cells.map((r) => r[i].length))));
  const fit = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const numeric = cols.map((_, i) => rows.length && rows.every((r) => r[i] === null || typeof r[i] === "number" || typeof r[i] === "bigint"));
  const pad = (s, n, right) => (right ? fit(s, n).padStart(n) : fit(s, n).padEnd(n));
  const line = (l, mid, r) => l + w.map((n) => "─".repeat(n + 2)).join(mid) + r;
  const row = (r) => "│ " + r.map((s, i) => pad(s, w[i], numeric[i])).join(" │ ") + " │";
  return [line("┌", "┬", "┐"), row(cols), line("├", "┼", "┤"), ...cells.map(row), line("└", "┴", "┘")].join("\n");
}

async function runSql(m) {
  const base = m.libs.sqlite;
  const { default: init } = await import(base + "sqlite3.mjs");
  const sqlite3 = await init({ print: () => {}, printErr: () => {}, locateFile: (f) => base + f });
  const db = new sqlite3.oo1.DB(":memory:", "c");
  const t0 = performance.now();
  let ok = true;
  try {
    const lines = m.files[m.entry].split("\n");
    let buf = "", startLine = 1, count = 0;
    const execOne = (sql, line) => {
      if (!sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, "").trim()) return;
      count++;
      const cols = [], rows = [];
      try {
        db.exec({ sql, rowMode: "array", resultRows: rows, columnNames: cols });
      } catch (ex) {
        throw new Error(`Error in statement starting at line ${line}: ${ex.message}`);
      }
      if (cols.length) {
        out(renderTable(cols, rows) + "\n" + `(${rows.length} row${rows.length === 1 ? "" : "s"})\n\n`);
      } else {
        const n = db.selectValue("select changes()");
        const head = sql.replace(/--[^\n]*\n?|\/\*[\s\S]*?\*\//g, "").trim().split(/\s+/).slice(0, 2).join(" ").toUpperCase();
        out(/^(INSERT|UPDATE|DELETE|REPLACE)/.test(head) ? `${head.split(" ")[0]} OK, ${n} row${n === 1 ? "" : "s"} affected\n` : `${head.replace(/;$/, "")} OK\n`);
      }
    };
    lines.forEach((ln, i) => {
      if (!buf.trim()) startLine = i + 1;
      buf += (buf ? "\n" : "") + ln;
      if (sqlite3.capi.sqlite3_complete(buf) && buf.trim()) { execOne(buf, startLine); buf = ""; }
    });
    if (buf.trim()) execOne(buf, startLine);
    if (!count) out("Nothing to run: the file has no SQL statements.\n");
  } catch (ex) {
    ok = false;
    err(ex.message + "\n");
  } finally {
    db.close();
  }
  post("done", { ok, time: (performance.now() - t0) / 1000 });
}

async function run(m) {
  if (m.lang === "javascript" || m.lang === "typescript") return runJs(m);
  if (m.lang === "lua") return runLua(m);
  if (m.lang === "sql") return runSql(m);
  throw new Error("Unsupported language: " + m.lang);
}
