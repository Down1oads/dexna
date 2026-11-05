// Dexna: a Python IDE in the browser.
import { PyClient } from "./pyclient.js";
import { icon, iconSvg, fileIcon as fileBadge, fileIconSvg } from "./icons.js";
import { Terminal } from "./terminal.js";
import { EXAMPLES, BLANK } from "./examples.js";
import { createZip, readZip } from "./zip.js";

/* =====================================================================
 * Small DOM helpers
 * ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = () => { clearTimeout(t); fn(); }; return d; };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const basename = (p) => p.slice(p.lastIndexOf("/") + 1);
const dirname = (p) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const kbLabel = (kb) => !kb ? "" : kb.split(" ").map((c) => c.split("+").map((k) => ({ ctrl: isMac ? "⌘" : "Ctrl", shift: "Shift", alt: isMac ? "⌥" : "Alt" }[k] || (k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1)))).join("+")).join(" ");
const cfg = window.DEXNA_CONFIG;

/* =====================================================================
 * Persistence
 * ===================================================================== */
const LS = {
  get(k, d) { try { const v = localStorage.getItem("dexna:" + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem("dexna:" + k, JSON.stringify(v)); return true; } catch (_) { toast("Browser storage is full. Download your project to keep it safe.", "error"); return false; } },
  del(k) { try { localStorage.removeItem("dexna:" + k); } catch (_) {} },
};

const DEFAULT_SETTINGS = {
  theme: "dark", fontSize: 14, fontLigatures: true, tabSize: 4, wordWrap: false, minimap: true,
  stickyScroll: true, renderWhitespace: "selection", lineLength: 88, formatOnSave: false,
  autoLint: true, autoInstall: true, clearOnRun: false, bracketColors: true, inlineplots: true,
};
const settings = { ...DEFAULT_SETTINGS, ...LS.get("settings", {}) };
const layout = { sidebarWidth: 260, panelHeight: 270, view: "explorer", panel: "terminal", sidebar: true, panelOpen: true, ...LS.get("layout", {}) };
const saveLayout = debounce(() => LS.set("layout", layout), 300);
let projectsIndex = LS.get("projects", []);
let project = null;

const newId = () => Math.random().toString(36).slice(2, 10);

function makeProject(tpl, name) {
  const files = { ...tpl.files };
  const entry = tpl.entry && files[tpl.entry] != null ? tpl.entry : Object.keys(files).find((f) => f.endsWith(".py")) || null;
  const dirs = new Set();
  for (const f of Object.keys(files)) { let d = dirname(f); while (d) { dirs.add(d); d = dirname(d); } }
  return {
    id: newId(), name: name || tpl.name, files, dirs: [], entry, pinEntry: false,
    open: entry ? [entry] : [], active: entry, breakpoints: structuredClone(tpl.breakpoints || {}),
    packages: [...(tpl.packages || [])], watches: [], expanded: [...dirs], created: Date.now(),
  };
}

const persistProject = debounce(() => {
  if (!project) return;
  project.updated = Date.now();
  LS.set("project:" + project.id, project);
  const meta = projectsIndex.find((p) => p.id === project.id);
  if (meta) { meta.name = project.name; meta.updated = project.updated; }
  LS.set("projects", projectsIndex);
  LS.set("current", project.id);
}, 400);

/* =====================================================================
 * Toasts, menus & dialogs
 * ===================================================================== */
function toast(msg, kind = "info", ms = 3500) {
  const el = h("div", { class: "toast " + kind }, msg);
  $("#toasts").append(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, ms);
}

const ctx = $("#ctxmenu");
let menuCloser = null;
function showMenu(x, y, items, anchor) {
  ctx.textContent = "";
  for (const it of items) {
    if (it === "-") { ctx.append(h("hr")); continue; }
    ctx.append(h("button", { disabled: it.disabled, onclick: () => { hideMenu(); it.run(); } },
      h("span", {}, it.label), h("span", { class: "kb" }, kbLabel(it.kb))));
  }
  ctx.classList.remove("hidden");
  const r = ctx.getBoundingClientRect();
  ctx.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + "px";
  ctx.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + "px";
  menuCloser = (e) => { if (!ctx.contains(e.target) && e.target !== anchor) hideMenu(); };
  setTimeout(() => document.addEventListener("mousedown", menuCloser), 0);
}
function hideMenu() {
  ctx.classList.add("hidden");
  $$(".menus > button.open").forEach((b) => b.classList.remove("open"));
  if (menuCloser) document.removeEventListener("mousedown", menuCloser);
  menuCloser = null;
}

const overlay = $("#overlay");
let closeOverlay = null;
function openModal(node, onClose) {
  overlay.textContent = "";
  overlay.append(node);
  overlay.classList.remove("hidden");
  closeOverlay = () => { overlay.classList.add("hidden"); overlay.textContent = ""; closeOverlay = null; onClose?.(); };
}
overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) closeOverlay?.(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && closeOverlay) { e.preventDefault(); closeOverlay(); } });

function promptDialog({ title, message, value = "", placeholder = "", okLabel = "OK", select }) {
  return new Promise((resolve) => {
    let done = false;
    const input = h("input", { value, placeholder, spellcheck: "false" });
    const finish = (v) => { if (done) return; done = true; closeOverlay?.(); resolve(v); };
    const node = h("div", { class: "modal" },
      h("div", { class: "modal-head" }, title),
      h("div", { class: "modal-body" }, message ? h("p", {}, message) : null, input),
      h("div", { class: "modal-foot" },
        h("button", { class: "btn", onclick: () => finish(null) }, "Cancel"),
        h("button", { class: "btn primary", onclick: () => finish(input.value.trim()) }, okLabel)));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); finish(input.value.trim()); } });
    openModal(node, () => finish(null));
    input.focus();
    if (select) input.setSelectionRange(...select); else input.select();
  });
}

function confirmDialog({ title, message, okLabel = "OK", danger }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; closeOverlay?.(); resolve(v); };
    const ok = h("button", { class: "btn primary", style: danger ? { background: "var(--stop)" } : null, onclick: () => finish(true) }, okLabel);
    openModal(h("div", { class: "modal" },
      h("div", { class: "modal-head" }, title),
      h("div", { class: "modal-body" }, h("p", {}, message)),
      h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => finish(false) }, "Cancel"), ok)), () => finish(false));
    ok.focus();
  });
}

function fuzzy(query, text) {
  if (!query) return { score: 0, idx: [] };
  const q = query.toLowerCase(), t = text.toLowerCase();
  const sub = t.indexOf(q);
  if (sub >= 0) return { score: 1000 - sub - t.length * 0.01, idx: [...q].map((_, i) => sub + i) };
  let ti = 0, score = 0, prev = -2; const idx = [];
  for (const ch of q) {
    const f = t.indexOf(ch, ti);
    if (f < 0) return null;
    score += f === prev + 1 ? 5 : 1;
    if (f === 0 || "/_-. ".includes(t[f - 1])) score += 3;
    idx.push(f); prev = f; ti = f + 1;
  }
  return { score, idx };
}
function highlight(text, idx) {
  if (!idx?.length) return esc(text);
  const set = new Set(idx);
  return [...text].map((c, i) => (set.has(i) ? `<b class="match">${esc(c)}</b>` : esc(c))).join("");
}

/** Generic quick-pick. `source(query)` returns items {label, desc, detail, run}. */
function quickPick({ placeholder, source, value = "" }) {
  const input = h("input", { placeholder, value, spellcheck: "false" });
  const list = h("div", { class: "qp-list" });
  let items = [], active = 0;
  const render = () => {
    items = source(input.value);
    active = Math.min(active, Math.max(0, items.length - 1));
    list.textContent = "";
    items.slice(0, 200).forEach((it, i) => {
      const row = h("div", { class: "qp-item" + (i === active ? " active" : ""), onmousedown: (e) => { e.preventDefault(); pick(i); } },
        it.iconHtml ? h("span", { class: "fi", html: it.iconHtml }) : null,
        h("span", { html: it.labelHtml || esc(it.label) }),
        it.detail ? h("span", { class: "qdesc" }, it.detail) : null,
        it.desc ? h("span", { class: "qd" }, it.desc) : null);
      list.append(row);
    });
    if (!items.length) list.append(h("div", { class: "empty" }, "No matching results"));
    list.children[active]?.scrollIntoView({ block: "nearest" });
  };
  const pick = (i) => { const it = items[i]; closeOverlay?.(); if (it) setTimeout(() => it.run(input.value), 0); };
  input.addEventListener("input", () => { active = 0; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(items.length - 1, active + 1); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(0, active - 1); render(); }
    else if (e.key === "Enter") { e.preventDefault(); pick(active); }
  });
  openModal(h("div", { class: "modal qp" }, input, list));
  render();
  input.focus();
  input.setSelectionRange(value.length, value.length);
}

/* =====================================================================
 * Globals filled during boot
 * ===================================================================== */
let monaco, editor;
const models = new Map(); // project path -> model
const extModels = new Map(); // absolute path -> read-only model
const viewStates = new Map();
const bpDecos = new Map(); // path -> decoration ids
const cellDecos = new Map();
const symbolsCache = new Map();
let kernel, lsp;
let lspReady = false;
let kernelInfo = null;
const kernelInstalled = new Set();
let suppressModelEvents = false;

const terminal = new Terminal($("#terminal"), { onLocation: openLocation, canOpen: (f) => f in (project?.files || {}) });
const consoleTerm = new Terminal($("#console"), { onLocation: openLocation, canOpen: (f) => f in (project?.files || {}) });
let sink = terminal; // where kernel output goes

function openLocation(file, line) {
  if (project.files[file] != null) openFile(file, { line });
  else toast(`${file} is not part of the project`);
}

/* =====================================================================
 * Languages
 * ===================================================================== */
const LANGS = { py: "python", pyi: "python", json: "json", md: "markdown", js: "javascript", ts: "typescript", html: "html", css: "css",
  yml: "yaml", yaml: "yaml", toml: "ini", ini: "ini", cfg: "ini", sql: "sql", sh: "shell", xml: "xml", csv: "plaintext", txt: "plaintext" };
const langOf = (p) => LANGS[p.split(".").pop().toLowerCase()] || "plaintext";
const fileIcon = (p) => { const el = h("span", { class: "fi" }); el.append(fileBadge(p)); return el; };
const fi = (name, cls = "") => { const el = h("span", { class: "fi " + cls }); el.append(icon(name)); return el; };

/* =====================================================================
 * Monaco
 * ===================================================================== */
function loadMonaco() {
  return new Promise((resolve, reject) => {
    const base = new URL(cfg.monaco, location.href).href;
    window.MonacoEnvironment = {
      getWorkerUrl: () => new URL(`monaco-worker.js?base=${encodeURIComponent(base)}`, import.meta.url).href,
    };
    window.require.config({ paths: { vs: base + "vs" } });
    window.require(["vs/editor/editor.main"], () => resolve(window.monaco), reject);
  });
}

function defineThemes() {
  monaco.editor.defineTheme("dexna-dark", {
    base: "vs-dark", inherit: true,
    rules: [
      { token: "comment", foreground: "6b7394", fontStyle: "italic" },
      { token: "keyword", foreground: "c586c0" },
      { token: "string", foreground: "a5e075" },
      { token: "number", foreground: "f78c6c" },
      { token: "type", foreground: "ffcb6b" },
      { token: "identifier", foreground: "d6dae4" },
      { token: "delimiter", foreground: "89ddff" },
      { token: "tag", foreground: "f07178" },
    ],
    colors: {
      "editor.background": "#0f1117", "editor.foreground": "#d6dae4", "editorLineNumber.foreground": "#3d4458",
      "editorLineNumber.activeForeground": "#a0a8bd", "editor.lineHighlightBackground": "#161a24", "editor.selectionBackground": "#4c8dff40",
      "editorCursor.foreground": "#7aa9ff", "editorIndentGuide.background1": "#1f2430", "editorIndentGuide.activeBackground1": "#3a4155",
      "editorWidget.background": "#1b1f2a", "editorWidget.border": "#2a3040", "editorSuggestWidget.background": "#1b1f2a",
      "editorSuggestWidget.selectedBackground": "#2d3446", "editorHoverWidget.background": "#1b1f2a", "minimap.background": "#0f1117",
      "editorGutter.background": "#0f1117", "editorStickyScroll.background": "#131620", "scrollbarSlider.background": "#ffffff14",
    },
  });
  monaco.editor.defineTheme("dexna-light", {
    base: "vs", inherit: true,
    rules: [
      { token: "comment", foreground: "8a91a3", fontStyle: "italic" },
      { token: "keyword", foreground: "a626a4" },
      { token: "string", foreground: "16803c" },
      { token: "number", foreground: "c2410c" },
      { token: "type", foreground: "b45309" },
    ],
    colors: { "editor.background": "#f7f7fa", "editor.lineHighlightBackground": "#eef0f6", "editorGutter.background": "#f7f7fa", "minimap.background": "#f7f7fa" },
  });
}

const resolvedTheme = () => settings.theme === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : settings.theme;
function applyTheme() {
  const t = resolvedTheme();
  document.documentElement.dataset.theme = t;
  $('meta[name="theme-color"]').content = t === "dark" ? "#0f1117" : "#f7f7fa";
  monaco?.editor.setTheme(t === "dark" ? "dexna-dark" : "dexna-light");
}
matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => settings.theme === "auto" && applyTheme());

function editorOptions() {
  return {
    fontSize: settings.fontSize, fontLigatures: settings.fontLigatures,
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue("--mono"),
    tabSize: settings.tabSize, insertSpaces: true, detectIndentation: false,
    wordWrap: settings.wordWrap ? "on" : "off", minimap: { enabled: settings.minimap && innerWidth > 760, renderCharacters: false, scale: 1 },
    stickyScroll: { enabled: settings.stickyScroll }, renderWhitespace: settings.renderWhitespace,
    bracketPairColorization: { enabled: settings.bracketColors }, guides: { bracketPairs: "active", indentation: true },
  };
}

function createEditor() {
  editor = monaco.editor.create($("#editor"), {
    model: null, automaticLayout: true, glyphMargin: true, fixedOverflowWidgets: true, smoothScrolling: true,
    cursorBlinking: "smooth", cursorSmoothCaretAnimation: "on", mouseWheelZoom: true, padding: { top: 8 },
    scrollBeyondLastLine: true, renderLineHighlight: "all", suggest: { showStatusBar: true, preview: true }, suggestLineHeight: 24,
    inlineSuggest: { enabled: true }, linkedEditing: true, formatOnPaste: false, lightbulb: { enabled: "on" },
    "semanticHighlighting.enabled": true, quickSuggestionsDelay: 80, ...editorOptions(),
  });

  editor.onDidChangeCursorPosition(() => { updateCursorStatus(); updateBreadcrumbs(); highlightOutline(); });
  editor.onDidChangeCursorSelection(updateCursorStatus);

  // breakpoints in the glyph margin
  const hint = editor.createDecorationsCollection();
  editor.onMouseMove((e) => {
    const t = e.target;
    if (t.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && currentPath()) {
      const ln = t.position.lineNumber;
      hint.set((project.breakpoints[currentPath()] || []).includes(ln) ? [] : [{ range: new monaco.Range(ln, 1, ln, 1), options: { glyphMarginClassName: "dx-bp-hint" } }]);
    } else hint.clear();
  });
  editor.onMouseLeave(() => hint.clear());
  editor.onMouseDown((e) => {
    if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && currentPath()) {
      toggleBreakpoint(currentPath(), e.target.position.lineNumber);
      hint.clear();
    }
  });

  // let Ctrl+click / F12 into other files open real tabs
  monaco.editor.registerEditorOpener({
    openCodeEditor(_src, resource, sel) {
      const key = keyForUri(resource);
      if (!key) return false;
      const pos = sel && ("startLineNumber" in sel ? { line: sel.startLineNumber, col: sel.startColumn } : { line: sel.lineNumber, col: sel.column });
      openFile(key, pos || {});
      return true;
    },
  });

  runCellCommand = editor.addCommand(0, (_a, line, below) => runCell(line, below));
}

