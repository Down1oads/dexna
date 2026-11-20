// GitHub: open a repository as a project, and, signed in with a personal access token, pull, push
// and publish. Everything talks to GitHub's API straight from the browser (it allows that); there is
// no Dexna server. The token is kept in this browser's storage only and sent only to api.github.com.
//
// A project opened from a branch remembers where it came from (project.github): the repository, the
// branch, the folder, the commit it was last in step with, and each file's Git blob hash at that
// commit. Comparing those hashes with the files now tells what changed on either side.

import { isBinary } from "./assets.js";

const MAX_FILES = 1500, MAX_TEXT = 8_000_000, MAX_TEXT_FILE = 2_000_000, MAX_BIN = 80_000_000, MAX_BIN_FILE = 25_000_000;
const SKIP_DIR = /(^|\/)(\.git|node_modules|\.venv|venv|__pycache__|\.mypy_cache|\.pytest_cache|\.next)\//;
// files that are certainly binary (images, fonts, audio...): kept as bytes, never decoded as text
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|icns|cur|bmp|tiff?|psd|pdf|docx?|xlsx?|pptx?|zip|gz|tgz|bz2|xz|7z|rar|jar|war|class|exe|dll|so|dylib|o|a|lib|obj|wasm|pyc|pyd|whl|egg|mp3|mp4|m4a|aac|wav|flac|ogg|oga|opus|webm|mov|avi|mkv|ttf|otf|woff2?|eot|sqlite3?|db|bin|dat|pkl|npy|npz|h5|onnx|pt|ckpt|glb|fbx|blend|keystore|p12|der)$/i;
const TOKEN_KEY = "dexna:github-auth"; // not part of Export settings, profiles or share links

/** "owner/repo", "github.com/owner/repo", or a link to a branch or folder (…/tree/branch/folder). */
export function parseRepo(text) {
  let s = String(text || "").trim().replace(/\.git$/, "").replace(/\/+$/, "");
  s = s.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "");
  const m = s.match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2], ref: m[3] ? decodeURIComponent(m[3]) : null, sub: m[4] ? decodeURIComponent(m[4]).replace(/\/+$/, "") : "" };
}

/** Choose which files to download: text and binary files (images, fonts, audio...), within the limits. */
export function pickFiles(tree, sub, limits = true) {
  const prefix = sub ? sub + "/" : "";
  const take = [], skipped = { large: 0, limit: 0 };
  let text = 0, bin = 0;
  for (const it of tree) {
    if (it.type !== "blob" || (prefix && !it.path.startsWith(prefix))) continue;
    const rel = it.path.slice(prefix.length);
    if (SKIP_DIR.test("/" + rel) || it.mode === "120000" || it.mode === "160000") continue; // links and submodules
    const binary = BINARY.test(rel), size = it.size || 0;
    if (size > (binary ? MAX_BIN_FILE : Math.max(MAX_TEXT_FILE, MAX_BIN_FILE))) { skipped.large++; continue; }
    if (limits && (take.length >= MAX_FILES || (binary ? bin + size > MAX_BIN : text + size > MAX_TEXT))) { skipped.limit++; continue; }
    if (binary) bin += size; else text += size;
    take.push({ path: it.path, rel, sha: it.sha, mode: it.mode, binary });
  }
  return { take, skipped, total: text + bin };
}

