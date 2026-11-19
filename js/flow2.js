// More good-looking backgrounds: liquid marble (a smooth field of color), glass orbs, layered
// waves, and pixel-art ones: pixel marble, pixel waves, pixel holo, pixel fire and a pixel planet.
// The field effects compute every pixel of a small canvas and let the browser stretch it: smoothly for
// the soft ones, with sharp square pixels for the pixel-art ones.
import { rand, TAU, mix, rgba } from "./scenes.js";
import { flow, cyc } from "./flow.js";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const hexRgb = (hex) => { const n = parseInt(hex.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
/** 256 colors around a looping palette, as packed pixels (little-endian ABGR). */
function lut(pal, loop = true) {
  const out = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = loop ? cyc(pal, i / 256) : mix(pal[Math.min(pal.length - 2, Math.floor((i / 255) * (pal.length - 1)))], pal[Math.min(pal.length - 1, Math.floor((i / 255) * (pal.length - 1)) + 1)], ((i / 255) * (pal.length - 1)) % 1);
    const [r, g, b] = hexRgb(c); out[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  }
  return out;
}

/* ---------- marble-like fields: color flows like paint being stirred ---------- */
const FIELD_PALETTES = {
  marble: (s) => (s.dark ? ["#0d0b2a", "#2a1a6a", "#5a3ab8", "#3d7bff", "#3ddcff", "#ff8ad8", "#7a2a8a", "#1a1450"] : ["#f4efff", "#c9c3ff", "#8fa8ff", "#5a6aff", "#b48aff", "#ffb0e0", "#ffd6c2", "#fff4ec"]),
  smoke: (s) => (s.dark ? ["#06070b", "#0b0d14", "#1a1e2a", mix(s.colors[0] || "#4c8dff", "#1a1e2a", 0.5), "#c8d0e0"] : ["#f8f9fc", "#eef0f5", "#d4d9e4", mix(s.colors[0] || "#4c8dff", "#d4d9e4", 0.5), "#5a6070"]),
  pixelmarble: (s) => (s.dark ? ["#120c2e", "#2c1a6a", "#5a3ab8", "#3d7bff", "#3de8ff", "#ff6bd0", "#8a2a9a", "#1e1650"] : ["#fff0f6", "#ffc2e2", "#d49aff", "#8a7aff", "#5ab0ff", "#9af0ff", "#fff3b0", "#ffd6c2"]),
};
function field(kind, { lowRes, pixel, levels = 0, scale = 2.2, warp = 0.9, density = false }) {
  return {
    lowRes, pixel,
    init(s) { s.lut = lut(FIELD_PALETTES[kind](s), !density); s.img = null; },
    draw(ctx, s, t) {
      const { w, h } = s;
      if (!s.img || s.img.width !== w || s.img.height !== h) { s.img = ctx.createImageData(w, h); s.buf = new Uint32Array(s.img.data.buffer); }
      const buf = s.buf, L = s.lut, asp = w / h;
      for (let y = 0; y < h; y++) {
        const ny = (y / h) * scale;
        for (let x = 0; x < w; x++) {
          let u = (x / w) * scale * asp, v = ny;
          const q1 = Math.sin(u * 1.1 + t * 0.13) + Math.sin(v * 1.3 - t * 0.11);
          const q2 = Math.sin(u * 0.9 - t * 0.09 + 1.7) + Math.cos(v * 1.2 + t * 0.12);
          u += q1 * warp; v += q2 * warp;
          let val = Math.sin(u * 1.4 + Math.sin(v * 1.1 + t * 0.07) * 2.2) * 0.5 + 0.5;
          if (density) { // thin bright wisps where the field peaks, with finer curls on top
            const fine = Math.sin(u * 3.3 + q2 * 1.6 - t * 0.09) * Math.sin(v * 2.7 - q1 * 1.2 + t * 0.06) * 0.5 + 0.5;
            const d = Math.max(0, Math.min(0.999, Math.pow(val, 4) * 0.85 + Math.pow(fine, 6) * 0.35));
            buf[y * w + x] = L[Math.floor(d * 256)]; continue;
          }
          val = val * 0.85 + q1 * 0.04 + t * 0.006;
          if (levels) { const f = ((val % 1) + 1) % 1 * levels + BAYER[(y & 3) * 4 + (x & 3)] - 0.5; val = Math.round(f) / levels; }
          buf[y * w + x] = L[(Math.floor((((val % 1) + 1) % 1) * 256)) & 255];
        }
      }
      ctx.putImageData(s.img, 0, 0);
    },
  };
}

/* ---------- glass orbs ---------- */
function orbs() {
  return {
    lowRes: 1,
    init(s) {
      const m = Math.min(s.w, s.h);
      s.iri = ["#5a4bff", "#3d7bff", "#3ddcff", "#b48aff", "#ff8ad8", "#ffb38a"];
      s.orbs = Array.from({ length: 8 }, () => ({ x: rand(0.1, 0.9) * s.w, y: rand(0.1, 0.9) * s.h, r: m * rand(0.05, 0.15), vx: rand(-12, 12), vy: rand(-10, 10), hue: rand(0, 1) })).sort((a, b) => a.r - b.r);
      s.bgBlobs = (s.dark ? ["#2a1a6a", "#0f3a7a", "#5a1a5a"] : ["#c9c3ff", "#b8e0ff", "#ffd0ec"]).map((c) => ({ c, x: rand(0.1, 0.9), y: rand(0.1, 0.9), ph: rand(0, TAU) }));
      s.small = Object.assign(document.createElement("canvas"), { width: Math.max(8, Math.round(s.w / 10)), height: Math.max(8, Math.round(s.h / 10)) });
    },
    draw(ctx, s, t, dt) {
      const { w, h } = s, g = s.small.getContext("2d"), sw = s.small.width, sh = s.small.height;
      g.fillStyle = s.dark ? "#0a0a1e" : "#f1eefb"; g.fillRect(0, 0, sw, sh);
      for (const b of s.bgBlobs) { const x = (b.x + Math.sin(t * 0.05 + b.ph) * 0.2) * sw, y = (b.y + Math.cos(t * 0.04 + b.ph) * 0.2) * sh, r = Math.max(sw, sh) * 0.5, rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rgba(b.c, 0.9)); rg.addColorStop(1, rgba(b.c, 0)); g.fillStyle = rg; g.fillRect(0, 0, sw, sh); }
      ctx.imageSmoothingEnabled = true; ctx.drawImage(s.small, 0, 0, w, h);
      for (const o of s.orbs) {
        o.x += o.vx * dt * s.px; o.y += o.vy * dt * s.px;
        if (o.x < o.r || o.x > w - o.r) o.vx *= -1; if (o.y < o.r || o.y > h - o.r) o.vy *= -1;
        const { x, y, r } = o, c1 = cyc(s.iri, o.hue + t * 0.02), c2 = cyc(s.iri, o.hue + 0.35 + t * 0.02);
        // soft shadow, the body lit from the top left, an iridescent rim, then the shine
        const sg = ctx.createRadialGradient(x + r * 0.25, y + r * 1.05, 0, x + r * 0.25, y + r * 1.05, r);
        sg.addColorStop(0, s.dark ? "rgba(0, 0, 0, 0.35)" : "rgba(60, 40, 120, 0.18)"); sg.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x + r * 0.25, y + r * 1.05, r * 0.9, r * 0.25, 0, 0, TAU); ctx.fill();
        const bg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
        bg.addColorStop(0, rgba(mix(c1, "#ffffff", 0.75), 0.9)); bg.addColorStop(0.45, rgba(c1, 0.55)); bg.addColorStop(0.85, rgba(c2, 0.7)); bg.addColorStop(1, rgba(mix(c2, "#000000", 0.2), 0.85));
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        if (ctx.createConicGradient) {
          const cg = ctx.createConicGradient(t * 0.3 + o.hue * TAU, x, y);
          s.iri.forEach((c, i) => cg.addColorStop(i / s.iri.length, rgba(c, 0.55))); cg.addColorStop(1, rgba(s.iri[0], 0.55));
          ctx.strokeStyle = cg; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.arc(x, y, r * 0.965, 0, TAU); ctx.stroke();
        }
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)"; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.46, r * 0.26, r * 0.13, -0.6, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)"; ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.62, r * 0.05, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)"; ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0.3, 1.3); ctx.stroke();
      }
    },
  };
}

