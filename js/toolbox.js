// The Toolbox view: small developer tools that run entirely in the browser.

/* ---------- hashing: MD5 and CRC-32 (SHA comes from the browser) ---------- */
function md5(bytes) {
  const K = new Uint32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
  const len = bytes.length, padded = new Uint8Array(((len + 8) >> 6) * 64 + 64);
  padded.set(bytes); padded[len] = 0x80;
  const bits = len * 8, dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, bits >>> 0, true); dv.setUint32(padded.length - 4, Math.floor(bits / 2 ** 32), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);
  for (let off = 0; off < padded.length; off += 64) {
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(off + j * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      const s = S[(i >> 4) * 4 + (i % 4)];
      B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new DataView(new ArrayBuffer(16));
  [a0, b0, c0, d0].forEach((v, i) => out.setUint32(i * 4, v, true));
  return hex(new Uint8Array(out.buffer));
}
let crcTable;
function crc32(bytes) {
  crcTable ||= Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const utf8 = (s) => new TextEncoder().encode(s);
const fromUtf8 = (b) => new TextDecoder("utf-8", { fatal: true }).decode(b);

/* ---------- encodings ---------- */
const b64encode = (s, url) => { let bin = ""; for (const b of utf8(s)) bin += String.fromCharCode(b); const r = btoa(bin); return url ? r.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : r; };
const b64decode = (s) => {
  let t = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  const bin = atob(t);
  return fromUtf8(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};
const ENCODINGS = {
  base64: { name: "Base64", enc: (s) => b64encode(s), dec: b64decode },
  base64url: { name: "Base64 URL", enc: (s) => b64encode(s, true), dec: b64decode },
  url: { name: "URL component", enc: encodeURIComponent, dec: (s) => decodeURIComponent(s.replace(/\+/g, " ")) },
  html: { name: "HTML entities", enc: (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])).replace(/[^\x00-\x7e]/gu, (c) => `&#${c.codePointAt(0)};`),
    dec: (s) => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; } },
  hex: { name: "Hex (UTF-8 bytes)", enc: (s) => hex(utf8(s)), dec: (s) => { const t = s.replace(/[\s:]|0x/gi, ""); if (/[^0-9a-f]/i.test(t) || t.length % 2) throw new Error("Not hex"); return fromUtf8(Uint8Array.from(t.match(/../g) || [], (x) => parseInt(x, 16))); } },
  unicode: { name: "Unicode escapes (\\u)", enc: (s) => [...s].map((c) => { const cp = c.codePointAt(0); return cp < 128 && cp >= 32 ? c : cp > 0xffff ? `\\u{${cp.toString(16)}}` : "\\u" + cp.toString(16).padStart(4, "0"); }).join(""),
    dec: (s) => s.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi, (_, a, b, c) => String.fromCodePoint(parseInt(a || b || c, 16))) },
  binary: { name: "Binary (UTF-8 bytes)", enc: (s) => [...utf8(s)].map((b) => b.toString(2).padStart(8, "0")).join(" "), dec: (s) => { const t = s.trim().split(/\s+/).filter(Boolean); if (t.some((x) => /[^01]/.test(x))) throw new Error("Not binary"); return fromUtf8(Uint8Array.from(t, (x) => parseInt(x, 2))); } },
};

/* ---------- text case ---------- */
const words = (s) => s.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
export const CASES = {
  camel: ["camelCase", (s) => words(s).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join("")],
  pascal: ["PascalCase", (s) => words(s).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("")],
  snake: ["snake_case", (s) => words(s).map((w) => w.toLowerCase()).join("_")],
  constant: ["CONSTANT_CASE", (s) => words(s).map((w) => w.toUpperCase()).join("_")],
  kebab: ["kebab-case", (s) => words(s).map((w) => w.toLowerCase()).join("-")],
  title: ["Title Case", (s) => s.toLowerCase().replace(/(^|[\s\-_(])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())],
  sentence: ["Sentence case", (s) => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, a, b) => a + b.toUpperCase())],
  upper: ["UPPER CASE", (s) => s.toUpperCase()],
  lower: ["lower case", (s) => s.toLowerCase()],
};

const LOREM = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum".split(" ");
function lorem(paragraphs) {
  const sentence = () => { const n = 6 + Math.floor(Math.random() * 10); const w = Array.from({ length: n }, () => LOREM[Math.floor(Math.random() * LOREM.length)]); w[0] = w[0][0].toUpperCase() + w[0].slice(1); return w.join(" ") + "."; };
  return Array.from({ length: paragraphs }, (_, i) => (i === 0 ? "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " : "") + Array.from({ length: 4 + Math.floor(Math.random() * 3) }, sentence).join(" ")).join("\n\n");
}

