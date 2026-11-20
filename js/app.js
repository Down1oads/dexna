// Dexna: a Python IDE in the browser.
import { PyClient } from "./pyclient.js";
import { icon, iconSvg, fileIcon as fileBadge, fileIconSvg } from "./icons.js";
import { registerLanguageTools, SNIPPETS } from "./langtools.js";
import { starterFor, STARTER_FILES } from "./starters.js";
import { ONLINE_LANGS, ONLINE_BY_ID, ONLINE_BY_EXT, readsInput, runOnline, isObjC } from "./online.js";
import { registerLanguageModes, loadEmmet, MODES } from "./langmodes.js";
import { createAssistant } from "./assistant.js";
import { createExtras } from "./extras.js";
import { createPower } from "./power.js";
import { createMore } from "./more.js";
import { createLook, EFFECTS, UI_FONTS, CODE_FONTS } from "./look.js";
import { createPlus } from "./plus.js";
import { createPkgs } from "./pkgs.js";
import { createTweaks } from "./tweaks.js";
import { createFx } from "./fx.js";
import { createJoy } from "./joy.js";
import { createPrefs, PROJECT_KEYS, makeMatcher, globToRegExp } from "./prefs.js";
import { createDevtools } from "./devtools.js";
import { createCursesView } from "./cursesview.js";
import { createNotebook } from "./notebook.js";
import { createPro } from "./pro.js";
import { createGitHub } from "./github.js";
import { assetStore, mimeOf, kindOf, isBinary, dataUrl, sizeLabel } from "./assets.js";
import { createOffline } from "./offline.js";
import { THEMES, THEME_BY_ID, DEFAULT_DARK, DEFAULT_LIGHT, uiVars, ansiPalette, monacoTheme, registerCustomTheme } from "./themes.js";
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
  runOnSave: false, localHistory: true, clipboardHistory: true, colorSwatches: true,
  bgEffect: "none", bgSolid: "#1e4fd8", bgIntensity: 60, bgSpeed: 40, glass: 70, glassBlur: false, bgImageBlur: 0, cursorEffect: "none", corners: "default",
  accentColor: "", uiFont: "plex", editorFont: "jetbrains", lineHeight: 0,
  sidebarSide: "left", panelSide: "bottom", showActivityBar: true, showStatusBar: true, density: "normal", uiFontSize: 13, fileIcons: "color", activityHidden: [],
  errorLens: "off", rulers: "none", cursorBlinking: "smooth", cursorWidth: 2, lineHighlight: "all", guides: "both", folding: true, minimapSide: "right", scrollbarSize: "normal",
  autoClose: "languageDefined", multiCursorKey: "alt", fontWeight: "400", letterSpacing: 0, useTabs: false, trimOnSave: false, finalNewline: false,
  hoverDelay: 300, suggestWhileTyping: true, acceptOnEnter: true, terminalFontSize: 13, typingSound: "off", typingVolume: 50, customCss: "",
  tabStyle: "classic", tabClose: "hover", tabIcons: true, tabWrap: false, showTabs: true, showBreadcrumbs: true, runButtons: "text", statusHidden: [], clock: "off",
  greetingName: "", langTabSize: {}, centered: false, centeredWidth: 1000, cursorColor: "", selectionColor: "", eventSounds: false, reduceMotion: false,
  chroma: false, chromaSeconds: 20, codeGlow: "off", cursorTrail: false, screenFilter: "none", filterStrength: 50, ambient: "off", ambientVolume: 40,
  timeTheme: false, dayStarts: 7, nightStarts: 19,
  focusMode: "off", typewriter: false, indentRainbow: false, celebrate: false,
  autoSave: "delay", autoSaveDelay: 400, filesExclude: "**/__pycache__\n**/.DS_Store\n*.pyc", explorerSort: "name", confirmDelete: true, fileAssociations: {},
  inlayHints: "off", inlayParams: "literals", inlayTypes: true, confirmClose: "always", fullscreenCtrlW: true,
  vimMode: false, changeMarkers: true, zenFullscreen: false, cursorStyle: "line", lineNumbers: "on", smoothCaret: true,
};
const settings = { ...DEFAULT_SETTINGS, ...LS.get("settings", {}) };
delete settings.powerMode; // left over from a removed feature
// While a project overrides a setting, `settings` holds the project's value and this holds yours.
let overriddenUser = {};
const userSettings = () => ({ ...settings, ...overriddenUser });
function saveSettings() { LS.set("settings", userSettings()); }
// older versions stored "dark" / "light"
if (settings.theme === "dark") settings.theme = DEFAULT_DARK;
else if (settings.theme === "light") settings.theme = DEFAULT_LIGHT;
for (const t of LS.get("customThemes", [])) registerCustomTheme(t); // themes made in the theme editor
if (settings.theme !== "auto" && !THEME_BY_ID[settings.theme]) settings.theme = DEFAULT_DARK;
if (!THEME_BY_ID[settings.darkTheme]) settings.darkTheme = DEFAULT_DARK;
if (!THEME_BY_ID[settings.lightTheme]) settings.lightTheme = DEFAULT_LIGHT;
const layout = { sidebarWidth: 260, panelHeight: 270, view: "explorer", panel: "terminal", sidebar: true, panelOpen: true, ...LS.get("layout", {}) };
const saveLayout = debounce(() => LS.set("layout", layout), 300);
let projectsIndex = LS.get("projects", []);
let project = null;
let extras = null; // source control, toolbox, bookmarks and the rest (extras.js)
let prefs = null; // settings JSON, project settings, profiles (prefs.js)
let joy = null; // focus mode, typewriter, rainbow indents, confetti (joy.js)
let fx = null; // theme from a picture, chroma, glow, cursor trail, screen filters, ambient sounds (fx.js)
let tweaks = null; // layout, spacing, file icons, your CSS, typing sounds, settings export (tweaks.js)
let pkgs = null; // Lua libraries, web page libraries, SQL sample databases (pkgs.js)
let devtools = null; // tests, coverage, profiler and run settings (devtools.js)
let notebook = null; // Jupyter notebooks (notebook.js)
let pro = null; // Error Lens and the REST client (pro.js)
let nbTextMode = null; // a notebook opened as plain JSON instead
// the screen for Python curses programs, over the terminal panel
const cursesView = createCursesView({ reply: (t) => kernel?.reply(t), host: () => document.querySelector('.panel-view[data-panel="terminal"]') });
let plus = null; // shell, CSV/JSON/SVG previews, focus timer, activity, templates, notes (plus.js)
let look = null; // backgrounds, fonts, corners, cursor effects, looks (look.js)
let more = null; // back/forward, project symbols, shortcuts, themes, colour swatches (more.js)
let power = null; // split editor, snippets, clipboard and local history, run on save (power.js)

const EMPTY_PROJECT = { name: "My project", files: {} };
const newId = () => Math.random().toString(36).slice(2, 10);

/* ---------- binary files (images, fonts, audio...): bytes in IndexedDB, an index in project.assets ---------- */
let assetBytes = new Map(), assetB64 = new Map();
const isAsset = (p) => !!project?.assets?.[p];
const assetPaths = () => Object.keys(project?.assets || {});
function assetBase64(p) {
  let v = assetB64.get(p);
  if (v == null && assetBytes.has(p)) { v = dataUrl(assetBytes.get(p), "").slice(13); assetB64.set(p, v); } // "data:;base64," is 13 characters
  return v ?? null;
}
async function loadAssets(p) {
  assetBytes = new Map(); assetB64 = new Map();
  const paths = Object.keys(p.assets || {});
  if (!paths.length) return;
  const all = await assetStore.all(p.id, paths);
  if (project !== p) return;
  for (const [k, v] of Object.entries(all)) assetBytes.set(k, v);
  renderTree();
  if (web.path) refreshPreview({ full: true });
}
/** Add or replace binary files: { path: Uint8Array }. */
async function addAssets(map) {
  if (!project) return;
  project.assets ||= {};
  const id = project.id, list = Object.entries(map).filter(([p]) => project.files[p] == null);
  for (const [path, bytes] of list) {
    project.assets[path] = { size: bytes.length, type: mimeOf(path) };
    assetBytes.set(path, bytes); assetB64.delete(path);
    addDirs(dirname(path));
  }
  persistProject(); renderTree();
  if (web.path) refreshPreview({ full: true });
  await Promise.all(list.map(([p, b]) => assetStore.put(id, p, b)));
}
function removeAssets(paths) {
  for (const p of paths) { delete project.assets[p]; assetBytes.delete(p); assetB64.delete(p); assetStore.del(project.id, p); }
}
/** Files for Python: the text files, plus the bytes of binary files so programs can open them. */
const filesForPython = () => (assetBytes.size ? { ...project.files, ...Object.fromEntries(assetBytes) } : project.files);

function openAsset(path) {
  const meta = project.assets?.[path];
  if (!meta) return;
  const bytes = assetBytes.get(path), kind = kindOf(path), url = bytes ? dataUrl(bytes, mimeOf(path)) : null;
  const info = h("span", { class: "muted small" }, sizeLabel(meta.size));
  let body;
  if (!bytes) body = h("p", { class: "muted" }, "Still loading. Try again in a moment.");
  else if (kind === "image") { const img = h("img", { class: "asset-img", src: url, alt: basename(path) }); img.onload = () => { info.textContent = `${img.naturalWidth} × ${img.naturalHeight} · ${sizeLabel(meta.size)}`; }; body = h("div", { class: "asset-view checker" }, img); }
  else if (kind === "audio") body = h("div", { class: "asset-view" }, h("audio", { src: url, controls: true }));
  else if (kind === "video") body = h("div", { class: "asset-view" }, h("video", { class: "asset-img", src: url, controls: true }));
  else if (kind === "font") {
    const fam = "dexna-font-" + Math.random().toString(36).slice(2);
    new FontFace(fam, bytes).load().then((f) => document.fonts.add(f)).catch(() => {});
    body = h("div", { class: "asset-view asset-font", style: { fontFamily: `"${fam}", sans-serif` } }, h("div", { style: { fontSize: "34px" } }, "The quick brown fox jumps over the lazy dog"), h("div", { style: { fontSize: "18px" } }, "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !?&"));
  } else body = h("p", { class: "muted" }, "A binary file. Dexna keeps it with the project (for the web preview, Python, ZIP downloads and GitHub) but cannot edit it.");
  openModal(h("div", { class: "modal asset-modal" },
    h("div", { class: "modal-head" }, basename(path), " ", info),
    h("div", { class: "modal-body" }, body, h("p", { class: "muted small" }, path)),
    h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => downloadFile(path) }, "Download"), h("button", { class: "btn primary", onclick: () => closeOverlay?.() }, "Close"))));
}

/* ---------- dropping files into the editor, and pasting images ---------- */
/** A path from one project file to another (for references in pages, styles and Markdown). */
function relPath(from, to) {
  const a = dirname(from) ? dirname(from).split("/") : [], b = to.split("/");
  let i = 0; while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return [...a.slice(i).map(() => ".."), ...b.slice(i)].join("/") || basename(to);
}
/** What to insert for a file dropped (or pasted) into another, by the kind of file being edited. */
function referenceTo(from, target) {
  const rel = relPath(from, target), name = basename(target).replace(/\.[^.]+$/, ""), kind = kindOf(target), ext = extOf(target);
  const lang = langOf(from);
  const enc = rel.split("/").map(encodeURIComponent).join("/");
  if (lang === "markdown") return kind === "image" ? `![${name}](${enc})` : `[${basename(target)}](${enc})`;
  if (lang === "html") {
    if (kind === "image") return `<img src="${rel}" alt="${name}">`;
    if (kind === "audio") return `<audio src="${rel}" controls></audio>`;
    if (kind === "video") return `<video src="${rel}" controls></video>`;
    if (ext === "css") return `<link rel="stylesheet" href="${rel}">`;
    if (ext === "js" || ext === "mjs") return `<script src="${rel}"></script>`;
    return `<a href="${rel}">${basename(target)}</a>`;
  }
  if (lang === "css" || lang === "scss" || lang === "less") return kind === "font" ? `@font-face {\n  font-family: "${name}";\n  src: url("${rel}");\n}` : `url("${rel}")`;
  if (lang === "python") return JSON.stringify(target); // programs run from the project folder
  if (lang === "javascript" || lang === "typescript") return JSON.stringify(/\.(m?js|ts)$/.test(target) ? (rel.startsWith(".") ? rel : "./" + rel) : rel);
  return rel;
}
/** Run the formatter on every file that has one, a file at a time, then go back to where you were. */
async function formatAllFiles() {
  const FORMATTABLE = new Set(["python", "javascript", "typescript", "json", "css", "scss", "less", "html", "lua", "sql", "c", "cpp", "java", "csharp", "go"]);
  const paths = Object.keys(project.files).filter((p) => FORMATTABLE.has(langOf(p)) && !isExcluded()(p));
  if (!paths.length) return toast("No files here have a formatter", "info");
  if (!(await confirmDialog({ title: "Format all files", message: `Format ${paths.length} file${paths.length === 1 ? "" : "s"} with their language's formatter? Local History keeps the versions from before.`, okLabel: "Format" }))) return;
  const back = project.active, changed = [], failed = [];
  for (const p of paths) {
    const m = ensureModel(p), before = m.getValue();
    editor.setModel(m);
    try {
      const act = editor.getAction("editor.action.formatDocument");
      if (act?.isSupported()) await Promise.race([act.run(), new Promise((r) => setTimeout(r, 8000))]);
    } catch (_) { failed.push(p); }
    if (m.getValue() !== before) changed.push(p);
  }
  if (back) openFile(back); else editor.setModel(null);
  toast(changed.length ? `Formatted ${changed.length} file${changed.length === 1 ? "" : "s"}: ${changed.slice(0, 5).join(", ")}${changed.length > 5 ? "…" : ""}` : "Every file was already formatted", "ok", 5000);
  if (failed.length) toast(`Could not format ${failed.join(", ")}`, "warn");
}

function setupEditorInserts(ed) {
  // GitHub actions on the editor's right-click menu (they explain themselves when the project is not on GitHub)
  ed.addAction({ id: "dexna.ghLink", label: "Copy GitHub Link to These Lines", contextMenuGroupId: "9_dexna", contextMenuOrder: 5, run: () => cmdById("gh-copy-link")?.run() });
  ed.addAction({ id: "dexna.ghIssue", label: "Create GitHub Issue from Selection…", contextMenuGroupId: "9_dexna", contextMenuOrder: 6, run: () => cmdById("gh-issue-sel")?.run() });
  const node = ed.getContainerDomNode(); // (getDomNode is null until a file is open)
  const insertAt = (pos, text) => {
    const range = new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
    ed.executeEdits("dexna-insert", [{ range, text, forceMoveMarkers: true }]);
    ed.setPosition(ed.getModel().getPositionAt(ed.getModel().getOffsetAt(pos) + text.length));
    ed.focus();
  };
  // a file dragged from the Explorer: insert a reference to it where it is dropped
  node.addEventListener("dragover", (e) => { if (dragPath && e.dataTransfer.types.includes("text/plain")) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }, true); // the Explorer starts its drags as "move"
  node.addEventListener("drop", (e) => {
    const target = dragPath, from = currentPath();
    if (!target || !from || target === from || (project.files[target] == null && !isAsset(target))) return;
    e.preventDefault(); e.stopPropagation();
    const t = ed.getTargetAtClientPoint(e.clientX, e.clientY);
    insertAt(t?.position || ed.getPosition(), referenceTo(from, target));
    dragPath = null;
  }, true);
  // an image pasted from the clipboard: keep it as a file next to this one, and refer to it
  // listened for on the parent: Monaco handles pasted files itself on the editor element when it has focus
  (node.parentElement || node).addEventListener("paste", async (e) => {
    if (!node.contains(e.target)) return;
    const from = currentPath();
    const item = [...(e.clipboardData?.items || [])].find((i) => i.kind === "file" && i.type.startsWith("image/"));
    if (!item || !from) return;
    e.preventDefault(); e.stopPropagation();
    const file = item.getAsFile(), ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
    const dir = (dirname(from) ? dirname(from) + "/" : "") + "images";
    let path = `${dir}/pasted-${stamp}.${ext}`, n = 2;
    while (exists(path)) path = `${dir}/pasted-${stamp}-${n++}.${ext}`;
    await addAssets({ [path]: new Uint8Array(await file.arrayBuffer()) });
    insertAt(ed.getPosition(), referenceTo(from, path));
    toast(`Saved the image as ${path}`, "ok");
  }, true);
}
const assetDataUrl = (p) => (isAsset(p) && assetBytes.has(p) ? `data:${mimeOf(p)};base64,${assetBase64(p)}` : null);

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
  // files with unsaved edits are stored as they were when last saved
  const stored = dirty.size ? { ...project, files: { ...project.files } } : project;
  for (const [p, text] of dirty) if (stored.files[p] != null && text != null) stored.files[p] = text;
  LS.set("project:" + project.id, stored);
  const meta = projectsIndex.find((p) => p.id === project.id);
  if (meta) { meta.name = project.name; meta.updated = project.updated; }
  LS.set("projects", projectsIndex);
  LS.set("current", project.id);
  extras?.onFilesChanged();
  power?.onFilesChanged();
  devtools?.onFilesChanged();
  plus?.onFilesChanged();
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
const LANGS = { http: "http", rest: "http", ipynb: "json", py: "python", pyi: "python", json: "json", md: "markdown", js: "javascript", mjs: "javascript", ts: "typescript", lua: "lua", html: "html", css: "css",
  yml: "yaml", yaml: "yaml", toml: "ini", ini: "ini", cfg: "ini", sql: "sql", sh: "shell", xml: "xml", csv: "plaintext", txt: "plaintext" };
// Languages Dexna can run. Python uses the main kernel; the rest run in a throwaway runner worker.
const RUN_LANG = { py: "python", js: "javascript", mjs: "javascript", ts: "typescript", lua: "lua", sql: "sql", html: "web", htm: "web" };
const RUN_LANG_NAME = { python: "Python", javascript: "JavaScript", typescript: "TypeScript", lua: "Lua", sql: "SQL", web: "Web page" };
// Compiled languages run on a public online compiler (see js/online.js).
for (const l of ONLINE_LANGS) { RUN_LANG_NAME[l.id] = l.name; for (const e of l.ext) { RUN_LANG[e] = l.id; if (!LANGS[e] || e === "sh") LANGS[e] = l.monaco; } }
Object.assign(LANGS, { h: "c", hpp: "cpp", kts: "kotlin", htm: "html", f95: "fortran" });
const isOnline = (lang) => !!ONLINE_BY_ID[lang];
const extOf = (p) => p.split(".").pop().toLowerCase();
const textOf = (p) => models.get(p)?.getValue() ?? project?.files[p] ?? "";
// .m is Objective-C or Octave: decided by the contents, like GitHub's Linguist does
const runLangOf = (p) => (extOf(p) === "m" ? (isObjC(textOf(p)) ? "objc" : "octave") : RUN_LANG[extOf(p)] || null);
const isRunnable = (p) => !!runLangOf(p);
const langOf = (p) => {
  const assoc = settings.fileAssociations;
  if (assoc && typeof assoc === "object") for (const [glob, lang] of Object.entries(assoc)) { const re = globToRegExp(glob); if (re && re.test(p) && lang) return lang; }
  return extOf(p) === "m" ? (isObjC(textOf(p)) ? "objective-c" : "octave") : LANGS[extOf(p)] || "plaintext";
};
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

/** The theme as drawn: the current one, with your accent colour if you picked one. */
function effectiveTheme() {
  const t = currentTheme();
  const a = /^#[0-9a-f]{6}$/i.test(settings.accentColor || "") ? settings.accentColor.toLowerCase() : null;
  return a && a !== t.c.accent ? { ...t, id: `${t.id}-accent-${a.slice(1)}`, c: { ...t.c, accent: a } } : t;
}
/** Monaco's theme; see-through when a background effect is on, so the effect shows behind the code. */
function editorThemeData(t) {
  const d = monacoTheme(t);
  const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v || "") ? v : null);
  if (hex(settings.cursorColor)) d.colors = { ...d.colors, "editorCursor.foreground": settings.cursorColor };
  if (hex(settings.selectionColor)) d.colors = { ...d.colors, "editor.selectionBackground": settings.selectionColor + "66", "editor.inactiveSelectionBackground": settings.selectionColor + "33" };
  if (look?.fxOn()) d.colors = { ...d.colors, "editor.background": "#00000000", "editorGutter.background": "#00000000", "minimap.background": "#00000000", "editorOverviewRuler.background": "#00000000", "focusBorder": "#00000000" };
  return d;
}
function updateThemeIcon() {
  const btn = document.getElementById("btn-theme");
  if (!btn) return;
  const dark = currentTheme().type === "dark";
  btn.replaceChildren(icon(dark ? "moon" : "sun"));
  btn.title = `${currentTheme().name}. Click to switch to ${dark ? THEME_BY_ID[settings.lightTheme].name : THEME_BY_ID[settings.darkTheme].name}`;
}
function applyTheme() {
  const base = currentTheme(), t = effectiveTheme();
  const root = document.documentElement;
  root.dataset.theme = t.type;
  root.classList.toggle("mono-theme", !!t.c.mono); // black and white: icons lose their colour too
  const vars = uiVars(t);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  setAnsiPalette(ansiPalette(t));
  $('meta[name="theme-color"]').content = t.c.bg;
  if (settings.theme !== "auto") settings[base.type === "dark" ? "darkTheme" : "lightTheme"] = base.id;
  try { localStorage.setItem("dexna:themecache", JSON.stringify({ type: t.type, vars })); } catch (_) {}
  updateThemeIcon();
  if (monaco) { monaco.editor.defineTheme(t.id, editorThemeData(t)); monaco.editor.setTheme(t.id); }
  look?.updateBackdrop();
  if (web.path && (extras?.isMarkdown(web.path) || plus?.canPreview(web.path))) setTimeout(() => refreshPreview({ full: true }), 0);
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
    tabSize: settings.tabSize, insertSpaces: !settings.useTabs, detectIndentation: false,
    wordWrap: settings.wordWrap ? "on" : "off", minimap: { enabled: settings.minimap && innerWidth > 760, renderCharacters: false, scale: 1, side: settings.minimapSide },
    stickyScroll: { enabled: settings.stickyScroll }, renderWhitespace: settings.renderWhitespace,
    bracketPairColorization: { enabled: settings.bracketColors },
    guides: { bracketPairs: settings.guides === "both" ? "active" : false, indentation: settings.guides !== "none", highlightActiveIndentation: settings.guides !== "none" },
    rulers: settings.rulers === "none" ? [] : String(settings.rulers).split(",").map(Number),
    cursorBlinking: settings.cursorBlinking, cursorWidth: +settings.cursorWidth || 2, renderLineHighlight: settings.lineHighlight, folding: settings.folding,
    scrollbar: { verticalScrollbarSize: { thin: 7, normal: 12, thick: 16 }[settings.scrollbarSize] || 12, horizontalScrollbarSize: { thin: 7, normal: 12, thick: 16 }[settings.scrollbarSize] || 12 },
    autoClosingBrackets: settings.autoClose, autoClosingQuotes: settings.autoClose, multiCursorModifier: settings.multiCursorKey,
    fontWeight: String(settings.fontWeight), letterSpacing: +settings.letterSpacing || 0,
    hover: { enabled: settings.hoverDelay > 0, delay: Math.max(100, settings.hoverDelay) },
    quickSuggestions: settings.suggestWhileTyping ? { other: true, comments: false, strings: false } : false, acceptSuggestionOnEnter: settings.acceptOnEnter ? "on" : "off",
    cursorStyle: settings.cursorStyle, lineNumbers: settings.lineNumbers, colorDecorators: settings.colorSwatches,
    lineHeight: settings.lineHeight || 0,
    inlayHints: { enabled: { off: "off", on: "on", hold: "offUnlessPressed" }[settings.inlayHints] || "off" },
    cursorSmoothCaretAnimation: settings.smoothCaret && !settings.reduceMotion ? "on" : "off", smoothScrolling: settings.smoothCaret && !settings.reduceMotion,
  };
}

