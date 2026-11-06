// Dexna: a Python IDE in the browser.
import { PyClient } from "./pyclient.js";
import { icon, iconSvg, fileIcon as fileBadge, fileIconSvg } from "./icons.js";
import { registerLanguageTools, SNIPPETS } from "./langtools.js";
import { starterFor } from "./starters.js";
import { ONLINE_LANGS, ONLINE_BY_ID, readsInput, runOnline } from "./online.js";
import { THEMES, THEME_BY_ID, DEFAULT_DARK, DEFAULT_LIGHT, uiVars, ansiPalette, monacoTheme } from "./themes.js";
import { Terminal, setAnsiPalette } from "./terminal.js";
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
  theme: DEFAULT_DARK, darkTheme: DEFAULT_DARK, lightTheme: DEFAULT_LIGHT, fontSize: 14, fontLigatures: true, tabSize: 4, wordWrap: false, minimap: true,
  stickyScroll: true, renderWhitespace: "selection", lineLength: 88, formatOnSave: false,
  autoLint: true, autoInstall: true, clearOnRun: false, bracketColors: true, inlineplots: true, onlineRunners: false,
};
const settings = { ...DEFAULT_SETTINGS, ...LS.get("settings", {}) };
// older versions stored "dark" / "light"
if (settings.theme === "dark") settings.theme = DEFAULT_DARK;
else if (settings.theme === "light") settings.theme = DEFAULT_LIGHT;
if (settings.theme !== "auto" && !THEME_BY_ID[settings.theme]) settings.theme = DEFAULT_DARK;
if (!THEME_BY_ID[settings.darkTheme]) settings.darkTheme = DEFAULT_DARK;
if (!THEME_BY_ID[settings.lightTheme]) settings.lightTheme = DEFAULT_LIGHT;
const layout = { sidebarWidth: 260, panelHeight: 270, view: "explorer", panel: "terminal", sidebar: true, panelOpen: true, ...LS.get("layout", {}) };
const saveLayout = debounce(() => LS.set("layout", layout), 300);
let projectsIndex = LS.get("projects", []);
let project = null;

const EMPTY_PROJECT = { name: "My project", files: {} };
const newId = () => Math.random().toString(36).slice(2, 10);

