// Source Control: commit snapshots of a project, see what changed, compare and go back. Everything stays in
// this browser (IndexedDB), like a small local Git without branches.
import { diffStats } from "./diff.js";

const DB_NAME = "dexna-scm";
let dbPromise = null;
function db() {
  dbPromise ||= new Promise((resolve, reject) => {
    if (!("indexedDB" in self)) return reject(new Error("IndexedDB is not available"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const st = req.result.createObjectStore("commits", { keyPath: "id" });
      st.createIndex("project", "project");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
const memory = new Map(); // fallback when IndexedDB is blocked (private windows in some browsers)
async function tx(mode, fn) {
  try {
    const d = await db();
    return await new Promise((resolve, reject) => {
      const t = d.transaction("commits", mode);
      const r = fn(t.objectStore("commits"));
      t.oncomplete = () => resolve(r?.result);
      t.onerror = () => reject(t.error);
    });
  } catch (_) { return undefined; }
}
const store = {
  async list(project) {
    const r = await tx("readonly", (st) => st.index("project").getAll(project));
    return r ?? [...memory.values()].filter((c) => c.project === project);
  },
  async put(c) { memory.set(c.id, c); await tx("readwrite", (st) => st.put(c)); },
  async del(id) { memory.delete(id); await tx("readwrite", (st) => st.delete(id)); },
  async delProject(project) { for (const c of await this.list(project)) await this.del(c.id); },
};

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/**
 * @param api { h, icon, toast, confirmDialog, quickPick, showMenu, getProject, currentFiles, writeFiles, removeFiles,
 *              openFile, showDiff, ago, onChange, fileIconSvg, esc }
 */
export function createScm(root, api) {
  const { h, icon, toast } = api;
  const state = { commits: [], head: null, loadedFor: null, message: "", unchecked: new Set(), loading: null };
  const byId = (id) => state.commits.find((c) => c.id === id);

  async function load() {
    const p = api.getProject();
    if (!p) return;
    const id = p.id;
    if (state.loadedFor !== id) { state.commits = []; state.head = null; state.loadedFor = null; }
    state.loading = (async () => {
      const list = (await store.list(id)).sort((a, b) => b.time - a.time);
      if (api.getProject()?.id !== id) return;
      state.commits = list;
      p.scm ||= { head: null };
      state.head = byId(p.scm.head) || list[0] || null;
      p.scm.head = state.head?.id || null;
      state.loadedFor = id;
      state.unchecked.clear();
      render();
      api.onChange?.();
    })();
    return state.loading;
  }

  /** Changes between the last commit and the files now. */
  function changes() {
    const now = api.currentFiles(), base = state.head?.files || {};
    const out = [];
    for (const [p, t] of Object.entries(now)) {
      if (!(p in base)) out.push({ path: p, status: "A" });
      else if (base[p] !== t) out.push({ path: p, status: "M" });
    }
    for (const p of Object.keys(base)) if (!(p in now)) out.push({ path: p, status: "D" });
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }
  const baseText = (path) => state.head?.files?.[path];

  async function commit() {
    const p = api.getProject();
    const list = changes().filter((c) => !state.unchecked.has(c.path));
    if (!list.length) return toast(changes().length ? "Tick at least one change to commit." : "Nothing to commit: no files changed since the last commit.", "warn");
    const now = api.currentFiles();
    const files = { ...(state.head?.files || {}) };
    for (const c of list) { if (c.status === "D") delete files[c.path]; else files[c.path] = now[c.path]; }
    let message = state.message.trim();
    if (!message) {
      const verb = (s) => ({ A: "Add", M: "Update", D: "Delete" }[s]);
      const kinds = new Set(list.map((c) => c.status));
      message = !state.head ? "First version" : list.length === 1 ? `${verb(list[0].status)} ${list[0].path.split("/").pop()}` : `${kinds.size === 1 ? verb([...kinds][0]) : "Update"} ${list.length} files`;
    }
    let added = 0, removed = 0;
    for (const c of list) { const s = diffStats(state.head?.files?.[c.path] ?? "", c.status === "D" ? "" : now[c.path]); added += s.added; removed += s.removed; }
    const c = { id: newId(), project: p.id, parent: state.head?.id || null, message, time: Date.now(), files, stats: { files: list.length, added, removed } };
    await store.put(c);
    state.commits.unshift(c);
    state.head = c;
    p.scm = { head: c.id };
    state.message = "";
    state.unchecked.clear();
    api.persist();
    render();
    api.onChange?.();
    toast(`Committed: ${message}`, "ok");
    return c;
  }

  async function discard(paths, { ask = true } = {}) {
    const list = changes().filter((c) => paths.includes(c.path));
    if (!list.length) return;
    if (ask && !(await api.confirmDialog({ title: "Discard changes", message: list.length === 1 ? `Discard the changes to ${list[0].path}? ${list[0].status === "A" ? "The file is new, so it will be deleted." : "It goes back to the last commit."}` : `Discard the changes to ${list.length} files? They go back to the last commit; new files are deleted.`, okLabel: "Discard", danger: true }))) return;
    const write = {}, remove = [];
    for (const c of list) { if (c.status === "A") remove.push(c.path); else write[c.path] = baseText(c.path); }
    if (Object.keys(write).length) api.writeFiles(write);
    if (remove.length) api.removeFiles(remove);
    render();
    api.onChange?.();
  }

  async function restore(c) {
    if (!(await api.confirmDialog({ title: "Restore this version", message: `Make the project's files match "${c.message}" from ${new Date(c.time).toLocaleString()}? Your current changes show up in Changes until you commit, so this can be undone by discarding.`, okLabel: "Restore" }))) return;
    const now = api.currentFiles();
    const write = {};
    for (const [p, t] of Object.entries(c.files)) if (now[p] !== t) write[p] = t;
    api.writeFiles(write);
    api.removeFiles(Object.keys(now).filter((p) => !(p in c.files)));
    render();
    api.onChange?.();
    toast("Restored. Commit to keep it, or discard the changes to go back.", "ok", 5000);
  }

  async function undoCommit(c) {
    if (c !== state.head) return;
    if (!(await api.confirmDialog({ title: "Undo last commit", message: `Remove the commit "${c.message}"? Your files stay as they are; its changes show up in Changes again.`, okLabel: "Undo commit" }))) return;
    await store.del(c.id);
    state.commits = state.commits.filter((x) => x !== c);
    state.head = byId(c.parent) || null;
    api.getProject().scm = { head: state.head?.id || null };
    state.message = c.message;
    api.persist();
    render();
    api.onChange?.();
  }

  function diffWithHead(path) {
    const ch = changes().find((c) => c.path === path);
    const old = baseText(path) ?? "", now = api.currentFiles()[path];
    api.showDiff({
      original: old, modified: now ?? "", path, live: now != null, title: path,
      originalLabel: state.head ? `Last commit: ${state.head.message}` : "Empty", modifiedLabel: ch?.status === "D" ? "Deleted" : "Your changes",
    });
  }

  /** Files changed by commit c, compared with its parent. */
  function commitChanges(c) {
    const prev = byId(c.parent)?.files || {};
    const out = [];
    for (const [p, t] of Object.entries(c.files)) if (!(p in prev)) out.push({ path: p, status: "A" }); else if (prev[p] !== t) out.push({ path: p, status: "M" });
    for (const p of Object.keys(prev)) if (!(p in c.files)) out.push({ path: p, status: "D" });
    return out;
  }
  const statusName = { A: "added", M: "changed", D: "deleted" };
  function showCommit(c) {
    const prev = byId(c.parent)?.files || {};
    const list = commitChanges(c);
    if (!list.length) return toast("This commit has no file changes.");
    api.quickPick({
      placeholder: `${c.message}: pick a file to see its changes`,
      source: (q) => list.filter((x) => x.path.toLowerCase().includes(q.toLowerCase())).map((x) => ({ iconHtml: api.fileIconSvg(x.path), label: x.path, desc: statusName[x.status],
        run: () => api.showDiff({ original: prev[x.path] ?? "", modified: c.files[x.path] ?? "", path: x.path, title: `${x.path} in "${c.message}"`, originalLabel: "Before", modifiedLabel: c.message }) })),
    });
  }
  function compareWithNow(c) {
    const now = api.currentFiles();
    const paths = [...new Set([...Object.keys(c.files), ...Object.keys(now)])].filter((p) => c.files[p] !== now[p]).sort();
    if (!paths.length) return toast("Your files are the same as this version.", "ok");
    api.quickPick({
      placeholder: `Files that differ from "${c.message}"`,
      source: (q) => paths.filter((p) => p.toLowerCase().includes(q.toLowerCase())).map((p) => ({ iconHtml: api.fileIconSvg(p), label: p, desc: !(p in c.files) ? "new since" : !(p in now) ? "deleted since" : "changed",
        run: () => api.showDiff({ original: c.files[p] ?? "", modified: now[p] ?? "", path: p, live: p in now, title: p, originalLabel: c.message, modifiedLabel: "Now" }) })),
    });
  }
  /** Every commit that changed `path`. */
  function fileHistory(path) {
    const list = state.commits.filter((c) => commitChanges(c).some((x) => x.path === path));
    if (!list.length) return toast(`${path} has no commits yet.`, "info");
    api.quickPick({
      placeholder: `History of ${path}`,
      source: (q) => list.filter((c) => c.message.toLowerCase().includes(q.toLowerCase())).map((c) => ({ label: c.message, desc: api.ago(c.time),
        run: () => api.showDiff({ original: c.files[path] ?? "", modified: api.currentFiles()[path] ?? "", path, live: path in api.currentFiles(), title: path, originalLabel: `${c.message} (${api.ago(c.time)})`, modifiedLabel: "Now" }) })),
    });
  }

  /* ---------- the view ---------- */
  function render() {
    if (!root) return;
    const p = api.getProject();
    if (!p) return;
    const list = changes();
    const msg = h("textarea", { class: "scm-msg", rows: 2, placeholder: state.head ? "Message (Ctrl+Enter to commit)" : "Message for your first commit (optional)", spellcheck: "true" });
    msg.value = state.message;
    msg.addEventListener("input", () => { state.message = msg.value; });
    msg.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); commit(); } });
    const picked = list.filter((c) => !state.unchecked.has(c.path)).length;
    const commitBtn = h("button", { class: "btn primary wide scm-commit", disabled: !picked, onclick: () => commit() }, icon("check"),
      list.length && picked !== list.length ? `Commit ${picked} of ${list.length}` : "Commit");
    const row = (c) => {
      const name = c.path.split("/").pop(), dir = c.path.includes("/") ? c.path.slice(0, c.path.lastIndexOf("/")) : "";
      const s = c.status === "D" ? null : diffStats(baseText(c.path) ?? "", api.currentFiles()[c.path] ?? "");
      const box = h("input", { type: "checkbox", checked: !state.unchecked.has(c.path), title: "Include in the commit", onclick: (e) => e.stopPropagation(),
        onchange: (e) => { if (e.target.checked) state.unchecked.delete(c.path); else state.unchecked.add(c.path); render(); } });
      return h("div", { class: "scm-row", title: `${c.path} (${statusName[c.status]})`, onclick: () => diffWithHead(c.path) },
        box, h("span", { class: "fi", html: api.fileIconSvg(c.path) }), h("span", { class: "scm-name" + (c.status === "D" ? " deleted" : "") }, name),
        dir ? h("span", { class: "scm-dir" }, dir) : null,
        s && (s.added || s.removed) ? h("span", { class: "scm-stat" }, s.added ? h("span", { class: "add" }, "+" + s.added) : null, s.removed ? h("span", { class: "del" }, "−" + s.removed) : null) : null,
        h("span", { class: "scm-acts" },
          c.status !== "D" ? h("button", { class: "btn icon sm", title: "Open file", onclick: (e) => { e.stopPropagation(); api.openFile(c.path); } }, icon("file")) : null,
          h("button", { class: "btn icon sm", title: "Discard changes", onclick: (e) => { e.stopPropagation(); discard([c.path]); } }, icon("undo"))),
        h("span", { class: "scm-status s-" + c.status }, c.status));
    };
    const hist = state.commits.map((c) => h("div", { class: "scm-commit-row" + (c === state.head ? " head" : ""), title: new Date(c.time).toLocaleString(), onclick: (e) => commitMenu(c, e) },
      h("span", { class: "scm-dot" }),
      h("span", { class: "scm-cmsg" }, c.message),
      h("span", { class: "scm-cmeta" }, `${api.ago(c.time)} · ${c.stats?.files ?? "?"} file${c.stats?.files === 1 ? "" : "s"}`, c.stats ? h("span", { class: "add" }, ` +${c.stats.added}`) : null, c.stats ? h("span", { class: "del" }, ` −${c.stats.removed}`) : null)));
    root.replaceChildren(...[
      api.topPanel?.() || null,
      h("div", { class: "scm-top" }, msg, commitBtn),
      h("div", { class: "sub-title" }, `Changes`, h("span", { class: "badge" }, list.length || ""),
        h("span", { class: "sub-acts" }, list.length ? h("button", { class: "btn icon sm", title: "Discard all changes", onclick: () => discard(list.map((c) => c.path)) }, icon("undo")) : null)),
      list.length ? h("div", { class: "scm-list" }, list.map(row)) : h("div", { class: "muted small pad" }, state.head ? "No changes since the last commit." : "No files yet."),
      !state.head && list.length ? h("div", { class: "muted small pad" }, "A commit saves a snapshot of the whole project in this browser. You can compare with it, see what changed, and go back to it any time.") : null,
      h("div", { class: "sub-title" }, "History", h("span", { class: "badge" }, state.commits.length || "")),
      state.commits.length ? h("div", { class: "scm-history" }, hist) : h("div", { class: "muted small pad" }, "No commits yet."),
    ].filter(Boolean));
  }
  function commitMenu(c, e) {
    api.showMenu(e.clientX, e.clientY, [
      { label: "Show Changes in This Commit", run: () => showCommit(c) },
      { label: "Compare with Your Files Now", run: () => compareWithNow(c) },
      "-",
      { label: "Restore This Version…", run: () => restore(c) },
      { label: "Undo This Commit…", disabled: c !== state.head, run: () => undoCommit(c) },
      "-",
      { label: "Copy Message", run: () => navigator.clipboard?.writeText(c.message) },
    ]);
  }

  return {
    load, render, changes, commit, discard, baseText, diffWithHead, fileHistory, restore, undoCommit,
    get head() { return state.head; }, get commits() { return state.commits; },
    async deleteProject(id) { await store.delProject(id); },
    setMessage(m) { state.message = m; render(); },
  };
}
