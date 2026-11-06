// Online runners: compiled languages that cannot run inside the browser are sent to a public
// compile service. Judge0 CE is the main service; Wandbox is the backup if Judge0 is unreachable.
//
// Only the program source and its input are sent. Dexna asks for consent before the first run.

import { prepareSource, mapDiagnostics } from "./wrap.js";
import { caseHint } from "./langdata.js";

export const JUDGE0 = "https://ce.judge0.com";
export const WANDBOX = "https://wandbox.org";
export const CE = "https://godbolt.org";

// id: Dexna language id; judge0: Judge0 language id; wandbox: { language, prefer } (optional backup)
const L = (id, name, ext, judge0, extra = {}) => ({ id, name, ext, judge0, ...extra });
export const ONLINE_LANGS = [
  L("csharp", "C#", ["cs"], 51, { monaco: "csharp", ce: { compiler: "dotnet100csharpcoreclr", lang: "csharp" }, wandbox: { language: "C#", prefer: "mono" }, note: ".NET 10 on Compiler Explorer (Mono 6.6 if that is down)." }),
  L("java", "Java", ["java"], 91, { monaco: "java", note: "JDK 17. The class with main can have any name." }),
  L("c", "C", ["c"], 103, { monaco: "c", wandbox: { language: "C", prefer: "gcc-1" }, note: "GCC 14" }),
  L("cpp", "C++", ["cpp", "cc", "cxx"], 105, { monaco: "cpp", wandbox: { language: "C++", prefer: "gcc-1" }, note: "GCC 14" }),
  L("go", "Go", ["go"], 107, { monaco: "go", wandbox: { language: "Go", prefer: "go-1" }, note: "Go 1.23" }),
  L("rust", "Rust", ["rs"], 108, { monaco: "rust", wandbox: { language: "Rust", prefer: "rust-1" }, note: "Rust 1.85" }),
  L("kotlin", "Kotlin", ["kt"], 111, { monaco: "kotlin", note: "Kotlin 2.1" }),
  L("swift", "Swift", ["swift"], 83, { monaco: "swift", wandbox: { language: "Swift", prefer: "swift-" }, note: "Swift 5.2" }),
  L("php", "PHP", ["php"], 98, { monaco: "php", wandbox: { language: "PHP", prefer: "php-8" }, note: "PHP 8.3" }),
  L("ruby", "Ruby", ["rb"], 72, { monaco: "ruby", wandbox: { language: "Ruby", prefer: "ruby-3" }, note: "Ruby 2.7" }),
  L("perl", "Perl", ["pl"], 85, { monaco: "perl", wandbox: { language: "Perl", prefer: "perl-5" } }),
  L("dart", "Dart", ["dart"], 90, { monaco: "dart" }),
  L("scala", "Scala", ["scala"], 112, { monaco: "scala", wandbox: { language: "Scala", prefer: "scala-" } }),
  L("r", "R", ["r"], 99, { monaco: "r", wandbox: { language: "R", prefer: "r-" } }),
  L("haskell", "Haskell", ["hs"], 61, { monaco: "plaintext", wandbox: { language: "Haskell", prefer: "ghc-" } }),
  L("elixir", "Elixir", ["ex", "exs"], 57, { monaco: "elixir", wandbox: { language: "Elixir", prefer: "elixir-" } }),
  L("pascal", "Pascal", ["pas"], 67, { monaco: "pascal", wandbox: { language: "Pascal", prefer: "fpc-" } }),
  L("fortran", "Fortran", ["f90", "f95"], 59, { monaco: "plaintext" }),
  L("groovy", "Groovy", ["groovy"], 88, { monaco: "plaintext", wandbox: { language: "Groovy", prefer: "groovy-" } }),
  L("clojure", "Clojure", ["clj"], 86, { monaco: "clojure" }),
  L("ocaml", "OCaml", ["ml"], 65, { monaco: "plaintext", wandbox: { language: "OCaml", prefer: "ocaml-" } }),
  L("fsharp", "F#", ["fs"], 87, { monaco: "fsharp" }),
  L("vb", "Visual Basic", ["vb"], 84, { monaco: "vb" }),
  L("objc", "Objective-C", ["m"], 79, { monaco: "objective-c" }),
  L("d", "D", ["d"], 56, { monaco: "plaintext", wandbox: { language: "D", prefer: "dmd-" } }),
  L("erlang", "Erlang", ["erl"], 58, { monaco: "plaintext", wandbox: { language: "Erlang", prefer: "erlang-" } }),
  L("lisp", "Common Lisp", ["lisp"], 55, { monaco: "plaintext", wandbox: { language: "Lisp", prefer: "sbcl-" } }),
  L("prolog", "Prolog", ["pro"], 69, { monaco: "plaintext" }),
  L("cobol", "COBOL", ["cob"], 77, { monaco: "plaintext" }),
  L("bash", "Bash", ["sh"], 46, { monaco: "shell" }),
  L("asm", "Assembly (NASM)", ["asm"], 45, { monaco: "plaintext" }),
];
export const ONLINE_BY_ID = Object.fromEntries(ONLINE_LANGS.map((l) => [l.id, l]));
export const ONLINE_BY_EXT = Object.fromEntries(ONLINE_LANGS.flatMap((l) => l.ext.map((e) => [e, l])));

