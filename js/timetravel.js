// Time Travel: a recorded run of a Python file that you can scrub through, forwards and backwards.
// At every step you see the line, the variables of that call (what just changed is lit), the call stack,
// the output printed so far, and, for any variable, how its value changed over the whole run.

/** Rebuilds each step's variables and call stack from the recorded changes (exported for tests). */
export function buildStates(steps) {
  const frames = new Map(), stack = [], lines = new Map(), states = [], stacks = [];
  steps.forEach((s, i) => {
    if (s.e === "call") { stack.length = s.d; stack.push({ n: s.n, k: s.k, f: s.f }); }
    let st = frames.get(s.k);
    if (!st) frames.set(s.k, (st = {}));
    if (s.v) Object.assign(st, s.v);
    if (s.x) for (const k of s.x) delete st[k];
    lines.set(s.k, s.l);
    states[i] = { ...st };
    stacks[i] = stack.map((fr) => ({ n: fr.n, f: fr.f, l: lines.get(fr.k) }));
    if (s.e === "return") { frames.delete(s.k); stack.length = s.d; }
  });
  return { states, stacks };
}

/** Where to go from step i: "over" (next step at the same depth or shallower), "out" (shallower), and their reverses. */
export function jump(steps, i, how) {
  const d = steps[i].d;
  if (how === "over") { for (let j = i + 1; j < steps.length; j++) if (steps[j].d <= d) return j; return steps.length - 1; }
  if (how === "out") { for (let j = i + 1; j < steps.length; j++) if (steps[j].d < d) return j; return steps.length - 1; }
  if (how === "back-over") { for (let j = i - 1; j >= 0; j--) if (steps[j].d <= d) return j; return 0; }
  return i;
}