/* ---------- layered waves (smooth, or as pixel art) ---------- */
function layers(pixel) {
  return {
    lowRes: pixel ? 0.14 : 1, pixel,
    init(s) {
      s.cols = s.dark ? ["#2a2f6e", "#323a86", "#3c3f99", "#4a44a8", "#5c48b4", "#7550bd", "#934fbf"] : ["#ffe2cf", "#ffc9c4", "#ffb0c4", "#f39ac8", "#d590d8", "#b088e2", "#8a80e6"];
      s.sky = s.dark ? ["#0c0e2a", "#1d1f4a"] : ["#fff4e8", "#ffe9dc"];
      s.L = s.cols.map((c, i) => ({ c, y: 0.18 + i * 0.115, a: rand(0.04, 0.08), f: rand(0.8, 1.6), ph: rand(0, TAU), sp: rand(0.03, 0.07) * (i % 2 ? 1 : -1) }));
    },
    draw(ctx, s, t) {
      const { w, h } = s;
      const sg = ctx.createLinearGradient(0, 0, 0, h); sg.addColorStop(0, s.sky[0]); sg.addColorStop(1, s.sky[1]);
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
      const step = pixel ? 1 : 6 * s.px;
      for (const l of s.L) {
        const yAt = (x) => (l.y + l.a * Math.sin((x / w) * l.f * TAU * 0.5 + l.ph + t * l.sp * TAU * 0.25) + l.a * 0.4 * Math.sin((x / w) * l.f * 2.3 * TAU * 0.5 - t * l.sp * 1.7)) * h;
        const path = () => { ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, pixel ? Math.round(yAt(x)) : yAt(x)); ctx.lineTo(w, h); ctx.closePath(); };
        if (!pixel) { // a soft shadow cast onto the layer behind
          ctx.save(); ctx.translate(0, -6 * s.px); path(); ctx.fillStyle = s.dark ? "rgba(0, 0, 0, 0.18)" : "rgba(120, 60, 120, 0.1)"; ctx.fill(); ctx.translate(0, -6 * s.px); path(); ctx.fill(); ctx.restore();
        }
        path();
        if (pixel) ctx.fillStyle = l.c;
        else { const g = ctx.createLinearGradient(0, l.y * h - l.a * h, 0, h); g.addColorStop(0, mix(l.c, "#ffffff", 0.12)); g.addColorStop(1, mix(l.c, "#000000", 0.18)); ctx.fillStyle = g; }
        ctx.fill();
        if (pixel) { ctx.fillStyle = mix(l.c, "#ffffff", 0.14); for (let x = 0; x < w; x++) ctx.fillRect(x, Math.round(yAt(x)), 1, 1); }
        else { ctx.strokeStyle = "rgba(255, 255, 255, 0.25)"; ctx.lineWidth = 1.2 * s.px; ctx.beginPath(); for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, yAt(x) + 1); ctx.stroke(); }
      }
    },
  };
}

