// Same-origin shim so Monaco's helper workers are covered by the COI service worker.
const base = new URL(self.location.href).searchParams.get("base");
self.MonacoEnvironment = { baseUrl: base };
importScripts(base + "vs/base/worker/workerMain.js");
