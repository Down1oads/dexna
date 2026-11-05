/*
 * Dexna cross-origin isolation service worker.
 *
 * GitHub Pages cannot send the COOP/COEP headers that SharedArrayBuffer needs.
 * This worker re-serves every response with those headers so the page becomes
 * crossOriginIsolated, which enables: input(), the Stop button (interrupts) and
 * the step debugger.
 */
if (typeof window === "undefined") {
  // ---- Service worker context ----
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

  self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;

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
