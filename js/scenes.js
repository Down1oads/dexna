// Landscape backgrounds: forest, mountains, a mountain lake, an ocean sunset, desert dunes, a city at
// night, underwater, star trails, a meadow, a koi pond, jellyfish, sky lanterns and a ringed planet.
// Each scene is painted in natural colors nudged toward the theme's accent, in a day version for light
// themes and a night version for dark ones. Layers that only scroll are drawn once into an offscreen
// canvas that repeats seamlessly, so a frame is a handful of image copies plus the moving details.

const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const rgb = (hex) => { const h = hex.replace("#", ""); const n = parseInt(h.length === 3 ? [...h].map((x) => x + x).join("") : h.slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };

/** A smooth random curve that repeats every 1.0: f(u) in about -1..1. Rough > 1 means smoother. */
function curve(terms, rough, first = 1) {
  const ks = Array.from({ length: terms }, (_, i) => ({ k: i + first, a: 1 / Math.pow(i + first, rough), p: rand(0, TAU) }));
  const norm = ks.reduce((s, q) => s + q.a, 0);
  return (u) => { let v = 0; for (const q of ks) v += q.a * Math.sin(TAU * q.k * u + q.p); return v / norm; };
}
function offscreen(w, h, paint) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  paint(c.getContext("2d"), c.width, c.height);
  return c;
}
/** Draw a repeating strip, scrolled left by off pixels. */
function tile(ctx, img, off, y) {
  const w = img.width, x = -(((off % w) + w) % w);
  ctx.drawImage(img, x, y);
  if (x + w < ctx.canvas.width) ctx.drawImage(img, x + w, y);
}
function skyFill(ctx, s, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, s.h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, s.w, s.h);
}
// soft round glows are drawn from a small cached picture instead of a new gradient every time
const glowCache = new Map();
function glowSprite(color) {
  let c = glowCache.get(color);
  if (!c) {
    c = offscreen(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(0.35, rgba(color, 0.45)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    if (glowCache.size > 64) glowCache.clear();
    glowCache.set(color, c);
  }
  return c;
}
function glow(ctx, x, y, r, color, a, squash = 1) {
  if (a <= 0.003) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glowSprite(color), x - r, y - r * squash, r * 2, r * 2 * squash);
  ctx.globalAlpha = 1;
}
function makeStars(s, n, maxY = 0.6) {
  return Array.from({ length: n }, () => ({ x: rand(0, s.w), y: rand(0, s.h * maxY) ** 1, r: rand(0.4, 1.4) * s.px, ph: rand(0, TAU), sp: rand(0.6, 2) }));
}
function drawStars(ctx, s, t, stars, color = "#ffffff", alpha = 1) {
  for (const st of stars) {
    ctx.globalAlpha = alpha * (0.45 + 0.55 * Math.abs(Math.sin(t * st.sp * 0.5 + st.ph)));
    ctx.fillStyle = color; ctx.fillRect(st.x, st.y, st.r * 1.6, st.r * 1.6);
  }
  ctx.globalAlpha = 1;
}
/** Sky colors for a scene: night for dark themes, day for light ones, tinted by the accent. */
function palette(s, night, day, tint = 0.18) {
  const p = s.dark ? night : day, acc = s.colors[0] || "#4c8dff", out = {};
  for (const k in p) out[k] = mix(p[k], acc, k === "sun" ? 0 : tint);
  return out;
}

/* ---------- shapes ---------- */
function pine(ctx, x, base, hgt, wid) {
  ctx.fillRect(x - wid * 0.05, base - hgt * 0.16, wid * 0.1, hgt * 0.16 + 2);
  const tiers = 4;
  ctx.beginPath();
  for (let i = 0; i < tiers; i++) {
    const top = base - hgt + (hgt * 0.78) * (i / tiers), bottom = base - hgt * 0.14 - (hgt * 0.78) * ((tiers - 1 - i) / tiers) * 0.5;
    const half = wid * (0.32 + 0.18 * (i / (tiers - 1)));
    ctx.moveTo(x, top); ctx.lineTo(x + half, bottom); ctx.lineTo(x - half, bottom); ctx.closePath();
  }
  ctx.fill();
}
function bird(ctx, x, y, size, flap) {
  const f = Math.sin(flap) * size * 0.35;
  ctx.beginPath();
  ctx.moveTo(x - size, y - f); ctx.quadraticCurveTo(x - size * 0.4, y - size * 0.25 - f * 0.4, x, y);
  ctx.quadraticCurveTo(x + size * 0.4, y - size * 0.25 - f * 0.4, x + size, y - f);
  ctx.stroke();
}

/* ---------- reusable strips ---------- */
function ridgeStrip(w, top, bottom, color, rough, terms, jag) {
  const f = curve(terms, rough), g = jag ? curve(60, 1.0, 12) : null;
  return offscreen(w, bottom - top, (c, W, H) => {
    c.fillStyle = color; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 2) {
      const u = x / W;
      let v = (f(u) + 1) / 2;
      if (g) v += g(u) * 0.08;
      c.lineTo(x, H * (0.05 + 0.75 * (1 - v)));
    }
    c.lineTo(W, H); c.closePath(); c.fill();
  });
}
function forestStrip(w, h, color, count, minH, maxH, px) {
  return offscreen(w, h, (c, W, H) => {
    c.fillStyle = color;
    const ground = curve(4, 1.4);
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) c.lineTo(x, H * 0.82 + ground(x / W) * H * 0.04);
    c.lineTo(W, H); c.closePath(); c.fill();
    for (let i = 0; i < count; i++) {
      const x = rand(0, W), th = rand(minH, maxH) * H, base = H * 0.84 + ground(x / W) * H * 0.04;
      for (const dx of [-W, 0, W]) if (x + dx > -th && x + dx < W + th) pine(c, x + dx, base, th, th * rand(0.32, 0.42));
    }
  });
}

