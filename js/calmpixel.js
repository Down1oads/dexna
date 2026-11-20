// Quiet pixel-art scenes: almost everything is drawn once, and only a few small things move, so they
// stay out of the way while you work. A shrine by a lake, a snowed-in cabin, a tree on a hill,
// a misty pine forest, an aquarium, a canyon, a harbor, a windmill, a bamboo grove, a cave mouth,
// rooftops, a stone bridge, jungle ruins, icebergs, a savanna, a castle above the clouds and a moon base.
import { rand, TAU, offscreen } from "./scenes.js";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const hexRgb = (hex) => { const n = parseInt(hex.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

/** A pixel canvas painted through set/rect calls (straight into image data, so it is fast). */
function pixmap(w, h, draw) {
  return offscreen(w, h, (c, W, H) => {
    const img = c.createImageData(W, H), d = new Uint32Array(img.data.buffer), cache = new Map();
    const col = (hex) => { let v = cache.get(hex); if (v === undefined) { const [r, g, b] = hexRgb(hex); v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; cache.set(hex, v); } return v; };
    const P = {
      w: W, h: H,
      set(x, y, hex) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) d[y * W + x] = col(hex); },
      rect(x, y, rw, rh, hex) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) P.set(x + i, y + j, hex); },
      // a vertical gradient through the given colors, Bayer-dithered between steps
      sky(y0, y1, cols) {
        for (let y = Math.max(0, y0 | 0); y < Math.min(H, y1); y++) {
          const f = ((y - y0) / Math.max(1, y1 - y0)) * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(f)), k = f - i;
          for (let x = 0; x < W; x++) d[y * W + x] = col(k > dither(x, y) ? cols[i + 1] : cols[i]);
        }
      },
      ellipse(cx, cy, rx, ry, hex) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x / rx) ** 2 + (y / ry) ** 2 <= 1.02) P.set(cx + x, cy + y, hex); },
      line(x0, y0, x1, y1, hex, wd = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) P.rect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), wd, wd, hex); },
      disc(cx, cy, r, hex) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) P.set(cx + x, cy + y, hex); },
      // a ridge of hills or mountains, filled down to the bottom
      ridge(base, amp, hex, freq, jag, cap) {
        const ph = [rand(0, TAU), rand(0, TAU), rand(0, TAU)];
        for (let x = 0; x < W; x++) {
          const u = x / W;
          const n = Math.sin(u * freq + ph[0]) * 0.55 + Math.sin(u * freq * 2.3 + ph[1]) * 0.3 * jag + Math.abs(Math.sin(u * freq * 5.1 + ph[2])) * 0.25 * jag;
          const top = Math.round(base - amp * (0.5 + n * 0.5));
          for (let y = Math.max(0, top); y < H; y++) d[y * W + x] = col(cap && y < top + cap.depth && (top < base - amp * cap.above) ? cap.hex : hex);
        }
      },
      pine(x, base, ht, hex, trunk) {
        x |= 0; base |= 0; ht = Math.max(4, ht | 0);
        const tiers = ht > 10 ? 3 : 2, th = Math.ceil(ht / tiers);
        for (let r = 0; r < ht; r++) {
          const tier = Math.min(tiers - 1, Math.floor(r / th)), within = r - tier * th, half = Math.floor(within * 0.55) + tier;
          for (let i = -half; i <= half; i++) P.set(x + i, base - ht + r, hex);
        }
        if (trunk) P.rect(x, base, 1, Math.max(1, ht / 8), trunk);
      },
    };
    draw(P);
    c.putImageData(img, 0, 0);
  });
}

/** Stars drawn once into the sky; a handful twinkle on top each frame. */
function starfield(P, n, maxY, cols) {
  for (let i = 0; i < n; i++) P.set(rand(0, P.w), rand(0, maxY), cols[Math.floor(rand(0, cols.length))]);
}
function twinklers(n, w, maxY) { return Array.from({ length: n }, () => ({ x: Math.floor(rand(0, w)), y: Math.floor(rand(0, maxY)), ph: rand(0, TAU), sp: rand(0.3, 0.8) })); }
function drawTwinklers(ctx, list, t, col) {
  for (const s of list) {
    const a = Math.sin(t * s.sp + s.ph);
    if (a < 0.2) continue;
    ctx.fillStyle = col; ctx.globalAlpha = a;
    ctx.fillRect(s.x, s.y, 1, 1);
    if (a > 0.85) { ctx.globalAlpha = (a - 0.85) * 4; ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); }
  }
  ctx.globalAlpha = 1;
}

/** Mirror the picture above the waterline into the water, nudging a few rows a pixel sideways. */
function reflect(ctx, above, hz, w, h, t) {
  const step = Math.floor(t * 1.5);
  for (let y = hz; y < h; y++) {
    const src = hz - (y - hz) - 1;
    if (src < 0) break;
    const n = Math.sin(y * 12.9898 + step * 78.233) * 43758.5453, wob = (y - hz) > 2 && (n - Math.floor(n)) < 0.35 ? ((n * 10) & 1 ? 1 : -1) : 0;
    ctx.drawImage(above, 0, src, w, 1, wob, y, w, 1);
  }
}

/** A small pixel cloud: two rows of puffs over a flat base. */
function cloudSprite(light, shade) {
  return pixmap(Math.round(rand(24, 44)), 10, (P) => {
    const cw = P.w;
    for (let i = 0; i < 4; i++) P.disc(Math.round(cw * (0.2 + i * 0.2)), 6, Math.round(rand(2, 4)), shade);
    for (let i = 0; i < 3; i++) P.disc(Math.round(cw * (0.25 + i * 0.22)), 5, Math.round(rand(2, 3)), light);
    P.rect(Math.round(cw * 0.12), 7, Math.round(cw * 0.76), 3, shade);
  });
}

