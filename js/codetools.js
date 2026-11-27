// Everyday code tools: a live Regex Tester, JSON to types (TypeScript, Python, Go, Rust, JSON Schema),
// a finder for code and files nothing uses, Align Selection, and hover info for timestamps and numbers.
import { buildGraph } from "./projmap.js";

/* =====================================================================
 * Regex tester (pure part, exported for tests)
 * ===================================================================== */
/** Runs a pattern over text. Returns {error} or {matches:[{index,text,groups,named}], replaced}. */
export function runRegex(pattern, flags, text, replacement = "", max = 500) {
  if (!pattern) return { matches: [], replaced: null };
  const global = flags.includes("g");
  let re;
  try { re = new RegExp(pattern, global ? flags : flags + "g"); } catch (e) { return { error: e.message.replace(/^Invalid regular expression: /, "") }; }
  const matches = [];
  for (const m of text.matchAll(re)) {
    matches.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups || null });
    if (!global || matches.length >= max) break;
  }
  let replaced = null;
  if (replacement !== "") { try { replaced = text.replace(new RegExp(pattern, flags), replacement); } catch (e) { replaced = null; } }
  return { matches, replaced, capped: matches.length >= max };
}

/* =====================================================================
 * JSON to types (pure part, exported for tests)
 * ===================================================================== */
const prim = (t) => ({ t });
const classOf = (x) => (x.t === "object" || x.t === "array" ? x.t : "prim:" + x.t);
function unionOf(types) {
  const out = [];
  for (const x of types.flatMap((y) => (y.t === "union" ? y.of : [y]))) {
    if (x.t === "any") return prim("any");
    const same = out.find((y) => classOf(y) === classOf(x) || (["int", "float"].includes(y.t) && ["int", "float"].includes(x.t)));
    if (!same) { out.push(x); continue; }
    if (x.t === "object") {
      for (const [k, f] of x.fields) {
        const had = same.fields.get(k);
        same.fields.set(k, had ? { type: unionOf([had.type, f.type]), optional: had.optional || f.optional } : { type: f.type, optional: true });
      }
      for (const k of same.fields.keys()) if (!x.fields.has(k)) same.fields.get(k).optional = true;
    } else if (x.t === "array") same.of = same.of && x.of ? unionOf([same.of, x.of]) : same.of || x.of;
    else if (x.t === "float") same.t = "float";
  }
  return out.length === 1 ? out[0] : { t: "union", of: out };
}
export function inferType(v) {
  if (v === null) return prim("null");
  if (Array.isArray(v)) return { t: "array", of: v.length ? unionOf(v.map(inferType)) : null };
  switch (typeof v) {
    case "string": return prim("string");
    case "boolean": return prim("bool");
    case "number": return prim(Number.isInteger(v) ? "int" : "float");
    case "object": return { t: "object", fields: new Map(Object.entries(v).map(([k, x]) => [k, { type: inferType(x), optional: false }])) };
    default: return prim("any");
  }
}
const words = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean);
const pascal = (s) => { const w = words(s).map((x) => x[0].toUpperCase() + x.slice(1)).join(""); return !w ? "Item" : /^\d/.test(w) ? "_" + w : w; };
const snake = (s) => words(s).map((x) => x.toLowerCase()).join("_");
const singular = (s) => (/ies$/i.test(s) ? s.replace(/ies$/i, "y") : /[^s]s$/i.test(s) ? s.slice(0, -1) : s);
const PY_KW = new Set("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case type".split(" "));
const RS_KW = new Set("as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while async await dyn abstract become box do final macro override priv typeof unsized virtual yield try".split(" "));

/** Replaces each object with a named reference and collects the declarations (children before parents). */
function lower(type, hint, ctx) {
  if (type.t === "object") {
    let name = pascal(hint), n = 2;
    while (ctx.used.has(name)) name = pascal(hint) + n++;
    ctx.used.add(name);
    const fields = [...type.fields].map(([key, f]) => ({ key, optional: f.optional, type: lower(f.type, key, ctx) }));
    ctx.decls.push({ name, fields });
    return { t: "ref", name };
  }
  if (type.t === "array") return { t: "array", of: type.of ? lower(type.of, singular(hint), ctx) : prim("any") };
  if (type.t === "union") return { t: "union", of: type.of.map((x) => lower(x, hint, ctx)) };
  return type;
}