/* ---------- JSON to TypeScript ---------- */
function jsonToTs(value, rootName = "Root") {
  const out = [], seen = new Map();
  const pascal = (s) => CASES.pascal[1](s) || "Item";
  const typeOf = (v, name) => {
    if (v === null) return "null";
    if (Array.isArray(v)) {
      if (!v.length) return "unknown[]";
      const types = [...new Set(v.map((x) => typeOf(x, name.replace(/s$/, "") || name)))];
      const t = types.length === 1 ? types[0] : `(${types.join(" | ")})`;
      return `${t}[]`;
    }
    if (typeof v === "object") return iface(v, pascal(name));
    return typeof v;
  };
  const iface = (obj, name) => {
    const body = Object.entries(obj).map(([k, v]) => `  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${typeOf(v, k)};`).join("\n");
    const key = body;
    if (seen.has(key)) return seen.get(key);
    let n = name, i = 2;
    while (out.some((o) => o.name === n)) n = name + i++;
    seen.set(key, n);
    out.push({ name: n, text: `export interface ${n} {\n${body}\n}` });
    return n;
  };
  const top = typeOf(value, rootName);
  if (!out.length || out.at(-1).name !== top) out.push({ name: rootName, text: `export type ${rootName} = ${top};` });
  return out.map((o) => o.text).join("\n\n");
}
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
function jsonError(text, e) {
  const m = /position (\d+)/.exec(e.message);
  if (!m) return e.message;
  const pos = +m[1], before = text.slice(0, pos), line = before.split("\n").length, col = pos - before.lastIndexOf("\n");
  return `${e.message.replace(/\s*\(line \d+ column \d+\)/, "").replace(/ in JSON at position \d+/, "")} (line ${line}, column ${col})`;
}

/* ---------- regex (in a worker, so a runaway pattern cannot freeze the page) ---------- */
const REGEX_WORKER = `onmessage = (e) => {
  const { pattern, flags, text, replace } = e.data;
  try {
    const re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
    const matches = [];
    let m;
    while ((m = re.exec(text)) && matches.length < 5000) {
      matches.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups || null });
      if (m[0] === "") re.lastIndex++;
      if (!flags.includes("g")) break;
    }
    const replaced = replace == null ? null : text.replace(new RegExp(pattern, flags), replace);
    postMessage({ matches, replaced });
  } catch (err) { postMessage({ error: err.message }); }
};`;
let regexWorker = null;
function runRegex(job) {
  return new Promise((resolve) => {
    regexWorker ||= new Worker(URL.createObjectURL(new Blob([REGEX_WORKER], { type: "text/javascript" })));
    const w = regexWorker;
    const timer = setTimeout(() => { w.terminate(); if (regexWorker === w) regexWorker = null; resolve({ error: "The pattern took too long (over 1 second) and was stopped. It may backtrack catastrophically." }); }, 1000);
    w.onmessage = (e) => { clearTimeout(timer); resolve(e.data); };
    w.postMessage(job);
  });
}

/* ---------- time ---------- */
function parseTime(s) {
  const t = s.trim();
  if (!t) return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    const n = +t;
    // seconds, milliseconds, microseconds or nanoseconds, guessed from the size
    const ms = Math.abs(n) < 1e11 ? n * 1000 : Math.abs(n) < 1e14 ? n : Math.abs(n) < 1e17 ? n / 1000 : n / 1e6;
    return new Date(ms);
  }
  const d = new Date(t);
  return isNaN(d) ? null : d;
}
function relative(d) {
  const diff = (d.getTime() - Date.now()) / 1000, a = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [u, s] of [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]]) if (a >= s) return rtf.format(Math.round(diff / s), u);
  return rtf.format(Math.round(diff), "second");
}

