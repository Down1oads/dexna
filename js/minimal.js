// Minimal black backgrounds: pure black with a few quiet white or grey details. They stay black in
// light themes too. Dust in a shaft of light, an eclipse, a dot grid with a wandering spotlight, a
// single wave line, sonar rings, a sparse night sky, drifting lines, and small orbits.
import { rand, TAU, glow } from "./scenes.js";

const black = (ctx, s) => { ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, s.w, s.h); };
const white = (a) => `rgba(255, 255, 255, ${a})`;

export function makeMinimal() {
  return {
    /* ---------------------------------------------------------- dust in a shaft of light */
    dust: {
      init(s) { s.motes = Array.from({ length: Math.round((s.w * s.h) / 14000) }, () => ({ x: rand(0, s.w), y: rand(0, s.h), r: rand(0.4, 1.6) * s.px, a: rand(0.15, 0.7), ph: rand(0, TAU), v: rand(3, 9) })); },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        black(ctx, s);
        // a very faint diagonal shaft of light; motes inside it shine brighter
        const sx = w * 0.62, sw = w * 0.22, lean = h * 0.45;
        const g = ctx.createLinearGradient(sx - sw, 0, sx + sw, 0);
        g.addColorStop(0, white(0)); g.addColorStop(0.5, white(0.035 + 0.01 * Math.sin(t * 0.3))); g.addColorStop(1, white(0));
        ctx.save(); ctx.transform(1, 0, -lean / h, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(sx - sw, 0, sw * 2, h); ctx.restore(); // the soft edges lean with the shaft
        for (const m of s.motes) {
          m.y -= m.v * 0.3 * dt * s.px; m.x += (Math.sin(t * 0.2 + m.ph) * 4 + 2) * dt * s.px;
          if (m.y < -4) m.y = h + 4; if (m.x > w + 4) m.x = -4;
          const cx = sx - lean * (m.y / h), inBeam = Math.max(0, 1 - Math.abs(m.x - cx) / sw);
          ctx.fillStyle = white(Math.min(1, m.a * (0.35 + inBeam * 1.4) * (0.75 + 0.25 * Math.sin(t * 1.3 + m.ph))));
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
        }
      },
    },

    /* ---------------------------------------------------------- eclipse */
    eclipse: {
      init(s) { s.stars = Array.from({ length: 60 }, () => ({ x: rand(0, s.w), y: rand(0, s.h), a: rand(0.1, 0.5), r: rand(0.4, 1.1) * s.px })); },
      draw(ctx, s, t) {
        const { w, h } = s, cx = w / 2, cy = h * 0.46, R = Math.min(w, h) * 0.2;
        black(ctx, s);
        for (const st of s.stars) { ctx.fillStyle = white(st.a); ctx.fillRect(st.x, st.y, st.r * 1.6, st.r * 1.6); }
        const breathe = 0.85 + 0.15 * Math.sin(t * 0.4);
        glow(ctx, cx, cy, R * 2.4, "#ffffff", 0.16 * breathe);
        glow(ctx, cx, cy, R * 1.45, "#ffffff", 0.35 * breathe);
        ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
        ctx.strokeStyle = white(0.85); ctx.lineWidth = 1.4 * s.px; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        // the bright point of light sliding slowly around the rim
        const a = t * 0.08 - 0.8, bx = cx + Math.cos(a) * R, by = cy + Math.sin(a) * R;
        glow(ctx, bx, by, R * 0.35, "#ffffff", 0.55); glow(ctx, bx, by, R * 0.08, "#ffffff", 1);
      },
    },

    /* ---------------------------------------------------------- dot grid with a spotlight */
    dotgrid: {
      draw(ctx, s, t) {
        const { w, h } = s, gap = 26 * s.px, R = Math.min(w, h) * 0.38;
        black(ctx, s);
        const lx = s.mouse ? s.mouse.x : w * (0.5 + 0.32 * Math.sin(t * 0.13)), ly = s.mouse ? s.mouse.y : h * (0.5 + 0.3 * Math.sin(t * 0.19 + 1));
        s.lx = s.lx == null ? lx : s.lx + (lx - s.lx) * 0.08; s.ly = s.ly == null ? ly : s.ly + (ly - s.ly) * 0.08;
        for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) {
          const d = Math.hypot(x - s.lx, y - s.ly), k = Math.max(0, 1 - d / R) ** 2;
          ctx.fillStyle = white(0.2 + k * 0.7); ctx.beginPath(); ctx.arc(x, y, (1.1 + k * 1.1) * s.px, 0, TAU); ctx.fill();
        }
      },
    },

    /* ---------------------------------------------------------- one wave line */
    waveline: {
      draw(ctx, s, t) {
        const { w, h } = s, cy = h / 2, A = h * 0.12;
        black(ctx, s);
        const y = (x, ph) => cy + A * (Math.sin(x / w * 5 + t * 0.35 + ph) * 0.6 + Math.sin(x / w * 11 - t * 0.22 + ph * 2) * 0.25 + Math.sin(x / w * 2 + t * 0.12) * 0.4) * Math.sin(Math.PI * x / w);
        for (const [ph, a, lw] of [[0.6, 0.12, 1], [0.3, 0.22, 1], [0, 0.9, 1.6]]) {
          ctx.strokeStyle = white(a); ctx.lineWidth = lw * s.px; ctx.beginPath();
          for (let x = 0; x <= w; x += 4 * s.px) ctx.lineTo(x, y(x, ph));
          ctx.stroke();
        }
      },
    },

    /* ---------------------------------------------------------- sonar rings */
    sonar: {
      draw(ctx, s, t) {
        const { w, h } = s, cx = w / 2, cy = h / 2, max = Math.hypot(w, h) * 0.55, period = 2.6;
        black(ctx, s);
        ctx.lineWidth = 1 * s.px;
        for (let k = 0; k < 8; k++) {
          const f = ((t / period + k) % 8) / 8, r = f * max;
          ctx.strokeStyle = white(0.45 * (1 - f) ** 1.5); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
        }
        glow(ctx, cx, cy, 14 * s.px, "#ffffff", 0.5 + 0.3 * Math.sin(t * 2.4));
        ctx.fillStyle = white(0.95); ctx.beginPath(); ctx.arc(cx, cy, 2 * s.px, 0, TAU); ctx.fill();
      },
    },

    /* ---------------------------------------------------------- a sparse night sky */
    ministars: {
      init(s) { s.stars = Array.from({ length: Math.round((s.w * s.h) / 9000) }, () => ({ x: rand(0, s.w), y: rand(0, s.h), r: rand(0.6, 1.6) * s.px, a: rand(0.35, 1), ph: rand(0, TAU), sp: rand(0.4, 1.6) })); s.shoot = null; },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        black(ctx, s);
        for (const st of s.stars) { ctx.fillStyle = white(st.a * (0.55 + 0.45 * Math.sin(t * st.sp + st.ph))); ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.fill(); }
        if (!s.shoot && Math.random() < dt * 0.12) s.shoot = { x: rand(w * 0.1, w * 0.7), y: rand(0, h * 0.4), a: rand(0.35, 0.6), life: 0 };
        if (s.shoot) {
          const q = s.shoot, L = 140 * s.px, d = q.life * 500 * s.px, x = q.x + Math.cos(q.a) * d, y = q.y + Math.sin(q.a) * d;
          const g = ctx.createLinearGradient(x, y, x - Math.cos(q.a) * L, y - Math.sin(q.a) * L);
          g.addColorStop(0, white(0.9 * (1 - q.life))); g.addColorStop(1, white(0));
          ctx.strokeStyle = g; ctx.lineWidth = 1.3 * s.px; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(q.a) * L, y - Math.sin(q.a) * L); ctx.stroke();
          q.life += dt * 1.1; if (q.life > 1) s.shoot = null;
        }
      },
    },

    /* ---------------------------------------------------------- drifting lines */
    driftlines: {
      init(s) { s.lines = Array.from({ length: Math.round(s.w / (55 * s.px)) }, () => ({ x: rand(0, s.w), a: rand(0.04, 0.16), v: rand(2, 8), pulse: rand(0, 1), ps: rand(0.04, 0.12) })); },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        black(ctx, s);
        ctx.lineWidth = 1 * s.px;
        for (const l of s.lines) {
          l.x -= l.v * dt * s.px; if (l.x < -2) l.x = w + 2;
          ctx.strokeStyle = white(l.a); ctx.beginPath(); ctx.moveTo(l.x, 0); ctx.lineTo(l.x, h); ctx.stroke();
          // a short light running down the line now and then
          l.pulse += l.ps * dt; if (l.pulse > 1.6) { l.pulse = 0; l.ps = rand(0.04, 0.12); }
          if (l.pulse < 1) {
            const y = l.pulse * h * 1.2 - h * 0.1, L = h * 0.12, g = ctx.createLinearGradient(0, y - L, 0, y);
            g.addColorStop(0, white(0)); g.addColorStop(1, white(0.6));
            ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(l.x, y - L); ctx.lineTo(l.x, y); ctx.stroke();
          }
        }
      },
    },

    /* ---------------------------------------------------------- orbits */
    orbits2: {
      init(s) { s.planets = [0.12, 0.2, 0.29, 0.39, 0.5].map((r, i) => ({ r, ph: rand(0, TAU), sz: [1.6, 2.2, 2.6, 1.8, 3][i] })); },
      draw(ctx, s, t) {
        const { w, h } = s, cx = w / 2, cy = h / 2, m = Math.min(w, h), tilt = 0.42;
        black(ctx, s);
        ctx.lineWidth = 1 * s.px;
        for (const p of s.planets) {
          const R = p.r * m * 1.25;
          ctx.strokeStyle = white(0.1); ctx.beginPath(); ctx.ellipse(cx, cy, R, R * tilt, 0, 0, TAU); ctx.stroke();
          const a = p.ph + t * 0.35 / Math.pow(p.r * 6, 1.5), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * tilt;
          ctx.fillStyle = white(0.9); ctx.beginPath(); ctx.arc(x, y, p.sz * s.px, 0, TAU); ctx.fill();
        }
        glow(ctx, cx, cy, 30 * s.px, "#ffffff", 0.25);
        ctx.fillStyle = white(1); ctx.beginPath(); ctx.arc(cx, cy, 4 * s.px, 0, TAU); ctx.fill();
      },
    },
  };
}

export const MINIMAL = [
  ["dust", "Dust (black)"], ["eclipse", "Eclipse (black)"], ["dotgrid", "Dot grid (black)"], ["waveline", "Wave line (black)"],
  ["sonar", "Sonar (black)"], ["ministars", "Night (black)"], ["driftlines", "Drift lines (black)"], ["orbits2", "Orbits (black)"],
];
