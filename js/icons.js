// Dexna's own icon set: small hand-drawn SVGs on a 16×16 grid, drawn with currentColor.
const P = {
  play: '<path d="M5 3.5v9l7-4.5z" fill="currentColor" stroke="none"/>',
  bug: '<rect x="5" y="5" width="6" height="8" rx="3"/><path d="M8 5V3.5M6 4l-1-1.5M10 4l1-1.5M5 8H2.5M11 8h2.5M5 11l-2 1.5M11 11l2 1.5M8 7v6"/>',
  stop: '<rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" stroke="none"/>',
  continue: '<path d="M4 3.5v9" /><path d="M7 3.5v9l6-4.5z" fill="currentColor" stroke="none"/>',
  stepOver: '<path d="M3 9a5 5 0 0 1 9.5-2"/><path d="M13 3.5V7H9.5"/><circle cx="8" cy="12.5" r="1.3" fill="currentColor" stroke="none"/>',
  stepInto: '<path d="M8 2.5v6.5"/><path d="M5 6.5L8 9.5l3-3"/><circle cx="8" cy="13" r="1.3" fill="currentColor" stroke="none"/>',
  stepOut: '<path d="M8 10V3.5"/><path d="M5 6.5L8 3.5l3 3"/><circle cx="8" cy="13" r="1.3" fill="currentColor" stroke="none"/>',
  plus: '<path d="M8 3v10M3 8h10"/>',
  newFile: '<path d="M9 2H4.5A1.5 1.5 0 0 0 3 3.5v9A1.5 1.5 0 0 0 4.5 14H8"/><path d="M9 2l4 4v2"/><path d="M12 10v5M9.5 12.5h5"/>',
  newFolder: '<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.5 1.5h5A1.5 1.5 0 0 1 14 6v2"/><path d="M2 4.5v7A1.5 1.5 0 0 0 3.5 13H8"/><path d="M12 9.5v5M9.5 12h5"/>',
  more: '<circle cx="3.5" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.1" fill="currentColor" stroke="none"/>',
  download: '<path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10"/>',
  refresh: '<path d="M13 8a5 5 0 1 1-1.5-3.5"/><path d="M13 2.5V5h-2.5"/>',
  clear: '<path d="M3 13h10"/><path d="M5.5 10.5l6-6.5 2 2-5 5.5"/><path d="M5.5 10.5L4 9l3-3.5"/>',
  maximize: '<path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9"/>',
  close: '<path d="M4 4l8 8M12 4l-8 8"/>',
  error: '<circle cx="8" cy="8" r="5.5"/><path d="M6 6l4 4M10 6l-4 4"/>',
  warning: '<path d="M8 2.5l6 10.5H2z"/><path d="M8 6.5v3"/><circle cx="8" cy="11.3" r=".6" fill="currentColor"/>',
  check: '<path d="M3 8.5l3 3 7-7"/>',
  info: '<circle cx="8" cy="8" r="5.5"/><path d="M8 7.5v3.5"/><circle cx="8" cy="5.3" r=".6" fill="currentColor"/>',
  lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>',
  pin: '<path d="M6 2.5h4M7 2.5v4l-2.5 2.5h7L9 6.5v-4M8 9v4.5"/>',
  package: '<path d="M8 2l5.5 3v6L8 14l-5.5-3V5z"/><path d="M2.5 5L8 8l5.5-3M8 8v6"/>',
  book: '<path d="M3 3.5A1.5 1.5 0 0 1 4.5 2H13v10H4.5A1.5 1.5 0 0 0 3 13.5zM3 13.5A1.5 1.5 0 0 0 4.5 15H13"/>',
  chevronRight: '<path d="M6 4l4 4-4 4"/>',
  chevronDown: '<path d="M4 6l4 4 4-4"/>',
  folder: '<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.5 1.5h5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z" fill="var(--folder)" stroke="var(--folder)"/>',
  folderOpen: '<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.5 1.5h5A1.5 1.5 0 0 1 14 6v.5H5L2 12z" fill="var(--folder)" stroke="var(--folder)"/><path d="M5 6.5h10l-3 6.5H2z" fill="var(--folder-light)" stroke="var(--folder-light)"/>',
  file: '<path d="M9 2H4.5A1.5 1.5 0 0 0 3 3.5v9A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V6z"/><path d="M9 2v4h4"/>',
  bolt: '<path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z" fill="currentColor" stroke="none"/>',
  circle: '<circle cx="8" cy="8" r="4.5"/>',
  dot: '<circle cx="8" cy="8" r="4" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M2.5 8h9M8 4.5L11.5 8 8 11.5"/>',
  search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>',
  sun: '<circle cx="8" cy="8" r="2.8"/><path d="M8 1.6v1.7M8 12.7v1.7M1.6 8h1.7M12.7 8h1.7M3.5 3.5l1.2 1.2M11.3 11.3l1.2 1.2M3.5 12.5l1.2-1.2M11.3 4.7l1.2-1.2"/>',
  moon: '<path d="M13.4 9.6A5.6 5.6 0 0 1 6.4 2.6a5.6 5.6 0 1 0 7 7z"/>',
  settings: '<path d="M2.5 5h6M11.5 5h2M2.5 11h2M7.5 11h6"/><circle cx="10" cy="5" r="1.6"/><circle cx="6" cy="11" r="1.6"/>',
  home: '<path d="M2.5 7.5L8 3l5.5 4.5V13a.5.5 0 0 1-.5.5H9.5V10h-3v3.5H3a.5.5 0 0 1-.5-.5z"/>',
  star: '<path d="M8 2l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.4l-3.7 2.1.8-4.2L2 6.4l4.2-.5z"/>',
  image: '<rect x="2.5" y="3" width="11" height="10" rx="1.5"/><circle cx="6" cy="6.5" r="1.2"/><path d="M13.5 11L10 7.5 4 13"/>',
};

