// Python developer tools: a Tests panel (unittest and pytest-style tests, run all / a file / one test),
// coverage marks in the editor, a profiler table, and run settings per file (command-line arguments,
// environment variables and input taken from a file).
import { shellWords } from "./plus.js";

const STATUS_ICON = { pass: "check", fail: "error", error: "error", skip: "circle", run: "refresh", none: "dot" };
const ms = (s) => (s < 0.001 ? "<1 ms" : s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(2)} s`);
const isTestFile = (p) => /(^|\/)(test_[^/]*|[^/]*_test)\.py$/.test(p);

export function createDevtools(A) {
  const { h, toast } = A;
  const st = { results: new Map(), running: new Set(), failedOnly: false, coverage: null, covDecos: new Map(), testDecos: new Map(), profile: null, profMine: true, profSort: "total", profPath: "", profTime: 0, open: new Set() };

  /* =====================================================================
   * Run settings: arguments, environment variables, input from a file
   * ===================================================================== */
  const cfgFor = (path) => A.project?.runConfig?.[path] || {};
  function runOptions(path) {
    const c = cfgFor(path), o = {};
    if (c.args?.trim()) o.args = shellWords(c.args);
    if (c.env?.trim()) {
      o.env = {};
      for (const line of c.env.split("\n")) { const m = /^\s*(?:export\s+)?([A-Za-z_][\w.]*)\s*=\s*(.*?)\s*$/.exec(line); if (m) o.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2"); }
    }
    if (c.input === "file" && c.inputFile && A.currentFiles()[c.inputFile] != null) o.stdin = A.textOf(c.inputFile);
    else if (c.input === "text" && c.inputText) o.stdin = c.inputText;
    return o;
  }
  function describe(path) {
    const c = cfgFor(path), bits = [];
    if (c.args?.trim()) bits.push(`arguments: ${c.args.trim()}`);
    const nEnv = Object.keys(runOptions(path).env || {}).length;
    if (nEnv) bits.push(`${nEnv} environment variable${nEnv > 1 ? "s" : ""}`);
    if (c.input === "file" && c.inputFile) bits.push(`input from ${c.inputFile}`);
    if (c.input === "text" && c.inputText) bits.push("typed input");
    return bits.join(", ");
  }
  function editRunSettings(path = A.runTarget()) {
    if (!path) return toast("Open a Python file first.", "warn");
    if (!path.endsWith(".py")) return toast("Run settings are for Python files.", "warn");
    const c = { ...cfgFor(path) };
    const args = h("input", { value: c.args || "", placeholder: "--name Ada -v data.csv", spellcheck: "false" });
    const env = h("textarea", { class: "rs-env", rows: 3, spellcheck: "false", placeholder: "DEBUG=1\nAPI_URL=https://example.com" }, c.env || "");
    const txtFiles = Object.keys(A.currentFiles()).filter((p) => !p.endsWith(".py")).sort();
    const mode = h("select", {}, ...[["", "Typed in the terminal (normal)"], ["file", "Read from a file in the project"], ["text", "Written here"]].map(([v, l]) => h("option", { value: v, selected: (c.input || "") === v }, l)));
    const file = h("select", {}, ...(txtFiles.length ? txtFiles : [""]).map((p) => h("option", { value: p, selected: c.inputFile === p }, p || "(no text files in the project)")));
    const text = h("textarea", { class: "rs-env", rows: 4, spellcheck: "false", placeholder: "One line for each input() call" }, c.inputText || "");
    const fileRow = h("label", { class: "rs-row" }, h("span", {}, "File"), file), textRow = h("label", { class: "rs-row" }, h("span", {}, "Input"), text);
    const sync = () => { fileRow.style.display = mode.value === "file" ? "" : "none"; textRow.style.display = mode.value === "text" ? "" : "none"; };
    mode.onchange = sync; sync();
    const save = () => {
      const next = { args: args.value.trim(), env: env.value.trim(), input: mode.value, inputFile: mode.value === "file" ? file.value : "", inputText: mode.value === "text" ? text.value : "" };
      const empty = !next.args && !next.env && !next.input;
      const all = { ...(A.project.runConfig || {}) };
      if (empty) delete all[path]; else all[path] = next;
      A.project.runConfig = all;
      A.persist();
      A.closeModal();
      toast(empty ? `${path} runs with no extra settings` : `Run settings saved for ${path}`, "ok");
    };
    A.openModal(h("div", { class: "modal rs-modal" },
      h("div", { class: "modal-head" }, `Run settings for ${path}`),
      h("div", { class: "modal-body" },
        h("p", {}, "Used every time this file runs, and saved with the project."),
        h("label", { class: "rs-row" }, h("span", {}, "Arguments"), args),
        h("div", { class: "rs-hint" }, "sys.argv[1:]. Quote values with spaces: \"two words\""),
        h("label", { class: "rs-row" }, h("span", {}, "Environment"), env),
        h("div", { class: "rs-hint" }, "One NAME=value per line, read with os.environ"),
        h("label", { class: "rs-row" }, h("span", {}, "input()"), mode), fileRow, textRow,
        h("div", { class: "rs-hint" }, "Prepared lines are used first and shown in the terminal as if typed; after that, input() asks as usual")),
      h("div", { class: "modal-foot" },
        h("button", { class: "btn", onclick: () => { args.value = ""; env.value = ""; mode.value = ""; sync(); } }, "Clear all"),
        h("span", { style: { flex: 1 } }),
        h("button", { class: "btn", onclick: () => A.closeModal() }, "Cancel"),
        h("button", { class: "btn primary", onclick: save }, "Save"))));
    args.focus();
  }

  /* =====================================================================
   * Tests
   * ===================================================================== */
  /** Tests found by reading the files (no need to run anything to list them). */
  function discover() {
    const out = [];
    for (const p of Object.keys(A.currentFiles()).filter(isTestFile).sort()) {
      const lines = A.textOf(p).split("\n"), tests = [];
      let cls = null;
      lines.forEach((l, i) => {
        let m;
        if ((m = /^class\s+(\w+)\s*(?:\(([^)]*)\))?/.exec(l))) { cls = m[1].startsWith("Test") || /TestCase/.test(m[2] || "") ? m[1] : null; return; }
        if (/^[^\s#@)]/.test(l)) cls = null; // back at the top level
        if ((m = /^(?:async\s+)?def\s+(test\w*)\s*\(/.exec(l))) tests.push({ id: `${p}::${m[1]}`, name: m[1], line: i + 1 });
        else if (cls && (m = /^\s+(?:async\s+)?def\s+(test\w*)\s*\(/.exec(l))) tests.push({ id: `${p}::${cls}::${m[1]}`, name: `${cls}.${m[1]}`, line: i + 1 });
      });
      out.push({ file: p, tests });
    }
    return out;
  }
  const statusOf = (id) => (st.running.has(id) ? "run" : st.results.get(id)?.status || "none");
  function fileStatus(f) {
    const ss = [...f.tests.map((t) => statusOf(t.id)), st.results.get(f.file)?.status].filter(Boolean);
    if (ss.includes("run")) return "run";
    if (ss.includes("fail") || ss.includes("error")) return "fail";
    if (f.tests.length && f.tests.every((t) => statusOf(t.id) === "pass" || statusOf(t.id) === "skip")) return "pass";
    return "none";
  }

  async function run(files, only = []) {
    const found = discover();
    if (!found.length) {
      toast("No test files yet. Name them test_something.py or something_test.py, with functions called test_...", "info", 6000);
      A.showPanel("tests");
      return;
    }
    files = files || found.map((f) => f.file);
    for (const f of found) if (files.includes(f.file)) for (const t of f.tests) if (!only.length || only.includes(t.id) || only.includes(f.file)) { st.running.add(t.id); st.results.delete(t.id); }
    for (const f of files) st.results.delete(f);
    A.showPanel("tests"); render();
    const t0 = performance.now();
    const results = await A.runTests(files, only);
    st.running.clear();
    if (results) for (const r of results) st.results.set(r.id, r);
    const list = results || [];
    const n = (s) => list.filter((r) => r.status === s).length;
    const failed = n("fail") + n("error");
    for (const r of list) if (r.status === "fail" || r.status === "error") st.open.add(r.id);
    if (results) A.terminalSystem(`${list.length} test${list.length === 1 ? "" : "s"}: ${n("pass")} passed${failed ? `, ${failed} failed` : ""}${n("skip") ? `, ${n("skip")} skipped` : ""} in ${ms((performance.now() - t0) / 1000)}`, failed ? "stderr" : "ok");
    A.showPanel("tests"); render(); markTests();
  }
  function onTestResult(r) { st.running.delete(r.id); st.results.set(r.id, r); scheduleRender(); }
  let rt = 0; const scheduleRender = () => { clearTimeout(rt); rt = setTimeout(render, 40); };

  const iconFor = (s) => h("span", { class: `tst-ic tst-st-${s}`, html: A.iconSvg(STATUS_ICON[s] || "circle") });
  function render() {
    const root = document.getElementById("tests-view");
    if (!root) return;
    const found = discover(), all = found.flatMap((f) => f.tests);
    const res = all.map((t) => st.results.get(t.id)).filter(Boolean);
    const n = (s) => res.filter((r) => r.status === s).length;
    const bar = h("div", { class: "tst-bar" },
      h("button", { class: "btn sm primary", disabled: !found.length || st.running.size > 0, onclick: () => run() }, "Run all"),
      h("button", { class: "btn sm", disabled: !res.some((r) => r.status === "fail" || r.status === "error") || st.running.size > 0, onclick: () => { const ids = res.filter((r) => r.status === "fail" || r.status === "error").map((r) => r.id); run([...new Set(ids.map((i) => i.split("::")[0]))], ids); } }, "Run failed"),
      h("label", { class: "tst-toggle" }, h("input", { type: "checkbox", checked: st.failedOnly, onchange: (e) => { st.failedOnly = e.target.checked; render(); } }), " Failed only"),
      h("span", { class: "tst-sum" }, st.running.size ? `Running ${st.running.size} test${st.running.size > 1 ? "s" : ""}…`
        : res.length ? [`${n("pass")} passed`, n("fail") + n("error") ? `${n("fail") + n("error")} failed` : "", n("skip") ? `${n("skip")} skipped` : "", all.length - res.length ? `${all.length - res.length} not run` : ""].filter(Boolean).join(" · ")
        : `${all.length} test${all.length === 1 ? "" : "s"} in ${found.length} file${found.length === 1 ? "" : "s"}`));
    const list = h("div", { class: "tst-list" });
    if (!found.length) list.append(h("div", { class: "tst-empty" }, h("p", {}, "No tests yet."), h("p", {}, "Make a file called test_something.py with functions whose names start with test_, using plain assert. unittest.TestCase classes work too."), h("button", { class: "btn sm", onclick: sample }, "Create an example test file")));
    for (const f of found) {
      const fileErr = st.results.get(f.file);
      const tests = f.tests.filter((t) => !st.failedOnly || ["fail", "error"].includes(statusOf(t.id)));
      if (st.failedOnly && !tests.length && !fileErr) continue;
      list.append(h("div", { class: "tst-row tst-file", onclick: () => A.openFile(f.file) },
        iconFor(fileErr ? "error" : fileStatus(f)), h("span", { class: "tst-name" }, f.file), h("span", { class: "tst-meta" }, `${f.tests.length}`),
        h("button", { class: "btn icon sm tst-run", title: `Run the tests in ${f.file}`, onclick: (e) => { e.stopPropagation(); run([f.file]); } }, A.icon("play"))));
      if (fileErr) list.append(detail(fileErr));
      for (const t of tests) {
        const r = st.results.get(t.id), s = statusOf(t.id);
        list.append(h("div", { class: "tst-row tst-test", onclick: () => { if (r?.failLine || r?.message) { st.open.has(t.id) ? st.open.delete(t.id) : st.open.add(t.id); render(); } A.openFile(f.file, { line: r?.failLine || t.line }); } },
          iconFor(s), h("span", { class: "tst-name" }, t.name), h("span", { class: "tst-meta" }, r ? (r.status === "skip" ? "skipped" : ms(r.time)) : ""),
          h("button", { class: "btn icon sm tst-run", title: "Run this test", onclick: (e) => { e.stopPropagation(); run([f.file], [t.id]); } }, A.icon("play"))));
        if (r && r.status !== "pass" && st.open.has(t.id)) list.append(detail(r));
      }
    }
    root.replaceChildren(bar, list);
    const badge = document.querySelector('.panel-tabs [data-panel="tests"] .badge');
    if (badge) { const bad = n("fail") + n("error"); badge.textContent = bad ? String(bad) : ""; badge.classList.toggle("err", !!bad); }
  }
  function detail(r) {
    const box = h("div", { class: `tst-detail tst-d-${r.status}` });
    box.append(h("div", { class: "tst-msg" }, r.message || r.status));
    if (r.source) box.append(h("div", { class: "tst-src", onclick: () => A.openFile(r.file, { line: r.failLine }) }, h("span", { class: "tst-ln" }, `line ${r.failLine}`), h("code", {}, r.source)));
    const vals = Object.entries(r.values || {});
    if (vals.length) box.append(h("table", { class: "tst-vals" }, ...vals.map(([k, v]) => h("tr", {}, h("td", {}, k), h("td", {}, h("code", {}, v))))));
    if (r.trace) { const pre = h("pre", { class: "tst-trace", style: { display: "none" } }, r.trace.trim()); box.append(h("button", { class: "btn sm ghost", onclick: (e) => { e.stopPropagation(); pre.style.display = pre.style.display ? "" : "none"; } }, "Traceback"), pre); }
    return box;
  }
  /** A check or a cross next to each test in the editor after a run. */
  function markTests() {
    if (!A.monaco) return;
    for (const f of discover()) {
      if (!f.tests.some((t) => st.results.has(t.id))) continue;
      const m = A.models.get(f.file) || A.modelFor(f.file); // files not opened yet get their marks too
      if (!m) continue;
      const decos = f.tests.filter((t) => st.results.has(t.id)).map((t) => {
        const s = st.results.get(t.id).status;
        return { range: new A.monaco.Range(t.line, 1, t.line, 1), options: { glyphMarginClassName: `dx-test-mark dx-test-${s === "error" ? "fail" : s}`, glyphMarginHoverMessage: { value: `Test ${s === "pass" ? "passed" : s === "skip" ? "skipped" : "failed"}${st.results.get(t.id).message ? ": " + st.results.get(t.id).message : ""}` } } };
      });
      st.testDecos.set(f.file, m.deltaDecorations(st.testDecos.get(f.file) || [], decos));
    }
  }
  function sample() {
    const name = A.currentFiles()["test_example.py"] != null ? "test_example_2.py" : "test_example.py";
    A.writeFiles({ [name]: `# Tests: functions whose names start with test_, using plain assert.