/* ---------- color ---------- */
let colorCtx;
function parseColor(s) {
  colorCtx ||= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  colorCtx.fillStyle = "#010203";
  colorCtx.fillStyle = s.trim();
  if (colorCtx.fillStyle === "#010203" && !/^#?010203$/i.test(s.trim())) return null;
  colorCtx.clearRect(0, 0, 1, 1);
  colorCtx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = colorCtx.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: Math.round((a / 255) * 100) / 100 };
}
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
const toHex = ({ r, g, b, a }) => "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("") + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, "0") : "");
const luminance = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (c1, c2) => { const [a, b] = [luminance(c1), luminance(c2)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
const mix = (c, w, t) => ({ r: Math.round(c.r + (w.r - c.r) * t), g: Math.round(c.g + (w.g - c.g) * t), b: Math.round(c.b + (w.b - c.b) * t), a: 1 });

/* ---------- ids ---------- */
function uuidv7() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let ts = Date.now();
  for (let i = 5; i >= 0; i--) { b[i] = ts % 256; ts = Math.floor(ts / 256); }
  b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
  const x = hex(b);
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
function password(len, sets) {
  const pools = { lower: "abcdefghijkmnopqrstuvwxyz", upper: "ABCDEFGHJKLMNPQRSTUVWXYZ", digits: "23456789", symbols: "!#$%&*+-=?@^_~" };
  const chosen = Object.keys(pools).filter((k) => sets[k]);
  if (!chosen.length) return "";
  const all = chosen.map((k) => pools[k]).join("");
  const pick = (s) => { const r = new Uint32Array(1); const lim = Math.floor(2 ** 32 / s.length) * s.length; do crypto.getRandomValues(r); while (r[0] >= lim); return s[r[0] % s.length]; };
  for (;;) {
    const p = Array.from({ length: len }, () => pick(all)).join("");
    if (len < chosen.length || chosen.every((k) => [...p].some((c) => pools[k].includes(c)))) return p;
  }
}

/** Create the Toolbox UI inside `root`. */
export function createToolbox(root, api) {
  const { h, icon, toast, insertText, showDiff, LS } = api;
  const copy = (text) => { navigator.clipboard?.writeText(text).then(() => toast("Copied", "ok", 1200), () => toast("Could not copy", "error")); };
  const area = ({ value, ...attrs } = {}) => { const el = h("textarea", { class: "tb-area", spellcheck: "false", rows: 5, ...attrs }); if (value != null) el.value = value; return el; };
  const input = (attrs = {}) => h("input", { class: "tb-input", spellcheck: "false", ...attrs });
  const label = (text, ...kids) => h("label", { class: "tb-field" }, h("span", { class: "tb-label" }, text), ...kids);
  const btn = (text, onclick, cls = "") => h("button", { class: "btn sm " + cls, onclick }, text);
  const actions = (getText) => [
    h("button", { class: "btn icon sm", title: "Copy", onclick: () => { const t = getText(); if (t) copy(t); } }, icon("copy")),
    h("button", { class: "btn icon sm", title: "Insert at the cursor in the editor", onclick: () => { const t = getText(); if (t) insertText(t); } }, icon("insert")),
  ];
  /** A labelled read-only value with Copy and Insert. */
  const outRow = (name) => {
    const val = h("code", { class: "tb-val" });
    const row = h("div", { class: "tb-out" }, h("span", { class: "tb-label" }, name), val, h("span", { class: "tb-acts" }, ...actions(() => val.textContent)));
    row.set = (v) => { val.textContent = v ?? ""; row.classList.toggle("empty", !v); };
    return row;
  };
  const errorLine = () => { const el = h("div", { class: "tb-error hidden" }); el.set = (msg) => { el.textContent = msg || ""; el.classList.toggle("hidden", !msg); }; return el; };
  const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const TOOLS = [
    {
      id: "regex", name: "Regex tester", desc: "Test a regular expression: matches, groups and replace.",
      render() {
        const pat = input({ placeholder: "Pattern, for example (\\w+)@(\\w+)\\.com", value: "(\\w+)@(\\w+)\\.com" });
        const flags = input({ value: "gi", class: "tb-input tb-flags", title: "Flags: g global, i ignore case, m multiline, s dot matches newline, u unicode, y sticky, d indices" });
        const text = area({ rows: 6, value: "Write to ada@example.com or grace@navy.com.\nNot an address: hello@world" });
        const rep = input({ placeholder: "Replace with (optional), for example $1 at $2", value: "" });
        const err = errorLine();
        const view = h("pre", { class: "tb-regex-view" });
        const list = h("div", { class: "tb-matches" });
        const summary = h("div", { class: "tb-summary muted small" });
        const replaced = outRow("Result");
        const run = debounce(async () => {
          if (!/^[dgimsuyv]*$/.test(flags.value) || new Set(flags.value).size !== flags.value.length) { err.set("Flags can be any of d g i m s u v y, each once."); return; }
          if (!pat.value) { err.set(""); view.textContent = text.value; list.textContent = ""; summary.textContent = ""; replaced.set(""); return; }
          const r = await runRegex({ pattern: pat.value, flags: flags.value, text: text.value, replace: rep.value ? rep.value : null });
          if (r.error) { err.set(r.error); return; }
          err.set("");
          const t = text.value;
          view.textContent = "";
          let last = 0;
          for (const m of r.matches) {
            if (m.index < last) continue;
            view.append(t.slice(last, m.index), h("mark", {}, m.text || "​"));
            last = m.index + m.text.length;
          }
          view.append(t.slice(last));
          summary.textContent = r.matches.length ? `${r.matches.length} match${r.matches.length === 1 ? "" : "es"}` : "No matches";
          list.replaceChildren(...r.matches.slice(0, 200).map((m, i) => h("div", { class: "tb-match" },
            h("span", { class: "tb-mi" }, i + 1), h("code", {}, m.text === "" ? "(empty)" : m.text), h("span", { class: "muted small" }, `at ${m.index}`),
            m.groups.length ? h("div", { class: "tb-groups" }, m.groups.map((g, k) => h("span", {}, h("b", {}, `$${k + 1}`), g ?? "undefined"))) : null,
            m.named ? h("div", { class: "tb-groups" }, Object.entries(m.named).map(([k, g]) => h("span", {}, h("b", {}, k), g ?? "undefined"))) : null)));
          replaced.set(r.replaced);
          replaced.classList.toggle("hidden", r.replaced == null);
        });
        [pat, flags, text, rep].forEach((el) => el.addEventListener("input", run));
        run();
        return [h("div", { class: "tb-row" }, label("Pattern", pat), label("Flags", flags)), err, label("Test text", text), summary, view, list, label("Replace", rep), replaced,
          h("div", { class: "tb-help muted small" }, "Uses JavaScript's regex engine, like Python's re for most patterns. Each run stops after one second, so a pattern that never finishes cannot freeze the page.")];
      },
    },
    {
      id: "json", name: "JSON", desc: "Format, minify, validate, sort keys, or turn it into TypeScript types.",
      render() {
        const src = area({ rows: 8, placeholder: '{"name": "Dexna", "tags": ["editor", "browser"], "stars": 5}', value: '{"name":"Dexna","version":2,"tags":["editor","browser"],"author":{"name":"Ada","admin":true}}' });
        const err = errorLine();
        const out = area({ rows: 8, readonly: true, class: "tb-area tb-result" });
        const status = h("div", { class: "muted small tb-summary" });
        const doIt = (fn) => { try { const v = JSON.parse(src.value); err.set(""); out.value = fn(v); status.textContent = "Valid JSON"; } catch (e) { err.set(jsonError(src.value, e)); status.textContent = ""; } };
        const validate = debounce(() => { if (!src.value.trim()) { err.set(""); status.textContent = ""; return; } try { const v = JSON.parse(src.value); err.set(""); status.textContent = `Valid JSON: ${Array.isArray(v) ? `array of ${v.length}` : v && typeof v === "object" ? `object with ${Object.keys(v).length} key${Object.keys(v).length === 1 ? "" : "s"}` : typeof v}`; } catch (e) { err.set(jsonError(src.value, e)); status.textContent = ""; } }, 250);
        src.addEventListener("input", validate);
        validate();
        return [label("JSON", src), err, status,
          h("div", { class: "tb-btns" },
            btn("Format", () => doIt((v) => JSON.stringify(v, null, 2)), "primary"), btn("Minify", () => doIt((v) => JSON.stringify(v))),
            btn("Sort keys", () => doIt((v) => JSON.stringify(sortKeys(v), null, 2))), btn("TypeScript types", () => doIt((v) => jsonToTs(v))),
            btn("As a string", () => doIt((v) => JSON.stringify(JSON.stringify(v))))),
          h("div", { class: "tb-labelrow" }, h("span", { class: "tb-label" }, "Result"), h("span", { class: "tb-acts" }, ...actions(() => out.value))), out];
      },
    },
    {
      id: "encode", name: "Encode / decode", desc: "Base64, URL, HTML entities, hex, binary and Unicode escapes.",
      render() {
        const mode = h("select", { class: "tb-input" }, Object.entries(ENCODINGS).map(([k, e]) => h("option", { value: k }, e.name)));
        const plain = area({ rows: 5, value: "Hello, Dexna! ✓" });
        const coded = area({ rows: 5 });
        const err = errorLine();
        const encode = () => { try { coded.value = ENCODINGS[mode.value].enc(plain.value); err.set(""); } catch (e) { err.set(e.message); } };
        const decode = () => { try { plain.value = ENCODINGS[mode.value].dec(coded.value); err.set(""); } catch (e) { err.set(`That is not valid ${ENCODINGS[mode.value].name}.`); } };
        plain.addEventListener("input", encode); coded.addEventListener("input", decode); mode.addEventListener("change", encode);
        encode();
        return [label("Encoding", mode),
          h("div", { class: "tb-labelrow" }, h("span", { class: "tb-label" }, "Text"), h("span", { class: "tb-acts" }, ...actions(() => plain.value))), plain,
          h("div", { class: "tb-swap muted small" }, "Type in either box; the other updates."),
          h("div", { class: "tb-labelrow" }, h("span", { class: "tb-label" }, "Encoded"), h("span", { class: "tb-acts" }, ...actions(() => coded.value))), coded, err];
      },
    },
    {
      id: "hash", name: "Hash", desc: "MD5, SHA-1, SHA-256, SHA-384, SHA-512 and CRC-32 of any text.",
      render() {
        const src = area({ rows: 4, value: "hello world" });
        const upper = h("input", { type: "checkbox" });
        const rows = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512", "CRC-32"].map((n) => [n, outRow(n)]);
        const run = debounce(async () => {
          const b = utf8(src.value);
          const set = (n, v) => rows.find((r) => r[0] === n)[1].set(upper.checked ? v.toUpperCase() : v);
          set("MD5", md5(b)); set("CRC-32", crc32(b));
          for (const n of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) set(n, hex(new Uint8Array(await crypto.subtle.digest(n, b))));
        });
        src.addEventListener("input", run); upper.addEventListener("change", run);
        run();
        return [label("Text (hashed as UTF-8)", src), h("label", { class: "check small" }, upper, " Uppercase"), ...rows.map((r) => r[1]),
          h("div", { class: "tb-help muted small" }, "MD5 and SHA-1 are fine for checksums but are broken for security. Use SHA-256 or better for anything that matters.")];
      },
    },
    {
      id: "ids", name: "UUIDs and passwords", desc: "Random UUIDs (v4 and time-ordered v7), passwords and numbers.",
      render() {
        const kind = h("select", { class: "tb-input" }, h("option", { value: "v4" }, "UUID v4 (random)"), h("option", { value: "v7" }, "UUID v7 (time-ordered)"));
        const count = input({ type: "number", min: 1, max: 500, value: 5, class: "tb-input tb-num" });
        const upper = h("input", { type: "checkbox" });
        const ids = area({ rows: 5, readonly: true, class: "tb-area tb-result" });
        const genIds = () => { const n = Math.max(1, Math.min(500, +count.value || 1)); const list = Array.from({ length: n }, () => (kind.value === "v7" ? uuidv7() : crypto.randomUUID())); ids.value = (upper.checked ? list.map((x) => x.toUpperCase()) : list).join("\n"); };
        [kind, count, upper].forEach((el) => el.addEventListener("input", genIds));
        genIds();
        const len = h("input", { type: "range", min: 6, max: 64, value: 20 });
        const lenLabel = h("span", { class: "tb-num-label" }, "20");
        const sets = { lower: true, upper: true, digits: true, symbols: true };
        const boxes = Object.keys(sets).map((k) => h("label", { class: "check small" }, h("input", { type: "checkbox", checked: true, onchange: (e) => { sets[k] = e.target.checked; genPw(); } }), " " + { lower: "a-z", upper: "A-Z", digits: "0-9", symbols: "!#$" }[k]));
        const pw = outRow("Password");
        const strength = h("div", { class: "tb-strength" }, h("i"));
        const genPw = () => {
          lenLabel.textContent = len.value;
          const p = password(+len.value, sets);
          pw.set(p);
          const pool = (sets.lower ? 25 : 0) + (sets.upper ? 24 : 0) + (sets.digits ? 8 : 0) + (sets.symbols ? 14 : 0);
          const bits = pool ? Math.round(+len.value * Math.log2(pool)) : 0;
          strength.firstChild.style.width = Math.min(100, (bits / 128) * 100) + "%";
          strength.dataset.level = bits >= 80 ? "strong" : bits >= 60 ? "good" : "weak";
          strength.title = `About ${bits} bits of randomness`;
          strength.lastChild?.remove?.();
        };
        len.addEventListener("input", genPw);
        genPw();
        const lo = input({ type: "number", value: 1, class: "tb-input tb-num" }), hi = input({ type: "number", value: 100, class: "tb-input tb-num" });
        const num = outRow("Number");
        const genNum = () => { const a = Math.ceil(Math.min(+lo.value, +hi.value)), b = Math.floor(Math.max(+lo.value, +hi.value)); const r = new Uint32Array(1); crypto.getRandomValues(r); num.set(String(a + (r[0] % (b - a + 1)))); };
        genNum();
        return [h("div", { class: "tb-row" }, label("Kind", kind), label("How many", count)), h("label", { class: "check small" }, upper, " Uppercase"),
          h("div", { class: "tb-btns" }, btn("Generate", genIds, "primary"), h("span", { class: "tb-acts" }, ...actions(() => ids.value))), ids,
          h("div", { class: "tb-sub" }, "Password"), h("div", { class: "tb-row" }, h("span", { class: "tb-label" }, "Length"), len, lenLabel), h("div", { class: "tb-checks" }, boxes),
          pw, strength, h("div", { class: "tb-btns" }, btn("New password", genPw)),
          h("div", { class: "tb-sub" }, "Random number"), h("div", { class: "tb-row" }, label("From", lo), label("To", hi)), num, h("div", { class: "tb-btns" }, btn("Roll", genNum)),
          h("div", { class: "tb-help muted small" }, "Everything here uses the browser's cryptographic random generator.")];
      },
    },
    {
      id: "time", name: "Timestamps", desc: "Unix time to dates and back, in UTC and your time zone.",
      render() {
        const nowRow = outRow("Now (Unix)");
        const tick = () => { if (!root.isConnected || !nowRow.isConnected) return clearInterval(timer); nowRow.set(String(Math.floor(Date.now() / 1000))); };
        const timer = setInterval(tick, 1000); tick();
        const src = input({ placeholder: "1700000000, 1700000000000 or 2025-01-31 14:00", value: String(Math.floor(Date.now() / 1000)) });
        const err = errorLine();
        const rows = { s: outRow("Unix seconds"), ms: outRow("Unix milliseconds"), iso: outRow("ISO 8601 (UTC)"), local: outRow("Your time zone"), utc: outRow("UTC"), rel: outRow("Relative"), day: outRow("Day of the year") };
        const run = () => {
          const d = parseTime(src.value);
          if (!d || isNaN(d)) { err.set(src.value.trim() ? "Not a date or a timestamp." : ""); Object.values(rows).forEach((r) => r.set("")); return; }
          err.set("");
          rows.s.set(String(Math.floor(d.getTime() / 1000))); rows.ms.set(String(d.getTime())); rows.iso.set(d.toISOString());
          rows.local.set(d.toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" }));
          rows.utc.set(d.toLocaleString(undefined, { dateStyle: "full", timeStyle: "long", timeZone: "UTC" }));
          rows.rel.set(relative(d));
          const start = Date.UTC(d.getUTCFullYear(), 0, 0); rows.day.set(String(Math.floor((d.getTime() - start) / 86400000)));
        };
        src.addEventListener("input", run); run();
        return [nowRow, h("div", { class: "tb-btns" }, btn("Use now", () => { src.value = String(Math.floor(Date.now() / 1000)); run(); })), label("Timestamp or date", src), err, ...Object.values(rows),
          h("div", { class: "tb-help muted small" }, "Numbers are read as seconds, milliseconds, microseconds or nanoseconds, depending on their size.")];
      },
    },
    {
      id: "color", name: "Colors", desc: "Convert between hex, RGB and HSL, check contrast, and get tints and shades.",
      render() {
        const src = input({ value: "#4f8cf0", placeholder: "#4f8cf0, rgb(79 140 240), hsl(217 84% 63%), tomato" });
        const pick = h("input", { type: "color", value: "#4f8cf0", class: "tb-picker" });
        const swatch = h("div", { class: "tb-swatch" });
        const err = errorLine();
        const rows = { hex: outRow("HEX"), rgb: outRow("RGB"), hsl: outRow("HSL") };
        const cw = h("div", { class: "tb-contrast" }), cb = h("div", { class: "tb-contrast" });
        const scale = h("div", { class: "tb-scale" });
        const run = () => {
          const c = parseColor(src.value);
          if (!c) { err.set(src.value.trim() ? "Not a CSS color." : ""); return; }
          err.set("");
          const hx = toHex(c), hsl = rgbToHsl(c);
          swatch.style.background = hx;
          pick.value = hx.slice(0, 7);
          rows.hex.set(hx);
          rows.rgb.set(c.a < 1 ? `rgb(${c.r} ${c.g} ${c.b} / ${c.a})` : `rgb(${c.r}, ${c.g}, ${c.b})`);
          rows.hsl.set(c.a < 1 ? `hsl(${hsl.h} ${hsl.s}% ${hsl.l}% / ${c.a})` : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
          const rate = (r) => (r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA large text" : "fails");
          for (const [el, bg, name] of [[cw, { r: 255, g: 255, b: 255 }, "white"], [cb, { r: 0, g: 0, b: 0 }, "black"]]) {
            const r = contrast(c, bg);
            el.replaceChildren(h("span", { class: "tb-cs", style: { background: name, color: hx } }, "Aa"), h("span", {}, `On ${name}: ${r.toFixed(2)}:1, ${rate(r)}`));
          }
          const steps = [0.8, 0.6, 0.4, 0.2, 0, -0.2, -0.4, -0.6, -0.8];
          scale.replaceChildren(...steps.map((t) => { const m = t >= 0 ? mix(c, { r: 255, g: 255, b: 255 }, t) : mix(c, { r: 0, g: 0, b: 0 }, -t); const x = toHex({ ...m, a: 1 }); return h("button", { class: "tb-chip" + (t === 0 ? " base" : ""), title: x + " (click to copy)", style: { background: x }, onclick: () => copy(x) }); }));
        };
        src.addEventListener("input", run);
        pick.addEventListener("input", () => { src.value = pick.value; run(); });
        run();
        return [h("div", { class: "tb-row" }, pick, label("Color", src)), err, swatch, ...Object.values(rows), h("div", { class: "tb-sub" }, "Contrast (WCAG)"), cw, cb, h("div", { class: "tb-sub" }, "Tints and shades"), scale];
      },
    },
    {
      id: "numbers", name: "Number bases", desc: "Decimal, hex, octal and binary, any size.",
      render() {
        const bases = [["Decimal", 10, ""], ["Hexadecimal", 16, "0x"], ["Octal", 8, "0o"], ["Binary", 2, "0b"]];
        const err = errorLine();
        const info = h("div", { class: "muted small tb-summary" });
        const fields = bases.map(([name, base, prefix]) => {
          const el = input({ placeholder: name, "data-base": base });
          el.addEventListener("input", () => {
            const t = el.value.trim().replace(/[_\s]/g, "").toLowerCase().replace(new RegExp("^(-?)" + (prefix || "_none_")), "$1");
            if (!t) { fields.forEach((f) => f !== el && (f.value = "")); err.set(""); info.textContent = ""; return; }
            const neg = t.startsWith("-"), digits = neg ? t.slice(1) : t;
            const ok = { 10: /^\d+$/, 16: /^[0-9a-f]+$/, 8: /^[0-7]+$/, 2: /^[01]+$/ }[base].test(digits);
            if (!ok) { err.set(`Not a valid ${name.toLowerCase()} number.`); return; }
            err.set("");
            let v = 0n; for (const ch of digits) v = v * BigInt(base) + BigInt(parseInt(ch, base));
            if (neg) v = -v;
            fields.forEach((f, i) => { if (f !== el) f.value = (v < 0n ? "-" : "") + (v < 0n ? -v : v).toString(bases[i][1]); });
            const abs = v < 0n ? -v : v, bitLen = abs.toString(2).length;
            info.textContent = `${bitLen} bit${bitLen === 1 ? "" : "s"}` + (abs <= 0x10ffffn && abs >= 32n ? `, character ${String.fromCodePoint(Number(abs))}` : "") + (abs < 2n ** 53n ? `, ${Number(v).toLocaleString()}` : "");
          });
          return el;
        });
        fields[0].value = "255"; fields[0].dispatchEvent(new Event("input"));
        return [...bases.map(([name], i) => h("div", { class: "tb-labelrow" }, label(name, fields[i]), h("span", { class: "tb-acts" }, ...actions(() => fields[i].value)))), err, info];
      },
    },
    {
      id: "jwt", name: "JWT decoder", desc: "Read the header and claims of a JSON Web Token.",
      render() {
        const src = area({ rows: 4, placeholder: "eyJhbGciOi...", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo0MTAyNDQ0ODAwfQ.signature" });
        const err = errorLine();
        const headOut = h("pre", { class: "tb-pre" }), bodyOut = h("pre", { class: "tb-pre" });
        const claims = h("div", { class: "tb-claims" });
        const run = () => {
          const parts = src.value.trim().split(".");
          headOut.textContent = bodyOut.textContent = ""; claims.textContent = "";
          if (!src.value.trim()) return err.set("");
          if (parts.length < 2) return err.set("A JWT has three parts separated by dots.");
          try {
            const head = JSON.parse(b64decode(parts[0])), body = JSON.parse(b64decode(parts[1]));
            err.set("");
            headOut.textContent = JSON.stringify(head, null, 2); bodyOut.textContent = JSON.stringify(body, null, 2);
            const rows = [];
            for (const [k, name] of [["iat", "Issued"], ["nbf", "Not before"], ["exp", "Expires"]]) if (typeof body[k] === "number") {
              const d = new Date(body[k] * 1000);
              rows.push(h("div", {}, h("b", {}, name + ": "), d.toLocaleString(), " ", h("span", { class: "muted" }, `(${relative(d)})`)));
            }
            if (typeof body.exp === "number") rows.push(h("div", { class: body.exp * 1000 < Date.now() ? "tb-bad" : "tb-good" }, body.exp * 1000 < Date.now() ? "This token has expired." : "This token has not expired."));
            claims.replaceChildren(...rows);
          } catch (_) { err.set("This does not look like a JWT: the parts are not Base64 JSON."); }
        };
        src.addEventListener("input", run); run();
        return [label("Token", src), err, h("div", { class: "tb-sub" }, "Header"), headOut, h("div", { class: "tb-sub" }, "Payload"), bodyOut, claims,
          h("div", { class: "tb-help muted small" }, "Decoding only: the signature is not checked, and the token never leaves this page.")];
      },
    },
    {
      id: "text", name: "Text", desc: "Counts, case conversion, line tools and placeholder text.",
      render() {
        const src = area({ rows: 6, value: "The quick brown fox\njumps over the lazy dog\nthe quick brown fox" });
        const stats = h("div", { class: "tb-stats" });
        const out = area({ rows: 5, readonly: true, class: "tb-area tb-result" });
        const count = () => {
          const t = src.value, w = t.match(/[\p{L}\p{N}'’-]+/gu)?.length || 0;
          const st = [["Characters", [...t].length], ["Without spaces", [...t.replace(/\s/g, "")].length], ["Words", w], ["Lines", t ? t.split("\n").length : 0], ["Bytes (UTF-8)", utf8(t).length], ["Reading time", w ? `${Math.max(1, Math.round(w / 230))} min` : "0 min"]];
          stats.replaceChildren(...st.map(([k, v]) => h("div", { class: "tb-stat" }, h("b", {}, v), h("span", {}, k))));
        };
        src.addEventListener("input", count); count();
        const lines = (fn) => () => { out.value = fn(src.value.split("\n")).join("\n"); };
        const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
        return [label("Text", src), stats,
          h("div", { class: "tb-sub" }, "Change case"),
          h("div", { class: "tb-btns wrap" }, Object.values(CASES).map(([name, fn]) => btn(name, () => { out.value = src.value.split("\n").map(fn).join("\n"); }))),
          h("div", { class: "tb-sub" }, "Lines"),
          h("div", { class: "tb-btns wrap" },
            btn("Sort A to Z", lines((l) => [...l].sort(coll.compare))), btn("Sort Z to A", lines((l) => [...l].sort((a, b) => coll.compare(b, a)))),
            btn("Remove duplicates", lines((l) => [...new Set(l)])), btn("Reverse", lines((l) => [...l].reverse())),
            btn("Shuffle", lines((l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })),
            btn("Trim", lines((l) => l.map((x) => x.trim()))), btn("Remove empty", lines((l) => l.filter((x) => x.trim()))),
            btn("Number them", lines((l) => l.map((x, i) => `${i + 1}. ${x}`)))),
          h("div", { class: "tb-btns" }, btn("Lorem ipsum", () => { out.value = lorem(3); }), btn("Use the result as input", () => { src.value = out.value; count(); })),
          h("div", { class: "tb-labelrow" }, h("span", { class: "tb-label" }, "Result"), h("span", { class: "tb-acts" }, ...actions(() => out.value))), out];
      },
    },
    {
      id: "diff", name: "Compare text", desc: "Paste two versions and see every difference side by side.",
      render() {
        const a = area({ rows: 6, placeholder: "Original", value: "def greet(name):\n    print('Hello ' + name)\n\ngreet('Ada')" });
        const b = area({ rows: 6, placeholder: "Changed", value: "def greet(name: str) -> None:\n    print(f'Hello, {name}!')\n\ngreet('Ada')\ngreet('Grace')" });
        const lang = h("select", { class: "tb-input" }, ["plaintext", "python", "javascript", "typescript", "json", "html", "css", "csharp", "java", "cpp", "go", "rust", "sql", "markdown"].map((l) => h("option", { value: l }, l)));
        return [label("Original", a), label("Changed", b), label("Highlight as", lang),
          h("div", { class: "tb-btns" }, btn("Compare", () => showDiff({ original: a.value, modified: b.value, title: "Compare text", language: lang.value }), "primary"),
            btn("Swap", () => { [a.value, b.value] = [b.value, a.value]; }))];
      },
    },
  ];

  const state = { tool: LS.get("toolbox", "regex") };
  const nav = h("div", { class: "tb-nav", role: "tablist" });
  const body = h("div", { class: "tb-body" });
  root.replaceChildren(nav, body);
  function show(id) {
    const tool = TOOLS.find((t) => t.id === id) || TOOLS[0];
    state.tool = tool.id;
    LS.set("toolbox", tool.id);
    nav.replaceChildren(...TOOLS.map((t) => h("button", { class: "tb-tab" + (t.id === tool.id ? " on" : ""), title: t.desc, "data-tool": t.id, onclick: () => show(t.id) }, t.name)));
    body.replaceChildren(h("div", { class: "tb-desc muted small" }, tool.desc), ...tool.render());
  }
  show(state.tool);
  return { show, tools: TOOLS.map((t) => ({ id: t.id, name: t.name })) };
}

// exported for tests
export const _test = { md5, crc32, b64encode, b64decode, jsonToTs, parseTime, uuidv7 };
