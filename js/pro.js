// Error Lens: problems shown at the end of their line. REST client: .http files with requests you send
// from the editor and a response view (status, time, headers, formatted body).

const SAMPLE_HTTP = `# Requests to try. Click "Send request" above any request, or put the cursor in it and press Ctrl+Alt+R.
# Requests are separated by ###. Variables: @name = value, used as {{name}}.

@api = https://jsonplaceholder.typicode.com

### A list of posts
GET {{api}}/posts?_limit=3

### One post
GET {{api}}/posts/1
Accept: application/json

### Create a post
POST {{api}}/posts
Content-Type: application/json

{
  "title": "Hello from Dexna",
  "body": "Sent with the REST client",
  "userId": 1
}

### Your request headers, echoed back
GET https://httpbin.org/headers
X-Request-Id: {{$guid}}
`;

export function createPro(A) {
  const { h, toast } = A;

  /* =====================================================================
   * Error Lens
   * ===================================================================== */
  const lensDecos = new Map(); // model uri -> decoration ids
  function updateLens(model) {
    const mode = A.settings.errorLens || "off";
    const old = lensDecos.get(model.uri.toString()) || [];
    if (mode === "off" || model.isDisposed()) { if (old.length && !model.isDisposed()) lensDecos.set(model.uri.toString(), model.deltaDecorations(old, [])); return; }
    const S = A.monaco.MarkerSeverity, min = mode === "errors" ? S.Error : S.Warning;
    const byLine = new Map();
    for (const m of A.monaco.editor.getModelMarkers({ resource: model.uri })) {
      if (m.severity < min) continue;
      const cur = byLine.get(m.startLineNumber);
      if (!cur || m.severity > cur.severity) byLine.set(m.startLineNumber, m);
    }
    const decos = [...byLine.values()].filter((m) => m.startLineNumber <= model.getLineCount()).flatMap((m) => {
      const kind = m.severity >= S.Error ? "err" : "warn", line = m.startLineNumber, end = model.getLineMaxColumn(line);
      let msg = String(m.message).split("\n")[0];
      if (msg.length > 140) msg = msg.slice(0, 137) + "...";
      // two decorations: a whole-line one cannot also carry text after the line, so the tint and the message are separate
      return [
        { range: new A.monaco.Range(line, 1, line, 1), options: { isWholeLine: true, className: `dx-lens-line-${kind}` } },
        { range: new A.monaco.Range(line, end, line, end), options: { after: { content: `    ${msg}`, inlineClassName: `dx-lens dx-lens-${kind}` }, showIfCollapsed: true } },
      ];
    });
    lensDecos.set(model.uri.toString(), model.deltaDecorations(old, decos));
  }
  const refreshAllLens = () => A.monaco?.editor.getModels().forEach(updateLens);

  /* =====================================================================
   * REST client
   * ===================================================================== */
  const DYNAMIC = {
    $timestamp: () => String(Math.floor(Date.now() / 1000)),
    $guid: () => crypto.randomUUID(),
    $isoTimestamp: () => new Date().toISOString(),
    $randomInt: (a = "0", b = "1000") => String(Math.floor(Number(a) + Math.random() * (Number(b) - Number(a)))),
  };
  /** Requests in an .http file: the line each starts on, and its parts. */
  function parseHttp(text) {
    const lines = text.split("\n"), vars = {}, blocks = [];
    let cur = null;
    const flush = () => { if (cur && cur.method) blocks.push(cur); cur = null; };
    lines.forEach((raw, i) => {
      const line = raw.replace(/\r$/, "");
      if (/^###/.test(line)) { flush(); cur = { name: line.replace(/^#+\s*/, "").trim(), headers: [], body: [], stage: "start" }; return; }
      const v = /^@([\w.-]+)\s*=\s*(.*)$/.exec(line);
      if (v && (!cur || cur.stage === "start")) { vars[v[1]] = v[2].trim(); return; }
      cur ||= { name: "", headers: [], body: [], stage: "start" };
      if (cur.stage === "start") {
        if (!line.trim() || /^\s*(#|\/\/)/.test(line)) return;
        const m = /^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)/i.exec(line) || (/^\s*https?:\/\//i.test(line) ? [null, "GET", line.trim().split(/\s+/)[0]] : null);
        if (!m) return;
        Object.assign(cur, { method: m[1].toUpperCase(), url: m[2], line: i + 1, stage: "headers" });
        return;
      }
      if (cur.stage === "headers") {
        if (!line.trim()) { cur.stage = "body"; return; }
        if (/^\s*(#|\/\/)/.test(line)) return;
        const hm = /^([\w-]+)\s*:\s*(.*)$/.exec(line);
        if (hm) cur.headers.push([hm[1], hm[2]]);
        return;
      }
      cur.body.push(line);
    });
    flush();
    return { vars, blocks };
  }
  function fill(text, vars) {
    return text.replace(/\{\{\s*([$\w.-]+)((?:\s+[^}\s]+)*)\s*\}\}/g, (all, name, args) => {
      if (DYNAMIC[name]) return DYNAMIC[name](...args.trim().split(/\s+/).filter(Boolean));
      if (vars[name] != null) return fill(vars[name], vars);
      return all;
    });
  }

  const resp = { el: null, last: null, tab: "body" };
  async function send(path, line) {
    const text = A.textOf(path);
    const { vars, blocks } = parseHttp(text);
    const req = line ? blocks.filter((b) => b.line <= line).pop() || blocks[0] : blocks[0];
    if (!req) return toast("No request here. A request starts with a method and an address, like GET https://example.com", "info");
    const url = fill(req.url, vars);
    const headers = Object.fromEntries(req.headers.map(([k, v]) => [k, fill(v, vars)]));
    const body = req.body.join("\n").trim() ? fill(req.body.join("\n").replace(/\s+$/, ""), vars) : undefined;
    A.showPanel("response");
    renderResponse({ pending: true, method: req.method, url });
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 30000);
    const t0 = performance.now();
    try {
      const r = await fetch(url, { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body, signal: ctrl.signal });
      const buf = await r.arrayBuffer();
      const ms = performance.now() - t0;
      const type = r.headers.get("content-type") || "";
      const textBody = new TextDecoder().decode(buf);
      renderResponse({ method: req.method, url, status: r.status, statusText: r.statusText, ms, size: buf.byteLength, type, headers: [...r.headers.entries()], body: textBody });
    } catch (e) {
      const ms = performance.now() - t0;
      const why = e.name === "AbortError" ? "No answer within 30 seconds." : "The request did not get through. Either the address is wrong or offline, or the API does not allow requests from web pages (browsers block those unless the API sends CORS headers). APIs made for browsers, such as jsonplaceholder.typicode.com or httpbin.org, work.";
      renderResponse({ method: req.method, url, error: `${e.message || e}`, why, ms });
    } finally { clearTimeout(timer); }
  }
  const fmtSize = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
  function prettyBody(body, type) {
    if (/json/i.test(type) || /^\s*[{[]/.test(body)) {
      try {
        const json = JSON.stringify(JSON.parse(body), null, 2);
        const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        return h("pre", { class: "rs-body", html: esc(json).replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, (m, str, colon, lit, num) => (str ? `<span class="${colon ? "j-key" : "j-str"}">${str}</span>${colon || ""}` : lit ? `<span class="j-lit">${lit}</span>` : `<span class="j-num">${num}</span>`)) });
      } catch (_) { /* not JSON after all */ }
    }
    return h("pre", { class: "rs-body" }, body);
  }
  function renderResponse(r) {
    resp.last = r;
    const root = resp.el;
    if (!root) return;
    if (r.pending) { root.replaceChildren(h("div", { class: "rs-head" }, h("span", { class: "rs-method" }, r.method), h("span", { class: "rs-url" }, r.url), h("span", { class: "rs-meta" }, "Sending…"))); return; }
    if (r.error) { root.replaceChildren(h("div", { class: "rs-head" }, h("span", { class: "rs-status rs-bad" }, "Failed"), h("span", { class: "rs-method" }, r.method), h("span", { class: "rs-url" }, r.url)), h("div", { class: "rs-error" }, h("p", {}, r.why), h("p", { class: "rs-dim" }, r.error))); return; }
    const ok = r.status < 400;
    const tabs = h("div", { class: "seg rs-tabs" }, ...[["body", "Body"], ["headers", `Headers (${r.headers.length})`]].map(([id, l]) => h("button", { class: resp.tab === id ? "active" : "", onclick: () => { resp.tab = id; renderResponse(r); } }, l)));
    const content = resp.tab === "headers"
      ? h("div", {}, h("table", { class: "rs-headers" }, ...r.headers.map(([k, v]) => h("tr", {}, h("td", {}, k), h("td", {}, v)))),
        h("p", { class: "rs-note" }, "Browsers only let a page read the headers an API chooses to share (with Access-Control-Expose-Headers), so the server may have sent more than these."))
      : prettyBody(r.body, r.type);
    root.replaceChildren(
      h("div", { class: "rs-head" },
        h("span", { class: "rs-status " + (ok ? "rs-ok" : "rs-bad") }, `${r.status} ${r.statusText || ""}`.trim()),
        h("span", { class: "rs-method" }, r.method), h("span", { class: "rs-url", title: r.url }, r.url),
        h("span", { class: "rs-meta" }, `${Math.round(r.ms)} ms · ${fmtSize(r.size)}`),
        tabs,
        h("button", { class: "btn sm", onclick: () => { navigator.clipboard.writeText(r.body); toast("Copied the response body", "ok"); } }, A.icon("copy"), "Copy"),
        h("button", { class: "btn sm", onclick: () => A.downloadBlob(new Blob([r.body], { type: r.type || "text/plain" }), /json/.test(r.type) ? "response.json" : "response.txt") }, A.icon("download"), "Save")),
      h("div", { class: "rs-content" }, content));
  }

  function setupHttpLanguage() {
    const m = A.monaco;
    if (!m || m.languages.getLanguages().some((l) => l.id === "http")) return;
    m.languages.register({ id: "http", extensions: [".http", ".rest"], aliases: ["HTTP"] });
    m.languages.setMonarchTokensProvider("http", {
      tokenizer: {
        root: [
          [/^###.*$/, "keyword"], [/^\s*(#|\/\/).*$/, "comment"],
          [/^@[\w.-]+/, "variable"], [/\{\{[^}]*\}\}/, "type"],
          [/^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/, "keyword"], [/https?:\/\/[^\s{}]+/, "string"],
          [/^[\w-]+(?=\s*:)/, "attribute.name"], [/"(?:\\.|[^"\\])*"/, "string"], [/\b-?\d+(\.\d+)?\b/, "number"], [/\b(true|false|null)\b/, "keyword"],
        ],
      },
    });
    m.languages.setLanguageConfiguration("http", { comments: { lineComment: "#" }, brackets: [["{", "}"], ["[", "]"]], autoClosingPairs: [{ open: "{", close: "}" }, { open: "[", close: "]" }, { open: '"', close: '"' }] });
    const cmd = m.editor.registerCommand ? "dexna.sendHttp" : null;
    if (cmd) m.editor.registerCommand(cmd, (_, path, line) => send(path, line));
    m.languages.registerCodeLensProvider("http", {
      provideCodeLenses(model) {
        const path = A.pathOfModel(model);
        const lenses = parseHttp(model.getValue()).blocks.map((b) => ({ range: new m.Range(b.line, 1, b.line, 1), command: { id: cmd, title: `▶ Send request${b.name ? " · " + b.name : ""}`, arguments: [path, b.line] } }));
        return { lenses, dispose() {} };
      },
      resolveCodeLens: (_, lens) => lens,
    });
  }

  function buildTab() {
    const tabs = document.querySelector(".panel-tabs"), body = document.querySelector(".panel-body");
    if (!tabs || document.querySelector('.panel-tabs [data-panel="response"]')) return;
    const b = h("button", { "data-panel": "response" }, "Response");
    b.onclick = () => A.showPanel("response");
    tabs.append(b);
    resp.el = h("div", { class: "rs-view" }, h("div", { class: "tst-empty" }, h("p", {}, "Responses from .http files show here. File > New HTTP Request File makes one with examples.")));
    body.append(h("div", { class: "panel-view", "data-panel": "response" }, resp.el));
  }
  buildTab();

  return {
    onEditorReady() {
      setupHttpLanguage();
      A.monaco.editor.onDidChangeMarkers((uris) => { for (const u of uris) { const mdl = A.monaco.editor.getModel(u); if (mdl) updateLens(mdl); } });
      refreshAllLens();
    },
    onSetting(key) { if (key === "errorLens") refreshAllLens(); },
    commands: [
      { id: "error-lens", label: "Toggle Error Lens (Problems at the End of the Line)", cat: "View", run: () => A.setSetting("errorLens", (A.settings.errorLens || "off") === "off" ? "all" : "off") },
      { id: "http-send", label: "Send HTTP Request", cat: "Run", kb: "ctrl+alt+r", run: () => { const p = A.currentPath(); if (!p || !/\.(http|rest)$/.test(p)) return toast("Open an .http file first (File > New HTTP Request File).", "info"); send(p, A.editor.getPosition()?.lineNumber); } },
      { id: "http-new", label: "New HTTP Request File", cat: "File", run: () => { let n = "requests.http", i = 2; while (A.currentFiles()[n] != null) n = `requests-${i++}.http`; A.writeFiles({ [n]: SAMPLE_HTTP }); A.rerenderFiles?.(); A.openFile(n); } },
    ],
  };
}
