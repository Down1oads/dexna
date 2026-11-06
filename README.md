<p align="center"><img src="assets/logo.svg" width="88" alt="Dexna logo"></p>

<h1 align="center">Dexna</h1>
<p align="center"><b>A code editor and runner that lives entirely in your browser.</b><br>
Write and run Python, JavaScript, TypeScript, Lua, SQL and web pages (HTML/CSS) on your device, plus 43 more languages online: C#, Java, C++, Go, Rust, Julia, Zig and more.<br>
No install, no account.</p>

---

## Getting started

Open the site and pick a language on the Home page (**More...** lists every other language). Like Visual Studio and VS Code, Dexna starts the project with that language's preset: C# gets the Console App template (`namespace`, `class Program`, `static void Main`), Java a `Main` class, C and C++ a `main` function, Go `package main`, a web page VS Code's `!` HTML boilerplate with `style.css` and `script.js`, and so on. The cursor is placed where you write your code. Every preset compiles and runs as-is. Press **F5** or **Ctrl+Enter** to run it. The examples are on the Home page too, and Home is always one click away on the Dexna logo or under **Help > Home**.

You do not need boilerplate in the compiled languages. In C#, Java, C, C++, Go, Rust and Kotlin you can write just the statements:

```csharp
Console.WriteLine("Hello, world!");
```

If the file has no `Main`/`main`, Dexna adds the missing entry point and imports for you (and maps any compiler error back to your own line numbers). Write your own `Main` and Dexna leaves your code alone.

## Languages

### On your device

Your code never leaves the browser.

| Language | Runs with | Editor support |
| --- | --- | --- |
| Python 3.12 | Pyodide (WebAssembly) | Completion, hover, signatures, go to definition, rename, live errors (pyflakes), format (black, isort), snippets, outline, debugger, console, plots, packages |
| JavaScript | Your browser, in a worker | Completion, hover, errors and rename from the TypeScript service, format, snippets, outline. ES modules across files, top-level `await`, `input()`, npm packages by name |
| TypeScript | The editor's TypeScript compiler | Everything JavaScript has, plus live type checking. Type errors never block a run |
| Lua 5.4 | wasmoon (WebAssembly) | Standard library and your own functions in completion, hover docs, parameter hints, syntax errors as you type, format (StyLua), snippets, outline. `require` between files |
| SQL | SQLite (WebAssembly) | Keyword, function, table and column completion (from your own `CREATE TABLE`), hover docs, format (sql-formatter), snippets, outline |
| HTML/CSS (web pages) | Your browser: a live preview beside the editor | HTML and CSS completion and formatting, **Emmet** like VS Code (`!` + Tab, `ul>li*3` + Tab), snippets. The page updates as you type, your CSS and script files are linked in, links between your pages work, `console.log` shows in the Terminal, `localStorage` is saved with the project. Libraries load from jsDelivr, unpkg or cdnjs |

### Online

These cannot run inside a browser, so Dexna sends **the file you run, and any input you type**, to a public compile service. Dexna asks for your consent before the first online run, labels these languages everywhere, and lets you switch it off under **Settings > Languages**.

| Language | Service | Editor support |
| --- | --- | --- |
| C# (modern .NET) | [Compiler Explorer](https://godbolt.org), then [Judge0](https://ce.judge0.com) (old Mono compiler) | Completion for `Console`, `string`, `Math`, LINQ and more, hover docs, parameter hints, format (clang-format), snippets, outline |
| Java 17, C and C++ (GCC 14) | Judge0, then Wandbox for C and C++ | Same, with `System.out`, `Arrays`, `Collections`, streams, `std::`, stdio and string functions |
| Go 1.23, Rust 1.85, Kotlin 2.1 | Judge0, then Wandbox for Go and Rust | Completion for common packages, macros and methods, format (gofmt for Go), snippets, outline |
| PHP, Ruby, Swift | Judge0, then Wandbox | Completion for common functions and methods, hover docs, snippets |
| Perl, Dart, Scala, R, Haskell, Elixir, Pascal, Fortran, Groovy, Clojure, OCaml, F#, Visual Basic, Objective-C, D, Erlang, Common Lisp, Prolog, COBOL, Bash, Assembly (NASM), FreeBASIC, Octave | Judge0 (Wandbox as backup for many) | Highlighting, comment toggling, keyword completion and snippets |
| Julia, Zig, Crystal, Ada, Odin, Raku, Vala, Mojo, Modula-2 | Compiler Explorer (Wandbox as backup for Julia and Zig) | Same |
| Nim | Wandbox | Same |

Octave and Objective-C both use `.m`: a `.m` file is Objective-C when it has `#import`, `@interface` or `int main(...)`, and Octave otherwise (the same rule GitHub uses).

