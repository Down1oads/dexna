// Flowing glossy backgrounds: soft blurred color underneath, with folded ribbons on top that shift
// through iridescent colors and catch a bright highlight along their edges. One engine, five looks:
// holographic, liquid glass, liquid chrome, satin (in the theme's accent) and prism (on a dark sky).
import { rand, TAU, mix, rgba } from "./scenes.js";

/** A color from a looping palette: v runs 0..1 and wraps around. */
export function cyc(pal, v) {
  const n = pal.length, f = (((v % 1) + 1) % 1) * n, i = Math.floor(f);
  return mix(pal[i % n], pal[(i + 1) % n], f - i);
}

const PALETTES = {
  holo: (s) => ({
    bg: s.dark ? ["#0d0b22", "#1c1840", "#120f2c"] : ["#ece9fb", "#dfe3fb", "#f3eefc"],
    blobs: s.dark ? ["#3b2a8a", "#1f4aa8", "#7a2a7a", "#2a6a9a"] : ["#a99bff", "#8fbaff", "#ffb0e0", "#a8e6ff", "#c4b5ff"],
    iri: ["#5a4bff", "#3d7bff", "#3ddcff", "#b48aff", "#ff8ad8", "#ffb38a"],
    pastel: s.dark ? 0.05 : 0.18, mode: "source-over", alpha: s.dark ? 0.55 : 0.8,
  }),
  glass: (s) => ({
    bg: s.dark ? ["#04121f", "#0a2238", "#06182a"] : ["#e6f4fb", "#d4ecf8", "#eef8fc"],
    blobs: s.dark ? ["#0f4a6a", "#1a2a6a", "#0a5a5a"] : ["#bfe6f7", "#cfe0ff", "#c4f2ec"],
    iri: ["#2f7bff", "#3dcfff", "#7af0e0", "#ffffff", "#8ab4ff"],
    pastel: s.dark ? 0.08 : 0.25, mode: "source-over", alpha: s.dark ? 0.5 : 0.65,
  }),
  chrome: (s) => ({
    bg: s.dark ? ["#0b0c10", "#1a1c22", "#0e0f14"] : ["#eceef2", "#dadde4", "#f4f5f8"],
    blobs: s.dark ? ["#2a2d36", "#20232b", "#30333d"] : ["#d0d4dc", "#e2e5ec", "#c8ccd6"],
    iri: s.dark ? ["#5c6270", "#c9ced8", "#8a90a0", "#f2f4f8", "#6a7080", "#ffd6f0", "#a0f0ff"] : ["#8a90a0", "#e9ecf2", "#a6acba", "#ffffff", "#7c8292", "#ffd6f0", "#bdf4ff"],
    pastel: 0.05, mode: "source-over", alpha: s.dark ? 0.75 : 0.8,
  }),
  satin: (s) => {
    const a = s.colors[0] || "#4c8dff", b = s.colors[1] || a, c = s.colors[2] || a;
    return {
      bg: s.dark ? [mix(a, "#000000", 0.85), mix(b, "#000000", 0.8), mix(a, "#000000", 0.88)] : [mix(a, "#ffffff", 0.88), mix(b, "#ffffff", 0.85), mix(a, "#ffffff", 0.92)],
      blobs: s.dark ? [mix(a, "#000000", 0.55), mix(b, "#000000", 0.6), mix(c, "#000000", 0.6)] : [mix(a, "#ffffff", 0.6), mix(b, "#ffffff", 0.65), mix(c, "#ffffff", 0.65)],
      iri: [a, mix(a, b, 0.5), b, mix(b, c, 0.5), c, mix(c, a, 0.5)],
      pastel: s.dark ? 0.05 : 0.2, mode: "source-over", alpha: s.dark ? 0.55 : 0.75,
    };
  },
  prism: () => ({
    bg: ["#03030a", "#0a0820", "#05040f"],
    blobs: ["#1a0f4a", "#0a2a5a", "#3a0a3a"],
    iri: ["#ff3d6e", "#ff9a3d", "#ffe83d", "#3dff8a", "#3dc8ff", "#6a5bff", "#d03dff"],
    pastel: 0, mode: "lighter", alpha: 0.3,
  }),
};