function createEditor() {
  editor = monaco.editor.create($("#editor"), {
    model: null, automaticLayout: true, glyphMargin: true, fixedOverflowWidgets: true,
    mouseWheelZoom: true, padding: { top: 8 },
    scrollBeyondLastLine: true, suggest: { showStatusBar: true, preview: false }, suggestLineHeight: 24,
    inlineSuggest: { enabled: true }, linkedEditing: true, formatOnPaste: false, lightbulb: { enabled: "on" },
    "semanticHighlighting.enabled": true, quickSuggestionsDelay: 80, ...editorOptions(),
  });
  setupEditorInserts(editor);

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

/** Indent size for a file: its language's own size if you set one, else the general one. */
function tabSizeFor(path) { return +settings.langTabSize?.[langOf(path)] || settings.tabSize; }
function ensureModel(path) {
  let m = models.get(path);
  if (m) return m;
  m = monaco.editor.createModel(project.files[path] ?? "", langOf(path), uriFor(path));
  m.updateOptions({ tabSize: tabSizeFor(path), insertSpaces: !settings.useTabs });
  models.set(path, m);
  m.onDidChangeContent((ev) => onModelChange(path, m, ev));
  renderBreakpointDecos(path);
  updateCellDecos(path);
  extras?.onModelCreated(path);
  power?.onModelCreated(path);
  more?.onModelCreated(path);
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
// Edited files that are not saved yet (when auto save waits), with the text they had when last saved.
// Until you save, storage keeps that saved text, even when something else saves the project meanwhile.
const dirty = new Map();
let autoSaveTimer = 0;
/** Save every edited file now (Ctrl+S, leaving the editor, the auto save timer). */
function commitDirty() {
  clearTimeout(autoSaveTimer);
  if (!dirty.size) return;
  dirty.clear();
  renderTabs();
  persistProject();
  persistProject.flush();
}
function onModelChange(path, model, ev) {
  if (suppressModelEvents) return;
  const before = project.files[path];
  project.files[path] = model.getValue();
  if (settings.autoSave === "delay" && (+settings.autoSaveDelay || 400) <= 400) persistProject();
  else {
    if (!dirty.has(path)) { dirty.set(path, before); renderTabs(); }
    if (settings.autoSave === "delay") { clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(commitDirty, +settings.autoSaveDelay); }
  }
  if (bpDecos.get(path)?.length) syncBreakpointsFromDecos(path);
  extras?.onModelContent(path);
  power?.onModelContent(path);
  plus?.recordEdit(path);
  more?.onModelContent(path);
  clearRuntimeError(path);
  if (!lspWriters.has(path)) lspWriters.set(path, debounce(() => lspSyncFile(path), 350));
  lspWriters.get(path)();
  if (path.endsWith(".py")) { scheduleLint(path); scheduleCells(path); }
  if (path === currentPath()) scheduleOutline();
  if (path === "requirements.txt") { clearTimeout(reqTimer); reqTimer = setTimeout(() => syncRequirements(), 1500); }
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
  commitDirty();
  persistProject.flush?.();
  if (project) saveViewState();
  if (web.path) showPreview(false); // the preview belongs to the project being left
  closeAllModels();
  project = data;
  project.assets ||= {};
  loadAssets(project);
  setTimeout(() => syncRequirements(), 0);
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
  applyProjectSettings();
  extras?.onProjectLoaded();
  power?.onProjectLoaded();
  pkgUI.picked = false;
  plus?.onProjectLoaded();
  more?.onProjectLoaded();
  devtools?.onProjectLoaded();
  setTimeout(warmRuntimes, 1500); // after the project is on screen
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
  assetStore.delProject(id, assetPaths()).catch(() => {});
  LS.del("project:" + id);
  extras?.scm.deleteProject(id).catch(() => {});
  power?.deleteProject(id);
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
const exists = (p) => project.files[p] != null || isAsset(p) || project.dirs.includes(p) || [...Object.keys(project.files), ...assetPaths()].some((f) => f.startsWith(p + "/"));

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
  const isFile = project.files[from] != null || isAsset(from);
  const mapping = [];
  if (isFile) mapping.push([from, to]);
  else for (const f of [...Object.keys(project.files), ...assetPaths()]) if (f.startsWith(from + "/")) mapping.push([f, to + f.slice(from.length)]);
  const activeKey = project.active;
  for (const [a, b] of mapping) {
    if (isAsset(a)) { // a binary file: move its bytes too
      const bytes = assetBytes.get(a), meta = project.assets[a];
      delete project.assets[a]; project.assets[b] = meta;
      assetBytes.delete(a); assetB64.delete(a);
      if (bytes) { assetBytes.set(b, bytes); assetStore.put(project.id, b, bytes); }
      assetStore.del(project.id, a);
      continue;
    }
    const m = models.get(a);
    const content = m ? m.getValue() : project.files[a];
    delete project.files[a];
    project.files[b] = content;
    if (project.breakpoints[a]) { project.breakpoints[b] = project.breakpoints[a]; delete project.breakpoints[a]; }
    if (project.bookmarks?.[a]) { project.bookmarks[b] = project.bookmarks[a]; delete project.bookmarks[a]; }
    power?.onRename(a, b);
    plus?.onRename(a, b);
    more?.onRename(a, b);
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
  const isFile = project.files[path] != null || isAsset(path);
  if (settings.confirmDelete !== false && !(await confirmDialog({ title: "Delete", message: `Delete ${isFile ? "file" : "folder"} "${path}"${isFile ? "" : " and everything inside it"}? File > Local History can bring files back.`, okLabel: "Delete", danger: true }))) return;
  const files = isFile ? [path] : [...Object.keys(project.files), ...assetPaths()].filter((f) => f.startsWith(path + "/"));
  if (!isFile) project.dirs = project.dirs.filter((d) => d !== path && !d.startsWith(path + "/"));
  removeFiles(files);
}
/** Delete files without asking. */
function removeFiles(files) {
  const bin = files.filter(isAsset);
  if (bin.length) { removeAssets(bin); files = files.filter((f) => !isAsset(f) && !bin.includes(f)); if (!files.length) { persistProject(); renderTree(); if (web.path) refreshPreview({ full: true }); return; } }
  power?.beforeRemove(files);
  for (const f of files) {
    if (project.files[f] == null) continue;
    delete project.files[f];
    delete project.breakpoints[f];
    if (project.bookmarks) delete project.bookmarks[f];
    if (project.open.includes(f)) closeTab(f, { silent: true });
    disposeModel(f);
    lsp?.call("remove", { path: f }).catch(() => {});
  }
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
  if (isAsset(path)) addAssets({ [cand]: assetBytes.get(path) });
  else createFile(cand, models.get(path)?.getValue() ?? project.files[path]);
}

function downloadBlob(blob, name) {
  const a = h("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
function downloadProject() { downloadBlob(createZip({ ...project.files, ...Object.fromEntries(assetBytes) }, slug(project.name)), slug(project.name) + ".zip"); }
/** A folder (and everything in it) as a ZIP, named after the folder. */
function downloadFolder(dir) {
  const inside = (f) => f.startsWith(dir + "/");
  const files = {};
  for (const [f, t] of Object.entries(project.files)) if (inside(f)) files[f.slice(dir.length + 1)] = t;
  for (const [f, b] of assetBytes) if (inside(f)) files[f.slice(dir.length + 1)] = b;
  if (!Object.keys(files).length) return toast("That folder is empty", "info");
  downloadBlob(createZip(files, basename(dir)), slug(basename(dir)) + ".zip");
}

/** Resize an image, or convert it between PNG, JPEG and WebP (drawn on a canvas, in the browser). */
async function imageTool(path) {
  const bytes = assetBytes.get(path);
  if (!bytes) return toast("The image is still loading. Try again in a moment.", "info");
  let bmp;
  try { bmp = await createImageBitmap(new Blob([bytes], { type: mimeOf(path) })); } catch (_) { return toast("The browser could not read this image", "error"); }
  const W = bmp.width, H = bmp.height, ext0 = extOf(path);
  const width = h("input", { type: "number", min: 1, max: 16384, value: W }), height = h("input", { type: "number", min: 1, max: 16384, value: H });
  const keep = h("input", { type: "checkbox", checked: true });
  const format = h("select", {}, [["png", "PNG (lossless, transparency)"], ["jpg", "JPEG (photos, smaller)"], ["webp", "WebP (smallest, for the web)"]].map(([v, l]) => h("option", { value: v, selected: v === (ext0 === "jpeg" ? "jpg" : ext0) }, l)));
  const quality = h("input", { type: "range", min: 30, max: 100, value: 85 }), qv = h("span", { class: "muted small" }, "85%");
  const asNew = h("input", { type: "checkbox", checked: true });
  const info = h("p", { class: "muted small" });
  const preview = h("img", { class: "asset-img" });
  const fit = (src) => { if (!keep.checked) return; if (src === width) height.value = Math.max(1, Math.round((+width.value / W) * H)); else width.value = Math.max(1, Math.round((+height.value / H) * W)); };
  const render = async () => {
    const w = Math.max(1, Math.min(16384, +width.value || W)), hh = Math.max(1, Math.min(16384, +height.value || H)), fmt = format.value;
    const c = new OffscreenCanvas(w, hh), g = c.getContext("2d");
    if (fmt === "jpg") { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, hh); } // JPEG has no transparency
    g.imageSmoothingQuality = "high"; g.drawImage(bmp, 0, 0, w, hh);
    const blob = await c.convertToBlob({ type: fmt === "jpg" ? "image/jpeg" : "image/" + fmt, quality: +quality.value / 100 });
    return { blob, w, hh, fmt };
  };
  const update = debounce(async () => {
    qv.textContent = quality.value + "%";
    quality.disabled = format.value === "png";
    const { blob, w, hh } = await render();
    if (preview.src) URL.revokeObjectURL(preview.src);
    preview.src = URL.createObjectURL(blob);
    info.textContent = `${W} × ${H}, ${sizeLabel(bytes.length)}  →  ${w} × ${hh}, ${sizeLabel(blob.size)}` + (blob.type.endsWith(format.value === "jpg" ? "jpeg" : format.value) ? "" : " (this browser could not make that format, so PNG)");
  }, 150);
  width.addEventListener("input", () => { fit(width); update(); }); height.addEventListener("input", () => { fit(height); update(); });
  for (const el of [keep, format, quality]) el.addEventListener("input", update);
  const save = async () => {
    const { blob } = await render();
    const real = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1], stem = path.replace(/\.[^./]+$/, "");
    let target;
    if (asNew.checked) { // photo.png -> photo-200x100.webp (numbered if taken)
      target = `${stem}-${+width.value}x${+height.value}.${real}`;
      for (let n = 2; exists(target); n++) target = `${stem}-${+width.value}x${+height.value}-${n}.${real}`;
    } else { // replace: same file, or the same name with the new format's extension
      target = `${stem}.${real}`;
      if (target !== path) removeAssets([path]);
    }
    const out = new Uint8Array(await blob.arrayBuffer());
    await addAssets({ [target]: out });
    closeOverlay?.();
    toast(`Saved ${target} (${sizeLabel(out.length)})`, "ok");
  };
  const row = (label, ...els) => h("label", { class: "img-row" }, h("span", {}, label), ...els);
  openModal(h("div", { class: "modal asset-modal" },
    h("div", { class: "modal-head" }, `Resize or convert ${basename(path)}`),
    h("div", { class: "modal-body img-tool" },
      h("div", { class: "asset-view checker" }, preview),
      info,
      h("div", { class: "img-grid" },
        row("Width", width, h("span", { class: "muted small" }, "px")), row("Height", height, h("span", { class: "muted small" }, "px")),
        h("label", { class: "si-check" }, keep, h("span", {}, "Keep the proportions")),
        row("Format", format), row("Quality", quality, qv),
        h("label", { class: "si-check" }, asNew, h("span", {}, "Save as a new file (otherwise replace this one)")))),
    h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => closeOverlay?.() }, "Cancel"), h("button", { class: "btn primary", onclick: save }, "Save"))));
  update();
}

function downloadFile(path) { downloadBlob(isAsset(path) ? new Blob([assetBytes.get(path) || new Uint8Array()], { type: mimeOf(path) }) : new Blob([project.files[path]], { type: "text/plain" }), basename(path)); }

async function readUploads(fileList, dir = "") {
  let added = 0, skipped = 0;
  const bins = {};
  for (const f of fileList) {
    if (f.name.toLowerCase().endsWith(".zip")) { await importZip(f); continue; }
    if (f.size > 25_000_000) { skipped++; continue; }
    const buf = new Uint8Array(await f.arrayBuffer());
    const rel = (f.webkitRelativePath || f.name);
    let path = validPath((dir ? dir + "/" : "") + rel);
    if (!path) continue;
    if (isBinary(buf) || f.size > 2_000_000) { if (project.files[path] == null) { bins[path] = buf; added++; } else skipped++; continue; } // images, fonts, audio...
    const text = new TextDecoder().decode(buf);
    if (project.files[path] != null) { models.get(path)?.setValue(text); added++; continue; }
    if (createFile(path, text, { open: added === 0 })) added++;
  }
  if (Object.keys(bins).length) await addAssets(bins);
  if (added) toast(`Added ${added} file${added > 1 ? "s" : ""}`, "ok");
  syncRequirements();
  if (skipped) toast(`Skipped ${skipped} file${skipped > 1 ? "s" : ""}: over 25 MB, or a binary file with the name of a text file.`, "warn");
}

async function importZip(file) {
  try {
    const all = await readZip(await file.arrayBuffer(), { binary: true });
    if (!Object.keys(all).length) return toast("No files found in the zip", "warn");
    const files = {}, bins = {};
    for (const [k, v] of Object.entries(all)) (typeof v === "string" ? files : bins)[k] = v;
    createProject({ files, entry: Object.keys(files).find((f) => /(^|\/)(main|app|__main__)\.py$/.test(f)) || Object.keys(files).find((f) => /(^|\/)index\.html?$/i.test(f)) }, file.name.replace(/\.zip$/i, ""));
    if (Object.keys(bins).length) await addAssets(bins);
    toast(`Imported ${Object.keys(all).length} files`, "ok");
  } catch (e) { toast("Could not read zip: " + e.message, "error"); }
}

/* =====================================================================
 * Explorer tree
 * ===================================================================== */
let treeSelection = null;
let excludeCache = { text: null, fn: () => false };
/** A test for files hidden by Files > Hide files (from the Explorer, search and Go to File). */
function isExcluded() {
  if (excludeCache.text !== settings.filesExclude) excludeCache = { text: settings.filesExclude, fn: makeMatcher(settings.filesExclude) };
  return excludeCache.fn;
}
const treeCompare = (a, b) => {
  if (settings.explorerSort === "type") { const ea = extOf(a), eb = extOf(b); if (ea !== eb) return ea.localeCompare(eb); }
  return basename(a).localeCompare(basename(b), undefined, { numeric: true, sensitivity: "base" });
};
const treeEl = $("#file-tree");

let treeFilter = "";
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
  const hidden = isExcluded();
  const words = treeFilter.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length) { // only the files that match, inside their folders
    const match = (f) => { const l = f.toLowerCase(); return words.every((w) => l.includes(w)); };
    for (const f of [...Object.keys(project.files), ...assetPaths()]) if (!hidden(f) && match(f)) dirNode(dirname(f)).files.push(f);
    return root;
  }
  for (const d of project.dirs) if (!hidden(d)) dirNode(d);
  for (const f of Object.keys(project.files)) if (!hidden(f)) dirNode(dirname(f)).files.push(f);
  for (const f of assetPaths()) if (!hidden(f)) dirNode(dirname(f)).files.push(f);
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
      const open = !!treeFilter.trim() || project.expanded.includes(d.path);
      const errs = Object.entries(counts).filter(([k]) => k.startsWith(d.path + "/")).reduce((s, [, c]) => s + c.e, 0);
      const row = h("div", { class: "row" + (treeSelection === d.path ? " selected" : ""), style: { paddingLeft: 8 + depth * 14 + "px" }, "data-path": d.path, "data-dir": "1", draggable: "true" },
        h("span", { class: "twisty" }, icon(open ? "chevronDown" : "chevronRight")), fi(open ? "folderOpen" : "folder"),
        h("span", { class: "name" + (errs ? " err" : "") }, basename(d.path)));
      treeEl.append(row);
      if (open) walk(d, depth + 1);
    }
    for (const f of node.files.sort(treeCompare)) {
      const c = counts[f];
      const row = h("div", { class: "row" + (treeSelection === f ? " selected" : "") + (f === runTarget ? " entry" : ""), style: { paddingLeft: 8 + depth * 14 + "px" }, "data-path": f, draggable: "true", title: f },
        h("span", { class: "twisty" }), fileIcon(f), h("span", { class: "name" + (c?.e ? " err" : c?.w ? " warn" : "") }, basename(f)),
        f === project.entry && project.pinEntry ? h("span", { class: "badge-main" }, "MAIN") : null,
        c?.e ? h("span", { class: "meta err" }, c.e) : c?.w ? h("span", { class: "meta warn" }, c.w) : null);
      treeEl.append(row);
    }
  };
  walk(root, 0);
  if (!treeEl.children.length) treeEl.append(treeFilter.trim() ? h("div", { class: "empty" }, `No files match "${treeFilter.trim()}"`) : h("div", { class: "empty" }, "No files yet. ", h("button", { class: "link", onclick: () => newFileDialog("") }, "Create one")));
}

function selectTreeRow(path) {
  treeSelection = path;
  $$(".row.selected", treeEl).forEach((r) => r.classList.remove("selected"));
  const row = treeEl.querySelector(`.row[data-path="${CSS.escape(path)}"]`);
  row?.classList.add("selected");
  row?.scrollIntoView({ block: "nearest" });
}

$("#tree-filter").addEventListener("input", (e) => { treeFilter = e.target.value; renderTree(); });
$("#tree-filter").addEventListener("keydown", (e) => {
  if (e.key === "Escape") { e.stopPropagation(); e.target.value = ""; treeFilter = ""; renderTree(); treeEl.focus(); }
  else if (e.key === "Enter" || e.key === "ArrowDown") { const first = treeEl.querySelector(".row:not([data-dir])"); if (first) { e.preventDefault(); if (e.key === "Enter") { const p = first.dataset.path; isAsset(p) ? openAsset(p) : openFile(p); } else { selectTreeRow(first.dataset.path); treeEl.focus(); } } }
});
treeEl.addEventListener("click", (e) => {
  const row = e.target.closest(".row");
  if (!row) { treeSelection = null; $$(".row.selected", treeEl).forEach((r) => r.classList.remove("selected")); return; }
  const p = row.dataset.path;
  if (row.dataset.dir) {
    project.expanded = project.expanded.includes(p) ? project.expanded.filter((x) => x !== p) : [...project.expanded, p];
    treeSelection = p;
    persistProject();
    renderTree();
  } else if (isAsset(p)) { selectTreeRow(p); openAsset(p); }
  else { selectTreeRow(p); openFile(p, { focus: e.detail > 1 }); }
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
      items.push({ label: "Open", run: () => (isAsset(p) ? openAsset(p) : openFile(p)) });
      const cur = currentPath();
      if (cur && cur !== p && editor) items.push({ label: `Insert Reference in ${basename(cur)}`, run: () => { const pos = editor.getPosition(); const text = referenceTo(cur, p); editor.executeEdits("dexna-insert", [{ range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column), text, forceMoveMarkers: true }]); editor.focus(); } });
      if (isAsset(p)) items.push({ label: "Copy as Data URL", run: () => { const d = assetDataUrl(p); if (d) navigator.clipboard?.writeText(d).then(() => toast(`Copied ${basename(p)} as a data URL (${sizeLabel(d.length)})`, "ok"), () => toast("The browser did not allow copying", "warn")); } });
      if (isRunnable(p)) {
        items.push({ label: "Run This File", run: () => runFile({ path: p }) });
        items.push({ label: project.entry === p && project.pinEntry ? "Unset as Main File" : "Set as Main File", run: () => togglePinEntry(p) });
      }
      items.push({ label: "Duplicate", run: () => duplicateFile(p) }, { label: "Download", run: () => downloadFile(p) });
      if (isAsset(p) && kindOf(p) === "image" && !/\.(svg|ico|cur)$/i.test(p)) items.push({ label: "Resize or Convert Image…", run: () => imageTool(p) });
    } else items.push({ label: "Download Folder as ZIP", run: () => downloadFolder(p) });
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
  } else if (e.dataTransfer.files.length) readUploads([...e.dataTransfer.files], targetDir); // a copy: the drop's list empties once the event ends
});
let uploadTarget = "";
$("#file-upload").addEventListener("change", (e) => { readUploads([...e.target.files], uploadTarget); e.target.value = ""; }); // copy first: clearing the input empties its live file list
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
  { id: "web", name: "HTML/CSS", ext: "html", file: "index.html", desc: "A web page with a live preview beside the editor." },
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
  for (const [p, text] of Object.entries(STARTER_FILES[l.id] || {})) if (!exists(p)) createFile(p, text, { open: false });
  const path = createFile(l.file || `main.${l.ext}`, starter.text);
  if (l.id === "web" && path) { project.entry = path; persistProject(); updateRunTarget(); }
  if (path && editor.getModel()) { editor.setPosition({ lineNumber: starter.line, column: starter.column }); editor.revealLineInCenterIfOutsideViewport(starter.line); editor.focus(); }
}

