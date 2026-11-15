// Line diffs (Myers' O(ND) algorithm), used by Source Control and the change markers in the gutter.

/**
 * Diff two arrays of lines. Returns hunks { aStart, aLen, bStart, bLen } (0-based) of the regions that differ.
 * Very large inputs that differ a lot fall back to one hunk covering the changed middle, so it never hangs.
 */
export function diffLines(a, b, maxCost = 4000) {
  // trim the common start and end first: most edits are small
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let e = 0;
  while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  const A = a.slice(s, a.length - e), B = b.slice(s, b.length - e);
  if (!A.length && !B.length) return [];
  if (!A.length || !B.length) return [{ aStart: s, aLen: A.length, bStart: s, bLen: B.length }];

  const n = A.length, m = B.length, max = n + m, off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace = [];
  let found = false;
  for (let d = 0; d <= max; d++) {
    if (d > maxCost) break;
    trace.push(v.slice(off - d - 1, off + d + 2)); // keep only the part of v that step d can read
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && A[x] === B[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= n && y >= m) { found = true; break; }
    }
    if (found) break;
  }
  if (!found) return [{ aStart: s, aLen: n, bStart: s, bLen: m }];

  // walk back through the saved states to recover the edit path
  const ops = []; // "=", "-", "+" for each line, in reverse
  let x = n, y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d], at = (k) => vd[k + d + 1]; // vd covers k in [-d-1, d+1]
    const k = x - y;
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = d === 0 ? 0 : at(prevK), prevY = prevX - prevK;
    while (x > prevX && y > prevY) { ops.push("="); x--; y--; }
    if (d === 0) break;
    if (x === prevX) { ops.push("+"); y--; } else { ops.push("-"); x--; }
  }
  while (x > 0 && y > 0) { ops.push("="); x--; y--; }
  ops.reverse();

  const hunks = [];
  let ai = 0, bi = 0, cur = null;
  for (const op of ops) {
    if (op === "=") { if (cur) { hunks.push(cur); cur = null; } ai++; bi++; continue; }
    cur ||= { aStart: s + ai, aLen: 0, bStart: s + bi, bLen: 0 };
    if (op === "-") { cur.aLen++; ai++; } else { cur.bLen++; bi++; }
  }
  if (cur) hunks.push(cur);
  return hunks;
}

/** Count added and removed lines between two texts. */
export function diffStats(oldText, newText) {
  let added = 0, removed = 0;
  for (const hk of diffLines(splitLines(oldText), splitLines(newText))) { added += hk.bLen; removed += hk.aLen; }
  return { added, removed };
}

export const splitLines = (t) => (t === "" || t == null ? [] : t.replace(/\r\n?/g, "\n").split("\n"));

/**
 * Gutter markers for the new text: { added: [lines], modified: [lines], deleted: [lines] }, 1-based line numbers.
 * A deletion is shown on the line after the removed lines (or the last line at the end of the file).
 */
export function changeMarkers(oldText, newText) {
  const a = splitLines(oldText), b = splitLines(newText);
  const out = { added: [], modified: [], deleted: [] };
  for (const hk of diffLines(a, b)) {
    if (!hk.aLen) for (let i = 0; i < hk.bLen; i++) out.added.push(hk.bStart + i + 1);
    else if (!hk.bLen) out.deleted.push(Math.max(1, Math.min(hk.bStart + 1, b.length || 1)));
    else {
      const both = Math.min(hk.aLen, hk.bLen);
      for (let i = 0; i < hk.bLen; i++) (i < both ? out.modified : out.added).push(hk.bStart + i + 1);
    }
  }
  return out;
}
