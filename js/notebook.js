// Jupyter notebooks (.ipynb): code and Markdown cells, run one at a time or all together on the Python
// kernel (they share variables with the Python console), outputs under each cell (text, errors, plots,
// HTML tables), and saving back in the standard nbformat 4 layout so the file opens in Jupyter too.
import { renderMarkdown } from "./markdown.js";

const join = (src) => (Array.isArray(src) ? src.join("") : src || "");
const split = (text) => { const lines = text.split("\n"); return lines.map((l, i) => (i < lines.length - 1 ? l + "\n" : l)).filter((l, i, a) => l !== "" || i < a.length - 1); };
let nextId = 1;
const cellId = () => Math.random().toString(36).slice(2, 10);

/** Keep HTML outputs (pandas tables and the like) but drop anything that could run code. */
function safeHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, link, meta, base, form").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of [...el.attributes]) if (/^on/i.test(a.name) || (/^(href|src|xlink:href|action)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
  });
  return doc.body.firstChild.innerHTML;
}

export const EMPTY_NOTEBOOK = JSON.stringify({
  cells: [
    { cell_type: "markdown", id: cellId(), metadata: {}, source: ["# My notebook\n", "\n", "Shift+Enter runs a cell and moves to the next one."] },
    { cell_type: "code", id: cellId(), metadata: {}, execution_count: null, outputs: [], source: ["import math\n", "\n", "radius = 3\n", "area = math.pi * radius ** 2\n", "area"] },
  ],
  metadata: { kernelspec: { display_name: "Python 3 (Pyodide)", language: "python", name: "python3" }, language_info: { name: "python" } },
  nbformat: 4, nbformat_minor: 5,
}, null, 1) + "\n";

