// Data Explorer: open a CSV, TSV, JSON or JSON Lines file as a fast table you can sort and filter by column,
// profile (min, max, mean, a chart of the values), group and total, and export. Click a bar to filter by it.
import { parseCsv } from "./plus.js";

const MAX_ROWS = 200000;
const NUM_RE = /^[-+]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?([eE][-+]?\d+)?$/;
export const toNumber = (s) => { if (typeof s === "number") return s; const t = String(s ?? "").trim(); if (t === "" || !NUM_RE.test(t) || !/\d/.test(t)) return NaN; return Number(t.replace(/,/g, "")); };

/** Text of a data file to { columns:[name], rows:[[string]], note }, or { error }. */
export function loadTable(text, path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  if (ext === "json" || ext === "jsonl" || ext === "ndjson" || ext === "geojson") {
    let data;
    try { data = JSON.parse(text); }
    catch (e) {
      const lines = text.split("\n").filter((l) => l.trim());
      try { data = lines.map((l) => JSON.parse(l)); } catch (_) { return { error: "That is not valid JSON: " + e.message }; }
    }
    if (data && !Array.isArray(data) && typeof data === "object") {
      const arrays = Object.entries(data).filter(([, v]) => Array.isArray(v) && v.length);
      const objs = Object.entries(data).filter(([, v]) => v && typeof v === "object" && !Array.isArray(v));
      if (arrays.length === 1) data = arrays[0][1];
      else if (objs.length && objs.length === Object.keys(data).length) data = objs.map(([k, v]) => ({ key: k, ...v }));
      else return { error: "The JSON needs to be a list of records (an array of objects) to show as a table." };
    }
    if (!Array.isArray(data)) return { error: "The JSON needs to be a list of records (an array of objects) to show as a table." };
    const str = (v) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
    if (data.every((r) => r == null || typeof r !== "object")) return { columns: ["value"], rows: data.map((v) => [str(v)]) };
    if (data.every((r) => Array.isArray(r))) { const w = Math.max(...data.map((r) => r.length)); return { columns: Array.from({ length: w }, (_, i) => `column ${i + 1}`), rows: data.map((r) => Array.from({ length: w }, (_, i) => str(r[i]))) }; }
    const names = []; const seen = new Set();
    for (const r of data.slice(0, 20000)) if (r && typeof r === "object") for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); names.push(k); }
    return { columns: names, rows: data.map((r) => names.map((k) => str(r?.[k]))) };
  }
  const first = text.split("\n", 1)[0];
  const sep = ext === "tsv" || (first.includes("\t") && !first.includes(",")) ? "\t" : first.includes(";") && !first.includes(",") ? ";" : first.includes("|") && !first.includes(",") ? "|" : ",";
  const all = parseCsv(text, sep);
  if (!all.length) return { error: "The file is empty." };
  const width = Math.max(...all.slice(0, 2000).map((r) => r.length));
  const columns = Array.from({ length: width }, (_, i) => (all[0][i] || "").trim() || `column ${i + 1}`);
  return { columns, rows: all.slice(1).map((r) => (r.length === width ? r : Array.from({ length: width }, (_, i) => r[i] ?? ""))) };
}

/** A filter written in a column's box as a test, or null (nothing) or {bad:true}. n is the number value, s the text. */
export function compileFilter(expr, numeric) {
  expr = expr.trim();
  if (!expr) return null;
  const low = expr.toLowerCase();
  if (low === "empty") return (s) => s === "";
  if (low === "!empty") return (s) => s !== "";
  let m;
  if (numeric) {
    if ((m = /^(>=|<=|!=|>|<|=)\s*(.+)$/.exec(expr))) {
      const x = toNumber(m[2]);
      if (!Number.isNaN(x)) { const f = { ">=": (n) => n >= x, "<=": (n) => n <= x, "!=": (n) => n !== x, ">": (n) => n > x, "<": (n) => n < x, "=": (n) => n === x }[m[1]]; return (s, n) => f(n); }
    }
    if ((m = /^(.+?)\s*\.\.\s*(.+)$/.exec(expr))) { const a = toNumber(m[1]), b = toNumber(m[2]); if (!Number.isNaN(a) && !Number.isNaN(b)) return (s, n) => n >= a && n <= b; }
    const x = toNumber(expr); if (!Number.isNaN(x)) return (s, n) => n === x;
  }
  if (expr.length > 2 && expr[0] === "/" && expr.endsWith("/")) { try { const re = new RegExp(expr.slice(1, -1), "i"); return (s) => re.test(s); } catch (_) { return { bad: true }; } }
  if (expr[0] === "=") { const v = expr.slice(1).trim().toLowerCase(); return (s) => s.toLowerCase() === v; }
  if (expr[0] === "!") { const v = expr.slice(1).trim().toLowerCase(); return (s) => !s.toLowerCase().includes(v); }
  const v = low;
  return (s) => s.toLowerCase().includes(v);
}

