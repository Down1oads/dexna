// Live: private lobbies to code together. The host opens a lobby and gets a short code (K7M-2QX) and a link;
// up to ten people join with either. Everyone sees each other's cursors, selections and mouse pointers live,
// edits merge safely (a Yjs document), and the whole project is shared: files, folders, images, breakpoints,
// bookmarks, packages, run settings, the GitHub link and its commit state. Saving saves for everyone, runs can be
// watched live, and there is a chat.
//
// Browsers connect directly (WebRTC). A small public relay (a PeerJS server) only introduces them; nothing of the
// project goes through it. The relay can be changed in Settings.

const COLORS = ["#e5484d", "#3e63dd", "#30a46c", "#f76b15", "#8e4ec6", "#12a594", "#d6409f", "#ab6400", "#0090ff", "#7c66dc"];
const STUN = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }];
/** "turn:host:3478 user pass" (from Settings) to an ICE server, or null. Exported for tests. */
export function parseTurn(s) { const [urls, username, credential] = String(s || "").trim().split(/\s+/); return /^turns?:/.test(urls || "") ? { urls, username, credential } : null; }
const DIRECT_WAIT = 7000; // how long a direct connection gets before the lobby server carries the traffic
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

/* ---------- invite codes for connecting with no server at all: a connection description, compressed ---------- */
const squeeze = async (Ctor, bytes) => { const s = new Ctor("deflate-raw"), w = s.writable.getWriter(); w.write(bytes); w.close(); return new Uint8Array(await new Response(s.readable).arrayBuffer()); };
export async function packCode(obj) {
  let out = new TextEncoder().encode(JSON.stringify(obj)), tag = "P";
  if (typeof CompressionStream !== "undefined") { out = await squeeze(CompressionStream, out); tag = "Z"; }
  return "DX" + tag + toB64(out).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function unpackCode(code) {
  code = String(code).replace(/\s+/g, "");
  if (!code.startsWith("DX")) throw new Error("That is not a Dexna invite or reply code");
  const tag = code[2]; let s = code.slice(3).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
  let bytes; try { bytes = fromB64(s); if (tag === "Z") bytes = await squeeze(DecompressionStream, bytes); } catch (_) { throw new Error("That code is damaged or cut short. Copy all of it again."); }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch (_) { throw new Error("That code is damaged or cut short. Copy all of it again."); }
}
/** Waits until the browser has found its ways to be reached (or a few seconds pass). */
const waitIce = (pc, ms = 5000) => new Promise((ok) => {
  if (pc.iceGatheringState === "complete") return ok();
  const done = () => { pc.removeEventListener("icegatheringstatechange", chk); clearTimeout(t); ok(); };
  const chk = () => pc.iceGatheringState === "complete" && done();
  const t = setTimeout(done, ms); pc.addEventListener("icegatheringstatechange", chk);
});

/* ---------- what happened while connecting, to show (and copy) when something goes wrong ---------- */
const logs = [];
export function log(text) { const t = new Date(); logs.push(`${t.toTimeString().slice(0, 8)}.${String(t.getMilliseconds()).padStart(3, "0")}  ${text}`); if (logs.length > 120) logs.shift(); logListeners.forEach((f) => f()); }
const logListeners = new Set();
/** A repeating timer that keeps its pace in a background tab (timers in a worker are not slowed down like the page's). */
function ticker(ms, fn) {
  try {
    const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${ms})`], { type: "text/javascript" }));
    const w = new Worker(url); URL.revokeObjectURL(url); w.onmessage = fn;
    return () => w.terminate();
  } catch (_) { const t = setInterval(fn, ms); return () => clearInterval(t); }
}

/* ---------- the relay: a PeerJS server, used only to pass connection offers between browsers ----------
 * Messages travel as one opaque string (base64), so nothing in them looks like a call being set up: some school
 * and office networks cut a connection the moment they see that. When it connects, the relay tries the ways the
 * server can pass a message on, sending a note to itself, and keeps the first one that arrives intact. */
const WAYS = ["CANDIDATE", "LEAVE", "EXPIRE", "OFFER"]; // CANDIDATE first: only it gets "nobody has that code" back from the server
const pack = (o) => "~" + toB64(new TextEncoder().encode(JSON.stringify(o)));
const unpack = (s) => JSON.parse(new TextDecoder().decode(fromB64(s.slice(1))));
class Relay {
  constructor(url, id, token) { this.url = url; this.id = id; this.token = token; this.handlers = {}; }
  on(type, fn) { this.handlers[type] = fn; return this; }
  /** One WebSocket to the server, resolved once it says OPEN. */
  socket(timeout = 9000) {
    return new Promise((ok, fail) => {
      const u = this.url + (this.url.includes("?") ? "&" : "?key=peerjs&") + `id=${encodeURIComponent(this.id)}&token=${this.token}`;
      let done = false; const finish = (f, v) => { if (!done) { done = true; clearTimeout(t); f(v); } };
      const t = setTimeout(() => { finish(fail, new Error("The lobby server did not answer")); try { ws.close(); } catch (_) {} }, timeout);
      let ws; try { ws = this.ws = new WebSocket(u); } catch (e) { return finish(fail, new Error("Could not reach the lobby server")); }
      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch (_) { return; }
        if (m.type === "OPEN") { this.stopBeat?.(); this.stopBeat = ticker(5000, () => this.raw({ type: "HEARTBEAT" })); return finish(ok); }
        if (m.type === "ID-TAKEN") return finish(fail, Object.assign(new Error("taken"), { taken: true }));
        if (m.type === "ERROR") return finish(fail, new Error(m.payload?.msg || "The lobby server refused the connection"));
        let k = m.type, p = m.payload || {};
        if (typeof m.payload === "string" && m.payload[0] === "~") { try { const o = unpack(m.payload); k = o.k; p = o.p || {}; } catch (_) { return; } }
        else if (m.type === "EXPIRE") k = "EXPIRE"; // the server's own note: nobody has that code
        else if (m.payload && typeof m.payload === "object" && m.payload.x === "self") k = "SELF";
        if (k === "SELF" && m.src === this.id) { this.lastSelf = Date.now(); this.echoes = true; this.gotSelf?.(); return; }
        this.handlers[k]?.(m.src, p);
      };
      ws.onerror = () => { log("lobby server: connection error"); finish(fail, new Error("Could not reach the lobby server")); };
      ws.onclose = (e) => {
        this.stopBeat?.(); this.closedNow?.();
        if (!this.probing) log(`lobby server: disconnected (${e?.code || "?"})`);
        if (done && !this.probing && ws === this.ws) this.handlers.CLOSED?.();
        finish(fail, new Error("The lobby server closed the connection"));
      };
    });
  }
  /** Connects, and finds a way of sending that the server (and the network on the way) lets through. */
  async open() {
    const saved = (() => { try { return JSON.parse(localStorage.getItem("dexna:collabWay")); } catch (_) { return null; } })();
    const order = [...new Set([saved, ...WAYS].filter((w) => WAYS.includes(w)))];
    this.probing = true;
    try {
      for (const way of order) {
        if (this.ws?.readyState !== 1) await this.socket();
        const ok = await new Promise((done) => {
          const t = setTimeout(() => done(false), 2500);
          this.gotSelf = () => { clearTimeout(t); done(true); };
          this.closedNow = () => { clearTimeout(t); done(false); };
          this.way = way; this.send("SELF", this.id, {});
        });
        this.gotSelf = this.closedNow = null;
        if (ok && this.ws?.readyState === 1) {
          // a note can arrive just before the connection is cut, so make sure it is still up a moment later
          await new Promise((r) => setTimeout(r, 300));
          if (this.ws?.readyState === 1) { try { localStorage.setItem("dexna:collabWay", JSON.stringify(way)); } catch (_) {} log(`lobby server: connected as ${this.id.replace(/^dexna(lobby|guest)/, "")}${way !== WAYS[0] ? ` (way ${way.toLowerCase()})` : ""}`); return; }
        }
        log(`lobby server: way ${way.toLowerCase()} did not get through${this.ws?.readyState === 1 ? "" : ", the connection was cut"}`);
      }
      try { this.ws?.close(); } catch (_) {}
      throw new Error("Your network cuts the connection to the lobby server (school and work networks often do). Try another network, like a phone hotspot");
    } finally { this.probing = false; }
  }
  raw(m) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }
  send(kind, dst, payload) { this.raw({ type: this.way || WAYS[0], dst, payload: pack({ k: kind, p: payload }) }); }
  get ok() { return this.ws?.readyState === 1; }
  /** Sends a note to itself through the server: if it does not come back, the connection is dead even if it looks open. */
  selfCheck() { this.send("SELF", this.id, {}); }
  close() { this.stopBeat?.(); this.closed = true; try { this.ws.onclose = null; this.ws.close(); } catch (_) {} }
}

export function createCollab(A) {
  const { h, toast, LS } = A;
  let Y = null, S = null, seq = 0;
  const M = () => A.monaco, ed = () => A.editor;
  const relayUrl = () => (A.settings.collabRelay || A.cfg.collabRelay || "wss://0.peerjs.com/peerjs?key=peerjs").trim();
  const esc = (s) => String(s).replace(/[\\"\n]/g, " ");
  const isHost = () => S?.role === "host";
  const ice = () => { const t = parseTurn(A.settings.collabTurn); return { iceServers: t ? [...STUN, t] : STUN }; };
  const hostId = () => "dexnalobby" + S.code;

  /* =================== when a direct connection is blocked: the lobby server carries the data =================== */
  /** A stand-in for a data channel that sends through the lobby server's WebSocket. */
  function relayChannel(peer, label) {
    return { label, readyState: "open", bufferedAmount: 0, binaryType: "arraybuffer", relayed: true,
      send(data) {
        if (this.readyState !== "open" || !S) return;
        const p = { cid: peer.cid, x: "d", l: label };
        if (typeof data === "string") p.s = data; else p.b = toB64(data instanceof Uint8Array ? data : new Uint8Array(data));
        S.relay.send("CANDIDATE", isHost() ? peer.src : hostId(), p);
      },
      close() { this.readyState = "closed"; } };
  }
  function useRelay(peer) {
    for (const c of [peer.ch, peer.fast]) if (c && !c.relayed) { c.onopen = c.onclose = c.onmessage = null; }
    try { peer.pc?.close(); } catch (_) {}
    peer.relayMode = true; peer.open = false; peer.seen = Date.now();
    peer.pc = { close() {}, connectionState: "relayed", remoteDescription: true, addIceCandidate: async () => {} };
    hookChannel(peer, relayChannel(peer, "dexna"));
    hookChannel(peer, relayChannel(peer, "fast"));
  }
  /** The guest asks for it after waiting for a direct connection; the host agrees if it knows the guest. */
  function fallBack(peer) {
    if (!S || isHost() || !S.relay || peer.relayMode || peer.open || S.connecting !== peer) return;
    S.status = "Direct connection blocked, connecting through the lobby server…"; ui();
    log("no direct connection yet, asking to go through the lobby server");
    S.relay.send("CANDIDATE", hostId(), { cid: peer.cid, x: "open" });
    clearTimeout(S.relayTimer);
    S.relayTimer = setTimeout(() => { if (S && S.connecting === peer && !peer.open) failJoin("Could not connect to the lobby. Check your internet connection and try again."); }, 12000);
  }
  function onRelayed(src, p) {
    if (isHost()) {
      const peer = S.peers.get(src); if (!peer || peer.cid !== p.cid) return;
      if (p.x === "open") { if (!peer.relayMode) { log(`${peer.name}: going through the lobby server`); useRelay(peer); } S.relay.send("CANDIDATE", src, { cid: p.cid, x: "ok" }); return; }
      if (p.x === "d" && peer.relayMode) return deliver(peer, p);
      if (p.x === "close") return peerGone(peer, true);
    } else {
      const peer = S.connecting?.cid === p.cid ? S.connecting : S.hostPeer?.cid === p.cid ? S.hostPeer : null; if (!peer) return;
      if (p.x === "ok" && !peer.relayMode) { clearTimeout(S.relayTimer); S.viaRelay = true; S.peers.set("host", peer); useRelay(peer); return; }
      if (p.x === "d" && peer.relayMode) return deliver(peer, p);
    }
  }
  function deliver(peer, p) {
    peer.seen = Date.now();
    const ch = p.l === "fast" ? peer.fast : peer.ch;
    if (!ch?.onmessage) return;
    ch.onmessage({ data: p.s != null ? p.s : fromB64(p.b).buffer });
  }
  // relayed connections have no "closed" event, so both sides say hello now and then and notice silence
  let watchdog = null;
  function startWatchdog() {
    clearInterval(watchdog);
    watchdog = setInterval(() => {
      if (!S) return clearInterval(watchdog);
      const now = Date.now();
      for (const p of [...S.peers.values()]) if (p.relayMode && p.open) {
        sendJson(p, { t: "ping" });
        if (now - (p.seen || now) > 35000) peerGone(p, true);
      }
    }, 10000);
  }

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
    const opened = () => { if (peer.open) return; peer.open = true; log(`${isHost() ? peer.name || "guest" : "host"}: connected${peer.relayMode ? " through the lobby server" : " directly"}`); if (!isHost()) { S.hostPeer = peer; sendJson(peer, { t: "hello", name: S.me.name, docId: S.docId || null }); } };
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
  async function openLobby({ name, edit, ask, noServer = false }) {
    if (!A.project) return;
    await loadYjs();
    const key = "collabLobby:" + A.project.id;
    let saved = LS.get(key, null), relay = null, code = saved?.code || rand(6);
    for (let tries = 0; !noServer; tries++) {
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
    if (relay) {
      relay.on("OFFER", onOffer).on("CANDIDATE", onCandidate).on("LEAVE", (src) => { const p = S?.peers.get(src); if (p) peerGone(p); }).on("CLOSED", () => reopenRelay());
      keepReachable();
    } else log("lobby opened without the lobby server: invite people with codes");
    bindDoc(); attach(); ui(); startWatchdog();
    toast(relay ? `Lobby ${showCode(code)} is open. Share the code or the link.` : "Lobby open. Invite people with an invite code.", "ok", 5000);
  }
  let reopening = false;
  async function reopenRelay() {
    if (!S || !isHost() || !S.relay || S.relay.closed || reopening) return;
    reopening = true; S.relayDown = true; ui();
    try {
      for (let i = 0; i < 40 && S && isHost(); i++) {
        await new Promise((r) => setTimeout(r, Math.min(10000, 500 * 2 ** i)));
        if (!S) return;
        const saved = LS.get("collabLobby:" + S.projectId, null), r = new Relay(relayUrl(), "dexnalobby" + S.code, saved?.token || rand(16));
        r.handlers = S.relay.handlers;
        try { await r.open(); S.relay = r; r.lastSelf = Date.now(); S.relayDown = false; log("lobby server: the lobby is reachable again"); ui(); return; } catch (e) { log("lobby server: reconnect failed: " + e.message); }
      }
    } finally { reopening = false; }
  }
  /** Every 20 seconds (and when the tab comes back or the network returns) the host checks the lobby server can still
   * reach it, and reconnects if not. Without this a lobby can look open while nobody is able to join. */
  let stopReach = null;
  function keepReachable() {
    stopReach?.();
    const check = () => {
      if (!S || !isHost()) return stopReach?.();
      const r = S.relay;
      if (!r.ok) { if (!reopening) { log("lobby server: not connected, reconnecting"); reopenRelay(); } return; }
      // only once this server has shown that it passes these notes back
      if (r.echoes && Date.now() - r.lastSelf > 50000) { log("lobby server: stopped answering, reconnecting"); try { r.ws.close(); } catch (_) {} return; }
      r.selfCheck();
    };
    S.relay.lastSelf = Date.now(); S.relay.selfCheck();
    const stopTick = ticker(20000, check);
    const now = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", now); addEventListener("online", check);
    stopReach = () => { stopTick(); document.removeEventListener("visibilitychange", now); removeEventListener("online", check); stopReach = null; };
  }
  const count = () => 1 + active().length;
  function onOffer(src, p) {
    if (!S || !isHost() || !p.sdp) return;
    const same = S.peers.get(src);
    if (same && same.cid === p.cid) { if (same.answer) S.relay.send("ANSWER", src, { cid: p.cid, sdp: same.answer }); return; } // a repeat of an offer already being answered
    log(`${p.name || "someone"} asked to join`);
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
    const pc = new RTCPeerConnection(ice()), peer = { id: src, src, cid: p.cid, pc, name: String(p.name || "Guest").slice(0, 24), edit: S.defaultEdit, active: false };
    S.peers.set(src, peer);
    pc.onicecandidate = (e) => e.candidate && S?.relay.send("CANDIDATE", src, { cid: p.cid, c: e.candidate.toJSON() });
    pc.ondatachannel = (e) => hookChannel(peer, e.channel);
    pc.onconnectionstatechange = () => { if (pc.connectionState === "failed" && peer.open && !peer.relayMode) peerGone(peer); }; // before it opens, the guest may still switch to the lobby server
    pc.oniceconnectionstatechange = () => log(`${peer.name}: connection ${pc.iceConnectionState}`);
    try {
      await pc.setRemoteDescription({ type: "offer", sdp: p.sdp });
      for (const c of S.cands.get(src)?.filter((x) => x.cid === p.cid) || []) pc.addIceCandidate(c.c).catch(() => {});
      S.cands.delete(src);
      const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
      peer.answer = ans.sdp;
      S.relay.send("ANSWER", src, { cid: p.cid, sdp: ans.sdp });
      log(`answered ${peer.name}`);
    } catch (e) { log(`could not answer ${peer.name}: ${e.message}`); S.peers.delete(src); }
  }
  function onCandidate(src, p) {
    if (!S) return;
    if (p.x) return onRelayed(src, p);
    if (!p.c) return;
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

  /* =================== no server: an invite code from the host, a reply code from the guest =================== */
  async function manualInvite() {
    if (!S || !isHost()) return null;
    if (count() >= MAX_PEOPLE) throw new Error(`The lobby is full (${MAX_PEOPLE} people).`);
    const id = "m" + rand(8, "abcdefghijklmnopqrstuvwxyz0123456789"), pc = new RTCPeerConnection(ice());
    const peer = { id, src: id, cid: id, pc, name: "Guest", edit: S.defaultEdit, active: false, manual: true };
    S.peers.set(id, peer);
    hookChannel(peer, pc.createDataChannel("dexna"));
    hookChannel(peer, pc.createDataChannel("fast", { ordered: false, maxRetransmits: 0 }));
    pc.oniceconnectionstatechange = () => log(`invite ${id.slice(1, 5)}: connection ${pc.iceConnectionState}`);
    pc.onconnectionstatechange = () => { if (pc.connectionState === "failed") peerGone(peer); };
    await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc);
    const types = (pc.localDescription.sdp.match(/typ (host|srflx|relay)/g) || []).map((x) => x.slice(4));
    log(`made an invite code (ways to reach this computer: ${types.join(", ") || "none"})`);
    const code = await packCode({ v: 1, k: "invite", sdp: pc.localDescription.sdp, host: S.me.name, project: A.project.name });
    return { peer, code, accept: async (reply) => {
      const d = await unpackCode(reply);
      if (d.k !== "reply") throw new Error(d.k === "invite" ? "That is an invite code. Paste the reply your friend sent back." : "That is not a reply code");
      await pc.setRemoteDescription({ type: "answer", sdp: d.sdp }); log("got the reply code, connecting");
    } };
  }
  async function joinManual(invite, name) {
    const d = await unpackCode(invite);
    if (d.k !== "invite") throw new Error(d.k === "reply" ? "That is a reply code. Paste the invite code the host sent you." : "That is not an invite code");
    await loadYjs();
    const pc = new RTCPeerConnection(ice()), peer = { id: "host", cid: "manual", pc, active: true, manual: true };
    S = { role: "guest", code: "", relay: null, me: { id: null, name, color: COLORS[1] }, peers: new Map([["host", peer]]), remote: {}, people: {}, chat: [], term: [], unread: 0, shareMouse: true, shareRun: true, following: null, applying: false, joining: true, status: "Making your reply code…", manual: true, hostName: d.host };
    S.connecting = peer; ui();
    pc.ondatachannel = (e) => hookChannel(peer, e.channel);
    pc.oniceconnectionstatechange = () => log(`host: connection ${pc.iceConnectionState}`);
    pc.onconnectionstatechange = () => { if (pc.connectionState === "failed" && !peer.open) { log("the direct connection failed"); S.status = "Could not connect directly. Your network or Chromebook may block direct connections: try Check my network."; S.failed = true; ui(); } };
    await pc.setRemoteDescription({ type: "offer", sdp: d.sdp });
    await pc.setLocalDescription(await pc.createAnswer()); await waitIce(pc);
    S.reply = await packCode({ v: 1, k: "reply", sdp: pc.localDescription.sdp });
    S.status = `Send this reply code back to ${d.host || "the host"}, then wait here.`; log("made a reply code"); ui();
  }

  /* =================== Check my network: what this network and browser allow =================== */
  async function networkCheck(out) {
    const say = (ok, text) => { out.push([ok, text]); log(`check: ${ok === true ? "yes" : ok === false ? "no" : "?"}, ${text}`); render?.(); };
    let render = null; const lines = () => out;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // 1. the lobby server
    try { const r = new Relay(relayUrl(), "dexnatest" + rand(10, "abcdefghijklmnopqrstuvwxyz0123456789"), rand(16)); await r.open(); r.close(); say(true, "The lobby server works: lobby codes and links work on this network."); }
    catch (e) { say(false, "The lobby server is blocked or cut off: " + e.message.replace(/\. Try another network.*$/, "") + "."); }
    // 2. direct connections inside this computer (turned off by some managed Chromebooks)
    let local = false;
    try {
      const a = new RTCPeerConnection(), b = new RTCPeerConnection();
      a.onicecandidate = (e) => e.candidate && b.addIceCandidate(e.candidate).catch(() => {}); b.onicecandidate = (e) => e.candidate && a.addIceCandidate(e.candidate).catch(() => {});
      const ch = a.createDataChannel("t"); const got = new Promise((ok) => { b.ondatachannel = (e) => { e.channel.onmessage = () => ok(true); }; });
      ch.onopen = () => ch.send("hi");
      await a.setLocalDescription(await a.createOffer()); await b.setRemoteDescription(a.localDescription); await b.setLocalDescription(await b.createAnswer()); await a.setRemoteDescription(b.localDescription);
      local = await Promise.race([got, sleep(6000).then(() => false)]); a.close(); b.close();
    } catch (_) { local = false; }
    say(local, local ? "Direct (peer to peer) connections are allowed in this browser." : "This browser does not allow direct (peer to peer) connections. A school or work Chromebook can have them turned off.");
    // 3. reaching the internet directly (what a connection between two networks needs)
    try {
      const pc = new RTCPeerConnection(ice()); pc.createDataChannel("t"); const kinds = new Set();
      pc.onicecandidate = (e) => { const m = /typ (\w+)/.exec(e.candidate?.candidate || ""); if (m) kinds.add(m[1]); };
      await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc, 5000); pc.close();
      const pub = kinds.has("srflx") || kinds.has("relay");
      say(pub ? true : null, pub ? "Direct connections can go out to the internet (friends on other networks can connect)." : "Direct connections cannot go out to the internet from this network, so only people on the same Wi-Fi can connect directly.");
    } catch (_) {}
    return lines;
  }

  /* =================== a guest: joining a lobby =================== */
  async function joinLobby(code, name) {
    await loadYjs();
    const relay = new Relay(relayUrl(), "dexnaguest" + rand(12, "abcdefghijklmnopqrstuvwxyz0123456789"), rand(16, "abcdefghijklmnopqrstuvwxyz0123456789"));
    startWatchdog();
    S = { role: "guest", code, relay, me: { id: null, name, color: COLORS[1] }, peers: new Map(), remote: {}, people: {}, chat: [], term: [], unread: 0, shareMouse: true, shareRun: true, following: null, applying: false, joining: true, status: "Connecting…" };
    ui();
    await relay.open();
    relay.on("ANSWER", onAnswer).on("CANDIDATE", onCandidate).on("EXPIRE", () => failJoin("No lobby with that code is open right now. Check the code, or ask the host to open it again.")).on("CLOSED", () => { if (S?.hostPeer?.relayMode) peerGone(S.hostPeer); });
    await connect();
  }
  async function connect() {
    if (!S || isHost()) return;
    if (S.relay.ws?.readyState !== 1) { const r = new Relay(relayUrl(), S.relay.id, S.relay.token); r.handlers = S.relay.handlers; await r.open(); S.relay = r; }
    S.viaRelay = false; clearTimeout(S.directTimer); clearTimeout(S.relayTimer);
    const cid = rand(10), pc = new RTCPeerConnection(ice()), peer = { id: "host", cid, pc, active: true };
    S.connecting = peer; S.candQ = [];
    hookChannel(peer, pc.createDataChannel("dexna"));
    hookChannel(peer, pc.createDataChannel("fast", { ordered: false, maxRetransmits: 0 }));
    pc.onicecandidate = (e) => e.candidate && S?.relay.send("CANDIDATE", "dexnalobby" + S.code, { cid, c: e.candidate.toJSON() });
    pc.onconnectionstatechange = () => { if (pc.connectionState === "failed") { if (peer.open) peerGone(peer); else fallBack(peer); } };
    pc.oniceconnectionstatechange = () => log(`host: connection ${pc.iceConnectionState}`);
    await pc.setLocalDescription(await pc.createOffer());
    const offer = { cid, sdp: pc.localDescription.sdp, name: S.me.name };
    const ask = (n) => { if (!S || S.connecting !== peer || peer.answered || S.waiting) return; if (S.relay.ok) S.relay.send("OFFER", hostId(), offer); log(n ? `asked again to join ${showCode(S.code)}` : `asked to join ${showCode(S.code)}`); };
    ask(0);
    clearTimeout(S.answerTimer); clearInterval(S.askTimer);
    let n = 0; S.askTimer = setInterval(() => { if (++n > 4) return clearInterval(S.askTimer); ask(n); }, 4000); // in case the first one was lost
    S.answerTimer = setTimeout(() => { clearInterval(S.askTimer); if (S && !S.waiting && !peer.answered && S.connecting === peer) failJoin(`Lobby ${showCode(S.code)} did not answer. Check that the host still has Dexna open with this code showing in the Live panel, then try again.`); }, 22000);
  }
  async function onAnswer(src, p) {
    const peer = S?.connecting; if (!peer || p.cid !== peer.cid || peer.answered) return;
    if (p.deny) { log("the host said no: " + p.deny); return failJoin(p.deny); }
    if (p.wait) { if (!S.waiting) log("waiting for the host to let you in"); S.waiting = true; clearInterval(S.askTimer); S.status = "Waiting for the host to let you in…"; return ui(); }
    peer.answered = true; clearInterval(S.askTimer); clearTimeout(S.answerTimer);
    log("the host answered, connecting directly");
    S.waiting = false; S.status = S.projectId ? "Reconnecting…" : "Connecting…"; ui();
    await peer.pc.setRemoteDescription({ type: "answer", sdp: p.sdp });
    for (const c of S.candQ.filter((x) => x.cid === peer.cid)) peer.pc.addIceCandidate(c.c).catch(() => {});
    S.candQ = [];
    S.peers.set("host", peer);
    clearTimeout(S.directTimer);
    S.directTimer = setTimeout(() => fallBack(peer), DIRECT_WAIT);
  }
  function failJoin(msg) {
    if (!S || isHost()) return;
    if (S.projectId && !S.ended) { S.status = "Reconnecting…"; ui(); return scheduleReconnect(); } // was in already: keep trying
    toast(msg, "warn", 7000); log("gave up: " + msg); const s = S; S = null; clearTimeout(s.directTimer); clearTimeout(s.relayTimer); clearInterval(s.askTimer); clearInterval(watchdog); s.relay?.close(); try { s.connecting?.pc.close(); } catch (_) {}
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
    peer.seen = Date.now();
    if (m.t === "ping") return;
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
      if (!S.relay && !S.ended && S.projectId) { toast("The connection to the host was lost. Your copy of the project is kept; join again with a new invite code.", "warn", 8000); return endSession(); }
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
    const gap = S.viaRelay || [...S.peers.values()].some((p) => p.relayMode) ? 110 : 30;
    if (t - lastMouse < gap) { mouseTimer = setTimeout(() => onMouseMove(e), gap + 4); return; }
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
    clearInterval(watchdog);
    const s = S; setTimeout(() => { if (S === s) endSession(); }, 150);
  }
  function endSession() {
    if (!S) return;
    const s = S; S = null;
    clearTimeout(s.retry); clearTimeout(s.answerTimer); clearInterval(s.askTimer); clearTimeout(s.directTimer); clearTimeout(s.relayTimer); clearInterval(watchdog); stopReach?.();
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
  /** The connection log, folded away, with a Copy button: what to send when something does not work. */
  function detailsBox(open = false) {
    const pre = h("pre", { class: "lv-log-text" });
    const fill = () => { pre.textContent = logs.length ? logs.join("\n") : "Nothing yet."; pre.scrollTop = pre.scrollHeight; };
    const box = h("details", { class: "lv-log", open: open || null }, h("summary", {}, "Connection details"), pre,
      h("button", { class: "btn sm", onclick: (e) => copy(`Dexna Live, ${navigator.userAgent}\n${logs.join("\n")}`, e.currentTarget) }, "Copy"));
    fill(); logListeners.add(() => { if (!document.body.contains(box)) return; fill(); });
    return box;
  }
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
      else { s.classList.remove("hidden"); const n = people(); s.textContent = `Live ${S.relay ? showCode(S.code) + " " : ""}· ${n} ${n === 1 ? "person" : "people"}${S.readOnly ? " · view only" : ""}${S.status ? " · " + S.status : ""}`; }
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
    const code = h("input", { class: "lv-input lv-code-in", placeholder: "K7M-2QX or invite code", spellcheck: "false", autocomplete: "off" });
    const err = h("div", { class: "lv-err" }, joinError); joinError = "";
    const nm = () => { const n = name.value.trim(); if (!n) { name.focus(); name.classList.add("bad"); err.textContent = "Type your name first, so the others know who you are."; return null; } LS.set("collabName", n); return n; };
    const create = h("button", { class: "btn primary lv-big" }, "Create a private lobby");
    create.onclick = async () => {
      const n = nm(); if (!n) return; LS.set("collabEdit", edit.checked); LS.set("collabAsk", ask.checked);
      create.disabled = true; create.textContent = "Opening…"; err.textContent = "";
      try { await openLobby({ name: n, edit: edit.checked, ask: ask.checked }); } catch (e) { S = null; err.textContent = `${e.message}. You can still host with invite codes, which need no server.`; create.disabled = false; create.textContent = "Create a private lobby"; }
    };
    const noServer = h("button", { class: "btn lv-link", title: "For networks that block the lobby server: you send an invite code, your friend sends a reply code, and your computers connect directly" }, "Host with invite codes (no server)");
    noServer.onclick = async () => {
      const n = nm(); if (!n) return; LS.set("collabEdit", edit.checked);
      try { await openLobby({ name: n, edit: edit.checked, ask: false, noServer: true }); setTimeout(showInvite, 50); } catch (e) { S = null; err.textContent = e.message; }
    };
    const join = h("button", { class: "btn primary" }, "Join");
    const doJoin = async () => {
      const n = nm(); if (!n) return; const c = normCode(code.value);
      if (!c && code.value.trim().startsWith("DX")) { err.textContent = ""; try { await joinManual(code.value, n); } catch (e) { const s = S; S = null; try { s?.connecting?.pc.close(); } catch (_) {} joinError = e.message; ui(); } return; }
      if (!c) { err.textContent = "That is not a lobby code. Codes look like K7M-2QX, invite codes start with DX."; code.focus(); return; }
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
        create, noServer,
        h("button", { class: "btn lv-link", onclick: () => A.runCommand?.("gh-open") }, gh ? "Use a different GitHub repository…" : "Start from a GitHub repository…")),
      err, h("button", { class: "btn lv-link", onclick: showNetworkCheck }, "Check my network"), logs.length ? detailsBox(!!err.textContent) : null,
      h("p", { class: "muted small lv-foot" }, "Lobbies are private: only people with the code or link can join. Your browsers connect to each other directly; a lobby server only introduces them. On networks that block it, host with invite codes instead: no server at all."));
  }
  function joiningView() {
    const reply = S.reply ? Object.assign(h("textarea", { class: "lv-input lv-codearea", readonly: true, rows: 4, onfocus: (e) => e.target.select() }), { value: S.reply }) : null;
    return h("div", { class: "lv-idle" }, h("div", { class: "lv-hero" }, h("div", { class: "lv-hero-t" }, S.manual ? `Joining ${S.hostName || "the host"}` : `Joining ${showCode(S.code)}`), h("div", { class: "lv-wait" + (S.failed ? " bad" : "") }, S.failed ? null : h("span", { class: "lv-spin" }), S.status || "Connecting…")),
      reply ? h("div", { class: "lv-card" }, h("div", { class: "lv-card-t" }, "Your reply code"), reply, h("div", { class: "lv-row" }, h("button", { class: "btn primary", onclick: (e) => copy(S.reply, e.currentTarget) }, "Copy reply code"))) : null,
      S.failed ? h("button", { class: "btn lv-link", onclick: showNetworkCheck }, "Check my network") : null,
      h("button", { class: "btn", onclick: () => { const s = S; S = null; clearTimeout(s.answerTimer); clearInterval(s.askTimer); s.relay?.close(); try { s.connecting?.pc.close(); } catch (_) {} ui(); } }, "Cancel"), detailsBox());
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
      detailsBox(),
      h("button", { class: "btn danger lv-leave", onclick: () => { const host = isHost(); leave(); toast(host ? "You closed the lobby" : "You left the lobby. Your copy of the project is kept.", "info"); } }, isHost() ? "Close the lobby" : "Leave the lobby"));
    setTimeout(() => { renderChat(); renderTerm(); }, 0);
    return node;
  }
  function renderHead() {
    if (!els.head) return;
    const code = showCode(S.code), link = linkFor(S.code);
    const inviteBtn = isHost() ? h("button", { class: "btn sm" + (S.relay ? "" : " primary"), title: "An invite code works with no server, on networks that block the lobby server", onclick: showInvite }, S.relay ? "Invite with a code" : "Invite someone") : null;
    if (!S.relay) {
      els.head.replaceChildren(
        h("div", { class: "lv-codebox" }, h("div", { class: "muted small" }, isHost() ? "Your lobby (no server)" : `${S.host?.name || "Host"}'s lobby`), h("div", { class: "lv-nocode" }, isHost() ? "People join with an invite code" : "Connected with an invite code"), isHost() ? h("div", { class: "lv-row" }, inviteBtn) : null),
        h("div", { class: "lv-state small" }, isHost() ? `${count()} of ${MAX_PEOPLE} people · directly connected, no server` : (S.readOnly ? "You can watch but not edit" : "Connected, you can edit") + " · directly, no server"));
      els.pending.replaceChildren();
      return;
    }
    els.head.replaceChildren(
      h("div", { class: "lv-codebox" }, h("div", { class: "muted small" }, isHost() ? "Your lobby" : `${S.host?.name || "Host"}'s lobby`), h("div", { class: "lv-code" }, code),
        h("div", { class: "lv-row" }, h("button", { class: "btn sm", onclick: (e) => copy(code, e.currentTarget) }, "Copy code"), h("button", { class: "btn sm", onclick: (e) => copy(link, e.currentTarget) }, "Copy link"), A.showQr ? h("button", { class: "btn sm", onclick: () => A.showQr(link, `Scan to join ${code}`) }, "QR") : null)),
      h("div", { class: "lv-state small" + (S.status || (isHost() && S.relayDown) ? " warn" : "") }, S.status || (isHost() && S.relayDown ? "Reconnecting to the lobby server, so nobody can join this moment…" : isHost() ? `${count()} of ${MAX_PEOPLE} people${S.locked ? " · locked" : ""}${S.ask ? " · you let people in" : ""}` : (S.readOnly ? "You can watch but not edit" : "Connected, you can edit") + (S.viaRelay ? " · through the lobby server, as a direct connection was blocked" : " · directly"))),
      isHost() ? h("div", { class: "lv-row" },
        h("button", { class: "btn sm" + (S.locked ? " primary" : ""), title: "Stop new people from joining", onclick: () => { S.locked = !S.locked; sendRoster(); ui(); } }, S.locked ? "Locked" : "Lock"),
        h("button", { class: "btn sm" + (S.ask ? " primary" : ""), title: "Ask before letting someone in", onclick: () => { S.ask = !S.ask; LS.set("collabAsk", S.ask); ui(); } }, S.ask ? "Asking first" : "Ask first"), inviteBtn) : "");
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
        h("div", { class: "lv-who" }, h("div", { class: "lv-pname" }, p.name, me ? h("span", { class: "muted" }, " (you)") : null, p.host ? h("span", { class: "lv-tag" }, "host") : null, p.edit === false ? h("span", { class: "lv-tag" }, "view only") : null, isHost() && S.peers.get(p.id)?.relayMode ? h("span", { class: "lv-tag", title: "A direct connection was blocked, so this goes through the lobby server" }, "via server") : null),
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

  /** Host: an invite code to send, and a box for the reply that comes back. */
  async function showInvite() {
    if (!S || !isHost()) return;
    const status = h("div", { class: "lv-wait" }, h("span", { class: "lv-spin" }), "Making an invite code…");
    const body = h("div", {}, status);
    A.openModal(h("div", { class: "modal lv-invite" }, h("div", { class: "modal-head" }, "Invite someone with a code"), h("div", { class: "modal-body" }, body), h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: () => A.closeModal() }, "Close"))));
    let inv; try { inv = await manualInvite(); } catch (e) { status.replaceChildren(e.message); return; }
    const invite = Object.assign(h("textarea", { class: "lv-input lv-codearea", readonly: true, rows: 4, onfocus: (e) => e.target.select() }), { value: inv.code });
    const reply = h("textarea", { class: "lv-input lv-codearea", rows: 4, placeholder: "Paste their reply code here (it starts with DX)" });
    const msg = h("div", { class: "lv-err" }), go = h("button", { class: "btn primary" }, "Connect");
    go.onclick = async () => { msg.textContent = ""; try { go.disabled = true; await inv.accept(reply.value); msg.className = "muted small"; msg.textContent = "Connecting…"; } catch (e) { go.disabled = false; msg.className = "lv-err"; msg.textContent = e.message; } };
    const watch = setInterval(() => {
      if (!document.body.contains(msg)) return clearInterval(watch);
      if (inv.peer.active) { clearInterval(watch); msg.className = "lv-ok"; msg.textContent = `${inv.peer.name} joined. You can close this, or invite someone else.`; }
      else if (inv.peer.pc.connectionState === "failed") { clearInterval(watch); msg.className = "lv-err"; msg.textContent = "Could not connect directly. One of your networks or Chromebooks blocks direct connections: try Check my network on both."; }
    }, 300);
    body.replaceChildren(
      h("p", { class: "muted small" }, "No server is used: your computers connect directly. This works best when you are on the same Wi-Fi, like the same school network."),
      h("div", { class: "lv-card-t" }, "1. Send this invite code to your friend"), invite,
      h("div", { class: "lv-row" }, h("button", { class: "btn", onclick: (e) => copy(inv.code, e.currentTarget) }, "Copy invite code")),
      h("div", { class: "lv-card-t", style: { marginTop: "12px" } }, "2. They paste it in Live > Join and send you back a reply code. Paste it here:"), reply,
      h("div", { class: "lv-row" }, go), msg);
  }
  async function showNetworkCheck() {
    const list = h("div", { class: "lv-check-list" }, h("div", { class: "lv-wait" }, h("span", { class: "lv-spin" }), "Checking, this takes about 15 seconds…"));
    const verdict = h("div", { class: "lv-verdict" });
    A.openModal(h("div", { class: "modal lv-invite" }, h("div", { class: "modal-head" }, "Check my network"), h("div", { class: "modal-body" }, list, verdict),
      h("div", { class: "modal-foot" }, h("button", { class: "btn", onclick: (e) => copy(`Dexna network check, ${navigator.userAgent}\n${logs.filter((l) => l.includes("check:")).join("\n")}`, e.currentTarget) }, "Copy results"), h("button", { class: "btn primary", onclick: () => A.closeModal() }, "Close"))));
    const out = []; await networkCheck(out);
    list.replaceChildren(...out.map(([ok, text]) => h("div", { class: "lv-check-row" }, h("span", { class: "lv-mark " + (ok === true ? "yes" : ok === false ? "no" : "maybe") }, ok === true ? "Yes" : ok === false ? "No" : "Limited"), h("span", {}, text))));
    const [server, local, internet] = out.map((x) => x[0]);
    verdict.textContent = server ? "Use lobby codes: they work here." : local ? (internet ? "Use invite codes (Host with invite codes): they need no server and should work here." : "Use invite codes (Host with invite codes), with everyone on the same Wi-Fi, like the same school network.") : "Live cannot connect from this device on this network, because direct connections are turned off here. A personal device, or a home network or phone hotspot, will work.";
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
