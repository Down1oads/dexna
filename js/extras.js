// Extra workbench features: the diff viewer, change markers, bookmarks, TODOs, text commands, code images,
// Zen mode, Vim keys, the quick-open calculator, project statistics and the Markdown preview.
import { changeMarkers } from "./diff.js";
import { renderMarkdown, markdownCss } from "./markdown.js";
import { createScm } from "./scm.js";
import { createToolbox, CASES } from "./toolbox.js";

/* =====================================================================
 * Calculator (quick open "=")
 * ===================================================================== */
const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
  ln: Math.log, log: (x, b) => (b === undefined ? Math.log10(x) : Math.log(x) / Math.log(b)), log2: Math.log2, log10: Math.log10,
  floor: Math.floor, ceil: Math.ceil, round: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d, trunc: Math.trunc, sign: Math.sign,
  min: Math.min, max: Math.max, pow: Math.pow, hypot: Math.hypot, deg: (x) => (x * 180) / Math.PI, rad: (x) => (x * Math.PI) / 180,
  avg: (...a) => a.reduce((s, x) => s + x, 0) / a.length, sum: (...a) => a.reduce((s, x) => s + x, 0),
  gcd: (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; },
  lcm: (a, b) => Math.abs(a * b) / FUNCS.gcd(a, b), fact: (n) => factorial(n), random: () => Math.random(),
};
const CONSTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2, phi: (1 + Math.sqrt(5)) / 2, inf: Infinity };
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw new Error("factorial needs a whole number");
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
}
export function calculate(src) {
  const toks = [];
  const re = /\s*(?:(0x[0-9a-f_]+|0b[01_]+|0o[0-7_]+|(?:\d[\d_]*\.?\d*|\.\d+)(?:e[+-]?\d+)?)|([a-z_]\w*)|(\*\*|[-+*/%^(),!]|×|÷))/giy;
  let m, pos = 0;
  const s = src.trim();
  while (pos < s.length) {
    re.lastIndex = pos;
    m = re.exec(s);
    if (!m) throw new Error(`Unexpected "${s[pos]}"`);
    pos = re.lastIndex;
    if (m[1]) { const t = m[1].replace(/_/g, "").toLowerCase(); toks.push({ n: /^0[xbo]/.test(t) ? Number(t) : parseFloat(t) }); }
    else if (m[2]) toks.push({ id: m[2].toLowerCase() });
    else toks.push({ op: m[3] === "×" ? "*" : m[3] === "÷" ? "/" : m[3] === "^" ? "**" : m[3] });
  }
  let i = 0;
  const peek = () => toks[i], eat = (op) => (toks[i]?.op === op ? (i++, true) : false);
  const expr = () => { let v = term(); for (;;) { if (eat("+")) v += term(); else if (eat("-")) v -= term(); else return v; } };
  const term = () => {
    let v = unary();
    for (;;) {
      if (eat("*")) v *= unary(); else if (eat("/")) v /= unary(); else if (eat("%")) v %= unary();
      else if (peek() && (peek().id || peek().op === "(")) v *= unary(); // 2pi, 3(4+1)
      else return v;
    }
  };
  const unary = () => (eat("-") ? -unary() : eat("+") ? unary() : power());
  const power = () => { const b = postfix(); return eat("**") ? b ** unary() : b; };
  const postfix = () => { let v = atom(); while (eat("!")) v = factorial(v); return v; };
  const atom = () => {
    const t = toks[i++];
    if (!t) throw new Error("The expression ends too early");
    if (t.n !== undefined) return t.n;
    if (t.op === "(") { const v = expr(); if (!eat(")")) throw new Error("Missing )"); return v; }
    if (t.id) {
      if (t.id in CONSTS && toks[i]?.op !== "(") return CONSTS[t.id];
      const f = FUNCS[t.id];
      if (!f) throw new Error(`Unknown name "${t.id}"`);
      const args = [];
      if (eat("(")) { if (!eat(")")) { do args.push(expr()); while (eat(",")); if (!eat(")")) throw new Error("Missing )"); } }
      else args.push(postfix());
      return f(...args);
    }
    throw new Error(`Unexpected "${t.op}"`);
  };
  const v = expr();
  if (i < toks.length) throw new Error(`Unexpected "${toks[i].op ?? toks[i].id ?? toks[i].n}"`);
  return v;
}
export function formatNumber(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return "not a number";
  if (!Number.isFinite(v)) return v > 0 ? "infinity" : "-infinity";
  if (Number.isInteger(v) && Math.abs(v) < 1e21) return String(v);
  return String(+v.toPrecision(12));
}

/* =====================================================================
 * Line comment styles, for statistics
 * ===================================================================== */
const LINE_COMMENT = { python: "#", ruby: "#", shell: "#", perl: "#", r: "#", yaml: "#", elixir: "#", julia: "#", nim: "#", crystal: "#", powershell: "#", raku: "#", mojo: "#",
  lua: "--", sql: "--", haskell: "--", ada: "--", elm: "--", vhdl: "--", "commonlisp": ";", clojure: ";", scheme: ";", nasm: ";", asm: ";", erlang: "%", prolog: "%", octave: "%", matlab: "%", latex: "%", fortran: "!", vb: "'", basic: "'", freebasic: "'" };
const NO_LINE = new Set(["html", "css", "markdown", "json", "xml", "plaintext"]);

/**
 * @param A the app's internals: see app.js where createExtras is called
 */
