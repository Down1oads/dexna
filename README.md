<p align="center"><img src="assets/logo.svg" width="88" alt="Dexna logo"></p>

<h1 align="center">Dexna</h1>
<p align="center"><b>A code editor and runner that lives entirely in your browser.</b><br>
Write and run Python, JavaScript, TypeScript, Lua and SQL. No install, no server, no account.</p>

---

## Getting started

Open the site and pick a language on the Home page. Dexna creates an empty project with one empty file (`main.py`, `main.js`, `main.ts`, `main.lua` or `main.sql`) and you start typing. The example projects are on the Home page too, and Home is always available from the logo or **Help > Home**.

## Features

**Editor** (Monaco, the engine behind VS Code)
- Multi-file projects with folders, tabs (drag to reorder), breadcrumbs, minimap, sticky scroll, bracket colouring, multi-cursor
- **Real Python intelligence** powered by *jedi*: autocompletion with docs, hover help, signature hints, go to definition (even into the standard library), find references, rename symbol across files, symbol outline
- **Live linting** with *pyflakes*, plus quick fixes (add missing `import`, remove unused import)
- **Formatting** with *black* and **import sorting** with *isort*
- Notebook-style **`# %%` cells** with "Run Cell" code lenses

**Languages** (all run locally in your browser, nothing is sent anywhere)

| Language | Runs with | Notes |
| --- | --- | --- |
| Python 3.12 | Pyodide | Full IDE: completion, lint, format, debugger, console, plots, packages |
| JavaScript | Native, in a worker | ES modules across files, top-level `await`, `console.table`, `input()` |
| TypeScript | The editor's TypeScript compiler | Type checking as you type, multi-file imports; type errors don't block a run |
| Lua 5.4 | wasmoon | `require` between files, `io.read` |
| SQL | SQLite (WebAssembly) | In-memory database per run, tables printed as grids |

Python-only features: the debugger, the console, variables, plots and packages. C#, Java, C++ and other compiled languages are not supported yet because they need a server or very large downloads.

**Running code**
- Full CPython 3.12 (Pyodide) in a background worker ; the UI never freezes
- Interactive `input()`, a working **Stop** button (KeyboardInterrupt) and kernel restart
- **Auto-install**: importing a package installs it from Pyodide's distribution or PyPI (`numpy`, `pandas`, `matplotlib`, `scipy`, `sympy`, `scikit-learn`, `rich`, …)
- Programs can read and write project files, new files appear in the Explorer
- **matplotlib** figures show inline and in a Plots gallery (download as PNG)
- Terminal with ANSI colours, clickable tracebacks and runtime-error highlighting

**Debugger**
- Breakpoints (click the gutter / F9), Step Over / Into / Out, Continue
- Call stack, locals & globals, watch expressions, and a debug console that evaluates in the paused frame

**Workspace**
- Interactive Python **console** that shares your program's namespace, with history and multi-line input
- **Variable explorer** with expandable lists, dicts and objects
- Search & replace across files (regex, case, whole word)
- Multiple projects, 9 example projects, upload files / import ZIP, download project as ZIP
- **Share links**, the whole project is compressed into the URL; nothing is uploaded
- Command palette (Ctrl+Shift+P), quick open (Ctrl+P), dark/light themes, configurable settings
- Everything autosaves to your browser's local storage

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Run file | F5 or Ctrl+Enter |
| Debug | F6 |
| Stop | Shift+F5 |
| Run selection / cell in console | Ctrl+Shift+Enter |
| Toggle breakpoint | F9 |
| Step over / into / out | F10 / F11 / Shift+F11 |
| Command palette | Ctrl+Shift+P or F1 |
| Go to file | Ctrl+P |
| Format document | Shift+Alt+F |
| Go to definition / rename | F12 / F2 |

## How it works

| Piece | Role |
| --- | --- |
| `index.html`, `css/`, `js/app.js` | The IDE shell and all UI |
| `js/pyworker.js` | Runs Pyodide in a Web Worker, in two roles: the **kernel** (your code) and the **language server** (jedi, pyflakes, black, isort) |
| `py/kernel.py`, `py/lsp.py` | Python side of the kernel (runner, REPL, debugger via `sys.settrace`) and language services |
| `coi-serviceworker.js` | Adds the COOP/COEP headers GitHub Pages can't send, enabling `SharedArrayBuffer`, required for `input()`, interrupts and the debugger |

The first visit reloads once while the service worker installs. Pyodide and Monaco load from the jsDelivr CDN.

## Run locally

Any static file server works:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploying to GitHub Pages

The included workflow (`.github/workflows/pages.yml`) publishes the site on every push to `main`. In the repository settings, set **Pages to Source** to **GitHub Actions**.