function makeProject(tpl, name) {
  const files = { ...tpl.files };
  const entry = tpl.entry && files[tpl.entry] != null ? tpl.entry : Object.keys(files).find((f) => RUN_LANG[f.split(".").pop().toLowerCase()]) || null;
  const dirs = new Set();
  for (const f of Object.keys(files)) { let d = dirname(f); while (d) { dirs.add(d); d = dirname(d); } }
  return {
    id: newId(), name: name || tpl.name, files, dirs: [], entry, pinEntry: false,
    open: entry ? [entry] : [], active: entry, breakpoints: structuredClone(tpl.breakpoints || {}),
    packages: [...(tpl.packages || [])], npm: { ...(tpl.npm || {}) }, stdin: { ...(tpl.stdin || {}) }, watches: [], expanded: [...dirs], created: Date.now(),
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
let langTools = { symbols: async () => [] };
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
const LANGS = { py: "python", pyi: "python", json: "json", md: "markdown", js: "javascript", mjs: "javascript", ts: "typescript", lua: "lua", html: "html", css: "css",
  yml: "yaml", yaml: "yaml", toml: "ini", ini: "ini", cfg: "ini", sql: "sql", sh: "shell", xml: "xml", csv: "plaintext", txt: "plaintext" };
// Languages Dexna can run. Python uses the main kernel; the rest run in a throwaway runner worker.
const RUN_LANG = { py: "python", js: "javascript", mjs: "javascript", ts: "typescript", lua: "lua", sql: "sql" };
const RUN_LANG_NAME = { python: "Python", javascript: "JavaScript", typescript: "TypeScript", lua: "Lua", sql: "SQL" };
// Compiled languages run on a public online compiler (see js/online.js).
for (const l of ONLINE_LANGS) { RUN_LANG_NAME[l.id] = l.name; for (const e of l.ext) { RUN_LANG[e] = l.id; if (!LANGS[e] || e === "sh") LANGS[e] = l.monaco; } }
Object.assign(LANGS, { h: "c", hpp: "cpp", kts: "kotlin" });
const isOnline = (lang) => !!ONLINE_BY_ID[lang];
const runLangOf = (p) => RUN_LANG[p.split(".").pop().toLowerCase()] || null;
const isRunnable = (p) => !!runLangOf(p);
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
  for (const t of THEMES) monaco.editor.defineTheme(t.id, monacoTheme(t));
}

const systemPrefersLight = () => matchMedia("(prefers-color-scheme: light)").matches;
/** The theme in effect: the chosen one, or the last dark/light theme when following the system. */
const currentTheme = () => THEME_BY_ID[settings.theme === "auto" ? (systemPrefersLight() ? settings.lightTheme : settings.darkTheme) : settings.theme];

function updateThemeIcon() {
  const btn = document.getElementById("btn-theme");
  if (!btn) return;
  const dark = currentTheme().type === "dark";
  btn.replaceChildren(icon(dark ? "moon" : "sun"));
  btn.title = `${currentTheme().name}. Click to switch to ${dark ? THEME_BY_ID[settings.lightTheme].name : THEME_BY_ID[settings.darkTheme].name}`;
}
function applyTheme() {
  const t = currentTheme();
  const root = document.documentElement;
  root.dataset.theme = t.type;
  const vars = uiVars(t);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  setAnsiPalette(ansiPalette(t));
  $('meta[name="theme-color"]').content = t.c.bg;
  if (settings.theme !== "auto") settings[t.type === "dark" ? "darkTheme" : "lightTheme"] = t.id;
  try { localStorage.setItem("dexna:themecache", JSON.stringify({ type: t.type, vars })); } catch (_) {}
  updateThemeIcon();
  monaco?.editor.setTheme(t.id);
}
/** Flip between the last dark and the last light theme. */
function toggleTheme() {
  const dark = currentTheme().type === "dark";
  setSetting("theme", dark ? settings.lightTheme : settings.darkTheme);
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
  project.dirs ||= []; project.breakpoints ||= {}; project.packages ||= []; project.npm ||= {}; project.watches ||= []; project.expanded ||= [];
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

function newProject() { showHome(true); }

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
  else createProject(EMPTY_PROJECT);
}

function renderProjectSelect() {
  const sel = $("#project-select");
  sel.textContent = "";
  for (const p of [...projectsIndex].sort((a, b) => a.name.localeCompare(b.name))) sel.append(h("option", { value: p.id, selected: p.id === project.id }, p.name));
  sel.append(h("option", { value: "__new" }, "New project..."), h("option", { value: "__example" }, "Open example..."));
}
$("#project-select").addEventListener("change", (e) => {
  const v = e.target.value;
  e.target.value = project.id;
  if (v === "__new") newProject();
  else if (v === "__example") showExamples();
  else if (v !== project.id) { persistProject.flush(); loadProject(v); }
});

function pickTheme() {
  quickPick({
    placeholder: "Select a color theme",
    source: (q) => [{ id: "auto", name: "Follow system", type: "auto" }, ...THEMES].map((t) => ({ t, m: fuzzy(q, t.name) })).filter((x) => x.m)
      .map(({ t, m }) => ({ label: t.name, labelHtml: highlight(t.name, m.idx), desc: t.type === "auto" ? "light or dark" : t.type, run: () => setSetting("theme", t.id) })),
  });
}

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

/** The extension a new file should get: whatever language this project mostly uses. */
function defaultExt() {
  const counts = {};
  for (const f of Object.keys(project.files)) { const e = f.split(".").pop().toLowerCase(); if (RUN_LANG[e]) counts[e] = (counts[e] || 0) + 1; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "py";
}

async function newFileDialog(dir = selectedDir()) {
  const prefix = dir ? dir + "/" : "";
  const ext = defaultExt();
  const v = await promptDialog({ title: "New file", message: `Use slashes to create folders, e.g. utils/helpers.${ext}`, value: `${prefix}untitled.${ext}`, select: [prefix.length, prefix.length + 8], okLabel: "Create" });
  if (v) createFile(v.includes(".") || v.endsWith("/") ? v : `${v}.${ext}`, "");
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
      if (isRunnable(p)) {
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

const LANG_STARTS = [
  { id: "python", name: "Python", ext: "py", desc: "Scripts, data work and plots. Includes a debugger, console and packages." },
  { id: "javascript", name: "JavaScript", ext: "js", desc: "Modules, async/await and a Node-style console." },
  { id: "typescript", name: "TypeScript", ext: "ts", desc: "Static types and generics, checked as you type." },
  { id: "lua", name: "Lua", ext: "lua", desc: "A small, fast scripting language (Lua 5.4)." },
  { id: "sql", name: "SQL", ext: "sql", desc: "Query an in-memory SQLite database." },
  { id: "csharp", name: "C#", ext: "cs", file: "Program.cs", online: true, desc: "Modern .NET: classes, LINQ, async." },
  { id: "java", name: "Java", ext: "java", file: "Main.java", online: true, desc: "JDK 17." },
  { id: "c", name: "C", ext: "c", online: true, desc: "GCC 14." },
  { id: "cpp", name: "C++", ext: "cpp", online: true, desc: "GCC 14." },
  { id: "go", name: "Go", ext: "go", online: true, desc: "Go 1.23." },
  { id: "rust", name: "Rust", ext: "rs", online: true, desc: "Rust 1.85." },
  { id: "kotlin", name: "Kotlin", ext: "kt", online: true, desc: "Kotlin 2.1." },
  { id: "swift", name: "Swift", ext: "swift", online: true, desc: "Swift 5.2." },
  { id: "php", name: "PHP", ext: "php", online: true, desc: "PHP 8.3." },
  { id: "ruby", name: "Ruby", ext: "rb", online: true, desc: "Ruby 2.7." },
];
let homeOpen = false, settingsOpen = false;
const pageOpen = () => homeOpen || settingsOpen;
const showWelcome = (on) => (on ? showHome(true) : closePages());

function syncPages() {
  $("#home").classList.toggle("hidden", !homeOpen);
  $("#settings-page").classList.toggle("hidden", !settingsOpen);
  $("#editor-area").classList.toggle("home-open", pageOpen());
  $('#activitybar [data-view="settings"]')?.classList.toggle("active", settingsOpen);
  if (homeOpen) renderHome();
  if (settingsOpen) renderSettingsPage();
  if (pageOpen()) { document.activeElement?.blur?.(); $("#sb-lang").textContent = ""; }
  renderTabs();
  updateRuntimeBadge();
}
function showHome(on = true) { homeOpen = on; if (on) settingsOpen = false; syncPages(); }
function showSettings(on = true, query) {
  settingsOpen = on;
  if (on) { homeOpen = false; if (query != null) settingsUI.query = query; }
  syncPages();
}
function closePages() { homeOpen = false; settingsOpen = false; syncPages(); }
function closePage(which) {
  if (which === "home") homeOpen = false; else settingsOpen = false;
  if (!pageOpen() && !project.active) homeOpen = true;
  syncPages();
}
const closeHome = () => closePage("home");

function updateRuntimeBadge() {
  const py = !pageOpen() && editor?.getModel()?.getLanguageId() === "python" && kernelInfo;
  $("#sb-python").classList.toggle("hidden", !py);
}

function ago(t) {
  if (!t) return "";
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
  const d = Math.round(hr / 24);
  return d < 30 ? `${d} day${d > 1 ? "s" : ""} ago` : new Date(t).toLocaleDateString();
}

function uniqueProjectName(base) {
  const names = new Set(projectsIndex.map((p) => p.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

/** Start coding in a language: a project with one file holding that language's starter template. */
function startLanguage(l) {
  if (project && !Object.keys(project.files).length) {
    if (project.name === EMPTY_PROJECT.name) { project.name = uniqueProjectName(`${l.name} project`); persistProject(); persistProject.flush(); renderProjectSelect(); }
  } else createProject({ name: uniqueProjectName(`${l.name} project`), files: {} });
  const starter = starterFor(l.id);
  const path = createFile(l.file || `main.${l.ext}`, starter.text);
  if (path && editor.getModel()) { editor.setPosition({ lineNumber: starter.line, column: starter.column }); editor.revealLineInCenterIfOutsideViewport(starter.line); editor.focus(); }
}

async function openRecent(id) {
  if (id !== project.id) { persistProject.flush(); await loadProject(id); }
  if (!project.active) { const first = project.open[0] || Object.keys(project.files).find(isRunnable) || Object.keys(project.files)[0]; if (first) return openFile(first); }
  if (project.active) showHome(false);
}

function renderHome() {
  const home = $("#home");
  const action = (iconName, label, run, kb) => h("button", { class: "home-action", onclick: run }, icon(iconName), h("span", {}, label), kb ? h("kbd", {}, kbLabel(kb)) : null);
  const recent = [...projectsIndex].sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 8).map((p) => {
    let n = 0;
    try { n = Object.keys(JSON.parse(localStorage.getItem("dexna:project:" + p.id)).files).length; } catch (_) {}
    return h("button", { class: "recent-item", onclick: () => openRecent(p.id), title: p.name },
      h("span", { class: "rn" }, p.name), h("span", { class: "rm" }, `${n} file${n === 1 ? "" : "s"}${p.updated ? ", " + ago(p.updated) : ""}`));
  });
  const langRow = (l) => h("button", { class: "lang-row", onclick: () => startLanguage(l) },
    h("span", { class: "lc-icon", html: fileIconSvg("x." + l.ext) }), h("span", { class: "ln" }, l.name), h("span", { class: "ld" }, l.desc), h("span", { class: "lf" }, l.file || `main.${l.ext}`));
  const localRows = LANG_STARTS.filter((l) => !l.online).map(langRow), onlineRows = LANG_STARTS.filter((l) => l.online).map(langRow);
  const exRows = EXAMPLES.map((ex) => {
    const names = [...new Set(Object.keys(ex.files).map((f) => RUN_LANG[f.split(".").pop().toLowerCase()]).filter(Boolean))].map((k) => RUN_LANG_NAME[k] + (isOnline(k) ? " (online)" : ""));
    return h("button", { class: "ex-row", title: ex.desc, onclick: () => { createProject(ex); toast(`Opened ${ex.name}. Press F5 to run.`, "ok"); } },
      h("span", { class: "ex-name" }, ex.name), h("span", { class: "ex-meta" }, names.join(", ")));
  });
  home.textContent = "";
  home.append(h("div", { class: "home-inner" },
    h("div", { class: "home-head" }, h("h1", {}, "Dexna"), h("p", { class: "home-sub" }, "Code editor and runner for the browser")),
    h("div", { class: "home-cols" },
      h("div", {},
        h("div", { class: "home-section" }, h("h2", {}, "Start"),
          h("div", { class: "home-actions" },
            action("newFile", "New file...", () => newFileDialog(""), "ctrl+alt+n"),
            action("search", "Go to file...", () => quickOpen(), "ctrl+p"),
            action("download", "Import project from ZIP...", () => $("#zip-upload").click()),
            action("file", "Upload files...", () => { uploadTarget = ""; $("#file-upload").click(); }),
            action("star", "Command palette...", () => quickOpen(">"), "ctrl+shift+p"),
            action("settings", "Settings and color themes", () => showSettings(true)),
            action("info", "Languages and snippets", showLanguageGuide),
            action("info", "Keyboard shortcuts", () => showShortcuts()))),
        h("div", { class: "home-section" }, h("h2", {}, "Recent"),
          recent.length ? h("div", { class: "recent-list" }, recent) : h("div", { class: "muted small" }, "Projects you create will show up here."))),
      h("div", {},
        h("div", { class: "home-section" }, h("h2", {}, "New project"),
          h("h3", {}, "Runs on your device"), h("div", { class: "lang-list" }, localRows),
          h("h3", {}, "Runs online"), h("p", { class: "home-aside" }, "These compile on a public online service. Dexna asks before sending anything."), h("div", { class: "lang-list" }, onlineRows)),
        h("div", { class: "home-section" }, h("h2", {}, "Examples"), h("div", { class: "ex-list" }, exRows)))),
    h("p", { class: "home-note" }, "Python, JavaScript, TypeScript, Lua and SQL run on your device and your code stays in this browser. Online languages send the file you run to a public compiler, after you agree.")));
}

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
  updateRuntimeBadge();
  $("#sb-lang").textContent = { python: "Python", plaintext: "Plain Text", javascript: "JavaScript", typescript: "TypeScript", lua: "Lua", sql: "SQL", json: "JSON", markdown: "Markdown", html: "HTML", css: "CSS", yaml: "YAML", csharp: "C#", java: "Java", c: "C", cpp: "C++", go: "Go", rust: "Rust", kotlin: "Kotlin", php: "PHP", ruby: "Ruby", swift: "Swift", perl: "Perl", dart: "Dart", scala: "Scala", r: "R", shell: "Shell", elixir: "Elixir", pascal: "Pascal", clojure: "Clojure", fsharp: "F#", vb: "Visual Basic", "objective-c": "Objective-C" }[model.getLanguageId()] || model.getLanguageId();
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
  const pageTab = (id, label, ic) => h("div", { class: "tab active", title: label }, fi(ic), h("span", { class: "tname" }, label),
    h("button", { class: "close", title: "Close", onclick: (e) => { e.stopPropagation(); closePage(id); } }, icon("close")));
  if (homeOpen) tabsEl.append(pageTab("home", "Home", "home"));
  if (settingsOpen) tabsEl.append(pageTab("settings", "Settings", "settings"));
  for (const key of allTabs()) {
    const ext = key.startsWith("ext:");
    const p = ext ? key.slice(4) : key;
    const name = basename(p);
    const dup = names.filter((n) => n === name).length > 1;
    const c = counts[key];
    const tab = h("div", { class: "tab" + (key === project.active && !pageOpen() ? " active" : "") + (ext ? " readonly" : "") + (c?.e ? " has-error" : c?.w ? " has-warn" : ""), title: p, draggable: "true", "data-key": key },
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
        { label: "Run This File", disabled: ext || !isRunnable(p), run: () => runFile({ path: p }) },
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
const KIND = { class: ["C", "#d4952b"], interface: ["I", "#2f9fb0"], enum: ["E", "#b4693a"], type: ["T", "#8d6fd1"], function: ["F", "#5a8dee"], method: ["M", "#4aa3c7"], variable: ["V", "#3aa57a"], constant: ["K", "#c9574f"], table: ["T", "#3aa57a"], view: ["V", "#8d6fd1"], index: ["I", "#7d8597"], trigger: ["R", "#c9574f"] };
const symIconHtml = (kind) => { const [l, c] = KIND[kind] || ["?", "#7d8597"]; return `<svg class="icon sym" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="3" fill="${c}" opacity=".18"/><text x="8" y="11.3" text-anchor="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-weight="700" font-size="8.5" fill="${c}">${l}</text></svg>`; };
const symIcon = (kind) => h("span", { class: "fi", html: symIconHtml(kind) });
const scheduleOutline = debounce(refreshOutline, 250);
async function refreshOutline() {
  const key = project?.active;
  const model = editor?.getModel();
  if (!key || !model || key.startsWith("ext:")) { symbolsCache.delete(key); renderOutline(); return; }
  const lang = model.getLanguageId();
  try {
    let syms;
    if (lang === "python") { if (!lspReady) return; syms = await lspCall("symbols", [model.getValue()]); }
    else syms = await langTools.symbols(model);
    if (syms) symbolsCache.set(key, syms); // null means "keep the previous outline" (e.g. a syntax error)
  } catch (_) {}
  if (project.active !== key) return;
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

function configureTypeScript() {
  const ts = monaco.languages.typescript;
  const options = {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true, allowJs: true, checkJs: false, strict: true, esModuleInterop: true, skipLibCheck: true,
    lib: ["es2022", "dom"], noEmit: false,
  };
  ts.typescriptDefaults.setCompilerOptions(options);
  ts.javascriptDefaults.setCompilerOptions(options);
  const diag = { noSemanticValidation: false, noSyntaxValidation: false, diagnosticCodesToIgnore: [2307, 7016, 2792] }; // npm packages have no types here
  ts.typescriptDefaults.setDiagnosticsOptions(diag);
  ts.javascriptDefaults.setDiagnosticsOptions(diag);
  ts.typescriptDefaults.setEagerModelSync(true);
  ts.javascriptDefaults.setEagerModelSync(true);
  const globals = "/** Prints a prompt and waits for a line typed in the terminal. */\ndeclare function input(prompt?: string): Promise<string | null>;";
  ts.typescriptDefaults.addExtraLib(globals, "file:///dexna-globals.d.ts");
  ts.javascriptDefaults.addExtraLib(globals, "file:///dexna-globals.d.ts");
}

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
    updateRuntimeBadge();
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
  if (a && !a.startsWith("ext:") && isRunnable(a)) return a;
  if (project.files[project.entry] != null) return project.entry;
  return Object.keys(project.files).find(isRunnable) || null;
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
  if (!path) return toast("Create a file to run first (Python, JavaScript, TypeScript, Lua or SQL).", "warn");
  const lang = runLangOf(path);
  if (!lang) return toast(`Dexna can't run ${basename(path)}. It runs Python, JavaScript, TypeScript, Lua and SQL files.`, "warn");
  if (lang !== "python") {
    if (debug) return toast("The debugger works with Python files only.", "warn");
    if (isOnline(lang)) return runOnlineFile(path, ONLINE_BY_ID[lang]);
    return runOther(path, lang);
  }
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
  if (otherRun) { otherRun.stop(); return; }
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

/* ---------- other languages (JavaScript, TypeScript, Lua, SQL) ---------- */
let otherRun = null;

/** Compile every TypeScript file in the project to JavaScript with the editor's own TypeScript service. */
async function emitTypeScript() {
  const files = {};
  let getWorker = null; // only start the TypeScript service when there is TypeScript to compile
  for (const [p, content] of Object.entries(project.files)) {
    const ext = p.split(".").pop().toLowerCase();
    if (ext === "ts") {
      getWorker ||= await monaco.languages.typescript.getTypeScriptWorker();
      const model = models.get(p);
      const client = await getWorker(model.uri);
      const res = await client.getEmitOutput(model.uri.toString());
      const js = res.outputFiles.find((f) => f.name.endsWith(".js"));
      if (!js) throw new Error(`Could not compile ${p}`);
      files[p] = js.text;
    } else if (ext === "js" || ext === "mjs") files[p] = models.get(p)?.getValue() ?? content;
  }
  return files;
}

async function runOther(path, lang) {
  if (settings.formatOnSave && editor.getModel() && pathOfModel(editor.getModel()) === path) await editor.getAction("editor.action.formatDocument")?.run().catch(() => {});
  showPanel("terminal");
  if (settings.clearOnRun) terminal.clear();
  terminal.separator(`Running ${path} (${RUN_LANG_NAME[lang]}) at ${new Date().toLocaleTimeString()}`);
  sink = terminal;
  clearRuntimeError();
  setBusy(true, "run");
  let files;
  try {
    if (lang === "typescript" || lang === "javascript") files = await emitTypeScript(); // JS may import TS files too
    else files = Object.fromEntries(Object.entries(project.files).map(([p, c]) => [p, models.get(p)?.getValue() ?? c]));
  } catch (e) {
    terminal.system(e.message, "stderr");
    setBusy(false);
    return;
  }
  const worker = new Worker(new URL("runner.js", import.meta.url), { type: "module" });
  let finished = false;
  const finish = (res) => {
    if (finished) return;
    finished = true;
    worker.terminate();
    otherRun = null;
    if (terminal.inputActive) terminal.resolveInput(null);
    if (res.stopped) terminal.system("Stopped", "sys");
    else if (res.ok) terminal.system(`Process finished in ${res.time.toFixed(res.time < 10 ? 3 : 1)}s`, "ok");
    else terminal.system(`Process exited with an error after ${res.time.toFixed(res.time < 10 ? 3 : 1)}s`, "stderr");
    $("#sb-run").innerHTML = `${iconSvg(res.ok ? "check" : "error")}<span>${esc(path)}</span>`;
    setBusy(false);
  };
  otherRun = { stop: () => finish({ ok: false, time: 0, stopped: true }) };
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === "stdout") terminal.write(m.text, "stdout");
    else if (m.type === "stderr") terminal.write(m.text, "stderr");
    else if (m.type === "input-request") {
      terminal.requestInput((value) => worker.postMessage({ cmd: "input-reply", value: value == null ? null : value }));
    } else if (m.type === "done") finish(m);
  };
  worker.onerror = (e) => { terminal.write(`${e.message || "The runner crashed"}\n`, "stderr"); finish({ ok: false, time: 0 }); };
  setKernelStatus("busy", `Running ${RUN_LANG_NAME[lang]}`);
  worker.postMessage({ cmd: "run", lang, entry: path, files, libs: cfg.libs, npm: project.npm || {} });
}

/* ---------- online languages (C#, Java, C++, Go, Rust, ...) ---------- */
function stdinDialog(langName, value) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; closeOverlay?.(); resolve(v); };
    const ta = h("textarea", { rows: 6, spellcheck: "false", placeholder: "Type what the program will read, one line per Enter" });
    ta.value = value;
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); finish(ta.value); } });
    openModal(h("div", { class: "modal" },
      h("div", { class: "modal-head" }, `Input for your ${langName} program`),
      h("div", { class: "modal-body" }, h("p", {}, "Online runs cannot ask for input while the program is running, so type everything it will read now. Ctrl+Enter runs it."), ta),
      h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => finish(null) }, "Cancel"), h("button", { class: "btn primary", onclick: () => finish(ta.value) }, "Run"))), () => finish(null));
    ta.focus();
  });
}

