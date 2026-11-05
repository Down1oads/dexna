// Colour themes. Each theme is a small palette; the UI, editor and terminal colours are derived from it.
//   bg, fg: editor background / text      accent: selection, focus and buttons
//   comment, keyword, string, number, type, func, operator, constant: syntax colours
//   err, warn, ok, info: status colours
const T = (id, name, type, c) => ({ id, name, type, c });

export const THEMES = [
  // ---------------- dark ----------------
  T("dexna-dark", "Dexna Dark", "dark", { bg: "#0f1117", fg: "#d6dae4", accent: "#4c8dff", comment: "#6b7394", keyword: "#c586c0", string: "#a5e075", number: "#f78c6c", type: "#ffcb6b", func: "#7aa9ff", operator: "#56d4dd", constant: "#f78c6c", err: "#f87171", warn: "#f5b041", ok: "#22c55e", info: "#60a5fa" }),
  T("midnight", "Midnight", "dark", { bg: "#0b1020", fg: "#c9d3ea", accent: "#5aa9ff", comment: "#5b6b8c", keyword: "#b794f6", string: "#7ee0a3", number: "#ffa862", type: "#ffd479", func: "#6aa8ff", operator: "#5fd7e6", constant: "#ffa862", err: "#ff6b81", warn: "#ffd479", ok: "#7ee0a3", info: "#6aa8ff" }),
  T("classic-dark", "Classic Dark", "dark", { bg: "#1e1e1e", fg: "#d4d4d4", accent: "#0e7ac4", comment: "#6a9955", keyword: "#569cd6", string: "#ce9178", number: "#b5cea8", type: "#4ec9b0", func: "#dcdcaa", operator: "#d4d4d4", constant: "#4fc1ff", err: "#f48771", warn: "#cca700", ok: "#89d185", info: "#3794ff" }),
  T("nord", "Nord", "dark", { bg: "#2e3440", fg: "#d8dee9", accent: "#88c0d0", comment: "#616e88", keyword: "#81a1c1", string: "#a3be8c", number: "#b48ead", type: "#8fbcbb", func: "#88c0d0", operator: "#81a1c1", constant: "#d08770", err: "#bf616a", warn: "#ebcb8b", ok: "#a3be8c", info: "#81a1c1" }),
  T("dracula", "Dracula", "dark", { bg: "#282a36", fg: "#f8f8f2", accent: "#bd93f9", comment: "#6272a4", keyword: "#ff79c6", string: "#f1fa8c", number: "#bd93f9", type: "#8be9fd", func: "#50fa7b", operator: "#ff79c6", constant: "#bd93f9", err: "#ff5555", warn: "#ffb86c", ok: "#50fa7b", info: "#8be9fd" }),
  T("one-dark", "One Dark", "dark", { bg: "#282c34", fg: "#abb2bf", accent: "#61afef", comment: "#5c6370", keyword: "#c678dd", string: "#98c379", number: "#d19a66", type: "#e5c07b", func: "#61afef", operator: "#56b6c2", constant: "#d19a66", err: "#e06c75", warn: "#e5c07b", ok: "#98c379", info: "#61afef" }),
  T("monokai", "Monokai", "dark", { bg: "#272822", fg: "#f8f8f2", accent: "#a6e22e", comment: "#75715e", keyword: "#f92672", string: "#e6db74", number: "#ae81ff", type: "#66d9ef", func: "#a6e22e", operator: "#f92672", constant: "#ae81ff", err: "#f92672", warn: "#fd971f", ok: "#a6e22e", info: "#66d9ef" }),
  T("solarized-dark", "Solarized Dark", "dark", { bg: "#002b36", fg: "#93a1a1", accent: "#268bd2", comment: "#586e75", keyword: "#859900", string: "#2aa198", number: "#d33682", type: "#b58900", func: "#268bd2", operator: "#859900", constant: "#cb4b16", err: "#dc322f", warn: "#b58900", ok: "#859900", info: "#268bd2" }),
  T("gruvbox-dark", "Gruvbox Dark", "dark", { bg: "#282828", fg: "#ebdbb2", accent: "#d79921", comment: "#928374", keyword: "#fb4934", string: "#b8bb26", number: "#d3869b", type: "#fabd2f", func: "#8ec07c", operator: "#fe8019", constant: "#d3869b", err: "#fb4934", warn: "#fabd2f", ok: "#b8bb26", info: "#83a598" }),
  T("tokyo-night", "Tokyo Night", "dark", { bg: "#1a1b26", fg: "#c0caf5", accent: "#7aa2f7", comment: "#565f89", keyword: "#bb9af7", string: "#9ece6a", number: "#ff9e64", type: "#2ac3de", func: "#7aa2f7", operator: "#89ddff", constant: "#ff9e64", err: "#f7768e", warn: "#e0af68", ok: "#9ece6a", info: "#7dcfff" }),
  T("catppuccin-mocha", "Catppuccin Mocha", "dark", { bg: "#1e1e2e", fg: "#cdd6f4", accent: "#89b4fa", comment: "#6c7086", keyword: "#cba6f7", string: "#a6e3a1", number: "#fab387", type: "#f9e2af", func: "#89b4fa", operator: "#89dceb", constant: "#fab387", err: "#f38ba8", warn: "#f9e2af", ok: "#a6e3a1", info: "#89dceb" }),
  T("ayu-mirage", "Ayu Mirage", "dark", { bg: "#1f2430", fg: "#cccac2", accent: "#ffcc66", comment: "#707a8c", keyword: "#ffa759", string: "#d5ff80", number: "#dfbfff", type: "#73d0ff", func: "#ffd173", operator: "#f29e74", constant: "#dfbfff", err: "#ff6666", warn: "#ffcc66", ok: "#d5ff80", info: "#73d0ff" }),
  T("night-owl", "Night Owl", "dark", { bg: "#011627", fg: "#d6deeb", accent: "#82aaff", comment: "#637777", keyword: "#c792ea", string: "#ecc48d", number: "#f78c6c", type: "#ffcb8b", func: "#82aaff", operator: "#7fdbca", constant: "#f78c6c", err: "#ef5350", warn: "#ffcb8b", ok: "#addb67", info: "#82aaff" }),
  T("rose-pine", "Rose Pine", "dark", { bg: "#191724", fg: "#e0def4", accent: "#c4a7e7", comment: "#6e6a86", keyword: "#31748f", string: "#f6c177", number: "#ebbcba", type: "#9ccfd8", func: "#c4a7e7", operator: "#908caa", constant: "#ebbcba", err: "#eb6f92", warn: "#f6c177", ok: "#9ccfd8", info: "#9ccfd8" }),
  T("everforest-dark", "Everforest Dark", "dark", { bg: "#2d353b", fg: "#d3c6aa", accent: "#a7c080", comment: "#859289", keyword: "#e67e80", string: "#a7c080", number: "#d699b6", type: "#dbbc7f", func: "#83c092", operator: "#e69875", constant: "#d699b6", err: "#e67e80", warn: "#dbbc7f", ok: "#a7c080", info: "#7fbbb3" }),
  T("oled", "OLED Black", "dark", { bg: "#000000", fg: "#e0e0e0", accent: "#00a8ff", comment: "#666d78", keyword: "#c792ea", string: "#a5e075", number: "#ff9e64", type: "#ffd479", func: "#5cc8ff", operator: "#56d4dd", constant: "#ff9e64", err: "#ff5c6c", warn: "#ffc857", ok: "#3ddc84", info: "#5cc8ff" }),
  T("high-contrast-dark", "High Contrast Dark", "dark", { bg: "#000000", fg: "#ffffff", accent: "#ffd400", comment: "#7ca668", keyword: "#569cd6", string: "#ce9178", number: "#b5cea8", type: "#4ec9b0", func: "#dcdcaa", operator: "#ffffff", constant: "#4fc1ff", err: "#ff6e6e", warn: "#ffd400", ok: "#6ee786", info: "#6cb6ff" }),

  // ---------------- light ----------------
  T("dexna-light", "Dexna Light", "light", { bg: "#f7f7fa", fg: "#1f2330", accent: "#2f6fe0", comment: "#8a91a3", keyword: "#a626a4", string: "#16803c", number: "#c2410c", type: "#b45309", func: "#2563eb", operator: "#0d7377", constant: "#c2410c", err: "#dc2626", warn: "#b7791f", ok: "#16a34a", info: "#2563eb" }),
  T("github-light", "GitHub Light", "light", { bg: "#ffffff", fg: "#24292f", accent: "#0969da", comment: "#6e7781", keyword: "#cf222e", string: "#0a3069", number: "#0550ae", type: "#953800", func: "#8250df", operator: "#cf222e", constant: "#0550ae", err: "#cf222e", warn: "#9a6700", ok: "#1a7f37", info: "#0969da" }),
  T("solarized-light", "Solarized Light", "light", { bg: "#fdf6e3", fg: "#586e75", accent: "#268bd2", comment: "#93a1a1", keyword: "#859900", string: "#2aa198", number: "#d33682", type: "#b58900", func: "#268bd2", operator: "#859900", constant: "#cb4b16", err: "#dc322f", warn: "#b58900", ok: "#859900", info: "#268bd2" }),
  T("gruvbox-light", "Gruvbox Light", "light", { bg: "#fbf1c7", fg: "#3c3836", accent: "#076678", comment: "#928374", keyword: "#9d0006", string: "#79740e", number: "#8f3f71", type: "#b57614", func: "#427b58", operator: "#af3a03", constant: "#8f3f71", err: "#9d0006", warn: "#b57614", ok: "#79740e", info: "#076678" }),
  T("catppuccin-latte", "Catppuccin Latte", "light", { bg: "#eff1f5", fg: "#4c4f69", accent: "#1e66f5", comment: "#9ca0b0", keyword: "#8839ef", string: "#40a02b", number: "#fe640b", type: "#df8e1d", func: "#1e66f5", operator: "#04a5e5", constant: "#fe640b", err: "#d20f39", warn: "#df8e1d", ok: "#40a02b", info: "#04a5e5" }),
  T("one-light", "One Light", "light", { bg: "#fafafa", fg: "#383a42", accent: "#4078f2", comment: "#a0a1a7", keyword: "#a626a4", string: "#50a14f", number: "#986801", type: "#c18401", func: "#4078f2", operator: "#0184bc", constant: "#986801", err: "#e45649", warn: "#c18401", ok: "#50a14f", info: "#0184bc" }),
  T("ayu-light", "Ayu Light", "light", { bg: "#fafafa", fg: "#5c6166", accent: "#e6892e", comment: "#abb0b6", keyword: "#fa8d3e", string: "#86b300", number: "#a37acc", type: "#399ee6", func: "#d99a2b", operator: "#ed9366", constant: "#a37acc", err: "#f07171", warn: "#d99a2b", ok: "#6fa000", info: "#399ee6" }),
  T("rose-pine-dawn", "Rose Pine Dawn", "light", { bg: "#faf4ed", fg: "#575279", accent: "#907aa9", comment: "#9893a5", keyword: "#286983", string: "#ea9d34", number: "#d7827e", type: "#56949f", func: "#907aa9", operator: "#797593", constant: "#d7827e", err: "#b4637a", warn: "#ea9d34", ok: "#56949f", info: "#56949f" }),
  T("paper", "Paper", "light", { bg: "#f5f0e6", fg: "#2b2b2b", accent: "#8a5a2b", comment: "#8d8576", keyword: "#8c3b2e", string: "#3f6b3a", number: "#a05a00", type: "#2f5d7c", func: "#5b3f8c", operator: "#5d5d5d", constant: "#a05a00", err: "#b3261e", warn: "#a05a00", ok: "#3f6b3a", info: "#2f5d7c" }),
  T("everforest-light", "Everforest Light", "light", { bg: "#fdf6e3", fg: "#5c6a72", accent: "#8da101", comment: "#939f91", keyword: "#f85552", string: "#8da101", number: "#df69ba", type: "#dfa000", func: "#35a77c", operator: "#f57d26", constant: "#df69ba", err: "#f85552", warn: "#dfa000", ok: "#8da101", info: "#3a94c5" }),
  T("high-contrast-light", "High Contrast Light", "light", { bg: "#ffffff", fg: "#000000", accent: "#0050c8", comment: "#4d6b3a", keyword: "#0000c0", string: "#a31515", number: "#116644", type: "#267f99", func: "#795e26", operator: "#000000", constant: "#0070c1", err: "#c00000", warn: "#7a5900", ok: "#0a7a28", info: "#0050c8" }),
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));
export const DEFAULT_DARK = "dexna-dark";
export const DEFAULT_LIGHT = "dexna-light";

