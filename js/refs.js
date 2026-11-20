// References between a project's files: <img src>, <link href>, <script src>, CSS url() and @import,
// Markdown links and images, relative JS/TS imports, and Python imports. Used to find references to
// files that do not exist, and to update references when files are renamed or moved.

const dirOf = (p) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
const extOf = (p) => (p.includes(".") ? p.split(".").pop().toLowerCase() : "");
const EXTERNAL = /^([a-z][\w+.-]*:|\/\/|#|\{|\$\{|<)/i; // schemes, protocol-relative, fragments, templates

/** Resolve a reference written in `from` to a project path (without its ?query or #hash). */
export function resolve(from, ref) {
  const clean = ref.split(/[?#]/)[0];
  let decoded = clean; try { decoded = decodeURIComponent(clean); } catch (_) {}
  const parts = decoded.startsWith("/") ? [] : (dirOf(from) ? dirOf(from).split("/") : []);
  for (const seg of decoded.split("/")) { if (seg === "..") parts.pop(); else if (seg && seg !== ".") parts.push(seg); }
  return parts.join("/");
}
/** A relative path from one file to another. */
export function relPath(from, to) {
  const a = dirOf(from) ? dirOf(from).split("/") : [], b = to.split("/");
  let i = 0; while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return [...a.slice(i).map(() => ".."), ...b.slice(i)].join("/") || to.split("/").pop();
}

/** The references in a file: { start, end, value, kind } with offsets of the reference text. */
export function scanRefs(path, text) {
  const ext = extOf(path), out = [];
  // the "d" flag gives each group's exact position in the text
  const each = (re, group, kind) => {
    const rx = new RegExp(re.source, re.flags.includes("d") ? re.flags : re.flags + "d");
    for (let m; (m = rx.exec(text)); ) {
      const value = m[group];
      if (!value || EXTERNAL.test(value) || value.startsWith("data:")) continue;
      const [start, end] = m.indices[group];
      out.push({ start, end, value, kind });
    }
  };
  if (/^(html?|svg|vue|php)$/.test(ext)) {
    each(/\b(?:src|href|poster|data|action)\s*=\s*"([^"]+)"/gi, 1, "attr");
    each(/\b(?:src|href|poster|data|action)\s*=\s*'([^']+)'/gi, 1, "attr");
    each(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi, 1, "css");
  }
  if (/^(css|scss|less|sass)$/.test(ext)) {
    each(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi, 1, "css");
    each(/@import\s+["']([^"']+)["']/gi, 1, "css");
  }
  if (/^(md|markdown|mdx)$/.test(ext)) {
    each(/!?\[[^\]\n]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, 1, "md");
    each(/<img[^>]*\bsrc\s*=\s*"([^"]+)"/gi, 1, "attr");
    each(/^\s*\[[^\]]+\]:\s*<?(\S+?)>?(?:\s+"[^"]*")?\s*$/gm, 1, "md");
  }
  if (/^(m?jsx?|tsx?|mts|cts)$/.test(ext)) {
    each(/\b(?:import|export)\s[^'"`;]*?\bfrom\s*(["'])(\.{1,2}\/[^"']+)\1/g, 2, "js");
    each(/\bimport\s*(["'])(\.{1,2}\/[^"']+)\1/g, 2, "js");
    each(/\b(?:import|require)\s*\(\s*(["'])(\.{1,2}\/[^"']+)\1\s*\)/g, 2, "js");
  }
  // keep each place once (two patterns can match the same text)
  const seen = new Set();
  return out.filter((r) => (seen.has(r.start) ? false : seen.add(r.start))).sort((a, b) => a.start - b.start);
}

const JS_TRY = ["", ".js", ".ts", ".mjs", ".jsx", ".tsx", "/index.js", "/index.ts"];
/** The project path a reference points to, or null when nothing there exists. */
export function target(path, ref, exists) {
  const base = resolve(path, ref.value);
  if (ref.kind === "js") { for (const t of JS_TRY) if (exists(base + t)) return base + t; return null; }
  return exists(base) ? base : null;
}

/** Python modules: "pkg/mod.py" -> "pkg.mod", "pkg/__init__.py" -> "pkg". */
const modName = (p) => p.replace(/\.py$/, "").replace(/\/__init__$/, "").split("/").join(".");

/**
 * What to change after files moved. `files` is the project's text files as they were, `moves` is
 * [[oldPath, newPath], ...] (files or folders' files), `exists` says whether a path existed before.
 * Returns { [newPath]: newText } for the files whose references changed, and how many changed.
 */
export function planUpdates(files, moves, exists) {
  const map = new Map(moves), now = (p) => map.get(p) ?? p;
  const changes = {}; let count = 0;
  const pyMoves = moves.filter(([a, b]) => a.endsWith(".py") && b.endsWith(".py")).map(([a, b]) => [modName(a), modName(b)]).filter(([a, b]) => a !== b);
  for (const [path, text] of Object.entries(files)) {
    const newPath = now(path);
    let out = text, n = 0;
    // file references, from the end so the offsets stay right
    for (const ref of scanRefs(path, text).reverse()) {
      const t = target(path, ref, exists);
      if (!t || (now(t) === t && newPath === path)) continue;
      const suffix = ref.value.slice(ref.value.split(/[?#]/)[0].length);
      let to = now(t);
      if (ref.kind === "js") { // keep the import written the way it was: without the extension or /index
        const written = resolve(path, ref.value), rest = t.slice(written.length);
        if (rest && to.endsWith(rest)) to = to.slice(0, to.length - rest.length);
      }
      let value = ref.value.startsWith("/") ? "/" + to : relPath(newPath, to);
      if ((ref.kind === "js" || ref.value.startsWith("./")) && !value.startsWith(".") && !value.startsWith("/")) value = "./" + value;
      value = value.split("/").map((s) => (/[\s()]/.test(s) && ref.kind === "md" ? encodeURIComponent(s) : s)).join("/") + suffix;
      if (value !== ref.value) { out = out.slice(0, ref.start) + value + out.slice(ref.end); n++; }
    }
    // Python: import a.b / from a.b import c
    if (path.endsWith(".py") && pyMoves.length) {
      out = out.replace(/^([ \t]*(?:from|import)[ \t]+)([\w.]+(?:[ \t]*,[ \t]*[\w.]+)*)/gm, (m, head, names) => {
        const replaced = names.replace(/[\w.]+/g, (name) => {
          for (const [a, b] of pyMoves) {
            if (name === a) { n++; return b; }
            if (name.startsWith(a + ".")) { n++; return b + name.slice(a.length); }
          }
          return name;
        });
        return head + replaced;
      });
    }
    if (n) { changes[newPath] = out; count += n; }
  }
  return { changes, count };
}

/** References to files that do not exist (for the Problems panel). Python imports are left to the linter. */
export function brokenRefs(path, text, exists) {
  return scanRefs(path, text).filter((r) => !target(path, r, exists) && !(r.kind === "attr" && /\/$/.test(r.value)));
}
