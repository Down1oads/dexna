// Lets people write "script style" code in compiled languages: if a file has no entry point
// (Main / main), Dexna wraps the loose statements in one, keeping imports and type declarations
// outside it. Compiler error lines are mapped back to the lines the user wrote.

const NEWLINE_LANGS = new Set(["go", "kotlin"]); // statements end at a newline, not at ';'

/* ---------------------------- scanning ---------------------------- */

/** If a string, char or comment starts at `i`, return the index just after it; otherwise `i`. */
function skipLiteral(src, i, lang) {
  const c = src[i], d = src[i + 1];
  if (c === "/" && d === "/") { const e = src.indexOf("\n", i); return e < 0 ? src.length : e; }
  if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); return e < 0 ? src.length : e + 2; }
  if (lang === "go" && c === "`") { const e = src.indexOf("`", i + 1); return e < 0 ? src.length : e + 1; }
  if (lang === "rust" && c === "r" && /^r#*"/.test(src.slice(i, i + 12))) {
    const hashes = /^r(#*)"/.exec(src.slice(i, i + 12))[1];
    const e = src.indexOf('"' + hashes, i + 2 + hashes.length);
    return e < 0 ? src.length : e + 1 + hashes.length;
  }
  if (c === '"' && d === '"' && src[i + 2] === '"') { const e = src.indexOf('"""', i + 3); return e < 0 ? src.length : e + 3; } // text block / raw string
  if (lang === "csharp" && (c === "@" || c === "$")) { // @"verbatim", $"interpolated", $@"..." and @$"..."
    let j = i;
    let verbatim = false, interp = false;
    while (src[j] === "@" || src[j] === "$") { if (src[j] === "@") verbatim = true; else interp = true; j++; }
    if (src[j] === '"') return skipString(src, j, verbatim, interp);
    return i;
  }
  if (c === '"') return skipString(src, i, false, false);
  if (c === "'") {
    if (lang === "rust" && !/^'(\\.|[^\\'])'/.test(src.slice(i, i + 6))) return i; // a lifetime such as 'a
    let j = i + 1;
    while (j < src.length && src[j] !== "'" && src[j] !== "\n") { if (src[j] === "\\") j++; j++; }
    return j + 1;
  }
  return i;
}