export function createNotebook(A) {
  const { h, toast } = A;
  let nb = null; // the notebook on screen: { path, meta, cells }
  let root = null, saveTimer = 0, counter = 0, running = false, stopRequested = false;

  /* ---------------------------------------------------------------- loading and saving */
  function parse(path) {
    let data;
    try { data = JSON.parse(A.textOf(path) || "{}"); }
    catch (e) { return { error: `This notebook is not valid JSON (${e.message}). Fix it as text, or close and reopen it.` }; }
    const cells = (data.cells || []).map((c) => ({
      key: nextId++, id: c.id || cellId(), type: c.cell_type === "markdown" || c.cell_type === "raw" ? (c.cell_type === "raw" ? "raw" : "markdown") : "code",
      src: join(c.source), outputs: (c.outputs || []).slice(), count: c.execution_count ?? null, metadata: c.metadata || {}, editing: false,
    }));
    if (!cells.length) cells.push(newCell("code"));
    counter = Math.max(0, ...cells.map((c) => c.count || 0));
    return { meta: data.metadata || {}, minor: data.nbformat_minor ?? 5, cells };
  }
  const newCell = (type, src = "") => ({ key: nextId++, id: cellId(), type, src, outputs: [], count: null, metadata: {}, editing: type !== "code" });
  function serialize() {
    return JSON.stringify({
      cells: nb.cells.map((c) => c.type === "code"
        ? { cell_type: "code", execution_count: c.count, id: c.id, metadata: c.metadata, outputs: c.outputs, source: split(c.src) }
        : { cell_type: c.type, id: c.id, metadata: c.metadata, source: split(c.src) }),
      metadata: nb.meta, nbformat: 4, nbformat_minor: Math.max(5, nb.minor),
    }, null, 1) + "\n";
  }
  function save(now = false) {
    clearTimeout(saveTimer);
    const write = () => { if (nb) A.writeFiles({ [nb.path]: serialize() }); };
    if (now) write(); else saveTimer = setTimeout(write, 400);
  }

  /* ---------------------------------------------------------------- outputs */
  function outputNode(o) {
    if (o.output_type === "stream") return h("pre", { class: "nb-out" + (o.name === "stderr" ? " nb-err" : "") }, join(o.text));
    if (o.output_type === "error") return h("pre", { class: "nb-out nb-err" }, (o.traceback || []).join("\n").replace(/\x1b\[[0-9;]*m/g, "") || `${o.ename}: ${o.evalue}`);
    const d = o.data || {};
    if (d["image/png"]) return h("img", { class: "nb-img", src: "data:image/png;base64," + join(d["image/png"]).replace(/\s/g, ""), alt: "Figure" });
    if (d["image/svg+xml"]) return h("div", { class: "nb-html", html: safeHtml(join(d["image/svg+xml"])) });
    if (d["text/html"]) return h("div", { class: "nb-html", html: safeHtml(join(d["text/html"])) });
    if (d["text/markdown"]) return h("div", { class: "nb-md", html: renderMarkdown(join(d["text/markdown"])) });
    if (d["text/plain"]) return h("pre", { class: "nb-out" }, join(d["text/plain"]));
    return h("pre", { class: "nb-out nb-dim" }, `(${Object.keys(d).join(", ") || "empty"} output)`);
  }
  /** Where a running cell's output goes: it stands in for the terminal while the cell runs. */
  function cellSink(cell, box) {
    const push = (o) => { cell.outputs.push(o); box.append(outputNode(o)); };
    const stream = (name, text) => {
      const last = cell.outputs[cell.outputs.length - 1];
      if (last?.output_type === "stream" && last.name === name) { last.text = join(last.text) + text; box.lastChild.textContent = last.text; }
      else push({ output_type: "stream", name, text });
    };
    let pending = null;
    return {
      write(text, kind = "stdout") { stream(kind === "stderr" ? "stderr" : "stdout", text); },
      system(text, cls) { if (cls === "stderr") stream("stderr", text + "\n"); },
      echo() {},
      clear() { cell.outputs = []; box.textContent = ""; },
      display({ html, text }) { push({ output_type: "execute_result", execution_count: cell.count, metadata: {}, data: { "text/html": html, "text/plain": text } }); },
      addPlot(b64) { push({ output_type: "display_data", metadata: {}, data: { "image/png": b64, "text/plain": "<Figure>" } }); },
      requestInput(done) {
        const input = h("input", { class: "nb-input", spellcheck: "false", placeholder: "Type and press Enter" });
        const row = h("div", { class: "nb-input-row" }, input);
        box.append(row);
        pending = (v) => { pending = null; row.remove(); if (v != null) stream("stdout", v + "\n"); done(v); };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); pending?.(input.value); } });
        setTimeout(() => input.focus(), 0);
      },
      get inputActive() { return !!pending; },
      resolveInput(v) { pending?.(v); },
    };
  }

  /* ---------------------------------------------------------------- running */
  async function runCell(cell, { advance = false } = {}) {
    if (cell.type !== "code") { cell.editing = false; renderCell(cell); if (advance) focusNext(cell); return true; }
    const el = cell.el;
    const box = el.querySelector(".nb-outputs");
    cell.outputs = []; box.textContent = "";
    cell.count = "*";
    el.querySelector(".nb-count").textContent = "[*]";
    el.classList.add("nb-running");
    const res = await A.runCell(cell.src, cellSink(cell, box));
    el.classList.remove("nb-running");
    if (!res) { cell.count = null; el.querySelector(".nb-count").textContent = "[ ]"; return false; }
    cell.count = ++counter;
    el.querySelector(".nb-count").textContent = `[${cell.count}]`;
    for (const o of cell.outputs) if (o.output_type === "execute_result") o.execution_count = cell.count;
    // an error becomes a proper "error" output, so Jupyter shows it as one too
    if (!res.ok) {
      const errs = cell.outputs.filter((o) => o.output_type === "stream" && o.name === "stderr");
      const text = errs.map((o) => join(o.text)).join("");
      const m = /(\w+(?:Error|Exception|Interrupt|Exit)): ?(.*)\s*$/.exec(text.trim());
      cell.outputs = cell.outputs.filter((o) => !errs.includes(o));
      cell.outputs.push({ output_type: "error", ename: m?.[1] || "Error", evalue: m?.[2] || "", traceback: text.trimEnd().split("\n") });
      box.textContent = ""; cell.outputs.forEach((o) => box.append(outputNode(o)));
    }
    el.querySelector(".nb-time").textContent = res.time != null ? `${res.time < 1 ? Math.round(res.time * 1000) + " ms" : res.time.toFixed(2) + " s"}` : "";
    save();
    if (advance) focusNext(cell);
    return res.ok;
  }
  async function runAll(from = 0) {
    if (running) return;
    running = true; stopRequested = false; render();
    try {
      for (const c of nb.cells.slice(from)) {
        if (stopRequested) break;
        if (c.type === "code" && !(await runCell(c))) break; // stop at the first error, as Jupyter does
      }
    } finally { running = false; render(); }
  }

  /* ---------------------------------------------------------------- editing */
  const editors = new Map(); // cell key -> Monaco editor
  function disposeEditors() { for (const e of editors.values()) e.dispose(); editors.clear(); }
  function focusNext(cell) {
    const i = nb.cells.indexOf(cell);
    if (i === nb.cells.length - 1) { insert(i + 1, "code"); return; }
    focusCell(nb.cells[i + 1]);
  }
  function focusCell(cell) {
    if (!cell) return;
    cell.el?.scrollIntoView({ block: "nearest" });
    const ed = editors.get(cell.key);
    if (ed) { ed.focus(); return; }
    if (cell.type !== "code" && !cell.editing) { cell.editing = true; renderCell(cell); editors.get(cell.key)?.focus(); }
  }
  function insert(i, type) {
    const c = newCell(type);
    nb.cells.splice(i, 0, c);
    render(); save(); focusCell(c);
  }
  function move(cell, d) {
    const i = nb.cells.indexOf(cell), j = i + d;
    if (j < 0 || j >= nb.cells.length) return;
    [nb.cells[i], nb.cells[j]] = [nb.cells[j], nb.cells[i]];
    render(); save();
  }
  function remove(cell) {
    const i = nb.cells.indexOf(cell);
    nb.cells.splice(i, 1);
    if (!nb.cells.length) nb.cells.push(newCell("code"));
    render(); save();
    focusCell(nb.cells[Math.min(i, nb.cells.length - 1)]);
  }
  function makeEditor(cell, host, language) {
    const ed = A.monaco.editor.create(host, {
      value: cell.src, language, automaticLayout: true, minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: "off", glyphMargin: false, folding: false,
      lineDecorationsWidth: 8, overviewRulerLanes: 0, renderLineHighlight: "none", wordWrap: "on", fontSize: A.settings.fontSize, fontFamily: getComputedStyle(document.documentElement).getPropertyValue("--mono"),
      scrollbar: { vertical: "hidden", horizontal: "auto", alwaysConsumeMouseWheel: false }, fixedOverflowWidgets: true, padding: { top: 6, bottom: 6 }, tabSize: 4, contextmenu: true,
    });
    const fit = () => { host.style.height = Math.max(32, ed.getContentHeight()) + "px"; ed.layout(); };
    ed.onDidContentSizeChange(fit); fit();
    ed.onDidChangeModelContent(() => { cell.src = ed.getValue(); save(); });
    const { KeyMod, KeyCode } = A.monaco;
    ed.addCommand(KeyMod.Shift | KeyCode.Enter, () => runCell(cell, { advance: true }));
    ed.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, () => runCell(cell));
    ed.addCommand(KeyMod.Alt | KeyCode.Enter, () => { runCell(cell); insert(nb.cells.indexOf(cell) + 1, "code"); });
    ed.addCommand(KeyCode.Escape, () => { if (cell.type !== "code") { cell.editing = false; renderCell(cell); } else ed.getContainerDomNode().blur(); });
    editors.set(cell.key, ed);
    return ed;
  }

  /* ---------------------------------------------------------------- drawing */
  function renderCell(cell) {
    const old = editors.get(cell.key);
    if (old) { old.dispose(); editors.delete(cell.key); }
    const el = cell.el || h("div", { class: "nb-cell" });
    el.className = `nb-cell nb-${cell.type}`;
    el.textContent = "";
    const tools = h("div", { class: "nb-tools" },
      cell.type === "code" ? h("button", { class: "btn icon sm", title: "Run (Ctrl+Enter)", onclick: () => runCell(cell) }, A.icon("play")) : null,
      h("button", { class: "btn icon sm", title: "Move up", onclick: () => move(cell, -1) }, "↑"),
      h("button", { class: "btn icon sm", title: "Move down", onclick: () => move(cell, 1) }, "↓"),
      h("button", { class: "btn sm", title: "Switch between code and Markdown", onclick: () => { cell.type = cell.type === "code" ? "markdown" : "code"; cell.outputs = []; cell.count = null; cell.editing = cell.type !== "code"; renderCell(cell); save(); } }, cell.type === "code" ? "Markdown" : "Code"),
      h("button", { class: "btn icon sm", title: "Delete cell", onclick: () => remove(cell) }, A.icon("trash")));
    const gutter = h("div", { class: "nb-gutter" }, h("span", { class: "nb-count" }, cell.type === "code" ? `[${cell.count ?? " "}]` : ""), h("span", { class: "nb-time" }));
    const body = h("div", { class: "nb-body" });
    if (cell.type === "code" || cell.editing) {
      const host = h("div", { class: "nb-editor" });
      body.append(host);
      queueMicrotask(() => makeEditor(cell, host, cell.type === "code" ? "python" : cell.type === "markdown" ? "markdown" : "plaintext"));
    } else {
      const md = h("div", { class: "nb-md", title: "Double-click to edit", html: cell.type === "markdown" ? renderMarkdown(cell.src || "*Empty Markdown cell. Double-click to write.*") : "" });
      if (cell.type === "raw") md.textContent = cell.src;
      md.addEventListener("dblclick", () => { cell.editing = true; renderCell(cell); setTimeout(() => editors.get(cell.key)?.focus(), 0); });
      body.append(md);
    }
    const outs = h("div", { class: "nb-outputs" });
    if (cell.type === "code") cell.outputs.forEach((o) => outs.append(outputNode(o)));
    body.append(outs);
    el.append(gutter, body, tools);
    cell.el = el;
    return el;
  }
  function render() {
    if (!root || !nb) return;
    disposeEditors();
    const bar = h("div", { class: "nb-bar" },
      h("button", { class: "btn sm primary", disabled: running, onclick: () => runAll() }, A.icon("play"), "Run all"),
      running ? h("button", { class: "btn sm", onclick: () => { stopRequested = true; A.stop(); } }, A.icon("stop"), "Stop") : null,
      h("button", { class: "btn sm", disabled: running, onclick: async () => { if (!(await A.restartKernel())) return; counter = 0; for (const c of nb.cells) { c.count = null; c.outputs = []; } render(); runAll(); } }, A.icon("refresh"), "Restart and run all"),
      h("button", { class: "btn sm", onclick: () => { for (const c of nb.cells) { c.outputs = []; c.count = null; } counter = 0; render(); save(); } }, A.icon("clear"), "Clear outputs"),
      h("span", { class: "nb-spacer" }),
      h("button", { class: "btn sm", onclick: () => insert(nb.cells.length, "code") }, A.icon("plus"), "Code"),
      h("button", { class: "btn sm", onclick: () => insert(nb.cells.length, "markdown") }, A.icon("plus"), "Markdown"),
      h("button", { class: "btn sm ghost", title: "Edit the notebook's JSON", onclick: () => { const path = nb.path; hide(); A.showAsText?.(path); } }, "Open as text"));
    const list = h("div", { class: "nb-cells" });
    nb.cells.forEach((c, i) => {
      list.append(renderCell(c));
      list.append(h("div", { class: "nb-add" }, h("button", { class: "btn sm ghost", onclick: () => insert(i + 1, "code") }, "+ Code"), h("button", { class: "btn sm ghost", onclick: () => insert(i + 1, "markdown") }, "+ Markdown")));
    });
    root.replaceChildren(bar, list);
  }

  function show(path) {
    if (nb?.path === path && root && !root.classList.contains("hidden")) return;
    const parsed = parse(path);
    if (!root) {
      root = h("div", { id: "notebook", class: "notebook hidden" });
      document.getElementById("editor-wrap").append(root);
    }
    root.classList.remove("hidden");
    if (parsed.error) { nb = null; disposeEditors(); root.replaceChildren(h("div", { class: "nb-error" }, h("p", {}, parsed.error), h("button", { class: "btn sm", onclick: () => { hide(); A.showAsText?.(path); } }, "Open as text"))); return; }
    nb = { path, ...parsed };
    render();
  }
  function hide() {
    if (!root) return;
    if (nb) save(true);
    root.classList.add("hidden");
    disposeEditors();
    nb = null;
  }

  return {
    /** Called whenever a file is opened: notebooks get the notebook view, everything else the editor. */
    onOpen(path) { if (path?.endsWith(".ipynb") && !A.textMode?.(path)) show(path); else hide(); },
    hide, get active() { return !!nb; },
    commands: [
      { id: "nb-new", label: "New Jupyter Notebook", cat: "File", run: async () => {
        const name = await A.promptDialog({ title: "New notebook", message: "File name", value: "notebook.ipynb", select: [0, 8] });
        if (!name) return;
        const path = name.endsWith(".ipynb") ? name : name + ".ipynb";
        if (A.currentFiles()[path] != null) return toast(`${path} already exists`, "warn");
        A.writeFiles({ [path]: EMPTY_NOTEBOOK });
        A.rerenderFiles?.();
        A.openFile(path);
      } },
      { id: "nb-run-all", label: "Notebook: Run All Cells", cat: "Run", run: () => (nb ? runAll() : toast("Open a notebook first.", "info")) },
    ],
  };
}
