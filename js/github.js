// Open a public GitHub repository as a new project. The file list comes from GitHub's API (two
// requests, so the 60-an-hour limit for visitors without an account goes a long way); the files
// themselves come from raw.githubusercontent.com. Only the repository's name is sent anywhere.

const MAX_FILES = 400, MAX_TOTAL = 4_000_000, MAX_FILE = 500_000;
const SKIP_DIR = /(^|\/)(\.git|node_modules|\.venv|venv|__pycache__|\.mypy_cache|\.pytest_cache|dist|build|\.next|target)\//;
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|icns|bmp|tiff?|psd|pdf|docx?|xlsx?|pptx?|zip|gz|tgz|bz2|xz|7z|rar|jar|war|class|exe|dll|so|dylib|o|a|lib|obj|wasm|pyc|pyd|whl|egg|mp3|mp4|m4a|wav|flac|ogg|webm|mov|avi|mkv|ttf|otf|woff2?|eot|sqlite3?|db|bin|dat|pkl|npy|npz|h5|onnx|pt|ckpt|keystore|p12|der)$/i;

/** "owner/repo", "github.com/owner/repo", or a link to a branch or folder (…/tree/branch/folder). */
export function parseRepo(text) {
  let s = String(text || "").trim().replace(/\.git$/, "").replace(/\/+$/, "");
  s = s.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "");
  const m = s.match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2], ref: m[3] ? decodeURIComponent(m[3]) : null, sub: m[4] ? decodeURIComponent(m[4]).replace(/\/+$/, "") : "" };
}

/** Choose which files to download: text files only, small enough, within the overall limits. */
export function pickFiles(tree, sub) {
  const prefix = sub ? sub + "/" : "";
  const take = [], skipped = { binary: 0, large: 0, limit: 0 };
  let total = 0;
  for (const it of tree) {
    if (it.type !== "blob" || (prefix && !it.path.startsWith(prefix))) continue;
    const rel = it.path.slice(prefix.length);
    if (SKIP_DIR.test("/" + rel)) continue;
    if (BINARY.test(rel)) { skipped.binary++; continue; }
    if ((it.size || 0) > MAX_FILE) { skipped.large++; continue; }
    if (take.length >= MAX_FILES || total + (it.size || 0) > MAX_TOTAL) { skipped.limit++; continue; }
    total += it.size || 0;
    take.push({ path: it.path, rel });
  }
  return { take, skipped, total };
}

export function createGitHub(API) {
  const api = (path) => fetch("https://api.github.com" + path, { headers: { Accept: "application/vnd.github+json" } });
  const why = async (res, what) => {
    if (res.status === 404) return `${what} was not found. It may be private or spelled differently.`;
    if (res.status === 403 || res.status === 429) {
      const reset = +res.headers.get("x-ratelimit-reset");
      return "GitHub's limit for visitors without an account is used up" + (reset ? `; try again after ${new Date(reset * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` : ". Try again in a while.");
    }
    return `GitHub answered ${res.status} for ${what}.`;
  };

  async function open(text) {
    const r = parseRepo(text);
    if (!r) { API.toast("Write it as owner/name, for example octocat/Hello-World, or paste its github.com link", "warn", 5000); return null; }
    const name = `${r.owner}/${r.repo}`;
    API.setStatusFlash?.(`Opening ${name}…`);
    try {
      let ref = r.ref;
      if (!ref) {
        const res = await api(`/repos/${r.owner}/${r.repo}`);
        if (!res.ok) throw new Error(await why(res, name));
        ref = (await res.json()).default_branch || "main";
      }
      const tr = await api(`/repos/${r.owner}/${r.repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
      if (!tr.ok) throw new Error(await why(tr, `The branch "${ref}" of ${name}`));
      const data = await tr.json();
      const { take, skipped } = pickFiles(data.tree || [], r.sub);
      if (!take.length) throw new Error(r.sub ? `No text files in ${r.sub}.` : `${name} has no text files Dexna can open.`);
      // download a few at a time
      const files = {};
      let done = 0, i = 0;
      const enc = (p) => p.split("/").map(encodeURIComponent).join("/");
      const worker = async () => {
        while (i < take.length) {
          const f = take[i++];
          try {
            const res = await fetch(`https://raw.githubusercontent.com/${r.owner}/${r.repo}/${encodeURIComponent(ref)}/${enc(f.path)}`);
            if (res.ok) { const buf = new Uint8Array(await res.arrayBuffer()); if (!buf.includes(0)) files[f.rel] = new TextDecoder().decode(buf); else skipped.binary++; }
          } catch (_) { /* one file failing should not stop the rest */ }
          if (++done % 10 === 0) API.setStatusFlash?.(`Opening ${name}: ${done} of ${take.length} files`);
        }
      };
      await Promise.all(Array.from({ length: 8 }, worker));
      const paths = Object.keys(files);
      if (!paths.length) throw new Error("The files could not be downloaded. Check your connection.");
      const entry = paths.find((f) => /^(main|app|__main__)\.py$/.test(f)) || paths.find((f) => /(^|\/)(main|app|__main__)\.py$/.test(f)) || paths.find((f) => /^index\.html$/i.test(f)) || paths.find((f) => /^readme\.md$/i.test(f));
      API.createProject({ files, entry }, r.sub ? `${r.repo}/${r.sub.split("/").pop()}` : r.repo);
      const left = skipped.binary + skipped.large + skipped.limit;
      const note = left ? ` Left out ${left}: ${[skipped.binary && `${skipped.binary} images or other binary files`, skipped.large && `${skipped.large} over 500 KB`, skipped.limit && `${skipped.limit} past the limit of ${MAX_FILES} files or 4 MB`].filter(Boolean).join(", ")}.` : "";
      API.toast(`Opened ${name} (${ref}): ${paths.length} files.${note}${data.truncated ? " GitHub sent only part of a very large repository." : ""}`, "ok", left ? 8000 : 4000);
      return paths.length;
    } catch (e) {
      API.toast(e.message.includes("Failed to fetch") ? "Could not reach GitHub. Check your connection." : e.message, "error", 6000);
      return null;
    }
  }

  async function ask() {
    const v = await API.promptDialog({ title: "Open a GitHub repository", message: "A public repository, as owner/name or its github.com link. A link to a folder (…/tree/branch/folder) opens just that folder. Text files are copied into a new project; images and other binary files are left out.", placeholder: "octocat/Hello-World", okLabel: "Open" });
    if (v) return open(v);
  }

  // Links like https://…/dexna/?github=owner/repo open that repository (after asking)
  async function fromUrl() {
    const q = new URLSearchParams(location.search), v = q.get("github");
    if (!v) return;
    q.delete("github");
    history.replaceState(null, "", location.pathname + (q.size ? "?" + q : "") + location.hash);
    const r = parseRepo(v);
    if (!r) return;
    const ok = await API.confirmDialog({ title: "Open a GitHub repository", message: `This link opens ${r.owner}/${r.repo}${r.sub ? " (" + r.sub + ")" : ""} from GitHub as a new project. Open it?`, okLabel: "Open" });
    if (ok) open(v);
  }

  return {
    open, ask, fromUrl,
    commands: [{ id: "gh-open", label: "Open GitHub Repository…", cat: "File", run: ask }],
  };
}