export function describe(values) {
  const xs = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b), n = xs.length;
  if (!n) return null;
  const sum = xs.reduce((s, x) => s + x, 0), mean = sum / n;
  const median = n % 2 ? xs[(n - 1) / 2] : (xs[n / 2 - 1] + xs[n / 2]) / 2;
  const sd = n > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
  return { n, sum, mean, median, sd, min: xs[0], max: xs[n - 1], sorted: xs };
}
export const fmt = (x) => (Number.isFinite(x) ? x.toLocaleString("en-US", { maximumFractionDigits: Math.abs(x) >= 1000 ? 1 : 4 }) : "");
const csvCell = (v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (columns, rows) => [columns, ...rows].map((r) => r.map((v) => csvCell(String(v ?? ""))).join(",")).join("\n") + "\n";

export function showDataExplorer(A, path = A.currentPath()) {
  const { h, toast } = A;
  if (!path || !/\.(csv|tsv|json|jsonl|ndjson|geojson)$/i.test(path)) return toast("Open a CSV, TSV, JSON or JSON Lines file first", "info");
  const loaded = loadTable(A.textOf(path) || "", path);
  if (loaded.error) return toast(loaded.error, "warn", 6000);
  const columns = loaded.columns; let rows = loaded.rows, capped = false;
  if (rows.length > MAX_ROWS) { rows = rows.slice(0, MAX_ROWS); capped = true; }
  if (!rows.length) return toast("There are no rows in this file", "info");
  const C = columns.length, R = rows.length;
  // column types and number values
  const cols = columns.map((name, j) => {
    let nonEmpty = 0, nums = 0;
    for (let i = 0; i < Math.min(R, 5000); i++) { const s = rows[i][j]; if (s !== "") { nonEmpty++; if (!Number.isNaN(toNumber(s))) nums++; } }
    const numeric = nonEmpty > 0 && nums / nonEmpty >= 0.95;
    return { name, numeric, nums: numeric ? Float64Array.from(rows, (r) => toNumber(r[j])) : null };
  });
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  const state = { search: "", filters: Array(C).fill(""), preds: Array(C).fill(null), sort: -1, dir: 1, sel: -1, tab: "profile", group: { key: 0, fn: "count", val: Math.max(0, cols.findIndex((c) => c.numeric)) } };
  let view = [];
  const RH = 26;

  const search = h("input", { class: "de-search", placeholder: "Search every column", spellcheck: "false" });
  const info = h("span", { class: "de-info muted small" });
  const grid = h("div", { class: "de-grid" });
  const table = h("table", { class: "de-table" });
  const thead = h("thead"), tbody = h("tbody");
  table.append(thead, tbody); grid.append(table);
  const side = h("div", { class: "de-side" });
  const tabProfile = h("button", { class: "de-tab active" }, "Column"), tabGroup = h("button", { class: "de-tab" }, "Group by");

  // header: names (click to sort) and a filter box under each
  const sortMarks = [], filterBoxes = [];
  const nameRow = h("tr"), filterRow = h("tr", { class: "de-filters" });
  nameRow.append(h("th", { class: "de-idx" }, "#"));
  filterRow.append(h("th", { class: "de-idx" }));
  cols.forEach((c, j) => {
    const mark = h("span", { class: "de-mark" }); sortMarks.push(mark);
    nameRow.append(h("th", { "data-j": j, title: `${c.name} (${c.numeric ? "numbers" : "text"}). Click to sort, Shift+click to profile only.` }, h("span", { class: "de-name" }, c.name), h("span", { class: "de-type" }, c.numeric ? "123" : "abc"), mark));
    const box = h("input", { class: "de-filter", placeholder: c.numeric ? ">5  1..9  =3" : "text  =exact  !not  /re/", spellcheck: "false", "data-j": j });
    filterBoxes.push(box); filterRow.append(h("th", {}, box));
  });
  thead.append(nameRow, filterRow);

  const matches = () => {
    const q = state.search.toLowerCase(), active = state.preds.map((p, j) => (p && !p.bad ? j : -1)).filter((j) => j >= 0);
    const out = [];
    for (let i = 0; i < R; i++) {
      const r = rows[i]; let ok = true;
      for (const j of active) if (!state.preds[j](r[j], cols[j].nums ? cols[j].nums[i] : NaN)) { ok = false; break; }
      if (ok && q) { ok = false; for (let j = 0; j < C; j++) if (r[j].toLowerCase().includes(q)) { ok = true; break; } }
      if (ok) out.push(i);
    }
    if (state.sort >= 0) {
      const j = state.sort, d = state.dir, nums = cols[j].nums;
      if (nums) out.sort((a, b) => { const x = nums[a], y = nums[b]; return Number.isNaN(x) ? (Number.isNaN(y) ? 0 : 1) : Number.isNaN(y) ? -1 : (x - y) * d; });
      else out.sort((a, b) => collator.compare(rows[a][j], rows[b][j]) * d);
    }
    return out;
  };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function renderRows() {
    const head = thead.offsetHeight || 56, top = Math.max(0, grid.scrollTop - head), vis = Math.ceil(grid.clientHeight / RH);
    const start = Math.max(0, Math.floor(top / RH) - 6), end = Math.min(view.length, start + vis + 14);
    let html = start ? `<tr style="height:${start * RH}px"><td colspan="${C + 1}"></td></tr>` : "";
    for (let k = start; k < end; k++) {
      const i = view[k], r = rows[i];
      html += `<tr><td class="de-idx">${i + 1}</td>` + r.map((v, j) => `<td class="${cols[j].numeric ? "n" : ""}${j === state.sel ? " sel" : ""}" title="${esc(v.length > 200 ? v.slice(0, 200) + "…" : v)}">${esc(v)}</td>`).join("") + "</tr>";
    }
    if (end < view.length) html += `<tr style="height:${(view.length - end) * RH}px"><td colspan="${C + 1}"></td></tr>`;
    tbody.innerHTML = html;
  }
  function refresh({ keepScroll = false } = {}) {
    view = matches();
    if (!keepScroll) grid.scrollTop = 0;
    info.textContent = `${view.length.toLocaleString()} of ${R.toLocaleString()} rows · ${C} columns${capped ? ` (the file has more than ${MAX_ROWS.toLocaleString()} rows, the first ones are shown)` : ""}`;
    sortMarks.forEach((m, j) => (m.textContent = state.sort === j ? (state.dir > 0 ? " ▲" : " ▼") : ""));
    renderRows(); renderSide();
  }

  /* ---- the side panel ---- */
  function bars(items, onPick) {
    const max = Math.max(1, ...items.map((x) => x.count));
    return h("div", { class: "de-bars" }, ...items.map((x) => h("div", { class: "de-bar" + (onPick ? " pick" : ""), title: x.title || "", onclick: onPick ? () => onPick(x) : null },
      h("span", { class: "de-bar-l" }, x.label), h("span", { class: "de-bar-t" }, h("i", { style: { width: `${(x.count / max) * 100}%` } })), h("span", { class: "de-bar-n" }, x.count.toLocaleString()))));
  }
  const setFilter = (j, text) => { filterBoxes[j].value = text; state.filters[j] = text; state.preds[j] = compileFilter(text, cols[j].numeric); filterBoxes[j].classList.toggle("bad", !!state.preds[j]?.bad); refresh(); };
  function profile() {
    const j = state.sel;
    if (j < 0) return h("div", { class: "muted small pad" }, "Click a column name to see its numbers and a chart of its values. Click a bar to filter to it.");
    const c = cols[j], vals = view.map((i) => rows[i][j]), empty = vals.filter((v) => v === "").length;
    const distinct = new Map(); for (const v of vals) distinct.set(v, (distinct.get(v) || 0) + 1);
    const out = [h("div", { class: "de-prof-h" }, h("b", {}, c.name), h("span", { class: "muted small" }, c.numeric ? "  numbers" : "  text")),
      h("div", { class: "de-facts muted small" }, `${vals.length.toLocaleString()} rows · ${empty.toLocaleString()} empty · ${distinct.size.toLocaleString()} different values`)];
    if (c.numeric) {
      const d = describe(view.map((i) => c.nums[i]));
      if (!d) return h("div", {}, ...out, h("div", { class: "muted small pad" }, "No numbers in the rows shown."));
      out.push(h("div", { class: "de-stats" }, ...[["Minimum", d.min], ["Maximum", d.max], ["Mean", d.mean], ["Median", d.median], ["Std. deviation", d.sd], ["Sum", d.sum]].map(([k, v]) => h("div", {}, h("span", { class: "muted small" }, k), h("b", {}, fmt(v))))));
      const span = d.max - d.min, ints = d.sorted.every((x) => Number.isInteger(x)), nb = span === 0 ? 1 : ints && span < 12 ? span + 1 : 12, w = span === 0 ? 1 : span / nb;
      const counts = Array(nb).fill(0); for (const x of d.sorted) counts[Math.min(nb - 1, Math.floor((x - d.min) / w))]++;
      out.push(h("div", { class: "de-sub" }, "Distribution"), bars(counts.map((count, b) => { const lo = d.min + b * w, hi = lo + w; return { count, label: ints && span < 12 ? fmt(lo) : `${fmt(lo)} to ${fmt(hi)}`, lo, hi: b === nb - 1 ? d.max : hi, title: "Click to filter to this range" }; }), (x) => setFilter(j, ints && span < 12 ? `=${x.lo}` : `${x.lo}..${x.hi}`)));
    } else {
      const top = [...distinct].sort((a, b) => b[1] - a[1]).slice(0, 12);
      out.push(h("div", { class: "de-sub" }, distinct.size > 12 ? "Most common values" : "Values"), bars(top.map(([v, count]) => ({ label: v === "" ? "(empty)" : v.length > 28 ? v.slice(0, 27) + "…" : v, count, v, title: "Click to filter to this value" })), (x) => setFilter(j, x.v === "" ? "empty" : "=" + x.v)));
    }
    return h("div", {}, ...out);
  }
  const AGG = { count: "Count", sum: "Sum", mean: "Average", min: "Smallest", max: "Largest", median: "Median" };
  function groupRows() {
    const g = state.group, map = new Map();
    for (const i of view) { const k = rows[i][g.key]; let a = map.get(k); if (!a) map.set(k, (a = [])); if (g.fn !== "count") { const x = cols[g.val].nums?.[i]; if (Number.isFinite(x)) a.push(x); } else a.push(1); }
    const res = [...map].map(([k, a]) => ({ key: k, count: g.fn === "count" ? a.length : a.length ? { sum: a.reduce((s, x) => s + x, 0), mean: a.reduce((s, x) => s + x, 0) / a.length, min: Math.min(...a), max: Math.max(...a), median: describe(a).median }[g.fn] : 0, n: a.length }));
    res.sort((a, b) => b.count - a.count);
    return res;
  }
  function groupBy() {
    const g = state.group, numericCols = cols.map((c, j) => [c, j]).filter(([c]) => c.numeric);
    const key = h("select", { onchange: () => { g.key = +key.value; renderSide(); } }, cols.map((c, j) => h("option", { value: j, selected: j === g.key }, c.name)));
    const fn = h("select", { onchange: () => { g.fn = fn.value; renderSide(); } }, Object.entries(AGG).map(([v, l]) => h("option", { value: v, selected: v === g.fn }, l)));
    const val = h("select", { onchange: () => { g.val = +val.value; renderSide(); } }, numericCols.map(([c, j]) => h("option", { value: j, selected: j === g.val }, c.name)));
    const res = groupRows(), shown = res.slice(0, 200);
    return h("div", {},
      h("div", { class: "de-group-form" }, h("label", { class: "muted small" }, "Group rows by"), key, h("label", { class: "muted small" }, "and show the"), fn, g.fn !== "count" ? h("label", { class: "muted small" }, "of") : null, g.fn !== "count" ? (numericCols.length ? val : h("span", { class: "muted small" }, "(no number columns)")) : null),
      h("div", { class: "de-facts muted small" }, `${res.length.toLocaleString()} group${res.length === 1 ? "" : "s"} among the ${view.length.toLocaleString()} rows shown`),
      bars(shown.slice(0, 40).map((x) => ({ label: x.key === "" ? "(empty)" : x.key.length > 24 ? x.key.slice(0, 23) + "…" : x.key, count: x.count, k: x.key, title: "Click to filter to this group" })), (x) => setFilter(g.key, x.k === "" ? "empty" : "=" + x.k)),
      h("div", { class: "de-group-foot" }, h("button", { class: "btn sm", onclick: () => A.downloadBlob(new Blob([toCsv([cols[g.key].name, g.fn === "count" ? "count" : `${g.fn} of ${cols[g.val]?.name}`], shown.map((x) => [x.key, x.count]))], { type: "text/csv" }), "groups.csv") }, "Export groups as CSV"), res.length > 40 ? h("span", { class: "muted small" }, "  chart shows the top 40") : null));
  }
  function renderSide() {
    tabProfile.classList.toggle("active", state.tab === "profile"); tabGroup.classList.toggle("active", state.tab === "group");
    side.replaceChildren(state.tab === "profile" ? profile() : groupBy());
  }

  /* ---- events ---- */
  let t = null; const later = (fn) => { clearTimeout(t); t = setTimeout(fn, 140); };
  search.addEventListener("input", () => later(() => { state.search = search.value; refresh(); }));
  filterRow.addEventListener("input", (e) => { const j = +e.target.dataset.j; later(() => { state.filters[j] = e.target.value; state.preds[j] = compileFilter(e.target.value, cols[j].numeric); e.target.classList.toggle("bad", !!state.preds[j]?.bad); refresh(); }); });
  nameRow.addEventListener("click", (e) => {
    const th = e.target.closest("th[data-j]"); if (!th) return; const j = +th.dataset.j;
    state.sel = j; state.tab = "profile";
    if (!e.shiftKey) { if (state.sort === j) { if (state.dir > 0) state.dir = -1; else state.sort = -1; } else { state.sort = j; state.dir = 1; } }
    nameRow.querySelectorAll("th").forEach((x) => x.classList.toggle("sel", +x.dataset.j === j));
    refresh({ keepScroll: true });
  });
  grid.addEventListener("scroll", () => requestAnimationFrame(renderRows));
  tabProfile.onclick = () => { state.tab = "profile"; renderSide(); };
  tabGroup.onclick = () => { state.tab = "group"; renderSide(); };
  const clear = () => { search.value = ""; state.search = ""; filterBoxes.forEach((b, j) => { b.value = ""; b.classList.remove("bad"); state.filters[j] = ""; state.preds[j] = null; }); refresh(); };
  const exportCsv = () => { const name = path.split("/").pop().replace(/\.[^.]+$/, "") + (view.length < R ? "-filtered" : "") + ".csv"; A.downloadBlob(new Blob([toCsv(columns, view.map((i) => rows[i]))], { type: "text/csv" }), name); };
  const exportJson = () => { A.downloadBlob(new Blob([JSON.stringify(view.map((i) => Object.fromEntries(columns.map((c, j) => [c, cols[j].numeric && rows[i][j] !== "" ? cols[j].nums[i] : rows[i][j]]))), null, 2)], { type: "application/json" }), path.split("/").pop().replace(/\.[^.]+$/, "") + ".json"); };

  A.openModal(h("div", { class: "modal de-modal" },
    h("div", { class: "modal-head" }, `Data explorer: ${path}`),
    h("div", { class: "modal-body de-body" },
      h("div", { class: "de-bar-top" }, search, info, h("span", { class: "de-spacer" }), h("button", { class: "btn sm", onclick: clear }, "Clear filters")),
      h("div", { class: "de-main" }, grid, h("div", { class: "de-right" }, h("div", { class: "de-tabs" }, tabProfile, tabGroup), side))),
    h("div", { class: "modal-foot" }, h("span", { class: "muted small rp-hint" }, "Click a column name to sort and profile it. Filters: >5  1..9  =exact  !not  /regex/  empty"), h("button", { class: "btn", onclick: exportJson }, "Export as JSON"), h("button", { class: "btn", onclick: exportCsv }, "Export as CSV"), h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))));
  refresh();
}
