// Patches: your changes as a unified diff (the format `git diff` and `diff -u` write), and applying one.
import { diffLines } from "./diff.js";

const CONTEXT = 3;
const splitLines = (t) => { const l = t.split("\n"); if (l.length && l[l.length - 1] === "") l.pop(); return l; };

/** One file's diff: "--- a/x", "+++ b/x" and its hunks (old/new null for a created/deleted file). */
function fileDiff(path, oldText, newText) {
  const a = oldText == null ? [] : splitLines(oldText), b = newText == null ? [] : splitLines(newText);
  const raw = diffLines(a, b, 20000);
  if (!raw.length) return "";
  // widen each change by the context lines, and merge the ones that touch
  const groups = [];
  for (const hk of raw) {
    const g = { aStart: Math.max(0, hk.aStart - CONTEXT), aEnd: Math.min(a.length, hk.aStart + hk.aLen + CONTEXT), bStart: Math.max(0, hk.bStart - CONTEXT), bEnd: Math.min(b.length, hk.bStart + hk.bLen + CONTEXT), parts: [hk] };
    const last = groups[groups.length - 1];
    if (last && g.aStart <= last.aEnd) { last.aEnd = g.aEnd; last.bEnd = g.bEnd; last.parts.push(hk); } else groups.push(g);
  }
  const out = [`--- ${oldText == null ? "/dev/null" : "a/" + path}`, `+++ ${newText == null ? "/dev/null" : "b/" + path}`];
  for (const g of groups) {
    const body = [];
    let ai = g.aStart;
    for (const hk of g.parts) {
      for (; ai < hk.aStart; ai++) body.push(" " + a[ai]);
      for (let i = 0; i < hk.aLen; i++) body.push("-" + a[hk.aStart + i]);
      for (let i = 0; i < hk.bLen; i++) body.push("+" + b[hk.bStart + i]);
      ai = hk.aStart + hk.aLen;
    }
    for (; ai < g.aEnd; ai++) body.push(" " + a[ai]);
    const aLen = g.aEnd - g.aStart, bLen = g.bEnd - g.bStart;
    out.push(`@@ -${aLen ? g.aStart + 1 : g.aStart},${aLen} +${bLen ? g.bStart + 1 : g.bStart},${bLen} @@`, ...body);
  }
  // when the new text has no newline at its end, say so (as diff does), so applying keeps it that way
  const noNlNew = newText != null && newText !== "" && !newText.endsWith("\n");
  return out.join("\n") + (noNlNew ? "\n\\ No newline at end of file" : "") + "\n";
}

/** A patch for many files: { path: [oldText or null, newText or null] }. */
export function createPatch(changes) {
  return Object.keys(changes).sort().map((p) => fileDiff(p, changes[p][0], changes[p][1])).filter(Boolean).join("");
}

/** Parse a unified diff into files with hunks. Also reads `git diff` output (diff --git, index, mode lines). */
export function parsePatch(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n"), files = [];
  let f = null, h = null;
  const strip = (p) => (p === "/dev/null" ? null : p.replace(/^[ab]\//, "").replace(/\t.*$/, ""));
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("--- ") && lines[i + 1]?.startsWith("+++ ")) {
      f = { from: strip(l.slice(4)), to: strip(lines[i + 1].slice(4)), hunks: [] }; files.push(f); h = null; i++; continue;
    }
    const m = l.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (m && f) { h = { aStart: +m[1], aLen: m[2] == null ? 1 : +m[2], bStart: +m[3], bLen: m[4] == null ? 1 : +m[4], lines: [] }; f.hunks.push(h); continue; }
    if (h && /^[ +-]/.test(l)) h.lines.push(l);
    else if (h && l === "" && i < lines.length - 1) h.lines.push(" "); // an empty context line some tools trim
    else if (l.startsWith("\\ ")) { if (h) h.noNewline = true; }
  }
  return files;
}

/** Apply a parsed patch to files ({ path: text }); hunks may have moved a little (it looks nearby). */
export function applyPatch(text, files) {
  const result = { changes: {}, removed: [], failed: [], files: 0 };
  for (const f of parsePatch(text)) {
    result.files++;
    const path = f.to ?? f.from;
    if (f.to == null) { // deleted
      if (files[f.from] != null) result.removed.push(f.from); else result.failed.push(`${f.from} (not in the project)`);
      continue;
    }
    const src = f.from == null ? "" : files[f.from];
    if (src == null) { result.failed.push(`${f.from} (not in the project)`); continue; }
    const lines = splitLines(src);
    let ok = true, shift = 0;
    for (const h of f.hunks) {
      const old = h.lines.filter((l) => l[0] !== "+").map((l) => l.slice(1)), neu = h.lines.filter((l) => l[0] !== "-").map((l) => l.slice(1));
      const want = Math.max(0, h.aStart - 1 + shift);
      const fits = (at) => at >= 0 && at + old.length <= lines.length && old.every((l, i) => lines[at + i] === l);
      let at = -1;
      for (let d = 0; d <= 200 && at < 0; d++) { if (fits(want + d)) at = want + d; else if (d && fits(want - d)) at = want - d; }
      if (at < 0) { ok = false; break; }
      lines.splice(at, old.length, ...neu);
      shift += neu.length - old.length + (at - want);
    }
    if (!ok) { result.failed.push(`${path} (it has changed since the patch was made)`); continue; }
    const last = f.hunks[f.hunks.length - 1];
    result.changes[path] = lines.join("\n") + (lines.length && !last?.noNewline ? "\n" : "");
    if (f.from && f.to && f.from !== f.to) result.removed.push(f.from); // renamed
  }
  return result;
}
