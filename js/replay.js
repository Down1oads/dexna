// History Replay: play back a file's saved versions (from Local History), one after another, with each
// version's new and changed lines lit up, like watching the file being written.
import { historyStore } from "./power.js";
import { diffLines } from "./diff.js";

export async function showReplay(A, path = A.currentPath()) {
  const { h, toast } = A, monaco = A.monaco;
  if (!path || A.currentFiles()[path] == null) return toast("Open a file first", "info");
  if (!A.settings.localHistory) return toast("Local History is off (Settings > Editor), so there are no versions to replay", "info");
  const snaps = (await historyStore.list(A.project.id)).filter((s) => s.path === path).sort((a, b) => a.time - b.time);
  const now = A.textOf(path);
  const steps = snaps.filter((s, i) => i === 0 || s.text !== snaps[i - 1].text).map((s) => ({ text: s.text, time: s.time, label: s.reason }));
  if (!steps.length || steps[steps.length - 1].text !== now) steps.push({ text: now, time: Date.now(), label: "Now" });
  if (steps.length < 2) return toast(`${path} has only one version so far. Local History saves one when you start editing, every few minutes while you type, and on Ctrl+S.`, "info", 6000);

  const host = h("div", { class: "rp-editor" });
  const slider = h("input", { type: "range", min: 0, max: steps.length - 1, value: 0, class: "rp-slider", "aria-label": "Version" });
  const info = h("span", { class: "rp-info" }), stats = h("span", { class: "muted small" });
  const play = h("button", { class: "btn primary sm" }, A.icon("play"), "Play");
  const speed = h("select", { class: "rp-speed", title: "Speed" }, [["1400", "Slow"], ["700", "Normal"], ["250", "Fast"]].map(([v, l]) => h("option", { value: v, selected: v === "700" }, l)));
  const restore = h("button", { class: "btn sm" }, "Restore this version");
  let ed = null, model = null, decos = [], timer = null, i = 0;

  const show = (n) => {
    i = n; slider.value = n;
    const cur = steps[n], prev = steps[n - 1];
    model.setValue(cur.text);
    // light up what this version added or changed, and scroll to it
    const a = prev ? prev.text.split("\n") : [], b = cur.text.split("\n"), hunks = prev ? diffLines(a, b) : [];
    const ranges = hunks.filter((hk) => hk.bLen).map((hk) => new monaco.Range(hk.bStart + 1, 1, hk.bStart + hk.bLen, 1));
    decos = model.deltaDecorations(decos, ranges.map((r) => ({ range: r, options: { isWholeLine: true, className: "rp-changed", linesDecorationsClassName: "rp-bar" } })));
    if (ranges[0]) ed.revealLineInCenterIfOutsideViewport(ranges[0].startLineNumber);
    const added = hunks.reduce((s, hk) => s + hk.bLen, 0), removed = hunks.reduce((s, hk) => s + hk.aLen, 0);
    info.textContent = `${n + 1} of ${steps.length} · ${cur.label} · ${new Date(cur.time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
    stats.textContent = prev ? `+${added} −${removed} lines` : `${b.length} lines to start with`;
    restore.disabled = n === steps.length - 1;
  };
  const stop = () => { clearInterval(timer); timer = null; play.replaceChildren(A.icon("play"), "Play"); };
  const start = () => {
    if (i >= steps.length - 1) show(0);
    play.replaceChildren(A.icon("stop"), "Pause");
    timer = setInterval(() => { if (i >= steps.length - 1) return stop(); show(i + 1); }, +speed.value);
  };
  play.addEventListener("click", () => (timer ? stop() : start()));
  speed.addEventListener("change", () => { if (timer) { stop(); start(); } });
  slider.addEventListener("input", () => { stop(); show(+slider.value); });
  restore.addEventListener("click", () => { const t = steps[i].text; A.closeModal(); A.writeFiles({ [path]: t }); A.openFile(path); toast(`Restored the version from ${new Date(steps[i].time).toLocaleString()}. Ctrl+Z undoes it.`, "ok"); });
  const keys = (e) => { if (e.key === "ArrowLeft" && i > 0) { stop(); show(i - 1); } else if (e.key === "ArrowRight" && i < steps.length - 1) { stop(); show(i + 1); } else if (e.key === " " && e.target === document.body) { e.preventDefault(); timer ? stop() : start(); } };

  A.openModal(h("div", { class: "modal rp-modal" },
    h("div", { class: "modal-head" }, `Replay of ${path}`),
    h("div", { class: "modal-body" }, host, h("div", { class: "rp-bar-row" }, play, slider, speed), h("div", { class: "rp-meta" }, info, stats)),
    h("div", { class: "modal-foot" }, h("span", { class: "muted small rp-hint" }, "← → step through, or drag the slider"), restore, h("button", { class: "btn", onclick: () => A.closeModal() }, "Close"))),
  () => { stop(); document.removeEventListener("keydown", keys); ed?.dispose(); model?.dispose(); });
  document.addEventListener("keydown", keys);
  model = monaco.editor.createModel("", A.langOf(path));
  ed = monaco.editor.create(host, { ...A.editorOptions(), model, readOnly: true, minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false, glyphMargin: false, renderLineHighlight: "none" });
  show(0);
}