function uriFor(path) { return monaco.Uri.from({ scheme: "file", path: "/project/" + path }); }
function keyForUri(uri) {
  if (uri.path.startsWith("/project/")) return decodeURIComponent(uri.path.slice(9));
  if (uri.path.startsWith("/ext/")) return "ext:" + uri.path.slice(4);
  return null;
}
const pathOfModel = (m) => (m && m.uri.path.startsWith("/project/") ? m.uri.path.slice(9) : null);
const currentPath = () => pathOfModel(editor?.getModel());

/** Smallest single edit turning the model's text into `text` (keeps breakpoints, folds & cursor stable). */
function minimalEdit(model, text) {
  const a = model.getLinesContent(), b = text.split("\n");
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  if (s === a.length && s === b.length) return null;
  let e = 0;
  while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  const midA = a.slice(s, a.length - e), midB = b.slice(s, b.length - e);
  if (!midA.length) {
    // pure insertion of lines before line s+1
    if (s < a.length) return { range: new monaco.Range(s + 1, 1, s + 1, 1), text: midB.join("\n") + "\n" };
    return { range: new monaco.Range(s, a[s - 1].length + 1, s, a[s - 1].length + 1), text: "\n" + midB.join("\n") };
  }
  const endLine = s + midA.length;
  if (!midB.length) {
    if (endLine < a.length) return { range: new monaco.Range(s + 1, 1, endLine + 1, 1), text: "" };
    return { range: new monaco.Range(Math.max(1, s), s ? a[s - 1].length + 1 : 1, endLine, a[endLine - 1].length + 1), text: "" };
  }
  return { range: new monaco.Range(s + 1, 1, endLine, a[endLine - 1].length + 1), text: midB.join("\n") };
}
function applyText(model, text, source = "dexna") {
  const ed = minimalEdit(model, text);
  if (!ed) return false;
  if (editor.getModel() === model) { editor.pushUndoStop(); editor.executeEdits(source, [ed]); editor.pushUndoStop(); }
  else model.pushEditOperations([], [ed], () => null);
  return true;
}

function ensureModel(path) {
  let m = models.get(path);
  if (m) return m;
  m = monaco.editor.createModel(project.files[path] ?? "", langOf(path), uriFor(path));
  m.updateOptions({ tabSize: settings.tabSize, insertSpaces: true });
  models.set(path, m);
  m.onDidChangeContent((ev) => onModelChange(path, m, ev));
  renderBreakpointDecos(path);
  updateCellDecos(path);
  return m;
}

function disposeModel(path) {
  const m = models.get(path);
  if (!m) return;
  m.dispose();
  models.delete(path);
  viewStates.delete(path);
  bpDecos.delete(path);
  cellDecos.delete(path);
  symbolsCache.delete(path);
}

const lspWriters = new Map();
function onModelChange(path, model, ev) {
  if (suppressModelEvents) return;
  project.files[path] = model.getValue();
  persistProject();
  if (bpDecos.get(path)?.length) syncBreakpointsFromDecos(path);
  clearRuntimeError(path);
  if (!lspWriters.has(path)) lspWriters.set(path, debounce(() => lspSyncFile(path), 350));
  lspWriters.get(path)();
  if (path.endsWith(".py")) { scheduleLint(path); scheduleCells(path); }
  if (path === currentPath()) scheduleOutline();
}

/* =====================================================================
 * Projects
 * ===================================================================== */
function closeAllModels() {
  for (const p of [...models.keys()]) disposeModel(p);
  for (const m of extModels.values()) m.dispose();
  extModels.clear();
}

async function loadProject(id) {
  const data = LS.get("project:" + id, null);
  if (!data) return false;
  persistProject.flush?.();
  if (project) saveViewState();
  closeAllModels();
  project = data;
  project.dirs ||= []; project.breakpoints ||= {}; project.packages ||= []; project.watches ||= []; project.expanded ||= [];
  project.open = (project.open || []).filter((p) => project.files[p] != null);
  if (!project.files[project.active]) project.active = project.open[0] || null;
  LS.set("current", id);
  for (const p of Object.keys(project.files)) ensureModel(p);
  renderProjectSelect();
  renderTree();
  renderTabs();
  if (project.active) openFile(project.active, { focus: false });
  else showWelcome(true);
  renderPackagesView();
  renderDebugView();
  updateRunTarget();
  plotsClear();
  if (lspReady) lspSyncAll();
  if (kernel?.info) syncKernelProject();
  return true;
}

function createProject(tpl, name) {
  const p = makeProject(tpl, name);
  projectsIndex.push({ id: p.id, name: p.name, updated: Date.now() });
  LS.set("project:" + p.id, p);
  LS.set("projects", projectsIndex);
  loadProject(p.id);
  return p;
}

async function newProject() {
  const name = await promptDialog({ title: "New project", value: "My project", okLabel: "Create" });
  if (name) createProject(BLANK, name);
}

async function renameProject() {
  const name = await promptDialog({ title: "Rename project", value: project.name, okLabel: "Rename" });
  if (!name) return;
  project.name = name;
  persistProject();
  persistProject.flush();
  renderProjectSelect();
}

async function deleteProject() {
  if (!(await confirmDialog({ title: "Delete project", message: `Delete "${project.name}" and all of its files? This cannot be undone.`, okLabel: "Delete", danger: true }))) return;
  const id = project.id;
  LS.del("project:" + id);
  projectsIndex = projectsIndex.filter((p) => p.id !== id);
  LS.set("projects", projectsIndex);
  project = null;
  if (projectsIndex.length) loadProject(projectsIndex.sort((a, b) => b.updated - a.updated)[0].id);
  else createProject(EXAMPLES[0]);
}

function renderProjectSelect() {
  const sel = $("#project-select");
  sel.textContent = "";
  for (const p of [...projectsIndex].sort((a, b) => a.name.localeCompare(b.name))) sel.append(h("option", { value: p.id, selected: p.id === project.id }, p.name));
  sel.append(h("option", { value: "__new" }, "New project..."), h("option", { value: "__example" }, "Open example..."));
  document.title = `${project.name} - Dexna`;
}
$("#project-select").addEventListener("change", (e) => {
  const v = e.target.value;
  e.target.value = project.id;
  if (v === "__new") newProject();
  else if (v === "__example") showExamples();
  else if (v !== project.id) { persistProject.flush(); loadProject(v); }
});

function showExamples() {
  const grid = h("div", { class: "examples-grid" }, EXAMPLES.map((ex) =>
    h("button", { class: "ex-card", onclick: () => { closeOverlay(); createProject(ex); toast(`Opened ${ex.name}. Press F5 to run.`, "ok"); } },
      h("b", {}, ex.name), h("span", {}, ex.desc))));
  openModal(h("div", { class: "modal", style: { width: "min(760px, calc(100vw - 32px))" } },
    h("div", { class: "modal-head" }, "Open an example project"),
    h("div", { class: "modal-body" }, h("p", {}, "Each example opens as a new project; your current work is kept."), grid)));
}

/* =====================================================================
 * Files: create / rename / delete / move
 * ===================================================================== */
function validPath(p) {
  p = p.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  if (!p || p.split("/").some((s) => s === "." || s === ".." || !s)) return null;
  return p;
}
const exists = (p) => project.files[p] != null || project.dirs.includes(p) || Object.keys(project.files).some((f) => f.startsWith(p + "/"));

function addDirs(p) { let d = p; while (d) { if (!project.dirs.includes(d)) project.dirs.push(d); d = dirname(d); } }

function createFile(path, content = "", { open = true } = {}) {
  path = validPath(path);
  if (!path) return toast("Invalid file name", "error");
  if (exists(path)) return toast(`${path} already exists`, "error");
  project.files[path] = content;
  addDirs(dirname(path));
  expandTo(path);
  ensureModel(path);
  lspSyncFile(path);
  persistProject();
  renderTree();
  if (open) openFile(path);
  if (path.endsWith(".py")) scheduleLint(path);
  return path;
}

function selectedDir() {
  const sel = treeSelection;
  if (!sel) return "";
  return project.files[sel] != null ? dirname(sel) : sel;
}

async function newFileDialog(dir = selectedDir()) {
  const prefix = dir ? dir + "/" : "";
  const v = await promptDialog({ title: "New file", message: "Use slashes to create folders, e.g. utils/helpers.py", value: prefix + "untitled.py", select: [prefix.length, prefix.length + 8], okLabel: "Create" });
  if (v) createFile(v.includes(".") || v.endsWith("/") ? v : v + ".py", v.endsWith(".py") || !v.includes(".") ? "" : "");
}

async function newFolderDialog(dir = selectedDir()) {
  const prefix = dir ? dir + "/" : "";
  const v = await promptDialog({ title: "New folder", value: prefix + "package", select: [prefix.length, prefix.length + 7], okLabel: "Create" });
  const p = v && validPath(v);
  if (!p) return;
  if (exists(p)) return toast(`${p} already exists`, "error");
  addDirs(p);
  expandTo(p + "/x");
  persistProject();
  renderTree();
}

function movePath(from, to) {
  to = validPath(to);
  if (!to || to === from) return false;
  if (to.startsWith(from + "/")) { toast("Can't move a folder into itself", "error"); return false; }
  if (exists(to)) { toast(`${to} already exists`, "error"); return false; }
  const isFile = project.files[from] != null;
  const mapping = [];
  if (isFile) mapping.push([from, to]);
  else for (const f of Object.keys(project.files)) if (f.startsWith(from + "/")) mapping.push([f, to + f.slice(from.length)]);
  const activeKey = project.active;
  for (const [a, b] of mapping) {
    const m = models.get(a);
    const content = m ? m.getValue() : project.files[a];
    delete project.files[a];
    project.files[b] = content;
    if (project.breakpoints[a]) { project.breakpoints[b] = project.breakpoints[a]; delete project.breakpoints[a]; }
    if (project.entry === a) project.entry = b;
    project.open = project.open.map((o) => (o === a ? b : o));
    if (project.active === a) project.active = b;
    disposeModel(a);
    ensureModel(b);
    lsp?.call("remove", { path: a }).catch(() => {});
    lspSyncFile(b);
  }
  if (!isFile) {
    project.dirs = project.dirs.map((d) => (d === from || d.startsWith(from + "/") ? to + d.slice(from.length) : d));
    project.expanded = project.expanded.map((d) => (d === from || d.startsWith(from + "/") ? to + d.slice(from.length) : d));
  }
  addDirs(dirname(to));
  persistProject();
  renderTree();
  renderTabs();
  if (activeKey !== project.active || mapping.some(([a]) => a === activeKey)) openFile(project.active, { focus: false });
  updateRunTarget();
  renderDebugView();
  mapping.forEach(([, b]) => b.endsWith(".py") && scheduleLint(b));
  return true;
}

async function renameDialog(path) {
  const base = basename(path);
  const dot = base.lastIndexOf(".");
  const start = path.length - base.length;
  const to = await promptDialog({ title: "Rename", value: path, select: [start, dot > 0 && project.files[path] != null ? start + dot : path.length], okLabel: "Rename" });
  if (to && to !== path) movePath(path, to);
}

async function deletePath(path) {
  const isFile = project.files[path] != null;
  if (!(await confirmDialog({ title: "Delete", message: `Delete ${isFile ? "file" : "folder"} "${path}"${isFile ? "" : " and everything inside it"}?`, okLabel: "Delete", danger: true }))) return;
  const files = isFile ? [path] : Object.keys(project.files).filter((f) => f.startsWith(path + "/"));
  for (const f of files) {
    delete project.files[f];
    delete project.breakpoints[f];
    if (project.open.includes(f)) closeTab(f, { silent: true });
    disposeModel(f);
    lsp?.call("remove", { path: f }).catch(() => {});
  }
  if (!isFile) project.dirs = project.dirs.filter((d) => d !== path && !d.startsWith(path + "/"));
  if (project.entry && project.files[project.entry] == null) project.entry = null;
  persistProject();
  renderTree();
  renderTabs();
  updateRunTarget();
  refreshProblems();
}

function duplicateFile(path) {
  const dot = path.lastIndexOf(".");
  let n = 1, cand;
  do { cand = dot > path.lastIndexOf("/") ? `${path.slice(0, dot)}_copy${n > 1 ? n : ""}${path.slice(dot)}` : `${path}_copy${n > 1 ? n : ""}`; n++; } while (exists(cand));
  createFile(cand, models.get(path)?.getValue() ?? project.files[path]);
}

