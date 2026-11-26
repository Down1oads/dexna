// The Project Map: every file as a dot, and a line for each import, link, style sheet, script or image
// that one file uses from another. Laid out by a small force simulation, drawn as SVG.
import { scanRefs, target } from "./refs.js";

const COLORS = { py: "#3b82f6", js: "#eab308", mjs: "#eab308", ts: "#2563eb", tsx: "#2563eb", jsx: "#eab308", html: "#f97316", htm: "#f97316", css: "#a855f7", scss: "#a855f7", md: "#64748b", json: "#10b981", lua: "#1d4ed8", sql: "#0ea5e9" };
const colorOf = (p) => COLORS[p.split(".").pop().toLowerCase()] || "#94a3b8";

/** Python imports to files: "import a.b" and "from a.b import c" (the module, or c when it is a module). */
function pythonEdges(path, text, has) {
  const out = new Set(), base = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const modFile = (mod, rel) => {
    const parts = mod.split(".");
    for (const root of rel != null ? [rel] : ["", base]) {
      const p = (root ? root + "/" : "") + parts.join("/");
      if (has(p + ".py")) return p + ".py";
      if (has(p + "/__init__.py")) return p + "/__init__.py";
    }
    return null;
  };
  for (const m of text.matchAll(/^[ \t]*import[ \t]+([\w.]+(?:[ \t]*,[ \t]*[\w.]+)*)/gm)) for (const name of m[1].split(",")) { const f = modFile(name.trim().split(" ")[0]); if (f) out.add(f); }
  for (const m of text.matchAll(/^[ \t]*from[ \t]+(\.*)([\w.]*)[ \t]+import[ \t]+([\w., \t()]+)/gm)) {
    let rel = null;
    if (m[1]) { const up = base ? base.split("/") : []; for (let i = 1; i < m[1].length; i++) up.pop(); rel = up.join("/"); }
    const mod = m[2];
    if (mod) { const f = modFile(mod, rel); if (f) out.add(f); }
    for (const n of m[3].replace(/[()]/g, "").split(",")) { const name = n.trim().split(/\s+/)[0]; if (!name) continue; const f = modFile(mod ? `${mod}.${name}` : name, rel); if (f) out.add(f); }
  }
  out.delete(path);
  return out;
}

/** Files and the links between them. */
export function buildGraph(files, assets) {
  const has = (p) => files[p] != null || assets.includes(p);
  const nodes = [...Object.keys(files), ...assets].map((p) => ({ id: p, lines: files[p] != null ? files[p].split("\n").length : 0, asset: files[p] == null }));
  const edges = [], seen = new Set();
  const add = (a, b) => { const k = a + "\u0000" + b; if (a !== b && has(b) && !seen.has(k)) { seen.add(k); edges.push({ from: a, to: b }); } };
  for (const [p, text] of Object.entries(files)) {
    for (const r of scanRefs(p, text)) { const t = target(p, r, has); if (t) add(p, t); }
    if (p.endsWith(".py")) for (const t of pythonEdges(p, text, has)) add(p, t);
  }
  return { nodes, edges };
}

/** Fruchterman-Reingold: everything pushes apart (less with distance), links pull, a pull to the middle, cooling down. */
function layout(nodes, edges, W, H) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  nodes.forEach((n, i) => { const a = (i / nodes.length) * Math.PI * 2 + Math.random() * 0.3, r = Math.min(W, H) * 0.25; n.x = W / 2 + Math.cos(a) * r; n.y = H / 2 + Math.sin(a) * r; });
  const links = edges.map((e) => [byId.get(e.from), byId.get(e.to)]).filter(([a, b]) => a && b);
  const k = Math.min(170, Math.sqrt((W * H) / Math.max(1, nodes.length)) * 0.55);
  const steps = 400;
  for (let it = 0; it < steps; it++) {
    const temp = (W / 10) * (1 - it / steps) + 0.5;
    for (const n of nodes) { n.dx = (W / 2 - n.x) * 0.06; n.dy = (H / 2 - n.y) * 0.06; }
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]; let dx = a.x - b.x, dy = a.y - b.y; let d = Math.hypot(dx, dy);
      if (d < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = 0.5; }
      if (d > k * 2.5) continue; // only near files push apart, so separate groups stay close together
      const f = (k * k) / d; a.dx += (dx / d) * f; a.dy += (dy / d) * f; b.dx -= (dx / d) * f; b.dy -= (dy / d) * f;
    }
    for (const [a, b] of links) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, f = (d * d) / k; a.dx += (dx / d) * f; a.dy += (dy / d) * f; b.dx -= (dx / d) * f; b.dy -= (dy / d) * f; }
    for (const n of nodes) { const m = Math.hypot(n.dx, n.dy) || 1, step = Math.min(m, temp); n.x += (n.dx / m) * step; n.y += (n.dy / m) * step; }
  }
  // then fit the drawing to the frame (centred, never blown up more than 2x)
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min((W - 140) / Math.max(1, x1 - x0), (H - 100) / Math.max(1, y1 - y0), 2);
  for (const n of nodes) { n.x = W / 2 + (n.x - (x0 + x1) / 2) * s; n.y = H / 2 + (n.y - (y0 + y1) / 2) * s; }
}

