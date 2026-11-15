// Cozy and retro backgrounds: a rainy night window, a snowy window with a candle, a fireplace, neon
// signs in the rain, an anime sky with power lines, an outrun sunset, and two pixel-art scenes (a city
// at night and a sunset over the sea). Parts that never move are painted once into a picture.
import { rand, TAU, mix, rgba, curve, offscreen, glow, forestStrip, ridgeStrip, tile } from "./scenes.js";

const still = (s, paint) => offscreen(s.w, s.h, (c) => paint(c, s));
const grad = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [o, col] of stops) g.addColorStop(o, col); return g; };
function staticStars(c, w, h, n, maxY, px) { for (let i = 0; i < n; i++) { c.globalAlpha = rand(0.3, 0.9); c.fillStyle = "#ffffff"; const r = rand(0.5, 1.5) * px; c.fillRect(rand(0, w), rand(0, h * maxY), r, r); } c.globalAlpha = 1; }

/** Window frame with panes: a thick outer frame and mullions, drawn over whatever is "outside". */
function windowFrame(c, w, h, color, edge, cols, rows, px) {
  const t = Math.min(w, h) * 0.035, m = t * 0.45;
  c.fillStyle = color;
  c.fillRect(0, 0, w, t); c.fillRect(0, h - t * 2.2, w, t * 2.2); c.fillRect(0, 0, t, h); c.fillRect(w - t, 0, t, h);
  for (let i = 1; i < cols; i++) c.fillRect((w * i) / cols - m / 2, 0, m, h);
  for (let j = 1; j < rows; j++) c.fillRect(0, ((h - t * 2.2) * j) / rows - m / 2, w, m);
  c.fillStyle = edge; // light catching the inner edges
  c.fillRect(t, t, w - t * 2, 1.5 * px);
  for (let i = 1; i < cols; i++) c.fillRect((w * i) / cols - m / 2, 0, 1.5 * px, h - t * 2.2);
  c.fillRect(0, h - t * 2.2, w, 2 * px);
  return t;
}

/* ---------- pixel art helpers (the canvas is small and shown with sharp pixels) ---------- */
function ditherBands(c, w, h, y0, y1, colors) {
  const n = colors.length - 1;
  for (let y = Math.floor(y0); y < y1; y++) {
    const f = ((y - y0) / (y1 - y0)) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
    for (let x = 0; x < w; x++) {
      const pick = k > (((x & 1) + (y & 1) * 2) + 0.5) / 4 ? colors[i + 1] : colors[i]; // 2x2 ordered dither
      if (x === 0 || pick !== c._last) { c.fillStyle = pick; c._last = pick; }
      c.fillRect(x, y, 1, 1);
    }
  }
}
function pixelDisc(c, cx, cy, r, color) { c.fillStyle = color; for (let y = -r; y <= r; y++) { const half = Math.round(Math.sqrt(r * r - y * y)); c.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1); } }
function pixelCloud(c, x, y, wd, color, shade) {
  const bumps = Math.max(2, Math.round(wd / 7));
  c.fillStyle = shade; c.fillRect(Math.round(x), Math.round(y + 3), Math.round(wd), 3);
  c.fillStyle = color;
  for (let i = 0; i < bumps; i++) { const bx = x + (i / (bumps - 1)) * (wd - 8), r = 3 + ((i * 7) % 3); c.fillRect(Math.round(bx), Math.round(y - r + 3), 8, r); }
  c.fillRect(Math.round(x), Math.round(y + 1), Math.round(wd), 3);
}