/* ---------- pixel fire: the classic spreading-fire algorithm ---------- */
const FIRE = ["#070707", "#1f0707", "#2f0f07", "#470f07", "#571707", "#671f07", "#771f07", "#8f2707", "#9f2f07", "#af3f07", "#bf4707", "#c74707", "#df4f07", "#df5707", "#df5707", "#d75f07", "#d7670f", "#cf6f0f", "#cf770f", "#cf7f0f", "#cf8717", "#c78717", "#c78f17", "#c7971f", "#bf9f1f", "#bf9f1f", "#bfa727", "#bfa727", "#bfaf2f", "#b7af2f", "#b7b72f", "#b7b737", "#cfcf6f", "#dfdf9f", "#efefc7", "#ffffff"].map((c) => { const [r, g, b] = hexRgb(c); return (255 << 24) | (b << 16) | (g << 8) | r; });
function pixelFire() {
  return {
    lowRes: 0.16, pixel: true,
    init(s) { s.fire = new Uint8Array(s.w * s.h); for (let x = 0; x < s.w; x++) s.fire[(s.h - 1) * s.w + x] = FIRE.length - 1; s.acc = 0; s.img = null; },
    step(s) {
      const { w, h, fire } = s;
      for (let x = 0; x < w; x++) for (let y = 1; y < h; y++) {
        const src = y * w + x, p = fire[src];
        if (!p) { fire[src - w] = 0; continue; }
        const r = Math.floor(Math.random() * 3.2);
        const dst = src - w - r + 1;
        if (dst >= 0) fire[dst] = Math.max(0, p - (r & 1) - (Math.random() < 0.32 ? 1 : 0));
      }
    },
    draw(ctx, s, t, dt) {
      const { w, h } = s;
      // the base flickers a little so the flames breathe
      for (let x = 0; x < w; x++) s.fire[(h - 1) * w + x] = Math.random() < 0.92 ? FIRE.length - 1 : FIRE.length - 6;
      s.acc += dt; let n = 0; while (s.acc > 1 / 30 && n++ < 3) { s.acc -= 1 / 30; this.step(s); }
      if (!s.img || s.img.width !== w) { s.img = ctx.createImageData(w, h); s.buf = new Uint32Array(s.img.data.buffer); }
      for (let i = 0; i < s.fire.length; i++) { const p = s.fire[i]; s.buf[i] = p > 4 ? (FIRE[p] & 0x00ffffff) | ((Math.min(255, (p - 4) * 42)) << 24) : 0; }
      ctx.putImageData(s.img, 0, 0);
    },
  };
}