export function showProjectMap(A) {
  const files = A.currentFiles(), assets = Object.keys(A.assetFiles?.() || {});
  const { nodes, edges } = buildGraph(files, assets);
  if (!nodes.length) return A.toast("This project has no files yet", "info");
  const W = 1000, H = 640;
  layout(nodes, edges, W, H);
  const svgNs = "http://www.w3.org/2000/svg", el = (tag, attrs = {}) => { const e = document.createElementNS(svgNs, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "pm-svg" });
  const defs = el("defs"); const mk = el("marker", { id: "pm-arrow", viewBox: "0 0 10 10", refX: "10", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }); mk.append(el("path", { d: "M0,0 L10,5 L0,10 z", class: "pm-arrowhead" })); defs.append(mk); svg.append(defs);
  const view = el("g"); svg.append(view);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const radius = (n) => (n.asset ? 5 : 5 + Math.min(12, Math.sqrt(n.lines) * 0.7));
  const lineEls = edges.map((e) => {
    const a = byId.get(e.from), b = byId.get(e.to), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, rb = radius(b) + 3;
    const ln = el("line", { x1: a.x, y1: a.y, x2: b.x - (dx / d) * rb, y2: b.y - (dy / d) * rb, class: "pm-edge", "marker-end": "url(#pm-arrow)" });
    ln.dataset.from = e.from; ln.dataset.to = e.to; view.append(ln); return ln;
  });
  const used = new Set(edges.map((e) => e.to)), uses = new Set(edges.map((e) => e.from));
  const nodeEls = nodes.map((n) => {
    const g = el("g", { class: "pm-node" + (n.asset ? " asset" : "") + (!used.has(n.id) && !uses.has(n.id) ? " alone" : ""), transform: `translate(${n.x},${n.y})`, tabindex: "0" });
    g.dataset.id = n.id;
    g.append(el("circle", { r: radius(n), fill: n.asset ? "transparent" : colorOf(n.id), stroke: colorOf(n.id) }));
    const label = el("text", { y: radius(n) + 12, class: "pm-label" }); label.textContent = n.id.split("/").pop(); g.append(label);
    const tip = el("title"); tip.textContent = `${n.id}${n.asset ? " (binary file)" : `, ${n.lines} lines`}\nuses ${edges.filter((e) => e.from === n.id).length}, used by ${edges.filter((e) => e.to === n.id).length}`; g.append(tip);
    g.addEventListener("click", () => { A.closeModal(); if (!n.asset) A.openFile(n.id); });
    g.addEventListener("mouseenter", () => focus(n.id)); g.addEventListener("mouseleave", () => focus(null));
    g.addEventListener("focus", () => focus(n.id)); g.addEventListener("blur", () => focus(null));
    view.append(g); return g;
  });
  // hovering a file lights up what it uses and what uses it
  function focus(id) {
    svg.classList.toggle("focusing", !!id);
    const near = new Set(id ? [id] : []);
    for (const l of lineEls) { const on = id && (l.dataset.from === id || l.dataset.to === id); l.classList.toggle("on", !!on); if (on) { near.add(l.dataset.from); near.add(l.dataset.to); } }
    for (const g of nodeEls) g.classList.toggle("on", near.has(g.dataset.id));
  }
  // zoom with the wheel, pan by dragging the background
  let scale = 1, tx = 0, ty = 0, drag = null;
  const apply = () => view.setAttribute("transform", `translate(${tx},${ty}) scale(${scale})`);
  svg.addEventListener("wheel", (e) => { e.preventDefault(); const r = svg.getBoundingClientRect(), mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H, f = e.deltaY < 0 ? 1.15 : 1 / 1.15; const ns = Math.max(0.3, Math.min(4, scale * f)); tx = mx - ((mx - tx) * ns) / scale; ty = my - ((my - ty) * ns) / scale; scale = ns; apply(); }, { passive: false });
  svg.addEventListener("pointerdown", (e) => { if (e.target.closest(".pm-node")) return; drag = { x: e.clientX, y: e.clientY, tx, ty }; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener("pointermove", (e) => { if (!drag) return; const r = svg.getBoundingClientRect(); tx = drag.tx + ((e.clientX - drag.x) / r.width) * W; ty = drag.ty + ((e.clientY - drag.y) / r.height) * H; apply(); });
  svg.addEventListener("pointerup", () => { drag = null; });

  const alone = nodes.filter((n) => !used.has(n.id) && !uses.has(n.id));
  const langs = [...new Set(nodes.filter((n) => !n.asset).map((n) => n.id.split(".").pop().toLowerCase()))].filter((x) => COLORS[x]);
  const h = A.h;
  A.openModal(h("div", { class: "modal pm-modal" },
    h("div", { class: "modal-head" }, "Project map", h("span", { class: "muted small" }, `  ${nodes.length} files, ${edges.length} links`)),
    h("div", { class: "modal-body" },
      svg,
      h("div", { class: "pm-legend" },
        ...langs.map((x) => h("span", {}, h("i", { style: { background: COLORS[x] } }), "." + x)),
        assets.length ? h("span", {}, h("i", { class: "ring" }), "binary files") : null,
        h("span", { class: "muted" }, "Arrows point from a file to what it uses. Hover to light up a file's links, click to open it, scroll to zoom, drag to move."),
        alone.length ? h("span", { class: "muted" }, `Not linked to anything: ${alone.slice(0, 6).map((n) => n.id).join(", ")}${alone.length > 6 ? "…" : ""}`) : null)),
    h("div", { class: "modal-foot" }, h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))));
}
