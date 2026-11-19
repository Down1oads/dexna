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
  T("palenight", "Palenight", "dark", { bg: "#292d3e", fg: "#bfc7d5", accent: "#82aaff", comment: "#676e95", keyword: "#c792ea", string: "#c3e88d", number: "#f78c6c", type: "#ffcb6b", func: "#82aaff", operator: "#89ddff", constant: "#f78c6c", err: "#ff5370", warn: "#ffcb6b", ok: "#c3e88d", info: "#82aaff" }),
  T("material-ocean", "Material Ocean", "dark", { bg: "#0f111a", fg: "#8f93a2", accent: "#84ffff", comment: "#464b5d", keyword: "#c792ea", string: "#c3e88d", number: "#f78c6c", type: "#ffcb6b", func: "#82aaff", operator: "#89ddff", constant: "#f78c6c", err: "#f07178", warn: "#ffcb6b", ok: "#c3e88d", info: "#82aaff" }),
  T("cobalt", "Cobalt", "dark", { bg: "#193549", fg: "#e1efff", accent: "#ffc600", comment: "#0088ff", keyword: "#ff9d00", string: "#3ad900", number: "#ff628c", type: "#80ffbb", func: "#ffc600", operator: "#ff9d00", constant: "#ff628c", err: "#ff628c", warn: "#ffc600", ok: "#3ad900", info: "#9effff" }),
  T("horizon", "Horizon", "dark", { bg: "#1c1e26", fg: "#d5d8da", accent: "#e95678", comment: "#6c6f93", keyword: "#b877db", string: "#fab795", number: "#f09483", type: "#fac29a", func: "#25b0bc", operator: "#e95678", constant: "#f09483", err: "#e95678", warn: "#fab795", ok: "#29d398", info: "#26bbd9" }),
  T("andromeda", "Andromeda", "dark", { bg: "#23262e", fg: "#d5ced9", accent: "#00e8c6", comment: "#a0a1a7", keyword: "#c74ded", string: "#96e072", number: "#f39c12", type: "#ffe66d", func: "#ffe66d", operator: "#ee5d43", constant: "#f39c12", err: "#ee5d43", warn: "#f39c12", ok: "#96e072", info: "#00e8c6" }),
  T("shades-of-purple", "Shades of Purple", "dark", { bg: "#2d2b55", fg: "#ffffff", accent: "#fad000", comment: "#b362ff", keyword: "#ff9d00", string: "#a5ff90", number: "#ff628c", type: "#9effff", func: "#fad000", operator: "#ff9d00", constant: "#ff628c", err: "#ec3a37", warn: "#fad000", ok: "#3ad900", info: "#9effff" }),
  T("panda", "Panda", "dark", { bg: "#292a2b", fg: "#e6e6e6", accent: "#19f9d8", comment: "#676b79", keyword: "#ff75b5", string: "#19f9d8", number: "#ffb86c", type: "#ffcc95", func: "#6fc1ff", operator: "#f3f3f3", constant: "#ffb86c", err: "#ff2c6d", warn: "#ffb86c", ok: "#19f9d8", info: "#6fc1ff" }),
  T("moonlight", "Moonlight", "dark", { bg: "#222436", fg: "#c8d3f5", accent: "#82aaff", comment: "#7a88cf", keyword: "#c099ff", string: "#c3e88d", number: "#ff966c", type: "#ffc777", func: "#82aaff", operator: "#86e1fc", constant: "#ff966c", err: "#ff757f", warn: "#ffc777", ok: "#c3e88d", info: "#86e1fc" }),
  T("oceanic-next", "Oceanic Next", "dark", { bg: "#1b2b34", fg: "#cdd3de", accent: "#6699cc", comment: "#65737e", keyword: "#c594c5", string: "#99c794", number: "#f99157", type: "#fac863", func: "#6699cc", operator: "#5fb3b3", constant: "#f99157", err: "#ec5f67", warn: "#fac863", ok: "#99c794", info: "#5fb3b3" }),
  T("kanagawa", "Kanagawa", "dark", { bg: "#1f1f28", fg: "#dcd7ba", accent: "#7e9cd8", comment: "#727169", keyword: "#957fb8", string: "#98bb6c", number: "#d27e99", type: "#7aa89f", func: "#7e9cd8", operator: "#c0a36e", constant: "#ffa066", err: "#e82424", warn: "#ff9e3b", ok: "#98bb6c", info: "#7fb4ca" }),
  T("nightfox", "Nightfox", "dark", { bg: "#192330", fg: "#cdcecf", accent: "#719cd6", comment: "#738091", keyword: "#9d79d6", string: "#81b29a", number: "#f4a261", type: "#dbc074", func: "#86abdc", operator: "#aeafb0", constant: "#f4a261", err: "#c94f6d", warn: "#dbc074", ok: "#81b29a", info: "#63cdcf" }),
  T("sonokai", "Sonokai", "dark", { bg: "#2c2e34", fg: "#e2e2e3", accent: "#76cce0", comment: "#7f8490", keyword: "#fc5d7c", string: "#e7c664", number: "#b39df3", type: "#76cce0", func: "#9ed072", operator: "#fc5d7c", constant: "#f39660", err: "#fc5d7c", warn: "#e7c664", ok: "#9ed072", info: "#76cce0" }),
  T("vesper", "Vesper", "dark", { bg: "#101010", fg: "#ffffff", accent: "#ffc799", comment: "#8b8b8b", keyword: "#a0a0a0", string: "#99ffe4", number: "#ffc799", type: "#ffc799", func: "#ffc799", operator: "#a0a0a0", constant: "#ffc799", err: "#ff8080", warn: "#ffc799", ok: "#99ffe4", info: "#a0a0a0" }),
  T("poimandres", "Poimandres", "dark", { bg: "#1b1e28", fg: "#a6accd", accent: "#5de4c7", comment: "#767c9d", keyword: "#91b4d5", string: "#5de4c7", number: "#5de4c7", type: "#add7ff", func: "#add7ff", operator: "#91b4d5", constant: "#fffac2", err: "#d0679d", warn: "#fffac2", ok: "#5de4c7", info: "#89ddff" }),
  T("github-dark", "GitHub Dark", "dark", { bg: "#0d1117", fg: "#e6edf3", accent: "#2f81f7", comment: "#8b949e", keyword: "#ff7b72", string: "#a5d6ff", number: "#79c0ff", type: "#ffa657", func: "#d2a8ff", operator: "#ff7b72", constant: "#79c0ff", err: "#f85149", warn: "#d29922", ok: "#3fb950", info: "#58a6ff" }),
  T("github-dimmed", "GitHub Dimmed", "dark", { bg: "#22272e", fg: "#adbac7", accent: "#539bf5", comment: "#768390", keyword: "#f47067", string: "#96d0ff", number: "#6cb6ff", type: "#f69d50", func: "#dcbdfb", operator: "#f47067", constant: "#6cb6ff", err: "#e5534b", warn: "#c69026", ok: "#57ab5a", info: "#539bf5" }),
  T("ayu-dark", "Ayu Dark", "dark", { bg: "#0b0e14", fg: "#bfbdb6", accent: "#e6b450", comment: "#565b66", keyword: "#ff8f40", string: "#aad94c", number: "#d2a6ff", type: "#59c2ff", func: "#ffb454", operator: "#f29668", constant: "#d2a6ff", err: "#d95757", warn: "#e6b450", ok: "#7fd962", info: "#59c2ff" }),
  T("catppuccin-frappe", "Catppuccin Frappé", "dark", { bg: "#303446", fg: "#c6d0f5", accent: "#8caaee", comment: "#737994", keyword: "#ca9ee6", string: "#a6d189", number: "#ef9f76", type: "#e5c890", func: "#8caaee", operator: "#99d1db", constant: "#ef9f76", err: "#e78284", warn: "#e5c890", ok: "#a6d189", info: "#99d1db" }),
  T("catppuccin-macchiato", "Catppuccin Macchiato", "dark", { bg: "#24273a", fg: "#cad3f5", accent: "#8aadf4", comment: "#6e738d", keyword: "#c6a0f6", string: "#a6da95", number: "#f5a97f", type: "#eed49f", func: "#8aadf4", operator: "#91d7e3", constant: "#f5a97f", err: "#ed8796", warn: "#eed49f", ok: "#a6da95", info: "#91d7e3" }),
  T("tomorrow-night", "Tomorrow Night", "dark", { bg: "#1d1f21", fg: "#c5c8c6", accent: "#81a2be", comment: "#969896", keyword: "#b294bb", string: "#b5bd68", number: "#de935f", type: "#f0c674", func: "#81a2be", operator: "#8abeb7", constant: "#de935f", err: "#cc6666", warn: "#f0c674", ok: "#b5bd68", info: "#8abeb7" }),
  T("zenburn", "Zenburn", "dark", { bg: "#3f3f3f", fg: "#dcdccc", accent: "#8cd0d3", comment: "#7f9f7f", keyword: "#f0dfaf", string: "#cc9393", number: "#8cd0d3", type: "#dfdfbf", func: "#efef8f", operator: "#f0efd0", constant: "#dca3a3", err: "#e37170", warn: "#f0dfaf", ok: "#7f9f7f", info: "#8cd0d3" }),
  T("embark", "Embark", "dark", { bg: "#1e1c31", fg: "#cbe3e7", accent: "#91ddff", comment: "#8a889d", keyword: "#d4bfff", string: "#ffe9aa", number: "#f48fb1", type: "#ffb378", func: "#91ddff", operator: "#a1efd3", constant: "#f48fb1", err: "#f48fb1", warn: "#ffe9aa", ok: "#a1efd3", info: "#91ddff" }),
  T("deep-sea", "Deep Sea", "dark", { bg: "#071a24", fg: "#cfe6ee", accent: "#3cc8d8", comment: "#4f7383", keyword: "#6fb8ff", string: "#7fe0b4", number: "#ffb86b", type: "#5fd2e8", func: "#9ad7ff", operator: "#3cc8d8", constant: "#ffb86b", err: "#ff6b7d", warn: "#ffcf6b", ok: "#7fe0b4", info: "#3cc8d8" }),
  T("ember", "Ember", "dark", { bg: "#1a1210", fg: "#ecdcd3", accent: "#ff8a3d", comment: "#806a60", keyword: "#ff6e57", string: "#e8c27a", number: "#ffa95c", type: "#f2b880", func: "#ffcf73", operator: "#ff8a3d", constant: "#ffa95c", err: "#ff5a4f", warn: "#ffcf73", ok: "#b8d27a", info: "#f2b880" }),
  T("neon", "Neon", "dark", { bg: "#0c0a1a", fg: "#e9e6ff", accent: "#ff2bd6", comment: "#6b628f", keyword: "#ff2bd6", string: "#2bffd5", number: "#ffe44d", type: "#4dc3ff", func: "#9d6bff", operator: "#ff2bd6", constant: "#ffe44d", err: "#ff3b6b", warn: "#ffe44d", ok: "#2bffd5", info: "#4dc3ff" }),
  T("forest-night", "Forest Night", "dark", { bg: "#16201a", fg: "#d6e2d2", accent: "#7fc97f", comment: "#62775f", keyword: "#c49ad6", string: "#a8d17a", number: "#e6b673", type: "#7fc9b8", func: "#8ec5e6", operator: "#7fc97f", constant: "#e6b673", err: "#e67a73", warn: "#e6c673", ok: "#a8d17a", info: "#8ec5e6" }),
  T("slate", "Slate", "dark", { bg: "#1e232b", fg: "#d3d8e0", accent: "#7aa2c8", comment: "#6b7686", keyword: "#a9b4ff", string: "#9fd3a8", number: "#e9b98b", type: "#8fd0d6", func: "#b6c8ff", operator: "#9aa7b8", constant: "#e9b98b", err: "#ef7a7a", warn: "#e9c98b", ok: "#9fd3a8", info: "#7aa2c8" }),
  T("grape", "Grape", "dark", { bg: "#1d1426", fg: "#e8dcf2", accent: "#b48cff", comment: "#7a6690", keyword: "#ff7ad9", string: "#b2f28c", number: "#ffb36b", type: "#8ce0ff", func: "#c9a6ff", operator: "#ff7ad9", constant: "#ffb36b", err: "#ff6b8a", warn: "#ffd36b", ok: "#b2f28c", info: "#8ce0ff" }),
  T("high-contrast-dark", "High Contrast Dark", "dark", { bg: "#000000", fg: "#ffffff", accent: "#ffd400", comment: "#7ca668", keyword: "#569cd6", string: "#ce9178", number: "#b5cea8", type: "#4ec9b0", func: "#dcdcaa", operator: "#ffffff", constant: "#4fc1ff", err: "#ff6e6e", warn: "#ffd400", ok: "#6ee786", info: "#6cb6ff" }),

  T("mono-black", "Black and White", "dark", { bg: "#000000", fg: "#f2f2f2", accent: "#ffffff", comment: "#6e6e6e", keyword: "#ffffff", string: "#b8b8b8", number: "#d9d9d9", type: "#e6e6e6", func: "#ffffff", operator: "#9a9a9a", constant: "#d9d9d9", err: "#ffffff", warn: "#cfcfcf", ok: "#ffffff", info: "#bdbdbd", mono: true }),
  // ---------------- light ----------------
  T("mono-white", "White and Black", "light", { bg: "#ffffff", fg: "#111111", accent: "#000000", comment: "#8a8a8a", keyword: "#000000", string: "#4a4a4a", number: "#2e2e2e", type: "#1e1e1e", func: "#000000", operator: "#5e5e5e", constant: "#2e2e2e", err: "#000000", warn: "#3a3a3a", ok: "#000000", info: "#444444", mono: true }),
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
  T("tomorrow", "Tomorrow", "light", { bg: "#ffffff", fg: "#4d4d4c", accent: "#4271ae", comment: "#8e908c", keyword: "#8959a8", string: "#718c00", number: "#f5871f", type: "#c99e00", func: "#4271ae", operator: "#3e999f", constant: "#f5871f", err: "#c82829", warn: "#c99e00", ok: "#718c00", info: "#4271ae" }),
  T("quiet-light", "Quiet Light", "light", { bg: "#f5f5f5", fg: "#333333", accent: "#4b69c6", comment: "#aaaaaa", keyword: "#4b69c6", string: "#448c27", number: "#9c5d27", type: "#7a3e9d", func: "#aa3731", operator: "#777777", constant: "#9c5d27", err: "#e44545", warn: "#c18401", ok: "#448c27", info: "#4b69c6" }),
  T("github-light-default", "GitHub Light Soft", "light", { bg: "#f6f8fa", fg: "#1f2328", accent: "#0969da", comment: "#59636e", keyword: "#cf222e", string: "#0a3069", number: "#0550ae", type: "#953800", func: "#6639ba", operator: "#cf222e", constant: "#0550ae", err: "#d1242f", warn: "#9a6700", ok: "#1a7f37", info: "#0969da" }),
  T("tokyo-day", "Tokyo Day", "light", { bg: "#e1e2e7", fg: "#3760bf", accent: "#2e7de9", comment: "#848cb5", keyword: "#9854f1", string: "#587539", number: "#b15c00", type: "#007197", func: "#2e7de9", operator: "#006a83", constant: "#b15c00", err: "#f52a65", warn: "#8c6c3e", ok: "#587539", info: "#007197" }),
  T("kanagawa-lotus", "Kanagawa Lotus", "light", { bg: "#f2ecbc", fg: "#545464", accent: "#4d699b", comment: "#8a8980", keyword: "#624c83", string: "#6f894e", number: "#b35b79", type: "#597b75", func: "#4d699b", operator: "#836f4a", constant: "#cc6d00", err: "#c84053", warn: "#cc6d00", ok: "#6f894e", info: "#5a7785" }),
  T("nord-light", "Nord Light", "light", { bg: "#eceff4", fg: "#2e3440", accent: "#5e81ac", comment: "#7b88a1", keyword: "#5e81ac", string: "#6d8f4e", number: "#a1597f", type: "#3d8b8f", func: "#4c76a8", operator: "#5e81ac", constant: "#b4634a", err: "#bf616a", warn: "#b48b2a", ok: "#6d8f4e", info: "#5e81ac" }),
  T("material-lighter", "Material Lighter", "light", { bg: "#fafafa", fg: "#546e7a", accent: "#00bcd4", comment: "#90a4ae", keyword: "#7c4dff", string: "#91b859", number: "#f76d47", type: "#ffb62c", func: "#6182b8", operator: "#39adb5", constant: "#f76d47", err: "#e53935", warn: "#ffb62c", ok: "#91b859", info: "#39adb5" }),
  T("alabaster", "Alabaster", "light", { bg: "#f7f7f7", fg: "#000000", accent: "#325cc0", comment: "#aa3731", keyword: "#000000", string: "#448c27", number: "#7a3e9d", type: "#000000", func: "#325cc0", operator: "#777777", constant: "#7a3e9d", err: "#aa3731", warn: "#cb9000", ok: "#448c27", info: "#325cc0" }),
  T("flexoki-light", "Flexoki Light", "light", { bg: "#fffcf0", fg: "#100f0f", accent: "#205ea6", comment: "#878580", keyword: "#66800b", string: "#24837b", number: "#5e409d", type: "#ad8301", func: "#bc5215", operator: "#6f6e69", constant: "#a02f6f", err: "#af3029", warn: "#ad8301", ok: "#66800b", info: "#205ea6" }),
  T("winter-light", "Winter Light", "light", { bg: "#f3f6fa", fg: "#2a3442", accent: "#3a7bd5", comment: "#8a97a8", keyword: "#6a4fc9", string: "#2f8a6a", number: "#c45c26", type: "#1f7a9e", func: "#3a62d5", operator: "#53607a", constant: "#c45c26", err: "#cf3b4f", warn: "#a77a12", ok: "#2f8a6a", info: "#3a7bd5" }),
  T("sepia", "Sepia", "light", { bg: "#f4ecd8", fg: "#433422", accent: "#9a5b2c", comment: "#9a8b73", keyword: "#8b3a2b", string: "#4f6b2a", number: "#a0582a", type: "#2f5d6b", func: "#6b3f8c", operator: "#6b5a44", constant: "#a0582a", err: "#a8322a", warn: "#9a6a14", ok: "#4f6b2a", info: "#2f5d6b" }),
  T("mint", "Mint", "light", { bg: "#f2faf6", fg: "#24352d", accent: "#16a37a", comment: "#86a597", keyword: "#2f6fbf", string: "#13895f", number: "#c2652a", type: "#0f7f8c", func: "#7a49c4", operator: "#3d6b5b", constant: "#c2652a", err: "#d23b4a", warn: "#b5850f", ok: "#13895f", info: "#2f6fbf" }),
  T("lavender", "Lavender", "light", { bg: "#f6f3fc", fg: "#352f47", accent: "#7c5cd6", comment: "#9a93ad", keyword: "#8a3fb8", string: "#3f8a5e", number: "#c45a3f", type: "#2f7a9a", func: "#5b5cd6", operator: "#6a5f86", constant: "#c45a3f", err: "#c9375a", warn: "#a77a12", ok: "#3f8a5e", info: "#5b5cd6" }),
  T("blossom", "Blossom", "light", { bg: "#fdf4f6", fg: "#3d2b33", accent: "#d14d7b", comment: "#a88f98", keyword: "#b0367a", string: "#4f8a4a", number: "#c4612f", type: "#3f7a9a", func: "#8a4fc4", operator: "#7a5866", constant: "#c4612f", err: "#c9373f", warn: "#a77a12", ok: "#4f8a4a", info: "#3f7a9a" }),
  T("sand", "Sand", "light", { bg: "#f7f1e6", fg: "#3a3226", accent: "#b06a1c", comment: "#a39785", keyword: "#8f4a8a", string: "#5c7a2a", number: "#b5502a", type: "#2a6f8a", func: "#4a5fb0", operator: "#6e624f", constant: "#b5502a", err: "#b8322a", warn: "#9a6a14", ok: "#5c7a2a", info: "#2a6f8a" }),
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
  const status = c.mono ? mix(bg, fg, dark ? 0.12 : 0.9) : dark ? mix(accent, "#000000", 0.5) : mix(accent, "#000000", 0.12);
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
  // black and white themes have no colour to tell code apart, so keywords are bold and strings italic
  if (theme.c.mono) for (const r of rules) { if (/^(keyword|key|tag)/.test(r.token) && r.token !== "keyword.operator") r.fontStyle = "bold"; else if (/^string/.test(r.token) && !r.fontStyle) r.fontStyle = "italic"; }
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
    // black and white themes: matching brackets in shades of grey instead of colours
    ...(c.mono ? Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [`editorBracketHighlight.foreground${i}`, mix(c.bg, c.fg, [0.95, 0.7, 0.5, 0.95, 0.7, 0.5][i - 1])])) : {}),
  };
  return { base: dark ? "vs-dark" : "vs", inherit: true, rules, colors };
}

