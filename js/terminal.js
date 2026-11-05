// Output view with ANSI colours, carriage returns, clickable traceback locations and inline input().
let ANSI16 = ["#1e1e1e", "#e5534b", "#57ab5a", "#c69026", "#539bf5", "#b083f0", "#39c5cf", "#d1d7e0",
  "#636e7b", "#ff938a", "#6bc46d", "#daaa3f", "#6cb6ff", "#dcbdfb", "#56d4dd", "#ffffff"];
/** Use the current theme's colours for ANSI escape codes. */
export function setAnsiPalette(colors) { ANSI16 = colors; }

function xterm256(n) {
  if (n < 16) return ANSI16[n];
  if (n >= 232) { const v = 8 + (n - 232) * 10; return `rgb(${v},${v},${v})`; }
  n -= 16;
  const c = [Math.floor(n / 36), Math.floor(n / 6) % 6, n % 6].map((x) => (x ? x * 40 + 55 : 0));
  return `rgb(${c.join(",")})`;
}

const MAX_LINES = 6000;
const LOC_RE = /File "([^"]+)", line (\d+)/g;

export class Terminal {
  /** @param {HTMLElement} el @param {{onLocation?: (file:string,line:number)=>void}} opts */
  constructor(el, opts = {}) {
    this.el = el;
    this.opts = opts;
    this.styles = { stdout: {}, stderr: {} };
    this.line = null;
    this.lineCount = 0;
    this.pendingInput = null;
    this.clear();
  }

  clear() {
    this.el.textContent = "";
    this.lineCount = 0;
    this.newLine();
    if (this.pendingInput) this._renderInput(this.pendingInput);
  }

  newLine() {
    this.line = document.createElement("div");
    this.el.appendChild(this.line);
    if (++this.lineCount > MAX_LINES) { this.el.firstChild.remove(); this.lineCount--; }
  }

  _atBottom() { return this.el.scrollHeight - this.el.scrollTop - this.el.clientHeight < 40; }
  _scroll(stick) { if (stick) this.el.scrollTop = this.el.scrollHeight; }

