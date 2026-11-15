// Focus mode (dims all but the code you are on), typewriter scrolling, rainbow indentation, a browser-tab icon
// in your accent colour, confetti when a program works, achievements, and the pet (pet.js).
import { createPet } from "./pet.js";

export const ACHIEVEMENTS = [
  { id: "first_run", name: "Hello, world", desc: "Run a program", icon: "play" },
  { id: "runs_10", name: "Getting going", desc: "Run programs 10 times", icon: "play" },
  { id: "runs_100", name: "Run machine", desc: "Run programs 100 times", icon: "play" },
  { id: "first_error", name: "First bug", desc: "A program stopped with an error. Everyone gets them!", icon: "bug" },
  { id: "fixer", name: "Bug squasher", desc: "Run a program cleanly right after it failed", icon: "check" },
  { id: "streak_3", name: "Habit", desc: "Code on 3 days in a row", icon: "chart" },
  { id: "streak_7", name: "A whole week", desc: "Code on 7 days in a row", icon: "chart" },
  { id: "hour_day", name: "Deep work", desc: "Code for an hour in one day", icon: "clock" },
  { id: "polyglot", name: "Polyglot", desc: "Write code in 3 different languages", icon: "code" },
  { id: "night_owl", name: "Night owl", desc: "Code between midnight and 4 in the morning", icon: "moon" },
  { id: "early_bird", name: "Early bird", desc: "Code between 5 and 7 in the morning", icon: "sun" },
  { id: "combo_50", name: "On fire", desc: "Reach a 50 combo in power mode", icon: "star" },
  { id: "combo_200", name: "Unstoppable", desc: "Reach a 200 combo in power mode", icon: "star" },
  { id: "designer", name: "Designer", desc: "Make your own color theme", icon: "palette" },
  { id: "collector", name: "Collector", desc: "Have 5 projects", icon: "folder" },
  { id: "pet_friend", name: "Best friends", desc: "Pet your pet 10 times", icon: "heart" },
  { id: "snippets", name: "Shortcut maker", desc: "Make one of your own snippets", icon: "snippet" },
  { id: "templates", name: "Blueprint", desc: "Save a project as a template", icon: "copy" },
];

