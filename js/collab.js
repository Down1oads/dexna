// Live: private lobbies to code together. The host opens a lobby and gets a short code (K7M-2QX) and a link;
// up to ten people join with either. Everyone sees each other's cursors, selections and mouse pointers live,
// edits merge safely (a Yjs document), and the whole project is shared: files, folders, images, breakpoints,
// bookmarks, packages, run settings, the GitHub link and its commit state. Saving saves for everyone, runs can be
// watched live, and there is a chat.
//
// Browsers connect directly (WebRTC). A small public relay (a PeerJS server) only introduces them; nothing of the
// project goes through it. The relay can be changed in Settings.

const COLORS = ["#e5484d", "#3e63dd", "#30a46c", "#f76b15", "#8e4ec6", "#12a594", "#d6409f", "#ab6400", "#0090ff", "#7c66dc"];
const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }] };
const ALPH = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_PEOPLE = 10;
const MAX_ASSET = 3 * 1024 * 1024;
const LOCAL = "local";
/** Project settings everyone in a lobby shares (the rest, like open tabs, stays per person). */
const SHARED_KEYS = ["dirs", "entry", "pinEntry", "breakpoints", "bpConds", "bookmarks", "packages", "npm", "stdin", "runConfig", "github", "locked", "watches", "luaLibs", "notes"];

const rand = (n, a = ALPH) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => a[x % a.length]).join("");
/** "k7m-2qx", "K7M2QX" or a link with #live=K7M2QX, to "K7M2QX" (or null). Exported for tests. */
export function normCode(s) {
  let t = String(s || "").trim();
  const m = /#live=([A-Za-z0-9-]+)/.exec(t); if (m) t = m[1];
  t = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return t.length === 6 && [...t].every((c) => ALPH.includes(c)) ? t : null;
}
export const showCode = (c) => `${c.slice(0, 3)}-${c.slice(3)}`;
const toB64 = (u) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");

/* ---------- the relay: a PeerJS server, used only to pass connection offers between browsers ---------- */
class Relay {
  constructor(url, id, token) { this.url = url; this.id = id; this.token = token; this.handlers = {}; }
  on(type, fn) { this.handlers[type] = fn; return this; }
  open(timeout = 9000) {
    return new Promise((ok, fail) => {
      const u = this.url + (this.url.includes("?") ? "&" : "?key=peerjs&") + `id=${encodeURIComponent(this.id)}&token=${this.token}`;
      let done = false; const finish = (f, v) => { if (!done) { done = true; clearTimeout(t); f(v); } };
      const t = setTimeout(() => { finish(fail, new Error("The lobby server did not answer")); try { this.ws.close(); } catch (_) {} }, timeout);
      try { this.ws = new WebSocket(u); } catch (e) { return finish(fail, new Error("Could not reach the lobby server")); }
      this.ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch (_) { return; }
        if (m.type === "OPEN") { this.beat = setInterval(() => this.raw({ type: "HEARTBEAT" }), 5000); return finish(ok); }
        if (m.type === "ID-TAKEN") return finish(fail, Object.assign(new Error("taken"), { taken: true }));
        if (m.type === "ERROR") return finish(fail, new Error(m.payload?.msg || "The lobby server refused the connection"));
        this.handlers[m.type]?.(m.src, m.payload || {});
      };
      this.ws.onerror = () => finish(fail, new Error("Could not reach the lobby server"));
      this.ws.onclose = () => { clearInterval(this.beat); if (done) this.handlers.CLOSED?.(); finish(fail, new Error("The lobby server closed the connection")); };
    });
  }
  raw(m) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }
  send(type, dst, payload) { this.raw({ type, dst, payload }); }
  close() { clearInterval(this.beat); this.closed = true; try { this.ws.onclose = null; this.ws.close(); } catch (_) {} }
}

