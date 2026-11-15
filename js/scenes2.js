// More landscape backgrounds: a waterfall, a winter cabin, a volcano, a tropical beach, northern lights,
// a night train, a lighthouse, a campfire, a black hole, a sea of clouds, hot air balloons and a wind farm.
// Like scenes.js: day versions for light themes, night versions for dark ones. Parts that never move
// are painted once into a backdrop picture, so each frame is one image copy plus the moving details.
import { rand, TAU, mix, rgba, curve, offscreen, tile, skyFill, glow, makeStars, drawStars, palette, pine, bird, ridgeStrip, forestStrip } from "./scenes.js";

/** Paint the parts of a scene that never move into one picture. */
const still = (s, paint) => offscreen(s.w, s.h, (c) => paint(c, s));
const disc = (c, x, y, r, color) => { c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
function staticStars(c, s, n, maxY) {
  for (let i = 0; i < n; i++) { c.globalAlpha = rand(0.3, 0.9); c.fillStyle = "#ffffff"; const r = rand(0.5, 1.5) * s.px; c.fillRect(rand(0, s.w), rand(0, s.h * maxY), r, r); }
  c.globalAlpha = 1;
}
function skyPaint(c, s, stops) {
  const g = c.createLinearGradient(0, 0, 0, s.h);
  for (const [o, col] of stops) g.addColorStop(o, col);
  c.fillStyle = g; c.fillRect(0, 0, s.w, s.h);
}
/** A small puff of smoke, steam or spray that rises, grows and fades. */
function puffs(list, max, spawn) {
  if (list.length < max) list.push(spawn());
  return list;
}

export function makeScenes2() {
  return {
    /* ---------------------------------------------------------- waterfall */
    waterfall: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#08101f", mid: "#1c2b45", low: "#33465f", rock: "#141b26", rock2: "#1d2735", trees: "#0a1210", water: "#9cc8ff", pool: "#0f2236", sun: "#eef2ff" },
          { top: "#86bfe8", mid: "#cbe3f0", low: "#eef3e6", rock: "#5b6670", rock2: "#7a868f", trees: "#2f5a3f", water: "#e9f6ff", pool: "#5c95b5", sun: "#fff6d6" }, 0.1);
        const { w, h, p } = s;
        s.fx0 = w * 0.44; s.fx1 = w * 0.56; s.top = h * 0.22; s.bottom = h * 0.72;
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.5, p.mid], [1, p.low]]);
          if (s.dark) staticStars(c, s, 90, 0.35);
          glow(c, w * 0.8, h * 0.14, h * 0.2, p.sun, s.dark ? 0.2 : 0.5); disc(c, w * 0.8, h * 0.14, h * 0.03, rgba(p.sun, 0.95));
          c.drawImage(forestStrip(w, h * 0.22, mix(p.trees, p.low, 0.45), 60, 0.4, 0.8, s.px), 0, s.top - h * 0.17);
          // cliffs on both sides of the falls
          const edge = curve(30, 1.1);
          for (const side of [0, 1]) {
            c.fillStyle = side ? p.rock2 : p.rock; c.beginPath();
            const x0 = side ? s.fx1 : s.fx0, xe = side ? w : 0;
            c.moveTo(xe, h); c.lineTo(xe, s.top - h * 0.02);
            for (let k = 0; k <= 40; k++) { const u = k / 40, x = xe + (x0 - xe) * u; c.lineTo(x, s.top + edge(u * 0.5 + side * 0.5) * h * 0.03); }
            for (let y = s.top; y <= s.bottom + h * 0.02; y += h * 0.02) c.lineTo(x0 + (side ? 1 : -1) * Math.abs(edge(y / h)) * w * 0.02, y);
            c.lineTo(x0 + (side ? 1 : -1) * w * 0.04, h); c.closePath(); c.fill();
            // rock layers and a shadow toward the falls
            c.save(); c.clip();
            const sh = c.createLinearGradient(xe, 0, x0, 0); sh.addColorStop(0, "rgba(0, 0, 0, 0)"); sh.addColorStop(1, "rgba(0, 0, 0, 0.35)");
            c.fillStyle = sh; c.fillRect(0, 0, w, h);
            c.strokeStyle = "rgba(0, 0, 0, 0.22)"; c.lineWidth = 2 * s.px;
            for (let k = 0; k < 9; k++) {
              const y0 = s.top + (s.bottom - s.top) * (k + 0.5) / 9, wav = curve(8, 1.2);
              c.beginPath(); for (let x = Math.min(xe, x0); x <= Math.max(xe, x0) + w * 0.05; x += 8) c.lineTo(x, y0 + wav(x / w) * h * 0.02); c.stroke();
            }
            c.strokeStyle = "rgba(255, 255, 255, 0.06)"; c.lineWidth = 1.5 * s.px;
            for (let k = 0; k < 40; k++) { const x = rand(Math.min(xe, x0), Math.max(xe, x0)), y = rand(s.top, s.bottom), l = rand(10, 50) * s.px; c.beginPath(); c.moveTo(x, y); c.lineTo(x + rand(-4, 4), y + l); c.stroke(); }
            c.restore();
            c.drawImage(forestStrip(w * 0.46, h * 0.16, p.trees, 14, 0.5, 1, s.px), side ? s.fx1 : 0, s.top - h * 0.14);
          }
          const g = c.createLinearGradient(0, s.bottom, 0, h);
          g.addColorStop(0, p.pool); g.addColorStop(1, mix(p.pool, "#000000", 0.4));
          c.fillStyle = g; c.fillRect(0, s.bottom, w, h - s.bottom);
        });
        s.streaks = Array.from({ length: 120 }, () => ({ x: rand(0, 1), y: rand(0, 1), l: rand(0.05, 0.18), v: rand(0.35, 0.6), a: rand(0.25, 0.7) }));
        s.spray = []; s.rip = Array.from({ length: 30 }, () => ({ y: rand(0, 1), x: rand(-1, 1), ph: rand(0, TAU) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, p, fx0, fx1, top, bottom } = s;
        ctx.drawImage(s.bg, 0, 0);
        const fw = fx1 - fx0, H = bottom - top;
        const g = ctx.createLinearGradient(0, top, 0, bottom);
        g.addColorStop(0, rgba(p.water, s.dark ? 0.35 : 0.65)); g.addColorStop(1, rgba(p.water, s.dark ? 0.55 : 0.85));
        ctx.fillStyle = g; ctx.fillRect(fx0, top, fw, H);
        ctx.lineWidth = 2 * s.px;
        for (const st of s.streaks) {
          st.y += st.v * dt * 1.4; if (st.y > 1) { st.y -= 1 + st.l; st.x = rand(0, 1); }
          const y = top + st.y * H, x = fx0 + st.x * fw;
          ctx.strokeStyle = rgba("#ffffff", st.a * (s.dark ? 0.55 : 0.8));
          ctx.beginPath(); ctx.moveTo(x, Math.max(top, y)); ctx.lineTo(x, Math.min(bottom, y + st.l * H)); ctx.stroke();
        }
        puffs(s.spray, 60, () => ({ x: rand(fx0, fx1), y: bottom, vx: rand(-40, 40), vy: rand(-50, -15), r: rand(10, 24) * s.px, life: 0 }));
        s.spray = s.spray.filter((q) => (q.life += dt) < 2.5);
        for (const q of s.spray) { q.x += q.vx * dt * s.px; q.y += q.vy * dt * s.px; glow(ctx, q.x, q.y, q.r * (1 + q.life), "#ffffff", (s.dark ? 0.12 : 0.25) * (1 - q.life / 2.5)); }
        glow(ctx, (fx0 + fx1) / 2, bottom, fw * 1.4, "#ffffff", s.dark ? 0.12 : 0.22, 0.5);
        ctx.fillStyle = rgba("#ffffff", s.dark ? 0.25 : 0.45);
        for (const r of s.rip) {
          const y = bottom + 6 * s.px + r.y * (h - bottom), spread = fw * (0.6 + r.y * 2.5), a = Math.max(0, Math.sin(t * 1.2 + r.ph));
          ctx.globalAlpha = a; ctx.fillRect((fx0 + fx1) / 2 + r.x * spread + Math.sin(t + r.ph) * 10 * s.px, y, 30 * s.px * (0.5 + r.y), 1.5 * s.px);
        }
        ctx.globalAlpha = 1;
      },
    },

    /* ---------------------------------------------------------- winter cabin */
    cabin: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#050a18", mid: "#16223d", low: "#2c3b5a", snow: "#c9d4ea", snow2: "#9eacc8", pine: "#0b1422", cabin: "#2a1d18", lamp: "#ffc46b", sun: "#eef2ff" },
          { top: "#9cc2e6", mid: "#d6e6f2", low: "#f4f7fb", snow: "#ffffff", snow2: "#dbe5f0", pine: "#2b4a3c", cabin: "#6b4a3a", lamp: "#ffd98a", sun: "#fff8e0" }, 0.1);
        const { w, h, p } = s;
        s.cx = w * 0.62; s.cy = h * 0.74; const cw = Math.min(w, h) * 0.2;
        s.cw = cw;
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.5, p.mid], [1, p.low]]);
          if (s.dark) staticStars(c, s, 140, 0.5);
          glow(c, w * 0.22, h * 0.18, h * 0.22, p.sun, s.dark ? 0.2 : 0.4); disc(c, w * 0.22, h * 0.18, h * 0.035, rgba(p.sun, 0.95));
          c.drawImage(ridgeStrip(w, 0, h * 0.4, mix(p.snow2, p.mid, 0.35), 1.2, 26, true), 0, h * 0.34);
          c.drawImage(ridgeStrip(w, 0, h * 0.3, p.snow2, 1.8, 6, false), 0, h * 0.56);
          c.drawImage(ridgeStrip(w, 0, h * 0.22, p.snow, 2, 5, false), 0, h * 0.78);
          // snowy pines
          for (let i = 0; i < 26; i++) {
            const x = rand(0, w), base = h * rand(0.72, 0.95), th = h * rand(0.08, 0.2);
            if (Math.abs(x - s.cx) < cw * 0.8 && base < s.cy + cw * 0.3) continue;
            c.fillStyle = p.pine; pine(c, x, base, th, th * 0.4);
            c.fillStyle = rgba(p.snow, 0.85);
            for (let k = 0; k < 4; k++) { const ty = base - th + th * 0.78 * (k / 4), half = th * 0.4 * (0.32 + 0.18 * (k / 3)) * 0.6; c.beginPath(); c.moveTo(x, ty); c.lineTo(x + half, ty + th * 0.08); c.lineTo(x - half, ty + th * 0.08); c.fill(); }
          }
          // the cabin
          const x = s.cx - cw / 2, y = s.cy - cw * 0.55;
          c.fillStyle = p.cabin; c.fillRect(x, y, cw, cw * 0.55);
          c.fillRect(x + cw * 0.7, y - cw * 0.42, cw * 0.1, cw * 0.3); // chimney
          c.fillStyle = mix(p.cabin, "#000000", 0.35); c.beginPath(); c.moveTo(x - cw * 0.1, y); c.lineTo(s.cx, y - cw * 0.38); c.lineTo(x + cw * 1.1, y); c.closePath(); c.fill();
          c.fillStyle = p.snow; c.beginPath(); c.moveTo(x - cw * 0.12, y + 2); c.lineTo(s.cx, y - cw * 0.4); c.lineTo(x + cw * 1.12, y + 2); c.lineTo(x + cw * 1.0, y - cw * 0.03); c.lineTo(s.cx, y - cw * 0.3); c.lineTo(x, y - cw * 0.03); c.closePath(); c.fill();
          c.fillStyle = mix(p.cabin, "#000000", 0.5); c.fillRect(x + cw * 0.08, y + cw * 0.22, cw * 0.18, cw * 0.33); // door
        });
        s.win = [[s.cx - s.cw * 0.5 + s.cw * 0.42, s.cy - s.cw * 0.4], [s.cx - s.cw * 0.5 + s.cw * 0.7, s.cy - s.cw * 0.4]];
        s.flakes = Array.from({ length: 160 }, () => ({ x: rand(0, s.w), y: rand(0, s.h), d: rand(0.2, 1), ph: rand(0, TAU) }));
        s.smoke = [];
      },
      draw(ctx, s, t, dt) {
        const { w, h, p, cw } = s;
        ctx.drawImage(s.bg, 0, 0);
        const fl = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.3);
        for (const [x, y] of s.win) {
          glow(ctx, x + cw * 0.08, y + cw * 0.08, cw * 0.5, p.lamp, (s.dark ? 0.35 : 0.2) * fl);
          ctx.fillStyle = rgba(p.lamp, 0.95 * fl); ctx.fillRect(x, y, cw * 0.16, cw * 0.16);
          ctx.fillStyle = rgba(p.cabin, 0.8); ctx.fillRect(x + cw * 0.075, y, cw * 0.012, cw * 0.16); ctx.fillRect(x, y + cw * 0.075, cw * 0.16, cw * 0.012);
        }
        const chx = s.cx - cw / 2 + cw * 0.75, chy = s.cy - cw * 0.55 - cw * 0.42;
        puffs(s.smoke, 40, () => ({ x: chx, y: chy, r: cw * 0.05, life: 0, ph: rand(0, TAU) }));
        s.smoke = s.smoke.filter((q) => (q.life += dt) < 6);
        for (const q of s.smoke) {
          q.y -= 14 * dt * s.px; q.x += (8 + Math.sin(t + q.ph) * 6) * dt * s.px;
          glow(ctx, q.x, q.y, q.r * (1 + q.life * 0.9), s.dark ? "#9aa6bf" : "#ffffff", 0.28 * (1 - q.life / 6));
        }
        ctx.fillStyle = "#ffffff";
        for (const f of s.flakes) {
          f.y += (12 + f.d * 30) * dt * s.px; f.x += Math.sin(t * 0.8 + f.ph) * 0.3 * s.px;
          if (f.y > h) { f.y = -4; f.x = rand(0, w); }
          ctx.globalAlpha = 0.4 + f.d * 0.5; ctx.beginPath(); ctx.arc(f.x, f.y, (0.8 + f.d * 2) * s.px, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    },

    /* ---------------------------------------------------------- volcano */
    volcano: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#07060c", mid: "#24121a", low: "#5a2420", cone: "#120c0e", cone2: "#1d1416", far: "#2a1a1e", lava: "#ff6a1f", smoke: "#3a3036" },
          { top: "#6d7fa6", mid: "#c99a8e", low: "#f2b98a", cone: "#3b2f33", cone2: "#4d3e42", far: "#8c7a80", lava: "#ff5a12", smoke: "#6a5f63" }, 0.06);
        const { w, h, p } = s;
        s.peak = [w * 0.5, h * 0.42]; s.crater = w * 0.07;
        const slope = curve(24, 1.2);
        s.flows = Array.from({ length: 5 }, (_, i) => { const dir = i % 2 ? 1 : -1, pts = []; let x = s.peak[0] + dir * rand(0.2, 0.8) * s.crater, y = s.peak[1]; for (let k = 0; k < 16; k++) { pts.push([x, y]); y += h * 0.025; x += dir * w * rand(0.006, 0.02) + rand(-4, 4) * s.px; } return { pts, ph: rand(0, TAU) }; });
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.45, p.mid], [0.8, p.low], [1, p.low]]);
          if (s.dark) staticStars(c, s, 80, 0.3);
          c.drawImage(ridgeStrip(w, 0, h * 0.4, p.far, 1.4, 18, true), 0, h * 0.6);
          c.fillStyle = p.cone; c.beginPath(); c.moveTo(-w * 0.1, h);
          for (let k = 0; k <= 60; k++) {
            const u = k / 60, x = -w * 0.1 + u * w * 1.2, dist = Math.abs(x - s.peak[0]);
            let y = dist < s.crater ? s.peak[1] + (s.crater - dist) * 0.12 : s.peak[1] + Math.pow((dist - s.crater) / (w * 0.6), 1.25) * h * 0.62;
            y += slope(u) * h * 0.012;
            c.lineTo(x, Math.min(h, y));
          }
          c.lineTo(w * 1.1, h); c.closePath(); c.fill();
          c.fillStyle = p.cone2; c.beginPath(); c.moveTo(s.peak[0] + s.crater * 0.3, s.peak[1] + 2); c.lineTo(w * 1.1, h); c.lineTo(w * 0.62, h); c.closePath(); c.fill();
        });
        s.smoke = []; s.embers = [];
      },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s, [px, py] = s.peak;
        ctx.drawImage(s.bg, 0, 0);
        const pulse = 0.75 + 0.25 * Math.sin(t * 0.9) * Math.sin(t * 2.3);
        glow(ctx, px, py, w * 0.25, p.lava, (s.dark ? 0.35 : 0.25) * pulse, 0.7);
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (const f of s.flows) {
          for (const [lw, col, a] of [[9, p.lava, 0.25], [3.5, "#ffb35a", 0.9]]) {
            ctx.strokeStyle = rgba(col, a * (0.7 + 0.3 * Math.sin(t * 1.5 + f.ph))); ctx.lineWidth = lw * s.px;
            ctx.beginPath(); f.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          }
        }
        ctx.lineCap = "butt"; ctx.lineJoin = "miter";
        ctx.fillStyle = rgba("#ffd27a", 0.95 * pulse); ctx.beginPath(); ctx.ellipse(px, py + 3 * s.px, s.crater * 0.8, s.crater * 0.12, 0, 0, TAU); ctx.fill();
        if (Math.random() < dt * 6) s.smoke.push({ x: px + rand(-1, 1) * s.crater * 0.5, y: py, r: s.crater * rand(0.35, 0.6), life: 0, drift: rand(18, 34) });
        s.smoke = s.smoke.filter((q) => (q.life += dt) < 10);
        for (const q of s.smoke) {
          q.y -= (34 - q.life * 1.5) * dt * s.px; q.x += q.drift * (0.3 + q.life * 0.12) * dt * s.px;
          const a = Math.min(1, q.life * 1.5) * (1 - q.life / 10);
          glow(ctx, q.x, q.y, q.r * (1 + q.life * 0.28), p.smoke, 0.42 * a);
          if (q.life < 2) glow(ctx, q.x, q.y, q.r * 0.8, p.lava, 0.18 * (1 - q.life / 2));
        }
        if (Math.random() < dt * 25) s.embers.push({ x: px + rand(-1, 1) * s.crater * 0.5, y: py, vx: rand(-60, 60), vy: rand(-160, -60), life: 0 });
        s.embers = s.embers.filter((e) => (e.life += dt) < 3);
        for (const e of s.embers) {
          e.vy += 60 * dt; e.x += e.vx * dt * s.px; e.y += e.vy * dt * s.px;
          ctx.fillStyle = rgba("#ffb347", 1 - e.life / 3); ctx.fillRect(e.x, e.y, 2.2 * s.px, 2.2 * s.px);
        }
      },
    },

    /* ---------------------------------------------------------- tropical beach */
    tropical: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#0a1230", mid: "#28356a", low: "#6a5a8a", sea: "#14294a", sea2: "#1f4a6e", sand: "#3a3346", palm: "#06080f", sun: "#f1f2ff", foam: "#c9d6f0" },
          { top: "#3fa0e0", mid: "#8fd0f0", low: "#e6f6fb", sea: "#1c8fb0", sea2: "#42c2d0", sand: "#f1dcae", palm: "#2b3a2a", sun: "#fff5cf", foam: "#ffffff" }, 0.06);
        const { w, h, p } = s;
        s.hz = h * 0.5; s.shore = h * 0.74;
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.3, p.mid], [0.5, p.low], [1, p.low]]);
          if (s.dark) staticStars(c, s, 100, 0.45);
          glow(c, w * 0.32, h * 0.2, h * 0.25, p.sun, s.dark ? 0.2 : 0.5); disc(c, w * 0.32, h * 0.2, h * 0.04, rgba(p.sun, 0.95));
          const g = c.createLinearGradient(0, s.hz, 0, s.shore);
          g.addColorStop(0, p.sea); g.addColorStop(1, p.sea2); c.fillStyle = g; c.fillRect(0, s.hz, w, s.shore - s.hz + h * 0.05);
          c.drawImage(ridgeStrip(w * 0.35, 0, h * 0.04, mix(p.sea, "#000000", 0.25), 1.4, 6, false), w * 0.6, s.hz - h * 0.04 + 1);
        });
        s.palms = [[w * 0.1, 1.05, -0.12], [w * 0.2, 0.8, 0.08], [w * 0.88, 0.95, 0.15]].map(([x, sc, lean]) => ({ x, sc, lean, ph: rand(0, TAU) }));
        s.birds = Array.from({ length: 4 }, () => ({ x: rand(0, w), y: h * rand(0.15, 0.3), v: rand(15, 25), ph: rand(0, TAU) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, p, hz, shore } = s;
        ctx.drawImage(s.bg, 0, 0);
        // waves running up the sand and back
        ctx.strokeStyle = rgba("#ffffff", s.dark ? 0.06 : 0.25); ctx.lineWidth = 1.2 * s.px;
        for (let i = 0; i < 7; i++) { const y = hz + (shore - hz) * ((i + (t * 0.08) % 1) / 7) ** 1.3; ctx.beginPath(); for (let x = 0; x <= w; x += 24 * s.px) ctx.lineTo(x, y + Math.sin(x * 0.012 + t + i) * 1.5 * s.px); ctx.stroke(); }
        const reach = (x) => shore + Math.sin(t * 0.5) * h * 0.03 + Math.sin(x * 0.004 + t * 0.3) * h * 0.012;
        ctx.fillStyle = p.sand; ctx.beginPath(); ctx.moveTo(0, h);
        for (let x = 0; x <= w + 10; x += 10 * s.px) ctx.lineTo(x, reach(x) + h * 0.02);
        ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(p.foam, 0.8); ctx.lineWidth = 3 * s.px; ctx.beginPath();
        for (let x = 0; x <= w + 10; x += 10 * s.px) ctx.lineTo(x, reach(x) + h * 0.02);
        ctx.stroke();
        ctx.strokeStyle = rgba("#2a2a3a", 0.8); ctx.lineWidth = 1.3 * s.px;
        for (const b of s.birds) { b.x += b.v * dt * s.px; if (b.x > w + 30) b.x = -30; bird(ctx, b.x, b.y + Math.sin(t * 0.6 + b.ph) * 5 * s.px, 7 * s.px, t * 6 + b.ph); }
        // palms: a curved trunk and fronds that sway in the breeze
        for (const pm of s.palms) {
          const H = h * 0.5 * pm.sc, sway = Math.sin(t * 0.7 + pm.ph) * 0.04;
          const bx = pm.x, by = h + 4, tx = bx + (pm.lean + sway) * H * 2.2, ty = h - H;
          ctx.strokeStyle = p.palm; ctx.lineWidth = H * 0.05; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + (pm.lean + sway * 0.3) * H * 0.4, by - H * 0.6, tx, ty); ctx.stroke();
          ctx.fillStyle = p.palm;
          for (let k = 0; k < 7; k++) {
            const a = -Math.PI / 2 + (k - 3) * 0.48 + Math.sin(t * 1.1 + pm.ph + k) * 0.06, L = H * 0.42;
            const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.6 + L * 0.35 * Math.abs(Math.cos(a));
            ctx.beginPath(); ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(tx + Math.cos(a - 0.3) * L * 0.6, ty + Math.sin(a - 0.3) * L * 0.6 - L * 0.1, ex, ey);
            ctx.quadraticCurveTo(tx + Math.cos(a + 0.3) * L * 0.5, ty + Math.sin(a + 0.3) * L * 0.5 - L * 0.02, tx, ty);
            ctx.fill();
          }
          ctx.lineCap = "butt";
        }
      },
    },

    /* ---------------------------------------------------------- northern lights */
    northern: {
      lowRes: 0.6,
      init(s) {
        s.p = palette(s, { top: "#02050d", mid: "#071526", low: "#0f2236", land: "#03060c", snow: "#1a2638" },
          { top: "#0c1a33", mid: "#1d3657", low: "#3b5a7d", land: "#0d1726", snow: "#7f93ad" }, 0.08);
        const { w, h, p } = s;
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.6, p.mid], [1, p.low]]);
          staticStars(c, s, 160, 0.8);
        });
        s.land = ridgeStrip(w, 0, h * 0.25, p.land, 1.3, 20, true);
        s.trees = forestStrip(w, h * 0.14, p.land, 45, 0.5, 1, s.px);
        const cols = s.dark ? [["#3dff9a", "#7d5bff"], ["#2ee6c8", "#c05bff"], ["#62ff7a", "#3d8bff"]] : [["#5dffb0", "#9a7bff"], ["#4af0d8", "#d07bff"], ["#7aff8a", "#5aa0ff"]];
        s.curtains = cols.map(([a, b], i) => ({ a, b, f: curve(6, 1.3), g: curve(10, 1.0, 3), y: h * (0.18 + i * 0.1), len: h * (0.32 - i * 0.04), sp: rand(0.012, 0.02) * (i % 2 ? -1 : 1) }));
        // one vertical streak: bright at the bottom edge, fading upward
        s.sprites = s.curtains.map((cu) => offscreen(4, 128, (c, W, H) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgba(cu.b, 0)); g.addColorStop(0.55, rgba(cu.b, 0.35)); g.addColorStop(0.92, rgba(cu.a, 0.9)); g.addColorStop(1, rgba(cu.a, 0)); c.fillStyle = g; c.fillRect(0, 0, W, H); }));
      },
      draw(ctx, s, t) {
        const { w, h } = s;
        ctx.drawImage(s.bg, 0, 0);
        ctx.globalCompositeOperation = "lighter";
        s.curtains.forEach((cu, i) => {
          const step = 3, img = s.sprites[i];
          for (let x = 0; x < w; x += step) {
            const u = x / w, y = cu.y + cu.f(u * 0.5 + t * cu.sp) * h * 0.12;
            const a = Math.max(0, 0.25 + 0.75 * cu.g(u + t * cu.sp * 2.5)) * (0.75 + 0.25 * Math.sin(t * 0.8 + u * 20));
            if (a < 0.03) continue;
            ctx.globalAlpha = a * 0.55;
            ctx.drawImage(img, x, y - cu.len, step + 1, cu.len);
          }
        });
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
        tile(ctx, s.land, 0, h - s.land.height);
        tile(ctx, s.trees, 0, h - s.trees.height);
      },
    },

    /* ---------------------------------------------------------- night train */
    train: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#05070f", mid: "#141c33", low: "#2b3352", far: "#1c2440", mid2: "#11172a", near: "#070a12", car: "#0b0e18", win: "#ffd27a", sun: "#eef0ff" },
          { top: "#7bb4e6", mid: "#c6dff0", low: "#f6ecd6", far: "#a3b8c6", mid2: "#6f8f78", near: "#3a5a40", car: "#2b3a4a", win: "#e9f4ff", sun: "#fff4cc" }, 0.1);
        const { w, h, p } = s;
        s.track = h * 0.76;
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.55, p.mid], [1, p.low]]);
          if (s.dark) staticStars(c, s, 130, 0.5);
          glow(c, w * 0.78, h * 0.2, h * 0.2, p.sun, s.dark ? 0.2 : 0.45); disc(c, w * 0.78, h * 0.2, h * 0.04, rgba(p.sun, 0.95));
        });
        s.far = ridgeStrip(w, 0, h * 0.35, p.far, 1.4, 16, true);
        s.hill = ridgeStrip(w, 0, h * 0.3, p.mid2, 2, 6, false);
        s.near = forestStrip(w, h * 0.2, p.near, 30, 0.4, 0.9, s.px);
        s.cars = 9; s.carW = Math.min(w, h) * 0.22; s.speed = 0.035;
      },
      draw(ctx, s, t) {
        const { w, h, p, track } = s;
        ctx.drawImage(s.bg, 0, 0);
        tile(ctx, s.far, t * 2 * s.px, h * 0.48);
        tile(ctx, s.hill, t * 6 * s.px, h * 0.58);
        // embankment and rails
        ctx.fillStyle = mix(p.mid2, p.near, 0.6); ctx.fillRect(0, track, w, h - track);
        ctx.fillStyle = rgba(s.dark ? "#8a93a8" : "#55606e", 0.8); ctx.fillRect(0, track - 1 * s.px, w, 2 * s.px);
        const total = s.cars * s.carW * 1.04, cycle = w + total * 1.3;
        const head = ((w * 0.75 + t * 55 * s.px) % cycle);
        for (let i = 0; i < s.cars; i++) {
          const x = head - i * s.carW * 1.04, cw = s.carW, ch = cw * 0.26, y = track - ch - 4 * s.px;
          if (x < -cw || x - cw > w) continue;
          ctx.fillStyle = p.car;
          if (i === 0) { ctx.beginPath(); ctx.moveTo(x - cw, y); ctx.lineTo(x - cw * 0.15, y); ctx.quadraticCurveTo(x, y + ch * 0.1, x, y + ch); ctx.lineTo(x - cw, y + ch); ctx.closePath(); ctx.fill(); glow(ctx, x - 2 * s.px, y + ch * 0.7, ch * 1.2, "#fff3c0", s.dark ? 0.5 : 0.25); }
          else ctx.fillRect(x - cw, y, cw, ch);
          for (let k = 0; k < 7; k++) {
            const wx = x - cw + cw * 0.06 + k * cw * 0.13; if (i === 0 && k > 4) break;
            ctx.fillStyle = rgba(p.win, s.dark ? 0.9 : 0.6); ctx.fillRect(wx, y + ch * 0.22, cw * 0.09, ch * 0.32);
          }
          if (s.dark) glow(ctx, x - cw / 2, track + ch * 0.3, cw * 0.6, p.win, 0.06, 0.25);
        }
        tile(ctx, s.near, t * 30 * s.px, h - s.near.height);
      },
    },

    /* ---------------------------------------------------------- lighthouse */
    lighthouse: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#040812", mid: "#0f1a33", low: "#213152", sea: "#070f1f", rock: "#05080f", tower: "#d9dde8", stripe: "#a3313a", beam: "#fff2c4", sun: "#eef2ff" },
          { top: "#5e7fb0", mid: "#a8bfd8", low: "#e8dfd2", sea: "#3d6688", rock: "#2a3038", tower: "#f4f4f4", stripe: "#c23b3b", beam: "#fffbe6", sun: "#fff6d8" }, 0.06);
        const { w, h, p } = s;
        s.hz = h * 0.66; s.lx = w * 0.74; s.th = h * 0.36; s.ly = s.hz - h * 0.04 - s.th;
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.5, p.mid], [0.66, p.low], [0.66, p.sea], [1, mix(p.sea, "#000000", 0.4)]]);
          if (s.dark) staticStars(c, s, 140, 0.55);
          glow(c, w * 0.2, h * 0.22, h * 0.2, p.sun, s.dark ? 0.18 : 0.4); disc(c, w * 0.2, h * 0.22, h * 0.032, rgba(p.sun, 0.92));
          // rocks and the tower
          c.fillStyle = p.rock; c.beginPath(); c.moveTo(w * 0.58, s.hz + h * 0.02);
          for (let k = 0; k <= 20; k++) { const u = k / 20; c.lineTo(w * 0.58 + u * w * 0.42, s.hz - h * 0.045 * Math.sin(u * Math.PI) - rand(0, h * 0.012)); }
          c.lineTo(w, s.hz + h * 0.03); c.closePath(); c.fill();
          const bw = s.th * 0.16, tw = s.th * 0.1, base = s.hz - h * 0.04;
          c.save(); c.beginPath(); c.moveTo(s.lx - bw / 2, base); c.lineTo(s.lx - tw / 2, s.ly); c.lineTo(s.lx + tw / 2, s.ly); c.lineTo(s.lx + bw / 2, base); c.closePath(); c.clip();
          c.fillStyle = p.tower; c.fillRect(s.lx - bw, s.ly, bw * 2, s.th);
          c.fillStyle = p.stripe; for (let k = 0; k < 4; k++) c.fillRect(s.lx - bw, s.ly + s.th * (0.12 + k * 0.22), bw * 2, s.th * 0.1);
          c.fillStyle = "rgba(0, 0, 0, 0.25)"; c.fillRect(s.lx, s.ly, bw, s.th);
          c.restore();
          c.fillStyle = mix(p.rock, p.tower, 0.2); c.fillRect(s.lx - tw * 0.8, s.ly - s.th * 0.02, tw * 1.6, s.th * 0.03);
          c.fillStyle = p.rock; c.fillRect(s.lx - tw * 0.55, s.ly - s.th * 0.1, tw * 1.1, s.th * 0.02); c.beginPath(); c.moveTo(s.lx - tw * 0.6, s.ly - s.th * 0.1); c.lineTo(s.lx, s.ly - s.th * 0.16); c.lineTo(s.lx + tw * 0.6, s.ly - s.th * 0.1); c.fill();
        });
        s.glints = Array.from({ length: 90 }, () => ({ x: rand(0, w), y: rand(s.hz + 3, h), l: rand(8, 30) * s.px, ph: rand(0, TAU) }));
      },
      draw(ctx, s, t) {
        const { w, h, p, lx, ly, th } = s;
        ctx.drawImage(s.bg, 0, 0);
        const ey = ly - th * 0.05, ang = t * 0.5, facing = Math.cos(ang), side = Math.sin(ang);
        // the beam sweeps around: long and thin when side on, a bright flash when it points at us
        ctx.globalCompositeOperation = "lighter";
        for (const dir of [1, -1]) {
          const len = w * 0.9 * Math.abs(side * dir > 0 ? side : 0) + w * 0.02;
          if (len < w * 0.03) continue;
          const spread = h * (0.03 + 0.05 * Math.abs(facing));
          const g = ctx.createLinearGradient(lx, ey, lx + dir * len, ey);
          g.addColorStop(0, rgba(p.beam, s.dark ? 0.5 : 0.35)); g.addColorStop(1, rgba(p.beam, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx, ey - 2 * s.px); ctx.lineTo(lx + dir * len, ey - spread); ctx.lineTo(lx + dir * len, ey + spread); ctx.lineTo(lx, ey + 2 * s.px); ctx.closePath(); ctx.fill();
        }
        glow(ctx, lx, ey, th * (0.15 + 0.5 * Math.max(0, facing) ** 4), p.beam, 0.9);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = rgba(s.dark ? "#cfd8f0" : "#ffffff", s.dark ? 0.3 : 0.5);
        for (const gl of s.glints) { ctx.globalAlpha = Math.max(0, Math.sin(t * 0.9 + gl.ph)) * 0.6; ctx.fillRect(gl.x + Math.sin(t * 0.4 + gl.ph) * 6 * s.px, gl.y, gl.l, 1.2 * s.px); }
        ctx.globalAlpha = 1;
      },
    },

    /* ---------------------------------------------------------- campfire */
    campfire: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#03040a", mid: "#0c1222", low: "#1a1e2c", trees: "#020306", ground: "#0b0a0c", log: "#3a2416" },
          { top: "#2a2f5e", mid: "#6a5a8a", low: "#d4917a", trees: "#141320", ground: "#2a2026", log: "#5a3a24" }, 0.08);
        const { w, h, p } = s;
        s.fx = w * 0.5; s.fy = h * 0.86; s.fs = Math.min(w, h) * 0.13;
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.6, p.mid], [1, p.low]]);
          staticStars(c, s, 180, 0.65);
          c.drawImage(forestStrip(w, h * 0.42, p.trees, 26, 0.55, 1, s.px), 0, h * 0.5);
          c.fillStyle = p.ground; c.fillRect(0, h * 0.84, w, h * 0.16);
        });
        s.sparks = [];
        s.tongues = Array.from({ length: 9 }, (_, i) => ({ x: (i - 4) / 4, hgt: rand(0.6, 1.1) * (1 - Math.abs(i - 4) / 7), ph: rand(0, TAU), sp: rand(5, 9) }));
      },
      draw(ctx, s, t, dt) {
        const { p, fx, fy, fs } = s;
        ctx.drawImage(s.bg, 0, 0);
        const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 4.3);
        glow(ctx, fx, fy, fs * 5, "#ff8a3d", 0.28 * fl, 0.55);
        glow(ctx, fx, fy - fs * 0.3, fs * 2.4, "#ffb35a", 0.3 * fl);
        ctx.strokeStyle = p.log; ctx.lineWidth = fs * 0.14; ctx.lineCap = "round";
        for (const [a, b] of [[-0.9, 0.5], [0.9, 0.5], [-0.5, -0.1]]) { ctx.beginPath(); ctx.moveTo(fx + a * fs, fy + fs * 0.12); ctx.lineTo(fx - a * fs * 0.3, fy - fs * 0.05 * b); ctx.stroke(); }
        ctx.lineCap = "butt";
        ctx.globalCompositeOperation = "lighter";
        for (const [scale, col, a] of [[1, "#ff5a1f", 0.55], [0.72, "#ff9a2e", 0.6], [0.45, "#ffe08a", 0.7]]) {
          for (const tg of s.tongues) {
            const H = fs * 1.5 * tg.hgt * scale * (0.8 + 0.2 * Math.sin(t * tg.sp + tg.ph)), bx = fx + tg.x * fs * 0.55 * scale, sway = Math.sin(t * tg.sp * 0.7 + tg.ph) * fs * 0.12;
            const wd = fs * 0.22 * scale;
            ctx.fillStyle = rgba(col, a * fl); ctx.beginPath(); ctx.moveTo(bx - wd, fy);
            ctx.quadraticCurveTo(bx - wd * 1.1, fy - H * 0.5, bx + sway, fy - H);
            ctx.quadraticCurveTo(bx + wd * 1.1, fy - H * 0.5, bx + wd, fy); ctx.closePath(); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = "source-over";
        if (Math.random() < dt * 14) s.sparks.push({ x: fx + rand(-0.4, 0.4) * fs, y: fy - fs * 0.5, vx: rand(-15, 15), vy: rand(-90, -40), life: 0, ph: rand(0, TAU) });
        s.sparks = s.sparks.filter((q) => (q.life += dt) < 3.5);
        for (const q of s.sparks) {
          q.x += (q.vx + Math.sin(t * 3 + q.ph) * 20) * dt * s.px; q.y += q.vy * dt * s.px;
          ctx.fillStyle = rgba("#ffcf6b", 1 - q.life / 3.5); ctx.fillRect(q.x, q.y, 2 * s.px, 2 * s.px);
        }
      },
    },

    /* ---------------------------------------------------------- black hole */
    blackhole: {
      lowRes: 1,
      init(s) {
        const { w, h } = s;
        s.cx = w * 0.5; s.cy = h * 0.5; s.R = Math.min(w, h) * 0.11;
        s.bg = still(s, (c) => { c.fillStyle = s.dark ? "#020206" : "#07081a"; c.fillRect(0, 0, w, h); staticStars(c, s, 260, 1); });
        const hot = s.colors[0] || "#ffb35a";
        s.parts = Array.from({ length: 900 }, () => { const r = s.R * (1.5 + Math.pow(rand(0, 1), 1.6) * 3.2); return { r, a: rand(0, TAU), c: Math.random() < 0.7 ? mix("#ffb35a", "#fff1d6", rand(0, 1)) : mix(hot, "#ffffff", 0.3), sz: rand(0.6, 2) * s.px }; });
      },
      draw(ctx, s, t) {
        const { cx, cy, R } = s, tilt = 0.22;
        ctx.drawImage(s.bg, 0, 0);
        glow(ctx, cx, cy, R * 6, "#ff9a3d", 0.12, 0.5);
        ctx.globalCompositeOperation = "lighter";
        const drawDisk = (back) => {
          for (const q of s.parts) {
            const a = q.a + t * 0.9 * Math.pow(s.R * 1.5 / q.r, 1.5), y = Math.sin(a);
            if ((y < 0) !== back) continue;
            const x = cx + Math.cos(a) * q.r, yy = cy + y * q.r * tilt;
            const doppler = 0.55 + 0.45 * Math.cos(a); // the side coming toward us is brighter
            ctx.globalAlpha = 0.35 + 0.6 * doppler; ctx.fillStyle = q.c; ctx.fillRect(x, yy, q.sz, q.sz);
          }
          ctx.globalAlpha = 1;
        };
        drawDisk(true);
        // the far side of the disk, bent over the top and under the bottom by gravity
        for (const sgn of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            ctx.strokeStyle = rgba("#ffc27a", [0.35, 0.18, 0.1][k]); ctx.lineWidth = R * [0.1, 0.25, 0.45][k];
            ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.35, R * (sgn < 0 ? 1.25 : 0.9), 0, sgn < 0 ? Math.PI : 0, sgn < 0 ? TAU : Math.PI); ctx.stroke();
          }
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
        ctx.strokeStyle = rgba("#fff1d6", 0.85); ctx.lineWidth = 1.5 * s.px; ctx.beginPath(); ctx.arc(cx, cy, R * 1.02, 0, TAU); ctx.stroke();
        ctx.globalCompositeOperation = "lighter";
        drawDisk(false);
        ctx.globalCompositeOperation = "source-over";
      },
    },

    /* ---------------------------------------------------------- above the clouds */
    cloudsea: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#070b1d", mid: "#24305a", low: "#c0708a", sun: "#ffd2a0", c1: "#5a6690", c2: "#3a4470", c3: "#262e52", peak: "#151a30" },
          { top: "#3d7ad0", mid: "#9cc6ee", low: "#ffe2c4", sun: "#fff3d0", c1: "#ffffff", c2: "#f1f4fa", c3: "#e2e8f2", peak: "#7f8aa6" }, 0.06);
        const { w, h, p } = s;
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.4, p.mid], [0.62, p.low], [1, p.low]]);
          if (s.dark) staticStars(c, s, 100, 0.35);
          glow(c, w * 0.55, h * 0.56, h * 0.5, p.sun, s.dark ? 0.35 : 0.6); disc(c, w * 0.55, h * 0.56, h * 0.05, rgba(p.sun, 0.95));
          c.drawImage(ridgeStrip(w, 0, h * 0.3, p.peak, 1.1, 20, true), 0, h * 0.45);
        });
        const strip = (color, shade, y0, rows, rr) => offscreen(w, h - y0 + rr * 2, (c, W, H) => {
          c.translate(0, rr * 2); // room above for the tallest puffs
          const top = curve(5, 1.5);
          for (let row = 0; row < rows; row++) for (let x = -rr; x < W + rr; x += rr * rand(0.35, 0.9)) {
            const r = rr * rand(0.45, 1.25) * (row ? 1 : 0.8 + 0.5 * (top(x / W) + 1) / 2), y = rr * 0.8 + row * rr * 0.5 + rand(-rr * 0.35, rr * 0.35) - (row ? 0 : (top(x / W) + 1) * rr * 0.4);
            for (const dx of [0, -W, W]) {
              if (x + dx < -r || x + dx > W + r) continue;
              const g = c.createLinearGradient(0, y - r, 0, y + r);
              g.addColorStop(0, color); g.addColorStop(0.55, color); g.addColorStop(1, shade);
              c.fillStyle = g; c.beginPath(); c.arc(x + dx, y, r, 0, TAU); c.fill();
            }
          }
          c.fillStyle = shade; c.fillRect(0, rr * 0.8 + rows * rr * 0.5, W, H);
        });
        const m = Math.min(w, h);
        s.layers = [[p.c3, mix(p.c3, p.top, 0.2), 0.6, 0.06], [p.c2, mix(p.c2, p.top, 0.25), 0.7, 0.09], [p.c1, mix(p.c1, p.top, 0.3), 0.8, 0.13]].map(([a, b, y, r], i) => ({ img: strip(a, b, h * y, 4, m * r), y: h * y - m * r * 2, v: 4 + i * 8 }));
      },
      draw(ctx, s, t) {
        ctx.drawImage(s.bg, 0, 0);
        for (const L of s.layers) tile(ctx, L.img, t * L.v * s.px, L.y + Math.sin(t * 0.2 + L.v) * 3 * s.px);
      },
    },

    /* ---------------------------------------------------------- hot air balloons */
    balloons: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#0c1230", mid: "#3a3a6a", low: "#c9867a", far: "#3a3458", near: "#1a1830", sun: "#ffd6a0" },
          { top: "#6aaee6", mid: "#bfdcf2", low: "#fde6c8", far: "#a7bfa3", near: "#5f8a5a", sun: "#fff3c8" }, 0.06);
        const { w, h, p } = s;
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.5, p.mid], [0.85, p.low], [1, p.low]]);
          if (s.dark) staticStars(c, s, 60, 0.35);
          glow(c, w * 0.3, h * 0.78, h * 0.4, p.sun, s.dark ? 0.3 : 0.5);
        });
        s.far = ridgeStrip(w, 0, h * 0.3, p.far, 1.8, 7, false);
        s.near = ridgeStrip(w, 0, h * 0.22, p.near, 2, 6, false);
        const pal = [["#e8505b", "#f9d56e"], ["#4a90e2", "#ffffff"], ["#f39c12", "#8e44ad"], ["#2ecc71", "#f1c40f"], ["#e74c3c", "#ecf0f1"], ["#9b59b6", "#f8c471"], ["#1abc9c", "#e67e22"]];
        s.balloons = Array.from({ length: 8 }, (_, i) => ({ x: rand(0, w), y: rand(0.15, 0.7) * h, d: rand(0.3, 1), c: pal[i % pal.length], ph: rand(0, TAU) })).sort((a, b) => a.d - b.d);
      },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.drawImage(s.bg, 0, 0);
        tile(ctx, s.far, t * 3 * s.px, h - s.far.height - h * 0.1);
        const drawOne = (b) => {
          b.x += (6 + b.d * 10) * dt * s.px; b.y -= 1.5 * b.d * dt * s.px;
          const R = Math.min(w, h) * 0.05 * (0.4 + b.d);
          if (b.x - R > w) { b.x = -R * 2; b.y = rand(0.2, 0.7) * h; }
          const x = b.x, y = b.y + Math.sin(t * 0.4 + b.ph) * 8 * s.px;
          ctx.save(); ctx.globalAlpha = 0.55 + b.d * 0.45;
          ctx.beginPath(); ctx.moveTo(x, y + R * 1.25); ctx.bezierCurveTo(x - R * 1.35, y + R * 0.5, x - R * 1.1, y - R * 1.1, x, y - R * 1.05); ctx.bezierCurveTo(x + R * 1.1, y - R * 1.1, x + R * 1.35, y + R * 0.5, x, y + R * 1.25); ctx.closePath();
          ctx.fillStyle = b.c[0]; ctx.fill(); ctx.clip();
          ctx.fillStyle = b.c[1]; for (let k = -2; k <= 2; k += 2) { ctx.beginPath(); ctx.ellipse(x + k * R * 0.32, y, R * 0.13, R * 1.3, 0, 0, TAU); ctx.fill(); }
          const sh = ctx.createLinearGradient(x - R, 0, x + R, 0); sh.addColorStop(0, "rgba(255, 255, 255, 0.18)"); sh.addColorStop(1, "rgba(0, 0, 0, 0.3)"); ctx.fillStyle = sh; ctx.fillRect(x - R * 1.4, y - R * 1.2, R * 2.8, R * 2.6);
          ctx.restore(); ctx.save(); ctx.globalAlpha = 0.55 + b.d * 0.45;
          ctx.strokeStyle = "rgba(60, 40, 30, 0.8)"; ctx.lineWidth = 1 * s.px;
          ctx.beginPath(); ctx.moveTo(x - R * 0.3, y + R * 1.12); ctx.lineTo(x - R * 0.18, y + R * 1.55); ctx.moveTo(x + R * 0.3, y + R * 1.12); ctx.lineTo(x + R * 0.18, y + R * 1.55); ctx.stroke();
          ctx.fillStyle = "#6b4a2e"; ctx.fillRect(x - R * 0.2, y + R * 1.55, R * 0.4, R * 0.28);
          ctx.restore();
        };
        for (const b of s.balloons) if (b.d < 0.6) drawOne(b);
        tile(ctx, s.near, t * 8 * s.px, h - s.near.height);
        for (const b of s.balloons) if (b.d >= 0.6) drawOne(b);
      },
    },

    /* ---------------------------------------------------------- wind farm */
    windfarm: {
      lowRes: 1,
      init(s) {
        s.p = palette(s, { top: "#060b18", mid: "#16223c", low: "#2e3a58", far: "#1a2440", near: "#0b111e", pole: "#9aa3b8", sun: "#eef2ff" },
          { top: "#5ea7e6", mid: "#b8dcf2", low: "#f2f6ea", far: "#9fc28a", near: "#6a9c55", pole: "#ffffff", sun: "#fff6d0" }, 0.08);
        const { w, h, p } = s;
        s.bg = still(s, (c) => {
          skyPaint(c, s, [[0, p.top], [0.55, p.mid], [1, p.low]]);
          if (s.dark) staticStars(c, s, 120, 0.5);
          glow(c, w * 0.15, h * 0.2, h * 0.2, p.sun, s.dark ? 0.2 : 0.45); disc(c, w * 0.15, h * 0.2, h * 0.035, rgba(p.sun, 0.95));
          c.drawImage(ridgeStrip(w, 0, h * 0.35, p.far, 1.8, 8, false), 0, h * 0.62);
        });
        s.near = ridgeStrip(w, 0, h * 0.25, p.near, 2.2, 5, false);
        const far = curve(8, 1.8);
        s.turbines = Array.from({ length: 11 }, (_, i) => { const d = i < 7 ? 0.35 : 1, x = rand(0.03, 0.97) * w; return { x, d, base: d < 1 ? h * 0.66 + ((1 - (far(x / w) + 1) / 2) * 0.75 + 0.05) * h * 0.35 * 0.8 : h * 0.83, ph: rand(0, TAU), sp: rand(0.6, 1.1) }; }).sort((a, b) => a.d - b.d);
        s.clouds = Array.from({ length: 5 }, () => ({ x: rand(0, w), y: h * rand(0.1, 0.35), r: rand(0.05, 0.1) * w, v: rand(5, 10) }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, p } = s;
        ctx.drawImage(s.bg, 0, 0);
        for (const c of s.clouds) {
          c.x += c.v * dt * s.px; if (c.x - c.r * 2 > w) c.x = -c.r * 2;
          ctx.fillStyle = rgba("#ffffff", s.dark ? 0.05 : 0.7);
          for (const [dx, dy, rr] of [[0, 0, 1], [0.8, 0.15, 0.75], [-0.8, 0.2, 0.7]]) { ctx.beginPath(); ctx.ellipse(c.x + dx * c.r, c.y + dy * c.r * 0.5, c.r * rr * 0.6, c.r * rr * 0.34, 0, 0, TAU); ctx.fill(); }
        }
        const turbine = (tb) => {
          const H = h * 0.42 * tb.d, x = tb.x, top = tb.base - H, L = H * 0.48;
          ctx.strokeStyle = rgba(p.pole, tb.d < 1 ? 0.55 : 0.95); ctx.fillStyle = ctx.strokeStyle; ctx.lineCap = "round";
          ctx.lineWidth = Math.max(1, H * 0.025); ctx.beginPath(); ctx.moveTo(x, tb.base); ctx.lineTo(x, top); ctx.stroke();
          ctx.lineWidth = Math.max(1, H * 0.018);
          for (let k = 0; k < 3; k++) { const a = t * tb.sp + tb.ph + k * TAU / 3; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + Math.cos(a) * L, top + Math.sin(a) * L); ctx.stroke(); }
          ctx.beginPath(); ctx.arc(x, top, H * 0.022, 0, TAU); ctx.fill();
          ctx.lineCap = "butt";
          if (s.dark && Math.sin(t * 1.6 + tb.ph * 0.2) > 0.75) glow(ctx, x, top - H * 0.02, 8 * s.px * (0.5 + tb.d), "#ff3b3b", 0.9);
        };
        for (const tb of s.turbines) if (tb.d < 1) turbine(tb);
        tile(ctx, s.near, 0, h - s.near.height);
        for (const tb of s.turbines) if (tb.d >= 1) turbine(tb);
      },
    },
  };
}

export const SCENES2 = [
  ["waterfall", "Waterfall"], ["cabin", "Winter cabin"], ["volcano", "Volcano"], ["tropical", "Tropical beach"], ["northern", "Northern lights"],
  ["train", "Night train"], ["lighthouse", "Lighthouse"], ["campfire", "Campfire"], ["blackhole", "Black hole"], ["cloudsea", "Above the clouds"],
  ["balloons", "Hot air balloons"], ["windfarm", "Wind farm"],
];
