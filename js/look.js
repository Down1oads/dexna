// Look and feel: animated backgrounds behind a see-through workbench, a background image, fonts, corners,
// cursor effects and one-click "looks" that set several of these at once.

/* =====================================================================
 * Choices
 * ===================================================================== */
export const EFFECTS = [
  ["none", "None"], ["aurora", "Aurora"], ["gradient", "Flowing gradient"], ["particles", "Constellation"],
  ["stars", "Starfield"], ["waves", "Waves"], ["grid", "Retro grid"], ["rain", "Code rain"], ["bubbles", "Bubbles"],
  ["silk", "Silk ribbons"], ["dotsea", "Sea of dots"], ["ripples", "Ripples"], ["flow", "Flow field"], ["hills", "Rolling hills"], ["lava", "Lava lamp"], ["plasma", "Plasma"],
  ["ink", "Mouse ink"], ["snow", "Snow"], ["sakura", "Sakura petals"], ["leaves", "Autumn leaves"], ["fireflies", "Fireflies"], ["fireworks", "Fireworks"],
  ["warp", "Hyperspace"], ["galaxy", "Spiral galaxy"], ["meteors", "Meteor shower"], ["topo", "Topographic map"], ["circuit", "Circuit board"], ["hexgrid", "Hex grid pulses"],
  ["shards", "Glass shards"], ["beams", "Light beams"], ["clouds", "Drifting clouds"], ["rainglass", "Rain on glass"], ["lightning", "Thunderstorm"], ["dna", "DNA helix"],
  ["orbits", "Orbits"], ["mesh", "Gradient mesh"], ["bokeh", "Bokeh lights"], ["equalizer", "Equalizer"],
  ["image", "Your image"], ["video", "Your video"],
];
// [value, label, Google Fonts family or null when bundled / built in]
export const UI_FONTS = [
  ["plex", "IBM Plex Sans (built in)", null], ["system", "System font", null], ["inter", "Inter", "Inter"], ["outfit", "Outfit", "Outfit"],
  ["nunito", "Nunito Sans", "Nunito Sans"], ["grotesk", "Space Grotesk", "Space Grotesk"], ["manrope", "Manrope", "Manrope"],
];
export const CODE_FONTS = [
  ["jetbrains", "JetBrains Mono (built in)", null], ["fira", "Fira Code", "Fira Code"], ["source", "Source Code Pro", "Source Code Pro"],
  ["plexmono", "IBM Plex Mono", "IBM Plex Mono"], ["roboto", "Roboto Mono", "Roboto Mono"], ["ubuntu", "Ubuntu Mono", "Ubuntu Mono"],
  ["space", "Space Mono", "Space Mono"], ["inconsolata", "Inconsolata", "Inconsolata"], ["redhat", "Red Hat Mono", "Red Hat Mono"], ["system", "System monospace", null],
];
const UI_STACK = { plex: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif', system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' };
const MONO_STACK = { jetbrains: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Menlo, Consolas, monospace', system: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace' };