/** The hash Git gives a file's contents ("blob <size>\0<bytes>", SHA-1), to compare without downloading. */
export async function blobSha(content) {
  const body = typeof content === "string" ? new TextEncoder().encode(content) : content, head = new TextEncoder().encode(`blob ${body.length}\0`);
  const all = new Uint8Array(head.length + body.length); all.set(head); all.set(body, head.length);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-1", all))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const shaCache = new Map(), binCache = new WeakMap(); // so the panel can recount changes cheaply
async function shaOf(content) {
  if (typeof content !== "string") { let s = binCache.get(content); if (!s) { s = await blobSha(content); binCache.set(content, s); } return s; }
  let s = shaCache.get(content); if (!s) { s = await blobSha(content); if (shaCache.size > 3000) shaCache.clear(); shaCache.set(content, s); } return s;
}
const toBase64 = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const b64text = (b64) => { const bin = atob(b64.replace(/\n/g, "")), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return bytes; };

export function createGitHub(API) {
  const { h } = API;
  let auth = null; // { token, login }
  const drafts = {}; // project id -> the commit message being written
  const conflictCopies = {}; // project id -> { path: GitHub's text } for files kept as yours when pulling
  const cache = new Map(); // short-lived answers (recent commits, build status, pull requests) keyed by URL
  try { auth = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null"); } catch (_) { auth = null; }
  const changed = () => { document.dispatchEvent(new Event("dexna:github")); };

  /* ---------- talking to GitHub ---------- */
  async function gh(path, { method = "GET", body, token = auth?.token } = {}) {
    let res;
    try {
      res = await fetch("https://api.github.com" + path, {
        method, body: body ? JSON.stringify(body) : undefined, cache: "no-store",
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: "Bearer " + token } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      });
    } catch (_) { throw new Error("Could not reach GitHub. Check your connection."); }
    if (res.ok) return res.status === 204 ? null : res.json();
    let msg = ""; try { msg = (await res.json()).message || ""; } catch (_) {}
    const err = new Error(msg); err.status = res.status;
    if (res.status === 401) err.message = "GitHub did not accept your token: it may have expired or been revoked. Sign in again with a new one.";
    else if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
      const reset = +res.headers.get("x-ratelimit-reset");
      err.message = (token ? "GitHub's hourly limit for your account is used up" : "GitHub's limit for visitors without an account is used up (signing in raises it)") + (reset ? `; try again after ${new Date(reset * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` : ".");
    } else if (res.status === 403) err.message = path === "/user/repos" ? "Your token is not allowed to create repositories. Give it Administration: Read and write (with All repositories), or use a classic token with the repo scope." : "Your token is not allowed to do this. It needs Contents: Read and write on this repository.";
    else if (res.status === 404) err.message = "Not found. The repository may be private (sign in with a token that can see it) or spelled differently.";
    else if (res.status === 409) err.message = msg.includes("empty") ? "The repository is empty. Add a first file on GitHub, or publish a new repository from Dexna." : msg || "GitHub reported a conflict.";
    else if (res.status === 422) err.message = msg || "GitHub could not do that.";
    else err.message = `GitHub answered ${res.status}${msg ? ": " + msg : ""}.`;
    throw err;
  }
  const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");
  async function headOf(owner, repo, branch) { return (await gh(`/repos/${owner}/${repo}/git/ref/heads/${encPath(branch)}`)).object.sha; }
  async function treeOf(owner, repo, commitSha) {
    const c = await gh(`/repos/${owner}/${repo}/git/commits/${commitSha}`);
    const t = await gh(`/repos/${owner}/${repo}/git/trees/${c.tree.sha}?recursive=1`);
    return { treeSha: c.tree.sha, tree: t.tree || [], truncated: t.truncated };
  }
  /** Download files: from raw.githubusercontent.com for public repositories, through the API for private ones. */
  async function download(info, items, onProgress) {
    const out = {}; let i = 0, done = 0;
    const one = async (f) => {
      if (info.private) { const b = await gh(`/repos/${info.owner}/${info.repo}/git/blobs/${f.sha}`); return b64text(b.content); }
      const res = await fetch(`https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.at}/${encPath(f.path)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      return new Uint8Array(await res.arrayBuffer());
    };
    const worker = async () => {
      while (i < items.length) {
        const f = items[i++];
        try { const bytes = await one(f); out[f.rel] = f.binary || isBinary(bytes) ? bytes : new TextDecoder().decode(bytes); } catch (_) { /* one file failing should not stop the rest */ }
        if (++done % 10 === 0) onProgress?.(done, items.length);
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    return out;
  }

  /* ---------- opening a repository ---------- */
  async function open(text) {
    const r = parseRepo(text);
    if (!r) { API.toast("Write it as owner/name, for example octocat/Hello-World, or paste its github.com link", "warn", 5000); return null; }
    const name = `${r.owner}/${r.repo}`;
    API.setStatusFlash?.(`Opening ${name}…`);
    try {
      const info = await gh(`/repos/${r.owner}/${r.repo}`);
      const branch = r.ref || info.default_branch || "main";
      // a branch is followed (so you can pull and push later); a tag or commit is opened as a copy
      let head = null;
      try { head = await headOf(r.owner, r.repo, branch); } catch (e) { if (e.status !== 404) throw e; }
      const at = head || branch;
      const { tree, truncated } = head ? await treeOf(r.owner, r.repo, head) : { tree: (await gh(`/repos/${r.owner}/${r.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`)).tree, truncated: false };
      const { take, skipped } = pickFiles(tree, r.sub);
      if (!take.length) throw new Error(r.sub ? `No files in ${r.sub}.` : `${name} has no files.`);
      const got = await download({ owner: r.owner, repo: r.repo, private: info.private, at }, take, (d, n) => API.setStatusFlash?.(`Opening ${name}: ${d} of ${n} files`));
      const files = {}, bins = {};
      for (const [k, v] of Object.entries(got)) (typeof v === "string" ? files : bins)[k] = v;
      const paths = Object.keys(got);
      if (!paths.length) throw new Error("The files could not be downloaded. Check your connection.");
      const entry = paths.find((f) => /^(main|app|__main__)\.py$/.test(f)) || paths.find((f) => /(^|\/)(main|app|__main__)\.py$/.test(f)) || paths.find((f) => /^index\.html$/i.test(f)) || paths.find((f) => /^readme\.md$/i.test(f));
      API.createProject({ files, entry }, r.sub ? `${r.repo}/${r.sub.split("/").pop()}` : r.repo);
      const p = API.project; // the project now open
      if (Object.keys(bins).length) await API.addAssets(bins);
      if (head && p) {
        const base = {}, modes = {};
        for (const f of take) if (got[f.rel] != null) { base[f.rel] = f.sha; if (f.mode !== "100644") modes[f.rel] = f.mode; }
        p.github = { owner: r.owner, repo: r.repo, branch, defaultBranch: info.default_branch || branch, sub: r.sub, private: !!info.private, head, base, modes, synced: Date.now() };
        API.persist();
      }
      const left = skipped.large + skipped.limit, nb = Object.keys(bins).length;
      const note = left ? ` Left out ${left}: ${[skipped.large && `${skipped.large} over 25 MB`, skipped.limit && `${skipped.limit} past the limit of ${MAX_FILES} files, 8 MB of text or 80 MB in all`].filter(Boolean).join(", ")}.` : "";
      API.toast(`Opened ${name} (${branch}): ${paths.length} files${nb ? `, ${nb} of them images or other binary files` : ""}.${note}${truncated ? " GitHub sent only part of a very large repository." : ""}`, "ok", left ? 8000 : 4000);
      changed();
      return paths.length;
    } catch (e) {
      API.toast(e.status === 404 && !auth ? `${name} was not found. It may be private (sign in to open private repositories) or spelled differently.` : e.message, "error", 7000);
      return null;
    }
  }

  /* ---------- choosing a repository from a list ---------- */
  let myRepos = null; // fetched once per session, refreshed in the background
  async function listRepos(path) {
    const out = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await gh(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
      out.push(...batch);
      if (batch.length < 100) break;
    }
    return out;
  }
  const loadMine = () => listRepos("/user/repos?sort=pushed&affiliation=owner,collaborator,organization_member").then((r) => (myRepos = r));

  /** A searchable list of repositories; typing owner/name or a link opens that instead. */
  function pickFrom(repos, { title = null } = {}) {
    const row = (r) => ({
      label: r.full_name,
      detail: (r.description || "").slice(0, 90),
      desc: [r.private ? "private" : null, r.fork ? "fork" : null, r.language, r.pushed_at ? API.ago(Date.parse(r.pushed_at)) : null].filter(Boolean).join(" · "),
      run: () => open(r.full_name),
    });
    API.quickPick({
      placeholder: title || "Pick a repository, type owner/name, paste a github.com link, or type a username",
      source: (q) => {
        const t = q.trim(), lc = t.toLowerCase(), items = [];
        if (t && parseRepo(t)) items.push({ label: `Open ${t}`, detail: "from GitHub", run: () => open(t) });
        const words = lc.split(/\s+/).filter(Boolean);
        for (const r of repos) { // your matching repositories come first
          const hay = (r.full_name + " " + (r.description || "") + " " + (r.language || "")).toLowerCase();
          if (words.every((w) => hay.includes(w))) items.push(row(r));
        }
        if (!title && /^[A-Za-z0-9-]{1,39}$/.test(t)) items.push({ label: `Show ${t}'s repositories…`, detail: "public repositories of this user or organization", run: () => showUser(t) });
        if (!auth && !title) items.push({ label: "Sign in to GitHub to list your repositories…", detail: "including private ones", run: async () => { if (await signIn()) ask(); } });
        return items;
      },
    });
  }
  async function showUser(name) {
    API.setStatusFlash?.(`Loading ${name}'s repositories…`);
    try {
      const repos = await listRepos(`/users/${encodeURIComponent(name)}/repos?sort=pushed&type=owner`);
      if (!repos.length) return API.toast(`${name} has no public repositories`, "info");
      pickFrom(repos.sort((a, b) => Date.parse(b.pushed_at || 0) - Date.parse(a.pushed_at || 0)), { title: `${name}'s repositories (${repos.length}): type to filter` });
    } catch (e) { API.toast(e.status === 404 ? `There is no GitHub user or organization called ${name}.` : e.message, "error", 6000); }
  }
  async function ask() {
    if (auth && !myRepos) {
      API.setStatusFlash?.("Loading your repositories…");
      try { await loadMine(); } catch (e) { API.toast(e.message, "error", 6000); myRepos = []; }
    } else if (auth) loadMine().catch(() => {}); // show the list now, refresh it for next time
    pickFrom(auth ? myRepos || [] : []);
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

  /* ---------- signing in ---------- */
  async function signIn() {
    return new Promise((resolve) => {
      const input = h("input", { type: "password", placeholder: "github_pat_… or ghp_…", spellcheck: "false", autocomplete: "off" });
      const err = h("p", { class: "gh-err hidden" });
      const btn = h("button", { class: "btn primary" }, "Sign in");
      const go = async () => {
        const token = input.value.trim();
        if (!token) return input.focus();
        btn.disabled = true; btn.textContent = "Checking…"; err.classList.add("hidden");
        try {
          const me = await gh("/user", { token });
          auth = { token, login: me.login };
          try { localStorage.setItem(TOKEN_KEY, JSON.stringify(auth)); } catch (_) {}
          myRepos = null; API.closeModal(); API.toast(`Signed in to GitHub as ${me.login}`, "ok"); changed(); resolve(true);
        } catch (e) {
          err.textContent = e.status === 401 ? "GitHub did not accept this token. Check that it was copied whole and has not expired." : e.message;
          err.classList.remove("hidden"); btn.disabled = false; btn.textContent = "Sign in";
        }
      };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      btn.addEventListener("click", go);
      const link = (href, text) => h("a", { href, target: "_blank", rel: "noopener" }, text);
      API.openModal(h("div", { class: "modal gh-modal" },
        h("div", { class: "modal-head" }, "Sign in to GitHub"),
        h("div", { class: "modal-body" },
          h("p", {}, "Dexna talks to GitHub straight from your browser using a personal access token. The token stays in this browser and is only ever sent to GitHub."),
          h("ol", { class: "gh-steps" },
            h("li", {}, link("https://github.com/settings/personal-access-tokens/new", "Create a fine-grained token"), " on GitHub (it opens in a new tab)."),
            h("li", {}, "Under ", h("b", {}, "Repository access"), ", pick the repositories Dexna may use, or All repositories."),
            h("li", {}, "Under ", h("b", {}, "Permissions"), ", set ", h("b", {}, "Contents"), " to Read and write. To publish new repositories from Dexna, also set ", h("b", {}, "Administration"), " to Read and write (with All repositories)."),
            h("li", {}, "Generate it, copy it, and paste it here.")),
          h("p", { class: "muted small" }, "A classic token with the ", h("code", {}, "repo"), " scope works too (", link("https://github.com/settings/tokens/new?scopes=repo&description=Dexna", "create one"), ")."),
          input, err),
        h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => { API.closeModal(); resolve(false); } }, "Cancel"), btn)), () => resolve(false));
      setTimeout(() => input.focus(), 50);
    });
  }
  async function signOut() {
    if (!(await API.confirmDialog({ title: "Sign out of GitHub", message: "Dexna forgets your token. Projects stay linked to their repositories, so you can sign in again later. To revoke the token itself, delete it on GitHub.", okLabel: "Sign out" }))) return;
    auth = null; myRepos = null; try { localStorage.removeItem(TOKEN_KEY); } catch (_) {}
    API.toast("Signed out of GitHub", "ok"); changed();
  }
  const needAuth = async () => auth || ((await signIn()) && auth);

  /* ---------- comparing with the last sync ---------- */
  async function localState(p) {
    const g = p.github, files = { ...API.currentFiles(), ...(API.assetFiles?.() || {}) }, shas = {};
    for (const [path, text] of Object.entries(files)) shas[path] = await shaOf(text);
    const edited = Object.keys(shas).filter((f) => g.base[f] !== shas[f]);
    const removed = Object.keys(g.base).filter((f) => files[f] == null);
    return { files, shas, edited, removed };
  }

  /* ---------- pull ---------- */
  async function pull({ quiet = false, silent = false } = {}) {
    const p = API.project, g = p?.github;
    if (!g) return API.toast("This project is not linked to GitHub. Open a repository, or publish this project.", "warn");
    API.setStatusFlash?.(`Pulling from ${g.owner}/${g.repo}…`);
    try {
      const head = await headOf(g.owner, g.repo, g.branch);
      if (head === g.head) { if (!quiet) API.toast(`Already up to date with ${g.owner}/${g.repo} (${g.branch})`, "ok"); return { upToDate: true }; }
      const { tree } = await treeOf(g.owner, g.repo, head);
      const { take } = pickFiles(tree, g.sub, false);
      const remote = new Map(take.map((f) => [f.rel, f]));
      const { files, shas } = await localState(p);
      const get = [], conflicts = [], remove = [], conflictItems = [];
      let same = 0;
      for (const [rel, f] of remote) {
        const base = g.base[rel], mine = shas[rel];
        if (f.sha === base) continue; // not changed on GitHub
        if (mine === f.sha) { g.base[rel] = f.sha; same++; continue; } // already the same here
        if (mine == null && base == null) get.push(f); // new on GitHub
        else if (mine === base) get.push(f); // changed on GitHub, not here
        else { conflicts.push(rel); conflictItems.push(f); g.base[rel] = f.sha; } // changed on both sides: keep yours
      }
      for (const rel of Object.keys(g.base)) {
        if (remote.has(rel)) continue;
        if (files[rel] != null && shas[rel] === g.base[rel]) remove.push(rel); // deleted on GitHub, unchanged here
        else if (files[rel] != null) conflicts.push(rel);
        delete g.base[rel];
      }
      const got = await download({ owner: g.owner, repo: g.repo, private: g.private, at: head }, get, (d, n) => API.setStatusFlash?.(`Pulling: ${d} of ${n} files`));
      const writes = {};
      for (const f of get) if (got[f.rel] != null) { writes[f.rel] = got[f.rel]; g.base[f.rel] = f.sha; if (f.mode !== "100644") g.modes[f.rel] = f.mode; }
      const added = Object.keys(writes).filter((f) => files[f] == null).length, updated = Object.keys(writes).length - added;
      if (Object.keys(writes).length) API.writeFiles(writes);
      if (remove.length) API.removeFiles(remove);
      if (conflictItems.length) { // GitHub's versions, to compare with yours
        const theirs = await download({ owner: g.owner, repo: g.repo, private: g.private, at: head }, conflictItems);
        const keep = (conflictCopies[p.id] ||= {});
        for (const [rel, c] of Object.entries(theirs)) if (typeof c === "string") keep[rel] = c;
      }
      g.head = head; g.synced = Date.now(); forget(`/repos/${g.owner}/${g.repo}/`);
      API.persist(); changed();
      const parts = [updated && `${updated} updated`, added && `${added} added`, remove.length && `${remove.length} removed`].filter(Boolean);
      if (!silent) API.toast(`Pulled ${g.owner}/${g.repo}: ${parts.length ? parts.join(", ") : "nothing to change here"}.` + (conflicts.length ? ` Kept your version of ${conflicts.slice(0, 4).join(", ")}${conflicts.length > 4 ? ` and ${conflicts.length - 4} more` : ""}, also changed on GitHub; pushing will replace GitHub's.` : ""), conflicts.length ? "warn" : "ok", conflicts.length ? 10000 : 4000);
      return { updated, added, removed: remove.length, conflicts };
    } catch (e) { API.toast(e.message, "error", 7000); return null; }
  }

  /* ---------- push ---------- */
  async function push(message) {
    const p = API.project, g = p?.github;
    if (!g) return API.toast("This project is not linked to GitHub. Open a repository, or publish this project.", "warn");
    if (!(await needAuth())) return null;
    const st = await localState(p);
    if (!st.edited.length && !st.removed.length) { API.toast("Nothing to push: the project matches GitHub", "info"); return { pushed: 0 }; }
    if (message == null) {
      const list = [...st.edited, ...st.removed];
      message = await API.promptDialog({ title: `Push to ${g.owner}/${g.repo} (${g.branch})`, message: `${list.length} file${list.length === 1 ? "" : "s"}: ${list.slice(0, 6).join(", ")}${list.length > 6 ? "…" : ""}. Describe the change:`, value: autoMessage(st), okLabel: "Commit and push" });
      if (message == null) return null;
    }
    message = message.trim() || autoMessage(st);
    API.setStatusFlash?.(`Pushing to ${g.owner}/${g.repo}…`);
    try {
      const head = await headOf(g.owner, g.repo, g.branch);
      if (head !== g.head) {
        const pullFirst = await API.confirmDialog({ title: "GitHub has newer commits", message: `Someone (or you, elsewhere) pushed to ${g.branch} since this project last pulled. Pull those changes first; your own edits are kept. Then push again.`, okLabel: "Pull now" });
        if (pullFirst) await pull();
        return null;
      }
      const { treeSha } = await treeOf(g.owner, g.repo, head);
      const prefix = g.sub ? g.sub + "/" : "";
      const entries = [];
      for (const rel of st.edited) {
        const c = st.files[rel], mode = g.modes[rel] || "100644";
        if (typeof c === "string") entries.push({ path: prefix + rel, mode, type: "blob", content: c });
        else entries.push({ path: prefix + rel, mode, type: "blob", sha: (await gh(`/repos/${g.owner}/${g.repo}/git/blobs`, { method: "POST", body: { content: toBase64(c), encoding: "base64" } })).sha }); // binary: upload it first
      }
      entries.push(
        ...st.removed.map((rel) => ({ path: prefix + rel, mode: g.modes[rel] || "100644", type: "blob", sha: null })));
      const tree = await gh(`/repos/${g.owner}/${g.repo}/git/trees`, { method: "POST", body: { base_tree: treeSha, tree: entries } });
      const commit = await gh(`/repos/${g.owner}/${g.repo}/git/commits`, { method: "POST", body: { message, tree: tree.sha, parents: [head] } });
      await gh(`/repos/${g.owner}/${g.repo}/git/refs/heads/${encPath(g.branch)}`, { method: "PATCH", body: { sha: commit.sha } });
      for (const rel of st.edited) g.base[rel] = st.shas[rel];
      for (const rel of st.removed) { delete g.base[rel]; delete g.modes[rel]; }
      g.head = commit.sha; g.synced = Date.now(); forget(`/repos/${g.owner}/${g.repo}/`);
      API.persist(); changed();
      API.toast(`Pushed ${entries.length} file${entries.length === 1 ? "" : "s"} to ${g.owner}/${g.repo} (${g.branch}): "${message.split("\n")[0]}"`, "ok", 5000);
      return { pushed: entries.length, sha: commit.sha, url: commit.html_url };
    } catch (e) { API.toast(e.message, "error", 8000); return null; }
  }
  function autoMessage(st) {
    const all = [...st.edited, ...st.removed], names = all.map((f) => f.split("/").pop());
    if (all.length === 1) return `${st.removed.length ? "Delete" : "Update"} ${names[0]}`;
    if (all.length <= 3) return `Update ${names.join(", ")}`;
    return `Update ${all.length} files`;
  }

  /* ---------- publish ---------- */
  /* ---------- publish: a new repository, set up like GitHub's own form ---------- */
  let templates = null; // { gitignore: [names], licenses: [{ key, name }] }, fetched once
  const loadTemplates = () => (templates ||= Promise.all([
    gh("/gitignore/templates").catch(() => []),
    gh("/licenses").catch(() => []),
  ]).then(([gitignore, licenses]) => ({ gitignore, licenses })));
  /** A .gitignore template that fits the project's files. */
  function suggestIgnore(paths) {
    const has = (re) => paths.some((p) => re.test(p));
    if (has(/\.py$|\.ipynb$/)) return "Python";
    if (has(/(^|\/)package\.json$|\.(ts|tsx|jsx)$/)) return "Node";
    if (has(/\.java$|\.kt$/)) return "Java";
    if (has(/\.cs$|\.fs$|\.vb$/)) return "VisualStudio";
    if (has(/\.go$/)) return "Go";
    if (has(/\.rs$/)) return "Rust";
    if (has(/\.(c|cpp|cc|h|hpp)$/)) return "C++";
    if (has(/\.rb$/)) return "Ruby";
    if (has(/\.swift$/)) return "Swift";
    if (has(/\.dart$/)) return "Dart";
    if (has(/\.lua$/)) return "Lua";
    return "";
  }

  async function publish() {
    const p = API.project;
    if (!p) return;
    if (p.github) return API.toast(`This project is already on GitHub: ${p.github.owner}/${p.github.repo}`, "info");
    if (!(await needAuth())) return null;
    const paths = Object.keys({ ...API.currentFiles(), ...(API.assetFiles?.() || {}) });
    const readme = paths.find((f) => /^readme(\.md|\.txt|\.rst)?$/i.test(f));
    const slugName = (p.name || "my-project").trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "my-project";

    return new Promise((resolve) => {
      const owner = h("select", {}, h("option", { value: "" }, auth.login));
      gh("/user/orgs").then((orgs) => { for (const o of orgs) owner.append(h("option", { value: o.login }, o.login)); }).catch(() => {}); // listed when the token may read organizations
      const name = h("input", { value: slugName, spellcheck: "false" });
      const desc = h("input", { placeholder: "Optional", spellcheck: "true" });
      const vis = (v, label, note) => h("label", { class: "gh-radio" }, h("input", { type: "radio", name: "gh-vis", value: v, checked: v === "private" }), h("span", {}, h("b", {}, label), h("span", { class: "muted small" }, note)));
      const visPublic = vis("public", "Public", "Anyone on the internet can see it. You choose who can commit.");
      const visPrivate = vis("private", "Private", "Only you, and people you invite, can see it.");
      // README: the project's own, or one written here
      const addReadme = h("input", { type: "checkbox", checked: true, disabled: !!readme });
      let edited = false;
      const readmeText = h("textarea", { class: "gh-readme", rows: 6, spellcheck: "true" });
      const fillReadme = () => { if (!edited) readmeText.value = `# ${name.value.trim() || slugName}\n` + (desc.value.trim() ? `\n${desc.value.trim()}\n` : ""); };
      fillReadme();
      readmeText.addEventListener("input", () => { edited = true; });
      name.addEventListener("input", fillReadme); desc.addEventListener("input", fillReadme);
      addReadme.addEventListener("change", () => { readmeText.classList.toggle("hidden", !addReadme.checked); });
      const ignore = h("select", {}, h("option", { value: "" }, "None"));
      const license = h("select", {}, h("option", { value: "" }, "None"));
      const suggested = suggestIgnore(paths);
      loadTemplates().then(({ gitignore, licenses }) => {
        for (const t of gitignore) ignore.append(h("option", { value: t, selected: t === suggested }, t));
        for (const l of licenses) license.append(h("option", { value: l.key }, l.name));
      });
      const hasIgnore = paths.includes(".gitignore"), hasLicense = paths.some((f) => /^(licen[cs]e|copying)(\.md|\.txt)?$/i.test(f));
      const err = h("p", { class: "gh-err hidden" });
      const btn = h("button", { class: "btn primary" }, "Create repository");
      const field = (label, input, note) => h("label", { class: "gh-field" }, h("span", {}, label), input, note ? h("span", { class: "muted small" }, note) : null);

      const go = async () => {
        const repoName = name.value.trim();
        if (!repoName) return name.focus();
        btn.disabled = true; btn.textContent = "Creating…"; err.classList.add("hidden");
        try {
          const isPrivate = visPrivate.querySelector("input").checked;
          const body = { name: repoName, description: desc.value.trim(), private: isPrivate, auto_init: true };
          if (ignore.value && !hasIgnore) body.gitignore_template = ignore.value;
          if (license.value && !hasLicense) body.license_template = license.value;
          const repo = await gh(owner.value ? `/orgs/${encodeURIComponent(owner.value)}/repos` : "/user/repos", { method: "POST", body });
          const branch = repo.default_branch || "main";
          let head = null;
          for (let i = 0; i < 8 && !head; i++) { try { head = await headOf(repo.owner.login, repo.name, branch); } catch (_) { await new Promise((r) => setTimeout(r, 700)); } } // a new repository takes a moment
          if (!head) throw new Error("The repository was created, but GitHub has not set it up yet. Try Push in a moment.");
          const proj = API.project;
          proj.github = { owner: repo.owner.login, repo: repo.name, branch, defaultBranch: branch, sub: "", private: !!repo.private, head: null, base: {}, modes: {}, synced: Date.now() };
          // bring in what GitHub made (README, LICENSE, .gitignore); the project's own files win
          await pull({ silent: true });
          if (!readme) {
            if (!addReadme.checked) API.removeFiles(["README.md"].filter((f) => API.currentFiles()[f] != null));
            else if (readmeText.value.trim()) API.writeFiles({ "README.md": readmeText.value.endsWith("\n") ? readmeText.value : readmeText.value + "\n" });
          }
          myRepos = null; API.persist(); API.closeModal(); changed();
          const r = await push(`Add ${proj.name || repo.name} from Dexna`);
          if (r) API.toast(`Created github.com/${repo.full_name}${repo.private ? " (private)" : ""} and pushed the project`, "ok", 6000);
          resolve(r);
        } catch (e) {
          err.textContent = e.status === 422 && /already exists/i.test(e.message) ? `${owner.value || auth.login} already has a repository called ${name.value.trim()}. Pick another name.` : e.message;
          err.classList.remove("hidden"); btn.disabled = false; btn.textContent = "Create repository";
        }
      };
      btn.addEventListener("click", go);
      name.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      API.openModal(h("div", { class: "modal gh-modal gh-publish" },
        h("div", { class: "modal-head" }, "Create a new repository"),
        h("div", { class: "modal-body" },
          h("p", { class: "muted small" }, "GitHub makes the repository, then Dexna pushes this project's files to it and links the two, so you can pull and push later."),
          h("div", { class: "gh-row" }, field("Owner", owner), h("span", { class: "gh-slash" }, "/"), field("Repository name", name)),
          field("Description", desc),
          h("div", { class: "gh-vis" }, visPublic, visPrivate),
          h("div", { class: "gh-sub" }, "Initialize with"),
          h("label", { class: "si-check" }, addReadme, h("span", {}, readme ? `README: this project's ${readme} is used` : "Add a README file")),
          readme ? null : readmeText,
          field(".gitignore", hasIgnore ? h("span", { class: "muted small" }, "This project's .gitignore is used.") : ignore, hasIgnore ? null : "Files Git should not track, from GitHub's templates." + (suggested ? ` ${suggested} fits this project.` : "")),
          field("License", hasLicense ? h("span", { class: "muted small" }, "This project already has a license file.") : license, hasLicense ? null : "Tells others what they may do with your code. MIT and Apache 2.0 let them do almost anything."),
          err),
        h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => { API.closeModal(); resolve(null); } }, "Cancel"), btn)), () => resolve(null));
      setTimeout(() => name.select(), 50);
    });
  }

  async function unlink() {
    const p = API.project, g = p?.github;
    if (!g) return;
    if (!(await API.confirmDialog({ title: "Unlink from GitHub", message: `The project keeps its files but no longer pulls from or pushes to ${g.owner}/${g.repo}. Nothing changes on GitHub.`, okLabel: "Unlink" }))) return;
    delete p.github; API.persist(); changed();
  }

  /* ---------- the GitHub box at the top of Source Control ---------- */
  /* ---------- cached reads for the panel (it redraws often) ---------- */
  function cached(path, ttl = 60_000) {
    const hit = cache.get(path);
    if (hit && Date.now() - hit.t < ttl) return hit.v;
    const v = gh(path).catch(() => null);
    cache.set(path, { t: Date.now(), v });
    return v;
  }
  const forget = (prefix) => { for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k); };
  async function defaultBranchOf(g) {
    if (!g.defaultBranch) { const info = await gh(`/repos/${g.owner}/${g.repo}`); g.defaultBranch = info.default_branch; API.persist(); }
    return g.defaultBranch;
  }

  /* ---------- branches ---------- */
  async function chooseBranch() {
    const p = API.project, g = p?.github;
    if (!g) return API.toast("This project is not linked to GitHub", "warn");
    let list;
    try { list = await listRepos(`/repos/${g.owner}/${g.repo}/branches`); } catch (e) { return API.toast(e.message, "error", 6000); }
    const def = g.defaultBranch;
    API.quickPick({
      placeholder: `Branches of ${g.owner}/${g.repo}: pick one to switch to, or type a new name to create it`,
      source: (q) => {
        const t = q.trim(), items = [];
        if (t && !list.some((b) => b.name === t)) items.push({ label: `Create branch "${t}"`, detail: `from ${g.branch} as you have it, and switch to it`, run: () => createBranch(t) });
        for (const b of list) if (!t || b.name.toLowerCase().includes(t.toLowerCase())) items.push({ label: b.name, desc: [b.name === g.branch ? "current" : null, b.name === def ? "default" : null, b.protected ? "protected" : null].filter(Boolean).join(" · "), run: () => (b.name === g.branch ? null : switchBranch(b.name)) });
        return items;
      },
    });
  }
  /** Switching is a pull from the other branch: files you have not changed follow it, your edits stay. */
  async function switchBranch(name) {
    const p = API.project, g = p?.github;
    if (!g) return;
    const before = { branch: g.branch, head: g.head };
    g.branch = name; g.head = null; g.pr = null;
    const r = await pull({ silent: true });
    if (!r) { g.branch = before.branch; g.head = before.head; API.persist(); changed(); return null; }
    const parts = [r.updated && `${r.updated} updated`, r.added && `${r.added} added`, r.removed && `${r.removed} removed`].filter(Boolean);
    API.toast(`Switched to ${name}${parts.length ? ": " + parts.join(", ") : ""}.` + (r.conflicts?.length ? ` Kept your version of ${r.conflicts.join(", ")}.` : ""), r.conflicts?.length ? "warn" : "ok", 6000);
    return r;
  }
  async function createBranch(name) {
    const p = API.project, g = p?.github;
    if (!g) return;
    if (!/^(?!-)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9._/-]+(?<!\.lock)(?<![/.])$/.test(name)) return API.toast("A branch name can use letters, digits, - _ . and /, without spaces", "warn", 5000);
    if (!(await needAuth())) return null;
    try {
      const from = g.head || (await headOf(g.owner, g.repo, g.branch));
      await gh(`/repos/${g.owner}/${g.repo}/git/refs`, { method: "POST", body: { ref: "refs/heads/" + name, sha: from } });
      g.branch = name; g.head = from; g.pr = null;
      API.persist(); changed();
      API.toast(`Created branch ${name}. Commit and Push now sends your changes there.`, "ok", 5000);
      return name;
    } catch (e) { API.toast(e.status === 422 ? `A branch called ${name} already exists. Pick it from the list instead.` : e.message, "error", 6000); return null; }
  }

  /* ---------- pull requests ---------- */
  async function pullRequest() {
    const p = API.project, g = p?.github;
    if (!g) return API.toast("This project is not linked to GitHub", "warn");
    if (!(await needAuth())) return null;
    const def = await defaultBranchOf(g).catch(() => "main");
    if (g.branch === def) return API.toast(`You are on ${def}, the default branch. Create a branch first (click the branch name), push to it, then open a pull request.`, "info", 7000);
    const existing = await gh(`/repos/${g.owner}/${g.repo}/pulls?state=open&head=${encodeURIComponent(g.owner + ":" + g.branch)}`).catch(() => []);
    if (existing.length) { g.pr = { number: existing[0].number, url: existing[0].html_url }; API.persist(); changed(); API.toast(`Pull request #${existing[0].number} is already open for ${g.branch}`, "info", 5000); return g.pr; }
    const st = await localState(p);
    if (st.edited.length || st.removed.length) {
      if (!(await API.confirmDialog({ title: "Push first?", message: `${st.edited.length + st.removed.length} changed file(s) are not on GitHub yet, so they would not be part of the pull request. Push them now?`, okLabel: "Push, then continue" }))) return null;
      if (!(await push())) return null;
    }
    const branches = await listRepos(`/repos/${g.owner}/${g.repo}/branches`).catch(() => [{ name: def }]);
    const commits = await gh(`/repos/${g.owner}/${g.repo}/commits?sha=${encodeURIComponent(g.branch)}&per_page=1`).catch(() => []);
    return new Promise((resolve) => {
      const title = h("input", { value: (commits[0]?.commit.message || g.branch).split("\n")[0], spellcheck: "true" });
      const body = h("textarea", { class: "gh-readme", rows: 6, placeholder: "What does this change, and why?", spellcheck: "true" });
      const base = h("select", {}, branches.filter((b) => b.name !== g.branch).map((b) => h("option", { value: b.name, selected: b.name === def }, b.name)));
      const draft = h("input", { type: "checkbox" });
      const err = h("p", { class: "gh-err hidden" });
      const btn = h("button", { class: "btn primary" }, "Create pull request");
      const field = (label, input) => h("label", { class: "gh-field" }, h("span", {}, label), input);
      btn.addEventListener("click", async () => {
        btn.disabled = true; err.classList.add("hidden");
        try {
          const pr = await gh(`/repos/${g.owner}/${g.repo}/pulls`, { method: "POST", body: { title: title.value.trim() || g.branch, head: g.branch, base: base.value, body: body.value, draft: draft.checked } });
          g.pr = { number: pr.number, url: pr.html_url }; API.persist(); API.closeModal(); changed(); forget(`/repos/${g.owner}/${g.repo}/pulls`);
          API.toast(`Opened pull request #${pr.number}: ${pr.title}`, "ok", 6000);
          resolve(g.pr);
        } catch (e) {
          err.textContent = /No commits between/i.test(e.message) ? `${g.branch} has no commits that ${base.value} lacks yet. Push a change to ${g.branch} first.` : e.message;
          err.classList.remove("hidden"); btn.disabled = false;
        }
      });
      API.openModal(h("div", { class: "modal gh-modal gh-publish" },
        h("div", { class: "modal-head" }, `Pull request: ${g.branch} into…`),
        h("div", { class: "modal-body" },
          field("Into branch", base), field("Title", title), field("Description", body),
          h("label", { class: "si-check" }, draft, h("span", {}, "Draft (not ready for review yet)")), err),
        h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => { API.closeModal(); resolve(null); } }, "Cancel"), btn)), () => resolve(null));
      setTimeout(() => title.select(), 50);
    });
  }

  /* ---------- comparing files that changed on both sides ---------- */
  function compareConflict(rel) {
    const p = API.project, theirs = conflictCopies[p?.id]?.[rel];
    if (theirs == null) return API.toast("GitHub's version of that file is no longer kept. Pull again to compare.", "info");
    const done = () => { delete conflictCopies[p.id][rel]; changed(); };
    API.showDiff({
      original: theirs, path: rel, live: true, title: `${rel}: GitHub ↔ yours`, originalLabel: "GitHub", modifiedLabel: "Yours (editable)",
      actions: [
        { label: "Use GitHub's version", run: () => { API.writeFiles({ [rel]: theirs }); done(); API.closeModal(); API.toast(`${rel} now matches GitHub`, "ok"); } },
        { label: "Keep mine", primary: true, run: () => { done(); API.closeModal(); } },
      ],
    });
  }

  /* ---------- links to GitHub ---------- */
  function fileUrl(path, line, endLine) {
    const g = API.project?.github;
    if (!g) return null;
    const full = (g.sub ? g.sub + "/" : "") + path;
    return `https://github.com/${g.owner}/${g.repo}/blob/${encPath(g.branch)}/${encPath(full)}` + (line ? `#L${line}` + (endLine && endLine !== line ? `-L${endLine}` : "") : "");
  }
  function currentLines() {
    const ed = API.editor, path = API.currentPath?.();
    if (!ed || !path) return null;
    const sel = ed.getSelection();
    return { path, line: sel.startLineNumber, end: sel.endLineNumber };
  }
  function openOnGitHub() {
    const c = currentLines(); if (!c) return;
    const u = fileUrl(c.path, c.line, c.end);
    if (!u) return API.toast("This project is not linked to GitHub", "warn");
    if (API.project.github.base[c.path] == null) API.toast("This file is not on GitHub yet: push it first", "info");
    window.open(u, "_blank", "noopener");
  }
  function copyLink() {
    const c = currentLines(); if (!c) return;
    const u = fileUrl(c.path, c.line, c.end);
    if (!u) return API.toast("This project is not linked to GitHub", "warn");
    navigator.clipboard?.writeText(u).then(() => API.toast("Link to these lines on GitHub copied", "ok"), () => API.toast(u, "info", 8000));
  }

  /* ---------- gists ---------- */
  async function shareGist() {
    const path = API.currentPath?.();
    if (!path || API.currentFiles()[path] == null) return API.toast("Open a text file to share it as a gist", "info");
    if (!(await needAuth())) return null;
    const files = API.currentFiles();
    return new Promise((resolve) => {
      const open = (API.project.open || []).filter((f) => files[f] != null);
      const boxes = open.map((f) => h("label", { class: "si-check" }, h("input", { type: "checkbox", value: f, checked: f === path }), h("span", {}, f)));
      const desc = h("input", { placeholder: "Optional", spellcheck: "true" });
      const pub = h("input", { type: "checkbox" });
      const err = h("p", { class: "gh-err hidden" });
      const btn = h("button", { class: "btn primary" }, "Create gist");
      btn.addEventListener("click", async () => {
        const chosen = boxes.map((b) => b.querySelector("input")).filter((i) => i.checked).map((i) => i.value);
        if (!chosen.length) return;
        btn.disabled = true; err.classList.add("hidden");
        try {
          const gist = await gh("/gists", { method: "POST", body: { description: desc.value.trim(), public: pub.checked, files: Object.fromEntries(chosen.map((f) => [f.split("/").pop(), { content: files[f] || "\n" }])) } });
          API.closeModal();
          navigator.clipboard?.writeText(gist.html_url).catch(() => {});
          API.toast(`Gist created and its link copied: ${gist.html_url}`, "ok", 8000);
          resolve(gist.html_url);
        } catch (e) {
          err.textContent = e.status === 403 || e.status === 404 ? "Your token may not create gists. Give it the Gists: Read and write permission (fine-grained), or the gist scope (classic)." : e.message;
          err.classList.remove("hidden"); btn.disabled = false;
        }
      });
      API.openModal(h("div", { class: "modal gh-modal" },
        h("div", { class: "modal-head" }, "Share as a GitHub Gist"),
        h("div", { class: "modal-body" },
          h("p", { class: "muted small" }, "A gist is a small, shareable set of files on GitHub. Pick the open files to include."),
          h("div", { class: "gh-files" }, boxes),
          h("label", { class: "gh-field" }, h("span", {}, "Description"), desc),
          h("label", { class: "si-check" }, pub, h("span", {}, "Public (listed on your profile; otherwise only people with the link can see it)")), err),
        h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => { API.closeModal(); resolve(null); } }, "Cancel"), btn)), () => resolve(null));
    });
  }

  /* ---------- what is happening on GitHub: recent commits, build status, the pull request ---------- */
  function activity(g) {
    const box = h("div", { class: "gh-activity" });
    const base = `/repos/${g.owner}/${g.repo}`;
    Promise.all([
      cached(`${base}/commits?sha=${encodeURIComponent(g.branch)}&per_page=4`),
      cached(`${base}/actions/runs?branch=${encodeURIComponent(g.branch)}&per_page=1`),
      auth && g.pr ? cached(`${base}/pulls/${g.pr.number}`) : null,
    ]).then(([commits, runs, pr]) => {
      const rows = [];
      const run = runs?.workflow_runs?.[0];
      if (run) {
        const state = run.status !== "completed" ? "running" : run.conclusion || "done";
        const label = { success: "passed", failure: "failed", cancelled: "cancelled", running: "running", skipped: "skipped", timed_out: "timed out" }[state] || state;
        rows.push(h("a", { class: "gh-run s-" + state, href: run.html_url, target: "_blank", rel: "noopener", title: run.display_title || run.name }, h("span", { class: "gh-dot" }), `${run.name}: ${label}`, h("span", { class: "muted" }, " · " + API.ago(Date.parse(run.updated_at)))));
      }
      if (pr) rows.push(h("a", { class: "gh-pr", href: pr.html_url, target: "_blank", rel: "noopener" }, `Pull request #${pr.number}: ${pr.title}`, h("span", { class: "muted" }, ` · ${pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : pr.draft ? "draft" : "open"}`)));
      if (commits?.length) {
        rows.push(h("div", { class: "gh-sub" }, `Recent commits on ${g.branch}`));
        for (const c of commits) rows.push(h("a", { class: "gh-commit-row", href: c.html_url, target: "_blank", rel: "noopener", title: c.commit.message },
          h("span", { class: "gh-cmsg" }, c.commit.message.split("\n")[0]),
          h("span", { class: "muted" }, `${c.author?.login || c.commit.author?.name || ""} · ${API.ago(Date.parse(c.commit.author?.date || c.commit.committer?.date))}`)));
      }
      box.replaceChildren(...rows);
    });
    return box;
  }

  function panel() {
    const p = API.project, g = p?.github, icon = API.icon;
    const btn = (label, ic, run, cls = "") => h("button", { class: "btn sm " + cls, onclick: run }, ic ? icon(ic) : null, label);
    const who = auth ? h("span", { class: "gh-who", title: "Signed in to GitHub. Click to sign out.", onclick: signOut }, icon("user"), auth.login) : null;
    const head = h("div", { class: "gh-head" }, h("span", { class: "gh-title" }, "GitHub"), who);
    if (!g) {
      return h("div", { class: "gh-box" }, head,
        h("div", { class: "muted small" }, auth ? "This project is not on GitHub yet." : "Sign in to open private repositories, and to pull, push and publish projects."),
        h("div", { class: "gh-acts" }, auth ? btn("Publish to GitHub…", "upload", publish, "primary") : btn("Sign in…", "user", signIn, "primary"), btn("Open a repository…", "download", ask)));
    }
    const status = h("div", { class: "muted small gh-status" }, "Checking for changes…");
    // the commit message for GitHub: a summary line and an optional description, kept while you type
    const draft = (drafts[p.id] ||= { summary: "", body: "" });
    const summary = h("input", { class: "gh-msg", value: draft.summary, placeholder: "Summary (required)", spellcheck: "true", "aria-label": "Commit summary" });
    const body = h("textarea", { class: "gh-desc", rows: 2, placeholder: "Description (optional)", spellcheck: "true", "aria-label": "Commit description" });
    body.value = draft.body;
    summary.addEventListener("input", () => { draft.summary = summary.value; });
    body.addEventListener("input", () => { draft.body = body.value; });
    let suggested = "";
    const send = async () => {
      const title = summary.value.trim() || suggested, rest = body.value.trim();
      if (!title) return API.toast("Nothing to push: the project matches GitHub", "info");
      const r = await push(rest ? `${title}\n\n${rest}` : title);
      if (r?.sha) { draft.summary = ""; draft.body = ""; changed(); }
    };
    for (const el of [summary, body]) el.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); send(); } });
    const pushBtn = btn("Commit and Push", "upload", send, "primary");
    localState(p).then((st) => {
      const n = st.edited.length + st.removed.length;
      status.textContent = (n ? `${n} file${n === 1 ? "" : "s"} changed since the last pull or push.` : "In step with GitHub as of the last pull or push.") + (g.synced ? ` Synced ${API.ago(g.synced)}.` : "");
      suggested = n ? autoMessage(st) : "";
      summary.placeholder = suggested ? `Summary (empty uses "${suggested}")` : "Summary";
      pushBtn.disabled = !n;
    }).catch(() => { status.textContent = ""; });
    const url = `https://github.com/${g.owner}/${g.repo}` + (g.sub || g.branch ? `/tree/${encPath(g.branch)}${g.sub ? "/" + encPath(g.sub) : ""}` : "");
    return h("div", { class: "gh-box" }, head,
      h("div", { class: "gh-repo" }, h("a", { href: url, target: "_blank", rel: "noopener", title: "Open on GitHub" }, `${g.owner}/${g.repo}${g.sub ? "/" + g.sub : ""}`), h("button", { class: "gh-branch", title: "Switch branch, or create one", onclick: chooseBranch }, icon("branch"), g.branch, icon("chevronDown")),
        h("button", { class: "btn icon sm", title: "Unlink from GitHub", onclick: unlink }, icon("close"))),
      status,
      auth ? h("div", { class: "gh-commit" }, summary, body) : null,
      h("div", { class: "gh-acts" }, btn("Pull", "download", () => pull()), auth ? pushBtn : btn("Sign in to push…", "user", signIn, "primary")),
      auth ? h("div", { class: "muted small" }, "Ctrl+Enter commits and pushes. The Commit button below only saves a snapshot in this browser.") : null,
      conflictList(p),
      auth && g.defaultBranch && g.branch !== g.defaultBranch ? h("div", { class: "gh-acts" }, g.pr ? h("a", { class: "btn sm", href: g.pr.url, target: "_blank", rel: "noopener" }, `Pull request #${g.pr.number}`) : btn(`Pull request into ${g.defaultBranch}…`, "branch", pullRequest)) : null,
      activity(g));
  }
  function conflictList(p) {
    const list = Object.keys(conflictCopies[p.id] || {});
    if (!list.length) return null;
    return h("div", { class: "gh-conflicts" }, h("div", { class: "gh-sub" }, "Changed here and on GitHub (yours kept)"),
      list.map((rel) => h("div", { class: "gh-conflict" }, h("span", {}, rel), h("button", { class: "btn sm", onclick: () => compareConflict(rel) }, "Compare…"))));
  }

  return {
    open, ask, fromUrl, signIn, signOut, pull, push, publish, unlink, panel, chooseBranch, switchBranch, createBranch, pullRequest, compareConflict, shareGist, fileUrl,
    get signedIn() { return !!auth; }, get login() { return auth?.login || null; },
    commands: [
      { id: "gh-open", label: "Open GitHub Repository…", cat: "File", run: ask },
      { id: "gh-signin", label: "GitHub: Sign In…", cat: "Source Control", run: signIn },
      { id: "gh-signout", label: "GitHub: Sign Out", cat: "Source Control", run: signOut },
      { id: "gh-pull", label: "GitHub: Pull", cat: "Source Control", run: () => pull() },
      { id: "gh-push", label: "GitHub: Commit and Push…", cat: "Source Control", run: () => push() },
      { id: "gh-publish", label: "GitHub: Publish Project to a New Repository…", cat: "Source Control", run: publish },
      { id: "gh-unlink", label: "GitHub: Unlink Project", cat: "Source Control", run: unlink },
      { id: "gh-branch", label: "GitHub: Switch or Create Branch…", cat: "Source Control", run: chooseBranch },
      { id: "gh-pr", label: "GitHub: Create Pull Request…", cat: "Source Control", run: pullRequest },
      { id: "gh-open-file", label: "GitHub: Open This File on GitHub", cat: "Source Control", run: openOnGitHub },
      { id: "gh-copy-link", label: "GitHub: Copy Link to These Lines", cat: "Source Control", run: copyLink },
      { id: "gh-gist", label: "GitHub: Share as Gist…", cat: "File", run: shareGist },
    ],
  };
}