# Press Run all in the Tests tab, or Run > Run All Tests.


def add(a, b):
    return a + b


def test_add():
    assert add(2, 3) == 5


def test_add_negative():
    assert add(-1, -1) == -2


def test_strings():
    words = "hello world".split()
    assert len(words) == 2
    assert words[0].upper() == "HELLO"


class TestList:
    def test_append(self):
        items = [1, 2]
        items.append(3)
        assert items == [1, 2, 3]
` });
    A.openFile(name);
    setTimeout(render, 50);
  }

  /* =====================================================================
   * Coverage
   * ===================================================================== */
  function showCoverage(cov, path) {
    st.coverage = cov;
    applyCoverage();
    const rows = Object.entries(cov).sort(([a], [b]) => a.localeCompare(b));
    let hit = 0, total = 0;
    for (const [, c] of rows) { hit += c.hit.length; total += c.hit.length + c.missed.length; }
    A.terminalSystem(["Coverage (lines that ran):", ...rows.map(([f, c]) => { const t = c.hit.length + c.missed.length; return `  ${f.padEnd(28)} ${String(c.hit.length).padStart(4)} / ${String(t).padEnd(4)} ${t ? Math.round((c.hit.length / t) * 100) : 100}%`; }), total ? `  ${"Total".padEnd(28)} ${String(hit).padStart(4)} / ${String(total).padEnd(4)} ${Math.round((hit / total) * 100)}%` : ""].filter(Boolean).join("\n"), "ok");
    toast(`Coverage: ${total ? Math.round((hit / total) * 100) : 100}% of lines ran. Lines that did not run are marked in red. Run > Clear Coverage removes the marks.`, "info", 6000);
  }
  function applyCoverage() {
    clearCoverageMarks();
    if (!st.coverage || !A.monaco) return;
    for (const [file, c] of Object.entries(st.coverage)) {
      const m = A.models.get(file) || A.modelFor(file);
      if (!m) continue;
      const deco = (line, cls, hover) => ({ range: new A.monaco.Range(line, 1, line, 1), options: { isWholeLine: true, linesDecorationsClassName: cls, glyphMarginHoverMessage: undefined, hoverMessage: undefined, overviewRuler: cls === "dx-cov-miss" ? { color: "rgba(248, 113, 113, 0.7)", position: A.monaco.editor.OverviewRulerLane.Left } : undefined, className: cls === "dx-cov-miss" ? "dx-cov-miss-line" : undefined } });
      st.covDecos.set(file, m.deltaDecorations([], [...c.hit.map((l) => deco(l, "dx-cov-hit")), ...c.missed.map((l) => deco(l, "dx-cov-miss"))]));
    }
  }
  function clearCoverageMarks() {
    for (const [file, ids] of st.covDecos) A.models.get(file)?.deltaDecorations(ids, []);
    st.covDecos.clear();
  }

  /* =====================================================================
   * Profiler
   * ===================================================================== */
  function showProfile(rows, path, time) {
    st.profile = rows; st.profPath = path; st.profTime = time;
    A.showPanel("profile"); renderProfile();
  }
  function renderProfile() {
    const root = document.getElementById("profile-view");
    if (!root) return;
    if (!st.profile) { root.replaceChildren(h("div", { class: "tst-empty" }, h("p", {}, "Run > Run with Profiler times every function in a Python program. The slowest ones show here."))); return; }
    let rows = st.profile.filter((r) => !st.profMine || r.mine);
    rows = rows.slice().sort((a, b) => (st.profSort === "func" ? a.func.localeCompare(b.func) : b[st.profSort] - a[st.profSort]));
    const max = Math.max(1e-9, ...st.profile.map((r) => r.total)), calls = st.profile.reduce((s, r) => s + r.calls, 0);
    const th = (key, label, num) => h("th", { class: (num ? "num " : "") + (st.profSort === key ? "on" : ""), onclick: () => { st.profSort = key; renderProfile(); } }, label);
    root.replaceChildren(
      h("div", { class: "tst-bar" },
        h("span", { class: "tst-sum" }, `${st.profPath}: ${ms(st.profTime)} · ${calls.toLocaleString()} function calls`),
        h("label", { class: "tst-toggle" }, h("input", { type: "checkbox", checked: st.profMine, onchange: (e) => { st.profMine = e.target.checked; renderProfile(); } }), " Only your code"),
        h("button", { class: "btn sm", onclick: () => A.runWith(st.profPath, "profile") }, "Profile again")),
      h("div", { class: "prof-wrap" }, h("table", { class: "prof" },
        h("thead", {}, h("tr", {}, th("func", "Function"), h("th", {}, "Where"), th("calls", "Calls", true), th("own", "Own time", true), th("total", "Total time", true), h("th", {}, ""))),
        h("tbody", {}, ...rows.slice(0, 200).map((r) => h("tr", { class: r.mine ? "mine" : "", title: r.mine ? "Open in the editor" : "", onclick: () => r.mine && r.line && A.openFile(r.file, { line: r.line }) },
          h("td", {}, h("code", {}, r.func)), h("td", { class: "dim" }, r.file ? `${r.file}${r.line ? ":" + r.line : ""}` : "built in"),
          h("td", { class: "num" }, r.calls === r.prim ? r.calls.toLocaleString() : `${r.calls.toLocaleString()} (${r.prim} direct)`), h("td", { class: "num" }, ms(r.own)), h("td", { class: "num" }, ms(r.total)),
          h("td", { class: "bar" }, h("i", { style: { width: `${Math.max(1, (r.total / max) * 100)}%` } }))))))));
  }

  /* =====================================================================
   * Panel tabs
   * ===================================================================== */
  function buildTabs() {
    const tabs = document.querySelector(".panel-tabs"), body = document.querySelector(".panel-body");
    if (!tabs || document.querySelector('.panel-tabs [data-panel="tests"]')) return;
    const add = (id, label, badge) => {
      const b = h("button", { "data-panel": id }, label, badge ? h("span", { class: "badge" }) : null);
      b.onclick = () => { A.showPanel(id); id === "tests" ? render() : renderProfile(); };
      tabs.append(b);
      body.append(h("div", { class: "panel-view", "data-panel": id }, h("div", { id: id + "-view", class: "tst-view" })));
    };
    add("tests", "Tests", true);
    add("profile", "Profile");
    render(); renderProfile();
  }
  buildTabs();

  const commands = [
    { id: "run-settings", label: "Run Settings (Arguments, Environment, Input)...", cat: "Run", run: () => editRunSettings() },
    { id: "run-coverage", label: "Run with Coverage", cat: "Run", run: () => A.runWith(A.runTarget(), "coverage") },
    { id: "run-profile", label: "Run with Profiler", cat: "Run", run: () => A.runWith(A.runTarget(), "profile") },
    { id: "coverage-clear", label: "Clear Coverage", cat: "Run", run: () => { st.coverage = null; clearCoverageMarks(); } },
    { id: "tests-run-all", label: "Run All Tests", cat: "Run", kb: "ctrl+shift+;", run: () => run() },
    { id: "tests-run-file", label: "Run Tests in This File", cat: "Run", run: () => { const p = A.currentPath(); if (!p || !isTestFile(p)) return toast("This is not a test file. Test files are named test_*.py or *_test.py.", "info"); run([p]); } },
    { id: "tests-show", label: "Show Tests", cat: "View", run: () => { A.showPanel("tests"); render(); } },
  ];

  return {
    commands, runOptions, describe, onTestResult, showCoverage, showProfile,
    onFilesChanged() { scheduleRender(); },
    onProjectLoaded() { st.results.clear(); st.running.clear(); st.coverage = null; clearCoverageMarks(); st.testDecos.clear(); st.profile = null; buildTabs(); render(); renderProfile(); },
  };
}
