// Settings as JSON (with completion, hover docs and validation from the settings list), per-project settings,
// settings profiles, and the glob matching behind "files to hide" and "file associations".

/* =====================================================================
 * Globs (exported for tests)
 * ===================================================================== */
/** A glob like "*.log", "**\/__pycache__/**" or "build/*" as a RegExp over project paths. A pattern without "/" matches the name anywhere. */
export function globToRegExp(glob) {
  let g = glob.trim().replace(/^\.\//, "").replace(/^\//, "");
  const anywhere = !g.includes("/"); // decided before "dir/**" loses its slash
  if (g.endsWith("/**")) g = g.slice(0, -3); // "dir/**" is the folder and everything in it
  if (!g) return null;
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") { re += g[i + 2] === "/" ? "(?:.*/)?" : ".*"; i += g[i + 2] === "/" ? 2 : 1; }
      else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (c === "{") { const end = g.indexOf("}", i); if (end > i) { re += "(?:" + g.slice(i + 1, end).split(",").map((x) => x.replace(/[.+^$()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")).join("|") + ")"; i = end; } else re += "\\{"; }
    else re += c.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  // "dir/**" also matches the folder itself; a folder pattern hides everything inside it
  return new RegExp((anywhere ? "(?:^|/)" : "^") + re + "(?:/.*)?$");
}
export function splitPatterns(text) { return String(text || "").split(/\n|,(?![^{]*\})/).map((x) => x.trim()).filter(Boolean); } // commas inside {a,b} stay
export function makeMatcher(text) {
  const res = splitPatterns(text).map(globToRegExp).filter(Boolean);
  return res.length ? (path) => res.some((r) => r.test(path)) : () => false;
}

/** Settings a project may override (they travel with the project). */
export const PROJECT_KEYS = ["tabSize", "useTabs", "langTabSize", "wordWrap", "rulers", "formatOnSave", "trimOnSave", "finalNewline", "runOnSave", "lineLength",
  "autoLint", "autoInstall", "clearOnRun", "filesExclude", "fileAssociations", "renderWhitespace", "inlayHints", "autoSave"];

const PRESENTATION = { fontSize: 20, uiFontSize: 15, terminalFontSize: 17, minimap: false, wordWrap: true, density: "comfortable", lineNumbers: "on", bgEffect: "none", screenFilter: "none",
  codeGlow: "off", powerMode: false, cursorEffect: "none", cursorTrail: false, typingSound: "off", ambient: "off", stickyScroll: false, focusMode: "off", chroma: false };

export function createPrefs(A) {
  const { h, toast } = A;

  /* ---------------- JSON schema from the settings list ---------------- */
  function schemaFor(keys) {
    const props = {};
    for (const sd of A.SETTINGS_SCHEMA) {
      if (!(sd.key in A.DEFAULT_SETTINGS) || (keys && !keys.includes(sd.key))) continue;
      const def = A.DEFAULT_SETTINGS[sd.key];
      const base = { description: `${sd.label}. ${sd.desc}`.replace(/\s+/g, " "), default: def };
      let p;
      const opts = typeof sd.options === "function" ? null : sd.options;
      switch (sd.type) {
        case "bool": p = { type: "boolean" }; break;
        case "number": case "range": p = { type: "number", minimum: sd.min, maximum: sd.max }; break;
        case "select": p = opts ? { enum: opts.map(([v]) => v), enumDescriptions: opts.map(([, l]) => l) } : {}; break;
        case "theme": p = { enum: ["auto", ...A.themes().map((t) => t.id)], enumDescriptions: ["Follow system", ...A.themes().map((t) => t.name)] }; break;
        case "color": p = { type: "string", pattern: "^(#[0-9a-fA-F]{6})?$", patternErrorMessage: "A color like #4c8dff, or an empty string for the default" }; break;
        case "checks": p = { type: "array", items: { type: "string" }, uniqueItems: true }; break;
        case "langmap": p = { type: "object", additionalProperties: { enum: [2, 4, 8] } }; break;
        case "assoc": p = { type: "object", additionalProperties: { type: "string" }, markdownDescription: "File pattern to language id, for example `{ \"*.mdx\": \"markdown\" }`" }; break;
        default: p = { type: typeof def === "number" ? "number" : typeof def === "boolean" ? "boolean" : "string" };
      }
      props[sd.key] = { ...p, ...base };
    }
    return { type: "object", properties: props, additionalProperties: false };
  }
  let schemaSet = false;
  function registerSchemas() {
    if (schemaSet) return;
    schemaSet = true;
    const json = A.monaco.languages.json;
    const cur = json.jsonDefaults.diagnosticsOptions || {};
    json.jsonDefaults.setDiagnosticsOptions({
      ...cur, validate: true, enableSchemaRequest: false, schemaValidation: "error",
      schemas: [...(cur.schemas || []).filter((s) => !/dexna\.local/.test(s.uri)),
        { uri: "https://dexna.local/schemas/user-settings.json", fileMatch: ["dexna-settings://user/settings.json"], schema: schemaFor(null) },
        { uri: "https://dexna.local/schemas/project-settings.json", fileMatch: ["dexna-settings://project/settings.json"], schema: schemaFor(PROJECT_KEYS) }],
    });
  }

  /* ---------------- a JSON editor in a dialog ---------------- */
  function jsonDialog({ title, hint, uri, value, onSave }) {
    registerSchemas();
    const monaco = A.monaco;
    const model = monaco.editor.createModel(value, "json", monaco.Uri.parse(uri));
    const host = h("div", { class: "pj-host" });
    const status = h("span", { class: "pj-status muted small" });
    let ed = null;
    const save = () => {
      let data;
      try { data = JSON.parse(model.getValue() || "{}"); } catch (e) { status.textContent = "Fix the JSON first: " + e.message; status.classList.add("err"); return; }
      if (!data || typeof data !== "object" || Array.isArray(data)) { status.textContent = "The settings must be an object: { ... }"; return; }
      const errors = monaco.editor.getModelMarkers({ resource: model.uri }).filter((m) => m.severity === monaco.MarkerSeverity.Error);
      if (errors.length) { status.textContent = `Fix ${errors.length} problem${errors.length > 1 ? "s" : ""} first (line ${errors[0].startLineNumber}: ${errors[0].message})`; status.classList.add("err"); return; }
      A.closeModal();
      onSave(data);
    };
    A.openModal(h("div", { class: "modal pj-modal" },
      h("div", { class: "modal-head" }, title),
      h("div", { class: "pj-hint muted small" }, hint),
      host,
      h("div", { class: "modal-foot" }, status, h("button", { class: "btn", onclick: () => A.closeModal() }, "Cancel"), h("button", { class: "btn primary", onclick: save }, "Save"))),
    () => { ed?.dispose(); model.dispose(); });
    ed = monaco.editor.create(host, { model, automaticLayout: true, minimap: { enabled: false }, fontSize: A.settings.fontSize, tabSize: 2, scrollBeyondLastLine: false, fixedOverflowWidgets: true, quickSuggestions: { strings: true, other: true }, padding: { top: 8 } });
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, save);
    const updateStatus = () => { const n = monaco.editor.getModelMarkers({ resource: model.uri }).filter((m) => m.severity >= monaco.MarkerSeverity.Warning).length; status.classList.remove("err"); status.textContent = n ? `${n} problem${n > 1 ? "s" : ""}` : "Ctrl+S saves"; };
    monaco.editor.onDidChangeMarkers((uris) => { if (uris.some((u) => u.toString() === model.uri.toString())) updateStatus(); });
    updateStatus();
    const lines = model.getLineCount();
    setTimeout(() => { ed.focus(); ed.setPosition({ lineNumber: Math.max(1, lines - 1), column: model.getLineMaxColumn(Math.max(1, lines - 1)) }); }, 30);
  }

  /** Your settings as you set them (the project's overrides left out). */
  const userValues = () => A.userSettings();
  function changedOnly(obj, keys) {
    const out = {};
    for (const k of keys || Object.keys(A.DEFAULT_SETTINGS)) if (k in obj && JSON.stringify(obj[k]) !== JSON.stringify(A.DEFAULT_SETTINGS[k])) out[k] = obj[k];
    return out;
  }
  function openUserJson() {
    const cur = changedOnly(userValues());
    jsonDialog({
      title: "Settings (JSON)", uri: "dexna-settings://user/settings.json",
      hint: "Only the settings you changed are listed. Type a quote for suggestions, hover a name to see what it does. Remove a line to put that setting back to its default.",
      value: JSON.stringify(cur, null, 2).replace(/^\{\}$/, "{\n  \n}") + "\n",
      onSave: (data) => {
        const unknown = Object.keys(data).filter((k) => !(k in A.DEFAULT_SETTINGS));
        let n = 0;
        const now = userValues();
        for (const k of Object.keys(A.DEFAULT_SETTINGS)) {
          const target = k in data ? data[k] : A.DEFAULT_SETTINGS[k];
          if (JSON.stringify(now[k]) !== JSON.stringify(target)) { A.setSetting(k, target); n++; }
        }
        toast(n ? `Saved ${n} change${n > 1 ? "s" : ""}` : "No changes", "ok");
        if (unknown.length) toast(`Ignored unknown setting${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}`, "warn", 5000);
      },
    });
  }
  function openProjectJson() {
    const p = A.project;
    jsonDialog({
      title: `Project settings: ${p.name}`, uri: "dexna-settings://project/settings.json",
      hint: "These override your own settings in this project only, and travel with it (in ZIP downloads and share links). For example: { \"tabSize\": 2, \"rulers\": \"80\", \"trimOnSave\": true }",
      value: JSON.stringify(p.settings || {}, null, 2).replace(/^\{\}$/, "{\n  \n}") + "\n",
      onSave: (data) => {
        const clean = {};
        for (const [k, v] of Object.entries(data)) if (PROJECT_KEYS.includes(k)) clean[k] = v;
        const dropped = Object.keys(data).filter((k) => !PROJECT_KEYS.includes(k));
        p.settings = clean;
        A.persist();
        A.applyProjectSettings();
        toast(Object.keys(clean).length ? `This project now overrides ${Object.keys(clean).length} setting${Object.keys(clean).length > 1 ? "s" : ""}` : "This project uses your own settings", "ok");
        if (dropped.length) toast(`Not project settings (ignored): ${dropped.join(", ")}`, "warn", 5000);
      },
    });
  }

  /* ---------------- profiles ---------------- */
  let profiles = A.LS.get("profiles", {});
  const active = () => A.LS.get("profile", "Default");
  let sbEl = null;
  function updateStatus() {
    if (!sbEl) { sbEl = h("span", { class: "sb-item clickable", id: "sb-profile", title: "Settings profile. Click to switch.", onclick: () => pickProfile() }); document.querySelector("#statusbar .left")?.append(sbEl); }
    const name = active();
    sbEl.classList.toggle("hidden", name === "Default");
    sbEl.replaceChildren(A.icon("user"), h("span", {}, name));
  }
  function applyAll(target) {
    const now = userValues();
    for (const k of Object.keys(A.DEFAULT_SETTINGS)) {
      const v = k in target ? target[k] : A.DEFAULT_SETTINGS[k];
      if (JSON.stringify(now[k]) !== JSON.stringify(v)) A.setSetting(k, v);
    }
  }
  function switchProfile(name) {
    const from = active();
    if (name === from) return;
    profiles[from] = changedOnly(userValues());
    let target = profiles[name];
    if (!target && name === "Presentation") target = changedOnly({ ...userValues(), ...PRESENTATION });
    if (!target) target = changedOnly(userValues());
    profiles[name] = target;
    A.LS.set("profiles", profiles);
    A.LS.set("profile", name);
    applyAll(target);
    updateStatus();
    toast(`Profile: ${name}`, "ok");
  }
  async function newProfile() {
    const name = (await A.promptDialog({ title: "New profile", message: "It starts as a copy of your current settings. Change anything, and switch between profiles from the status bar or with Profiles: Switch Profile.", placeholder: "For example: Teaching", okLabel: "Create" }))?.trim();
    if (!name) return;
    if (profiles[name] || name === "Default") return toast("A profile with that name exists already.", "error");
    profiles[active()] = changedOnly(userValues());
    profiles[name] = changedOnly(userValues());
    A.LS.set("profiles", profiles);
    A.LS.set("profile", name);
    updateStatus();
    toast(`Created and switched to "${name}"`, "ok");
  }
  function pickProfile() {
    const names = [...new Set(["Default", ...Object.keys(profiles), "Presentation"])];
    A.quickPick({
      placeholder: `Switch settings profile (now: ${active()})`,
      source: (q) => [
        ...names.filter((n) => !q || n.toLowerCase().includes(q.toLowerCase())).map((n) => ({ label: n, detail: n === "Presentation" && !profiles[n] ? "large text and no effects, for screen sharing" : "", desc: n === active() ? "current" : "", run: () => switchProfile(n) })),
        { label: "New profile from current settings...", run: newProfile },
        ...(Object.keys(profiles).some((n) => n !== "Default" && n !== active()) ? [{ label: "Delete a profile...", run: deleteProfile }] : []),
      ],
    });
  }
  function deleteProfile() {
    A.quickPick({
      placeholder: "Delete which profile?",
      source: () => Object.keys(profiles).filter((n) => n !== "Default" && n !== active()).map((n) => ({ label: n, run: async () => {
        if (!(await A.confirmDialog({ title: "Delete profile", message: `Delete the profile "${n}"?`, okLabel: "Delete", danger: true }))) return;
        delete profiles[n]; A.LS.set("profiles", profiles); toast(`Deleted "${n}"`);
      } })),
    });
  }

  const commands = [
    { id: "settings-json", label: "Open Settings (JSON)", cat: "Preferences", run: openUserJson },
    { id: "project-settings", label: "Open Project Settings (JSON)", cat: "Preferences", run: openProjectJson },
    { id: "profile-switch", label: "Profiles: Switch Profile...", cat: "Preferences", run: pickProfile },
    { id: "profile-new", label: "Profiles: New Profile...", cat: "Preferences", run: newProfile },
    { id: "presentation", label: "Toggle Presentation Profile", cat: "View", run: () => switchProfile(active() === "Presentation" ? (A.LS.get("profileBeforePresentation", "Default")) : (A.LS.set("profileBeforePresentation", active()), "Presentation")) },
  ];
  return { commands, openUserJson, openProjectJson, pickProfile, switchProfile, updateStatus, schemaFor, get profiles() { return profiles; } };
}
