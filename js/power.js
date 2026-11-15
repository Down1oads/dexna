// More workbench features: the split editor, user snippets, clipboard history, local history (automatic
// snapshots of every file, separate from Source Control) and run on save.
import { diffStats } from "./diff.js";

/* =====================================================================
 * Local history storage (IndexedDB, with an in-memory fallback)
 * ===================================================================== */
const DB_NAME = "dexna-history";
const PER_FILE = 60; // snapshots kept per file
const MAX_SIZE = 1_000_000; // larger files are not snapshotted
let dbPromise = null;
function db() {
  dbPromise ||= new Promise((resolve, reject) => {
    if (!("indexedDB" in self)) return reject(new Error("IndexedDB is not available"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("snaps", { keyPath: "id" }).createIndex("project", "project");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
const memory = new Map();
async function tx(mode, fn) {
  try {
    const d = await db();
    return await new Promise((resolve, reject) => {
      const t = d.transaction("snaps", mode);
      const r = fn(t.objectStore("snaps"));
      t.oncomplete = () => resolve(r?.result);
      t.onerror = () => reject(t.error);
    });
  } catch (_) { return undefined; }
}
export const historyStore = {
  async list(project) {
    const r = await tx("readonly", (st) => st.index("project").getAll(project));
    return (r ?? [...memory.values()].filter((s) => s.project === project)).sort((a, b) => b.time - a.time);
  },
  async put(s) { memory.set(s.id, s); await tx("readwrite", (st) => st.put(s)); },
  async del(id) { memory.delete(id); await tx("readwrite", (st) => st.delete(id)); },
  async delProject(project) { for (const s of await this.list(project)) await this.del(s.id); },
};

/* =====================================================================
 * Snippet helpers (exported for tests)
 * ===================================================================== */
/** Escape text so a snippet inserts it literally. */
export const escapeSnippet = (text) => text.replace(/[\\$}]/g, (c) => "\\" + c);
/** Read VS Code's snippet JSON ({ name: { prefix, body, description } }), comments and trailing commas allowed. */
export function parseVsSnippets(text, lang) {
  const clean = text.replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, s) => s || "").replace(/,(\s*[}\]])/g, "$1");
  const data = JSON.parse(clean);
  const out = [];
  for (const [name, v] of Object.entries(data || {})) {
    if (!v || typeof v !== "object" || v.body == null) continue;
    const prefixes = Array.isArray(v.prefix) ? v.prefix : [v.prefix ?? name];
    for (const prefix of prefixes) out.push({ name, prefix: String(prefix), body: Array.isArray(v.body) ? v.body.join("\n") : String(v.body), desc: v.description || "", lang: v.scope ? String(v.scope).split(",")[0].trim() || lang : lang });
  }
  return out;
}
export function toVsSnippets(list) {
  const out = {};
  for (const s of list) {
    let key = s.name || s.prefix, n = 2;
    while (out[key]) key = `${s.name || s.prefix} (${n++})`;
    out[key] = { prefix: s.prefix, body: s.body.split("\n"), ...(s.desc ? { description: s.desc } : {}), ...(s.lang && s.lang !== "*" ? { scope: s.lang } : {}) };
  }
  return JSON.stringify(out, null, 2) + "\n";
}