async function openRecent(id) {
  if (id !== project.id) { persistProject.flush(); await loadProject(id); }
  if (!project.active) { const first = project.open[0] || Object.keys(project.files).find(isRunnable) || Object.keys(project.files)[0]; if (first) return openFile(first); }
  if (project.active) showHome(false);
}

/** The online languages that are not listed on Home, in a searchable picker. Each starts with its own preset. */
function pickMoreLanguages() {
  const extra = ONLINE_LANGS.filter((o) => !LANG_STARTS.some((l) => l.id === o.id));
  quickPick({
    placeholder: "Start a project in another language (runs online)",
    source: (q) => extra.map((o) => ({ o, m: fuzzy(q, o.name) })).filter((x) => x.m).sort((a, b) => (q ? b.m.score - a.m.score : a.o.name.localeCompare(b.o.name)))
      .map(({ o, m }) => ({ iconHtml: fileIconSvg("x." + o.ext[0]), label: o.name, labelHtml: highlight(o.name, m.idx), desc: `main.${o.ext[0]}`, run: () => startLanguage({ id: o.id, name: o.name, ext: o.ext[0], online: true }) })),
  });
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
  const extra = ONLINE_LANGS.filter((o) => !LANG_STARTS.some((l) => l.id === o.id));
  onlineRows.push(h("button", { class: "lang-row", onclick: pickMoreLanguages },
    h("span", { class: "lc-icon" }, icon("more")), h("span", { class: "ln" }, "More..."), h("span", { class: "ld" }, `${extra.length} more: ${extra.slice(0, 6).map((o) => o.name).join(", ")} and others.`), h("span", { class: "lf" }, "")));
  const exRows = EXAMPLES.map((ex) => {
    const names = [...new Set(Object.keys(ex.files).map((f) => RUN_LANG[f.split(".").pop().toLowerCase()]).filter(Boolean))].map((k) => RUN_LANG_NAME[k] + (isOnline(k) ? " (online)" : ""));
    return h("button", { class: "ex-row", title: ex.desc, onclick: () => { createProject(ex); toast(`Opened ${ex.name}. Press F5 to run.`, "ok"); } },
      h("span", { class: "ex-name" }, ex.name), h("span", { class: "ex-meta" }, names.join(", ")));
  });
  home.textContent = "";
  home.append(h("div", { class: "home-inner" },
    h("div", { class: "home-head" }, h("h1", {}, "Dexna"), h("p", { class: "home-sub" }, "Code editor and runner for the browser"),
      settings.greetingName?.trim() ? h("p", { class: "home-greet" }, tweaks.greeting()) : null),
    h("div", { class: "home-cols" },
      h("div", {},
        h("div", { class: "home-section" }, h("h2", {}, "Start"),
          h("div", { class: "home-actions" },
            action("newFile", "New file...", () => newFileDialog(""), "ctrl+alt+n"),
            action("search", "Go to file...", () => quickOpen(), "ctrl+p"),
            action("download", "Import project from ZIP...", () => $("#zip-upload").click()),
            action("branch", "Open a GitHub repository...", () => github.ask()),
            action("file", "Upload files...", () => { uploadTarget = ""; $("#file-upload").click(); }),
            action("star", "Command palette...", () => quickOpen(">"), "ctrl+shift+p"),
            action("branch", "Source control and history", () => setView("scm"), "ctrl+shift+g"),
            action("tools", "Toolbox: regex, JSON, hashes, colors...", () => setView("tools")),
            action("terminal", "Shell for your files", () => { showHome(false); cmdById("shell").run(); }),
            action("chart", "Your coding activity", () => cmdById("activity").run()),
            action("settings", "Settings and color themes", () => showSettings(true)),
            action("info", "Languages and snippets", showLanguageGuide),
            action("info", "Keyboard shortcuts", () => showShortcuts()))),
        h("div", { class: "home-section" }, h("h2", {}, "Recent"),
          recent.length ? h("div", { class: "recent-list" }, recent) : h("div", { class: "muted small" }, "Projects you create will show up here."))),
      h("div", {},
        plus?.homeSection(),
        h("div", { class: "home-section" }, h("h2", {}, "New project"),
          h("h3", {}, "Runs on your device"), h("div", { class: "lang-list" }, localRows),
          h("h3", {}, "Runs online"), h("p", { class: "home-aside" }, "These compile on a public online service. Dexna asks before sending anything."), h("div", { class: "lang-list" }, onlineRows)),
        h("div", { class: "home-section" }, h("h2", {}, "Examples"), h("div", { class: "ex-list" }, exRows)))),
    h("p", { class: "home-note" }, "Python, JavaScript, TypeScript, Lua, SQL and web pages run on your device and your code stays in this browser. Online languages send the file you run to a public compiler, after you agree.")));
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
  if (nbTextMode && nbTextMode !== key) nbTextMode = null;
  notebook?.onOpen(key.startsWith("ext:") ? null : key);
  if (!key.startsWith("ext:")) persistProject();
  if (key.startsWith("ext:") && !extTabs.includes(key)) extTabs.push(key);
  editor.updateOptions({ readOnly: key.startsWith("ext:") || autoTyping.has(key) });
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
  $("#sb-lang").textContent = langName(model.getLanguageId());
  updateRunTarget();
  scheduleOutline();
}

const LANG_NAMES = { python: "Python", plaintext: "Plain Text", javascript: "JavaScript", typescript: "TypeScript", lua: "Lua", sql: "SQL", json: "JSON", markdown: "Markdown", html: "HTML", css: "CSS", yaml: "YAML", csharp: "C#", java: "Java", c: "C", cpp: "C++", go: "Go", rust: "Rust", kotlin: "Kotlin", php: "PHP", ruby: "Ruby", swift: "Swift", perl: "Perl", dart: "Dart", scala: "Scala", r: "R", shell: "Shell", elixir: "Elixir", pascal: "Pascal", clojure: "Clojure", fsharp: "F#", vb: "Visual Basic", "objective-c": "Objective-C", xml: "XML", ini: "INI", powershell: "PowerShell", haskell: "Haskell", julia: "Julia", zig: "Zig", nim: "Nim", ocaml: "OCaml", fortran: "Fortran", octave: "Octave", erlang: "Erlang", groovy: "Groovy", dlang: "D", cobol: "COBOL", nasm: "Assembly", prolog: "Prolog", commonlisp: "Common Lisp", crystal: "Crystal", ada: "Ada", odin: "Odin", raku: "Raku", vala: "Vala", mojo: "Mojo", modula2: "Modula-2", freebasic: "BASIC" };
const langName = (id) => LANG_NAMES[id] || MODES[id]?.name || (id ? id[0].toUpperCase() + id.slice(1) : "");