/** Does this source look like it reads from standard input? Used to ask for input before running. */
export function readsInput(lang, code) {
  const rx = {
    csharp: /Console\s*\.\s*(ReadLine|Read|In)\b/, java: /\bScanner\b|System\.in\b|BufferedReader/, c: /\b(scanf|gets|fgets|getchar|fscanf)\s*\(/,
    cpp: /\bcin\b|\bgetline\s*\(|\bscanf\s*\(|\bgetchar\s*\(/, go: /\bfmt\.Scan|bufio\.New(Reader|Scanner)|os\.Stdin/, rust: /\bstdin\s*\(\)/,
    kotlin: /\breadLine\s*\(|\breadln\s*\(|System\.`in`|readLine/, swift: /\breadLine\s*\(/, php: /\b(fgets|fscanf|readline|stream_get_contents)\s*\(|STDIN|php:\/\/stdin/,
    ruby: /\bgets\b|STDIN|\$stdin/, perl: /<STDIN>|<>/, dart: /stdin\./, scala: /StdIn|scala\.io/, r: /readLines|scan\s*\(|readline/,
    haskell: /\bgetLine\b|getContents|interact/, elixir: /IO\.(gets|read)/, pascal: /\bread(ln)?\b/i, fortran: /\bread\s*\(/i, groovy: /System\.in|\.nextLine|readLine/,
    bash: /\bread\b/, ocaml: /read_line|input_line/, d: /readln|stdin/, erlang: /io:(get_line|read)/, lisp: /read-line|\(read\)/, prolog: /\bread\s*\(/, cobol: /ACCEPT/i,
  }[lang];
  return !!rx && rx.test(code);
}

/** Java: Judge0 runs class Main. If the program's main class has another name, add a tiny Main that calls it. */
function adaptJava(code) {
  if (/\bclass\s+Main\b/.test(code)) return code;
  const m = /(?:public\s+)?(?:final\s+)?class\s+(\w+)[^{]*\{[\s\S]*?static\s+void\s+main\s*\(/.exec(code);
  if (!m) return code;
  const name = m[1];
  const stripped = code.replace(new RegExp(`\\bpublic\\s+(final\\s+)?class\\s+${name}\\b`), "$1class " + name);
  return `${stripped}\n\npublic class Main {\n    public static void main(String[] args) throws Exception { ${name}.main(args); }\n}\n`;
}

const timeout = (ms, signal) => { const c = new AbortController(); const t = setTimeout(() => c.abort(new DOMException("timeout", "TimeoutError")), ms); signal?.addEventListener("abort", () => c.abort(signal.reason)); return { signal: c.signal, done: () => clearTimeout(t) }; };

// Judge0 wants base64 so that any text (å, ä, ö, emoji) survives in both directions
const b64enc = (str) => { const bytes = new TextEncoder().encode(str); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); };
const b64dec = (b64) => {
  if (!b64) return "";
  const bin = atob(b64), bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch (_) { return new TextDecoder("windows-1252").decode(bytes); } // a program that printed Latin-1
};
const transient = (message) => Object.assign(new Error(message), { transient: true });
const isAbort = (e, signal) => e.name === "AbortError" || e.name === "TimeoutError" || signal?.aborted;

async function judge0(lang, prep, stdin, signal) {
  const src = lang.id === "java" ? adaptJava(prep.code) : prep.code;
  const t = timeout(45000, signal);
  try {
    const r = await fetch(`${JUDGE0}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,message,time,memory,status`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: t.signal,
      body: JSON.stringify({ source_code: b64enc(src), language_id: lang.judge0, stdin: b64enc(stdin || "") }),
    });
    if (r.status === 429) throw transient("The online compiler is busy (rate limit). Try again in a few seconds.");
    if (!r.ok) throw Object.assign(new Error(`The online compiler returned ${r.status}.`), { transient: r.status >= 500 });
    const j = await r.json();
    const id = j.status?.id;
    const out = { provider: "ce.judge0.com", stdout: b64dec(j.stdout), stderr: "", compile: b64dec(j.compile_output), time: j.time ? Number(j.time) : 0, memory: j.memory || 0, status: j.status?.description || "" };
    const msg = b64dec(j.message), err = b64dec(j.stderr);
    if (id === 6) { out.ok = false; out.kind = "compile"; }
    else if (id === 5) { out.ok = false; out.kind = "timeout"; out.stderr = "Time limit exceeded."; }
    else if (id === 13 || id === 14) { out.ok = false; out.kind = "internal"; out.stderr = msg || j.status?.description || "The online compiler had an internal error."; }
    else if (id >= 7 && id <= 12) { out.ok = false; out.kind = "runtime"; out.stderr = err || msg || j.status.description; }
    else { out.ok = true; out.stderr = err; }
    return out;
  } catch (e) {
    if (isAbort(e, signal) || e.transient !== undefined) throw e;
    throw transient("Could not reach the online compiler (" + (e.message || e) + ").");
  } finally { t.done(); }
}

const ceText = (lines) => (lines || []).map((l) => l.text).join("\n") + (lines?.length ? "\n" : "");
async function compilerExplorer(lang, prep, stdin, signal) {
  const t = timeout(60000, signal);
  try {
    const r = await fetch(`${CE}/api/compiler/${lang.ce.compiler}/compile`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, signal: t.signal,
      body: JSON.stringify({ source: prep.code, lang: lang.ce.lang, options: { userArguments: "", executeParameters: { args: [], stdin: stdin || "" }, compilerOptions: { executorRequest: true }, filters: { execute: true }, tools: [], libraries: [] } }),
    });
    if (r.status === 429) throw transient("Compiler Explorer is busy (rate limit).");
    if (!r.ok) throw Object.assign(new Error(`Compiler Explorer returned ${r.status}.`), { transient: r.status >= 500 });
    const j = await r.json();
    const build = j.buildResult || {};
    const buildText = ceText(build.stdout) + ceText(build.stderr);
    const base = { provider: "godbolt.org", time: (j.execTime || 0) / 1000, memory: 0, stdout: "", stderr: "", compile: "" };
    if (!j.didExecute && j.code !== 0) return { ...base, ok: false, kind: "compile", compile: buildText || ceText(j.stderr) };
    const ok = j.code === 0;
    return { ...base, ok, kind: ok ? "" : "runtime", stdout: ceText(j.stdout), stderr: ceText(j.stderr), time: (j.execTime || 0) / 1000 };
  } catch (e) {
    if (isAbort(e, signal) || e.transient !== undefined) throw e;
    throw transient("Could not reach Compiler Explorer (" + (e.message || e) + ").");
  } finally { t.done(); }
}

let wandboxList = null;
async function wandbox(lang, prep, stdin, signal) {
  const code = prep.code;
  if (!lang.wandbox) throw new Error(`${lang.name} is not available on the backup compiler.`);
  const t = timeout(45000, signal);
  try {
    wandboxList ||= await (await fetch(`${WANDBOX}/api/list.json`, { signal: t.signal })).json();
    const all = wandboxList.filter((c) => c.language === lang.wandbox.language);
    const compiler = (all.find((c) => c.name.startsWith(lang.wandbox.prefer) && !c.name.includes("head")) || all.find((c) => !c.name.includes("head")) || all[0])?.name;
    if (!compiler) throw new Error(`${lang.name} is not available on the backup compiler.`);
    const r = await fetch(`${WANDBOX}/api/compile.json`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: t.signal, body: JSON.stringify({ compiler, code, stdin: stdin || "", save: false }) });
    if (!r.ok) throw new Error(`The backup compiler returned ${r.status}.`);
    const j = await r.json();
    const failedCompile = j.status !== "0" && (j.compiler_error || "").trim() && !(j.program_output || j.program_error);
    return { provider: "wandbox.org", ok: j.status === "0", kind: failedCompile ? "compile" : j.status === "0" ? "" : "runtime", stdout: j.program_output || "", stderr: failedCompile ? "" : j.program_error || "", compile: failedCompile ? j.compiler_error : "", time: 0, memory: 0, status: "" };
  } finally { t.done(); }
}

/**
 * Compile and run `code` online. Tries the services in order and moves on only when one is down or busy.
 * @returns {Promise<{ok:boolean, kind:string, stdout:string, stderr:string, compile:string, time:number, memory:number, provider:string}>}
 */
export async function runOnline(lang, code, stdin, signal, fileName = "Main") {
  const attempts = [];
  if (lang.ce) attempts.push(["ce", compilerExplorer, { modern: true }]);
  attempts.push(["judge0", judge0, {}]);
  if (lang.wandbox) attempts.push(["wandbox", wandbox, {}]);
  let firstError = null;
  for (const [name, run, opts] of attempts) {
    // programs without an entry point (just statements) get one added; error lines are mapped back afterwards
    const prep = prepareSource(lang.id, code, opts);
    try {
      const r = await run(lang, prep, stdin, signal);
      r.wrapped = prep.wrapped;
      r.compile = mapDiagnostics(r.compile, prep.map, fileName);
      r.stderr = mapDiagnostics(r.stderr, prep.map, fileName);
      if (r.ok) { // JVM start-up noise from the Kotlin and Java tools
        const clean = (t) => (t || "").split("\n").filter((l) => !/^WARNING: /.test(l)).join("\n").replace(/^\s+$/, "");
        r.stderr = clean(r.stderr);
        r.compile = clean(r.compile);
      }
      if (!r.ok) r.hint = caseHint(lang.id, `${r.compile}\n${r.stderr}`);
      if (name !== attempts[0][0]) r.fallback = true;
      return r;
    } catch (e) {
      if (isAbort(e, signal)) throw e;
      firstError ||= e; // this service is down or busy: try the next one
    }
  }
  throw new Error(`${firstError?.message || "The online compilers are unavailable."}${attempts.length > 1 ? " The backup compilers failed too." : ""}`);
}