export function makeCalmPixel() {
  return {
    /* ---------------------------------------------------------- shrine by a lake */
    pixelshrine: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, hz = Math.round(h * 0.66);
        s.hz = hz;
        const p = s.dark
          ? { sky: ["#090b22", "#141638", "#24204e", "#3a2c62", "#5a3a72"], orb: "#f6ecd0", orbShade: "#d8cba8", far: "#2a2552", mid: "#1c1a3c", near: "#100e24", gate: "#c43a2a", gateDk: "#5a1410", water: "rgba(10, 10, 34, 0.45)", stars: ["#ffffff", "#c8d0ff", "#8890c8"] }
          : { sky: ["#4a6ac0", "#7a86d0", "#c08ac0", "#f0a0a0", "#ffcf9a"], orb: "#fff4d8", orbShade: "#ffe0a8", far: "#9a7ab8", mid: "#76609e", near: "#4a3c78", gate: "#e0462a", gateDk: "#7a1e14", water: "rgba(60, 50, 120, 0.3)", stars: [] };
        s.p = p;
        s.above = pixmap(w, hz, (P) => {
          P.sky(0, hz, p.sky);
          if (s.dark) starfield(P, Math.round(w * hz / 140), hz * 0.7, p.stars);
          const r = Math.max(5, Math.round(Math.min(w, h) * 0.07)), mx = Math.round(w * 0.68), my = Math.round(hz * (s.dark ? 0.32 : 0.78));
          P.disc(mx, my, r + 2, s.dark ? "#2a2a5a" : "#ffd8a8"); // a soft one-step halo
          P.disc(mx, my, r, p.orb);
          if (s.dark) { P.disc(mx - Math.round(r * 0.35), my - Math.round(r * 0.2), Math.max(1, Math.round(r * 0.22)), p.orbShade); P.disc(mx + Math.round(r * 0.3), my + Math.round(r * 0.35), Math.max(1, Math.round(r * 0.15)), p.orbShade); }
          P.ridge(hz - 2, hz * 0.32, p.far, 7, 1.0);
          P.ridge(hz, hz * 0.18, p.mid, 11, 0.6);
          P.ridge(hz + 1, hz * 0.07, p.near, 19, 0.3);
          for (let i = 0; i < 9; i++) { const x = rand(0, w); if (Math.abs(x - w * 0.27) > w * 0.12) P.pine(x, hz, rand(4, 9), p.near); }
          // the torii, its legs standing in the water
          const gw = Math.max(18, Math.round(Math.min(w, h) * 0.3)), gh = Math.round(gw * 0.85), gx = Math.round(w * 0.27), top = hz - gh, post = Math.max(2, Math.round(gw * 0.07));
          P.rect(gx - Math.round(gw * 0.36), top + Math.round(gh * 0.14), post, gh, p.gate);
          P.rect(gx + Math.round(gw * 0.36) - post, top + Math.round(gh * 0.14), post, gh, p.gate);
          P.rect(gx - Math.round(gw * 0.44), top + Math.round(gh * 0.3), Math.round(gw * 0.88), Math.max(1, Math.round(gh * 0.05)), p.gate);
          for (let i = 0; i <= gw * 1.1; i++) { // the curved top beam
            const x = gx - Math.round(gw * 0.55) + i, u = (i / (gw * 1.1)) * 2 - 1, lift = Math.round(u * u * gh * 0.06);
            P.rect(x, top - lift, 1, Math.max(1, Math.round(gh * 0.04)), p.gateDk);
            P.rect(x, top - lift + Math.max(1, Math.round(gh * 0.04)), 1, Math.max(2, Math.round(gh * 0.07)), p.gate);
          }
          P.rect(gx - Math.max(1, Math.round(post * 0.6)), top + Math.round(gh * 0.1), Math.max(2, Math.round(post * 1.2)), Math.round(gh * 0.2), p.gateDk);
        });
        s.petals = Array.from({ length: 7 }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(2, 4), ph: rand(0, TAU) }));
        s.tw = s.dark ? twinklers(8, w, hz * 0.6) : [];
        s.rows = [];
      },
      draw(ctx, s, t, dt) {
        const { w, h, hz, p } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.above, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        // the reflection: each row mirrored, a few nudged one pixel sideways, changing slowly
        const step = Math.floor(t * 1.5);
        for (let y = hz; y < h; y++) {
          const src = hz - (y - hz) - 1;
          if (src < 0) break;
          const n = Math.sin(y * 12.9898 + step * 78.233) * 43758.5453, wob = (y - hz) > 2 && (n - Math.floor(n)) < 0.35 ? ((n * 10) & 1 ? 1 : -1) : 0;
          ctx.drawImage(s.above, 0, src, w, 1, wob, y, w, 1);
        }
        ctx.fillStyle = p.water; ctx.fillRect(0, hz, w, h - hz);
        ctx.fillStyle = s.dark ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.25)"; ctx.fillRect(0, hz, w, 1);
        for (const q of s.petals) {
          q.y += q.v * dt; q.x += (2 + Math.sin(t * 0.4 + q.ph) * 2) * dt;
          if (q.y > h) { q.y = -2; q.x = rand(0, w); }
          ctx.fillStyle = "#ffb0c8"; ctx.fillRect(Math.round(q.x), Math.round(q.y), Math.sin(t + q.ph) > 0 ? 2 : 1, 1);
        }
      },
    },

    /* ---------------------------------------------------------- snowed-in cabin */
    pixelsnow: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, gy = Math.round(h * 0.72);
        const p = s.dark
          ? { sky: ["#05081a", "#0c1430", "#16224a", "#24345e"], far: "#3a4a78", farCap: "#8a9ac8", mid: "#203058", snow: ["#c8d4f0", "#a8b6e0", "#8a98c8"], pine: "#0e1a34", pineSnow: "#9aaad8", wall: "#4a2e24", wallDk: "#2e1c16", roof: "#d8e0f8", win: "#ffc864", winDk: "#e09040", stars: ["#ffffff", "#aab8e8"] }
          : { sky: ["#6a9ad8", "#8ab4e4", "#b0cfee", "#d8e8f6"], far: "#8aa0c8", farCap: "#f4f8ff", mid: "#6a84b0", snow: ["#ffffff", "#e8f0fa", "#cddcf0"], pine: "#2a4a5a", pineSnow: "#f4f8ff", wall: "#7a4a32", wallDk: "#5a3424", roof: "#ffffff", win: "#ffd890", winDk: "#e0a050", stars: [] };
        s.p = p;
        const cx = Math.round(w * 0.6), cw = Math.max(16, Math.round(Math.min(w, h) * 0.2)), ch = Math.round(cw * 0.55);
        s.chim = { x: cx + Math.round(cw * 0.25), y: gy - ch - Math.round(cw * 0.42) };
        s.win = { x: cx - Math.round(cw * 0.25), y: gy - Math.round(ch * 0.7), s: Math.max(3, Math.round(cw * 0.18)) };
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, gy, p.sky);
          if (s.dark) starfield(P, Math.round(w * h / 160), gy * 0.6, p.stars);
          P.ridge(gy - 4, h * 0.3, p.far, 6, 1, { hex: p.farCap, depth: 3, above: 0.6 });
          P.ridge(gy, h * 0.12, p.mid, 9, 0.5);
          // snowy ground with gentle drifts
          P.ridge(h - 1, h - gy + 4, p.snow[1], 3, 0.2);
          for (let i = 0; i < w * 0.6; i++) { const x = rand(0, w), y = rand(gy + 6, h); P.rect(x, y, Math.round(rand(2, 5)), 1, p.snow[2]); }
          // pines, far ones small and pale, near ones big
          for (let i = 0; i < Math.round(w / 9); i++) { const x = rand(0, w); if (Math.abs(x - cx) < cw) continue; const ht = rand(6, 14); P.pine(x, gy + rand(0, 3), ht, p.pine); for (let k = 2; k < ht; k += 3) P.set(x + rand(-2, 2), gy - ht + k, p.pineSnow); }
          for (const fx of [0.06, 0.16, 0.9, 0.97]) { const x = w * fx, ht = h * rand(0.3, 0.42); P.pine(x, h - 2, ht, p.pine, p.wallDk); }
          // the cabin
          const x0 = cx - Math.round(cw / 2);
          P.rect(x0, gy - ch, cw, ch, p.wall);
          for (let y = gy - ch + 2; y < gy; y += 3) P.rect(x0, y, cw, 1, p.wallDk);
          for (let r = 0; r < Math.round(cw * 0.42); r++) P.rect(x0 - 2 + r, gy - ch - r, cw + 4 - r * 2, 1, p.roof);
          P.rect(s.chim.x, s.chim.y, 3, Math.round(cw * 0.3), p.wallDk); P.rect(s.chim.x - 1, s.chim.y - 1, 5, 1, p.roof);
          P.rect(s.win.x, s.win.y, s.win.s, s.win.s, p.win); P.rect(s.win.x + (s.win.s >> 1), s.win.y, 1, s.win.s, p.wallDk); P.rect(s.win.x, s.win.y + (s.win.s >> 1), s.win.s, 1, p.wallDk);
          P.rect(s.win.x, s.win.y + s.win.s - 1, s.win.s, 1, p.winDk);
          P.rect(cx + Math.round(cw * 0.12), gy - Math.round(ch * 0.75), Math.max(3, Math.round(cw * 0.16)), Math.round(ch * 0.75), p.wallDk);
          P.rect(x0 - 1, gy, cw + 2, 1, p.snow[0]);
          // the light from the window lying on the snow
          for (let y = gy + 1; y < gy + 6; y++) for (let x = s.win.x - 3; x < s.win.x + s.win.s + 4; x++) if (dither(x, y) < 0.5 - (y - gy) * 0.08) P.set(x, y, s.dark ? "#a08a6a" : "#fff0c8");
        });
        s.flakes = Array.from({ length: Math.round(w / 6) }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(3, 7), ph: rand(0, TAU) }));
        s.smoke = [];
        s.tw = s.dark ? twinklers(6, w, gy * 0.5) : [];
      },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        // the window light breathes a little, like a fire inside
        ctx.fillStyle = s.dark ? "#ffe0a0" : "#fff0c0"; ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 1.3) * Math.sin(t * 0.7);
        ctx.fillRect(s.win.x, s.win.y, s.win.s >> 1, s.win.s >> 1); ctx.globalAlpha = 1;
        if (Math.random() < dt * 0.8) s.smoke.push({ x: s.chim.x + 1, y: s.chim.y - 2, life: 0 });
        s.smoke = s.smoke.filter((q) => (q.life += dt) < 7);
        for (const q of s.smoke) { q.y -= 2.5 * dt; q.x += 1.2 * dt; ctx.fillStyle = s.dark ? "#6a7698" : "#ffffff"; ctx.globalAlpha = 0.7 * (1 - q.life / 7); const sz = q.life > 3 ? 2 : 1; ctx.fillRect(Math.round(q.x), Math.round(q.y), sz, sz); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffffff";
        for (const f of s.flakes) {
          f.y += f.v * dt; f.x += Math.sin(t * 0.5 + f.ph) * 2 * dt;
          if (f.y > h) { f.y = -1; f.x = rand(0, w); }
          ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
        }
      },
    },

    /* ---------------------------------------------------------- tree on a hill */
    pixelmeadow: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s;
        const p = s.dark
          ? { sky: ["#0a0c24", "#1a1844", "#3a2a5e", "#6a3e6a", "#b0606a"], hill1: "#2a2a50", hill2: "#1a2440", grass: ["#162a2e", "#1e3636", "#24403a"], trunk: "#1a1220", leaves: ["#162a34", "#1e3640", "#28444a"], cloud: ["#4a3a6a", "#6a4a78"], stars: ["#ffffff", "#c8c0f0"] }
          : { sky: ["#3a86d8", "#5aa0e4", "#86bcee", "#b4d8f4", "#e0eef8"], hill1: "#7ab0a0", hill2: "#5a9a6a", grass: ["#4a9a3e", "#5cae48", "#72c258"], trunk: "#5a3a2a", leaves: ["#2e7a3a", "#3e9a46", "#5ab858"], cloud: ["#ffffff", "#e4eef8"], stars: [] };
        s.p = p;
        const gy = Math.round(h * 0.6);
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, gy + 4, p.sky);
          if (s.dark) starfield(P, Math.round(w * h / 150), gy * 0.6, p.stars);
          P.ridge(gy, h * 0.12, p.hill1, 4, 0.3);
          P.ridge(gy + Math.round(h * 0.08), h * 0.1, p.hill2, 5, 0.3);
          // the main hill: a smooth rise toward the right, dithered between three greens
          const peak = w * 0.66;
          for (let x = 0; x < w; x++) {
            const u = (x - peak) / w, top = Math.round(h * 0.62 + u * u * h * 1.3);
            for (let y = Math.max(0, top); y < h; y++) { const k = (y - top) / (h - top + 1) * 2.2; const i = Math.min(1, Math.floor(k)); P.set(x, y, (k - i) > dither(x, y) ? p.grass[Math.min(2, i + 1)] : p.grass[i]); }
            if (top > 0 && top < h && x % 3 === 0) P.set(x, top - 1, p.grass[2]);
          }
          // the tree on top
          const tx = Math.round(peak), base = Math.round(h * 0.62) + 1, th = Math.round(h * 0.22), cr = Math.max(6, Math.round(h * 0.13));
          P.rect(tx - 1, base - th, 3, th, p.trunk);
          P.rect(tx - 3, base - Math.round(th * 0.45), 3, 1, p.trunk); P.rect(tx + 2, base - Math.round(th * 0.6), 4, 1, p.trunk);
          const blobs = [[0, -th - cr * 0.2, cr], [-cr * 0.85, -th + cr * 0.3, cr * 0.75], [cr * 0.9, -th + cr * 0.25, cr * 0.8], [-cr * 0.3, -th + cr * 0.55, cr * 0.7], [cr * 0.4, -th - cr * 0.65, cr * 0.6]];
          for (const [bx, by, br] of blobs) P.disc(tx + Math.round(bx), base + Math.round(by), Math.round(br), p.leaves[0]);
          for (const [bx, by, br] of blobs) P.disc(tx + Math.round(bx - br * 0.2), base + Math.round(by - br * 0.25), Math.round(br * 0.7), p.leaves[1]);
          for (const [bx, by, br] of blobs) P.disc(tx + Math.round(bx - br * 0.35), base + Math.round(by - br * 0.45), Math.round(br * 0.35), p.leaves[2]);
        });
        const cloud = () => pixmap(Math.round(rand(24, 44)), 10, (P) => {
          const cw = P.w;
          for (let i = 0; i < 4; i++) P.disc(Math.round(cw * (0.2 + i * 0.2)), 6, Math.round(rand(2, 4)), p.cloud[1]);
          for (let i = 0; i < 3; i++) P.disc(Math.round(cw * (0.25 + i * 0.22)), 5, Math.round(rand(2, 3)), p.cloud[0]);
          P.rect(Math.round(cw * 0.12), 7, Math.round(cw * 0.76), 3, p.cloud[1]);
        });
        s.clouds = Array.from({ length: s.dark ? 0 : 4 }, () => ({ img: cloud(), x: rand(0, w), y: Math.round(rand(0.08, 0.4) * h), v: rand(0.6, 1.4) }));
        s.flies = s.dark ? Array.from({ length: 10 }, () => ({ x: rand(0, w), y: rand(h * 0.7, h), ph: rand(0, TAU), sp: rand(0.4, 0.9) })) : [];
        s.tw = s.dark ? twinklers(6, w, h * 0.35) : [];
      },
      draw(ctx, s, t, dt) {
        const { w } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        ctx.globalAlpha = s.dark ? 0.6 : 0.95;
        for (const c of s.clouds) { c.x += c.v * dt; if (c.x > w) c.x = -c.img.width; ctx.drawImage(c.img, Math.round(c.x), c.y); }
        ctx.globalAlpha = 1;
        for (const f of s.flies) {
          const a = Math.sin(t * f.sp + f.ph);
          if (a < 0.3) continue;
          const x = Math.round(f.x + Math.sin(t * 0.3 + f.ph) * 6), y = Math.round(f.y + Math.cos(t * 0.25 + f.ph) * 3);
          ctx.globalAlpha = a; ctx.fillStyle = "#e8ff8a"; ctx.fillRect(x, y, 1, 1);
          ctx.globalAlpha = a * 0.3; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
        }
        ctx.globalAlpha = 1;
      },
    },

    /* ---------------------------------------------------------- misty pine forest */
    pixelforest: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s;
        const p = s.dark
          ? { sky: ["#0a1020", "#122036", "#1c3048", "#2a4258"], layers: ["#24384c", "#1a2c3e", "#122030", "#0a1420", "#050a12"], fog: "#3a5468", moon: "#e8ecf0", stars: ["#ffffff", "#9ab0c8"] }
          : { sky: ["#b8c8c8", "#ccd8d0", "#dce4d8", "#ece8d8"], layers: ["#a8b8b0", "#8aa094", "#6a8478", "#4a665a", "#2a463c"], fog: "#e8ece4", moon: "#fff8e0", stars: [] };
        s.p = p;
        s.layers = p.layers.map((col, i) => pixmap(w, h, (P) => {
          const base = Math.round(h * (0.5 + i * 0.11)), sz = 0.6 + i * 0.45, gap = Math.max(2, Math.round(3 + i * 1.5));
          P.rect(0, base, w, h - base, col);
          for (let x = -4; x < w + 4; x += gap + Math.round(rand(0, gap))) P.pine(x, base + 1, h * 0.09 * sz * rand(0.7, 1.3), col);
        }));
        s.sky = pixmap(w, h, (P) => {
          P.sky(0, h, p.sky);
          if (s.dark) starfield(P, Math.round(w * h / 200), h * 0.4, p.stars);
          const r = Math.max(4, Math.round(Math.min(w, h) * 0.06));
          P.disc(Math.round(w * 0.24), Math.round(h * (s.dark ? 0.2 : 0.26)), r, p.moon);
        });
        // fog bands: dithered strips that slide sideways very slowly
        s.fog = [0, 1, 2].map((i) => pixmap(w * 2, Math.round(h * 0.12), (P) => {
          const fh = P.h;
          for (let y = 0; y < fh; y++) for (let x = 0; x < P.w; x++) {
            const k = Math.sin((y / fh) * Math.PI) * (0.55 + 0.45 * Math.sin(x * 0.05 + i * 2) * Math.sin(x * 0.013 + i));
            if (k > dither(x, y) + 0.15) P.set(x, y, p.fog);
          }
        }));
        s.tw = s.dark ? twinklers(5, w, h * 0.35) : [];
      },
      draw(ctx, s, t) {
        const { w, h } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.sky, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        s.layers.forEach((img, i) => {
          ctx.drawImage(img, 0, 0);
          if (i < 3) {
            const f = s.fog[i], off = Math.round((t * (0.8 + i * 0.5)) % w);
            ctx.globalAlpha = s.dark ? 0.35 : 0.6;
            ctx.drawImage(f, -off, Math.round(h * (0.5 + i * 0.11) - f.height * 0.6));
            ctx.globalAlpha = 1;
          }
        });
      },
    },

    /* ---------------------------------------------------------- aquarium */
    pixelaquarium: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, sandY = Math.floor(h * 0.84);
        s.sandY = sandY;
        const water = s.dark ? ["#123c5a", "#0e3250", "#0a2842", "#071e34", "#04142a"] : ["#2a86b0", "#1f74a0", "#196290", "#14527e", "#0f426a"];
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, sandY + 3, water);
          for (let y = sandY - 2; y < h; y++) for (let x = 0; x < w; x++) {
            if (y < sandY + Math.round(Math.sin(x * 0.15) * 1.5)) continue;
            P.set(x, y, ["#d8c08a", "#c9ae74", "#e6d29e", "#b99d63"][(x * 7 + y * 13) % 4 === 0 ? 3 : (x + y) % 3]);
          }
          for (const [rx, rw, rh] of [[0.12, 14, 8], [0.7, 20, 11], [0.86, 9, 5]]) {
            const x0 = Math.floor(w * rx);
            for (let yy = 0; yy < rh; yy++) { const half = Math.round(rw / 2 * Math.sqrt(1 - (yy / rh) ** 2)); P.rect(x0 - half, sandY + 1 - yy, half * 2, 1, yy < 2 ? "#8a9098" : yy < rh / 2 ? "#6c727c" : "#565b64"); }
          }
          const cx = Math.floor(w * 0.32), cy = sandY + 1;
          P.rect(cx, cy - 16, 14, 16, "#7a6a8a"); P.rect(cx - 4, cy - 10, 4, 10, "#7a6a8a"); P.rect(cx + 14, cy - 10, 4, 10, "#7a6a8a");
          for (let k = 0; k < 4; k++) P.rect(cx + k * 4, cy - 18, 2, 2, "#5c4e6c");
          P.rect(cx + 5, cy - 6, 4, 6, "#3c3048"); P.rect(cx + 6, cy - 12, 2, 2, "#ffd27a");
          // still light shafts from above, dithered in
          for (let k = 0; k < 4; k++) { const x0 = Math.round(w * (0.1 + k * 0.25)); for (let y = 0; y < sandY; y++) for (let i = 0; i < 6; i++) if (dither(x0 + i + Math.round(y * 0.4), y) < 0.18 * (1 - y / sandY)) P.set(x0 + i + Math.round(y * 0.4), y, s.dark ? "#2a5a7a" : "#5ab0d4"); }
        });
        s.plants = Array.from({ length: Math.round(w / 16) }, () => ({ x: Math.floor(rand(0, w)), hgt: Math.floor(rand(8, sandY * 0.32)), ph: rand(0, TAU), c: Math.random() < 0.5 ? ["#2f9e5b", "#3fbf6f"] : ["#4c8a2a", "#6aaa3a"] }));
        const fishCols = [["#ff8a3d", "#ffd27a"], ["#ffd23d", "#fff3b0"], ["#3de8ff", "#d0faff"], ["#ff6a8a", "#ffc0cc"], ["#b48aff", "#e9dcff"]];
        s.fish = Array.from({ length: 5 }, (_, i) => ({ x: rand(0, w), y: rand(h * 0.15, sandY - 12), len: Math.floor(rand(7, 12)), v: rand(3, 6) * (Math.random() < 0.5 ? 1 : -1), c: fishCols[i], ph: rand(0, TAU) }));
        s.bubbles = [];
      },
      draw(ctx, s, t, dt) {
        const { w, sandY } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        for (const p of s.plants) for (let y = 0; y < p.hgt; y++) { const sway = Math.round(Math.sin(t * 0.5 + p.ph + y * 0.2) * (y / p.hgt) * 2); ctx.fillStyle = y % 3 ? p.c[0] : p.c[1]; ctx.fillRect(p.x + sway, sandY - y, 2, 1); }
        for (const f of s.fish) {
          f.x += f.v * dt;
          if (f.x > w + 14) f.x = -14; if (f.x < -14) f.x = w + 14;
          const dir = Math.sign(f.v), x0 = Math.round(f.x), y0 = Math.round(f.y + Math.sin(t * 0.3 + f.ph) * 2), hh = Math.max(2, Math.round(f.len / 3)), wag = Math.sin(t * 3 + f.ph) > 0 ? 1 : 0;
          for (let i = 0; i < f.len; i++) {
            const k = i / (f.len - 1), half = Math.max(1, Math.round(hh * Math.sin(Math.PI * (0.15 + k * 0.85))));
            ctx.fillStyle = i % 4 === 1 && f.len > 7 ? f.c[1] : f.c[0];
            ctx.fillRect(x0 + dir * (f.len / 2 - i), y0 - half + 1, 1, half * 2 - 1);
          }
          ctx.fillStyle = f.c[0];
          const tx = x0 - dir * (f.len / 2 + 1);
          ctx.fillRect(tx - (dir > 0 ? 1 : 0), y0 - hh + wag, 2, 1); ctx.fillRect(tx - (dir > 0 ? 1 : 0), y0 + hh - 2 + wag, 2, 1); ctx.fillRect(tx, y0, 1, 1);
          ctx.fillStyle = "#0b0b14"; ctx.fillRect(x0 + dir * (f.len / 2 - 2), y0 - 1, 1, 1);
        }
        if (Math.random() < dt * 1.2) s.bubbles.push({ x: Math.floor(w * 0.7) + rand(-3, 3), y: sandY - 10, ph: rand(0, TAU) });
        s.bubbles = s.bubbles.filter((b) => (b.y -= 6 * dt) > 0);
        ctx.fillStyle = "#cdefff";
        for (const b of s.bubbles) ctx.fillRect(Math.round(b.x + Math.sin(t * 2 + b.ph)), Math.round(b.y), 1, 1);
      },
    },

    /* ---------------------------------------------------------- canyon */
    pixelcanyon: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s;
        const p = s.dark
          ? { sky: ["#080a24", "#141640", "#2a1e52", "#4a2a5a"], far: "#3a2448", farDk: "#2a1a38", mid: "#4a2034", midDk: "#2e1422", strata: "#5e2c44", plain: ["#2a1830", "#22121e", "#180c14"], river: ["#1e2858", "#2a3a78"], spark: "#c8d4ff", cactus: "#0e0810", orb: "#f0e8d0", stars: ["#ffffff", "#b8b0e8"] }
          : { sky: ["#3a70c8", "#7aa4dc", "#f0b48a", "#ffd49a"], far: "#d8907a", farDk: "#b87466", mid: "#c8603e", midDk: "#8e3e2a", strata: "#e0805a", plain: ["#c88a5a", "#b4704a", "#9a5a3a"], river: ["#3a7ab8", "#5a9ad0"], spark: "#ffffff", cactus: "#3e5a32", orb: "#fff4d0", stars: [] };
        s.p = p;
        const mesa = (P, cx, halfTop, top, base, col, dk, strata) => {
          const H = base - top;
          for (let y = top; y < base; y++) {
            const k = (y - top) / H, half = halfTop + (k < 0.65 ? Math.round(k * 4) : Math.round(3 + (k - 0.65) * H * 1.3));
            for (let x = cx - half; x <= cx + half; x++) {
              const shade = x > cx + half * 0.3;
              P.set(x, y, !shade && k < 0.65 && (y - top) % 5 === 2 ? strata : shade ? dk : col);
            }
          }
          P.rect(cx - halfTop, top, Math.round(halfTop * 1.3), 1, strata);
        };
        const riverPx = [];
        s.bg = pixmap(w, h, (P) => {
          const plainY = Math.round(h * 0.68);
          P.sky(0, plainY + 2, p.sky);
          if (s.dark) starfield(P, Math.round(w * h / 150), h * 0.45, p.stars);
          const r = Math.max(4, Math.round(h * 0.06));
          P.disc(Math.round(w * 0.78), Math.round(h * (s.dark ? 0.18 : 0.5)), r, p.orb);
          for (const [x, top, hw] of [[0.08, 0.5, 0.07], [0.3, 0.56, 0.04], [0.5, 0.46, 0.09], [0.7, 0.54, 0.05], [0.92, 0.5, 0.06]]) mesa(P, Math.round(w * x), Math.round(w * hw), Math.round(h * top), plainY + 2, p.far, p.farDk, p.strata);
          for (let y = plainY; y < h; y++) {
            const k = ((y - plainY) / (h - plainY)) * 2, i = Math.min(1, Math.floor(k));
            for (let x = 0; x < w; x++) P.set(x, y, (k - i) > dither(x, y) ? p.plain[i + 1] : p.plain[i]);
          }
          // the river winds toward you, wider as it comes closer
          for (let y = plainY + 2; y < h; y++) {
            const k = (y - plainY) / (h - plainY), c = w * (0.5 + 0.13 * Math.sin(k * 4.5)), half = 1 + k * k * w * 0.1;
            for (let x = Math.round(c - half); x <= Math.round(c + half); x++) { P.set(x, y, k > dither(x, y) + 0.2 ? p.river[1] : p.river[0]); if (Math.random() < 0.06) riverPx.push([x, y]); }
          }
          mesa(P, Math.round(w * 0.12), Math.round(w * 0.08), Math.round(h * 0.4), Math.round(h * 0.86), p.mid, p.midDk, p.strata);
          mesa(P, Math.round(w * 0.88), Math.round(w * 0.06), Math.round(h * 0.46), Math.round(h * 0.84), p.mid, p.midDk, p.strata);
          // a few saguaros in front
          for (const fx of [0.3, 0.66, 0.74]) {
            const x = Math.round(w * fx), base = Math.round(h * (0.86 + fx * 0.05)), ht = Math.round(h * rand(0.07, 0.11));
            P.rect(x, base - ht, 2, ht, p.cactus);
            P.rect(x - 3, base - Math.round(ht * 0.6), 3, 1, p.cactus); P.rect(x - 3, base - Math.round(ht * 0.85), 1, Math.round(ht * 0.25), p.cactus);
            P.rect(x + 2, base - Math.round(ht * 0.45), 3, 1, p.cactus); P.rect(x + 4, base - Math.round(ht * 0.75), 1, Math.round(ht * 0.3), p.cactus);
          }
        });
        s.sparks = riverPx.map(([x, y]) => ({ x, y, ph: rand(0, TAU), sp: rand(0.4, 1) }));
        s.tw = s.dark ? twinklers(6, w, h * 0.4) : [];
        s.bird = { r: w * 0.12, cx: w * 0.42, cy: h * 0.24, ph: rand(0, TAU) };
      },
      draw(ctx, s, t) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        ctx.fillStyle = s.p.spark;
        for (const k of s.sparks) { const a = Math.sin(t * k.sp + k.ph); if (a > 0.7) { ctx.globalAlpha = (a - 0.7) * 3; ctx.fillRect(k.x, k.y, 1, 1); } }
        ctx.globalAlpha = 1;
        if (!s.dark) { // a hawk circling, very slowly
          const b = s.bird, a = t * 0.12 + b.ph, x = Math.round(b.cx + Math.cos(a) * b.r), y = Math.round(b.cy + Math.sin(a) * b.r * 0.3);
          ctx.fillStyle = "#3a2420"; ctx.fillRect(x - 2, y - 1, 2, 1); ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y - 1, 2, 1);
        }
      },
    },

    /* ---------------------------------------------------------- harbor */
    pixelharbor: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, hz = Math.round(h * 0.58);
        s.hz = hz;
        const p = s.dark
          ? { sky: ["#06081c", "#0e1430", "#1a2448", "#2c3658"], hills: "#141a34", hills2: "#0e1228", town: ["#ffd27a", "#ffb050"], water: ["#0e1636", "#0a1028", "#070b1e"], streak: "#1e2a50", dock: "#3a2a20", dockDk: "#22180f", lamp: "#ffe0a0", hull: ["#c8c0b0", "#8a3a2a", "#2a4a6a"], hullDk: "#5a5048", cabin: "#d8d0c0", mast: "#8a8070", orb: "#eef0f8", stars: ["#ffffff", "#9aa8d0"] }
          : { sky: ["#3a82d8", "#6aa4e4", "#9ac4ec", "#cfe2f2"], hills: "#6a9a7a", hills2: "#4e8062", town: ["#f4f0e8", "#e86a4a"], water: ["#3a8ac0", "#2a74aa", "#1e5e90"], streak: "#7ab8de", dock: "#8a6a4a", dockDk: "#5a4430", lamp: "#3a3a3a", hull: ["#ffffff", "#d84a3a", "#2a5a9a"], hullDk: "#9a9a9a", cabin: "#f4ecdc", mast: "#6a5a4a", orb: "#fff8e0", stars: [] };
        s.p = p;
        s.dockY = Math.round(h * 0.78);
        s.lamps = [0.07, 0.27].map((fx) => ({ x: Math.round(w * fx), y: Math.round(h * 0.66) }));
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, hz, p.sky);
          if (s.dark) starfield(P, Math.round(w * hz / 140), hz * 0.7, p.stars);
          const r = Math.max(4, Math.round(h * 0.05)), mx = Math.round(w * 0.62), my = Math.round(h * 0.2);
          P.disc(mx, my, r, p.orb);
          P.ridge(hz, h * 0.14, p.hills, 5, 0.5);
          P.ridge(hz + 1, h * 0.06, p.hills2, 9, 0.4);
          for (let i = 0; i < Math.round(w / 6); i++) { const x = rand(w * 0.35, w), y = hz - rand(1, h * 0.06); P.set(x, y, p.town[i % 2]); }
          P.sky(hz, h, p.water);
          for (let i = 0; i < w * 0.5; i++) P.rect(rand(0, w), rand(hz + 2, h), Math.round(rand(2, 6)), 1, p.streak);
          // the moon's (or sun's) path on the water
          for (let y = hz + 2; y < h; y += 2) if (Math.random() < 0.7) { const half = Math.round(rand(1, 2 + (y - hz) * 0.08)); P.rect(mx - half + Math.round(rand(-2, 2)), y, half * 2, 1, s.dark ? "#4a5a8a" : "#e8f4fc"); }
          // the dock: planks, posts into the water, and two lamps
          const dy = s.dockY, dx1 = Math.round(w * 0.36);
          for (let x = 0; x < dx1; x += 6) P.rect(x, dy, 2, h - dy, p.dockDk);
          P.rect(0, dy - 2, dx1, 3, p.dock); for (let x = 0; x < dx1; x += 4) P.set(x, dy - 2, p.dockDk);
          P.rect(0, dy + 1, dx1, 1, p.dockDk);
          for (const l of s.lamps) {
            if (s.dark) for (let yy = -8; yy <= 8; yy++) for (let xx = -8; xx <= 8; xx++) { const d = Math.hypot(xx, yy) / 8; if (d < 1 && dither(l.x + xx, l.y + yy) < (1 - d) * 0.45) P.set(l.x + xx, l.y + yy, "#5a5070"); }
            P.rect(l.x, l.y, 1, dy - l.y, p.dockDk); P.rect(l.x - 1, l.y - 2, 3, 2, p.lamp);
          }
        });
        const boat = (len, hullCol, sail) => pixmap(len + 2, Math.round(len * 1.3), (P) => {
          const H = P.h, deck = H - Math.max(3, Math.round(len * 0.22));
          for (let r = 0; r < H - deck; r++) P.rect(r, deck + r, len - r * 2 + 2, 1, r === 0 ? p.hullDk : hullCol);
          P.rect(Math.round(len * 0.3), deck - 3, Math.round(len * 0.35), 3, p.cabin); P.rect(Math.round(len * 0.35), deck - 2, 1, 1, p.hullDk);
          if (sail) { const mx = Math.round(len * 0.62); P.rect(mx, 0, 1, deck, p.mast); P.rect(mx - 1, deck - 2, Math.round(len * 0.35), 1, p.mast); }
        });
        s.boats = [[0.48, 0.72, 16, 1, true], [0.68, 0.8, 22, 0, true], [0.88, 0.7, 12, 2, false], [0.58, 0.64, 9, 0, true]].map(([x, y, len, ci, sail]) => {
          const L = Math.max(8, Math.round(len * 1.6 * h / 216));
          return { img: boat(L, p.hull[ci], sail), x: Math.round(w * x), y: Math.round(h * y), ph: rand(0, TAU) };
        }).sort((a, b) => a.y - b.y);
      },
      draw(ctx, s, t) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        if (s.dark) { // each lamp's light shimmering on the water, shifting a little every so often
          const step = Math.floor(t * 1.2);
          ctx.fillStyle = "#e8c070";
          for (const l of s.lamps) for (let k = 0; k < 7; k++) {
            const n = Math.sin((l.x + k) * 12.9898 + step * 78.233) * 43758.5453, f = n - Math.floor(n);
            ctx.globalAlpha = 0.6 - k * 0.07; ctx.fillRect(l.x - 1 + Math.round((f - 0.5) * 4), s.dockY + 4 + Math.round(k * 2.5), 2 + Math.round(f * 2), 1);
          }
          ctx.globalAlpha = 1;
        }
        for (const b of s.boats) { // boats bob by a pixel now and then, with their reflections below
          const by = b.y + Math.round(Math.sin(t * 0.5 + b.ph) * 0.7), x = b.x - (b.img.width >> 1);
          ctx.save(); ctx.globalAlpha = 0.25; ctx.translate(x, by); ctx.scale(1, -1); ctx.drawImage(b.img, 0, -b.img.height); ctx.restore();
          ctx.drawImage(b.img, x, by - b.img.height);
        }
      },
    },

    /* ---------------------------------------------------------- windmill */
    pixelwindmill: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, hz = Math.round(h * 0.6);
        const p = s.dark
          ? { sky: ["#080c24", "#121c48", "#22305e", "#3a426e"], trees: "#121a30", field: ["#1c2442", "#2a3458", "#3a4670"], body: "#2a2438", bodyDk: "#1e1a2a", roof: "#1a1424", sail: "#5a5270", cloth: "#3a3450", win: "#ffc864", orb: "#f0eee0", stars: ["#ffffff", "#aab4e0"] }
          : { sky: ["#3e86d6", "#78ace4", "#e8c894", "#ffb47a"], trees: "#5a7a4a", field: ["#c08a32", "#d4a246", "#e8bc5c"], body: "#efe6d6", bodyDk: "#cfc2ae", roof: "#7a3e30", sail: "#5a3a2a", cloth: "#f4ecdc", win: "#4a5a7a", orb: "#fff6d8", stars: [] };
        s.p = p;
        const mx = Math.round(w * 0.66), base = Math.round(h * 0.66), bh = Math.round(h * 0.36), bwB = Math.round(h * 0.08), bwT = Math.round(h * 0.045);
        s.hub = { x: mx, y: base - bh - 1 }; s.L = Math.round(h * 0.26);
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, hz + 2, p.sky);
          if (s.dark) starfield(P, Math.round(w * hz / 140), hz * 0.7, p.stars);
          P.disc(Math.round(w * 0.22), Math.round(h * (s.dark ? 0.2 : 0.52)), Math.max(4, Math.round(h * 0.055)), p.orb);
          for (let x = 0; x < w; x += 3) { const r = Math.round(rand(1, 3)); P.disc(x, hz - r + 1, r, p.trees); }
          // rows of wheat running away from you: closer rows are wider apart
          for (let y = hz; y < h; y++) {
            const d = y - hz + 3, band = Math.floor(60 / d) % 3, k = (y - hz) / (h - hz);
            for (let x = 0; x < w; x++) P.set(x, y, p.field[(band + (dither(x, y) < k * 0.5 ? 1 : 0)) % 3]);
          }
          for (let i = 0; i < w * 1.5; i++) { const y = rand(hz + (h - hz) * 0.4, h), x = rand(0, w); P.rect(x, y - 2, 1, 2, p.field[2]); }
          // the mill: a tapered tower with a cap, a door and a lit window
          for (let y = 0; y < bh; y++) {
            const half = Math.round(bwT + (bwB - bwT) * (y / bh));
            for (let x = -half; x <= half; x++) P.set(mx + x, base - bh + y, x > half * 0.3 ? p.bodyDk : p.body);
          }
          for (let r = 0; r < Math.round(bwT * 1.4); r++) P.rect(mx - bwT - 2 + r, base - bh - r, (bwT + 2 - r) * 2 + 1, 1, p.roof);
          P.rect(mx - 2, base - 6, 4, 6, p.roof);
          P.rect(mx - 1, base - Math.round(bh * 0.6), 3, 3, p.win);
        });
        s.clouds = s.dark ? [] : Array.from({ length: 3 }, () => ({ img: cloudSprite("#ffffff", "#f0e4d8"), x: rand(0, w), y: Math.round(rand(0.08, 0.3) * h), v: rand(0.5, 1.2) }));
        s.tw = s.dark ? twinklers(6, w, hz * 0.6) : [];
      },
      draw(ctx, s, t, dt) {
        const { w, p, hub, L } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        for (const c of s.clouds) { c.x += c.v * dt; if (c.x > w) c.x = -c.img.width; ctx.drawImage(c.img, Math.round(c.x), c.y); }
        // four lattice sails turning slowly
        const ang = t * 0.2;
        for (let k = 0; k < 4; k++) {
          const a = ang + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
          for (let r = Math.round(L * 0.3); r <= L; r++) for (let o = 1; o <= 3; o++) {
            ctx.fillStyle = o === 3 || r % 3 === 0 ? p.sail : p.cloth;
            ctx.fillRect(Math.round(hub.x + ca * r + px * o), Math.round(hub.y + sa * r + py * o), 1, 1);
          }
          ctx.fillStyle = p.sail;
          for (let r = 1; r <= L; r++) ctx.fillRect(Math.round(hub.x + ca * r), Math.round(hub.y + sa * r), 1, 1);
        }
        ctx.fillStyle = p.roof; ctx.fillRect(hub.x - 1, hub.y - 1, 3, 3);
      },
    },

    /* ---------------------------------------------------------- bamboo grove */
    pixelbamboo: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s;
        const p = s.dark
          ? { bg: ["#0a1a16", "#0e221c", "#122a22", "#16302a"], mist: "#24443a", layers: [["#1a3a2e", "#16322a"], ["#22503a", "#1a4230"], ["#2c6a48", "#22563a"]], hi: "#4a8a62", leaf: ["#1e4a34", "#2a6044", "#3a7a52"], shaft: "#2a4a40" }
          : { bg: ["#e4eed8", "#d4e6c4", "#c4dcb0", "#b0d09c"], mist: "#eef4e4", layers: [["#a8c896", "#98bc86"], ["#78a864", "#68985a"], ["#4a8a3e", "#3a7432"]], hi: "#9ad07a", leaf: ["#4a8a3e", "#68a850", "#88c066"], shaft: "#f4f8e8" };
        s.p = p;
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, h, p.bg);
          for (let k = 0; k < 4; k++) { const x0 = Math.round(w * (0.1 + k * 0.27)); for (let y = 0; y < h; y++) for (let i = 0; i < 10; i++) { const x = x0 + i + Math.round(y * 0.35); if (dither(x, y) < 0.22 * (1 - y / h)) P.set(x, y, p.shaft); } }
          p.layers.forEach(([col, dk], li) => {
            const sw = [2, 3, 5][li], gap = [7, 14, 28][li];
            for (let x = Math.round(rand(-4, 0)); x < w + 4; x += gap + Math.round(rand(0, gap))) {
              const seg = Math.round(rand(10, 18) * (1 + li * 0.3));
              let ny = Math.round(rand(0, seg));
              P.rect(x, 0, sw, h, col);
              if (sw > 2) P.rect(x + sw - 1, 0, 1, h, dk);
              if (li === 2) P.rect(x, 0, 1, h, p.hi);
              for (; ny < h; ny += seg) {
                P.rect(x - 1, ny, sw + 2, 1, dk);
                if (li > 0 && Math.random() < 0.4) { // a spray of leaves from the node
                  const dir = Math.random() < 0.5 ? -1 : 1, lc = p.leaf[li];
                  for (let l = 0; l < 3; l++) for (let j = 0; j < 4 + li * 2; j++) P.set(x + (dir > 0 ? sw : -1) + dir * j, ny + l * 2 + Math.round(j * 0.5), lc);
                }
              }
            }
            if (li === 0) for (let y = Math.round(h * 0.55); y < h; y++) for (let x = 0; x < w; x++) if (dither(x, y) < (y / h - 0.55) * 0.9) P.set(x, y, p.mist);
          });
        });
        s.leaves = Array.from({ length: 4 }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(3, 5), ph: rand(0, TAU) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        ctx.fillStyle = p.leaf[2];
        for (const l of s.leaves) {
          l.y += l.v * dt; l.x += Math.sin(t * 0.6 + l.ph) * 3 * dt;
          if (l.y > h) { l.y = -2; l.x = rand(0, w); }
          const x = Math.round(l.x), y = Math.round(l.y), tilt = Math.sin(t * 0.8 + l.ph) > 0;
          ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y + (tilt ? 1 : -1), 1, 1); ctx.fillRect(x + 2, y + (tilt ? 1 : -1), 1, 1);
        }
      },
    },

    /* ---------------------------------------------------------- cave mouth */
    pixelcave: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, cx = w * 0.5, cy = h * 0.5, rx = w * 0.36, ry = h * 0.36;
        const p = s.dark
          ? { sky: ["#070b24", "#101a48", "#1e2c66", "#2e3a74"], m1: "#1e2a54", m2: "#141c3c", cap: "#6a7aaa", valley: "#0e1830", lake: ["#1e2c60", "#2a3c7a"], pine: "#0a1022", rock: ["#06050a", "#0e0b14", "#18131e", "#241c2c"], rim: "#3a3050", orb: "#f0f0e8", stars: ["#ffffff", "#aab4e0"], drop: "#8aa0d8" }
          : { sky: ["#3a86e0", "#6aa8ec", "#a4ccf4", "#d8ecfa"], m1: "#7a9ac4", m2: "#5a7aa4", cap: "#ffffff", valley: "#5a9a4a", lake: ["#4a96d4", "#7ab8e8"], pine: "#2e6a3a", rock: ["#1a1416", "#2a2224", "#3a3034", "#4c4044"], rim: "#7a6a68", orb: "#fff8e0", stars: [], drop: "#bfe4ff" };
        s.p = p;
        const ph = [rand(0, TAU), rand(0, TAU), rand(0, TAU)];
        const open = (a) => 1 + 0.07 * Math.sin(3 * a + ph[0]) + 0.05 * Math.sin(7 * a + ph[1]) + 0.03 * Math.sin(13 * a + ph[2]);
        s.tips = [];
        s.bg = pixmap(w, h, (P) => {
          const hz = Math.round(h * 0.6);
          P.sky(0, hz, p.sky);
          if (s.dark) starfield(P, Math.round(w * h / 120), hz * 0.8, p.stars);
          P.disc(Math.round(w * 0.6), Math.round(h * 0.26), Math.max(3, Math.round(h * 0.04)), p.orb);
          P.ridge(hz - 2, h * 0.28, p.m1, 6, 1, { hex: p.cap, depth: 3, above: 0.55 });
          P.ridge(hz + 2, h * 0.12, p.m2, 10, 0.5);
          P.rect(0, hz + 2, w, h - hz, p.valley);
          for (let y = hz + 6; y < hz + 6 + h * 0.08; y++) { const k = (y - hz - 6) / (h * 0.08), half = Math.round(w * 0.16 * Math.sin(Math.PI * k)); P.rect(Math.round(w * 0.45) - half, y, half * 2, 1, k > 0.5 ? p.lake[0] : p.lake[1]); }
          for (let i = 0; i < Math.round(w / 5); i++) P.pine(rand(0, w), hz + rand(4, h * 0.2), rand(3, 7), p.pine);
          // the rock around the opening, lighter toward its edge
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rx, dy = (y - cy) / ry, rr = Math.hypot(dx, dy) / open(Math.atan2(dy, dx));
            if (rr < 1) continue;
            if (rr < 1.035) { P.set(x, y, p.rim); continue; }
            const k = Math.max(0, 1 - (rr - 1) * 2.2) * 3, i = Math.min(2, Math.floor(k));
            P.set(x, y, (k - i) > dither(x, y) ? p.rock[i + 1] : p.rock[i]);
          }
          // stalactites hanging into the opening
          for (let k = 0; k < 7; k++) {
            const x = Math.round(cx + rand(-0.75, 0.75) * rx); let top = 0;
            for (let y = 0; y < h; y++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (Math.hypot(dx, dy) / open(Math.atan2(dy, dx)) < 1) { top = y; break; } }
            const len = Math.round(rand(3, h * 0.08)), half = Math.max(1, Math.round(len * 0.22));
            for (let r = 0; r < len; r++) { const hw = Math.round(half * (1 - r / len)); P.rect(x - hw, top + r, hw * 2 + 1, 1, r === len - 1 ? p.rim : p.rock[2]); }
            s.tips.push({ x, y: top + len });
          }
        });
        s.floorY = Math.round(cy + ry * 0.98);
        s.drops = []; s.next = rand(1, 3);
        s.tw = s.dark ? twinklers(6, w, h * 0.4).filter((q) => Math.hypot((q.x - cx) / rx, (q.y - cy) / ry) < 0.9) : [];
      },
      draw(ctx, s, t, dt) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        if ((s.next -= dt) < 0 && s.tips.length) { const tip = s.tips[Math.floor(rand(0, s.tips.length))]; s.drops.push({ x: tip.x, y: tip.y, v: 0, hang: 1.2 }); s.next = rand(3, 7); }
        ctx.fillStyle = s.p.drop;
        s.drops = s.drops.filter((d) => {
          if (d.hang > 0) d.hang -= dt; else { d.v += 60 * dt; d.y += d.v * dt; }
          if (d.y > s.floorY) return false;
          ctx.fillRect(d.x, Math.round(d.y), 1, d.hang > 0 ? 1 : 2);
          return true;
        });
      },
    },

    /* ---------------------------------------------------------- rooftops */
    pixelrooftops: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s;
        const p = s.dark
          ? { sky: ["#080a22", "#121640", "#20265a", "#34366c"], rows: [{ roof: "#1e2246", edge: "#2a3060", wall: "#1a1c38" }, { roof: "#171a36", edge: "#262a52", wall: "#14152c" }, { roof: "#0f1024", edge: "#20223e", wall: "#0c0d1c" }], win: ["#ffcf70", "#ffb050"], winOff: null, orb: "#f2ecd8", stars: ["#ffffff", "#b4bce8"], smoke: "#5a6088" }
          : { sky: ["#4a92e0", "#7ab2ea", "#aed0f2", "#d8eaf8"], rows: [{ roof: "#c8928a", edge: "#dcaaa0", wall: "#ece2d2" }, { roof: "#b8604a", edge: "#d07a62", wall: "#e4d4bc" }, { roof: "#8a3a2a", edge: "#a85240", wall: "#d4c0a4" }], win: ["#5a7aa4", "#4a6890"], winOff: null, orb: "#fff6d8", stars: [], smoke: "#ffffff" };
        s.p = p;
        s.wins = []; s.chims = [];
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, h, p.sky);
          if (s.dark) starfield(P, Math.round(w * h / 150), h * 0.45, p.stars);
          P.disc(Math.round(w * 0.8), Math.round(h * 0.18), Math.max(4, Math.round(h * 0.05)), p.orb);
          p.rows.forEach((c, ri) => {
            const base = Math.round(h * [0.7, 0.86, 1.06][ri]), sc = h / 216 * [1.2, 1.7, 2.3][ri];
            let x = Math.round(rand(-20, 0));
            while (x < w) {
              const hw = Math.round(rand(16, 30) * sc), wallH = Math.round(rand(14, 26) * sc), rh = Math.round(hw * rand(0.35, 0.55)), top = base - wallH;
              P.rect(x, top, hw, base - top, c.wall);
              // windows in a grid, some lit
              const ws = Math.max(2, Math.round(2 * sc)), gapX = ws * 3, gapY = ws * 3;
              for (let wy = top + ws * 2; wy < base - ws * 2; wy += gapY) for (let wx = x + ws * 2; wx < x + hw - ws * 2; wx += gapX) {
                const lit = s.dark ? Math.random() < 0.45 : true;
                P.rect(wx, wy, ws, Math.round(ws * 1.4), lit ? p.win[Math.floor(rand(0, 2))] : c.roof);
                if (lit && s.dark && ri > 0) s.wins.push({ x: wx, y: wy, w: ws, h: Math.round(ws * 1.4), wall: c.roof, off: false });
              }
              // a gable roof with a tile line every few rows
              const cxh = x + hw / 2;
              for (let r = 0; r <= rh; r++) { const half = Math.round((hw / 2 + 1) * (1 - r / rh)); P.rect(Math.round(cxh - half), top - r, half * 2, 1, r % 3 === 0 ? c.edge : c.roof); }
              if (Math.random() < 0.45) { const chx = Math.round(x + hw * rand(0.6, 0.8)), chh = Math.round(rh * 0.7); P.rect(chx, top - chh - 2, Math.max(2, Math.round(2 * sc)), chh, c.edge); if (ri > 0) s.chims.push({ x: chx, y: top - chh - 3 }); }
              x += hw + Math.round(rand(-3, 2) * sc);
            }
          });
        });
        s.chims = s.chims.sort(() => Math.random() - 0.5).slice(0, 2);
        s.smoke = [];
        s.tw = s.dark ? twinklers(6, w, h * 0.35) : [];
      },
      draw(ctx, s, t, dt) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        // now and then someone switches a light off or on
        if (s.wins.length && Math.random() < dt * 0.08) { const wn = s.wins[Math.floor(rand(0, s.wins.length))]; wn.off = !wn.off; }
        for (const wn of s.wins) if (wn.off) { ctx.fillStyle = wn.wall; ctx.fillRect(wn.x, wn.y, wn.w, wn.h); }
        for (const c of s.chims) if (Math.random() < dt * 0.7) s.smoke.push({ x: c.x + 1, y: c.y, life: 0 });
        s.smoke = s.smoke.filter((q) => (q.life += dt) < 6);
        ctx.fillStyle = s.p.smoke;
        for (const q of s.smoke) { q.y -= 2.5 * dt; q.x += 1.5 * dt; ctx.globalAlpha = 0.6 * (1 - q.life / 6); const sz = q.life > 2.5 ? 2 : 1; ctx.fillRect(Math.round(q.x), Math.round(q.y), sz, sz); }
        ctx.globalAlpha = 1;
      },
    },

    /* ---------------------------------------------------------- stone bridge */
    pixelbridge: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, hz = Math.round(h * 0.64), u = h / 216;
        s.hz = hz;
        const p = s.dark
          ? { sky: ["#0a0c26", "#161a44", "#2a2a5a", "#463a68"], trees: ["#161c34", "#10162a"], stone: "#4a4660", stoneDk: "#34304a", stoneHi: "#625e7c", bank: "#141c2a", willow: ["#16302a", "#1e4034"], trunk: "#1a1418", lamp: "#ffcf70", water: "rgba(8, 10, 30, 0.45)", orb: "#f2ecd8", stars: ["#ffffff", "#b4bce8"] }
          : { sky: ["#5a9ae0", "#8ab8ea", "#c0d8f0", "#ece6d6"], trees: ["#6a9a7a", "#548a64"], stone: "#b8aa98", stoneDk: "#968874", stoneHi: "#d6cab8", bank: "#4a8a3e", willow: ["#4a8a3a", "#6aaa4a"], trunk: "#5a4030", lamp: "#d0462e", water: "rgba(40, 80, 130, 0.22)", orb: "#fff6d8", stars: [] };
        s.p = p;
        const cx = Math.round(w * 0.56), span = Math.round(w * 0.3), deckY = hz - Math.round(h * 0.2), rx = span * 0.55, ry = (hz - deckY) * 0.78;
        s.lamps = [-0.62, 0.62].map((f) => ({ x: Math.round(cx + span * f), y: deckY - Math.round(9 * u) }));
        s.above = pixmap(w, hz, (P) => {
          P.sky(0, hz, p.sky);
          if (s.dark) starfield(P, Math.round(w * hz / 140), hz * 0.6, p.stars);
          P.disc(Math.round(w * 0.82), Math.round(hz * 0.25), Math.max(4, Math.round(5 * u)), p.orb);
          for (let x = 0; x < w; x += 2) { const r = Math.round(rand(2, 5) * u); P.disc(x, hz - Math.round(rand(2, 7) * u), r, p.trees[0]); }
          P.rect(0, hz - Math.round(4 * u), w, Math.round(4 * u), p.trees[1]);
          // the bridge: a humped deck over one round arch, laid in courses of stone
          for (let x = cx - span; x <= cx + span; x++) {
            const k = (x - cx) / span, top = deckY + Math.round(k * k * h * 0.05);
            for (let y = top; y < hz; y++) {
              const e = ((x - cx) / rx) ** 2 + ((y - hz) / ry) ** 2;
              if (e < 1) continue;
              const row = Math.floor((y - top) / 3);
              let col = (y - top) % 3 === 0 || (x + (row % 2) * 3) % 6 === 0 ? p.stoneDk : p.stone;
              if (e < 1.18) col = (Math.round(Math.atan2(y - hz, x - cx) * 12) % 2) ? p.stoneHi : p.stoneDk;
              if (y === top) col = p.stoneHi;
              P.set(x, y, col);
            }
            if ((x - cx + span) % Math.round(6 * u) === 0) P.rect(x, top - Math.round(3 * u), 1, Math.round(3 * u), p.stoneDk);
            P.set(x, top - Math.round(3 * u), p.stoneDk);
          }
          for (const l of s.lamps) { P.rect(l.x, l.y, 1, deckY - l.y, p.trunk); P.rect(l.x - 1, l.y - Math.round(3 * u), 3, Math.round(3 * u), p.lamp); }
          P.rect(0, hz - 3, cx - span + 2, 3, p.bank); P.rect(cx + span - 2, hz - 3, w, 3, p.bank);
          // a willow on the near bank
          const tx = Math.round(w * 0.12), top = hz - Math.round(h * 0.36), cr = Math.round(h * 0.1);
          P.rect(tx - 1, top + cr, Math.max(2, Math.round(3 * u)), hz - top - cr, p.trunk);
          P.disc(tx, top + cr, cr, p.willow[0]); P.disc(tx - Math.round(cr * 0.3), top + Math.round(cr * 0.7), Math.round(cr * 0.6), p.willow[1]);
          for (let x = tx - cr - 2; x <= tx + cr + 2; x += 2) {
            const len = Math.round(rand(0.5, 1) * (hz - top - cr * 1.2)), x0 = x + (Math.random() < 0.5 ? 1 : 0);
            P.rect(x0, top + cr, 1, len, (x / 2) % 2 ? p.willow[0] : p.willow[1]);
          }
        });
        s.leafs = Array.from({ length: 2 }, () => ({ x: rand(0, w), y: Math.round(rand(hz + 4, h - 4)), v: rand(0.6, 1.2) }));
        s.tw = s.dark ? twinklers(6, w, hz * 0.5) : [];
      },
      draw(ctx, s, t, dt) {
        const { w, h, hz, p } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.above, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        reflect(ctx, s.above, hz, w, h, t);
        ctx.fillStyle = p.water; ctx.fillRect(0, hz, w, h - hz);
        if (s.dark) for (const l of s.lamps) { ctx.fillStyle = "#ffcf70"; ctx.globalAlpha = 0.12 + 0.04 * Math.sin(t * 2 + l.x); ctx.fillRect(l.x - 3, l.y - 6, 7, 7); ctx.globalAlpha = 1; }
        ctx.fillStyle = p.willow[1];
        for (const f of s.leafs) { f.x += f.v * dt; if (f.x > w) f.x = -3; ctx.fillRect(Math.round(f.x), f.y, 2, 1); }
      },
    },

    /* ---------------------------------------------------------- jungle ruins */
    pixelruins: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, u = h / 216;
        const p = s.dark
          ? { sky: ["#06120e", "#0c1e18", "#14302a", "#1e3e34"], far: "#12261e", pyr: "#24443a", pyrDk: "#1a342c", canopy: ["#0e2018", "#143026"], col: "#3a5448", colDk: "#26382e", colHi: "#4e6a5c", vine: "#1a4426", fern: "#10301a", mist: "#2c4c42", orb: "#e8f0e0", stars: ["#ffffff", "#a8c8b8"], mote: "#d8ff9a" }
          : { sky: ["#9ac8b0", "#b4d8c0", "#cfe8d0", "#e6f2de"], far: "#88b494", pyr: "#9aa890", pyrDk: "#7a8a72", canopy: ["#4e8450", "#3e7042"], col: "#b4ac94", colDk: "#8a826c", colHi: "#d2caae", vine: "#3a7a3a", fern: "#2e6a2e", mist: "#f2f8ee", orb: "#fffbe8", stars: [], mote: "#fffbe0" };
        s.p = p;
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, h, p.sky);
          if (s.dark) starfield(P, Math.round(w * h / 220), h * 0.35, p.stars);
          P.disc(Math.round(w * 0.3), Math.round(h * 0.18), Math.max(4, Math.round(6 * u)), p.orb);
          for (let x = 0; x < w; x += 3) P.disc(x, Math.round(h * 0.56 - rand(0, 8) * u), Math.round(rand(3, 7) * u), p.far);
          P.rect(0, Math.round(h * 0.56), w, h, p.far);
          // a stepped pyramid with a shrine on top
          const px = Math.round(w * 0.62), base = Math.round(h * 0.64), tiers = 5, th = Math.round(h * 0.05);
          for (let k = 0; k < tiers; k++) {
            const half = Math.round(w * (0.18 - k * 0.028)), y1 = base - k * th;
            for (let y = y1 - th; y < y1; y++) for (let x = px - half; x <= px + half; x++) P.set(x, y, y === y1 - th ? p.col : x > px + half * 0.25 ? p.pyrDk : p.pyr);
          }
          P.rect(px - Math.round(2 * u), base - tiers * th, Math.round(4 * u) + 1, tiers * th, p.pyrDk); // the stair
          const sw = Math.round(w * 0.05), sh = Math.round(th * 1.6), sy = base - tiers * th - sh;
          P.rect(px - sw, sy, sw * 2, sh, p.pyr); P.rect(px - Math.round(sw * 0.3), sy + Math.round(sh * 0.35), Math.round(sw * 0.6), sh - Math.round(sh * 0.35), p.canopy[0]);
          for (let y = base - th * 3; y < base + 4; y++) for (let x = 0; x < w; x++) if (dither(x, y) < (y - (base - th * 3)) / (th * 3 + 4) * 0.6) P.set(x, y, p.mist);
          for (let x = 0; x < w; x += 3) P.disc(x, Math.round(h * 0.74 - rand(0, 10) * u), Math.round(rand(4, 9) * u), p.canopy[x % 2]);
          P.rect(0, Math.round(h * 0.74), w, h, p.canopy[0]);
          // stone columns in front, one broken
          for (const [fx, top, cw] of [[0.08, 0.12, 14], [0.24, 0.5, 12], [0.9, 0.2, 16]]) {
            const x0 = Math.round(w * fx), cww = Math.round(cw * u), y0 = Math.round(h * top);
            for (let y = y0; y < h; y++) for (let x = 0; x < cww; x++) P.set(x0 + x, y, x === 1 ? p.colHi : x > cww * 0.65 ? p.colDk : x % 4 === 3 ? p.colDk : p.col);
            if (top < 0.3) { P.rect(x0 - 2, y0 - Math.round(3 * u), cww + 4, Math.round(3 * u), p.col); P.rect(x0 - 2, y0 - 1, cww + 4, 1, p.colDk); }
            else for (let x = 0; x < cww; x++) { const d = Math.round(Math.abs(Math.sin(x * 1.7)) * 4 * u); P.rect(x0 + x, y0, 1, d, p.sky[2]); }
            for (let v = 0; v < 2; v++) { let vx = x0 + Math.round(rand(0, cww)); for (let y = y0; y < y0 + h * 0.4; y++) { vx += Math.round(Math.sin(y * 0.3 + v) * 0.6); P.set(vx, y, p.vine); if (y % 4 === 0) P.set(vx + 1, y, p.vine); } }
          }
          // vines from above and ferns below
          for (let k = 0; k < Math.round(w / 18); k++) { let vx = rand(0, w); const len = rand(0.1, 0.35) * h; for (let y = 0; y < len; y++) { vx += Math.sin(y * 0.2 + k) * 0.4; P.set(vx, y, p.vine); if (y % 5 === 0) { P.set(vx - 1, y + 1, p.vine); P.set(vx + 1, y + 2, p.vine); } } }
          for (let k = 0; k < Math.round(w / 10); k++) { const fx = rand(0, w), fy = h - rand(0, 4 * u), n = Math.round(rand(5, 12) * u); for (let a = -2; a <= 2; a++) P.line(fx, fy, fx + a * n * 0.5, fy - n * (1 - Math.abs(a) * 0.25), p.fern); }
        });
        s.motes = Array.from({ length: 12 }, () => ({ x: rand(0, w), y: rand(h * 0.3, h), ph: rand(0, TAU), sp: rand(0.3, 0.7) }));
        s.tw = s.dark ? twinklers(4, w, h * 0.3) : [];
      },
      draw(ctx, s, t) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        // fireflies at night, specks of dust drifting in the light by day
        ctx.fillStyle = s.p.mote;
        for (const m of s.motes) {
          const a = s.dark ? Math.sin(t * m.sp + m.ph) : 0.6 + 0.4 * Math.sin(t * m.sp + m.ph);
          if (a < 0.3) continue;
          ctx.globalAlpha = a * (s.dark ? 1 : 0.7);
          ctx.fillRect(Math.round(m.x + Math.sin(t * 0.2 + m.ph) * 8), Math.round(m.y + Math.cos(t * 0.15 + m.ph) * 4), 1, 1);
        }
        ctx.globalAlpha = 1;
      },
    },

    /* ---------------------------------------------------------- icebergs */
    pixelicebergs: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, hz = Math.round(h * 0.58), u = h / 216;
        s.hz = hz;
        const p = s.dark
          ? { sky: ["#04081a", "#0a1430", "#142450", "#22386a"], sea: "rgba(6, 14, 40, 0.55)", ice: "#c8d8f0", iceSh: "#8aa0c8", iceDk: "#5a7098", under: "#1e4a6a", orb: "#eef2f8", stars: ["#ffffff", "#a8b8e8"] }
          : { sky: ["#6a86c8", "#a4b0de", "#ecbcc8", "#ffd6c0"], sea: "rgba(40, 70, 140, 0.4)", ice: "#ffffff", iceSh: "#c8dcf4", iceDk: "#90b0d8", under: "#7ab4d4", orb: "#fff2d8", stars: [] };
        s.p = p;
        const berg = (P, cx, wd, ht) => {
          const pts = Array.from({ length: 6 }, (_, i) => [i / 5, i === 0 || i === 5 ? 0 : rand(0.4, 1)]);
          for (let x = 0; x < wd; x++) {
            const f = x / wd, i = Math.min(4, Math.floor(f * 5)), k = f * 5 - i, top = Math.round(hz - ht * (pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k));
            for (let y = top; y < hz; y++) P.set(cx - wd / 2 + x, y, f > 0.55 + Math.sin(y * 0.3) * 0.05 ? p.iceSh : (x % 13 === 6 && y > top + 2 && y < top + 7) ? p.iceDk : p.ice);
          }
        };
        s.above = pixmap(w, hz, (P) => {
          P.sky(0, hz, p.sky);
          if (s.dark) starfield(P, Math.round(w * hz / 130), hz * 0.7, p.stars);
          P.disc(Math.round(w * 0.7), s.dark ? Math.round(hz * 0.3) : hz - Math.round(4 * u), Math.max(4, Math.round(7 * u)), p.orb);
          berg(P, w * 0.22, w * 0.3, h * 0.2); berg(P, w * 0.5, w * 0.1, h * 0.07); berg(P, w * 0.84, w * 0.2, h * 0.13);
        });
        s.under = pixmap(w, h - hz, (P) => { for (const [cx, rw] of [[0.22, 0.2], [0.84, 0.13]]) for (let y = 2; y < (h - hz) * 0.6; y++) for (let x = -w * rw; x <= w * rw; x++) if (((x / (w * rw)) ** 2 + (y / ((h - hz) * 0.6)) ** 2) < 1 && dither(x + 64, y) < 0.35) P.set(w * cx + x, y, p.under); });
        s.floes = Array.from({ length: 5 }, () => ({ x: rand(0, w), y: Math.round(rand(hz + 6, h - 4)), len: Math.round(rand(4, 12) * u), v: rand(0.3, 0.8) }));
        s.tw = s.dark ? twinklers(6, w, hz * 0.6) : [];
      },
      draw(ctx, s, t, dt) {
        const { w, h, hz, p } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.above, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        reflect(ctx, s.above, hz, w, h, t);
        ctx.fillStyle = p.sea; ctx.fillRect(0, hz, w, h - hz);
        ctx.drawImage(s.under, 0, hz);
        for (const f of s.floes) {
          f.x += f.v * dt; if (f.x > w) f.x = -f.len;
          const x = Math.round(f.x);
          ctx.fillStyle = p.ice; ctx.fillRect(x, f.y, f.len, 1); ctx.fillRect(x + 1, f.y - 1, f.len - 3, 1);
          ctx.fillStyle = p.iceDk; ctx.fillRect(x, f.y + 1, f.len, 1);
        }
      },
    },

    /* ---------------------------------------------------------- savanna */
    pixelsavanna: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, hz = Math.round(h * 0.72), u = h / 216;
        s.hz = hz; s.sc = Math.max(2, Math.round(u * 1.5));
        const p = s.dark
          ? { sky: ["#140a26", "#2e1240", "#5e1e4a", "#a83a48", "#e8703e"], sun: "#ffb060", sil: "#120810", far: "#3a1430", grass: "#1e0c18", stars: ["#ffffff", "#e8c8e8"] }
          : { sky: ["#e86a3a", "#f08a42", "#f8aa50", "#ffcc6a", "#ffe49a"], sun: "#fff4c8", sil: "#3a1e14", far: "#c86a3a", grass: "#5a2e18", stars: [] };
        s.p = p;
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, hz + 2, p.sky);
          if (s.dark) starfield(P, Math.round(w * h / 260), h * 0.3, p.stars);
          P.disc(Math.round(w * 0.62), hz, Math.round(h * 0.16), p.sun);
          P.ridge(hz, h * 0.04, p.far, 3, 0.4);
          P.rect(0, hz, w, h - hz, p.grass);
          for (let x = 0; x < w; x += 2) P.rect(x, hz - Math.round(rand(0, 2)), 1, 2, p.grass);
          // flat-topped acacias
          for (const [fx, sz] of [[0.2, 1.2], [0.36, 0.5], [0.82, 0.9], [0.95, 0.4]]) {
            const x = Math.round(w * fx), base = hz + Math.round(2 * u), th = Math.round(h * 0.16 * sz), cw = Math.round(h * 0.17 * sz);
            P.line(x, base, x + Math.round(th * 0.1), base - th, p.sil, Math.max(1, Math.round(sz * 2 * u)));
            P.line(x + Math.round(th * 0.05), base - th * 0.5, x - Math.round(cw * 0.35), base - th * 0.95, p.sil, Math.max(1, Math.round(sz * u)));
            P.line(x + Math.round(th * 0.08), base - th * 0.7, x + Math.round(cw * 0.4), base - th, p.sil, Math.max(1, Math.round(sz * u)));
            P.ellipse(x, base - th - Math.round(2 * sz * u), cw / 2, Math.max(1.5, 3 * sz * u), p.sil);
            P.ellipse(x - cw * 0.2, base - th - Math.round(4 * sz * u), cw / 3, Math.max(1, 2 * sz * u), p.sil);
          }
          for (let k = 0; k < w / 4; k++) { const x = rand(0, w), y = h - rand(0, (h - hz) * 0.6), n = rand(2, 6) * u; P.line(x, y, x - 1, y - n, p.sil); P.line(x, y, x + 2, y - n * 0.8, p.sil); }
        });
        s.giraffes = [{ x: w * 0.7, y: hz + Math.round(3 * u), sc: s.sc, v: -1.4 }, { x: w * 0.45, y: hz + 1, sc: Math.max(1, Math.round(s.sc * 0.5)), v: -0.8 }];
        s.flock = { x: -20, y: h * 0.25, wait: rand(5, 15) };
        s.tw = s.dark ? twinklers(4, w, h * 0.25) : [];
      },
      draw(ctx, s, t, dt) {
        const { w, p } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        ctx.fillStyle = p.sil;
        for (const g of s.giraffes) { // a giraffe walking slowly, legs swapping every second
          g.x += g.v * dt; if (g.x < -30) g.x = w + 30;
          const k = g.sc, step = Math.floor(t * 1.2) % 2, R = (x, y, ww, hh) => ctx.fillRect(Math.round(g.x + x * k), Math.round(g.y + (y - 22) * k), Math.max(1, Math.round(ww * k)), Math.max(1, Math.round(hh * k)));
          R(5, 9, 9, 4); R(4, 8, 4, 2); R(13, 10, 1, 1); R(14, 10, 1, 4);
          for (let i = 0; i < 9; i++) R(4.6 - i * 0.35, 9 - i, 2, 1.5);
          R(-0.5, -1, 4, 2); R(-0.5, 0.5, 2, 1); R(1, -2, 1, 1); R(2.5, -2, 1, 1); R(3.5, -0.5, 1, 1);
          const legs = step ? [4.5, 7, 11, 13.5] : [5.5, 6.5, 12, 12.8];
          for (const lx of legs) R(lx, 13, 1, 9);
        }
        const f = s.flock; // a few birds cross now and then
        if ((f.wait -= dt) < 0) {
          f.x += 6 * dt;
          for (let i = 0; i < 5; i++) { const bx = Math.round(f.x - Math.abs(i - 2) * 5), by = Math.round(f.y + (i - 2) * 3), up = Math.sin(t * 4 + i) > 0; ctx.fillRect(bx - 1, by - (up ? 1 : 0), 1, 1); ctx.fillRect(bx, by, 1, 1); ctx.fillRect(bx + 1, by - (up ? 1 : 0), 1, 1); }
          if (f.x > w + 20) { f.x = -20; f.y = rand(0.15, 0.4) * s.h; f.wait = rand(20, 40); }
        }
      },
    },

    /* ---------------------------------------------------------- castle above the clouds */
    pixelcastle: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, u = h / 216 * 1.4;
        const p = s.dark
          ? { sky: ["#060a20", "#0e1840", "#1a2858", "#2a3a6c"], cloud: ["#2a3866", "#3a4a7a", "#4c5c8c"], rock: "#1e2034", rockDk: "#14162a", wall: "#3c3c58", wallDk: "#2a2a44", roof: "#2c1e44", win: "#ffcf70", flag: "#d0504a", orb: "#f0eee0", stars: ["#ffffff", "#aab4e0"] }
          : { sky: ["#3a7ad0", "#6a9ee0", "#a0c4ec", "#d4e6f6"], cloud: ["#d8e4f0", "#eef4fa", "#ffffff"], rock: "#7a6a62", rockDk: "#5a4c46", wall: "#dcd4c8", wallDk: "#b4aa9c", roof: "#3a5aa8", win: "#3a4a6a", flag: "#d84a3a", orb: "#fff8e0", stars: [] };
        s.p = p;
        const cx = Math.round(w * 0.5), peak = Math.round(h * 0.5);
        s.flags = [];
        const strip = (seed, col, top) => pixmap(w * 2, Math.round(h * 0.4), (P) => {
          for (let x = 0; x < P.w; x++) {
            const ty = Math.round(top + Math.sin(x * 0.07 + seed) * 3 * u + Math.abs(Math.sin(x * 0.023 + seed * 2)) * -8 * u + Math.sin(x * 0.18 + seed) * 1.5 * u);
            for (let y = Math.max(0, ty); y < P.h; y++) P.set(x, y, y < ty + 2 ? col[2] : (y < ty + 5 && dither(x, y) < 0.5) ? col[2] : col[1]);
          }
        });
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, h, p.sky);
          if (s.dark) starfield(P, Math.round(w * h / 150), h * 0.5, p.stars);
          P.disc(Math.round(w * 0.2), Math.round(h * 0.2), Math.max(4, Math.round(6 * u)), p.orb);
          P.ridge(Math.round(h * 0.78), h * 0.05, p.cloud[0], 5, 0.3);
          // the rock the castle stands on
          for (let y = peak; y < h; y++) { const k = (y - peak) / (h - peak), half = Math.round(w * (0.1 + k * 0.25) + Math.sin(y * 0.4) * 2 * u); for (let x = -half; x <= half; x++) P.set(cx + x, y, x > half * 0.2 ? p.rockDk : p.rock); }
          // walls with crenellations, three towers with cone roofs, lit windows
          const wl = Math.round(w * 0.1), wh = Math.round(16 * u), wy = peak - wh;
          P.rect(cx - wl, wy, wl * 2, wh, p.wall); P.rect(cx + Math.round(wl * 0.3), wy, Math.round(wl * 0.7), wh, p.wallDk);
          for (let x = cx - wl; x < cx + wl; x += Math.round(4 * u)) P.rect(x, wy - Math.round(2 * u), Math.round(2 * u), Math.round(2 * u), p.wall);
          P.rect(cx - Math.round(3 * u), peak - Math.round(7 * u), Math.round(6 * u), Math.round(7 * u), p.rockDk);
          for (const [dx, tw, th] of [[-1, 8, 30], [0, 11, 46], [1, 8, 30]]) {
            const tx = cx + Math.round(dx * wl), tww = Math.round(tw * u), thh = Math.round(th * u), ty = peak - thh;
            P.rect(tx - (tww >> 1), ty, tww, thh, p.wall); P.rect(tx + Math.round(tww * 0.15), ty, Math.round(tww * 0.35), thh, p.wallDk);
            const rh = Math.round(tww * 1.3);
            for (let r = 0; r < rh; r++) { const half = Math.round((tww / 2 + 1) * (1 - r / rh)); P.rect(tx - half, ty - r, half * 2 + 1, 1, p.roof); }
            for (let k = 0; k < th / 12; k++) P.rect(tx - 1, ty + Math.round((5 + k * 10) * u), Math.max(2, Math.round(2 * u)), Math.max(2, Math.round(3 * u)), p.win);
            P.rect(tx, ty - rh - Math.round(6 * u), 1, Math.round(6 * u), p.wallDk);
            s.flags.push({ x: tx + 1, y: ty - rh - Math.round(6 * u) });
          }
        });
        s.clouds = [strip(1, p.cloud, h * 0.06), strip(4, p.cloud, h * 0.14)];
        s.tw = s.dark ? twinklers(6, w, h * 0.45) : [];
      },
      draw(ctx, s, t) {
        const { w, h, p } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        const wave = Math.floor(t * 1.5) % 2, u = Math.max(1, Math.round(h / 216));
        ctx.fillStyle = p.flag;
        for (const f of s.flags) { ctx.fillRect(f.x, f.y, 3 * u, u); ctx.fillRect(f.x, f.y + u, (wave ? 4 : 3) * u, u); ctx.fillRect(f.x + (wave ? u : 0), f.y + 2 * u, 2 * u, u); }
        s.clouds.forEach((c, i) => { const off = Math.round((t * (0.6 + i * 0.5)) % w); ctx.drawImage(c, -off, Math.round(h * (0.62 + i * 0.1))); });
      },
    },

    /* ---------------------------------------------------------- moon base */
    pixelmoonbase: {
      lowRes: 0.2, pixel: true,
      init(s) {
        const { w, h } = s, hz = Math.round(h * 0.62), u = h / 216 * 1.8;
        const p = s.dark
          ? { sky: ["#020208", "#04040c", "#06061a"], ground: ["#2a2a36", "#3a3a48", "#4c4c5c"], crater: "#1e1e28", rim: "#5e5e70", dome: "#8a8aa0", domeDk: "#5a5a70", win: "#ffcf70", panel: "#1e3a7a", panelHi: "#3a5aa8", metal: "#8a8a98", stars: ["#ffffff", "#c8d0ff", "#8890b8"] }
          : { sky: ["#04040c", "#08081a", "#0c0c24"], ground: ["#8a8a96", "#a8a8b4", "#c4c4cc"], crater: "#70707c", rim: "#dcdce4", dome: "#e8e8f0", domeDk: "#b0b0c0", win: "#3a8ad8", panel: "#2a4a9a", panelHi: "#5a7ac8", metal: "#d0d0d8", stars: ["#ffffff", "#c8d0ff"] };
        s.p = p;
        s.ant = { x: Math.round(w * 0.74), y: hz - Math.round(36 * u) };
        s.bg = pixmap(w, h, (P) => {
          P.sky(0, hz + 2, p.sky);
          starfield(P, Math.round(w * hz / 90), hz, p.stars);
          // Earth: oceans, land and cloud, half in shadow
          const ex = Math.round(w * 0.24), ey = Math.round(h * 0.24), er = Math.round(h * 0.12);
          for (let y = -er; y <= er; y++) for (let x = -er; x <= er; x++) {
            if (x * x + y * y > er * er) continue;
            const fx = x / er, fy = y / er, n = Math.sin(fx * 4 + Math.sin(fy * 3) * 1.5) + Math.sin(fy * 5 - fx * 2 + 1.3) * 0.8;
            let col = n > 0.7 ? "#4a8a4a" : "#2a5ab0";
            if (n > 0.7 && fy < -0.6) col = "#e8eef8";
            if (Math.sin(fx * 9 + Math.sin(fy * 6) * 2) * Math.sin(fy * 7 + fx * 3) > 0.7) col = "#e8eef8";
            const lit = (x * 0.8 - y * 0.3) / er;
            if (lit > 0.35 + dither(x + 64, y + 64) * 0.2) col = n > 1 ? "#1a301a" : "#0e1a3a";
            P.set(ex + x, ey + y, col);
          }
          P.ridge(hz + Math.round(4 * u), h * 0.06, p.ground[1], 4, 0.6);
          for (let y = hz; y < h; y++) for (let x = 0; x < w; x++) { const k = (y - hz) / (h - hz) * 2, i = Math.min(1, Math.floor(k)); if (dither(x, y) < 0.92) P.set(x, y + Math.round(4 * u), (k - i) > dither(x, y) ? p.ground[i + 1] : p.ground[i]); }
          for (let k = 0; k < 9; k++) { const cx = rand(0, w), cy = rand(hz + 8 * u, h), r = Math.round(rand(3, 10) * u * (0.5 + (cy - hz) / (h - hz))); P.ellipse(cx, cy, r, r * 0.35, p.crater); P.ellipse(cx, cy + Math.max(1, r * 0.1), r * 0.85, r * 0.25, p.ground[0]); for (let x = -r; x <= r; x++) P.set(cx + x, cy + Math.round(r * 0.35), p.rim); }
          // the base: two domes joined by a tube, solar panels, an antenna
          const by = hz + Math.round(14 * u);
          for (const [fx, r] of [[0.5, 14], [0.63, 10]]) {
            const dx = Math.round(w * fx), dr = Math.round(r * u);
            for (let y = -dr; y <= 0; y++) for (let x = -dr; x <= dr; x++) if (x * x + y * y <= dr * dr) P.set(dx + x, by + y, (x > dr * 0.3) ? p.domeDk : (y % Math.max(3, Math.round(4 * u)) === 0 || x % Math.max(3, Math.round(5 * u)) === 0) ? p.domeDk : p.dome);
            for (let k = -1; k <= 1; k++) P.rect(dx + k * Math.round(dr * 0.4) - 1, by - Math.round(dr * 0.35), Math.max(2, Math.round(2 * u)), Math.max(1, Math.round(2 * u)), p.win);
          }
          P.rect(Math.round(w * 0.5), by - Math.round(4 * u), Math.round(w * 0.13), Math.round(3 * u), p.domeDk);
          for (let k = 0; k < 3; k++) { const px = Math.round(w * 0.3) + k * Math.round(12 * u), py = by - Math.round(8 * u); P.rect(px + Math.round(4 * u), py + Math.round(4 * u), 1, Math.round(4 * u), p.metal); for (let y = 0; y < Math.round(5 * u); y++) for (let x = 0; x < Math.round(10 * u); x++) P.set(px + x - Math.round(y * 0.4), py + y, (x % 3 === 0 || y % 2 === 0) ? p.panelHi : p.panel); }
          P.rect(s.ant.x, s.ant.y, 1, by - s.ant.y, p.metal); P.line(s.ant.x - Math.round(3 * u), by, s.ant.x, s.ant.y + Math.round(10 * u), p.metal); P.line(s.ant.x + Math.round(3 * u), by, s.ant.x, s.ant.y + Math.round(10 * u), p.metal);
          // a parked rover
          const rx = Math.round(w * 0.86), ry = by + Math.round(6 * u);
          P.rect(rx, ry - Math.round(4 * u), Math.round(12 * u), Math.round(3 * u), p.metal); P.rect(rx + Math.round(2 * u), ry - Math.round(7 * u), Math.round(5 * u), Math.round(3 * u), p.domeDk);
          for (const k of [1, 6, 11]) P.disc(rx + Math.round(k * u), ry, Math.max(1, Math.round(1.5 * u)), p.crater);
        });
        s.dish = { x: s.ant.x, y: s.ant.y + Math.round(4 * u), r: Math.max(2, Math.round(5 * u)) };
        s.tw = twinklers(10, w, hz);
        s.sat = { x: -5, wait: rand(10, 25), y: rand(0.1, 0.4) * h };
      },
      draw(ctx, s, t, dt) {
        const { w, p, ant, dish } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        drawTwinklers(ctx, s.tw, t, "#ffffff");
        // the dish turns slowly; the beacon on top blinks
        const sw = Math.round(Math.cos(t * 0.3) * dish.r);
        ctx.fillStyle = p.metal; ctx.fillRect(dish.x + Math.min(0, sw), dish.y - dish.r, Math.max(1, Math.abs(sw)), dish.r * 2);
        ctx.fillRect(dish.x, dish.y - 1, Math.max(2, dish.r), 1);
        if ((t % 2) < 0.25) { ctx.fillStyle = "#ff4040"; ctx.fillRect(ant.x - 1, ant.y - 2, 3, 2); }
        const st = s.sat; // a satellite crossing the sky now and then
        if ((st.wait -= dt) < 0) { st.x += 5 * dt; ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(st.x), Math.round(st.y), 1, 1); if (st.x > w + 5) { st.x = -5; st.y = rand(0.1, 0.4) * s.h; st.wait = rand(20, 45); } }
      },
    },
  };
}

export const CALMPIXEL = [
  ["pixelaquarium", "Pixel aquarium"], ["pixelforest", "Pixel forest"], ["pixelmeadow", "Pixel meadow"], ["pixelshrine", "Pixel shrine"], ["pixelsnow", "Pixel snow"],
  ["pixelbamboo", "Pixel bamboo"], ["pixelcanyon", "Pixel canyon"], ["pixelcave", "Pixel cave"], ["pixelharbor", "Pixel harbor"], ["pixelrooftops", "Pixel rooftops"], ["pixelwindmill", "Pixel windmill"],
  ["pixelbridge", "Pixel bridge"], ["pixelcastle", "Pixel castle"], ["pixelicebergs", "Pixel icebergs"], ["pixelmoonbase", "Pixel moon base"], ["pixelruins", "Pixel ruins"], ["pixelsavanna", "Pixel savanna"],
];