function downloadBlob(blob, name) {
  const a = h("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
function downloadProject() { downloadBlob(createZip(project.files, slug(project.name)), slug(project.name) + ".zip"); }
function downloadFile(path) { downloadBlob(new Blob([project.files[path]], { type: "text/plain" }), basename(path)); }

async function readUploads(fileList, dir = "") {
  let added = 0, skipped = 0;
  for (const f of fileList) {
    if (f.name.toLowerCase().endsWith(".zip")) { await importZip(f); continue; }
    if (f.size > 2_000_000) { skipped++; continue; }
    const buf = new Uint8Array(await f.arrayBuffer());
    if (buf.subarray(0, 8000).includes(0)) { skipped++; continue; }
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (_) { skipped++; continue; }
    const rel = (f.webkitRelativePath || f.name);
    let path = validPath((dir ? dir + "/" : "") + rel);
    if (!path) continue;
    if (project.files[path] != null) { models.get(path)?.setValue(text); added++; continue; }
    if (createFile(path, text, { open: added === 0 })) added++;
  }
  if (added) toast(`Added ${added} file${added > 1 ? "s" : ""}`, "ok");
  if (skipped) toast(`Skipped ${skipped} binary or large file${skipped > 1 ? "s" : ""}. Dexna stores text files only.`, "warn");
}

async function importZip(file) {
  try {
    const files = await readZip(await file.arrayBuffer());
    if (!Object.keys(files).length) return toast("No text files found in the zip", "warn");
    createProject({ files, entry: Object.keys(files).find((f) => /(^|\/)(main|app|__main__)\.py$/.test(f)) }, file.name.replace(/\.zip$/i, ""));
    toast(`Imported ${Object.keys(files).length} files`, "ok");
  } catch (e) { toast("Could not read zip: " + e.message, "error"); }
}

/* =====================================================================
 * Explorer tree
 * ===================================================================== */
let treeSelection = null;
const treeEl = $("#file-tree");

function buildTree() {
  const root = { path: "", dirs: new Map(), files: [] };
  const dirNode = (p) => {
    if (!p) return root;
    let node = root, cur = "";
    for (const seg of p.split("/")) {
      cur = cur ? cur + "/" + seg : seg;
      if (!node.dirs.has(seg)) node.dirs.set(seg, { path: cur, dirs: new Map(), files: [] });
      node = node.dirs.get(seg);
    }
    return node;
  };
  for (const d of project.dirs) dirNode(d);
  for (const f of Object.keys(project.files)) dirNode(dirname(f)).files.push(f);
  return root;
}

function expandTo(path) {
  let d = dirname(path);
  while (d) { if (!project.expanded.includes(d)) project.expanded.push(d); d = dirname(d); }
}

function problemCounts() {
  const out = {};
  for (const mk of monaco ? monaco.editor.getModelMarkers({}) : []) {
    const k = keyForUri(mk.resource);
    if (!k) continue;
    out[k] ||= { e: 0, w: 0 };
    if (mk.severity === monaco.MarkerSeverity.Error) out[k].e++;
    else if (mk.severity === monaco.MarkerSeverity.Warning) out[k].w++;
  }
  return out;
}

function renderTree() {
  if (!project) return;
  const root = buildTree();
  const counts = problemCounts();
  const runTarget = getRunTarget();
  treeEl.textContent = "";
  const walk = (node, depth) => {
    const dirs = [...node.dirs.values()].sort((a, b) => a.path.localeCompare(b.path));
    for (const d of dirs) {
      const open = project.expanded.includes(d.path);
      const errs = Object.entries(counts).filter(([k]) => k.startsWith(d.path + "/")).reduce((s, [, c]) => s + c.e, 0);
      const row = h("div", { class: "row" + (treeSelection === d.path ? " selected" : ""), style: { paddingLeft: 8 + depth * 14 + "px" }, "data-path": d.path, "data-dir": "1", draggable: "true" },
        h("span", { class: "twisty" }, icon(open ? "chevronDown" : "chevronRight")), fi(open ? "folderOpen" : "folder"),
        h("span", { class: "name" + (errs ? " err" : "") }, basename(d.path)));
      treeEl.append(row);
      if (open) walk(d, depth + 1);
    }
    for (const f of node.files.sort((a, b) => basename(a).localeCompare(basename(b)))) {
      const c = counts[f];
      const row = h("div", { class: "row" + (treeSelection === f ? " selected" : "") + (f === runTarget ? " entry" : ""), style: { paddingLeft: 8 + depth * 14 + "px" }, "data-path": f, draggable: "true", title: f },
        h("span", { class: "twisty" }), fileIcon(f), h("span", { class: "name" + (c?.e ? " err" : c?.w ? " warn" : "") }, basename(f)),
        f === project.entry && project.pinEntry ? h("span", { class: "badge-main" }, "MAIN") : null,
        c?.e ? h("span", { class: "meta err" }, c.e) : c?.w ? h("span", { class: "meta warn" }, c.w) : null);
      treeEl.append(row);
    }
  };
  walk(root, 0);
  if (!treeEl.children.length) treeEl.append(h("div", { class: "empty" }, "No files yet. ", h("button", { class: "link", onclick: () => newFileDialog("") }, "Create one")));
}

function selectTreeRow(path) {
  treeSelection = path;
  $$(".row.selected", treeEl).forEach((r) => r.classList.remove("selected"));
  const row = treeEl.querySelector(`.row[data-path="${CSS.escape(path)}"]`);
  row?.classList.add("selected");
  row?.scrollIntoView({ block: "nearest" });
}

treeEl.addEventListener("click", (e) => {
  const row = e.target.closest(".row");
  if (!row) { treeSelection = null; $$(".row.selected", treeEl).forEach((r) => r.classList.remove("selected")); return; }
  const p = row.dataset.path;
  if (row.dataset.dir) {
    project.expanded = project.expanded.includes(p) ? project.expanded.filter((x) => x !== p) : [...project.expanded, p];
    treeSelection = p;
    persistProject();
    renderTree();
  } else { selectTreeRow(p); openFile(p, { focus: e.detail > 1 }); }
});
treeEl.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const row = e.target.closest(".row");
  const p = row?.dataset.path;
  if (p) selectTreeRow(p);
  const isDir = row?.dataset.dir;
  const dir = !p ? "" : isDir ? p : dirname(p);
  const items = [
    { label: "New File…", kb: "ctrl+alt+n", run: () => newFileDialog(dir) },
    { label: "New Folder…", run: () => newFolderDialog(dir) },
    { label: "Upload Files…", run: () => { uploadTarget = dir; $("#file-upload").click(); } },
  ];
  if (p) {
    items.push("-");
    if (!isDir) {
      items.push({ label: "Open", run: () => openFile(p) });
      if (p.endsWith(".py")) {
        items.push({ label: "Run This File", run: () => runFile({ path: p }) });
        items.push({ label: project.entry === p && project.pinEntry ? "Unset as Main File" : "Set as Main File", run: () => togglePinEntry(p) });
      }
      items.push({ label: "Duplicate", run: () => duplicateFile(p) }, { label: "Download", run: () => downloadFile(p) });
    }
    items.push({ label: "Copy Path", run: () => navigator.clipboard?.writeText(p) }, "-",
      { label: "Rename…", kb: "f2", run: () => renameDialog(p) }, { label: "Delete", kb: "delete", run: () => deletePath(p) });
  }
  showMenu(e.clientX, e.clientY, items);
});
treeEl.addEventListener("keydown", (e) => {
  if (!treeSelection) return;
  if (e.key === "F2") { e.preventDefault(); renameDialog(treeSelection); }
  else if (e.key === "Delete" || (isMac && e.key === "Backspace" && e.metaKey)) { e.preventDefault(); deletePath(treeSelection); }
  else if (e.key === "Enter" && project.files[treeSelection] != null) openFile(treeSelection);
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const rows = $$(".row", treeEl);
    const i = rows.findIndex((r) => r.dataset.path === treeSelection);
    const next = rows[i + (e.key === "ArrowDown" ? 1 : -1)];
    if (next) selectTreeRow(next.dataset.path);
  }
});
// drag & drop: move within tree, upload from OS
let dragPath = null;
treeEl.addEventListener("dragstart", (e) => { dragPath = e.target.closest(".row")?.dataset.path; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragPath || ""); });
treeEl.addEventListener("dragend", () => { dragPath = null; });
treeEl.addEventListener("dragover", (e) => {
  e.preventDefault();
  $$(".row.dragover", treeEl).forEach((r) => r.classList.remove("dragover"));
  const row = e.target.closest(".row");
  if (row?.dataset.dir) row.classList.add("dragover");
  else if (!dragPath) treeEl.classList.add("dragover");
});
treeEl.addEventListener("dragleave", (e) => { if (!treeEl.contains(e.relatedTarget)) { treeEl.classList.remove("dragover"); $$(".row.dragover", treeEl).forEach((r) => r.classList.remove("dragover")); } });
treeEl.addEventListener("drop", (e) => {
  e.preventDefault();
  treeEl.classList.remove("dragover");
  $$(".row.dragover", treeEl).forEach((r) => r.classList.remove("dragover"));
  const row = e.target.closest(".row");
  const targetDir = row ? (row.dataset.dir ? row.dataset.path : dirname(row.dataset.path)) : "";
  if (dragPath) {
    const to = (targetDir ? targetDir + "/" : "") + basename(dragPath);
    if (to !== dragPath) movePath(dragPath, to);
    if (targetDir) expandTo(targetDir + "/x");
  } else if (e.dataTransfer.files.length) readUploads(e.dataTransfer.files, targetDir);
});
let uploadTarget = "";
$("#file-upload").addEventListener("change", (e) => { readUploads(e.target.files, uploadTarget); e.target.value = ""; });
$("#zip-upload").addEventListener("change", (e) => { if (e.target.files[0]) importZip(e.target.files[0]); e.target.value = ""; });

$('[data-view="explorer"] .view-actions').addEventListener("click", (e) => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "new-file") newFileDialog();
  else if (act === "new-folder") newFolderDialog();
  else if (act === "project-menu") {
    const r = e.target.getBoundingClientRect();
    showMenu(r.left, r.bottom + 4, projectMenuItems());
  }
});
const projectMenuItems = () => [
  { label: "New Project…", run: newProject },
  { label: "Open Example…", run: showExamples },
  { label: "Rename Project…", run: renameProject },
  "-",
  { label: "Upload Files…", run: () => { uploadTarget = ""; $("#file-upload").click(); } },
  { label: "Import Project from ZIP…", run: () => $("#zip-upload").click() },
  { label: "Download Project as ZIP", run: downloadProject },
  { label: "Share Project Link…", run: shareProject },
  "-",
  { label: "Collapse All Folders", run: () => { project.expanded = []; renderTree(); } },
  { label: "Delete Project…", run: deleteProject },
];

/* =====================================================================
 * Tabs & opening files
 * ===================================================================== */
function saveViewState() {
  const m = editor?.getModel();
  if (m) viewStates.set(keyForUri(m.uri), editor.saveViewState());
}

function showWelcome(on) { $("#welcome").classList.toggle("hidden", !on); }

async function openFile(key, { line, col = 1, focus = true, selectLen = 0 } = {}) {
  if (!key) return;
  let model;
  if (key.startsWith("ext:")) {
    model = extModels.get(key.slice(4));
    if (!model) return;
  } else {
    if (project.files[key] == null) return;
    model = ensureModel(key);
    if (!project.open.includes(key)) {
      const i = project.open.indexOf(project.active);
      project.open.splice(i >= 0 ? i + 1 : project.open.length, 0, key);
    }
    selectTreeRow(key);
  }
  if (editor.getModel() !== model) {
    saveViewState();
    editor.setModel(model);
    const vs = viewStates.get(key);
    if (vs) editor.restoreViewState(vs);
  }
  project.active = key;
  if (!key.startsWith("ext:")) persistProject();
  if (key.startsWith("ext:") && !extTabs.includes(key)) extTabs.push(key);
  editor.updateOptions({ readOnly: key.startsWith("ext:") });
  showWelcome(false);
  if (line) {
    const sel = new monaco.Selection(line, col, line, col + selectLen);
    editor.setSelection(sel);
    editor.revealLineInCenterIfOutsideViewport(line);
  }
  if (focus) editor.focus();
  renderTabs();
  updateBreadcrumbs();
  updateCursorStatus();
  $("#sb-lang").textContent = { python: "Python", plaintext: "Plain Text" }[model.getLanguageId()] || model.getLanguageId();
  updateRunTarget();
  scheduleOutline();
}

const extTabs = [];
function closeTab(key, { silent } = {}) {
  const tabs = allTabs();
  const idx = tabs.indexOf(key);
  if (key.startsWith("ext:")) { extTabs.splice(extTabs.indexOf(key), 1); }
  else { saveViewStateFor(key); project.open = project.open.filter((p) => p !== key); }
  if (project.active === key) {
    const rest = allTabs();
    const next = rest[Math.min(idx, rest.length - 1)];
    if (next) openFile(next, { focus: !silent });
    else { project.active = null; editor.setModel(null); showWelcome(true); updateBreadcrumbs(); updateRunTarget(); scheduleOutline(); }
  }
  persistProject();
  renderTabs();
}
function saveViewStateFor(key) { if (editor.getModel() && keyForUri(editor.getModel().uri) === key) saveViewState(); }
const allTabs = () => [...project.open, ...extTabs];