async function runOnlineFile(path, lang) {
  if (!settings.onlineRunners) {
    const ok = await confirmDialog({
      title: `Run ${lang.name} online?`,
      message: `${lang.name} cannot run inside the browser. Dexna will send this file, and any input you type, to a public online compiler (godbolt.org for C#, otherwise ce.judge0.com, with wandbox.org as a backup). Nothing else is sent, and your other languages keep running on your device. You can turn this off in Settings, under Languages.`,
      okLabel: "Run online",
    });
    if (!ok) return;
    setSetting("onlineRunners", true);
  }
  const code = models.get(path)?.getValue() ?? project.files[path];
  let stdin = "";
  if (readsInput(lang.id, code)) {
    const v = await stdinDialog(lang.name, project.stdin?.[path] ?? "");
    if (v === null) return;
    stdin = v;
    (project.stdin ||= {})[path] = v;
    persistProject();
  }
  showPanel("terminal");
  if (settings.clearOnRun) terminal.clear();
  terminal.separator(`Running ${path} (${lang.name}, online) at ${new Date().toLocaleTimeString()}`);
  sink = terminal;
  clearRuntimeError();
  setBusy(true, "run");
  setKernelStatus("busy", `Running ${lang.name} online`);
  const ctrl = new AbortController();
  let finished = false;
  const finish = (res) => {
    if (finished) return;
    finished = true;
    otherRun = null;
    if (res.stopped) terminal.system("Stopped", "sys");
    else if (res.ok) terminal.system(`Process finished${res.time ? ` in ${res.time.toFixed(res.time < 10 ? 3 : 1)}s` : ""} on ${res.provider}${res.fallback ? " (backup compiler)" : ""}`, "ok");
    else terminal.system(`Process exited with an error${res.provider ? ` on ${res.provider}` : ""}`, "stderr");
    $("#sb-run").innerHTML = `${iconSvg(res.ok ? "check" : "error")}<span>${esc(path)}</span>`;
    setBusy(false);
  };
  otherRun = { stop: () => { ctrl.abort(); finish({ ok: false, stopped: true }); } };
  try {
    const r = await runOnline(lang, code, stdin, ctrl.signal, path);
    if (finished) return;
    if (r.wrapped && !r.ok) terminal.system(`No ${lang.id === "java" || lang.id === "csharp" ? "Main method" : "main function"} found, so Dexna ran your statements as a script. Write your own ${lang.id === "java" || lang.id === "csharp" ? "Main" : "main"} to take control.`, "sys");
    if (r.compile) terminal.write(r.compile.replace(/\s+$/, "") + "\n", "stderr");
    if (r.stdout) terminal.write(r.stdout.endsWith("\n") ? r.stdout : r.stdout + "\n", "stdout");
    if (r.stderr) terminal.write(r.stderr.endsWith("\n") ? r.stderr : r.stderr + "\n", "stderr");
    if (r.hint) terminal.system("Hint: " + r.hint, "sys");
    finish(r);
  } catch (e) {
    if (finished) return;
    terminal.write(`${e.message || e}\n`, "stderr");
    finish({ ok: false });
  }
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
  if (!model) return;
  if (model.getLanguageId() !== "python") return toast("Running a selection in the console works with Python files only. Use Run to run the whole file.", "info");
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
 * Packages view (Python and JavaScript)
 * ===================================================================== */
const PY_POPULAR = [
  ["numpy", "Fast arrays and numerical computing"], ["pandas", "Tables and data analysis"], ["matplotlib", "Charts and plots"],
  ["scipy", "Scientific algorithms"], ["sympy", "Symbolic mathematics"], ["scikit-learn", "Machine learning"],
  ["seaborn", "Statistical charts"], ["networkx", "Graphs and networks"], ["pillow", "Image processing"],
  ["rich", "Beautiful terminal output"], ["beautifulsoup4", "HTML and XML parsing"], ["pyyaml", "Read and write YAML"],
  ["python-dateutil", "Powerful date handling"], ["jinja2", "Text templates"], ["regex", "More powerful regular expressions"],
];
const NPM_POPULAR = [
  ["dayjs", "Small, fast date library"], ["date-fns", "Modern date utilities"], ["lodash-es", "Utility functions for arrays, objects and more"],
  ["zod", "Schema validation with types"], ["mathjs", "Math with matrices, units and expressions"], ["d3", "Data visualization toolkit"],
  ["ramda", "Functional programming helpers"], ["nanoid", "Tiny unique ID generator"], ["uuid", "Generate UUIDs"],
  ["immer", "Immutable updates made simple"], ["rxjs", "Reactive streams"], ["marked", "Markdown to HTML"],
];
let installedPkgs = [];
const pkgUI = { lang: "python", npmQuery: "", npmResults: null, npmLoading: false, npmError: "", collapsed: {}, inputs: {} };
const normPy = (n) => n.toLowerCase().replace(/[_.]+/g, "-");

async function installFromInput(names) {
  names = (Array.isArray(names) ? names : names.split(/[\s,]+/)).map((x) => x.trim()).filter(Boolean);
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
  finally { setBusy(false); refreshPackages(); }
}

async function uninstallPython(name) {
  if (state.busy) return toast("Wait for the running program to finish first.", "warn");
  try {
    await kernelReady();
    const r = await kernel.call("uninstall", { name });
    if (!r.ok) throw new Error(r.error || "Could not remove " + name);
    kernelInstalled.delete(name);
    project.packages = project.packages.filter((p) => normPy(p) !== normPy(name));
    persistProject();
    toast(`Removed ${name}`, "ok");
  } catch (e) { toast(e.message, "error"); }
  refreshPackages();
}

async function refreshPackages() {
  if (kernel?.info && !state.busy) { try { installedPkgs = await kernel.call("list-packages"); } catch (_) {} }
  renderPackagesView();
}

let npmTimer = null;
function npmSearch(q) {
  pkgUI.npmQuery = q;
  clearTimeout(npmTimer);
  if (!q.trim()) { pkgUI.npmResults = null; pkgUI.npmLoading = false; pkgUI.npmError = ""; renderPackagesView(); return; }
  pkgUI.npmLoading = true; renderPackagesView();
  npmTimer = setTimeout(async () => {
    try {
      const r = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q.trim())}&size=15`);
      if (!r.ok) throw new Error(`npm search failed (${r.status})`);
      const data = await r.json();
      if (pkgUI.npmQuery !== q) return;
      pkgUI.npmResults = data.objects.map((o) => o.package);
      pkgUI.npmError = "";
    } catch (e) { pkgUI.npmError = "Could not reach the npm registry. " + e.message; pkgUI.npmResults = []; }
    pkgUI.npmLoading = false;
    renderPackagesView();
  }, 350);
}
function addNpm(name, version) {
  project.npm ||= {};
  project.npm[name] = version || ""; // "" means: always use the latest version
  persistProject();
  renderPackagesView();
  toast(`Added ${name}${version ? "@" + version : ""}. Use it with: import ... from "${name}"`, "ok", 4500);
}
function removeNpm(name) { delete project.npm[name]; persistProject(); renderPackagesView(); }

function pkgCard({ name, version, desc, badge, action }) {
  return h("div", { class: "pkg" },
    h("div", { class: "pk-main" },
      h("div", { class: "pk-name" }, h("span", {}, name), version ? h("span", { class: "pk-ver" }, version) : null, badge ? h("span", { class: "pk-badge" }, badge) : null),
      desc ? h("div", { class: "pk-desc" }, desc) : null),
    action ? h("div", { class: "pk-act" }, action) : null);
}
function pkgSection(id, title, count, body, { open = true } = {}) {
  const collapsed = pkgUI.collapsed[id] ?? !open;
  return h("section", { class: "pkg-sec" },
    h("div", { class: "pkg-sec-head", onclick: () => { pkgUI.collapsed[id] = !collapsed; renderPackagesView(); } },
      icon(collapsed ? "chevronRight" : "chevronDown"), h("span", {}, title), count != null ? h("span", { class: "badge" }, count) : null),
    collapsed ? null : body);
}
function pkgInput(lang, placeholder, onEnter, onInput) {
  let el = pkgUI.inputs[lang];
  if (!el) {
    el = h("input", { placeholder, spellcheck: "false", autocomplete: "off" });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") onEnter(el.value); });
    if (onInput) el.addEventListener("input", () => onInput(el.value));
    pkgUI.inputs[lang] = el;
  }
  return el;
}

function renderPackagesView() {
  const root = document.getElementById("pkg-root");
  if (!root || !project) return;
  const scroll = root.scrollTop;
  const seg = h("div", { class: "seg" }, [["python", "Python"], ["javascript", "JavaScript"]].map(([id, label]) =>
    h("button", { class: pkgUI.lang === id ? "active" : "", onclick: () => { pkgUI.lang = id; renderPackagesView(); } }, label)));
  const parts = [seg];

  if (pkgUI.lang === "python") {
    const input = pkgInput("python", "Install a package, e.g. numpy", (v) => { if (v.trim()) { installFromInput(v); input.value = ""; } });
    const installBtn = h("button", { class: "btn install", onclick: () => { if (input.value.trim()) { installFromInput(input.value); input.value = ""; } } }, "Install");
    parts.push(h("div", { class: "pkg-search" }, input, installBtn));
    parts.push(h("p", { class: "pkg-hint" }, "Packages come from Pyodide's built-in set or PyPI (pure Python wheels). Missing imports are installed automatically when you run."));
    const have = new Set([...installedPkgs.map((p) => normPy(p.name)), ...project.packages.map(normPy)]);
    const reqs = project.packages.map((p) => pkgCard({ name: p, badge: kernelInstalled.has(p) ? "installed" : "pending",
      action: h("button", { class: "btn icon sm", title: "Remove from this project's requirements", onclick: () => { project.packages = project.packages.filter((x) => x !== p); persistProject(); renderPackagesView(); } }, icon("close")) }));
    parts.push(pkgSection("py-req", "This project", project.packages.length, reqs.length ? reqs : h("p", { class: "pkg-hint" }, "No requirements yet. Install a package below, or just import it and run."), { open: true }));
    const filterVal = (pkgUI.inputs.pyFilter?.value || "").toLowerCase();
    const filter = (pkgUI.inputs.pyFilter ||= h("input", { placeholder: "Filter installed packages", spellcheck: "false", oninput: () => renderPackagesView() }));
    const rows = installedPkgs.filter((p) => p.name.toLowerCase().includes(filterVal)).map((p) => pkgCard({ name: p.name, version: p.version, badge: p.source === "pyodide" ? "built in" : "PyPI",
      action: ["micropip", "packaging"].includes(p.name) ? null : h("button", { class: "btn icon sm", title: "Uninstall", onclick: () => uninstallPython(p.name) }, icon("close")) }));
    parts.push(pkgSection("py-installed", "Installed", installedPkgs.length, h("div", {}, h("div", { class: "pkg-filter" }, filter, h("button", { class: "btn icon sm", title: "Refresh", onclick: refreshPackages }, icon("refresh"))),
      rows.length ? rows : h("p", { class: "pkg-hint" }, kernel?.info ? (installedPkgs.length ? "Nothing matches." : "Press refresh to list installed packages.") : "Python is starting...")), { open: false }));
    parts.push(pkgSection("py-popular", "Popular", PY_POPULAR.length, PY_POPULAR.map(([n, d]) => pkgCard({ name: n, desc: d,
      action: have.has(normPy(n)) ? h("span", { class: "pk-done" }, icon("check")) : h("button", { class: "btn install", onclick: () => installFromInput(n) }, "Install") })), { open: true }));
  } else {
    const input = pkgInput("javascript", "Search npm packages", (v) => npmSearch(v), (v) => npmSearch(v));
    parts.push(h("div", { class: "pkg-search" }, input));
    parts.push(h("p", { class: "pkg-hint" }, "Import any npm package by name in JavaScript or TypeScript, for example import dayjs from \"dayjs\". Packages load from esm.sh when you run. Adding a package pins its version for this project."));
    const added = Object.entries(project.npm || {});
    parts.push(pkgSection("js-added", "This project", added.length, added.length ? added.map(([n, v]) => pkgCard({ name: n, version: v || "latest",
      action: h("button", { class: "btn icon sm", title: "Remove", onclick: () => removeNpm(n) }, icon("close")) })) : h("p", { class: "pkg-hint" }, "No pinned packages. Imports still work without adding them.")));
    if (pkgUI.npmQuery.trim()) {
      let body;
      if (pkgUI.npmLoading) body = h("p", { class: "pkg-hint" }, "Searching...");
      else if (pkgUI.npmError) body = h("p", { class: "pkg-hint err" }, pkgUI.npmError);
      else if (!pkgUI.npmResults?.length) body = h("p", { class: "pkg-hint" }, "No packages found.");
      else body = pkgUI.npmResults.map((p) => pkgCard({ name: p.name, version: p.version, desc: p.description,
        action: project.npm && p.name in project.npm ? h("span", { class: "pk-done" }, icon("check")) : h("button", { class: "btn install", onclick: () => addNpm(p.name, p.version) }, "Add") }));
      parts.push(pkgSection("js-results", "Search results", pkgUI.npmResults?.length ?? null, body));
    } else {
      parts.push(pkgSection("js-popular", "Popular", NPM_POPULAR.length, NPM_POPULAR.map(([n, d]) => pkgCard({ name: n, desc: d,
        action: project.npm && n in project.npm ? h("span", { class: "pk-done" }, icon("check")) : h("button", { class: "btn install", onclick: () => addNpm(n, "") }, "Add") }))));
    }
    parts.push(h("p", { class: "pkg-hint" }, "The editor does not show types for npm packages yet, so imports are treated as untyped."));
  }
  parts.push(h("p", { class: "pkg-foot" }, "Lua and SQL have no package manager in the browser. For Lua, put .lua files in your project and use require(\"name\")."));
  root.replaceChildren(...parts);
  root.scrollTop = scroll;
}

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
  { key: "theme", cat: "Appearance", label: "Color theme", desc: "Pick a look for the editor and the whole app. The sun/moon button in the top right flips between your last dark and last light theme.", type: "theme" },
  { key: "fontSize", cat: "Appearance", label: "Font size", desc: "Editor text size in pixels. You can also zoom with Ctrl+= and Ctrl+-.", type: "number", min: 10, max: 30 },
  { key: "fontLigatures", cat: "Appearance", label: "Font ligatures", desc: "Join characters like => and != into single symbols (JetBrains Mono).", type: "bool" },
  { key: "minimap", cat: "Appearance", label: "Minimap", desc: "Show a small overview of the file on the right edge.", type: "bool" },
  { key: "stickyScroll", cat: "Appearance", label: "Sticky scroll", desc: "Keep the current class or function header pinned at the top while you scroll.", type: "bool" },
  { key: "bracketColors", cat: "Appearance", label: "Bracket pair colors", desc: "Color matching brackets so nested ones are easy to tell apart.", type: "bool" },
  { key: "renderWhitespace", cat: "Appearance", label: "Render whitespace", desc: "When to draw dots and arrows for spaces and tabs.", type: "select", options: [["none", "Never"], ["selection", "In selection"], ["boundary", "At boundaries"], ["all", "Always"]] },
  { key: "tabSize", cat: "Editor", label: "Indent size", desc: "Number of spaces a tab is worth.", type: "select", options: [[2, "2 spaces"], [4, "4 spaces"], [8, "8 spaces"]] },
  { key: "wordWrap", cat: "Editor", label: "Word wrap", desc: "Wrap long lines instead of scrolling sideways. Toggle with Alt+Z.", type: "bool" },
  { key: "formatOnSave", cat: "Editor", label: "Format on save and run", desc: "Format the file when you press Ctrl+S and before running it. Python uses black, Lua uses StyLua, SQL uses sql-formatter.", type: "bool" },
  { key: "onlineRunners", cat: "Languages", label: "Online runners", desc: "C#, Java, C, C++, Go, Rust, Kotlin, PHP, Ruby and other compiled languages cannot run in the browser, so Dexna sends the file and the input you type to a public online compiler (godbolt.org for C#, otherwise ce.judge0.com, with wandbox.org as a backup). Turn this off to keep everything on your device. Dexna asks the first time you run one.", type: "bool" },
  { key: "autoLint", cat: "Python", label: "Live linting", desc: "Check Python code with pyflakes as you type and underline problems.", type: "bool" },
  { key: "lineLength", cat: "Python", label: "Formatter line length", desc: "Maximum line length for black and isort. Lua and SQL formatting use it as a guide too.", type: "number", min: 40, max: 200 },
  { key: "autoInstall", cat: "Python", label: "Auto-install imports", desc: "When you run Python code, install missing packages from PyPI automatically.", type: "bool" },
  { key: "clearOnRun", cat: "Terminal", label: "Clear on run", desc: "Clear the terminal each time you run a program.", type: "bool" },
  { key: "inlineplots", cat: "Terminal", label: "Inline plots", desc: "Also show matplotlib figures inside the terminal, not just in the Plots tab.", type: "bool" },
];
const SETTING_CATS = ["Appearance", "Editor", "Languages", "Python", "Terminal", "Data and privacy"];
const settingsUI = { query: "" };

function setSetting(key, value) {
  settings[key] = value;
  if (key === "theme") applyTheme(); // also records the last dark / light theme
  LS.set("settings", settings);
  if (editor) editor.updateOptions(editorOptions());
  if (key === "tabSize") for (const m of models.values()) m.updateOptions({ tabSize: value });
  if (key === "autoLint") lintAll();
  $("#sb-indent").textContent = `Spaces: ${settings.tabSize}`;
  if (settingsOpen) renderSettingsPage();
}

function renderSettingsPage() {
  const root = $("#settings-page");
  if (!root.querySelector(".sp-head")) {
    const input = h("input", { class: "sp-search", placeholder: "Search settings", spellcheck: "false", value: settingsUI.query });
    input.addEventListener("input", () => { settingsUI.query = input.value; renderSettingsBody(); });
    root.append(h("div", { class: "sp-head" }, input, h("span", { class: "sp-count" })), h("div", { class: "sp-body" }));
  }
  const input = root.querySelector(".sp-search");
  if (input.value !== settingsUI.query) input.value = settingsUI.query;
  renderSettingsBody();
}

function settingItem(sd) {
  const modified = settings[sd.key] !== DEFAULT_SETTINGS[sd.key];
  let control;
  if (sd.type === "theme") {
    const tile = (t) => h("button", { class: "theme-tile" + (settings.theme === t.id ? " on" : ""), title: t.name, onclick: () => setSetting("theme", t.id) },
      h("span", { class: "tt-prev", style: { background: t.c.bg, color: t.c.fg } },
        h("i", { style: { background: t.c.keyword } }), h("i", { style: { background: t.c.string } }), h("i", { style: { background: t.c.func } }), h("i", { style: { background: t.c.number } })),
      h("span", { class: "tt-name" }, t.name));
    control = h("div", { class: "theme-grid-wrap" },
      h("div", { class: "theme-group" }, "Automatic"),
      h("div", { class: "theme-grid" }, h("button", { class: "theme-tile" + (settings.theme === "auto" ? " on" : ""), onclick: () => setSetting("theme", "auto"), title: "Follow your system's light or dark setting" },
        h("span", { class: "tt-prev auto" }, h("b", {}, "Aa"), h("b", { class: "l" }, "Aa")), h("span", { class: "tt-name" }, "Follow system"))),
      h("div", { class: "theme-group" }, "Dark"), h("div", { class: "theme-grid" }, THEMES.filter((t) => t.type === "dark").map(tile)),
      h("div", { class: "theme-group" }, "Light"), h("div", { class: "theme-grid" }, THEMES.filter((t) => t.type === "light").map(tile)));
  } else if (sd.type === "bool") {
    control = h("label", { class: "si-check" }, h("input", { type: "checkbox", checked: settings[sd.key], onchange: (e) => setSetting(sd.key, e.target.checked) }), h("span", {}, "Enabled"));
  } else if (sd.type === "select") {
    control = h("select", { onchange: (e) => setSetting(sd.key, typeof sd.options[0][0] === "number" ? +e.target.value : e.target.value) },
      sd.options.map(([v, l]) => h("option", { value: v, selected: settings[sd.key] == v }, l)));
  } else {
    control = h("input", { type: "number", min: sd.min, max: sd.max, value: settings[sd.key], onchange: (e) => setSetting(sd.key, Math.max(sd.min, Math.min(sd.max, +e.target.value || DEFAULT_SETTINGS[sd.key]))) });
  }
  return h("div", { class: "si" + (modified ? " modified" : ""), id: "si-" + sd.key },
    h("div", { class: "si-title" }, h("span", { class: "si-cat" }, sd.cat + ": "), h("span", {}, sd.label),
      modified ? h("button", { class: "si-reset", title: "Reset to default", onclick: () => setSetting(sd.key, DEFAULT_SETTINGS[sd.key]) }, "Reset") : null),
    h("div", { class: "si-desc" }, sd.desc), control);
}

function renderSettingsBody() {
  const root = $("#settings-page");
  const body = root.querySelector(".sp-body");
  const prev = body.querySelector(".sp-main")?.scrollTop || 0;
  const q = settingsUI.query.trim().toLowerCase();
  const match = (sd) => !q || `${sd.cat} ${sd.label} ${sd.desc} ${sd.key}`.toLowerCase().includes(q);
  const dataRows = [
    { title: "Keyboard shortcuts", desc: "See every shortcut Dexna offers.", btn: "Show", run: showShortcuts },
    { title: "Reset all settings", desc: "Put every setting above back to its default.", btn: "Reset", run: () => { for (const k of Object.keys(DEFAULT_SETTINGS)) settings[k] = DEFAULT_SETTINGS[k]; setSetting("theme", settings.theme); toast("Settings reset", "ok"); } },
    { title: "Delete all local data", desc: "Remove every project, setting and history entry Dexna stored in this browser. Download anything you want to keep first.", btn: "Delete...", danger: true, run: resetEverything },
  ].filter((r) => !q || `data privacy ${r.title} ${r.desc}`.toLowerCase().includes(q));

  const sections = [];
  let found = 0;
  const nav = [];
  for (const cat of SETTING_CATS) {
    const items = cat === "Data and privacy" ? dataRows : SETTINGS_SCHEMA.filter((x) => x.cat === cat && match(x));
    if (!items.length) continue;
    found += items.length;
    nav.push([cat, items.length]);
    sections.push(h("section", { class: "sp-sec", id: "sp-" + cat.replace(/\W+/g, "-") }, h("h2", {}, cat),
      cat === "Data and privacy"
        ? items.map((r) => h("div", { class: "si si-row" }, h("div", {}, h("div", { class: "si-title" }, r.title), h("div", { class: "si-desc" }, r.desc)),
          h("button", { class: "btn", style: r.danger ? { color: "var(--stop)" } : null, onclick: r.run }, r.btn)))
        : items.map(settingItem)));
  }
  root.querySelector(".sp-count").textContent = q ? `${found} setting${found === 1 ? "" : "s"} found` : "";
  const navEl = h("nav", { class: "sp-nav" }, nav.map(([cat, n], i) => h("button", { class: i === 0 ? "active" : "", "data-sec": "sp-" + cat.replace(/\W+/g, "-"), onclick: () => root.querySelector("#sp-" + cat.replace(/\W+/g, "-"))?.scrollIntoView({ block: "start", behavior: "smooth" }) },
    h("span", {}, cat), h("span", { class: "n" }, n))));
  const main = h("div", { class: "sp-main" }, sections.length ? sections : h("div", { class: "empty" }, "No settings match your search."));
  main.addEventListener("scroll", () => {
    let cur = null;
    for (const sec of main.querySelectorAll(".sp-sec")) if (sec.offsetTop - 60 <= main.scrollTop) cur = sec.id;
    navEl.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.sec === (cur || navEl.firstChild?.dataset?.sec)));
  });
  body.replaceChildren(navEl, main);
  main.scrollTop = prev;
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
  $$("#activitybar [data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === "settings" ? settingsOpen : layout.sidebar && b.dataset.view === layout.view));
  $$("#sidebar .view").forEach((v) => v.classList.toggle("active", v.dataset.view === layout.view));
  if (layout.view === "search" && layout.sidebar) setTimeout(() => $("#search-input").focus(), 0);
  if (layout.view === "packages" && layout.sidebar && !installedPkgs.length) refreshPackages();
  if (layout.view === "outline") renderOutline();
  saveLayout();
}
$$("#activitybar [data-view]").forEach((b) => (b.onclick = () => (b.dataset.view === "settings" ? (settingsOpen ? closePage("settings") : showSettings(true)) : setView(b.dataset.view, { toggle: true }))));

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
  { id: "run", label: "Run File", cat: "Run", kb: "f5", run: () => (dbg.paused ? dbgResume("continue") : runFile()) },
  { id: "run2", label: "Run File", cat: "Run", kb: "ctrl+enter", hidden: true, when: (e) => !e.target.closest?.(".console-input, .term"), run: () => runFile() },
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
  { id: "new-project", label: "New Project (choose a language)…", cat: "File", run: newProject },
  { id: "examples", label: "Open Example…", cat: "File", run: showExamples },
  { id: "quick-open", label: "Go to File…", cat: "Go", kb: "ctrl+p", run: () => quickOpen() },
  { id: "home", label: "Show Home", cat: "View", run: () => showHome(true) },
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
  { id: "format", label: "Format Document", cat: "Edit", kb: "shift+alt+f", run: formatDocument },
  { id: "organize", label: "Organize Imports (Python)", cat: "Edit", kb: "shift+alt+o", run: organizeImports },
  { id: "find", label: "Find", cat: "Edit", run: () => { editor.focus(); editor.getAction("actions.find")?.run(); } },
  { id: "replace", label: "Replace", cat: "Edit", run: () => { editor.focus(); editor.getAction("editor.action.startFindReplaceAction")?.run(); } },
  { id: "comment", label: "Toggle Line Comment", cat: "Edit", run: () => { editor.focus(); editor.getAction("editor.action.commentLine")?.run(); } },
  { id: "rename-symbol", label: "Rename Symbol", cat: "Edit", run: () => { editor.focus(); editor.getAction("editor.action.rename")?.run(); } },
  { id: "find-files", label: "Search in Files", cat: "View", kb: "ctrl+shift+f", run: () => setView("search") },
  { id: "explorer", label: "Show Explorer", cat: "View", kb: "ctrl+shift+e", run: () => setView("explorer") },
  { id: "outline", label: "Show Outline", cat: "View", run: () => setView("outline") },
  { id: "debug-view", label: "Show Run & Debug", cat: "View", kb: "ctrl+shift+d", run: () => setView("debug") },
  { id: "packages", label: "Show Packages", cat: "View", run: () => setView("packages") },
  { id: "settings", label: "Open Settings", cat: "Preferences", kb: "ctrl+,", run: () => showSettings(true) },
  { id: "sidebar", label: "Toggle Sidebar", cat: "View", kb: "ctrl+b", run: () => setView(layout.view, { toggle: true }) },
  { id: "panel", label: "Toggle Panel", cat: "View", kb: "ctrl+j", run: togglePanel },
  { id: "panel2", label: "Toggle Panel", kb: "ctrl+`", hidden: true, run: togglePanel },
  { id: "terminal", label: "Show Terminal", cat: "View", run: () => showPanel("terminal") },
  { id: "console", label: "Focus Python Console", cat: "View", kb: "ctrl+shift+c", run: () => showPanel("console") },
  { id: "problems", label: "Show Problems", cat: "View", kb: "ctrl+shift+m", run: () => showPanel("problems") },
  { id: "variables", label: "Show Variables", cat: "View", run: () => showPanel("variables") },
  { id: "plots", label: "Show Plots", cat: "View", run: () => showPanel("plots") },
  { id: "clear-term", label: "Clear Terminal", cat: "View", run: () => terminal.clear() },
  { id: "theme", label: "Toggle Light/Dark Theme", cat: "Preferences", run: toggleTheme },
  { id: "theme-pick", label: "Color Theme...", cat: "Preferences", run: pickTheme },
  { id: "zoom-in", label: "Increase Font Size", cat: "View", kb: "ctrl+=", run: () => setSetting("fontSize", Math.min(30, settings.fontSize + 1)) },
  { id: "zoom-out", label: "Decrease Font Size", cat: "View", kb: "ctrl+-", run: () => setSetting("fontSize", Math.max(10, settings.fontSize - 1)) },
  { id: "minimap", label: "Toggle Minimap", cat: "View", run: () => setSetting("minimap", !settings.minimap) },
  { id: "wrap", label: "Toggle Word Wrap", cat: "View", kb: "alt+z", run: () => setSetting("wordWrap", !settings.wordWrap) },
  { id: "shortcuts", label: "Keyboard Shortcuts", cat: "Help", kb: "ctrl+k ctrl+s", run: () => showShortcuts() },
  { id: "language-guide", label: "Languages and Snippets", cat: "Help", run: () => showLanguageGuide() },
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
  Help: ["home", "language-guide", "shortcuts", "examples", "-", "about"],
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

/* ---------- Help: keyboard shortcuts, language guide, about ---------- */
function showShortcuts(initialQuery = "") {
  const fromCommands = (cats) => COMMANDS.filter((c) => c.kb && !c.hidden && cats.includes(c.cat)).map((c) => [c.label, c.kb]);
  const sections = [
    ["Run and debug", fromCommands(["Run", "Debug"])],
    ["Files and projects", fromCommands(["File"])],
    ["Editing", [
      ...fromCommands(["Edit"]),
      ["Toggle line comment", "ctrl+/"], ["Toggle block comment", "shift+alt+a"], ["Move line up or down", "alt+up / alt+down"], ["Copy line up or down", "shift+alt+up / shift+alt+down"],
      ["Delete line", "ctrl+shift+k"], ["Indent or outdent", "ctrl+] / ctrl+["], ["Select next occurrence", "ctrl+d"], ["Select all occurrences", "ctrl+shift+l"],
      ["Add cursor above or below", "ctrl+alt+up / ctrl+alt+down"], ["Add a cursor", "alt+click"], ["Jump to matching bracket", "ctrl+shift+\\"],
      ["Fold or unfold a block", "ctrl+shift+[ / ctrl+shift+]"], ["Undo or redo", "ctrl+z / ctrl+y"],
    ]],
    ["Code intelligence", [
      ["Show suggestions", "ctrl+space"], ["Show parameter hints", "ctrl+shift+space"], ["Go to definition", "f12"], ["Peek definition", "alt+f12"], ["Find all references", "shift+f12"],
      ["Rename symbol", "f2"], ["Quick fix", "ctrl+."], ["Show hover", "ctrl+k ctrl+i"], ["Accept a suggestion", "tab / enter"],
    ]],
    ["Find and navigate", [["Find in file", "ctrl+f"], ["Replace in file", "ctrl+h"], ["Find next or previous", "f3 / shift+f3"], ...fromCommands(["Go", "View"])]],
    ["Preferences", fromCommands(["Preferences", "Help"])],
  ];
  const q = h("input", { placeholder: "Filter shortcuts", spellcheck: "false", value: initialQuery });
  const body = h("div", { class: "kb-body" });
  const render = () => {
    const t = q.value.trim().toLowerCase();
    body.textContent = "";
    for (const [title, rows] of sections) {
      const seen = new Set();
      const list = rows.filter(([label, kb]) => { const key = label + kb; if (seen.has(key)) return false; seen.add(key); return !t || `${label} ${kb}`.toLowerCase().includes(t); });
      if (!list.length) continue;
      body.append(h("h3", {}, title), h("div", { class: "kb-list" }, list.map(([label, kb]) => h("div", { class: "kb-row" }, h("span", {}, label),
        h("span", { class: "kb-keys" }, kb.split(" / ").map((alt) => h("span", { class: "kb-alt" }, alt.split(" ").map((chord) => h("kbd", {}, kbLabel(chord)))))))))) ;
    }
    if (!body.children.length) body.append(h("div", { class: "empty" }, "No shortcuts match."));
  };
  q.addEventListener("input", render);
  render();
  openModal(h("div", { class: "modal wide" }, h("div", { class: "modal-head" }, "Keyboard shortcuts"),
    h("div", { class: "modal-body" }, q, body),
    h("div", { class: "modal-foot" }, h("span", { class: "muted small", style: { marginRight: "auto" } }, "Ctrl is Cmd on a Mac. Ctrl+Shift+P opens every command."), h("button", { class: "btn primary", onclick: () => closeOverlay() }, "Close"))));
  q.focus();
}

const GUIDE = [
  { id: "python", name: "Python", where: "device", notes: ["Run, debug with breakpoints, a console that shares your variables, a variable explorer and plots", "Completion, hover docs, go to definition, rename and live errors", "Format with black, sort imports with isort", "Install packages from PyPI in the Packages view"] },
  { id: "javascript", name: "JavaScript", where: "device", notes: ["ES modules across your files, top-level await, input() and a Node-style console", "Completion, hover, errors and rename from the TypeScript service; format; outline", "Import any npm package by name (loaded from esm.sh)"] },
  { id: "typescript", name: "TypeScript", where: "device", notes: ["Everything JavaScript has, plus live type checking", "Type errors never block a run"] },
  { id: "lua", name: "Lua", where: "device", notes: ["Lua 5.4 with require between your files and io.read for input", "Completion for the standard library and your own functions, hover docs, parameter hints", "Syntax errors as you type; format with StyLua"] },
  { id: "sql", name: "SQL", where: "device", notes: ["SQLite in memory; every run starts a fresh database and prints results as tables", "Completion for keywords, functions, and tables and columns from your own CREATE TABLE", "Format with sql-formatter"] },
  { id: "csharp", name: "C#", where: "online", notes: ["Modern .NET. Write bare statements, or a class with Main", "Format with clang-format"] },
  { id: "java", name: "Java", where: "online", notes: ["JDK 17. Bare statements work; the class with main can have any name", "Format with clang-format"] },
  { id: "c", name: "C", where: "online", notes: ["GCC 14. Bare statements work; common headers are included for you", "Format with clang-format"] },
  { id: "cpp", name: "C++", where: "online", notes: ["GCC 14. Bare statements work; <bits/stdc++.h> and using namespace std are added for you", "Format with clang-format"] },
  { id: "go", name: "Go", where: "online", notes: ["Go 1.23. Bare statements work; package main and standard imports are added for you", "Format with gofmt"] },
  { id: "rust", name: "Rust", where: "online", notes: ["Rust 1.85. Bare statements work; they are placed in fn main for you"] },
  { id: "kotlin", name: "Kotlin", where: "online", notes: ["Kotlin 2.1. Bare statements work; they are placed in fun main for you"] },
  { id: "php", name: "PHP", where: "online", notes: ["PHP 8.3"] },
  { id: "ruby", name: "Ruby", where: "online", notes: ["Ruby 2.7"] },
  { id: "swift", name: "Swift", where: "online", notes: ["Swift 5.2"] },
];

function showLanguageGuide() {
  const groups = [["On your device", GUIDE.filter((g) => g.where === "device")], ["Online (sent to a public compiler, with your consent)", GUIDE.filter((g) => g.where === "online")]];
  const body = h("div", { class: "guide" },
    h("p", { class: "muted" }, "Every language gets a few snippets: type the trigger, then press Tab. Ctrl+Space shows suggestions anywhere. Online languages also take input in a box before the run, because they cannot ask while running."));
  for (const [title, list] of groups) {
    body.append(h("h3", {}, title));
    for (const g of list) {
      const snippets = (SNIPPETS[g.id] || []).map((x) => x.label);
      body.append(h("div", { class: "guide-item" },
        h("div", { class: "guide-head" }, h("span", { class: "lc-icon", html: fileIconSvg("x." + (LANG_STARTS.find((l) => l.id === g.id)?.ext || "txt")) }), h("b", {}, g.name)),
        h("ul", {}, g.notes.map((n) => h("li", {}, n))),
        snippets.length ? h("div", { class: "guide-snips" }, h("span", { class: "muted small" }, "Snippets: "), snippets.map((x) => h("code", {}, x))) : null));
    }
  }
  openModal(h("div", { class: "modal wide" }, h("div", { class: "modal-head" }, "Languages"), h("div", { class: "modal-body" }, body),
    h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => { closeOverlay(); showSettings(true, "online"); } }, "Online settings"), h("button", { class: "btn primary", onclick: () => closeOverlay() }, "Close"))));
}