  /** Write program output (may contain ANSI escapes). */
  write(text, stream = "stdout") {
    const stick = this._atBottom();
    const st = this.styles[stream] || (this.styles[stream] = {});
    // tokens: escape sequences, \r, \n, plain text
    const re = /\x1b\[([0-9;?]*)([A-Za-z])|\r\n|\r|\n|[^\x1b\r\n]+|\x1b/g;
    let m;
    while ((m = re.exec(text))) {
      const tok = m[0];
      if (m[2] !== undefined) {
        if (m[2] === "m") this._sgr(st, m[1]);
        else if (m[2] === "K") this.line.textContent = this.line.textContent; // erase line: keep simple
        continue;
      }
      if (tok === "\n" || tok === "\r\n") { this.newLine(); continue; }
      if (tok === "\r") { this.line.textContent = ""; continue; }
      if (tok === "\x1b") continue;
      this._appendText(tok, stream, st);
    }
    this._scroll(stick);
  }

  _appendText(text, stream, st) {
    const span = document.createElement("span");
    if (stream === "stderr") span.className = "stderr";
    else if (stream !== "stdout") span.className = stream;
    let css = "";
    if (st.fg) css += `color:${st.fg};`;
    if (st.bg) css += `background:${st.bg};`;
    if (st.bold) css += "font-weight:700;";
    if (st.dim) css += "opacity:.65;";
    if (st.italic) css += "font-style:italic;";
    if (st.underline) css += "text-decoration:underline;";
    if (css) span.style.cssText = css;

    if (stream === "stderr" && this.opts.onLocation && LOC_RE.test(text)) {
      LOC_RE.lastIndex = 0;
      let last = 0, m;
      while ((m = LOC_RE.exec(text))) {
        span.append(text.slice(last, m.index));
        const a = document.createElement("a");
        a.className = "loc";
        a.textContent = m[0];
        const file = m[1], line = +m[2];
        if (this.opts.canOpen && !this.opts.canOpen(file)) { span.append(m[0]); last = m.index + m[0].length; continue; }
        a.onclick = () => this.opts.onLocation(file, line);
        span.append(a);
        last = m.index + m[0].length;
      }
      span.append(text.slice(last));
    } else span.textContent = text;
    this.line.appendChild(span);
  }

  _sgr(st, params) {
    const p = params === "" ? [0] : params.split(";").map(Number);
    for (let i = 0; i < p.length; i++) {
      const c = p[i];
      if (c === 0) { for (const k in st) delete st[k]; }
      else if (c === 1) st.bold = true;
      else if (c === 2) st.dim = true;
      else if (c === 3) st.italic = true;
      else if (c === 4) st.underline = true;
      else if (c === 22) { st.bold = false; st.dim = false; }
      else if (c === 23) st.italic = false;
      else if (c === 24) st.underline = false;
      else if (c >= 30 && c <= 37) st.fg = ANSI16[c - 30];
      else if (c >= 90 && c <= 97) st.fg = ANSI16[c - 90 + 8];
      else if (c >= 40 && c <= 47) st.bg = ANSI16[c - 40];
      else if (c >= 100 && c <= 107) st.bg = ANSI16[c - 100 + 8];
      else if (c === 39) st.fg = null;
      else if (c === 49) st.bg = null;
      else if (c === 38 || c === 48) {
        const key = c === 38 ? "fg" : "bg";
        if (p[i + 1] === 5) { st[key] = xterm256(p[i + 2]); i += 2; }
        else if (p[i + 1] === 2) { st[key] = `rgb(${p[i + 2]},${p[i + 3]},${p[i + 4]})`; i += 4; }
      }
    }
  }

  /** Dexna's own messages (grey italic). */
  system(text, cls = "sys") {
    const stick = this._atBottom();
    if (this.line.childNodes.length) this.newLine();
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = text;
    this.line.appendChild(span);
    this.newLine();
    this._scroll(stick);
  }

  separator(text) {
    if (this.line.childNodes.length) this.newLine();
    const d = document.createElement("span");
    d.className = "run-sep";
    d.textContent = text;
    this.line.appendChild(d);
    this.newLine();
  }

  appendNode(node) {
    const stick = this._atBottom();
    if (this.line.childNodes.length) this.newLine();
    this.line.appendChild(node);
    this.newLine();
    this._scroll(stick);
  }

  /** Echo of console input. */
  echo(code, prompt = ">>> ") {
    if (this.line.childNodes.length) this.newLine();
    code.split("\n").forEach((l, i) => {
      const p = document.createElement("span");
      p.className = "echo-prompt";
      p.textContent = i ? "... " : prompt;
      const s = document.createElement("span");
      s.className = "echo";
      s.textContent = l;
      this.line.append(p, s);
      this.newLine();
    });
    this._scroll(true);
  }

  /** Show an inline input field; resolves with the entered text. */
  requestInput(onSubmit) {
    this.pendingInput = { onSubmit };
    this._renderInput(this.pendingInput);
  }

  _renderInput(req) {
    const wrap = document.createElement("span");
    wrap.className = "stdin-line";
    const input = document.createElement("input");
    input.className = "stdin";
    input.spellcheck = false;
    input.autocomplete = "off";
    wrap.appendChild(input);
    this.line.appendChild(wrap);
    req.wrap = wrap;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = input.value;
        this.resolveInput(value);
      } else if (e.key === "d" && e.ctrlKey) {
        e.preventDefault();
        this.resolveInput(null);
      }
    });
    this._scroll(true);
    setTimeout(() => input.focus({ preventScroll: false }), 0);
  }

  get inputActive() { return !!this.pendingInput; }

  focusInput() { this.pendingInput?.wrap?.querySelector("input")?.focus(); }

  /** Finish the pending input (value=null for EOF/cancel). */
  resolveInput(value) {
    const req = this.pendingInput;
    if (!req) return;
    this.pendingInput = null;
    const span = document.createElement("span");
    span.className = "stdin-val";
    span.textContent = value ?? "";
    req.wrap.replaceWith(span);
    this.newLine();
    req.onSubmit(value);
  }
}
