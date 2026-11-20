// Fade backgrounds: full-screen color that cross-fades slowly between a few palettes, about
// half a minute each. Smooth ones are plain gradients with a little grain so they do not band;
// pixel ones are the same idea, Bayer-dithered into chunky pixels and redrawn a few times a second.
import { mix, offscreen } from "./scenes.js";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hexRgb = (hex) => { const n = parseInt(hex.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

const SKY = [["#2b3a7a", "#c86a9a", "#ffb08a"], ["#2a6ad8", "#6aa8ec", "#cfe6f8"], ["#1a1040", "#7a2a6a", "#ff7a4a"], ["#04061a", "#0e1640", "#2a3462"]];
const OCEAN = [["#022c43", "#05668d", "#00a896"], ["#0b1d3a", "#1b4f8a", "#3aa0c8"], ["#022a3a", "#046a6a", "#42c2a8"]];
const EMBER = [["#1a0610", "#7a1a2a", "#e8603a"], ["#14061e", "#5a1a5a", "#d84a6a"], ["#1a0a06", "#8a3010", "#f0a040"]];
const NEON = [["#12001f", "#7a00a8", "#ff2a8a"], ["#00101f", "#0060a8", "#2ae8ff"], ["#10001a", "#4a1aa8", "#ff6ad5"]];
const PASTEL_DARK = [["#4a2840", "#36295a", "#22365e"], ["#1e4a46", "#22365e", "#4a3c26"], ["#4e3426", "#4a2440", "#302a5e"]];
const PASTEL = [["#ffd6e0", "#e8dcff", "#d6e8ff"], ["#d6f5ec", "#d6e8ff", "#fff0d0"], ["#ffe4d0", "#ffd6e6", "#e0dcff"]];
const GLOW = [["#4c8dff", "#b48aff"], ["#ff6a8a", "#ffb36a"], ["#3de8c8", "#4c8dff"], ["#d86aff", "#ff6aa8"]];

/** The palette at time t: hold, then ease into the next one. */
function paletteAt(sets, t, period = 32) {
  const f = t / period, i = Math.floor(f) % sets.length, j = (i + 1) % sets.length, x = f - Math.floor(f);
  const k = x < 0.4 ? 0 : (1 - Math.cos(((x - 0.4) / 0.6) * Math.PI)) / 2;
  return sets[i].map((c, n) => lerp3(hexRgb(c), hexRgb(sets[j][n]), k));
}
/** Keep a palette made for dark themes readable under light ones, and the other way round. */
function adapt(pal, s, madeFor) {
  if (madeFor === "dark" && !s.dark) return pal.map((c) => lerp3(c, [255, 255, 255], 0.42));
  if (madeFor === "light" && s.dark) return pal.map((c) => lerp3(c, [16, 16, 24], 0.6));
  return pal;
}
function grain() {
  return offscreen(128, 128, (c) => { const img = c.createImageData(128, 128); for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 10; } c.putImageData(img, 0, 0); });
}
function drawGrain(ctx, s) { ctx.fillStyle = ctx.createPattern(s.grain, "repeat"); ctx.fillRect(0, 0, s.w, s.h); }

/** Paint into a cached canvas at most twice a second, and copy that to the screen every frame. */
function cached(paint) {
  return (ctx, s, t) => {
    if (!s.cache || s.cache.width !== s.w || s.cache.height !== s.h) { s.cache = offscreen(s.w, s.h, () => {}); s.last = -1; }
    if (s.last < 0 || t - s.last >= 0.5) { s.last = t; paint(s.cache.getContext("2d"), s, t); }
    ctx.drawImage(s.cache, 0, 0);
  };
}

/** A smooth fade: a linear gradient through the palette, its angle turning very slowly. */
function smoothFade(sets, madeFor, angle, turn, darkSets) {
  return {
    lowRes: 0.35,
    init(s) { s.grain = grain(); s.cache = null; },
    draw: cached((ctx, s, t) => {
      const { w, h } = s, pal = (darkSets && s.dark ? paletteAt(darkSets, t) : adapt(paletteAt(sets, t), s, madeFor)).map(toHex);
      const a = angle + Math.sin(t * 0.01) * turn, r = Math.hypot(w, h) / 2, cx = w / 2, cy = h / 2;
      const g = ctx.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      pal.forEach((c, i) => g.addColorStop(i / (pal.length - 1), c));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // a soft light that drifts across, so it is not perfectly flat
      const lx = w * (0.5 + 0.35 * Math.sin(t * 0.017)), ly = h * (0.5 + 0.3 * Math.cos(t * 0.013)), R = Math.max(w, h) * 0.6;
      const rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, R);
      rg.addColorStop(0, s.dark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.25)"); rg.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      drawGrain(ctx, s);
    }),
  };
}

/**
 * A pixel fade: value(x, y, t) in 0..1 picks a place along the palette (stretched to six steps),
 * dithered between neighbouring steps. Redrawn about four times a second.
 */
