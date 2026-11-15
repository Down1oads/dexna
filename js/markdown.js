// A Markdown renderer for the preview (CommonMark basics plus GitHub tables, task lists and strikethrough).
// Block elements carry data-line (1-based source line), so the preview can follow the editor's scroll.

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const safeUrl = (u) => (/^\s*(javascript|vbscript|data:(?!image\/))/i.test(u) ? "#" : u.trim());

export function slugify(text) {
  return text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
}

/** Inline Markdown: code, links, images, emphasis, strikethrough, autolinks, line breaks. */
export function inline(src) {
  const codes = [];
  // code spans first, so nothing inside them is touched
  let s = src.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, _t, c) => { codes.push(`<code>${esc(c.trim() || c)}</code>`); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s).replace(/\\([\\`*_{}\[\]()#+\-.!|~>])/g, (_, c) => `&#${c.charCodeAt(0)};`);
  s = s.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g, (_, alt, url, title) => `<img src="${safeUrl(url)}" alt="${alt}"${title ? ` title="${title}"` : ""}>`);
  s = s.replace(/\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g, (_, text, url, title) => `<a href="${safeUrl(url)}"${title ? ` title="${title}"` : ""}>${text}</a>`);
  s = s.replace(/(^|[\s(])((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;"')\]])/g, (_, pre, url) => `${pre}<a href="${url.startsWith("www.") ? "https://" + url : url}">${url}</a>`);
  s = s.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "<strong>$2</strong>");
  s = s.replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?!\*)/g, "$1<em>$2</em>").replace(/(^|[^_\w])_(?=\S)([^_]*?\S)_(?![_\w])/g, "$1<em>$2</em>");
  s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>");
  s = s.replace(/ {2,}\n|\\\n/g, "<br>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
}

/**
 * Render Markdown to HTML. `highlight(code, lang)` may return highlighted HTML for a code block (or null).
 */
export function renderMarkdown(text, { highlight } = {}) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  const usedIds = new Map();
  let i = 0;
  const at = (n) => ` data-line="${n + 1}"`;
  const isBlank = (l) => !l || !l.trim();
  const fenceRe = /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)[^`]*$/;
  const hrRe = /^ {0,3}([-*_])(\s*\1){2,}\s*$/;
  const headRe = /^ {0,3}(#{1,6})(?:\s+(.*?))?(?:\s+#+)?\s*$/;
  const listRe = /^( {0,3})([-*+]|\d{1,9}[.)])(\s+|$)(.*)$/;
  const quoteRe = /^ {0,3}> ?(.*)$/;
  const tableSep = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
  const startsBlock = (l) => fenceRe.test(l) || hrRe.test(l) || headRe.test(l) || quoteRe.test(l) || listRe.test(l) || /^ {0,3}<(div|table|pre|details|p|h\d|ul|ol|section|img|br|hr)\b/i.test(l);

  const cells = (row) => {
    let r = row.trim();
    if (r.startsWith("|")) r = r.slice(1);
    if (r.endsWith("|") && !r.endsWith("\\|")) r = r.slice(0, -1);
    return r.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
  };

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }

    // fenced code
    let m = fenceRe.exec(line);
    if (m) {
      const fence = m[1], lang = m[2] || "", start = i;
      const body = [];
      i++;
      while (i < lines.length && !new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(lines[i])) body.push(lines[i++]);
      i++;
      const code = body.join("\n");
      const hl = highlight?.(code, lang);
      out.push(`<pre${at(start)}${lang ? ` data-lang="${esc(lang)}"` : ""}><code${lang ? ` class="language-${esc(lang)}"` : ""}>${hl ?? esc(code)}</code></pre>`);
      continue;
    }
    // indented code
    if (/^( {4}|\t)/.test(line)) {
      const start = i, body = [];
      while (i < lines.length && (/^( {4}|\t)/.test(lines[i]) || (isBlank(lines[i]) && /^( {4}|\t)/.test(lines[i + 1] || "")))) body.push(lines[i++].replace(/^( {4}|\t)/, ""));
      out.push(`<pre${at(start)}><code>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    if (hrRe.test(line)) { out.push(`<hr${at(i)}>`); i++; continue; }
    m = headRe.exec(line);
    if (m) {
      const level = m[1].length, content = inline(m[2] || "");
      let id = slugify(m[2] || "") || "section";
      const n = usedIds.get(id) || 0; usedIds.set(id, n + 1); if (n) id += "-" + n;
      out.push(`<h${level} id="${id}"${at(i)}>${content}</h${level}>`);
      i++; continue;
    }
    // blockquote (rendered recursively)
    if (quoteRe.test(line)) {
      const start = i, body = [];
      while (i < lines.length && !isBlank(lines[i])) { const q = quoteRe.exec(lines[i]); body.push(q ? q[1] : lines[i]); i++; }
      let inner = renderMarkdown(body.join("\n"), { highlight });
      inner = inner.replace(/data-line="(\d+)"/g, (_, n) => `data-line="${+n + start}"`);
      const alert = /^<p data-line="\d+">\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:<br>|\s)*/i.exec(inner);
      if (alert) out.push(`<blockquote class="alert alert-${alert[1].toLowerCase()}"${at(start)}><p class="alert-title">${alert[1][0]}${alert[1].slice(1).toLowerCase()}</p>${inner.replace(alert[0], "<p>")}</blockquote>`);
      else out.push(`<blockquote${at(start)}>${inner}</blockquote>`);
      continue;
    }
    // lists (nested by indentation)
    m = listRe.exec(line);
    if (m) {
      const ordered = /\d/.test(m[2]);
      const baseIndent = m[1].length;
      const start = i;
      const items = [];
      let loose = false;
      while (i < lines.length) {
        const lm = listRe.exec(lines[i]);
        if (!lm || lm[1].length !== baseIndent || /\d/.test(lm[2]) !== ordered) break;
        const contentIndent = lm[1].length + lm[2].length + Math.max(1, Math.min(4, lm[3].length || 1));
        const body = [lm[4]];
        const itemLine = i;
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (isBlank(l)) {
            const next = lines[i + 1];
            if (next != null && !isBlank(next) && (next.match(/^\s*/)[0].length >= contentIndent)) { body.push(""); i++; loose = true; continue; }
            break;
          }
          const ind = l.match(/^\s*/)[0].length;
          if (ind >= contentIndent) { body.push(l.slice(contentIndent)); i++; continue; }
          if (listRe.test(l) && ind <= baseIndent) break;
          if (startsBlock(l)) break;
          body.push(l.trim()); i++; // lazy continuation
        }
        items.push({ body, line: itemLine });
        const nx = listRe.exec(lines[i + 1] || "");
        if (isBlank(lines[i]) && nx && nx[1].length === baseIndent && /\d/.test(nx[2]) === ordered) { loose = true; i++; }
      }
      const startNum = ordered ? parseInt(m[2], 10) : 1;
      const tag = ordered ? "ol" : "ul";
      const lis = items.map(({ body, line: ln }) => {
        let task = "";
        const tm = /^\[([ xX])\]\s+/.exec(body[0]);
        if (tm) { task = `<input type="checkbox" disabled${tm[1] !== " " ? " checked" : ""}> `; body[0] = body[0].slice(tm[0].length); }
        let inner = renderMarkdown(body.join("\n"), { highlight }).replace(/data-line="(\d+)"/g, (_, n) => `data-line="${+n + ln}"`);
        if (!loose) inner = inner.replace(/^<p data-line="\d+">([\s\S]*?)<\/p>/, "$1");
        return `<li${task ? ' class="task"' : ""}${at(ln)}>${task}${inner}</li>`;
      });
      out.push(`<${tag}${ordered && startNum !== 1 ? ` start="${startNum}"` : ""}${at(start)}>${lis.join("")}</${tag}>`);
      continue;
    }
    // tables
    if (line.includes("|") && tableSep.test(lines[i + 1] || "") && cells(line).length === cells(lines[i + 1]).length) {
      const start = i;
      const head = cells(line);
      const align = cells(lines[i + 1]).map((c) => (c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : c.startsWith(":") ? "left" : ""));
      i += 2;
      const rows = [];
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes("|")) rows.push(cells(lines[i++]));
      const td = (tag, c, k) => `<${tag}${align[k] ? ` style="text-align:${align[k]}"` : ""}>${inline(c)}</${tag}>`;
      out.push(`<table${at(start)}><thead><tr>${head.map((c, k) => td("th", c, k)).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${head.map((_, k) => td("td", r[k] ?? "", k)).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    // raw HTML blocks pass through
    if (/^ {0,3}<(div|table|pre|details|summary|p|h\d|ul|ol|section|img|br|hr|center|picture|kbd)\b/i.test(line)) {
      const start = i, body = [];
      while (i < lines.length && !isBlank(lines[i])) body.push(lines[i++]);
      out.push(`<div class="raw"${at(start)}>${body.join("\n").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")}</div>`);
      continue;
    }
    // paragraph (with setext headings)
    const start = i, body = [];
    while (i < lines.length && !isBlank(lines[i]) && (body.length === 0 || !startsBlock(lines[i]))) {
      if (body.length && /^ {0,3}(=+|-+)\s*$/.test(lines[i])) break;
      body.push(lines[i++]);
    }
    if (i < lines.length && body.length && /^ {0,3}(=+|-+)\s*$/.test(lines[i])) {
      const level = lines[i].trim()[0] === "=" ? 1 : 2;
      const txt = body.join(" ");
      out.push(`<h${level} id="${slugify(txt)}"${at(start)}>${inline(txt)}</h${level}>`);
      i++; continue;
    }
    out.push(`<p${at(start)}>${inline(body.map((l) => l.replace(/^\s+/, "")).join("\n"))}</p>`);
  }
  return out.join("\n");
}

