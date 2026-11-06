// Runs the Assistant's model (WebLLM on WebGPU) off the main thread, so the editor never freezes.
// The library URL comes from the page (?lib=...). Messages that arrive while it loads are queued.
const lib = new URL(self.location.href).searchParams.get("lib");
const queue = [];
let handler = null;
self.onmessage = (msg) => (handler ? handler.onmessage(msg) : queue.push(msg));

import(lib).then(({ WebWorkerMLCEngineHandler }) => {
  handler = new WebWorkerMLCEngineHandler();
  for (const msg of queue.splice(0)) handler.onmessage(msg);
}).catch((e) => {
  self.postMessage({ dexnaLoadError: String(e?.message || e) });
});