export function makeCozy() {
  return {
    /* ---------------------------------------------------------- rainy night window */
    rainwindow: {
      lowRes: 1,
      init(s) {
        const { w, h } = s;
        const warm = ["#ffb347", "#ff8a5c", "#ffd27a", "#ff6b6b"], cool = ["#6ab0ff", "#8fd3ff", "#b48fff"];
        s.bg = still(s, (c) => {
          c.fillStyle = grad(c, 0, 0, 0, h, [[0, "#070912"], [0.5, "#131a33"], [1, "#2a1d33"]]); c.fillRect(0, 0, w, h);
          // the city outside, out of focus
          for (let i = 0; i < 90; i++) {
            const y = h * (0.3 + Math.pow(rand(0, 1), 0.7) * 0.65), r = rand(14, 60) * s.px * (0.5 + y / h);
            glow(c, rand(0, w), y, r, Math.random() < 0.65 ? warm[i % 4] : cool[i % 3], rand(0.18, 0.5));
          }
          for (let i = 0; i < 26; i++) { const x = rand(0, w), col = warm[i % 4]; c.fillStyle = grad(c, 0, h * 0.62, 0, h, [[0, rgba(col, 0)], [0.5, rgba(col, 0.08)], [1, rgba(col, 0)]]); c.fillRect(x - 8 * s.px, h * 0.62, 16 * s.px, h * 0.38); }
          // drops resting on the glass
          for (let i = 0; i < 420; i++) {
            const x = rand(0, w), y = rand(0, h), r = rand(1, 3.6) * s.px;
            c.fillStyle = "rgba(0, 0, 0, 0.22)"; c.beginPath(); c.ellipse(x, y + r * 0.2, r, r * 1.1, 0, 0, TAU); c.fill();
            c.fillStyle = "rgba(255, 255, 255, 0.28)"; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, TAU); c.fill();
          }
        });
        s.frame = offscreen(w, h, (c) => {
          windowFrame(c, w, h, "#0b0a10", "rgba(255, 190, 120, 0.12)", 3, 2, s.px);
          const sill = h - Math.min(w, h) * 0.077;
          c.fillStyle = grad(c, 0, sill - h * 0.25, 0, h, [[0, "rgba(255, 150, 70, 0)"], [1, "rgba(255, 150, 70, 0.22)"]]); c.fillRect(0, sill - h * 0.25, w, h * 0.25 + h);
          // a mug and a small plant on the sill
          const m = Math.min(w, h), mx = w * 0.18;
          c.fillStyle = "#1a1418"; c.fillRect(mx, sill - m * 0.07, m * 0.06, m * 0.07); c.strokeStyle = "#1a1418"; c.lineWidth = m * 0.01; c.beginPath(); c.arc(mx + m * 0.065, sill - m * 0.04, m * 0.017, -1.4, 1.4); c.stroke();
          const px = w * 0.8; c.fillStyle = "#1a1418"; c.beginPath(); c.moveTo(px - m * 0.035, sill - m * 0.06); c.lineTo(px + m * 0.035, sill - m * 0.06); c.lineTo(px + m * 0.027, sill); c.lineTo(px - m * 0.027, sill); c.fill();
          c.fillStyle = "#101914"; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.35; c.beginPath(); c.ellipse(px + Math.cos(a) * m * 0.05, sill - m * 0.06 + Math.sin(a) * m * 0.05, m * 0.04, m * 0.013, a, 0, TAU); c.fill(); }
        });
        s.mug = [w * 0.18 + Math.min(w, h) * 0.03, h - Math.min(w, h) * 0.077 - Math.min(w, h) * 0.07];
        s.cars = Array.from({ length: 6 }, (_, i) => ({ x: rand(0, w), dir: i % 2 ? 1 : -1, v: rand(40, 90), y: h * rand(0.7, 0.8) }));
        s.runners = Array.from({ length: 22 }, () => this.drop(s, true));
        s.steam = [];
      },
      drop(s, any) { return { x: rand(0, s.w), y: any ? rand(0, s.h) : rand(-20, s.h * 0.3), y0: 0, v: 0, r: rand(2.5, 4.5) * s.px, wait: rand(0, 2) }; },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.drawImage(s.bg, 0, 0);
        for (const c of s.cars) {
          c.x += c.dir * c.v * dt * s.px; if (c.x > w + 80) c.x = -80; if (c.x < -80) c.x = w + 80;
          const col = c.dir > 0 ? "#fff1cc" : "#ff4d4d";
          glow(ctx, c.x, c.y, 34 * s.px, col, 0.35); glow(ctx, c.x + 26 * s.px, c.y, 34 * s.px, col, 0.35);
        }
        // drops that let go and run down the glass, leaving a clear trail
        for (const d of s.runners) {
          if (d.wait > 0) { d.wait -= dt; d.y0 = d.y; continue; }
          d.v = Math.max(0, d.v + (Math.random() < 0.06 ? rand(60, 180) : -120 * dt) * 1);
          d.y += d.v * dt * s.px; d.x += Math.sin(d.y * 0.05) * 0.15 * s.px;
          ctx.strokeStyle = "rgba(200, 215, 255, 0.10)"; ctx.lineWidth = d.r * 0.9; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(d.x, d.y0); ctx.lineTo(d.x, d.y); ctx.stroke();
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)"; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 1.25, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(255, 255, 255, 0.45)"; ctx.beginPath(); ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.35, 0, TAU); ctx.fill();
          if (d.y > h + 10) Object.assign(d, this.drop(s), { wait: rand(0.5, 4) });
        }
        ctx.lineCap = "butt";
        ctx.drawImage(s.frame, 0, 0);
        if (Math.random() < dt * 3) s.steam.push({ x: s.mug[0] + rand(-6, 6) * s.px, y: s.mug[1], life: 0, ph: rand(0, TAU) });
        s.steam = s.steam.filter((q) => (q.life += dt) < 3);
        for (const q of s.steam) { q.y -= 16 * dt * s.px; glow(ctx, q.x + Math.sin(t * 2 + q.ph) * 6 * s.px, q.y, (6 + q.life * 6) * s.px, "#ffffff", 0.12 * (1 - q.life / 3)); }
      },
    },

    /* ---------------------------------------------------------- snowy window with a candle */
    snowwindow: {
      lowRes: 1,
      init(s) {
        const { w, h } = s, m = Math.min(w, h);
        s.bg = still(s, (c) => {
          c.fillStyle = grad(c, 0, 0, 0, h, [[0, "#0a1226"], [0.6, "#1d2c4d"], [1, "#3a4a6a"]]); c.fillRect(0, 0, w, h);
          staticStars(c, w, h, 70, 0.4, s.px);
          glow(c, w * 0.7, h * 0.2, h * 0.18, "#e8eeff", 0.25);
          c.drawImage(ridgeStrip(w, 0, h * 0.3, "#5b6c8e", 1.8, 6, false), 0, h * 0.55);
          c.drawImage(forestStrip(w, h * 0.3, "#0f1828", 40, 0.5, 1, s.px), 0, h * 0.5);
          c.fillStyle = "#8fa0c2"; c.fillRect(0, h * 0.77, w, h);
          // a lit house far away
          glow(c, w * 0.32, h * 0.74, 30 * s.px, "#ffc46b", 0.5); c.fillStyle = "#ffd27a"; c.fillRect(w * 0.32 - 3 * s.px, h * 0.735, 6 * s.px, 5 * s.px);
        });
        s.frame = offscreen(w, h, (c) => {
          // frost creeping in from the corners of each pane
          const cols = 2, rows = 2, bottom = h - m * 0.077;
          for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
            const x = cx * w, y = cy * bottom, r = m * 0.3;
            const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(225, 235, 255, 0.32)"); g.addColorStop(0.5, "rgba(225, 235, 255, 0.08)"); g.addColorStop(1, "rgba(225, 235, 255, 0)");
            c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
            c.strokeStyle = "rgba(240, 245, 255, 0.22)"; c.lineWidth = 1 * s.px;
            for (let k = 0; k < 22; k++) { let px = x, py = y, a = Math.atan2((cy ? -1 : 1), (cx ? -1 : 1)) + rand(-0.7, 0.7); c.beginPath(); c.moveTo(px, py); for (let q = 0; q < 6; q++) { px += Math.cos(a) * r * 0.12; py += Math.sin(a) * r * 0.12; a += rand(-0.5, 0.5); c.lineTo(px, py); } c.stroke(); }
          }
          windowFrame(c, w, h, "#3b2619", "rgba(255, 210, 160, 0.18)", cols, rows, s.px);
        });
        s.sill = h - m * 0.077; s.cx = w * 0.34; s.ch = m * 0.17; s.cw = m * 0.05;
        s.flakes = Array.from({ length: 220 }, () => ({ x: rand(0, w), y: rand(0, h), d: rand(0.2, 1), ph: rand(0, TAU) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.drawImage(s.bg, 0, 0);
        ctx.fillStyle = "#ffffff";
        for (const f of s.flakes) {
          f.y += (10 + f.d * 34) * dt * s.px; f.x += (Math.sin(t * 0.7 + f.ph) * 0.4 + 0.15) * s.px;
          if (f.y > h) { f.y = -5; f.x = rand(0, w); }
          ctx.globalAlpha = 0.35 + f.d * 0.55; ctx.beginPath(); ctx.arc(f.x, f.y, (0.8 + f.d * 2.2) * s.px, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.drawImage(s.frame, 0, 0);
        // the candle
        const { cx, sill, ch, cw } = s, fl = 0.8 + 0.2 * Math.sin(t * 9) * Math.sin(t * 5.3), top = sill - ch;
        glow(ctx, cx, top - cw * 0.6, Math.min(w, h) * 0.35, "#ffb35a", 0.22 * fl);
        ctx.fillStyle = grad(ctx, cx - cw / 2, 0, cx + cw / 2, 0, [[0, "#e9dcc6"], [0.6, "#fff6e6"], [1, "#c9b9a0"]]); ctx.fillRect(cx - cw / 2, top, cw, ch);
        ctx.fillStyle = "#2a2a2a"; ctx.fillRect(cx - 0.8 * s.px, top - cw * 0.25, 1.6 * s.px, cw * 0.25);
        const fh = cw * 1.3 * fl, sway = Math.sin(t * 3) * cw * 0.08;
        ctx.fillStyle = "rgba(255, 170, 60, 0.9)"; ctx.beginPath(); ctx.moveTo(cx - cw * 0.22, top - cw * 0.2); ctx.quadraticCurveTo(cx - cw * 0.3, top - fh * 0.6, cx + sway, top - fh); ctx.quadraticCurveTo(cx + cw * 0.3, top - fh * 0.6, cx + cw * 0.22, top - cw * 0.2); ctx.fill();
        ctx.fillStyle = "rgba(255, 245, 210, 0.95)"; ctx.beginPath(); ctx.ellipse(cx + sway * 0.5, top - fh * 0.38, cw * 0.1, fh * 0.25, 0, 0, TAU); ctx.fill();
        // its reflection in the glass
        glow(ctx, cx + w * 0.02, top - ch * 0.8, cw * 3, "#ffb35a", 0.12 * fl);
      },
    },

    /* ---------------------------------------------------------- fireplace */
    fireplace: {
      lowRes: 1,
      init(s) {
        const { w, h } = s, m = Math.min(w, h);
        const fw = m * 0.62, fh = m * 0.5, fx = w / 2 - fw / 2, floor = h * 0.86, top = floor - fh;
        Object.assign(s, { fw, fh, fx, floor, top, ox: w / 2, oy: floor - m * 0.04, ow: fw * 0.62, oh: fh * 0.66 });
        s.bg = still(s, (c) => {
          c.fillStyle = grad(c, 0, 0, 0, h, [[0, "#1a100d"], [1, "#2a1a14"]]); c.fillRect(0, 0, w, h);
          c.fillStyle = "rgba(255, 220, 180, 0.025)"; for (let x = 0; x < w; x += 40 * s.px) c.fillRect(x, 0, 18 * s.px, floor); // wallpaper stripes
          // wooden floor and a rug
          c.fillStyle = grad(c, 0, floor, 0, h, [[0, "#3a2418"], [1, "#24160f"]]); c.fillRect(0, floor, w, h - floor);
          c.strokeStyle = "rgba(0, 0, 0, 0.25)"; c.lineWidth = 1 * s.px; for (let y = floor; y < h; y += 14 * s.px) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
          c.fillStyle = "#5a1f22"; c.beginPath(); c.ellipse(w / 2, floor + (h - floor) * 0.6, fw * 0.75, (h - floor) * 0.35, 0, 0, TAU); c.fill();
          c.strokeStyle = "#8a3a2a"; c.lineWidth = 3 * s.px; c.beginPath(); c.ellipse(w / 2, floor + (h - floor) * 0.6, fw * 0.68, (h - floor) * 0.28, 0, 0, TAU); c.stroke();
          // brick surround
          c.fillStyle = "#4a2a20"; c.fillRect(fx, top, fw, fh);
          const bh = 12 * s.px, bw = 30 * s.px;
          for (let y = top, row = 0; y < floor; y += bh, row++) for (let x = fx - (row % 2) * bw / 2; x < fx + fw; x += bw) {
            c.fillStyle = mix("#5e3426", "#7a4532", rand(0, 1)); c.fillRect(Math.max(fx, x) + 1, y + 1, Math.min(bw, fx + fw - x) - 2, bh - 2);
          }
          // mantel
          c.fillStyle = "#2b1a12"; c.fillRect(fx - m * 0.05, top - m * 0.035, fw + m * 0.1, m * 0.035);
          c.fillStyle = "rgba(255, 220, 180, 0.1)"; c.fillRect(fx - m * 0.05, top - m * 0.035, fw + m * 0.1, 2 * s.px);
          // frames and a clock on the mantel
          c.fillStyle = "#1a100c"; c.fillRect(fx + fw * 0.12, top - m * 0.14, m * 0.08, m * 0.1); c.fillStyle = "#3a4a5a"; c.fillRect(fx + fw * 0.12 + 4 * s.px, top - m * 0.14 + 4 * s.px, m * 0.08 - 8 * s.px, m * 0.1 - 8 * s.px);
          c.fillStyle = "#1a100c"; c.beginPath(); c.arc(w / 2, top - m * 0.08, m * 0.045, 0, TAU); c.fill(); c.fillStyle = "#e8dcc6"; c.beginPath(); c.arc(w / 2, top - m * 0.08, m * 0.036, 0, TAU); c.fill();
          // the opening
          const { ox, oy, ow, oh } = s;
          c.fillStyle = "#0a0505"; c.beginPath(); c.moveTo(ox - ow / 2, oy); c.lineTo(ox - ow / 2, oy - oh * 0.7); c.quadraticCurveTo(ox - ow / 2, oy - oh, ox, oy - oh); c.quadraticCurveTo(ox + ow / 2, oy - oh, ox + ow / 2, oy - oh * 0.7); c.lineTo(ox + ow / 2, oy); c.fill();
          c.fillStyle = "#1a1210"; c.fillRect(fx - m * 0.02, floor - m * 0.04, fw + m * 0.04, m * 0.04); // hearth
          c.strokeStyle = "#3a2018"; c.lineWidth = m * 0.022; c.lineCap = "round";
          for (const [a, b] of [[-0.3, 0.25], [0.3, -0.25]]) { c.beginPath(); c.moveTo(ox + ow * a - ow * 0.18, oy - m * 0.01); c.lineTo(ox + ow * a + ow * 0.18, oy - m * 0.02 - b * 0); c.stroke(); }
        });
        s.mantelCandles = [fx + fw * 0.75, fx + fw * 0.85];
        s.tongues = Array.from({ length: 9 }, (_, i) => ({ x: (i - 4) / 4, hgt: rand(0.6, 1.1) * (1 - Math.abs(i - 4) / 7), ph: rand(0, TAU), sp: rand(5, 9) }));
        s.sparks = [];
      },
      draw(ctx, s, t, dt) {
        const { w, h, ox, oy, ow, oh, top } = s, m = Math.min(w, h);
        ctx.drawImage(s.bg, 0, 0);
        const fl = 0.82 + 0.18 * Math.sin(t * 8) * Math.sin(t * 3.7);
        // firelight filling the room
        ctx.globalCompositeOperation = "lighter";
        glow(ctx, ox, oy - oh * 0.3, Math.max(w, h) * 0.65, "#ff7a2e", 0.2 * fl, 0.75);
        glow(ctx, ox, oy - oh * 0.25, ow * 0.9, "#ffb35a", 0.45 * fl);
        ctx.save(); ctx.beginPath(); ctx.rect(ox - ow / 2, oy - oh, ow, oh); ctx.clip();
        for (const [scale, col, a] of [[1, "#ff5a1f", 0.6], [0.72, "#ff9a2e", 0.65], [0.45, "#ffe08a", 0.75]]) {
          for (const tg of s.tongues) {
            const H = oh * 0.92 * tg.hgt * scale * (0.8 + 0.2 * Math.sin(t * tg.sp + tg.ph)), bx = ox + tg.x * ow * 0.32 * scale, sway = Math.sin(t * tg.sp * 0.7 + tg.ph) * ow * 0.03, wd = ow * 0.07 * scale;
            ctx.fillStyle = rgba(col, a * fl); ctx.beginPath(); ctx.moveTo(bx - wd, oy - m * 0.015);
            ctx.quadraticCurveTo(bx - wd * 1.1, oy - H * 0.5, bx + sway, oy - H); ctx.quadraticCurveTo(bx + wd * 1.1, oy - H * 0.5, bx + wd, oy - m * 0.015); ctx.fill();
          }
        }
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
        if (Math.random() < dt * 8) s.sparks.push({ x: ox + rand(-0.2, 0.2) * ow, y: oy - oh * 0.3, vy: rand(-80, -40), life: 0, ph: rand(0, TAU) });
        s.sparks = s.sparks.filter((q) => (q.life += dt) < 1.6 && q.y > oy - oh);
        for (const q of s.sparks) { q.y += q.vy * dt * s.px; q.x += Math.sin(t * 4 + q.ph) * 0.5 * s.px; ctx.fillStyle = rgba("#ffcf6b", 1 - q.life / 1.6); ctx.fillRect(q.x, q.y, 2 * s.px, 2 * s.px); }
        for (const x of s.mantelCandles) {
          const cf = 0.8 + 0.2 * Math.sin(t * 10 + x), ch = m * 0.06, cw = m * 0.016, y = top - m * 0.035;
          glow(ctx, x, y - ch - cw, m * 0.08, "#ffb35a", 0.3 * cf);
          ctx.fillStyle = "#efe4d0"; ctx.fillRect(x - cw / 2, y - ch, cw, ch);
          ctx.fillStyle = "rgba(255, 200, 100, 0.95)"; ctx.beginPath(); ctx.ellipse(x, y - ch - cw * 0.9, cw * 0.28, cw * 0.75 * cf, 0, 0, TAU); ctx.fill();
        }
      },
    },

    /* ---------------------------------------------------------- neon signs in the rain */
    neon: {
      lowRes: 1,
      init(s) {
        const { w, h } = s, m = Math.min(w, h);
        s.ground = h * 0.74;
        s.bg = still(s, (c) => {
          c.fillStyle = "#120d14"; c.fillRect(0, 0, w, s.ground);
          const bh = 16 * s.px, bw = 38 * s.px;
          for (let y = 0, row = 0; y < s.ground; y += bh, row++) for (let x = -(row % 2) * bw / 2; x < w; x += bw) { c.fillStyle = mix("#1c1418", "#261a1f", rand(0, 1)); c.fillRect(x + 1, y + 1, bw - 2, bh - 2); }
          c.fillStyle = grad(c, 0, 0, 0, s.ground, [[0, "rgba(0, 0, 0, 0.55)"], [0.6, "rgba(0, 0, 0, 0)"]]); c.fillRect(0, 0, w, s.ground);
          c.fillStyle = grad(c, 0, s.ground, 0, h, [[0, "#0d0a10"], [1, "#050407"]]); c.fillRect(0, s.ground, w, h - s.ground);
          c.fillStyle = "rgba(255, 255, 255, 0.05)"; c.fillRect(0, s.ground, w, 2 * s.px);
        });
        const font = (px) => `700 ${px}px "IBM Plex Sans", "Segoe UI", sans-serif`;
        const sign = (wd, ht, color, paint) => {
          const pad = 40 * s.px;
          const make = (on) => offscreen(wd + pad * 2, ht + pad * 2, (c) => {
            c.translate(pad, pad); c.lineCap = "round"; c.lineJoin = "round";
            if (on) { c.shadowColor = color; c.shadowBlur = 26 * s.px; c.strokeStyle = color; c.lineWidth = 7 * s.px; paint(c); c.shadowBlur = 12 * s.px; paint(c); c.shadowBlur = 0; c.strokeStyle = mix(color, "#ffffff", 0.65); c.lineWidth = 2.5 * s.px; paint(c); }
            else { c.strokeStyle = mix(color, "#202020", 0.75); c.lineWidth = 5 * s.px; paint(c); }
          });
          return { on: make(true), off: make(false), pad };
        };
        const S = m * 0.11;
        s.signs = [
          { x: w * 0.12, y: h * 0.16, ...sign(S * 3.2, S * 1.2, "#ff3d8b", (c) => { c.font = font(S); c.strokeText("OPEN", 0, S); }), mode: "steady" },
          { x: w * 0.6, y: h * 0.1, ...sign(S * 1.6, S * 1.8, "#3de8ff", (c) => { c.beginPath(); c.moveTo(S * 0.2, S * 0.7); c.lineTo(S * 0.3, S * 1.6); c.lineTo(S * 1.1, S * 1.6); c.lineTo(S * 1.2, S * 0.7); c.closePath(); c.stroke(); c.beginPath(); c.arc(S * 1.25, S * 1.05, S * 0.22, -1.2, 1.4); c.stroke(); for (const dx of [0.45, 0.75, 1.0]) { c.beginPath(); c.moveTo(S * dx, S * 0.5); c.quadraticCurveTo(S * (dx + 0.12), S * 0.3, S * dx, S * 0.08); c.stroke(); } }), mode: "steady" },
          { x: w * 0.36, y: h * 0.42, ...sign(S * 3.8, S * 1.2, "#ffd23d", (c) => { c.font = font(S * 0.95); c.strokeText("CODE", 0, S); }), mode: "flicker" },
          { x: w * 0.82, y: h * 0.4, ...sign(S * 1.4, S * 1.0, "#ff8a3d", (c) => { c.beginPath(); c.moveTo(0, S * 0.5); c.lineTo(S * 1.2, S * 0.5); c.moveTo(S * 0.75, S * 0.1); c.lineTo(S * 1.2, S * 0.5); c.lineTo(S * 0.75, S * 0.9); c.stroke(); }), mode: "blink" },
          { x: w * 0.05, y: h * 0.48, ...sign(S * 2.6, S * 0.9, "#9d6bff", (c) => { c.font = font(S * 0.7); c.strokeText("24 / 7", 0, S * 0.75); }), mode: "steady" },
        ];
        s.rain = Array.from({ length: 160 }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(600, 900), l: rand(10, 22) }));
        s.splash = [];
      },
      level(sg, t) {
        if (sg.mode === "blink") return Math.sin(t * 2.2) > -0.2 ? 1 : 0;
        if (sg.mode === "flicker") { const k = Math.sin(t * 0.7) > 0.85 ? (Math.random() < 0.5 ? 0 : 1) : 1; return k; }
        return 0.92 + 0.08 * Math.sin(t * 13 + sg.x);
      },
      draw(ctx, s, t, dt) {
        const { w, h, ground } = s;
        ctx.drawImage(s.bg, 0, 0);
        for (const sg of s.signs) {
          const on = this.level(sg, t), x = sg.x - sg.pad, y = sg.y - sg.pad;
          ctx.drawImage(sg.off, x, y);
          if (on > 0) { ctx.globalAlpha = on; ctx.drawImage(sg.on, x, y); ctx.globalAlpha = 1; }
          // its reflection on the wet ground, stretched and broken up by ripples
          if (on > 0) {
            const ry = ground + (ground - (sg.y + sg.on.height * 0.5 - sg.pad)) * 0.35;
            ctx.save(); ctx.globalAlpha = 0.22 * on; ctx.translate(x, ry); ctx.scale(1, -0.6);
            for (let k = 0; k < sg.on.height; k += 6) ctx.drawImage(sg.on, 0, k, sg.on.width, 6, Math.sin(t * 3 + k * 0.3) * 4 * s.px, k, sg.on.width, 6);
            ctx.restore(); ctx.globalAlpha = 1;
          }
        }
        ctx.strokeStyle = "rgba(190, 200, 230, 0.28)"; ctx.lineWidth = 1 * s.px; ctx.beginPath();
        for (const r of s.rain) {
          r.y += r.v * dt * s.px; r.x -= r.v * 0.08 * dt * s.px;
          if (r.y > ground + rand(0, h - ground)) { if (s.splash.length < 60) s.splash.push({ x: r.x, y: r.y, life: 0 }); r.y = rand(-40, 0); r.x = rand(0, w * 1.1); }
          ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.l * 0.08 * s.px, r.y - r.l * s.px);
        }
        ctx.stroke();
        s.splash = s.splash.filter((q) => (q.life += dt) < 0.35);
        for (const q of s.splash) { ctx.strokeStyle = rgba("#c8d0f0", 0.4 * (1 - q.life / 0.35)); ctx.beginPath(); ctx.ellipse(q.x, q.y, (2 + q.life * 30) * s.px, (1 + q.life * 6) * s.px, 0, 0, TAU); ctx.stroke(); }
      },
    },

    /* ---------------------------------------------------------- anime sky */
    animesky: {
      lowRes: 1,
      init(s) {
        const { w, h } = s, m = Math.min(w, h), day = !s.dark;
        s.day = day;
        s.sky = still(s, (c) => {
          c.fillStyle = grad(c, 0, 0, 0, h, day ? [[0, "#1554d1"], [0.45, "#4c98f5"], [0.8, "#a9d4ff"], [1, "#e6f3ff"]] : [[0, "#151340"], [0.45, "#5a3a86"], [0.75, "#d0607a"], [1, "#ffb36b"]]);
          c.fillRect(0, 0, w, h);
          if (!day) staticStars(c, w, h, 60, 0.3, s.px);
          const sx = w * 0.18, sy = day ? h * 0.18 : h * 0.72;
          glow(c, sx, sy, m * 0.7, day ? "#ffffff" : "#ffd6a0", day ? 0.35 : 0.5);
          glow(c, sx, sy, m * 0.12, "#ffffff", 0.9);
          // soft rays from the sun
          c.globalCompositeOperation = "lighter";
          for (let k = 0; k < 9; k++) { const a = rand(0, TAU), wd = rand(0.03, 0.08); c.fillStyle = grad(c, sx, sy, sx + Math.cos(a) * m, sy + Math.sin(a) * m, [[0, "rgba(255, 255, 255, 0.12)"], [1, "rgba(255, 255, 255, 0)"]]); c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, m * 1.2, a - wd, a + wd); c.fill(); }
          c.globalCompositeOperation = "source-over";
        });
        // anime clouds: a shadow shape, then the lit shape shifted up, then bright rims
        const cloud = (cw, ch) => offscreen(cw + ch, ch * 1.6, (c) => {
          c.translate(ch * 0.5, ch * 0.6); // room around the puffs so none get cut off
          const puffs = [];
          const n = 14;
          for (let i = 0; i < n; i++) { const u = i / (n - 1), r = ch * (0.18 + 0.22 * Math.sin(u * Math.PI)) * rand(0.8, 1.15); puffs.push([cw * (0.12 + u * 0.76) + rand(-8, 8), ch * 0.72 - r * rand(0.5, 1.2), r]); }
          for (let i = 0; i < 6; i++) puffs.push([cw * rand(0.3, 0.7), ch * rand(0.25, 0.5), ch * rand(0.18, 0.3)]);
          const body = (dx, dy, k) => { c.beginPath(); for (const [x, y, r] of puffs) { c.moveTo(x + dx + r * k, y + dy); c.arc(x + dx, y + dy, r * k, 0, TAU); } c.rect(cw * 0.12 + dx, ch * 0.6 + dy, cw * 0.76, ch * 0.16); c.fill(); };
          c.fillStyle = day ? "#9fb6dc" : "#8a5a8e"; body(0, 0, 1);
          c.fillStyle = day ? "#e9f1ff" : "#f2a9a0"; body(-ch * 0.03, -ch * 0.05, 0.93);
          c.fillStyle = day ? "#ffffff" : "#ffd6b0"; body(-ch * 0.05, -ch * 0.08, 0.8);
        });
        s.clouds = [[0.55, 0.52, 0.5, 5], [0.0, 0.72, 0.32, 8], [0.8, 0.8, 0.26, 11], [0.3, 0.86, 0.2, 13], [0.15, 0.3, 0.16, 3], [0.7, 0.22, 0.13, 4]].map(([x, y, sz, v]) => ({ img: cloud(m * sz * 1.5, m * sz), x: x * w, y: y * h + m * sz * 0.0, v }));
        // power lines and poles, and rooftops along the bottom
        s.fore = offscreen(w, h, (c) => {
          const ink = day ? "#26304a" : "#1a1024";
          c.fillStyle = ink;
          const rf = curve(6, 1.5);
          for (let x = 0; x < w;) {
            const bw = rand(14, 46) * s.px, by = h * (0.93 - Math.pow(rand(0, 1), 3) * 0.08 + rf(x / w) * 0.01);
            c.fillRect(x, by, bw, h - by);
            if (Math.random() < 0.3) { c.beginPath(); c.moveTo(x - 2 * s.px, by); c.lineTo(x + bw / 2, by - bw * 0.3); c.lineTo(x + bw + 2 * s.px, by); c.fill(); }
            if (!day) { c.fillStyle = "#ffc46b"; for (let k = 0; k < 3; k++) if (Math.random() < 0.5) c.fillRect(x + rand(2, bw - 4) * 1, by + rand(3, (h - by) * 0.6), 2 * s.px, 2 * s.px); c.fillStyle = ink; }
            x += bw + rand(0, 3) * s.px;
          }
          const poles = [[w * 0.78, h * 0.18, m * 0.018], [w * 0.3, h * 0.45, m * 0.008]];
          for (const [x, y, wd] of poles) { c.fillRect(x - wd / 2, y, wd, h - y); c.fillRect(x - wd * 7, y + wd * 3, wd * 14, wd * 0.9); c.fillRect(x - wd * 5, y + wd * 8, wd * 10, wd * 0.8); }
          c.strokeStyle = ink; c.lineWidth = 1.6 * s.px;
          const [[x1, y1, a], [x2, y2, b]] = poles;
          for (const [k, off] of [[-6, 3], [0, 3], [6, 3], [-4, 8], [4, 8]]) {
            const ax = x1 + k * a, ay = y1 + off * a, bx = x2 + k * b, by = y2 + off * b;
            c.beginPath(); c.moveTo(w + 20, ay - h * 0.04); c.quadraticCurveTo((w + ax) / 2, ay + h * 0.03, ax, ay); c.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + h * 0.07, bx, by); c.quadraticCurveTo(bx * 0.5, by + h * 0.06, -20, by + h * 0.02); c.stroke();
          }
        });
        s.birds = Array.from({ length: 5 }, () => ({ x: rand(0, w), y: h * rand(0.15, 0.4), v: rand(20, 35), ph: rand(0, TAU) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.drawImage(s.sky, 0, 0);
        for (const c of s.clouds) { const x = ((c.x + t * c.v * s.px) % (w + c.img.width)) - c.img.width; ctx.drawImage(c.img, x, c.y - c.img.height); }
        ctx.strokeStyle = s.day ? "#26304a" : "#1a1024"; ctx.lineWidth = 1.5 * s.px;
        for (const b of s.birds) {
          b.x += b.v * dt * s.px; if (b.x > w + 20) { b.x = -20; b.y = h * rand(0.15, 0.4); }
          const f = Math.sin(t * 7 + b.ph) * 4 * s.px, y = b.y + Math.sin(t * 0.6 + b.ph) * 5 * s.px, sz = 7 * s.px;
          ctx.beginPath(); ctx.moveTo(b.x - sz, y - f); ctx.quadraticCurveTo(b.x - sz * 0.4, y - 3 * s.px - f * 0.4, b.x, y); ctx.quadraticCurveTo(b.x + sz * 0.4, y - 3 * s.px - f * 0.4, b.x + sz, y - f); ctx.stroke();
        }
        ctx.drawImage(s.fore, 0, 0);
      },
    },

    /* ---------------------------------------------------------- outrun */
    outrun: {
      lowRes: 1,
      init(s) {
        const { w, h } = s, m = Math.min(w, h);
        s.hz = h * 0.6; s.R = m * 0.24;
        s.bg = still(s, (c) => {
          c.fillStyle = grad(c, 0, 0, 0, s.hz, [[0, "#0a0221"], [0.55, "#3b0a5e"], [0.85, "#a1137a"], [1, "#ff4f7b"]]); c.fillRect(0, 0, w, s.hz);
          staticStars(c, w, h, 120, 0.45, s.px);
          glow(c, w / 2, s.hz, m * 0.9, "#ff3d8b", 0.35, 0.4);
        });
        // wireframe mountains in front of the sun
        const ridge = curve(14, 1.1);
        s.mtn = offscreen(w, h * 0.22, (c, W, H) => {
          const pts = []; for (let x = 0; x <= W; x += W / 60) { const u = x / W, v = Math.abs(u - 0.5) < 0.16 ? 0.25 : 0.25 + (ridge(u) + 1) * 0.37; pts.push([x, H - v * H * (0.4 + Math.abs(u - 0.5) * 1.2)]); }
          c.fillStyle = "#12052a"; c.beginPath(); c.moveTo(0, H); for (const p of pts) c.lineTo(...p); c.lineTo(W, H); c.fill();
          c.strokeStyle = "rgba(61, 232, 255, 0.85)"; c.lineWidth = 2 * s.px; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p))); c.stroke();
          c.strokeStyle = "rgba(61, 232, 255, 0.25)"; c.lineWidth = 1 * s.px; c.beginPath(); for (let i = 2; i < pts.length; i += 3) { c.moveTo(...pts[i]); c.lineTo(pts[i][0] + (pts[i][0] - W / 2) * 0.05, H); } c.stroke();
        });
        const palm = (c, x, base, H, flip) => {
          c.strokeStyle = "#0a0118"; c.fillStyle = "#0a0118"; c.lineWidth = H * 0.035; c.lineCap = "round";
          const tx = x + flip * H * 0.18, ty = base - H;
          c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + flip * H * 0.02, base - H * 0.6, tx, ty); c.stroke();
          for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.5, L = H * 0.4, ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.5 + L * 0.4 * Math.abs(Math.cos(a)); c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a - 0.3) * L * 0.6, ty + Math.sin(a - 0.3) * L * 0.6 - L * 0.12, ex, ey); c.quadraticCurveTo(tx + Math.cos(a + 0.3) * L * 0.5, ty + Math.sin(a + 0.3) * L * 0.5 - L * 0.02, tx, ty); c.fill(); }
        };
        s.palms = offscreen(w, h, (c) => { palm(c, w * 0.06, h * 1.02, h * 0.62, 1); palm(c, w * 0.13, h * 1.02, h * 0.42, 1); palm(c, w * 0.93, h * 1.02, h * 0.58, -1); });
      },
      draw(ctx, s, t) {
        const { w, h, hz, R } = s;
        ctx.drawImage(s.bg, 0, 0);
        // the sun, with stripes sliding down through its lower half
        const cx = w / 2, cy = hz - R * 0.35;
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
        ctx.fillStyle = grad(ctx, 0, cy - R, 0, cy + R, [[0, "#ffe76a"], [0.5, "#ff9a3d"], [1, "#ff2e7e"]]); ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.fillStyle = "#3b0a5e";
        for (let k = 0; k < 8; k++) { const f = ((k + (t * 0.25) % 1) / 8), y = cy - R * 0.05 + f * R * 1.1, th = R * 0.015 + f * R * 0.08; ctx.fillRect(cx - R, y, R * 2, th); }
        ctx.restore();
        glow(ctx, cx, cy, R * 1.8, "#ff6a5a", 0.25);
        ctx.drawImage(s.mtn, 0, hz - s.mtn.height + 1);
        // the grid floor rushing toward you
        ctx.fillStyle = grad(ctx, 0, hz, 0, h, [[0, "#1a0433"], [1, "#05010d"]]); ctx.fillRect(0, hz, w, h - hz);
        ctx.save(); ctx.beginPath(); ctx.rect(0, hz, w, h - hz); ctx.clip();
        for (const [lw, a] of [[5, 0.18], [1.6, 0.9]]) {
          ctx.strokeStyle = rgba("#ff3df2", a); ctx.lineWidth = lw * s.px; ctx.beginPath();
          for (let k = 0; k < 24; k++) { const z = (k + 1 - (t * 1.2) % 1), y = hz + (h - hz) * (1.2 / z); if (y > h) continue; ctx.moveTo(0, y); ctx.lineTo(w, y); }
          for (let k = -20; k <= 20; k++) { ctx.moveTo(cx + k * w * 0.012, hz); ctx.lineTo(cx + k * w * 0.16, h); }
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = "rgba(255, 61, 242, 0.8)"; ctx.fillRect(0, hz - 1 * s.px, w, 2 * s.px);
        glow(ctx, cx, hz, w * 0.6, "#ff3df2", 0.25, 0.08);
        ctx.drawImage(s.palms, 0, 0);
      },
    },

    /* ---------------------------------------------------------- pixel city at night */
    pixelcity: {
      lowRes: 0.25, pixel: true,
      init(s) {
        const { w, h } = s;
        s.bg = still(s, (c) => {
          ditherBands(c, w, h, 0, h, ["#0b0a24", "#16123a", "#2a1a52", "#4a2468", "#7a3a7a"]);
          for (let i = 0; i < 60; i++) { c.fillStyle = Math.random() < 0.2 ? "#ffe9a8" : "#ffffff"; c.fillRect(Math.floor(rand(0, w)), Math.floor(rand(0, h * 0.5)), 1, 1); }
          pixelDisc(c, w * 0.8, h * 0.18, Math.round(h * 0.06), "#f4f1d8"); pixelDisc(c, w * 0.8 - 2, h * 0.18 - 1, Math.round(h * 0.06) - 2, "#fffbe8");
          c.fillStyle = "#e3dcbc"; c.fillRect(Math.round(w * 0.8) - 3, Math.round(h * 0.18), 2, 2); c.fillRect(Math.round(w * 0.8) + 2, Math.round(h * 0.18) - 3, 1, 1);
        });
        s.flick = [];
        const layer = (base, minH, maxH, color, lit, winColor, collect) => offscreen(w, h, (c) => {
          let x = -2;
          while (x < w) {
            const bw = Math.floor(rand(8, 18)), bh = Math.floor(rand(minH, maxH) * h);
            c.fillStyle = color; c.fillRect(x, base - bh, bw, bh);
            if (Math.random() < 0.3) c.fillRect(x + Math.floor(bw / 2), base - bh - 3, 1, 3);
            if (Math.random() < 0.25) { c.fillRect(x + 1, base - bh - 1, bw - 2, 1); }
            for (let y = base - bh + 2; y < base - 2; y += 3) for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
              if (Math.random() < lit) { c.fillStyle = winColor; c.fillRect(wx, y, 1, 1); }
              else if (collect && Math.random() < 0.04) s.flick.push({ x: wx, y, ph: rand(0, TAU), v: rand(0.1, 0.4) });
              c.fillStyle = color;
            }
            x += bw + Math.floor(rand(0, 3));
          }
        });
        s.far = layer(Math.floor(h * 0.86), 0.2, 0.45, "#251a45", 0.12, "#7a5fb0", false);
        s.near = layer(Math.floor(h * 0.95), 0.18, 0.6, "#120c22", 0.28, "#ffcf6b", true);
        s.sign = { x: Math.floor(w * 0.3), y: Math.floor(h * 0.5) };
        s.clouds = Array.from({ length: 4 }, () => ({ x: rand(0, w), y: rand(h * 0.08, h * 0.35), wd: rand(18, 40), v: rand(1, 3) }));
        s.train = 0;
      },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        for (const c of s.clouds) { c.x += c.v * dt; if (c.x > w + 4) c.x = -c.wd - 4; pixelCloud(ctx, c.x, c.y, c.wd, "#4a3a78", "#33285a"); }
        if (Math.floor(t * 2) % 7 === 0) { ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.floor((t * 37) % w), Math.floor((t * 11) % (h * 0.4)), 1, 1); } // a star twinkles
        ctx.drawImage(s.far, 0, 0);
        // a train on the elevated line between the rows of buildings
        const ty = Math.floor(h * 0.8), tl = 60, tx = Math.floor(((t * 22) % (w + tl * 2)) - tl);
        ctx.fillStyle = "#0e0a1c"; ctx.fillRect(0, ty + 4, w, 1);
        ctx.fillStyle = "#2c2550"; ctx.fillRect(tx - tl, ty - 3, tl, 6);
        ctx.fillStyle = "#ffe9a8"; for (let k = tx - tl + 2; k < tx - 2; k += 3) ctx.fillRect(k, ty - 2, 2, 2);
        ctx.fillStyle = "#ff4a4a"; ctx.fillRect(tx - tl, ty, 1, 1); ctx.fillStyle = "#fff3c0"; ctx.fillRect(tx - 1, ty, 1, 1);
        ctx.drawImage(s.near, 0, 0);
        for (const f of s.flick) if (Math.sin(t * f.v * 4 + f.ph) > 0.4) { ctx.fillStyle = "#ffcf6b"; ctx.fillRect(f.x, f.y, 1, 1); }
        // a neon sign that blinks letter by letter
        const on = Math.floor(t * 2.5) % 8;
        for (let k = 0; k < 5; k++) { ctx.fillStyle = k < on ? (k % 2 ? "#3de8ff" : "#ff3d8b") : "#2a1a3a"; ctx.fillRect(s.sign.x + k * 3, s.sign.y, 2, 3); }
      },
    },

    /* ---------------------------------------------------------- pixel sunset */
    pixelsunset: {
      lowRes: 0.25, pixel: true,
      init(s) {
        const { w, h } = s, hz = Math.floor(h * 0.62);
        s.hz = hz; s.sun = [Math.floor(w * 0.5), hz - Math.floor(h * 0.05), Math.round(h * 0.13)];
        const sky = s.dark ? ["#1a1040", "#3a1a5e", "#7a2a6e", "#c8406a", "#ff7a4a", "#ffb35a"] : ["#3a6ad0", "#6a8ae6", "#c890c8", "#ff9a8a", "#ffc27a", "#ffe0a0"];
        s.sea = s.dark ? ["#2a1a4a", "#1a1238", "#100b26"] : ["#5a6ab0", "#3a4a90", "#2a3470"];
        s.bg = still(s, (c) => {
          ditherBands(c, w, h, 0, hz, sky);
          if (s.dark) for (let i = 0; i < 30; i++) { c.fillStyle = "#ffffff"; c.fillRect(Math.floor(rand(0, w)), Math.floor(rand(0, hz * 0.4)), 1, 1); }
          const [sx, sy, r] = s.sun;
          c.save(); c.beginPath(); c.rect(0, 0, w, hz); c.clip();
          pixelDisc(c, sx, sy, r, "#ff8a3d"); pixelDisc(c, sx, sy - 1, r - 2, "#ffb35a"); pixelDisc(c, sx, sy - 3, r - 6, "#ffd27a");
          c.fillStyle = sky[3]; for (let k = 0; k < 4; k++) c.fillRect(sx - r, sy + 2 + k * 4, r * 2 + 1, 1 + Math.floor(k / 2)); // stripes across the sun
          c.restore();
          ditherBands(c, w, h, hz, h, s.sea);
          c.fillStyle = s.dark ? "#120a24" : "#2a2a5a"; for (let x = Math.floor(w * 0.68); x < w * 0.95; x++) { const u = (x - w * 0.68) / (w * 0.27), hh = Math.floor(Math.sin(u * Math.PI) * 6 + Math.sin(u * 17) * 1.5); if (hh > 0) c.fillRect(x, hz - hh, 1, hh); }
        });
        s.clouds = Array.from({ length: 7 }, (_, i) => ({ x: rand(0, w), y: rand(h * 0.08, h * 0.45), wd: rand(20, 55), v: rand(1.5, 4), col: i % 2 ? (s.dark ? "#a0407a" : "#ffd0c0") : (s.dark ? "#d06070" : "#fff0e0"), shade: s.dark ? "#5a2a5e" : "#e8a0a0" }));
        s.waves = Array.from({ length: 70 }, () => ({ x: rand(0, w), y: rand(hz + 2, h), l: Math.floor(rand(2, 7)), ph: rand(0, TAU) }));
        s.birds = Array.from({ length: 3 }, () => ({ x: rand(0, w), y: rand(h * 0.15, h * 0.35), v: rand(5, 9) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, hz } = s, [sx, , r] = s.sun;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bg, 0, 0);
        for (const c of s.clouds) { c.x += c.v * dt; if (c.x > w + 4) c.x = -c.wd - 4; pixelCloud(ctx, c.x, c.y, c.wd, c.col, c.shade); }
        // the sun's path on the water: broken lines that shimmer
        for (let y = hz + 1; y < h; y += 2) {
          const spread = r * (0.5 + (y - hz) / (h - hz) * 1.6), seg = Math.floor(spread * 0.6);
          for (let k = -2; k <= 2; k++) {
            const x = Math.floor(sx + k * spread * 0.45 + Math.sin(t * 2 + y * 0.7 + k) * 2);
            if (Math.sin(t * 3 + y * 1.3 + k * 2) > -0.2) { ctx.fillStyle = y % 4 ? "#ffb35a" : "#ffd27a"; ctx.fillRect(x - Math.floor(seg / 2), y, Math.max(1, seg - Math.abs(k) * 2), 1); }
          }
        }
        for (const wv of s.waves) { if (Math.sin(t * 1.5 + wv.ph) > 0.3) { ctx.fillStyle = s.dark ? "#4a3a7a" : "#8a9ad6"; ctx.fillRect(Math.floor(wv.x + Math.sin(t + wv.ph) * 2), Math.floor(wv.y), wv.l, 1); } }
        ctx.fillStyle = s.dark ? "#1a1030" : "#2a2a5a";
        for (const b of s.birds) { b.x += b.v * dt; if (b.x > w + 3) b.x = -3; const f = Math.sin(t * 6 + b.y) > 0 ? 1 : 0, x = Math.floor(b.x), y = Math.floor(b.y); ctx.fillRect(x - 2, y - f, 1, 1); ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x, y + 1 - f, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x + 2, y - f, 1, 1); }
      },
    },
  };
}

export const COZY = [
  ["rainwindow", "Rainy night window"], ["snowwindow", "Snowy window"], ["fireplace", "Fireplace"], ["neon", "Neon signs in the rain"],
  ["animesky", "Anime sky"], ["outrun", "Outrun"], ["pixelcity", "Pixel city"], ["pixelsunset", "Pixel sunset"],
];