/** CSS for the preview page, from the app's theme colors. */
export function markdownCss(c) {
  return `
:root { color-scheme: ${c.type}; }
html { background: ${c.bg}; }
body { margin: 0; padding: 28px 36px 60vh; color: ${c.fg}; background: ${c.bg}; font: 15px/1.65 "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 860px; }
h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.4em 0 .6em; font-weight: 600; }
h1 { font-size: 2em; padding-bottom: .3em; border-bottom: 1px solid ${c.border}; }
h2 { font-size: 1.5em; padding-bottom: .3em; border-bottom: 1px solid ${c.border}; }
h3 { font-size: 1.25em; } h4 { font-size: 1em; } h5 { font-size: .9em; } h6 { font-size: .85em; color: ${c.muted}; }
body > :first-child { margin-top: 0; }
p, ul, ol, blockquote, pre, table { margin: 0 0 1em; }
a { color: ${c.accent}; text-decoration: none; } a:hover { text-decoration: underline; }
code { font: .88em/1.5 "JetBrains Mono", ui-monospace, Consolas, monospace; background: ${c.code}; padding: .15em .4em; border-radius: 4px; }
pre { background: ${c.code}; padding: 14px 16px; border-radius: 6px; overflow: auto; border: 1px solid ${c.border}; }
pre code { background: none; padding: 0; font-size: 13px; }
blockquote { margin-left: 0; padding: .2em 1em; color: ${c.muted}; border-left: 4px solid ${c.border}; }
blockquote.alert { color: ${c.fg}; } .alert-title { font-weight: 600; margin-bottom: .3em; }
.alert-note { border-color: #4f8cf0; } .alert-note .alert-title { color: #4f8cf0; }
.alert-tip { border-color: #3aa57a; } .alert-tip .alert-title { color: #3aa57a; }
.alert-important { border-color: #8d6fd1; } .alert-important .alert-title { color: #8d6fd1; }
.alert-warning { border-color: #d4952b; } .alert-warning .alert-title { color: #d4952b; }
.alert-caution { border-color: #d0524a; } .alert-caution .alert-title { color: #d0524a; }
ul, ol { padding-left: 2em; } li + li { margin-top: .25em; } li > ul, li > ol { margin: .25em 0 0; }
li.task { list-style: none; margin-left: -1.4em; } li.task input { margin: 0 .4em 0 0; vertical-align: -1px; }
table { border-collapse: collapse; display: block; overflow: auto; }
th, td { border: 1px solid ${c.border}; padding: 6px 13px; } th { font-weight: 600; background: ${c.code}; }
hr { border: 0; height: 2px; background: ${c.border}; margin: 1.5em 0; }
img { max-width: 100%; }
kbd { font: 12px "JetBrains Mono", monospace; padding: 2px 5px; border: 1px solid ${c.border}; border-bottom-width: 2px; border-radius: 4px; }
del { opacity: .7; }
.empty { color: ${c.muted}; font-style: italic; }
`;
}