export function createJoy(A) {
  const { h, toast } = A;
  const root = document.documentElement;
  const pet = createPet(A);

  /* ---------------- focus mode ---------------- */
  let dimDecos = null;
  function focusDim() {
    const ed = A.editor, m = ed?.getModel();
    if (!m) return;
    dimDecos ||= ed.createDecorationsCollection();
    const mode = A.settings.focusMode;
    if (!mode || mode === "off") { dimDecos.clear(); return; }
    const line = ed.getPosition()?.lineNumber || 1, n = m.getLineCount();
    let a = line, b = line;
    if (mode === "paragraph") {
      while (a > 1 && m.getLineContent(a - 1).trim()) a--;
      while (b < n && m.getLineContent(b + 1).trim()) b++;
    }
    const ranges = [];
    if (a > 1) ranges.push({ range: new A.monaco.Range(1, 1, a - 1, m.getLineMaxColumn(a - 1)), options: { inlineClassName: "dx-dim", stickiness: 1 } });
    if (b < n) ranges.push({ range: new A.monaco.Range(b + 1, 1, n, m.getLineMaxColumn(n)), options: { inlineClassName: "dx-dim", stickiness: 1 } });
    dimDecos.set(ranges);
  }

  /* ---------------- rainbow indentation ---------------- */
  let irDecos = null, irTimer = 0;
  function indentRainbow() {
    const ed = A.editor, m = ed?.getModel();
    if (!m) return;
    irDecos ||= ed.createDecorationsCollection();
    if (!A.settings.indentRainbow) { irDecos.clear(); return; }
    const tab = m.getOptions().tabSize || 4, out = [];
    for (const vr of ed.getVisibleRanges()) {
      for (let ln = Math.max(1, vr.startLineNumber - 20); ln <= Math.min(m.getLineCount(), vr.endLineNumber + 20); ln++) {
        const text = m.getLineContent(ln), ws = /^[ \t]*/.exec(text)[0];
        if (!ws || ws.length === text.length) continue;
        let col = 0, level = 0, start = 1;
        for (let i = 0; i < ws.length; i++) {
          col += ws[i] === "\t" ? tab - (col % tab) : 1;
          if (col % tab === 0) { out.push({ range: new A.monaco.Range(ln, start, ln, i + 2), options: { inlineClassName: "dx-ir dx-ir" + (level % 6) } }); level++; start = i + 2; }
        }
      }
    }
    irDecos.set(out);
  }
  const scheduleIR = () => { clearTimeout(irTimer); irTimer = setTimeout(indentRainbow, 60); };

  /* ---------------- browser-tab icon in the accent colour ---------------- */
  let lastIcon = "";
  function favicon() {
    const acc = getComputedStyle(root).getPropertyValue("--accent").trim() || "#4c8dff";
    const bg = getComputedStyle(root).getPropertyValue("--bg").trim() || "#1a1f2b";
    const key = acc + bg;
    if (key === lastIcon) return;
    lastIcon = key;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="${/^#|^rgb/.test(bg) ? bg : "#1a1f2b"}"/><path d="M19 15h12c10.5 0 18 7.4 18 17s-7.5 17-18 17H19z" fill="none" stroke="${acc}" stroke-width="6" stroke-linejoin="round"/><path d="M28 25.5l6.5 6.5-6.5 6.5" fill="none" stroke="#e6e9f0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const link = document.querySelector('link[rel="icon"]');
    if (link) link.href = "data:image/svg+xml," + encodeURIComponent(svg);
  }

  /* ---------------- achievements ---------------- */
  let got = A.LS.get("achievements", {});
  const stats = A.LS.get("joyStats", { runs: 0, lastFailed: false });
  function unlock(id) {
    if (got[id] || !A.settings.achievements) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    got[id] = Date.now(); A.LS.set("achievements", got);
    const el = h("div", { class: "ach-toast" }, h("span", { class: "ach-badge on" }, A.icon(a.icon)), h("div", {}, h("small", {}, "Achievement unlocked"), h("b", {}, a.name), h("span", {}, a.desc)));
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add("in"));
    setTimeout(() => { el.classList.remove("in"); setTimeout(() => el.remove(), 400); }, 4200);
    const r = el.getBoundingClientRect();
    A.look?.burst(r.left + 30, r.top + 20, null, 18);
  }
  function check() {
    const act = A.LS.get("activity", {});
    const today = new Date(), key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let streak = 0; const d = new Date(today); if (!act[key(d)]?.m) d.setDate(d.getDate() - 1);
    while (act[key(d)]?.m) { streak++; d.setDate(d.getDate() - 1); }
    if (streak >= 3) unlock("streak_3");
    if (streak >= 7) unlock("streak_7");
    if ((act[key(today)]?.m || 0) >= 60) unlock("hour_day");
    const langs = new Set(); for (const v of Object.values(act)) for (const l of Object.keys(v.l || {})) if (l !== "Plain Text" && l !== "Other") langs.add(l);
    if (langs.size >= 3) unlock("polyglot");
    const best = A.LS.get("powerBest", 0);
    if (best >= 50) unlock("combo_50");
    if (best >= 200) unlock("combo_200");
    if ((A.LS.get("customThemes", []) || []).length) unlock("designer");
    if ((A.LS.get("projects", []) || []).length >= 5) unlock("collector");
    if ((A.LS.get("userSnippets", []) || []).length) unlock("snippets");
    if ((A.LS.get("templates", []) || []).length) unlock("templates");
    if ((A.LS.get("petPets", 0) || 0) >= 10) unlock("pet_friend");
  }
  function onRunEnded(failed) {
    stats.runs++;
    if (stats.runs >= 1) unlock("first_run");
    if (stats.runs >= 10) unlock("runs_10");
    if (stats.runs >= 100) unlock("runs_100");
    if (failed) unlock("first_error");
    else if (stats.lastFailed) unlock("fixer");
    stats.lastFailed = failed;
    A.LS.set("joyStats", stats);
    pet.runEnded(failed);
    if (!failed && A.settings.celebrate) celebrate();
    check();
  }
  function celebrate() {
    if (root.classList.contains("reduce-motion")) return;
    const b = document.getElementById("btn-run")?.getBoundingClientRect();
    const x = b ? b.left + b.width / 2 : innerWidth / 2, y = b ? b.bottom : 40;
    const colors = ["#ff5c8a", "#ffd257", "#5cd6a0", "#5aa9ff", "#c38bff", "#ff9a3c"];
    for (let i = 0; i < 4; i++) setTimeout(() => A.look?.burst(x + (Math.random() - 0.5) * 80, y, colors, 26), i * 70);
  }
  function showAchievements() {
    const n = Object.keys(got).length;
    A.openModal(h("div", { class: "modal ach-modal" },
      h("div", { class: "modal-head" }, `Achievements (${n} of ${ACHIEVEMENTS.length})`),
      h("div", { class: "modal-body" },
        h("div", { class: "ach-bar" }, h("i", { style: { width: (n / ACHIEVEMENTS.length) * 100 + "%" } })),
        h("div", { class: "ach-grid" }, ACHIEVEMENTS.map((a) => h("div", { class: "ach" + (got[a.id] ? " on" : ""), title: got[a.id] ? `Unlocked ${new Date(got[a.id]).toLocaleDateString()}` : "Not yet" },
          h("span", { class: "ach-badge" + (got[a.id] ? " on" : "") }, A.icon(a.icon)),
          h("div", {}, h("b", {}, a.name), h("span", {}, a.desc))))),
        A.settings.achievements ? null : h("p", { class: "muted small" }, "Achievements are switched off in Settings > Fun.")),
      h("div", { class: "modal-foot" }, h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))));
  }

  /* ---------------- hooks ---------------- */
  function apply() {
    const ed = A.editor;
    if (ed) ed.updateOptions({ cursorSurroundingLines: A.settings.typewriter ? 9999 : 0, cursorSurroundingLinesStyle: A.settings.typewriter ? "all" : "default" });
    root.classList.toggle("focus-dim", !!A.settings.focusMode && A.settings.focusMode !== "off");
    focusDim(); indentRainbow(); pet.apply(); favicon();
  }
  function onSetting(key) {
    if (["typewriter", "focusMode", "indentRainbow", "pet", "petColor"].includes(key)) apply();
    if (["theme", "accentColor", "chroma"].includes(key)) setTimeout(favicon, 50);
    if (key === "achievements" && A.settings.achievements) check();
  }
  function onEditorReady() {
    const ed = A.editor;
    ed.onDidChangeCursorPosition(() => { if (A.settings.focusMode && A.settings.focusMode !== "off") focusDim(); });
    ed.onDidChangeModelContent(() => {
      pet.typed();
      if (A.settings.indentRainbow) scheduleIR();
      const hr = new Date().getHours();
      if (hr < 4) unlock("night_owl"); else if (hr >= 5 && hr < 7) unlock("early_bird");
    });
    ed.onDidScrollChange(() => { if (A.settings.indentRainbow) scheduleIR(); });
    ed.onDidChangeModel(() => { setTimeout(apply, 0); });
    apply();
    setInterval(() => { favicon(); check(); }, 30000);
    setTimeout(check, 3000);
  }
  A.onPetClicked = (n) => { if (n >= 10) unlock("pet_friend"); };

  const commands = [
    { id: "achievements", label: "Achievements", cat: "View", run: showAchievements },
    { id: "focus-mode", label: "Toggle Focus Mode (Dim Other Code)", cat: "View", run: () => A.setSetting("focusMode", A.settings.focusMode && A.settings.focusMode !== "off" ? "off" : "paragraph") },
    { id: "typewriter", label: "Toggle Typewriter Scrolling", cat: "View", run: () => A.setSetting("typewriter", !A.settings.typewriter) },
    { id: "pet-pick", label: "Choose a Pet...", cat: "Preferences", run: () => A.quickPick({ placeholder: "Pick a pet to keep you company", source: () => [["off", "No pet"], ["cat", "Cat"], ["dog", "Dog"], ["slime", "Slime"]].map(([v, l]) => ({ label: l, desc: A.settings.pet === v ? "current" : "", run: () => A.setSetting("pet", v) })) }) },
  ];
  return { commands, apply, onSetting, onEditorReady, onRunEnded, showAchievements, unlock, check, pet, get got() { return got; } };
}
