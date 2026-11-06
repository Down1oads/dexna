// The Assistant: a free coding helper that runs entirely in this browser. A small open model
// (Qwen2.5-Coder, through WebLLM on WebGPU) is downloaded once, cached by the browser, and then
// works offline. Nothing you type or any of your code leaves the device.

const LS_KEY = "dexna:assistant";
const load = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (_) { return {}; } };
const save = (v) => { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch (_) {} };

// Sizes are approximate; "memory" is the graphics memory WebLLM asks for (16-bit build / 32-bit build).
// All three are Apache-2.0 licensed. The faster 16-bit builds are used when the graphics card supports them.
export const AI_MODELS = [
  { id: "Qwen2.5-Coder-0.5B-Instruct", name: "Small", size: "about 0.5 GB", memory: ["1 GB", "1.1 GB"], desc: "Fastest, and light on your computer. Fine for short questions." },
  { id: "Qwen2.5-Coder-1.5B-Instruct", name: "Medium", size: "about 1 GB", memory: ["1.6 GB", "1.9 GB"], desc: "Recommended. Explains and fixes everyday code well.", recommended: true },
  { id: "Qwen2.5-Coder-7B-Instruct", name: "Large", size: "about 4.5 GB", memory: ["5.1 GB", "5.9 GB"], desc: "Best answers, but only for a gaming-class graphics card: on most laptops it is very slow and can make the whole computer lag." },
];

const SYSTEM = [
  "You are the coding assistant inside Dexna, a code editor that runs in the browser.",
  "Answer clearly and briefly, for someone who may be learning to program.",
  "When you write code, put it in a fenced code block with the language name, for example ```python.",
  "When asked to fix or change code, give the complete corrected code for the part you were shown, then a short explanation of what changed.",
  "If you are not sure, say so instead of guessing.",
  "Write code carefully: close every bracket you open exactly once, and in Python indent with 4 spaces and line up else/elif/except with their if/try.",
].join(" ");

