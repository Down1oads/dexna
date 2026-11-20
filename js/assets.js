// Binary files in projects: images, fonts, audio, video and anything else that is not text.
// Their bytes live in IndexedDB (browsers give it far more room than localStorage); the project
// itself only keeps a small index (project.assets: { path: { size, type } }).

const DB = "dexna-assets", STORE = "files";
let dbp = null;
const open = () => (dbp ||= new Promise((resolve, reject) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
}));
const memory = new Map(); // when IndexedDB is not available (some private windows)
async function tx(mode, fn) {
  try {
    const d = await open();
    return await new Promise((resolve, reject) => {
      const t = d.transaction(STORE, mode), out = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(out?.result);
      t.onerror = () => reject(t.error);
    });
  } catch (_) { return undefined; }
}
const key = (project, path) => project + "\u0000" + path;

export const assetStore = {
  async put(project, path, bytes) { memory.set(key(project, path), bytes); await tx("readwrite", (s) => s.put(bytes, key(project, path))); },
  async del(project, path) { memory.delete(key(project, path)); await tx("readwrite", (s) => s.delete(key(project, path))); },
  async get(project, path) { const v = await tx("readonly", (s) => s.get(key(project, path))); return v ?? memory.get(key(project, path)) ?? null; },
  /** Every binary file of a project, as { path: Uint8Array }. */
  async all(project, paths) {
    const out = {};
    await Promise.all(paths.map(async (p) => { const b = await this.get(project, p); if (b) out[p] = b instanceof Uint8Array ? b : new Uint8Array(b); }));
    return out;
  },
  async delProject(project, paths) { await Promise.all(paths.map((p) => this.del(project, p))); },
};

const TYPES = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon", cur: "image/x-icon", svg: "image/svg+xml",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", m4a: "audio/mp4", aac: "audio/aac", flac: "audio/flac", opus: "audio/ogg",
  mp4: "video/mp4", webm: "video/webm", ogv: "video/ogg", mov: "video/quicktime",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", eot: "application/vnd.ms-fontobject",
  pdf: "application/pdf", wasm: "application/wasm", zip: "application/zip", json: "application/json", glb: "model/gltf-binary", gltf: "model/gltf+json",
};
export const mimeOf = (path) => TYPES[path.split(".").pop().toLowerCase()] || "application/octet-stream";
export const kindOf = (path) => { const t = mimeOf(path); return t.startsWith("image/") ? "image" : t.startsWith("audio/") ? "audio" : t.startsWith("video/") ? "video" : t.startsWith("font/") ? "font" : t === "application/pdf" ? "pdf" : "other"; };

/** Is this content binary (not something to edit as text)? */
export function isBinary(bytes) {
  if (bytes.subarray(0, 8000).includes(0)) return true;
  try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); return false; } catch (_) { return true; }
}

/** A data: URL for bytes (built in pieces, so large files do not overflow the call stack). */
export function dataUrl(bytes, type) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(s)}`;
}
export const sizeLabel = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