function pixelFade(sets, madeFor, value) {
  return {
    lowRes: 0.12, pixel: true,
    init(s) { s.img = null; s.last = -1; },
    draw(ctx, s, t) {
      const { w, h } = s;
      if (!s.img || s.img.width !== w || s.img.height !== h) { s.img = ctx.createImageData(w, h); s.buf = new Uint32Array(s.img.data.buffer); s.last = -1; }
      if (t - s.last >= 0.25 || s.last < 0) {
        s.last = t;
        const base = adapt(paletteAt(sets, t), s, madeFor), steps = [];
        for (let i = 0; i < 6; i++) { const f = (i / 5) * (base.length - 1), j = Math.min(base.length - 2, Math.floor(f)); steps.push(lerp3(base[j], base[j + 1], f - j)); }
        const cols = steps.map(([r, g, b]) => ((255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0);
        const buf = s.buf;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const f = Math.max(0, Math.min(0.9999, value(x / w, y / h, t, w / h))) * 5, i = Math.floor(f);
          buf[y * w + x] = cols[Math.min(5, f - i > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? i + 1 : i)];
        }
      }
      ctx.putImageData(s.img, 0, 0);
    },
  };
}

export function makeFade() {
  return {
    // one plain color, chosen in settings (drawn tiny: it only needs one pixel's worth of detail)
    solid: {
      lowRes: 0.02,
      draw(ctx, s) { ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(s.solid || "") ? s.solid : "#1e4fd8"; ctx.fillRect(0, 0, s.w, s.h); },
    },
    fadesky: smoothFade(SKY, "dark", Math.PI / 2, 0.15),
    fadeocean: smoothFade(OCEAN, "dark", Math.PI / 4, 0.4),
    fadeember: smoothFade(EMBER, "dark", (3 * Math.PI) / 4, 0.4),
    fadeneon: smoothFade(NEON, "dark", Math.PI / 5, 0.6),
    fadepastel: smoothFade(PASTEL, "light", 0, 0.5, PASTEL_DARK),

    /* two soft glows on black, in opposite corners, each fading between colors */
    fadeglow: {
      lowRes: 0.35,
      init(s) { s.grain = grain(); s.cache = null; },
      draw: cached((ctx, s, t) => {
        const { w, h } = s, pal = paletteAt(GLOW, t, 28).map(toHex), R = Math.max(w, h) * 0.75;
        ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, w, h);
        const spots = [[w * (0.1 + 0.08 * Math.sin(t * 0.02)), h * (0.15 + 0.1 * Math.cos(t * 0.015)), pal[0]], [w * (0.9 - 0.08 * Math.sin(t * 0.017)), h * (0.85 - 0.1 * Math.cos(t * 0.021)), pal[1]]];
        ctx.globalCompositeOperation = "lighter";
        for (const [x, y, c] of spots) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, R);
          g.addColorStop(0, mix(c, "#000000", 0.45)); g.addColorStop(0.5, mix(c, "#000000", 0.82)); g.addColorStop(1, "#000000");
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        }
        ctx.globalCompositeOperation = "source-over";
        drawGrain(ctx, s);
      }),
    },

    // sky colors top to bottom, the horizon breathing up and down a little
    pixelfadesky: pixelFade(SKY, "dark", (u, v, t) => v + Math.sin(t * 0.05) * 0.05),
    // neon bands on a diagonal, sliding very slowly
    pixelfadeneon: pixelFade(NEON, "dark", (u, v, t, asp) => { const d = (u * asp * 0.6 + v * 0.8) / (asp * 0.6 + 0.8); return 0.5 + 0.5 * Math.sin((d * 1.6 + t * 0.01) * Math.PI * 2 * 0.5) * 0.98; }),
    // ember rings glowing out from below the middle
    pixelfadeember: pixelFade(EMBER, "dark", (u, v, t, asp) => 1 - Math.min(1, Math.hypot((u - 0.5) * asp, (v - 0.85) * 1.1) / (1.05 + Math.sin(t * 0.04) * 0.05))),
    // ocean bands bent by a slow, wide swell
    pixelfadeocean: pixelFade(OCEAN, "dark", (u, v, t) => v * 0.9 + Math.sin(u * 5 + t * 0.15) * 0.04 + Math.sin(u * 2.3 - t * 0.09) * 0.03 + 0.05),
  };
}

export const FADE = [
  ["solid", "Solid color"],
  ["fadeember", "Ember fade"], ["fadeglow", "Glow fade (black)"], ["fadeneon", "Neon fade"], ["fadeocean", "Ocean fade"], ["fadepastel", "Pastel fade"], ["fadesky", "Sky fade"],
  ["pixelfadeember", "Pixel ember fade"], ["pixelfadeneon", "Pixel neon fade"], ["pixelfadeocean", "Pixel ocean fade"], ["pixelfadesky", "Pixel sky fade"],
];