/* ------------------------------ your own themes ------------------------------ */
export const PALETTE_KEYS = ["bg", "fg", "accent", "comment", "keyword", "string", "number", "type", "func", "operator", "constant", "err", "warn", "ok", "info"];
const isHex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
/** Add or replace a theme made in the theme editor. Returns the stored theme, or null if it is malformed. */
export function registerCustomTheme(t) {
  if (!t || typeof t.id !== "string" || !t.id.startsWith("custom-") || !t.c || !PALETTE_KEYS.every((k) => isHex(t.c[k]))) return null;
  const theme = { id: t.id, name: String(t.name || "My theme").slice(0, 40), type: t.type === "light" ? "light" : "dark", c: Object.fromEntries(PALETTE_KEYS.map((k) => [k, t.c[k].toLowerCase()])), custom: true };
  const i = THEMES.findIndex((x) => x.id === theme.id);
  if (i >= 0) THEMES[i] = theme; else THEMES.push(theme);
  THEME_BY_ID[theme.id] = theme;
  fixed.delete(theme.id);
  return theme;
}
export function removeCustomTheme(id) {
  const i = THEMES.findIndex((x) => x.id === id && x.custom);
  if (i >= 0) THEMES.splice(i, 1);
  delete THEME_BY_ID[id];
  fixed.delete(id);
}