These services are free and shared, so they can be slow or rate limited. If the main service is down, Dexna tries the next one, and if they are all unreachable it tries once more after a moment. Online programs cannot read input while running, so Dexna shows an input box before the run when the code reads from standard input.

## Editor

- Monaco (the engine behind VS Code): multi-file projects with folders and tabs, breadcrumbs, minimap, sticky scroll, bracket pair colouring, multi-cursor, find and replace, code folding.
- **Snippets for every language**: type the trigger and press Tab (`main`, `for`, `class`, `cw`, `sout`, `forp`, `ct` and more). **Help > Languages and Snippets** lists them all.
- **28 colour themes** (17 dark, 11 light): Settings > Appearance, or Ctrl+Shift+P > "Color Theme". The sun/moon button flips between your last dark and last light theme.
- Settings is a full page with search, categories and per-setting reset.
- Command palette (Ctrl+Shift+P), quick open (Ctrl+P), search and replace across files.

## Running code

- Python runs in a background worker, so the UI never freezes. `input()`, a working **Stop** button and a kernel restart all work.
- **Debugger** (Python): breakpoints, step over/into/out, call stack, locals and globals, watch expressions and a debug console.
- Interactive Python console that shares your program's variables, a variable explorer, and `# %%` cells with "Run Cell" lenses.
- matplotlib figures show inline and in a Plots tab. Files your program creates appear in the Explorer.
- Terminal with ANSI colours and clickable tracebacks. Runtime errors are highlighted in the editor.

## Packages

- **Python**: install and uninstall from Pyodide's package set or PyPI in the Packages view. Missing imports install automatically when you run.
- **JavaScript and TypeScript**: import any npm package by name (`import dayjs from "dayjs"`). It loads from esm.sh, and the Packages view can search npm and pin versions.
- **Lua and SQL**: no package manager in the browser. Put `.lua` files in your project and use `require`.

## Projects

Multiple projects, upload files or import a ZIP, download a project as a ZIP, and **share links** that pack the whole project into the URL (nothing is uploaded). Everything autosaves to your browser's local storage.

## Keyboard shortcuts

**Help > Keyboard Shortcuts** has a searchable list of all of them. The ones you will use most (Ctrl is Cmd on a Mac):

| Action | Shortcut |
| --- | --- |
| Run file | F5 or Ctrl+Enter |
| Debug (Python) | F6 |
| Stop | Shift+F5 |
| Run selection or cell in the console (Python) | Ctrl+Shift+Enter |
| Command palette | Ctrl+Shift+P or F1 |
| Go to file | Ctrl+P |
| Suggestions / parameter hints | Ctrl+Space / Ctrl+Shift+Space |
| Format document | Shift+Alt+F |
| Go to definition / rename | F12 / F2 |
| Toggle comment | Ctrl+/ |
| Move line | Alt+Up / Alt+Down |
| Select next occurrence | Ctrl+D |
| Settings | Ctrl+, |

## How it works

| Piece | Role |
| --- | --- |
| `index.html`, `css/`, `js/app.js` | The IDE shell and all UI |
| `js/themes.js` | The 28 themes. UI, editor and terminal colours are derived from a small palette each, with contrast adjustments |
| `js/pyworker.js`, `py/kernel.py`, `py/lsp.py` | Pyodide in a Web Worker, as the Python **kernel** (your code, debugger) and the Python **language server** (jedi, pyflakes, black, isort) |
| `js/runner.js` | A worker that runs JavaScript, TypeScript (compiled by the editor), Lua and SQL |
| `js/langtools.js`, `js/langdata.js` | Completion, hover, signatures, formatting and outlines for every language except Python |
| `js/langmodes.js` | Syntax colours, comment toggling, keyword completion and snippets for the languages Monaco has no full support for, and Emmet for HTML and CSS |
| `js/starters.js` | The preset each new project starts with |
| `js/online.js`, `js/wrap.js` | The online runners, and the logic that adds a missing `Main` and maps compiler errors back to your lines |
| `coi-serviceworker.js` | Adds the COOP/COEP headers GitHub Pages cannot send, enabling `SharedArrayBuffer` (needed for `input()`, interrupts and the debugger) |

The first visit reloads once while the service worker installs. Pyodide, Monaco, Emmet and the other runtimes load from the jsDelivr CDN.

## Run locally

Any static file server works:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 (it needs an internet connection for the runtimes).

## Deploying to GitHub Pages

The included workflow (`.github/workflows/pages.yml`) publishes the site on every push to `main`. In the repository settings, set **Pages > Source** to **GitHub Actions**.

## Credits

Monaco, Pyodide, jedi, pyflakes, black, isort, wasmoon, SQLite, StyLua, sql-formatter, clang-format, gofmt, luaparse, IBM Plex Sans and JetBrains Mono (both under the SIL Open Font License). Online runs use Judge0 CE, Compiler Explorer and Wandbox.
