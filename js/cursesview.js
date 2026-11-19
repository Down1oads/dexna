// The screen for Python curses programs: a character grid laid over the terminal panel. The kernel
// sends whole frames (runs of text with their attributes) and asks for keys; this answers with the
// next key, waiting as long as the program asked (nodelay, timeout or blocking), and reports resizes.
import { ansiPalette16 } from "./terminal.js";

const KEYMAP = {
  ArrowUp: "KEY_UP", ArrowDown: "KEY_DOWN", ArrowLeft: "KEY_LEFT", ArrowRight: "KEY_RIGHT", Home: "KEY_HOME", End: "KEY_END",
  PageUp: "KEY_PPAGE", PageDown: "KEY_NPAGE", Delete: "KEY_DC", Insert: "KEY_IC", Backspace: "\x7f", Enter: "\n", Tab: "\t", Escape: "\x1b",
};

export function createCursesView({ reply, host, onOpen, onClose }) {
  let el = null, grid = null, size = { r: 24, c: 80 }, cell = { w: 8, h: 17 };
  const queue = [];
  let pending = null; // a key request waiting for a key: { timer }
  let ro = null, resizeTimer = 0;

  function measure() {
    const probe = document.createElement("span");
    probe.className = "cur-probe";
    probe.textContent = "M".repeat(20);
    el.append(probe);
    const r = probe.getBoundingClientRect();
    probe.remove();
    cell = { w: r.width / 20 || 8, h: r.height || 17 };
    const box = el.getBoundingClientRect();
    size = { r: Math.max(5, Math.floor((box.height - 8) / cell.h)), c: Math.max(20, Math.floor((box.width - 12) / cell.w)) };
    return size;
  }

  function ensure() {
    if (el) return;
    el = document.createElement("div");
    el.className = "cur-screen";
    el.tabIndex = 0;
    el.setAttribute("role", "application");
    el.setAttribute("aria-label", "Program screen. Keys you press go to the program");
    grid = document.createElement("div");
    grid.className = "cur-grid";
    el.append(grid);
    el.addEventListener("keydown", onKey);
    el.addEventListener("mousedown", () => setTimeout(() => el.focus(), 0));
    host().append(el);
    ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (!el) return; const before = `${size.r}x${size.c}`; measure(); if (`${size.r}x${size.c}` !== before) push("KEY_RESIZE"); }, 120);
    });
    ro.observe(el);
  }

  function onKey(e) {
    if (e.metaKey) return;
    let k = null;
    if (e.ctrlKey && !e.altKey && e.key.length === 1 && /[a-z@\[\\\]^_]/i.test(e.key)) {
      if (e.key.toLowerCase() === "v" || (e.key.toLowerCase() === "c" && getSelection().toString())) return; // let paste and copy work
      k = String.fromCharCode(e.key.toUpperCase().charCodeAt(0) & 0x1f);
    } else if (/^F([1-9]|1[0-2])$/.test(e.key)) k = "KEY_F" + e.key.slice(1);
    else if (e.key === "Tab" && e.shiftKey) k = "KEY_BTAB";
    else if (KEYMAP[e.key]) k = KEYMAP[e.key];
    else if (e.key.length === 1 && !e.ctrlKey) k = e.key;
    if (k == null) return;
    e.preventDefault();
    e.stopPropagation();
    push(k);
  }

  function push(k) {
    if (pending) { clearTimeout(pending.timer); pending = null; send(k); }
    else if (queue.length < 256) queue.push(k);
  }
  const send = (k) => reply(JSON.stringify({ k: k || "", r: size.r, c: size.c }));

  const color = (v) => (typeof v === "number" ? ansiPalette16()[v] : v);
  function frame(data) {
    ensure();
    const lines = data.lines, styles = data.styles || {};
    const [cy, cx, vis] = data.cursor || [0, 0, 1];
    const out = document.createDocumentFragment();
    lines.forEach((runs, y) => {
      const row = document.createElement("div");
      row.className = "cur-row";
      let x = 0;
      for (const [text, a] of runs) {
        const s = styles[a] || {};
        let fg = s.f != null ? color(s.f) : null, bg = s.b != null ? color(s.b) : null;
        if (s.r) [fg, bg] = [bg || "var(--term-bg, var(--bg))", fg || "var(--fg)"];
        const parts = vis && y === cy && cx >= x && cx < x + text.length ? [text.slice(0, cx - x), text[cx - x], text.slice(cx - x + 1)] : [text];
        parts.forEach((t, i) => {
          if (!t) return;
          const span = document.createElement("span");
          span.textContent = t;
          if (fg) span.style.color = fg;
          if (bg) span.style.background = bg;
          if (s.w) span.style.fontWeight = "700";
          if (s.d) span.style.opacity = "0.6";
          if (s.u) span.style.textDecoration = "underline";
          if (s.i) span.style.fontStyle = "italic";
          if (s.h) span.style.visibility = "hidden";
          if (s.k) span.className = "cur-blink";
          if (parts.length === 3 && i === 1) span.classList.add(vis === 2 ? "cur-cursor-block" : "cur-cursor");
          row.append(span);
        });
        x += text.length;
      }
      out.append(row);
    });
    grid.replaceChildren(out);
  }

  return {
    get active() { return !!el; },
    size() { ensure(); return measure(); },
    open() { ensure(); queue.length = 0; onOpen?.(); setTimeout(() => el?.focus(), 0); },
    frame,
    close() {
      if (!el) return;
      ro?.disconnect(); ro = null;
      if (pending) { clearTimeout(pending.timer); pending = null; }
      el.remove(); el = grid = null; queue.length = 0;
      onClose?.();
    },
    /** The program wants a key: answer now, after `t` ms, or when one is pressed (t < 0 waits). */
    keyRequest(t) {
      ensure();
      if (queue.length) return send(queue.shift());
      if (t === 0) return send("");
      pending = { timer: t > 0 ? setTimeout(() => { pending = null; send(""); }, t) : 0 };
    },
    /** Stop pressed or the run ended: let a waiting program go. */
    cancel() { if (pending) { clearTimeout(pending.timer); pending = null; send("\x03"); } },
    beep() { el?.classList.remove("cur-flash"); void el?.offsetWidth; el?.classList.add("cur-flash"); },
    focus() { el?.focus(); },
  };
}
