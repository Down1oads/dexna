// Focus mode (dims all but the code you are on), typewriter scrolling, rainbow indentation, a browser-tab icon
// in your accent colour, and confetti when a program works.

export function createJoy(A) {
  const { h, toast } = A;
  const root = document.documentElement;
  for (const k of ["achievements", "joyStats", "petPets"]) A.LS.del(k); // left over from removed features

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

  function onRunEnded(failed) {
    if (!failed && A.settings.celebrate) celebrate();
  }
  function celebrate() {
    if (root.classList.contains("reduce-motion")) return;
    const b = document.getElementById("btn-run")?.getBoundingClientRect();
    const x = b ? b.left + b.width / 2 : innerWidth / 2, y = b ? b.bottom : 40;
    const colors = ["#ff5c8a", "#ffd257", "#5cd6a0", "#5aa9ff", "#c38bff", "#ff9a3c"];
    for (let i = 0; i < 4; i++) setTimeout(() => A.look?.burst(x + (Math.random() - 0.5) * 80, y, colors, 26), i * 70);
  }
  /* ---------------- hooks ---------------- */
  function apply() {
    const ed = A.editor;
    if (ed) ed.updateOptions({ cursorSurroundingLines: A.settings.typewriter ? 9999 : 0, cursorSurroundingLinesStyle: A.settings.typewriter ? "all" : "default" });
    root.classList.toggle("focus-dim", !!A.settings.focusMode && A.settings.focusMode !== "off");
    focusDim(); indentRainbow(); favicon();
  }
  function onSetting(key) {
    if (["typewriter", "focusMode", "indentRainbow"].includes(key)) apply();
    if (["theme", "accentColor", "chroma"].includes(key)) setTimeout(favicon, 50);
  }
  function onEditorReady() {
    const ed = A.editor;
    ed.onDidChangeCursorPosition(() => { if (A.settings.focusMode && A.settings.focusMode !== "off") focusDim(); });
    ed.onDidChangeModelContent(() => {
      if (A.settings.indentRainbow) scheduleIR();
    });
    ed.onDidScrollChange(() => { if (A.settings.indentRainbow) scheduleIR(); });
    ed.onDidChangeModel(() => { setTimeout(apply, 0); });
    apply();
    setInterval(favicon, 30000);
  }

  const commands = [
    { id: "focus-mode", label: "Toggle Focus Mode (Dim Other Code)", cat: "View", run: () => A.setSetting("focusMode", A.settings.focusMode && A.settings.focusMode !== "off" ? "off" : "paragraph") },
    { id: "typewriter", label: "Toggle Typewriter Scrolling", cat: "View", run: () => A.setSetting("typewriter", !A.settings.typewriter) },
  ];
  return { commands, apply, onSetting, onEditorReady, onRunEnded };
}