// ribbon layouts: y = center line (fraction of height), th = thickness (fraction of the short side),
// waves = [amplitude, frequency, speed] terms that bend the line, k = how the thickness swells along it
const LAYOUTS = {
  holo: [
    { y: 0.55, th: 0.2, k: 1.2, waves: [[0.24, 1.0, 0.06], [0.07, 2.1, -0.05]] },
    { y: 0.82, th: 0.15, k: 1.6, waves: [[0.16, 1.3, -0.05], [0.06, 2.6, 0.04]] },
    { y: 0.18, th: 0.12, k: 0.9, waves: [[0.26, 0.7, 0.05], [0.05, 2.8, -0.06]] },
  ],
  glass: [
    { y: 0.45, th: 0.22, k: 0.9, waves: [[0.18, 0.9, 0.05], [0.05, 2.1, -0.04]] },
    { y: 0.75, th: 0.15, k: 1.3, waves: [[0.1, 1.3, -0.05], [0.06, 2.6, 0.03]] },
  ],
  chrome: [
    { y: 0.4, th: 0.2, k: 1.1, waves: [[0.17, 1.0, 0.06], [0.06, 2.4, -0.05]] },
    { y: 0.7, th: 0.17, k: 1.5, waves: [[0.14, 1.2, -0.05], [0.05, 3.0, 0.04]] },
    { y: 0.15, th: 0.1, k: 0.8, waves: [[0.1, 1.6, 0.04]] },
  ],
  satin: [
    { y: 0.35, th: 0.2, k: 1.0, waves: [[0.15, 1.0, 0.05], [0.05, 2.2, -0.04]] },
    { y: 0.65, th: 0.22, k: 1.3, waves: [[0.15, 1.2, -0.04], [0.05, 2.7, 0.05]] },
    { y: 0.95, th: 0.18, k: 0.9, waves: [[0.1, 1.5, 0.05]] },
  ],
  prism: [
    { y: 0.5, th: 0.1, k: 1.4, waves: [[0.2, 1.0, 0.08], [0.07, 2.5, -0.06]] },
    { y: 0.62, th: 0.07, k: 1.0, waves: [[0.18, 1.3, -0.07], [0.05, 3.1, 0.05]] },
  ],
};

