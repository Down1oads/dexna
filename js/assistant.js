// The Assistant: a free coding helper that runs entirely in this browser. A small open model
// (Qwen2.5-Coder, through WebLLM on WebGPU) is downloaded once, cached by the browser, and then
// works offline. Nothing you type or any of your code leaves the device.

const LS_KEY = "dexna:assistant";
const load = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (_) { return {}; } };
const save = (v) => { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch (_) {} };

// Sizes are approximate; "memory" is the graphics memory WebLLM asks for. All three are Apache-2.0 licensed.
export const AI_MODELS = [
  { id: "Qwen2.5-Coder-0.5B-Instruct", name: "Small", size: "about 0.4 GB", memory: "1 GB", desc: "Fastest. Fine for short explanations." },
  { id: "Qwen2.5-Coder-1.5B-Instruct", name: "Medium", size: "about 1 GB", memory: "2 GB", desc: "Recommended. Explains and fixes everyday code well.", recommended: true },
  { id: "Qwen2.5-Coder-7B-Instruct", name: "Large", size: "about 4.5 GB", memory: "5.5 GB", desc: "Best answers. Needs a strong graphics card." },
];

const SYSTEM = [
  "You are the coding assistant inside Dexna, a code editor that runs in the browser.",
  "Answer clearly and briefly, for someone who may be learning to program.",
  "When you write code, put it in a fenced code block with the language name, for example ```python.",
  "When asked to fix or change code, give the complete corrected code for the part you were shown, then a short explanation of what changed.",
  "If you are not sure, say so instead of guessing.",
].join(" ");

const QUICK = {
  explain: { label: "Explain", prompt: "Explain what this code does, step by step, in simple words." },
  fix: { label: "Find bugs", prompt: "Find the bugs in this code. Give the fixed code and explain each fix briefly." },
  error: { label: "Explain the error", prompt: "My program failed with the output below. Explain the error in simple words and show how to fix the code." },
  comment: { label: "Add comments", prompt: "Add short, helpful comments to this code. Return the complete code with the comments." },
};

// The models have a 4096-token window that must hold the whole request and the answer. Code averages
// about 3 characters per token, so the request is kept under PROMPT_CHARS, leaving room for MAX_OUTPUT.
const MAX_OUTPUT = 1024, PROMPT_CHARS = 8000, CONTEXT_CHARS = 4500, HISTORY_CHARS = 1800;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** A small, safe Markdown renderer: fenced code, inline code, bold, headings and lists. */
function renderMarkdown(text) {
  const parts = [];
  const fence = /```([\w#+.-]*)[^\n]*\n([\s\S]*?)(```|$)/g;
  let last = 0, m;
  while ((m = fence.exec(text))) {
    if (m.index > last) parts.push({ type: "text", text: text.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1] || "", code: m[2].replace(/\n$/, ""), done: m[3] === "```" });
    last = fence.lastIndex;
    if (!m[3]) break;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts.map((p) => {
    if (p.type === "code") return p;
    const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    const out = [];
    let list = null;
    for (const raw of p.text.split("\n")) {
      const line = raw.trimEnd();
      const li = /^\s*(?:[-*]|\d+[.)])\s+(.*)$/.exec(line);
      if (li) { if (!list) { list = []; out.push(list); } list.push(inline(li[1])); continue; }
      list = null;
      const hd = /^#{1,4}\s+(.*)$/.exec(line);
      if (hd) out.push(`<p class="ai-h">${inline(hd[1])}</p>`);
      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
    return { type: "html", html: out.map((x) => (Array.isArray(x) ? `<ul>${x.map((i) => `<li>${i}</li>`).join("")}</ul>` : x)).join("") };
  });
}

/**
 * @param {object} ctx { h, icon, monaco, editor, toast, libUrl, getContext, getLastRun, langName, workerUrl }
 */