const EMIT = {
  ts: {
    label: "TypeScript interfaces", ext: "ts", file: "types.ts",
    run({ decls, root, rootName }) {
      const ty = (t) => ({ string: "string", int: "number", float: "number", bool: "boolean", null: "null", any: "unknown" }[t.t] || (t.t === "ref" ? t.name : t.t === "array" ? (t.of.t === "union" ? `(${ty(t.of)})` : ty(t.of)) + "[]" : t.of.map(ty).join(" | ")));
      const key = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
      const out = decls.map((d) => `export interface ${d.name} {\n${d.fields.map((f) => `  ${key(f.key)}${f.optional ? "?" : ""}: ${ty(f.type)};`).join("\n")}\n}`);
      if (root.t !== "ref") out.push(`export type ${rootName} = ${ty(root)};`);
      return out.join("\n\n") + "\n";
    },
  },
  py: {
    label: "Python dataclasses", ext: "py", file: "models.py",
    run({ decls, root, rootName }) { return pythonOut({ decls, root, rootName }, false); },
  },
  typeddict: {
    label: "Python TypedDict", ext: "py", file: "models.py",
    run({ decls, root, rootName }) { return pythonOut({ decls, root, rootName }, true); },
  },
  go: {
    label: "Go structs", ext: "go", file: "types.go",
    run({ decls, root, rootName }) {
      const ty = (t) => ({ string: "string", int: "int64", float: "float64", bool: "bool" }[t.t] || (t.t === "ref" ? t.name : t.t === "array" ? "[]" + ty(t.of) : "interface{}"));
      const out = decls.map((d) => {
        const seen = new Set();
        const rows = d.fields.map((f) => {
          let n = pascal(f.key), i = 2; while (seen.has(n)) n = pascal(f.key) + i++; seen.add(n);
          const t = ty(f.type), ptr = f.optional && !/^(\[\]|interface)/.test(t) ? "*" + t : t;
          return [n, ptr, `\`json:"${f.key}${f.optional ? ",omitempty" : ""}"\``];
        });
        const w = [Math.max(...rows.map((r) => r[0].length)), Math.max(...rows.map((r) => r[1].length))];
        return `type ${d.name} struct {\n${rows.map((r) => `\t${r[0].padEnd(w[0])} ${r[1].padEnd(w[1])} ${r[2]}`).join("\n")}\n}`;
      });
      if (root.t !== "ref") out.push(`type ${rootName} ${ty(root)}`);
      return "package main\n\n" + out.join("\n\n") + "\n";
    },
  },
  rust: {
    label: "Rust structs (serde)", ext: "rs", file: "types.rs",
    run({ decls, root, rootName }) {
      const ty = (t) => ({ string: "String", int: "i64", float: "f64", bool: "bool" }[t.t] || (t.t === "ref" ? t.name : t.t === "array" ? `Vec<${ty(t.of)}>` : "serde_json::Value"));
      const out = decls.map((d) => {
        const seen = new Set();
        const rows = d.fields.map((f) => {
          let n = snake(f.key) || "field"; if (/^\d/.test(n)) n = "_" + n; if (RS_KW.has(n)) n += "_"; const base = n; let i = 2; while (seen.has(n)) n = base + "_" + i++; seen.add(n);
          const t = f.optional ? `Option<${ty(f.type)}>` : ty(f.type);
          return `${n !== f.key ? `    #[serde(rename = ${JSON.stringify(f.key)})]\n` : ""}    pub ${n}: ${t},`;
        });
        return `#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct ${d.name} {\n${rows.join("\n")}\n}`;
      });
      if (root.t !== "ref") out.push(`pub type ${rootName} = ${ty(root)};`);
      return "use serde::{Deserialize, Serialize};\n\n" + out.join("\n\n") + "\n";
    },
  },
};
function pythonOut({ decls, root, rootName }, typed) {
  const used = new Set();
  const ty = (t) => {
    if (t.t === "ref") return t.name;
    if (t.t === "array") return `list[${ty(t.of)}]`;
    if (t.t === "union") {
      const rest = t.of.filter((x) => x.t !== "null");
      if (rest.length !== t.of.length) { used.add("Optional"); return rest.length === 1 ? `Optional[${ty(rest[0])}]` : `Optional[Union[${rest.map(ty).join(", ")}]]`; }
      used.add("Union"); return `Union[${rest.map(ty).join(", ")}]`;
    }
    if (t.t === "any") { used.add("Any"); return "Any"; }
    return { string: "str", int: "int", float: "float", bool: "bool", null: "None" }[t.t];
  };
  const ident = (k) => /^[A-Za-z_]\w*$/.test(k) && !PY_KW.has(k);
  const out = decls.map((d) => {
    if (typed) {
      used.add("TypedDict");
      const fields = d.fields.map((f) => { let t = ty(f.type); if (f.optional) { used.add("NotRequired"); t = `NotRequired[${t}]`; } return [f.key, t]; });
      if (!d.fields.every((f) => ident(f.key))) return `${d.name} = TypedDict(${JSON.stringify(d.name)}, {\n${fields.map(([k, t]) => `    ${JSON.stringify(k)}: ${t},`).join("\n")}\n})`;
      return `class ${d.name}(TypedDict):\n${fields.map(([k, t]) => `    ${k}: ${t}`).join("\n") || "    pass"}`;
    }
    used.add("dataclass");
    const seen = new Set();
    const rows = d.fields.map((f) => {
      let n = snake(f.key) || "field"; if (/^\d/.test(n)) n = "_" + n; if (PY_KW.has(n)) n += "_"; const base = n; let i = 2; while (seen.has(n)) n = base + "_" + i++; seen.add(n);
      let t = ty(f.type); if (f.optional && !t.startsWith("Optional[")) { used.add("Optional"); t = `Optional[${t}]`; }
      return { line: `    ${n}: ${t}${f.optional ? " = None" : ""}`, optional: f.optional, note: n !== f.key ? `  # JSON key ${JSON.stringify(f.key)}` : "" };
    });
    rows.sort((a, b) => a.optional - b.optional); // fields with defaults must come last
    return `@dataclass\nclass ${d.name}:\n${rows.map((r) => r.line + r.note).join("\n") || "    pass"}`;
  });
  if (root.t !== "ref") out.push(`${rootName} = ${ty(root)}`);
  const typing = ["Any", "NotRequired", "Optional", "TypedDict", "Union"].filter((x) => used.has(x));
  const head = [used.has("dataclass") ? "from dataclasses import dataclass" : "", typing.length ? `from typing import ${typing.join(", ")}` : ""].filter(Boolean).join("\n");
  return (head ? head + "\n\n\n" : "") + out.join("\n\n\n") + "\n";
}
function schemaOf(t) {
  switch (t.t) {
    case "string": return { type: "string" };
    case "int": return { type: "integer" };
    case "float": return { type: "number" };
    case "bool": return { type: "boolean" };
    case "null": return { type: "null" };
    case "array": return t.of ? { type: "array", items: schemaOf(t.of) } : { type: "array" };
    case "object": return { type: "object", properties: Object.fromEntries([...t.fields].map(([k, f]) => [k, schemaOf(f.type)])), required: [...t.fields].filter(([, f]) => !f.optional).map(([k]) => k) };
    case "union": return { anyOf: t.of.map(schemaOf) };
    default: return {};
  }
}
export const TYPE_TARGETS = [...Object.entries(EMIT).map(([id, e]) => ({ id, label: e.label, file: e.file })), { id: "schema", label: "JSON Schema", file: "schema.json" }];
/** JSON value to source text in one of the TYPE_TARGETS. */
export function jsonToTypes(value, target, rootName = "Root") {
  const type = inferType(value);
  if (target === "schema") return JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", title: rootName, ...schemaOf(type) }, null, 2) + "\n";
  const ctx = { used: new Set(), decls: [] };
  const rootHint = type.t === "array" && type.of?.t === "object" ? rootName : rootName;
  const root = lower(type, type.t === "array" ? singular(rootHint) || rootHint : rootHint, ctx);
  return EMIT[target].run({ decls: ctx.decls, root, rootName: pascal(rootName) });
}

