// Live collaboration: code together with someone on another computer. Their cursor, selection and mouse pointer
// show up in your editor in real time, and edits from both of you merge safely (a Yjs document).
//
// There is no server. The two browsers connect directly (WebRTC) after you swap a short invite and reply, either by
// pasting a code or opening an invite link. The host's project is shared; guests get their own copy in the
// session that carries on as a normal project when it ends. Several guests can join one host.

const COLORS = ["#e5484d", "#3e63dd", "#30a46c", "#f76b15", "#8e4ec6", "#12a594", "#d6409f", "#ab6400"];
const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }] };
const LOCAL = "local";

/* ---------- invite codes: a connection description, compressed and made URL-safe (exported for tests) ---------- */
const toB64 = (u) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const stream = async (Ctor, bytes) => { const s = new Ctor("deflate-raw"), w = s.writable.getWriter(); w.write(bytes); w.close(); return new Uint8Array(await new Response(s.readable).arrayBuffer()); };
export async function packCode(obj) {
  let out = new TextEncoder().encode(JSON.stringify(obj)), tag = "p";
  if (typeof CompressionStream !== "undefined") { out = await stream(CompressionStream, out); tag = "z"; }
  return tag + toB64(out).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function unpackCode(code) {
  code = String(code).replace(/\s+/g, ""); const tag = code[0];
  let s = code.slice(1).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
  let bytes; try { bytes = fromB64(s); } catch (_) { throw new Error("That does not look like a Dexna code"); }
  if (tag === "z") { if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot read that code"); bytes = await stream(DecompressionStream, bytes); }
  else if (tag !== "p") throw new Error("That does not look like a Dexna code");
  try { const o = JSON.parse(new TextDecoder().decode(bytes)); if (!o?.sdp || !o?.type) throw 0; return o; } catch (_) { throw new Error("That code is damaged or incomplete. Copy it again, all of it."); }
}
const waitIce = (pc, ms = 4000) => new Promise((ok) => {
  if (pc.iceGatheringState === "complete") return ok();
  const done = () => { pc.removeEventListener("icegatheringstatechange", chk); clearTimeout(t); ok(); };
  const chk = () => pc.iceGatheringState === "complete" && done();
  const t = setTimeout(done, ms); pc.addEventListener("icegatheringstatechange", chk);
});

export function createCollab(A) {
  const { h, toast, LS } = A;
  let Y = null, session = null, chunkSeq = 0;
  const monaco = () => A.monaco, ed = () => A.editor;
  const esc = (s) => String(s).replace(/[\\"\n]/g, " ");

  /* ---------- sending and receiving (big messages are split up) ---------- */
  function send(peer, msg) {
    if (peer.ch?.readyState !== "open") return;
    const s = JSON.stringify(msg);
    if (s.length <= 60000) return peer.ch.send(s);
    const id = ++chunkSeq, n = Math.ceil(s.length / 50000);
    for (let i = 0; i < n; i++) peer.ch.send(JSON.stringify({ t: "chunk", id, i, n, d: s.slice(i * 50000, (i + 1) * 50000) }));
  }
  const active = () => [...session.peers.values()].filter((p) => p.active);
  const broadcast = (msg, except) => { for (const p of active()) if (p !== except) send(p, msg); };
  const toHost = (msg) => { for (const p of session.peers.values()) send(p, msg); };
  const emit = (msg) => (session.role === "host" ? broadcast(msg) : toHost(msg));

  function hookChannel(peer) {
    const ch = peer.ch;
    ch.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (_) { return; }
      if (m.t === "chunk") {
        const b = (peer.chunks ||= new Map()).get(m.id) || { parts: [], got: 0 };
        b.parts[m.i] = m.d; b.got++; peer.chunks.set(m.id, b);
        if (b.got === m.n) { peer.chunks.delete(m.id); try { handle(peer, JSON.parse(b.parts.join(""))); } catch (_) {} }
        return;
      }
      handle(peer, m);
    };
    ch.onopen = () => { if (peer.open) return; peer.open = true; if (session.role === "guest") send(peer, { t: "hello", name: session.me.name }); ui(); };
    ch.onclose = () => peerGone(peer);
    peer.pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(peer.pc.connectionState)) peerGone(peer); ui(); };
  }
  function peerGone(peer) {
    if (peer.gone) return; peer.gone = true;
    if (!session) return;
    if (session.role === "host") {
      session.peers.delete(peer.id); delete session.remote[peer.id]; dropPointer(peer.id);
      if (peer.active) { broadcast({ t: "leave", id: peer.id }); toast(`${peer.name || "A guest"} left the session`, "info"); }
      renderRemote(); ui();
    } else { toast("The host ended the session. The project stays here as your own copy.", "info", 6000); endSession(); }
  }

  /* ---------- messages ---------- */
  function handle(peer, m) {
    if (!session) return;
    if (session.role === "host") {
      if (m.t === "hello") {
        if (peer.active) return;
        peer.name = String(m.name || "Guest").slice(0, 24); peer.color = COLORS[(session.nextColor++ % (COLORS.length - 1)) + 1];
        send(peer, { t: "welcome", id: peer.id, color: peer.color, edit: peer.edit, state: toB64(Y.encodeStateAsUpdate(session.doc)), project: A.project.name, entry: A.project.entry, host: session.me.name, hostColor: session.me.color, roster: roster() });
        peer.active = true;
        broadcast({ t: "join", id: peer.id, name: peer.name, color: peer.color }, peer);
        toast(`${peer.name} joined the session`, "ok"); ui(); pushPresence(true);
      } else if (m.t === "y" && peer.edit && peer.active) Y.applyUpdate(session.doc, fromB64(m.u), { peer: peer.id });
      else if (m.t === "pres" || m.t === "mouse") { m.id = peer.id; remote(m); broadcast(m, peer); }
    } else {
      if (m.t === "welcome") return session.joining ? onWelcome(peer, m) : undefined;
      if (m.t === "y") Y.applyUpdate(session.doc, fromB64(m.u), { peer: "host" });
      else if (m.t === "pres" || m.t === "mouse") remote(m);
      else if (m.t === "join") { session.people[m.id] = { name: m.name, color: m.color }; toast(`${m.name} joined the session`, "info"); ui(); }
      else if (m.t === "leave") { delete session.people[m.id]; delete session.remote[m.id]; dropPointer(m.id); renderRemote(); ui(); }
    }
  }
  const roster = () => [{ id: "host", name: session.me.name, color: session.me.color }, ...active().map((p) => ({ id: p.id, name: p.name, color: p.color }))];

  /* ---------- the shared document: every text file of the project ---------- */
  function bindDoc() {
    const { doc } = session, files = doc.getMap("files");
    session.files = files;
    doc.on("update", (u, origin) => {
      if (origin === LOCAL) emit({ t: "y", u: toB64(u) });
      else if (session.role === "host" && origin?.peer) broadcast({ t: "y", u: toB64(u) }, session.peers.get(origin.peer));
    });
    files.observeDeep((events, tr) => {
      if (tr.origin === LOCAL) return;
      session.applying = true;
      try {
        for (const ev of events) {
          if (ev.target === files) {
            for (const [key, c] of ev.changes.keys) {
              if (c.action === "delete") { if (A.currentFiles()[key] != null) A.removeFiles([key]); }
              else { const t = files.get(key)?.toString() ?? ""; if (A.currentFiles()[key] == null) A.writeFiles({ [key]: t }); else applyWhole(key, t); }
            }
          } else if (ev.target instanceof Y.Text) applyDelta(ev.path[0], ev);
        }
      } finally { session.applying = false; }
      renderRemote();
    });
  }
  /** A remote change to one file, as edits to its editor model (all positions are in the text before the change). */
  function applyDelta(path, ev) {
    const model = A.models.get(path);
    if (!model) { A.writeFiles({ [path]: session.files.get(path).toString() }); return; }
    const edits = []; let pos = 0;
    for (const op of ev.delta) {
      if (op.retain != null) pos += op.retain;
      else if (op.insert != null) { const p = model.getPositionAt(pos); edits.push({ range: new (monaco().Range)(p.lineNumber, p.column, p.lineNumber, p.column), text: op.insert, forceMoveMarkers: true }); }
      else if (op.delete != null) { const a = model.getPositionAt(pos), b = model.getPositionAt(pos + op.delete); edits.push({ range: new (monaco().Range)(a.lineNumber, a.column, b.lineNumber, b.column), text: "" }); pos += op.delete; }
    }
    if (edits.length) model.applyEdits(edits);
  }
  function applyWhole(path, text) {
    const model = A.models.get(path);
    if (!model) return A.writeFiles({ [path]: text });
    if (model.getValue() !== text) model.applyEdits([{ range: model.getFullModelRange(), text }]);
  }
  /** Called for every change made in an editor model of the project. */
  function onLocalChange(path, ev) {
    if (!session?.files || session.applying || session.joining || session.projectId !== A.project?.id || session.readOnly) return;
    const yt = session.files.get(path);
    if (!yt) return;
    session.doc.transact(() => {
      if (ev.isFlush) { yt.delete(0, yt.length); yt.insert(0, A.models.get(path).getValue()); return; }
      for (const c of [...ev.changes].sort((a, b) => b.rangeOffset - a.rangeOffset)) { if (c.rangeLength) yt.delete(c.rangeOffset, c.rangeLength); if (c.text) yt.insert(c.rangeOffset, c.text); }
    }, LOCAL);
  }
  /** Files created, deleted or renamed here are created, deleted or renamed for everyone. */
  let syncTimer = null;
  function onFilesChanged() {
    if (!session?.files || session.joining || session.readOnly) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (!session?.files || session.applying || session.projectId !== A.project?.id) return;
      const mine = A.currentFiles();
      session.doc.transact(() => {
        for (const [p, text] of Object.entries(mine)) if (!session.files.has(p)) { const t = new Y.Text(); t.insert(0, text); session.files.set(p, t); }
        for (const p of [...session.files.keys()]) if (mine[p] == null) session.files.delete(p);
      }, LOCAL);
    }, 60);
  }
  function onProjectLoaded(id) {
    if (session && !session.joining && id !== session.projectId) { toast("You opened another project, so the live session ended", "info"); leave(); }
  }

  /* ---------- who is where: cursors, selections and the mouse ---------- */
  function me() { return session.me; }
  let presTimer = null;
  function pushPresence(now = false) {
    if (!session || session.joining) return;
    clearTimeout(presTimer);
    presTimer = setTimeout(() => {
      const e = ed(), m = e?.getModel(), path = A.currentPath();
      if (!m || !path || !session) return;
      const s = e.getSelection();
      emit({ t: "pres", id: session.role === "host" ? "host" : session.myId, path, sel: [m.getOffsetAt(s.getStartPosition()), m.getOffsetAt(s.getEndPosition()), s.getDirection() === 0 ? 0 : 1] });
    }, now ? 0 : 50);
  }
  let lastMouse = 0, mouseTimer = null;
  function onMouseMove(e) {
    if (!session || session.joining || !session.shareMouse) return;
    const t = performance.now();
    clearTimeout(mouseTimer);
    if (t - lastMouse < 35) { mouseTimer = setTimeout(() => onMouseMove(e), 40); return; } // the last position always goes out
    lastMouse = t;
    const ce = ed(), dom = ce?.getContainerDomNode?.();
    let over = null;
    if (dom) {
      const r = dom.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { const tg = ce.getTargetAtClientPoint(e.clientX, e.clientY); if (tg?.position) over = { path: A.currentPath(), line: tg.position.lineNumber, col: tg.position.column }; }
    }
    emit({ t: "mouse", id: session.role === "host" ? "host" : session.myId, fx: e.clientX / innerWidth, fy: e.clientY / innerHeight, over });
  }
  const onMouseLeave = () => session?.shareMouse && !session.joining && emit({ t: "mouse", id: session.role === "host" ? "host" : session.myId, gone: true });
  function who(id) { return id === "host" ? (session.role === "host" ? session.me : session.host) : session.role === "host" ? session.peers.get(id) : session.people[id]; }
  function remote(m) {
    const p = who(m.id); if (!p) return;
    const fresh = !session.remote[m.id], r = (session.remote[m.id] ||= {});
    if (fresh) stylesheet();
    if (m.t === "pres") { Object.assign(r, { path: m.path, sel: m.sel, at: Date.now() }); if (session.following === m.id) follow(m); renderRemote(); }
    else { r.mouse = m.gone ? null : { fx: m.fx, fy: m.fy, over: m.over }; placePointer(m.id); }
  }
  function follow(m) {
    if (m.path !== A.currentPath() && A.currentFiles()[m.path] != null) A.openFile(m.path, { focus: false });
    const model = ed()?.getModel(); if (model && m.sel) ed().revealPositionInCenterIfOutsideViewport(model.getPositionAt(m.sel[1]));
  }
  let collection = null;
  function renderRemote() {
    const e = ed(), model = e?.getModel(); if (!session || !model) return;
    const path = A.currentPath(), decos = [], M = monaco();
    for (const [id, r] of Object.entries(session.remote)) {
      const p = who(id); if (!p || r.path !== path || !r.sel) continue;
      const len = model.getValueLength(), a = model.getPositionAt(Math.min(len, r.sel[0])), b = model.getPositionAt(Math.min(len, r.sel[1])), head = r.sel[2] ? a : b;
      const ci = COLORS.indexOf(p.color); const cls = `collab-c${ci < 0 ? 0 : ci} collab-id-${id}${Date.now() - (r.at || 0) > 2500 ? " collab-idle" : ""}`;
      if (r.sel[0] !== r.sel[1]) decos.push({ range: new M.Range(a.lineNumber, a.column, b.lineNumber, b.column), options: { className: `collab-sel ${cls}`, stickiness: 1 } });
      decos.push({ range: new M.Range(head.lineNumber, head.column, head.lineNumber, head.column), options: { afterContentClassName: `collab-cur ${cls}`, stickiness: 1, zIndex: 20 } });
    }
    (collection ||= e.createDecorationsCollection()).set(decos);
    clearTimeout(idleTimer); idleTimer = setTimeout(renderRemote, 2600); // name tags fade once someone stops moving
  }
  let idleTimer = null;
  function stylesheet() {
    let s = document.getElementById("collab-style"); if (!s) { s = h("style", { id: "collab-style" }); document.head.append(s); }
    const ppl = session ? Object.entries(session.remote).map(([id]) => [id, who(id)]).filter(([, p]) => p) : [];
    s.textContent = ppl.map(([id, p]) => `.collab-cur.collab-id-${id}::after{content:"${esc(p.name)}"}`).join("\n");
  }
  /* mouse pointers are drawn over the whole window */
  function layer() { let l = document.getElementById("collab-layer"); if (!l) { l = h("div", { id: "collab-layer" }); document.body.append(l); } return l; }
  function dropPointer(id) { layer().querySelector(`[data-id="${id}"]`)?.remove(); }
  function placePointer(id) {
    const p = who(id), r = session?.remote[id]; if (!p) return;
    let el = layer().querySelector(`[data-id="${id}"]`);
    if (!r?.mouse) { el?.remove(); return; }
    if (!el) {
      el = h("div", { class: `collab-pointer collab-c${Math.max(0, COLORS.indexOf(p.color))}`, "data-id": id });
      el.innerHTML = `<svg viewBox="0 0 16 20" width="16" height="20"><path d="M1 1l12 8.5-5.3 1 3.3 6.8-2.6 1.2-3.2-6.9L1 16z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
      el.append(h("span", { class: "collab-name" }, p.name)); layer().append(el);
    }
    let x = r.mouse.fx * innerWidth, y = r.mouse.fy * innerHeight;
    const o = r.mouse.over, e = ed();
    if (o && o.path === A.currentPath() && e?.getModel()) {
      const v = e.getScrolledVisiblePosition({ lineNumber: Math.min(o.line, e.getModel().getLineCount()), column: o.col }), box = e.getContainerDomNode().getBoundingClientRect();
      if (v) { x = box.left + v.left; y = box.top + v.top + v.height / 2; }
    }
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  /* ---------- starting, joining, ending ---------- */
  const people = () => (session.role === "host" ? [session.me, ...active()] : [session.host, ...Object.values(session.people), session.me].filter(Boolean));
  async function loadYjs() { Y ||= await import("./vendor/yjs.js"); }
  const newPc = () => new RTCPeerConnection(ICE);

  async function startHost(name) {
    await loadYjs();
    session = { role: "host", me: { id: "host", name, color: COLORS[0] }, peers: new Map(), remote: {}, nextColor: 0, doc: new Y.Doc(), projectId: A.project.id, shareMouse: true, following: null, applying: false, people: {} };
    const files = session.doc.getMap("files");
    session.doc.transact(() => { for (const [p, text] of Object.entries(A.currentFiles())) { const t = new Y.Text(); t.insert(0, text); files.set(p, t); } }, LOCAL);
    bindDoc(); attachEditor(); ui();
  }
  /** A new invite for the host: returns { code, accept(replyCode) }. */
  async function createInvite(edit) {
    const pc = newPc(), peer = { id: "g" + (session.nextId = (session.nextId || 0) + 1), pc, edit, active: false, open: false };
    peer.ch = pc.createDataChannel("dexna"); hookChannel(peer);
    session.peers.set(peer.id, peer);
    await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc);
    const code = await packCode({ type: pc.localDescription.type, sdp: pc.localDescription.sdp, host: session.me.name });
    return { peer, code, accept: async (reply) => { const d = await unpackCode(reply); if (d.type !== "answer") throw new Error("That is an invite, not a reply. Paste the reply the other person sent you."); await pc.setRemoteDescription({ type: d.type, sdp: d.sdp }); } };
  }
  /** A guest: from an invite code to a reply code. */
  async function joinWith(code, name) {
    const offer = await unpackCode(code);
    if (offer.type !== "offer") throw new Error("That is a reply, not an invite. Paste the invite the host sent you.");
    await loadYjs();
    const pc = newPc(), peer = { id: "host", pc, active: true };
    session = { role: "guest", me: { id: null, name, color: COLORS[1] }, peers: new Map([["host", peer]]), remote: {}, people: {}, doc: new Y.Doc(), shareMouse: true, following: null, joining: true, host: { name: offer.host || "Host", color: COLORS[0] } };
    pc.ondatachannel = (e) => { peer.ch = e.channel; hookChannel(peer); if (peer.ch.readyState === "open") peer.ch.onopen(); };
    await pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
    await pc.setLocalDescription(await pc.createAnswer()); await waitIce(pc);
    return packCode({ type: pc.localDescription.type, sdp: pc.localDescription.sdp });
  }
  function onWelcome(peer, m) {
    Y.applyUpdate(session.doc, fromB64(m.state), { peer: "host" });
    const files = session.doc.getMap("files"), copy = {};
    for (const [k, t] of files.entries()) copy[k] = t.toString();
    Object.assign(session, { myId: m.id, host: { name: m.host, color: m.hostColor }, readOnly: !m.edit });
    session.me.id = m.id; session.me.color = m.color;
    for (const r of m.roster) if (r.id !== "host" && r.id !== m.id) session.people[r.id] = { name: r.name, color: r.color };
    const p = A.createProject({ name: m.project, files: copy, entry: m.entry && copy[m.entry] != null ? m.entry : undefined }, `${m.host}'s session`);
    session.projectId = p.id; session.joining = false;
    bindDoc(); attachEditor(); ui();
    toast(`Joined ${m.host}'s session${m.edit ? "" : " (view only)"}`, "ok");
    pushPresence(true);
    A.closeModal?.();
  }
  let listeners = [];
  function attachEditor() {
    const e = ed(); if (!e) return;
    listeners = [e.onDidChangeCursorSelection(() => pushPresence()), e.onDidChangeModel(() => { renderRemote(); pushPresence(true); applyReadOnly(); for (const id of Object.keys(session?.remote || {})) placePointer(id); }), e.onDidScrollChange(() => { for (const id of Object.keys(session?.remote || {})) placePointer(id); })];
    document.addEventListener("mousemove", onMouseMove, true); document.addEventListener("mouseleave", onMouseLeave);
    applyReadOnly(); pushPresence(true);
  }
  function applyReadOnly() { if (session?.readOnly) ed()?.updateOptions({ readOnly: true }); }
  function leave() {
    if (!session) return;
    for (const p of session.peers.values()) { p.gone = true; try { p.ch?.close(); p.pc.close(); } catch (_) {} }
    endSession();
  }
  function endSession() {
    if (!session) return;
    for (const l of listeners) l.dispose(); listeners = [];
    document.removeEventListener("mousemove", onMouseMove, true); document.removeEventListener("mouseleave", onMouseLeave);
    clearTimeout(idleTimer); clearTimeout(mouseTimer); collection?.clear(); collection = null; document.getElementById("collab-layer")?.remove(); document.getElementById("collab-style")?.remove();
    if (session.readOnly) ed()?.updateOptions({ readOnly: false });
    for (const p of session.peers.values()) { p.gone = true; try { p.pc.close(); } catch (_) {} }
    try { session.doc.destroy(); } catch (_) {}
    session = null; ui();
  }

  /* ---------- the interface ---------- */
  const sb = () => document.getElementById("sb-collab");
  function ui() {
    const s = sb(); if (!s) return;
    if (!session || session.joining) { s.classList.add("hidden"); return; }
    s.classList.remove("hidden");
    const n = people().length;
    s.textContent = `Live: ${n} ${n === 1 ? "person" : "people"}${session.readOnly ? " (view only)" : ""}`;
    stylesheet(); refreshPanel?.();
  }
  let refreshPanel = null;
  const copyText = async (text, btn) => { try { await navigator.clipboard.writeText(text); } catch (_) { const t = Object.assign(h("textarea"), { value: text }); document.body.append(t); t.select(); document.execCommand("copy"); t.remove(); } const o = btn.textContent; btn.textContent = "Copied"; setTimeout(() => (btn.textContent = o), 1300); };
  const nameInput = () => h("input", { class: "co-name", value: LS.get("collabName", "") || "", placeholder: "Your name (others see it by your cursor)", spellcheck: "false", maxlength: 24 });
  const nameOf = (inp) => { const n = inp.value.trim() || "Guest"; LS.set("collabName", n); return n; };

  function showHost() {
    if (session?.role === "guest") return toast("You are in someone else's session. Leave it first.", "info");
    if (!A.project) return;
    const name = nameInput(), edit = h("input", { type: "checkbox", checked: true }), status = h("div", { class: "co-status muted small" });
    const out = h("div", { class: "co-out" }), go = h("button", { class: "btn primary" }, "Create invite");
    go.onclick = async () => {
      go.disabled = true; status.textContent = "Preparing a connection…";
      try {
        if (!session) await startHost(nameOf(name));
        const inv = await createInvite(edit.checked), link = `${location.origin}${location.pathname}#collab=${inv.code}`;
        const reply = h("textarea", { class: "co-code", placeholder: "Paste their reply here", spellcheck: "false", rows: 3 }), conn = h("button", { class: "btn primary" }, "Connect");
        const msg = h("div", { class: "co-status small" });
        conn.onclick = async () => { try { msg.textContent = "Connecting…"; await inv.accept(reply.value); } catch (e) { msg.textContent = e.message; msg.classList.add("bad"); } };
        const watch = setInterval(() => { if (!document.body.contains(msg)) return clearInterval(watch); if (inv.peer.active) { msg.classList.remove("bad"); msg.textContent = `${inv.peer.name} is connected. You can close this.`; clearInterval(watch); } else if (inv.peer.pc.connectionState === "failed") { msg.textContent = "The connection failed. Some networks block direct connections. Try another network, or a phone hotspot."; msg.classList.add("bad"); clearInterval(watch); } }, 400);
        out.replaceChildren(
          h("div", { class: "co-step" }, h("b", {}, "1."), " Send this link to the person you want to code with"),
          h("div", { class: "co-row" }, h("input", { class: "co-link", readonly: true, value: link, onfocus: (e) => e.target.select() }), h("button", { class: "btn", onclick: (e) => copyText(link, e.currentTarget) }, "Copy link")),
          h("div", { class: "co-step" }, h("b", {}, "2."), " They open it and send you back a reply. Paste it here:"),
          reply, h("div", { class: "co-row" }, conn, msg));
        status.textContent = "";
      } catch (e) { status.textContent = "Could not start: " + e.message; go.disabled = false; }
    };
    A.openModal(h("div", { class: "modal co-modal" }, h("div", { class: "modal-head" }, session ? "Invite someone" : "Code together"),
      h("div", { class: "modal-body" },
        h("p", { class: "muted small" }, "They see your project, and you see each other's cursors, selections and mouse in real time. Nothing goes through a server: your browsers connect directly."),
        session ? null : name, h("label", { class: "co-check small" }, edit, " They can edit (untick for view only)"), h("div", { class: "co-row" }, go), status, out),
      h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => A.closeModal() }, "Close"))));
    if (!session) name.focus();
  }
  function showJoin(prefill = "") {
    if (session) return toast("You are already in a session. Leave it first.", "info");
    const name = nameInput(), code = h("textarea", { class: "co-code", placeholder: "Paste the invite link or code here", spellcheck: "false", rows: 3 }), status = h("div", { class: "co-status small" }), out = h("div", { class: "co-out" });
    code.value = prefill; const go = h("button", { class: "btn primary" }, "Continue");
    go.onclick = async () => {
      go.disabled = true; status.classList.remove("bad"); status.textContent = "Preparing a connection…";
      try {
        const raw = code.value.trim(), c = raw.includes("#collab=") ? raw.split("#collab=")[1] : raw;
        const reply = await joinWith(c, nameOf(name));
        status.textContent = "Waiting for the host to paste your reply…";
        out.replaceChildren(h("div", { class: "co-step" }, h("b", {}, "Send this reply back to the host:")), Object.assign(h("textarea", { class: "co-code", readonly: true, rows: 3, onfocus: (e) => e.target.select() }), { value: reply }), h("div", { class: "co-row" }, h("button", { class: "btn", onclick: (e) => copyText(reply, e.currentTarget) }, "Copy reply")));
        const watch = setInterval(() => { if (!session || !document.body.contains(status)) return clearInterval(watch); const pc = session.peers.get("host")?.pc; if (pc?.connectionState === "failed") { status.textContent = "The connection failed. Some networks block direct connections. Try another network, or a phone hotspot."; status.classList.add("bad"); clearInterval(watch); } }, 500);
      } catch (e) { status.textContent = e.message; status.classList.add("bad"); go.disabled = false; if (session?.joining) { leave(); } }
    };
    A.openModal(h("div", { class: "modal co-modal" }, h("div", { class: "modal-head" }, "Join a live session"),
      h("div", { class: "modal-body" }, h("p", { class: "muted small" }, "Paste the invite the host sent you. You get your own copy of their project that stays in sync while the session lasts."), name, code, h("div", { class: "co-row" }, go), status, out),
      h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => { if (session?.joining) leave(); A.closeModal(); } }, "Cancel"))));
  }
  function showPanel() {
    if (!session) return showHost();
    const list = h("div", { class: "co-people" });
    refreshPanel = () => {
      list.replaceChildren(...people().map((p) => { const id = p === session.me ? null : p === session.host ? "host" : (Object.entries(session.role === "host" ? Object.fromEntries([...session.peers]) : session.people).find(([, v]) => v === p) || [])[0]; return h("div", { class: "co-person" }, h("i", { style: { background: p.color } }), h("span", {}, p.name + (p === session.me ? " (you)" : "")), id && A.currentFiles ? h("button", { class: "btn sm" + (session.following === id ? " primary" : ""), onclick: () => { session.following = session.following === id ? null : id; const r = session.remote[id]; if (session.following && r?.path) follow(r); refreshPanel(); } }, session.following === id ? "Following" : "Follow") : null); }));
    };
    refreshPanel();
    const mouse = h("input", { type: "checkbox", checked: session.shareMouse, onchange: (e) => { session.shareMouse = e.target.checked; if (!session.shareMouse) onMouseLeave(); } });
    A.openModal(h("div", { class: "modal co-modal" }, h("div", { class: "modal-head" }, session.role === "host" ? "Your live session" : `${session.host.name}'s live session`),
      h("div", { class: "modal-body" }, list, h("label", { class: "co-check small" }, mouse, " Show my mouse to the others"), h("p", { class: "muted small" }, "Follow someone to have your editor go where they go. Files you create, rename or delete are shared too. Images and other binary files are not.")),
      h("div", { class: "modal-foot" }, session.role === "host" ? h("button", { class: "btn", onclick: () => { A.closeModal(); showHost(); } }, "Invite someone else") : null, h("button", { class: "btn danger", onclick: () => { A.closeModal(); leave(); toast(session ? "" : "You left the session", "info"); } }, session?.role === "host" ? "End session" : "Leave"), h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))),
    () => { refreshPanel = null; });
  }

  function onEditorReady() {
    sb()?.addEventListener("click", showPanel);
    if (location.hash.startsWith("#collab=")) { const c = location.hash.slice(8); history.replaceState(null, "", location.pathname + location.search); setTimeout(() => showJoin(c), 600); }
  }
  const commands = [
    { id: "collab-start", label: "Collaborate: Invite Someone to Code Together…", cat: "Collaborate", run: showHost },
    { id: "collab-join", label: "Collaborate: Join a Session…", cat: "Collaborate", run: () => showJoin() },
    { id: "collab-show", label: "Collaborate: Show the Session", cat: "Collaborate", run: showPanel, when: () => !!session },
    { id: "collab-leave", label: "Collaborate: Leave or End the Session", cat: "Collaborate", run: () => { leave(); toast("Session ended", "info"); }, when: () => !!session },
  ];
  return { commands, onEditorReady, onLocalChange, onFilesChanged, onProjectLoaded, get active() { return !!session; } };
}