/** SVG markup for an icon. */
export function iconSvg(name, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.file}</svg>`;
}

/** Icon as a DOM element. */
export function icon(name, cls = "") {
  const t = document.createElement("template");
  t.innerHTML = iconSvg(name, cls);
  return t.content.firstChild;
}

// File-type badges: a page with a coloured tab carrying a short label.
const TYPES = {
  py: ["Py", "#3a7bd5"], pyi: ["Py", "#3a7bd5"], md: ["M", "#6b7a99"], json: ["{}", "#c98a1b"], csv: ["Cs", "#2f9e5b"],
  txt: ["Tx", "#7d8597"], toml: ["To", "#8a6d5a"], cfg: ["Cf", "#8a6d5a"], ini: ["In", "#8a6d5a"], html: ["<>", "#d1532c"],
  js: ["Js", "#c9a515"], ts: ["Ts", "#2f74c0"], css: ["#", "#3d6fd9"], yml: ["Y", "#b8424a"], yaml: ["Y", "#b8424a"],
  sql: ["Sq", "#4a7f9e"],
  cs: ["C#", "#68217a"], java: ["Jv", "#d9731a"], c: ["C", "#5c6bc0"], h: ["H", "#5c6bc0"], cpp: ["C+", "#00599c"], cc: ["C+", "#00599c"], hpp: ["H+", "#00599c"],
  go: ["Go", "#00a7c4"], rs: ["Rs", "#b7410e"], kt: ["Kt", "#7f52ff"], swift: ["Sw", "#f05138"], php: ["Ph", "#777bb3"], rb: ["Rb", "#cc342d"],
  pl: ["Pl", "#39457e"], dart: ["Da", "#0175c2"], scala: ["Sc", "#dc322f"], r: ["R", "#276dc3"], hs: ["Hs", "#5e5086"], ex: ["Ex", "#6e4a7e"], exs: ["Ex", "#6e4a7e"],
  pas: ["Pa", "#a0522d"], clj: ["Cj", "#5881d8"], groovy: ["Gv", "#4298b8"], ml: ["ML", "#ee6a1a"], fs: ["F#", "#378bba"], vb: ["VB", "#68217a"], erl: ["Er", "#a90533"],
  d: ["D", "#b03931"], lisp: ["Ls", "#3f6e9a"], f90: ["Fo", "#734f96"], m: ["ObjC", "#438eff"], lua: ["Lu", "#3b4a9c"], mjs: ["Js", "#c9a515"], sh: ["$", "#4d8a4a"], xml: ["<>", "#8f5bb8"],
};

export function fileIconSvg(path) {
  const ext = path.split(".").pop().toLowerCase();
  const t = TYPES[ext];
  if (!t) return iconSvg("file", "ft");
  const [label, color] = t;
  const size = label.length > 1 ? 6.2 : 7.5;
  return `<svg class="icon ft" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4.5 1.5h5L13 5v8.5A1 1 0 0 1 12 14.5H4.5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z" fill="var(--page)" stroke="var(--page-line)" stroke-width="1"/>
    <rect x="1.5" y="7.5" width="11" height="6.5" rx="1.3" fill="${color}"/>
    <text x="7" y="12.4" text-anchor="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-weight="700" font-size="${size}" fill="#fff">${label.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>
  </svg>`;
}

export function fileIcon(path) {
  const t = document.createElement("template");
  t.innerHTML = fileIconSvg(path).trim();
  return t.content.firstChild;
}