function showAbout() {
  const row = (k, v) => h("div", { class: "about-row" }, h("span", { class: "muted" }, k), h("span", {}, v));
  openModal(h("div", { class: "modal wide" }, h("div", { class: "modal-head" }, "About Dexna"),
    h("div", { class: "modal-body about" },
      h("p", {}, "Dexna is a code editor and runner that lives in your browser. Open the page, pick a language and run code. There is nothing to install and no account."),
      h("h3", {}, "Privacy"),
      h("p", {}, "Python, JavaScript, TypeScript, Lua and SQL run on your device, and your projects are stored in this browser only. C#, Java, C, C++, Go, Rust and the other online languages send the file you run, plus any input you type, to a public compile service (ce.judge0.com, godbolt.org, or wandbox.org as a backup). Dexna asks first, and you can turn it off in Settings."),
      h("h3", {}, "Runtimes"),
      row("Python", `${kernelInfo?.version || "..."} (Pyodide ${kernelInfo?.pyodide || ""}, WebAssembly)`), row("JavaScript", "your browser, in a worker"), row("TypeScript", "the editor's compiler, then your browser"),
      row("Lua", "5.4 (wasmoon, WebAssembly)"), row("SQL", "SQLite (WebAssembly)"), row("Mode", kernel?.isolated ? "Full: input(), Stop and the debugger are available" : "Limited: reload the page to enable input() and the debugger"),
      h("h3", {}, "Built with"),
      h("p", { class: "muted" }, "Monaco editor, Pyodide, jedi, pyflakes, black, isort, wasmoon, SQLite, StyLua, sql-formatter, clang-format, gofmt, luaparse, IBM Plex Sans and JetBrains Mono. Online runs use Judge0 CE, Compiler Explorer and Wandbox."),
      h("p", {}, h("a", { href: "https://github.com/Down1oads/dexna", target: "_blank", rel: "noopener" }, "Source code on GitHub"))),
    h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => { closeOverlay(); showLanguageGuide(); } }, "Languages"), h("button", { class: "btn", onclick: () => { closeOverlay(); showShortcuts(); } }, "Shortcuts"), h("button", { class: "btn primary", onclick: () => closeOverlay() }, "Close"))));
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
  $("#btn-theme").onclick = toggleTheme;
  updateThemeIcon();
  $("#sb-kernel").classList.add("clickable");
  $("#sb-kernel").onclick = (e) => showMenu(e.clientX, e.clientY - 90, [
    { label: "Restart Python", run: () => restartKernel() },
    { label: "Interrupt", disabled: !state.busy, run: stopExecution },
    { label: "Show Packages", run: () => setView("packages") },
  ]);
  $$('[data-view="debug"] [data-act]').forEach((b) => (b.onclick = () => runFile({ debug: b.dataset.act !== "run", stopOnEntry: b.dataset.act === "debug-entry" })));
  $("#brand").onclick = () => showHome(true);
  $("#brand").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showHome(true); } });
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
  applyTheme();
  wireStatic();
  buildMenus();
  setupResizers();
  if (layout.view === "settings") layout.view = "explorer";
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
  configureTypeScript();
  langTools = registerLanguageTools(monaco, { libs: cfg.libs, getSettings: () => settings, minimalEdit, toast });
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
        else createProject(EMPTY_PROJECT);
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
  setSetting,
};

boot();