export function createPower(A) {
  const { h, icon, toast } = A;
  const ed = () => A.editor;
  const ago = (t) => A.ago(t);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  /* =====================================================================
   * Split editor
   * ===================================================================== */
  const split = { editor: null, path: null, el: null, select: null, focused: false };
  function buildSplit() {
    if (split.el) return;
    const wrap = document.getElementById("editor-wrap");
    split.select = h("select", { class: "split-file", title: "File in this editor", onchange: () => setSplitFile(split.select.value) });
    const resizer = h("div", { class: "resizer v", id: "split-resizer" });
    split.el = h("div", { id: "split", class: "split hidden" },
      resizer,
      h("div", { class: "split-head" },
        icon("split"), split.select,
        h("div", { class: "split-acts" },
          h("button", { class: "btn icon sm", title: "Swap the two editors", onclick: () => swapSplit() }, icon("swap")),
          h("button", { class: "btn icon sm", title: "Close the split editor (Ctrl+\\ again)", onclick: () => closeSplit() }, icon("close")))),
      h("div", { id: "editor2" }));
    wrap.insertBefore(split.el, document.getElementById("home"));
    resizer.addEventListener("pointerdown", (e) => {
      e.preventDefault(); resizer.setPointerCapture(e.pointerId); document.body.classList.add("resizing");
      const r = wrap.getBoundingClientRect();
      const move = (ev) => setSplitWidth(Math.max(220, Math.min(r.width - 220, r.right - ev.clientX)));
      const up = () => { document.body.classList.remove("resizing"); resizer.removeEventListener("pointermove", move); resizer.removeEventListener("pointerup", up); A.LS.set("splitWidth", split.width); };
      resizer.addEventListener("pointermove", move); resizer.addEventListener("pointerup", up);
    });
    split.width = A.LS.get("splitWidth", null);
    setSplitWidth(split.width);
  }
  function setSplitWidth(px) {
    split.width = px ? Math.round(px) : null;
    document.getElementById("editor-wrap").style.setProperty("--split-w", split.width ? split.width + "px" : "50%");
  }
  function fillSplitSelect() {
    if (!split.select) return;
    const files = Object.keys(A.project?.files || {}).sort();
    split.select.replaceChildren(...files.map((f) => h("option", { value: f }, f)));
    if (split.path) split.select.value = split.path;
  }
  function openSplit(path = A.currentPath()) {
    if (innerWidth < 700) return toast("The split editor needs a wider window.");
    if (!path || A.project.files[path] == null) path = Object.keys(A.project.files)[0];
    if (!path) return toast("Create a file first.");
    buildSplit();
    A.showPreview(false); // the preview and the split editor share the right side
    split.el.classList.remove("hidden");
    document.getElementById("editor-wrap").classList.add("with-split");
    if (!split.editor) {
      split.editor = A.monaco.editor.create(document.getElementById("editor2"), {
        model: null, automaticLayout: true, fixedOverflowWidgets: true, cursorBlinking: "smooth", mouseWheelZoom: true, padding: { top: 8 },
        renderLineHighlight: "all", linkedEditing: true, lightbulb: { enabled: "on" }, ...A.editorOptions(), minimap: { enabled: false },
      });
      // remember which editor was used last, so commands from the palette or menus act on it
      split.editor.onDidFocusEditorText(() => { split.focused = true; split.el.classList.add("focused"); });
      ed().onDidFocusEditorText(() => { split.focused = false; split.el.classList.remove("focused"); });
      split.editor.addCommand(A.monaco.KeyMod.CtrlCmd | A.monaco.KeyCode.KeyS, () => A.save());
    }
    setSplitFile(path);
    A.LS.set("split:" + A.project.id, path);
    setTimeout(() => split.editor.focus(), 0);
  }
  function setSplitFile(path) {
    if (!split.editor || A.project.files[path] == null) return;
    split.path = path;
    split.editor.setModel(A.modelFor(path));
    fillSplitSelect();
    A.LS.set("split:" + A.project.id, path);
  }
  function closeSplit({ remember = false } = {}) {
    if (!split.el || split.el.classList.contains("hidden")) return;
    split.el.classList.add("hidden");
    document.getElementById("editor-wrap").classList.remove("with-split");
    split.editor?.setModel(null);
    split.path = null;
    split.focused = false;
    split.el.classList.remove("focused");
    if (!remember && A.project) A.LS.del("split:" + A.project.id);
    ed()?.focus();
  }
  const splitOpen = () => !!split.path;
  function swapSplit() {
    if (!splitOpen()) return;
    const left = A.currentPath(), right = split.path;
    if (!left) return;
    A.openFile(right, { focus: false });
    setSplitFile(left);
  }
  function toggleSplit() { splitOpen() ? closeSplit() : openSplit(); }
  /** The editor the person is typing in: the split one when it has focus. */
  const activeEditor = () => (split.focused && splitOpen() ? split.editor : ed());

  /* =====================================================================
   * User snippets
   * ===================================================================== */
  let snippets = A.LS.get("userSnippets", []);
  const saveSnippets = () => A.LS.set("userSnippets", snippets);
  const newId = () => Math.random().toString(36).slice(2, 10);
  const langLabel = (id) => (id === "*" ? "All languages" : A.monaco.languages.getLanguages().find((l) => l.id === id)?.aliases?.[0] || id);
  const forLang = (lang) => snippets.filter((s) => s.lang === "*" || s.lang === lang);
  // Registered per language: Monaco's completion engine does not consult "*" providers.
  const snippetLangs = new Set();
  function registerSnippetProvider() {
    for (const l of A.monaco.languages.getLanguages()) registerSnippetsFor(l.id);
  }
  function registerSnippetsFor(lang) {
    if (snippetLangs.has(lang)) return;
    snippetLangs.add(lang);
    const monaco = A.monaco;
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems(model, pos) {
        const list = forLang(model.getLanguageId());
        if (!list.length) return { suggestions: [] };
        const word = model.getWordUntilPosition(pos);
        const before = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1);
        const run = /\S*$/.exec(before)[0];
        return {
          suggestions: list.map((s) => {
            const wordy = /^\w+$/.test(s.prefix);
            const startCol = wordy ? word.startColumn : pos.column - run.length;
            return {
              label: { label: s.prefix, description: s.name !== s.prefix ? s.name : "Your snippet" },
              kind: monaco.languages.CompletionItemKind.Snippet,
              detail: "Your snippet" + (s.desc ? ": " + s.desc : ""),
              documentation: { value: "```\n" + s.body.replace(/```/g, "ˋˋˋ") + "\n```" },
              insertText: s.body, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: new monaco.Range(pos.lineNumber, startCol, pos.lineNumber, pos.column),
              sortText: "!" + s.prefix, filterText: s.prefix,
            };
          }),
        };
      },
    });
  }
  function insertSnippet(body, target = activeEditor()) {
    if (!target?.getModel()) return toast("Open a file first.");
    target.focus();
    const ctl = target.getContribution("snippetController2");
    if (ctl) ctl.insert(body); else target.trigger("snippet", "type", { text: body });
  }
  function pickSnippet() {
    const target = activeEditor();
    const lang = target?.getModel()?.getLanguageId();
    if (!lang) return toast("Open a file first.");
    const list = forLang(lang);
    if (!list.length) return A.confirmDialog({ title: "No snippets yet", message: `You have no snippets for ${langLabel(lang)}. Create one now?`, okLabel: "Create snippet" }).then((ok) => ok && manageSnippets({ create: { lang } }));
    A.quickPick({
      placeholder: "Insert one of your snippets",
      source: (q) => list.filter((s) => !q || (s.prefix + " " + s.name).toLowerCase().includes(q.toLowerCase()))
        .map((s) => ({ label: s.prefix, detail: s.name !== s.prefix ? s.name : "", desc: langLabel(s.lang), run: () => insertSnippet(s.body, target) })),
    });
  }
  async function saveSelectionAsSnippet() {
    const e = activeEditor(), m = e?.getModel();
    const sel = e?.getSelection();
    const text = m && sel && !sel.isEmpty() ? m.getValueInRange(sel) : "";
    if (!text) return toast("Select the code to save as a snippet first.");
    const name = await A.promptDialog({ title: "Save as snippet", message: "Type the word that inserts it (then press Tab or pick it from the suggestions).", placeholder: "for example: logx", okLabel: "Next" });
    if (!name?.trim()) return;
    // drop the common indentation, so the snippet fits wherever it is inserted
    const lines = text.split("\n");
    const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => /^\s*/.exec(l)[0].length));
    const body = lines.map((l) => l.slice(Math.min(ind, /^\s*/.exec(l)[0].length))).join("\n");
    const s = { id: newId(), name: name.trim(), prefix: name.trim().replace(/\s+/g, "-"), lang: m.getLanguageId(), body: escapeSnippet(body) + "$0", desc: "" };
    snippets.push(s); saveSnippets();
    manageSnippets({ select: s.id });
  }
  function manageSnippets({ select, create } = {}) {
    const langs = [["*", "All languages"], ...A.monaco.languages.getLanguages().filter((l) => l.aliases?.length).map((l) => [l.id, l.aliases[0]]).sort((a, b) => a[1].localeCompare(b[1]))];
    let current = select || null;
    const list = h("div", { class: "sn-list" });
    const form = h("div", { class: "sn-form" });
    const search = h("input", { class: "sn-search", placeholder: "Filter snippets", oninput: () => renderList() });
    const renderList = () => {
      const q = search.value.toLowerCase();
      const shown = snippets.filter((s) => !q || (s.prefix + " " + s.name + " " + langLabel(s.lang)).toLowerCase().includes(q));
      list.replaceChildren(...(shown.length ? shown.map((s) => h("div", { class: "sn-item" + (s.id === current ? " active" : ""), onclick: () => { current = s.id; renderList(); renderForm(); } },
        h("span", { class: "sn-prefix" }, s.prefix), h("span", { class: "sn-name" }, s.name !== s.prefix ? s.name : ""), h("span", { class: "sn-lang" }, langLabel(s.lang))))
        : [h("div", { class: "empty" }, snippets.length ? "No snippet matches." : "No snippets yet. Press New, or select code and use Save Selection as Snippet.")]));
    };
    const field = (label, el, hint) => h("label", { class: "sn-field" }, h("span", {}, label), el, hint ? h("span", { class: "muted small" }, hint) : null);
    const renderForm = () => {
      const s = snippets.find((x) => x.id === current);
      if (!s) { form.replaceChildren(h("div", { class: "empty sn-empty" }, "Pick a snippet on the left, or press New.")); return; }
      const prefix = h("input", { value: s.prefix, spellcheck: "false" });
      const name = h("input", { value: s.name, spellcheck: "false" });
      const lang = h("select", {}, langs.map(([id, l]) => h("option", { value: id }, l)));
      lang.value = s.lang;
      const desc = h("input", { value: s.desc || "", placeholder: "Optional" });
      const body = h("textarea", { class: "sn-body", spellcheck: "false", rows: 12 });
      body.value = s.body;
      body.addEventListener("keydown", (e) => { // Tab types a tab here instead of leaving the box
        if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); const a = body.selectionStart; body.setRangeText("\t", a, body.selectionEnd, "end"); }
      });
      const save = () => {
        if (!prefix.value.trim()) return toast("The prefix cannot be empty.", "error");
        Object.assign(s, { prefix: prefix.value.trim(), name: name.value.trim() || prefix.value.trim(), lang: lang.value, desc: desc.value.trim(), body: body.value });
        saveSnippets(); renderList(); toast("Snippet saved", "ok");
      };
      form.replaceChildren(
        h("div", { class: "sn-row" }, field("Prefix", prefix, "Type this and press Tab"), field("Name", name)),
        h("div", { class: "sn-row" }, field("Language", lang), field("Description", desc)),
        field("Body", body, "$1, $2 are tab stops, ${1:text} a placeholder, ${1|a,b|} a choice, $0 the final cursor. $TM_FILENAME, $CURRENT_YEAR, $CURRENT_DATE and $UUID are filled in. Write \\$ for a dollar sign."),
        h("div", { class: "sn-acts" },
          h("button", { class: "btn danger-text", onclick: async () => { if (!(await A.confirmDialog({ title: "Delete snippet", message: `Delete "${s.prefix}"?`, okLabel: "Delete", danger: true }))) return manageSnippets({ select: s.id }); snippets = snippets.filter((x) => x !== s); saveSnippets(); manageSnippets(); } }, "Delete"),
          h("span", { class: "grow" }),
          h("button", { class: "btn", onclick: () => { save(); A.closeModal(); insertSnippet(s.body); } }, "Save and insert"),
          h("button", { class: "btn primary", onclick: save }, "Save")));
    };
    const fileIn = h("input", { type: "file", accept: ".json,.code-snippets", hidden: true, onchange: async () => {
      const f = fileIn.files[0]; if (!f) return;
      try {
        const lang = A.editor?.getModel()?.getLanguageId() || "*";
        const got = parseVsSnippets(await f.text(), /^[^.]+\.json$/i.test(f.name) && A.monaco.languages.getLanguages().some((l) => l.id === f.name.slice(0, -5)) ? f.name.slice(0, -5) : f.name.endsWith(".code-snippets") ? "*" : lang);
        got.forEach((s) => snippets.push({ id: newId(), ...s }));
        saveSnippets(); renderList(); toast(`Imported ${plural(got.length, "snippet")}`, "ok");
      } catch (e) { toast("Could not read that file: " + e.message, "error"); }
    } });
    A.openModal(h("div", { class: "modal sn-modal" },
      h("div", { class: "modal-head" }, "Your snippets"),
      h("div", { class: "sn-main" },
        h("div", { class: "sn-side" }, search, list,
          h("div", { class: "sn-side-acts" },
            h("button", { class: "btn primary sm", onclick: () => {
              const s = { id: newId(), name: "New snippet", prefix: "snippet" + (snippets.length + 1), lang: create?.lang || A.editor?.getModel()?.getLanguageId() || "*", body: "${1:code}$0", desc: "" };
              snippets.push(s); saveSnippets(); current = s.id; renderList(); renderForm(); form.querySelector("input")?.select();
            } }, icon("plus"), "New"),
            h("button", { class: "btn sm", title: "Import a VS Code snippets file (.json or .code-snippets)", onclick: () => fileIn.click() }, "Import"),
            h("button", { class: "btn sm", title: "Download your snippets in VS Code's format", disabled: !snippets.length, onclick: () => A.downloadBlob(new Blob([toVsSnippets(snippets)], { type: "application/json" }), "dexna.code-snippets") }, "Export"),
            fileIn)),
        form),
      h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => A.closeModal() }, "Close"))));
    if (create && !current) list.closest(".sn-modal").querySelector(".sn-side-acts .btn.primary").click();
    renderList(); renderForm();
  }

  /* =====================================================================
   * Clipboard history
   * ===================================================================== */
  let clips = A.LS.get("clipHistory", []);
  function remember(text) {
    if (!A.settings.clipboardHistory || typeof text !== "string" || !text.trim() || text.length > 100_000) return;
    clips = [{ text, time: Date.now() }, ...clips.filter((c) => c.text !== text)].slice(0, 40);
    A.LS.set("clipHistory", clips);
  }
  function watchClipboard() {
    const grab = (e) => {
      let t = "";
      try { t = e.clipboardData?.getData("text/plain") || ""; } catch (_) {}
      if (!t) {
        const el = document.activeElement;
        if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName) && !el.classList.contains("inputarea") && el.type !== "password") t = el.value.slice(el.selectionStart, el.selectionEnd);
        else t = getSelection()?.toString() || "";
      }
      remember(t);
    };
    // bubble phase, so the editor has already put its text on the clipboard
    window.addEventListener("copy", grab);
    window.addEventListener("cut", grab);
    const cb = navigator.clipboard;
    if (cb?.writeText) { const orig = cb.writeText.bind(cb); try { cb.writeText = (t) => { remember(t); return orig(t); }; } catch (_) {} }
  }
  function pasteFromHistory() {
    const target = activeEditor();
    if (!A.settings.clipboardHistory) return toast("Clipboard history is off (Settings > Editor).");
    if (!clips.length) return toast("Nothing copied yet. Text you copy or cut shows up here.");
    A.quickPick({
      placeholder: "Paste from clipboard history",
      source: (q) => clips.filter((c) => !q || c.text.toLowerCase().includes(q.toLowerCase())).map((c) => {
        const first = c.text.trim().split("\n")[0];
        const n = c.text.split("\n").length;
        return { label: first.length > 90 ? first.slice(0, 90) + "…" : first, desc: (n > 1 ? plural(n, "line") + ", " : "") + ago(c.time), run: () => pasteText(c.text, target) };
      }),
    });
  }
  function pasteText(text, target = activeEditor()) {
    if (!target?.getModel()) { navigator.clipboard?.writeText(text); return toast("Copied to the clipboard"); }
    target.focus();
    target.pushUndoStop();
    target.executeEdits("clipboard-history", target.getSelections().map((sel) => ({ range: sel, text, forceMoveMarkers: true })));
    target.pushUndoStop();
    remember(text);
  }

  /* =====================================================================
   * Local history
   * ===================================================================== */
  const base = new Map(); // path -> text when the model was created or last snapshotted
  const touched = new Set(); // files edited since load (each gets one "before editing" snapshot)
  const lastSnap = new Map(); // path -> time of the last automatic snapshot
  const timers = new Map();
  const SNAP_EVERY = 5 * 60_000;
  let latestCache = new Map(); // path -> latest stored text (to skip duplicates)
  async function snapshot(path, text, reason, { force = false } = {}) {
    if (!A.settings.localHistory || !A.project || text == null || text.length > MAX_SIZE) return;
    const pid = A.project.id;
    if (!force && latestCache.get(pid + "\0" + path) === text) return;
    latestCache.set(pid + "\0" + path, text);
    const s = { id: `${Date.now().toString(36)}-${newId()}`, project: pid, path, time: Date.now(), text, reason };
    await historyStore.put(s);
    const mine = (await historyStore.list(pid)).filter((x) => x.path === path);
    for (const old of mine.slice(PER_FILE)) await historyStore.del(old.id);
  }
  async function primeCache() {
    latestCache = new Map();
    if (!A.project) return;
    const pid = A.project.id;
    for (const s of (await historyStore.list(pid)).reverse()) latestCache.set(pid + "\0" + s.path, s.text);
  }
  function onModelCreated(path) {
    base.set(path, A.project.files[path] ?? "");
    const m = A.models.get(path);
    if (m && A.monaco) registerSnippetsFor(m.getLanguageId());
  }
  function onModelContent(path) {
    if (!touched.has(path)) {
      touched.add(path);
      const before = base.get(path);
      if (before != null && before !== "") snapshot(path, before, "Before editing");
      lastSnap.set(path, Date.now());
    }
    clearTimeout(timers.get(path));
    timers.set(path, setTimeout(() => {
      if (Date.now() - (lastSnap.get(path) || 0) < SNAP_EVERY) return;
      lastSnap.set(path, Date.now());
      snapshot(path, A.textOf(path), "Edited");
    }, 2000));
  }
  function beforeRemove(files) { for (const f of files) if (A.project.files[f] != null) snapshot(f, A.textOf(f), "Deleted", { force: true }); }
  function beforeOverwrite(path, reason) { if (A.project.files[path] != null) return snapshot(path, A.textOf(path), reason); }
  async function timeline(path = A.currentPath()) {
    if (!path) return toast("Open a file first.");
    if (!A.settings.localHistory) return toast("Local history is off (Settings > Editor).");
    const snaps = (await historyStore.list(A.project.id)).filter((s) => s.path === path);
    const now = A.textOf(path);
    if (!snaps.length) return toast(`No local history for ${path} yet. Dexna saves a version when you start editing, every few minutes while you type, and when you press Ctrl+S.`);
    A.quickPick({
      placeholder: `Local history of ${path}: pick a version to compare with the file now`,
      source: () => snaps.map((s) => {
        const st = s.text === now ? null : diffStats(s.text, now);
        return { label: `${s.reason}, ${new Date(s.time).toLocaleString()}`, detail: ago(s.time), desc: st ? `+${st.added} -${st.removed} vs now` : "same as now", run: () => compareSnapshot(s) };
      }),
    });
  }
  function compareSnapshot(s) {
    const when = new Date(s.time).toLocaleString();
    const exists = A.project.files[s.path] != null;
    A.showDiff({
      original: s.text, modified: exists ? A.textOf(s.path) : "", path: s.path, live: exists, title: `${s.path} (local history)`,
      originalLabel: `${s.reason}, ${when}`, modifiedLabel: exists ? "Now" : "Deleted",
      actions: [{ label: "Restore this version", primary: true, run: () => restoreSnapshot(s) }],
    });
  }
  async function restoreSnapshot(s) {
    await beforeOverwrite(s.path, "Before restoring");
    A.closeModal();
    A.writeFiles({ [s.path]: s.text });
    A.openFile(s.path);
    toast(`Restored ${s.path} from ${ago(s.time)}. Ctrl+Z undoes it.`, "ok");
  }
  async function restoreDeleted() {
    const snaps = await historyStore.list(A.project.id);
    const latest = new Map();
    for (const s of snaps) if (A.project.files[s.path] == null && !latest.has(s.path)) latest.set(s.path, s);
    if (!latest.size) return toast("No deleted files to bring back in this project.");
    A.quickPick({
      placeholder: "Bring back a deleted file",
      source: (q) => [...latest.values()].filter((s) => !q || s.path.toLowerCase().includes(q.toLowerCase()))
        .map((s) => ({ iconHtml: A.fileIconSvg(s.path), label: s.path, desc: `${s.reason.toLowerCase()} ${ago(s.time)}`, run: () => { A.writeFiles({ [s.path]: s.text }); A.openFile(s.path); toast(`Brought back ${s.path}`, "ok"); } })),
    });
  }
  async function clearHistory() {
    if (!(await A.confirmDialog({ title: "Clear local history", message: "Delete every saved version of every file in this project? Source Control commits are kept.", okLabel: "Clear", danger: true }))) return;
    await historyStore.delProject(A.project.id);
    latestCache = new Map();
    toast("Local history cleared", "ok");
  }

  /* =====================================================================
   * Hooks
   * ===================================================================== */
  function onEditorReady() {
    registerSnippetProvider();
    watchClipboard();
  }
  function onProjectLoaded() {
    closeSplit({ remember: true });
    base.clear(); touched.clear(); lastSnap.clear();
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
    primeCache();
    for (const p of A.models.keys()) base.set(p, A.project.files[p] ?? "");
    const want = A.LS.get("split:" + A.project.id, null);
    if (want && A.project.files[want] != null && innerWidth >= 700) setTimeout(() => { openSplit(want); A.editor?.focus(); }, 0);
  }
  function onFilesChanged() {
    if (!splitOpen()) return;
    if (A.project.files[split.path] == null) closeSplit(); else fillSplitSelect();
  }
  function onSetting() { split.editor?.updateOptions({ ...A.editorOptions(), minimap: { enabled: false } }); }
  async function onSave() {
    const p = A.currentPath();
    if (p) { lastSnap.set(p, Date.now()); snapshot(p, A.textOf(p), "Saved"); }
    if (A.settings.runOnSave && p && A.isRunnable(p)) A.run();
  }
  function onRename(from, to) {
    if (split.path === from) { split.path = to; fillSplitSelect(); }
    if (base.has(from)) { base.set(to, base.get(from)); base.delete(from); }
    if (touched.delete(from)) touched.add(to);
  }

  const commands = [
    { id: "split", label: "Split Editor Right", cat: "View", kb: "ctrl+\\", run: toggleSplit },
    { id: "split-swap", label: "Swap Split Editors", cat: "View", run: swapSplit },
    { id: "split-close", label: "Close Split Editor", cat: "View", run: () => closeSplit() },
    { id: "split-focus", label: "Focus Other Editor", cat: "View", run: () => { if (!splitOpen()) return openSplit(); (split.focused ? ed() : split.editor).focus(); } },
    { id: "snippets", label: "Configure User Snippets", cat: "Edit", run: () => manageSnippets() },
    { id: "snippet-insert", label: "Insert Snippet...", cat: "Edit", run: pickSnippet },
    { id: "snippet-save", label: "Save Selection as Snippet", cat: "Edit", run: saveSelectionAsSnippet },
    { id: "clip-paste", label: "Paste from Clipboard History", cat: "Edit", kb: "ctrl+shift+alt+v", run: pasteFromHistory },
    { id: "clip-clear", label: "Clear Clipboard History", cat: "Edit", run: () => { clips = []; A.LS.set("clipHistory", clips); toast("Clipboard history cleared", "ok"); } },
    { id: "lh-timeline", label: "Local History: Show File Versions", cat: "File", run: () => timeline() },
    { id: "lh-deleted", label: "Local History: Bring Back a Deleted File", cat: "File", run: restoreDeleted },
    { id: "lh-clear", label: "Local History: Clear for This Project", cat: "File", run: clearHistory },
    { id: "run-on-save", label: "Toggle Run on Save", cat: "Run", run: () => { A.setSetting("runOnSave", !A.settings.runOnSave); toast(A.settings.runOnSave ? "Ctrl+S now also runs the file" : "Run on save is off"); } },
  ];

  return {
    commands, onEditorReady, onProjectLoaded, onModelCreated, onModelContent, onFilesChanged, onSetting, onSave, onRename,
    beforeRemove, beforeOverwrite, openSplit, closeSplit, splitOpen, timeline, restoreDeleted, manageSnippets, insertSnippet,
    reset: () => historyStore.delProject(A.project?.id).catch(() => {}),
    deleteProject: (id) => historyStore.delProject(id).catch(() => {}),
    get splitEditor() { return split.editor; },
  };
}