/** One-click looks. Each sets a theme and a handful of settings. */
export const LOOKS = [
  { id: "classic", name: "Classic", desc: "Plain and calm, no effects", theme: null, set: { bgEffect: "none", corners: "default", cursorEffect: "none", accentColor: "", glassBlur: false } },
  { id: "aurora", name: "Aurora", desc: "Slow northern lights", theme: "catppuccin-mocha", set: { bgEffect: "aurora", bgIntensity: 70, bgSpeed: 35, glass: 62, glassBlur: true, corners: "round", cursorEffect: "glow", accentColor: "" } },
  { id: "space", name: "Deep space", desc: "Drifting stars", theme: "tokyo-night", set: { bgEffect: "stars", bgIntensity: 85, bgSpeed: 30, glass: 66, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "constellation", name: "Constellation", desc: "Points that link up as they pass, and follow your mouse", theme: "night-owl", set: { bgEffect: "particles", bgIntensity: 70, bgSpeed: 40, glass: 68, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "synthwave", name: "Synthwave", desc: "Neon grid to the horizon", theme: "dracula", set: { bgEffect: "grid", bgIntensity: 80, bgSpeed: 45, glass: 64, glassBlur: true, corners: "round", cursorEffect: "sparks", accentColor: "#ff79c6" } },
  { id: "ocean", name: "Ocean", desc: "Layers of waves", theme: "midnight", set: { bgEffect: "waves", bgIntensity: 75, bgSpeed: 35, glass: 64, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "rain", name: "Code rain", desc: "Falling symbols", theme: "oled", set: { bgEffect: "rain", bgIntensity: 75, bgSpeed: 45, glass: 70, glassBlur: false, corners: "default", cursorEffect: "glow", accentColor: "#3ddc84" } },
  { id: "lagoon", name: "Lagoon", desc: "Bubbles rising in a light theme", theme: "catppuccin-latte", set: { bgEffect: "bubbles", bgIntensity: 70, bgSpeed: 35, glass: 64, glassBlur: true, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "silk", name: "Silk", desc: "Ribbons of light swaying across the screen", theme: "rose-pine", set: { bgEffect: "silk", bgIntensity: 80, bgSpeed: 35, glass: 62, glassBlur: false, corners: "round", cursorEffect: "glow", accentColor: "" } },
  { id: "dotsea", name: "Sea of dots", desc: "A rolling sea made of points", theme: "tokyo-night", set: { bgEffect: "dotsea", bgIntensity: 85, bgSpeed: 40, glass: 64, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "ripples", name: "Ripples", desc: "Rings spreading on still water. Click anywhere to make one", theme: "nord", set: { bgEffect: "ripples", bgIntensity: 80, bgSpeed: 40, glass: 64, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "flow", name: "Flow", desc: "Thousands of threads drifting on a current", theme: "everforest-dark", set: { bgEffect: "flow", bgIntensity: 70, bgSpeed: 40, glass: 68, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "hills", name: "Rolling hills", desc: "Layered hills passing at dusk", theme: "ayu-mirage", set: { bgEffect: "hills", bgIntensity: 85, bgSpeed: 35, glass: 62, glassBlur: true, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "lava", name: "Lava lamp", desc: "Warm blobs rising and sinking", theme: "gruvbox-dark", set: { bgEffect: "lava", bgIntensity: 70, bgSpeed: 35, glass: 66, glassBlur: true, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "plasma", name: "Plasma", desc: "Slowly swirling color", theme: "one-dark", set: { bgEffect: "plasma", bgIntensity: 80, bgSpeed: 30, glass: 70, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "seaside", name: "Seaside", desc: "Waves in a bright light theme", theme: "github-light", set: { bgEffect: "waves", bgIntensity: 90, bgSpeed: 35, glass: 64, glassBlur: true, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "winter", name: "Winter night", desc: "Snow drifting past", theme: "nord", set: { bgEffect: "snow", bgIntensity: 90, bgSpeed: 40, glass: 64, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "hanami", name: "Hanami", desc: "Cherry blossom petals on the wind", theme: "rose-pine-dawn", set: { bgEffect: "sakura", bgIntensity: 90, bgSpeed: 35, glass: 62, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "#d7827e" } },
  { id: "autumn", name: "Autumn", desc: "Falling leaves", theme: "gruvbox-dark", set: { bgEffect: "leaves", bgIntensity: 85, bgSpeed: 35, glass: 64, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "summer", name: "Summer night", desc: "Fireflies in the dark", theme: "everforest-dark", set: { bgEffect: "fireflies", bgIntensity: 95, bgSpeed: 40, glass: 64, glassBlur: false, corners: "round", cursorEffect: "glow", accentColor: "" } },
  { id: "celebrate", name: "Celebration", desc: "Fireworks", theme: "tokyo-night", set: { bgEffect: "fireworks", bgIntensity: 85, bgSpeed: 40, glass: 66, glassBlur: false, corners: "round", cursorEffect: "sparks", accentColor: "" } },
  { id: "ink", name: "Ink", desc: "Colored ink follows your mouse", theme: "catppuccin-mocha", set: { bgEffect: "ink", bgIntensity: 85, bgSpeed: 40, glass: 62, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "hyperspace", name: "Hyperspace", desc: "Stars streaking past", theme: "github-dark", set: { bgEffect: "warp", bgIntensity: 80, bgSpeed: 40, glass: 66, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "galaxy", name: "Galaxy", desc: "A slowly turning spiral galaxy", theme: "moonlight", set: { bgEffect: "galaxy", bgIntensity: 90, bgSpeed: 40, glass: 64, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "cartographer", name: "Cartographer", desc: "Moving contour lines", theme: "kanagawa", set: { bgEffect: "topo", bgIntensity: 70, bgSpeed: 35, glass: 66, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "circuit", name: "Circuit", desc: "Pulses running along traces", theme: "poimandres", set: { bgEffect: "circuit", bgIntensity: 85, bgSpeed: 40, glass: 66, glassBlur: false, corners: "default", cursorEffect: "none", accentColor: "" } },
  { id: "storm", name: "Storm", desc: "Rain on the window and distant lightning", theme: "nightfox", set: { bgEffect: "rainglass", bgIntensity: 85, bgSpeed: 40, glass: 64, glassBlur: false, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "studio", name: "Studio", desc: "A soft, slowly moving gradient mesh", theme: "github-light-default", set: { bgEffect: "mesh", bgIntensity: 70, bgSpeed: 30, glass: 70, glassBlur: true, corners: "round", cursorEffect: "none", accentColor: "" } },
  { id: "dawn", name: "Soft light", desc: "A slowly shifting light gradient", theme: "rose-pine-dawn", set: { bgEffect: "gradient", bgIntensity: 90, bgSpeed: 30, glass: 62, glassBlur: true, corners: "round", cursorEffect: "none", accentColor: "" } },
];

/* =====================================================================
 * Background image storage (IndexedDB, in memory if that is blocked)
 * ===================================================================== */
let dbp = null, memImage = null;
const imgDb = () => (dbp ||= new Promise((res, rej) => {
  if (!("indexedDB" in self)) return rej(new Error("no IndexedDB"));
  const r = indexedDB.open("dexna-assets", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("files");
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
async function idb(mode, fn) {
  try { const d = await imgDb(); return await new Promise((res, rej) => { const t = d.transaction("files", mode); const q = fn(t.objectStore("files")); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); }); } catch (_) { return undefined; }
}
let memVideo = null;
const imageStore = {
  async getVideo() { return (await idb("readonly", (s) => s.get("bgVideo"))) ?? memVideo; },
  async setVideo(blob) { memVideo = blob; await idb("readwrite", (s) => s.put(blob, "bgVideo")); },
  async delVideo() { memVideo = null; await idb("readwrite", (s) => s.delete("bgVideo")); },
  async get() { return (await idb("readonly", (s) => s.get("bgImage"))) ?? memImage; },
  async set(blob) { memImage = blob; await idb("readwrite", (s) => s.put(blob, "bgImage")); },
  async del() { memImage = null; await idb("readwrite", (s) => s.delete("bgImage")); },
};
/** Shrink a picture to at most 2560 px wide, as JPEG (WebP keeps transparency where supported). */
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise((res) => c.toBlob((b) => res(b || file), "image/jpeg", 0.86));
}

/* =====================================================================
 * Animated backgrounds
 * ===================================================================== */
const rgba = (hex, a) => { const h = hex.replace("#", ""); const n = parseInt(h.length === 3 ? [...h].map((x) => x + x).join("") : h.slice(0, 6), 16); return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${a})`; };
const rand = (a, b) => a + Math.random() * (b - a);

function makeEffects() {
  return {
    aurora: {
      lowRes: 0.2,
      init(s) { s.blobs = s.colors.slice(0, 5).map((c, i) => ({ c, ph: rand(0, 6.3), wx: rand(0.05, 0.12), wy: rand(0.04, 0.1), r: rand(0.38, 0.62), x0: (i + 0.5) / 5, y0: rand(0.2, 0.8) })); },
      draw(ctx, s, t) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = s.dark ? "lighter" : "multiply";
        for (const b of s.blobs) {
          const x = (b.x0 + Math.sin(t * b.wx + b.ph) * 0.28) * w, y = (b.y0 + Math.cos(t * b.wy + b.ph * 1.3) * 0.3) * h;
          const r = b.r * Math.max(w, h);
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, rgba(b.c, s.dark ? 0.75 : 0.5)); g.addColorStop(0.45, rgba(b.c, s.dark ? 0.3 : 0.2)); g.addColorStop(1, rgba(b.c, 0));
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        }
        ctx.globalCompositeOperation = "source-over";
      },
    },
    gradient: {
      lowRes: 0.15,
      draw(ctx, s, t) {
        const { w, h } = s, a = t * 0.08;
        const g = ctx.createLinearGradient(w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * h, w / 2 - Math.cos(a) * w, h / 2 - Math.sin(a) * h);
        const cs = s.colors;
        cs.slice(0, 4).forEach((c, i) => g.addColorStop(i / 3, rgba(c, s.dark ? 0.6 : 0.5)));
        ctx.clearRect(0, 0, w, h); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        const x = w * (0.5 + Math.sin(t * 0.11) * 0.35), y = h * (0.5 + Math.cos(t * 0.07) * 0.35);
        const r = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.5);
        r.addColorStop(0, rgba(cs[4] || cs[0], s.dark ? 0.5 : 0.4)); r.addColorStop(1, rgba(cs[4] || cs[0], 0));
        ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
      },
    },
    particles: {
      init(s) {
        const n = Math.min(140, Math.round((s.w * s.h) / 13000));
        s.pts = Array.from({ length: n }, () => ({ x: rand(0, s.w), y: rand(0, s.h), vx: rand(-14, 14), vy: rand(-14, 14), c: s.colors[Math.floor(rand(0, 3))] }));
      },
      draw(ctx, s, t, dt) {
        const { w, h, pts } = s, link = Math.min(170, Math.max(w, h) * 0.11) * s.px;
        ctx.clearRect(0, 0, w, h);
        for (const p of pts) {
          p.x += p.vx * dt * s.px; p.y += p.vy * dt * s.px;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        const m = s.mouse;
        ctx.lineWidth = s.px;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          for (let j = i + 1; j < pts.length; j++) {
            const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < link) { ctx.strokeStyle = rgba(a.c, (1 - d / link) * 0.55); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          }
          if (m) { const d = Math.hypot(a.x - m.x, a.y - m.y); if (d < link * 1.4) { ctx.strokeStyle = rgba(s.colors[0], (1 - d / (link * 1.4)) * 0.8); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(m.x, m.y); ctx.stroke(); } }
        }
        for (const p of pts) { ctx.fillStyle = rgba(p.c, 0.9); ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 * s.px, 0, 6.3); ctx.fill(); }
      },
    },
    stars: {
      init(s) {
        const n = Math.min(700, Math.round((s.w * s.h) / (2600 * s.px * s.px)));
        s.stars = Array.from({ length: n }, () => ({ x: rand(0, s.w), y: rand(0, s.h), z: rand(0.15, 1), tw: rand(0, 6.3), c: Math.random() < 0.15 ? s.colors[Math.floor(rand(0, 4))] : s.fg }));
      },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        const g = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, Math.max(w, h) * 0.7);
        g.addColorStop(0, rgba(s.colors[0], 0.3)); g.addColorStop(1, rgba(s.colors[0], 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        const g2 = ctx.createRadialGradient(w * 0.2, h * 0.8, 0, w * 0.2, h * 0.8, Math.max(w, h) * 0.5);
        g2.addColorStop(0, rgba(s.colors[1], 0.22)); g2.addColorStop(1, rgba(s.colors[1], 0));
        ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
        for (const st of s.stars) {
          st.x -= st.z * 10 * dt * s.px; st.y += st.z * 3 * dt * s.px;
          if (st.x < 0) st.x += w; if (st.y > h) st.y -= h;
          const a = Math.min(1, (0.5 + 0.7 * st.z) * (0.7 + 0.3 * Math.sin(t * 2 + st.tw)));
          ctx.fillStyle = rgba(st.c, s.dark ? a : a * 0.7);
          ctx.beginPath(); ctx.arc(st.x, st.y, (0.6 + st.z * 1.6) * s.px, 0, 6.3); ctx.fill();
          if (st.z > 0.85) { ctx.fillStyle = rgba(st.c, a * 0.25); ctx.beginPath(); ctx.arc(st.x, st.y, 4.5 * s.px, 0, 6.3); ctx.fill(); }
        }
      },
    },
    waves: {
      draw(ctx, s, t) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        s.colors.slice(0, 4).forEach((c, i) => {
          const base = h * (0.55 + i * 0.1), amp = h * (0.05 + i * 0.012), k = (2 + i * 0.7) * Math.PI / w, sp = 0.35 + i * 0.12;
          const g = ctx.createLinearGradient(0, base - amp, 0, h);
          g.addColorStop(0, rgba(c, s.dark ? 0.32 : 0.42)); g.addColorStop(1, rgba(c, s.dark ? 0.04 : 0.08));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 8 * s.px) ctx.lineTo(x, base + Math.sin(x * k + t * sp + i) * amp + Math.sin(x * k * 2.3 - t * sp * 0.7) * amp * 0.35);
          ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        });
      },
    },
    grid: {
      draw(ctx, s, t) {
        const { w, h } = s, hz = h * 0.52, [c1, c2] = s.colors;
        ctx.clearRect(0, 0, w, h);
        // sun
        const sr = Math.min(w, h) * 0.2, sx = w / 2, sy = hz - sr * 0.35;
        const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
        sg.addColorStop(0, rgba(c2, 0.55)); sg.addColorStop(1, rgba(c1, 0.35));
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, hz); ctx.clip();
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.3); ctx.fill(); ctx.restore();
        const glow = ctx.createLinearGradient(0, hz - h * 0.25, 0, hz);
        glow.addColorStop(0, rgba(c1, 0)); glow.addColorStop(1, rgba(c1, 0.22));
        ctx.fillStyle = glow; ctx.fillRect(0, hz - h * 0.25, w, h * 0.25);
        // floor
        ctx.lineWidth = 1.2 * s.px;
        const lines = 22;
        for (let i = -lines; i <= lines; i++) {
          const x = w / 2 + (i / lines) * w * 1.6;
          ctx.strokeStyle = rgba(c1, 0.45); ctx.beginPath(); ctx.moveTo(w / 2 + (i / lines) * w * 0.06, hz); ctx.lineTo(x, h); ctx.stroke();
        }
        const off = (t * 0.25) % 1;
        for (let i = 0; i < 16; i++) {
          const z = (i + 1 - off) / 16, y = hz + (h - hz) * z * z;
          ctx.strokeStyle = rgba(c1, 0.15 + 0.5 * z); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
      },
    },
    rain: {
      trails: true,
      init(s) { s.fs = 17 * s.px; s.cols = Array.from({ length: Math.ceil(s.w / s.fs) }, () => ({ y: rand(-s.h, 0), v: rand(0.6, 1.4) })); s.acc = 0; },
      draw(ctx, s, t, dt) {
        const { w, h, fs } = s;
        ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 1.4)})`; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
        ctx.font = `${fs}px "JetBrains Mono", monospace`;
        const chars = "{}[]()<>=+-*/;:01abcdefxyz$#&|!?";
        s.cols.forEach((c, i) => {
          const step = fs * 9 * c.v * dt;
          c.y += step;
          ctx.fillStyle = rgba(i % 7 === 0 ? s.colors[1] : s.colors[0], 1);
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, c.y);
          if (c.y > h + fs * 4 && Math.random() < 0.03) { c.y = rand(-h * 0.3, 0); c.v = rand(0.6, 1.4); }
        });
      },
    },
    bubbles: {
      init(s) { const n = Math.min(60, Math.round((s.w * s.h) / 30000)); s.b = Array.from({ length: n }, () => this.mk(s, true)); },
      mk(s, any) { return { x: rand(0, s.w), y: any ? rand(0, s.h) : s.h + 40 * s.px, r: rand(6, 46) * s.px, v: rand(12, 34), ph: rand(0, 6.3), c: s.colors[Math.floor(rand(0, 4))] }; },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        s.b.forEach((b, i) => {
          b.y -= b.v * dt * s.px; const x = b.x + Math.sin(t * 0.8 + b.ph) * 14 * s.px;
          if (b.y < -b.r * 2) s.b[i] = this.mk(s, false);
          const g = ctx.createRadialGradient(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, x, b.y, b.r);
          g.addColorStop(0, rgba(b.c, s.dark ? 0.45 : 0.35)); g.addColorStop(1, rgba(b.c, 0.06));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, 6.3); ctx.fill();
          ctx.strokeStyle = rgba(b.c, 0.4); ctx.lineWidth = s.px; ctx.stroke();
        });
      },
    },
    silk: {
      draw(ctx, s, t) {
        const { w, h } = s, n = 26;
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1.3 * s.px;
        const g = ctx.createLinearGradient(0, 0, w, 0);
        s.colors.slice(0, 3).forEach((c, i) => g.addColorStop(i / 2, c));
        for (let i = 0; i < n; i++) {
          const f = i / (n - 1), mid = 1 - Math.abs(f - 0.5) * 2;
          ctx.globalAlpha = (s.dark ? 0.25 : 0.2) + mid * (s.dark ? 0.65 : 0.55);
          ctx.strokeStyle = g;
          ctx.beginPath();
          for (let x = 0; x <= w + 10; x += 10 * s.px) {
            const u = x / w;
            const y = h * 0.45 + (f - 0.5) * h * 0.22
              + Math.sin(u * Math.PI * 2.4 + t * 0.55 + f * 1.9) * h * 0.11 * (0.55 + f)
              + Math.sin(u * Math.PI * 1.1 - t * 0.32 + f * 3.1) * h * 0.08;
            x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    },
    dotsea: {
      draw(ctx, s, t) {
        const { w, h } = s, rows = 34, cols = 64;
        ctx.clearRect(0, 0, w, h);
        const glow = ctx.createLinearGradient(0, h * 0.35, 0, h);
        glow.addColorStop(0, rgba(s.colors[0], 0)); glow.addColorStop(1, rgba(s.colors[0], s.dark ? 0.14 : 0.1));
        ctx.fillStyle = glow; ctx.fillRect(0, h * 0.35, w, h * 0.65);
        for (let r = 0; r < rows; r++) {
          const z = r / (rows - 1), y0 = h * 0.3 + Math.pow(z, 1.5) * h * 0.72, spread = 0.55 + 1.7 * z;
          ctx.fillStyle = rgba(r % 2 ? s.colors[0] : s.colors[2] || s.colors[0], 0.3 + 0.7 * z);
          for (let c = 0; c < cols; c++) {
            const u = c / (cols - 1) - 0.5;
            const lift = Math.sin(u * 9 + t * 1.1 + z * 5) * Math.cos(z * 6 - t * 0.7) + Math.sin(u * 3.3 - t * 0.5) * 0.5;
            const x = w / 2 + u * w * spread, y = y0 - lift * h * 0.05 * (0.4 + z);
            if (x < -10 || x > w + 10) continue;
            ctx.beginPath(); ctx.arc(x, y, (0.9 + 2.6 * z) * s.px, 0, 6.3); ctx.fill();
          }
        }
      },
    },
    ripples: {
      init(s) { s.rings = []; s.next = 0; },
      tap(s, x, y) { s.rings.push({ x, y, age: 0.45, c: s.colors[Math.floor(rand(0, 3))], big: 1.5 }); },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, rgba(s.colors[0], s.dark ? 0.1 : 0.07)); g.addColorStop(1, rgba(s.colors[1], 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        s.next -= dt;
        if (s.next <= 0 && dt > 0) { s.rings.push({ x: rand(0.1, 0.9) * w, y: rand(0.1, 0.9) * h, age: 0, c: s.colors[Math.floor(rand(0, 4))], big: rand(0.8, 1.3) }); s.next = rand(0.7, 1.6); }
        if (!s.rings.length) s.rings.push({ x: w * 0.6, y: h * 0.45, age: 2.2, c: s.colors[0], big: 1.2 }, { x: w * 0.25, y: h * 0.7, age: 3.5, c: s.colors[1], big: 1 });
        ctx.lineWidth = 2.2 * s.px;
        s.rings = s.rings.filter((r) => (r.age += dt) < 7);
        for (const r of s.rings) {
          for (let k = 0; k < 4; k++) {
            const a = r.age - k * 0.35; if (a <= 0) continue;
            const rad = a * 70 * s.px * r.big, life = 1 - r.age / 7;
            ctx.strokeStyle = rgba(r.c, Math.max(0, life * (0.95 - k * 0.18)));
            ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.62, 0, 0, 6.3); ctx.stroke();
          }
        }
      },
    },
    flow: {
      trails: true,
      init(s) {
        const n = Math.min(900, Math.round((s.w * s.h) / (1500 * s.px * s.px)));
        s.p = Array.from({ length: n }, () => ({ x: rand(0, s.w), y: rand(0, s.h), life: rand(1, 6), c: s.colors[Math.floor(rand(0, 4))] }));
      },
      draw(ctx, s, t, dt) {
        const { w, h } = s, k = 0.0035 / s.px;
        ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 0.9)})`; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = 1.1 * s.px;
        for (const p of s.p) {
          const a = Math.sin(p.x * k + t * 0.15) * 1.7 + Math.cos(p.y * k * 1.3 - t * 0.12) * 1.7 + Math.sin((p.x + p.y) * k * 0.6 + t * 0.08);
          const nx = p.x + Math.cos(a) * 46 * dt * s.px, ny = p.y + Math.sin(a) * 46 * dt * s.px;
          ctx.strokeStyle = rgba(p.c, s.dark ? 0.75 : 0.55);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
          p.x = nx; p.y = ny; p.life -= dt;
          if (p.life < 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) { p.x = rand(0, w); p.y = rand(0, h); p.life = rand(2, 7); }
        }
      },
    },
    hills: {
      draw(ctx, s, t) {
        const { w, h } = s, layers = 5;
        ctx.clearRect(0, 0, w, h);
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, rgba(s.colors[2] || s.colors[0], 0)); sky.addColorStop(0.6, rgba(s.colors[0], s.dark ? 0.14 : 0.1)); sky.addColorStop(1, rgba(s.colors[0], 0));
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        const sunY = h * 0.38;
        const sun = ctx.createRadialGradient(w * 0.72, sunY, 0, w * 0.72, sunY, h * 0.22);
        sun.addColorStop(0, rgba(s.colors[1], s.dark ? 0.5 : 0.4)); sun.addColorStop(1, rgba(s.colors[1], 0));
        ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < layers; i++) {
          const d = (i + 1) / layers, base = h * (0.48 + d * 0.1), amp = h * (0.07 + 0.03 * (1 - d)), off = t * 12 * d * s.px;
          ctx.fillStyle = rgba(s.colors[i % 4], (s.dark ? 0.16 : 0.12) + d * (s.dark ? 0.3 : 0.22));
          ctx.beginPath(); ctx.moveTo(0, h);
          for (let x = 0; x <= w + 8; x += 8 * s.px) {
            const X = (x + off) / w;
            ctx.lineTo(x, base - (Math.sin(X * (3 + i) + i * 1.7) * 0.6 + Math.sin(X * (7.3 + i * 1.3) + i) * 0.3 + Math.sin(X * 17 + i * 3) * 0.1) * amp);
          }
          ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        }
      },
    },
    lava: {
      lowRes: 0.25,
      init(s) { s.blobs = Array.from({ length: 9 }, (_, i) => ({ x: rand(0.1, 0.9), ph: rand(0, 6.3), sp: rand(0.05, 0.12), r: rand(0.07, 0.16), c: s.colors[i % 4] })); },
      draw(ctx, s, t) {
        const { w, h } = s, m = Math.min(w, h);
        ctx.clearRect(0, 0, w, h);
        for (const b of s.blobs) {
          const y = (0.5 + 0.45 * Math.sin(t * b.sp * 2 + b.ph)) * h, x = (b.x + 0.05 * Math.sin(t * 0.3 + b.ph)) * w;
          const r = b.r * m * 2.2 * (1 + 0.15 * Math.sin(t * 0.7 + b.ph));
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, rgba(b.c, s.dark ? 0.8 : 0.6)); g.addColorStop(0.55, rgba(b.c, s.dark ? 0.55 : 0.4)); g.addColorStop(0.72, rgba(b.c, 0.12)); g.addColorStop(1, rgba(b.c, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
        }
      },
    },
    plasma: {
      lowRes: 0.08,
      init(s) {
        const hex = (c) => { const n = parseInt(c.replace("#", "").slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
        s.pal = s.colors.slice(0, 4).map(hex);
        s.img = null;
      },
      draw(ctx, s, t) {
        const { w, h, pal } = s;
        if (!s.img || s.img.width !== w || s.img.height !== h) s.img = ctx.createImageData(w, h);
        const d = s.img.data, sc = 12 / w, n = pal.length, alpha = s.dark ? 200 : 150;
        for (let y = 0, i = 0; y < h; y++) {
          for (let x = 0; x < w; x++, i += 4) {
            const X = x * sc, Y = y * sc;
            let v = Math.sin(X * 0.9 + t * 0.6) + Math.sin(Y * 1.1 + t * 0.45) + Math.sin((X + Y) * 0.7 + t * 0.35) + Math.sin(Math.sqrt(X * X + Y * Y) * 0.8 - t * 0.5);
            v = ((v + 4) / 8) * (n - 1);
            const a = Math.floor(v), f = v - a, c0 = pal[Math.max(0, Math.min(n - 1, a))], c1 = pal[Math.max(0, Math.min(n - 1, a + 1))];
            d[i] = c0[0] + (c1[0] - c0[0]) * f; d[i + 1] = c0[1] + (c1[1] - c0[1]) * f; d[i + 2] = c0[2] + (c1[2] - c0[2]) * f; d[i + 3] = alpha;
          }
        }
        ctx.putImageData(s.img, 0, 0);
      },
    },

    ink: {
      trails: true,
      init(s) { s.p = []; s.prev = null; },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 1.1 + 0.002)})`; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = s.dark ? "lighter" : "source-over";
        const m = s.mouse;
        if (m && s.prev) {
          const vx = (m.x - s.prev.x), vy = (m.y - s.prev.y), sp = Math.hypot(vx, vy);
          const n = Math.min(8, Math.floor(sp / 6));
          for (let i = 0; i < n; i++) {
            const k = i / Math.max(1, n);
            s.p.push({ x: s.prev.x + vx * k, y: s.prev.y + vy * k, vx: vx * 6 + rand(-30, 30) * s.px, vy: vy * 6 + rand(-30, 30) * s.px, r: rand(16, 34) * s.px, life: 1, c: s.colors[Math.floor(t * 0.4) % 4] });
          }
        } else if (dt > 0 && Math.random() < 0.15) { // gentle drifting wisps when the mouse is still
          s.p.push({ x: rand(0, w), y: rand(0, h), vx: rand(-20, 20) * s.px, vy: rand(-20, 20) * s.px, r: rand(14, 30) * s.px, life: 0.6, c: s.colors[Math.floor(rand(0, 4))] });
        }
        s.prev = m ? { ...m } : null;
        if (s.p.length > 900) s.p.splice(0, s.p.length - 900);
        s.p = s.p.filter((q) => (q.life -= dt * 0.55) > 0);
        for (const q of s.p) {
          q.vx *= 1 - dt * 1.8; q.vy *= 1 - dt * 1.8;
          q.vx += Math.sin(q.y * 0.01 + t) * 12 * dt * s.px; q.vy += Math.cos(q.x * 0.01 + t) * 12 * dt * s.px;
          q.x += q.vx * dt; q.y += q.vy * dt;
          const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
          g.addColorStop(0, rgba(q.c, (s.dark ? 0.075 : 0.1) * q.life)); g.addColorStop(0.5, rgba(q.c, (s.dark ? 0.04 : 0.05) * q.life)); g.addColorStop(1, rgba(q.c, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.3); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      },
    },
    snow: {
      init(s) { const n = Math.min(320, Math.round((s.w * s.h) / (5000 * s.px * s.px))); s.f = Array.from({ length: n }, () => this.mk(s, true)); },
      mk(s, any) { const z = rand(0.3, 1); return { x: rand(0, s.w), y: any ? rand(0, s.h) : rand(-40, -5), z, r: (0.8 + z * 2.6) * s.px, ph: rand(0, 6.3) }; },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        const wind = Math.sin(t * 0.13) * 18;
        for (let i = 0; i < s.f.length; i++) {
          const f = s.f[i];
          f.y += (18 + f.z * 38) * dt * s.px; f.x += (wind * f.z + Math.sin(t * 0.9 + f.ph) * 10) * dt * s.px;
          if (f.y > h + 10 || f.x < -20 || f.x > w + 20) s.f[i] = this.mk(s, false);
          ctx.fillStyle = s.dark ? `rgba(255,255,255,${0.35 + f.z * 0.55})` : `rgba(120,140,170,${0.3 + f.z * 0.5})`;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill();
        }
      },
    },
    sakura: {
      init(s) { const n = Math.min(90, Math.round((s.w * s.h) / (16000 * s.px * s.px))); s.f = Array.from({ length: n }, () => this.mk(s, true)); },
      mk(s, any) { return { x: rand(-s.w * 0.2, s.w), y: any ? rand(0, s.h) : rand(-60, -10), z: rand(0.5, 1), rot: rand(0, 6.3), spin: rand(-2, 2), flip: rand(0, 6.3), c: ["#ffb7c5", "#ff9eb5", "#ffd1dc", "#f7a1b8"][Math.floor(rand(0, 4))] }; },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < s.f.length; i++) {
          const f = s.f[i];
          f.y += (22 + f.z * 26) * dt * s.px; f.x += (26 + Math.sin(t + f.flip) * 22) * dt * s.px; f.rot += f.spin * dt; f.flip += dt * 2.2;
          if (f.y > h + 20 || f.x > w + 30) s.f[i] = this.mk(s, false);
          const sz = (6 + f.z * 6) * s.px;
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.scale(1, Math.abs(Math.cos(f.flip)) * 0.8 + 0.2);
          ctx.fillStyle = rgba(f.c, 0.85);
          ctx.beginPath(); ctx.moveTo(0, -sz); ctx.bezierCurveTo(sz * 0.9, -sz * 0.6, sz * 0.7, sz * 0.6, 0, sz); ctx.bezierCurveTo(-sz * 0.7, sz * 0.6, -sz * 0.9, -sz * 0.6, 0, -sz); ctx.fill();
          ctx.fillStyle = rgba("#ffffff", 0.35); ctx.beginPath(); ctx.ellipse(0, -sz * 0.75, sz * 0.12, sz * 0.22, 0, 0, 6.3); ctx.fill();
          ctx.restore();
        }
      },
    },
    leaves: {
      init(s) { const n = Math.min(60, Math.round((s.w * s.h) / (24000 * s.px * s.px))); s.f = Array.from({ length: n }, () => this.mk(s, true)); },
      mk(s, any) { return { x: rand(0, s.w), y: any ? rand(0, s.h) : rand(-60, -10), z: rand(0.5, 1), rot: rand(0, 6.3), spin: rand(-1.5, 1.5), sway: rand(0, 6.3), c: ["#d9622b", "#e8a33d", "#b8401f", "#c9822b", "#9c5a2a"][Math.floor(rand(0, 5))] }; },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < s.f.length; i++) {
          const f = s.f[i];
          f.y += (26 + f.z * 22) * dt * s.px; f.x += Math.sin(t * 0.9 + f.sway) * 40 * dt * s.px; f.rot += f.spin * dt + Math.sin(t + f.sway) * dt;
          if (f.y > h + 30) s.f[i] = this.mk(s, false);
          const sz = (9 + f.z * 9) * s.px;
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
          ctx.fillStyle = rgba(f.c, 0.85);
          ctx.beginPath(); ctx.moveTo(0, -sz); ctx.quadraticCurveTo(sz * 0.9, -sz * 0.2, 0, sz); ctx.quadraticCurveTo(-sz * 0.9, -sz * 0.2, 0, -sz); ctx.fill();
          ctx.strokeStyle = rgba("#5a2e12", 0.5); ctx.lineWidth = s.px; ctx.beginPath(); ctx.moveTo(0, -sz * 0.9); ctx.lineTo(0, sz * 1.25); ctx.stroke();
          ctx.restore();
        }
      },
    },
    fireflies: {
      init(s) { const n = Math.min(70, Math.round((s.w * s.h) / (20000 * s.px * s.px))); s.f = Array.from({ length: n }, () => ({ x: rand(0, s.w), y: rand(s.h * 0.2, s.h), a: rand(0, 6.3), sp: rand(10, 28), ph: rand(0, 6.3), blink: rand(0.6, 1.6) })); },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        const glow = ctx.createLinearGradient(0, h * 0.5, 0, h);
        glow.addColorStop(0, rgba("#203a1a", 0)); glow.addColorStop(1, rgba("#203a1a", s.dark ? 0.35 : 0.1));
        ctx.fillStyle = glow; ctx.fillRect(0, h * 0.5, w, h * 0.5);
        for (const f of s.f) {
          f.a += (Math.sin(t * 0.7 + f.ph) * 1.2) * dt;
          f.x += Math.cos(f.a) * f.sp * dt * s.px; f.y += Math.sin(f.a) * f.sp * dt * s.px * 0.6;
          if (f.x < 0) f.x += w; if (f.x > w) f.x -= w; if (f.y < h * 0.1) f.a = Math.PI / 2; if (f.y > h) f.a = -Math.PI / 2;
          const on = Math.max(0, Math.sin(t * f.blink + f.ph)) ** 2;
          if (on < 0.02) continue;
          const r = 14 * s.px;
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
          g.addColorStop(0, `rgba(230,255,140,${0.9 * on})`); g.addColorStop(0.25, `rgba(190,240,90,${0.45 * on})`); g.addColorStop(1, "rgba(160,220,60,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 6.3); ctx.fill();
        }
      },
    },
    fireworks: {
      trails: true,
      init(s) { s.r = []; s.p = []; s.next = 0.3; },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 2.4)})`; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = s.dark ? "lighter" : "source-over";
        s.next -= dt;
        if (s.next <= 0 && dt > 0) { s.r.push({ x: rand(0.15, 0.85) * w, y: h, vy: -rand(0.9, 1.25) * Math.sqrt(h) * 22, tx: rand(0.15, 0.45) * h, c: s.colors[Math.floor(rand(0, 4))] }); s.next = rand(0.6, 1.6); }
        s.r = s.r.filter((r) => {
          r.y += r.vy * dt; r.vy *= 1 - dt * 0.6;
          ctx.fillStyle = rgba(r.c, 0.9); ctx.beginPath(); ctx.arc(r.x, r.y, 2 * s.px, 0, 6.3); ctx.fill();
          if (r.y <= r.tx || r.vy > -60) {
            const n = 70, sp = rand(90, 170) * s.px, c2 = Math.random() < 0.4 ? s.colors[Math.floor(rand(0, 4))] : r.c;
            for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + rand(-0.05, 0.05), v = sp * rand(0.6, 1); s.p.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1, 1.6), c: i % 3 ? r.c : c2 }); }
            return false;
          }
          return true;
        });
        s.p = s.p.filter((q) => (q.life -= dt * 0.8) > 0);
        for (const q of s.p) {
          q.vy += 60 * s.px * dt; q.vx *= 1 - dt * 0.9; q.vy *= 1 - dt * 0.9; q.x += q.vx * dt; q.y += q.vy * dt;
          ctx.fillStyle = rgba(q.c, Math.min(1, q.life)); ctx.beginPath(); ctx.arc(q.x, q.y, 1.6 * s.px, 0, 6.3); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      },
    },

    warp: {
      init(s) { s.st = Array.from({ length: 420 }, () => this.mk(s, true)); },
      mk(s, any) { return { a: rand(0, 6.283), d: any ? rand(0.02, 1) : rand(0.01, 0.05), v: rand(0.25, 0.6), c: Math.random() < 0.2 ? s.colors[Math.floor(rand(0, 4))] : s.fg }; },
      draw(ctx, s, t, dt) {
        const { w, h } = s, cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2;
        ctx.clearRect(0, 0, w, h);
        ctx.lineCap = "round";
        for (let i = 0; i < s.st.length; i++) {
          const q = s.st[i], d0 = q.d;
          q.d += q.d * q.v * dt * 1.6 + 0.0005;
          if (q.d > 1.1) { s.st[i] = this.mk(s, false); continue; }
          const x0 = cx + Math.cos(q.a) * d0 * R, y0 = cy + Math.sin(q.a) * d0 * R, x1 = cx + Math.cos(q.a) * q.d * R, y1 = cy + Math.sin(q.a) * q.d * R;
          ctx.strokeStyle = rgba(q.c, Math.min(1, q.d * 1.4) * (s.dark ? 0.9 : 0.6)); ctx.lineWidth = (0.6 + q.d * 2.2) * s.px;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 + (x1 - x0) * 2, y1 + (y1 - y0) * 2); ctx.stroke();
        }
      },
    },
    galaxy: {
      init(s) {
        const n = 1400;
        s.g = Array.from({ length: n }, (_, i) => { const arm = i % 3, r = Math.pow(Math.random(), 0.6); return { r, a: arm * 2.094 + r * 5.5 + rand(-0.35, 0.35) * (1 - r * 0.5), z: rand(0.5, 1.6), c: s.colors[r < 0.25 ? 0 : 1 + (i % 3)] }; });
      },
      draw(ctx, s, t) {
        const { w, h } = s, cx = w * 0.62, cy = h * 0.48, R = Math.min(w, h) * 0.55;
        ctx.clearRect(0, 0, w, h);
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.35);
        core.addColorStop(0, rgba(s.colors[0], s.dark ? 0.55 : 0.3)); core.addColorStop(0.35, rgba(s.colors[1], s.dark ? 0.2 : 0.12)); core.addColorStop(1, rgba(s.colors[0], 0));
        ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);
        const rot = t * 0.05;
        for (const q of s.g) {
          const a = q.a + rot / (0.3 + q.r), rr = q.r * R;
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.45;
          const al = (s.dark ? 0.95 : 0.7) * (1 - q.r * 0.45), sz = (q.z * 1.7 + 0.6) * s.px;
          ctx.fillStyle = rgba(q.c, al); ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
          if (q.z > 1.4) { ctx.fillStyle = rgba(q.c, al * 0.2); ctx.beginPath(); ctx.arc(x, y, sz * 2.6, 0, 6.3); ctx.fill(); }
        }
      },
    },
    meteors: {
      trails: true,
      init(s) { s.m = []; s.next = 0.5; s.stars = Array.from({ length: 160 }, () => ({ x: rand(0, s.w), y: rand(0, s.h), r: rand(0.4, 1.3) * s.px, tw: rand(0, 6.3) })); },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 2.2)})`; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
        for (const q of s.stars) { ctx.fillStyle = rgba(s.fg, 0.55 + 0.35 * Math.sin(t * 1.5 + q.tw)); ctx.fillRect(q.x, q.y, q.r * 1.6, q.r * 1.6); }
        s.next -= dt;
        if (s.next <= 0 && dt > 0) { s.m.push({ x: rand(0.1, 1.1) * w, y: rand(-0.1, 0.35) * h, v: rand(700, 1100) * s.px, life: 1, c: s.colors[Math.floor(rand(0, 3))] }); s.next = rand(0.2, 0.8); }
        ctx.lineCap = "round";
        s.m = s.m.filter((q) => (q.life -= dt * 0.9) > 0);
        for (const q of s.m) {
          const nx = q.x - q.v * dt, ny = q.y + q.v * dt * 0.55;
          const g = ctx.createLinearGradient(q.x, q.y, nx, ny);
          g.addColorStop(0, rgba(q.c, 0)); g.addColorStop(1, rgba("#ffffff", q.life));
          ctx.strokeStyle = g; ctx.lineWidth = 3 * s.px; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(nx, ny); ctx.stroke();
          ctx.fillStyle = rgba("#ffffff", q.life); ctx.beginPath(); ctx.arc(nx, ny, 2.2 * s.px, 0, 6.3); ctx.fill();
          q.x = nx; q.y = ny;
        }
      },
    },
    topo: {
      draw(ctx, s, t) {
        const { w, h } = s, cols = 96, rows = Math.max(20, Math.round(96 * h / w)), cw = w / (cols - 1), ch = h / (rows - 1);
        const f = (x, y) => Math.sin(x * 0.11 + t * 0.12) + Math.sin(y * 0.13 - t * 0.09) + Math.sin((x + y) * 0.07 + t * 0.07) + 0.6 * Math.sin(Math.hypot(x - cols * 0.6, y - rows * 0.4) * 0.18 - t * 0.15);
        const v = new Float32Array(cols * rows);
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) v[y * cols + x] = f(x, y);
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1.1 * s.px;
        const levels = 9;
        for (let L = 0; L < levels; L++) {
          const iso = -3 + (6 / levels) * (L + 0.5);
          ctx.strokeStyle = rgba(s.colors[L % 4], (s.dark ? 0.45 : 0.35) * (L % 3 === 0 ? 1.4 : 0.8));
          ctx.beginPath();
          for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols - 1; x++) {
            const a = v[y * cols + x], b = v[y * cols + x + 1], c = v[(y + 1) * cols + x + 1], d = v[(y + 1) * cols + x];
            const pts = [];
            const edge = (p, q, x0, y0, x1, y1) => { if ((p < iso) !== (q < iso)) { const k = (iso - p) / (q - p); pts.push([(x0 + (x1 - x0) * k) * cw, (y0 + (y1 - y0) * k) * ch]); } };
            edge(a, b, x, y, x + 1, y); edge(b, c, x + 1, y, x + 1, y + 1); edge(c, d, x + 1, y + 1, x, y + 1); edge(d, a, x, y + 1, x, y);
            if (pts.length >= 2) { ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); if (pts.length === 4) { ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); } }
          }
          ctx.stroke();
        }
      },
    },
    circuit: {
      init(s) {
        const step = 26 * s.px, cols = Math.ceil(s.w / step), rows = Math.ceil(s.h / step);
        s.paths = Array.from({ length: Math.round(cols * rows / 9) }, () => {
          let x = Math.floor(rand(0, cols)), y = Math.floor(rand(0, rows)); const pts = [[x * step, y * step]];
          let dir = Math.floor(rand(0, 4));
          for (let i = 0; i < 6; i++) { if (Math.random() < 0.4) dir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4; const len = 1 + Math.floor(rand(0, 4)); x += [1, 0, -1, 0][dir] * len; y += [0, 1, 0, -1][dir] * len; pts.push([x * step, y * step]); }
          let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          return { pts, L, off: rand(0, 1), sp: rand(0.15, 0.4), c: s.colors[Math.floor(rand(0, 4))] };
        });
      },
      draw(ctx, s, t) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1.2 * s.px; ctx.lineJoin = "round";
        for (const p of s.paths) {
          ctx.strokeStyle = rgba(p.c, s.dark ? 0.22 : 0.18); ctx.beginPath(); p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          ctx.fillStyle = rgba(p.c, 0.5); const [ex, ey] = p.pts.at(-1); ctx.beginPath(); ctx.arc(ex, ey, 2.4 * s.px, 0, 6.3); ctx.fill();
          // a pulse running along the trace
          let k = ((t * p.sp + p.off) % 1) * p.L;
          for (let i = 1; i < p.pts.length; i++) {
            const [x0, y0] = p.pts[i - 1], [x1, y1] = p.pts[i], seg = Math.hypot(x1 - x0, y1 - y0);
            if (k <= seg) { const x = x0 + (x1 - x0) * (k / seg), y = y0 + (y1 - y0) * (k / seg); const g = ctx.createRadialGradient(x, y, 0, x, y, 9 * s.px); g.addColorStop(0, rgba(p.c, 0.95)); g.addColorStop(1, rgba(p.c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9 * s.px, 0, 6.3); ctx.fill(); break; }
            k -= seg;
          }
        }
      },
    },
    hexgrid: {
      init(s) { s.waves = []; s.next = 0; },
      draw(ctx, s, t, dt) {
        const { w, h } = s, r = 22 * s.px, hw = Math.sqrt(3) * r;
        ctx.clearRect(0, 0, w, h);
        s.next -= dt;
        if (s.next <= 0 && dt > 0) { s.waves.push({ x: rand(0, w), y: rand(0, h), t: 0, c: s.colors[Math.floor(rand(0, 4))] }); s.next = rand(1.2, 2.6); }
        if (!s.waves.length) s.waves.push({ x: w * 0.6, y: h * 0.45, t: 0.8, c: s.colors[0] });
        s.waves = s.waves.filter((q) => (q.t += dt) < 6);
        ctx.lineWidth = 1 * s.px;
        for (let row = 0, y = 0; y < h + r * 2; row++, y += r * 1.5) {
          for (let x = row % 2 ? hw / 2 : 0; x < w + hw; x += hw) {
            let glow = 0, col = s.colors[0];
            for (const q of s.waves) { const d = Math.hypot(x - q.x, y - q.y), front = q.t * 260 * s.px, k = Math.max(0, 1 - Math.abs(d - front) / (70 * s.px)) * (1 - q.t / 6); if (k > glow) { glow = k; col = q.c; } }
            ctx.beginPath();
            for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = x + Math.cos(a) * r * 0.92, py = y + Math.sin(a) * r * 0.92; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
            ctx.closePath();
            ctx.strokeStyle = rgba(s.fg, s.dark ? 0.07 : 0.1); ctx.stroke();
            if (glow > 0.02) { ctx.fillStyle = rgba(col, glow * 0.45); ctx.fill(); ctx.strokeStyle = rgba(col, glow * 0.9); ctx.stroke(); }
          }
        }
      },
    },
    shards: {
      init(s) { const n = 26; s.sh = Array.from({ length: n }, () => ({ x: rand(0, s.w), y: rand(0, s.h), r: rand(30, 110) * s.px, a: rand(0, 6.3), va: rand(-0.15, 0.15), vx: rand(-8, 8), vy: rand(-6, 6), c1: s.colors[Math.floor(rand(0, 4))], c2: s.colors[Math.floor(rand(0, 4))], k: [rand(0.7, 1.1), rand(0.7, 1.1), rand(0.7, 1.1)] })); },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        for (const q of s.sh) {
          q.a += q.va * dt; q.x += q.vx * dt * s.px; q.y += q.vy * dt * s.px;
          if (q.x < -q.r) q.x = w + q.r; if (q.x > w + q.r) q.x = -q.r; if (q.y < -q.r) q.y = h + q.r; if (q.y > h + q.r) q.y = -q.r;
          const pts = [0, 1, 2].map((i) => [q.x + Math.cos(q.a + i * 2.094) * q.r * q.k[i], q.y + Math.sin(q.a + i * 2.094) * q.r * q.k[i]]);
          const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
          g.addColorStop(0, rgba(q.c1, s.dark ? 0.2 : 0.16)); g.addColorStop(1, rgba(q.c2, s.dark ? 0.05 : 0.04));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = rgba(q.c1, s.dark ? 0.3 : 0.22); ctx.lineWidth = s.px; ctx.stroke();
        }
      },
    },
    beams: {
      lowRes: 0.25,
      draw(ctx, s, t) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = s.dark ? "lighter" : "source-over";
        for (let i = 0; i < 7; i++) {
          const ox = i % 2 ? w * 0.1 : w * 0.9, a = Math.PI / 2 + (i % 2 ? -0.5 : 0.5) + Math.sin(t * 0.15 + i * 1.7) * 0.35, spread = 0.07 + 0.03 * Math.sin(t * 0.2 + i);
          const c = s.colors[i % 4], L = Math.hypot(w, h) * 1.2;
          const g = ctx.createLinearGradient(ox, -10, ox + Math.cos(a) * L * 0.6, Math.sin(a) * L * 0.6);
          g.addColorStop(0, rgba(c, s.dark ? 0.32 : 0.22)); g.addColorStop(1, rgba(c, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, -10);
          ctx.lineTo(ox + Math.cos(a - spread) * L, -10 + Math.sin(a - spread) * L); ctx.lineTo(ox + Math.cos(a + spread) * L, -10 + Math.sin(a + spread) * L); ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      },
    },
    clouds: {
      lowRes: 0.2,
      init(s) { s.c = Array.from({ length: 14 }, () => ({ x: rand(-0.2, 1.2), y: rand(0.05, 0.85), r: rand(0.12, 0.3), v: rand(0.006, 0.02), parts: Array.from({ length: 5 }, () => [rand(-1, 1), rand(-0.35, 0.35), rand(0.45, 0.85)]) })); },
      draw(ctx, s, t, dt) {
        const { w, h } = s, m = Math.max(w, h);
        ctx.clearRect(0, 0, w, h);
        const tint = s.dark ? rgba(s.colors[0], 0.08) : "rgba(255,255,255,.55)";
        for (const c of s.c) {
          c.x += c.v * dt; if (c.x > 1.4) c.x = -0.4;
          for (const [dx, dy, k] of c.parts) {
            const x = (c.x + dx * c.r * 0.9) * w, y = c.y * h + dy * c.r * m, r = c.r * k * m;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, s.dark ? rgba(s.fg, 0.07) : "rgba(255,255,255,.75)"); g.addColorStop(0.6, tint); g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
          }
        }
      },
    },
    rainglass: {
      init(s) {
        s.d = Array.from({ length: Math.min(260, Math.round((s.w * s.h) / (2500 * s.px * s.px))) }, () => ({ x: rand(0, s.w), y: rand(0, s.h), r: rand(1, 3.2) * s.px }));
        s.runs = []; s.next = 0;
      },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        const glass = (x, y, r, a) => { const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${0.85 * a})`); g.addColorStop(0.55, rgba(s.colors[0], 0.35 * a)); g.addColorStop(1, `rgba(255,255,255,${0.35 * a})`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); };
        for (const q of s.d) glass(q.x, q.y, q.r * 1.3, s.dark ? 0.75 : 0.9);
        s.next -= dt;
        if (s.next <= 0 && dt > 0) { s.runs.push({ x: rand(0, w), y: rand(-20, h * 0.4), r: rand(3, 6) * s.px, v: rand(20, 60) * s.px, trail: [] }); s.next = rand(0.15, 0.5); }
        s.runs = s.runs.filter((q) => q.y < h + 20);
        for (const q of s.runs) {
          q.v += rand(-10, 30) * dt * s.px; q.v = Math.max(15 * s.px, Math.min(160 * s.px, q.v));
          q.y += q.v * dt; q.x += Math.sin(q.y * 0.05) * 0.2 * s.px;
          q.trail.push([q.x, q.y]); if (q.trail.length > 60) q.trail.shift();
          ctx.strokeStyle = s.dark ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.6)"; ctx.lineWidth = q.r * 0.7; ctx.lineCap = "round";
          ctx.beginPath(); q.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          glass(q.x, q.y, q.r, 1);
        }
      },
    },
    lightning: {
      init(s) { s.bolt = null; s.flash = 0; s.next = 2; },
      bolt(s) {
        const segs = []; let x = rand(0.2, 0.8) * s.w, y = 0;
        while (y < s.h * rand(0.55, 0.95)) { const nx = x + rand(-40, 40) * s.px, ny = y + rand(15, 40) * s.px; segs.push([x, y, nx, ny]); if (Math.random() < 0.12) { let bx = nx, by = ny; for (let i = 0; i < 5; i++) { const ex = bx + rand(-35, 35) * s.px, ey = by + rand(10, 30) * s.px; segs.push([bx, by, ex, ey]); bx = ex; by = ey; } } x = nx; y = ny; }
        return segs;
      },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, rgba(s.colors[0], s.dark ? 0.12 : 0.08)); sky.addColorStop(1, rgba(s.colors[0], 0));
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        s.next -= dt;
        if (s.next <= 0 && dt > 0) { s.bolt = this.bolt(s); s.flash = 1; s.next = rand(2.5, 7); }
        if (s.flash > 0) {
          ctx.fillStyle = rgba(s.dark ? "#cfd8ff" : "#ffffff", s.flash * 0.18); ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = rgba("#eaf0ff", Math.min(1, s.flash * 1.4)); ctx.lineWidth = 2 * s.px; ctx.shadowColor = s.colors[0]; ctx.shadowBlur = 18 * s.px;
          ctx.beginPath(); for (const [a, b, c, d] of s.bolt) { ctx.moveTo(a, b); ctx.lineTo(c, d); } ctx.stroke();
          ctx.shadowBlur = 0;
          s.flash -= dt * (s.flash > 0.6 ? 6 : 1.6);
        }
      },
    },
    dna: {
      draw(ctx, s, t) {
        const { w, h } = s, cy = h * 0.5, amp = h * 0.12, n = 70, step = w / n;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i <= n; i++) {
          const x = i * step, ph = i * 0.32 + t * 0.9, y1 = cy + Math.sin(ph) * amp, y2 = cy + Math.sin(ph + Math.PI) * amp, z1 = (Math.cos(ph) + 1) / 2, z2 = 1 - z1;
          if (i % 2 === 0) { ctx.strokeStyle = rgba(s.fg, s.dark ? 0.12 : 0.15); ctx.lineWidth = 1.5 * s.px; ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); }
          ctx.fillStyle = rgba(s.colors[0], 0.25 + z1 * 0.6); ctx.beginPath(); ctx.arc(x, y1, (2 + z1 * 3.5) * s.px, 0, 6.3); ctx.fill();
          ctx.fillStyle = rgba(s.colors[2] || s.colors[1], 0.25 + z2 * 0.6); ctx.beginPath(); ctx.arc(x, y2, (2 + z2 * 3.5) * s.px, 0, 6.3); ctx.fill();
        }
      },
    },
    orbits: {
      init(s) { s.p = Array.from({ length: 7 }, (_, i) => ({ r: 0.1 + i * 0.075, sp: 0.6 / Math.pow(i + 1, 1.2), a: rand(0, 6.3), size: rand(3, 8), c: s.colors[i % 4], moon: i > 2 && Math.random() < 0.5 })); },
      draw(ctx, s, t) {
        const { w, h } = s, cx = w * 0.62, cy = h * 0.5, m = Math.min(w, h);
        ctx.clearRect(0, 0, w, h);
        const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 0.09);
        sun.addColorStop(0, rgba(s.colors[1], 0.9)); sun.addColorStop(0.4, rgba(s.colors[1], 0.35)); sun.addColorStop(1, rgba(s.colors[1], 0));
        ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(cx, cy, m * 0.09, 0, 6.3); ctx.fill();
        for (const p of s.p) {
          const R = p.r * m * 1.4;
          ctx.strokeStyle = rgba(p.c, s.dark ? 0.28 : 0.3); ctx.lineWidth = 1.3 * s.px; ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.42, -0.2, 0, 6.3); ctx.stroke();
          const a = p.a + t * p.sp, x = cx + Math.cos(a) * R * Math.cos(-0.2) - Math.sin(a) * R * 0.42 * Math.sin(-0.2), y = cy + Math.cos(a) * R * Math.sin(-0.2) + Math.sin(a) * R * 0.42 * Math.cos(-0.2);
          const pg = ctx.createRadialGradient(x, y, 0, x, y, p.size * 3 * s.px); pg.addColorStop(0, rgba(p.c, 0.45)); pg.addColorStop(1, rgba(p.c, 0)); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, p.size * 3 * s.px, 0, 6.3); ctx.fill();
          ctx.fillStyle = rgba(p.c, 1); ctx.beginPath(); ctx.arc(x, y, p.size * 1.4 * s.px, 0, 6.3); ctx.fill();
          if (p.moon) { const ma = t * 2.2 + p.a; ctx.fillStyle = rgba(s.fg, 0.6); ctx.beginPath(); ctx.arc(x + Math.cos(ma) * 14 * s.px, y + Math.sin(ma) * 6 * s.px, 1.8 * s.px, 0, 6.3); ctx.fill(); }
        }
      },
    },
    mesh: {
      lowRes: 0.06,
      draw(ctx, s, t) {
        const { w, h } = s;
        const pts = s.colors.slice(0, 4).map((c, i) => ({ c, x: (0.5 + 0.42 * Math.sin(t * (0.11 + i * 0.03) + i * 1.9)) * w, y: (0.5 + 0.42 * Math.cos(t * (0.09 + i * 0.025) + i * 2.6)) * h }));
        ctx.fillStyle = rgba(s.colors[3] || s.colors[0], s.dark ? 0.25 : 0.2); ctx.fillRect(0, 0, w, h);
        for (const p of pts) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(w, h) * 0.75); g.addColorStop(0, rgba(p.c, s.dark ? 0.75 : 0.6)); g.addColorStop(1, rgba(p.c, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
      },
    },
    bokeh: {
      init(s) { s.b = Array.from({ length: 34 }, () => ({ x: rand(0, s.w), y: rand(0, s.h), r: rand(20, 90) * s.px, vx: rand(-6, 6), vy: rand(-10, -2), ph: rand(0, 6.3), c: s.colors[Math.floor(rand(0, 4))] })); },
      draw(ctx, s, t, dt) {
        const { w, h } = s;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = s.dark ? "lighter" : "source-over";
        for (const q of s.b) {
          q.x += q.vx * dt * s.px; q.y += q.vy * dt * s.px;
          if (q.y < -q.r) { q.y = h + q.r; q.x = rand(0, w); }
          const a = (0.5 + 0.5 * Math.sin(t * 0.6 + q.ph)) * (s.dark ? 0.16 : 0.14);
          const g = ctx.createRadialGradient(q.x, q.y, q.r * 0.6, q.x, q.y, q.r);
          g.addColorStop(0, rgba(q.c, a)); g.addColorStop(0.92, rgba(q.c, a * 1.4)); g.addColorStop(1, rgba(q.c, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.3); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      },
    },
    equalizer: {
      draw(ctx, s, t) {
        const { w, h } = s, n = 64, bw = w / n;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < n; i++) {
          const v = Math.abs(Math.sin(t * 1.3 + i * 0.35) * 0.5 + Math.sin(t * 2.1 + i * 0.13) * 0.3 + Math.sin(t * 0.7 - i * 0.21) * 0.2);
          const bh = v * h * 0.6 + 6 * s.px, x = i * bw;
          const g = ctx.createLinearGradient(0, h, 0, h - bh);
          g.addColorStop(0, rgba(s.colors[0], s.dark ? 0.75 : 0.5)); g.addColorStop(1, rgba(s.colors[1], s.dark ? 0.3 : 0.2));
          ctx.fillStyle = g; ctx.fillRect(x + bw * 0.18, h - bh, bw * 0.64, bh);
          ctx.fillStyle = rgba(s.colors[1], 0.6); ctx.fillRect(x + bw * 0.18, h - bh - 6 * s.px, bw * 0.64, 2 * s.px);
        }
      },
    },
  };
}

function createBackdrop() {
  const canvas = document.createElement("canvas");
  canvas.id = "backdrop";
  canvas.setAttribute("aria-hidden", "true");
  const img = document.createElement("div");
  img.id = "backdrop-img";
  const video = Object.assign(document.createElement("video"), { id: "backdrop-video", muted: true, loop: true, playsInline: true, autoplay: true });
  video.setAttribute("aria-hidden", "true");
  document.body.prepend(video, img, canvas);
  const ctx = canvas.getContext("2d");
  const effects = makeEffects();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let fx = null, s = null, raf = 0, last = 0, clock = 0, opts = {};
  const setup = () => {
    if (!fx) return;
    const scale = fx.lowRes ?? Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.max(2, Math.round(innerWidth * scale)); canvas.height = Math.max(2, Math.round(innerHeight * scale));
    s = { ...s, w: canvas.width, h: canvas.height, px: scale, colors: opts.colors, fg: opts.fg, dark: opts.dark, mouse: null };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fx.init?.call(fx, s);
  };
  const frame = (now) => {
    raf = 0;
    if (!fx) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    // about 30 frames a second is plenty for a background
    if (last && now - last < 31) { raf = requestAnimationFrame(frame); return; }
    last = now;
    const speed = moving() ? opts.speed : 0;
    clock += dt * speed;
    fx.draw.call(fx, ctx, s, clock, dt * speed);
    if (moving()) raf = requestAnimationFrame(frame);
  };
  const moving = () => opts.speed > 0 && !reduce.matches && !document.hidden && !document.documentElement.classList.contains("reduce-motion");
  const kick = () => { if (!raf && fx) { last = 0; raf = requestAnimationFrame(frame); } };
  addEventListener("resize", () => { if (fx) { setup(); kick(); } });
  document.addEventListener("visibilitychange", kick);
  reduce.addEventListener?.("change", kick);
  addEventListener("pointermove", (e) => { if (s && fx) { s.mouse = { x: e.clientX * s.px, y: e.clientY * s.px }; if (fx === effects.ink) kick(); } }, { passive: true });
  document.addEventListener("pointerleave", () => { if (s) s.mouse = null; });
  addEventListener("pointerdown", (e) => { if (s && fx?.tap) { fx.tap(s, e.clientX * s.px, e.clientY * s.px); kick(); } }, { passive: true });
  let imgUrl = null;
  return {
    async set(o) {
      opts = o;
      const name = o.effect;
      canvas.style.opacity = img.style.opacity = String(o.intensity);
      video.style.display = "none";
      if (name === "video") {
        fx = null; cancelAnimationFrame(raf); raf = 0; canvas.style.display = "none"; img.style.display = "none";
        const blob = await imageStore.getVideo();
        if (video.dataset.size !== String(blob?.size)) { if (video.src) URL.revokeObjectURL(video.src); video.src = blob ? URL.createObjectURL(blob) : ""; video.dataset.size = String(blob?.size); }
        video.style.opacity = String(o.intensity);
        video.style.filter = o.imageBlur ? `blur(${o.imageBlur}px)` : "";
        video.style.display = "block";
        if (blob) { const moving = o.speed > 0 && !reduce.matches && !document.documentElement.classList.contains("reduce-motion"); if (moving) video.play().catch(() => {}); else video.pause(); }
        return !!blob;
      }
      video.pause?.();
      if (name === "image") {
        fx = null; cancelAnimationFrame(raf); raf = 0; canvas.style.display = "none";
        const blob = await imageStore.get();
        if (imgUrl) URL.revokeObjectURL(imgUrl);
        imgUrl = blob ? URL.createObjectURL(blob) : null;
        img.style.backgroundImage = imgUrl ? `url("${imgUrl}")` : "";
        img.style.filter = o.imageBlur ? `blur(${o.imageBlur}px)` : "";
        img.style.display = "block";
        return !!blob;
      }
      img.style.display = "none";
      const next = effects[name] || null;
      canvas.style.display = next ? "block" : "none";
      if (next !== fx) { fx = next; s = {}; clock = 0; }
      if (!fx) { cancelAnimationFrame(raf); raf = 0; return true; }
      setup();
      last = 0;
      if (!raf) raf = requestAnimationFrame(frame);
      if (!moving()) { fx.draw.call(fx, ctx, s, clock || 8, 0); }
      return true;
    },
    get running() { return !!raf; },
    get effect() { return fx; },
  };
}

/* =====================================================================
 * Typing sparks
 * ===================================================================== */
function createSparks() {
  const c = document.createElement("canvas");
  c.id = "sparks";
  c.setAttribute("aria-hidden", "true");
  document.body.append(c);
  const ctx = c.getContext("2d");
  let parts = [], raf = 0, last = 0;
  const size = () => { const r = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * r; c.height = innerHeight * r; ctx.setTransform(r, 0, 0, r, 0, 0); };
  size(); addEventListener("resize", size);
  const tick = (now) => {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => (p.life -= dt) > 0);
    for (const p of parts) {
      p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) { last = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  };
  return {
    burst(x, y, colors, n = 7) {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      for (let i = 0; i < n; i++) { const max = rand(0.35, 0.6); parts.push({ x, y, vx: rand(-110, 110), vy: rand(-190, -40), r: rand(1, 2.4), c: colors[i % colors.length], life: max, max }); }
      if (parts.length > 300) parts = parts.slice(-300);
      if (!raf) raf = requestAnimationFrame(tick);
    },
    get count() { return parts.length; },
  };
}

/* =====================================================================
 * The module
 * ===================================================================== */
export function createLook(A) {
  const root = document.documentElement;
  let backdrop = null, sparks = null;
  const loadedFonts = new Set();
  const fontLink = (family) => {
    if (!family || loadedFonts.has(family)) return;
    loadedFonts.add(family);
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`;
    document.head.append(l);
  };
  const fxOn = () => A.settings.bgEffect && A.settings.bgEffect !== "none";

  function themeColors() {
    const css = getComputedStyle(root), v = (k) => css.getPropertyValue(k).trim();
    const t = A.effectiveTheme();
    const c = t.c;
    return { colors: [v("--accent") || c.accent, c.keyword, c.func, c.string, c.type, c.number], fg: c.fg, dark: t.type === "dark" };
  }

  /** Apply everything that does not need the editor. Safe to call early in boot. */
  function apply() {
    const st = A.settings;
    root.classList.toggle("fx", !!fxOn());
    root.classList.toggle("fx-blur", !!fxOn() && !!st.glassBlur);
    root.style.setProperty("--glass", String(Math.max(0.3, Math.min(1, (st.glass ?? 80) / 100))));
    root.dataset.corners = st.corners || "default";
    root.dataset.cursorfx = st.cursorEffect || "none";
    // fonts
    const ui = UI_FONTS.find((f) => f[0] === st.uiFont) || UI_FONTS[0];
    fontLink(ui[2]);
    root.style.setProperty("--ui", ui[2] ? `"${ui[2]}", ${UI_STACK.plex}` : UI_STACK[ui[0]] || UI_STACK.plex);
    const mono = CODE_FONTS.find((f) => f[0] === st.editorFont) || CODE_FONTS[0];
    fontLink(mono[2]);
    root.style.setProperty("--mono", mono[2] ? `"${mono[2]}", ${MONO_STACK.jetbrains}` : MONO_STACK[mono[0]] || MONO_STACK.jetbrains);
    if (mono[2] && document.fonts?.load) document.fonts.load(`14px "${mono[2]}"`).then(() => { A.monaco?.editor.remeasureFonts(); A.refreshEditorOptions?.(); }).catch(() => {});
    updateBackdrop();
  }
  async function updateBackdrop() {
    const st = A.settings;
    if (!fxOn()) { if (backdrop) await backdrop.set({ effect: "none", intensity: 0 }); return; }
    backdrop ||= createBackdrop();
    const ok = await backdrop.set({ effect: st.bgEffect, intensity: Math.max(0.05, Math.min(1, (st.bgIntensity ?? 60) / 100)), speed: ((st.bgSpeed ?? 40) / 40), imageBlur: st.bgImageBlur || 0, ...themeColors() });
    if (!ok && st.bgEffect === "video") A.toast("Pick a video for the background in Settings > Background and effects.");
    if (!ok && st.bgEffect === "image") A.toast("Pick an image for the background in Settings > Background and effects.");
  }

  async function chooseImage() {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return;
      if (!f.type.startsWith("image/")) return A.toast("That is not an image.", "error");
      try {
        const blob = f.size > 600_000 || !/jpe?g|png|webp|gif/.test(f.type) ? await shrinkImage(f) : f;
        await imageStore.set(blob);
        A.setSetting("bgEffect", "image");
        A.toast("Background image set. It is stored in this browser only.", "ok");
      } catch (e) { A.toast("Could not use that image: " + e.message, "error"); }
    };
    input.click();
  }
  async function chooseVideo() {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "video/mp4,video/webm,video/*" });
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return;
      if (!f.type.startsWith("video/")) return A.toast("That is not a video.", "error");
      if (f.size > 120_000_000) return A.toast("That video is over 120 MB. Pick a shorter or smaller one (a few seconds that loop work best).", "error");
      await imageStore.setVideo(f);
      A.setSetting("bgEffect", "video");
      A.toast("Video background set. It plays muted, on a loop, and is stored in this browser only.", "ok");
    };
    input.click();
  }
  async function removeVideo() { await imageStore.delVideo(); if (A.settings.bgEffect === "video") A.setSetting("bgEffect", "none"); else A.rerenderSettings?.(); }
  async function removeImage() {
    await imageStore.del();
    if (A.settings.bgEffect === "image") A.setSetting("bgEffect", "none"); else A.rerenderSettings?.();
  }
  const imageThumb = async () => { const b = await imageStore.get(); return b ? URL.createObjectURL(b) : null; };

  function applyLook(look) {
    A.LS.set("look", look.id);
    for (const [k, v] of Object.entries(look.set)) A.settings[k] = v;
    if (look.theme && A.themeExists(look.theme)) A.setSetting("theme", look.theme);
    else A.setSetting("bgEffect", A.settings.bgEffect); // saves and re-applies everything
    A.toast(`${look.name} look on. Change any part of it in Settings > Background and effects.`, "ok");
  }
  function pickLook() {
    A.quickPick({
      placeholder: "Pick a look: a theme with a background and effects to match",
      source: (q) => LOOKS.filter((l) => !q || (l.name + " " + l.desc).toLowerCase().includes(q.toLowerCase()))
        .map((l) => ({ label: l.name, detail: l.desc, desc: A.LS.get("look", "") === l.id ? "current" : "", run: () => applyLook(l) })),
    });
  }
  /** Small preview card for a look, drawn from its theme's colours. */
  function lookCard(l) {
    const t = (l.theme && A.themeById(l.theme)) || A.effectiveTheme();
    const c = t.c;
    const art = {
      none: `linear-gradient(${c.bg}, ${c.bg})`,
      aurora: `radial-gradient(circle at 25% 30%, ${c.keyword}88, transparent 55%), radial-gradient(circle at 75% 65%, ${c.func}88, transparent 55%), radial-gradient(circle at 60% 20%, ${c.string}66, transparent 45%)`,
      stars: `radial-gradient(1.5px 1.5px at 20% 30%, ${c.fg}, transparent), radial-gradient(1px 1px at 60% 70%, ${c.fg}, transparent), radial-gradient(1.5px 1.5px at 80% 20%, ${c.accent}, transparent), radial-gradient(1px 1px at 35% 80%, ${c.fg}, transparent), radial-gradient(1px 1px at 90% 55%, ${c.fg}, transparent), radial-gradient(circle at 70% 30%, ${c.accent}33, transparent 60%)`,
      particles: `radial-gradient(2px 2px at 20% 40%, ${c.accent}, transparent), radial-gradient(2px 2px at 45% 25%, ${c.keyword}, transparent), radial-gradient(2px 2px at 70% 60%, ${c.func}, transparent), linear-gradient(32deg, transparent 49%, ${c.accent}55 50%, transparent 51%)`,
      grid: `linear-gradient(transparent 55%, ${c.accent}22 55%), repeating-linear-gradient(90deg, transparent 0 14px, ${c.accent}55 14px 15px), radial-gradient(circle at 50% 50%, ${c.keyword}aa, transparent 18%)`,
      waves: `radial-gradient(120% 40% at 50% 100%, ${c.accent}66, transparent 70%), radial-gradient(120% 30% at 30% 100%, ${c.func}55, transparent 70%)`,
      rain: `repeating-linear-gradient(90deg, transparent 0 9px, ${c.accent}44 9px 10px)`,
      silk: `repeating-linear-gradient(170deg, transparent 0 7px, ${c.accent}44 7px 8px), linear-gradient(90deg, ${c.accent}22, ${c.keyword}33)`,
      dotsea: `radial-gradient(circle, ${c.accent}aa 1px, transparent 1.6px) 0 40px / 9px 6px, linear-gradient(transparent 50%, ${c.accent}22)`,
      ripples: `radial-gradient(circle at 65% 55%, transparent 0 14px, ${c.accent}88 15px, transparent 16px 24px, ${c.accent}55 25px, transparent 26px 34px, ${c.accent}33 35px, transparent 36px)`,
      flow: `repeating-radial-gradient(circle at 30% 120%, transparent 0 6px, ${c.func}33 6px 7px), linear-gradient(120deg, ${c.accent}22, transparent)`,
      hills: `radial-gradient(120% 40% at 30% 100%, ${c.accent}77, transparent 70%), radial-gradient(90% 35% at 80% 100%, ${c.keyword}66, transparent 70%), radial-gradient(circle at 72% 35%, ${c.func}66, transparent 18%)`,
      lava: `radial-gradient(circle at 30% 40%, ${c.accent}cc 0 12px, transparent 22px), radial-gradient(circle at 65% 70%, ${c.keyword}bb 0 16px, transparent 26px), radial-gradient(circle at 80% 25%, ${c.func}aa 0 8px, transparent 16px)`,
      plasma: `conic-gradient(from 40deg at 60% 50%, ${c.accent}77, ${c.keyword}77, ${c.func}77, ${c.string}77, ${c.accent}77)`,
      ink: `radial-gradient(circle at 30% 60%, ${c.accent}88, transparent 30%), radial-gradient(circle at 55% 45%, ${c.keyword}77, transparent 25%), radial-gradient(circle at 75% 35%, ${c.func}66, transparent 20%)`,
      snow: `radial-gradient(2px 2px at 20% 30%, #fff, transparent), radial-gradient(3px 3px at 60% 20%, #fff, transparent), radial-gradient(2px 2px at 80% 60%, #fff, transparent), radial-gradient(2px 2px at 40% 75%, #fff, transparent), radial-gradient(3px 3px at 70% 85%, #fff, transparent)`,
      sakura: `radial-gradient(4px 6px at 25% 30%, #ffb7c5, transparent), radial-gradient(5px 7px at 65% 25%, #ff9eb5, transparent), radial-gradient(4px 6px at 80% 70%, #ffd1dc, transparent), radial-gradient(5px 7px at 45% 80%, #ffb7c5, transparent)`,
      leaves: `radial-gradient(5px 8px at 25% 30%, #d9622b, transparent), radial-gradient(6px 9px at 65% 55%, #e8a33d, transparent), radial-gradient(5px 8px at 80% 25%, #b8401f, transparent)`,
      fireflies: `radial-gradient(circle at 25% 65%, #e6ff8cdd 0 2px, #bef05a44 4px, transparent 9px), radial-gradient(circle at 60% 45%, #e6ff8cdd 0 2px, #bef05a44 4px, transparent 9px), radial-gradient(circle at 80% 75%, #e6ff8cbb 0 2px, transparent 7px)`,
      fireworks: `radial-gradient(circle at 35% 40%, transparent 0 8px, ${c.accent} 9px 10px, transparent 11px), repeating-conic-gradient(from 0deg at 70% 35%, ${c.keyword}aa 0 4deg, transparent 4deg 24deg)`,
      bubbles: `radial-gradient(circle at 25% 70%, ${c.accent}66 0 9px, transparent 10px), radial-gradient(circle at 70% 40%, ${c.func}55 0 14px, transparent 15px), radial-gradient(circle at 50% 85%, ${c.keyword}55 0 6px, transparent 7px)`,
      gradient: `linear-gradient(120deg, ${c.accent}66, ${c.keyword}55, ${c.string}55)`,
    }[l.set.bgEffect] || "none";
    const on = A.LS.get("look", "") === l.id;
    return A.h("button", { class: "look-card" + (on ? " on" : ""), title: l.desc, onclick: () => applyLook(l) },
      A.h("span", { class: "look-art", style: { background: `${art}, ${c.bg}` } },
        A.h("span", { class: "look-code" }, A.h("i", { style: { background: c.keyword } }), A.h("i", { style: { background: c.string, width: "40%" } }), A.h("i", { style: { background: c.func, width: "55%" } }))),
      A.h("span", { class: "look-name" }, l.name), A.h("span", { class: "look-desc" }, l.desc));
  }

  // cursor sparks while typing
  function onEditorReady() {
    const ed = A.editor;
    ed.onDidChangeModelContent((e) => {
      if (A.settings.cursorEffect !== "sparks" || e.isFlush || e.isUndoing || e.isRedoing) return;
      if (!e.changes.length || e.changes[0].text.length > 3 || !ed.hasTextFocus()) return; // typing, not pasting
      const pos = ed.getPosition(), vis = pos && ed.getScrolledVisiblePosition(pos);
      if (!vis) return;
      const r = ed.getDomNode().getBoundingClientRect();
      sparks ||= createSparks();
      sparks.burst(r.left + vis.left, r.top + vis.top + vis.height / 2, themeColors().colors.slice(0, 4));
    });
  }

  const commands = [
    { id: "look-pick", label: "Choose a Look...", cat: "Preferences", run: pickLook },
    { id: "bg-pick", label: "Background Effect...", cat: "Preferences", run: () => A.quickPick({ placeholder: "Pick a background", source: () => EFFECTS.map(([v, l]) => ({ label: l, desc: A.settings.bgEffect === v ? "current" : "", run: () => (v === "image" ? chooseImage() : A.setSetting("bgEffect", v)) })) }) },
    { id: "bg-image", label: "Set Background Image...", cat: "Preferences", run: chooseImage },
  ];
  /** Use a picture (a Blob) as the background, as if it had been chosen in Settings. */
  async function setImage(blob) {
    await imageStore.set(blob.size > 600_000 ? await shrinkImage(blob) : blob);
    A.setSetting("bgEffect", "image");
  }
  const burst = (x, y, colors, n) => (sparks ||= createSparks()).burst(x, y, colors || themeColors().colors.slice(0, 4), n);
  return { apply, updateBackdrop, onEditorReady, fxOn, commands, chooseImage, removeImage, chooseVideo, removeVideo, imageThumb, lookCard, pickLook, LOOKS, setImage, burst, themeColors, get backdrop() { return backdrop; }, get sparks() { return sparks; } };
}
