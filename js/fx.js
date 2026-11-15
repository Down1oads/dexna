// The fun stuff: a theme made from your picture, a rainbow accent, glowing code, a smooth cursor trail,
// power mode, screen filters (CRT, film grain, vignette, night light), ambient sounds, and day/night themes.
import { registerCustomTheme, monacoTheme, THEMES } from "./themes.js";

/* =====================================================================
 * Colour helpers (exported for tests)
 * ===================================================================== */
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, s, l];
}
export function hslToRgb([h, s, l]) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
/** k-means on pixels; returns clusters { rgb, n } sorted by size. */
export function clusters(pixels, k = 8, rounds = 8) {
  if (!pixels.length) return [];
  let cs = Array.from({ length: k }, (_, i) => pixels[Math.floor(((i + 0.5) / k) * pixels.length)].slice());
  let groups = [];
  for (let it = 0; it < rounds; it++) {
    groups = cs.map(() => ({ sum: [0, 0, 0], n: 0 }));
    for (const p of pixels) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < cs.length; i++) { const c = cs[i], d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = i; } }
      const g = groups[best]; g.sum[0] += p[0]; g.sum[1] += p[1]; g.sum[2] += p[2]; g.n++;
    }
    cs = groups.map((g, i) => (g.n ? g.sum.map((v) => v / g.n) : cs[i]));
  }
  return cs.map((rgb, i) => ({ rgb, n: groups[i].n })).filter((c) => c.n).sort((a, b) => b.n - a.n);
}
/** Turn a picture's colours into a full theme palette. */
export function paletteFromPixels(pixels, { type = "auto" } = {}) {
  const cl = clusters(pixels, 10);
  const avgL = pixels.reduce((s, p) => s + lum(p), 0) / pixels.length;
  const dark = type === "dark" || (type === "auto" && avgL < 0.4);
  // background: the most common colour, pushed very dark (or very light) but keeping a hint of its hue
  const [bh, bs] = rgbToHsl(cl[0].rgb);
  const bg = hslToRgb([bh, Math.min(bs, 0.35) * 0.8, dark ? 0.09 : 0.965]);
  const fg = hslToRgb([bh, Math.min(bs, 0.2), dark ? 0.86 : 0.16]);
  // the colourful clusters, most vivid first, each turned into a readable text colour
  const vivid = cl.map((c) => ({ ...c, hsl: rgbToHsl(c.rgb) })).filter((c) => c.hsl[1] > 0.18).sort((a, b) => b.hsl[1] * Math.sqrt(b.n) - a.hsl[1] * Math.sqrt(a.n));
  const hues = vivid.map((c) => c.hsl[0]);
  // fill up to 7 well-separated hues, inventing neighbours of the main hue when the picture has few colours
  const picked = [];
  for (const h of hues) if (picked.every((p) => Math.min(Math.abs(p - h), 360 - Math.abs(p - h)) > 22)) picked.push(h);
  const base = picked[0] ?? bh;
  for (const step of [40, -40, 80, -80, 140, 180, -140, 110]) { if (picked.length >= 7) break; const h = (base + step + 360) % 360; if (picked.every((p) => Math.min(Math.abs(p - h), 360 - Math.abs(p - h)) > 22)) picked.push(h); }
  const sat = Math.max(0.55, Math.min(0.85, vivid[0]?.hsl[1] ?? 0.6));
  const bgHex = toHex(...bg);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /** A colour of this hue that reads well on the background: lightness moves away from the background until it does. */
  const readable = (h, s, l, min = 4.5) => {
    for (let i = 0; i < 40; i++) {
      const rgb = hslToRgb([h, s, l]);
      if (ratio(rgb, bg) >= min) return toHex(...rgb);
      l = dark ? Math.min(0.97, l + 0.02) : Math.max(0.05, l - 0.02);
    }
    return toHex(...hslToRgb([h, s, l]));
  };
  const text = (h, l = dark ? 0.7 : 0.38) => readable(h, sat, l);
  const [accentH, kwH, strH, fnH, numH, typeH, opH] = picked;
  return {
    type: dark ? "dark" : "light",
    c: {
      bg: bgHex, fg: toHex(...fg), accent: text(accentH, dark ? 0.62 : 0.45),
      comment: readable(bh, 0.12, dark ? 0.5 : 0.55, 3),
      keyword: text(kwH), string: text(strH), func: text(fnH), number: text(numH), type: text(typeH), operator: text(opH, dark ? 0.75 : 0.35), constant: text(numH, dark ? 0.76 : 0.34),
      err: dark ? "#f2777a" : "#c8303a", warn: dark ? "#f0b45a" : "#a86a00", ok: dark ? "#7fd18a" : "#2f8a3e", info: text(accentH, dark ? 0.72 : 0.4),
    },
  };
}

