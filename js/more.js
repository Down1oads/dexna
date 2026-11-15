// Navigation history (back / forward / last edit), symbols across the whole project, your own keyboard
// shortcuts, your own colour themes, and colour swatches in any file.
import { THEMES, THEME_BY_ID, PALETTE_KEYS, registerCustomTheme, removeCustomTheme, monacoTheme } from "./themes.js";

/* =====================================================================
 * Colours in code (exported for tests)
 * ===================================================================== */
const COLOR_RE = /(["'`])?#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![0-9a-z_-])|\b(rgba?|hsla?)\(\s*([^()]{1,60}?)\s*\)/gi;
/** Colours written in text: hex (#rrggbb, #rrggbbaa, and #rgb only inside quotes), rgb(), rgba(), hsl(), hsla(). */
export function findColors(text, { max = 500 } = {}) {
  const out = [];
  COLOR_RE.lastIndex = 0;
  let m;
  while ((m = COLOR_RE.exec(text)) && out.length < max) {
    let color = null, start = m.index;
    if (m[2]) {
      if (m[2].length <= 4 && !m[1]) continue; // "#123" in a comment is an issue number, not a colour
      if (m[1]) start += 1;
      color = parseHex(m[2]);
    } else color = parseFunc(m[3].toLowerCase(), m[4]);
    if (color) out.push({ start, end: m.index + m[0].length, color, format: m[2] ? "hex" : m[3].toLowerCase().replace(/a$/, "") });
  }
  return out;
}
function parseHex(h) {
  if (h.length <= 4) h = [...h].map((c) => c + c).join("");
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { red: n(0), green: n(2), blue: n(4), alpha: h.length === 8 ? n(6) : 1 };
}
function parseFunc(fn, args) {
  const parts = args.split(/\s*[,/]\s*|\s+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const num = (s, scale) => { const v = parseFloat(s); if (!Number.isFinite(v)) return NaN; return s.endsWith("%") ? v / 100 : v / scale; };
  const alpha = parts[3] != null ? num(parts[3], 1) : 1;
  if (fn.startsWith("rgb")) {
    const [r, g, b] = parts.slice(0, 3).map((p) => num(p, 255));
    if ([r, g, b, alpha].some((v) => !(v >= 0 && v <= 1))) return null;
    return { red: r, green: g, blue: b, alpha };
  }
  const hue = parseFloat(parts[0]), s = num(parts[1], 100), l = num(parts[2], 100);
  if (!Number.isFinite(hue) || [s, l, alpha].some((v) => !(v >= 0 && v <= 1))) return null;
  const k = (n) => (n + hue / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { red: f(0), green: f(8), blue: f(4), alpha };
}
/** Write a colour back in the format the code used. */
export function formatColor({ red, green, blue, alpha }, format) {
  const r = Math.round(red * 255), g = Math.round(green * 255), b = Math.round(blue * 255);
  const a = Math.round(alpha * 100) / 100;
  if (format === "rgb") return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
  if (format === "hsl") {
    const max = Math.max(red, green, blue), min = Math.min(red, green, blue), l = (max + min) / 2, d = max - min;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = max === red ? ((green - blue) / d) % 6 : max === green ? (blue - red) / d + 2 : (red - green) / d + 4;
      h = Math.round(h * 60); if (h < 0) h += 360;
    }
    const pct = (v) => Math.round(v * 100) + "%";
    return a < 1 ? `hsla(${h}, ${pct(s)}, ${pct(l)}, ${a})` : `hsl(${h}, ${pct(s)}, ${pct(l)})`;
  }
  const hx = (v) => v.toString(16).padStart(2, "0");
  return "#" + hx(r) + hx(g) + hx(b) + (a < 1 ? hx(Math.round(alpha * 255)) : "");
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const RESERVED = new Set(["ctrl+w", "ctrl+t", "ctrl+n", "ctrl+shift+t", "ctrl+shift+n", "ctrl+shift+w", "ctrl+tab", "ctrl+shift+tab", "alt+f4", "ctrl+q"]);

export function createMore(A) {
  const { h, icon, toast } = A;
  const ed = () => A.editor;

  /* =====================================================================
   * Navigation history
   * ===================================================================== */
  const nav = { back: [], forward: [], cur: null, moving: false, lastEdit: null };
  const here = () => { const p = A.currentPath(), pos = ed()?.getPosition(); return p && pos ? { path: p, line: pos.lineNumber, col: pos.column } : null; };
  function trackCursor() {
    if (nav.moving) { nav.cur = here(); return; }
    const now = here();
    if (!now) return;
    const c = nav.cur;
    if (c && (c.path !== now.path || Math.abs(c.line - now.line) > 10)) {
      nav.back.push(c);
      if (nav.back.length > 50) nav.back.shift();
      nav.forward = [];
      updateNavState();
    }
    nav.cur = now;
  }
  async function go(target) {
    nav.moving = true;
    try { await A.openFile(target.path, { line: target.line, col: target.col }); } finally { nav.moving = false; nav.cur = here(); updateNavState(); }
  }
  const alive = (loc) => loc && A.project.files[loc.path] != null;
  function goBack() {
    while (nav.back.length && !alive(nav.back.at(-1))) nav.back.pop();
    const t = nav.back.pop();
    if (!t) return toast("Nothing to go back to.");
    if (nav.cur) nav.forward.push(nav.cur);
    go(t);
  }
  function goForward() {
    while (nav.forward.length && !alive(nav.forward.at(-1))) nav.forward.pop();
    const t = nav.forward.pop();
    if (!t) return toast("Nothing to go forward to.");
    if (nav.cur) nav.back.push(nav.cur);
    go(t);
  }
  function goLastEdit() {
    if (!alive(nav.lastEdit)) return toast("No edits yet.");
    if (nav.cur) { nav.back.push(nav.cur); nav.forward = []; }
    go(nav.lastEdit);
  }
  function updateNavState() {
    document.getElementById("nav-back")?.toggleAttribute("disabled", !nav.back.length);
    document.getElementById("nav-fwd")?.toggleAttribute("disabled", !nav.forward.length);
  }

  /* =====================================================================
   * Symbols across the project
   * ===================================================================== */
  const index = new Map(); // path -> { text, syms }
  let indexing = null, indexTimer = null;
  async function refreshIndex() {
    if (indexing) return indexing;
    indexing = (async () => {
      const files = Object.keys(A.project?.files || {}).slice(0, 400);
      for (const p of [...index.keys()]) if (!files.includes(p)) index.delete(p);
      for (const p of files) {
        const text = A.textOf(p);
        if (index.get(p)?.text === text || text.length > 400_000) continue;
        let model = A.models.get(p), temp = null;
        if (!model) {
          const lang = A.langOf(p);
          if (!lang || lang === "plaintext" || lang === "markdown" || lang === "json") { index.set(p, { text, syms: [] }); continue; }
          model = temp = A.monaco.editor.createModel(text, lang);
        }
        try { const syms = await A.symbolsOf(model); if (syms) index.set(p, { text, syms }); } catch (_) {}
        temp?.dispose();
      }
    })().finally(() => { indexing = null; });
    return indexing;
  }
  const scheduleIndex = () => { clearTimeout(indexTimer); indexTimer = setTimeout(refreshIndex, 2500); };
  function symbolItems(q) {
    const all = [];
    const walk = (p, list, parent) => list.forEach((s) => { all.push({ p, s, parent }); walk(p, s.children || [], s.name); });
    for (const [p, { syms }] of index) walk(p, syms, null);
    if (!all.length) return [{ label: indexing ? "Finding symbols..." : "No symbols found yet. Functions, classes and variables from every file show up here.", run: () => {} }];
    return all.map((x) => ({ ...x, m: A.fuzzy(q, x.s.name) })).filter((x) => x.m).sort((a, b) => b.m.score - a.m.score).slice(0, 300)
      .map(({ p, s, parent, m }) => ({ iconHtml: A.symIconHtml(s.kind), label: s.name, labelHtml: A.highlight(s.name, m.idx), detail: parent ? "in " + parent : "", desc: `${p}:${s.line}`, run: () => A.openFile(p, { line: s.line, col: s.col || 1 }) }));
  }
  async function projectSymbols() {
    const t = setTimeout(() => toast("Finding symbols in every file..."), 400);
    await refreshIndex();
    clearTimeout(t);
    A.quickOpen("#");
  }

  /* =====================================================================
   * Your own keyboard shortcuts
   * ===================================================================== */
  function pickCommandToRebind() {
    A.quickPick({
      placeholder: "Pick a command to give it a keyboard shortcut",
      source: (q) => A.commands().filter((c) => !c.hidden && !(c.kb || "").includes(" "))
        .map((c) => ({ c, m: A.fuzzy(q, (c.cat ? c.cat + ": " : "") + c.label) })).filter((x) => x.m).sort((a, b) => b.m.score - a.m.score)
        .map(({ c, m }) => ({ label: (c.cat ? c.cat + ": " : "") + c.label, labelHtml: A.highlight((c.cat ? c.cat + ": " : "") + c.label, m.idx), desc: (c.kb ? A.kbLabel(c.kb) : "no shortcut") + (c.kb !== c.defaultKb ? " (changed)" : ""), run: () => captureShortcut(c) })),
    });
  }
  function captureShortcut(cmd) {
    let combo = null;
    const keys = h("div", { class: "ks-keys" }, h("span", { class: "muted" }, "Press the keys now"));
    const note = h("div", { class: "ks-note muted small" });
    const save = h("button", { class: "btn primary", disabled: true, onclick: () => { apply(combo); } }, "Save");
    const onKey = (e) => {
      if (e.key === "Escape" && !e.ctrlKey && !e.altKey && !e.shiftKey) return; // Esc still closes the dialog
      e.preventDefault(); e.stopPropagation();
      const c = A.comboOf(e);
      if (!c) return;
      combo = c;
      keys.replaceChildren(h("kbd", {}, A.kbLabel(c)));
      const clash = A.commands().find((x) => x !== cmd && x.kb && A.normKb(x.kb) === c);
      note.className = "ks-note small " + (RESERVED.has(c) ? "warn" : "muted");
      note.textContent = RESERVED.has(c) ? "The browser keeps this shortcut for itself, so it would not reach Dexna. Pick another one."
        : clash ? `${clash.label} uses this now. Saving moves it here, and ${clash.label} will have no shortcut.`
        : !/^(ctrl|alt|f\d)/.test(c) && !/^f\d+$/.test(c) ? "A shortcut without Ctrl or Alt would get in the way of typing. Add Ctrl or Alt." : "";
      save.disabled = RESERVED.has(c) || (!/^(ctrl|alt)/.test(c) && !/^(shift\+)?f\d+$/.test(c));
    };
    window.addEventListener("keydown", onKey, true);
    const apply = (kb) => {
      if (kb) for (const x of A.commands()) if (x !== cmd && x.kb && A.normKb(x.kb) === A.normKb(kb)) A.setKeybinding(x.id, null);
      A.setKeybinding(cmd.id, kb);
      A.closeModal();
      toast(kb ? `${cmd.label}: ${A.kbLabel(kb)}` : `${cmd.label} has no shortcut now`, "ok");
    };
    A.openModal(h("div", { class: "modal ks-modal" },
      h("div", { class: "modal-head" }, cmd.label),
      h("div", { class: "modal-body" },
        h("p", {}, cmd.kb ? `Now: ${A.kbLabel(cmd.kb)}${cmd.defaultKb && cmd.kb !== cmd.defaultKb ? ` (originally ${A.kbLabel(cmd.defaultKb)})` : ""}` : "No shortcut yet."),
        keys, note),
      h("div", { class: "modal-foot" },
        cmd.kb ? h("button", { class: "btn", style: { marginRight: "auto" }, onclick: () => apply(null) }, "Remove shortcut") : null,
        cmd.defaultKb && cmd.kb !== cmd.defaultKb ? h("button", { class: "btn", onclick: () => apply(cmd.defaultKb) }, "Reset") : null,
        h("button", { class: "btn", onclick: () => A.closeModal() }, "Cancel"), save)),
    () => window.removeEventListener("keydown", onKey, true));
  }
  async function resetShortcuts() {
    if (!(await A.confirmDialog({ title: "Reset keyboard shortcuts", message: "Put every keyboard shortcut back the way it came?", okLabel: "Reset" }))) return;
    for (const c of A.commands()) if (c.kb !== c.defaultKb) A.setKeybinding(c.id, c.defaultKb ?? null);
    A.LS.del("keybindings");
    toast("Keyboard shortcuts reset", "ok");
  }

  /* =====================================================================
   * Your own colour themes
   * ===================================================================== */
  const KEY_LABEL = { bg: "Background", fg: "Text", accent: "Accent (selection, buttons)", comment: "Comments", keyword: "Keywords", string: "Strings", number: "Numbers", type: "Types", func: "Functions", operator: "Operators", constant: "Constants", err: "Errors", warn: "Warnings", ok: "Success", info: "Information" };
  const saveThemes = () => A.LS.set("customThemes", THEMES.filter((t) => t.custom).map(({ id, name, type, c }) => ({ id, name, type, c })));
  const defineTheme = (t) => A.monaco?.editor.defineTheme(t.id, monacoTheme(t));
  function editTheme(base = THEME_BY_ID[A.currentThemeId()]) {
    const editing = base?.custom ? base : null;
    const before = A.settings.theme;
    const draft = { id: editing ? editing.id : "custom-" + Date.now().toString(36), name: editing ? editing.name : `${base.name} (mine)`, type: base.type, c: { ...base.c } };
    let saved = false;
    const preview = () => { const t = registerCustomTheme(draft); if (!t) return; defineTheme(t); A.setSetting("theme", t.id); };
    const name = h("input", { value: draft.name, maxlength: 40, oninput: () => { draft.name = name.value || "My theme"; } });
    const type = h("select", { onchange: () => { draft.type = type.value; preview(); } }, h("option", { value: "dark" }, "Dark"), h("option", { value: "light" }, "Light"));
    type.value = draft.type;
    const rows = PALETTE_KEYS.map((k) => {
      const pick = h("input", { type: "color", value: draft.c[k] });
      const txt = h("input", { class: "te-hex", value: draft.c[k], spellcheck: "false", maxlength: 7 });
      pick.addEventListener("input", () => { draft.c[k] = pick.value; txt.value = pick.value; preview(); });
      txt.addEventListener("change", () => { const v = txt.value.trim().toLowerCase(); if (/^#[0-9a-f]{6}$/.test(v)) { draft.c[k] = v; pick.value = v; preview(); } else txt.value = draft.c[k]; });
      return h("label", { class: "te-row" }, pick, txt, h("span", {}, KEY_LABEL[k]));
    });
    const sample = h("div", { class: "muted small" }, "Changes show in the whole app as you pick them. Dexna nudges any colour that would be hard to read.");
    A.openModal(h("div", { class: "modal te-modal" },
      h("div", { class: "modal-head" }, editing ? "Edit color theme" : "New color theme"),
      h("div", { class: "modal-body" },
        h("div", { class: "te-top" }, h("label", { class: "sn-field" }, h("span", {}, "Name"), name), h("label", { class: "sn-field" }, h("span", {}, "Kind"), type)),
        sample,
        h("div", { class: "te-grid" }, rows)),
      h("div", { class: "modal-foot" },
        editing ? h("button", { class: "btn danger-text", style: { marginRight: "auto" }, onclick: async () => {
          saved = true; A.closeModal();
          if (!(await A.confirmDialog({ title: "Delete theme", message: `Delete "${editing.name}"?`, okLabel: "Delete", danger: true }))) return;
          removeCustomTheme(editing.id); saveThemes();
          for (const k of ["darkTheme", "lightTheme"]) if (A.settings[k] === editing.id) A.settings[k] = k === "darkTheme" ? "dexna-dark" : "dexna-light";
          A.setSetting("theme", editing.type === "light" ? "dexna-light" : "dexna-dark");
        } }, "Delete") : null,
        h("button", { class: "btn", title: "Copy the theme as text to share it", onclick: () => navigator.clipboard?.writeText(JSON.stringify({ name: draft.name, type: draft.type, colors: draft.c }, null, 2)).then(() => toast("Theme copied. Paste it into Import Color Theme on another device.", "ok")) }, "Copy"),
        h("button", { class: "btn", onclick: () => A.closeModal() }, "Cancel"),
        h("button", { class: "btn primary", onclick: () => {
          const t = registerCustomTheme(draft); if (!t) return toast("Every color needs to be a hex value like #1e1e2e.", "error");
          saved = true; defineTheme(t); saveThemes(); A.setSetting("theme", t.id); A.closeModal(); toast(`Saved "${t.name}"`, "ok");
        } }, "Save"))),
    () => {
      if (saved) return;
      // cancelled: put the old theme back and forget the draft
      if (editing) { registerCustomTheme(editing); defineTheme(editing); } else removeCustomTheme(draft.id);
      A.setSetting("theme", THEME_BY_ID[before] || before === "auto" ? before : "dexna-dark");
    });
    preview();
    name.select();
  }
  async function importTheme() {
    const text = await A.promptDialog({ title: "Import color theme", message: "Paste a theme copied from Dexna's theme editor.", placeholder: '{ "name": ..., "colors": { ... } }', okLabel: "Import" });
    if (!text) return;
    try {
      const d = JSON.parse(text);
      const t = registerCustomTheme({ id: "custom-" + Date.now().toString(36), name: d.name, type: d.type, c: d.colors || d.c });
      if (!t) throw new Error("it is missing some colors");
      defineTheme(t); saveThemes(); A.setSetting("theme", t.id); toast(`Imported "${t.name}"`, "ok");
    } catch (e) { toast("Could not import that theme: " + e.message, "error"); }
  }

  /* =====================================================================
   * Colour swatches in every language
   * ===================================================================== */
  const OWN_COLORS = new Set(["css", "scss", "less"]); // Monaco already does these
  const colorLangs = new Set();
  function registerColorsFor(lang) {
    if (colorLangs.has(lang) || OWN_COLORS.has(lang)) return;
    colorLangs.add(lang);
    A.monaco.languages.registerColorProvider(lang, {
      provideDocumentColors(model) {
        if (!A.settings.colorSwatches || model.getValueLength() > 300_000) return [];
        const text = model.getValue();
        return findColors(text).map((c) => {
          const s = model.getPositionAt(c.start), e = model.getPositionAt(c.end);
          return { color: c.color, range: { startLineNumber: s.lineNumber, startColumn: s.column, endLineNumber: e.lineNumber, endColumn: e.column } };
        });
      },
      provideColorPresentations(model, info) {
        const old = model.getValueInRange(info.range).toLowerCase();
        const fmt = old.startsWith("#") ? "hex" : old.startsWith("hsl") ? "hsl" : "rgb";
        const first = formatColor(info.color, fmt);
        return [first, ...["hex", "rgb", "hsl"].filter((f) => f !== fmt).map((f) => formatColor(info.color, f))].map((label) => ({ label }));
      },
    });
  }

  /* =====================================================================
   * Hooks
   * ===================================================================== */
  function onEditorReady() {
    const e = ed();
    e.onDidChangeCursorPosition(trackCursor);
    for (const l of A.monaco.languages.getLanguages()) registerColorsFor(l.id);
    // mouse back / forward buttons
    window.addEventListener("mouseup", (ev) => { if (ev.button === 3) { ev.preventDefault(); goBack(); } else if (ev.button === 4) { ev.preventDefault(); goForward(); } });
    // back / forward buttons after the menus
    const menus = document.getElementById("menus");
    if (menus && !document.getElementById("nav-back")) {
      const box = h("div", { class: "nav-btns" },
        h("button", { class: "btn icon sm", id: "nav-back", disabled: true, title: `Go back${isMac ? "" : " (Alt+Left)"}`, onclick: goBack }, icon("arrowLeft")),
        h("button", { class: "btn icon sm", id: "nav-fwd", disabled: true, title: `Go forward${isMac ? "" : " (Alt+Right)"}`, onclick: goForward }, icon("arrowRight")));
      menus.after(box);
    }
    refreshIndex();
  }
  function onModelCreated(path) { const m = A.models.get(path); if (m && A.monaco) registerColorsFor(m.getLanguageId()); }
  function onModelContent(path) {
    const pos = ed()?.getModel() === A.models.get(path) ? ed().getPosition() : null;
    if (pos) nav.lastEdit = { path, line: pos.lineNumber, col: pos.column };
    scheduleIndex();
  }
  function onProjectLoaded() { nav.back = []; nav.forward = []; nav.cur = null; nav.lastEdit = null; index.clear(); updateNavState(); scheduleIndex(); }
  function onRename(from, to) {
    for (const l of [...nav.back, ...nav.forward, nav.cur, nav.lastEdit]) if (l && l.path === from) l.path = to;
    if (index.has(from)) { index.set(to, index.get(from)); index.delete(from); }
  }

  const commands = [
    { id: "nav-back", label: "Go Back", cat: "Go", kb: isMac ? undefined : "alt+left", run: goBack },
    { id: "nav-forward", label: "Go Forward", cat: "Go", kb: isMac ? undefined : "alt+right", run: goForward },
    { id: "nav-last-edit", label: "Go to Last Edit Location", cat: "Go", run: goLastEdit },
    { id: "project-symbols", label: "Go to Symbol in Project...", cat: "Go", kb: "ctrl+alt+o", run: projectSymbols },
    { id: "keys-change", label: "Change Keyboard Shortcut...", cat: "Preferences", run: pickCommandToRebind },
    { id: "keys-reset", label: "Reset Keyboard Shortcuts", cat: "Preferences", run: resetShortcuts },
    { id: "theme-new", label: "Create Color Theme...", cat: "Preferences", run: () => editTheme(THEME_BY_ID[A.currentThemeId()]?.custom ? { ...THEME_BY_ID[A.currentThemeId()], custom: false } : undefined) },
    { id: "theme-edit", label: "Edit Color Theme...", cat: "Preferences", run: () => editTheme() },
    { id: "theme-import", label: "Import Color Theme...", cat: "Preferences", run: importTheme },
  ];
  return { commands, onEditorReady, onModelCreated, onModelContent, onProjectLoaded, onRename, symbolItems, refreshIndex, editTheme, captureShortcut, nav };
}