export function makeScenes() {
  return {
    /* ---------------------------------------------------------- forest */
    forest: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#070b16", mid: "#13213a", low: "#2c4152", far: "#26384a", near: "#04070a", mist: "#6f8aa0", sun: "#e8eefc" },
          { top: "#9ec5e0", mid: "#cfe2ea", low: "#f1ead6", far: "#9db7ad", near: "#24392d", mist: "#ffffff", sun: "#fff6d8" }, 0.12);
        const top = s.h * 0.38, H = s.h - top;
        s.layers = [0, 1, 2, 3].map((i) => { const d = i / 3; return { d, img: forestStrip(s.w, H * (0.55 + d * 0.45), mix(s.p.far, s.p.near, d ** 0.8), 26 - i * 4, 0.35 + d * 0.1, 0.62 + d * 0.3, s.px) }; });
        s.stars = s.dark ? makeStars(s, 90, 0.45) : [];
        s.flies = Array.from({ length: s.dark ? 26 : 0 }, () => ({ x: rand(0, s.w), y: rand(s.h * 0.6, s.h), ph: rand(0, TAU), v: rand(0.2, 0.6) }));
      },
      draw(ctx, s, t) {
        const { w, h, p } = s;
        skyFill(ctx, s, [[0, p.top], [0.45, p.mid], [0.75, p.low], [1, p.low]]);
        drawStars(ctx, s, t, s.stars);
        const sx = w * 0.74, sy = h * 0.26;
        glow(ctx, sx, sy, h * 0.3, p.sun, s.dark ? 0.22 : 0.45);
        ctx.fillStyle = rgba(p.sun, s.dark ? 0.9 : 0.85); ctx.beginPath(); ctx.arc(sx, sy, h * 0.045, 0, TAU); ctx.fill();
        s.layers.forEach((L, i) => {
          tile(ctx, L.img, t * (4 + L.d * 26) * s.px, h - L.img.height);
          if (i < 3) { // mist between the rows of trees
            const my = h - L.img.height * 0.35, g = ctx.createLinearGradient(0, my - h * 0.08, 0, my + h * 0.06);
            const a = (s.dark ? 0.12 : 0.28) * (0.75 + 0.25 * Math.sin(t * 0.2 + i));
            g.addColorStop(0, rgba(p.mist, 0)); g.addColorStop(0.5, rgba(p.mist, a)); g.addColorStop(1, rgba(p.mist, 0));
            ctx.fillStyle = g; ctx.fillRect(0, my - h * 0.08, w, h * 0.14);
          }
        });
        for (const f of s.flies) {
          f.x += Math.sin(t * f.v + f.ph) * 0.4 * s.px; f.y += Math.cos(t * f.v * 1.3 + f.ph) * 0.3 * s.px;
          const a = 0.5 + 0.5 * Math.sin(t * 2 * f.v + f.ph);
          glow(ctx, f.x, f.y, 7 * s.px, "#e6ff8c", 0.55 * a);
        }
      },
    },

    /* ---------------------------------------------------------- mountains */
    mountains: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#0a0f1f", mid: "#1d2a48", low: "#4a5878", far: "#56648a", near: "#0b1120", cloud: "#8c9cc0", sun: "#f3f1ff" },
          { top: "#7fb3e6", mid: "#bcd8ef", low: "#f6e7d3", far: "#a9bdd6", near: "#3d4f66", cloud: "#ffffff", sun: "#fff3c9" }, 0.12);
        s.layers = [0, 1, 2, 3].map((i) => {
          const d = i / 3, top = s.h * (0.3 + d * 0.18), bottom = s.h;
          return { d, top, img: ridgeStrip(s.w, top, bottom, mix(s.p.far, s.p.near, d ** 0.9), 1.25 - d * 0.15, 28, i < 3) };
        });
        s.stars = s.dark ? makeStars(s, 120, 0.5) : [];
        s.clouds = Array.from({ length: 7 }, (_, i) => ({ x: rand(0, s.w), y: s.h * rand(0.12, 0.5), r: rand(0.08, 0.18) * s.w, v: rand(4, 10), layer: i % 3 }));
        s.birds = Array.from({ length: 5 }, () => ({ x: rand(0, s.w), y: s.h * rand(0.25, 0.4), v: rand(18, 26), ph: rand(0, TAU) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s;
        skyFill(ctx, s, [[0, p.top], [0.4, p.mid], [0.7, p.low], [1, p.low]]);
        drawStars(ctx, s, t, s.stars);
        const sx = w * 0.3, sy = h * 0.24;
        glow(ctx, sx, sy, h * 0.28, p.sun, s.dark ? 0.2 : 0.5);
        ctx.fillStyle = rgba(p.sun, 0.92); ctx.beginPath(); ctx.arc(sx, sy, h * 0.04, 0, TAU); ctx.fill();
        s.layers.forEach((L, i) => {
          tile(ctx, L.img, t * (2 + L.d * 18) * s.px, L.top);
          for (const c of s.clouds) if (c.layer === i) {
            c.x += c.v * dt * s.px; if (c.x - c.r > w) c.x = -c.r;
            glow(ctx, c.x, c.y, c.r, p.cloud, s.dark ? 0.2 : 0.6, 0.28);
          }
        });
        ctx.strokeStyle = rgba(s.dark ? "#c8d2ea" : "#2a3444", 0.7); ctx.lineWidth = 1.4 * s.px;
        for (const b of s.birds) {
          b.x += b.v * dt * s.px; if (b.x > w + 30) { b.x = -30; b.y = h * rand(0.2, 0.4); }
          bird(ctx, b.x, b.y + Math.sin(t * 0.5 + b.ph) * 6 * s.px, 6 * s.px, t * 7 + b.ph);
        }
      },
    },

    /* ---------------------------------------------------------- mountain lake */
    lake: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#060a18", mid: "#16223f", low: "#3b4a6b", far: "#3e4b6d", near: "#0a0f1c", water: "#0b1426", sun: "#f1f4ff" },
          { top: "#86b9e8", mid: "#c3dcf0", low: "#f4e6d4", far: "#9fb4cf", near: "#3b5161", water: "#7fa6c4", sun: "#fff4cf" }, 0.12);
        s.hz = s.h * 0.58;
        s.layers = [0, 1, 2].map((i) => { const d = i / 2, top = s.h * (0.22 + d * 0.14); return { d, top, img: ridgeStrip(s.w, top, s.hz, mix(s.p.far, s.p.near, d), 1.2, 26, i < 2) }; });
        s.trees = forestStrip(s.w, s.h * 0.16, mix(s.p.near, "#000000", 0.25), 70, 0.5, 0.95, s.px);
        s.stars = s.dark ? makeStars(s, 110, 0.4) : [];
        s.glints = Array.from({ length: 120 }, () => ({ x: rand(0, s.w), y: rand(s.hz + 4, s.h), l: rand(10, 40) * s.px, ph: rand(0, TAU) }));
      },
      draw(ctx, s, t) {
        const { w, h, p, hz } = s;
        // sky and everything above the waterline
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, hz); ctx.clip();
        skyFill(ctx, s, [[0, p.top], [0.35, p.mid], [0.58, p.low], [1, p.low]]);
        drawStars(ctx, s, t, s.stars);
        const mx = w * 0.62, my = h * 0.2;
        glow(ctx, mx, my, h * 0.22, p.sun, s.dark ? 0.2 : 0.45);
        ctx.fillStyle = rgba(p.sun, 0.95); ctx.beginPath(); ctx.arc(mx, my, h * 0.035, 0, TAU); ctx.fill();
        for (const L of s.layers) tile(ctx, L.img, t * (1 + L.d * 4) * s.px, L.top);
        tile(ctx, s.trees, t * 7 * s.px, hz - s.trees.height);
        ctx.restore();
        // the reflection: the same layers drawn upside down below the waterline
        ctx.save(); ctx.beginPath(); ctx.rect(0, hz, w, h - hz); ctx.clip();
        ctx.translate(0, hz * 2); ctx.scale(1, -1);
        skyFill(ctx, s, [[0, p.top], [0.35, p.mid], [0.58, p.low], [1, p.low]]);
        ctx.fillStyle = rgba(p.sun, 0.5); ctx.beginPath(); ctx.ellipse(mx, my, h * 0.035, h * 0.03, 0, 0, TAU); ctx.fill();
        for (const L of s.layers) tile(ctx, L.img, t * (1 + L.d * 4) * s.px, L.top);
        tile(ctx, s.trees, t * 7 * s.px, hz - s.trees.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const g = ctx.createLinearGradient(0, hz, 0, h);
        g.addColorStop(0, rgba(p.water, s.dark ? 0.35 : 0.3)); g.addColorStop(1, rgba(p.water, s.dark ? 0.85 : 0.7));
        ctx.fillStyle = g; ctx.fillRect(0, hz, w, h - hz);
        ctx.fillStyle = rgba(p.sun, s.dark ? 0.35 : 0.6);
        for (const gl of s.glints) {
          const a = Math.max(0, Math.sin(t * 0.8 + gl.ph));
          ctx.globalAlpha = a * 0.6; ctx.fillRect(gl.x + Math.sin(t * 0.3 + gl.ph) * 8 * s.px, gl.y, gl.l, 1.2 * s.px);
        }
        ctx.globalAlpha = 1; ctx.restore();
      },
    },

    /* ---------------------------------------------------------- ocean sunset */
    sunset: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#140f2e", mid: "#5a2a5e", low: "#e0784a", sea: "#1a1838", sun: "#ffd27a" },
          { top: "#7aa7d9", mid: "#f3b9a4", low: "#ffd9a0", sea: "#4f7fa8", sun: "#fff1c4" }, 0.08);
        s.hz = s.h * 0.62;
        s.dashes = Array.from({ length: 160 }, () => ({ y: rand(0, 1) ** 1.6, x: rand(-1, 1), ph: rand(0, TAU), l: rand(0.3, 1) }));
        s.isles = ridgeStrip(s.w, 0, s.h * 0.06, mix(s.p.sea, "#000000", 0.3), 1.6, 10, false);
        s.clouds = Array.from({ length: 6 }, () => ({ x: rand(0, s.w), y: s.h * rand(0.1, 0.45), wd: rand(0.15, 0.35) * s.w, v: rand(3, 8) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, p, hz } = s;
        skyFill(ctx, s, [[0, p.top], [0.4, p.mid], [hz / h, p.low], [1, p.sea]]);
        const sunY = hz - h * 0.05 + Math.sin(t * 0.05) * h * 0.04, sx = w * 0.5, sr = h * 0.08;
        glow(ctx, sx, sunY, h * 0.5, p.sun, 0.35);
        for (const c of s.clouds) {
          c.x += c.v * dt * s.px; if (c.x - c.wd > w) c.x = -c.wd;
          ctx.fillStyle = rgba(s.dark ? "#ff9f80" : "#ffffff", s.dark ? 0.18 : 0.4);
          ctx.beginPath(); ctx.ellipse(c.x, c.y, c.wd / 2, h * 0.012, 0, 0, TAU); ctx.fill();
        }
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, hz); ctx.clip();
        ctx.fillStyle = p.sun; ctx.beginPath(); ctx.arc(sx, sunY, sr, 0, TAU); ctx.fill();
        ctx.restore();
        tile(ctx, s.isles, t * 2 * s.px, hz - s.isles.height + 1);
        const g = ctx.createLinearGradient(0, hz, 0, h);
        g.addColorStop(0, rgba(p.low, 0.6)); g.addColorStop(0.25, rgba(p.sea, 0.9)); g.addColorStop(1, p.sea);
        ctx.fillStyle = g; ctx.fillRect(0, hz, w, h - hz);
        // the sun's path on the water: shimmering dashes, wider closer to us
        for (const d of s.dashes) {
          const y = hz + 2 + d.y * (h - hz), spread = sr * (0.6 + d.y * 3);
          const x = sx + d.x * spread + Math.sin(t * 0.7 + d.ph) * 6 * s.px, a = Math.max(0, Math.sin(t * 1.4 + d.ph)) * (1 - d.y * 0.6);
          ctx.fillStyle = rgba(p.sun, a * 0.8); ctx.fillRect(x, y, d.l * sr * (0.3 + d.y), 1.6 * s.px);
        }
        ctx.strokeStyle = rgba("#ffffff", s.dark ? 0.05 : 0.12); ctx.lineWidth = 1 * s.px;
        for (let i = 0; i < 9; i++) {
          const y = hz + (h - hz) * ((i + ((t * 0.05) % 1)) / 9) ** 1.5;
          ctx.beginPath(); for (let x = 0; x <= w; x += 20 * s.px) ctx.lineTo(x, y + Math.sin(x * 0.01 + t + i) * 2 * s.px); ctx.stroke();
        }
      },
    },

    /* ---------------------------------------------------------- desert */
    desert: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#0b0b1e", mid: "#2b2346", low: "#7a5168", far: "#5a4058", near: "#2a1c22", sun: "#f6eedb" },
          { top: "#6aa6dc", mid: "#b9d6ec", low: "#fbe4c0", far: "#e9b97d", near: "#b9733a", sun: "#fff4d0" }, 0.08);
        s.layers = [0, 1, 2, 3].map((i) => { const d = i / 3, top = s.h * (0.5 + d * 0.12); return { d, top, img: ridgeStrip(s.w, top, s.h, mix(s.p.far, s.p.near, d), 2.2, 6, false) }; });
        s.stars = s.dark ? makeStars(s, 160, 0.55) : [];
        s.sand = Array.from({ length: 70 }, () => ({ x: rand(0, s.w), y: rand(s.h * 0.6, s.h), v: rand(40, 110), a: rand(0.15, 0.5) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s;
        skyFill(ctx, s, [[0, p.top], [0.35, p.mid], [0.6, p.low], [1, p.low]]);
        drawStars(ctx, s, t, s.stars);
        const sx = w * 0.7, sy = h * 0.3;
        glow(ctx, sx, sy, h * 0.4, p.sun, s.dark ? 0.15 : 0.55);
        ctx.fillStyle = rgba(p.sun, 0.95); ctx.beginPath(); ctx.arc(sx, sy, h * (s.dark ? 0.04 : 0.06), 0, TAU); ctx.fill();
        if (s.dark) { ctx.fillStyle = s.p.mid; ctx.beginPath(); ctx.arc(sx + h * 0.015, sy - h * 0.008, h * 0.036, 0, TAU); ctx.fill(); } // crescent
        for (const L of s.layers) tile(ctx, L.img, t * (2 + L.d * 14) * s.px, L.top);
        for (const g of s.sand) {
          g.x += g.v * dt * s.px; if (g.x > w) { g.x = -10; g.y = rand(h * 0.6, h); }
          ctx.fillStyle = rgba(s.dark ? "#c9a98a" : "#fff1d6", g.a); ctx.fillRect(g.x, g.y, 6 * s.px, 1 * s.px);
        }
      },
    },

    /* ---------------------------------------------------------- city at night */
    city: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#05060f", mid: "#141a33", low: "#3a2f55", far: "#1b2140", near: "#07080f", win: "#ffd38a", sun: "#eef0ff" },
          { top: "#8db6e0", mid: "#d6c7e6", low: "#ffd6b8", far: "#9aa6c2", near: "#3a4258", win: "#fff2cc", sun: "#fff7da" }, 0.15);
        s.flicker = [];
        s.layers = [0, 1, 2].map((i) => {
          const d = i / 2, H = s.h * (0.32 + d * 0.22), color = mix(s.p.far, s.p.near, d);
          const img = offscreen(s.w, H, (c, W, Hh) => {
            let x = -20;
            while (x < W) {
              const bw = rand(30, 90) * s.px * (0.7 + d * 0.6), bh = rand(0.3, 1) * Hh;
              c.fillStyle = color; c.fillRect(x, Hh - bh, bw, bh);
              if (Math.random() < 0.2) c.fillRect(x + bw * 0.45, Hh - bh - 18 * s.px, 2 * s.px, 18 * s.px); // antenna
              const cw = 4 * s.px * (0.8 + d * 0.5), gap = cw * 1.9;
              for (let wy = Hh - bh + gap; wy < Hh - gap; wy += gap) for (let wx = x + gap * 0.6; wx < x + bw - cw; wx += gap) {
                if (Math.random() < (s.dark ? 0.35 : 0.12)) { c.fillStyle = rgba(s.p.win, (s.dark ? 0.45 : 0.5) + d * 0.4); c.fillRect(wx, wy, cw, cw * 1.3); }
                else if (i === 2 && Math.random() < 0.01) s.flicker.push({ x: wx, y: wy, w: cw, ph: rand(0, TAU), v: rand(0.05, 0.2) });
              }
              x += bw + rand(0, 8) * s.px;
            }
          });
          return { d, img };
        });
        s.stars = s.dark ? makeStars(s, 60, 0.4) : [];
        s.cars = Array.from({ length: 14 }, (_, i) => ({ x: rand(0, s.w), dir: i % 2 ? 1 : -1, v: rand(50, 110) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s;
        skyFill(ctx, s, [[0, p.top], [0.5, p.mid], [0.85, p.low], [1, p.low]]);
        drawStars(ctx, s, t, s.stars);
        glow(ctx, w * 0.2, h * 0.2, h * 0.2, p.sun, s.dark ? 0.15 : 0.35);
        ctx.fillStyle = rgba(p.sun, 0.9); ctx.beginPath(); ctx.arc(w * 0.2, h * 0.2, h * 0.03, 0, TAU); ctx.fill();
        glow(ctx, w * 0.5, h, h * 0.6, p.win, s.dark ? 0.12 : 0.1); // the glow of the city
        s.layers.forEach((L, i) => {
          const off = t * (2 + L.d * 10) * s.px;
          tile(ctx, L.img, off, h - L.img.height);
          if (i === 2) for (const f of s.flicker) {
            const on = Math.sin(t * f.v * 3 + f.ph) > 0.2;
            if (!on) continue;
            const W = L.img.width, x = (((f.x - off) % W) + W) % W;
            ctx.fillStyle = rgba(p.win, 0.85); ctx.fillRect(x, h - L.img.height + f.y, f.w, f.w * 1.3);
          }
        });
        for (const c of s.cars) {
          c.x += c.dir * c.v * dt * s.px; if (c.x > w + 20) c.x = -20; if (c.x < -20) c.x = w + 20;
          const y = h - (c.dir > 0 ? 5 : 9) * s.px;
          glow(ctx, c.x, y, 10 * s.px, c.dir > 0 ? "#fff3d0" : "#ff4a4a", 0.6);
        }
      },
    },

    /* ---------------------------------------------------------- underwater */
    underwater: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#0d4466", mid: "#062a45", low: "#020d1a", ray: "#bfe9ff", kelp: "#0b3a2e", fish: "#041320" },
          { top: "#9ee3f5", mid: "#4fb3d4", low: "#1f6f99", ray: "#ffffff", kelp: "#2f7a5a", fish: "#1c4f6e" }, 0.12);
        s.bubbles = Array.from({ length: 50 }, () => ({ x: rand(0, s.w), y: rand(0, s.h), r: rand(1.5, 5) * s.px, v: rand(20, 55), ph: rand(0, TAU) }));
        s.kelp = Array.from({ length: Math.round(s.w / (60 * s.px)) }, () => ({ x: rand(0, s.w), hgt: rand(0.25, 0.6) * s.h, ph: rand(0, TAU), wd: rand(4, 9) * s.px }));
        s.fish = Array.from({ length: 9 }, () => ({ x: rand(0, s.w), y: rand(0.2, 0.75) * s.h, v: rand(25, 60) * (Math.random() < 0.5 ? -1 : 1), sz: rand(8, 18) * s.px, ph: rand(0, TAU) }));
        s.rays = Array.from({ length: 7 }, (_, i) => ({ x: (i + rand(0, 1)) / 7, wd: rand(0.03, 0.08), ph: rand(0, TAU) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s;
        skyFill(ctx, s, [[0, p.top], [0.45, p.mid], [1, p.low]]);
        ctx.globalCompositeOperation = "lighter";
        for (const r of s.rays) {
          const x = (r.x + Math.sin(t * 0.07 + r.ph) * 0.05) * w, a = 0.06 + 0.05 * Math.sin(t * 0.4 + r.ph);
          const g = ctx.createLinearGradient(0, 0, 0, h * 0.9);
          g.addColorStop(0, rgba(p.ray, a)); g.addColorStop(1, rgba(p.ray, 0));
          ctx.fillStyle = g; ctx.beginPath();
          ctx.moveTo(x - r.wd * w * 0.3, 0); ctx.lineTo(x + r.wd * w * 0.3, 0); ctx.lineTo(x + r.wd * w * 2 + w * 0.12, h * 0.9); ctx.lineTo(x - r.wd * w + w * 0.12, h * 0.9);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
        for (const f of s.fish) {
          f.x += f.v * dt * s.px; if (f.x > w + 40) f.x = -40; if (f.x < -40) f.x = w + 40;
          const y = f.y + Math.sin(t * 0.8 + f.ph) * 10 * s.px, dir = Math.sign(f.v), wag = Math.sin(t * 8 + f.ph) * f.sz * 0.15;
          ctx.fillStyle = rgba(p.fish, s.dark ? 0.8 : 0.55);
          ctx.beginPath(); ctx.ellipse(f.x, y, f.sz, f.sz * 0.42, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(f.x - dir * f.sz * 0.8, y); ctx.lineTo(f.x - dir * f.sz * 1.6, y - f.sz * 0.45 + wag); ctx.lineTo(f.x - dir * f.sz * 1.6, y + f.sz * 0.45 + wag); ctx.fill();
        }
        ctx.strokeStyle = p.kelp; ctx.lineCap = "round";
        for (const k of s.kelp) {
          ctx.lineWidth = k.wd; ctx.beginPath(); ctx.moveTo(k.x, h + 5);
          for (let i = 1; i <= 8; i++) { const f = i / 8; ctx.lineTo(k.x + Math.sin(t * 0.6 + k.ph + f * 2.2) * 22 * s.px * f, h - k.hgt * f); }
          ctx.stroke();
        }
        ctx.lineCap = "butt";
        for (const b of s.bubbles) {
          b.y -= b.v * dt * s.px; if (b.y < -10) { b.y = h + 10; b.x = rand(0, w); }
          const x = b.x + Math.sin(t * 1.5 + b.ph) * 4 * s.px;
          ctx.strokeStyle = rgba("#ffffff", 0.45); ctx.lineWidth = 1 * s.px;
          ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, TAU); ctx.stroke();
          ctx.fillStyle = rgba("#ffffff", 0.35); ctx.beginPath(); ctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, TAU); ctx.fill();
        }
      },
    },

    /* ---------------------------------------------------------- star trails */
    startrails: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#03040c", mid: "#0b1230", low: "#1d2650", land: "#02030a" },
          { top: "#1a2a55", mid: "#3a4f86", low: "#7d86b8", land: "#151a2c" }, 0.15);
        const R = Math.hypot(s.w, s.h);
        s.cx = s.w * 0.5; s.cy = s.h * 0.18;
        s.trails = Array.from({ length: 420 }, () => ({ r: Math.sqrt(rand(0, 1)) * R, a: rand(0, TAU), c: Math.random() < 0.15 ? "#ffd6a0" : Math.random() < 0.2 ? "#a8c8ff" : "#ffffff", al: rand(0.25, 0.9) }));
        s.land = ridgeStrip(s.w, 0, s.h * 0.22, s.p.land, 1.5, 14, true);
      },
      draw(ctx, s, t) {
        const { w, h, p } = s;
        skyFill(ctx, s, [[0, p.top], [0.6, p.mid], [1, p.low]]);
        const end = t * 0.02, len = Math.min(0.9, 0.05 + t * 0.02);
        ctx.lineWidth = 1.2 * s.px; ctx.lineCap = "round";
        for (const tr of s.trails) {
          ctx.strokeStyle = rgba(tr.c, tr.al);
          ctx.beginPath(); ctx.arc(s.cx, s.cy, tr.r, tr.a + end - len, tr.a + end); ctx.stroke();
        }
        ctx.lineCap = "butt";
        tile(ctx, s.land, 0, h - s.land.height);
      },
    },

    /* ---------------------------------------------------------- meadow */
    meadow: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#0a1024", mid: "#24345a", low: "#5d6a7d", grass: "#0d1f16", tip: "#2f5a3c", hill: "#16261f", sun: "#eef2ff", flower: "#d6b8ff" },
          { top: "#7ab8ea", mid: "#bfe0f2", low: "#f4f0d8", grass: "#4f8a3a", tip: "#a9cf63", hill: "#8db66c", sun: "#fff3c4", flower: "#ffffff" }, 0.1);
        const n = Math.min(900, Math.round(s.w / (2.6 * s.px)));
        s.blades = Array.from({ length: n }, () => { const d = rand(0, 1); return { x: rand(0, s.w), d, hgt: (0.05 + d * 0.16) * s.h, ph: rand(0, 1), flower: Math.random() < 0.04 }; }).sort((a, b) => a.d - b.d);
        s.hill = ridgeStrip(s.w, 0, s.h * 0.3, s.p.hill, 2, 5, false);
        s.clouds = Array.from({ length: 6 }, () => ({ x: rand(0, s.w), y: s.h * rand(0.08, 0.35), r: rand(0.06, 0.12) * s.w, v: rand(6, 12) }));
        s.stars = s.dark ? makeStars(s, 80, 0.45) : [];
      },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s;
        skyFill(ctx, s, [[0, p.top], [0.45, p.mid], [0.75, p.low], [1, p.low]]);
        drawStars(ctx, s, t, s.stars);
        glow(ctx, w * 0.8, h * 0.18, h * 0.25, p.sun, s.dark ? 0.15 : 0.5);
        ctx.fillStyle = rgba(p.sun, 0.92); ctx.beginPath(); ctx.arc(w * 0.8, h * 0.18, h * 0.04, 0, TAU); ctx.fill();
        for (const c of s.clouds) {
          c.x += c.v * dt * s.px; if (c.x - c.r * 2 > w) c.x = -c.r * 2;
          ctx.fillStyle = rgba("#ffffff", s.dark ? 0.06 : 0.75);
          for (const [dx, dy, rr] of [[0, 0, 1], [0.8, 0.15, 0.75], [-0.8, 0.2, 0.7], [0.35, -0.3, 0.7]]) { ctx.beginPath(); ctx.ellipse(c.x + dx * c.r, c.y + dy * c.r * 0.5, c.r * rr * 0.6, c.r * rr * 0.36, 0, 0, TAU); ctx.fill(); }
        }
        tile(ctx, s.hill, t * 3 * s.px, h - s.hill.height - h * 0.1);
        ctx.fillStyle = p.grass; ctx.fillRect(0, h - h * 0.12, w, h * 0.12);
        // wind: a slow sway plus gusts that roll across the field
        ctx.lineCap = "round";
        for (const b of s.blades) {
          const gust = Math.max(0, Math.sin(b.x / w * 6 - t * 0.9)) ** 2;
          const bend = (Math.sin(t * 1.3 + b.ph * TAU) * 0.15 + gust * 0.55) * b.hgt;
          const base = h - (1 - b.d) * h * 0.1;
          ctx.strokeStyle = mix(p.grass, p.tip, 0.3 + b.d * 0.7); ctx.lineWidth = (1 + b.d * 2) * s.px;
          ctx.beginPath(); ctx.moveTo(b.x, base); ctx.quadraticCurveTo(b.x + bend * 0.3, base - b.hgt * 0.6, b.x + bend, base - b.hgt + Math.abs(bend) * 0.3); ctx.stroke();
          if (b.flower) { ctx.fillStyle = p.flower; ctx.beginPath(); ctx.arc(b.x + bend, base - b.hgt + Math.abs(bend) * 0.3, 2.4 * s.px, 0, TAU); ctx.fill(); }
        }
        ctx.lineCap = "butt";
      },
    },

    /* ---------------------------------------------------------- koi pond */
    koi: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { water: "#06222a", deep: "#020c10", pad: "#1d4a2c", padEdge: "#2c6a3e" },
          { water: "#5f9ea0", deep: "#2f6f78", pad: "#4f8f4a", padEdge: "#76b56a" }, 0.1);
        const m = Math.min(s.w, s.h);
        s.fish = Array.from({ length: 7 }, (_, i) => ({ cx: rand(0.2, 0.8) * s.w, cy: rand(0.2, 0.8) * s.h, rx: rand(0.15, 0.4) * s.w, ry: rand(0.15, 0.4) * s.h, sp: rand(0.05, 0.11) * (i % 2 ? 1 : -1), ph: rand(0, TAU), sz: rand(0.035, 0.05) * m, colors: [["#f26b1d", "#ffffff"], ["#ffffff", "#e8402a"], ["#f6a01a", "#f6a01a"], ["#1b1b1b", "#f07d24"], ["#fafafa", "#fafafa"]][i % 5] }));
        s.pads = Array.from({ length: 9 }, () => ({ x: rand(0, s.w), y: rand(0, s.h), r: rand(0.03, 0.06) * m, a: rand(0, TAU), ph: rand(0, TAU) }));
        s.rings = [];
      },
      tap(s, x, y) { s.rings.push({ x, y, r: 0 }); },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s;
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
        g.addColorStop(0, p.water); g.addColorStop(1, p.deep);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        for (const f of s.fish) {
          // sample the swimming path backwards by distance, so the body has the same length at any speed
          const pos = (a) => [f.cx + Math.sin(a) * f.rx + Math.sin(a * 2.3) * f.rx * 0.2, f.cy + Math.sin(a * 1.7 + 1) * f.ry];
          const N = 14, seg = (f.sz * 3.4) / N, pts = [pos(t * f.sp + f.ph)];
          let a = t * f.sp + f.ph, guard = 0;
          const da = -Math.sign(f.sp) * 0.0015;
          while (pts.length <= N && guard++ < 4000) {
            a += da; const q = pos(a), l = pts[pts.length - 1];
            if (Math.hypot(q[0] - l[0], q[1] - l[1]) >= seg) pts.push(q);
          }
          if (pts.length < N) continue;
          // a little side to side swish along the body
          const sw = Math.sin(t * 4 + f.ph);
          const side = pts.map((q, i) => {
            const n = pts[Math.min(i + 1, pts.length - 1)], pr = pts[Math.max(i - 1, 0)];
            const dx = pr[0] - n[0], dy = pr[1] - n[1], len = Math.hypot(dx, dy) || 1;
            const k = i / (pts.length - 1), off = sw * f.sz * 0.12 * k * k;
            return { x: q[0] - dy / len * off, y: q[1] + dx / len * off, nx: -dy / len, ny: dx / len, k };
          });
          const width = (k) => f.sz * 0.42 * Math.sin(Math.PI * (0.18 + k * 0.82)) ** 0.8 * (1 - k * 0.55);
          const outline = (c, dx = 0, dy = 0) => {
            ctx.fillStyle = c; ctx.beginPath();
            side.forEach((q, i) => { const r = width(q.k); (i ? ctx.lineTo : ctx.moveTo).call(ctx, q.x + q.nx * r + dx, q.y + q.ny * r + dy); });
            for (let i = side.length - 1; i >= 0; i--) { const q = side[i], r = width(q.k); ctx.lineTo(q.x - q.nx * r + dx, q.y - q.ny * r + dy); }
            ctx.closePath();
            const h0 = side[0], r0 = width(0); ctx.moveTo(h0.x + r0 + dx, h0.y + dy); ctx.arc(h0.x + dx, h0.y + dy, r0, 0, TAU); // rounded head
            ctx.fill();
          };
          const head = side[0], tail = side[side.length - 1], ang = Math.atan2(side[0].y - side[2].y, side[0].x - side[2].x);
          outline("rgba(0, 0, 0, 0.2)", 7 * s.px, 9 * s.px);
          // fins
          const fin = side[4];
          ctx.fillStyle = rgba(f.colors[1] === f.colors[0] ? "#ffffff" : f.colors[1], 0.55);
          for (const d of [1, -1]) {
            ctx.beginPath(); ctx.ellipse(fin.x + fin.nx * d * f.sz * 0.45, fin.y + fin.ny * d * f.sz * 0.45, f.sz * 0.36, f.sz * 0.14, ang + d * (0.9 + sw * 0.25), 0, TAU); ctx.fill();
          }
          // tail
          const ta = Math.atan2(side[side.length - 3].y - tail.y, side[side.length - 3].x - tail.x) + Math.PI + sw * 0.35;
          ctx.save(); ctx.translate(tail.x, tail.y); ctx.rotate(ta); ctx.fillStyle = rgba(f.colors[0], 0.8);
          ctx.beginPath(); ctx.moveTo(-f.sz * 0.1, 0); ctx.quadraticCurveTo(f.sz * 0.5, -f.sz * 0.5, f.sz * 0.8, -f.sz * 0.42); ctx.lineTo(f.sz * 0.45, 0); ctx.lineTo(f.sz * 0.8, f.sz * 0.42); ctx.quadraticCurveTo(f.sz * 0.5, f.sz * 0.5, -f.sz * 0.1, 0); ctx.fill();
          ctx.restore();
          outline(f.colors[0]);
          // markings: patches of the second color along the back
          if (f.colors[1] !== f.colors[0]) {
            ctx.save(); ctx.clip(); ctx.fillStyle = f.colors[1];
            for (const [i, rr] of [[2, 0.34], [6, 0.42], [9, 0.3]]) { const q = side[i]; ctx.beginPath(); ctx.ellipse(q.x + q.nx * f.sz * 0.08, q.y + q.ny * f.sz * 0.08, f.sz * rr, f.sz * rr * 0.75, ang, 0, TAU); ctx.fill(); }
            ctx.restore();
          }
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          for (const d of [1, -1]) { ctx.beginPath(); ctx.arc(head.x + Math.cos(ang) * -f.sz * 0.12 + head.nx * d * f.sz * 0.18, head.y + Math.sin(ang) * -f.sz * 0.12 + head.ny * d * f.sz * 0.18, f.sz * 0.045, 0, TAU); ctx.fill(); }
        }
        for (const pd of s.pads) {
          const x = pd.x + Math.sin(t * 0.1 + pd.ph) * 8 * s.px, y = pd.y + Math.cos(t * 0.08 + pd.ph) * 6 * s.px, a = pd.a + Math.sin(t * 0.05 + pd.ph) * 0.2;
          ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; ctx.beginPath(); ctx.arc(x + 5 * s.px, y + 7 * s.px, pd.r, a + 0.25, a + TAU - 0.25); ctx.lineTo(x + 5 * s.px, y + 7 * s.px); ctx.fill();
          ctx.fillStyle = p.pad; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, pd.r, a + 0.25, a + TAU - 0.25); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = p.padEdge; ctx.lineWidth = 1.2 * s.px; ctx.stroke();
        }
        if (Math.random() < dt * 0.4) s.rings.push({ x: rand(0, w), y: rand(0, h), r: 0 });
        s.rings = s.rings.filter((r) => (r.r += 40 * dt * s.px) < 140 * s.px);
        for (const r of s.rings) { ctx.strokeStyle = rgba("#ffffff", 0.35 * (1 - r.r / (140 * s.px))); ctx.lineWidth = 1.2 * s.px; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke(); }
      },
    },

    /* ---------------------------------------------------------- jellyfish */
    jellyfish: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#03122a", low: "#010409", speck: "#8fd3ff" }, { top: "#cfeefc", low: "#6ab3d8", speck: "#ffffff" }, 0.15);
        const cols = [s.colors[0], s.colors[1], s.colors[2], "#ff8fd8", "#8fd3ff", "#b48fff"];
        s.jellies = Array.from({ length: 9 }, (_, i) => ({ x: rand(0, s.w), y: rand(0, s.h), sz: rand(18, 46) * s.px, c: cols[i % cols.length], ph: rand(0, TAU), v: rand(8, 22), tent: 5 + (i % 3) }));
        s.specks = Array.from({ length: 120 }, () => ({ x: rand(0, s.w), y: rand(0, s.h), v: rand(2, 8), a: rand(0.1, 0.5) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s;
        skyFill(ctx, s, [[0, p.top], [1, p.low]]);
        for (const sp of s.specks) { sp.y -= sp.v * dt * s.px; if (sp.y < 0) sp.y = h; ctx.fillStyle = rgba(p.speck, sp.a); ctx.fillRect(sp.x, sp.y, 1.5 * s.px, 1.5 * s.px); }
        for (const j of s.jellies) {
          const pulse = Math.sin(t * 1.4 + j.ph), push = Math.max(0, -pulse);
          j.y -= (j.v * (0.4 + push * 1.6)) * dt * s.px; j.x += Math.sin(t * 0.2 + j.ph) * 0.2 * s.px;
          if (j.y < -j.sz * 5) { j.y = h + j.sz * 2; j.x = rand(0, w); }
          const bw = j.sz * (1 + pulse * 0.12), bh = j.sz * (0.75 - pulse * 0.1);
          ctx.globalCompositeOperation = s.dark ? "lighter" : "source-over";
          glow(ctx, j.x, j.y, j.sz * 2.4, j.c, s.dark ? 0.18 : 0.12);
          ctx.strokeStyle = rgba(j.c, s.dark ? 0.45 : 0.55); ctx.lineWidth = 1.3 * s.px;
          for (let k = 0; k < j.tent; k++) {
            const tx = j.x - bw * 0.7 + (bw * 1.4) * (k / (j.tent - 1));
            ctx.beginPath(); ctx.moveTo(tx, j.y);
            for (let q = 1; q <= 10; q++) ctx.lineTo(tx + Math.sin(t * 2 + j.ph + q * 0.6 + k) * 5 * s.px * (q / 10), j.y + q * j.sz * 0.32);
            ctx.stroke();
          }
          const g = ctx.createRadialGradient(j.x, j.y - bh * 0.3, 0, j.x, j.y, bw);
          g.addColorStop(0, rgba("#ffffff", s.dark ? 0.55 : 0.7)); g.addColorStop(0.5, rgba(j.c, s.dark ? 0.5 : 0.55)); g.addColorStop(1, rgba(j.c, 0.15));
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(j.x, j.y, bw, bh, 0, Math.PI, TAU); ctx.quadraticCurveTo(j.x, j.y + bh * 0.3, j.x - bw, j.y); ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        }
      },
    },

    /* ---------------------------------------------------------- sky lanterns */
    lanterns: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#05040f", mid: "#1a1430", low: "#3a2440", land: "#06050c", lamp: "#ffb347" },
          { top: "#3d3a78", mid: "#8d6aa8", low: "#f2a07b", land: "#2a2440", lamp: "#ffcf73" }, 0.1);
        s.stars = makeStars(s, 100, 0.6);
        s.lamps = Array.from({ length: 34 }, () => { const d = rand(0.15, 1); return { x: rand(0, s.w), y: rand(0, s.h), d, ph: rand(0, TAU), v: (10 + d * 22) }; }).sort((a, b) => a.d - b.d);
        s.land = ridgeStrip(s.w, 0, s.h * 0.16, s.p.land, 1.6, 12, false);
      },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s;
        skyFill(ctx, s, [[0, p.top], [0.55, p.mid], [1, p.low]]);
        drawStars(ctx, s, t, s.stars, "#ffffff", 0.8);
        tile(ctx, s.land, 0, h - s.land.height);
        for (const l of s.lamps) {
          l.y -= l.v * dt * s.px; l.x += Math.sin(t * 0.3 + l.ph) * 0.15 * s.px * l.d;
          if (l.y < -40) { l.y = h + rand(10, 80); l.x = rand(0, w); }
          const sz = (5 + l.d * 12) * s.px, fl = 0.85 + 0.15 * Math.sin(t * 6 + l.ph);
          glow(ctx, l.x, l.y, sz * 4, p.lamp, 0.22 * fl * l.d + 0.05);
          const g = ctx.createLinearGradient(0, l.y - sz, 0, l.y + sz);
          g.addColorStop(0, rgba("#ff7a2e", 0.9)); g.addColorStop(1, rgba("#ffe2a0", 0.95 * fl));
          ctx.fillStyle = g; ctx.beginPath();
          ctx.moveTo(l.x - sz * 0.55, l.y - sz); ctx.lineTo(l.x + sz * 0.55, l.y - sz); ctx.lineTo(l.x + sz * 0.42, l.y + sz); ctx.lineTo(l.x - sz * 0.42, l.y + sz); ctx.closePath(); ctx.fill();
        }
      },
    },

    /* ---------------------------------------------------------- ringed planet */
    planet: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#03040a", low: "#0b0f24", a: "#d9a066", b: "#a8673a", ring: "#e8d2b0" },
          { top: "#0e1430", low: "#2a3366", a: "#e7b98a", b: "#b9784a", ring: "#f2e3c8" }, 0.15);
        s.stars = makeStars(s, 220, 1);
        s.R = Math.min(s.w, s.h) * 0.36; s.cx = s.w * 0.76; s.cy = s.h * 0.72;
        s.bands = Array.from({ length: 14 }, (_, i) => ({ y: -1 + (i + rand(0.2, 0.8)) / 7, hgt: rand(0.03, 0.12), c: i % 2 ? s.p.a : s.p.b, sp: rand(0.01, 0.03) }));
      },
      draw(ctx, s, t) {
        const { w, h, p, R, cx, cy } = s;
        skyFill(ctx, s, [[0, p.top], [1, p.low]]);
        drawStars(ctx, s, t, s.stars);
        const ring = (front) => {
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.35); ctx.scale(1, 0.24);
          ctx.beginPath(); ctx.rect(-R * 3, front ? 0 : -R * 3, R * 6, R * 3); ctx.clip();
          for (let k = 0; k < 4; k++) { ctx.strokeStyle = rgba(p.ring, [0.5, 0.25, 0.4, 0.18][k]); ctx.lineWidth = R * [0.12, 0.05, 0.08, 0.04][k]; ctx.beginPath(); ctx.arc(0, 0, R * (1.45 + k * 0.13), 0, TAU); ctx.stroke(); }
          ctx.restore();
        };
        glow(ctx, cx, cy, R * 1.6, p.a, 0.12);
        ring(false);
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
        ctx.fillStyle = p.b; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.translate(cx, cy); ctx.rotate(-0.35);
        for (const b of s.bands) {
          ctx.fillStyle = rgba(b.c, 0.85);
          const off = Math.sin(t * b.sp * 3) * R * 0.05;
          ctx.beginPath(); ctx.ellipse(off, b.y * R, R * 1.2, b.hgt * R, 0, 0, TAU); ctx.fill();
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const shade = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05);
        shade.addColorStop(0, "rgba(255, 255, 255, 0.12)"); shade.addColorStop(0.6, "rgba(0, 0, 0, 0.1)"); shade.addColorStop(1, "rgba(0, 0, 0, 0.75)");
        ctx.fillStyle = shade; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.restore();
        ring(true);
        // a small moon on a tilted orbit, hidden while behind the planet
        const ma = t * 0.12, mx = cx + Math.cos(ma) * R * 2.1, my = cy + Math.sin(ma) * R * 0.5 - Math.cos(ma) * R * 0.5;
        if (!(Math.sin(ma) < 0 && Math.hypot(mx - cx, my - cy) < R)) {
          ctx.fillStyle = "#c9ccd6"; ctx.beginPath(); ctx.arc(mx, my, R * 0.07, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(0, 0, 0, 0.45)"; ctx.beginPath(); ctx.arc(mx + R * 0.025, my + R * 0.02, R * 0.07, 0, TAU); ctx.fill();
        }
      },
    },
  };
}

/** Effect ids and names for the settings list. */
export const SCENES = [
  ["forest", "Pine forest"], ["mountains", "Mountains"], ["lake", "Mountain lake"], ["sunset", "Ocean sunset"], ["desert", "Desert dunes"],
  ["city", "City at night"], ["underwater", "Underwater"], ["startrails", "Star trails"], ["meadow", "Windy meadow"], ["koi", "Koi pond"],
  ["jellyfish", "Jellyfish"], ["lanterns", "Sky lanterns"], ["planet", "Ringed planet"],
];
