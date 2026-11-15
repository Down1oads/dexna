// Layout and small personal touches: side bar and panel position, spacing, text sizes, file icon style,
// which activity bar icons show, your own CSS, typing sounds, and exporting / importing all settings.
import { setFileIconStyle } from "./icons.js";

/** Everything "Export settings" saves (localStorage keys without the dexna: prefix). */
export const EXPORT_KEYS = ["settings", "customThemes", "keybindings", "userSnippets", "look", "templates", "focusSound"];

export function createTweaks(A) {
  const app = () => document.getElementById("app");
  const root = document.documentElement;
  let cssEl = null;

  /* ---------------- layout ---------------- */
  function apply() {
    const s = A.settings, a = app();
    if (!a) return;
    a.classList.toggle("sidebar-right", s.sidebarSide === "right");
    a.classList.toggle("panel-right", s.panelSide === "right");
    a.classList.toggle("no-activitybar", !s.showActivityBar);
    a.classList.toggle("no-statusbar", !s.showStatusBar);
    root.dataset.density = s.density || "normal";
    root.style.setProperty("--ui-size", (+s.uiFontSize || 13) + "px");
    root.style.setProperty("--term-size", (+s.terminalFontSize || 13) + "px");
    const panel = document.getElementById("panel");
    if (panel) panel.style.width = s.panelSide === "right" && A.layout.panelWidth ? A.layout.panelWidth + "px" : "";
    const hidden = new Set(s.activityHidden || []);
    for (const b of document.querySelectorAll("#activitybar [data-view]")) b.style.display = hidden.has(b.dataset.view) ? "none" : "";
    setFileIconStyle(s.fileIcons || "color");
    if (s.customCss) { cssEl ||= document.head.appendChild(Object.assign(document.createElement("style"), { id: "user-css" })); cssEl.textContent = s.customCss; }
    else if (cssEl) cssEl.textContent = "";
  }
  const LAYOUT = new Set(["sidebarSide", "panelSide", "showActivityBar", "showStatusBar", "density", "uiFontSize", "terminalFontSize", "activityHidden", "customCss"]);
  function onSetting(key) {
    if (LAYOUT.has(key)) { apply(); window.dispatchEvent(new Event("resize")); }
    if (key === "fileIcons") { apply(); A.rerenderFiles(); }
  }

  /* ---------------- typing sounds ---------------- */
  let ac = null, noise = null;
  function audio() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ac = new C();
      noise = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function burst(t, { freq = 2000, q = 1, type = "bandpass", len = 0.03, gain = 0.3 }) {
    const src = ac.createBufferSource(); src.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(ac.destination);
    src.start(t, Math.random() * 0.15); src.stop(t + len + 0.01);
  }
  function tone(t, { freq, to, len = 0.08, gain = 0.2, type = "sine" }) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + len + 0.02);
  }
  let lastKey = 0;
  function keySound(e) {
    const kind = A.settings.typingSound;
    if (!kind || kind === "off") return;
    if (e.ctrlKey || e.metaKey || e.altKey || /^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.browserEvent?.key || "")) return;
    const now = performance.now();
    if (now - lastKey < 18) return; // key repeat: do not machine-gun
    lastKey = now;
    if (!audio()) return;
    const v = Math.max(0.05, Math.min(1, (A.settings.typingVolume ?? 50) / 100)), t = ac.currentTime, r = () => 0.85 + Math.random() * 0.3;
    const key = e.browserEvent?.key || "", big = key === "Enter" || key === " " || key === "Backspace";
    if (kind === "soft") burst(t, { freq: (big ? 1100 : 2400) * r(), q: 1.2, len: big ? 0.05 : 0.025, gain: 0.35 * v });
    else if (kind === "typewriter") {
      burst(t, { freq: 3200 * r(), type: "highpass", len: 0.02, gain: 0.5 * v });
      tone(t, { freq: 140 * r(), to: 70, len: 0.06, gain: 0.25 * v, type: "triangle" });
      if (key === "Enter") { tone(t + 0.05, { freq: 1760, len: 0.9, gain: 0.12 * v }); tone(t + 0.05, { freq: 2637, len: 0.6, gain: 0.06 * v }); }
    } else if (kind === "bubble") {
      const f = (big ? 300 : 500 + Math.random() * 500);
      tone(t, { freq: f, to: f * 1.8, len: 0.07, gain: 0.25 * v });
    } else if (kind === "keys") {
      burst(t, { freq: (big ? 900 : 1800) * r(), q: 2, len: 0.018, gain: 0.45 * v });
      burst(t + 0.035, { freq: (big ? 600 : 1300) * r(), q: 2, len: 0.022, gain: 0.25 * v });
      if (big) tone(t, { freq: 110, to: 60, len: 0.07, gain: 0.25 * v, type: "triangle" });
    }
  }
  function onEditorReady() {
    A.editor.onKeyDown(keySound);
    window.addEventListener("resize", () => {}); // layout reacts through automaticLayout
  }

  /* ---------------- export / import ---------------- */
  function exportSettings() {
    const data = { app: "dexna", kind: "settings", version: 1, exported: new Date().toISOString(), data: {} };
    for (const k of EXPORT_KEYS) { const v = A.LS.get(k, undefined); if (v !== undefined) data.data[k] = v; }
    A.downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "dexna-settings.json");
    A.toast("Settings exported. Import the file on another device, or keep it as a backup.", "ok");
  }
  function importSettings() {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: ".json,application/json" });
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (d?.app !== "dexna" || d.kind !== "settings" || typeof d.data !== "object") throw new Error("this is not a Dexna settings file");
        const keys = Object.keys(d.data).filter((k) => EXPORT_KEYS.includes(k));
        if (!keys.length) throw new Error("it has nothing to import");
        if (!(await A.confirmDialog({ title: "Import settings", message: `Replace your ${keys.map((k) => ({ settings: "settings", customThemes: "themes", keybindings: "keyboard shortcuts", userSnippets: "snippets", look: "look", templates: "templates", focusSound: "timer sound" })[k]).join(", ")} with the ones in ${f.name}? Your projects stay as they are. Dexna reloads to apply them.`, okLabel: "Import and reload" }))) return;
        for (const k of keys) A.LS.set(k, d.data[k]);
        A.flush?.();
        location.reload();
      } catch (e) { A.toast("Could not import: " + e.message, "error"); }
    };
    input.click();
  }

  const commands = [
    { id: "layout-sidebar-side", label: "Move Side Bar Left/Right", cat: "View", run: () => A.setSetting("sidebarSide", A.settings.sidebarSide === "right" ? "left" : "right") },
    { id: "layout-panel-side", label: "Move Panel Bottom/Right", cat: "View", run: () => A.setSetting("panelSide", A.settings.panelSide === "right" ? "bottom" : "right") },
    { id: "layout-activitybar", label: "Toggle Activity Bar", cat: "View", run: () => A.setSetting("showActivityBar", !A.settings.showActivityBar) },
    { id: "layout-statusbar", label: "Toggle Status Bar", cat: "View", run: () => A.setSetting("showStatusBar", !A.settings.showStatusBar) },
    { id: "settings-export", label: "Export Settings", cat: "Preferences", run: exportSettings },
    { id: "settings-import", label: "Import Settings...", cat: "Preferences", run: importSettings },
  ];
  return { apply, onSetting, onEditorReady, exportSettings, importSettings, commands, keySound };
}
