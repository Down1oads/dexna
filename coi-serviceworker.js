/*
 * Dexna cross-origin isolation service worker.
 *
 * GitHub Pages cannot send the COOP/COEP headers that SharedArrayBuffer needs.
 * This worker re-serves every response with those headers so the page becomes
 * crossOriginIsolated, which enables: input(), the Stop button (interrupts) and
 * the step debugger.
 *
 * It also keeps a copy of what Dexna loads, so it works without a connection:
 * - Dexna's own files: from the network first (so updates arrive at once), the copy when offline.
 * - Libraries and runtimes from CDNs (jsDelivr, esm.sh, cdnjs, unpkg, Google Fonts, Python wheels):
 *   the copy first (fast, and they rarely change), refreshed in the background.
 * Nothing else is kept: online compilers, package searches and your own HTTP requests always go
 * to the network.
 */
if (typeof window === "undefined") {
  // ---- Service worker context ----
  const CACHE = "dexna-offline-v1";
  const CDN = /^https:\/\/(cdn\.jsdelivr\.net|esm\.sh|cdnjs\.cloudflare\.com|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|files\.pythonhosted\.org)\//;
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("dexna-offline-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })()));
  self.addEventListener("message", (e) => {
    if (e.data === "dexna:clear-cache") e.waitUntil(caches.delete(CACHE).then(() => e.source?.postMessage("dexna:cache-cleared")));
  });

  const isolate = (res) => {
    if (res.status === 0) return res;
    const headers = new Headers(res.headers);
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  };
  const keep = async (key, res) => { if (res.ok && res.status === 200 && res.type !== "opaque") { try { await (await caches.open(CACHE)).put(key, res); } catch (_) { /* storage full: carry on */ } } };

  self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;
    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;
    const cdn = !sameOrigin && CDN.test(req.url);

    if (req.method === "GET" && !req.headers.has("range") && (sameOrigin || cdn)) {
      event.respondWith((async () => {
        // Workers are started with ?v=<page load> so they always load fresh; the copy is kept without it
        let key = req.url;
        if (sameOrigin) { const u = new URL(req.url); u.hash = ""; u.searchParams.delete("v"); key = u.href; }
        const fromNet = async () => {
          let r;
          if (cdn && req.mode === "no-cors") { try { r = await fetch(new Request(req.url, { mode: "cors", credentials: "omit" })); } catch (_) { return fetch(req); } }
          // our own files are checked with the server every time (a quick "not modified" when nothing changed),
          // so a new version of Dexna reaches everyone right away instead of after the browser's cache runs out
          else if (sameOrigin) r = await fetch(req.url, { cache: "no-cache", credentials: "same-origin" });
          else r = await fetch(req);
          event.waitUntil(keep(key, r.clone()));
          return r;
        };
        if (sameOrigin) {
          try { return isolate(await fromNet()); } catch (err) {
            const hit = await caches.match(key) || (req.mode === "navigate" ? await caches.match(new URL("./", self.location).href) || await caches.match(new URL("./index.html", self.location).href) : null);
            if (hit) return isolate(hit);
            throw err;
          }
        }
        const hit = await caches.match(key);
        if (hit) { event.waitUntil(fromNet().catch(() => {})); return isolate(hit); }
        return isolate(await fromNet());
      })());
      return;
    }

    event.respondWith((async () => {
      let request = req;
      const crossOrigin = new URL(req.url).origin !== self.location.origin;
      // Opaque (no-cors) responses can't be re-headered, so upgrade to CORS.
      if (crossOrigin && req.mode === "no-cors") {
        request = new Request(req.url, { mode: "cors", credentials: "omit" });
      }
      let res;
      try {
        res = await fetch(request);
      } catch (err) {
        if (request !== req) res = await fetch(req); // fall back to original
        else throw err;
      }
      if (res.status === 0) return res;

      const headers = new Headers(res.headers);
      headers.set("Cross-Origin-Embedder-Policy", "require-corp");
      headers.set("Cross-Origin-Opener-Policy", "same-origin");
      headers.set("Cross-Origin-Resource-Policy", "cross-origin");
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    })());
  });
} else {
  // ---- Page context: register and reload once so the SW controls the page ----
  (() => {
    if (window.crossOriginIsolated || !window.isSecureContext || !("serviceWorker" in navigator)) return;
    const KEY = "dexna-coi-reloaded";
    const script = document.currentScript && document.currentScript.src;
    navigator.serviceWorker.register(script).then((reg) => {
      const reloadOnce = () => {
        if (sessionStorage.getItem(KEY)) return; // avoid reload loops
        sessionStorage.setItem(KEY, "1");
        location.reload();
      };
      if (navigator.serviceWorker.controller) reloadOnce();
      else navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);
      reg.addEventListener("updatefound", () => {});
    }).catch((e) => console.warn("Dexna: COI service worker failed", e));
    // Clear the guard once we're isolated so future updates can reload again.
    window.addEventListener("load", () => { if (window.crossOriginIsolated) sessionStorage.removeItem(KEY); });
  })();
}
