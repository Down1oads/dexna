// A shell for your project's files, previews for CSV, JSON and SVG files, a focus timer, coding activity,
// project templates and notes for each project.
import { calculate, formatNumber } from "./extras.js";

/* =====================================================================
 * Small helpers (exported for tests)
 * ===================================================================== */
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/** Parse CSV or TSV: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text, sep = ",") {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"' && field === "") q = true;
    else if (c === sep) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}
/** Find where JSON stops being valid: { message, line, column }, or null if it is fine. */
export function jsonError(text) {
  let i = 0;
  const fail = (msg) => { const before = text.slice(0, i); const e = new Error(msg); e.at = { line: before.split("\n").length, column: i - before.lastIndexOf("\n") }; throw e; };
  const ws = () => { while (i < text.length && " \t\n\r".includes(text[i])) i++; };
  const what = () => (i >= text.length ? "the end of the file" : `"${text[i]}"`);
  const value = () => {
    ws();
    const c = text[i];
    if (c === "{") {
      i++; ws();
      if (text[i] === "}") { i++; return; }
      for (;;) {
        ws(); if (text[i] !== '"') fail(`Expected a key in quotes but found ${what()}`);
        str(); ws(); if (text[i] !== ":") fail(`Expected ":" but found ${what()}`); i++;
        value(); ws();
        if (text[i] === ",") { i++; ws(); if (text[i] === "}") fail("A comma before } is not allowed in JSON"); continue; }
        if (text[i] === "}") { i++; return; }
        fail(`Expected "," or "}" but found ${what()}`);
      }
    }
    if (c === "[") {
      i++; ws();
      if (text[i] === "]") { i++; return; }
      for (;;) {
        value(); ws();
        if (text[i] === ",") { i++; ws(); if (text[i] === "]") fail("A comma before ] is not allowed in JSON"); continue; }
        if (text[i] === "]") { i++; return; }
        fail(`Expected "," or "]" but found ${what()}`);
      }
    }
    if (c === '"') return str();
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i, i + 400));
    if (m && m[0]) { i += m[0].length; return; }
    for (const w of ["true", "false", "null"]) if (text.startsWith(w, i)) { i += w.length; return; }
    fail(c === "'" ? "JSON strings need double quotes" : `Expected a value but found ${what()}`);
  };
  const str = () => {
    i++;
    while (i < text.length && text[i] !== '"') { if (text[i] === "\\") i++; else if (text[i] === "\n") fail("A string cannot span lines"); i++; }
    if (i >= text.length) fail("A string is not closed");
    i++;
  };
  try {
    value(); ws();
    if (i < text.length) fail(`Unexpected ${what()} after the end of the data`);
    return null;
  } catch (e) { return { message: e.message, ...e.at }; }
}
/** Split a shell line into words: quotes group, backslash escapes. */
export function shellWords(line) {
  const out = [];
  let cur = "", q = null, any = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; else if (c === "\\" && q === '"' && i + 1 < line.length) cur += line[++i]; else cur += c; continue; }
    if (c === '"' || c === "'") { q = c; any = true; continue; }
    if (c === "\\" && i + 1 < line.length) { cur += line[++i]; any = true; continue; }
    if (/\s/.test(c)) { if (cur || any) out.push(cur); cur = ""; any = false; continue; }
    cur += c;
  }
  if (cur || any) out.push(cur);
  return out;
}
/** Resolve a path typed in the shell against the current folder. Returns "" for the project root, or null if it leaves it. */
export function resolvePath(cwd, p) {
  if (!p || p === "~" || p === "/") return p ? "" : cwd;
  const parts = p.startsWith("/") || p.startsWith("~/") ? [] : cwd ? cwd.split("/") : [];
  for (const seg of p.replace(/^~?\//, "").split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") { if (!parts.length) return null; parts.pop(); } else parts.push(seg);
  }
  return parts.join("/");
}
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`);
/** Current and longest runs of days with activity, given { "YYYY-MM-DD": { m } }. */
export function streaks(days, today = new Date()) {
  const has = (d) => (days[dayKey(d)]?.m || 0) > 0;
  let cur = 0;
  const d = new Date(today);
  if (!has(d)) d.setDate(d.getDate() - 1); // today not started yet: the streak can still continue
  while (has(d)) { cur++; d.setDate(d.getDate() - 1); }
  const keys = Object.keys(days).filter((k) => days[k].m > 0).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    const t = new Date(k + "T12:00:00");
    run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  }
  return { current: cur, longest: Math.max(best, cur) };
}

export function createPlus(A) {
  const { h, icon, toast } = A;

  /* =====================================================================
   * Previews: CSV / TSV tables, JSON trees, SVG images
   * ===================================================================== */
  const kindOf = (p) => (/\.(csv|tsv)$/i.test(p || "") ? "table" : /\.(json|geojson|webmanifest)$/i.test(p || "") ? "json" : /\.svg$/i.test(p || "") ? "svg" : null);
  const canPreview = (p) => !!kindOf(p);
  function pageColors() {
    const css = getComputedStyle(document.documentElement), v = (k) => css.getPropertyValue(k).trim();
    const t = A.effectiveTheme().c;
    return { bg: A.effectiveTheme().c.bg, fg: v("--fg"), dim: v("--fg-dim"), faint: v("--fg-faint"), border: v("--border"), bg1: v("--bg-1"), bg2: v("--bg-2"), accent: v("--accent"), str: t.string, num: t.number, key: t.func, kw: t.keyword, err: t.err };
  }
  const baseCss = (c) => `*{box-sizing:border-box}html,body{margin:0;background:${c.bg};color:${c.fg};font:13px/1.5 "IBM Plex Sans",system-ui,sans-serif}
    .bar{position:sticky;top:0;display:flex;gap:10px;align-items:center;padding:8px 12px;background:${c.bg1};border-bottom:1px solid ${c.border};z-index:2;font-size:12px;color:${c.dim}}
    input{background:${c.bg};color:${c.fg};border:1px solid ${c.border};border-radius:4px;padding:4px 8px;font:inherit;min-width:180px}
    button{background:${c.bg2};color:${c.fg};border:1px solid ${c.border};border-radius:4px;padding:3px 9px;font:inherit;cursor:pointer}
    .err{margin:16px;padding:10px 14px;border-left:3px solid ${c.err};background:${c.bg1};font-family:"JetBrains Mono",monospace;white-space:pre-wrap}`;
  function tablePage(text, path) {
    const c = pageColors();
    const rows = parseCsv(text, /\.tsv$/i.test(path) ? "\t" : text.split("\n", 1)[0].includes(";") && !text.split("\n", 1)[0].includes(",") ? ";" : ",");
    const data = JSON.stringify(rows.slice(0, 5001)).replace(/</g, "\\u003c");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss(c)}
      table{border-collapse:collapse;font:12.5px/1.4 "JetBrains Mono",monospace;min-width:100%}
      th,td{border:1px solid ${c.border};padding:4px 10px;white-space:nowrap;max-width:420px;overflow:hidden;text-overflow:ellipsis;text-align:left}
      th{position:sticky;top:41px;background:${c.bg2};cursor:pointer;user-select:none;font-weight:600;z-index:1}
      th:hover{color:${c.accent}} td.n{text-align:right;color:${c.num}} td.i,th.i{color:${c.faint};text-align:right;background:${c.bg1}}
      tr:hover td{background:${c.bg1}} .wrap{width:max-content;min-width:100%}</style></head><body>
      <div class="bar"><input id="q" placeholder="Filter rows"><span id="info"></span></div><div class="wrap"><table id="t"></table></div>
      <script>(() => {
        const rows = ${data}; const head = rows[0] || [], body = rows.slice(1); let sort = -1, dir = 1;
        const num = (v) => v.trim() !== "" && !isNaN(+v.replace(/,/g, ""));
        const numericCol = head.map((_, i) => body.slice(0, 200).every((r) => !r[i] || num(r[i])));
        const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
        function draw() {
          const q = document.getElementById("q").value.toLowerCase();
          let list = body.filter((r) => !q || r.some((v) => String(v).toLowerCase().includes(q)));
          if (sort >= 0) list = [...list].sort((a, b) => { const x = a[sort] ?? "", y = b[sort] ?? ""; return (numericCol[sort] ? (+x.replace(/,/g, "") || 0) - (+y.replace(/,/g, "") || 0) : x.localeCompare(y, undefined, { numeric: true })) * dir; });
          const shown = list.slice(0, 2000);
          document.getElementById("t").innerHTML = "<thead><tr><th class=i>#</th>" + head.map((v, i) => "<th data-i=" + i + ">" + esc(v) + (sort === i ? (dir > 0 ? " ▲" : " ▼") : "") + "</th>").join("") + "</tr></thead><tbody>" +
            shown.map((r, k) => "<tr><td class=i>" + (body.indexOf(r) + 1) + "</td>" + head.map((_, i) => "<td" + (numericCol[i] ? " class=n" : "") + " title=\\"" + esc(r[i]).replace(/"/g, "&quot;") + "\\">" + esc(r[i]) + "</td>").join("") + "</tr>").join("") + "</tbody>";
          document.getElementById("info").textContent = list.length + " of " + body.length + " rows, " + head.length + " columns" + (list.length > 2000 ? " (showing the first 2000)" : "") + ${rows.length > 5001 ? '" (the file has more rows than the preview reads)"' : '""'};
        }
        document.getElementById("t").addEventListener("click", (e) => { const th = e.target.closest("th[data-i]"); if (!th) return; const i = +th.dataset.i; if (sort === i) dir = -dir; else { sort = i; dir = 1; } draw(); });
        document.getElementById("q").addEventListener("input", draw);
        draw();
      })();<\/script></body></html>`;
  }
  function jsonPage(text) {
    const c = pageColors();
    let data, error = null;
    try { data = JSON.parse(text); } catch (e) {
      const je = jsonError(text);
      error = je ? `${je.message} (line ${je.line}, column ${je.column})` : e.message;
    }
    const json = error ? "null" : JSON.stringify(data).replace(/</g, "\\u003c");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss(c)}
      #tree{padding:8px 14px;font:12.5px/1.6 "JetBrains Mono",monospace}
      details{margin-left:16px} details>summary{margin-left:-16px;cursor:pointer;list-style:none} details>summary::before{content:"▸";display:inline-block;width:14px;color:${c.faint}} details[open]>summary::before{content:"▾"}
      .leaf{margin-left:0} .k{color:${c.key}} .s{color:${c.str}} .n{color:${c.num}} .b{color:${c.kw}} .z{color:${c.faint}} .c{color:${c.faint};font-size:11.5px}</style></head><body>
      <div class="bar"><button id="ex">Expand all</button><button id="co">Collapse all</button><span id="info"></span></div>
      ${error ? `<div class="err">This is not valid JSON: ${escHtml(error)}</div>` : '<div id="tree"></div>'}
      <script>(() => {
        const data = ${json}; if (data === null && ${error ? "true" : "false"}) return;
        const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
        let count = 0;
        const val = (v) => v === null ? '<span class=z>null</span>' : typeof v === "string" ? '<span class=s>"' + esc(v) + '"</span>' : typeof v === "number" ? '<span class=n>' + v + '</span>' : '<span class=b>' + v + '</span>';
        function node(key, v, depth) {
          count++;
          const k = key === null ? "" : '<span class=k>' + esc(key) + '</span>: ';
          if (v && typeof v === "object") {
            const arr = Array.isArray(v), entries = arr ? v.map((x, i) => [i, x]) : Object.entries(v);
            const summary = k + (arr ? "[" : "{") + ' <span class=c>' + entries.length + (arr ? " items" : " keys") + '</span> ' + (arr ? "]" : "}");
            if (count > 20000) return '<div class=leaf>' + summary + '</div>';
            return '<details' + (depth < 2 ? " open" : "") + '><summary>' + summary + '</summary>' + entries.map(([a, b]) => node(arr ? a : a, b, depth + 1)).join("") + '</details>';
          }
          return '<div class=leaf>' + k + val(v) + '</div>';
        }
        document.getElementById("tree").innerHTML = node(null, data, 0);
        document.getElementById("info").textContent = count.toLocaleString() + " values";
        document.getElementById("ex").onclick = () => document.querySelectorAll("details").forEach((d) => d.open = true);
        document.getElementById("co").onclick = () => document.querySelectorAll("details").forEach((d, i) => d.open = i === 0);
      })();<\/script></body></html>`;
  }
  function svgPage(text) {
    const c = pageColors();
    const ok = /<svg[\s>]/i.test(text);
    const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss(c)}
      .stage{display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 42px);padding:20px;
        background:repeating-conic-gradient(${c.bg1} 0 25%, ${c.bg2} 0 50%) 0 0/20px 20px}
      img{max-width:100%;max-height:calc(100vh - 82px);transform-origin:center;image-rendering:auto}</style></head><body>
      <div class="bar"><button id="minus">-</button><span id="z">Fit</span><button id="plus">+</button><button id="fit">Fit</button><span id="size"></span></div>
      ${ok ? `<div class="stage"><img id="img" src="${src}" alt="SVG preview"></div>` : '<div class="err">This file has no &lt;svg&gt; element yet.</div>'}
      <script>(() => {
        const img = document.getElementById("img"); if (!img) return; let z = 1;
        const set = () => { img.style.transform = "scale(" + z + ")"; document.getElementById("z").textContent = Math.round(z * 100) + "%"; };
        document.getElementById("plus").onclick = () => { z = Math.min(16, z * 1.25); set(); };
        document.getElementById("minus").onclick = () => { z = Math.max(0.1, z / 1.25); set(); };
        document.getElementById("fit").onclick = () => { z = 1; set(); document.getElementById("z").textContent = "Fit"; };
        img.onload = () => { document.getElementById("size").textContent = img.naturalWidth + " × " + img.naturalHeight; };
        img.onerror = () => { img.replaceWith(Object.assign(document.createElement("div"), { className: "err", textContent: "The browser could not draw this SVG. Check that it is valid." })); };
      })();<\/script></body></html>`;
  }
  function previewPage(path, text) {
    const k = kindOf(path);
    return k === "table" ? tablePage(text, path) : k === "json" ? jsonPage(text) : k === "svg" ? svgPage(text) : "";
  }

  /* =====================================================================
   * Shell
   * ===================================================================== */
  const sh = { cwd: "", hist: A.LS.get("shellHistory", []), hi: -1, out: null, input: null, prompt: null };
  const files = () => A.project.files;
  const isFile = (p) => files()[p] != null;
  const isDir = (p) => p === "" || A.project.dirs.includes(p) || Object.keys(files()).some((f) => f.startsWith(p + "/"));
  const childrenOf = (dir) => {
    const pre = dir ? dir + "/" : "", seen = new Map();
    for (const f of Object.keys(files())) if (f.startsWith(pre)) { const rest = f.slice(pre.length), i = rest.indexOf("/"); seen.set(i < 0 ? rest : rest.slice(0, i), i >= 0); }
    for (const d of A.project.dirs) if (d.startsWith(pre)) { const rest = d.slice(pre.length); if (rest && !rest.includes("/")) seen.set(rest, true); }
    return [...seen].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  };
  const line = (...parts) => { const d = h("div", { class: "sh-line" }, ...parts); sh.out.append(d); return d; };
  const txt = (s, cls) => h("span", cls ? { class: cls } : {}, s);
  const fileLink = (p, label = p, lineNo) => h("a", { class: "sh-file", href: "#", onclick: (e) => { e.preventDefault(); A.openFile(p, lineNo ? { line: lineNo } : {}); } }, label);
  const err = (s) => line(txt(s, "sh-err"));
  const need = (args, n, usage) => { if (args.length < n) { err("usage: " + usage); return false; } return true; };
  const at = (p) => { const r = resolvePath(sh.cwd, p); if (r === null) err(`${p}: outside the project`); return r; };
  const textOf = (p) => A.textOf(p);

  const CMDS = {
    help: { usage: "help", desc: "List the commands", run() {
      line(txt("Commands work on this project's files. Deleted files can be brought back from File > Local History.", "sh-dim"));
      for (const [n, c] of Object.entries(CMDS)) line(txt(c.usage.padEnd(30), "sh-cmd"), txt(c.desc, "sh-dim"));
      line(txt("Tab completes names, Up and Down go through earlier commands, Ctrl+L clears.", "sh-dim"));
    } },
    ls: { usage: "ls [-l] [folder]", desc: "List files", run(args) {
      const long = args[0] === "-l" && args.shift();
      const dir = at(args[0] || ".");
      if (dir === null) return;
      if (isFile(dir)) return line(fileLink(dir, dir.split("/").pop()));
      if (!isDir(dir)) return err(`ls: ${args[0]}: no such folder`);
      const kids = childrenOf(dir);
      if (!kids.length) return line(txt("(empty)", "sh-dim"));
      if (long) for (const [n, d] of kids) { const p = (dir ? dir + "/" : "") + n; line(d ? txt("folder".padEnd(14), "sh-dim") : txt(`${textOf(p).split("\n").length} lines`.padEnd(14), "sh-dim"), d ? txt(n + "/", "sh-dir") : fileLink(p, n)); }
      else line(...kids.flatMap(([n, d]) => [d ? txt(n + "/", "sh-dir") : fileLink((dir ? dir + "/" : "") + n, n), txt("  ")]));
    } },
    cd: { usage: "cd [folder]", desc: "Change folder", run(args) { const d = at(args[0] || "~"); if (d === null) return; if (!isDir(d) || isFile(d)) return err(`cd: ${args[0]}: no such folder`); sh.cwd = d; updatePrompt(); } },
    pwd: { usage: "pwd", desc: "Show the current folder", run() { line(txt("/" + sh.cwd)); } },
    tree: { usage: "tree [folder]", desc: "Show folders and files as a tree", run(args) {
      const dir = at(args[0] || "."); if (dir === null) return;
      const walk = (d, pre) => childrenOf(d).forEach(([n, isD], i, all) => { const last = i === all.length - 1, p = (d ? d + "/" : "") + n; line(txt(pre + (last ? "└── " : "├── "), "sh-dim"), isD ? txt(n + "/", "sh-dir") : fileLink(p, n)); if (isD) walk(p, pre + (last ? "    " : "│   ")); });
      line(txt((dir || A.project.name) + "/", "sh-dir")); walk(dir, "");
    } },
    cat: { usage: "cat <file>...", desc: "Print files", run(args) { if (!need(args, 1, this.usage)) return; for (const a of args) { const p = at(a); if (p === null) continue; if (!isFile(p)) { err(`cat: ${a}: no such file`); continue; } textOf(p).split("\n").forEach((l) => line(txt(l))); } } },
    head: { usage: "head [-n N] <file>", desc: "First lines of a file", run(args) { lines(args, (l, n) => l.slice(0, n)); } },
    tail: { usage: "tail [-n N] <file>", desc: "Last lines of a file", run(args) { lines(args, (l, n) => l.slice(-n)); } },
    wc: { usage: "wc <file>...", desc: "Count lines, words and characters", run(args) {
      if (!need(args, 1, this.usage)) return;
      for (const a of args) { const p = at(a); if (p === null || !isFile(p)) { err(`wc: ${a}: no such file`); continue; } const t = textOf(p); line(txt(`${String(t.split("\n").length).padStart(7)} ${String((t.match(/\S+/g) || []).length).padStart(7)} ${String(t.length).padStart(8)}  `), fileLink(p)); }
    } },
    touch: { usage: "touch <file>...", desc: "Create empty files", run(args) { if (!need(args, 1, this.usage)) return; const ch = {}; for (const a of args) { const p = at(a); if (p && !isFile(p)) ch[p] = ""; } A.writeFiles(ch); } },
    mkdir: { usage: "mkdir <folder>...", desc: "Create folders", run(args) { if (!need(args, 1, this.usage)) return; for (const a of args) { const p = at(a); if (p) A.mkdir(p); } } },
    rm: { usage: "rm [-r] <path>...", desc: "Delete files (and folders with -r)", run(args) {
      const r = args[0] === "-r" || args[0] === "-rf"; if (r) args.shift();
      if (!need(args, 1, this.usage)) return;
      const del = [];
      for (const a of args) {
        const p = at(a); if (p === null) continue;
        if (isFile(p)) del.push(p);
        else if (p && isDir(p)) { if (!r) { err(`rm: ${a} is a folder (use rm -r)`); continue; } del.push(...Object.keys(files()).filter((f) => f.startsWith(p + "/"))); A.rmdir(p); }
        else err(`rm: ${a}: no such file`);
      }
      if (del.length) { A.removeFiles(del); line(txt(`deleted ${del.length} file${del.length === 1 ? "" : "s"}`, "sh-dim")); }
    } },
    mv: { usage: "mv <from> <to>", desc: "Move or rename", run(args) {
      if (!need(args, 2, this.usage)) return;
      const a = at(args[0]); let b = at(args[1]); if (a === null || b === null) return;
      if (!isFile(a) && !isDir(a)) return err(`mv: ${args[0]}: no such file`);
      if (isDir(b) && !isFile(b) && b !== a) b = (b ? b + "/" : "") + a.split("/").pop();
      if (!A.movePath(a, b)) err("mv: could not move it");
    } },
    cp: { usage: "cp <file> <to>", desc: "Copy a file", run(args) {
      if (!need(args, 2, this.usage)) return;
      const a = at(args[0]); let b = at(args[1]); if (a === null || b === null) return;
      if (!isFile(a)) return err(`cp: ${args[0]}: no such file`);
      if (isDir(b) && !isFile(b)) b = (b ? b + "/" : "") + a.split("/").pop();
      if (isFile(b)) return err(`cp: ${args[1]} already exists`);
      A.writeFiles({ [b]: textOf(a) });
    } },
    echo: { usage: "echo <text> [> file | >> file]", desc: "Print text, or write it to a file", run(args) {
      const i = args.findIndex((x) => x === ">" || x === ">>");
      if (i < 0) return line(txt(args.join(" ")));
      const p = at(args[i + 1] || ""); if (!p) return err("echo: where should it go?");
      const text = args.slice(0, i).join(" ") + "\n";
      A.writeFiles({ [p]: args[i] === ">>" && isFile(p) ? textOf(p) + text : text });
    } },
    grep: { usage: "grep [-i] <pattern> [path]", desc: "Search file contents", run(args) {
      const ci = args[0] === "-i" && args.shift();
      if (!need(args, 1, this.usage)) return;
      let re; try { re = new RegExp(args[0], ci ? "i" : ""); } catch (_) { re = new RegExp(args[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), ci ? "i" : ""); }
      const root = at(args[1] || "."); if (root === null) return;
      let n = 0;
      for (const f of Object.keys(files()).sort()) {
        if (root && f !== root && !f.startsWith(root + "/")) continue;
        textOf(f).split("\n").forEach((l, i) => {
          if (n >= 300 || !re.test(l)) return;
          n++;
          const m = l.match(re), k = l.indexOf(m[0]);
          line(fileLink(f, `${f}:${i + 1}`, i + 1), txt(": "), txt(l.slice(0, k).trimStart()), txt(m[0], "sh-hit"), txt(l.slice(k + m[0].length)));
        });
      }
      if (!n) line(txt("no matches", "sh-dim")); else if (n >= 300) line(txt("(stopped at 300 matches)", "sh-dim"));
    } },
    find: { usage: "find [name]", desc: "Find files by name (* and ? work)", run(args) {
      const pat = args[0] || "*";
      const re = new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
      const hits = Object.keys(files()).filter((f) => (!sh.cwd || f.startsWith(sh.cwd + "/")) && (re.test(f.split("/").pop()) || (!/[*?]/.test(pat) && f.toLowerCase().includes(pat.toLowerCase())))).sort();
      hits.forEach((f) => line(fileLink(f)));
      if (!hits.length) line(txt("nothing found", "sh-dim"));
    } },
    open: { usage: "open <file>", desc: "Open a file in the editor", run(args) { if (!need(args, 1, this.usage)) return; const p = at(args[0]); if (p !== null && isFile(p)) A.openFile(p); else err(`open: ${args[0]}: no such file`); } },
    run: { usage: "run [file]", desc: "Run a file (the current one if none is given)", run(args) { const p = args[0] ? at(args[0]) : A.currentPath(); if (!p || !isFile(p)) return err(`run: ${args[0] || "no file is open"}`); if (!A.isRunnable(p)) return err(`run: Dexna cannot run ${p}`); A.runFile(p); line(txt(`running ${p} (output in the Terminal tab)`, "sh-dim")); } },
    calc: { usage: "calc <expression>", desc: "Work out some math", run(args) { try { line(txt(formatNumber(calculate(args.join(" "))), "sh-ok")); } catch (e) { err(e.message); } } },
    date: { usage: "date", desc: "Show the date and time", run() { line(txt(new Date().toString())); } },
    history: { usage: "history", desc: "Show earlier commands", run() { sh.hist.slice(-50).forEach((c, i) => line(txt(String(i + 1).padStart(4) + "  ", "sh-dim"), txt(c))); } },
    clear: { usage: "clear", desc: "Clear the shell", run() { sh.out.textContent = ""; } },
  };
  function lines(args, pick) {
    let n = 10;
    if (args[0] === "-n") { n = parseInt(args[1], 10) || 10; args = args.slice(2); } else if (/^-\d+$/.test(args[0] || "")) { n = +args[0].slice(1); args = args.slice(1); }
    if (!args.length) return err("usage: head|tail [-n N] <file>");
    const p = at(args[0]); if (p === null) return;
    if (!isFile(p)) return err(`${args[0]}: no such file`);
    pick(textOf(p).split("\n"), n).forEach((l) => line(txt(l)));
  }
  const promptText = () => `${A.project?.name || "project"}${sh.cwd ? "/" + sh.cwd : ""} $`;
  const updatePrompt = () => { if (sh.prompt) sh.prompt.textContent = promptText(); };
  function exec(cmdline) {
    const raw = cmdline.trim();
    line(txt(promptText() + " ", "sh-prompt"), txt(raw, "sh-typed"));
    if (!raw) return;
    if (sh.hist.at(-1) !== raw) { sh.hist.push(raw); if (sh.hist.length > 200) sh.hist.shift(); A.LS.set("shellHistory", sh.hist); }
    for (const part of raw.split(/\s*&&\s*/)) {
      const words = shellWords(part);
      const [name, ...args] = words;
      const c = CMDS[name];
      if (!c) { err(`${name}: unknown command. Type help to see the commands.`); break; }
      try { c.run.call(c, args); } catch (e) { err(`${name}: ${e.message}`); break; }
    }
    sh.out.scrollTop = sh.out.scrollHeight;
  }
  function complete() {
    const el = sh.input, v = el.value.slice(0, el.selectionStart);
    const words = v.split(/\s+/), last = words.at(-1);
    let cands;
    if (words.length === 1) cands = Object.keys(CMDS).filter((c) => c.startsWith(last));
    else {
      const slash = last.lastIndexOf("/"), base = last.slice(0, slash + 1), part = last.slice(slash + 1);
      const dir = resolvePath(sh.cwd, base || ".");
      if (dir === null) return;
      cands = childrenOf(dir).filter(([n]) => n.startsWith(part)).map(([n, d]) => base + n + (d ? "/" : ""));
    }
    if (!cands.length) return;
    let common = cands[0];
    for (const c of cands) while (!c.startsWith(common)) common = common.slice(0, -1);
    if (cands.length === 1 && !common.endsWith("/")) common += " ";
    if (common.length > last.length) { el.setRangeText(common.slice(last.length), el.selectionStart, el.selectionStart, "end"); }
    else line(txt(cands.join("   "), "sh-dim"));
  }
  function buildShell() {
    const tabs = document.querySelector(".panel-tabs"), body = document.querySelector(".panel-body");
    if (!tabs || document.querySelector('[data-panel="shell"]')) return;
    const btn = h("button", { "data-panel": "shell" }, "Shell");
    btn.onclick = () => A.showPanel("shell");
    const notesBtn = h("button", { "data-panel": "notes" }, "Notes");
    notesBtn.onclick = () => A.showPanel("notes");
    tabs.insertBefore(btn, tabs.children[1]);
    tabs.append(notesBtn);
    sh.out = h("div", { class: "sh-out", tabindex: "-1" });
    sh.prompt = h("span", { class: "prompt sh-ps" }, promptText());
    sh.input = h("input", { class: "sh-input", spellcheck: "false", autocomplete: "off", placeholder: "Type a command, or help" });
    sh.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); const v = sh.input.value; sh.input.value = ""; sh.hi = -1; exec(v); }
      else if (e.key === "Tab") { e.preventDefault(); complete(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (!sh.hist.length) return; sh.hi = sh.hi < 0 ? sh.hist.length - 1 : Math.max(0, sh.hi - 1); sh.input.value = sh.hist[sh.hi]; }
      else if (e.key === "ArrowDown") { e.preventDefault(); if (sh.hi < 0) return; sh.hi++; if (sh.hi >= sh.hist.length) { sh.hi = -1; sh.input.value = ""; } else sh.input.value = sh.hist[sh.hi]; }
      else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); sh.out.textContent = ""; }
    });
    sh.out.addEventListener("mouseup", () => { if (!getSelection().toString()) sh.input.focus(); });
    body.append(h("div", { class: "panel-view", "data-panel": "shell" }, sh.out, h("div", { class: "console-input sh-bar" }, sh.prompt, sh.input)));
    line(txt("Dexna shell. Type help for the commands; they work on this project's files.", "sh-dim"));
    // notes
    notes.area = h("textarea", { class: "notes-area", spellcheck: "true", placeholder: "Notes for this project: ideas, to-dos, links. Saved with the project as you type." });
    notes.area.addEventListener("input", () => { if (!A.project) return; A.project.notes = notes.area.value; A.persist(); notes.badge(); });
    body.append(h("div", { class: "panel-view", "data-panel": "notes" }, notes.area));
  }
  const notes = { area: null, badge() { const b = document.querySelector('.panel-tabs [data-panel="notes"]'); if (b) b.classList.toggle("has-notes", !!A.project?.notes?.trim()); } };

  /* =====================================================================
   * Focus timer
   * ===================================================================== */
  const focus = { end: A.LS.get("focusEnd", 0), mins: A.LS.get("focusMins", 25), kind: A.LS.get("focusKind", "focus"), timer: 0, el: null };
  function focusTick() {
    const left = focus.end - Date.now();
    if (!focus.el) return;
    if (!focus.end) { focus.el.classList.add("hidden"); return; }
    if (left <= 0) { finishFocus(); return; }
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    focus.el.classList.remove("hidden");
    focus.el.classList.toggle("break", focus.kind === "break");
    focus.el.replaceChildren(icon("clock"), h("span", {}, `${focus.kind === "break" ? "Break" : "Focus"} ${m}:${String(s).padStart(2, "0")}`));
    focus.el.title = `${focus.kind === "break" ? "Break" : "Focus"} until ${new Date(focus.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Click to stop.`;
  }
  function startFocus(mins, kind = "focus") {
    focus.end = Date.now() + mins * 60000; focus.mins = mins; focus.kind = kind;
    A.LS.set("focusEnd", focus.end); A.LS.set("focusMins", mins); A.LS.set("focusKind", kind);
    clearInterval(focus.timer); focus.timer = setInterval(focusTick, 1000); focusTick();
    if (kind === "focus" && "Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    toast(kind === "focus" ? `Focus for ${mins} minutes. Dexna will tell you when it is time for a break.` : `Break for ${mins} minutes.`, "ok");
  }
  function stopFocus(silent) {
    focus.end = 0; A.LS.set("focusEnd", 0); clearInterval(focus.timer); focusTick();
    if (!silent) toast("Timer stopped");
  }
  function chime() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880, 990].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.type = "sine"; g.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.18); g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + i * 0.18 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + i * 0.18 + 0.5); o.connect(g).connect(ac.destination); o.start(ac.currentTime + i * 0.18); o.stop(ac.currentTime + i * 0.18 + 0.55); });
      setTimeout(() => ac.close(), 1500);
    } catch (_) {}
  }
  function finishFocus() {
    const was = focus.kind;
    stopFocus(true);
    if (A.LS.get("focusSound", true)) chime();
    const msg = was === "focus" ? "Focus time is over. Take a short break." : "The break is over. Back to it!";
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) try { new Notification("Dexna", { body: msg }); } catch (_) {}
    if (was === "focus") {
      A.addFocusSession?.();
      A.confirmDialog({ title: "Time for a break", message: msg, okLabel: "Start a 5 minute break" }).then((ok) => ok && startFocus(5, "break"));
    } else A.confirmDialog({ title: "Break over", message: msg, okLabel: `Focus for ${focus.mins === 5 ? 25 : focus.mins} minutes` }).then((ok) => ok && startFocus(25));
  }
  function pickFocus() {
    if (focus.end) return A.quickPick({ placeholder: "A timer is running", source: () => [{ label: "Stop the timer", run: () => stopFocus() }, { label: "Restart it", run: () => startFocus(focus.mins, focus.kind) }] });
    A.quickPick({
      placeholder: "How long do you want to focus? (or type a number of minutes)",
      source: (q) => {
        const n = parseInt(q, 10);
        const list = [[25, "Pomodoro: 25 minutes, then a 5 minute break"], [50, "Deep work: 50 minutes"], [15, "Short: 15 minutes"], [90, "Long: 90 minutes"]];
        return [...(n > 0 && n <= 600 ? [[n, `${n} minutes`]] : []), ...list].map(([m, l]) => ({ label: l, run: () => startFocus(m) }));
      },
    });
  }

  /* =====================================================================
   * Coding activity
   * ===================================================================== */
  let act = A.LS.get("activity", {});
  let lastMinute = 0, saveTimer = 0;
  function recordEdit(path) {
    const minute = Math.floor(Date.now() / 60000);
    if (minute === lastMinute) return;
    lastMinute = minute;
    const k = dayKey(), d = (act[k] ||= { m: 0, l: {} });
    d.m++;
    const lang = A.langName(A.langOf(path)) || "Other";
    d.l[lang] = (d.l[lang] || 0) + 1;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const keys = Object.keys(act).sort();
      for (const old of keys.slice(0, Math.max(0, keys.length - 400))) delete act[old];
      A.LS.set("activity", act);
    }, 1500);
  }
  function addFocusSession() { const d = (act[dayKey()] ||= { m: 0, l: {} }); d.f = (d.f || 0) + 1; A.LS.set("activity", act); }
  A.addFocusSession = addFocusSession;
  function showActivity() {
    const today = new Date();
    const start = new Date(today); start.setDate(start.getDate() - 7 * 52 - start.getDay());
    const cells = [];
    let max = 1;
    for (const v of Object.values(act)) max = Math.max(max, v.m);
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const k = dayKey(d), m = act[k]?.m || 0, lvl = m ? Math.min(4, Math.ceil((m / max) * 4)) : 0;
      cells.push(h("i", { class: "hm-c l" + lvl, title: `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}: ${m ? fmtMin(m) + " of coding" : "no coding"}${act[k]?.f ? `, ${act[k].f} focus session${act[k].f > 1 ? "s" : ""}` : ""}` }));
    }
    const sum = (days) => { let m = 0; const d = new Date(today); for (let i = 0; i < days; i++) { m += act[dayKey(d)]?.m || 0; d.setDate(d.getDate() - 1); } return m; };
    const st = streaks(act, today);
    const langs = {};
    for (const v of Object.values(act)) for (const [l, n] of Object.entries(v.l || {})) langs[l] = (langs[l] || 0) + n;
    const top = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6), topMax = top[0]?.[1] || 1;
    const focusCount = Object.values(act).reduce((s, v) => s + (v.f || 0), 0);
    const tile = (n, l) => h("div", { class: "st-tile" }, h("b", {}, n), h("span", {}, l));
    A.openModal(h("div", { class: "modal act-modal" },
      h("div", { class: "modal-head" }, "Your coding activity"),
      h("div", { class: "modal-body" },
        h("div", { class: "st-tiles" }, tile(fmtMin(sum(1)), "today"), tile(fmtMin(sum(7)), "last 7 days"), tile(fmtMin(sum(30)), "last 30 days"),
          tile(`${st.current} day${st.current === 1 ? "" : "s"}`, "current streak"), tile(`${st.longest} day${st.longest === 1 ? "" : "s"}`, "longest streak"), tile(String(focusCount), "focus sessions")),
        h("div", { class: "hm-wrap" }, h("div", { class: "hm" }, cells)),
        h("div", { class: "hm-legend muted small" }, "Less", ...[0, 1, 2, 3, 4].map((l) => h("i", { class: "hm-c l" + l })), "More"),
        top.length ? h("div", { class: "act-langs" }, h("div", { class: "st-sub" }, "Languages"), top.map(([l, n]) => h("div", { class: "act-lang" }, h("span", {}, l), h("span", { class: "st-bar" }, h("i", { style: { width: Math.max(3, (n / topMax) * 100) + "%" } })), h("span", { class: "muted small" }, fmtMin(n))))) : h("p", { class: "muted" }, "Start typing in a file and your coding time shows up here."),
        h("p", { class: "muted small" }, "A minute counts when you type in it. This stays in your browser.")),
      h("div", { class: "modal-foot" },
        h("button", { class: "btn", style: { marginRight: "auto" }, onclick: async () => { A.closeModal(); if (await A.confirmDialog({ title: "Clear activity", message: "Forget all recorded coding time?", okLabel: "Clear", danger: true })) { act = {}; A.LS.set("activity", act); } } }, "Clear"),
        h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))));
    setTimeout(() => { const w = document.querySelector(".hm-wrap"); if (w) w.scrollLeft = w.scrollWidth; }, 0);
  }

  /* =====================================================================
   * Project templates
   * ===================================================================== */
  let templates = A.LS.get("templates", []);
  async function saveTemplate() {
    const name = await A.promptDialog({ title: "Save as template", message: "New projects can start from this one. The files are copied as they are now.", value: A.project.name, okLabel: "Save template" });
    if (!name?.trim()) return;
    const size = Object.values(A.project.files).reduce((s, t) => s + t.length, 0);
    if (size > 1_500_000) return toast("This project is too big to keep as a template (over 1.5 MB of text).", "error");
    const t = { id: Date.now().toString(36), name: name.trim(), files: { ...A.project.files }, entry: A.project.entry, created: Date.now() };
    templates = [...templates.filter((x) => x.name !== t.name), t];
    if (!A.LS.set("templates", templates)) { templates = templates.filter((x) => x !== t); return; }
    toast(`Saved "${t.name}". It is on the Home page under New project.`, "ok");
    A.refreshHome?.();
  }
  function fromTemplate(t) { A.createProject({ name: t.name, files: { ...t.files }, entry: t.entry }, t.name); toast(`New project from "${t.name}"`, "ok"); }
  function pickTemplate() {
    if (!templates.length) return toast("No templates yet. Use File > Save Project as Template first.");
    A.quickPick({ placeholder: "Start a new project from one of your templates", source: (q) => templates.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase())).map((t) => ({ label: t.name, desc: `${Object.keys(t.files).length} files`, run: () => fromTemplate(t) })) });
  }
  function deleteTemplate() {
    if (!templates.length) return toast("No templates to delete.");
    A.quickPick({ placeholder: "Delete a template", source: () => templates.map((t) => ({ label: t.name, desc: `${Object.keys(t.files).length} files`, run: async () => { if (!(await A.confirmDialog({ title: "Delete template", message: `Delete the template "${t.name}"? Projects made from it stay.`, okLabel: "Delete", danger: true }))) return; templates = templates.filter((x) => x !== t); A.LS.set("templates", templates); A.refreshHome?.(); } })) });
  }
  /** The Home page's "Your templates" block, or null. */
  function homeSection() {
    if (!templates.length) return null;
    return h("div", { class: "home-section" }, h("h2", {}, "Your templates"),
      h("div", { class: "lang-list" }, templates.map((t) => h("button", { class: "lang-row tpl-row", onclick: () => fromTemplate(t), title: Object.keys(t.files).join(", ") },
        h("span", { class: "fi", html: A.fileIconSvg(t.entry || Object.keys(t.files)[0] || "x.txt") }), h("span", { class: "ln" }, t.name), h("span", { class: "ld" }, `${Object.keys(t.files).length} file${Object.keys(t.files).length === 1 ? "" : "s"}`)))));
  }

  /* =====================================================================
   * Hooks
   * ===================================================================== */
  function onReady() {
    buildShell();
    const right = document.querySelector("#statusbar .right");
    focus.el = h("span", { class: "sb-item clickable hidden", id: "sb-focus", onclick: () => pickFocus() });
    right?.prepend(focus.el);
    if (focus.end > Date.now()) { focus.timer = setInterval(focusTick, 1000); focusTick(); } else if (focus.end) { focus.end = 0; A.LS.set("focusEnd", 0); }
    onProjectLoaded();
  }
  function onProjectLoaded() {
    sh.cwd = ""; updatePrompt();
    if (notes.area) { notes.area.value = A.project?.notes || ""; notes.badge(); }
  }
  function onRename(from, to) { if (sh.cwd === from || sh.cwd.startsWith(from + "/")) { sh.cwd = to + sh.cwd.slice(from.length); updatePrompt(); } }
  function onFilesChanged() { if (sh.cwd && !isDir(sh.cwd)) { sh.cwd = ""; updatePrompt(); } }

  const commands = [
    { id: "shell", label: "Open Shell", cat: "View", run: () => { A.showPanel("shell"); setTimeout(() => sh.input?.focus(), 0); } },
    { id: "notes", label: "Open Project Notes", cat: "View", run: () => { A.showPanel("notes"); setTimeout(() => notes.area?.focus(), 0); } },
    { id: "focus", label: "Focus Timer...", cat: "View", run: pickFocus },
    { id: "focus-stop", label: "Stop Focus Timer", cat: "View", run: () => (focus.end ? stopFocus() : toast("No timer is running.")) },
    { id: "focus-sound", label: "Toggle Focus Timer Sound", cat: "Preferences", run: () => { const on = !A.LS.get("focusSound", true); A.LS.set("focusSound", on); toast(on ? "The timer chimes when it ends" : "The timer is silent now"); } },
    { id: "activity", label: "Your Coding Activity", cat: "View", run: showActivity },
    { id: "tpl-save", label: "Save Project as Template...", cat: "File", run: saveTemplate },
    { id: "tpl-new", label: "New Project from Template...", cat: "File", run: pickTemplate },
    { id: "tpl-delete", label: "Delete a Template...", cat: "File", run: deleteTemplate },
  ];
  return { commands, onReady, onProjectLoaded, onRename, onFilesChanged, recordEdit, canPreview, previewPage, homeSection, exec, showActivity, startFocus, stopFocus, get templates() { return templates; } };
}