/* ---------- pixel planet ---------- */
function pixelPlanet() {
  const C = (a) => a.map((c) => { const [r, g, b] = hexRgb(c); return (255 << 24) | (b << 16) | (g << 8) | r; });
  const OCEAN = C(["#070f2e", "#0d2160", "#173a8f", "#2a5fc4", "#4a8ae6"]), LAND = C(["#0f2210", "#1f4a1c", "#356e2a", "#5a9a3a", "#9ccf5a"]), ICE = C(["#3a4560", "#7a88a8", "#b8c4dc", "#e8eef8", "#ffffff"]), CLOUD = C(["#5a6478", "#a0aabc", "#d8dee8", "#f4f6fa", "#ffffff"]);
  const ATM = C(["#3d7bff", "#8fd3ff"])[1];
  return {
    lowRes: 0.2, pixel: true,
    init(s) {
      const { w, h } = s;
      s.bg = new Uint32Array(w * h);
      const top = hexRgb("#04030c"), bot = hexRgb("#110a26");
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = y / h + (BAYER[(y & 3) * 4 + (x & 3)] - 0.5) * 0.08, c = top.map((v, i) => Math.round(v + (bot[i] - v) * Math.min(1, Math.max(0, f)))); s.bg[y * w + x] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; }
      s.stars = Array.from({ length: Math.round(w * h / 140) }, () => ({ i: Math.floor(rand(0, w)) + Math.floor(rand(0, h)) * w, ph: rand(0, TAU), sp: rand(0.5, 2), b: Math.random() < 0.2 }));
      s.cx = Math.round(w * 0.6); s.cy = Math.round(h * 0.55); s.R = Math.round(Math.min(w, h) * 0.33);
      s.img = null; s.shoot = null;
    },
    draw(ctx, s, t, dt) {
      const { w, h, cx, cy, R } = s;
      if (!s.img || s.img.width !== w) { s.img = ctx.createImageData(w, h); s.buf = new Uint32Array(s.img.data.buffer); }
      const buf = s.buf; buf.set(s.bg);
      for (const st of s.stars) if (Math.sin(t * st.sp + st.ph) > -0.3) buf[st.i] = st.b ? 0xffa8e8ff : 0xffffffff;
      const Lx = -0.62, Ly = -0.45, Lz = 0.64, rot = t * 0.12;
      // the moon goes around; it is hidden while behind the planet
      const ma = t * 0.25, mx = Math.round(cx + Math.cos(ma) * R * 1.7), my = Math.round(cy + Math.sin(ma) * R * 0.35), mr = Math.max(2, Math.round(R * 0.13)), behind = Math.sin(ma) < 0;
      const moon = () => { for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) { if (x * x + y * y > mr * mr) continue; const px = mx + x, py = my + y; if (px < 0 || py < 0 || px >= w || py >= h) continue; const l = (-x * 0.7 - y * 0.6) / mr; buf[py * w + px] = ICE[Math.max(0, Math.min(4, Math.round(1.5 + l * 2 + BAYER[(py & 3) * 4 + (px & 3)] - 0.5)))]; } };
      if (behind) moon();
      for (let y = -R - 2; y <= R + 2; y++) for (let x = -R - 2; x <= R + 2; x++) {
        const px = cx + x, py = cy + y; if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const d2 = x * x + y * y, nx = x / R, ny = y / R;
        if (d2 > R * R) { // a thin glowing atmosphere on the lit side
          if (d2 < (R + 1.6) ** 2 && nx * Lx + ny * Ly > 0.1) buf[py * w + px] = ATM;
          continue;
        }
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lon = Math.atan2(nx, nz) + rot, lat = Math.asin(ny);
        const light = Math.max(0, nx * Lx + ny * Ly + nz * Lz) * 1.15 + 0.08, dith = BAYER[(py & 3) * 4 + (px & 3)] - 0.5;
        const lvl = Math.max(0, Math.min(4, Math.round(light * 4 + dith)));
        const land = Math.sin(lon * 3 + Math.sin(lat * 4) * 1.5) + Math.sin(lat * 5 + lon * 2) * 0.6 + Math.sin(lon * 7 - lat * 3) * 0.3;
        const cloud = Math.sin(lon * 4 + t * 0.15 + lat * 2.5) * Math.sin(lat * 6 + lon * 0.7) + Math.sin(lon * 9 - t * 0.1) * 0.25;
        let pal = Math.abs(lat) > 1.12 ? ICE : land > 0.35 ? LAND : OCEAN;
        if (cloud > 0.55) pal = CLOUD;
        buf[py * w + px] = pal[lvl];
      }
      if (!behind) moon();
      if (!s.shoot && Math.random() < dt * 0.25) s.shoot = { x: rand(0, w * 0.5), y: rand(0, h * 0.3), life: 0 };
      if (s.shoot) {
        const q = s.shoot; q.life += dt;
        for (let k = 0; k < 10; k++) { const px = Math.round(q.x + q.life * 120 - k), py = Math.round(q.y + (q.life * 120 - k) * 0.4); if (px >= 0 && py >= 0 && px < w && py < h) buf[py * w + px] = k < 2 ? 0xffffffff : k < 5 ? 0xffd8c8b8 : 0xff806050; }
        if (q.life > 1.2) s.shoot = null;
      }
      ctx.putImageData(s.img, 0, 0);
    },
  };
}

export function makeFlow2() {
  return {
    marble: field("marble", { lowRes: 0.14, pixel: false, scale: 3.4, warp: 1.1 }),
    pixelmarble: field("pixelmarble", { lowRes: 0.1, pixel: true, levels: 8, scale: 3 }),
    orbs: orbs(),
    layers: layers(false),
    pixellayers: layers(true),
    pixelholo: flow("holo", { lowRes: 0.1, pixel: true }),
    pixelfire: pixelFire(),
    pixelplanet: pixelPlanet(),
  };
}

export const FLOW2 = [
  ["marble", "Liquid marble"], ["orbs", "Glass orbs"], ["layers", "Layered waves"],
  ["pixelmarble", "Pixel marble"], ["pixellayers", "Pixel waves"], ["pixelholo", "Pixel holo"], ["pixelfire", "Pixel fire"], ["pixelplanet", "Pixel planet"],
];