export function flow(kind, opts = {}) {
  return {
    lowRes: opts.lowRes ?? 1, pixel: !!opts.pixel,
    init(s) {
      s.pal = PALETTES[kind](s);
      s.ribbons = LAYOUTS[kind].map((r) => ({ ...r, ph: rand(0, TAU), ph2: rand(0, TAU), shift: rand(0, 1) }));
      s.blobs = s.pal.blobs.map((c, i) => ({ c, x: rand(0.1, 0.9), y: rand(0.1, 0.9), r: rand(0.35, 0.6), ph: rand(0, TAU), sp: rand(0.04, 0.09) * (i % 2 ? 1 : -1) }));
      // the soft color underneath is drawn small and stretched, which blurs it for free
      s.small = Object.assign(document.createElement("canvas"), { width: Math.max(8, Math.round(s.w / 10)), height: Math.max(8, Math.round(s.h / 10)) });
      s.mid = Object.assign(document.createElement("canvas"), { width: Math.max(8, Math.round(s.w / 5)), height: Math.max(8, Math.round(s.h / 5)) });
      s.frame = 0;
    },
    draw(ctx, s, t) {
      const { w, h, pal } = s, m = Math.min(w, h);
      const g = s.small.getContext("2d"), sw = s.small.width, sh = s.small.height;
      const bg = g.createLinearGradient(0, 0, sw, sh);
      pal.bg.forEach((c, i) => bg.addColorStop(i / (pal.bg.length - 1), c));
      g.fillStyle = bg; g.fillRect(0, 0, sw, sh);
      for (const b of s.blobs) {
        const x = (b.x + Math.sin(t * b.sp + b.ph) * 0.2) * sw, y = (b.y + Math.cos(t * b.sp * 1.3 + b.ph) * 0.2) * sh, r = b.r * Math.max(sw, sh);
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, rgba(b.c, 0.85)); rg.addColorStop(1, rgba(b.c, 0));
        g.fillStyle = rg; g.fillRect(0, 0, sw, sh);
      }
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "low";
      ctx.drawImage(s.small, 0, 0, w, h);

      // the soft ribbon bodies are redrawn every other frame (they move slowly); the sharp edges every frame
      const redraw = s.frame++ % 2 === 0 || !s.bodies;
      const mc = s.mid.getContext("2d"), k3 = s.mid.width / w;
      if (redraw) { mc.setTransform(1, 0, 0, 1, 0, 0); mc.clearRect(0, 0, s.mid.width, s.mid.height); mc.setTransform(k3, 0, 0, k3, 0, 0); }
      s.bodies = true;
      mc.globalCompositeOperation = pal.mode; mc.lineCap = "round"; mc.lineJoin = "round";
      const edges = [];
      const N = 44, L = 14;
      for (const r of s.ribbons) {
        // the center line and how thick the ribbon is at each point
        const pts = [];
        for (let i = 0; i <= N; i++) {
          const u = -0.15 + (i / N) * 1.3;
          let y = r.y;
          for (const [amp, fr, sp] of r.waves) y += amp * Math.sin(u * fr * TAU * 0.5 + r.ph + t * sp * TAU * 0.25);
          const th = r.th * m * (0.25 + 0.75 * Math.sin(u * Math.PI * r.k + r.ph2 + t * 0.05) ** 2);
          pts.push([u * w, y * h, th, u]);
        }
        const nrm = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
        // fill the ribbon with many thin strands across its width: the color shifts across it and along it,
        // and a band near one edge is lifted toward white, which reads as a glossy fold
        for (let j = 0; redraw && j <= L; j++) {
          const k = -1 + (2 * j) / L, shine = Math.exp(-(((k + 0.62) / 0.16) ** 2)) * 0.75 + Math.exp(-(((k - 0.8) / 0.08) ** 2)) * 0.35;
          const gr = mc.createLinearGradient(0, 0, w, 0);
          for (let q = 0; q <= 3; q++) {
            const u = q / 3, col = cyc(pal.iri, u * 0.8 + k * 0.22 + r.shift + t * 0.015);
            gr.addColorStop(u, rgba(mix(col, "#ffffff", Math.min(1, pal.pastel + shine)), pal.alpha * (0.35 + 0.65 * (1 - k * k)) + shine * 0.3));
          }
          mc.strokeStyle = gr; mc.lineWidth = Math.max(3, (r.th * m * 2) / L * 2);
          mc.beginPath();
          pts.forEach((p, i) => { const x = p[0] + nrm[i][0] * p[2] * k, y = p[1] + nrm[i][1] * p[2] * k; i ? mc.lineTo(x, y) : mc.moveTo(x, y); });
          mc.stroke();
        }
        edges.push([r, pts, nrm]);
      }
      ctx.drawImage(s.mid, 0, 0, w, h);
      ctx.globalCompositeOperation = pal.mode === "lighter" ? "lighter" : "source-over"; ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const [r, pts, nrm] of edges) {
        // crisp highlights on both edges, with a soft glow behind the brighter one
        for (const [k, wd, a] of [[-1, 8, 0.12], [-0.97, 2, 0.9], [0.98, 1.4, 0.55]]) {
          ctx.strokeStyle = k < 0 ? rgba("#ffffff", a) : rgba(cyc(pal.iri, r.shift + 0.4 + t * 0.015), a); ctx.lineWidth = Math.max(1, wd * s.px);
          ctx.beginPath(); pts.forEach((p, i) => { const x = p[0] + nrm[i][0] * p[2] * k, y = p[1] + nrm[i][1] * p[2] * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over"; ctx.lineCap = "butt"; ctx.lineJoin = "miter";
    },
  };
}

export function makeFlow() {
  return { holo: flow("holo"), liquidglass: flow("glass"), chrome: flow("chrome"), satin: flow("satin"), prism: flow("prism") };
}

export const FLOW = [["holo", "Holographic"], ["liquidglass", "Liquid glass"], ["chrome", "Liquid chrome"], ["satin", "Satin"], ["prism", "Prism"]];