function renderTabs() {
  const tabsEl = $("#tabs");
  tabsEl.textContent = "";
  const counts = problemCounts();
  const names = allTabs().map((k) => basename(k.replace(/^ext:/, "")));
  for (const key of allTabs()) {
    const ext = key.startsWith("ext:");
    const p = ext ? key.slice(4) : key;
    const name = basename(p);
    const dup = names.filter((n) => n === name).length > 1;
    const c = counts[key];
    const tab = h("div", { class: "tab" + (key === project.active ? " active" : "") + (ext ? " readonly" : "") + (c?.e ? " has-error" : c?.w ? " has-warn" : ""), title: p, draggable: "true", "data-key": key },
      ext ? fi("book") : fileIcon(p),
      h("span", { class: "tname" }, name),
      dup || ext ? h("span", { class: "tdir" }, ext ? "read-only" : dirname(p) || "./") : null,
      h("button", { class: "close", title: "Close (Alt+W)", onclick: (e) => { e.stopPropagation(); closeTab(key); } }, icon("close")));
    tab.addEventListener("mousedown", (e) => { if (e.button === 1) { e.preventDefault(); closeTab(key); } });
    tab.addEventListener("click", () => openFile(key));
    tab.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showMenu(e.clientX, e.clientY, [
        { label: "Close", kb: "alt+w", run: () => closeTab(key) },
        { label: "Close Others", run: () => allTabs().filter((k) => k !== key).forEach((k) => closeTab(k, { silent: true })) },
        { label: "Close to the Right", run: () => allTabs().slice(allTabs().indexOf(key) + 1).forEach((k) => closeTab(k, { silent: true })) },
        { label: "Close All", run: () => allTabs().forEach((k) => closeTab(k, { silent: true })) },
        "-",
        { label: "Reveal in Explorer", disabled: ext, run: () => { expandTo(key); renderTree(); setView("explorer"); selectTreeRow(key); } },
        { label: "Copy Path", run: () => navigator.clipboard?.writeText(p) },
        { label: "Run This File", disabled: ext || !p.endsWith(".py"), run: () => runFile({ path: p }) },
      ]);
    });
    tab.addEventListener("dragstart", (e) => { tab.classList.add("dragging"); e.dataTransfer.setData("dexna/tab", key); });
    tab.addEventListener("dragend", () => tab.classList.remove("dragging"));
    tab.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("dexna/tab")) e.preventDefault(); });
    tab.addEventListener("drop", (e) => {
      const from = e.dataTransfer.getData("dexna/tab");
      if (!from || from === key || from.startsWith("ext:") || ext) return;
      e.preventDefault();
      project.open = project.open.filter((k) => k !== from);
      project.open.splice(project.open.indexOf(key), 0, from);
      persistProject();
      renderTabs();
    });
    tabsEl.append(tab);
  }
  tabsEl.querySelector(".tab.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/* =====================================================================
 * Breadcrumbs, outline, status bar
 * ===================================================================== */
function symbolPathAt(symbols, line) {
  const out = [];
  let list = symbols;
  while (list) {
    const s = list.find((x) => x.line <= line && x.endLine >= line && (x.kind === "class" || x.kind === "function" || x.kind === "method"));
    if (!s) break;
    out.push(s);
    list = s.children;
  }
  return out;
}

function updateBreadcrumbs() {
  const bc = $("#breadcrumbs");
  bc.textContent = "";
  const key = project?.active;
  if (!key || !editor.getModel()) return;
  const p = key.replace(/^ext:/, "");
  const parts = p.split("/").filter(Boolean);
  parts.forEach((seg, i) => {
    if (i) bc.append(h("span", { class: "sep" }, icon("chevronRight")));
    bc.append(h("span", { class: "crumb", onclick: () => { if (!key.startsWith("ext:")) { setView("explorer"); selectTreeRow(i === parts.length - 1 ? key : parts.slice(0, i + 1).join("/")); } } }, seg));
  });
  const syms = symbolPathAt(symbolsCache.get(key) || [], editor.getPosition()?.lineNumber || 1);
  for (const s of syms) {
    bc.append(h("span", { class: "sep" }, icon("chevronRight")), h("span", { class: "crumb", onclick: () => openFile(key, { line: s.line, col: s.col }) }, symIcon(s.kind), s.name));
  }
}

function updateCursorStatus() {
  const pos = editor.getPosition();
  if (!pos) { $("#sb-cursor").textContent = ""; return; }
  const sel = editor.getSelection();
  const m = editor.getModel();
  const n = sel && m ? m.getValueInRange(sel).length : 0;
  $("#sb-cursor").textContent = `Ln ${pos.lineNumber}, Col ${pos.column}` + (n ? ` (${n} selected)` : "");
}
$("#sb-cursor").onclick = () => { editor.focus(); editor.getAction("editor.action.gotoLine")?.run(); };
$("#sb-indent").onclick = () => quickPick({
  placeholder: "Tab size",
  source: () => [2, 4, 8].map((n) => ({ label: `Spaces: ${n}`, run: () => setSetting("tabSize", n) })),
});

// Symbol kinds: a small rounded tag with a letter, coloured per kind.
const KIND = { class: ["C", "#d4952b"], function: ["F", "#5a8dee"], method: ["M", "#4aa3c7"], variable: ["V", "#3aa57a"], constant: ["K", "#c9574f"] };
const symIconHtml = (kind) => { const [l, c] = KIND[kind] || ["?", "#7d8597"]; return `<svg class="icon sym" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="3" fill="${c}" opacity=".18"/><text x="8" y="11.3" text-anchor="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-weight="700" font-size="8.5" fill="${c}">${l}</text></svg>`; };
const symIcon = (kind) => h("span", { class: "fi", html: symIconHtml(kind) });
const scheduleOutline = debounce(refreshOutline, 250);
async function refreshOutline() {
  const key = project?.active;
  const model = editor?.getModel();
  if (!key || !model || model.getLanguageId() !== "python" || !lspReady) {
    if (!key || model?.getLanguageId() !== "python") { symbolsCache.delete(key); renderOutline(); }
    return;
  }
  try {
    const syms = await lspCall("symbols", [model.getValue()]);
    symbolsCache.set(key, syms);
  } catch (_) {}
  renderOutline();
  updateBreadcrumbs();
}
function renderOutline() {
  const el = $("#outline");
  el.textContent = "";
  const key = project?.active;
  $("#outline-file").textContent = key ? basename(key.replace(/^ext:/, "")) : "";
  const syms = symbolsCache.get(key) || [];
  const filter = $("#outline-filter").value.trim();
  const walk = (list, depth) => {
    for (const s of list) {
      const match = !filter || fuzzy(filter, s.name);
      if (match) el.append(h("div", { class: "row", style: { paddingLeft: 10 + depth * 14 + "px" }, "data-line": s.line, "data-end": s.endLine, onclick: () => openFile(key, { line: s.line, col: s.col }) },
        symIcon(s.kind), h("span", { class: "name" }, s.name), s.detail ? h("span", { class: "meta" }, s.detail.length > 30 ? s.detail.slice(0, 29) + "...)" : s.detail) : null));
      walk(s.children || [], filter ? depth : depth + 1);
    }
  };
  walk(syms, 0);
  if (!el.children.length) el.append(h("div", { class: "empty" }, key ? "No symbols" : "No file open"));
  highlightOutline();
}
function highlightOutline() {
  const line = editor?.getPosition()?.lineNumber;
  let best = null;
  for (const r of $$("#outline .row")) { r.classList.remove("selected"); if (line >= +r.dataset.line && line <= +r.dataset.end) best = r; }
  best?.classList.add("selected");
}
$("#outline-filter").addEventListener("input", renderOutline);

/* =====================================================================
 * Language server (jedi + pyflakes + black in a worker)
 * ===================================================================== */
function lspCall(method, args, extra = {}) {
  if (!lspReady) return Promise.reject(new Error("language server starting"));
  return lsp.call("lsp", { method, args, ...extra });
}
function lspSyncFile(path) {
  if (!lspReady || project.files[path] == null) return;
  lsp.call("write", { path, content: project.files[path] }).catch(() => {});
}
function lspSyncAll() {
  lsp.call("sync", { files: project.files, dirs: project.dirs }).catch(() => {});
  lintAll();
}

const lintTimers = new Map();
function scheduleLint(path, delay = 450) {
  clearTimeout(lintTimers.get(path));
  lintTimers.set(path, setTimeout(() => lintFile(path), delay));
}
let canLint = false;
async function lintFile(path) {
  const model = models.get(path);
  if (!model || !lspReady || !path.endsWith(".py")) return;
  if (!settings.autoLint) { monaco.editor.setModelMarkers(model, "dexna", []); return; }
  const version = model.getVersionId();
  try {
    const res = await lspCall("lint", [model.getValue(), path], { loadImports: path === project.active });
    if (model.isDisposed() || model.getVersionId() !== version) return;
    monaco.editor.setModelMarkers(model, "dexna", res.map((d) => ({
      startLineNumber: d.line, startColumn: d.col, endLineNumber: d.endLine, endColumn: d.endCol,
      message: d.message, code: d.code, source: d.code === "syntax" ? "python" : "pyflakes",
      severity: d.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      tags: d.unnecessary ? [monaco.MarkerTag.Unnecessary] : [],
    })));
  } catch (_) {}
}
function lintAll() {
  let i = 0;
  for (const p of Object.keys(project.files)) if (p.endsWith(".py")) scheduleLint(p, 100 + i++ * 60);
}

const COMPLETION_KIND = () => ({
  module: monaco.languages.CompletionItemKind.Module, class: monaco.languages.CompletionItemKind.Class,
  instance: monaco.languages.CompletionItemKind.Variable, function: monaco.languages.CompletionItemKind.Function,
  param: monaco.languages.CompletionItemKind.Variable, path: monaco.languages.CompletionItemKind.File,
  keyword: monaco.languages.CompletionItemKind.Keyword, property: monaco.languages.CompletionItemKind.Property,
  statement: monaco.languages.CompletionItemKind.Variable,
});

function docMarkdown(head, doc) {
  let md = head ? "```python\n" + head + "\n```\n" : "";
  if (doc) md += "\n" + doc.replace(/^\s+|\s+$/g, "").replace(/\n(?=\S)/g, "  \n");
  return md;
}

function lspPath(model) { return pathOfModel(model) || "__ext__.py"; }

function registerProviders() {
  const kinds = COMPLETION_KIND();
  monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [".", "@"],
    async provideCompletionItems(model, position) {
      if (!lspReady) return { suggestions: [] };
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
      const lineText = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      if (/^\s*#/.test(lineText)) return { suggestions: [] };
      let items;
      try { items = await lspCall("complete", [model.getValue(), lspPath(model), position.lineNumber, position.column - 1]); }
      catch (_) { return { suggestions: [] }; }
      return {
        suggestions: items.map((c) => ({
          label: c.label, kind: kinds[c.kind] ?? monaco.languages.CompletionItemKind.Text, detail: c.detail,
          insertText: c.insert, range, sortText: c.sort,
          _ctx: { src: model.getValue(), path: lspPath(model), line: position.lineNumber, col: position.column - 1 },
        })),
      };
    },
    async resolveCompletionItem(item) {
      const c = item._ctx;
      if (!c) return item;
      try {
        const r = await lspCall("resolve", [c.src, c.path, c.line, c.col, item.label]);
        if (r) {
          if (r.signature) item.detail = r.signature;
          if (r.doc) item.documentation = { value: docMarkdown("", r.doc) };
        }
      } catch (_) {}
      return item;
    },
  });

  monaco.languages.registerHoverProvider("python", {
    async provideHover(model, position) {
      if (!lspReady || !model.getWordAtPosition(position)) return null;
      try {
        const r = await lspCall("hover", [model.getValue(), lspPath(model), position.lineNumber, position.column - 1]);
        if (!r) return null;
        const head = r.type === "module" ? `module ${r.module}` : r.head;
        return { contents: [{ value: docMarkdown(head, r.doc) }] };
      } catch (_) { return null; }
    },
  });

  monaco.languages.registerSignatureHelpProvider("python", {
    signatureHelpTriggerCharacters: ["(", ","],
    signatureHelpRetriggerCharacters: [","],
    async provideSignatureHelp(model, position) {
      if (!lspReady) return null;
      try {
        const sigs = await lspCall("signatures", [model.getValue(), lspPath(model), position.lineNumber, position.column - 1]);
        if (!sigs.length) return null;
        return {
          value: {
            signatures: sigs.map((s) => ({ label: s.label, documentation: s.doc ? { value: docMarkdown("", s.doc) } : undefined, parameters: s.params.map((p) => ({ label: p })) })),
            activeSignature: 0, activeParameter: Math.max(0, sigs[0].index),
          },
          dispose() {},
        };
      } catch (_) { return null; }
    },
  });

  const toLocation = async (l) => {
    if (l.project && project.files[l.path] != null) return { uri: uriFor(l.path), range: new monaco.Range(l.line, l.col + 1, l.line, l.col + 1 + (l.name?.length || 0)) };
    if (!l.abs) return null;
    let m = extModels.get(l.abs);
    if (!m) {
      const text = await lsp.call("read-file", { path: l.abs }).catch(() => null);
      if (text == null) return null;
      m = monaco.editor.createModel(text, langOf(l.abs), monaco.Uri.from({ scheme: "file", path: "/ext" + l.abs }));
      extModels.set(l.abs, m);
    }
    return { uri: m.uri, range: new monaco.Range(l.line, l.col + 1, l.line, l.col + 1 + (l.name?.length || 0)) };
  };

  monaco.languages.registerDefinitionProvider("python", {
    async provideDefinition(model, position) {
      if (!lspReady) return null;
      try {
        const locs = await lspCall("definition", [model.getValue(), lspPath(model), position.lineNumber, position.column - 1]);
        return (await Promise.all(locs.map(toLocation))).filter(Boolean);
      } catch (_) { return null; }
    },
  });

  monaco.languages.registerReferenceProvider("python", {
    async provideReferences(model, position) {
      if (!lspReady) return [];
      try {
        const locs = await lspCall("references", [model.getValue(), lspPath(model), position.lineNumber, position.column - 1]);
        return (await Promise.all(locs.map((l) => (l.path === lspPath(model) && !l.project ? { ...l, project: true } : l)).map(toLocation))).filter(Boolean);
      } catch (_) { return []; }
    },
  });

  monaco.languages.registerDocumentHighlightProvider("python", {
    async provideDocumentHighlights(model, position) {
      if (!lspReady || !model.getWordAtPosition(position)) return [];
      try {
        const hs = await lspCall("highlights", [model.getValue(), lspPath(model), position.lineNumber, position.column - 1]);
        return hs.map((x) => ({ range: new monaco.Range(x.line, x.col + 1, x.line, x.col + 1 + x.len), kind: monaco.languages.DocumentHighlightKind.Text }));
      } catch (_) { return []; }
    },
  });

  monaco.languages.registerRenameProvider("python", {
    async provideRenameEdits(model, position, newName) {
      const r = await lspCall("rename", [model.getValue(), lspPath(model), position.lineNumber, position.column - 1, newName]);
      if (r.error) return { edits: [], rejectReason: r.error };
      const edits = [];
      for (const [p, code] of Object.entries(r.files)) {
        const m = models.get(p);
        if (!m) continue;
        const ed = minimalEdit(m, code);
        if (ed) edits.push({ resource: m.uri, versionId: m.getVersionId(), textEdit: ed });
      }
      return { edits };
    },
  });

  monaco.languages.registerDocumentSymbolProvider("python", {
    async provideDocumentSymbols(model) {
      if (!lspReady) return [];
      const SK = monaco.languages.SymbolKind;
      const map = { class: SK.Class, function: SK.Function, method: SK.Method, variable: SK.Variable, constant: SK.Constant };
      const conv = (s) => ({
        name: s.name, detail: s.detail, kind: map[s.kind] ?? SK.Variable, tags: [],
        range: new monaco.Range(s.line, 1, s.endLine, s.endCol), selectionRange: new monaco.Range(s.line, s.col, s.line, s.col + s.name.length),
        children: (s.children || []).map(conv),
      });
      try { return (await lspCall("symbols", [model.getValue()])).map(conv); } catch (_) { return []; }
    },
  });

  monaco.languages.registerDocumentFormattingEditProvider("python", {
    displayName: "black",
    async provideDocumentFormattingEdits(model) {
      setStatusFlash("Formatting with black…");
      const r = await lspCall("format", [model.getValue(), settings.lineLength]).catch((e) => ({ error: e.message }));
      if (r.error) { toast(r.error, "error"); return []; }
      const ed = minimalEdit(model, r.code);
      return ed ? [ed] : [];
    },
  });

  monaco.languages.registerCodeLensProvider("python", {
    provideCodeLenses(model) {
      const lenses = [];
      const lines = model.getLinesContent();
      lines.forEach((l, i) => {
        if (/^\s*#\s*%%/.test(l)) {
          lenses.push({ range: new monaco.Range(i + 1, 1, i + 1, 1), command: { id: runCellCommand, title: "Run Cell", arguments: [i + 1] } });
          lenses.push({ range: new monaco.Range(i + 1, 1, i + 1, 1), command: { id: runCellCommand, title: "Run Cell & Below", arguments: [i + 1, true] } });
        }
      });
      return { lenses, dispose() {} };
    },
  });

  const STDLIB = ["math", "os", "sys", "re", "json", "time", "random", "datetime", "itertools", "functools", "collections", "pathlib", "typing", "statistics", "string", "dataclasses", "copy", "csv", "io", "heapq", "bisect", "decimal", "fractions", "operator", "textwrap", "uuid", "hashlib", "base64", "pprint", "asyncio", "enum", "abc", "logging", "argparse", "shutil", "glob", "pickle", "sqlite3", "unittest", "doctest", "timeit", "secrets"];
  const ALIASES = { np: "import numpy as np", pd: "import pandas as pd", plt: "import matplotlib.pyplot as plt", sp: "import sympy as sp", sns: "import seaborn as sns" };
  monaco.languages.registerCodeActionProvider("python", {
    provideCodeActions(model, range, context) {
      const actions = [];
      const insertImport = (stmt) => {
        const lines = model.getLinesContent();
        let at = 1;
        // after module docstring / __future__ / existing imports
        let i = 0;
        if (/^\s*("""|''')/.test(lines[0] || "")) { const q = lines[0].trim().slice(0, 3); i = lines[0].trim().length > 3 && lines[0].trim().endsWith(q) ? 1 : lines.findIndex((l, k) => k > 0 && l.includes(q)) + 1; }
        for (let k = i; k < lines.length; k++) if (/^(import|from)\s/.test(lines[k])) i = k + 1; else if (lines[k].trim() && !lines[k].startsWith("#") && k > i) break;
        at = i + 1;
        return { range: new monaco.Range(at, 1, at, 1), text: stmt + "\n" };
      };
      for (const mk of context.markers) {
        if (mk.code === "UndefinedName") {
          const name = /'(.+)'/.exec(mk.message)?.[1];
          const stmt = ALIASES[name] || (STDLIB.includes(name) ? `import ${name}` : null);
          if (stmt) actions.push({ title: `Add "${stmt}"`, kind: "quickfix", diagnostics: [mk], isPreferred: true, edit: { edits: [{ resource: model.uri, versionId: model.getVersionId(), textEdit: insertImport(stmt) }] } });
        }
        if (mk.code === "UnusedImport") {
          const line = model.getLineContent(mk.startLineNumber);
          if (/^\s*(import \S+( as \S+)?|from \S+ import \S+( as \S+)?)\s*(#.*)?$/.test(line)) {
            actions.push({ title: "Remove unused import", kind: "quickfix", diagnostics: [mk], isPreferred: true, edit: { edits: [{ resource: model.uri, versionId: model.getVersionId(), textEdit: { range: new monaco.Range(mk.startLineNumber, 1, mk.startLineNumber + 1, 1), text: "" } }] } });
          }
        }
      }
      actions.push({ title: "Organize imports (isort)", kind: "source.organizeImports", command: { id: organizeImportsCommand, title: "Organize imports" } });
      return { actions, dispose() {} };
    },
  });
}
let runCellCommand = null;
let organizeImportsCommand = null;

async function formatDocument() {
  const m = editor.getModel();
  if (!m || m.getLanguageId() !== "python") return editor.getAction("editor.action.formatDocument")?.run();
  if (!lspReady) return toast("Language server is still starting…");
  await editor.getAction("editor.action.formatDocument").run();
}
async function organizeImports() {
  const m = editor.getModel();
  if (!m || !lspReady) return;
  setStatusFlash("Sorting imports…");
  const r = await lspCall("sort_imports", [m.getValue(), settings.lineLength]).catch((e) => ({ error: e.message }));
  if (r.error) return toast(r.error, "error");
  applyText(m, r.code, "isort");
}

/* =====================================================================
 * Problems
 * ===================================================================== */
const refreshProblems = debounce(() => {
  const el = $("#problems");
  el.textContent = "";
  const markers = monaco.editor.getModelMarkers({}).filter((m) => keyForUri(m.resource) && !keyForUri(m.resource).startsWith("ext:"));
  let e = 0, w = 0;
  const byFile = new Map();
  for (const m of markers) {
    if (m.severity === monaco.MarkerSeverity.Error) e++; else if (m.severity === monaco.MarkerSeverity.Warning) w++; else continue;
    const k = keyForUri(m.resource);
    if (!byFile.has(k)) byFile.set(k, []);
    byFile.get(k).push(m);
  }
  for (const [file, list] of [...byFile].sort()) {
    el.append(h("div", { class: "row", style: { paddingLeft: "8px", fontWeight: 600 }, onclick: () => openFile(file) }, fileIcon(file), h("span", { class: "name" }, file), h("span", { class: "badge" }, list.length)));
    for (const m of list.sort((a, b) => a.startLineNumber - b.startLineNumber)) {
      const err = m.severity === monaco.MarkerSeverity.Error;
      el.append(h("div", { class: "row problem", style: { paddingLeft: "28px" }, title: m.message, onclick: () => openFile(file, { line: m.startLineNumber, col: m.startColumn }) },
        fi(err ? "error" : "warning", err ? "err" : "warn"), h("span", { class: "name" }, m.message),
        h("span", { class: "code" }, `${typeof m.code === "object" ? m.code.value : m.code || ""} [${m.startLineNumber}:${m.startColumn}]`)));
    }
  }
  if (!byFile.size) el.append(h("div", { class: "empty" }, "No problems detected in the project."));
  $("#problems-badge").textContent = e + w || "";
  $("#sb-problems").innerHTML = `${iconSvg("error")}<span>${e}</span>${iconSvg("warning")}<span>${w}</span>`;
  renderTree();
  renderTabs();
}, 120);
$("#sb-problems").onclick = () => showPanel("problems");

/* =====================================================================
 * Kernel (code execution)
 * ===================================================================== */
const state = { busy: false, mode: null, stopTimer: null, runStderr: "", runStartedAt: 0 };
const dbg = { active: false, paused: false, waiting: false, queue: [], evalCbs: [], info: null, bpsDirty: false, lineDecos: [], lineModel: null, watchValues: {} };

function setKernelStatus(stateName, msg) {
  const el = $("#sb-kernel");
  el.querySelector(".dot").className = "dot " + (stateName === "ready" ? "ready" : stateName === "error" ? "error" : "busy");
  el.querySelector("span").textContent = msg;
}

function startKernel() {
  kernel = new PyClient("kernel", onKernelEvent);
  setKernelStatus("loading", "Starting Python…");
  return kernel.start().then((info) => {
    kernelInfo = info;
    kernelInstalled.clear();
    $("#sb-python").textContent = `Python ${info.version}`;
    $("#sb-python").title = `Pyodide ${info.pyodide} (WebAssembly)`;
    setKernelStatus("ready", "Ready");
    syncKernelProject();
    if (!lsp) startLsp();
    return info;
  }).catch((e) => {
    setKernelStatus("error", "Python failed to load");
    terminal.system("Could not start Python: " + e.message + "\n  Check your internet connection and reload the page.", "stderr");
    throw e;
  });
}

async function syncKernelProject() {
  if (!kernel?.info) return;
  ensurePackages().catch(() => {});
}

async function ensurePackages() {
  const missing = project.packages.filter((p) => !kernelInstalled.has(p));
  if (!missing.length) return;
  missing.forEach((p) => kernelInstalled.add(p));
  const wasBusy = state.busy;
  if (!wasBusy) setKernelStatus("loading", `Installing ${missing.join(", ")}…`);
  const res = await kernel.call("install", { packages: missing, quiet: true });
  const failed = res.filter((r) => !r.ok);
  if (failed.length) { failed.forEach((f) => kernelInstalled.delete(f.name)); toast(`Could not install: ${failed.map((f) => f.name).join(", ")}`, "error"); }
  if (!state.busy) setKernelStatus("ready", "Ready");
  refreshPackages();
}

function onKernelEvent(msg) {
  switch (msg.type) {
    case "status":
      if (state.busy || msg.state === "loading") setKernelStatus(msg.state === "busy" ? "busy" : "loading", msg.msg);
      break;
    case "stdout": sink.write(msg.text, "stdout"); break;
    case "stderr": sink.write(msg.text, "stderr"); if (sink === terminal) state.runStderr += msg.text; break;
    case "input-request": {
      setKernelStatus("busy", "Waiting for input…");
      if (sink === consoleTerm) showPanel("console"); else showPanel("terminal");
      sink.requestInput((value) => {
        setKernelStatus("busy", "Running");
        kernel.reply(value == null ? "\u0000EOF" : value);
      });
      break;
    }
    case "plot": addPlot(msg.data); break;
    case "paused": onPaused(JSON.parse(msg.data)); break;
    case "eval-result": onEvalResult(JSON.parse(msg.data)); break;
    case "ack": dbg.waiting = true; dbgPump(); break;
    case "resumed": break;
    case "fatal": setKernelStatus("error", "Kernel crashed"); break;
  }
}

function setBusy(busy, mode = null) {
  state.busy = busy;
  state.mode = busy ? mode : null;
  $("#btn-stop").disabled = !busy;
  $("#btn-run").disabled = busy;
  $("#btn-debug").disabled = busy;
  $("#statusbar").classList.toggle("running", busy && mode !== "debug");
  $("#statusbar").classList.toggle("debugging", busy && mode === "debug");
  $("#debug-controls").classList.toggle("hidden", !(busy && mode === "debug"));
  if (!busy) { setKernelStatus("ready", "Ready"); clearTimeout(state.stopTimer); }
  else setKernelStatus("busy", mode === "debug" ? "Debugging" : "Running");
}

function getRunTarget() {
  if (!project) return null;
  if (project.pinEntry && project.files[project.entry] != null) return project.entry;
  const a = project.active;
  if (a && !a.startsWith("ext:") && a.endsWith(".py")) return a;
  if (project.files[project.entry] != null) return project.entry;
  return Object.keys(project.files).find((f) => f.endsWith(".py")) || null;
}
function updateRunTarget() {
  const t = getRunTarget();
  $("#run-target").innerHTML = t ? (project.pinEntry ? iconSvg("pin") : "") + `<span>${esc(t)}</span>` : "";
  $("#pin-run").checked = !!project?.pinEntry;
  $("#pin-run-name").textContent = project?.entry || t || "main.py";
  $$("#file-tree .row.entry").forEach((r) => r.classList.remove("entry"));
  if (t) treeEl.querySelector(`.row[data-path="${CSS.escape(t)}"]`)?.classList.add("entry");
}
function togglePinEntry(p) {
  if (project.pinEntry && project.entry === p) project.pinEntry = false;
  else { project.entry = p; project.pinEntry = true; }
  persistProject();
  renderTree();
  updateRunTarget();
}
$("#pin-run").addEventListener("change", (e) => {
  if (e.target.checked) { project.entry = project.files[project.entry] != null ? project.entry : getRunTarget(); project.pinEntry = !!project.entry; }
  else project.pinEntry = false;
  persistProject(); renderTree(); updateRunTarget();
});

async function kernelReady() {
  if (!kernel) await startKernel();
  if (!kernel.info) {
    setKernelStatus("loading", "Starting Python…");
    await kernel.ready;
  }
}

async function runFile({ debug = false, stopOnEntry = false, path } = {}) {
  if (state.busy) return toast("A program is already running. Press Shift+F5 to stop it.", "warn");
  path ||= getRunTarget();
  if (!path) return toast("Create a Python file to run first.", "warn");
  if (debug && !kernel?.isolated) return toast("The debugger needs cross-origin isolation (try reloading the page in Chrome, Edge or Firefox).", "error", 6000);
  if (settings.formatOnSave) await formatDocument().catch(() => {});
  showPanel("terminal");
  if (settings.clearOnRun) terminal.clear();
  terminal.separator(`${debug ? "Debugging" : "Running"} ${path} at ${new Date().toLocaleTimeString()}`);
  sink = terminal;
  state.runStderr = "";
  clearRuntimeError();
  setBusy(true, debug ? "debug" : "run");
  if (debug) { dbg.active = true; dbg.bpsDirty = false; renderDebugView(); }
  try {
    await kernelReady();
    setBusy(true, debug ? "debug" : "run");
    await ensurePackages();
    await kernel.call("sync", { files: project.files, dirs: project.dirs });
    const sources = Object.entries(project.files).filter(([p]) => p.endsWith(".py")).map(([, c]) => c);
    const res = await kernel.call("run", { path, debug, stopOnEntry, breakpoints: project.breakpoints, sources, autoInstall: settings.autoInstall });
    const secs = res.time.toFixed(res.time < 10 ? 3 : 1);
    if (res.ok) terminal.system(`Process finished in ${secs}s`, "ok");
    else { terminal.system(`Process exited with an error after ${secs}s`, "stderr"); markRuntimeError(state.runStderr); }
    applyFileChanges(res.changes);
    $("#sb-run").innerHTML = `${iconSvg(res.ok ? "check" : "error")}<span>${esc(path)} ${secs}s</span>`;
  } catch (e) {
    terminal.system(e.message, "stderr");
    $("#sb-run").innerHTML = `${iconSvg("error")}<span>${esc(path)}</span>`;
  } finally {
    if (terminal.inputActive) terminal.resolveInput(null);
    setBusy(false);
    dbgEnd();
    refreshVariables();
  }
}

async function replExec(code, { echo = true, label } = {}) {
  if (!code.trim()) return;
  showPanel("console");
  if (dbg.paused) {
    consoleTerm.echo(code, "(debug) ");
    dbgEval(code, (r) => consoleTerm.write(r.result + "\n", r.result.match(/^\w+Error: /) ? "stderr" : "stdout"));
    return;
  }
  if (state.busy) return toast("Python is busy. Wait for the program to finish or stop it.", "warn");
  if (echo) consoleTerm.echo(label || code);
  sink = consoleTerm;
  setBusy(true, "repl");
  try {
    await kernelReady();
    setBusy(true, "repl");
    await ensurePackages();
    await kernel.call("sync", { files: project.files, dirs: project.dirs });
    const res = await kernel.call("repl", { code, autoInstall: settings.autoInstall });
    applyFileChanges(res.changes);
  } catch (e) {
    consoleTerm.system(e.message, "stderr");
  } finally {
    if (consoleTerm.inputActive) consoleTerm.resolveInput(null);
    sink = terminal;
    setBusy(false);
    refreshVariables();
  }
}

function applyFileChanges(changes) {
  if (!changes) return;
  const added = [];
  for (const [p, text] of Object.entries(changes)) {
    if (project.files[p] == null) { project.files[p] = text; addDirs(dirname(p)); ensureModel(p); added.push(p); }
    else if (project.files[p] !== text) {
      const m = models.get(p);
      if (m) applyText(m, text);
      else project.files[p] = text;
    }
  }
  if (Object.keys(changes).length) { persistProject(); renderTree(); }
  if (added.length) toast(`Your program created ${added.length === 1 ? added[0] : added.length + " files"}`, "ok");
}

async function stopExecution() {
  if (!state.busy) return;
  if (dbg.paused || (dbg.active && dbg.waiting)) {
    dbg.queue = [{ cmd: "stop" }];
    dbg.paused = false;
    clearDebugLine();
    dbgPump();
    return;
  }
  if (kernel.isolated) {
    kernel.interrupt();
    const pending = sink.inputActive ? sink : terminal.inputActive ? terminal : consoleTerm.inputActive ? consoleTerm : null;
    if (pending) pending.resolveInput("");
    clearTimeout(state.stopTimer);
    state.stopTimer = setTimeout(() => { if (state.busy) restartKernel("The program did not respond to the interrupt"); }, 3000);
  } else restartKernel();
}

async function restartKernel(reason) {
  if (!kernel) return startKernel();
  sink.system(`Restarting Python${reason ? ` (${reason})` : ""}...`);
  dbgEnd();
  setBusy(false);
  setKernelStatus("loading", "Restarting…");
  kernel.terminate();
  kernelInstalled.clear();
  try {
    const info = await kernel.start();
    kernelInfo = info;
    setKernelStatus("ready", "Ready");
    sink.system("Python restarted. All variables were cleared.");
    renderVariables([]);
    ensurePackages().catch(() => {});
  } catch (e) { setKernelStatus("error", "Restart failed"); }
}

/* runtime error highlight */
const runtimeDecos = new Map();
function markRuntimeError(stderr) {
  const re = /File "([^"]+)", line (\d+)/g;
  let m, last = null;
  while ((m = re.exec(stderr))) if (project.files[m[1]] != null) last = { file: m[1], line: +m[2] };
  if (!last) return;
  const msg = stderr.trim().split("\n").pop();
  const model = models.get(last.file);
  if (!model) return;
  monaco.editor.setModelMarkers(model, "runtime", [{ startLineNumber: last.line, endLineNumber: last.line, startColumn: model.getLineFirstNonWhitespaceColumn(last.line) || 1, endColumn: model.getLineMaxColumn(last.line), message: msg, severity: monaco.MarkerSeverity.Error, source: "runtime" }]);
  runtimeDecos.set(last.file, model.deltaDecorations(runtimeDecos.get(last.file) || [], [{ range: new monaco.Range(last.line, 1, last.line, 1), options: { isWholeLine: true, className: "dx-error-line" } }]));
  if (project.active === last.file) editor.revealLineInCenterIfOutsideViewport(last.line);
}
function clearRuntimeError(path) {
  for (const [p, ids] of runtimeDecos) {
    if (path && p !== path) continue;
    const m = models.get(p);
    if (m) { m.deltaDecorations(ids, []); monaco.editor.setModelMarkers(m, "runtime", []); }
    runtimeDecos.delete(p);
  }
}

/* run selection / cells */
function dedent(text) {
  const lines = text.split("\n");
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  return lines.map((l) => l.slice(Number.isFinite(ind) ? ind : 0)).join("\n");
}
function cellBounds(model, line) {
  const lines = model.getLinesContent();
  const isHdr = (l) => /^\s*#\s*%%/.test(l);
  let start = line;
  while (start > 1 && !isHdr(lines[start - 1])) start--;
  let end = line + 1;
  if (isHdr(lines[start - 1]) && start === line) end = line + 1;
  while (end <= lines.length && !isHdr(lines[end - 1])) end++;
  return { start, end: end - 1, header: isHdr(lines[start - 1]) ? lines[start - 1].trim() : null };
}
function runCell(line, andBelow = false) {
  const model = editor.getModel();
  if (!model) return;
  const { start, end, header } = cellBounds(model, line);
  const lastLine = andBelow ? model.getLineCount() : end;
  const code = model.getValueInRange(new monaco.Range(start, 1, lastLine, model.getLineMaxColumn(lastLine)));
  replExec(code, { label: header ? `${header}${andBelow ? " (and below)" : ""}, ${lastLine - start + 1} lines` : undefined });
}
function runSelection() {
  const model = editor.getModel();
  if (!model || model.getLanguageId() !== "python") return;
  const sel = editor.getSelection();
  if (!sel.isEmpty()) return replExec(dedent(model.getValueInRange(sel)));
  const hasCells = model.getLinesContent().some((l) => /^\s*#\s*%%/.test(l));
  if (hasCells) return runCell(sel.startLineNumber);
  const ln = sel.startLineNumber;
  replExec(dedent(model.getLineContent(ln)));
  if (ln < model.getLineCount()) editor.setPosition({ lineNumber: ln + 1, column: 1 });
}

function scheduleCells(path) { clearTimeout(cellDecos.get(path + ":t")); cellDecos.set(path + ":t", setTimeout(() => updateCellDecos(path), 300)); }
function updateCellDecos(path) {
  const m = models.get(path);
  if (!m || !path.endsWith(".py")) return;
  const decos = [];
  m.getLinesContent().forEach((l, i) => { if (/^\s*#\s*%%/.test(l) && i > 0) decos.push({ range: new monaco.Range(i + 1, 1, i + 1, 1), options: { isWholeLine: true, className: "dx-cell-line" } }); });
  cellDecos.set(path, m.deltaDecorations(cellDecos.get(path) || [], decos));
}

/* =====================================================================
 * Debugger
 * ===================================================================== */
function renderBreakpointDecos(path) {
  const m = models.get(path);
  if (!m) return;
  const lines = project.breakpoints[path] || [];
  bpDecos.set(path, m.deltaDecorations(bpDecos.get(path) || [], lines.map((ln) => ({
    range: new monaco.Range(ln, 1, ln, 1),
    options: { glyphMarginClassName: "dx-bp", glyphMarginHoverMessage: { value: "Breakpoint" }, stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges, overviewRuler: { color: "#f87171", position: monaco.editor.OverviewRulerLane.Left } },
  }))));
}
function syncBreakpointsFromDecos(path) {
  const m = models.get(path);
  const lines = [...new Set((bpDecos.get(path) || []).map((id) => m.getDecorationRange(id)?.startLineNumber).filter(Boolean))].sort((a, b) => a - b);
  const prev = (project.breakpoints[path] || []).join();
  if (lines.join() !== prev) { project.breakpoints[path] = lines; renderBreakpointDecos(path); renderBreakpointList(); markBpsDirty(); }
}
function toggleBreakpoint(path, line) {
  if (!path || !path.endsWith(".py")) return;
  const set = new Set(project.breakpoints[path] || []);
  set.has(line) ? set.delete(line) : set.add(line);
  project.breakpoints[path] = [...set].sort((a, b) => a - b);
  if (!project.breakpoints[path].length) delete project.breakpoints[path];
  renderBreakpointDecos(path);
  renderBreakpointList();
  persistProject();
  markBpsDirty();
}
function markBpsDirty() {
  if (!dbg.active) return;
  dbg.bpsDirty = true;
  if (dbg.paused) { dbg.queue.unshift({ cmd: "bps:" + JSON.stringify(project.breakpoints) }); dbg.bpsDirty = false; dbgPump(); }
}
function clearBreakpoints() {
  project.breakpoints = {};
  for (const p of models.keys()) renderBreakpointDecos(p);
  renderBreakpointList();
  persistProject();
  markBpsDirty();
}

function dbgPump() {
  if (!dbg.waiting || !dbg.queue.length) return;
  const item = dbg.queue.shift();
  dbg.waiting = false;
  if (item.cb) dbg.evalCbs.push(item.cb);
  kernel.reply(item.cmd);
}
function dbgEval(expr, cb) { dbg.queue.push({ cmd: "eval:" + expr, cb }); dbgPump(); }

function onPaused(info) {
  dbg.paused = true;
  dbg.waiting = true;
  dbg.info = info;
  setKernelStatus("busy", `Paused at ${info.file}:${info.line}`);
  if (dbg.bpsDirty) { dbg.queue.unshift({ cmd: "bps:" + JSON.stringify(project.breakpoints) }); dbg.bpsDirty = false; }
  openFile(info.file, { line: info.line, focus: false });
  showDebugLine(info.file, info.line);
  renderCallStack();
  renderVariables(info.locals, info.globals);
  evalWatches();
  dbgPump();
  if (layout.view !== "debug" && layout.sidebar) setView("debug");
}
function onEvalResult(r) {
  const cb = dbg.evalCbs.shift();
  dbg.waiting = true;
  cb?.(r);
  dbgPump();
}
function dbgResume(cmd) {
  if (!dbg.paused) return;
  dbg.paused = false;
  clearDebugLine();
  setKernelStatus("busy", "Debugging");
  dbg.queue.push({ cmd });
  dbgPump();
  renderCallStack();
}
function dbgEnd() {
  dbg.active = dbg.paused = dbg.waiting = false;
  dbg.queue = []; dbg.evalCbs = []; dbg.info = null;
  clearDebugLine();
  renderCallStack();
  renderWatches();
}
function showDebugLine(file, line) {
  clearDebugLine();
  const m = models.get(file);
  if (!m) return;
  dbg.lineModel = m;
  dbg.lineDecos = m.deltaDecorations([], [{ range: new monaco.Range(line, 1, line, 1), options: { isWholeLine: true, className: "dx-current-line", glyphMarginClassName: "dx-current-glyph", stickiness: 1 } }]);
}
function clearDebugLine() {
  if (dbg.lineModel && !dbg.lineModel.isDisposed()) dbg.lineModel.deltaDecorations(dbg.lineDecos, []);
  dbg.lineDecos = []; dbg.lineModel = null;
}

function evalWatches() {
  for (const w of project.watches) dbgEval(w, (r) => { dbg.watchValues[w] = r.result; renderWatches(); });
  renderWatches();
}
function renderWatches() {
  const el = $("#watch-list");
  el.textContent = "";
  for (const w of project.watches) {
    el.append(h("div", { class: "row" }, h("span", { class: "k" }, w), h("span", {}, " = "),
      h("span", { class: "v", title: dbg.watchValues[w] || "" }, dbg.paused || dbg.watchValues[w] ? dbg.watchValues[w] ?? "..." : "-"),
      h("button", { class: "btn icon sm row-act", title: "Remove", onclick: () => { project.watches = project.watches.filter((x) => x !== w); persistProject(); renderWatches(); } }, icon("close"))));
  }
  if (!project.watches.length) el.append(h("div", { class: "muted small pad" }, "No watch expressions"));
}
$("#add-watch").onclick = async () => {
  const w = await promptDialog({ title: "Add watch expression", placeholder: "e.g. len(items) or items[j]", okLabel: "Add" });
  if (!w) return;
  project.watches.push(w);
  persistProject();
  if (dbg.paused) dbgEval(w, (r) => { dbg.watchValues[w] = r.result; renderWatches(); });
  renderWatches();
};
function renderCallStack() {
  const el = $("#callstack");
  el.textContent = "";
  if (!dbg.paused || !dbg.info) { el.append(h("div", { class: "muted pad" }, dbg.active ? "Running…" : "Not paused")); return; }
  dbg.info.stack.forEach((f, i) => el.append(h("div", { class: "row" + (i === 0 ? " selected" : ""), style: { paddingLeft: "12px" }, onclick: () => openFile(f.file, { line: f.line }) },
    i === 0 ? fi("arrow", "warn") : h("span", { class: "fi" }), h("span", { class: "name" }, f.name === "<module>" ? "<module>" : f.name + "()"), h("span", { class: "meta" }, `${f.file}:${f.line}`))));
}
function renderBreakpointList() {
  const el = $("#bp-list");
  el.textContent = "";
  for (const [file, lines] of Object.entries(project.breakpoints)) {
    for (const ln of lines) {
      const text = (models.get(file)?.getLineContent(ln) || "").trim();
      el.append(h("div", { class: "row", style: { paddingLeft: "12px" }, onclick: () => openFile(file, { line: ln }) },
        fi("dot", "err"), h("span", { class: "name" }, `${basename(file)}:${ln}  `, h("span", { class: "muted" }, text)),
        h("button", { class: "btn icon sm row-act", onclick: (e) => { e.stopPropagation(); toggleBreakpoint(file, ln); } }, icon("close"))));
    }
  }
  if (!el.children.length) el.append(h("div", { class: "muted pad" }, "No breakpoints"));
}
function renderDebugView() { renderWatches(); renderCallStack(); renderBreakpointList(); }
$("#clear-bps").onclick = clearBreakpoints;
$$("#debug-controls [data-dbg]").forEach((b) => (b.onclick = () => dbgResume(b.dataset.dbg)));

/* =====================================================================
 * Variables
 * ===================================================================== */
async function refreshVariables() {
  if (!kernel?.info || state.busy) return;
  try { renderVariables(await kernel.call("vars")); } catch (_) {}
}
function varRow(v, depth = 0) {
  const tr = h("tr", { class: depth ? "child" : "", style: depth ? { "--depth": depth } : null },
    h("td", { class: "n" }, v.expandable && v.path !== null && !dbg.active ? h("span", { class: "exp" }, icon("chevronRight")) : h("span", { class: "exp" }), v.name),
    h("td", { class: "t", title: v.module + "." + v.type }, v.kind === "function" ? "function" : v.kind === "class" ? "class" : v.type),
    h("td", { class: "t" }, v.size), h("td", { class: "v", title: v.value }, v.value));
  const exp = tr.querySelector(".exp");
  if (v.expandable && !dbg.active) {
    let kids = null;
    exp.parentElement.style.cursor = "pointer";
    exp.parentElement.onclick = async () => {
      if (kids) { kids.forEach((k) => k.remove()); kids = null; exp.replaceChildren(icon("chevronRight")); return; }
      if (state.busy) return;
      exp.replaceChildren(icon("chevronDown"));
      const r = await kernel.call("inspect", { name: v.path || v.name });
      kids = (r.items || []).map((c) => varRow(c, depth + 1));
      let after = tr;
      for (const k of kids) { after.after(k); after = k; }
    };
  }
  return tr;
}
function renderVariables(vars, globals) {
  const tb = $("#vars");
  tb.textContent = "";
  const add = (list) => list.forEach((v) => tb.append(varRow(v)));
  if (globals) tb.append(h("tr", {}, h("td", { colspan: 4, class: "t" }, "Locals")));
  add(vars || []);
  if (globals?.length) { tb.append(h("tr", {}, h("td", { colspan: 4, class: "t" }, "Globals"))); add(globals); }
  if (!tb.children.length) tb.append(h("tr", {}, h("td", { colspan: 4, class: "t", style: { textAlign: "center", padding: "16px" } }, "No variables yet. Run a program or use the console.")));
}

/* =====================================================================
 * Plots
 * ===================================================================== */
let plotCount = 0, unseenPlots = 0;
function addPlot(b64) {
  const src = "data:image/png;base64," + b64;
  plotCount++;
  const n = plotCount;
  const card = h("div", { class: "plot" },
    h("img", { src, alt: `Figure ${n}`, onclick: () => showImage(src) }),
    h("div", { class: "plot-acts" },
      h("button", { class: "btn sm", onclick: () => fetch(src).then((r) => r.blob()).then((b) => downloadBlob(b, `figure-${n}.png`)) }, icon("download"), "PNG"),
      h("button", { class: "btn sm", onclick: () => card.remove() }, icon("close"))));
  const plots = $("#plots");
  plots.querySelector(".empty")?.remove();
  plots.prepend(card);
  if (settings.inlineplots) {
    sink.appendNode(h("img", { src, style: { maxHeight: "240px", maxWidth: "100%", borderRadius: "6px", background: "#fff", cursor: "zoom-in", margin: "4px 0" }, onclick: () => showImage(src) }));
  }
  if (layout.panel !== "plots") { unseenPlots++; $("#plots-badge").textContent = unseenPlots; }
}
function plotsClear() {
  $("#plots").textContent = "";
  $("#plots").append(h("div", { class: "empty" }, "Figures from matplotlib (plt.show()) appear here."));
  unseenPlots = 0; $("#plots-badge").textContent = "";
}
function showImage(src) { openModal(h("div", { class: "modal image" }, h("img", { src }))); }

/* =====================================================================
 * Console input
 * ===================================================================== */
const consoleInput = $("#console-input");
const cmdHistory = LS.get("history", []);
let histIdx = cmdHistory.length;
function autoGrow() { consoleInput.style.height = "auto"; consoleInput.style.height = Math.min(200, consoleInput.scrollHeight) + "px"; }
consoleInput.addEventListener("input", autoGrow);
/** Like the Python REPL: does `src` need more lines before it can run? */
function inputStatus(src) {
  if (/\n\s*$/.test(src) && src.includes("\n")) return "complete"; // blank line ends a block
  const code = src.replace(/("""|''')[\s\S]*?(\1|$)|"(\\.|[^"\\\n])*"|'(\\.|[^'\\\n])*'|#[^\n]*/g, (m, q, close) => (q && !close ? "\u0000" : "_"));
  if (code.includes("\u0000")) return "incomplete"; // unterminated triple-quoted string
  let depth = 0;
  for (const ch of code) { if ("([{".includes(ch)) depth++; else if (")]}".includes(ch)) depth--; }
  if (depth > 0) return "incomplete";
  const lines = code.split("\n");
  const last = lines[lines.length - 1].trimEnd();
  if (last.endsWith(":") || last.endsWith("\\")) return "incomplete";
  if (lines.length > 1 && lines.some((l) => l.trimEnd().endsWith(":"))) return "incomplete";
  return "complete";
}
consoleInput.addEventListener("keydown", (e) => {
  const v = consoleInput.value;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!v.trim()) return;
    if (state.busy && !dbg.paused && !consoleTerm.inputActive) { toast("Python is busy. Your input is kept; press Enter again when it finishes.", "warn"); return; }
    const status = e.ctrlKey || dbg.paused ? "complete" : inputStatus(v);
    if (status === "incomplete") {
      const lastLine = v.slice(v.lastIndexOf("\n") + 1);
      const indent = lastLine.match(/^\s*/)[0] + (lastLine.trimEnd().endsWith(":") ? "    " : "");
      const pos = consoleInput.selectionStart;
      consoleInput.setRangeText("\n" + indent, pos, pos, "end");
      $("#console-prompt").textContent = "...";
      autoGrow();
      return;
    }
    consoleInput.value = "";
    $("#console-prompt").textContent = ">>>";
    autoGrow();
    if (cmdHistory[cmdHistory.length - 1] !== v) { cmdHistory.push(v); if (cmdHistory.length > 300) cmdHistory.shift(); LS.set("history", cmdHistory); }
    histIdx = cmdHistory.length;
    replExec(v.replace(/\s+$/, ""));
  } else if (e.key === "ArrowUp" && !v.slice(0, consoleInput.selectionStart).includes("\n")) {
    if (histIdx > 0) { e.preventDefault(); consoleInput.value = cmdHistory[--histIdx]; autoGrow(); }
  } else if (e.key === "ArrowDown" && !v.slice(consoleInput.selectionEnd).includes("\n")) {
    if (histIdx < cmdHistory.length) { e.preventDefault(); histIdx++; consoleInput.value = cmdHistory[histIdx] ?? ""; autoGrow(); }
  } else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); consoleTerm.clear(); }
  else if (e.key === "Tab") {
    e.preventDefault();
    consoleInput.setRangeText("    ", consoleInput.selectionStart, consoleInput.selectionEnd, "end");
  }
});
$("#console").addEventListener("click", () => { if (!getSelection().toString()) consoleTerm.inputActive ? consoleTerm.focusInput() : consoleInput.focus(); });
$("#terminal").addEventListener("click", () => { if (!getSelection().toString()) terminal.focusInput(); });

/* =====================================================================
 * Packages view
 * ===================================================================== */
const SUGGESTED = ["numpy", "pandas", "matplotlib", "scipy", "sympy", "scikit-learn", "seaborn", "networkx", "pillow", "rich", "requests", "beautifulsoup4", "pyyaml", "regex"];
let installedPkgs = [];
async function installFromInput(names) {
  names = names.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  if (!names.length) return;
  for (const n of names) if (!project.packages.includes(n)) project.packages.push(n);
  persistProject();
  renderPackagesView();
  if (state.busy) return toast("Will install when the current program finishes.", "info");
  try {
    await kernelReady();
    showPanel("terminal");
    const prev = sink; sink = terminal;
    setBusy(true, "install");
    const res = await kernel.call("install", { packages: names });
    res.forEach((r) => (r.ok ? kernelInstalled.add(r.name) : null));
    const failed = res.filter((r) => !r.ok).map((r) => r.name);
    if (failed.length) { project.packages = project.packages.filter((p) => !failed.includes(p)); persistProject(); }
    sink = prev;
  } catch (e) { toast(e.message, "error"); }
  finally { setBusy(false); refreshPackages(); renderPackagesView(); }
}
async function refreshPackages() {
  if (!kernel?.info || state.busy) return;
  try { installedPkgs = await kernel.call("list-packages"); } catch (_) {}
  renderInstalled();
}
function renderPackagesView() {
  const sug = $("#pkg-suggest");
  sug.textContent = "";
  SUGGESTED.forEach((s) => sug.append(h("button", { class: "chip", onclick: () => installFromInput(s) }, "+ " + s)));
  const reqs = $("#pkg-reqs");
  reqs.textContent = "";
  for (const p of project.packages) reqs.append(h("div", { class: "row", style: { paddingLeft: "12px" } }, fi("package"), h("span", { class: "name" }, p),
    h("span", { class: "meta" }, kernelInstalled.has(p) ? "installed" : "pending"),
    h("button", { class: "btn icon sm row-act", title: "Remove from requirements", onclick: () => { project.packages = project.packages.filter((x) => x !== p); persistProject(); renderPackagesView(); } }, icon("close"))));
  if (!project.packages.length) reqs.append(h("div", { class: "muted pad" }, "None. Imports are auto-installed when you run."));
  renderInstalled();
}
function renderInstalled() {
  const el = $("#pkg-list");
  el.textContent = "";
  const f = $("#pkg-filter").value.toLowerCase();
  for (const p of installedPkgs.filter((p) => p.name.toLowerCase().includes(f))) {
    el.append(h("div", { class: "row", style: { paddingLeft: "12px" }, title: p.source }, h("span", { class: "name" }, p.name), h("span", { class: "meta" }, p.version)));
  }
  if (!installedPkgs.length) el.append(h("div", { class: "muted pad" }, kernel?.info ? "Click refresh to list installed packages" : "Python is starting…"));
}
$("#pkg-install").onclick = () => { installFromInput($("#pkg-input").value); $("#pkg-input").value = ""; };
$("#pkg-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#pkg-install").click(); });
$("#pkg-refresh").onclick = refreshPackages;
$("#pkg-filter").addEventListener("input", renderInstalled);

/* =====================================================================
 * Search
 * ===================================================================== */
const searchState = { case: false, word: false, regex: false };
function searchRegex() {
  const q = $("#search-input").value;
  if (!q) return null;
  let src = searchState.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (searchState.word) src = `\\b${src}\\b`;
  try { return new RegExp(src, "g" + (searchState.case ? "" : "i")); } catch (_) { return undefined; }
}
const runSearch = debounce(() => {
  const out = $("#search-results");
  out.textContent = "";
  const re = searchRegex();
  if (re === undefined) { $("#search-summary").textContent = "Invalid regular expression"; return; }
  if (!re) { $("#search-summary").textContent = ""; return; }
  let total = 0, files = 0;
  for (const path of Object.keys(project.files).sort()) {
    const lines = (models.get(path)?.getValue() ?? project.files[path]).split("\n");
    const hits = [];
    lines.forEach((l, i) => { re.lastIndex = 0; let m; while ((m = re.exec(l)) && hits.length < 500) { hits.push({ line: i + 1, col: m.index + 1, len: m[0].length, text: l }); if (!m[0].length) re.lastIndex++; } });
    if (!hits.length) continue;
    files++; total += hits.length;
    out.append(h("div", { class: "row", style: { paddingLeft: "8px", fontWeight: 600 }, onclick: () => openFile(path) }, fileIcon(path), h("span", { class: "name" }, path), h("span", { class: "badge" }, hits.length)));
    for (const hit of hits.slice(0, 100)) {
      const start = Math.max(0, hit.col - 1 - 30);
      const pre = (start ? "…" : "") + hit.text.slice(start, hit.col - 1).trimStart();
      out.append(h("div", { class: "row", style: { paddingLeft: "28px" }, title: hit.text.trim(), onclick: () => openFile(path, { line: hit.line, col: hit.col, selectLen: hit.len }) },
        h("span", { class: "name", html: `${esc(pre)}<span class="match">${esc(hit.text.substr(hit.col - 1, hit.len))}</span>${esc(hit.text.slice(hit.col - 1 + hit.len, hit.col + 80))}` }),
        h("span", { class: "meta" }, hit.line)));
    }
  }
  $("#search-summary").textContent = total ? `${total} result${total > 1 ? "s" : ""} in ${files} file${files > 1 ? "s" : ""}` : "No results";
}, 150);
$("#search-input").addEventListener("input", runSearch);
for (const k of ["case", "word", "regex"]) $("#search-" + k).onclick = (e) => { searchState[k] = !searchState[k]; e.currentTarget.classList.toggle("on", searchState[k]); runSearch(); };
$("#replace-all").onclick = async () => {
  const re = searchRegex();
  if (!re) return;
  const rep = $("#replace-input").value;
  let n = 0;
  for (const [p, m] of models) {
    const text = m.getValue();
    const matches = text.match(re);
    if (!matches) continue;
    n += matches.length;
    applyText(m, text.replace(re, rep), "replace");
  }
  toast(n ? `Replaced ${n} occurrence${n > 1 ? "s" : ""}` : "Nothing to replace", n ? "ok" : "info");
  runSearch();
};

/* =====================================================================
 * Settings
 * ===================================================================== */
const SETTINGS_SCHEMA = [
  { key: "theme", label: "Color theme", type: "select", options: [["dark", "Dexna Dark"], ["light", "Dexna Light"], ["auto", "Follow system"]] },
  { key: "fontSize", label: "Editor font size", type: "number", min: 10, max: 30 },
  { key: "tabSize", label: "Indent size", type: "select", options: [[2, "2 spaces"], [4, "4 spaces"], [8, "8 spaces"]] },
  { key: "fontLigatures", label: "Font ligatures", type: "bool" },
  { key: "wordWrap", label: "Word wrap", type: "bool" },
  { key: "minimap", label: "Show minimap", type: "bool" },
  { key: "stickyScroll", label: "Sticky scroll", desc: "Pin the enclosing class/function header while scrolling.", type: "bool" },
  { key: "bracketColors", label: "Bracket pair colours", type: "bool" },
  { key: "renderWhitespace", label: "Render whitespace", type: "select", options: [["none", "None"], ["selection", "In selection"], ["boundary", "Boundary"], ["all", "All"]] },
  { key: "autoLint", label: "Live linting", desc: "Check code with pyflakes as you type.", type: "bool" },
  { key: "lineLength", label: "Formatter line length", desc: "Used by black and isort.", type: "number", min: 40, max: 200 },
  { key: "formatOnSave", label: "Format on save / run", desc: "Run black on Ctrl+S and before running.", type: "bool" },
  { key: "autoInstall", label: "Auto-install imports", desc: "Install missing packages from PyPI when you run code.", type: "bool" },
  { key: "clearOnRun", label: "Clear terminal on run", type: "bool" },
  { key: "inlineplots", label: "Inline plots", desc: "Also show figures inside the terminal/console.", type: "bool" },
];
function setSetting(key, value) {
  settings[key] = value;
  LS.set("settings", settings);
  if (key === "theme") applyTheme();
  if (editor) editor.updateOptions(editorOptions());
  if (key === "tabSize") for (const m of models.values()) m.updateOptions({ tabSize: value });
  if (key === "autoLint") lintAll();
  $("#sb-indent").textContent = `Spaces: ${settings.tabSize}`;
  renderSettings();
}
function renderSettings() {
  const form = $("#settings-form");
  form.textContent = "";
  for (const s of SETTINGS_SCHEMA) {
    let control;
    if (s.type === "bool") {
      control = h("input", { type: "checkbox", id: "set-" + s.key, checked: settings[s.key], onchange: (e) => setSetting(s.key, e.target.checked) });
      form.append(h("div", { class: "setting inline" }, control, h("div", {}, h("label", { for: "set-" + s.key }, s.label), s.desc ? h("div", { class: "desc" }, s.desc) : null)));
      continue;
    }
    if (s.type === "select") {
      control = h("select", { onchange: (e) => setSetting(s.key, typeof s.options[0][0] === "number" ? +e.target.value : e.target.value) },
        s.options.map(([v, l]) => h("option", { value: v, selected: settings[s.key] == v }, l)));
    } else control = h("input", { type: "number", min: s.min, max: s.max, value: settings[s.key], onchange: (e) => setSetting(s.key, Math.max(s.min, Math.min(s.max, +e.target.value || DEFAULT_SETTINGS[s.key]))) });
    form.append(h("div", { class: "setting" }, h("label", {}, s.label), s.desc ? h("div", { class: "desc" }, s.desc) : null, control));
  }
  form.append(h("div", { class: "stack", style: { marginTop: "8px" } },
    h("button", { class: "btn", onclick: () => { Object.assign(settings, DEFAULT_SETTINGS); setSetting("theme", settings.theme); toast("Settings reset", "ok"); } }, "Reset settings"),
    h("button", { class: "btn", onclick: showShortcuts }, "Keyboard shortcuts"),
    h("button", { class: "btn", style: { color: "var(--stop)" }, onclick: resetEverything }, "Delete all local data…")));
}
async function resetEverything() {
  if (!(await confirmDialog({ title: "Delete all local data", message: "This removes every project, setting and history entry stored by Dexna in this browser. Download anything you want to keep first.", okLabel: "Delete everything", danger: true }))) return;
  Object.keys(localStorage).filter((k) => k.startsWith("dexna:")).forEach((k) => localStorage.removeItem(k));
  persistProject.flush = () => {};
  location.reload();
}

/* =====================================================================
 * Share links
 * ===================================================================== */
const b64url = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function compress(str) { return b64url(new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer())); }
async function decompress(s) { return new Response(new Blob([unb64url(s)]).stream().pipeThrough(new DecompressionStream("gzip"))).text(); }

async function shareProject() {
  const payload = JSON.stringify({ n: project.name, e: project.pinEntry ? project.entry : getRunTarget(), f: project.files, p: project.packages });
  const data = await compress(payload);
  const url = `${location.origin}${location.pathname}#p=${data}`;
  const input = h("input", { value: url, readonly: true });
  const copy = h("button", { class: "btn primary", onclick: async () => { try { await navigator.clipboard.writeText(url); copy.textContent = "Copied"; } catch (_) { input.select(); document.execCommand("copy"); copy.textContent = "Copied"; } } }, "Copy link");
  openModal(h("div", { class: "modal" }, h("div", { class: "modal-head" }, "Share project"),
    h("div", { class: "modal-body" }, h("p", {}, `Anyone with this link gets a copy of "${project.name}" (${Object.keys(project.files).length} files, ${(url.length / 1024).toFixed(1)} KB link). The code is stored in the link itself, nothing is uploaded.`), input,
      url.length > 60000 ? h("p", { style: { color: "var(--warn)", marginTop: "8px" } }, "This link is very long and may not work everywhere. Consider downloading a ZIP instead.") : null),
    h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => closeOverlay() }, "Close"), copy)));
  input.select();
}

async function importFromHash() {
  const m = location.hash.match(/^#p=(.+)$/);
  if (!m) return false;
  history.replaceState(null, "", location.pathname + location.search);
  try {
    const d = JSON.parse(await decompress(m[1]));
    createProject({ name: d.n, entry: d.e, files: d.f, packages: d.p || [] }, `${d.n} (shared)`);
    toast(`Opened shared project "${d.n}"`, "ok");
    return true;
  } catch (e) { toast("This share link is broken or incomplete.", "error"); return false; }
}

/* =====================================================================
 * Layout: views, panel, resizers
 * ===================================================================== */
function setView(view, { toggle = false } = {}) {
  if (toggle && layout.view === view && layout.sidebar) { layout.sidebar = false; }
  else { layout.view = view; layout.sidebar = true; }
  $("#app").classList.toggle("no-sidebar", !layout.sidebar);
  $("#app").classList.toggle("show-sidebar", layout.sidebar);
  $$("#activitybar [data-view]").forEach((b) => b.classList.toggle("active", layout.sidebar && b.dataset.view === layout.view));
  $$("#sidebar .view").forEach((v) => v.classList.toggle("active", v.dataset.view === layout.view));
  if (layout.view === "search" && layout.sidebar) setTimeout(() => $("#search-input").focus(), 0);
  if (layout.view === "packages" && layout.sidebar && !installedPkgs.length) refreshPackages();
  if (layout.view === "outline") renderOutline();
  saveLayout();
}
$$("#activitybar [data-view]").forEach((b) => (b.onclick = () => setView(b.dataset.view, { toggle: true })));

function showPanel(name) {
  layout.panelOpen = true;
  if (name) layout.panel = name;
  $("#app").classList.remove("no-panel");
  $$(".panel-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.panel === layout.panel));
  $$(".panel-view").forEach((v) => v.classList.toggle("active", v.dataset.panel === layout.panel));
  if (layout.panel === "plots") { unseenPlots = 0; $("#plots-badge").textContent = ""; }
  if (layout.panel === "console" && !consoleTerm.inputActive) setTimeout(() => consoleInput.focus(), 0);
  saveLayout();
}
function togglePanel() {
  layout.panelOpen = !layout.panelOpen;
  $("#app").classList.toggle("no-panel", !layout.panelOpen);
  $("#app").classList.remove("panel-max");
  if (layout.panelOpen) showPanel();
  saveLayout();
}
$$(".panel-tabs button").forEach((b) => (b.onclick = () => showPanel(b.dataset.panel)));
$("#panel-close").onclick = togglePanel;
$("#panel-max").onclick = () => $("#app").classList.toggle("panel-max");
$("#panel-clear").onclick = () => {
  if (layout.panel === "terminal") terminal.clear();
  else if (layout.panel === "console") consoleTerm.clear();
  else if (layout.panel === "plots") plotsClear();
};

function setupResizers() {
  const sb = $("#sidebar"), panel = $("#panel");
  sb.style.width = layout.sidebarWidth + "px";
  panel.style.height = layout.panelHeight + "px";
  const drag = (handle, onMove) => handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    handle.classList.add("dragging");
    document.body.classList.add("resizing");
    const move = (ev) => onMove(ev);
    const up = () => { handle.classList.remove("dragging"); document.body.classList.remove("resizing"); handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); saveLayout(); };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
  drag($("#sidebar-resizer"), (e) => { layout.sidebarWidth = Math.max(170, Math.min(600, e.clientX - sb.getBoundingClientRect().left)); sb.style.width = layout.sidebarWidth + "px"; });
  drag($("#panel-resizer"), (e) => { const r = $("#workbench").getBoundingClientRect(); layout.panelHeight = Math.max(90, Math.min(r.height - 120, r.bottom - e.clientY)); panel.style.height = layout.panelHeight + "px"; });
}

let flashTimer;
function setStatusFlash(text) {
  $("#sb-run").textContent = text;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { if ($("#sb-run").textContent === text) $("#sb-run").textContent = ""; }, 2500);
}

/* =====================================================================
 * Commands, menus & keyboard shortcuts
 * ===================================================================== */
const COMMANDS = [
  { id: "run", label: "Run Python File", cat: "Run", kb: "f5", run: () => (dbg.paused ? dbgResume("continue") : runFile()) },
  { id: "run2", label: "Run Python File", cat: "Run", kb: "ctrl+enter", hidden: true, when: (e) => !e.target.closest?.(".console-input, .term"), run: () => runFile() },
  { id: "debug", label: "Start Debugging", cat: "Run", kb: "f6", run: () => runFile({ debug: true }) },
  { id: "debug-entry", label: "Debug (Stop on Entry)", cat: "Run", run: () => runFile({ debug: true, stopOnEntry: true }) },
  { id: "stop", label: "Stop", cat: "Run", kb: "shift+f5", run: stopExecution },
  { id: "restart", label: "Restart Python Kernel", cat: "Run", run: () => (state.busy ? restartKernel("requested") : restartKernel()) },
  { id: "run-sel", label: "Run Selection / Cell in Console", cat: "Run", kb: "ctrl+shift+enter", run: runSelection },
  { id: "bp", label: "Toggle Breakpoint", cat: "Debug", kb: "f9", run: () => currentPath() && toggleBreakpoint(currentPath(), editor.getPosition().lineNumber) },
  { id: "over", label: "Step Over", cat: "Debug", kb: "f10", when: () => dbg.paused, run: () => dbgResume("over") },
  { id: "into", label: "Step Into", cat: "Debug", kb: "f11", when: () => dbg.paused, run: () => dbgResume("step") },
  { id: "out", label: "Step Out", cat: "Debug", kb: "shift+f11", when: () => dbg.paused, run: () => dbgResume("out") },
  { id: "clear-bps", label: "Remove All Breakpoints", cat: "Debug", run: clearBreakpoints },
  { id: "new-file", label: "New File…", cat: "File", kb: "ctrl+alt+n", run: () => newFileDialog() },
  { id: "new-folder", label: "New Folder…", cat: "File", run: () => newFolderDialog() },
  { id: "new-project", label: "New Project…", cat: "File", run: newProject },
  { id: "examples", label: "Open Example…", cat: "File", run: showExamples },
  { id: "quick-open", label: "Go to File…", cat: "Go", kb: "ctrl+p", run: () => quickOpen() },
  { id: "palette", label: "Show All Commands", cat: "View", kb: "ctrl+shift+p", run: () => quickOpen(">") },
  { id: "palette2", label: "Show All Commands", kb: "f1", hidden: true, run: () => quickOpen(">") },
  { id: "goto-symbol", label: "Go to Symbol in File…", cat: "Go", kb: "ctrl+shift+o", run: () => { editor.focus(); editor.getAction("editor.action.quickOutline")?.run(); } },
  { id: "goto-line", label: "Go to Line…", cat: "Go", kb: "ctrl+g", run: () => { editor.focus(); editor.getAction("editor.action.gotoLine")?.run(); } },
  { id: "save", label: "Save", cat: "File", kb: "ctrl+s", run: saveCommand },
  { id: "close-tab", label: "Close Editor", cat: "File", kb: "alt+w", run: () => project.active && closeTab(project.active) },
  { id: "upload", label: "Upload Files…", cat: "File", run: () => { uploadTarget = ""; $("#file-upload").click(); } },
  { id: "import-zip", label: "Import Project from ZIP…", cat: "File", run: () => $("#zip-upload").click() },
  { id: "download", label: "Download Project as ZIP", cat: "File", run: downloadProject },
  { id: "download-file", label: "Download Current File", cat: "File", run: () => currentPath() && downloadFile(currentPath()) },
  { id: "share", label: "Share Project Link…", cat: "File", run: shareProject },
  { id: "rename-project", label: "Rename Project…", cat: "File", run: renameProject },
  { id: "delete-project", label: "Delete Project…", cat: "File", run: deleteProject },
  { id: "format", label: "Format Document (black)", cat: "Edit", kb: "shift+alt+f", run: formatDocument },
  { id: "organize", label: "Organize Imports (isort)", cat: "Edit", kb: "shift+alt+o", run: organizeImports },
  { id: "find", label: "Find", cat: "Edit", run: () => { editor.focus(); editor.getAction("actions.find")?.run(); } },
  { id: "replace", label: "Replace", cat: "Edit", run: () => { editor.focus(); editor.getAction("editor.action.startFindReplaceAction")?.run(); } },
  { id: "comment", label: "Toggle Line Comment", cat: "Edit", run: () => { editor.focus(); editor.getAction("editor.action.commentLine")?.run(); } },
  { id: "rename-symbol", label: "Rename Symbol", cat: "Edit", run: () => { editor.focus(); editor.getAction("editor.action.rename")?.run(); } },
  { id: "find-files", label: "Search in Files", cat: "View", kb: "ctrl+shift+f", run: () => setView("search") },
  { id: "explorer", label: "Show Explorer", cat: "View", kb: "ctrl+shift+e", run: () => setView("explorer") },
  { id: "outline", label: "Show Outline", cat: "View", run: () => setView("outline") },
  { id: "debug-view", label: "Show Run & Debug", cat: "View", kb: "ctrl+shift+d", run: () => setView("debug") },
  { id: "packages", label: "Show Packages", cat: "View", run: () => setView("packages") },
  { id: "settings", label: "Open Settings", cat: "Preferences", kb: "ctrl+,", run: () => setView("settings") },
  { id: "sidebar", label: "Toggle Sidebar", cat: "View", kb: "ctrl+b", run: () => setView(layout.view, { toggle: true }) },
  { id: "panel", label: "Toggle Panel", cat: "View", kb: "ctrl+j", run: togglePanel },
  { id: "panel2", label: "Toggle Panel", kb: "ctrl+`", hidden: true, run: togglePanel },
  { id: "terminal", label: "Show Terminal", cat: "View", run: () => showPanel("terminal") },
  { id: "console", label: "Focus Python Console", cat: "View", kb: "ctrl+shift+c", run: () => showPanel("console") },
  { id: "problems", label: "Show Problems", cat: "View", kb: "ctrl+shift+m", run: () => showPanel("problems") },
  { id: "variables", label: "Show Variables", cat: "View", run: () => showPanel("variables") },
  { id: "plots", label: "Show Plots", cat: "View", run: () => showPanel("plots") },
  { id: "clear-term", label: "Clear Terminal", cat: "View", run: () => terminal.clear() },
  { id: "theme", label: "Toggle Light/Dark Theme", cat: "Preferences", run: () => setSetting("theme", resolvedTheme() === "dark" ? "light" : "dark") },
  { id: "zoom-in", label: "Increase Font Size", cat: "View", kb: "ctrl+=", run: () => setSetting("fontSize", Math.min(30, settings.fontSize + 1)) },
  { id: "zoom-out", label: "Decrease Font Size", cat: "View", kb: "ctrl+-", run: () => setSetting("fontSize", Math.max(10, settings.fontSize - 1)) },
  { id: "minimap", label: "Toggle Minimap", cat: "View", run: () => setSetting("minimap", !settings.minimap) },
  { id: "wrap", label: "Toggle Word Wrap", cat: "View", kb: "alt+z", run: () => setSetting("wordWrap", !settings.wordWrap) },
  { id: "shortcuts", label: "Keyboard Shortcuts", cat: "Help", kb: "ctrl+k ctrl+s", run: () => showShortcuts() },
  { id: "about", label: "About Dexna", cat: "Help", run: () => showAbout() },
];
const normKb = (kb) => { const parts = kb.split("+"); const key = parts.pop(); return ["ctrl", "alt", "shift"].filter((m) => parts.includes(m)).concat(key).join("+"); };
const keymap = new Map();
for (const c of COMMANDS) if (c.kb && !c.kb.includes(" ")) keymap.set(normKb(c.kb), c);
const cmdById = (id) => COMMANDS.find((c) => c.id === id);

function comboOf(e) {
  let k;
  if (e.code?.startsWith("Key")) k = e.code.slice(3).toLowerCase();
  else if (e.code?.startsWith("Digit")) k = e.code.slice(5);
  else if (e.code === "Backquote") k = "`";
  else if (e.code === "Equal") k = "=";
  else if (e.code === "Minus") k = "-";
  else if (e.code === "Comma") k = ",";
  else k = e.key.toLowerCase();
  if (k === "control" || k === "shift" || k === "alt" || k === "meta") return null;
  return [(e.ctrlKey || e.metaKey) && "ctrl", e.altKey && "alt", e.shiftKey && "shift", k].filter(Boolean).join("+");
}
window.addEventListener("keydown", (e) => {
  if (closeOverlay) return;
  const combo = comboOf(e);
  if (!combo) return;
  const cmd = keymap.get(combo);
  if (!cmd || (cmd.when && !cmd.when(e))) return;
  // let text fields keep their own editing shortcuts
  if (e.target.matches?.("input:not(.stdin), textarea:not(.inputarea)") && ["ctrl+enter"].includes(combo)) return;
  e.preventDefault();
  e.stopPropagation();
  cmd.run();
}, true);

async function saveCommand() {
  if (settings.formatOnSave) await formatDocument().catch(() => {});
  persistProject.flush();
  setStatusFlash("Saved locally");
}

function quickOpen(prefix = "") {
  quickPick({
    placeholder: "Search files by name (type > for commands, : for line, @ for symbols)",
    value: prefix,
    source: (q) => {
      if (q.startsWith(">")) {
        const t = q.slice(1).trim();
        const own = COMMANDS.filter((c) => !c.hidden).map((c) => ({ label: (c.cat ? c.cat + ": " : "") + c.label, kb: c.kb, run: c.run }));
        const seen = new Set(own.map((o) => o.label.replace(/^.*?: /, "").toLowerCase()));
        const ed = editor ? editor.getSupportedActions().filter((a) => a.label && !seen.has(a.label.toLowerCase())).map((a) => ({ label: a.label, run: () => { editor.focus(); a.run(); } })) : [];
        return [...own, ...ed].map((c) => ({ ...c, m: fuzzy(t, c.label) })).filter((c) => c.m)
          .sort((a, b) => b.m.score - a.m.score).map((c) => ({ label: c.label, labelHtml: highlight(c.label, c.m.idx), desc: kbLabel(c.kb), run: c.run }));
      }
      if (q.startsWith(":")) {
        const n = parseInt(q.slice(1), 10);
        return editor.getModel() ? [{ label: Number.isFinite(n) ? `Go to line ${n}` : `Type a line number (1-${editor.getModel().getLineCount()})`, run: () => Number.isFinite(n) && openFile(project.active, { line: n }) }] : [];
      }
      if (q.startsWith("@")) {
        const t = q.slice(1);
        const flat = [];
        const walk = (l) => l.forEach((s) => { flat.push(s); walk(s.children || []); });
        walk(symbolsCache.get(project.active) || []);
        return flat.map((s) => ({ s, m: fuzzy(t, s.name) })).filter((x) => x.m).map(({ s, m }) => ({ iconHtml: symIconHtml(s.kind), label: s.name, labelHtml: highlight(s.name, m.idx), desc: s.kind + ", line " + s.line, run: () => openFile(project.active, { line: s.line, col: s.col }) }));
      }
      const files = Object.keys(project.files);
      if (!q) {
        const recent = [...project.open].reverse();
        return [...recent, ...files.filter((f) => !recent.includes(f))].map((f) => ({ iconHtml: fileIconSvg(f), label: basename(f), detail: dirname(f), desc: project.open.includes(f) ? "open" : "", run: () => openFile(f) }));
      }
      return files.map((f) => ({ f, m: fuzzy(q, f) })).filter((x) => x.m).sort((a, b) => b.m.score - a.m.score)
        .map(({ f, m }) => ({ iconHtml: fileIconSvg(f), label: f, labelHtml: highlight(f, m.idx), run: () => openFile(f) }));
    },
  });
}

const MENUS = {
  File: ["new-file", "new-folder", "new-project", "examples", "-", "upload", "import-zip", "download", "download-file", "share", "-", "save", "close-tab", "-", "rename-project", "delete-project"],
  Edit: ["find", "replace", "find-files", "-", "format", "organize", "comment", "rename-symbol", "-", "palette"],
  Run: ["run", "debug", "debug-entry", "run-sel", "stop", "-", "bp", "clear-bps", "-", "restart", "clear-term"],
  View: ["explorer", "find-files", "outline", "debug-view", "packages", "-", "sidebar", "panel", "console", "problems", "variables", "plots", "-", "zoom-in", "zoom-out", "minimap", "wrap", "theme"],
  Help: ["shortcuts", "examples", "about"],
};
function buildMenus() {
  const bar = $("#menus");
  for (const [name, ids] of Object.entries(MENUS)) {
    const btn = h("button", {}, name);
    const open = () => {
      hideMenu();
      btn.classList.add("open");
      const r = btn.getBoundingClientRect();
      showMenu(r.left, r.bottom + 2, ids.map((id) => (id === "-" ? "-" : { label: cmdById(id).label, kb: cmdById(id).kb, run: cmdById(id).run })), btn);
    };
    btn.onclick = () => (btn.classList.contains("open") ? hideMenu() : open());
    btn.onmouseenter = () => { if ($(".menus > button.open") && !btn.classList.contains("open")) open(); };
    bar.append(btn);
  }
}

function showShortcuts() {
  const rows = COMMANDS.filter((c) => c.kb && !c.hidden).map((c) => h("tr", {}, h("td", { style: { padding: "4px 12px 4px 0" } }, c.label), h("td", {}, c.kb.split(" ").map((k) => h("kbd", {}, kbLabel(k))))));
  rows.push(h("tr", {}, h("td", { style: { padding: "4px 12px 4px 0" } }, "Go to Definition / Peek / References"), h("td", {}, h("kbd", {}, "F12"), " ", h("kbd", {}, "Alt+F12"), " ", h("kbd", {}, "Shift+F12"))));
  rows.push(h("tr", {}, h("td", { style: { padding: "4px 12px 4px 0" } }, "Rename Symbol / Quick Fix"), h("td", {}, h("kbd", {}, "F2"), " ", h("kbd", {}, kbLabel("ctrl+.")))));
  rows.push(h("tr", {}, h("td", { style: { padding: "4px 12px 4px 0" } }, "Multi-cursor / Add next match"), h("td", {}, h("kbd", {}, "Alt+Click"), " ", h("kbd", {}, kbLabel("ctrl+d")))));
  openModal(h("div", { class: "modal", style: { width: "min(620px, calc(100vw - 32px))" } }, h("div", { class: "modal-head" }, "Keyboard shortcuts"),
    h("div", { class: "modal-body", style: { maxHeight: "60vh", overflow: "auto" } }, h("table", { style: { width: "100%", borderCollapse: "collapse" } }, rows))));
}
function showAbout() {
  openModal(h("div", { class: "modal" }, h("div", { class: "modal-head" }, "About Dexna"),
    h("div", { class: "modal-body" },
      h("p", {}, "Dexna is a Python IDE that runs entirely in your browser. Your code never leaves your machine: Python runs locally in WebAssembly and projects are saved in this browser's storage."),
      h("p", {}, `Python ${kernelInfo?.version || "..."} via Pyodide ${kernelInfo?.pyodide || ""}. Editor: Monaco. Language features: jedi, pyflakes, black and isort.`),
      h("p", {}, kernel?.isolated ? "Full mode: input(), Stop and the debugger are available." : "Limited mode: cross-origin isolation is unavailable, so input() and the debugger are disabled. Reloading usually fixes this.")),
    h("div", { class: "modal-foot" }, h("button", { class: "btn primary", onclick: () => closeOverlay() }, "Close"))));
}

/* =====================================================================
 * Boot
 * ===================================================================== */
function startLsp() {
  lsp = new PyClient("lsp", (msg) => {
    if (msg.type === "capability" && msg.name === "lint") { canLint = true; lintAll(); }
  });
  lsp.start().then(() => {
    lspReady = true;
    lspSyncAll();
    scheduleOutline();
  }).catch((e) => console.warn("Dexna language server failed:", e));
}

function wireStatic() {
  $$("[data-icon]").forEach((el) => el.replaceWith(icon(el.dataset.icon)));
  $("#btn-run").onclick = () => runFile();
  $("#btn-debug").onclick = () => runFile({ debug: true });
  $("#btn-stop").onclick = stopExecution;
  $("#btn-share").onclick = shareProject;
  $("#btn-theme").onclick = () => setSetting("theme", resolvedTheme() === "dark" ? "light" : "dark");
  $("#sb-kernel").classList.add("clickable");
  $("#sb-kernel").onclick = (e) => showMenu(e.clientX, e.clientY - 90, [
    { label: "Restart Python", run: () => restartKernel() },
    { label: "Interrupt", disabled: !state.busy, run: stopExecution },
    { label: "Show Packages", run: () => setView("packages") },
  ]);
  $$('[data-view="debug"] [data-act]').forEach((b) => (b.onclick = () => runFile({ debug: b.dataset.act !== "run", stopOnEntry: b.dataset.act === "debug-entry" })));
  $$("#welcome [data-act]").forEach((b) => (b.onclick = () => ({ "new-file": () => newFileDialog(), "quick-open": () => quickOpen(), palette: () => quickOpen(">"), examples: showExamples })[b.dataset.act]()));
  const iso = $("#sb-iso");
  const isolated = self.crossOriginIsolated;
  iso.innerHTML = isolated ? `${iconSvg("bolt")}<span>Full mode</span>` : `${iconSvg("circle")}<span>Limited mode</span>`;
  iso.title = isolated ? "Cross-origin isolated: input(), Stop and the debugger are enabled" : "Not cross-origin isolated: input() and the debugger are unavailable. Reload the page to enable them.";
  $("#sb-indent").textContent = `Spaces: ${settings.tabSize}`;
  window.addEventListener("beforeunload", () => { persistProject.flush(); LS.set("layout", layout); });
  document.addEventListener("contextmenu", (e) => { if (e.target.closest("#titlebar, #activitybar, #statusbar")) e.preventDefault(); });
}

async function boot() {
  const splash = $("#splash");
  document.documentElement.dataset.theme = resolvedTheme();
  wireStatic();
  buildMenus();
  setupResizers();
  renderSettings();
  const sidebarWasOpen = layout.sidebar;
  setView(layout.view);
  if (!sidebarWasOpen) setView(layout.view, { toggle: true });
  if (innerWidth <= 640) { layout.sidebar = false; $("#app").classList.remove("show-sidebar"); $$("#activitybar [data-view]").forEach((b) => b.classList.remove("active")); }
  showPanel(layout.panel);
  if (!layout.panelOpen) togglePanel();

  // Python starts loading right away, in parallel with the editor.
  startKernel().catch(() => {});

  try {
    monaco = await loadMonaco();
  } catch (e) {
    $("#splash-msg").textContent = "Could not load the editor. Check your internet connection and reload.";
    throw e;
  }
  defineThemes();
  applyTheme();
  createEditor();
  organizeImportsCommand = editor.addCommand(0, () => organizeImports());
  registerProviders();
  monaco.editor.onDidChangeMarkers(() => refreshProblems());

  const shared = await importFromHash();
  if (!shared) {
    const ex = new URLSearchParams(location.search).get("example");
    const tpl = ex && EXAMPLES.find((x) => x.id === ex);
    if (tpl) { createProject(tpl); history.replaceState(null, "", location.pathname); }
    else {
      const cur = LS.get("current", null);
      if (!(cur && (await loadProject(cur)))) {
        if (projectsIndex.length) await loadProject(projectsIndex[0].id);
        else createProject(EXAMPLES[0]);
      }
    }
  }
  refreshProblems();
  renderVariables([]);
  plotsClear();
  terminal.system("Dexna is ready. F5 runs the current file, F6 debugs it, Ctrl+Shift+P lists all commands.");
  consoleTerm.system("Python console. Variables from your last run are available here, for example: [x**2 for x in range(10)]");
  splash.classList.add("fade");
  setTimeout(() => splash.remove(), 400);

  if ("serviceWorker" in navigator && !self.crossOriginIsolated && location.protocol === "https:") {
    setTimeout(() => toast("Running in limited mode (no input() or debugger). Reload the page to enable full mode.", "warn", 7000), 4000);
  }
}

// Handy for power users and automated tests: window.dexna.lsp("complete", [...])
window.dexna = {
  lsp: (method, args) => lspCall(method, args),
  kernel: () => kernel,
  project: () => project,
  run: runFile,
  repl: replExec,
  toggleBreakpoint,
};

boot();