const extTabs = [];
const closedTabs = []; // most recent last, for Reopen Closed Tab
function closeTab(key, { silent } = {}) {
  if (!key.startsWith("ext:")) { closedTabs.push({ project: project.id, path: key }); if (closedTabs.length > 50) closedTabs.shift(); }
  const tabs = allTabs();
  const idx = tabs.indexOf(key);
  if (key.startsWith("ext:")) { extTabs.splice(extTabs.indexOf(key), 1); }
  else { saveViewStateFor(key); project.open = project.open.filter((p) => p !== key); }
  if (project.active === key) {
    const rest = allTabs();
    const next = rest[Math.min(idx, rest.length - 1)];
    if (next) openFile(next, { focus: !silent });
    else { project.active = null; editor.setModel(null); notebook?.hide(); showWelcome(true); updateBreadcrumbs(); updateRunTarget(); scheduleOutline(); }
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
    const tab = h("div", { class: "tab" + (key === project.active && !pageOpen() ? " active" : "") + (ext ? " readonly" : "") + (dirty.has(key) ? " dirty" : "") + (c?.e ? " has-error" : c?.w ? " has-warn" : ""), title: p, draggable: "true", "data-key": key },
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
        { label: "Reopen Closed Tab", kb: "alt+shift+t", disabled: !closedTabs.some((t) => t.project === project.id), run: () => cmdById("tab-reopen").run() },
        "-",
        { label: "Reveal in Explorer", disabled: ext, run: () => { expandTo(key); renderTree(); setView("explorer"); selectTreeRow(key); } },
        { label: "Copy Path", run: () => navigator.clipboard?.writeText(p) },
        { label: "Run This File", disabled: ext || !isRunnable(p), run: () => runFile({ path: p }) },
        ...(!ext && (extras?.isMarkdown(p) || plus?.canPreview(p)) ? [{ label: "Open Preview", kb: "ctrl+shift+v", run: () => previewFile(p) }] : []),
        "-",
        { label: "Compare with Last Commit", disabled: ext || !extras?.scm.head, run: () => extras.scm.diffWithHead(p) },
        { label: "File History", disabled: ext || !extras?.scm.head, run: () => extras.scm.fileHistory(p) },
        { label: "Compare With…", disabled: ext, run: () => { openFile(key); cmdById("compare-file").run(); } },
        { label: "Toggle Bookmark Here", disabled: ext, run: () => extras.toggleBookmark(p, editor.getPosition()?.lineNumber || 1) },
        "-",
        { label: "Open to the Side", kb: "ctrl+\\", disabled: ext, run: () => power.openSplit(p) },
        { label: "Local History", disabled: ext, run: () => power.timeline(p) },
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
  if (!key.startsWith("ext:") && (extras?.isMarkdown(key) || plus?.canPreview(key))) bc.append(h("button", { class: "btn sm bc-action", title: "Open the preview beside the editor (Ctrl+Shift+V)", onclick: () => previewFile(key) }, icon("eye"), web.path === key ? "Preview open" : "Preview"));
}

function updateCursorStatus() {
  const pos = editor.getPosition();
  if (!pos) { $("#sb-cursor").textContent = ""; return; }
  const sel = editor.getSelection();
  const m = editor.getModel();
  const n = sel && m ? m.getValueInRange(sel).length : 0;
  $("#sb-cursor").textContent = `Ln ${pos.lineNumber}, Col ${pos.column}` + (n ? ` (${n} selected)` : "");
  updateWordCount();
  updateEol();
}
function updateEol() {
  const m = editor?.getModel(), el = $("#sb-eol");
  if (!el) return;
  el.textContent = m ? (m.getEOL() === "\r\n" ? "CRLF" : "LF") : "";
}
function chooseEol() {
  const m = editor?.getModel();
  if (!m || !currentPath()) return;
  quickPick({ placeholder: "Line endings for this file", source: () => [
    { label: "LF", detail: "Linux, macOS, and most projects", desc: m.getEOL() === "\n" ? "current" : "", run: () => setEol(m, 0) },
    { label: "CRLF", detail: "Windows", desc: m.getEOL() === "\r\n" ? "current" : "", run: () => setEol(m, 1) },
  ] });
}
function setEol(m, crlf) { m.pushEOL(crlf ? monaco.editor.EndOfLineSequence.CRLF : monaco.editor.EndOfLineSequence.LF); updateEol(); toast(`Line endings are now ${crlf ? "CRLF" : "LF"}`, "ok"); }
/* ---------- words and reading time, for prose (Markdown and plain text) ---------- */
const countWords = (t) => (t.replace(/```[\s\S]*?```/g, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu) || []).length;
const updateWordCount = debounce(() => {
  const el = $("#sb-words"), m = editor?.getModel(), path = currentPath();
  if (!el) return;
  if (!m || !path || !/^(markdown|plaintext)$/.test(m.getLanguageId())) { el.classList.add("hidden"); return; }
  const sel = editor.getSelection(), part = sel && !sel.isEmpty() ? m.getValueInRange(sel) : null;
  const n = countWords(part ?? m.getValue()), mins = Math.max(1, Math.round(n / 230));
  el.textContent = part != null ? `${n} word${n === 1 ? "" : "s"} selected` : `${n} word${n === 1 ? "" : "s"} · ${mins} min read`;
  el.classList.remove("hidden");
}, 250);

/* ---------- Markdown: a table of contents from the headings ---------- */
/** GitHub's heading anchors: lower case, punctuation dropped, spaces to hyphens, numbered when repeated. */
function headingSlugger() {
  const seen = new Map();
  return (text) => {
    const base = text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[`*_~]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s/g, "-");
    const n = seen.get(base) || 0; seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}
function markdownToc(text) {
  const slug = headingSlugger(), rows = [];
  let fence = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) rows.push([m[1].length, m[2], slug(m[2])]);
  }
  const body = rows.filter(([lvl]) => lvl > 1 || rows.filter(([l]) => l === 1).length > 1); // a single title heading is left out
  if (!body.length) return null;
  const top = Math.min(...body.map(([l]) => l));
  return body.map(([lvl, t, s]) => `${"  ".repeat(lvl - top)}- [${t.replace(/\[|\]/g, "")}](#${s})`).join("\n");
}
function insertToc() {
  const m = editor?.getModel(), path = currentPath();
  if (!m || !path || m.getLanguageId() !== "markdown") return toast("Open a Markdown file first", "info");
  const toc = markdownToc(m.getValue());
  if (!toc) return toast("This file has no headings to list", "info");
  const block = `<!-- toc -->\n${toc}\n<!-- /toc -->`;
  const text = m.getValue(), start = text.indexOf("<!-- toc -->"), end = text.indexOf("<!-- /toc -->");
  if (start >= 0 && end > start) { // update the one already there
    const a = m.getPositionAt(start), b = m.getPositionAt(end + "<!-- /toc -->".length);
    editor.executeEdits("dexna-toc", [{ range: new monaco.Range(a.lineNumber, a.column, b.lineNumber, b.column), text: block }]);
    toast("Table of contents updated", "ok");
  } else {
    const pos = editor.getPosition();
    editor.executeEdits("dexna-toc", [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1), text: block + "\n\n", forceMoveMarkers: true }]);
  }
  editor.focus();
}
$("#sb-cursor").onclick = () => { editor.focus(); editor.getAction("editor.action.gotoLine")?.run(); };
$("#sb-eol").onclick = () => chooseEol();
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
    lib: ["es2022", "dom"], noEmit: false, sourceMap: true,
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
    case "plot": if (sink.addPlot) sink.addPlot(msg.data); else addPlot(msg.data); break;
    case "display": { const d = JSON.parse(msg.data); if (sink.display) sink.display(d); else sink.write(d.text + "\n", "stdout"); break; }
    case "test-result": devtools?.onTestResult(JSON.parse(msg.data)); break;
    case "curses": {
      const d = JSON.parse(msg.data);
      if (d.op === "open") { showPanel("terminal"); cursesView.open(); setKernelStatus("busy", "Running (keys go to the program)"); }
      else if (d.op === "frame") cursesView.frame(d);
      else if (d.op === "close") cursesView.close();
      else cursesView.beep();
      break;
    }
    case "curses-size": showPanel("terminal"); kernel.reply(JSON.stringify(cursesView.size())); break;
    case "curses-key": cursesView.keyRequest(JSON.parse(msg.data || "{}").t ?? -1); break;
    case "clear": sink.clear(); break;
    case "paused": onPaused(JSON.parse(msg.data)); break;
    case "eval-result": onEvalResult(JSON.parse(msg.data)); break;
    case "ack": dbg.waiting = true; dbgPump(); break;
    case "resumed": break;
    case "fatal": setKernelStatus("error", "Kernel crashed"); break;
  }
}

function setBusy(busy, mode = null) {
  const was = state.busy && state.mode;
  if (!busy && (was === "run" || was === "debug")) setTimeout(() => { const failed = !!lastRunOutput()?.failed; tweaks?.onRunEnded(failed); joy?.onRunEnded(failed); }, 0);
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
  if (a && !a.startsWith("ext:") && /\.(css|js)$/i.test(a)) { const page = pageUsing(a); if (page) return page; } // part of a web page: run the page
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

async function runFile({ debug = false, stopOnEntry = false, path, mode = "run" } = {}) {
  if (state.busy) return toast("A program is already running. Press Shift+F5 to stop it.", "warn");
  path ||= getRunTarget();
  if (!path) return toast("Create a file to run first, or start a project from Home.", "warn");
  if (path.endsWith(".ipynb")) return notebook?.active ? cmdById("nb-run-all").run() : openFile(path);
  const lang = runLangOf(path);
  if (!lang) return toast(`Dexna can't run ${basename(path)}. Help > Languages lists the languages it runs.`, "warn");
  if (lang !== "python") {
    if (debug) return toast("The debugger works with Python files only.", "warn");
    if (mode !== "run") return toast(`${mode === "coverage" ? "Coverage" : "The profiler"} works with Python files only.`, "warn");
    if (lang === "web") return runWeb(path);
    if (isOnline(lang)) return runOnlineFile(path, ONLINE_BY_ID[lang]);
    return runOther(path, lang);
  }
  if (debug && !kernel?.isolated) return toast("The debugger needs cross-origin isolation (try reloading the page in Chrome, Edge or Firefox).", "error", 6000);
  if (settings.formatOnSave) await formatDocument().catch(() => {});
  showPanel("terminal");
  if (settings.clearOnRun) terminal.clear();
  const opts = { ...(devtools?.runOptions(path) || {}), mode: debug ? "run" : mode };
  const what = debug ? "Debugging" : mode === "coverage" ? "Running with coverage" : mode === "profile" ? "Profiling" : "Running";
  terminal.separator(`${what} ${path}${opts.args?.length ? " " + opts.args.join(" ") : ""} at ${new Date().toLocaleTimeString()}`);
  sink = terminal;
  state.runStderr = "";
  clearRuntimeError();
  setBusy(true, debug ? "debug" : "run");
  if (debug) { dbg.active = true; dbg.bpsDirty = false; renderDebugView(); }
  try {
    await kernelReady();
    setBusy(true, debug ? "debug" : "run");
    await ensurePackages();
    await kernel.call("sync", { files: filesForPython(), dirs: project.dirs });
    const sources = Object.entries(project.files).filter(([p]) => p.endsWith(".py")).map(([, c]) => c);
    const res = await kernel.call("run", { path, debug, stopOnEntry, breakpoints: project.breakpoints, sources, autoInstall: settings.autoInstall, opts });
    const secs = res.time.toFixed(res.time < 10 ? 3 : 1);
    if (res.ok) terminal.system(`Process finished in ${secs}s`, "ok");
    else { terminal.system(`Process exited with an error after ${secs}s`, "stderr"); markRuntimeError(state.runStderr); }
    applyFileChanges(res.changes);
    if (res.coverage) devtools?.showCoverage(res.coverage, path);
    if (res.profile) devtools?.showProfile(res.profile, path, res.time);
    $("#sb-run").innerHTML = `${iconSvg(res.ok ? "check" : "error")}<span>${esc(path)} ${secs}s</span>`;
  } catch (e) {
    terminal.system(e.message, "stderr");
    $("#sb-run").innerHTML = `${iconSvg("error")}<span>${esc(path)}</span>`;
  } finally {
    if (terminal.inputActive) terminal.resolveInput(null);
    if (cursesView.active) cursesView.close(); // a program that crashed without endwin()
    setBusy(false);
    dbgEnd();
    refreshVariables();
  }
}

/** Run Python tests (all of them, some files, or single tests) and return each result. */
async function runTests(files, only = []) {
  if (state.busy) { toast("A program is already running. Press Shift+F5 to stop it.", "warn"); return null; }
  showPanel("terminal");
  if (settings.clearOnRun) terminal.clear();
  terminal.separator(`Running tests at ${new Date().toLocaleTimeString()}`);
  sink = terminal;
  clearRuntimeError();
  setBusy(true, "run");
  try {
    await kernelReady();
    setBusy(true, "run");
    await ensurePackages();
    await kernel.call("sync", { files: filesForPython(), dirs: project.dirs });
    const sources = Object.entries(project.files).filter(([p]) => p.endsWith(".py")).map(([, c]) => c);
    const res = await kernel.call("tests", { files, only, sources, autoInstall: settings.autoInstall });
    applyFileChanges(res.changes);
    return res.results;
  } catch (e) {
    terminal.system(e.message, "stderr");
    return null;
  } finally {
    if (terminal.inputActive) terminal.resolveInput(null);
    setBusy(false);
  }
}

/** Run a notebook cell on the Python kernel, with its output going to `cellSink`. */
async function runNotebookCell(code, cellSink) {
  if (state.busy) { toast("Python is busy. Wait for it to finish or press Stop.", "warn"); return null; }
  sink = cellSink;
  setBusy(true, "repl");
  try {
    await kernelReady();
    setBusy(true, "repl");
    await ensurePackages();
    await kernel.call("sync", { files: filesForPython(), dirs: project.dirs });
    const res = await kernel.call("cell", { code, autoInstall: settings.autoInstall });
    applyFileChanges(res.changes);
    return res;
  } catch (e) {
    cellSink.write(e.message + "\n", "stderr");
    return { ok: false, time: 0 };
  } finally {
    if (cellSink.inputActive) cellSink.resolveInput(null);
    sink = terminal;
    setBusy(false);
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
    await kernel.call("sync", { files: filesForPython(), dirs: project.dirs });
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

function applyFileChanges(changes, { silent = false } = {}) {
  if (!changes) return;
  const bins = Object.entries(changes).filter(([, v]) => v instanceof Uint8Array);
  if (bins.length) { addAssets(Object.fromEntries(bins)); changes = Object.fromEntries(Object.entries(changes).filter(([, v]) => !(v instanceof Uint8Array))); }
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
  if (added.length) { added.forEach(lspSyncFile); renderTabs(); }
  if (added.length && !silent) toast(`Your program created ${added.length === 1 ? added[0] : added.length + " files"}`, "ok");
  if ("requirements.txt" in changes) setTimeout(() => syncRequirements(), 0);
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
    cursesView.cancel();
    const pending = sink.inputActive ? sink : terminal.inputActive ? terminal : consoleTerm.inputActive ? consoleTerm : null;
    if (pending) pending.resolveInput("");
    clearTimeout(state.stopTimer);
    state.stopTimer = setTimeout(() => { if (state.busy) restartKernel("The program did not respond to the interrupt"); }, 3000);
  } else restartKernel();
}

/**
 * Make the first run of a project quick: fetch the language's engine into the browser cache in the
 * background, start the TypeScript service, and open the connection to the online compilers
 * (only once you have agreed to online runs, so nothing is contacted before that).
 */
const warmed = new Set();
function warmRuntimes() {
  if (!project) return;
  const exts = new Set(Object.keys(project.files).map((p) => p.split(".").pop().toLowerCase()));
  const fetchLow = (url) => { if (warmed.has(url)) return; warmed.add(url); fetch(url, { priority: "low" }).catch(() => warmed.delete(url)); };
  if (exts.has("lua")) { fetchLow(cfg.libs.wasmoon + "index.js"); fetchLow(cfg.libs.wasmoon + "glue.wasm"); }
  if (exts.has("sql")) { fetchLow(cfg.libs.sqlite + "sqlite3.mjs"); fetchLow(cfg.libs.sqlite + "sqlite3.wasm"); }
  if (exts.has("ts") && monaco && !warmed.has("ts")) { warmed.add("ts"); monaco.languages.typescript.getTypeScriptWorker().then((get) => get()).catch(() => {}); }
  if (settings.onlineRunners) {
    const hosts = new Set();
    for (const e of exts) { const l = ONLINE_BY_EXT[e]; if (!l) continue; const first = (l.order || ["ce", "judge0", "wandbox"]).find((n) => l[n]); hosts.add(first === "ce" ? "https://godbolt.org" : first === "judge0" ? "https://ce.judge0.com" : "https://wandbox.org"); }
    for (const href of hosts) {
      if (warmed.has(href)) continue;
      warmed.add(href);
      document.head.append(Object.assign(document.createElement("link"), { rel: "preconnect", href, crossOrigin: "anonymous" }));
    }
  }
}

/* ---------- other languages (JavaScript, TypeScript, Lua, SQL) ---------- */
let otherRun = null;

/** Compile every TypeScript file in the project to JavaScript with the editor's own TypeScript service. */
/** Decode a source map's "mappings" into, per generated line, a list of [column, source line, source column]. */
function decodeSourceMap(mappings) {
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lines = [];
  let srcLine = 0, srcCol = 0, src = 0;
  for (const line of mappings.split(";")) {
    const segs = [];
    let genCol = 0;
    for (const seg of line.split(",")) {
      if (!seg) continue;
      const vals = [];
      let v = 0, shift = 0;
      for (const ch of seg) {
        const d = B64.indexOf(ch);
        v += (d & 31) << shift;
        if (d & 32) shift += 5;
        else { vals.push(v & 1 ? -(v >>> 1) : v >>> 1); v = 0; shift = 0; }
      }
      genCol += vals[0];
      if (vals.length >= 4) { src += vals[1]; srcLine += vals[2]; srcCol += vals[3]; segs.push([genCol, srcLine, srcCol]); }
    }
    lines.push(segs);
  }
  return lines;
}

async function emitTypeScript() {
  const files = {};
  const maps = {};
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
      files[p] = js.text.replace(/\n?\/\/# sourceMappingURL=\S*\s*$/, "\n");
      // errors in compiled code must point at the TypeScript line the person wrote
      const map = res.outputFiles.find((f) => f.name.endsWith(".js.map"));
      if (map) try { maps[p] = decodeSourceMap(JSON.parse(map.text).mappings); } catch (_) {}
    } else if (ext === "js" || ext === "mjs") files[p] = models.get(p)?.getValue() ?? content;
  }
  Object.defineProperty(files, "__maps", { value: maps, enumerable: false });
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
  const worker = new Worker(new URL(`runner.js?v=${RUNNER_LOAD_ID}`, import.meta.url), { type: "module" });
  const sab = self.crossOriginIsolated && typeof SharedArrayBuffer !== "undefined" ? { ctrl: new SharedArrayBuffer(8), data: new SharedArrayBuffer(65536) } : null;
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
    else if (m.type === "input-request" && m.sync && sab) {
      // prompt(): the worker waits on shared memory; write the answer there and wake it
      terminal.requestInput((value) => {
        const ctrl = new Int32Array(sab.ctrl), bytes = new TextEncoder().encode(value ?? "").slice(0, sab.data.byteLength);
        new Uint8Array(sab.data).set(bytes);
        ctrl[1] = bytes.length;
        Atomics.store(ctrl, 0, value == null ? 2 : 1);
        Atomics.notify(ctrl, 0);
      });
    } else if (m.type === "input-request") {
      terminal.requestInput((value) => worker.postMessage({ cmd: "input-reply", value: value == null ? null : value }));
    } else if (m.type === "done") finish(m);
  };
  worker.onerror = (e) => { terminal.write(`${e.message || "The runner crashed"}\n`, "stderr"); finish({ ok: false, time: 0 }); };
  setKernelStatus("busy", `Running ${RUN_LANG_NAME[lang]}`);
  worker.postMessage({ cmd: "run", lang, entry: path, files: { ...files }, maps: files.__maps || {}, libs: cfg.libs, npm: project.npm || {}, sab });
}

/* ---------- web pages: HTML with its CSS and scripts, previewed beside the editor ---------- */
const web = { path: null, timer: 0, html: "" };
const isExternal = (ref) => /^([a-z][\w+.-]*:|\/\/|#)/i.test(ref);
function resolveRef(from, ref) {
  const parts = (dirname(from) ? dirname(from).split("/") : []);
  for (const seg of ref.split(/[?#]/)[0].split("/")) { if (seg === "..") parts.pop(); else if (seg && seg !== ".") parts.push(seg); }
  return parts.join("/");
}
/** The HTML page in this project that links a style sheet or script (so Run on style.css runs the page). */
function pageUsing(path) {
  const pages = Object.keys(project.files).filter((p) => /\.html?$/i.test(p));
  return pages.find((p) => [...textOf(p).matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)].some((m) => !isExternal(m[1]) && resolveRef(p, m[1]) === path)) || null;
}
const PREVIEW_BRIDGE = (store) => `(() => {
  const post = (m) => { try { parent.postMessage(Object.assign({ __dexna: 1 }, m), "*"); } catch (_) {} };
  const fmt = (v) => { if (typeof v === "string") return v; if (v instanceof Error) return v.stack || String(v); try { const s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch (_) { return String(v); } };
  for (const k of ["log", "info", "warn", "error", "debug"]) { const o = console[k].bind(console); console[k] = (...a) => { post({ type: k, text: a.map(fmt).join(" ") }); o(...a); }; }
  addEventListener("error", (e) => post({ type: "error", text: (e.error && e.error.stack) || (e.message + (e.filename ? " (" + e.filename.split("/").pop() + ":" + e.lineno + ")" : "")) }));
  addEventListener("unhandledrejection", (e) => post({ type: "error", text: "Unhandled promise rejection: " + fmt(e.reason) }));
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    const h = a.getAttribute("href");
    if (/^#/.test(h)) return;
    if (/^([a-z][\\w+.-]*:|\\/\\/)/i.test(h)) { a.target = "_blank"; return; }
    e.preventDefault(); post({ type: "nav", href: h });
  }, true);
  // The preview has its own origin, so it gets its own localStorage, saved with the project
  const data = new Map(Object.entries(${JSON.stringify(store).replace(/</g, "\\u003c")}));
  const save = () => post({ type: "storage", items: Object.fromEntries(data) });
  const storage = { getItem: (k) => (data.has(String(k)) ? data.get(String(k)) : null), setItem: (k, v) => { data.set(String(k), String(v)); save(); },
    removeItem: (k) => { data.delete(String(k)); save(); }, clear: () => { data.clear(); save(); }, key: (i) => [...data.keys()][i] ?? null, get length() { return data.size; } };
  try { Object.defineProperty(window, "localStorage", { value: storage, configurable: true }); } catch (_) {}
})();`;
/*
 * Files the page uses besides its HTML, CSS and scripts (images, fonts, audio, JSON...). The preview
 * runs in a sandbox that cannot load anything from Dexna, so each file goes into the page once, and a
 * small script there turns it into a URL of its own: for references in the HTML and CSS (rewritten
 * here to "dexna-asset:<path>"), and for ones made while the page runs (fetch, XMLHttpRequest, img.src,
 * new Audio, setAttribute, innerHTML).
 */
const PREVIEW_FILES = (bins, texts, types, base) => `(() => {
  const B64 = ${JSON.stringify(bins).replace(/</g, "\\u003c")}, TEXT = ${JSON.stringify(texts).replace(/</g, "\\u003c")}, TYPES = ${JSON.stringify(types)}, BASE = ${JSON.stringify(base)};
  const urls = new Map();
  const blobUrl = (p) => {
    if (urls.has(p)) return urls.get(p);
    let blob = null;
    if (B64[p] != null) { const bin = atob(B64[p]), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); blob = new Blob([a], { type: TYPES[p] || "" }); }
    else if (TEXT[p] != null) blob = new Blob([TEXT[p]], { type: TYPES[p] || "text/plain" });
    const u = blob ? URL.createObjectURL(blob) : null; urls.set(p, u); return u;
  };
  const key = (ref) => {
    if (typeof ref !== "string" || !ref) return null;
    if (ref.startsWith("dexna-asset:")) return decodeURIComponent(ref.slice(12));
    if (/^([a-z][\\w+.-]*:|\\/\\/|#)/i.test(ref)) return null;
    const out = [];
    for (const x of ((ref.startsWith("/") ? "" : BASE) + ref.split(/[?#]/)[0]).split("/")) { if (!x || x === ".") continue; if (x === "..") out.pop(); else out.push(x); }
    try { return decodeURIComponent(out.join("/")); } catch (_) { return out.join("/"); }
  };
  const map = (ref) => { const k = key(ref); return k != null && (k in B64 || k in TEXT) ? blobUrl(k) : null; };
  const css = (t) => (t.indexOf("url(") < 0 ? t : t.replace(/url\\(\\s*(['"]?)([^'")]+)\\1\\s*\\)/gi, (m, q, r) => { const u = map(r.trim()); return u ? 'url("' + u + '")' : m; }));
  const srcset = (v) => v.split(",").map((s) => { const [u, ...rest] = s.trim().split(/\\s+/); return [map(u) || u, ...rest].join(" "); }).join(", ");
  const of = window.fetch.bind(window);
  window.fetch = (input, init) => of((typeof input === "string" && map(input)) || input, init);
  const xo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, url, ...r) { return xo.call(this, m, map(String(url)) || url, ...r); };
  for (const C of [HTMLImageElement, HTMLMediaElement, HTMLSourceElement, HTMLTrackElement, HTMLInputElement, HTMLEmbedElement]) {
    const d = Object.getOwnPropertyDescriptor(C.prototype, "src");
    if (d && d.set) Object.defineProperty(C.prototype, "src", { configurable: true, enumerable: d.enumerable, get() { return d.get.call(this); }, set(v) { d.set.call(this, map(String(v)) || v); } });
  }
  const OA = window.Audio;
  if (OA) { window.Audio = function (src) { return src === undefined ? new OA() : new OA(map(String(src)) || src); }; window.Audio.prototype = OA.prototype; }
  const sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) {
    const l = String(n).toLowerCase();
    if (typeof v === "string" && (l === "src" || l === "poster" || l === "data" || (l === "href" && this.tagName === "LINK"))) v = map(v) || v;
    else if (typeof v === "string" && l === "srcset") v = srcset(v);
    else if (typeof v === "string" && l === "style") v = css(v);
    return sa.call(this, n, v);
  };
  const fix = (el) => {
    if (el.nodeType !== 1) return;
    for (const a of ["src", "poster", "data"]) { const v = el.getAttribute(a), m = v && map(v); if (m) sa.call(el, a, m); }
    if (el.tagName === "LINK") { const v = el.getAttribute("href"), m = v && map(v); if (m) sa.call(el, "href", m); }
    const ss = el.getAttribute("srcset"); if (ss) { const n = srcset(ss); if (n !== ss) sa.call(el, "srcset", n); }
    const st = el.getAttribute("style"); if (st && st.indexOf("url(") >= 0) { const n = css(st); if (n !== st) sa.call(el, "style", n); }
    if (el.tagName === "STYLE" && el.textContent.indexOf("url(") >= 0) { const n = css(el.textContent); if (n !== el.textContent) el.textContent = n; }
  };
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === "attributes") { fix(m.target); continue; }
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) { fix(n); if (n.querySelectorAll) n.querySelectorAll("[src],[srcset],[poster],[data],[style],link[href],style").forEach(fix); }
        else if (n.nodeType === 3 && n.parentNode && n.parentNode.tagName === "STYLE") fix(n.parentNode);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "srcset", "poster", "data", "style", "href"] });
})();`;
function buildPage(path) {
  const doc = new DOMParser().parseFromString(textOf(path), "text/html");
  const missing = [];
  const local = (ref) => { if (!ref || isExternal(ref) || ref.startsWith("data:")) return null; const p = resolveRef(path, ref); if (project.files[p] == null) { missing.push(ref); return null; } return p; };
  // a reference to another file of the project, as "dexna-asset:<path>" (null when it is not one)
  const asset = (from, ref) => {
    if (!ref || isExternal(ref) || /^(data|blob|#)/i.test(ref)) return null;
    let p; try { p = resolveRef(from, decodeURIComponent(ref.split(/[?#]/)[0])); } catch (_) { p = resolveRef(from, ref.split(/[?#]/)[0]); }
    return isAsset(p) || (project.files[p] != null && !/\.html?$/i.test(p)) ? "dexna-asset:" + encodeURIComponent(p) : null;
  };
  const cssRefs = (css, from) => (css.indexOf("url(") < 0 ? css : css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, ref) => { const a = asset(from, ref.trim()); return a ? `url("${a}")` : m; }));
  for (const l of doc.querySelectorAll('link[rel~="stylesheet"][href]')) {
    const p = local(l.getAttribute("href")); if (!p) continue;
    const st = doc.createElement("style"); st.textContent = cssRefs(textOf(p), p).replace(/<\/style/gi, "<\\/style"); l.replaceWith(st);
  }
  for (const st of doc.querySelectorAll("style")) if (st.textContent.includes("url(")) st.textContent = cssRefs(st.textContent, path);
  for (const el of doc.querySelectorAll("[style]")) { const v = el.getAttribute("style"); if (v.includes("url(")) el.setAttribute("style", cssRefs(v, path)); }
  for (const sc of doc.querySelectorAll("script[src]")) {
    const p = local(sc.getAttribute("src")); if (!p) continue;
    const n = doc.createElement("script");
    for (const at of sc.attributes) if (at.name !== "src") n.setAttribute(at.name, at.value);
    n.textContent = textOf(p).replace(/<\/script/gi, "<\\/script") + `\n//# sourceURL=${p}`;
    sc.replaceWith(n);
  }
  // images, media, icons and the like: point them at the project's files
  for (const el of doc.querySelectorAll("[src], [poster], object[data], link[href]:not([rel~=stylesheet])")) {
    for (const at of el.tagName === "LINK" ? ["href"] : el.tagName === "OBJECT" ? ["data"] : ["src", "poster"]) {
      if (el.tagName === "SCRIPT" || el.tagName === "IFRAME") continue;
      const a = asset(path, el.getAttribute(at)); if (a) el.setAttribute(at, a);
    }
  }
  for (const el of doc.querySelectorAll("[srcset]")) el.setAttribute("srcset", el.getAttribute("srcset").split(",").map((s) => { const [u, ...r] = s.trim().split(/\s+/); return [asset(path, u) || u, ...r].join(" "); }).join(", "));
  const bridge = doc.createElement("script");
  let store = {}; try { store = JSON.parse(localStorage.getItem("dexna:webstore:" + project.id) || "{}"); } catch (_) {}
  // every binary file once (base64), and the project's other text files, for the page to use
  const bins = {}, texts = {}, types = {};
  for (const p of assetPaths()) { const b = assetBase64(p); if (b != null) { bins[p] = b; types[p] = mimeOf(p); } }
  let textBudget = 15_000_000;
  for (const [p, t] of Object.entries(project.files)) {
    if (p === path || t.length > 2_000_000 || (textBudget -= t.length) < 0) continue;
    texts[p] = t; const m = mimeOf(p); types[p] = m === "application/octet-stream" ? (/\.css$/i.test(p) ? "text/css" : /\.m?js$/i.test(p) ? "text/javascript" : /\.html?$/i.test(p) ? "text/html" : "text/plain") : m;
  }
  bridge.textContent = PREVIEW_BRIDGE(store) + "\n" + PREVIEW_FILES(bins, texts, types, path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "");
  (doc.head || doc.documentElement).prepend(bridge);
  return { html: "<!DOCTYPE html>\n" + doc.documentElement.outerHTML, missing };
}
function setPreviewWidth(px) {
  const wrap = $("#editor-wrap");
  if (px) layout.previewWidth = Math.round(px);
  wrap.style.setProperty("--preview-w", layout.previewWidth ? layout.previewWidth + "px" : "45%");
}
function showPreview(on) {
  if (on) power?.closeSplit({ remember: false });
  $("#preview").classList.toggle("hidden", !on);
  $("#editor-wrap").classList.toggle("with-preview", on);
  if (!on) { web.path = null; web.mdLoaded = null; $("#preview-frame").srcdoc = ""; updateBreadcrumbs(); }
}
function refreshPreview({ announce = false, full = false } = {}) {
  if (!web.path || project.files[web.path] == null) return showPreview(false);
  if (plus?.canPreview(web.path)) { // CSV, JSON and SVG files
    web.mdLoaded = null;
    $("#preview-title").textContent = web.path;
    web.html = plus.previewPage(web.path, textOf(web.path));
    $("#preview-frame").srcdoc = web.html;
    return;
  }
  if (extras?.isMarkdown(web.path)) {
    const path = web.path, seq = (web.seq = (web.seq || 0) + 1);
    $("#preview-title").textContent = path;
    if (web.mdLoaded === path && !full) { // only the content changed: keep the page and its scroll position
      extras.markdownBody(textOf(path), path).then((html) => { if (seq === web.seq) postToPreview({ __dexnaMd: 1, html }); });
    } else {
      extras.markdownPage(textOf(path), path).then((html) => {
        if (seq !== web.seq) return;
        web.html = html; web.mdLoaded = path;
        $("#preview-frame").srcdoc = html;
      });
    }
    return;
  }
  web.mdLoaded = null;
  const { html, missing } = buildPage(web.path);
  web.html = html;
  $("#preview-title").textContent = web.path;
  $("#preview-frame").srcdoc = html;
  if (announce && missing.length) terminal.system(`Not found in the project: ${[...new Set(missing)].join(", ")}`, "stderr");
}
function postToPreview(msg) { try { $("#preview-frame").contentWindow?.postMessage(msg, "*"); } catch (_) {} }
/** Show a page or a Markdown file in the preview beside the editor. */
function previewFile(path) {
  if (!extras?.isMarkdown(path) && !plus?.canPreview(path)) return runWeb(path);
  web.path = path;
  web.mdLoaded = null;
  setPreviewWidth();
  showPreview(true);
  refreshPreview();
  updateBreadcrumbs();
}
function runWeb(path) {
  showPanel("terminal");
  if (settings.clearOnRun) terminal.clear();
  terminal.separator(`Previewing ${path} at ${new Date().toLocaleTimeString()}`);
  terminal.system("The page updates as you type. console.log output from the page shows here.", "sys");
  web.path = path;
  setPreviewWidth();
  showPreview(true);
  refreshPreview({ announce: true });
  $("#sb-run").innerHTML = `${iconSvg("check")}<span>${esc(path)}</span>`;
}
function schedulePreview() {
  if (!web.path) return;
  clearTimeout(web.timer);
  web.timer = setTimeout(() => refreshPreview(), 450);
}
function setupPreview() {
  $("#preview-reload").onclick = () => refreshPreview({ announce: true });
  $("#preview-close").onclick = () => showPreview(false);
  $("#preview-open").onclick = () => { if (!web.html) return; const url = URL.createObjectURL(new Blob([web.html], { type: "text/html" })); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000); };
  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || m.__dexna !== 1 || e.source !== $("#preview-frame").contentWindow) return;
    if (m.type === "nav") {
      const p = resolveRef(web.path, m.href);
      if (project.files[p] != null && (/\.html?$/i.test(p) || extras?.isMarkdown(p))) { web.path = p; refreshPreview({ announce: true }); openFile(p, { focus: false }); }
      else terminal.system(`The page links to ${m.href}, which is not a page in this project.`, "stderr");
    } else if (m.type === "storage") {
      try { localStorage.setItem("dexna:webstore:" + project.id, JSON.stringify(m.items || {})); } catch (_) {}
    } else terminal.write(String(m.text) + "\n", m.type === "error" || m.type === "warn" ? "stderr" : "stdout");
  });
  const handle = $("#preview-resizer");
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault(); handle.setPointerCapture(e.pointerId); document.body.classList.add("resizing");
    const r = $("#editor-wrap").getBoundingClientRect();
    const move = (ev) => setPreviewWidth(Math.max(200, Math.min(r.width - 200, r.right - ev.clientX)));
    const up = () => { document.body.classList.remove("resizing"); handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); saveLayout(); };
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up);
  });
}

/* ---------- the Assistant (a free model that runs on this device) ---------- */
let assistant = null;
function assistantContext() {
  const model = editor.getModel(), path = pathOfModel(model);
  if (!model || !path || pageOpen()) return null;
  const sel = editor.getSelection();
  const selection = sel && !sel.isEmpty() ? model.getValueInRange(sel) : "";
  const lang = runLangOf(path);
  return {
    path, code: model.getValue(), selection, range: selection ? sel : null, selStart: sel?.startLineNumber, selEnd: sel?.endLineNumber, cursorLine: editor.getPosition()?.lineNumber || 1,
    language: RUN_LANG_NAME[lang] || model.getLanguageId(), fence: lang === "web" ? "html" : model.getLanguageId() === "plaintext" ? "" : model.getLanguageId(),
  };
}
/** The Terminal output of the most recent run, and whether it failed. */
function lastRunOutput() {
  const sep = $$("#terminal .run-sep").at(-1);
  if (!sep) return null;
  const all = $("#terminal").innerText, i = all.lastIndexOf(sep.textContent);
  const text = all.slice(i).trim();
  return { text, failed: /Process exited with an error|Stopped$/.test(text) || /Traceback \(most recent call last\)/.test(text) };
}
function setupAssistant() {
  const libUrl = new URL(cfg.libs.webllm, location.href).href;
  assistant = createAssistant({
    h, icon, monaco, editor, toast, libUrl,
    workerUrl: new URL(`ai-worker.js?lib=${encodeURIComponent(libUrl)}`, import.meta.url),
    getContext: assistantContext, getLastRun: lastRunOutput,
    autoSession, open: (path) => openFile(path), run: (path) => runFile({ path }), confirm: confirmDialog,
    problemsFor: (path) => monaco.editor.getModelMarkers({ resource: uriFor(path) }).filter((m) => m.severity === monaco.MarkerSeverity.Error)
      .sort((a, b) => a.startLineNumber - b.startLineNumber).map((m) => ({ line: m.startLineNumber, message: m.message.split("\n")[0] })),
    newFile: (code, lang) => { // a code block from the Assistant as its own file, named by its language
      const id = (lang || "").toLowerCase();
      const known = monaco.languages.getLanguages().find((l) => l.id === id || (l.aliases || []).some((a) => a.toLowerCase() === id) || (l.extensions || []).includes("." + id));
      const ext = { csharp: "cs", "c#": "cs", python: "py", javascript: "js", typescript: "ts", cpp: "cpp", "c++": "cpp", shell: "sh", bash: "sh" }[id] || known?.extensions?.[0]?.slice(1) || "txt";
      let name = `snippet.${ext}`;
      for (let n = 2; exists(name); n++) name = `snippet-${n}.${ext}`;
      if (createFile(name, code.endsWith("\n") ? code : code + "\n")) toast(`Created ${name}. Rename it from the Explorer if you like.`);
    },
  });
  // in the editor's right-click menu, like VS Code's chat entries
  for (const [id, label, kind, order] of [["dexna.ai.explain", "Assistant: Explain This", "explain", 1], ["dexna.ai.fix", "Assistant: Find Bugs", "fix", 2]]) {
    editor.addAction({ id, label, contextMenuGroupId: "0_assistant", contextMenuOrder: order, run: () => askAssistant(kind) });
  }
}
/* Auto mode: where each code block of an answer goes, and typing it into the editor as it arrives. */
const FENCE_LANG = {
  py: "python", python: "python", python3: "python", js: "javascript", javascript: "javascript", node: "javascript", jsx: "javascript", ts: "typescript", typescript: "typescript",
  lua: "lua", sql: "sql", sqlite: "sql", html: "web", htm: "web", css: "css", cs: "csharp", csharp: "csharp", "c#": "csharp", java: "java", c: "c", cpp: "cpp", "c++": "cpp", cc: "cpp",
  go: "go", golang: "go", rust: "rust", rs: "rust", kotlin: "kotlin", kt: "kotlin", swift: "swift", php: "php", ruby: "ruby", rb: "ruby",
};
const SHELL_FENCE = /^(bash|sh|shell|zsh|console|terminal|cmd|bat|powershell|ps1|text|txt|plaintext|output)$/i;
/** The language a code block is in: its fence, else a language named in the question, else the open file's. */
function langForBlock(fence, question, targetPath) {
  const f = (fence || "").toLowerCase();
  const asksShell = /\b(bash|shell) script\b/i.test(question);
  if (SHELL_FENCE.test(f) && !(asksShell && /^(bash|sh|shell)$/.test(f))) return null; // "how to run it" snippets stay in the chat
  let id = FENCE_LANG[f] || ONLINE_LANGS.find((l) => l.id === f || l.monaco === f || l.name.toLowerCase() === f || l.ext.includes(f))?.id;
  if (!id && !f) {
    const q = question.toLowerCase();
    const named = [["c#", "csharp"], ["c++", "cpp"], ["html", "web"], ...LANG_STARTS.map((l) => [l.name.toLowerCase(), l.id]), ...ONLINE_LANGS.map((l) => [l.name.toLowerCase(), l.id])]
      .find(([name]) => new RegExp(`(^|[^\\w#+])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\w#+])`).test(q));
    id = named?.[1] || (targetPath && runLangOf(targetPath)) || "python";
  }
  if (!id) return null;
  if (id === "css") return { id: "web", name: "HTML/CSS", file: "style.css", part: "css" };
  if (id === "bash" && !asksShell) return null;
  const start = LANG_STARTS.find((l) => l.id === id), online = ONLINE_BY_ID[id];
  if (!start && !online) return null;
  return { id, name: start?.name || online.name, file: start?.file || `main.${start?.ext || online.ext[0]}` };
}
function autoSession({ question, kind, target }) {
  const s = { lang: null, files: [] };
  const wantsEdit = !!target?.path && (kind !== "chat" || !!target.selection || /\b(fix|change|add|update|modify|improve|refactor|rename|remove|delete|edit|instead|make it|optimi[sz]e|clean up|comment)\b/i.test(question));
  const track = (w) => { s.files.push(w.path); return w; };
  return {
    block(fence) {
      const L = langForBlock(fence, question, target?.path);
      if (!L) return null;
      if (s.files.length) { // after the first block, only the other parts of a web page
        if (s.lang !== "web") return null;
        const file = L.part === "css" ? "style.css" : L.id === "javascript" ? "script.js" : null;
        if (!file || s.files.includes(file)) return null;
        return track(autoWriter(file, "file", null, s.note));
      }
      s.lang = L.id;
      const sameLang = target?.path && (runLangOf(target.path) === L.id || (L.id === "web" && /\.(html?|css|js)$/i.test(target.path)));
      if (wantsEdit && sameLang && project.files[target.path] != null) return track(autoWriter(target.path, target.selection ? "selection" : "file", target));
      // a new program: a new project (or the current one, if it is still empty)
      if (Object.keys(project.files).length) createProject({ name: uniqueProjectName(`${L.name} project`), files: {} });
      else if (project.name === EMPTY_PROJECT.name) { project.name = uniqueProjectName(`${L.name} project`); persistProject(); persistProject.flush(); renderProjectSelect(); }
      s.note = `In the project "${project.name}"`;
      const path = L.id === "web" && L.part !== "css" ? "index.html" : L.file;
      const w = track(autoWriter(path, "file", null, s.note));
      if (L.id === "web" || isRunnable(path)) { project.entry = path; persistProject(); updateRunTarget(); }
      return w;
    },
  };
}
/**
 * Repair two slips small models make in Python that are always syntax errors, so fixing them can never
 * break working code: a closing bracket with nothing open, and a line break inside a one-line string
 * (joined only when the next line closes that string).
 */
function repairPython(code) {
  let out = "", depth = 0, i = 0;
  const notes = [], n = code.length;
  const line = () => out.split("\n").length;
  while (i < n) {
    const c = code[i];
    if (c === "#") { const e = code.indexOf("\n", i); const end = e < 0 ? n : e; out += code.slice(i, end); i = end; continue; }
    if (c === '"' || c === "'") {
      const q = code.startsWith(c.repeat(3), i) ? c.repeat(3) : c;
      let j = i + q.length, str = q;
      while (j < n) {
        const d = code[j];
        if (d === "\\") { str += code.slice(j, j + 2); j += 2; continue; }
        if (code.startsWith(q, j)) { str += q; j += q.length; break; }
        if (d === "\n" && q.length === 1) {
          const nl = code.indexOf("\n", j + 1), next = code.slice(j + 1, nl < 0 ? n : nl);
          if (!next.includes(c)) break; // really unterminated: leave it for the model to fix
          notes.push(`joined a string split over two lines (line ${line()})`);
          let k = j + 1; while (code[k] === " " || code[k] === "\t") k++;
          if (!str.endsWith(" ")) str += " ";
          j = k; continue;
        }
        str += d; j++;
      }
      out += str; i = j; continue;
    }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      if (depth === 0) { notes.push(`removed an extra '${c}' (line ${line()})`); i++; continue; }
      depth--;
    }
    out += c; i++;
  }
  return { code: out, notes };
}