/* =====================================================================
 * Ambient sounds (made in the browser, nothing to download)
 * ===================================================================== */
function createAmbient() {
  let ac = null, master = null, nodes = [], timers = [], kind = "off";
  const noiseBuffer = (brown) => {
    const len = ac.sampleRate * 4, buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    }
    return buf;
  };
  const loop = (buf) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); nodes.push(s); return s; };
  const filter = (type, freq, q = 0.7) => { const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; nodes.push(f); return f; };
  const gain = (v) => { const g = ac.createGain(); g.gain.value = v; nodes.push(g); return g; };
  function stop() { for (const n of nodes) { try { n.stop?.(); } catch (_) {} try { n.disconnect(); } catch (_) {} } nodes = []; timers.forEach(clearInterval); timers = []; }
  function start(k, volume) {
    kind = k;
    stop();
    if (k === "off") return;
    if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.connect(ac.destination); }
    if (ac.state === "suspended") ac.resume();
    master.gain.value = volume;
    if (k === "brown") loop(noiseBuffer(true)).connect(filter("lowpass", 900)).connect(gain(0.9)).connect(master);
    else if (k === "rain") {
      loop(noiseBuffer(false)).connect(filter("highpass", 900)).connect(filter("lowpass", 7000)).connect(gain(0.18)).connect(master);
      loop(noiseBuffer(true)).connect(filter("lowpass", 500)).connect(gain(0.4)).connect(master);
      const drops = gain(0.5); drops.connect(master);
      const white = noiseBuffer(false);
      timers.push(setInterval(() => { // single drops on a window
        if (Math.random() < 0.5) return;
        const s = ac.createBufferSource(); s.buffer = white; const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2500 + Math.random() * 3500; f.Q.value = 6;
        const g = ac.createGain(), t = ac.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 + Math.random() * 0.3, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        s.connect(f).connect(g).connect(drops); s.start(t, Math.random() * 3); s.stop(t + 0.07);
      }, 70));
    } else if (k === "waves") {
      const g = gain(0.0); loop(noiseBuffer(true)).connect(filter("lowpass", 700)).connect(g).connect(master);
      const g2 = gain(0.0); loop(noiseBuffer(false)).connect(filter("bandpass", 1200, 0.5)).connect(g2).connect(master);
      let t0 = ac.currentTime;
      const swell = () => { // a wave rolls in and pulls back every 7 to 11 seconds
        const t = Math.max(ac.currentTime, t0), len = 7 + Math.random() * 4;
        g.gain.setValueAtTime(0.15, t); g.gain.linearRampToValueAtTime(1.0, t + len * 0.4); g.gain.linearRampToValueAtTime(0.15, t + len);
        g2.gain.setValueAtTime(0.0, t); g2.gain.linearRampToValueAtTime(0.12, t + len * 0.45); g2.gain.linearRampToValueAtTime(0.0, t + len * 0.8);
        t0 = t + len;
      };
      swell(); swell();
      timers.push(setInterval(() => { if (t0 - ac.currentTime < 10) swell(); }, 2000));
    } else if (k === "fire") {
      loop(noiseBuffer(true)).connect(filter("lowpass", 300)).connect(gain(1.0)).connect(master);
      const white = noiseBuffer(false), crack = gain(0.6); crack.connect(master);
      timers.push(setInterval(() => { // crackles and pops
        const pops = Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 4) : 0;
        for (let i = 0; i < pops; i++) {
          const s = ac.createBufferSource(); s.buffer = white; const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1500 + Math.random() * 3000;
          const g = ac.createGain(), t = ac.currentTime + Math.random() * 0.15; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2 + Math.random() * 0.5, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02 + Math.random() * 0.04);
          s.connect(f).connect(g).connect(crack); s.start(t, Math.random() * 3); s.stop(t + 0.08);
        }
      }, 120));
    } else if (k === "hum") { // a soft space-station drone
      for (const [f, v] of [[55, 0.35], [82.4, 0.2], [110, 0.12], [164.8, 0.06]]) {
        const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f; const g = gain(v);
        const lfo = ac.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.08; const lg = gain(v * 0.5); lfo.connect(lg).connect(g.gain);
        o.connect(g).connect(master); o.start(); lfo.start(); nodes.push(o, lfo);
      }
      loop(noiseBuffer(true)).connect(filter("lowpass", 200)).connect(gain(0.25)).connect(master);
    }
  }
  return { start, stop, setVolume: (v) => { if (master) master.gain.value = v; }, get kind() { return kind; }, get running() { return kind !== "off" && !!ac && ac.state === "running"; } };
}