export function createExtras(A) {
  const { h, icon, toast } = A;
  const ed = () => A.editor;

  /* =====================================================================
   * Diff viewer
   * ===================================================================== */
  function showDiff({ original, modified, language, path, live = false, title, originalLabel = "Before", modifiedLabel = "After", actions = [] }) {
    const monaco = A.monaco;
    const lang = language || (path ? A.langOf(path) : "plaintext");
    const host = h("div", { class: "diff-host" });
    const count = h("span", { class: "muted small diff-count" });
    let inline = A.LS.get("diffInline", false);
    const toggle = h("button", { class: "btn sm", title: "Switch between side by side and inline" }, inline ? "Side by side" : "Inline");
    const temp = [];
    const origModel = monaco.editor.createModel(original ?? "", lang);
    temp.push(origModel);
    let modModel = live && path ? A.modelFor(path) : null;
    if (!modModel) { modModel = monaco.editor.createModel(modified ?? "", lang); temp.push(modModel); }
    let diff = null;
    const node = h("div", { class: "modal diff-modal" },
      h("div", { class: "modal-head diff-head" },
        h("span", { class: "diff-title" }, icon("diff"), title || path || "Compare"),
        count,
        h("span", { class: "diff-acts" },
          h("button", { class: "btn icon sm", title: "Previous change", onclick: () => diff?.goToDiff?.("previous") }, icon("stepOut")),
          h("button", { class: "btn icon sm", title: "Next change", onclick: () => diff?.goToDiff?.("next") }, icon("stepInto")),
          toggle,
          path && live ? h("button", { class: "btn sm", onclick: () => { A.closeModal(); A.openFile(path); } }, "Open file") : null,
          ...actions.map((a) => h("button", { class: "btn sm" + (a.primary ? " primary" : ""), onclick: a.run }, a.label)),
          h("button", { class: "btn icon sm", title: "Close (Esc)", onclick: () => A.closeModal() }, icon("close")))),
      h("div", { class: "diff-labels" }, h("span", {}, originalLabel), h("span", { class: "r" }, modifiedLabel)),
      host);
    A.openModal(node, () => { diff?.dispose(); temp.forEach((m) => m.dispose()); });
    diff = monaco.editor.createDiffEditor(host, {
      automaticLayout: true, readOnly: !live, originalEditable: false, renderSideBySide: !inline, fontSize: A.settings.fontSize,
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue("--mono"), fontLigatures: A.settings.fontLigatures,
      minimap: { enabled: false }, scrollBeyondLastLine: false, renderOverviewRuler: true, ignoreTrimWhitespace: false,
      hideUnchangedRegions: { enabled: true, contextLineCount: 3, minimumLineCount: 4 }, useInlineViewWhenSpaceIsLimited: true, renderGutterMenu: false,
    });
    diff.setModel({ original: origModel, modified: modModel });
    node.querySelector(".diff-labels").classList.toggle("inline", inline);
    toggle.onclick = () => {
      inline = !inline; A.LS.set("diffInline", inline);
      diff.updateOptions({ renderSideBySide: !inline });
      toggle.textContent = inline ? "Side by side" : "Inline";
      node.querySelector(".diff-labels").classList.toggle("inline", inline);
    };
    const upd = () => { const n = diff.getLineChanges()?.length ?? 0; count.textContent = n ? `${n} change${n === 1 ? "" : "s"}` : "No differences"; };
    diff.onDidUpdateDiff(upd);
    setTimeout(() => { diff.layout(); diff.getModifiedEditor().focus(); }, 30);
    return diff;
  }

  function compareWith(path = A.currentPath()) {
    if (!path) return toast("Open a file first.", "warn");
    const others = Object.keys(A.project.files).filter((p) => p !== path);
    if (!others.length) return toast("There is no other file to compare with.", "info");
    A.quickPick({
      placeholder: `Compare ${path} with...`,
      source: (q) => others.filter((p) => p.toLowerCase().includes(q.toLowerCase())).map((p) => ({ iconHtml: A.fileIconSvg(p), label: p,
        run: () => showDiff({ original: A.textOf(p), modified: A.textOf(path), path, live: true, language: A.langOf(path), title: `${p} ↔ ${path}`, originalLabel: p, modifiedLabel: path }) })),
    });
  }
  function compareClipboard() {
    const path = A.currentPath();
    if (!path) return toast("Open a file first.", "warn");
    navigator.clipboard?.readText?.().then((clip) => showDiff({ original: clip, modified: A.textOf(path), path, live: true, title: `Clipboard ↔ ${path}`, originalLabel: "Clipboard", modifiedLabel: path }),
      () => toast("The browser did not allow reading the clipboard.", "error"));
  }

  /* =====================================================================
   * Source Control
   * ===================================================================== */
  const scmRoot = document.getElementById("scm-root");
  const scm = createScm(scmRoot, {
    h, icon, toast, esc: A.esc, ago: A.ago, fileIconSvg: A.fileIconSvg,
    confirmDialog: A.confirmDialog, quickPick: A.quickPick, showMenu: A.showMenu,
    getProject: () => A.project, currentFiles: A.currentFiles, writeFiles: A.writeFiles, removeFiles: A.removeFiles,
    openFile: A.openFile, showDiff, persist: A.persist, onChange: () => { updateScmBadge(); scheduleMarkers(); },
    topPanel: () => A.githubPanel?.(),
  });
  document.addEventListener("dexna:github", () => { if (A.layout.view === "scm" && A.layout.sidebar) scm.render(); });
  function updateScmBadge() {
    const n = scm.head ? scm.changes().length : 0; // before the first commit, every file would count: no badge then
    const b = document.querySelector('#activitybar [data-view="scm"] .ab-badge');
    if (b) { b.textContent = n > 99 ? "99+" : n || ""; b.classList.toggle("hidden", !n); }
    const sb = document.getElementById("sb-scm");
    if (sb) {
      sb.innerHTML = `${A.iconSvg("branch")}<span>${scm.head ? (n ? `${n} change${n === 1 ? "" : "s"}` : "Committed") : "No commits"}</span>`;
      sb.title = scm.head ? `Last commit: ${scm.head.message} (${A.ago(scm.head.time)}). Click for Source Control.` : "Source Control: commit to save a snapshot of the project.";
    }
  }
  const refreshScm = A.debounce(() => { if (A.layout.view === "scm" && A.layout.sidebar) scm.render(); updateScmBadge(); }, 300);

  /* ---------- change markers in the gutter ---------- */
  let markerDecos = null;
  function updateMarkers() {
    const editor = ed();
    if (!editor) return;
    markerDecos ||= editor.createDecorationsCollection();
    const path = A.currentPath();
    const base = path ? scm.baseText(path) : undefined;
    if (!path || base === undefined || !A.settings.changeMarkers) { markerDecos.clear(); return; }
    const mk = changeMarkers(base, editor.getModel().getValue());
    const m = A.monaco, decos = [];
    const add = (lines, cls, color) => { for (const ln of lines) decos.push({ range: new m.Range(ln, 1, ln, 1), options: { isWholeLine: true, linesDecorationsClassName: "scm-mk " + cls, overviewRuler: { color, position: m.editor.OverviewRulerLane.Left }, minimap: { color, position: m.editor.MinimapPosition.Gutter } } }); };
    add(mk.added, "scm-added", "#3aa57a99"); add(mk.modified, "scm-modified", "#4f8cf099"); add(mk.deleted, "scm-deleted", "#d0524a99");
    markerDecos.set(decos);
  }
  const scheduleMarkers = A.debounce(updateMarkers, 200);

  /* =====================================================================
   * Bookmarks
   * ===================================================================== */
  const bmDecos = new Map(); // path -> decoration ids
  const bookmarks = () => (A.project.bookmarks ||= {});
  function renderBookmarkDecos(path) {
    const model = A.models.get(path);
    if (!model) return;
    const m = A.monaco;
    const lines = (bookmarks()[path] || []).filter((l) => l <= model.getLineCount());
    const lane = m.editor.GlyphMarginLane ? { position: m.editor.GlyphMarginLane.Right } : undefined;
    const ids = model.deltaDecorations(bmDecos.get(path) || [], lines.map((ln) => ({
      range: new m.Range(ln, 1, ln, 1),
      options: { isWholeLine: true, glyphMarginClassName: "dx-bookmark", glyphMarginHoverMessage: { value: "Bookmark (Ctrl+Alt+K toggles)" }, glyphMargin: lane, stickiness: m.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges, overviewRuler: { color: "#4f8cf0", position: m.editor.OverviewRulerLane.Center } },
    })));
    bmDecos.set(path, ids);
  }
  function syncBookmarks(path) {
    const model = A.models.get(path), ids = bmDecos.get(path);
    if (!model || !ids?.length) return;
    const lines = [...new Set(ids.map((id) => model.getDecorationRange(id)?.startLineNumber).filter(Boolean))].sort((a, b) => a - b);
    const prev = bookmarks()[path] || [];
    if (lines.join() !== prev.join()) { bookmarks()[path] = lines; A.persist(); renderBookmarkList(); }
  }
  function toggleBookmark(path = A.currentPath(), line = ed()?.getPosition()?.lineNumber) {
    if (!path || !line) return;
    const list = new Set(bookmarks()[path] || []);
    if (list.has(line)) list.delete(line); else list.add(line);
    if (list.size) bookmarks()[path] = [...list].sort((a, b) => a - b); else delete bookmarks()[path];
    A.persist();
    renderBookmarkDecos(path);
    renderBookmarkList();
    A.setStatusFlash(list.has(line) ? `Bookmark added on line ${line}` : `Bookmark removed from line ${line}`);
  }
  function allBookmarks() {
    const out = [];
    for (const p of Object.keys(bookmarks()).sort()) if (A.project.files[p] != null) for (const l of bookmarks()[p]) out.push({ path: p, line: l });
    return out;
  }
  function jumpBookmark(dir) {
    const all = allBookmarks();
    if (!all.length) return toast("No bookmarks yet. Ctrl+Alt+K adds one on the current line.", "info");
    const path = A.currentPath(), line = ed()?.getPosition()?.lineNumber || 0;
    const key = (b) => [b.path, b.line];
    const cmp = (a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] < b[0] ? -1 : 1);
    const here = [path || "", line];
    const next = dir > 0 ? all.find((b) => cmp(key(b), here) > 0) || all[0] : [...all].reverse().find((b) => cmp(key(b), here) < 0) || all.at(-1);
    A.openFile(next.path, { line: next.line });
  }
  function clearBookmarks() {
    for (const p of Object.keys(bookmarks())) { delete bookmarks()[p]; renderBookmarkDecos(p); }
    A.persist(); renderBookmarkList();
  }
  function renderBookmarkList() {
    const root = document.getElementById("bookmarks");
    if (!root || !A.project) return;
    const all = allBookmarks();
    const badge = document.getElementById("bookmarks-badge");
    if (badge) badge.textContent = all.length || "";
    if (!all.length) { root.replaceChildren(h("div", { class: "empty" }, "No bookmarks. Press Ctrl+Alt+K on a line to bookmark it; Ctrl+Alt+L and Ctrl+Alt+J jump between them.")); return; }
    const groups = {};
    for (const b of all) (groups[b.path] ||= []).push(b);
    root.replaceChildren(h("div", { class: "list-tools" }, h("button", { class: "btn sm", onclick: clearBookmarks }, "Remove all")),
      ...Object.entries(groups).map(([p, list]) => h("div", { class: "group" },
        h("div", { class: "row file-row" }, h("span", { class: "fi", html: A.fileIconSvg(p) }), h("span", {}, p), h("span", { class: "count" }, list.length)),
        list.map((b) => h("div", { class: "row item", onclick: () => A.openFile(b.path, { line: b.line }) }, A.icon("bookmark"),
          h("span", { class: "ln" }, b.line), h("span", { class: "msg code" }, (A.textOf(b.path).split("\n")[b.line - 1] || "").trim().slice(0, 140) || "(empty line)"),
          h("button", { class: "btn icon sm rm", title: "Remove", onclick: (e) => { e.stopPropagation(); toggleBookmark(b.path, b.line); } }, icon("close")))))));
  }

  /* =====================================================================
   * TODOs
   * ===================================================================== */
  const TODO_RE = /(?:^|\s|\/\/+|#+|--|\/\*+|<!--|;+|%+|\*|'|!)\s*\b(TODO|FIXME|HACK|XXX|BUG|NOTE)\b(?:\(([^)]*)\))?[:\s-]*(.*?)\s*(?:\*\/|-->)?\s*$/;
  const isCommentish = (line, idx) => /(\/\/|#|--|\/\*|<!--|;|%|^\s*\*|'|!)/.test(line.slice(0, idx + 1)) || /^\s*$/.test(line.slice(0, idx));
  function scanTodos() {
    const out = [];
    for (const [p, text] of Object.entries(A.currentFiles())) {
      if (text.length > 400000) continue;
      text.split("\n").forEach((line, i) => {
        const m = TODO_RE.exec(line);
        if (m && isCommentish(line, m.index)) out.push({ path: p, line: i + 1, tag: m[1], who: m[2] || "", text: m[3] || "", col: line.indexOf(m[1]) + 1 });
      });
    }
    return out;
  }
  const todoFilter = new Set();
  function renderTodos() {
    const root = document.getElementById("todos");
    if (!root || !A.project) return;
    const all = scanTodos();
    const badge = document.getElementById("todos-badge");
    if (badge) badge.textContent = all.length || "";
    const tags = [...new Set(all.map((t) => t.tag))];
    const shown = all.filter((t) => !todoFilter.size || todoFilter.has(t.tag));
    if (!all.length) { root.replaceChildren(h("div", { class: "empty" }, "No TODO, FIXME, HACK, BUG or NOTE comments in this project.")); return; }
    const groups = {};
    for (const t of shown) (groups[t.path] ||= []).push(t);
    root.replaceChildren(h("div", { class: "list-tools" }, tags.map((tg) => h("button", { class: "toggle tag-chip t-" + tg.toLowerCase() + (todoFilter.has(tg) ? " on" : ""), onclick: () => { if (todoFilter.has(tg)) todoFilter.delete(tg); else todoFilter.add(tg); renderTodos(); } }, `${tg} ${all.filter((t) => t.tag === tg).length}`))),
      ...Object.entries(groups).map(([p, list]) => h("div", { class: "group" },
        h("div", { class: "row file-row" }, h("span", { class: "fi", html: A.fileIconSvg(p) }), h("span", {}, p), h("span", { class: "count" }, list.length)),
        list.map((t) => h("div", { class: "row item", onclick: () => A.openFile(t.path, { line: t.line, col: t.col, selectLen: t.tag.length }) },
          h("span", { class: "tag t-" + t.tag.toLowerCase() }, t.tag), h("span", { class: "msg" }, t.text || "(no text)"), t.who ? h("span", { class: "muted small" }, t.who) : null, h("span", { class: "ln" }, `line ${t.line}`))))));
  }
  let todoDecos = null;
  function highlightTodos() {
    const editor = ed();
    if (!editor?.getModel()) return;
    todoDecos ||= editor.createDecorationsCollection();
    const m = A.monaco, model = editor.getModel(), decos = [];
    if (model.getLineCount() < 20000) model.getLinesContent().forEach((line, i) => {
      const r = TODO_RE.exec(line);
      if (r && isCommentish(line, r.index)) { const c = line.indexOf(r[1]) + 1; decos.push({ range: new m.Range(i + 1, c, i + 1, c + r[1].length), options: { inlineClassName: "todo-hl t-" + r[1].toLowerCase(), overviewRuler: { color: "#d4952b88", position: m.editor.OverviewRulerLane.Right } } }); }
    });
    todoDecos.set(decos);
  }
  const refreshTodos = A.debounce(() => { renderTodos(); highlightTodos(); }, 500);

  /* =====================================================================
   * Text commands
   * ===================================================================== */
  /** Replace the selected lines (or the whole file) with fn(lines). */
  function transformLines(fn, label) {
    const editor = ed(), model = editor?.getModel();
    if (!model) return toast("Open a file first.", "warn");
    if (editor.getOption(A.monaco.editor.EditorOption.readOnly)) return toast("This file is read-only right now.", "warn");
    const sels = editor.getSelections().filter((s) => !s.isEmpty());
    const ranges = sels.length ? sels.map((s) => new A.monaco.Range(s.startLineNumber, 1, s.endColumn === 1 && s.endLineNumber > s.startLineNumber ? s.endLineNumber - 1 : s.endLineNumber, Infinity)) : [model.getFullModelRange()];
    const edits = ranges.map((r) => {
      const range = model.validateRange(r);
      const lines = model.getValueInRange(range).split(/\r?\n/);
      return { range, text: fn(lines).join("\n") };
    });
    editor.pushUndoStop(); editor.executeEdits("dexna-text", edits); editor.pushUndoStop();
    editor.focus();
    A.setStatusFlash(label + (sels.length ? " (selection)" : ""));
  }
  /** Replace each selection (or the word at each cursor) with fn(text). */
  function transformSelections(fn, label) {
    const editor = ed(), model = editor?.getModel();
    if (!model) return toast("Open a file first.", "warn");
    const edits = [];
    for (const s of editor.getSelections()) {
      let range = s;
      if (s.isEmpty()) { const w = model.getWordAtPosition(s.getStartPosition()); if (!w) continue; range = new A.monaco.Range(s.startLineNumber, w.startColumn, s.startLineNumber, w.endColumn); }
      try { edits.push({ range, text: fn(model.getValueInRange(range)) }); } catch (e) { return toast(`${label}: ${e.message}`, "error"); }
    }
    if (!edits.length) return toast("Select some text first.", "info");
    editor.pushUndoStop(); editor.executeEdits("dexna-text", edits); editor.pushUndoStop();
    editor.focus();
    A.setStatusFlash(label);
  }
  function insertText(text) {
    const editor = ed();
    if (!editor?.getModel()) return toast("Open a file first.", "warn");
    if (editor.getOption(A.monaco.editor.EditorOption.readOnly)) return toast("This file is read-only right now.", "warn");
    editor.pushUndoStop();
    editor.executeEdits("dexna-insert", editor.getSelections().map((s) => ({ range: s, text, forceMoveMarkers: true })));
    editor.pushUndoStop();
    editor.focus();
  }
  const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const b64 = (s) => { let bin = ""; for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b); return btoa(bin); };
  const unb64 = (s) => new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));
  const textCommands = [
    { id: "lines-sort", label: "Sort Lines (A to Z, numbers in order)", run: () => transformLines((l) => [...l].sort(coll.compare), "Sorted lines") },
    { id: "lines-sort-desc", label: "Sort Lines (Z to A)", run: () => transformLines((l) => [...l].sort((a, b) => coll.compare(b, a)), "Sorted lines") },
    { id: "lines-sort-len", label: "Sort Lines by Length", run: () => transformLines((l) => [...l].sort((a, b) => a.length - b.length), "Sorted lines by length") },
    { id: "lines-unique", label: "Remove Duplicate Lines", run: () => transformLines((l) => [...new Set(l)], "Removed duplicate lines") },
    { id: "lines-reverse", label: "Reverse Lines", run: () => transformLines((l) => [...l].reverse(), "Reversed lines") },
    { id: "lines-shuffle", label: "Shuffle Lines", run: () => transformLines((l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }, "Shuffled lines") },
    { id: "lines-empty", label: "Remove Empty Lines", run: () => transformLines((l) => l.filter((x) => x.trim()), "Removed empty lines") },
    { id: "lines-trim", label: "Trim Trailing Whitespace", run: () => transformLines((l) => l.map((x) => x.replace(/\s+$/, "")), "Trimmed trailing whitespace") },
    { id: "lines-number", label: "Number Lines", run: () => transformLines((l) => l.map((x, i) => `${i + 1}. ${x}`), "Numbered lines") },
    ...Object.entries(CASES).map(([k, [name, fn]]) => ({ id: "case-" + k, label: `Transform to ${name}`, run: () => transformSelections(fn, name) })),
    { id: "enc-b64", label: "Encode Selection as Base64", run: () => transformSelections(b64, "Base64 encoded") },
    { id: "dec-b64", label: "Decode Base64 Selection", run: () => transformSelections((s) => { try { return unb64(s); } catch (_) { throw new Error("the selection is not valid Base64"); } }, "Base64 decoded") },
    { id: "enc-url", label: "URL-Encode Selection", run: () => transformSelections(encodeURIComponent, "URL encoded") },
    { id: "dec-url", label: "URL-Decode Selection", run: () => transformSelections(decodeURIComponent, "URL decoded") },
    { id: "enc-json", label: "Escape Selection as a JSON String", run: () => transformSelections((s) => JSON.stringify(s), "Escaped") },
    { id: "calc-sel", label: "Evaluate Math in Selection", run: () => transformSelections((s) => formatNumber(calculate(s.replace(/=\s*$/, ""))), "Evaluated") },
    { id: "ins-uuid", label: "Insert UUID", run: () => insertText(crypto.randomUUID()) },
    { id: "ins-date", label: "Insert Date and Time (ISO)", run: () => insertText(new Date().toISOString()) },
    { id: "ins-today", label: "Insert Today's Date", run: () => insertText(new Date().toISOString().slice(0, 10)) },
    { id: "ins-unix", label: "Insert Unix Timestamp", run: () => insertText(String(Math.floor(Date.now() / 1000))) },
  ];

  /* =====================================================================
   * Code as an image
   * ===================================================================== */
  function tokenColors() {
    const css = [...document.querySelectorAll("style.monaco-colors")].map((s) => s.textContent).join("\n");
    const map = {};
    for (const m of css.matchAll(/\.mtk(\d+)\s*\{\s*color:\s*([^;}]+)/g)) map[m[1]] = m[2].trim();
    return map;
  }
  async function codeLines(text, lang) {
    const html = await A.monaco.editor.colorize(text, lang, { tabSize: A.settings.tabSize });
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const colors = tokenColors();
    const lines = [[]];
    const walk = (node) => {
      for (const n of node.childNodes) {
        if (n.nodeName === "BR") { lines.push([]); continue; }
        if (n.nodeType === 3) { if (n.textContent) lines.at(-1).push({ text: n.textContent.replace(/ /g, " "), color: null }); continue; }
        const cls = n.className || "";
        if (n.childNodes.length && [...n.childNodes].some((c) => c.nodeType === 1)) { walk(n); continue; }
        const id = /mtk(\d+)/.exec(cls)?.[1];
        lines.at(-1).push({ text: n.textContent.replace(/ /g, " "), color: id ? colors[id] : null, italic: /\bmtki\b/.test(cls), bold: /\bmtkb\b/.test(cls) });
      }
    };
    walk(doc.body.firstChild);
    while (lines.length > 1 && !lines.at(-1).length) lines.pop();
    return lines;
  }
  async function drawCode({ lines, title, startLine, opts }) {
    const css = getComputedStyle(document.documentElement);
    const edBg = getComputedStyle(document.querySelector(".monaco-editor-background") || document.body).backgroundColor;
    const fg = getComputedStyle(document.querySelector(".monaco-editor .view-lines") || document.body).color || css.getPropertyValue("--fg");
    const dim = css.getPropertyValue("--fg-faint").trim();
    const accent = css.getPropertyValue("--accent").trim(), accent2 = css.getPropertyValue("--accent-2").trim();
    const fs = opts.fontSize, lh = Math.round(fs * 1.6), scale = 2;
    const family = '"JetBrains Mono", "Fira Code", Consolas, monospace';
    try { await document.fonts.load(`${fs}px "JetBrains Mono"`); await document.fonts.load(`italic ${fs}px "JetBrains Mono"`); } catch (_) {}
    const probe = document.createElement("canvas").getContext("2d");
    probe.font = `${fs}px ${family}`;
    const cw = probe.measureText("M".repeat(50)).width / 50;
    const cols = Math.min(200, Math.max(20, ...lines.map((l) => l.reduce((n, t) => n + t.text.length, 0))));
    const gutter = opts.lineNumbers ? (String(startLine + lines.length - 1).length + 2) * cw : 0;
    const pad = opts.padding, inner = 22, head = title ? 38 : 14;
    const cardW = Math.ceil(gutter + cols * cw + inner * 2), cardH = Math.ceil(head + lines.length * lh + inner);
    const W = cardW + pad * 2, H = cardH + pad * 2;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale; canvas.height = H * scale;
    const c = canvas.getContext("2d");
    c.scale(scale, scale);
    if (opts.background === "accent") { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, accent); g.addColorStop(1, accent2 || accent); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    else if (opts.background === "theme") { c.fillStyle = css.getPropertyValue("--bg-2").trim(); c.fillRect(0, 0, W, H); }
    else if (opts.background === "light") { c.fillStyle = "#eef0f4"; c.fillRect(0, 0, W, H); }
    const rr = (x, y, w, hh, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    if (opts.background !== "none") { c.save(); c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = 30; c.shadowOffsetY = 10; rr(pad, pad, cardW, cardH, 10); c.fillStyle = edBg; c.fill(); c.restore(); }
    rr(pad, pad, cardW, cardH, 10); c.fillStyle = edBg; c.fill();
    if (title) {
      c.font = `500 12px "IBM Plex Sans", system-ui, sans-serif`; c.fillStyle = dim; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(title, pad + cardW / 2, pad + 20);
      c.fillStyle = css.getPropertyValue("--border").trim(); c.fillRect(pad, pad + head - 6, cardW, 1);
      c.textAlign = "left";
    }
    c.textBaseline = "alphabetic";
    lines.forEach((toks, i) => {
      const y = pad + head + i * lh + lh * 0.72 + 4;
      if (opts.lineNumbers) { c.font = `${fs}px ${family}`; c.fillStyle = dim; c.textAlign = "right"; c.fillText(String(startLine + i), pad + inner + gutter - cw, y); c.textAlign = "left"; }
      let x = pad + inner + gutter, col = 0;
      for (const t of toks) {
        if (col >= cols) break;
        const text = t.text.slice(0, cols - col);
        c.font = `${t.italic ? "italic " : ""}${t.bold ? "700 " : ""}${fs}px ${family}`;
        c.fillStyle = t.color || fg;
        c.fillText(text, x, y);
        x += text.length * cw; col += text.length;
      }
    });
    return canvas;
  }
  async function codeImage() {
    const editor = ed(), model = editor?.getModel();
    if (!model) return toast("Open a file first.", "warn");
    const sel = editor.getSelection();
    let text, startLine = 1;
    if (sel && !sel.isEmpty()) { const r = new A.monaco.Range(sel.startLineNumber, 1, sel.endColumn === 1 && sel.endLineNumber > sel.startLineNumber ? sel.endLineNumber - 1 : sel.endLineNumber, Infinity); text = model.getValueInRange(model.validateRange(r)); startLine = sel.startLineNumber; }
    else text = model.getValue();
    const all = text.split("\n");
    if (all.length > 300) { text = all.slice(0, 300).join("\n"); toast("Only the first 300 lines fit in an image. Select a part to choose which.", "info", 5000); }
    // remove the common indentation
    const ind = Math.min(...text.split("\n").filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    if (ind > 0 && Number.isFinite(ind)) text = text.split("\n").map((l) => l.slice(ind)).join("\n");
    const lines = await codeLines(text.replace(/\t/g, " ".repeat(A.settings.tabSize)), model.getLanguageId());
    const path = A.currentPath() || model.uri.path.split("/").pop();
    const opts = { background: "accent", padding: 48, lineNumbers: false, fontSize: 15, title: true, ...A.LS.get("codeImage", {}) };
    const preview = h("div", { class: "ci-preview" });
    let canvas;
    const draw = async () => {
      A.LS.set("codeImage", opts);
      canvas = await drawCode({ lines, title: opts.title ? path.split("/").pop() : "", startLine, opts });
      canvas.style.maxWidth = "100%"; canvas.style.maxHeight = "58vh";
      preview.replaceChildren(canvas);
    };
    const sel1 = (key, list) => h("select", { onchange: (e) => { opts[key] = isNaN(+e.target.value) ? e.target.value : +e.target.value; draw(); } }, list.map(([v, l]) => h("option", { value: v, selected: opts[key] == v }, l)));
    const chk = (key, l) => h("label", { class: "check small" }, h("input", { type: "checkbox", checked: opts[key], onchange: (e) => { opts[key] = e.target.checked; draw(); } }), " " + l);
    const blob = () => new Promise((r) => canvas.toBlob(r, "image/png"));
    A.openModal(h("div", { class: "modal ci-modal" },
      h("div", { class: "modal-head" }, "Save code as an image"),
      h("div", { class: "modal-body" },
        h("div", { class: "ci-opts" },
          h("label", {}, "Background ", sel1("background", [["accent", "Theme accent"], ["theme", "Theme"], ["light", "Light"], ["none", "None (transparent)"]])),
          h("label", {}, "Padding ", sel1("padding", [[16, "Small"], [48, "Medium"], [80, "Large"]])),
          h("label", {}, "Size ", sel1("fontSize", [[13, "Small"], [15, "Medium"], [18, "Large"]])),
          chk("lineNumbers", "Line numbers"), chk("title", "File name")),
        preview),
      h("div", { class: "modal-foot" },
        h("button", { class: "btn", onclick: () => A.closeModal() }, "Close"),
        h("button", { class: "btn", onclick: async () => { try { await navigator.clipboard.write([new ClipboardItem({ "image/png": await blob() })]); toast("Image copied", "ok"); } catch (_) { toast("The browser did not allow copying images. Use Download.", "error"); } } }, icon("copy"), "Copy"),
        h("button", { class: "btn primary", onclick: async () => { A.downloadBlob(await blob(), path.split("/").pop().replace(/\.\w+$/, "") + ".png"); } }, icon("download"), "Download PNG"))));
    await draw();
  }

  /* =====================================================================
   * Zen mode
   * ===================================================================== */
  let zenEsc = 0;
  function toggleZen(on = !document.getElementById("app").classList.contains("zen")) {
    document.getElementById("app").classList.toggle("zen", on);
    if (on) {
      toast("Zen mode. Press Esc twice, or Ctrl+K Z, to leave.", "info", 3000);
      if (A.settings.zenFullscreen && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setTimeout(() => { ed()?.layout(); ed()?.focus(); }, 50);
  }
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !document.getElementById("app").classList.contains("zen") || document.querySelector("#overlay:not(.hidden)")) return;
    if (document.querySelector(".suggest-widget.visible, .find-widget.visible")) return;
    const now = Date.now();
    if (now - zenEsc < 600) { zenEsc = 0; toggleZen(false); } else zenEsc = now;
  }, true);

  /* =====================================================================
   * Vim keys (monaco-vim)
   * ===================================================================== */
  let vim = null, vimLib = null;
  function loadVimLib() {
    if (vimLib) return vimLib;
    vimLib = new Promise((resolve, reject) => {
      const req = window.require, def = window.define;
      // monaco-vim reuses Monaco's indent command; if this Monaco build does not have it as a module, supply one
      const stub = () => { try { def("vs/editor/common/commands/shiftCommand", [], () => ({
          ShiftCommand: class {
            constructor(sel, o) { this.sel = sel; this.o = o; }
            getEditOperations(model, b) {
              const m = A.monaco, unit = this.o.insertSpaces ? " ".repeat(this.o.indentSize || this.o.tabSize) : "\t";
              for (let ln = this.sel.startLineNumber; ln <= this.sel.endLineNumber; ln++) {
                const text = model.getLineContent(ln);
                if (!this.o.isUnshift) { if (text.trim()) b.addEditOperation(new m.Range(ln, 1, ln, 1), unit); }
                else { const lead = /^(\t| {1,8})/.exec(text)?.[0] || ""; const n = lead === "\t" ? 1 : Math.min(lead.length, unit.length); if (n) b.addEditOperation(new m.Range(ln, 1, ln, 1 + n), ""); }
              }
            }
            computeCursorState(model, helper) { const ops = helper.getInverseEditOperations(); return ops.length ? new A.monaco.Selection(this.sel.startLineNumber, 1, this.sel.startLineNumber, 1) : this.sel; }
          },
        })); } catch (_) { /* already defined */ } };
      const load = () => {
        req.config({ paths: { "monaco-vim": A.cfg.libs.vim.replace(/\.js$/, "") } });
        req(["monaco-vim"], (mv) => resolve(mv), (err) => { vimLib = null; reject(err); });
      };
      req(["vs/editor/common/commands/shiftCommand"], load, () => { stub(); load(); });
    });
    return vimLib;
  }
  async function setVim(on) {
    const bar = document.getElementById("sb-vim");
    if (!on) { vim?.dispose(); vim = null; bar?.classList.add("hidden"); if (bar) bar.textContent = ""; return; }
    if (vim) return;
    try {
      const mv = await loadVimLib();
      if (!A.settings.vimMode || vim) return;
      bar.classList.remove("hidden");
      vim = mv.initVimMode(ed(), bar);
      const Vim = mv.VimMode?.Vim;
      if (Vim && !setVim.defined) {
        setVim.defined = true;
        Vim.defineEx("write", "w", () => A.save());
        Vim.defineEx("quit", "q", () => A.closeActive());
        Vim.defineEx("wq", "wq", () => { A.save(); A.closeActive(); });
        Vim.defineEx("xit", "x", () => { A.save(); A.closeActive(); });
      }
    } catch (e) {
      toast("Could not load Vim keys. Check your internet connection.", "error");
      A.setSetting("vimMode", false);
    }
  }

  /* =====================================================================
   * Quick open: "=" calculator and "?" help
   * ===================================================================== */
  function calcItems(q) {
    const expr = q.trim();
    if (!expr) return [{ label: "Type a calculation, for example 2^10, sqrt(2), 15% * 80 or 0xff + 1", run: () => {} }];
    try {
      const v = calculate(expr.replace(/(\d+(?:\.\d+)?)\s*%(?!\s*[\d(])/g, "($1/100)"));
      const r = formatNumber(v);
      const items = [{ label: `= ${r}`, desc: "Enter copies", run: () => { navigator.clipboard?.writeText(r); toast(`Copied ${r}`, "ok", 1500); } }];
      if (Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER && Math.abs(v) > 9) items.push({ label: `= 0x${(v < 0 ? "-" : "") + Math.abs(v).toString(16)}`, desc: "hex", run: () => navigator.clipboard?.writeText("0x" + v.toString(16)) }, { label: `= 0b${Math.abs(v).toString(2)}`, desc: "binary", run: () => navigator.clipboard?.writeText("0b" + v.toString(2)) });
      if (ed()?.getModel()) items.push({ label: `Insert ${r} at the cursor`, run: () => insertText(r) });
      return items;
    } catch (e) {
      return [{ label: e.message, desc: "calculator", run: () => {} }];
    }
  }
  const HELP = [["", "Go to a file by name"], [">", "Run a command"], [":", "Go to a line"], ["@", "Go to a symbol in the file"], ["#", "Go to a symbol in any file"], ["=", "Calculator"], ["?", "This help"]];
  const helpItems = (openWith) => HELP.map(([p, d]) => ({ label: p ? `${p}  ${d}` : `…  ${d}`, run: () => openWith(p) }));

  /* =====================================================================
   * Project statistics
   * ===================================================================== */
  function countLines(text, lang) {
    let code = 0, comment = 0, blank = 0, inBlock = null;
    const lc = LINE_COMMENT[lang] || (NO_LINE.has(lang) ? null : "//");
    const blocks = lang === "html" || lang === "markdown" || lang === "xml" ? [["<!--", "-->"]] : lang === "python" ? [['"""', '"""'], ["'''", "'''"]] : lang === "lua" ? [["--[[", "]]"]] : NO_LINE.has(lang) && lang !== "css" ? [] : [["/*", "*/"]];
    for (const raw of text.split("\n")) {
      const l = raw.trim();
      if (inBlock) { comment++; if (l.includes(inBlock)) inBlock = null; continue; }
      if (!l) { blank++; continue; }
      const b = blocks.find(([open]) => l.startsWith(open));
      if (b) { comment++; const rest = l.slice(b[0].length); if (!rest.includes(b[1])) inBlock = b[1]; continue; }
      if (lc && l.startsWith(lc)) { comment++; continue; }
      code++;
    }
    return { code, comment, blank };
  }
  function showStats() {
    const files = A.currentFiles();
    const byLang = new Map();
    let total = { files: 0, lines: 0, code: 0, comment: 0, blank: 0, bytes: 0 };
    const sizes = [];
    for (const [p, text] of Object.entries(files)) {
      const lang = A.langOf(p), name = A.langName(lang);
      const c = countLines(text, lang), lines = text ? text.split("\n").length : 0, bytes = new TextEncoder().encode(text).length;
      const row = byLang.get(name) || { name, files: 0, lines: 0, code: 0, comment: 0, blank: 0 };
      row.files++; row.lines += lines; row.code += c.code; row.comment += c.comment; row.blank += c.blank;
      byLang.set(name, row);
      total.files++; total.lines += lines; total.code += c.code; total.comment += c.comment; total.blank += c.blank; total.bytes += bytes;
      sizes.push({ p, lines, bytes });
    }
    const rows = [...byLang.values()].sort((a, b) => b.lines - a.lines);
    const fmtB = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
    const todos = scanTodos().length;
    const tile = (v, l) => h("div", { class: "st-tile" }, h("b", {}, typeof v === "number" ? v.toLocaleString() : v), h("span", {}, l));
    const max = Math.max(1, ...rows.map((r) => r.lines));
    A.openModal(h("div", { class: "modal stats-modal" },
      h("div", { class: "modal-head" }, `Statistics: ${A.project.name}`),
      h("div", { class: "modal-body" },
        h("div", { class: "st-tiles" }, tile(total.files, "files"), tile(total.lines, "lines"), tile(total.code, "lines of code"), tile(total.comment, "comment lines"), tile(fmtB(total.bytes), "size"), tile(todos, "TODOs"), tile(scm.commits.length, "commits")),
        rows.length ? h("table", { class: "st-table" },
          h("thead", {}, h("tr", {}, ["Language", "Files", "Lines", "Code", "Comments", "Blank", ""].map((t) => h("th", {}, t)))),
          h("tbody", {}, rows.map((r) => h("tr", {}, h("td", {}, r.name), h("td", {}, r.files), h("td", {}, r.lines.toLocaleString()), h("td", {}, r.code.toLocaleString()), h("td", {}, r.comment.toLocaleString()), h("td", {}, r.blank.toLocaleString()),
            h("td", { class: "st-bar" }, h("i", { style: { width: Math.max(2, (r.lines / max) * 100) + "%" } })))))) : h("div", { class: "empty" }, "This project has no files yet."),
        sizes.length ? h("div", { class: "st-sub" }, "Largest files") : null,
        h("div", { class: "st-big" }, sizes.sort((a, b) => b.bytes - a.bytes).slice(0, 5).map((s) => h("div", { class: "row", onclick: () => { A.closeModal(); A.openFile(s.p); } }, h("span", { class: "fi", html: A.fileIconSvg(s.p) }), h("span", {}, s.p), h("span", { class: "muted small" }, `${s.lines.toLocaleString()} lines, ${fmtB(s.bytes)}`))))),
      h("div", { class: "modal-foot" }, h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))));
  }

  /* =====================================================================
   * Markdown preview
   * ===================================================================== */
  // Runs inside the preview. Math (KaTeX) and diagrams (Mermaid) load only when the file has some.
  const MD_SCRIPT = (libs, theme) => `(() => {
    const LIBS = ${JSON.stringify(libs)}, THEME = ${JSON.stringify(theme)};
    const post = (m) => parent.postMessage(Object.assign({ __dexna: 1 }, m), "*");
    const loaded = {};
    const load = (src, css) => loaded[src] || (loaded[src] = new Promise((res, rej) => {
      if (css) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = css; document.head.append(l); }
      const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error("Could not load " + src.split("/npm/").pop() + ". Check your connection.")); };
      document.head.append(s);
    }));
    const fail = (el, msg) => { const d = document.createElement("div"); d.className = "dx-error"; d.textContent = msg; el.replaceChildren(d); el.dataset.done = 1; };
    const svgs = new Map(); let n = 0;
    async function enhance() {
      const maths = [...document.querySelectorAll(".dx-math:not([data-done]):not([data-busy])")];
      if (maths.length) {
        maths.forEach((el) => (el.dataset.busy = 1));
        try {
          await load(LIBS.katex + "katex.min.js", LIBS.katex + "katex.min.css");
          for (const el of maths) { try { katex.render(el.textContent, el, { displayMode: el.classList.contains("display"), throwOnError: false }); el.dataset.done = 1; } catch (e) { fail(el, e.message); } }
        } catch (e) { maths.forEach((el) => { el.title = e.message; delete el.dataset.busy; }); }
      }
      const dias = [...document.querySelectorAll(".mermaid:not([data-done]):not([data-busy])")];
      if (dias.length) {
        dias.forEach((el) => (el.dataset.busy = 1));
        try {
          await load(LIBS.mermaid);
          if (!window.__dxMermaid) { mermaid.initialize({ startOnLoad: false, theme: THEME === "light" ? "default" : "dark", securityLevel: "strict" }); window.__dxMermaid = 1; }
          for (const el of dias) {
            const src = el.textContent;
            let out = svgs.get(src);
            if (!out) {
              const id = "dxm" + ++n;
              try { out = { svg: (await mermaid.render(id, src)).svg }; } catch (e) { out = { error: "Diagram error: " + String(e.message || e).split("\\n").slice(0, 3).join("\\n") }; document.getElementById("d" + id)?.remove(); }
              svgs.set(src, out);
            }
            if (out.error) fail(el, out.error); else { el.innerHTML = out.svg; el.dataset.done = 1; }
          }
        } catch (e) { dias.forEach((el) => { el.title = e.message; delete el.dataset.busy; }); }
      }
    }
    addEventListener("DOMContentLoaded", enhance);
    addEventListener("message", (e) => {
      const m = e.data; if (!m || !m.__dexnaMd) return;
      if (m.html != null) { const y = scrollY; document.getElementById("md").innerHTML = m.html; scrollTo(0, y); enhance(); }
      if (m.line != null) {
        const els = [...document.querySelectorAll("[data-line]")];
        let best = null, next = null;
        for (const el of els) { const l = +el.dataset.line; if (l <= m.line) best = el; else { next = el; break; } }
        if (!best) return scrollTo({ top: 0 });
        const a = +best.dataset.line, b = next ? +next.dataset.line : a + 1;
        const ya = best.getBoundingClientRect().top + scrollY, yb = next ? next.getBoundingClientRect().top + scrollY : ya + best.offsetHeight;
        scrollTo({ top: Math.max(0, ya + (yb - ya) * Math.min(1, (m.line - a) / Math.max(1, b - a)) - 12) });
      }
    });
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
      const h = a.getAttribute("href");
      if (/^#/.test(h)) { e.preventDefault(); const t = document.getElementById(decodeURIComponent(h.slice(1))); if (t) t.scrollIntoView({ behavior: "smooth" }); return; }
      if (/^([a-z][\\w+.-]*:|\\/\\/)/i.test(h)) { a.target = "_blank"; a.rel = "noopener"; return; }
      e.preventDefault(); post({ type: "nav", href: h });
    }, true);
  })();`;
  const mdColors = () => {
    const css = getComputedStyle(document.documentElement), v = (k) => css.getPropertyValue(k).trim();
    return { type: document.documentElement.dataset.theme === "light" ? "light" : "dark", bg: v("--bg"), fg: v("--fg"), muted: v("--fg-dim"), border: v("--border"), accent: v("--accent"), code: v("--bg-2") };
  };
  /** The body of the preview, with code blocks highlighted by Monaco. */
  async function markdownBody(text, path) {
    const blocks = [];
    let html = renderMarkdown(text, { highlight: (code, lang) => { blocks.push({ code, lang }); return `\u0001${blocks.length - 1}\u0001`; } });
    const known = new Set(A.monaco.languages.getLanguages().flatMap((l) => [l.id, ...(l.aliases || []).map((a) => a.toLowerCase()), ...(l.extensions || []).map((x) => x.slice(1))]));
    const resolve = (lang) => { const l = (lang || "").toLowerCase(); const byExt = A.monaco.languages.getLanguages().find((x) => (x.extensions || []).includes("." + l) || (x.aliases || []).some((a) => a.toLowerCase() === l)); return byExt?.id || (known.has(l) ? l : null); };
    const out = await Promise.all(blocks.map(async ({ code, lang }) => {
      const id = resolve(lang);
      const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
      if (!id) return esc(code);
      try { return (await A.monaco.editor.colorize(code, id, { tabSize: A.settings.tabSize })).replace(/<br\/?>$/, ""); } catch (_) { return esc(code); }
    }));
    html = html.replace(/\u0001(\d+)\u0001/g, (_, i) => out[+i]);
    // images in the project: SVG text files, and binary images
    html = html.replace(/<img src="([^"]+)"/g, (m, src) => {
      if (/^([a-z][\w+.-]*:|\/\/)/i.test(src)) return m;
      let p = A.resolveRef(path, src); try { p = decodeURIComponent(p); } catch (_) {}
      if (/\.svg$/i.test(p) && A.project.files[p] != null) return `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(A.textOf(p))}"`;
      const d = A.assetDataUrl?.(p);
      return d ? `<img src="${d}"` : m;
    });
    return html || '<p class="empty">This file is empty. Start typing on the left.</p>';
  }
  async function markdownPage(text, path) {
    const tokenCss = [...document.querySelectorAll("style.monaco-colors")].map((s) => s.textContent).join("\n").replace(/<\/style/gi, "");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_self"><style>${markdownCss(mdColors())}\n${tokenCss}</style><script>${MD_SCRIPT({ katex: A.cfg.libs.katex, mermaid: A.cfg.libs.mermaid }, mdColors().type)}<\/script></head><body><main id="md">${await markdownBody(text, path)}</main></body></html>`;
  }
  const isMarkdown = (p) => /\.(md|markdown|mdx)$/i.test(p || "");

  /* =====================================================================
   * Wiring
   * ===================================================================== */
  const toolbox = createToolbox(document.getElementById("tools-root"), { h, icon, toast, insertText, showDiff, LS: A.LS });

  const commands = [
    { id: "scm-view", label: "Show Source Control", cat: "View", kb: "ctrl+shift+g", run: () => A.setView("scm") },
    { id: "scm-commit", label: "Commit All Changes", cat: "Source Control", run: async () => { await scm.commit(); } },
    { id: "scm-diff", label: "Compare with Last Commit", cat: "Source Control", run: () => { const p = A.currentPath(); if (!p) return toast("Open a file first.", "warn"); if (!scm.head) return toast("Commit once first: Source Control compares with the last commit.", "info"); scm.diffWithHead(p); } },
    { id: "scm-history", label: "File History", cat: "Source Control", run: () => { const p = A.currentPath(); if (p) scm.fileHistory(p); } },
    { id: "scm-discard", label: "Discard Changes in This File", cat: "Source Control", run: () => { const p = A.currentPath(); if (p) scm.discard([p]); } },
    { id: "compare-file", label: "Compare Active File With…", cat: "File", run: () => compareWith() },
    { id: "compare-clip", label: "Compare Active File with Clipboard", cat: "File", run: compareClipboard },
    { id: "tools-view", label: "Show Toolbox", cat: "View", run: () => A.setView("tools") },
    { id: "md-preview", label: "Open Preview (Markdown, CSV, JSON, SVG)", cat: "View", kb: "ctrl+shift+v", when: (e) => !e.target.matches?.("input, textarea:not(.inputarea), [contenteditable]"), run: () => { const p = A.currentPath(); if (!isMarkdown(p) && !A.canPreview?.(p)) return toast("Open a Markdown, CSV, JSON or SVG file first.", "info"); A.previewFile(p); } },
    { id: "bm-toggle", label: "Toggle Bookmark", cat: "Go", kb: "ctrl+alt+k", run: () => toggleBookmark() },
    { id: "bm-next", label: "Next Bookmark", cat: "Go", kb: "ctrl+alt+l", run: () => jumpBookmark(1) },
    { id: "bm-prev", label: "Previous Bookmark", cat: "Go", kb: "ctrl+alt+j", run: () => jumpBookmark(-1) },
    { id: "bm-list", label: "Show Bookmarks", cat: "View", run: () => A.showPanel("bookmarks") },
    { id: "bm-clear", label: "Remove All Bookmarks", cat: "Go", run: clearBookmarks },
    { id: "todos", label: "Show TODOs", cat: "View", run: () => A.showPanel("todos") },
    { id: "code-image", label: "Save Code as Image…", cat: "File", run: codeImage },
    { id: "zen", label: "Toggle Zen Mode", cat: "View", kb: "ctrl+k z", run: () => toggleZen() },
    { id: "vim", label: "Toggle Vim Keys", cat: "Preferences", run: () => A.setSetting("vimMode", !A.settings.vimMode) },
    { id: "calc", label: "Calculator", cat: "Go", run: () => A.quickOpen("=") },
    { id: "stats", label: "Project Statistics", cat: "View", run: showStats },
    ...textCommands.map((c) => ({ ...c, cat: "Text" })),
  ];

  function onEditorReady() {
    const editor = ed(), m = A.monaco;
    editor.addAction({ id: "dexna.zen", label: "Toggle Zen Mode", keybindings: [m.KeyMod.chord(m.KeyMod.CtrlCmd | m.KeyCode.KeyK, m.KeyCode.KeyZ)], run: () => toggleZen() });
    editor.addAction({ id: "dexna.bookmark", label: "Toggle Bookmark", contextMenuGroupId: "9_dexna", contextMenuOrder: 1, run: () => toggleBookmark() });
    editor.addAction({ id: "dexna.codeImage", label: "Save Code as Image…", contextMenuGroupId: "9_dexna", contextMenuOrder: 2, run: codeImage });
    editor.onDidChangeModel(() => { updateMarkers(); highlightTodos(); A.updateMdButton?.(); });
    editor.onDidChangeModelContent(() => { scheduleMarkers(); refreshTodos(); });
    editor.onMouseDown((e) => {
      if (e.target.type === m.editor.MouseTargetType.GUTTER_LINE_DECORATIONS && e.target.element?.classList.contains("scm-mk")) { const p = A.currentPath(); if (p) scm.diffWithHead(p); }
    });
    // keep the Markdown preview in step with the editor
    editor.onDidScrollChange(A.debounce(() => {
      const p = A.currentPath();
      if (!p || p !== A.previewPath() || !isMarkdown(p)) return;
      const r = editor.getVisibleRanges()[0];
      if (r) A.postToPreview({ __dexnaMd: 1, line: r.startLineNumber });
    }, 40));
    if (A.settings.vimMode) setVim(true);
  }
  function onProjectLoaded() {
    for (const p of Object.keys(bookmarks())) renderBookmarkDecos(p);
    renderBookmarkList();
    renderTodos();
    scm.load().then(() => { updateMarkers(); updateScmBadge(); });
  }
  function onModelCreated(path) { renderBookmarkDecos(path); }
  function onModelContent(path) { if (bmDecos.get(path)?.length) syncBookmarks(path); }
  function onFilesChanged() { refreshScm(); refreshTodos(); }
  function onView(view) { if (view === "scm") scm.render(); }
  function onSetting(key, value) {
    if (key === "vimMode") setVim(value);
    if (key === "changeMarkers") updateMarkers();
  }

  return {
    commands, textMenu: ["lines-sort", "lines-sort-desc", "lines-unique", "lines-reverse", "lines-empty", "-", "case-camel", "case-snake", "case-pascal", "case-kebab", "case-constant", "case-upper", "case-lower", "-", "enc-b64", "dec-b64", "calc-sel", "-", "ins-uuid", "ins-date", "-", "md-toc", "json-sort"],
    onEditorReady, onProjectLoaded, onModelCreated, onModelContent, onFilesChanged, onView, onSetting,
    calcItems, helpItems, showDiff, scm, toolbox, markdownPage, markdownBody, isMarkdown, insertText, toggleZen, toggleBookmark,
  };
}