/**
 * JavaScript (and the scripts in a web page): undo slips the parser can prove are slips. At each syntax
 * error from the TypeScript parser, try removing a stray closing bracket or joining a string that was
 * split over two lines; keep a change only if the parser then finds fewer errors, or the first error
 * comes later in the file.
 */
let repairSeq = 0;
async function scriptErrors(code, ts) {
  const uri = monaco.Uri.from({ scheme: "file", path: `/__repair__/${++repairSeq}.${ts ? "ts" : "js"}` });
  const model = monaco.editor.createModel(code, ts ? "typescript" : "javascript", uri);
  try {
    const getWorker = ts ? monaco.languages.typescript.getTypeScriptWorker : monaco.languages.typescript.getJavaScriptWorker;
    const client = await (await getWorker())(uri);
    const diags = await client.getSyntacticDiagnostics(uri.toString());
    return diags.map((d) => ({ start: d.start, msg: typeof d.messageText === "string" ? d.messageText : d.messageText?.messageText || "" })).sort((a, b) => a.start - b.start);
  } finally { model.dispose(); }
}
/**
 * Closing brackets that look out of place, in file order: ones that close the wrong kind of bracket (or
 * nothing), and ones in the middle of a line that close a block opened on an earlier, less indented line
 * (like the second "}" in `const head = { x: 1 } };`, which ends the function early).
 */