/* =====================================================================
 * Unused code and unreferenced files (pure part, exported for tests)
 * ===================================================================== */
const CODE_EXT = /\.(py|js|mjs|cjs|jsx|ts|tsx)$/i;
const DEF_PY = [[/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/, "function"], [/^\s*class\s+([A-Za-z_]\w*)/, "class"], [/^([A-Za-z_]\w*)\s*(?::[^=]+)?=(?!=)/, "variable"]];
const DEF_JS = [[/^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)/, "function"], [/^\s*(?:export\s+(?:default\s+)?)?class\s+([A-Za-z_$][\w$]*)/, "class"], [/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=(?!=)/, "variable"]];
/** Names defined once and never mentioned again anywhere in the project, and files nothing links to. */
export function findUnused(files, assetPaths = []) {
  const counts = new Map();
  for (const text of Object.values(files)) for (const m of text.matchAll(/[A-Za-z_$][\w$]*/g)) counts.set(m[0], (counts.get(m[0]) || 0) + 1);
  const defs = [];
  for (const [path, text] of Object.entries(files)) {
    if (!CODE_EXT.test(path)) continue;
    const py = path.endsWith(".py"), table = py ? DEF_PY : DEF_JS, isTest = /(^|\/)(tests?\/|test_[^/]*$|[^/]*_test\.py$|[^/]*\.(test|spec)\.[jt]sx?$|conftest\.py$)/.test(path);
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      for (const [re, kind] of table) {
        const m = re.exec(line); if (!m) continue;
        const name = m[1];
        if (counts.get(name) !== 1 || name.length < 2 || /^__/.test(name) || name === "main" || /^_+$/.test(name)) break;
        if (isTest && /^(test|Test|setUp|tearDown)/.test(name)) break;
        if (py && /^\s*@/.test(lines[i - 1] || "")) break; // decorated (a route, a fixture, a command): something else calls it
        defs.push({ path, line: i + 1, name, kind, exported: /^\s*export\b/.test(line) });
        break;
      }
    });
  }
  const { nodes, edges } = buildGraph(files, assetPaths);
  const linked = new Set(edges.map((e) => e.to));
  const keep = /(^|\/)(index\.html?|main\.[a-z]+|app\.[a-z]+|__init__\.py|__main__\.py|conftest\.py|setup\.py|manage\.py|[^/]*\.config\.[a-z]+|favicon\.[a-z]+)$|\.(md|txt|json|ya?ml|toml|cfg|ini|lock|html?)$|^\.|\/\.|(^|\/)(LICENSE|README|Makefile|Dockerfile)|(^|\/)(tests?\/|test_[^/]*$|[^/]*_test\.py$|[^/]*\.(test|spec)\.[jt]sx?$)/i;
  const unreferenced = nodes.filter((n) => !linked.has(n.id) && !keep.test(n.id) && !(n.id.endsWith(".py") && /__name__\s*==\s*["']__main__["']/.test(files[n.id] || ""))).map((n) => n.id);
  return { defs, unreferenced };
}

/* =====================================================================
 * Numbers and timestamps (pure part, exported for tests)
 * ===================================================================== */
const NUM_RE = /0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*/g;
/** The integer written around column `col` (1-based) of a line, or null. */
export function numberAt(line, col) {
  NUM_RE.lastIndex = 0;
  for (let m; (m = NUM_RE.exec(line)); ) {
    const start = m.index, end = start + m[0].length;
    if (col - 1 < start || col - 1 > end) continue;
    const before = line[start - 1] || "", after = line[end] || "";
    if (/[\w$.]/.test(before) || /[\w$]/.test(after) || (after === "." && /\d/.test(line[end + 1] || ""))) return null;
    const raw = m[0].replace(/_/g, ""), kind = /^0[xX]/.test(raw) ? "hex" : /^0[bB]/.test(raw) ? "bin" : /^0[oO]/.test(raw) ? "oct" : "dec";
    let value; try { value = BigInt(kind === "dec" ? raw : raw); } catch (_) { return null; }
    return { start, end, raw: m[0], kind, value };
  }
  return null;
}
const rel = (ms) => {
  const s = Math.round((Date.now() - ms) / 1000), a = Math.abs(s), fut = s < 0;
  const [n, u] = a < 60 ? [a, "second"] : a < 3600 ? [Math.round(a / 60), "minute"] : a < 86400 ? [Math.round(a / 3600), "hour"] : a < 86400 * 60 ? [Math.round(a / 86400), "day"] : a < 86400 * 730 ? [Math.round(a / 2629800), "month"] : [Math.round(a / 31557600), "year"];
  return `${n} ${u}${n === 1 ? "" : "s"} ${fut ? "from now" : "ago"}`;
};
const size = (n) => { const u = ["bytes", "KiB", "MiB", "GiB", "TiB"]; let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return `${i ? n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, "") : n} ${u[i]}`; };
/** Markdown lines describing a number, or null when there is nothing worth saying. */
export function describeNumber(num) {
  const { value, kind } = num;
  if (value < 0n) return null;
  const out = [];
  const n = Number(value);
  const secs = kind === "dec" && num.raw.replace(/_/g, "").length === 10 && n >= 1e9 && n < 1e10, ms = kind === "dec" && num.raw.replace(/_/g, "").length === 13 && n >= 1e12 && n < 1e13;
  if (secs || ms) {
    const t = secs ? n * 1000 : n, d = new Date(t);
    out.push(`**Unix timestamp** (${secs ? "seconds" : "milliseconds"})`, `UTC: \`${d.toISOString().replace("T", " ").replace(/\.000Z$/, "Z").replace("Z", " UTC")}\``, `Local: \`${d.toLocaleString([], { dateStyle: "full", timeStyle: "medium" })}\``, rel(t));
  }
  if (kind !== "dec" || value >= 256n) {
    const bits = value.toString(2);
    out.push([`**Decimal** \`${value.toLocaleString("en-US")}\``, `**Hex** \`0x${value.toString(16).toUpperCase()}\``, `**Octal** \`0o${value.toString(8)}\``, `**Binary** \`0b${bits.length > 64 ? bits.slice(0, 61) + "…" : bits}\``].join("  \n"));
    if (!(secs || ms) && value >= 1024n && value < 2n ** 50n) out.push(`${size(n)} as a size in bytes`);
  }
  return out.length ? out : null;
}

/* =====================================================================
 * The tools in the editor
 * ===================================================================== */
export function createCodeTools(A) {
  const { h, toast } = A;
  const ed = () => A.editor;
  const copy = async (text, btn) => { try { await navigator.clipboard.writeText(text); } catch (_) { const t = h("textarea", { value: text }); document.body.append(t); t.select(); document.execCommand("copy"); t.remove(); } if (btn) { const o = btn.textContent; btn.textContent = "Copied"; setTimeout(() => (btn.textContent = o), 1200); } };
  const selectedText = () => { const e = ed(); return e?.getModel() && !e.getSelection().isEmpty() ? e.getModel().getValueInRange(e.getSelection()) : ""; };

  /* ---------- Regex tester ---------- */
  const FLAGS = [["g", "global: every match, not just the first"], ["i", "ignore case"], ["m", "multiline: ^ and $ match at each line"], ["s", "dotAll: . matches a new line too"], ["u", "unicode"]];
  function showRegexTester() {
    const sel = selectedText(), fileText = A.currentPath() ? A.textOf(A.currentPath()) || "" : "";
    const state = A.LS?.get?.("regexTester", null) || {};
    const pattern = h("input", { class: "rx-pattern", placeholder: "Pattern, for example (\\w+)@(\\w+)\\.com", spellcheck: "false", value: state.pattern || "" });
    const flagBoxes = FLAGS.map(([f, tip]) => { const cb = h("input", { type: "checkbox", checked: (state.flags ?? "g").includes(f) }); return { f, cb, el: h("label", { class: "rx-flag", title: tip }, cb, f) }; });
    const text = h("textarea", { class: "rx-text", spellcheck: "false", placeholder: "Text to test" }); text.value = sel || fileText.slice(0, 20000);
    const repl = h("input", { class: "rx-repl", placeholder: "Replace with (optional, $1 and $<name> work)", spellcheck: "false", value: state.repl || "" });
    const status = h("div", { class: "rx-status muted small" }), view = h("pre", { class: "rx-view" }), groups = h("div", { class: "rx-groups" }), result = h("pre", { class: "rx-view rx-result hidden" });
    const flags = () => flagBoxes.filter((x) => x.cb.checked).map((x) => x.f).join("");
    const update = () => {
      const t = text.value, r = runRegex(pattern.value, flags(), t, repl.value);
      view.replaceChildren(); groups.replaceChildren(); result.classList.add("hidden");
      pattern.classList.toggle("bad", !!r.error);
      if (r.error) { status.textContent = r.error; status.classList.add("bad"); view.textContent = t; return; }
      status.classList.remove("bad");
      let at = 0;
      r.matches.forEach((m, i) => {
        if (m.index < at) return;
        if (m.index > at) view.append(t.slice(at, m.index));
        view.append(h("mark", { class: (i % 2 ? "odd" : "") + (m.text ? "" : " empty") }, m.text));
        at = m.index + m.text.length;
      });
      view.append(t.slice(at));
      status.textContent = !pattern.value ? "Type a pattern to see its matches highlighted below." : r.matches.length ? `${r.matches.length}${r.capped ? "+" : ""} match${r.matches.length === 1 ? "" : "es"}` : "No matches";
      for (const [i, m] of r.matches.slice(0, 60).entries()) {
        const named = m.named ? Object.entries(m.named) : [];
        groups.append(h("div", { class: "rx-row" }, h("span", { class: "rx-n" }, `${i + 1}`), h("code", {}, JSON.stringify(m.text).slice(0, 80)), h("span", { class: "muted small" }, `at ${m.index}`),
          ...m.groups.map((g, j) => h("span", { class: "rx-group", title: `Group ${j + 1}` }, `$${j + 1} = ${g === undefined ? "undefined" : JSON.stringify(g).slice(0, 40)}`)),
          ...named.map(([k, v]) => h("span", { class: "rx-group", title: "Named group" }, `${k} = ${v === undefined ? "undefined" : JSON.stringify(v).slice(0, 40)}`))));
      }
      if (r.matches.length > 60) groups.append(h("div", { class: "muted small" }, `…and ${r.matches.length - 60} more`));
      if (r.replaced != null) { result.textContent = r.replaced; result.classList.remove("hidden"); }
      A.LS?.set?.("regexTester", { pattern: pattern.value, flags: flags(), repl: repl.value });
    };
    for (const el of [pattern, text, repl, ...flagBoxes.map((x) => x.cb)]) el.addEventListener("input", update);
    const literal = () => `/${pattern.value.replace(/\//g, "\\/")}/${flags()}`;
    A.openModal(h("div", { class: "modal rx-modal" },
      h("div", { class: "modal-head" }, "Regex tester"),
      h("div", { class: "modal-body" },
        h("div", { class: "rx-top" }, h("span", { class: "rx-slash" }, "/"), pattern, h("span", { class: "rx-slash" }, "/"), ...flagBoxes.map((x) => x.el)),
        status, h("div", { class: "rx-label muted small" }, "Text"), text,
        h("div", { class: "rx-label muted small" }, "Matches"), view, groups,
        repl, result),
      h("div", { class: "modal-foot" },
        h("button", { class: "btn", title: "Copy the pattern and flags as a JavaScript regular expression", onclick: (e) => copy(literal(), e.currentTarget) }, "Copy /pattern/"),
        h("button", { class: "btn", title: "Search the current file with this pattern", onclick: () => { const e = ed(); A.closeModal(); if (!e) return; e.focus(); e.trigger("rx", "actions.find", { searchString: pattern.value, isRegex: true, matchCase: !flags().includes("i") }); } }, "Find in editor"),
        h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))));
    update(); pattern.focus();
  }

  /* ---------- JSON to types ---------- */
  function showJsonToTypes() {
    let source = selectedText(); const path = A.currentPath();
    if (!source.trim() && path && /\.(json|jsonc|geojson)$/i.test(path)) source = A.textOf(path) || "";
    if (!source.trim()) return toast("Select some JSON, or open a .json file, and run this again", "info");
    let value; try { value = JSON.parse(source); } catch (e) { return toast("That is not valid JSON: " + e.message, "warn", 6000); }
    const target = h("select", { class: "ct-target" }, TYPE_TARGETS.map((t) => h("option", { value: t.id }, t.label)));
    const saved = A.LS?.get?.("jsonTypesTarget", "ts"); if (TYPE_TARGETS.some((t) => t.id === saved)) target.value = saved;
    const base = path && path.split("/").pop().replace(/\.[^.]+$/, "");
    const name = h("input", { class: "ct-name", value: pascal(base && !/^(data|test|sample|response)$/i.test(base) ? base : "Root"), title: "Name of the top type", spellcheck: "false" });
    const code = h("pre", { class: "ct-code" }); let out = "";
    const update = () => { out = jsonToTypes(value, target.value, name.value.trim() || "Root"); code.textContent = out; A.LS?.set?.("jsonTypesTarget", target.value); };
    target.onchange = update; name.oninput = update;
    const cur = () => TYPE_TARGETS.find((t) => t.id === target.value);
    const insert = h("button", { class: "btn", onclick: () => { const e = ed(); A.closeModal(); if (!e?.getModel() || e.getOption(A.monaco.editor.EditorOption.readOnly)) return toast("Open an editable file first", "info"); e.executeEdits("json-types", [{ range: e.getSelection(), text: out }]); e.focus(); } }, "Insert at cursor");
    A.openModal(h("div", { class: "modal ct-modal" },
      h("div", { class: "modal-head" }, "JSON to types"),
      h("div", { class: "modal-body" }, h("div", { class: "ct-bar" }, target, h("label", { class: "muted small" }, "Top type ", name)), code),
      h("div", { class: "modal-foot" },
        insert,
        h("button", { class: "btn", onclick: async () => { const t = cur(), dir = path?.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : ""; let p = dir + t.file, n = 2; while (A.currentFiles()[p] != null) p = `${dir}${t.file.replace(/(\.[^.]+)$/, `${n++}$1`)}`; A.closeModal(); await A.writeFiles({ [p]: out }); A.openFile(p); } }, "New file"),
        h("button", { class: "btn", onclick: (e) => copy(out, e.currentTarget) }, "Copy"),
        h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))));
    update();
  }

  /* ---------- Unused code ---------- */
  function showUnused() {
    const { defs, unreferenced } = findUnused(A.currentFiles(), Object.keys(A.assetFiles?.() || {}));
    const row = (path, line, main, tag) => h("button", { class: "uu-row", onclick: () => { A.closeModal(); A.openFile(path, line ? { line } : {}); } }, h("span", { class: "uu-name" }, main), tag ? h("span", { class: "uu-tag" }, tag) : null, h("span", { class: "muted small" }, line ? `${path}:${line}` : path));
    const byFile = new Map(); for (const d of defs) (byFile.get(d.path) || byFile.set(d.path, []).get(d.path)).push(d);
    A.openModal(h("div", { class: "modal uu-modal" },
      h("div", { class: "modal-head" }, "Unused code", h("span", { class: "muted small" }, `  ${defs.length} name${defs.length === 1 ? "" : "s"}, ${unreferenced.length} file${unreferenced.length === 1 ? "" : "s"}`)),
      h("div", { class: "modal-body" },
        !defs.length && !unreferenced.length ? h("p", { class: "muted" }, "Nothing found. Every function, class and variable is used somewhere, and every file is linked from another.") : null,
        defs.length ? h("div", { class: "uu-head" }, "Defined but never used anywhere else") : null,
        ...[...byFile].flatMap(([, list]) => list.map((d) => row(d.path, d.line, d.name, d.kind + (d.exported ? ", exported" : "")))),
        unreferenced.length ? h("div", { class: "uu-head" }, "Files nothing links to or imports") : null,
        ...unreferenced.map((p) => row(p, 0, p.split("/").pop(), "")),
        h("p", { class: "muted small uu-note" }, "This looks for names that appear only once in the whole project. It cannot see use from outside the project (an exported function another program calls) or names built from strings, so check before deleting.")),
      h("div", { class: "modal-foot" }, h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))));
  }

  /* ---------- Align selection ---------- */
  async function alignSelection() {
    const e = ed(), m = e?.getModel();
    if (!m || e.getOption(A.monaco.editor.EditorOption.readOnly)) return toast("Open an editable file first", "info");
    const token = await A.promptDialog({ title: "Align on", message: "The text to line up, for example = or : or =>. Every selected line (or the lines around the cursor that have it) is padded so it sits in one column.", value: A.LS?.get?.("alignToken", "=") || "=", okLabel: "Align" });
    if (!token) return;
    A.LS?.set?.("alignToken", token);
    const sel = e.getSelection();
    let from = sel.startLineNumber, to = sel.endLineNumber;
    if (from === to) { while (from > 1 && m.getLineContent(from - 1).includes(token)) from--; while (to < m.getLineCount() && m.getLineContent(to + 1).includes(token)) to++; }
    const rows = [];
    for (let l = from; l <= to; l++) { const line = m.getLineContent(l), i = line.indexOf(token); if (i > 0) rows.push({ l, left: line.slice(0, i).replace(/\s+$/, ""), rest: line.slice(i) }); }
    if (rows.length < 2) return toast(`Found "${token}" on ${rows.length} line${rows.length === 1 ? "" : "s"}, so there is nothing to line up`, "info");
    const w = Math.max(...rows.map((r) => r.left.length));
    e.pushUndoStop();
    e.executeEdits("align", rows.map((r) => ({ range: new A.monaco.Range(r.l, 1, r.l, m.getLineMaxColumn(r.l)), text: r.left.padEnd(w) + " " + r.rest })));
    e.pushUndoStop();
    e.focus();
    toast(`Aligned ${rows.length} lines on "${token}"`, "ok");
  }

  /* ---------- Hover: timestamps and numbers ---------- */
  let hoverOn = false;
  function onEditorReady() {
    if (hoverOn) return; hoverOn = true;
    A.monaco.languages.registerHoverProvider("*", {
      provideHover(model, pos) {
        if (A.settings.numberHover === false) return null;
        const line = model.getLineContent(pos.lineNumber);
        if (line.length > 2000) return null;
        const num = numberAt(line, pos.column);
        if (!num) return null;
        const md = describeNumber(num);
        if (!md) return null;
        return { range: new A.monaco.Range(pos.lineNumber, num.start + 1, pos.lineNumber, num.end + 1), contents: md.map((value) => ({ value })) };
      },
    });
  }

  const commands = [
    { id: "regex-tester", label: "Regex Tester…", cat: "Tools", run: showRegexTester },
    { id: "json-types", label: "Convert JSON to Types…", cat: "Tools", run: showJsonToTypes },
    { id: "find-unused", label: "Find Unused Code and Files", cat: "Tools", run: showUnused },
    { id: "align", label: "Align Selection on a Character…", cat: "Edit", run: alignSelection },
  ];
  return { commands, onEditorReady };
}