export function createFx(A) {
  const { h, toast } = A;
  const root = document.documentElement;

  /* =====================================================================
   * Theme from a picture
   * ===================================================================== */
  async function pixelsOf(file) {
    const bmp = await createImageBitmap(file);
    const c = document.createElement("canvas"), n = 72;
    const s = n / Math.max(bmp.width, bmp.height);
    c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s));
    const ctx = c.getContext("2d"); ctx.drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
    const d = ctx.getImageData(0, 0, c.width, c.height).data, px = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) px.push([d[i], d[i + 1], d[i + 2]]);
    return px;
  }
  function themeFromPicture() {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const px = await pixelsOf(file);
        if (px.length < 20) throw new Error("the picture is empty or fully see-through");
        let choice = { type: "auto", bg: true };
        const make = () => paletteFromPixels(px, { type: choice.type });
        const preview = h("div", { class: "pt-preview" });
        const draw = () => {
          const p = make(), c = p.c;
          preview.style.background = c.bg;
          preview.replaceChildren(
            h("div", { class: "pt-code", style: { color: c.fg } },
              h("div", {}, h("span", { style: { color: c.keyword } }, "def "), h("span", { style: { color: c.func } }, "greet"), "(name: ", h("span", { style: { color: c.type } }, "str"), "):"),
              h("div", {}, "    ", h("span", { style: { color: c.comment, fontStyle: "italic" } }, "# say hello")),
              h("div", {}, "    ", h("span", { style: { color: c.keyword } }, "return "), h("span", { style: { color: c.string } }, "f\"Hello, {name}!\""), h("span", { style: { color: c.operator } }, " * "), h("span", { style: { color: c.number } }, "3"))),
            h("div", { class: "pt-swatches" }, ["accent", "keyword", "string", "func", "number", "type", "operator"].map((k) => h("i", { style: { background: c[k] }, title: k }))));
        };
        const type = h("select", { onchange: () => { choice.type = type.value; draw(); } }, h("option", { value: "auto" }, "Pick dark or light from the picture"), h("option", { value: "dark" }, "Dark"), h("option", { value: "light" }, "Light"));
        const useBg = h("input", { type: "checkbox", checked: true, onchange: () => { choice.bg = useBg.checked; } });
        const name = h("input", { value: (file.name.replace(/\.[^.]+$/, "") || "Picture").slice(0, 30) + " theme", maxlength: 40 });
        draw();
        A.openModal(h("div", { class: "modal pt-modal" },
          h("div", { class: "modal-head" }, "Theme from a picture"),
          h("div", { class: "modal-body" },
            h("p", { class: "muted small" }, "Dexna picked these colors from your picture and adjusted them so code stays easy to read."),
            preview,
            h("label", { class: "sn-field" }, h("span", {}, "Name"), name),
            h("label", { class: "sn-field" }, h("span", {}, "Kind"), type),
            h("label", { class: "si-check" }, useBg, h("span", {}, "Also use the picture as the background"))),
          h("div", { class: "modal-foot" },
            h("button", { class: "btn", onclick: () => A.closeModal() }, "Cancel"),
            h("button", { class: "btn primary", onclick: async () => {
              const p = make();
              const t = registerCustomTheme({ id: "custom-" + Date.now().toString(36), name: name.value.trim() || "Picture theme", type: p.type, c: p.c });
              A.monaco?.editor.defineTheme(t.id, monacoTheme(t));
              A.LS.set("customThemes", THEMES.filter((x) => x.custom).map(({ id, name, type, c }) => ({ id, name, type, c })));
              A.closeModal();
              A.setSetting("theme", t.id);
              if (choice.bg) { await A.look.setImage(file); if (!A.settings.bgImageBlur) A.setSetting("bgImageBlur", 8); if ((A.settings.glass ?? 80) > 75) A.setSetting("glass", 70); }
              toast(`"${t.name}" is on. Edit it any time with Edit Color Theme.`, "ok");
            } }, "Use this theme"))));
      } catch (e) { toast("Could not read that picture: " + e.message, "error"); }
    };
    input.click();
  }

  /* =====================================================================
   * Chroma: the accent colour slowly travels around the colour wheel
   * ===================================================================== */
  let chromaTimer = 0, chromaHue = 0;
  function chroma() {
    clearInterval(chromaTimer); chromaTimer = 0;
    if (!A.settings.chroma) { A.applyTheme(); return; }
    const base = A.effectiveTheme().c.accent;
    const [, s, l] = rgbToHsl([1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16)));
    chromaHue = rgbToHsl([1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16)))[0];
    const step = () => {
      if (document.hidden) return;
      chromaHue = (chromaHue + 360 / (A.settings.chromaSeconds || 20) / 20) % 360;
      const [r, g, b] = hslToRgb([chromaHue, Math.max(0.6, s), Math.min(0.66, Math.max(0.5, l))]);
      root.style.setProperty("--accent", toHex(r, g, b));
      root.style.setProperty("--sel", `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, .22)`);
      root.style.setProperty("--chroma", toHex(r, g, b));
    };
    step();
    chromaTimer = setInterval(step, 50);
  }

  /* =====================================================================
   * Smooth cursor trail (the cursor glides and smears when it jumps)
   * ===================================================================== */
  let trail = null;
  function trailCanvas() {
    if (trail) return trail;
    const c = Object.assign(document.createElement("canvas"), { id: "cursor-trail" });
    c.setAttribute("aria-hidden", "true");
    document.body.append(c);
    const ctx = c.getContext("2d");
    const size = () => { const r = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * r; c.height = innerHeight * r; ctx.setTransform(r, 0, 0, r, 0, 0); };
    size(); addEventListener("resize", size);
    trail = { c, ctx, anims: [], raf: 0, last: null };
    return trail;
  }
  function cursorPoint() {
    const ed = A.editor, pos = ed?.getPosition(), vis = pos && ed.getScrolledVisiblePosition(pos);
    if (!vis) return null;
    const r = ed.getDomNode().getBoundingClientRect(), layout = ed.getLayoutInfo();
    const x = r.left + vis.left, y = r.top + vis.top;
    if (x < r.left + layout.contentLeft - 2 || x > r.right || y < r.top || y > r.bottom) return null;
    return { x, y, h: vis.height };
  }
  function onCursorMove() {
    if (!A.settings.cursorTrail || root.classList.contains("reduce-motion")) return;
    const t = trailCanvas(), now = cursorPoint();
    if (!now) { t.last = null; return; }
    const from = t.last; t.last = now;
    if (!from || (Math.abs(from.x - now.x) < 2 && Math.abs(from.y - now.y) < 2)) return;
    if (Math.hypot(from.x - now.x, from.y - now.y) > 2000) return;
    t.anims.push({ from, to: now, start: performance.now() });
    if (!t.raf) t.raf = requestAnimationFrame(drawTrail);
  }
  function drawTrail(time) {
    const t = trail, { ctx } = t;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const color = getComputedStyle(root).getPropertyValue("--accent").trim() || "#4c8dff";
    const DUR = 170;
    t.anims = t.anims.filter((a) => time - a.start < DUR);
    for (const a of t.anims) {
      const k = Math.min(1, (time - a.start) / DUR), e = 1 - (1 - k) ** 3; // ease out
      // the head races to the target, the tail follows behind it: a stretched quad between them
      const head = { x: a.from.x + (a.to.x - a.from.x) * Math.min(1, e * 1.6), y: a.from.y + (a.to.y - a.from.y) * Math.min(1, e * 1.6) };
      const tail = { x: a.from.x + (a.to.x - a.from.x) * e, y: a.from.y + (a.to.y - a.from.y) * e };
      const w = 2.5;
      ctx.globalAlpha = 0.55 * (1 - k);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.lineTo(head.x + w, head.y + a.to.h); ctx.lineTo(tail.x + w, tail.y + a.from.h);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    t.raf = t.anims.length ? requestAnimationFrame(drawTrail) : 0;
    if (!t.raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  /* =====================================================================
   * Power mode: sparks, a combo counter and a shake at milestones
   * ===================================================================== */
  const power = { combo: 0, timer: 0, el: null, best: A.LS.get("powerBest", 0) };
  function comboEl() {
    if (power.el) return power.el;
    power.el = h("div", { class: "power-combo hidden" }, h("b", {}), h("span", {}, "combo"), h("i", {}));
    document.getElementById("editor-wrap")?.append(power.el);
    return power.el;
  }
  function onType(e) {
    if (!A.settings.powerMode || e.isFlush || e.isUndoing || e.isRedoing || !e.changes.length || e.changes[0].text.length > 3 || !A.editor.hasTextFocus()) return;
    power.combo++;
    clearTimeout(power.timer);
    power.timer = setTimeout(() => { power.combo = 0; comboEl().classList.add("hidden"); }, 2600);
    const el = comboEl();
    el.classList.remove("hidden");
    el.querySelector("b").textContent = power.combo;
    el.querySelector("i").style.animation = "none"; void el.offsetWidth; el.querySelector("i").style.animation = ""; // restart the countdown bar
    el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    if (power.combo > power.best) { power.best = power.combo; A.LS.set("powerBest", power.best); }
    const p = cursorPoint();
    if (p) A.look.burst(p.x, p.y + p.h / 2, null, Math.min(16, 5 + Math.floor(power.combo / 10)));
    if ([25, 50, 100, 200, 300, 500, 1000].includes(power.combo) && !root.classList.contains("reduce-motion")) {
      const wrap = document.getElementById("editor-wrap");
      wrap.classList.remove("shake"); void wrap.offsetWidth; wrap.classList.add("shake");
      el.classList.add("milestone"); setTimeout(() => el.classList.remove("milestone"), 900);
      if (p) for (let i = 0; i < 3; i++) setTimeout(() => A.look.burst(p.x, p.y, null, 24), i * 90);
    }
  }

  /* =====================================================================
   * Screen filters
   * ===================================================================== */
  let filterEl = null;
  function screenFilter() {
    const f = A.settings.screenFilter || "none";
    if (f === "none") { filterEl?.remove(); filterEl = null; return; }
    if (!filterEl) { filterEl = h("div", { id: "screen-filter", "aria-hidden": "true" }); document.body.append(filterEl); }
    filterEl.className = "sf-" + f;
    filterEl.style.setProperty("--sf", String(Math.max(0.1, Math.min(1, (A.settings.filterStrength ?? 50) / 100))));
  }

  /* =====================================================================
   * Ambient sounds
   * ===================================================================== */
  const ambient = createAmbient();
  let waitingForGesture = false;
  function ambientApply() {
    const k = A.settings.ambient || "off", v = Math.max(0.02, Math.min(1, (A.settings.ambientVolume ?? 40) / 100)) * 0.6;
    if (k === "off") { ambient.stop(); ambient.start("off"); return; }
    if (ambient.kind === k && ambient.running) { ambient.setVolume(v); return; }
    // browsers only allow sound after a click or key press on the page
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
      if (waitingForGesture) return;
      waitingForGesture = true;
      const go = () => { waitingForGesture = false; removeEventListener("pointerdown", go, true); removeEventListener("keydown", go, true); ambientApply(); };
      addEventListener("pointerdown", go, true); addEventListener("keydown", go, true);
      return;
    }
    ambient.start(k, v);
  }

  /* =====================================================================
   * Day and night themes by the clock
   * ===================================================================== */
  let clockTimer = 0;
  function dayNight() {
    clearInterval(clockTimer); clockTimer = 0;
    if (!A.settings.timeTheme) return;
    const check = () => {
      const hr = new Date().getHours(), day = hr >= (+A.settings.dayStarts || 7) && hr < (+A.settings.nightStarts || 19);
      const want = day ? A.settings.lightTheme : A.settings.darkTheme;
      if (A.settings.theme !== want) A.setSetting("theme", want);
    };
    check();
    clockTimer = setInterval(check, 60000);
  }

  /* =====================================================================
   * Hooks
   * ===================================================================== */
  function apply() {
    const g = A.settings.codeGlow || "off";
    root.dataset.glow = g;
    screenFilter();
  }
  function onSetting(key) {
    if (key === "codeGlow" || key === "screenFilter" || key === "filterStrength") apply();
    if (key === "chroma" || key === "chromaSeconds" || (A.settings.chroma && (key === "theme" || key === "accentColor"))) setTimeout(chroma, 0);
    if (key === "ambient" || key === "ambientVolume") ambientApply();
    if (key === "timeTheme" || key === "dayStarts" || key === "nightStarts") dayNight();
    if (key === "cursorTrail" && !A.settings.cursorTrail && trail) trail.ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
  function onEditorReady() {
    const ed = A.editor;
    ed.onDidChangeCursorPosition(onCursorMove);
    ed.onDidScrollChange(() => { if (trail) trail.last = null; });
    ed.onDidChangeModel(() => { if (trail) trail.last = null; });
    ed.onDidChangeModelContent(onType);
    apply();
    if (A.settings.chroma) chroma();
    if (A.settings.ambient && A.settings.ambient !== "off") ambientApply();
    dayNight();
  }

  const commands = [
    { id: "theme-picture", label: "Create Theme from a Picture...", cat: "Preferences", run: themeFromPicture },
    { id: "power-mode", label: "Toggle Power Mode", cat: "Preferences", run: () => { A.setSetting("powerMode", !A.settings.powerMode); toast(A.settings.powerMode ? `Power mode on. Your best combo: ${power.best}` : "Power mode off"); } },
    { id: "ambient-pick", label: "Ambient Sound...", cat: "Preferences", run: () => A.quickPick({ placeholder: "Play a background sound while you work", source: () => [["off", "Off"], ["rain", "Rain"], ["waves", "Ocean waves"], ["fire", "Fireplace"], ["brown", "Brown noise"], ["hum", "Space hum"]].map(([v, l]) => ({ label: l, desc: A.settings.ambient === v ? "playing" : "", run: () => A.setSetting("ambient", v) })) }) },
  ];
  return { commands, apply, onSetting, onEditorReady, themeFromPicture, get power() { return power; }, ambient };
}