function skipString(src, i, verbatim, interp) {
  let j = i + 1;
  while (j < src.length) {
    const c = src[j];
    if (verbatim) { if (c === '"') { if (src[j + 1] === '"') { j += 2; continue; } return j + 1; } }
    else if (c === "\\") { j += 2; continue; }
    else if (c === '"') return j + 1;
    else if (c === "\n" && !verbatim) return j; // unterminated: stop at the line end
    if (interp && c === "{") {
      if (src[j + 1] === "{") { j += 2; continue; }
      let depth = 1; j++;
      while (j < src.length && depth) {
        const k = skipLiteral(src, j, "csharp");
        if (k !== j) { j = k; continue; }
        if (src[j] === "{") depth++; else if (src[j] === "}") depth--;
        j++;
      }
      continue;
    }
    j++;
  }
  return j;
}

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** Split the file into top-level segments: [{ text, line, head }] where `line` is the 1-based first line. */
function segments(src, lang) {
  const out = [];
  const nl = NEWLINE_LANGS.has(lang);
  const lineAt = (idx) => src.slice(0, idx).split("\n").length;
  let i = 0, start = -1, brace = 0, paren = 0, firstBrace = -1;
  const finish = (end) => {
    const text = src.slice(start, end);
    if (stripComments(text).trim()) out.push({ text, line: lineAt(start + text.search(/\S/)) , head: stripComments(firstBrace >= 0 ? src.slice(start, firstBrace) : text).trim() });
    start = -1; firstBrace = -1;
  };
  const nextToken = (from) => /^[\s]*([A-Za-z_]+|;)/.exec(src.slice(from, from + 40))?.[1];
  while (i < src.length) {
    if (start < 0) {
      // between segments: skip blank space, but keep '#' directives in C-like languages as their own segments
      if (/\s/.test(src[i])) { i++; continue; }
      start = i;
    }
    const c = src[i];
    const k = skipLiteral(src, i, lang);
    if (k !== i) { i = k; continue; }
    if ((lang === "c" || lang === "cpp") && c === "#" && /^\s*$/.test(src.slice(src.lastIndexOf("\n", i - 1) + 1, i)) && brace === 0 && paren === 0) {
      // preprocessor line (with \ continuations)
      let e = i;
      while (true) { const x = src.indexOf("\n", e); if (x < 0) { e = src.length; break; } if (src[x - 1] === "\\") { e = x + 1; continue; } e = x; break; }
      if (start === i) { i = e; finish(i); continue; }
    }
    if (c === "(" || c === "[") paren++;
    else if (c === ")" || c === "]") paren = Math.max(0, paren - 1);
    else if (c === "{") { if (brace === 0 && firstBrace < 0) firstBrace = i; brace++; }
    else if (c === "}") {
      brace = Math.max(0, brace - 1);
      if (brace === 0 && paren === 0) {
        const head = stripComments(firstBrace >= 0 ? src.slice(start, firstBrace) : "").replace(/\([^()]*\)/g, "()");
        const isExpression = /(^|[^=!<>])=([^=>]|$)|=>|^\s*(return|new|throw)\b/.test(head);
        const next = nextToken(i + 1);
        const startsDo = /^\s*do\b/.test(stripComments(src.slice(start, start + 30)));
        const continues = /^(else|catch|finally)$/.test(next || "") || (startsDo && next === "while");
        if (!isExpression && !continues) {
          let e = i + 1;
          if (next === ";") e = src.indexOf(";", i + 1) + 1; // class A {};  struct S {...};
          i = e; finish(i); continue;
        }
      }
    } else if (c === ";" && !nl && brace === 0 && paren === 0) { i++; finish(i); continue; }
    else if (c === "\n" && nl && brace === 0 && paren === 0) {
      const before = src.slice(start, i).replace(/\s+$/, "");
      const after = /^\s*(\S)/.exec(src.slice(i + 1))?.[1];
      const open = /[,+\-*/%&|=<>.(\[{:?]$/.test(stripComments(before).trim());
      if (!open && after !== "." && after !== undefined) { finish(i); i++; continue; }
      if (after === undefined) { finish(i); i++; continue; }
    }
    i++;
  }
  if (start >= 0) finish(src.length);
  return out;
}

/* ---------------------------- per-language rules ---------------------------- */

const CONTROL = /^(if|for|foreach|while|do|switch|try|catch|finally|else|return|new|throw|using|lock|fixed|checked|unchecked|synchronized|assert|goto|await|yield|var|let|val)\b/;

const RULES = {
  csharp: {
    hasMain: /\bMain\s*\(/,
    classify(h) {
      if (/^using\s+(static\s+)?[A-Za-z_][\w.]*\s*;?$/.test(h) || /^using\s+[A-Za-z_]\w*\s*=\s*[\w.<>,\[\]\s?]+;?$/.test(h)) return "directive";
      if (/^(\[[^\]]*\]\s*)*((public|private|protected|internal|static|abstract|sealed|partial|unsafe|readonly|new|file|ref)\s+)*(class|struct|interface|enum|record|namespace|delegate)\b/.test(h)) return "decl";
      return "stmt";
    },
  },
  java: {
    hasMain: /\bvoid\s+main\s*\(/,
    classify(h) {
      if (/^(import|package)\b/.test(h)) return "directive";
      if (/^(@\w+(\([^)]*\))?\s*)*((public|private|protected|static|abstract|final|sealed|non-sealed|strictfp)\s+)*(class|interface|enum|record|@interface)\b/.test(h)) return "decl";
      if (!CONTROL.test(h) && /^((public|private|protected|static|final|abstract|synchronized|native)\s+)*(<[^>]+>\s+)?[\w.<>\[\],?]+(\s*<[^>]*>)?(\[\])*\s+\w+\s*\(/.test(h)) return "member";
      if (/^((public|private|protected)\s+)?static\s+/.test(h)) return "member";
      return "stmt";
    },
  },
  c: {
    hasMain: /\bmain\s*\(/,
    classify(h, text) {
      if (h.startsWith("#")) return "decl";
      if (/^(typedef|extern|union)\b/.test(h) || /^(struct|enum)\s+\w*\s*$/.test(h) && /\{/.test(text)) return "decl";
      if (!CONTROL.test(h) && /^[\w\s*]+?\b\w+\s*\([^;]*\)\s*$/.test(h) && /\{/.test(text)) return "decl"; // function definition
      if (!CONTROL.test(h) && /^[\w\s*]+\b\w+\s*\([^=;{}]*\)\s*;\s*$/.test(stripComments(text).trim()) && /^[\w\s*]+\s+[\w*]/.test(h)) return "decl"; // prototype
      if (/^(static|const|volatile)\b/.test(h)) return "decl";
      return "stmt";
    },
  },
  go: {
    hasMain: /\bfunc\s+main\s*\(/,
    classify(h) {
      if (/^(package|import)\b/.test(h)) return "directive";
      if (/^(func|type|var|const)\b/.test(h)) return "decl";
      return "stmt";
    },
  },
  rust: {
    hasMain: /\bfn\s+main\s*\(/,
    classify(h) {
      if (/^#!?\[/.test(h) || /^(pub(\([^)]*\))?\s+)?(async\s+|unsafe\s+|const\s+)*(fn|struct|enum|impl|trait|mod|use|const|static|type|union|extern)\b/.test(h) || /^macro_rules!/.test(h)) return "decl";
      return "stmt";
    },
  },
  kotlin: {
    hasMain: /\bfun\s+main\s*\(/,
    classify(h) {
      if (/^(import|package)\b/.test(h)) return "directive";
      if (/^(@\w+(\([^)]*\))?\s*)*((public|private|internal|protected|open|abstract|final|sealed|data|enum|inner|override|inline|const|lateinit|suspend|tailrec|operator|infix)\s+)*(fun|class|object|interface|typealias|val|var)\b/.test(h) || /^(enum|annotation|data|sealed|value)\s+class\b/.test(h)) return "decl";
      return "stmt";
    },
  },
};
RULES.cpp = { ...RULES.c, classify(h, text) {
  if (/^(using|namespace|template|class)\b/.test(h) && !/^using\s+namespace\s+\w+\s*;?$/.test(h)) return "decl";
  if (/^using\s+namespace\s+\w+/.test(h)) return "decl";
  return RULES.c.classify(h, text);
} };

const GO_PACKAGES = { fmt: "fmt", os: "os", strings: "strings", strconv: "strconv", math: "math", sort: "sort", time: "time", bufio: "bufio", errors: "errors", bytes: "bytes", sync: "sync", unicode: "unicode", regexp: "regexp", io: "io", rand: "math/rand", utf8: "unicode/utf8", json: "encoding/json", big: "math/big", heap: "container/heap", list: "container/list", atomic: "sync/atomic" };

/**
 * @returns {{code:string, map:(number|null)[]|null, wrapped:boolean}} map[outputLine-1] = original line (1-based), or null for generated lines.
 */
export function prepareSource(lang, code, opts = {}) {
  const rules = RULES[lang];
  if (!rules) return { code, map: null, wrapped: false };
  const plain = stripComments(code);
  if (rules.hasMain.test(plain)) return { code, map: null, wrapped: false };

  const parts = segments(code, lang).map((s) => ({ ...s, kind: rules.classify(s.head.replace(/\s+/g, " "), s.text) }));
  const stmts = parts.filter((p) => p.kind === "stmt");
  if (!stmts.length) return { code, map: null, wrapped: false };

  const out = [], map = [];
  const add = (text, origLine) => { text.split("\n").forEach((l, i) => { out.push(l); map.push(origLine == null ? null : origLine + i); }); };
  const gen = (text) => add(text, null);
  const kept = (p, transform) => add(transform ? transform(p.text) : p.text, p.line);

  if (lang === "csharp") {
    const usesAwait = stmts.some((p) => /\bawait\b/.test(p.text));
    const returnsValue = stmts.some((p) => /\breturn\s+[^;\s]/.test(stripComments(p.text)));
    // implicit usings, minus the ones the program already has (a duplicate triggers a compiler warning)
    const have = new Set(parts.filter((p) => p.kind === "directive").map((p) => /^using\s+(?:static\s+)?([\w.]+)/.exec(p.head)?.[1]).filter(Boolean));
    const need = ["System", "System.Collections.Generic", "System.IO", "System.Linq", "System.Text", "System.Threading.Tasks"].filter((n) => !have.has(n));
    if (need.length) gen(need.map((n) => `using ${n};`).join(" "));
    parts.filter((p) => p.kind === "directive").forEach((p) => kept(p));
    if (opts.modern) {
      // modern C# (.NET 6+): top-level statements first, type declarations after them
      stmts.forEach((p) => kept(p));
      parts.filter((p) => p.kind === "decl").forEach((p) => kept(p));
    } else {
      // old Mono compiler: needs a class with a Main method (async Main is not supported there)
      parts.filter((p) => p.kind === "decl").forEach((p) => kept(p));
      const hasProgram = /\bclass\s+Program\b/.test(plain);
      const cls = hasProgram ? "DexnaEntry" : "Program";
      gen(`class ${cls} {`);
      if (usesAwait) {
        gen(`static ${returnsValue ? "int" : "void"} Main(string[] args) { ${returnsValue ? "return " : ""}MainAsync(args).GetAwaiter().GetResult(); }`);
        gen(`static async ${returnsValue ? "Task<int>" : "Task"} MainAsync(string[] args) {`);
      } else gen(`static ${returnsValue ? "int" : "void"} Main(string[] args) {`);
      stmts.forEach((p) => kept(p));
      gen("}");
      gen("}");
    }
  } else if (lang === "java") {
    gen("import java.util.*; import java.io.*; import java.util.function.*; import java.util.stream.*; import java.math.*;");
    parts.filter((p) => p.kind === "directive").forEach((p) => kept(p));
    parts.filter((p) => p.kind === "decl").forEach((p) => kept(p, (t) => t.replace(/^(\s*)public\s+/, "$1")));
    gen("public class Main {");
    parts.filter((p) => p.kind === "member").forEach((p) => kept(p, (t) => (/\bstatic\b/.test(stripComments(t).split("{")[0]) ? t : t.replace(/^(\s*)((?:(?:public|private|protected)\s+)?)/, "$1$2static "))));
    gen("public static void main(String[] args) throws Exception {");
    stmts.forEach((p) => kept(p));
    gen("}");
    gen("}");
  } else if (lang === "c" || lang === "cpp") {
    gen(lang === "c" ? "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <math.h>\n#include <ctype.h>\n#include <stdbool.h>\n#include <time.h>" : "#include <bits/stdc++.h>");
    if (lang === "cpp" && !/using\s+namespace\s+std/.test(plain)) gen("using namespace std;");
    parts.filter((p) => p.kind === "decl").forEach((p) => kept(p));
    gen("int main() {");
    stmts.forEach((p) => kept(p));
    gen("return 0;");
    gen("}");
  } else if (lang === "go") {
    const importLines = parts.filter((p) => p.kind === "directive" && /^import\b/.test(p.head));
    const hasPackage = parts.some((p) => p.kind === "directive" && /^package\b/.test(p.head));
    if (!hasPackage) gen("package main");
    parts.filter((p) => p.kind === "directive" && /^package\b/.test(p.head)).forEach((p) => kept(p));
    if (importLines.length) importLines.forEach((p) => kept(p));
    else {
      const used = [...new Set([...plain.matchAll(/\b([a-z]+)\.[A-Z]/g)].map((m) => m[1]))].filter((n) => GO_PACKAGES[n]);
      if (used.length) gen("import (" + used.map((n) => `"${GO_PACKAGES[n]}"`).join("; ") + ")");
    }
    parts.filter((p) => p.kind === "decl").forEach((p) => kept(p));
    gen("func main() {");
    stmts.forEach((p) => kept(p));
    gen("}");
  } else if (lang === "rust") {
    parts.filter((p) => p.kind === "decl").forEach((p) => kept(p));
    gen("fn main() {");
    stmts.forEach((p) => kept(p));
    gen("}");
  } else if (lang === "kotlin") {
    parts.filter((p) => p.kind === "directive").forEach((p) => kept(p));
    parts.filter((p) => p.kind === "decl").forEach((p) => kept(p));
    gen("fun main() {");
    stmts.forEach((p) => kept(p));
    gen("}");
  }
  return { code: out.join("\n") + "\n", map, wrapped: true };
}

/** Rewrite compiler/runtime messages: generated file names and line numbers become the user's. */
export function mapDiagnostics(text, map, fileName) {
  if (!text) return text;
  const lineOf = (n) => { if (!map) return n; let v = map[n - 1]; for (let k = n - 1; v == null && k > 0; k--) v = map[k - 1]; return v ?? n; };
  const base = fileName.split("/").pop();
  return text
    .replace(/<source>\((\d+)(?:,(\d+))?\)/g, (m, l, c) => `${base}(${lineOf(+l)}${c ? "," + c : ""})`)
    .replace(/\b[\w./\\-]+\.cs\((\d+)(?:,(\d+))?\)/g, (m, l, c) => `${base}(${lineOf(+l)}${c ? "," + c : ""})`)
    .replace(/[\w./\\-]+\.(?:java|kt|rs|c|cpp|cc|go|swift|php|rb):(\d+)(?::(\d+))?/g, (m, l, c) => `${base}:${lineOf(+l)}${c ? ":" + c : ""}`);
}
