// Quiet pixel-art scenes: almost everything is drawn once, and only a few small things move, so they
// stay out of the way while you work. A shrine by a lake, a snowed-in cabin, a tree on a hill,
// a misty pine forest and an aquarium.
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
  };
}

export const CALMPIXEL = [
  ["pixelaquarium", "Pixel aquarium"], ["pixelforest", "Pixel forest"], ["pixelmeadow", "Pixel meadow"], ["pixelshrine", "Pixel shrine"], ["pixelsnow", "Pixel snow"],
];