export function showTimeTravel(A, trace, entry) {
  const { h, toast } = A, monaco = A.monaco;
  const steps = trace.steps || [];
  if (!steps.length) return toast("Nothing ran in your project's files, so there is nothing to step through", "info");
  const { states, stacks } = buildStates(steps);
  const N = steps.length;
  const files = A.currentFiles();
  const models = new Map();
  const modelFor = (f) => {
    let m = models.get(f);
    if (!m) { m = monaco.editor.createModel(files[f] ?? `# ${f} is not in the project any more`, A.langOf(f)); models.set(f, m); }
    return m;
  };

  const host = h("div", { class: "tt-editor" });
  const vars = h("div", { class: "tt-vars" }), stackEl = h("div", { class: "tt-stack" }), hist = h("div", { class: "tt-hist" });
  const out = h("pre", { class: "tt-out" });
  const slider = h("input", { type: "range", min: 0, max: N - 1, value: 0, class: "tt-slider", "aria-label": "Step" });
  const info = h("span", { class: "tt-info" });
  const btn = (label, title, fn) => h("button", { class: "btn sm", title, onclick: fn }, label);
  const play = h("button", { class: "btn primary sm" }, A.icon("play"), "Play");
  const speed = h("select", { class: "rp-speed", title: "Speed" }, [["600", "Slow"], ["200", "Normal"], ["50", "Fast"]].map(([v, l]) => h("option", { value: v, selected: v === "200" }, l)));
  let ed = null, decos = [], timer = null, i = 0, watch = null;

  const show = (n) => {
    i = Math.max(0, Math.min(N - 1, n)); slider.value = i;
    const s = steps[i], st = states[i];
    const m = modelFor(s.f);
    if (ed.getModel() !== m) ed.setModel(m);
    const ln = Math.min(s.l, m.getLineCount());
    decos = ed.deltaDecorations(decos, [{ range: new monaco.Range(ln, 1, ln, 1), options: { isWholeLine: true, className: s.e === "exception" ? "tt-line tt-err" : "tt-line", glyphMarginClassName: "tt-glyph" } }]);
    ed.revealLineInCenterIfOutsideViewport(ln);
    info.textContent = `Step ${i + 1} of ${N} · ${s.f}:${s.l}${s.n !== "<module>" ? ` · in ${s.n}()` : ""}`;
    const changed = new Set(s.e === "call" ? [] : Object.keys(s.v || {}));
    vars.replaceChildren(...Object.entries(st).map(([k, v]) => h("div", { class: "tt-var" + (changed.has(k) ? " changed" : "") + (watch === k ? " watched" : ""), title: "Click to see how it changed over the run", onclick: () => { watch = watch === k ? null : k; show(i); } }, h("span", { class: "tt-k" }, k), h("span", { class: "tt-v" }, v))));
    if (s.e === "return") vars.append(h("div", { class: "tt-var changed" }, h("span", { class: "tt-k" }, "returns"), h("span", { class: "tt-v" }, s.r)));
    if (s.e === "exception") vars.append(h("div", { class: "tt-var tt-error" }, h("span", { class: "tt-k" }, "raises"), h("span", { class: "tt-v" }, s.r)));
    if (!vars.children.length) vars.append(h("div", { class: "muted small pad" }, "No variables yet"));
    stackEl.replaceChildren(...stacks[i].slice().reverse().map((fr, j) => h("div", { class: "tt-frame" + (j === 0 ? " top" : "") }, h("span", {}, fr.n === "<module>" ? "(module)" : fr.n + "()"), h("span", { class: "muted small" }, `${fr.f}:${fr.l}`))));
    // output so far
    const parts = [];
    for (const [at, text, stream] of trace.out || []) { if (at > i + 1) break; parts.push(stream === "err" ? h("span", { class: "tt-stderr" }, text) : text); }
    out.replaceChildren(...parts);
    if (!parts.length) out.append(h("span", { class: "muted" }, "Nothing printed yet"));
    out.scrollTop = out.scrollHeight;
    drawHistory();
  };

  /** How one variable changed over the whole run (this call only): a line for numbers, a list otherwise. */
  function drawHistory() {
    hist.replaceChildren();
    if (!watch) { hist.append(h("div", { class: "muted small" }, "Click a variable to see how its value changed over the whole run.")); return; }
    const k = steps[i].k, pts = [];
    steps.forEach((s, j) => { if (s.k === k && (s.v && watch in s.v || (j === 0 || steps[j - 1].k !== k) && states[j][watch] != null)) pts.push([j, states[j][watch]]); });
    hist.append(h("div", { class: "small" }, h("b", {}, watch), h("span", { class: "muted" }, `  ${pts.length} value${pts.length === 1 ? "" : "s"} in this call`)));
    if (!pts.length) return;
    const nums = pts.map(([, v]) => Number(v));
    if (pts.length > 1 && nums.every((x) => Number.isFinite(x))) {
      const W = 340, H = 64, lo = Math.min(...nums), hi = Math.max(...nums), span = hi - lo || 1;
      let from = N, to = 0; steps.forEach((s, j) => { if (s.k === k) { from = Math.min(from, j); to = Math.max(to, j); } });
      const x = (j) => 4 + ((j - from) / Math.max(1, to - from)) * (W - 8), y = (v) => H - 6 - ((v - lo) / span) * (H - 14);
      let d = `M${x(pts[0][0])},${y(nums[0])}`;
      pts.slice(1).forEach(([j], p) => { d += ` H${x(j)} V${y(nums[p + 1])}`; });
      d += ` H${x(to)}`;
      const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "tt-chart");
      svg.innerHTML = `<path d="${d}" class="tt-line-path"/><line x1="${x(i)}" x2="${x(i)}" y1="0" y2="${H}" class="tt-now"/><text x="4" y="10" class="tt-axis">${hi}</text><text x="4" y="${H - 1}" class="tt-axis">${lo}</text>`;
      svg.addEventListener("click", (e) => { const r = svg.getBoundingClientRect(), t = from + Math.round(((e.clientX - r.left) / r.width * W - 4) / (W - 8) * (to - from)); show(Math.max(from, Math.min(to, t))); });
      hist.append(svg);
    } else {
      hist.append(h("div", { class: "tt-changes" }, ...pts.slice(-14).map(([j, v]) => h("div", { class: "tt-change" + (j <= i ? " past" : ""), onclick: () => show(j) }, h("span", { class: "muted small" }, `#${j + 1}`), h("span", { class: "tt-v" }, v)))));
    }
  }

  const stop = () => { clearInterval(timer); timer = null; play.replaceChildren(A.icon("play"), "Play"); };
  const start = () => {
    if (i >= N - 1) show(0);
    play.replaceChildren(A.icon("stop"), "Pause");
    timer = setInterval(() => { if (i >= N - 1) return stop(); show(i + 1); }, +speed.value);
  };
  play.addEventListener("click", () => (timer ? stop() : start()));
  speed.addEventListener("change", () => { if (timer) { stop(); start(); } });
  slider.addEventListener("input", () => { stop(); show(+slider.value); });
  const go = (fn) => () => { stop(); show(fn()); };
  const keys = (e) => {
    if (e.target.closest?.("select, input, textarea") && e.target !== document.body) return;
    const act = { ArrowRight: e.shiftKey ? () => jump(steps, i, "over") : () => i + 1, ArrowLeft: e.shiftKey ? () => jump(steps, i, "back-over") : () => i - 1, ArrowDown: () => jump(steps, i, "out"), Home: () => 0, End: () => N - 1 }[e.key];
    if (act) { e.preventDefault(); stop(); show(act()); } else if (e.key === " ") { e.preventDefault(); timer ? stop() : start(); }
  };

  A.openModal(h("div", { class: "modal tt-modal" },
    h("div", { class: "modal-head" }, `Time travel through ${entry}`, h("span", { class: "muted small" }, `  ${N.toLocaleString()} steps${trace.truncated ? ", the first part of a longer run" : ""}`)),
    h("div", { class: "modal-body" },
      h("div", { class: "tt-main" }, host, h("div", { class: "tt-side" }, h("div", { class: "tt-title" }, "Variables"), vars, h("div", { class: "tt-title" }, "Call stack"), stackEl, h("div", { class: "tt-title" }, "History"), hist)),
      h("div", { class: "rp-bar-row" }, btn("Back", "Previous step (Left arrow)", go(() => i - 1)), btn("Back over", "Previous step at this level (Shift+Left)", go(() => jump(steps, i, "back-over"))), play, btn("Next", "Next step (Right arrow)", go(() => i + 1)), btn("Over", "Next step at this level, skipping calls (Shift+Right)", go(() => jump(steps, i, "over"))), btn("Out", "Run until this call returns (Down arrow)", go(() => jump(steps, i, "out"))), slider, speed),
      h("div", { class: "rp-meta" }, info),
      h("div", { class: "tt-title" }, "Output so far"), out),
    h("div", { class: "modal-foot" }, h("span", { class: "muted small rp-hint" }, "← → step, Shift+← → step over, ↓ step out, Space to play"), h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))),
  () => { stop(); document.removeEventListener("keydown", keys); ed?.dispose(); for (const m of models.values()) m.dispose(); });
  document.addEventListener("keydown", keys);
  ed = monaco.editor.create(host, { ...A.editorOptions(), model: modelFor(steps[0].f), readOnly: true, minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false, glyphMargin: true, renderLineHighlight: "none" });
  show(0);
}