export function createCollab(A) {
  const { h, toast, LS } = A;
  let Y = null, S = null, seq = 0;
  const M = () => A.monaco, ed = () => A.editor;
  const relayUrl = () => (A.settings.collabRelay || A.cfg.collabRelay || "wss://0.peerjs.com/peerjs?key=peerjs").trim();
  const esc = (s) => String(s).replace(/[\\"\n]/g, " ");
  const isHost = () => S?.role === "host";

  /* =================== sending =================== */
  function sendJson(peer, msg, fast = false) {
    const ch = fast && peer.fast?.readyState === "open" ? peer.fast : peer.ch;
    if (ch?.readyState !== "open") return;
    const s = JSON.stringify(msg);
    if (s.length <= 60000) return ch.send(s);
    const id = ++seq, n = Math.ceil(s.length / 50000);
    for (let i = 0; i < n; i++) peer.ch.send(JSON.stringify({ t: "chunk", id, i, n, d: s.slice(i * 50000, (i + 1) * 50000) }));
  }
  /** Document updates go as binary, in order, waiting when the connection's buffer is full. */
  function sendUpdate(peer, u) {
    peer.chain = (peer.chain || Promise.resolve()).then(async () => {
      const ch = peer.ch; if (ch?.readyState !== "open") return;
      const wait = async () => { while (ch.readyState === "open" && ch.bufferedAmount > 4e6) await new Promise((r) => { ch.onbufferedamountlow = r; setTimeout(r, 200); }); };
      if (u.length <= 60000) { const b = new Uint8Array(u.length + 1); b[0] = 1; b.set(u, 1); await wait(); ch.send(b); return; }
      const id = ++seq, n = Math.ceil(u.length / 60000);
      for (let i = 0; i < n; i++) {
        const part = u.subarray(i * 60000, (i + 1) * 60000), b = new Uint8Array(part.length + 9), dv = new DataView(b.buffer);
        b[0] = 2; dv.setUint32(1, id); dv.setUint16(5, i); dv.setUint16(7, n); b.set(part, 9);
        await wait(); if (ch.readyState !== "open") return; ch.send(b);
      }
    }).catch(() => {});
  }
  const active = () => (S ? [...S.peers.values()].filter((p) => p.active) : []);
  const broadcast = (msg, except, fast) => { for (const p of active()) if (p !== except) sendJson(p, msg, fast); };
  const emit = (msg, fast = false) => { if (!S) return; if (isHost()) broadcast(msg, null, fast); else if (S.hostPeer) sendJson(S.hostPeer, msg, fast); };

  function hookChannel(peer, ch) {
    ch.binaryType = "arraybuffer";
    if (ch.label === "fast") { peer.fast = ch; ch.onmessage = (e) => { try { handle(peer, JSON.parse(e.data)); } catch (_) {} }; return; }
    peer.ch = ch;
    ch.bufferedAmountLowThreshold = 1e6;
    ch.onmessage = (e) => {
      if (typeof e.data !== "string") return onBinary(peer, new Uint8Array(e.data));
      let m; try { m = JSON.parse(e.data); } catch (_) { return; }
      if (m.t === "chunk") {
        const b = (peer.chunks ||= new Map()).get(m.id) || { parts: [], got: 0 };
        b.parts[m.i] = m.d; b.got++; peer.chunks.set(m.id, b);
        if (b.got === m.n) { peer.chunks.delete(m.id); try { handle(peer, JSON.parse(b.parts.join(""))); } catch (_) {} }
        return;
      }
      handle(peer, m);
    };
    const opened = () => { if (peer.open) return; peer.open = true; if (!isHost()) { S.hostPeer = peer; sendJson(peer, { t: "hello", name: S.me.name, docId: S.docId || null }); } };
    ch.onopen = opened; if (ch.readyState === "open") opened();
    ch.onclose = () => peerGone(peer);
  }
  function onBinary(peer, b) {
    if (b[0] === 1) return gotUpdate(peer, b.subarray(1));
    if (b[0] !== 2) return;
    const dv = new DataView(b.buffer, b.byteOffset), id = dv.getUint32(1), i = dv.getUint16(5), n = dv.getUint16(7);
    const c = (peer.bins ||= new Map()).get(id) || { parts: [], got: 0, size: 0 };
    c.parts[i] = b.slice(9); c.got++; c.size += b.length - 9; peer.bins.set(id, c);
    if (c.got === n) { peer.bins.delete(id); const all = new Uint8Array(c.size); let o = 0; for (const p of c.parts) { all.set(p, o); o += p.length; } gotUpdate(peer, all); }
  }

  /* =================== the host: a lobby =================== */
  async function loadYjs() { Y ||= await import("./vendor/yjs.js"); }
  async function openLobby({ name, edit, ask }) {
    if (!A.project) return;
    await loadYjs();
    const key = "collabLobby:" + A.project.id;
    let saved = LS.get(key, null), relay, code;
    for (let tries = 0; ; tries++) {
      code = saved?.code || rand(6);
      const token = saved?.token || rand(16, "abcdefghijklmnopqrstuvwxyz0123456789");
      relay = new Relay(relayUrl(), "dexnalobby" + code, token);
      try { await relay.open(); LS.set(key, { code, token }); break; }
      catch (e) { if (e.taken && tries < 4) { saved = null; continue; } throw e; }
    }
    S = { role: "host", code, relay, me: { id: "host", name, color: COLORS[0] }, peers: new Map(), remote: {}, people: {}, pending: [], cands: new Map(),
      defaultEdit: edit, ask, locked: false, chat: [], term: [], unread: 0, shareMouse: true, shareRun: true, following: null, applying: false, projectId: A.project.id, docId: rand(12), nextColor: 1 };
    S.doc = new Y.Doc();
    S.doc.transact(() => {
      const files = S.doc.getMap("files"), assets = S.doc.getMap("assets"), meta = S.doc.getMap("meta");
      for (const [p, text] of Object.entries(A.currentFiles())) { const t = new Y.Text(); t.insert(0, text); files.set(p, t); }
      for (const [p, bytes] of Object.entries(A.assetFiles?.() || {})) if (bytes?.length <= MAX_ASSET) assets.set(p, toB64(bytes));
      for (const k of SHARED_KEYS) if (A.project[k] !== undefined) meta.set(k, JSON.stringify(A.project[k]));
      meta.set("docId", S.docId);
    }, LOCAL);
    relay.on("OFFER", onOffer).on("CANDIDATE", onCandidate).on("LEAVE", (src) => { const p = S?.peers.get(src); if (p) peerGone(p); }).on("CLOSED", () => reopenRelay());
    bindDoc(); attach(); ui();
    toast(`Lobby ${showCode(code)} is open. Share the code or the link.`, "ok", 5000);
  }
  async function reopenRelay() {
    if (!S || !isHost() || S.relay.closed) return;
    for (let i = 0; i < 20 && S && isHost(); i++) {
      await new Promise((r) => setTimeout(r, Math.min(15000, 1000 * 2 ** i)));
      if (!S) return;
      const saved = LS.get("collabLobby:" + S.projectId, null), r = new Relay(relayUrl(), "dexnalobby" + S.code, saved?.token || rand(16));
      r.handlers = S.relay.handlers;
      try { await r.open(); S.relay = r; ui(); return; } catch (_) {}
    }
  }
  const count = () => 1 + active().length;
  function onOffer(src, p) {
    if (!S || !isHost() || !p.sdp) return;
    if (S.locked) return S.relay.send("ANSWER", src, { cid: p.cid, deny: "The lobby is locked. Ask the host to unlock it." });
    if (count() >= MAX_PEOPLE && !S.peers.has(src)) return S.relay.send("ANSWER", src, { cid: p.cid, deny: `The lobby is full (${MAX_PEOPLE} people).` });
    const known = [...S.peers.values()].some((x) => x.src === src) || S.admitted?.has(src);
    if (S.ask && !known) {
      S.pending = S.pending.filter((x) => x.src !== src); S.pending.push({ src, p, name: String(p.name || "Someone").slice(0, 24) });
      S.relay.send("ANSWER", src, { cid: p.cid, wait: true });
      toast(`${p.name || "Someone"} wants to join. Open the Live panel to let them in.`, "info", 6000); ui(); badge(); return;
    }
    accept(src, p);
  }
  async function accept(src, p) {
    const old = S.peers.get(src); if (old) { old.gone = true; try { old.pc.close(); } catch (_) {} S.peers.delete(src); }
    (S.admitted ||= new Set()).add(src);
    const pc = new RTCPeerConnection(ICE), peer = { id: src, src, cid: p.cid, pc, name: String(p.name || "Guest").slice(0, 24), edit: S.defaultEdit, active: false };
    S.peers.set(src, peer);
    pc.onicecandidate = (e) => e.candidate && S?.relay.send("CANDIDATE", src, { cid: p.cid, c: e.candidate.toJSON() });
    pc.ondatachannel = (e) => hookChannel(peer, e.channel);
    pc.onconnectionstatechange = () => { if (pc.connectionState === "failed") peerGone(peer); };
    await pc.setRemoteDescription({ type: "offer", sdp: p.sdp });
    for (const c of S.cands.get(src)?.filter((x) => x.cid === p.cid) || []) pc.addIceCandidate(c.c).catch(() => {});
    S.cands.delete(src);
    const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
    S.relay.send("ANSWER", src, { cid: p.cid, sdp: ans.sdp });
  }
  function onCandidate(src, p) {
    if (!S || !p.c) return;
    const peer = isHost() ? S.peers.get(src) : S.hostPeer?.cid === p.cid ? S.hostPeer : S.connecting;
    if (peer && peer.cid === p.cid && peer.pc.remoteDescription) return peer.pc.addIceCandidate(p.c).catch(() => {});
    if (isHost()) { const q = S.cands.get(src) || []; q.push(p); S.cands.set(src, q.slice(-60)); }
    else (S.candQ ||= []).push(p);
  }
  function admit(src, yes) {
    const r = S.pending.find((x) => x.src === src); if (!r) return;
    S.pending = S.pending.filter((x) => x !== r);
    if (yes) accept(src, r.p); else S.relay.send("ANSWER", src, { cid: r.p.cid, deny: "The host did not let you in." });
    ui(); badge();
  }

  /* =================== a guest: joining a lobby =================== */
  async function joinLobby(code, name) {
    await loadYjs();
    const relay = new Relay(relayUrl(), "dexnaguest" + rand(12, "abcdefghijklmnopqrstuvwxyz0123456789"), rand(16, "abcdefghijklmnopqrstuvwxyz0123456789"));
    S = { role: "guest", code, relay, me: { id: null, name, color: COLORS[1] }, peers: new Map(), remote: {}, people: {}, chat: [], term: [], unread: 0, shareMouse: true, shareRun: true, following: null, applying: false, joining: true, status: "Connecting…" };
    ui();
    await relay.open();
    relay.on("ANSWER", onAnswer).on("CANDIDATE", onCandidate).on("EXPIRE", () => failJoin("No lobby with that code is open right now. Check the code, or ask the host to open it again.")).on("CLOSED", () => {});
    await connect();
  }
  async function connect() {
    if (!S || isHost()) return;
    const cid = rand(10), pc = new RTCPeerConnection(ICE), peer = { id: "host", cid, pc, active: true };
    S.connecting = peer; S.candQ = [];
    hookChannel(peer, pc.createDataChannel("dexna"));
    hookChannel(peer, pc.createDataChannel("fast", { ordered: false, maxRetransmits: 0 }));
    pc.onicecandidate = (e) => e.candidate && S?.relay.send("CANDIDATE", "dexnalobby" + S.code, { cid, c: e.candidate.toJSON() });
    pc.onconnectionstatechange = () => { if (pc.connectionState === "failed") peerGone(peer); };
    await pc.setLocalDescription(await pc.createOffer());
    S.relay.send("OFFER", "dexnalobby" + S.code, { cid, sdp: pc.localDescription.sdp, name: S.me.name });
    clearTimeout(S.answerTimer);
    S.answerTimer = setTimeout(() => { if (S && !S.waiting && !peer.open && S.connecting === peer) failJoin("The lobby did not answer. The host may have closed it."); }, 20000);
  }
  async function onAnswer(src, p) {
    const peer = S?.connecting; if (!peer || p.cid !== peer.cid) return;
    if (p.deny) return failJoin(p.deny);
    if (p.wait) { S.waiting = true; S.status = "Waiting for the host to let you in…"; return ui(); }
    S.waiting = false; S.status = S.projectId ? "Reconnecting…" : "Connecting…"; ui();
    await peer.pc.setRemoteDescription({ type: "answer", sdp: p.sdp });
    for (const c of S.candQ.filter((x) => x.cid === peer.cid)) peer.pc.addIceCandidate(c.c).catch(() => {});
    S.candQ = [];
    S.peers.set("host", peer);
  }
  function failJoin(msg) {
    if (!S || isHost()) return;
    if (S.projectId && !S.ended) { S.status = "Reconnecting…"; ui(); return scheduleReconnect(); } // was in already: keep trying
    toast(msg, "warn", 7000); const s = S; S = null; s.relay.close(); try { s.connecting?.pc.close(); } catch (_) {}
    joinError = msg; ui();
  }
  let joinError = "";
  function scheduleReconnect() {
    if (!S || S.ended) return;
    S.tries = (S.tries || 0) + 1;
    if (S.tries > 25) { toast("Could not reach the lobby again. Your copy of the project is kept.", "warn", 7000); return endSession(); }
    clearTimeout(S.retry);
    S.retry = setTimeout(() => { if (S && !S.ended) connect().catch(() => scheduleReconnect()); }, Math.min(10000, 800 * S.tries));
  }

  /* =================== messages =================== */
  function handle(peer, m) {
    if (!S) return;
    if (isHost()) {
      switch (m.t) {
        case "hello": {
          if (peer.active) return;
          peer.name = String(m.name || peer.name || "Guest").slice(0, 24);
          const used = new Set([S.me.color, ...active().map((p) => p.color)]); peer.color = COLORS.find((c) => !used.has(c)) || COLORS[S.nextColor++ % COLORS.length];
          sendJson(peer, { t: "welcome", id: peer.id, color: peer.color, edit: peer.edit, project: A.project.name, host: S.me.name, hostColor: S.me.color, code: S.code, docId: S.docId, chat: S.chat.slice(-60), rejoin: m.docId === S.docId });
          sendUpdate(peer, Y.encodeStateAsUpdate(S.doc));
          peer.active = true;
          sendRoster(); pushPresence(true);
          sysChat(`${peer.name} joined`); toast(`${peer.name} joined the lobby`, "ok"); ui();
          return;
        }
        case "pres": case "mouse": m.id = peer.id; remote(m); broadcast(m, peer, m.t === "mouse"); return;
        case "chat": { const msg = { id: peer.id, name: peer.name, color: peer.color, text: String(m.text || "").slice(0, 2000), at: Date.now() }; addChat(msg); broadcast({ t: "chat", msg }); return; }
        case "term": m.id = peer.id; gotTerm(m); broadcast(m, peer); return;
        case "save": if (!peer.edit) return; m.id = peer.id; gotSave(m); broadcast(m, peer); return;
        case "bye": peerGone(peer, true); return;
      }
    } else {
      switch (m.t) {
        case "welcome": return onWelcome(peer, m);
        case "roster": S.people = {}; for (const r of m.roster) if (r.id !== S.me.id) S.people[r.id] = r; S.locked = m.locked; { const mine = m.roster.find((r) => r.id === S.me.id); if (mine && mine.edit === !!S.readOnly) setReadOnly(!mine.edit, true); } renderRemote(); ui(); return;
        case "pres": case "mouse": remote(m); return;
        case "chat": addChat(m.msg); return;
        case "term": gotTerm(m); return;
        case "save": gotSave(m); return;
        case "kick": S.ended = true; toast("The host removed you from the lobby. Your copy of the project is kept.", "warn", 7000); return endSession();
        case "end": S.ended = true; toast("The host closed the lobby. Your copy of the project is kept.", "info", 7000); return endSession();
      }
    }
  }
  const roster = () => [{ id: "host", name: S.me.name, color: S.me.color, edit: true, host: true }, ...active().map((p) => ({ id: p.id, name: p.name, color: p.color, edit: p.edit }))];
  const sendRoster = () => broadcast({ t: "roster", roster: roster(), locked: S.locked });
  function peerGone(peer, said) {
    if (peer.gone) return; peer.gone = true;
    try { peer.pc.close(); } catch (_) {}
    if (!S) return;
    if (isHost()) {
      if (S.peers.get(peer.id) === peer) S.peers.delete(peer.id);
      delete S.remote[peer.id]; dropPointer(peer.id);
      if (peer.active) { sendRoster(); sysChat(`${peer.name} left`); if (said) toast(`${peer.name} left the lobby`, "info"); }
      renderRemote(); dots(); ui();
    } else if (peer === S.hostPeer || peer === S.connecting) {
      S.hostPeer = null;
      if (!S.ended && S.projectId) { S.status = "Reconnecting…"; S.remote = {}; clearPointers(); renderRemote(); dots(); ui(); scheduleReconnect(); }
    }
  }
  function onWelcome(peer, m) {
    S.tries = 0; clearTimeout(S.answerTimer);
    Object.assign(S, { welcome: m, host: { name: m.host, color: m.hostColor }, status: "" });
    S.me.id = m.id; S.me.color = m.color; S.chat = m.chat || S.chat;
    S.awaitState = true;
    if (!m.rejoin && S.projectId) S.resetDoc = true; // the host started over: take their copy
  }
  function gotUpdate(peer, u) {
    if (!S) return;
    if (isHost()) { if (peer.active && peer.edit) Y.applyUpdate(S.doc, u, { peer: peer.id }); return; }
    if (S.awaitState) { S.awaitState = false; return finishJoin(u); }
    Y.applyUpdate(S.doc, u, { peer: "host" });
  }
  function finishJoin(state) {
    const m = S.welcome;
    if (S.projectId && A.project?.id === S.projectId && !S.resetDoc && S.doc) {
      Y.applyUpdate(S.doc, state, { peer: "host" });
      if (!S.readOnly) sendUpdate(S.hostPeer, Y.encodeStateAsUpdate(S.doc)); // what we changed while away
    } else {
      const fresh = new Y.Doc(); Y.applyUpdate(fresh, state, { peer: "host" });
      const files = {}, metaMap = fresh.getMap("meta");
      for (const [k, t] of fresh.getMap("files").entries()) files[k] = t.toString();
      if (S.projectId && A.project?.id === S.projectId) {
        try { S.doc?.destroy(); } catch (_) {}
        S.doc = fresh; S.resetDoc = false;
        S.applying = true; try { for (const [p, t] of Object.entries(files)) applyWhole(p, t); for (const p of Object.keys(A.currentFiles())) if (files[p] == null) A.removeFiles([p]); } finally { S.applying = false; }
      } else {
        S.doc = fresh;
        const entry = metaMap.get("entry") ? JSON.parse(metaMap.get("entry")) : null;
        S.joining = true; // creating the project must not look like leaving it
        const p = A.createProject({ name: m.project, files, entry }, `${m.project} (with ${m.host})`);
        S.projectId = p.id;
      }
      S.lastMeta = {};
      applyMeta([...metaMap.keys()], fresh);
      const bins = {}; for (const [k, b64] of fresh.getMap("assets").entries()) bins[k] = fromB64(b64);
      if (Object.keys(bins).length) { S.applying = true; try { A.addAssets(bins); } finally { S.applying = false; } }
      S.bound = false;
    }
    S.docId = m.docId; S.joining = false; S.status = "";
    setReadOnly(!m.edit, false);
    if (!S.bound) bindDoc();
    attach(); ui(); renderChat();
    toast(m.rejoin ? "Back in the lobby" : `Joined ${m.host}'s lobby${m.edit ? "" : " (view only)"}`, "ok");
    pushPresence(true);
    A.setView("live");
  }

  /* =================== the shared document =================== */
  function bindDoc() {
    S.bound = true;
    const doc = S.doc, files = doc.getMap("files"), assets = doc.getMap("assets"), meta = doc.getMap("meta");
    Object.assign(S, { files, assets, meta });
    S.lastMeta ||= {}; for (const k of SHARED_KEYS) S.lastMeta[k] = meta.get(k);
    doc.on("update", (u, origin) => {
      if (!S || S.doc !== doc) return;
      if (origin === LOCAL) { if (isHost()) for (const p of active()) sendUpdate(p, u); else if (S.hostPeer) sendUpdate(S.hostPeer, u); }
      else if (isHost() && origin?.peer) for (const p of active()) if (p.id !== origin.peer) sendUpdate(p, u);
    });
    files.observeDeep((events, tr) => {
      if (tr.origin === LOCAL || !S || S.doc !== doc || A.project?.id !== S.projectId) return;
      S.applying = true;
      try {
        for (const ev of events) {
          if (ev.target === files) {
            for (const [key, c] of ev.changes.keys) {
              if (c.action === "delete") { if (A.currentFiles()[key] != null) A.removeFiles([key]); }
              else { const t = files.get(key)?.toString() ?? ""; if (A.currentFiles()[key] == null) A.writeFiles({ [key]: t }); else applyWhole(key, t); }
            }
          } else if (ev.target instanceof Y.Text) applyDelta(ev.path[0], ev);
        }
      } finally { S.applying = false; absorb(); }
      renderRemote(); dots();
    });
    assets.observe((ev, tr) => {
      if (tr.origin === LOCAL || !S || S.doc !== doc || A.project?.id !== S.projectId) return;
      S.applying = true;
      try {
        const add = {};
        for (const [key, c] of ev.changes.keys) { if (c.action === "delete") A.removeFiles([key]); else add[key] = fromB64(assets.get(key)); }
        if (Object.keys(add).length) A.addAssets(add);
      } finally { S.applying = false; absorb(); }
    });
    meta.observe((ev, tr) => { if (tr.origin === LOCAL || !S || S.doc !== doc || A.project?.id !== S.projectId) return; applyMeta([...ev.keysChanged], doc); });
  }
  /** What changed here only because of someone else's edit (breakpoints moving down a line, say) is not news. */
  function absorb() { if (!S?.lastMeta) return; for (const k of SHARED_KEYS) S.lastMeta[k] = A.project[k] === undefined ? undefined : JSON.stringify(A.project[k]); }
  function applyMeta(keys, doc = S.doc) {
    const meta = doc.getMap("meta"); let any = false;
    S.applying = true;
    try {
      for (const k of keys) {
        if (!SHARED_KEYS.includes(k)) continue;
        const v = meta.get(k); S.lastMeta[k] = v;
        if (v === undefined) delete A.project[k]; else A.project[k] = JSON.parse(v);
        any = true;
      }
      if (any) { A.project.dirs ||= []; A.project.breakpoints ||= {}; A.refreshProjectUi?.(); A.persist(); if (keys.includes("github")) renderRepo(); }
    } finally { S.applying = false; absorb(); }
  }
  function applyDelta(path, ev) {
    const model = A.models.get(path);
    if (!model) { A.writeFiles({ [path]: S.files.get(path).toString() }); return; }
    const edits = []; let pos = 0;
    for (const op of ev.delta) {
      if (op.retain != null) pos += op.retain;
      else if (op.insert != null) { const p = model.getPositionAt(pos); edits.push({ range: new (M().Range)(p.lineNumber, p.column, p.lineNumber, p.column), text: op.insert, forceMoveMarkers: true }); }
      else if (op.delete != null) { const a = model.getPositionAt(pos), b = model.getPositionAt(pos + op.delete); edits.push({ range: new (M().Range)(a.lineNumber, a.column, b.lineNumber, b.column), text: "" }); pos += op.delete; }
    }
    if (edits.length) model.applyEdits(edits);
  }
  function applyWhole(path, text) {
    const model = A.models.get(path);
    if (!model) return A.writeFiles({ [path]: text });
    if (model.getValue() !== text) model.applyEdits([{ range: model.getFullModelRange(), text }]);
  }
  const live = () => S?.files && !S.joining && !S.applying && S.projectId === A.project?.id;
  /** Every edit in an editor of the project goes into the shared document. */
  function onLocalChange(path, ev) {
    if (!live() || S.readOnly) return;
    const yt = S.files.get(path); if (!yt) return;
    S.doc.transact(() => {
      if (ev.isFlush) { yt.delete(0, yt.length); yt.insert(0, A.models.get(path).getValue()); return; }
      for (const c of [...ev.changes].sort((a, b) => b.rangeOffset - a.rangeOffset)) { if (c.rangeLength) yt.delete(c.rangeOffset, c.rangeLength); if (c.text) yt.insert(c.rangeOffset, c.text); }
    }, LOCAL);
  }
  /** Files, images and project settings changed here are changed for everyone. */
  let syncTimer = null;
  function onFilesChanged() {
    if (!S?.files || S.joining || S.readOnly) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (!live() || S.readOnly) return;
      const mine = A.currentFiles(), bins = A.assetFiles?.() || {}, proj = A.project;
      let big = null;
      S.doc.transact(() => {
        for (const [p, text] of Object.entries(mine)) if (!S.files.has(p)) { const t = new Y.Text(); t.insert(0, text); S.files.set(p, t); }
        for (const p of [...S.files.keys()]) if (mine[p] == null) S.files.delete(p);
        for (const [p, b] of Object.entries(bins)) if (!S.assets.has(p)) { if (b.length <= MAX_ASSET) S.assets.set(p, toB64(b)); else big = p; }
        for (const p of [...S.assets.keys()]) if (!bins[p]) S.assets.delete(p);
        for (const k of SHARED_KEYS) {
          const v = proj[k] === undefined ? undefined : JSON.stringify(proj[k]);
          if (v !== S.lastMeta[k]) { S.lastMeta[k] = v; if (v === undefined) S.meta.delete(k); else S.meta.set(k, v); if (k === "github") setTimeout(renderRepo, 0); }
        }
      }, LOCAL);
      if (big && !S.warnedBig) { S.warnedBig = true; toast(`${big} is over 3 MB, so it is not shared with the lobby`, "warn"); }
      dots();
    }, 40);
  }
  function onProjectLoaded(id) {
    if (S && !S.joining && S.projectId && id !== S.projectId) { toast("You opened another project, so you left the lobby", "info"); leave(); }
  }
  function onSaved() { if (live() && !S.readOnly) emit({ t: "save", path: A.currentPath() }); }
  function gotSave(m) { A.commitDirty?.(); A.setStatusFlash?.(`Saved by ${who(m.id)?.name || "someone"}`); }

  /* =================== live run output =================== */
  let termBuf = [], termTimer = null, unwrap = null;
  function wrapTerminal() {
    const t = A.terminal; if (!t || unwrap) return;
    const orig = { write: t.write, system: t.system, separator: t.separator };
    const out = (k, s, x) => { if (!S || !S.shareRun || S.joining || typeof s !== "string") return; termBuf.push([k, s.slice(0, 4000), x]); if (!termTimer) termTimer = setTimeout(flushTerm, 90); };
    t.write = function (text, stream) { out("w", text, stream); return orig.write.apply(this, arguments); };
    t.system = function (text, cls) { out("s", text, cls); return orig.system.apply(this, arguments); };
    t.separator = function (text) { out("sep", text); return orig.separator.apply(this, arguments); };
    unwrap = () => { delete t.write; delete t.system; delete t.separator; unwrap = null; };
  }
  function flushTerm() { termTimer = null; if (!S || !termBuf.length) { termBuf = []; return; } const parts = termBuf; termBuf = []; const id = isHost() ? "host" : S.me.id; emit({ t: "term", id, parts }); gotTerm({ id, parts }); }
  function gotTerm(m) {
    const p = who(m.id);
    for (const [k, s, x] of m.parts || []) {
      if (k === "sep") { S.term.push({ head: true, text: `${p?.name || "Someone"} · ${stripAnsi(s)}`, color: p?.color }); continue; }
      const err = x === "stderr" || x === "error", last = S.term[S.term.length - 1], text = stripAnsi(s) + (k === "s" ? "\n" : "");
      if (last && !last.head && last.err === err) last.text += text; else S.term.push({ text, err });
    }
    let total = S.term.reduce((n, x) => n + x.text.length, 0);
    while (total > 30000 && S.term.length > 1) total -= S.term.shift().text.length;
    renderTerm();
  }

  /* =================== chat =================== */
  function addChat(msg) {
    S.chat.push(msg); if (S.chat.length > 300) S.chat.shift();
    if (!panelVisible() && !msg.sys && msg.id !== (isHost() ? "host" : S.me.id)) { S.unread++; badge(); toast(`${msg.name}: ${msg.text.slice(0, 80)}`, "info", 4000); }
    renderChat();
  }
  const sysChat = (text) => { const msg = { sys: true, text, at: Date.now() }; addChat(msg); broadcast({ t: "chat", msg }); };
  function say(text) {
    text = text.trim(); if (!text || !S || S.joining) return;
    if (isHost()) { const msg = { id: "host", name: S.me.name, color: S.me.color, text, at: Date.now() }; addChat(msg); broadcast({ t: "chat", msg }); }
    else emit({ t: "chat", text });
  }

  /* =================== presence: cursors, selections, pointers, dots =================== */
  function who(id) { if (!S) return null; if (id === "host") return isHost() ? S.me : S.host; if (isHost()) return S.peers.get(id); return id === S.me.id ? S.me : S.people[id]; }
  let presTimer = null;
  function pushPresence(now = false) {
    if (!S || S.joining) return;
    clearTimeout(presTimer);
    presTimer = setTimeout(() => {
      const e = ed(), m = e?.getModel(), path = A.currentPath();
      if (!m || !path || !S) return;
      const s = e.getSelection();
      emit({ t: "pres", id: isHost() ? "host" : S.me.id, path, sel: [m.getOffsetAt(s.getStartPosition()), m.getOffsetAt(s.getEndPosition()), s.getDirection() === 0 ? 0 : 1], line: s.positionLineNumber });
      if (els.people) renderPeople();
    }, now ? 0 : 40);
  }
  let lastMouse = 0, mouseTimer = null;
  function onMouseMove(e) {
    if (!S || S.joining || !S.shareMouse) return;
    const t = performance.now(); clearTimeout(mouseTimer);
    if (t - lastMouse < 30) { mouseTimer = setTimeout(() => onMouseMove(e), 34); return; }
    lastMouse = t;
    const ce = ed(), dom = ce?.getContainerDomNode?.(); let over = null;
    if (dom) { const r = dom.getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { const tg = ce.getTargetAtClientPoint(e.clientX, e.clientY); if (tg?.position) over = { path: A.currentPath(), line: tg.position.lineNumber, col: tg.position.column }; } }
    emit({ t: "mouse", id: isHost() ? "host" : S.me.id, fx: e.clientX / innerWidth, fy: e.clientY / innerHeight, over }, true);
  }
  const onMouseLeave = () => S?.shareMouse && !S.joining && emit({ t: "mouse", id: isHost() ? "host" : S.me.id, gone: true }, true);
  function remote(m) {
    const p = who(m.id); if (!p || m.id === S.me.id) return;
    const fresh = !S.remote[m.id], r = (S.remote[m.id] ||= {});
    if (fresh) stylesheet();
    if (m.t === "pres") { Object.assign(r, { path: m.path, sel: m.sel, line: m.line, at: Date.now() }); if (S.following === m.id) follow(m.id); renderRemote(); dots(); renderPeople(); }
    else { r.mouse = m.gone ? null : { fx: m.fx, fy: m.fy, over: m.over }; placePointer(m.id); }
  }
  function follow(id) {
    const r = S.remote[id]; if (!r?.path) return;
    if (r.path !== A.currentPath() && A.currentFiles()[r.path] != null) A.openFile(r.path, { focus: false });
    const model = ed()?.getModel(); if (model && r.sel && A.currentPath() === r.path) ed().revealPositionInCenterIfOutsideViewport(model.getPositionAt(Math.min(r.sel[1], model.getValueLength())));
  }
  let collection = null, idleTimer = null;
  function renderRemote() {
    const e = ed(), model = e?.getModel(); if (!model) return;
    const path = A.currentPath(), decos = [];
    for (const [id, r] of Object.entries(S?.remote || {})) {
      const p = who(id); if (!p || r.path !== path || !r.sel) continue;
      const len = model.getValueLength(), a = model.getPositionAt(Math.min(len, r.sel[0])), b = model.getPositionAt(Math.min(len, r.sel[1])), head = r.sel[2] ? a : b;
      const cls = `collab-c${Math.max(0, COLORS.indexOf(p.color))} collab-id-${id}${Date.now() - (r.at || 0) > 2500 ? " collab-idle" : ""}`;
      if (r.sel[0] !== r.sel[1]) decos.push({ range: new (M().Range)(a.lineNumber, a.column, b.lineNumber, b.column), options: { className: `collab-sel ${cls}`, stickiness: 1 } });
      decos.push({ range: new (M().Range)(head.lineNumber, head.column, head.lineNumber, head.column), options: { afterContentClassName: `collab-cur ${cls}`, stickiness: 1, zIndex: 20, overviewRuler: { color: p.color, position: 4 } } });
    }
    (collection ||= e.createDecorationsCollection()).set(decos);
    clearTimeout(idleTimer); if (S) idleTimer = setTimeout(renderRemote, 2600);
  }
  function stylesheet() {
    let s = document.getElementById("collab-style"); if (!s) { s = h("style", { id: "collab-style" }); document.head.append(s); }
    const ids = S ? Object.keys(S.remote) : [];
    s.textContent = ids.map((id) => [id, who(id)]).filter(([, p]) => p).map(([id, p]) => `.collab-cur.collab-id-${id}::after{content:"${esc(p.name)}"}`).join("\n");
  }
  const layer = () => document.getElementById("collab-layer") || document.body.appendChild(h("div", { id: "collab-layer" }));
  const dropPointer = (id) => document.querySelector(`#collab-layer [data-id="${id}"]`)?.remove();
  const clearPointers = () => document.getElementById("collab-layer")?.replaceChildren();
  function placePointer(id) {
    const p = who(id), r = S?.remote[id]; if (!p) return;
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
  /* coloured dots in the file tree and on tabs, where people are */
  let dotObs = null, dotBusy = false, dotRaf = 0;
  function dots() {
    if (dotRaf) return;
    dotRaf = requestAnimationFrame(() => {
      dotRaf = 0; dotBusy = true;
      const where = new Map();
      const put = (path, p) => { const l = where.get(path) || where.set(path, []).get(path); if (!l.includes(p)) l.push(p); };
      if (S) for (const [id, r] of Object.entries(S.remote)) {
        const p = who(id); if (!p || !r.path) continue;
        put(r.path, p);
        for (let d = r.path; d.includes("/"); ) { d = d.slice(0, d.lastIndexOf("/")); put(d, p); } // and on the folders it is in, for when they are closed
      }
      for (const el of document.querySelectorAll("#file-tree .row[data-path], #tabs .tab[data-key]")) {
        const path = el.dataset.path || el.dataset.key, list = where.get(path) || [];
        let d = el.querySelector(":scope > .live-dots");
        if (!list.length) { d?.remove(); continue; }
        const sig = list.map((p) => p.color + p.name).join();
        if (d?.dataset.sig === sig) continue;
        if (!d) { d = h("span", { class: "live-dots" }); el.append(d); }
        d.dataset.sig = sig; d.title = list.map((p) => p.name).join(", ") + " here";
        d.replaceChildren(...list.slice(0, 4).map((p) => h("i", { style: { background: p.color } })));
      }
      dotObs?.takeRecords(); dotBusy = false;
    });
  }

  /* =================== starting and ending =================== */
  let listeners = [];
  function attach() {
    const e = ed(); if (!e) return;
    for (const l of listeners) l.dispose();
    listeners = [e.onDidChangeCursorSelection(() => pushPresence()), e.onDidChangeModel(() => { renderRemote(); pushPresence(true); applyReadOnly(); for (const id of Object.keys(S?.remote || {})) placePointer(id); }), e.onDidScrollChange(() => { for (const id of Object.keys(S?.remote || {})) placePointer(id); })];
    document.removeEventListener("mousemove", onMouseMove, true); document.addEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("mouseleave", onMouseLeave); document.addEventListener("mouseleave", onMouseLeave);
    if (!dotObs) { dotObs = new MutationObserver(() => { if (!dotBusy) dots(); }); for (const sel of ["#file-tree", "#tabs"]) { const el = document.querySelector(sel); if (el) dotObs.observe(el, { childList: true, subtree: true }); } }
    wrapTerminal(); applyReadOnly(); pushPresence(true); dots();
  }
  function setReadOnly(ro, tell) {
    const was = !!S.readOnly; S.readOnly = ro;
    ed()?.updateOptions({ readOnly: ro });
    if (tell && was !== ro) toast(ro ? "The host made you view only" : "The host let you edit", "info");
    ui();
  }
  function applyReadOnly() { if (S?.readOnly) ed()?.updateOptions({ readOnly: true }); }
  function leave() {
    if (!S) return;
    if (isHost()) broadcast({ t: "end" }); else { S.ended = true; if (S.hostPeer) sendJson(S.hostPeer, { t: "bye" }); }
    const s = S; setTimeout(() => { if (S === s) endSession(); }, 150);
  }
  function endSession() {
    if (!S) return;
    const s = S; S = null;
    clearTimeout(s.retry); clearTimeout(s.answerTimer);
    for (const l of listeners) l.dispose(); listeners = [];
    document.removeEventListener("mousemove", onMouseMove, true); document.removeEventListener("mouseleave", onMouseLeave);
    clearTimeout(idleTimer); clearTimeout(mouseTimer); collection?.clear(); collection = null;
    document.getElementById("collab-layer")?.remove(); document.getElementById("collab-style")?.remove();
    dotObs?.disconnect(); dotObs = null; document.querySelectorAll(".live-dots").forEach((d) => d.remove());
    unwrap?.();
    if (s.readOnly) ed()?.updateOptions({ readOnly: false });
    for (const p of s.peers.values()) { p.gone = true; try { p.pc.close(); } catch (_) {} }
    try { s.connecting?.pc.close(); } catch (_) {}
    s.relay?.close(); try { s.doc?.destroy(); } catch (_) {}
    ui();
  }

  /* =================== the Live panel =================== */
  const root = () => document.getElementById("live-root");
  const panelVisible = () => !!document.querySelector('#sidebar .view.active[data-view="live"]') && !document.getElementById("app")?.classList.contains("no-sidebar");
  const linkFor = (code) => `${location.origin}${location.pathname}#live=${code}`;
  const copy = async (text, btn) => { try { await navigator.clipboard.writeText(text); } catch (_) { const t = Object.assign(h("textarea"), { value: text }); document.body.append(t); t.select(); document.execCommand("copy"); t.remove(); } if (btn) { const o = btn.textContent; btn.textContent = "Copied"; setTimeout(() => (btn.textContent = o), 1200); } };
  const avatar = (p) => h("span", { class: "lv-av", style: { background: p.color }, title: p.name }, (p.name || "?").trim().charAt(0).toUpperCase());
  const myName = () => LS.get("collabName", "") || A.settings.greetingName || "";
  const people = () => (!S ? 0 : isHost() ? count() : 1 + Object.keys(S.people).length);
  let els = {};
  function badge() {
    const b = document.querySelector('#activitybar [data-view="live"] .ab-badge'); if (!b) return;
    const alert = S ? (S.unread || 0) + (S.pending?.length || 0) : 0;
    b.textContent = alert ? String(alert) : S && !S.joining ? String(people()) : "";
    b.classList.toggle("hidden", !b.textContent); b.classList.toggle("alert", alert > 0);
  }
  function ui() {
    const s = document.getElementById("sb-collab");
    if (s) {
      if (!S || S.joining) s.classList.add("hidden");
      else { s.classList.remove("hidden"); const n = people(); s.textContent = `Live ${showCode(S.code)} · ${n} ${n === 1 ? "person" : "people"}${S.readOnly ? " · view only" : ""}${S.status ? " · " + S.status : ""}`; }
    }
    document.querySelector('#activitybar [data-view="live"]')?.classList.toggle("lv-on", !!S && !S.joining);
    stylesheet(); badge(); renderPanel();
  }
  function renderPanel() {
    const r = root(); if (!r) return;
    const mode = !S ? "idle" : S.joining ? "joining" : "live";
    if (r.dataset.mode !== mode || mode === "joining") { r.dataset.mode = mode; els = {}; r.replaceChildren(mode === "idle" ? idleView() : mode === "joining" ? joiningView() : liveView()); }
    if (mode === "live") { renderHead(); renderPeople(); renderRepo(); }
  }
  function idleView() {
    const name = h("input", { class: "lv-input lv-name", placeholder: "Your name", value: myName(), maxlength: 24, spellcheck: "false" });
    const edit = h("input", { type: "checkbox", checked: LS.get("collabEdit", true) }), ask = h("input", { type: "checkbox", checked: LS.get("collabAsk", false) });
    const code = h("input", { class: "lv-input lv-code-in", placeholder: "K7M-2QX", spellcheck: "false", autocomplete: "off" });
    const err = h("div", { class: "lv-err" }, joinError); joinError = "";
    const nm = () => { const n = name.value.trim(); if (!n) { name.focus(); name.classList.add("bad"); err.textContent = "Type your name first, so the others know who you are."; return null; } LS.set("collabName", n); return n; };
    const create = h("button", { class: "btn primary lv-big" }, "Create a private lobby");
    create.onclick = async () => {
      const n = nm(); if (!n) return; LS.set("collabEdit", edit.checked); LS.set("collabAsk", ask.checked);
      create.disabled = true; create.textContent = "Opening…"; err.textContent = "";
      try { await openLobby({ name: n, edit: edit.checked, ask: ask.checked }); } catch (e) { S = null; err.textContent = `${e.message}. Check your connection, or set another lobby server in Settings.`; create.disabled = false; create.textContent = "Create a private lobby"; }
    };
    const join = h("button", { class: "btn primary" }, "Join");
    const doJoin = async () => {
      const n = nm(); if (!n) return; const c = normCode(code.value);
      if (!c) { err.textContent = "That is not a lobby code. Codes look like K7M-2QX."; code.focus(); return; }
      err.textContent = ""; join.disabled = true;
      try { await joinLobby(c, n); } catch (e) { const s = S; S = null; s?.relay?.close(); joinError = e.message; ui(); }
    };
    join.onclick = doJoin; code.onkeydown = (e) => { if (e.key === "Enter") doJoin(); };
    els.code = code; els.name = name;
    const gh = A.project?.github;
    return h("div", { class: "lv-idle" },
      h("div", { class: "lv-hero" }, h("div", { class: "lv-hero-t" }, "Code together"), h("div", { class: "muted small" }, "Open a private lobby and share its code. Up to 10 people edit the same project live, see each other's cursors and mouse, chat, and watch each other's runs.")),
      h("label", { class: "lv-label" }, "Your name"), name,
      h("div", { class: "lv-card" },
        h("div", { class: "lv-card-t" }, "Join a lobby"),
        h("div", { class: "lv-row" }, code, join)),
      h("div", { class: "lv-card" },
        h("div", { class: "lv-card-t" }, "Host a lobby"),
        h("div", { class: "muted small" }, `Shares ${A.project ? `"${A.project.name}"` : "this project"}${gh ? `, linked to ${gh.owner}/${gh.repo}` : ""}.`),
        h("label", { class: "lv-check" }, edit, "People can edit (untick for view only)"),
        h("label", { class: "lv-check" }, ask, "Ask me before letting someone in"),
        create,
        h("button", { class: "btn lv-link", onclick: () => A.runCommand?.("gh-open") }, gh ? "Use a different GitHub repository…" : "Start from a GitHub repository…")),
      err,
      h("p", { class: "muted small lv-foot" }, "Lobbies are private: only people with the code or link can join. Your browsers connect to each other directly; a lobby server only introduces them."));
  }
  function joiningView() {
    return h("div", { class: "lv-idle" }, h("div", { class: "lv-hero" }, h("div", { class: "lv-hero-t" }, `Joining ${showCode(S.code)}`), h("div", { class: "lv-wait" }, h("span", { class: "lv-spin" }), S.status || "Connecting…")),
      h("button", { class: "btn", onclick: () => { const s = S; S = null; s.relay?.close(); try { s.connecting?.pc.close(); } catch (_) {} ui(); } }, "Cancel"));
  }
  function liveView() {
    els.head = h("div", { class: "lv-head" });
    els.pending = h("div", { class: "lv-pending" });
    els.people = h("div", { class: "lv-people" });
    els.repo = h("div", { class: "lv-repo" });
    els.chat = h("div", { class: "lv-chat" });
    const input = h("input", { class: "lv-input lv-say", placeholder: "Message the lobby", maxlength: 2000 });
    input.onkeydown = (e) => { if (e.key === "Enter" && input.value.trim()) { say(input.value); input.value = ""; } };
    els.term = h("pre", { class: "lv-term" });
    const mouse = h("input", { type: "checkbox", checked: S.shareMouse, onchange: (e) => { S.shareMouse = e.target.checked; if (!S.shareMouse) onMouseLeave(); } });
    const run = h("input", { type: "checkbox", checked: S.shareRun, onchange: (e) => { S.shareRun = e.target.checked; } });
    const node = h("div", { class: "lv-live" }, els.head, els.pending,
      h("div", { class: "lv-sec" }, "People"), els.people,
      els.repo,
      h("div", { class: "lv-sec" }, "Chat"), els.chat, input,
      h("div", { class: "lv-sec" }, "Live run output"), els.term,
      h("label", { class: "lv-check" }, mouse, "Show my mouse to the others"),
      h("label", { class: "lv-check" }, run, "Share my run output"),
      h("button", { class: "btn danger lv-leave", onclick: () => { const host = isHost(); leave(); toast(host ? "You closed the lobby" : "You left the lobby. Your copy of the project is kept.", "info"); } }, isHost() ? "Close the lobby" : "Leave the lobby"));
    setTimeout(() => { renderChat(); renderTerm(); }, 0);
    return node;
  }
  function renderHead() {
    if (!els.head) return;
    const code = showCode(S.code), link = linkFor(S.code);
    els.head.replaceChildren(
      h("div", { class: "lv-codebox" }, h("div", { class: "muted small" }, isHost() ? "Your lobby" : `${S.host?.name || "Host"}'s lobby`), h("div", { class: "lv-code" }, code),
        h("div", { class: "lv-row" }, h("button", { class: "btn sm", onclick: (e) => copy(code, e.currentTarget) }, "Copy code"), h("button", { class: "btn sm", onclick: (e) => copy(link, e.currentTarget) }, "Copy link"), A.showQr ? h("button", { class: "btn sm", onclick: () => A.showQr(link, `Scan to join ${code}`) }, "QR") : null)),
      h("div", { class: "lv-state small" + (S.status ? " warn" : "") }, S.status || (isHost() ? `${count()} of ${MAX_PEOPLE} people${S.locked ? " · locked" : ""}${S.ask ? " · you let people in" : ""}` : S.readOnly ? "You can watch but not edit" : "Connected, you can edit")),
      isHost() ? h("div", { class: "lv-row" },
        h("button", { class: "btn sm" + (S.locked ? " primary" : ""), title: "Stop new people from joining", onclick: () => { S.locked = !S.locked; sendRoster(); ui(); } }, S.locked ? "Locked" : "Lock"),
        h("button", { class: "btn sm" + (S.ask ? " primary" : ""), title: "Ask before letting someone in", onclick: () => { S.ask = !S.ask; LS.set("collabAsk", S.ask); ui(); } }, S.ask ? "Asking first" : "Ask first")) : "");
    els.pending.replaceChildren(...(isHost() ? S.pending : []).map((r) => h("div", { class: "lv-req" }, h("span", {}, h("b", {}, r.name), " wants to join"), h("button", { class: "btn sm primary", onclick: () => admit(r.src, true) }, "Let in"), h("button", { class: "btn sm", onclick: () => admit(r.src, false) }, "Deny"))));
  }
  function renderPeople() {
    if (!els.people || !S || S.joining) return;
    const list = isHost() ? roster() : [{ id: "host", ...S.host, host: true, edit: true }, ...Object.values(S.people).filter((p) => p.id !== "host"), { ...S.me, edit: !S.readOnly }];
    els.people.replaceChildren(...list.map((p) => {
      const me = isHost() ? p.id === "host" : p.id === S.me.id, r = S.remote[p.id];
      const where = me ? (A.currentPath() || "") : r?.path ? `${r.path}${r.line ? ":" + r.line : ""}` : "";
      const peer = isHost() && !me ? S.peers.get(p.id) : null;
      return h("div", { class: "lv-person" },
        avatar(p),
        h("div", { class: "lv-who" }, h("div", { class: "lv-pname" }, p.name, me ? h("span", { class: "muted" }, " (you)") : null, p.host ? h("span", { class: "lv-tag" }, "host") : null, p.edit === false ? h("span", { class: "lv-tag" }, "view only") : null),
          h("div", { class: "muted small lv-where", title: where }, where || "")),
        h("div", { class: "lv-acts" },
          !me && r?.path ? h("button", { class: "btn sm" + (S.following === p.id ? " primary" : ""), title: "Your editor goes where they go", onclick: () => { S.following = S.following === p.id ? null : p.id; if (S.following) follow(p.id); renderPeople(); } }, S.following === p.id ? "Following" : "Follow") : null,
          peer ? h("button", { class: "btn sm", title: peer.edit ? "Make them view only" : "Let them edit", onclick: () => { peer.edit = !peer.edit; sendRoster(); renderPeople(); } }, peer.edit ? "Can edit" : "View only") : null,
          peer ? h("button", { class: "btn sm", title: "Remove from the lobby", onclick: () => { sendJson(peer, { t: "kick" }); sysChat(`${peer.name} was removed`); setTimeout(() => peerGone(peer, false), 150); } }, "Remove") : null));
    }));
  }
  function renderRepo() {
    if (!els.repo || !S) return;
    const gh = A.project?.github, run = (id) => A.runCommand?.(id);
    if (!gh) { els.repo.replaceChildren(isHost() ? h("div", { class: "lv-repo-box lv-repo-none muted small" }, "Not linked to GitHub. ", h("a", { href: "#", onclick: (e) => { e.preventDefault(); run("gh-publish"); } }, "Publish it to a repository"), " to commit together.") : ""); return; }
    const signed = A.githubSignedIn?.();
    els.repo.replaceChildren(h("div", { class: "lv-sec" }, "Repository"), h("div", { class: "lv-repo-box" },
      h("div", {}, h("b", {}, `${gh.owner}/${gh.repo}`), h("span", { class: "muted small" }, `  on ${gh.branch}`)),
      h("div", { class: "muted small" }, signed ? "Commits go out under your own GitHub account. When anyone pushes or pulls, everyone's copy follows." : "Sign in to GitHub to commit and push under your own account (you need write access to the repository, or fork it)."),
      h("div", { class: "lv-row" }, h("button", { class: "btn sm primary", disabled: !!S.readOnly, onclick: () => run("gh-push") }, "Commit and push…"), h("button", { class: "btn sm", disabled: !!S.readOnly, onclick: () => run("gh-pull") }, "Pull"), h("button", { class: "btn sm", onclick: () => run(signed ? "gh-branch" : "gh-signin") }, signed ? "Branch…" : "Sign in…"))));
  }
  function renderChat() {
    if (!els.chat || !S) return;
    if (panelVisible()) { S.unread = 0; badge(); }
    els.chat.replaceChildren(...(S.chat.length ? S.chat.slice(-120).map((m) => m.sys ? h("div", { class: "lv-msg sys" }, m.text) : h("div", { class: "lv-msg" }, h("span", { class: "lv-msg-n", style: { color: m.color } }, m.name), h("span", {}, m.text))) : [h("div", { class: "muted small" }, "No messages yet.")]));
    els.chat.scrollTop = els.chat.scrollHeight;
  }
  function renderTerm() {
    if (!els.term || !S) return;
    els.term.replaceChildren(...(S.term.length ? S.term.map((x) => x.head ? h("div", { class: "lv-term-h", style: { color: x.color } }, x.text) : h("span", { class: x.err ? "err" : "" }, x.text)) : [h("span", { class: "muted" }, "When anyone runs code, the output shows here.")]));
    els.term.scrollTop = els.term.scrollHeight;
  }

  function onEditorReady() {
    document.getElementById("sb-collab")?.addEventListener("click", () => A.setView("live"));
    renderPanel();
    fromLink(); addEventListener("hashchange", fromLink);
  }
  /** Opening a lobby link joins it (or fills in the code, when we do not know your name yet). */
  function fromLink() {
    const m = /#live=([A-Za-z0-9-]+)/.exec(location.hash); if (!m) return;
    history.replaceState(null, "", location.pathname + location.search);
    const c = normCode(m[1]); if (!c) return;
    if (S) { if (S.code !== c) toast("Leave the lobby you are in first", "info"); A.setView("live"); return; }
    A.setView("live");
    setTimeout(() => {
      if (myName()) joinLobby(c, myName()).catch((e) => { const s = S; S = null; s?.relay?.close(); joinError = e.message; ui(); });
      else { renderPanel(); if (els.code) { els.code.value = showCode(c); els.name?.focus(); } }
    }, 300);
  }
  function onView(view) { if (view === "live") { renderPanel(); if (S) { S.unread = 0; badge(); renderChat(); } } }
  const commands = [
    { id: "collab-start", label: "Live: Code Together (Private Lobby)", cat: "Live", run: () => A.setView("live") },
    { id: "collab-join", label: "Live: Join a Lobby…", cat: "Live", run: () => { A.setView("live"); setTimeout(() => els.code?.focus(), 50); } },
    { id: "collab-leave", label: "Live: Leave or Close the Lobby", cat: "Live", run: () => { leave(); toast("You left the lobby", "info"); }, when: () => !!S },
  ];
  return { commands, onEditorReady, onLocalChange, onFilesChanged, onProjectLoaded, onSaved, onView, get active() { return !!S; },
    /** For tests: cut a guest's connection as a network drop would. */
    dropForTest() { try { S?.hostPeer?.pc.close(); } catch (_) {} if (S?.hostPeer) peerGone(S.hostPeer); } };
}