export function createAssistant(ctx) {
  const { h, icon } = ctx;
  const state = {
    gpu: null, f16: false, // WebGPU support
    phase: "setup", // setup | loading | ready | error
    progress: { value: 0, text: "" }, error: "",
    model: load().model || AI_MODELS[1].id, cached: {},
    engine: null, worker: null, webllm: null,
    messages: [], busy: false,
  };
  const root = () => document.getElementById("ai-root");
  const fullId = (id) => `${id}-${state.f16 ? "q4f16_1" : "q4f32_1"}-MLC`;
  const modelInfo = () => AI_MODELS.find((m) => m.id === state.model) || AI_MODELS[1];

  async function detectGpu() {
    if (state.gpu !== null) return state.gpu;
    try {
      const adapter = navigator.gpu ? await navigator.gpu.requestAdapter() : null;
      state.gpu = !!adapter;
      state.f16 = !!adapter?.features?.has?.("shader-f16");
    } catch (_) { state.gpu = false; }
    return state.gpu;
  }
  async function lib() {
    state.webllm ||= await import(ctx.libUrl);
    return state.webllm;
  }
  async function refreshCached() {
    try {
      const w = await lib();
      for (const m of AI_MODELS) state.cached[m.id] = await w.hasModelInCache(fullId(m.id));
    } catch (_) {}
  }

  async function start() {
    if (state.phase === "loading") return;
    state.phase = "loading"; state.error = ""; state.progress = { value: 0, text: "Preparing…" };
    save({ ...load(), model: state.model });
    render();
    try {
      const w = await lib();
      state.worker?.terminate();
      state.worker = new Worker(ctx.workerUrl, { type: "module" });
      state.worker.addEventListener("message", (e) => { if (e.data?.dexnaLoadError) fail(new Error(e.data.dexnaLoadError)); });
      state.engine = await w.CreateWebWorkerMLCEngine(state.worker, fullId(state.model), {
        initProgressCallback: (r) => { state.progress = { value: r.progress || 0, text: r.text || "" }; renderProgress(); },
      });
      state.cached[state.model] = true;
      state.phase = "ready";
      render();
      root()?.querySelector("textarea")?.focus();
    } catch (e) { fail(e); }
  }
  function fail(e) {
    if (state.phase === "setup") return;
    state.phase = "error";
    const msg = String(e?.message || e);
    state.errorDetail = msg;
    state.error = /out of memory|OOM|device was lost|allocation/i.test(msg)
      ? "Your graphics card ran out of memory. Try a smaller model."
      : /fetch|network|Failed to load|NetworkError/i.test(msg) ? "The download failed. Check your connection and try again." : msg;
    state.worker?.terminate(); state.worker = null; state.engine = null;
    render();
  }
  async function stopEngine() {
    try { await state.engine?.unload?.(); } catch (_) {}
    state.worker?.terminate(); state.worker = null; state.engine = null;
    state.phase = "setup"; state.messages = [];
    render();
  }
  async function deleteModel(id) {
    try { const w = await lib(); await w.deleteModelAllInfoInCache(fullId(id)); state.cached[id] = false; ctx.toast(`Deleted the ${AI_MODELS.find((m) => m.id === id)?.name.toLowerCase()} model from this browser.`); }
    catch (e) { ctx.toast("Could not delete the model: " + (e.message || e), "error"); }
    render();
  }

  /* ---------- asking ---------- */
  function contextBlock(kind, limit = CONTEXT_CHARS) {
    const c = ctx.getContext();
    const parts = [];
    if (c && c.code != null && c.code.trim()) {
      let code = c.selection || c.code, where = c.selection ? `selected lines ${c.selStart}-${c.selEnd} of ${c.path}` : c.path;
      if (code.length > limit) { // keep the part around the cursor
        const lines = code.split("\n"), at = Math.max(0, (c.selection ? 0 : c.cursorLine - 1));
        let lo = at, hi = at, size = lines[at]?.length || 0;
        while ((lo > 0 || hi < lines.length - 1) && size < limit) {
          if (hi < lines.length - 1) size += lines[++hi].length + 1;
          if (lo > 0 && size < limit) size += lines[--lo].length + 1;
        }
        code = lines.slice(lo, hi + 1).join("\n").slice(0, limit);
        where = `lines ${lo + 1}-${hi + 1} of ${c.path}`;
      }
      const label = c.selection || kind !== "chat" ? `My code (${where}, ${c.language})` : `My open file (${where}, ${c.language}); use it only if my question is about it`;
      parts.push(`${label}:\n\`\`\`${c.fence}\n${code}\n\`\`\``);
    }
    const run = ctx.getLastRun();
    if (run && (kind === "error" || kind === "fix" || (run.failed && kind === "chat"))) parts.push(`Output of the last run${run.failed ? " (it failed)" : ""}:\n\`\`\`\n${run.text.slice(-1200)}\n\`\`\``);
    return { text: parts.join("\n\n"), target: c };
  }

  /** Earlier turns, newest kept first: code blocks in answers are replaced by a note, so they stay short and whole. */
  function historyFor(previous, budget) {
    const turns = [];
    for (let i = previous.length - 1; i >= 1; i -= 2) {
      const u = previous[i - 1], a = previous[i];
      if (u?.role !== "user" || a?.role !== "assistant" || a.error || !a.content.trim()) continue;
      let answer = a.content.replace(/```[\s\S]*?(```|$)/g, "[code block, see above]").replace(/\n{3,}/g, "\n\n").trim();
      if (answer.length > 600) answer = answer.slice(0, 600).replace(/\s+\S*$/, "") + " …";
      const q = u.content.length > 400 ? u.content.slice(0, 400) + " …" : u.content;
      if ((budget -= q.length + answer.length) < 0) break;
      turns.unshift({ role: "user", content: q }, { role: "assistant", content: answer });
    }
    return turns;
  }

  /** True when the newest output has turned into repeated junk (it happens with small models). */
  function looksBroken(text) {
    const tail = text.slice(-400);
    if (tail.length < 200) return false;
    const letters = (tail.match(/[A-Za-z0-9]/g) || []).length;
    if (letters / tail.length < 0.25) return true; // mostly spaces and symbols
    const words = tail.split(/\s+/).filter(Boolean);
    if (words.length >= 40 && new Set(words).size / words.length < 0.15) return true; // the same few words over and over
    return /(.{4,30}?)\1{7,}/s.test(tail); // one piece repeated many times
  }

  async function ask(question, kind = "chat") {
    if (state.phase !== "ready" || state.busy) return;
    const previous = state.messages.slice();
    let { text: context, target } = contextBlock(kind);
    let history = historyFor(previous, HISTORY_CHARS);
    const size = () => SYSTEM.length + context.length + question.length + history.reduce((n, m) => n + m.content.length, 0);
    while (size() > PROMPT_CHARS && history.length) history = history.slice(2); // oldest turns go first
    if (size() > PROMPT_CHARS) context = contextBlock(kind, Math.max(1000, CONTEXT_CHARS - (size() - PROMPT_CHARS))).text;

    state.messages.push({ role: "user", content: question, kind });
    const reply = { role: "assistant", content: "", target: { path: target?.path, hasSelection: !!target?.selection, whole: !target?.selection && (kind === "fix" || kind === "comment") } };
    state.messages.push(reply);
    state.busy = true;
    render();
    const messages = [{ role: "system", content: SYSTEM }, ...history, { role: "user", content: context ? `${context}\n\n${question}` : question }];
    let broken = false;
    try {
      await state.engine.resetChat(); // every request carries its own history; never reuse the previous state
      const chunks = await state.engine.chat.completions.create({ messages, stream: true, temperature: 0.2, repetition_penalty: 1.05, max_tokens: MAX_OUTPUT });
      for await (const chunk of chunks) {
        reply.content += chunk.choices?.[0]?.delta?.content || "";
        if (looksBroken(reply.content)) { broken = true; state.engine.interruptGenerate(); break; }
        renderLast();
      }
    } catch (e) {
      const msg = String(e?.message || e);
      reply.content += reply.content ? "\n\n" : "";
      reply.content += /context window|ContextWindow|prompt tokens exceed/i.test(msg) ? "_That was too long for the model. Press New chat, or select a smaller part of the code, and ask again._" : `_Something went wrong: ${msg}_`;
      reply.error = true;
    }
    if (broken) {
      reply.content = reply.content.slice(0, Math.max(0, reply.content.length - 400)).trimEnd();
      reply.content += (reply.content ? "\n\n" : "") + "_The model lost track and started writing nonsense, so I stopped it. Press New chat and ask again, ideally a smaller question. The Large model handles long requests better if your computer can run it._";
      reply.error = true;
    }
    state.busy = false;
    reply.done = true;
    render();
  }
  function stopAnswer() { try { state.engine?.interruptGenerate(); } catch (_) {} }

  /* ---------- applying code ---------- */
  function apply(code, mode) {
    const ed = ctx.editor, model = ed.getModel();
    if (!model) return ctx.toast("Open a file first.", "warn");
    let range;
    if (mode === "file") range = model.getFullModelRange();
    else range = ed.getSelection();
    ed.pushUndoStop();
    ed.executeEdits("assistant", [{ range, text: code, forceMoveMarkers: true }]);
    ed.pushUndoStop();
    ed.focus();
    ctx.toast(mode === "file" ? "Replaced the file. Ctrl+Z undoes it." : "Inserted. Ctrl+Z undoes it.");
  }

  /* ---------- rendering ---------- */
  function codeBlock(p, msg) {
    const pre = h("pre", { class: "ai-code" }, p.code);
    if (p.done && p.lang) {
      const lang = ctx.monaco.languages.getLanguages().find((l) => l.id === p.lang.toLowerCase() || (l.aliases || []).some((a) => a.toLowerCase() === p.lang.toLowerCase()) || (l.extensions || []).includes("." + p.lang.toLowerCase()));
      if (lang) ctx.monaco.editor.colorize(p.code, lang.id, { tabSize: 4 }).then((html) => { pre.innerHTML = html; }).catch(() => {});
    }
    const btn = (ic, label, run) => h("button", { class: "btn sm", title: label, onclick: run }, icon(ic), h("span", {}, label));
    const actions = h("div", { class: "ai-code-actions" },
      btn("copy", "Copy", () => { navigator.clipboard?.writeText(p.code).then(() => ctx.toast("Copied")).catch(() => ctx.toast("Could not copy", "error")); }),
      btn("newFile", "New file", () => ctx.newFile(p.code, p.lang)),
      ctx.editor.getModel() ? btn("insert", ctx.editor.getSelection()?.isEmpty() === false ? "Replace selection" : "Insert at cursor", () => apply(p.code, "cursor")) : null,
      msg.target?.whole && ctx.editor.getModel() && msg.target.path === ctx.getContext()?.path ? btn("check", "Replace file", () => apply(p.code, "file")) : null);
    return h("div", { class: "ai-code-wrap" }, p.lang ? h("div", { class: "ai-code-lang" }, p.lang) : null, pre, p.done ? actions : null);
  }
  function messageEl(msg) {
    if (msg.role === "user") return h("div", { class: "ai-msg user" }, h("div", { class: "ai-bubble" }, msg.content));
    const body = h("div", { class: "ai-bubble" });
    if (!msg.content) body.append(h("span", { class: "ai-typing" }, h("i"), h("i"), h("i")));
    for (const p of renderMarkdown(msg.content)) body.append(p.type === "code" ? codeBlock(p, msg) : h("div", { html: p.html }));
    return h("div", { class: "ai-msg assistant" + (msg.error ? " error" : "") }, body);
  }
  function renderLast() {
    const log = root()?.querySelector(".ai-log");
    if (!log) return;
    const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    log.lastElementChild?.replaceWith(messageEl(state.messages.at(-1)));
    if (stick) log.scrollTop = log.scrollHeight;
  }
  function renderProgress() {
    const bar = root()?.querySelector(".ai-progress");
    if (!bar) return render();
    bar.querySelector(".fill").style.width = Math.round(state.progress.value * 100) + "%";
    root().querySelector(".ai-progress-text").textContent = state.progress.text;
  }

  function render() {
    const el = root();
    if (!el) return;
    el.replaceChildren();
    if (state.gpu === false) {
      el.append(h("div", { class: "ai-setup" },
        h("p", {}, h("b", {}, "Your browser can't run the Assistant.")),
        h("p", { class: "muted" }, "It runs the model on your graphics card with WebGPU, which needs a recent Chrome or Edge on a computer (Windows, macOS or ChromeOS). Phones and some older laptops are not supported yet.")));
      return;
    }
    if (state.phase === "setup" || state.phase === "error") {
      const cards = AI_MODELS.map((m) => h("label", { class: "ai-model" + (state.model === m.id ? " on" : "") },
        h("input", { type: "radio", name: "ai-model", checked: state.model === m.id, onchange: () => { state.model = m.id; save({ ...load(), model: m.id }); render(); } }),
        h("div", {}, h("div", { class: "ai-model-name" }, m.name, m.recommended ? h("span", { class: "ai-tag" }, "Recommended") : null, state.cached[m.id] ? h("span", { class: "ai-tag ok" }, "Downloaded") : null),
          h("div", { class: "muted small" }, `${m.desc} Download ${m.size}, needs ${m.memory} of graphics memory.`)),
        state.cached[m.id] ? h("button", { class: "btn icon sm", title: "Delete this model from the browser", onclick: (e) => { e.preventDefault(); deleteModel(m.id); } }, icon("trash")) : null));
      el.append(h("div", { class: "ai-setup" },
        h("p", {}, "A free coding helper that runs ", h("b", {}, "entirely on your device"), ". No account and no key: the model downloads once, then works offline, and your code never leaves this browser."),
        state.phase === "error" ? h("div", { class: "ai-error" }, state.error, state.errorDetail && state.errorDetail !== state.error ? h("div", { class: "muted small ai-error-detail" }, state.errorDetail) : null) : null,
        h("div", { class: "ai-models" }, cards),
        h("button", { class: "btn primary wide", onclick: start }, state.cached[state.model] ? "Start" : `Download and start (${modelInfo().size})`),
        h("p", { class: "muted small" }, "It's a small model, so it's best at explaining code, finding bugs and writing short pieces of code. Check what it suggests before you use it.")));
      return;
    }
    if (state.phase === "loading") {
      el.append(h("div", { class: "ai-setup" },
        h("p", {}, `Starting the ${modelInfo().name.toLowerCase()} model…`),
        h("div", { class: "ai-progress" }, h("div", { class: "fill", style: { width: Math.round(state.progress.value * 100) + "%" } })),
        h("p", { class: "muted small ai-progress-text" }, state.progress.text),
        h("p", { class: "muted small" }, "The first time, this downloads the model. Next time it starts from the browser's cache.")));
      return;
    }
    // ready
    const log = h("div", { class: "ai-log" });
    if (!state.messages.length) log.append(h("div", { class: "ai-empty muted" },
      h("p", {}, "Ask about the open file, or select some code first and ask about that."),
      h("p", { class: "small" }, "The model sees the open file (or your selection) and, for errors, the output of your last run.")));
    for (const m of state.messages) log.append(messageEl(m));
    const ta = h("textarea", { rows: 2, placeholder: "Ask about your code…", title: "Enter sends, Shift+Enter starts a new line", spellcheck: "true" });
    const send = () => { const q = ta.value.trim(); if (!q) return; ta.value = ""; ask(q); };
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    const run = ctx.getLastRun();
    const chips = h("div", { class: "ai-chips" },
      Object.entries(QUICK).filter(([k]) => k !== "error" || run?.failed).map(([k, q]) => h("button", { class: "ai-chip", disabled: state.busy, onclick: () => ask(q.prompt, k) }, q.label)));
    el.append(
      h("div", { class: "ai-bar" },
        h("span", { class: "muted small" }, `${modelInfo().name} model, on this device`),
        h("button", { class: "btn icon sm", title: "New chat", disabled: state.busy, onclick: () => { state.messages = []; render(); } }, icon("clear")),
        h("button", { class: "btn icon sm", title: "Stop the Assistant and free its memory", disabled: state.busy, onclick: stopEngine }, icon("close"))),
      log, chips,
      h("div", { class: "ai-input" }, ta, state.busy
        ? h("button", { class: "btn icon", title: "Stop", onclick: stopAnswer }, icon("stop"))
        : h("button", { class: "btn icon primary", title: "Send (Enter)", onclick: send }, icon("send"))));
    log.scrollTop = log.scrollHeight;
  }

  return {
    async show() { if (await detectGpu()) await refreshCached(); render(); },
    render,
    /** Run a quick action (explain, fix, error, comment), starting from the panel. */
    quick(kind) {
      if (state.phase !== "ready") { ctx.toast("Start the Assistant first: pick a model and press Start.", "warn"); return false; }
      ask(QUICK[kind].prompt, kind);
      return true;
    },
    get ready() { return state.phase === "ready"; },
    _state: state, // for tests
  };
}