/* ------------------------------ colour helpers ------------------------------ */
const hex = (c) => { c = c.replace("#", ""); if (c.length === 3) c = [...c].map((x) => x + x).join(""); return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)); };
const toHex = (rgb) => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
/** Mix `a` towards `b` by fraction t (0 = a, 1 = b). */
export const mix = (a, b, t) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (c) => { const [r, g, b] = hex(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** Near-black or white, whichever has more contrast on `bg`. */
export const readable = (bg) => (ratio(bg, "#101218") >= ratio(bg, "#ffffff") ? "#101218" : "#ffffff");
/** Move `c` towards white (dark backgrounds) or black (light ones) until it has at least `min` contrast on `bg`. */
function ensure(c, bg, min) {
  const target = lum(bg) < 0.4 ? "#ffffff" : "#000000";
  for (let t = 0; t <= 1.001; t += 0.04) { const out = mix(c, target, t); if (ratio(out, bg) >= min) return out; }
  return c;
}
const fixed = new Map();
/** The theme's palette with any hard-to-read colour nudged until it is legible, keeping its hue. */
export function palette(theme) {
  if (fixed.has(theme.id)) return fixed.get(theme.id);
  const c = theme.c, bg = c.bg;
  const out = { ...c };
  for (const k of ["keyword", "string", "number", "type", "func", "constant", "err", "info"]) out[k] = ensure(c[k], bg, 3.8);
  for (const k of ["operator", "warn", "ok", "accent"]) out[k] = ensure(c[k], bg, 3.2);
  out.comment = ensure(c.comment, bg, 2.8);
  fixed.set(theme.id, out);
  return out;
}
const alpha = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r}, ${g}, ${b}, ${a})`; };
/** #rrggbbaa, the form Monaco expects. */
const ahex = (c, a) => c + Math.round(a * 255).toString(16).padStart(2, "0");

/** CSS custom properties for the app chrome. */
export function uiVars(theme) {
  const c = palette(theme), dark = theme.type === "dark";
  const { bg, fg, accent } = c;
  const status = dark ? mix(accent, "#000000", 0.5) : mix(accent, "#000000", 0.12);
  return {
    "--bg": bg,
    "--bg-1": mix(bg, fg, dark ? 0.04 : 0.035),
    "--bg-2": mix(bg, fg, dark ? 0.075 : 0.065),
    "--bg-3": mix(bg, fg, dark ? 0.12 : 0.1),
    "--bg-hover": mix(bg, fg, dark ? 0.09 : 0.075),
    "--bg-active": mix(bg, fg, dark ? 0.15 : 0.13),
    "--border": mix(bg, fg, dark ? 0.13 : 0.16),
    "--fg": fg,
    "--fg-dim": mix(bg, fg, dark ? 0.7 : 0.78),
    "--fg-faint": mix(bg, fg, 0.52),
    "--accent": accent,
    "--accent-2": c.operator,
    "--accent-fg": readable(accent),
    "--run": c.ok,
    "--run-fg": readable(c.ok),
    "--stop": c.err,
    "--warn": c.warn,
    "--err": c.err,
    "--info": c.info,
    "--sel": alpha(accent, dark ? 0.24 : 0.18),
    "--shadow": dark ? "0 8px 24px rgba(0,0,0,.5)" : "0 8px 24px rgba(30,30,50,.18)",
    "--term-bg": dark ? mix(bg, "#000000", 0.22) : mix(bg, "#ffffff", 0.45),
    "--folder": c.type,
    "--folder-light": mix(c.type, "#ffffff", 0.28),
    "--page": dark ? mix(bg, fg, 0.12) : mix(bg, "#ffffff", 0.7),
    "--page-line": mix(bg, fg, 0.38),
    "--status-bg": status,
    "--status-fg": readable(status),
  };
}

/** ANSI 16-colour palette for the terminal. */
export function ansiPalette(theme) {
  const c = palette(theme), dark = theme.type === "dark";
  const bright = (x) => mix(x, dark ? "#ffffff" : "#000000", 0.22);
  const base = [dark ? mix(c.bg, c.fg, 0.28) : "#3b3b3b", c.err, c.ok, c.warn, c.info, c.keyword, c.operator, dark ? mix(c.bg, c.fg, 0.8) : mix(c.fg, c.bg, 0.35)];
  return [...base, dark ? mix(c.bg, c.fg, 0.5) : "#6b6b6b", ...base.slice(1, 7).map(bright), c.fg];
}

/** Monaco editor theme data. */
export function monacoTheme(theme) {
  const c = palette(theme), dark = theme.type === "dark";
  const strip = (x) => x.replace("#", "");
  const rules = [
    ["", c.fg], ["comment", c.comment, "italic"], ["comment.doc", c.comment, "italic"],
    ["keyword", c.keyword], ["keyword.control", c.keyword], ["keyword.operator", c.operator], ["operator", c.operator],
    ["string", c.string], ["string.escape", c.operator], ["string.invalid", c.err], ["regexp", c.number],
    ["number", c.number], ["number.float", c.number], ["number.hex", c.number], ["constant", c.constant],
    ["type", c.type], ["type.identifier", c.type], ["class", c.type], ["interface", c.type], ["enum", c.type],
    ["predefined", c.func], ["function", c.func], ["support.function", c.func],
    ["identifier", c.fg], ["variable", c.fg], ["variable.predefined", c.constant], ["delimiter", mix(c.bg, c.fg, 0.7)],
    ["delimiter.bracket", mix(c.bg, c.fg, 0.8)], ["tag", c.keyword], ["attribute.name", c.type], ["attribute.value", c.string],
    ["annotation", c.type], ["metatag", c.type], ["key", c.keyword], ["invalid", c.err],
  ].map(([token, color, fontStyle]) => ({ token, foreground: strip(color), ...(fontStyle ? { fontStyle } : {}) }));
  const colors = {
    "editor.background": c.bg, "editor.foreground": c.fg,
    "editorLineNumber.foreground": mix(c.bg, c.fg, 0.38), "editorLineNumber.activeForeground": mix(c.bg, c.fg, 0.85),
    "editor.lineHighlightBackground": mix(c.bg, c.fg, dark ? 0.045 : 0.05), "editor.lineHighlightBorder": c.bg,
    "editor.selectionBackground": ahex(c.accent, dark ? 0.32 : 0.25), "editor.inactiveSelectionBackground": ahex(c.accent, 0.16),
    "editor.selectionHighlightBackground": ahex(c.accent, 0.14), "editor.wordHighlightBackground": ahex(c.accent, 0.14),
    "editor.findMatchBackground": ahex(c.warn, 0.4), "editor.findMatchHighlightBackground": ahex(c.warn, 0.22),
    "editorCursor.foreground": c.accent,
    "editorIndentGuide.background1": mix(c.bg, c.fg, 0.1), "editorIndentGuide.activeBackground1": mix(c.bg, c.fg, 0.28),
    "editorWhitespace.foreground": mix(c.bg, c.fg, 0.2),
    "editorBracketMatch.background": ahex(c.accent, 0.18), "editorBracketMatch.border": ahex(c.accent, 0.5),
    "editorWidget.background": mix(c.bg, c.fg, dark ? 0.06 : 0.04), "editorWidget.border": mix(c.bg, c.fg, 0.16),
    "editorSuggestWidget.background": mix(c.bg, c.fg, dark ? 0.06 : 0.04), "editorSuggestWidget.border": mix(c.bg, c.fg, 0.16),
    "editorSuggestWidget.selectedBackground": mix(c.bg, c.fg, dark ? 0.15 : 0.12), "editorSuggestWidget.highlightForeground": c.accent,
    "editorHoverWidget.background": mix(c.bg, c.fg, dark ? 0.06 : 0.04), "editorHoverWidget.border": mix(c.bg, c.fg, 0.16),
    "input.background": c.bg, "input.border": mix(c.bg, c.fg, 0.2), "focusBorder": c.accent,
    "list.hoverBackground": mix(c.bg, c.fg, 0.08), "list.activeSelectionBackground": mix(c.bg, c.fg, 0.15),
    "minimap.background": c.bg, "editorGutter.background": c.bg, "editorStickyScroll.background": mix(c.bg, c.fg, 0.04),
    "editorStickyScrollHover.background": mix(c.bg, c.fg, 0.08),
    "scrollbarSlider.background": ahex(c.fg, 0.14), "scrollbarSlider.hoverBackground": ahex(c.fg, 0.24), "scrollbarSlider.activeBackground": ahex(c.fg, 0.32),
    "editorError.foreground": c.err, "editorWarning.foreground": c.warn, "editorInfo.foreground": c.info,
    "editorOverviewRuler.border": c.bg,
  };
  return { base: dark ? "vs-dark" : "vs", inherit: true, rules, colors };
}
