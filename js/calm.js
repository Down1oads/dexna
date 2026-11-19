// Calm backgrounds: very little happens, slowly, in low contrast, so they never pull your eye away from
// the code. They use the theme's own colours: graph paper, paper, a vignette, a clock showing the time,
// today's moon phase, a zen garden, a breathing guide, a blueprint and terrazzo. The ones that never
// change are drawn once and then left alone.
import { rand, TAU, mix, rgba, glow, offscreen } from "./scenes.js";

const acc = (s) => s.colors[0] || "#4c8dff";
const fg = (s) => s.fg || (s.dark ? "#ffffff" : "#000000");

export function makeCalm() {
  return {
    /* ---------------------------------------------------------- graph paper */
    graphpaper: {
      draw(ctx, s, t) {
        const { w, h } = s, gap = 22 * s.px, off = (t * 1.2 * s.px) % (gap * 5);
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1 * s.px;
        for (const [step, a] of [[gap, s.dark ? 0.045 : 0.06], [gap * 5, s.dark ? 0.09 : 0.11]]) {
          ctx.strokeStyle = rgba(mix(fg(s), acc(s), 0.35), a); ctx.beginPath();
          for (let x = -step + (off % step); x < w; x += step) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); }
          for (let y = -step + (off % step); y < h; y += step) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); }
          ctx.stroke();
        }
      },
    },

    /* ---------------------------------------------------------- paper */
    paper: {
      init(s) {
        s.done = false;
        // a fine grain, painted once and tiled
        s.grain = offscreen(256, 256, (c) => { const img = c.createImageData(256, 256); for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = Math.random() * 26; } c.putImageData(img, 0, 0); });
      },
      draw(ctx, s) {
        if (s.done) return; // nothing moves: paint once
        s.done = true;
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        const pat = ctx.createPattern(s.grain, "repeat");
        ctx.globalAlpha = s.dark ? 0.5 : 0.65; ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
        glow(ctx, w * 0.5, h * 0.3, Math.max(w, h) * 0.5, s.dark ? "#ffffff" : "#fff6e0", s.dark ? 0.04 : 0.12);
      },
    },

    /* ---------------------------------------------------------- vignette */
    vignette: {
      lowRes: 0.2,
      draw(ctx, s, t) {
        const { w, h } = s, R = Math.hypot(w, h) / 2, b = 0.9 + 0.1 * Math.sin(t * 0.12);
        ctx.clearRect(0, 0, w, h);
        glow(ctx, w / 2, h * 0.45, R * 0.9, acc(s), (s.dark ? 0.12 : 0.1) * b);
        const g = ctx.createRadialGradient(w / 2, h / 2, R * 0.45, w / 2, h / 2, R);
        g.addColorStop(0, "rgba(0, 0, 0, 0)"); g.addColorStop(1, s.dark ? "rgba(0, 0, 0, 0.55)" : "rgba(40, 40, 60, 0.18)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      },
    },
    /* ---------------------------------------------------------- a clock showing the time */
    clock: {
      draw(ctx, s) {
        const { w, h } = s, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.34, c = fg(s), now = new Date();
        ctx.clearRect(0, 0, w, h);
        ctx.lineCap = "round";
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * TAU, big = i % 5 === 0, r0 = R * (big ? 0.88 : 0.93);
          ctx.strokeStyle = rgba(c, big ? 0.18 : 0.08); ctx.lineWidth = (big ? 2.5 : 1.2) * s.px;
          ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); ctx.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); ctx.stroke();
        }
        const sec = now.getSeconds() + now.getMilliseconds() / 1000, min = now.getMinutes() + sec / 60, hr = (now.getHours() % 12) + min / 60;
        const hand = (frac, len, wd, col, a) => { const an = frac * TAU; ctx.strokeStyle = rgba(col, a); ctx.lineWidth = wd * s.px; ctx.beginPath(); ctx.moveTo(cx - Math.sin(an) * len * 0.12, cy + Math.cos(an) * len * 0.12); ctx.lineTo(cx + Math.sin(an) * len, cy - Math.cos(an) * len); ctx.stroke(); };
        hand(hr / 12, R * 0.5, 5, c, 0.22); hand(min / 60, R * 0.75, 3.5, c, 0.22); hand(sec / 60, R * 0.82, 1.4, acc(s), 0.4);
        ctx.fillStyle = rgba(acc(s), 0.45); ctx.beginPath(); ctx.arc(cx, cy, 4 * s.px, 0, TAU); ctx.fill();
        ctx.lineCap = "butt";
      },
    },

    /* ---------------------------------------------------------- today's moon phase */
    moonphase: {
      init(s) { s.drawn = null; },
      draw(ctx, s) {
        const day = Math.floor(Date.now() / 3.6e6); // redraw once an hour
        if (s.drawn === day) return;
        s.drawn = day;
        const { w, h } = s, R = Math.min(w, h) * 0.26, cx = w * 0.7, cy = h * 0.45, c = fg(s);
        // days since a known new moon, as a fraction of the 29.53-day cycle
        const age = (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % 29.530588853 + 29.530588853) % 29.530588853, f = age / 29.530588853;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = rgba(c, s.dark ? 0.05 : 0.1); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); // the dark part, faintly
        // the lit part: a half disc on the lit side, plus or minus an ellipse to the terminator
        const waxing = f < 0.5, k = Math.cos(f * TAU), lit = s.dark ? rgba(c, 0.2) : "rgba(255, 255, 255, 0.95)";
        ctx.fillStyle = lit; ctx.beginPath();
        ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, !waxing);
        ctx.ellipse(cx, cy, Math.abs(k) * R, R, 0, Math.PI / 2, -Math.PI / 2, (k < 0) !== waxing); // a crescent curves back on the lit side, a gibbous moon bulges past the middle
        ctx.fill();
        ctx.strokeStyle = rgba(c, 0.12); ctx.lineWidth = 1 * s.px; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        const names = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
        const name = names[Math.floor((f * 8 + 0.5) % 8)], pct = Math.round((1 - Math.cos(f * TAU)) * 50);
        ctx.fillStyle = rgba(c, 0.32); ctx.textAlign = "center"; ctx.font = `${14 * s.px}px "IBM Plex Sans", system-ui, sans-serif`;
        ctx.fillText(`${name} · ${pct}% lit`, cx, cy + R + 30 * s.px); ctx.textAlign = "start";
      },
    },

    /* ---------------------------------------------------------- zen garden */
    zen: {
      init(s) { const m = Math.min(s.w, s.h); s.stones = [[0.24, 0.32, 0.05], [0.7, 0.62, 0.075], [0.78, 0.25, 0.035]].map(([x, y, r]) => ({ x: x * s.w, y: y * s.h, r: r * m * rand(0.9, 1.1) })); s.done = false; },
      draw(ctx, s) {
        if (s.done) return;
        s.done = true;
        const { w, h } = s, c = fg(s), gap = 14 * s.px;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = rgba(c, s.dark ? 0.07 : 0.09); ctx.lineWidth = 1.2 * s.px;
        // raked lines: they bend around each stone and leave a ring of circles around it
        for (let y0 = -gap; y0 < h + gap; y0 += gap) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 6 * s.px) {
            let y = y0 + Math.sin(x * 0.004) * 6 * s.px;
            for (const st of s.stones) { const dx = x - st.x, dy = y - st.y, d = Math.hypot(dx, dy), ring = st.r * 2.6; if (d < ring) y += (dy >= 0 ? 1 : -1) * (ring - d) * 0.9 * Math.cos((dx / ring) * Math.PI / 2); }
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        for (const st of s.stones) {
          for (let k = 1; k <= 5; k++) { ctx.beginPath(); ctx.arc(st.x, st.y, st.r * (1.15 + k * 0.28), 0, TAU); ctx.stroke(); }
          ctx.fillStyle = rgba(s.dark ? "#000000" : "#000000", s.dark ? 0.25 : 0.06); ctx.beginPath(); ctx.ellipse(st.x + st.r * 0.15, st.y + st.r * 0.2, st.r * 1.05, st.r * 0.85, 0.3, 0, TAU); ctx.fill();
          ctx.fillStyle = rgba(mix(c, acc(s), 0.2), s.dark ? 0.16 : 0.18); ctx.beginPath(); ctx.ellipse(st.x, st.y, st.r, st.r * 0.82, 0.3, 0, TAU); ctx.fill();
        }
      },
    },

    /* ---------------------------------------------------------- breathing guide */
    breathe: {
      draw(ctx, s, t) {
        const { w, h } = s, cx = w / 2, cy = h / 2, m = Math.min(w, h), c = acc(s);
        // box breathing: in 4 s, hold 4 s, out 4 s, hold 4 s (real seconds, whatever the speed slider says)
        const sec = (performance.now() / 1000) % 16, phase = Math.floor(sec / 4), p = (sec % 4) / 4, ease = (x) => 0.5 - 0.5 * Math.cos(x * Math.PI);
        const k = phase === 0 ? ease(p) : phase === 1 ? 1 : phase === 2 ? 1 - ease(p) : 0, r = m * (0.1 + 0.14 * k);
        ctx.clearRect(0, 0, w, h);
        glow(ctx, cx, cy, r * 2.2, c, s.dark ? 0.12 : 0.1);
        ctx.strokeStyle = rgba(c, 0.25); ctx.lineWidth = 1.5 * s.px; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = rgba(fg(s), 0.08); ctx.beginPath(); ctx.arc(cx, cy, m * 0.24, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, m * 0.1, 0, TAU); ctx.stroke();
        ctx.fillStyle = rgba(fg(s), 0.3); ctx.textAlign = "center"; ctx.font = `${15 * s.px}px "IBM Plex Sans", system-ui, sans-serif`;
        ctx.fillText(["Breathe in", "Hold", "Breathe out", "Hold"][phase], cx, cy + m * 0.3); ctx.textAlign = "start";
      },
    },

    /* ---------------------------------------------------------- blueprint */
    blueprint: {
      init(s) { s.done = false; },
      draw(ctx, s) {
        if (s.done) return;
        s.done = true;
        const { w, h } = s, c = acc(s), m = Math.min(w, h), line = (a) => { ctx.strokeStyle = rgba(c, a); };
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1 * s.px;
        line(0.05); ctx.beginPath(); for (let x = 0; x < w; x += 24 * s.px) { ctx.moveTo(x, 0); ctx.lineTo(x, h); } for (let y = 0; y < h; y += 24 * s.px) { ctx.moveTo(0, y); ctx.lineTo(w, y); } ctx.stroke();
        // a part drawn in front, side views and dimension lines
        const cx = w * 0.62, cy = h * 0.48, R = m * 0.22;
        line(0.22); ctx.lineWidth = 1.5 * s.px;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, R * 0.45, 0, TAU); ctx.stroke();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72, R * 0.08, 0, TAU); ctx.stroke(); }
        line(0.14); ctx.setLineDash([10 * s.px, 4 * s.px, 2 * s.px, 4 * s.px]); ctx.beginPath(); ctx.moveTo(cx - R * 1.3, cy); ctx.lineTo(cx + R * 1.3, cy); ctx.moveTo(cx, cy - R * 1.3); ctx.lineTo(cx, cy + R * 1.3); ctx.stroke(); ctx.setLineDash([]);
        const sx = w * 0.18, sw = R * 0.5;
        line(0.2); ctx.strokeRect(sx, cy - R, sw, R * 2); ctx.strokeRect(sx + sw * 0.25, cy - R * 0.45, sw * 0.5, R * 0.9);
        line(0.14); ctx.beginPath();
        const dim = (x1, y1, x2, y2) => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); const a = Math.atan2(y2 - y1, x2 - x1), L = 7 * s.px; for (const [x, y, d] of [[x1, y1, 1], [x2, y2, -1]]) { ctx.moveTo(x, y); ctx.lineTo(x + d * Math.cos(a - 0.4) * L, y + d * Math.sin(a - 0.4) * L); ctx.moveTo(x, y); ctx.lineTo(x + d * Math.cos(a + 0.4) * L, y + d * Math.sin(a + 0.4) * L); } };
        dim(cx - R, cy + R * 1.25, cx + R, cy + R * 1.25); dim(sx - 18 * s.px, cy - R, sx - 18 * s.px, cy + R); ctx.stroke();
        ctx.fillStyle = rgba(c, 0.25); ctx.font = `${12 * s.px}px "JetBrains Mono", monospace`; ctx.textAlign = "center";
        ctx.fillText("Ø 120.00", cx, cy + R * 1.25 - 6 * s.px); ctx.save(); ctx.translate(sx - 24 * s.px, cy); ctx.rotate(-Math.PI / 2); ctx.fillText("120.00", 0, 0); ctx.restore();
        ctx.textAlign = "start";
        line(0.18); ctx.strokeRect(w - m * 0.42, h - m * 0.16, m * 0.38, m * 0.12);
        ctx.fillText("DEXNA · PART 01 · SCALE 1:1", w - m * 0.4, h - m * 0.09);
      },
    },

    /* ---------------------------------------------------------- terrazzo */
    terrazzo: {
      init(s) { s.done = false; },
      draw(ctx, s) {
        if (s.done) return;
        s.done = true;
        const { w, h } = s, cols = [acc(s), s.colors[1] || acc(s), s.colors[2] || acc(s), fg(s)];
        ctx.clearRect(0, 0, w, h);
        const n = Math.round((w * h) / 2600);
        for (let i = 0; i < n; i++) {
          const x = rand(0, w), y = rand(0, h), r = (Math.random() < 0.08 ? rand(8, 16) : rand(2, 6)) * s.px, sides = 4 + Math.floor(rand(0, 4)), rot = rand(0, TAU);
          ctx.fillStyle = rgba(cols[i % cols.length], s.dark ? rand(0.07, 0.16) : rand(0.1, 0.2)); ctx.beginPath();
          for (let k = 0; k < sides; k++) { const a = rot + (k / sides) * TAU, rr = r * rand(0.6, 1.1); k ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          ctx.fill();
        }
      },
    },
  };
}

export const CALM = [
  ["graphpaper", "Graph paper (calm)"], ["paper", "Paper (calm)"], ["vignette", "Vignette (calm)"], ["clock", "Clock (calm)"], ["moonphase", "Moon phase (calm)"],
  ["zen", "Zen garden (calm)"], ["breathe", "Breathe (calm)"], ["blueprint", "Blueprint (calm)"], ["terrazzo", "Terrazzo (calm)"],
];