// Added in Auto mode, where the code is typed straight into the user's files.
const SYSTEM_AUTO = " Auto mode is on: the code you write is typed straight into the user's files. When the user asks for a program or a change, reply with one short sentence, then the complete code in ONE fenced code block with the language name (a web page may use separate html, css and javascript blocks), then at most two short sentences. Never leave parts out or write placeholders like '...'.";

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
    auto: !!load().auto, // Auto mode: create projects and type the code into the editor
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
  // A question about the user's own code; anything else (like "make a snake game") is sent without the
  // open file, which keeps the request short, so the answer starts much sooner.
  const ABOUT_CODE = /\b(this|my|the|that|our) (code|file|program|function|script|game|page|app|class|method|loop|project)\b|\b(fix|bug|bugs|error|errors|explain|why|change|add|update|improve|refactor|comment|comments|rename|remove|delete|it|line|lines|crash|crashes|work|works|doesn't|does not|wrong)\b/i;
  function contextBlock(kind, limit = CONTEXT_CHARS, question = "") {
    const c = ctx.getContext();
    const parts = [];
    const relevant = kind !== "chat" || c?.selection || ABOUT_CODE.test(question);
    if (c && c.code != null && c.code.trim() && relevant) {
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

  /**
   * Tidy an answer that ended badly: a code block the model never closed (it sometimes writes a single
   * backtick and then junk) is cut at that backtick, and junk after the last block is dropped.
   */
  function tidyAnswer(text) {
    const opens = (text.match(/^```/gm) || []).length;
    if (opens % 2 === 1) { // the last code block was never closed
      const at = text.lastIndexOf("\n```");
      const head = text.slice(0, at + 1), block = text.slice(at + 1);
      const lines = block.split("\n");
      for (let i = lines.length - 1; i > 0; i--) {
        const m = /^(.*?)`{1,2}\s*$/.exec(lines[i]);
        const rest = lines.slice(i + 1).join("\n");
        if (m && (!rest.trim() || letterRatio(rest) < 0.5 || rest.trim().length < 80)) { text = head + [...lines.slice(0, i), m[1]].join("\n").replace(/\s+$/, "") + "\n```\n"; break; }
      }
    }
    const end = text.lastIndexOf("```") + 3;
    const tail = text.slice(end);
    if (end > 2 && tail.trim() && (letterRatio(tail) < 0.45 || /^\s*`/.test(tail))) text = text.slice(0, end) + "\n";
    return text.replace(/\s+$/, "");
  }
  const letterRatio = (t) => { const s = t.replace(/\s+/g, " "); return s.length ? (s.match(/[A-Za-z]/g) || []).length / s.length : 1; };

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

  async function ask(question, kind = "chat", opts = {}) {
    if (state.phase !== "ready" || state.busy) return;
    const previous = state.messages.slice();
    let { text: context, target } = contextBlock(kind, CONTEXT_CHARS, question);
    let history = historyFor(previous, HISTORY_CHARS);
    const size = () => SYSTEM.length + context.length + question.length + history.reduce((n, m) => n + m.content.length, 0);
    while (size() > PROMPT_CHARS && history.length) history = history.slice(2); // oldest turns go first
    if (size() > PROMPT_CHARS) context = contextBlock(kind, Math.max(1000, CONTEXT_CHARS - (size() - PROMPT_CHARS)), question).text;

    state.messages.push({ role: "user", content: question, kind });
    const reply = { role: "assistant", content: "", raw: "", typing: true, isFix: !!opts.isFix, target: { path: target?.path, hasSelection: !!target?.selection, whole: !target?.selection && (kind === "fix" || kind === "comment") } };
    if (state.auto) { reply.session = ctx.autoSession({ question, kind, target }); reply.writers = []; }
    state.messages.push(reply);
    state.busy = true;
    render();
    const system = SYSTEM + (state.auto ? SYSTEM_AUTO : "");
    const messages = [{ role: "system", content: system }, ...history, { role: "user", content: context ? `${context}\n\n${question}` : question }];
    let broken = false, streamDone = false;
    const typed = typeOut(reply, () => streamDone);
    try {
      await state.engine.resetChat(); // every request carries its own history; never reuse the previous state
      // no repetition penalty: in code it pushes the model off tokens that rightly repeat, like the "))" closing input(...)
      const chunks = await state.engine.chat.completions.create({ messages, stream: true, stream_options: { include_usage: true }, temperature: 0.2, top_p: 0.9, repetition_penalty: 1.0, max_tokens: MAX_OUTPUT });
      for await (const chunk of chunks) {
        const speed = chunk.usage?.extra?.decode_tokens_per_s;
        if (speed) { state.speed = speed; reply.speed = speed; }
        reply.raw += chunk.choices?.[0]?.delta?.content || "";
        if (looksBroken(reply.raw)) { broken = true; state.engine.interruptGenerate(); break; }
      }
    } catch (e) {
      const msg = String(e?.message || e);
      reply.raw += reply.raw ? "\n\n" : "";
      reply.raw += /context window|ContextWindow|prompt tokens exceed/i.test(msg) ? "_That was too long for the model. Press New chat, or select a smaller part of the code, and ask again._" : `_Something went wrong: ${msg}_`;
      reply.error = true;
    }
    if (broken) {
      reply.raw = reply.raw.slice(0, Math.max(0, reply.raw.length - 400)).trimEnd();
      reply.content = reply.content.slice(0, reply.raw.length);
      reply.raw += (reply.raw ? "\n\n" : "") + "_The model lost track and started writing nonsense, so I stopped it. Press New chat and ask again, ideally a smaller question. The Large model handles long requests better if your computer can run it._";
      reply.error = true;
    }
    if (!broken && !reply.error) { const clean = tidyAnswer(reply.raw); if (clean !== reply.raw) { reply.raw = clean; if (reply.content.length > clean.length) reply.content = clean; } }
    streamDone = true;
    await typed;
    feedWriters(reply, true);
    state.busy = false;
    reply.typing = false;
    reply.done = true;
    // too slow to be useful: say so once, and suggest a lighter model
    if (reply.speed && reply.speed < 5 && state.model !== AI_MODELS[0].id && !state.slowHint) {
      state.slowHint = true;
      reply.slow = true;
    }
    render();
  }

  /**
   * Reveal the answer at a steady pace (like typing) instead of in the bursts the model produces.
   * Speeds up when it falls behind, so it never lags far behind the model.
   */
  function typeOut(msg, streamDone) {
    return new Promise((resolve) => {
      let last = performance.now(), carry = 0, painted = 0;
      const next = (f) => (document.hidden ? setTimeout(() => f(performance.now()), 50) : requestAnimationFrame(f));
      const tick = (now) => {
        const backlog = msg.raw.length - msg.content.length;
        if (backlog > 0) {
          if (document.hidden || msg.skipTyping) msg.content = msg.raw;
          else {
            const rate = Math.max(120, backlog * 5); // characters per second
            carry += (rate * Math.min(100, now - last)) / 1000;
            const n = Math.floor(carry);
            if (n > 0) { carry -= n; msg.content = msg.raw.slice(0, msg.content.length + n); }
          }
          // drawing the answer and editing the file are the costly part: about 20 times a second is smooth enough
          if (now - painted > 50 || msg.raw.length === msg.content.length) { painted = now; feedWriters(msg, false); renderLast(); }
        }
        last = now;
        if (msg.raw.length === msg.content.length && streamDone()) return resolve();
        next(tick);
      };
      next(tick);
    });
  }

  /** Auto mode: send each code block, as it is typed, to the file it belongs in. */
  function feedWriters(msg, final) {
    if (!msg.session) return;
    let i = 0;
    for (const p of renderMarkdown(msg.content)) {
      if (p.type !== "code") continue;
      if (msg.writers[i] === undefined) {
        try { msg.writers[i] = msg.session.block(p.lang) || null; } catch (e) { msg.writers[i] = null; ctx.toast("Could not write the code: " + (e.message || e), "error"); }
      }
      const w = msg.writers[i];
      if (w && !w.finished) {
        w.write(p.code);
        if ((p.done || final) && !w.finished) w.finish().then(() => { renderAt(msg); checkProblems(w, msg); });
      }
      i++;
    }
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
    if (p.done && p.lang && !msg.typing) {
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
  /** After a file is written, look for errors (the linter needs a moment) and offer to fix them. */
  function checkProblems(w, msg) {
    setTimeout(() => {
      const problems = ctx.problemsFor?.(w.path) || [];
      w.problems = problems;
      if (!problems.length) return;
      renderAt(msg);
      // Auto mode does the next step too: one attempt to fix the errors (not again for the fix itself)
      if (state.auto && !msg.isFix && !w.autoFixed && msg === state.messages.at(-1)) { w.autoFixed = true; waitIdle().then(() => fixProblems(w, true)); }
    }, 1800);
  }
  function renderAt(msg) {
    const log = root()?.querySelector(".ai-log");
    const i = state.messages.indexOf(msg);
    const el = log?.querySelectorAll(":scope > .ai-msg")[i];
    if (el) el.replaceWith(messageEl(msg));
  }
  function fixProblems(w, auto = false) {
    const list = w.problems.slice(0, 8).map((p) => `- line ${p.line}: ${p.message}`).join("\n");
    ctx.open(w.path);
    setTimeout(() => ask(`${auto ? "(Auto) " : ""}Fix these errors in ${w.path}, and give the complete corrected file:\n${list}`, "fix", { isFix: true }), 150);
  }
  const waitIdle = () => new Promise((resolve) => { const t = () => (state.busy ? setTimeout(t, 200) : resolve()); t(); });
  /** "removed an extra ')' (line 3)" x3 -> "removed 3 extra ')' (lines 3, 9)" */
  function summarize(notes) {
    const groups = new Map();
    for (const n of notes) {
      const m = /^(.*?)\s*\(line (\d+)\)$/.exec(n);
      const key = m ? m[1] : n;
      if (!groups.has(key)) groups.set(key, { count: 0, lines: [] });
      const g = groups.get(key); g.count++; if (m && !g.lines.includes(+m[2])) g.lines.push(+m[2]);
    }
    return [...groups].map(([text, g]) => {
      const t = g.count > 1 ? text.replace(/^removed an extra/, `removed ${g.count} extra`).replace(/^joined a string/, `joined ${g.count} strings`) : text;
      return g.lines.length ? `${t} (line${g.lines.length > 1 ? "s" : ""} ${g.lines.join(", ")})` : t;
    }).join("; ");
  }
  function autoCard(w, p, msg) {
    const done = w.finished;
    const btn = (ic, label, run) => h("button", { class: "btn sm", title: label, onclick: run }, icon(ic), h("span", {}, label));
    const code = h("pre", { class: "ai-code hidden" }, p.code);
    return h("div", { class: "ai-auto" + (done ? " done" : "") },
      h("div", { class: "ai-auto-head" }, icon(done ? "check" : "newFile"),
        h("span", {}, done ? `Wrote ${w.path}` : `Typing into ${w.path}…`), h("span", { class: "muted small" }, `${w.lines} line${w.lines === 1 ? "" : "s"}`)),
      w.note ? h("div", { class: "muted small" }, w.note) : null,
      done && w.repairs?.length ? h("div", { class: "ai-auto-fixed" }, icon("check"), h("span", {}, "Fixed automatically: " + summarize(w.repairs))) : null,
      done && w.problems?.length ? h("div", { class: "ai-auto-warn" }, icon("warning"),
        h("span", {}, `${w.problems.length} error${w.problems.length === 1 ? "" : "s"}, first on line ${w.problems[0].line}: ${w.problems[0].message}`)) : null,
      done ? h("div", { class: "ai-code-actions" },
        w.problems?.length && !state.busy ? btn("bolt", "Fix errors", () => fixProblems(w)) : null,
        btn("file", "Open", () => ctx.open(w.path)),
        w.runnable ? btn("play", "Run", () => ctx.run(w.path)) : null,
        btn("chevronDown", "Show code", (e) => { code.classList.toggle("hidden"); e.currentTarget.querySelector("span").textContent = code.classList.contains("hidden") ? "Show code" : "Hide code"; })) : null,
      code);
  }
  function messageEl(msg) {
    if (msg.role === "user") return h("div", { class: "ai-msg user" }, h("div", { class: "ai-bubble" }, msg.content));
    const body = h("div", { class: "ai-bubble" });
    if (!msg.content && msg.typing) body.append(h("span", { class: "ai-typing" }, h("i"), h("i"), h("i")));
    let i = 0;
    for (const p of renderMarkdown(msg.content)) {
      if (p.type === "code") { const w = msg.writers?.[i++]; body.append(w ? autoCard(w, p, msg) : codeBlock(p, msg)); }
      else body.append(h("div", { html: p.html }));
    }
    if (msg.typing && msg.content) { // the caret sits at the end of the text being typed
      const lastBlock = body.lastElementChild;
      const target = lastBlock?.querySelector?.("pre:not(.hidden)") || lastBlock?.querySelector?.("p:last-of-type, li:last-child") || body;
      target.append(h("span", { class: "ai-caret" }));
    }
    if (msg.slow) body.append(h("div", { class: "ai-auto-warn ai-slow" }, icon("warning"), h("span", {},
      `This model is slow on your computer (${msg.speed.toFixed(1)} tokens a second) and can make it lag. A smaller model will be much faster: press × at the top to stop the Assistant, then pick ${state.model === AI_MODELS[2].id ? "Medium or Small" : "Small"}.`)));
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
          h("div", { class: "muted small" }, `${m.desc} Download ${m.size}, needs ${m.memory[state.f16 ? 0 : 1]} of graphics memory.`)),
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
      h("p", {}, state.auto ? "Auto is on: ask for a program (for example \"make a number guessing game in Python\") and it is created and typed into the editor for you." : "Ask about the open file, or select some code first and ask about that."),
      h("p", { class: "small" }, state.auto ? "Asking for a change to the open file rewrites that file. Ctrl+Z undoes it." : "The model sees the open file (or your selection) and, for errors, the output of your last run. Turn on Auto to have it write the code into your files.")));
    for (const m of state.messages) log.append(messageEl(m));
    const ta = h("textarea", { rows: 2, placeholder: "Ask about your code…", title: "Enter sends, Shift+Enter starts a new line", spellcheck: "true" });
    const send = () => { const q = ta.value.trim(); if (!q) return; ta.value = ""; ask(q); };
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    const run = ctx.getLastRun();
    const chips = h("div", { class: "ai-chips" },
      Object.entries(QUICK).filter(([k]) => k !== "error" || run?.failed).map(([k, q]) => h("button", { class: "ai-chip", disabled: state.busy, onclick: () => ask(q.prompt, k) }, q.label)));
    el.append(
      h("div", { class: "ai-bar" },
        h("span", { class: "muted small", title: "Runs on this device" + (state.speed ? `. Last answer: ${state.speed.toFixed(1)} tokens per second` : "") }, `${modelInfo().name} model${state.speed ? ` · ${Math.round(state.speed)}/s` : ""}`),
        h("label", { class: "ai-auto-toggle" + (state.auto ? " on" : ""), title: "Auto: the Assistant writes the code into your files as it types: a new project when you ask for a new program, or your open file when you ask for a change. Ctrl+Z undoes it." },
          h("input", { type: "checkbox", checked: state.auto, disabled: state.busy, onchange: (e) => { state.auto = e.target.checked; save({ ...load(), auto: state.auto }); render(); } }),
          h("span", { class: "ai-switch" }), h("span", {}, "Auto")),
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