function bracketSuspects(code) {
  const stack = [], out = [], n = code.length;
  const lineStart = (i) => code.lastIndexOf("\n", i - 1) + 1;
  const indent = (i) => { const s = lineStart(i); let k = s; while (code[k] === " " || code[k] === "\t") k++; return k - s; };
  const firstOnLine = (i) => !code.slice(lineStart(i), i).trim();
  let i = 0, prev = "";
  const template = () => { // template text up to the closing ` or the next ${
    while (i < n) {
      if (code[i] === "\\") { i += 2; continue; }
      if (code[i] === "`") { i++; prev = "`"; return; }
      if (code[i] === "$" && code[i + 1] === "{") { stack.push({ ch: "{", at: i + 1, tmpl: true }); i += 2; prev = "{"; return; }
      i++;
    }
  };
  while (i < n) {
    const c = code[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && code[i + 1] === "/") { const e = code.indexOf("\n", i); i = e < 0 ? n : e; continue; }
    if (c === "/" && code[i + 1] === "*") { const e = code.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === "'" || c === '"') { i++; while (i < n && code[i] !== c && code[i] !== "\n") i += code[i] === "\\" ? 2 : 1; i++; prev = c; continue; }
    if (c === "`") { i++; template(); continue; }
    if (c === "/" && (!prev || "(,=:[!&|?{};+-*%<>~^".includes(prev) || /\b(return|typeof|case|in|of|new|delete|void|throw)\s*$/.test(code.slice(Math.max(0, i - 10), i)))) { // a regex literal
      i++;
      let cls = false;
      while (i < n && code[i] !== "\n") { if (code[i] === "\\") { i += 2; continue; } if (code[i] === "[") cls = true; else if (code[i] === "]") cls = false; else if (code[i] === "/" && !cls) break; i++; }
      i++; while (/[a-z]/i.test(code[i] || "")) i++;
      prev = "/"; continue;
    }
    if ("([{".includes(c)) { stack.push({ ch: c, at: i }); prev = c; i++; continue; }
    if (")]}".includes(c)) {
      const top = stack.at(-1);
      if (!top || top.ch !== { ")": "(", "]": "[", "}": "{" }[c]) { out.push(i); prev = c; i++; continue; } // nothing, or the wrong kind, to close
      stack.pop();
      if (!firstOnLine(i) && lineStart(top.at) !== lineStart(i) && indent(i) > indent(top.at)) out.push(i);
      prev = c; i++;
      if (top.tmpl) template();
      continue;
    }
    prev = c; i++;
  }
  return out.sort((a, b) => a - b);
}
async function repairScript(code, ts = false) {
  const notes = [];
  const lineAt = (text, at) => text.slice(0, at).split("\n").length;
  let errs = await scriptErrors(code, ts);
  for (let round = 0; round < 25 && errs.length; round++) {
    const cut = (at) => { const from = code[at - 1] === " " && /[;,)\]}]/.test(code[at + 1] || "") ? at - 1 : at; return code.slice(0, from) + code.slice(at + 1); }; // "} ;" -> "};"
    const cands = bracketSuspects(code).slice(0, 12).map((at) => [cut(at), `removed an extra '${code[at]}' (line ${lineAt(code, at)})`]);
    const str = errs.find((e) => /Unterminated string literal/i.test(e.msg));
    if (str) { // "a\n b" -> "a b", when the next line closes the string
      const nl = code.indexOf("\n", str.start), q = code[str.start];
      const end2 = code.indexOf("\n", nl + 1), next = nl < 0 ? "" : code.slice(nl + 1, end2 < 0 ? code.length : end2);
      if (nl > 0 && `'"`.includes(q) && next.includes(q)) cands.unshift([code.slice(0, nl).replace(/[ \t]*$/, " ") + code.slice(nl + 1).replace(/^[ \t]+/, ""), `joined a string split over two lines (line ${lineAt(code, str.start)})`]);
    }
    let taken = null;
    for (const [cand, note] of cands) {
      const ce = await scriptErrors(cand, ts);
      if (ce.length < errs.length) { taken = [cand, note, ce]; break; }
    }
    if (!taken) break;
    [code] = taken; notes.push(taken[1]); errs = taken[2];
  }
  return { code, notes };
}
async function repairPage(html) {
  const notes = [];
  let out = "", last = 0;
  for (const m of html.matchAll(/(<script\b(?![^>]*\bsrc\s*=)[^>]*>)([\s\S]*?)(<\/script>)/gi)) {
    if (/type\s*=\s*["']?(?!module|text\/javascript|application\/javascript)[\w/+-]+/i.test(m[1])) continue; // not JavaScript (JSON, templates)
    const start = m.index + m[1].length;
    const r = await repairScript(m[2]);
    out += html.slice(last, start) + r.code;
    last = start + m[2].length;
    const offset = html.slice(0, start).split("\n").length - 1; // report lines in the whole page
    notes.push(...r.notes.map((n) => n.replace(/\(line (\d+)\)/, (_, l) => `(line ${+l + offset})`)));
  }
  return { code: out + html.slice(last), notes };
}

const autoTyping = new Set(); // files the Assistant is typing into right now (read-only meanwhile)
/** Types code into a file as it arrives. All of it is one undo step. */
function autoWriter(path, mode, target, note) {
  if (project.files[path] == null) createFile(path, "", { open: true });
  else if (project.active !== path) openFile(path);
  const model = ensureModel(path);
  const range = mode === "selection" && target?.range ? monaco.Range.lift(target.range) : model.getFullModelRange();
  const start = model.getOffsetAt(range.getStartPosition());
  let written = "";
  model.pushStackElement();
  model.pushEditOperations([], [{ range, text: "" }], () => null);
  // read-only while it types, so nothing else can land in the middle of the code
  autoTyping.add(path);
  if (editor.getModel() === model) editor.updateOptions({ readOnly: true });
  return {
    path, note, finished: false, runnable: isRunnable(path) || runLangOf(path) === "web",
    get lines() { return written ? written.split("\n").length : 0; },
    write(full) {
      if (full === written || model.isDisposed()) return;
      const end = model.getPositionAt(start + written.length);
      if (full.startsWith(written)) model.pushEditOperations([], [{ range: monaco.Range.fromPositions(end), text: full.slice(written.length) }], () => null);
      else model.pushEditOperations([], [{ range: monaco.Range.fromPositions(model.getPositionAt(start), end), text: full }], () => null);
      written = full;
      if (editor.getModel() === model) {
        const pos = model.getPositionAt(start + written.length);
        editor.setPosition(pos);
        editor.revealLineInCenterIfOutsideViewport(pos.lineNumber);
      }
    },
    async finish() {
      this.finished = true; // no more live writes; the file stays locked until the checks below are done
      if (model.isDisposed()) { autoTyping.delete(path); return; }
      // the file must hold exactly what the model wrote; if anything else changed it meanwhile, put that right
      if (mode === "file" && model.getValue().replace(/\n$/, "") !== written.replace(/\n$/, "")) model.pushEditOperations([], [{ range: model.getFullModelRange(), text: written }], () => null);
      // repair slips that the language's own parser shows are slips
      const notes = [];
      try {
        const lang = runLangOf(path);
        if (lang === "python" && written) {
          const quick = repairPython(written);
          let text = quick.code; notes.push(...quick.notes);
          if (lspReady) { const r = await lspCall("repair", [text]); if (r?.notes?.length) { text = r.code; notes.push(...r.notes); } }
          if (text !== written) this.write(text);
        } else if (written && (lang === "javascript" || lang === "typescript" || lang === "web") && mode === "file") {
          const r = lang === "web" ? await repairPage(written) : await repairScript(written, lang === "typescript");
          if (r.notes.length) { this.write(r.code); notes.push(...r.notes); }
        }
      } catch (_) { /* a repair is a bonus; never let it get in the way */ }
      this.repairs = notes;
      autoTyping.delete(path);
      if (editor.getModel() === model) editor.updateOptions({ readOnly: false });
      if (mode !== "selection" && written && !written.endsWith("\n")) model.pushEditOperations([], [{ range: monaco.Range.fromPositions(model.getPositionAt(start + written.length)), text: "\n" }], () => null);
      model.pushStackElement();
    },
  };
}

function askAssistant(kind) {
  setView("assistant");
  if (assistant?.ready) assistant.quick(kind);
  else toast("Start the Assistant first: pick a model and press Start. It is free and runs on your device.", "info", 5000);
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

/** The services a language runs on, in the order they are tried, for the consent text. */
function servicesOf(lang) {
  const list = [lang.ce && "godbolt.org", lang.judge0 && "ce.judge0.com", lang.wandbox && "wandbox.org"].filter(Boolean);
  return list.length > 1 ? `${list[0]}, with ${list.slice(1).join(" and ")} as a backup` : list[0];
}

async function runOnlineFile(path, lang) {
  if (!settings.onlineRunners) {
    const ok = await confirmDialog({
      title: `Run ${lang.name} online?`,
      message: `${lang.name} cannot run inside the browser. Dexna will send this file, and any input you type, to a public online compiler (${servicesOf(lang)}). Nothing else is sent, and your other languages keep running on your device. You can turn this off in Settings, under Languages.`,
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
    else if (res.ok) terminal.system(`Process finished${res.time ? ` in ${res.time.toFixed(res.time < 10 ? 3 : 1)}s` : ""} on ${res.provider}${res.fallback ? " (backup compiler)" : res.upgraded ? " (newer compiler: the code needed it)" : ""}`, "ok");
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

/* ---------- requirements.txt: its packages join the project's, and install like any other ---------- */
/** The installable lines of a requirements file: "name", "name==1.2", "name[extra]>=2"... */
function parseRequirements(text) {
  const out = [];
  for (let line of text.split("\n")) {
    line = line.replace(/(^|\s)#.*$/, "").trim();
    if (!line || line.startsWith("-") || /^[a-z][\w+.-]*:\/\//i.test(line) || line.includes(" @ ")) continue; // options, -r/-e, URLs and direct references
    line = line.split(";")[0].trim(); // environment markers
    if (/^[A-Za-z0-9][A-Za-z0-9._-]*(\[[^\]]*\])?\s*([<>=!~]=?.*)?$/.test(line)) out.push(line.replace(/\s+/g, ""));
  }
  return out;
}
const reqName = (spec) => normPy(spec.split(/[<>=!~[;\s]/)[0]);
let reqTimer = 0;
function syncRequirements({ announce = true } = {}) {
  const text = project?.files["requirements.txt"];
  if (text == null) return [];
  const add = parseRequirements(text).filter((spec) => !project.packages.some((p) => reqName(p) === reqName(spec)));
  if (!add.length) return [];
  project.packages.push(...add);
  persistProject();
  renderPackagesView();
  if (kernel?.info) ensurePackages().catch(() => {});
  if (announce) toast(`From requirements.txt: ${add.join(", ")}. ${kernel?.info ? "Installing now." : "They install when Python starts."}`, "info", 5000);
  return add;
}

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
  if (!pkgUI.picked) { // start on the tab for the language you are working in
    const lang = langOf(currentPath() || "");
    pkgUI.lang = { python: "python", javascript: "javascript", typescript: "javascript", lua: "lua", html: "web", css: "web", sql: "sql" }[lang] || pkgUI.lang;
  }
  const seg = h("div", { class: "seg pkg-tabs" }, [["python", "Python"], ["javascript", "JavaScript"], ...(pkgs?.tabs || [])].map(([id, label]) =>
    h("button", { class: pkgUI.lang === id ? "active" : "", onclick: () => { pkgUI.lang = id; pkgUI.picked = true; renderPackagesView(); } }, label)));
  const parts = [seg];
  if (pkgs?.tabs.some(([id]) => id === pkgUI.lang)) {
    parts.push(...pkgs.render(pkgUI.lang, { pkgCard, pkgSection, pkgInput }));
    parts.push(h("p", { class: "pkg-foot" }, "Online languages (C#, Java, C++ and the others) get only the file you run, with their standard library."));
    root.replaceChildren(...parts);
    root.scrollTop = scroll;
    return;
  }

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
  parts.push(h("p", { class: "pkg-foot" }, "Lua libraries, libraries for web pages and SQL sample databases are on their own tabs above."));
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
  const hidden = isExcluded();
  for (const path of Object.keys(project.files).sort()) {
    if (hidden(path)) continue;
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
  { key: "cursorStyle", cat: "Appearance", label: "Cursor style", desc: "How the text cursor is drawn.", type: "select", options: [["line", "Line"], ["block", "Block"], ["underline", "Underline"], ["line-thin", "Thin line"], ["block-outline", "Block outline"]] },
  { key: "smoothCaret", cat: "Appearance", label: "Smooth cursor and scrolling", desc: "Animate the cursor as it moves, and scroll smoothly.", type: "bool" },
  { key: "lineNumbers", cat: "Appearance", label: "Line numbers", desc: "Relative numbers count from the cursor line, which makes Vim motions like 5j easy.", type: "select", options: [["on", "On"], ["relative", "Relative"], ["interval", "Every 10 lines"], ["off", "Off"]] },
  { key: "changeMarkers", cat: "Appearance", label: "Change markers", desc: "Color bars next to the line numbers show lines added, changed or deleted since the last commit. Click one to see the changes.", type: "bool" },
  { key: "accentColor", cat: "Appearance", label: "Accent color", desc: "Use your own color for selections, buttons and highlights, with any theme.", type: "color" },
  { key: "uiFont", cat: "Appearance", label: "Interface font", desc: "The font for menus, panels and buttons. Fonts other than the built-in one load from Google Fonts the first time.", type: "select", options: UI_FONTS.map(([v, l]) => [v, l]) },
  { key: "editorFont", cat: "Appearance", label: "Code font", desc: "The font for the editor and the terminal. Fonts other than the built-in one load from Google Fonts the first time.", type: "select", options: CODE_FONTS.map(([v, l]) => [v, l]) },
  { key: "lineHeight", cat: "Appearance", label: "Line spacing", desc: "Space between lines of code.", type: "select", options: [[0, "Automatic"], [1.3, "Tight"], [1.5, "Comfortable"], [1.7, "Roomy"], [1.9, "Very roomy"]] },
  { key: "corners", cat: "Appearance", label: "Corners", desc: "How rounded buttons, dialogs, tabs and fields are.", type: "select", options: [["sharp", "Sharp"], ["default", "Slightly rounded"], ["round", "Rounded"]] },
  { key: "look", cat: "Background and effects", label: "Looks", desc: "One click sets a theme, a background and effects that go together. Change any part of it below.", type: "looks" },
  { key: "bgEffect", cat: "Background and effects", label: "Background", desc: "An animated background behind the editor and panels. It pauses when the tab is hidden, and stays still if your system asks for reduced motion.", type: "select", options: EFFECTS },
  { key: "bgSolid", cat: "Background and effects", label: "Solid color", desc: "Fill the background with one plain color. Pick one, or choose any color with the last button.", type: "swatches",
    swatches: [["#1e4fd8", "Blue"], ["#0f1f4a", "Navy"], ["#3a9ae8", "Sky blue"], ["#0f7a7a", "Teal"], ["#1f8a4a", "Green"], ["#12402a", "Forest green"], ["#c8282a", "Red"], ["#6a0f1f", "Crimson"],
      ["#e8701a", "Orange"], ["#e8c21a", "Yellow"], ["#6a2ad8", "Purple"], ["#e04a8a", "Pink"], ["#5a3a24", "Brown"], ["#4a4a52", "Grey"], ["#f4f4f4", "White"], ["#000000", "Black"]] },
  { key: "bgImage", cat: "Background and effects", label: "Background image", desc: "Use your own picture as the background. It is stored in this browser only.", type: "image" },
  { key: "bgIntensity", cat: "Background and effects", label: "Strength", desc: "How strongly the background shows.", type: "range", min: 10, max: 100, unit: "%" },
  { key: "bgSpeed", cat: "Background and effects", label: "Speed", desc: "How fast it moves. 0 keeps it still.", type: "range", min: 0, max: 100, unit: "" },
  { key: "glass", cat: "Background and effects", label: "Panel cover", desc: "How much the editor and panels cover the background. Lower shows more of it; higher keeps code easier to read.", type: "range", min: 40, max: 100, unit: "%" },
  { key: "glassBlur", cat: "Background and effects", label: "Frosted glass", desc: "Blur the background behind the side bar, panel and title bar.", type: "bool" },
  { key: "bgImageBlur", cat: "Background and effects", label: "Image blur", desc: "Soften your background image.", type: "range", min: 0, max: 40, unit: " px" },
  { key: "eventSounds", cat: "Background and effects", label: "Sounds for runs and saves", desc: "A short chime when a program finishes, a lower one when it fails, and a soft tick when you save.", type: "bool" },
  { key: "reduceMotion", cat: "Background and effects", label: "Reduce motion", desc: "Turn off animations and smooth scrolling everywhere, and keep the background still.", type: "bool" },
  { key: "typingSound", cat: "Background and effects", label: "Typing sounds", desc: "A soft sound for each key you press in the editor.", type: "select", options: [["off", "Off"], ["soft", "Soft clicks"], ["typewriter", "Typewriter"], ["bubble", "Bubbles"], ["keys", "Mechanical keyboard"]] },
  { key: "typingVolume", cat: "Background and effects", label: "Typing sound volume", desc: "How loud the typing sounds are.", type: "range", min: 5, max: 100, unit: "%" },
  { key: "cursorEffect", cat: "Background and effects", label: "Cursor effect", desc: "A glow around the text cursor, or sparks as you type.", type: "select", options: [["none", "None"], ["glow", "Glow"], ["sparks", "Sparks while typing"]] },
  { key: "colorSwatches", cat: "Appearance", label: "Color swatches", desc: "Show a small swatch next to colors written in code (#ff8800, rgb(...), hsl(...)) in every language. Click one to pick a new color.", type: "bool" },
  { key: "renderWhitespace", cat: "Appearance", label: "Render whitespace", desc: "When to draw dots and arrows for spaces and tabs.", type: "select", options: [["none", "Never"], ["selection", "In selection"], ["boundary", "At boundaries"], ["all", "Always"]] },
  { key: "pictureTheme", cat: "Extras", label: "Theme from a picture", desc: "Pick any picture (a wallpaper, a photo, album art) and Dexna makes a full color theme from its colors, checked to stay readable. It can use the picture as the background too.", type: "action", btn: "Choose a picture...", run: () => fx.themeFromPicture() },
  { key: "chroma", cat: "Extras", label: "Chroma accent", desc: "The accent color slowly travels around the color wheel, like a gaming keyboard.", type: "bool" },
  { key: "chromaSeconds", cat: "Extras", label: "Chroma speed", desc: "Seconds for one trip around the color wheel.", type: "select", options: [[8, "Fast (8 s)"], [20, "Normal (20 s)"], [60, "Slow (1 min)"], [300, "Very slow (5 min)"]] },
  { key: "codeGlow", cat: "Extras", label: "Neon code", desc: "Make the code glow in its own colors. Looks best with dark themes.", type: "select", options: [["off", "Off"], ["soft", "Soft glow"], ["neon", "Neon"]] },
  { key: "cursorTrail", cat: "Extras", label: "Smooth cursor trail", desc: "The cursor glides to where it goes and leaves a short smear, so you can follow jumps.", type: "bool" },
  { key: "screenFilter", cat: "Extras", label: "Screen filter", desc: "A filter over the whole app.", type: "select", options: [["none", "None"], ["crt", "Retro CRT monitor"], ["grain", "Film grain"], ["vignette", "Vignette"], ["night", "Night light (warmer colors)"]] },
  { key: "filterStrength", cat: "Extras", label: "Filter strength", desc: "How strong the screen filter is.", type: "range", min: 10, max: 100, unit: "%" },
  { key: "ambient", cat: "Extras", label: "Ambient sound", desc: "A calm background sound while you work, made in the browser. It starts after your first click on the page.", type: "select", options: [["off", "Off"], ["rain", "Rain"], ["waves", "Ocean waves"], ["fire", "Fireplace"], ["brown", "Brown noise"], ["hum", "Space hum"]] },
  { key: "ambientVolume", cat: "Extras", label: "Ambient volume", desc: "How loud the ambient sound is.", type: "range", min: 2, max: 100, unit: "%" },
  { key: "celebrate", cat: "Extras", label: "Confetti on success", desc: "Confetti bursts from the Run button when a program finishes without errors.", type: "bool" },
  { key: "focusMode", cat: "Extras", label: "Focus mode", desc: "Dim all the code except the part you are working on.", type: "select", options: [["off", "Off"], ["paragraph", "Dim all but the current block"], ["line", "Dim all but the current line"]] },
  { key: "typewriter", cat: "Extras", label: "Typewriter scrolling", desc: "Keep the line you are typing on in the middle of the screen.", type: "bool" },
  { key: "indentRainbow", cat: "Extras", label: "Rainbow indentation", desc: "Color each level of indentation, so nested code is easy to follow.", type: "bool" },
  { key: "timeTheme", cat: "Extras", label: "Day and night themes", desc: "Switch to your light theme in the day and your dark theme at night (the last ones you picked of each).", type: "bool" },
  { key: "dayStarts", cat: "Extras", label: "Day starts at", desc: "When the light theme comes on.", type: "select", options: [5, 6, 7, 8, 9, 10].map((n) => [n, `${n}:00`]) },
  { key: "nightStarts", cat: "Extras", label: "Night starts at", desc: "When the dark theme comes on.", type: "select", options: [16, 17, 18, 19, 20, 21, 22].map((n) => [n, `${n}:00`]) },
  { key: "autoSave", cat: "Files", label: "Auto save", desc: "When edits are saved to this browser. With \"Only with Ctrl+S\", tabs with unsaved edits show a dot and Dexna asks before you leave the page.", type: "select", options: [["delay", "As you type"], ["focus", "When you click away or switch windows"], ["off", "Only with Ctrl+S"]] },
  { key: "autoSaveDelay", cat: "Files", label: "Auto save delay", desc: "How long after you stop typing \"As you type\" saves.", type: "select", options: [[400, "Right away"], [1000, "1 second"], [3000, "3 seconds"], [10000, "10 seconds"]] },
  { key: "filesExclude", cat: "Files", label: "Hide files", desc: "Files and folders to hide from the Explorer, search and Go to File, one pattern per line. * matches within a name, ** across folders; a pattern without / matches anywhere (*.log, __pycache__, build/**).", type: "css" },
  { key: "explorerSort", cat: "Files", label: "Explorer sort order", desc: "How files are sorted in the Explorer (folders always come first).", type: "select", options: [["name", "By name"], ["type", "By type, then name"]] },
  { key: "confirmClose", cat: "Files", label: "Ask before closing the tab", desc: "Protect against an accidental Ctrl+W: the browser asks \"Leave site?\" before the Dexna tab closes or reloads, so you can cancel. Browsers do not let a page block Ctrl+W itself; in full screen (F11 or Zen mode), Ctrl+W closes the editor tab instead (see below).", type: "select", options: [["always", "Always"], ["unsaved", "Only with unsaved edits (auto save off)"]] },
  { key: "fullscreenCtrlW", cat: "Files", label: "Ctrl+W in full screen closes the editor tab", desc: "In full screen Dexna can take Ctrl+W from the browser, so it closes the file you are editing (like in VS Code) instead of the whole browser tab. Works in Chrome and Edge.", type: "bool" },
  { key: "toggleFullscreen", cat: "Files", label: "Full screen", desc: "Enter full screen now (Esc, held for a moment, leaves).", type: "action", btn: "Enter full screen", run: () => document.documentElement.requestFullscreen?.().catch(() => toast("The browser did not allow full screen.", "error")) },
  { key: "confirmDelete", cat: "Files", label: "Confirm before deleting", desc: "Ask before deleting a file or folder from the Explorer. Deleted files can be brought back from File > Local History either way.", type: "bool" },
  { key: "fileAssociations", cat: "Files", label: "File associations", desc: "Open files that match a pattern as a given language, for example *.mdx as Markdown or *.jsonc as JSON.", type: "assoc" },
  { key: "sidebarSide", cat: "Layout", label: "Side bar position", desc: "Put the side bar (Explorer, Search and the rest) on the left or the right. The activity bar moves with it.", type: "select", options: [["left", "Left"], ["right", "Right"]] },
  { key: "panelSide", cat: "Layout", label: "Panel position", desc: "Show the panel (Terminal, Shell, Problems and the rest) below the editor or beside it.", type: "select", options: [["bottom", "Bottom"], ["right", "Right"]] },
  { key: "density", cat: "Layout", label: "Spacing", desc: "How tightly menus, tabs, the file tree and the bars are packed.", type: "select", options: [["compact", "Compact"], ["normal", "Normal"], ["comfortable", "Roomy"]] },
  { key: "uiFontSize", cat: "Layout", label: "Interface text size", desc: "Text size of menus, panels and the side bar (the editor has its own size under Appearance).", type: "select", options: [[12, "Small"], [13, "Normal"], [14, "Large"], [15, "Larger"]] },
  { key: "fileIcons", cat: "Layout", label: "File icons", desc: "Colored badges for each file type, plain grey ones, or no badges.", type: "select", options: [["color", "Colorful"], ["simple", "Plain"], ["none", "None"]] },
  { key: "showActivityBar", cat: "Layout", label: "Activity bar", desc: "The column of icons at the edge. Hidden, the views are still in the View menu and their shortcuts work.", type: "bool" },
  { key: "activityHidden", cat: "Layout", label: "Activity bar icons", desc: "Untick the ones you do not use.", type: "checks" },
  { key: "showStatusBar", cat: "Layout", label: "Status bar", desc: "The bar at the bottom with the line number, language and run status.", type: "bool" },
  { key: "terminalFontSize", cat: "Layout", label: "Terminal text size", desc: "Text size in the Terminal, Shell and Python console.", type: "select", options: [[11, "11"], [12, "12"], [13, "13"], [14, "14"], [15, "15"], [16, "16"]] },
  { key: "showTabs", cat: "Layout", label: "Tab bar", desc: "The row of open files above the editor. Without it, switch files with Ctrl+P or the Explorer.", type: "bool" },
  { key: "tabStyle", cat: "Layout", label: "Tab style", desc: "How the open-file tabs look.", type: "select", options: [["classic", "Classic"], ["pills", "Pills"], ["underline", "Underline"], ["minimal", "Minimal"]] },
  { key: "tabClose", cat: "Layout", label: "Close button on tabs", desc: "When the x on a tab shows. Middle-click and Alt+W close tabs either way.", type: "select", options: [["hover", "On hover and on the open tab"], ["always", "Always"], ["never", "Never"]] },
  { key: "tabIcons", cat: "Layout", label: "File icons on tabs", desc: "Show the file-type icon on each tab.", type: "bool" },
  { key: "tabWrap", cat: "Layout", label: "Wrap tabs", desc: "Show every tab, on more than one row if needed, instead of scrolling sideways.", type: "bool" },
  { key: "showBreadcrumbs", cat: "Layout", label: "Breadcrumbs", desc: "The path and the current function shown above the code.", type: "bool" },
  { key: "runButtons", cat: "Layout", label: "Run and Debug buttons", desc: "Show the buttons in the title bar with their names, or as icons only.", type: "select", options: [["text", "Icon and name"], ["icons", "Icon only"]] },
  { key: "statusHidden", cat: "Layout", label: "Status bar items", desc: "Untick the ones you do not want in the status bar.", type: "checks", items: () => tweaks.statusItems() },
  { key: "clock", cat: "Layout", label: "Clock", desc: "A clock in the status bar.", type: "select", options: [["off", "Off"], ["24", "24-hour"], ["12", "12-hour"]] },
  { key: "greetingName", cat: "Layout", label: "Your name", desc: "Shown in a greeting on the Home page, like \"Good morning, Sam\". Leave it empty for no greeting. It stays in this browser.", type: "text" },
  { key: "customCss", cat: "Layout", label: "Your own CSS", desc: "Restyle anything. For example: #tabs { height: 30px } or .tab.active { font-weight: 600 }. Applied as you type; clear it to undo.", type: "css" },
  { key: "tabSize", cat: "Editor", label: "Indent size", desc: "Number of spaces a tab is worth.", type: "select", options: [[2, "2 spaces"], [4, "4 spaces"], [8, "8 spaces"]] },
  { key: "wordWrap", cat: "Editor", label: "Word wrap", desc: "Wrap long lines instead of scrolling sideways. Toggle with Alt+Z.", type: "bool" },
  { key: "langTabSize", cat: "Editor", label: "Indent size per language", desc: "Override the indent size for some languages, for example 2 spaces for web pages and JavaScript and 4 for Python.", type: "langmap" },
  { key: "centered", cat: "Editor", label: "Centered editor", desc: "Keep the code in a centered column on wide screens, with space on both sides.", type: "bool" },
  { key: "centeredWidth", cat: "Editor", label: "Centered width", desc: "How wide the centered column is.", type: "select", options: [[800, "Narrow"], [1000, "Medium"], [1200, "Wide"]] },
  { key: "cursorColor", cat: "Editor", label: "Cursor color", desc: "Your own color for the text cursor.", type: "color", fallback: () => effectiveTheme().c.accent },
  { key: "selectionColor", cat: "Editor", label: "Selection color", desc: "Your own color for selected text (drawn see-through).", type: "color", fallback: () => effectiveTheme().c.accent },
  { key: "inlayHints", cat: "Editor", label: "Inlay hints", desc: "Show parameter names and types inline in JavaScript and TypeScript code, in a faint font. \"While holding\" shows them only while you hold Ctrl+Alt.", type: "select", options: [["off", "Off"], ["on", "On"], ["hold", "While holding Ctrl+Alt"]] },
  { key: "inlayParams", cat: "Editor", label: "Inlay hints: parameter names", desc: "Which arguments get their parameter name shown.", type: "select", options: [["none", "None"], ["literals", "Only for literal values"], ["all", "All arguments"]] },
  { key: "inlayTypes", cat: "Editor", label: "Inlay hints: types", desc: "Show the types the compiler works out for variables, parameters and return values.", type: "bool" },
  { key: "useTabs", cat: "Editor", label: "Indent with tabs", desc: "Use tab characters instead of spaces when you indent.", type: "bool" },
  { key: "rulers", cat: "Editor", label: "Rulers", desc: "Thin vertical lines at a column, to keep lines short.", type: "select", options: [["none", "None"], ["80", "At 80"], ["100", "At 100"], ["120", "At 120"], ["80,120", "At 80 and 120"]] },
  { key: "errorLens", cat: "Editor", label: "Error Lens", desc: "Show each problem's message at the end of its line, so you see it without hovering.", type: "select", options: [["off", "Off"], ["errors", "Errors"], ["all", "Errors and warnings"]] },
  { key: "cursorBlinking", cat: "Editor", label: "Cursor blinking", desc: "How the text cursor blinks.", type: "select", options: [["smooth", "Smooth"], ["blink", "Blink"], ["phase", "Fade"], ["expand", "Expand"], ["solid", "Do not blink"]] },
  { key: "cursorWidth", cat: "Editor", label: "Cursor width", desc: "Thickness of the line cursor, in pixels.", type: "select", options: [[1, "1"], [2, "2"], [3, "3"], [4, "4"]] },
  { key: "lineHighlight", cat: "Editor", label: "Current line highlight", desc: "How the line with the cursor stands out.", type: "select", options: [["all", "Line and number"], ["line", "Line"], ["gutter", "Number only"], ["none", "None"]] },
  { key: "guides", cat: "Editor", label: "Guides", desc: "Faint lines that show indentation and which brackets belong together.", type: "select", options: [["both", "Indentation and brackets"], ["indent", "Indentation"], ["none", "None"]] },
  { key: "folding", cat: "Editor", label: "Code folding", desc: "Arrows next to the line numbers that fold blocks of code.", type: "bool" },
  { key: "minimapSide", cat: "Editor", label: "Minimap side", desc: "Which edge of the editor the minimap sits on.", type: "select", options: [["right", "Right"], ["left", "Left"]] },
  { key: "scrollbarSize", cat: "Editor", label: "Scroll bars", desc: "Thickness of the editor's scroll bars.", type: "select", options: [["thin", "Thin"], ["normal", "Normal"], ["thick", "Thick"]] },
  { key: "fontWeight", cat: "Editor", label: "Code font weight", desc: "How heavy the code font is.", type: "select", options: [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["600", "Semibold"]] },
  { key: "letterSpacing", cat: "Editor", label: "Letter spacing", desc: "Extra space between characters in the editor.", type: "select", options: [[0, "Normal"], [0.3, "A little"], [0.6, "More"], [1, "Wide"]] },
  { key: "autoClose", cat: "Editor", label: "Close brackets and quotes", desc: "Type the closing bracket or quote for you.", type: "select", options: [["languageDefined", "Yes"], ["beforeWhitespace", "Only before a space"], ["never", "Never"]] },
  { key: "suggestWhileTyping", cat: "Editor", label: "Suggest while typing", desc: "Show completions as you type. Off, they only appear with Ctrl+Space.", type: "bool" },
  { key: "acceptOnEnter", cat: "Editor", label: "Enter accepts a suggestion", desc: "Off, only Tab accepts it and Enter always starts a new line.", type: "bool" },
  { key: "hoverDelay", cat: "Editor", label: "Hover pop-ups", desc: "How soon the pop-up with docs and errors appears when you point at code.", type: "select", options: [[150, "Fast"], [300, "Normal"], [800, "Slow"], [0, "Off"]] },
  { key: "multiCursorKey", cat: "Editor", label: "Add a cursor with", desc: "Hold this key and click to add another cursor. The other one then opens links and definitions.", type: "select", options: [["alt", "Alt + click"], ["ctrlCmd", "Ctrl + click (Cmd on a Mac)"]] },
  { key: "trimOnSave", cat: "Editor", label: "Trim trailing spaces on save", desc: "Remove spaces at the ends of lines when you press Ctrl+S.", type: "bool" },
  { key: "finalNewline", cat: "Editor", label: "End files with a newline on save", desc: "Make sure the file ends with exactly one empty line when you press Ctrl+S.", type: "bool" },
  { key: "vimMode", cat: "Editor", label: "Vim keys", desc: "Edit with Vim key bindings: modes, motions, operators, registers, macros, and :w to save. The mode shows in the status bar.", type: "bool" },
  { key: "zenFullscreen", cat: "Editor", label: "Zen mode uses full screen", desc: "Also make the browser full screen in Zen mode (Ctrl+K Z).", type: "bool" },
  { key: "runOnSave", cat: "Editor", label: "Run on save", desc: "Run the file each time you press Ctrl+S.", type: "bool" },
  { key: "localHistory", cat: "Editor", label: "Local history", desc: "Keep earlier versions of every file automatically: when you start editing it, every few minutes while you type, when you save and before you delete it. File > Local History shows them. Stored in this browser.", type: "bool" },
  { key: "clipboardHistory", cat: "Editor", label: "Clipboard history", desc: "Remember the last 40 things you copied or cut in Dexna, for Paste from Clipboard History (Ctrl+Shift+Alt+V). Stored in this browser.", type: "bool" },
  { key: "formatOnSave", cat: "Editor", label: "Format on save and run", desc: "Format the file when you press Ctrl+S and before running it. Python uses black, Lua uses StyLua, SQL uses sql-formatter.", type: "bool" },
  { key: "onlineRunners", cat: "Languages", label: "Online runners", desc: "C#, Java, C, C++, Go, Rust, Kotlin, PHP, Ruby and other compiled languages cannot run in the browser, so Dexna sends the file and the input you type to a public online compiler (godbolt.org, ce.judge0.com or wandbox.org, depending on the language). Turn this off to keep everything on your device. Dexna asks the first time you run one.", type: "bool" },
  { key: "autoLint", cat: "Python", label: "Live linting", desc: "Check Python code with pyflakes as you type and underline problems.", type: "bool" },
  { key: "lineLength", cat: "Python", label: "Formatter line length", desc: "Maximum line length for black and isort. Lua and SQL formatting use it as a guide too.", type: "number", min: 40, max: 200 },
  { key: "autoInstall", cat: "Python", label: "Auto-install imports", desc: "When you run Python code, install missing packages from PyPI automatically.", type: "bool" },
  { key: "clearOnRun", cat: "Terminal", label: "Clear on run", desc: "Clear the terminal each time you run a program.", type: "bool" },
  { key: "inlineplots", cat: "Terminal", label: "Inline plots", desc: "Also show matplotlib figures inside the terminal, not just in the Plots tab.", type: "bool" },
];
const SETTING_CATS = ["Appearance", "Background and effects", "Extras", "Layout", "Editor", "Files", "Languages", "Python", "Terminal", "Data and privacy"];
const settingsUI = { query: "" };

const LOOK_KEYS = new Set(["bgEffect", "bgSolid", "bgIntensity", "bgSpeed", "glass", "glassBlur", "bgImageBlur", "cursorEffect", "corners", "uiFont", "editorFont"]);
/** Change a setting while a slider is being dragged: apply it, but do not redraw the settings page. */
function setSettingLive(key, value) {
  if (key in overriddenUser) { overriddenUser[key] = value; saveSettings(); return; }
  settings[key] = value;
  saveSettings();
  if (LOOK_KEYS.has(key)) look?.apply();
  tweaks?.onSetting(key);
  fx?.onSetting(key);
  joy?.onSetting(key);
  if (editor) editor.updateOptions(editorOptions());
}
function setSetting(key, value) {
  if (key in overriddenUser) { // this project decides; keep your value for other projects
    overriddenUser[key] = value; saveSettings();
    toast(`Saved. This project overrides "${key}" (Preferences: Open Project Settings).`, "info", 4000);
    if (settingsOpen) renderSettingsPage();
    return;
  }
  settings[key] = value;
  applySettingChange(key, value);
}
/** Apply one setting everywhere (it is already in `settings`), and save. */
function applySettingChange(key, value, { save = true } = {}) {
  if (LOOK_KEYS.has(key) || key === "theme") look?.apply();
  if (key === "theme" || key === "accentColor" || key === "bgEffect" || key === "cursorColor" || key === "selectionColor") applyTheme(); // also records the last dark / light theme
  if (save) saveSettings();
  if (editor) editor.updateOptions(editorOptions());
  if (key === "fileAssociations") for (const [path, m] of models) monaco.editor.setModelLanguage(m, langOf(path));
  if (key === "filesExclude" || key === "explorerSort") { renderTree(); if ($("#search-input")?.value) runSearch(); }
  if (key === "inlayHints" || key === "inlayParams" || key === "inlayTypes") applyInlayHints();
  if (key === "autoSave" && settings.autoSave !== "off") commitDirty();
  if (key === "tabSize" || key === "useTabs" || key === "langTabSize") for (const [path, m] of models) m.updateOptions({ tabSize: tabSizeFor(path), insertSpaces: !settings.useTabs });
  tweaks?.onSetting(key);
  fx?.onSetting(key);
  joy?.onSetting(key);
  if (key === "autoLint") lintAll();
  extras?.onSetting(key, value);
  power?.onSetting(key, value);
  pro?.onSetting(key);
  $("#sb-indent").textContent = `${settings.useTabs ? "Tab Size" : "Spaces"}: ${currentPath() ? tabSizeFor(currentPath()) : settings.tabSize}`;
  if (settingsOpen) renderSettingsPage();
}

/** Put this project's setting overrides in place (and take the previous project's away). */
function applyProjectSettings() {
  const changed = new Set(Object.keys(overriddenUser));
  for (const [k, v] of Object.entries(overriddenUser)) settings[k] = v;
  overriddenUser = {};
  for (const [k, v] of Object.entries(project?.settings || {})) {
    if (!PROJECT_KEYS.includes(k) || !(k in DEFAULT_SETTINGS)) continue;
    overriddenUser[k] = settings[k];
    settings[k] = v;
    changed.add(k);
  }
  for (const k of changed) applySettingChange(k, settings[k], { save: false });
  $("#sb-project-settings")?.classList.toggle("hidden", !Object.keys(overriddenUser).length);
}
function applyInlayHints() {
  if (!monaco) return;
  const opts = { includeInlayParameterNameHints: settings.inlayParams, includeInlayParameterNameHintsWhenArgumentMatchesName: false, includeInlayFunctionParameterTypeHints: !!settings.inlayTypes,
    includeInlayVariableTypeHints: !!settings.inlayTypes, includeInlayPropertyDeclarationTypeHints: !!settings.inlayTypes, includeInlayFunctionLikeReturnTypeHints: !!settings.inlayTypes, includeInlayEnumMemberValueHints: true };
  for (const d of [monaco.languages.typescript.typescriptDefaults, monaco.languages.typescript.javascriptDefaults]) d.setInlayHintsOptions?.(opts);
  // the TypeScript service does not re-check open files when these change: switch the hints off and on once it has the new options
  if (editor && settings.inlayHints !== "off") {
    editor.updateOptions({ inlayHints: { enabled: "off" } });
    clearTimeout(applyInlayHints.t);
    applyInlayHints.t = setTimeout(() => editor.updateOptions(editorOptions()), 700);
  }
}

function renderSettingsPage() {
  const root = $("#settings-page");
  if (!root.querySelector(".sp-head")) {
    const input = h("input", { class: "sp-search", placeholder: "Search settings", spellcheck: "false", value: settingsUI.query });
    input.addEventListener("input", () => { settingsUI.query = input.value; renderSettingsBody(); });
    root.append(h("div", { class: "sp-head" }, input, h("span", { class: "sp-count" }),
      h("button", { class: "btn sm", title: "Edit your settings as JSON", onclick: () => prefs.openUserJson() }, icon("code"), "settings.json"),
      h("button", { class: "btn sm", title: "Settings that apply to this project only", onclick: () => prefs.openProjectJson() }, icon("folder"), "Project settings"),
      h("button", { class: "btn sm", title: "Switch between sets of settings", onclick: () => prefs.pickProfile() }, icon("user"), "Profiles")), h("div", { class: "sp-body" }));
  }
  const input = root.querySelector(".sp-search");
  if (input.value !== settingsUI.query) input.value = settingsUI.query;
  renderSettingsBody();
}

function settingItem(sd) {
  const modified = sd.key in DEFAULT_SETTINGS && JSON.stringify(settings[sd.key]) !== JSON.stringify(DEFAULT_SETTINGS[sd.key]); // lists and maps compare by content
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
      h("div", { class: "theme-group" }, "Dark"), h("div", { class: "theme-grid" }, THEMES.filter((t) => t.type === "dark" && !t.custom).map(tile)),
      h("div", { class: "theme-group" }, "Light"), h("div", { class: "theme-grid" }, THEMES.filter((t) => t.type === "light" && !t.custom).map(tile)),
      h("div", { class: "theme-group" }, "Yours"), h("div", { class: "theme-grid" }, ...THEMES.filter((t) => t.custom).map((t) => { const el = tile(t); el.title = t.name + ". Double-click to edit"; el.ondblclick = () => more.editTheme(t); return el; }),
        h("button", { class: "theme-tile new", title: "Make your own theme, starting from the current one", onclick: () => cmdById("theme-new").run() }, h("span", { class: "tt-prev new" }, icon("plus")), h("span", { class: "tt-name" }, "New theme"))));
  } else if (sd.type === "looks") {
    control = h("div", { class: "look-grid" }, look.LOOKS.map((l) => look.lookCard(l)));
  } else if (sd.type === "swatches") {
    const cur = settings.bgEffect === "solid" ? (settings.bgSolid || "").toLowerCase() : null;
    const pick = (c) => { if (settings.bgEffect !== "solid") settings.bgIntensity = 100; settings.bgSolid = c; setSetting("bgEffect", "solid"); };
    control = h("div", { class: "si-swatches" }, sd.swatches.map(([c, name]) => h("button", { class: "si-swatch" + (cur === c ? " on" : ""), title: name, "aria-label": name, style: { background: c }, onclick: () => pick(c) })),
      h("label", { class: "si-swatch si-swatch-any" + (cur && !sd.swatches.some(([c]) => c === cur) ? " on" : ""), title: "Any color" }, h("input", { type: "color", "aria-label": "Any color", value: settings.bgSolid || "#1e4fd8", onchange: (e) => pick(e.target.value.toLowerCase()) })));
  } else if (sd.type === "range") {
    const out = h("span", { class: "si-range-val" }, settings[sd.key] + (sd.unit ?? ""));
    control = h("div", { class: "si-range" }, h("input", { type: "range", min: sd.min, max: sd.max, step: sd.step || 1, value: settings[sd.key],
      oninput: (e) => { out.textContent = e.target.value + (sd.unit ?? ""); setSettingLive(sd.key, +e.target.value); },
      onchange: (e) => setSettingLive(sd.key, +e.target.value) }), out); // no redraw, so the slider keeps focus
  } else if (sd.type === "color") {
    const v = settings[sd.key] || (sd.fallback ? sd.fallback() : effectiveTheme().c.accent);
    control = h("div", { class: "si-color" }, h("input", { type: "color", value: v, onchange: (e) => setSetting(sd.key, e.target.value) }),
      h("span", { class: "muted small" }, settings[sd.key] ? settings[sd.key] : "The theme's own"),
      settings[sd.key] ? h("button", { class: "btn sm", onclick: () => setSetting(sd.key, "") }, "Use the theme's") : null);
  } else if (sd.type === "checks") {
    const items = sd.items ? sd.items() : $$("#activitybar [data-view]").map((b) => [b.dataset.view, b.title || b.dataset.view]);
    control = h("div", { class: "si-checks" }, items.map(([id, label]) => h("label", { class: "si-check" },
      h("input", { type: "checkbox", checked: !(settings[sd.key] || []).includes(id), onchange: (e) => setSetting(sd.key, e.target.checked ? settings[sd.key].filter((x) => x !== id) : [...(settings[sd.key] || []), id]) }),
      h("span", {}, label.replace(/ \(.*\)$/, "")))));
  } else if (sd.type === "assoc") {
    const cur = Object.entries(settings[sd.key] || {});
    const langs = monaco ? monaco.languages.getLanguages().filter((l) => l.aliases?.length).map((l) => [l.id, l.aliases[0]]).sort((a, b) => a[1].localeCompare(b[1])) : [];
    const write = (rows) => setSetting(sd.key, Object.fromEntries(rows.filter(([g, l]) => g.trim() && l)));
    const rows = cur.map(([g, l], i) => h("div", { class: "si-assoc-row" },
      h("input", { value: g, spellcheck: "false", placeholder: "*.ext", onchange: (e) => { const r = [...cur]; r[i] = [e.target.value.trim(), l]; write(r); } }),
      h("span", { class: "muted" }, "opens as"),
      h("select", { onchange: (e) => { const r = [...cur]; r[i] = [g, e.target.value]; write(r); } }, langs.map(([id, name]) => h("option", { value: id, selected: id === l }, name))),
      h("button", { class: "btn icon sm", title: "Remove", onclick: () => write(cur.filter((_, j) => j !== i)) }, icon("close"))));
    const pat = h("input", { placeholder: "*.mdx", spellcheck: "false" });
    const lang = h("select", {}, langs.map(([id, name]) => h("option", { value: id, selected: id === "markdown" }, name)));
    control = h("div", { class: "si-assoc" }, rows, h("div", { class: "si-assoc-row" }, pat, h("span", { class: "muted" }, "opens as"), lang,
      h("button", { class: "btn sm", onclick: () => { if (pat.value.trim()) write([...cur, [pat.value.trim(), lang.value]]); } }, "Add")));
  } else if (sd.type === "action") {
    control = h("button", { class: "btn primary", onclick: sd.run }, sd.btn);
  } else if (sd.type === "text") {
    control = h("input", { class: "si-text", value: settings[sd.key] || "", maxlength: 40, spellcheck: "false", onchange: (e) => setSetting(sd.key, e.target.value.trim()) });
  } else if (sd.type === "langmap") {
    const LANGS = [["python", "Python"], ["javascript", "JavaScript"], ["typescript", "TypeScript"], ["html", "HTML"], ["css", "CSS"], ["json", "JSON"], ["markdown", "Markdown"], ["lua", "Lua"], ["sql", "SQL"], ["csharp", "C#"], ["java", "Java"], ["cpp", "C and C++"], ["go", "Go"], ["rust", "Rust"], ["yaml", "YAML"]];
    const cur = settings[sd.key] || {};
    control = h("div", { class: "si-langmap" }, LANGS.map(([id, label]) => h("label", {}, h("span", {}, label),
      h("select", { onchange: (e) => { const next = { ...(settings[sd.key] || {}) }; if (+e.target.value) next[id] = +e.target.value; else delete next[id]; if (id === "cpp") { if (+e.target.value) next.c = +e.target.value; else delete next.c; } setSetting(sd.key, next); } },
        [[0, "Default"], [2, "2"], [4, "4"], [8, "8"]].map(([v, l]) => h("option", { value: v, selected: (cur[id] || 0) == v }, l))))));
  } else if (sd.type === "css") {
    const ta = h("textarea", { class: "si-css", spellcheck: "false", rows: 6, placeholder: "/* your CSS */" });
    ta.value = settings[sd.key] || "";
    ta.addEventListener("input", debounce(() => setSettingLive(sd.key, ta.value), 300));
    control = ta;
  } else if (sd.type === "image") {
    const thumb = h("span", { class: "si-thumb" });
    look.imageThumb().then((u) => { if (u) thumb.style.backgroundImage = `url("${u}")`; else thumb.classList.add("empty"); });
    control = h("div", { class: "si-image" }, thumb, h("button", { class: "btn", onclick: () => look.chooseImage() }, "Choose image..."),
      h("button", { class: "btn", onclick: () => look.removeImage() }, "Remove"),
      h("span", { class: "si-or" }, "or"), h("button", { class: "btn", title: "A short video that loops (MP4 or WebM), played muted", onclick: () => look.chooseVideo() }, "Choose video..."),
      settings.bgEffect === "video" ? h("button", { class: "btn", onclick: () => look.removeVideo() }, "Remove video") : null);
  } else if (sd.type === "bool") {
    control = h("label", { class: "si-check" }, h("input", { type: "checkbox", checked: settings[sd.key], onchange: (e) => setSetting(sd.key, e.target.checked) }), h("span", {}, "Enabled"));
  } else if (sd.type === "select") {
    if (typeof sd.options === "function") sd = { ...sd, options: sd.options() };
    control = h("select", { onchange: (e) => setSetting(sd.key, typeof sd.options[0][0] === "number" ? +e.target.value : e.target.value) },
      sd.options.map(([v, l]) => h("option", { value: v, selected: settings[sd.key] == v }, l)));
  } else {
    control = h("input", { type: "number", min: sd.min, max: sd.max, value: settings[sd.key], onchange: (e) => setSetting(sd.key, Math.max(sd.min, Math.min(sd.max, +e.target.value || DEFAULT_SETTINGS[sd.key]))) });
  }
  return h("div", { class: "si" + (modified ? " modified" : ""), id: "si-" + sd.key },
    h("div", { class: "si-title" }, h("span", { class: "si-cat" }, sd.cat + ": "), h("span", {}, sd.label),
      modified ? h("button", { class: "si-reset", title: "Reset to default", onclick: () => setSetting(sd.key, DEFAULT_SETTINGS[sd.key]) }, "Reset") : null),
    h("div", { class: "si-desc" }, sd.desc),
    sd.key in overriddenUser ? h("div", { class: "si-override" }, icon("info"), "This project sets this to ", h("code", {}, JSON.stringify(settings[sd.key])), ". Your own value applies in other projects.", h("button", { class: "btn sm", onclick: () => prefs.openProjectJson() }, "Project settings")) : null,
    control);
}

function renderSettingsBody() {
  const root = $("#settings-page");
  const body = root.querySelector(".sp-body");
  const prev = body.querySelector(".sp-main")?.scrollTop || 0;
  const q = settingsUI.query.trim().toLowerCase();
  const match = (sd) => !q || `${sd.cat} ${sd.label} ${sd.desc} ${sd.key}`.toLowerCase().includes(q);
  const dataRows = [
    { title: "Keyboard shortcuts", desc: "See every shortcut Dexna offers.", btn: "Show", run: showShortcuts },
    { title: "Export settings", desc: "Download your settings, themes, shortcuts, snippets and looks as a file, to keep or to use on another device.", btn: "Export", run: () => tweaks.exportSettings() },
    { title: "Import settings", desc: "Load a file made with Export settings. Your projects are not touched.", btn: "Import...", run: () => tweaks.importSettings() },
    { title: "Settings Sync: save to GitHub", desc: "Keep your settings, themes, shortcuts and snippets in a secret gist on your GitHub account, to use on your other devices. Needs GitHub sign-in.", btn: "Upload", run: () => github.syncUpload() },
    { title: "Settings Sync: load from GitHub", desc: "Replace this browser's settings with the ones you saved to GitHub. Your projects are not touched.", btn: "Download...", run: () => github.syncDownload() },
    { title: "Reset all settings", desc: "Put every setting above back to its default.", btn: "Reset", run: () => { for (const k of Object.keys(DEFAULT_SETTINGS)) settings[k] = DEFAULT_SETTINGS[k]; LS.del("look"); setSetting("theme", settings.theme); toast("Settings reset", "ok"); } },
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
    const top = main.getBoundingClientRect().top;
    for (const sec of main.querySelectorAll(".sp-sec")) if (sec.getBoundingClientRect().top - top <= 48) cur = sec.id;
    navEl.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.sec === (cur || navEl.firstChild?.dataset?.sec)));
  });
  body.replaceChildren(navEl, main);
  // put the list back exactly where it was, without animating (changing a setting redraws it)
  main.scrollTo({ top: prev, behavior: "instant" });
  main.dispatchEvent(new Event("scroll"));
}

async function resetEverything() {
  if (!(await confirmDialog({ title: "Delete all local data", message: "This removes every project, setting and history entry stored by Dexna in this browser. Download anything you want to keep first.", okLabel: "Delete everything", danger: true }))) return;
  Object.keys(localStorage).filter((k) => k.startsWith("dexna:")).forEach((k) => localStorage.removeItem(k));
  try { indexedDB.deleteDatabase("dexna-scm"); indexedDB.deleteDatabase("dexna-history"); } catch (_) {}
  persistProject.flush = () => {};
  window.__dexnaReloading = true;
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
  if (layout.view === "packages" && layout.sidebar) { renderPackagesView(); if (!installedPkgs.length) refreshPackages(); }
  if (layout.view === "outline") renderOutline();
  if (layout.view === "assistant" && layout.sidebar) assistant?.show();
  if (layout.sidebar) extras?.onView(layout.view);
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
  else if (layout.panel === "shell") plus.exec("clear");
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
  if (layout.panelWidth) panel.style.width = layout.panelWidth + "px";
  drag($("#sidebar-resizer"), (e) => {
    const r = sb.getBoundingClientRect();
    layout.sidebarWidth = Math.max(170, Math.min(600, settings.sidebarSide === "right" ? r.right - e.clientX : e.clientX - r.left));
    sb.style.width = layout.sidebarWidth + "px";
  });
  drag($("#panel-resizer"), (e) => {
    const r = $("#workbench").getBoundingClientRect();
    if (settings.panelSide === "right") { layout.panelWidth = Math.max(220, Math.min(r.width - 240, r.right - e.clientX)); panel.style.width = layout.panelWidth + "px"; }
    else { layout.panelHeight = Math.max(90, Math.min(r.height - 120, r.bottom - e.clientY)); panel.style.height = layout.panelHeight + "px"; }
  });
}

/** Trim trailing spaces and/or end the file with one newline, as the settings ask (Markdown keeps its two-space line breaks). */
function tidyOnSave() {
  const m = editor?.getModel(), p = currentPath();
  if (!m || !p) return;
  let t = m.getValue();
  if (settings.trimOnSave) t = t.split("\n").map((l) => (/\.(md|markdown)$/i.test(p) && / {2}$/.test(l) && l.trim() ? l.replace(/\s+$/, "  ") : l.replace(/[ \t]+$/, ""))).join("\n");
  if (settings.finalNewline && t.length) t = t.replace(/\n*$/, "\n");
  if (t !== m.getValue()) applyText(m, t, "tidy");
}

const RUNNER_LOAD_ID = Date.now().toString(36); // a fresh runner on every page load, never a cached old one
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
  { id: "tab-reopen", label: "Reopen Closed Tab", cat: "View", kb: "alt+shift+t", run: () => {
    while (closedTabs.length) {
      const t = closedTabs.pop();
      if (t.project === project.id && (project.files[t.path] != null) && !project.open.includes(t.path)) { openFile(t.path); return; }
    }
    toast("No closed tabs to reopen", "info");
  } },
  { id: "duplicate-project", label: "Duplicate Project…", cat: "File", run: async () => {
    const name = await promptDialog({ title: "Duplicate project", message: "A copy of every file, binary files included, as a new project.", value: uniqueProjectName(`${project.name} copy`), okLabel: "Duplicate" });
    if (!name) return;
    commitDirty();
    const bins = Object.fromEntries([...assetBytes].map(([k, v]) => [k, v.slice()]));
    const src = project;
    createProject({ files: { ...src.files }, entry: src.entry, packages: [...(src.packages || [])], npm: { ...(src.npm || {}) }, stdin: { ...(src.stdin || {}) } }, name);
    for (const d of src.dirs || []) addDirs(d);
    if (Object.keys(bins).length) await addAssets(bins);
    persistProject(); renderTree();
    toast(`Made "${name}", a copy of "${src.name}"`, "ok");
  } },
  { id: "format-all", label: "Format All Files in the Project", cat: "Edit", run: formatAllFiles },
  { id: "md-toc", label: "Markdown: Insert or Update Table of Contents", cat: "Text", run: insertToc },
  { id: "req-install", label: "Python: Install Packages from requirements.txt", cat: "Run", run: () => { if (project.files["requirements.txt"] == null) return toast("This project has no requirements.txt", "info"); const add = syncRequirements(); if (!add.length) toast("Every package in requirements.txt is already in the project", "info"); } },
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
  { id: "assistant", label: "Show Assistant", cat: "Assistant", kb: "ctrl+alt+i", run: () => setView("assistant") },
  { id: "ai-explain", label: "Explain This Code", cat: "Assistant", run: () => askAssistant("explain") },
  { id: "ai-fix", label: "Find Bugs in This Code", cat: "Assistant", run: () => askAssistant("fix") },
  { id: "ai-error", label: "Explain the Last Error", cat: "Assistant", run: () => askAssistant("error") },
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
  { id: "fullscreen", label: "Toggle Full Screen (Ctrl+W closes editor tabs)", cat: "View", run: () => (document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.())?.catch?.(() => {}) },
];
const API = {
  h, $, icon, iconSvg, fileIconSvg, esc, debounce, toast, ago, LS, cfg, settings, layout,
  get monaco() { return monaco; }, get editor() { return editor; }, get project() { return project; }, models,
  openModal, closeModal: () => closeOverlay?.(), quickPick, confirmDialog, promptDialog, showMenu, quickOpen: (p) => quickOpen(p),
  openFile, textOf, langOf, langName, currentPath, modelFor: ensureModel, currentFiles: () => project?.files || {},
  writeFiles: (changes) => applyFileChanges(changes, { silent: true }), removeFiles, assetDataUrl, assetFiles: () => Object.fromEntries(assetBytes), addAssets: (m) => addAssets(m), persist: () => persistProject(),
  setView, showPanel, setSetting, setStatusFlash, downloadBlob, resolveRef, save: () => saveCommand(), closeActive: () => project.active && closeTab(project.active),
  previewFile, previewPath: () => web.path, postToPreview,
  showPreview, editorOptions, isRunnable, run: () => cmdById("run").run(),
  symbolsOf: (model) => (model.getLanguageId() === "python" ? (lspReady ? lspCall("symbols", [model.getValue()]) : Promise.resolve(null)) : langTools.symbols(model)),
  symIconHtml, fuzzy, highlight, kbLabel, comboOf: (e) => comboOf(e), normKb: (kb) => normKb(kb), commands: () => COMMANDS,
  setKeybinding: (id, kb) => setKeybinding(id, kb), currentThemeId: () => currentTheme().id,
  effectiveTheme: () => effectiveTheme(), themeExists: (id) => !!THEME_BY_ID[id], themeById: (id) => THEME_BY_ID[id],
  refreshEditorOptions: () => editor?.updateOptions(editorOptions()), rerenderSettings: () => settingsOpen && renderSettingsPage(),
  mkdir: (d) => { addDirs(d); persistProject(); renderTree(); }, rmdir: (d) => { project.dirs = project.dirs.filter((x) => x !== d && !x.startsWith(d + "/")); persistProject(); renderTree(); },
  canPreview: (p) => !!plus?.canPreview(p), movePath: (a, b) => movePath(a, b), runFile: (path) => runFile({ path }), createProject: (tpl, name) => createProject(tpl, name), refreshHome: () => homeOpen && renderHome(),
};
extras = createExtras(API);
COMMANDS.push(...extras.commands);
API.showDiff = extras.showDiff;
power = createPower(API);
COMMANDS.push(...power.commands);
more = createMore(API);
COMMANDS.push(...more.commands);
look = createLook(API);
COMMANDS.push(...look.commands);
plus = createPlus(API);
COMMANDS.push(...plus.commands);
API.rerenderFiles = () => { renderTree(); renderTabs(); if (homeOpen) renderHome(); };
API.flush = () => persistProject.flush();
API.refreshLook = () => look?.updateBackdrop();
API.applyTheme = () => applyTheme();
Object.defineProperty(API, "look", { get: () => look });
tweaks = createTweaks(API);
COMMANDS.push(...tweaks.commands);
fx = createFx(API);
COMMANDS.push(...fx.commands);
API.icon = icon;
joy = createJoy(API);
COMMANDS.push(...joy.commands);
Object.assign(API, { SETTINGS_SCHEMA, DEFAULT_SETTINGS, userSettings, applyProjectSettings, themes: () => THEMES });
prefs = createPrefs(API);
COMMANDS.push(...prefs.commands);
pkgs = createPkgs({ ...API, get project() { return project; }, get editor() { return editor; }, get monaco() { return monaco; }, rerender: () => renderPackagesView() });
API.runWith = (path, mode) => runFile({ path, mode });
API.runTests = runTests;
API.runTarget = () => getRunTarget();
API.terminalSystem = (text, cls) => terminal.system(text, cls);
devtools = createDevtools(API);
COMMANDS.push(...devtools.commands);
API.runCell = runNotebookCell;
API.stop = () => stopExecution();
API.restartKernel = async () => { if (!(await confirmDialog({ title: "Restart Python?", message: "Every variable is cleared, then all cells run again from the top.", okLabel: "Restart" }))) return false; await restartKernel(); return true; };
API.showAsText = (path) => { nbTextMode = path; openFile(path); };
API.textMode = (path) => nbTextMode === path;
notebook = createNotebook(API);
COMMANDS.push(...notebook.commands);
API.pathOfModel = pathOfModel;
pro = createPro(API);
COMMANDS.push(...pro.commands);
const github = createGitHub(API);
API.githubPanel = () => github.panel();
COMMANDS.push(...github.commands);
const offline = createOffline(API);
COMMANDS.push(...offline.commands);

const normKb = (kb) => { const parts = kb.split("+"); const key = parts.pop(); return ["ctrl", "alt", "shift"].filter((m) => parts.includes(m)).concat(key).join("+"); };
const keymap = new Map();
const kbOverrides = LS.get("keybindings", {}); // your own shortcuts: command id -> shortcut, or null for none
for (const c of COMMANDS) { c.defaultKb = c.kb; if (Object.hasOwn(kbOverrides, c.id) && (kbOverrides[c.id] === null || /^[a-z0-9+`=,\-\\[\];'./]+$/.test(kbOverrides[c.id]))) c.kb = kbOverrides[c.id] || undefined; }
function rebuildKeymap() {
  keymap.clear();
  for (const c of COMMANDS) if (c.kb && !c.kb.includes(" ")) keymap.set(normKb(c.kb), c);
}
rebuildKeymap();
function setKeybinding(id, kb) {
  const c = cmdById(id);
  if (!c) return;
  c.kb = kb || undefined;
  if ((c.kb || null) === (c.defaultKb || null)) delete kbOverrides[id]; else kbOverrides[id] = kb || null;
  LS.set("keybindings", kbOverrides);
  rebuildKeymap();
}
const cmdById = (id) => COMMANDS.find((c) => c.id === id);

function comboOf(e) {
  let k;
  if (e.code?.startsWith("Key")) k = e.code.slice(3).toLowerCase();
  else if (e.code?.startsWith("Digit")) k = e.code.slice(5);
  else if (e.code === "Backquote") k = "`";
  else if (e.code === "Equal") k = "=";
  else if (e.code === "Minus") k = "-";
  else if (e.code === "Comma") k = ",";
  else k = e.key.toLowerCase().replace(/^arrow/, ""); // ArrowLeft -> left, like the shortcut names
  if (k === "control" || k === "shift" || k === "alt" || k === "meta") return null;
  return [(e.ctrlKey || e.metaKey) && "ctrl", e.altKey && "alt", e.shiftKey && "shift", k].filter(Boolean).join("+");
}
// In full screen the page may claim keys the browser normally keeps (Keyboard Lock): Ctrl+W then closes the editor tab.
document.addEventListener("fullscreenchange", () => {
  if (!navigator.keyboard?.lock) return;
  if (document.fullscreenElement && settings.fullscreenCtrlW) navigator.keyboard.lock(["KeyW"]).catch(() => {});
  else navigator.keyboard.unlock?.();
});
window.addEventListener("keydown", (e) => {
  if (document.fullscreenElement && settings.fullscreenCtrlW && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === "KeyW") {
    e.preventDefault(); e.stopPropagation();
    if (!closeOverlay && project?.active) closeTab(project.active);
    return;
  }
  if (closeOverlay) return;
  const combo = comboOf(e);
  if (!combo) return;
  // a curses program has the keyboard: only Stop (Shift+F5) still goes to Dexna
  if (e.target.closest?.(".cur-screen") && combo !== "shift+f5") return;
  // notebook cells run with Shift/Ctrl/Alt+Enter themselves
  if (e.target.closest?.("#notebook") && ["shift+enter", "ctrl+enter", "alt+enter"].includes(combo)) return;
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
  if (settings.trimOnSave || settings.finalNewline) tidyOnSave();
  commitDirty();
  persistProject.flush();
  setStatusFlash(settings.runOnSave ? "Saved, running" : "Saved locally");
  tweaks?.onSaved();
  power?.onSave();
}

function quickOpen(prefix = "") {
  quickPick({
    placeholder: "Search files by name (> commands, : line, @ symbols, # symbols in every file, = calculator, ? help)",
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
      if (q.startsWith("=")) return extras.calcItems(q.slice(1));
      if (q.startsWith("#")) return more.symbolItems(q.slice(1).trim());
      if (q.startsWith("?")) return extras.helpItems((p) => quickOpen(p));
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
      const files = Object.keys(project.files).filter((f) => !isExcluded()(f));
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
  File: ["new-file", "new-folder", "new-project", "nb-new", "http-new", "examples", "-", "upload", "import-zip", "gh-open", "gh-gist-open", "download", "download-file", "share", "code-image", "tpl-save", "tpl-new", "-", "save", "close-tab", "-", "scm-commit", "scm-diff", "scm-history", "gh-pull", "gh-push", "gh-branch", "gh-pr", "gh-issues", "gh-publish", "gh-gist", "-", "lh-timeline", "lh-deleted", "-", "rename-project", "duplicate-project", "delete-project"],
  Edit: ["find", "replace", "find-files", "-", "format", "format-all", "organize", "comment", "rename-symbol", "-", "bm-toggle", "bm-next", "bm-prev", "-", "nav-back", "nav-forward", "nav-last-edit", "project-symbols", "-", "compare-file", "compare-clip", "-", "clip-paste", "snippet-insert", "snippet-save", "snippets", "-", "palette"],
  Text: extras.textMenu,
  Run: ["run", "debug", "debug-entry", "run-sel", "stop", "-", "run-settings", "run-coverage", "run-profile", "coverage-clear", "-", "tests-run-all", "tests-run-file", "tests-show", "-", "http-send", "-", "bp", "clear-bps", "-", "restart", "clear-term", "-", "run-on-save"],
  View: ["explorer", "find-files", "scm-view", "outline", "debug-view", "packages", "tools-view", "assistant", "-", "sidebar", "panel", "console", "shell", "notes", "problems", "error-lens", "todos", "bm-list", "-", "focus", "activity", "-", "layout-sidebar-side", "layout-panel-side", "layout-activitybar", "layout-statusbar", "-", "split", "md-preview", "zen", "stats", "-", "zoom-in", "zoom-out", "minimap", "wrap", "theme", "-", "look-pick", "bg-pick", "theme-new", "theme-picture", "theme-import", "-", "ambient-pick", "focus-mode", "typewriter"],
  Help: ["home", "language-guide", "shortcuts", "keys-change", "examples", "calc", "-", "settings-json", "project-settings", "profile-switch", "-", "app-install", "offline-info", "offline-clear", "-", "about"],
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
    ["Find and navigate", [["Find in file", "ctrl+f"], ["Replace in file", "ctrl+h"], ["Find next or previous", "f3 / shift+f3"], ...fromCommands(["Go", "View", "Source Control"])]],
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
    h("div", { class: "modal-foot" }, h("span", { class: "muted small", style: { marginRight: "auto" } }, "Ctrl is Cmd on a Mac. Ctrl+Shift+P opens every command."), h("button", { class: "btn", onclick: () => { closeOverlay(); cmdById("keys-change").run(); } }, "Change a shortcut..."), h("button", { class: "btn primary", onclick: () => closeOverlay() }, "Close"))));
  q.focus();
}

const GUIDE = [
  { id: "python", name: "Python", where: "device", notes: ["Run, debug with breakpoints, a console that shares your variables, a variable explorer and plots", "Completion, hover docs, go to definition, rename and live errors", "Format with black, sort imports with isort", "Install packages from PyPI in the Packages view"] },
  { id: "javascript", name: "JavaScript", where: "device", notes: ["ES modules across your files, top-level await, input() and a Node-style console", "Completion, hover, errors and rename from the TypeScript service; format; outline", "Import any npm package by name (loaded from esm.sh)"] },
  { id: "typescript", name: "TypeScript", where: "device", notes: ["Everything JavaScript has, plus live type checking", "Type errors never block a run"] },
  { id: "lua", name: "Lua", where: "device", notes: ["Lua 5.4 with require between your files and io.read for input", "Completion for the standard library and your own functions, hover docs, parameter hints", "Syntax errors as you type; format with StyLua"] },
  { id: "web", name: "HTML/CSS", where: "device", notes: ["Run shows the page beside the editor and updates it as you type; console output appears in the Terminal", "Your CSS and script files are linked in automatically; links between your pages work", "Emmet like in VS Code: ! then Tab for a new page, ul>li*3 then Tab, and so on", "Libraries from jsDelivr, unpkg or cdnjs load; localStorage works and is saved with the project"] },
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
    h("p", { class: "muted" }, "A new project starts with that language's preset, like Visual Studio and VS Code do. Every language also gets a few snippets: type the trigger, then press Tab. Ctrl+Space shows suggestions anywhere. Online languages also take input in a box before the run, because they cannot ask while running."));
  for (const [title, list] of groups) {
    body.append(h("h3", {}, title));
    if (title.startsWith("Online")) body.append(h("p", { class: "muted small" }, "Also online, each with its own starter (Home > More...): " + ONLINE_LANGS.filter((o) => !GUIDE.some((g) => g.id === o.id)).map((o) => o.name).join(", ") + "."));
    for (const g of list) {
      const snippets = (SNIPPETS[g.id] || MODES[g.id === "web" ? "html" : g.id]?.snippets || []).map((x) => x.label);
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
      h("p", {}, "Python, JavaScript, TypeScript, Lua, SQL and web pages (HTML/CSS) run on your device, and your projects are stored in this browser only. C#, Java, C, C++, Go, Rust and the other online languages send the file you run, plus any input you type, to a public compile service (godbolt.org, ce.judge0.com or wandbox.org). Dexna asks first, and you can turn it off in Settings. The Assistant runs its model on your device: it downloads the model once from huggingface.co, and your code and questions stay in this browser. Source Control commits, local history, snippets, clipboard history, bookmarks and Toolbox inputs never leave this browser either. The Markdown preview loads KaTeX and Mermaid from jsDelivr only when a file has math or diagrams; the text itself is rendered on your device. Interface and code fonts other than the built-in ones load from Google Fonts when you pick them. A background image you choose is stored in this browser only."),
      h("h3", {}, "Runtimes"),
      row("Python", `${kernelInfo?.version || "..."} (Pyodide ${kernelInfo?.pyodide || ""}, WebAssembly)`), row("JavaScript", "your browser, in a worker"), row("TypeScript", "the editor's compiler, then your browser"),
      row("Lua", "5.4 (wasmoon, WebAssembly)"), row("SQL", "SQLite (WebAssembly)"), row("HTML/CSS", "your browser, in a preview beside the editor"), row("Online", `${ONLINE_LANGS.length} languages`), row("Mode", kernel?.isolated ? "Full: input(), Stop and the debugger are available" : "Limited: reload the page to enable input() and the debugger"),
      h("h3", {}, "Built with"),
      h("p", { class: "muted" }, "Monaco editor, Pyodide, jedi, pyflakes, black, isort, wasmoon, SQLite, StyLua, sql-formatter, clang-format, gofmt, luaparse, Emmet (emmet-monaco-es), monaco-vim (Vim keys), KaTeX (math), Mermaid (diagrams), WebLLM with Qwen2.5-Coder (the Assistant), IBM Plex Sans and JetBrains Mono. Online runs use Judge0 CE, Compiler Explorer and Wandbox."),
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
  $("#sb-scm").onclick = () => setView("scm");
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
  window.addEventListener("beforeunload", (e) => {
    LS.set("layout", layout);
    if (window.__dexnaReloading) { commitDirty(); persistProject.flush(); return; } // Dexna reloading itself
    const unsaved = settings.autoSave === "off" && dirty.size;
    // Ctrl+W, the tab's x or quitting: the browser asks "Leave site?" so an accidental close can be cancelled
    if (unsaved || settings.confirmClose === "always") { e.preventDefault(); e.returnValue = ""; }
    if (!unsaved) commitDirty();
    persistProject.flush();
  });
  // "when focus leaves": save as soon as you click away from the editor or switch windows
  const saveOnBlur = () => { if (settings.autoSave === "focus") commitDirty(); };
  window.addEventListener("blur", saveOnBlur);
  document.addEventListener("visibilitychange", () => { if (document.hidden && settings.autoSave !== "off") commitDirty(); });
  document.addEventListener("contextmenu", (e) => { if (e.target.closest("#titlebar, #activitybar, #statusbar")) e.preventDefault(); });
}

async function boot() {
  const splash = $("#splash");
  look.apply();
  tweaks.apply();
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
  editor.onDidBlurEditorText(() => { if (settings.autoSave === "focus") commitDirty(); }); // auto save when focus leaves the editor
  organizeImportsCommand = editor.addCommand(0, () => organizeImports());
  registerProviders();
  configureTypeScript();
  langTools = registerLanguageTools(monaco, { libs: cfg.libs, getSettings: () => settings, minimalEdit, toast });
  // Monaco cancels a pending suggestion or hover request when the text changes under it; like VS Code, ignore that
  window.addEventListener("unhandledrejection", (e) => { if (e.reason?.name === "Canceled" || e.reason?.message === "Canceled") e.preventDefault(); });
  registerLanguageModes(monaco);
  pro.onEditorReady(); // registers .http before any file is opened
  setupAssistant();
  if (layout.view === "assistant" && layout.sidebar) assistant.show(); // it was the open view when the page was left
  extras.onEditorReady();
  look.onEditorReady();
  tweaks.onEditorReady();
  fx.onEditorReady();
  joy.onEditorReady();
  applyInlayHints();
  prefs.updateStatus();
  power.onEditorReady();
  more.onEditorReady();
  plus.onReady();
  tweaks.apply(); // again, now that every status bar item exists
  for (const id of ["html", "css"]) monaco.languages.onLanguage(id, () => loadEmmet(monaco, cfg.libs.emmet)); // Emmet, like VS Code
  editor.onDidChangeModelContent(() => { schedulePreview(); updateWordCount(); });
  editor.onDidChangeModel(() => { updateWordCount(); updateEol(); });
  setupPreview();
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
  github.fromUrl(); // ?github=owner/repo links

  if ("serviceWorker" in navigator && !self.crossOriginIsolated && location.protocol === "https:") {
    setTimeout(() => toast("Running in limited mode (no input() or debugger). Reload the page to enable full mode.", "warn", 7000), 4000);
  }
}

// Handy for power users and automated tests: window.dexna.lsp("complete", [...])
window.dexna = {
  github,
  referenceTo: (from, to) => referenceTo(from, to),
  removeFiles: (files) => removeFiles(files),
  fx: () => fx,
  lsp: (method, args) => lspCall(method, args),
  kernel: () => kernel,
  project: () => project,
  run: runFile,
  repl: replExec,
  toggleBreakpoint,
  setSetting,
};

boot();
