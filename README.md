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

## Assistant (free, runs on your device)

The chat icon in the activity bar (or **Ctrl+Alt+I**) opens the Assistant: a coding helper that runs **entirely in your browser**. There is no account, no API key and no cost.

- Pick a model and press **Download and start**. It downloads once (from Hugging Face), the browser caches it, and after that it starts offline.
  | Model | Download | Graphics memory |
  | --- | --- | --- |
  | Small (Qwen2.5-Coder 0.5B) | about 0.5 GB | 1 GB |
  | Medium (Qwen2.5-Coder 1.5B), recommended | about 1 GB | 1.6 GB |
  | Large (Qwen2.5-Coder 7B), gaming-class graphics cards only | about 4.5 GB | 5.1 GB |

  Graphics memory is what counts, not your computer's RAM: a model too big for the graphics card is very slow and can make the whole computer lag. The panel shows the speed of the last answer and suggests a smaller model when it is too slow. Graphics cards without 16-bit support use slightly larger 32-bit builds.
- It sees the open file (or just your selection) and, when you ask about an error, the output of your last run. Your code never leaves the browser.
- **Explain**, **Find bugs**, **Explain the error** and **Add comments** are one click, and the same entries are in the editor's right-click menu and the command palette.
- Code in an answer has **Copy**, **New file**, **Insert at cursor** / **Replace selection** and, for whole-file fixes, **Replace file**. Every change can be undone with Ctrl+Z.
- **Auto** (the switch at the top of the panel) makes it do the work: ask for a new program and it creates a project and types the code into the editor as it writes it; ask for a change and it rewrites the open file. A web page goes into `index.html`, `style.css` and `script.js`. Each write is one Ctrl+Z. While it types, that file is read-only. Slips small models make are repaired on the spot, and every repair is checked with the language's own parser so working code is never changed: in Python an extra closing bracket, a string split over two lines, an `else`/`elif`/`except` at the wrong indentation, a missing `:` or an unindented block; in JavaScript and web pages stray or mismatched brackets and split strings; if the file still has errors, Auto asks the model to fix them once by itself, and **Fix errors** on the card does it on demand.
- Answers are typed out smoothly, at a steady pace.
- It needs WebGPU: a recent Chrome or Edge on a computer. Phones and some older laptops cannot run it.
- These are small models, so they are best at explaining code, finding bugs and writing short pieces of code. Check what they suggest.

Built with [WebLLM](https://github.com/mlc-ai/web-llm) and [Qwen2.5-Coder](https://huggingface.co/Qwen) (Apache 2.0).

## Editor

- Monaco (the engine behind VS Code): multi-file projects with folders and tabs, breadcrumbs, minimap, sticky scroll, bracket pair colouring, multi-cursor, find and replace, code folding.
- **Snippets for every language**: type the trigger and press Tab (`main`, `for`, `class`, `cw`, `sout`, `forp`, `ct` and more). **Help > Languages and Snippets** lists them all.
- **73 colour themes** (46 dark, 27 light), including Black and White, White and Black (keywords in bold, icons in grey), Palenight, GitHub Dark and Dimmed, Kanagawa, Catppuccin Frappé and Macchiato, Ayu Dark, Tokyo Day, Nord Light, Flexoki and more: Settings > Appearance, or Ctrl+Shift+P > "Color Theme". The sun/moon button flips between your last dark and last light theme.
- **Looks** (Settings > Background and effects, or View > Choose a Look): one click sets a theme plus a matching animated background and effects. **Aurora**, **Deep space**, **Constellation** (points that link up and follow your mouse), **Synthwave** (a neon grid to the horizon), **Ocean**, **Code rain**, **Lagoon** (bubbles in a light theme), **Silk** (ribbons of light), **Sea of dots** (a rolling sea made of points), **Ripples** (click anywhere to make one), **Flow** (threads drifting on a current), **Rolling hills**, **Lava lamp**, **Plasma**, **Seaside** (waves in a light theme), **Soft light** and **Classic** (no effects).
- **Animated backgrounds** behind a see-through editor and panels: aurora, flowing gradient, constellation, starfield, waves, retro grid, code rain, bubbles, silk ribbons, sea of dots, ripples, flow field, rolling hills, lava lamp, plasma, hyperspace, spiral galaxy, meteor shower, topographic map, circuit board, hex grid pulses, glass shards, light beams, drifting clouds, rain on glass, thunderstorm, DNA helix, orbits, gradient mesh, bokeh lights, equalizer, or **your own image** (with blur). Sliders set the strength, the speed and how much the panels cover it; **Frosted glass** blurs it behind the side bar and panel. The animation runs at a gentle frame rate, pauses when the tab is hidden, and stays still when your system asks for reduced motion.
- **Fonts and shape**: 7 interface fonts and 10 code fonts (Fira Code, Source Code Pro, IBM Plex Mono and more), line spacing, sharp or rounded corners, and your own **accent color** with any theme.
- **Cursor effects**: a soft glow around the cursor, or sparks as you type.
- **Layout** (Settings > Layout): the side bar on the left or right, the panel at the bottom or on the right (both still resize by dragging), compact, normal or roomy spacing, interface and terminal text sizes, colorful, plain or no file icons, and hide the activity bar, the status bar or single activity bar icons.
- **More editor options**: rulers, cursor blinking and width, line highlight, indentation and bracket guides, folding, minimap side, scroll bar size, code font weight and letter spacing, tabs or spaces, closing brackets and quotes, suggestions while typing, Enter or Tab to accept, hover delay, Alt or Ctrl to add cursors, and trim trailing spaces or end with a newline on save.
- **Tabs and bars**: tab style (classic, pills, underline or minimal), when the close button shows, file icons on tabs, wrapping tabs onto more rows, or no tab bar at all (middle-click also closes a tab). Hide the breadcrumbs, show Run and Debug as icons only, pick which status bar items show, and add a clock.
- **Per-language indent sizes** (2 for JavaScript and web pages, 4 for Python, and so on), a **centered editor** column for wide screens, and your own **cursor** and **selection colors**.
- **A greeting**: put your name in Settings > Layout and the Home page says good morning (or afternoon, or evening).
- **Sounds for runs and saves**: a chime when a program finishes, a lower one when it fails, a soft tick on save. **Reduce motion** turns off animations and smooth scrolling everywhere.
- **Typing sounds**: soft clicks, a typewriter (with a bell on Enter), bubbles or a mechanical keyboard, with a volume slider.
- **Your own CSS** (Settings > Layout): restyle anything, applied as you type.
- **Export and import settings** (Settings > Data and privacy): your settings, themes, shortcuts, snippets, looks and templates in one file, for a backup or another device.
- **Extras** (Settings > Extras):
  - **Theme from a picture**: pick a wallpaper, photo or album cover and Dexna builds a whole color theme from it (every color checked to stay readable), and can use the picture as the background.
  - **Chroma accent**: the accent color slowly travels around the color wheel.
  - **Neon code**: the code glows in its own colors.
  - **Smooth cursor trail**: the cursor glides and leaves a short smear when it jumps.
  - **Screen filters**: retro CRT monitor, film grain, vignette, or a warm night light.
  - **Ambient sounds**: rain, ocean waves, a fireplace, brown noise or a space hum, all made in the browser.
  - **Day and night themes** that switch by the clock.
  - **Confetti** from the Run button when a program works.
  - **Focus mode** dims all but the block (or line) you are on; **typewriter scrolling** keeps your line in the middle of the screen; **rainbow indentation** colors each level.
  - The browser tab's icon takes on your accent color.
- **Landscape scenes**: a pine forest with mist, mountains with drifting clouds and birds, a mountain lake with reflections, an ocean sunset, desert dunes, a city at night with lights in the windows, underwater light rays with fish and kelp, star trails, a windy meadow, a koi pond (click to make a ripple), jellyfish, sky lanterns and a ringed planet. Each has a night version for dark themes and a day version for light ones, tinted by the theme's accent. Looks to match: Forest, Alpine, Mountain lake, Sunset beach, Dunes, Skyline, Deep sea, Night sky, Meadow, Koi pond, Jellyfish, Lantern festival and Ringed planet. Plus a waterfall with spray, a winter cabin with chimney smoke, a volcano with lava and embers, a tropical beach with swaying palms, northern lights, a night train, a lighthouse with a sweeping beam, a campfire, a black hole with a glowing disk, a sea of clouds at sunrise, hot air balloons and a wind farm, each with its own look.
- **Cozy and retro backgrounds**: a rainy night window with city lights and drops running down the glass, a snowy window with a candle on the sill, a fireplace, flickering neon signs in the rain, an anime sky with big clouds and power lines, an outrun sunset with a neon grid, and two pixel-art scenes (a city at night with a passing train, and a sunset over the sea). Each has a matching look.
- **Glossy and pixel backgrounds**: holographic ribbons, liquid glass, liquid chrome, satin (in your theme's colors), prism, liquid marble, glass orbs and layered waves; plus pixel-art ones: pixel marble, pixel waves, pixel holo, pixel fire and a turning pixel planet. Each has a matching look.
- **Calm backgrounds** that hardly move, so they never pull your eye from the code: graph paper, paper grain, a vignette, a large faint clock showing the time, today's moon phase, a zen garden, a breathing guide (in, hold, out, hold), a blueprint and terrazzo. They use your theme's colours, and the still ones are drawn once.
- **Everything is listed alphabetically**: backgrounds, looks and themes.
- **Minimal black backgrounds** (they stay black in light themes too): dust in a shaft of light, an eclipse, a dot grid lit by a spotlight that follows your mouse, a single wave line, sonar rings, a sparse night sky, drifting lines and small orbits. Their looks pair them with the Black and White theme.
- **The logo follows the theme**: the Dexna logo in the app and the browser-tab icon both take the theme's accent and background colours.
- **More backgrounds**: mouse ink that follows the pointer, snow, sakura petals, autumn leaves, fireflies, fireworks, and **your own video** (a short clip that loops, muted). New looks to match: Winter night, Hanami, Autumn, Summer night, Celebration and Ink.
- **Your own themes** (Help > Create Color Theme, or **New theme** in Settings): pick 15 colours, see the whole app change as you go, and save. Dexna nudges colours that would be hard to read. **Copy** a theme as text and **Import** it on another device.
- **Back and forward** (Alt+Left / Alt+Right, the arrows next to the menus, or the mouse's side buttons): retrace your jumps between files and places. On a Mac, where Option+Left moves by word, these have no keys until you set your own. **Go to Last Edit Location** takes you back to where you last typed.
- **Symbols in every file** (Ctrl+Alt+O, or `#` in Ctrl+P): jump to any function, class or variable in the project.
- **Your own keyboard shortcuts** (Help > Change Keyboard Shortcut): give any command a shortcut or change one. Dexna warns about clashes and about keys the browser keeps for itself.
- **Color swatches**: colours written in any language (`"#ff8800"`, `rgb(...)`, `hsl(...)`) get a swatch; click it for a colour picker.
- Settings is a full page with search, categories and per-setting reset.
- **Settings (JSON)** (the settings.json button, or Help > Open Settings (JSON)): edit every setting as JSON, like VS Code's settings.json, with completion of setting names and values, a description on hover, and validation before saving. Remove a line to put that setting back to its default.
- **Project settings** (Help > Open Project Settings): settings that apply to one project only and travel with it in ZIP downloads and share links: indent size and tabs, rulers, word wrap, format/trim/newline on save, run on save, hidden files, file associations and more. The settings page marks a setting the project overrides.
- **Profiles** (the status bar or Help > Profiles: Switch Profile): keep whole sets of settings and switch between them. **Presentation** (View > Toggle Presentation Profile) gives large text and no effects, for screen sharing.
- **Auto save** (Settings > Files): as you type (right away or after 1, 3 or 10 seconds), when you click away or switch windows, or only with Ctrl+S, with a dot on tabs that have unsaved edits and a warning before leaving the page.
- **Files** (Settings > Files): hide files and folders by pattern from the Explorer, search and Go to File (`*.log`, `__pycache__`, `build/**`), sort the Explorer by name or by type, file associations (open `*.mdx` as Markdown), and whether deleting asks first.
- **Protection against an accidental Ctrl+W** (Settings > Files): the browser asks "Leave site?" before the Dexna tab closes or reloads (always, or only with unsaved edits). Browsers do not let a page block Ctrl+W itself, but in full screen (View > Toggle Full Screen) Dexna takes Ctrl+W over, so it closes the editor tab like in VS Code (Chrome and Edge).
- **Inlay hints** for JavaScript and TypeScript: parameter names and inferred types shown inline, always or while holding Ctrl+Alt.
- Command palette (Ctrl+Shift+P), quick open (Ctrl+P), search and replace across files. Quick open also takes `>` for commands, `:` for a line, `@` for a symbol, `#` for a symbol in any file, `=` for a **calculator** (`=2^10`, `=sqrt(2)`, `=15% * 80`, `=0xff + 1`) and `?` for help.
- **Vim keys** (Settings > Editor): modes, motions, operators, registers, macros, `:w` to save. The mode shows in the status bar.
- **Bookmarks**: Ctrl+Alt+K marks a line, Ctrl+Alt+L / Ctrl+Alt+J jump between them across files, and the Bookmarks tab lists them. They move with your edits.
- **TODOs**: every `TODO`, `FIXME`, `HACK`, `BUG` and `NOTE` comment in the project, highlighted in the editor and listed in the TODOs tab.
- **Text menu**: sort lines (numbers in order), remove duplicates, reverse, shuffle, change case (camelCase, snake_case, PascalCase, kebab-case, CONSTANT_CASE and more), Base64 and URL encode/decode, evaluate math in the selection, insert a UUID or a date.
- **Split editor** (Ctrl+\\): a second editor beside the first, for another file or another part of the same one. Edits show in both. Swap sides with one click; Dexna remembers the split for each project.
- **Markdown preview** (Ctrl+Shift+V): beside the editor, updated as you type and scrolled along with it. Tables, task lists, GitHub-style notes, highlighted code blocks, **math** (`$e^{i\pi}$` and `$$...$$` blocks, rendered with KaTeX) and **diagrams** (` ```mermaid ` blocks: flowcharts, sequence diagrams, class diagrams, Gantt charts and more).
- **Your own snippets** (Edit > Configure User Snippets): a prefix, a language (or all of them) and a body with tab stops (`$1`, `${1:name}`, `$0`). They show in the suggestions like built-in ones. **Save Selection as Snippet** turns selected code into one. Import and export in VS Code's snippet format.
- **Clipboard history** (Ctrl+Shift+Alt+V): the last 40 things you copied or cut, to paste again.
- **Local history** (File > Local History, or a tab's right-click menu): Dexna keeps earlier versions of every file automatically, separate from commits: when you start editing, every few minutes while you type, when you press Ctrl+S, and before a file is deleted. Compare any version with the file now and restore it, or bring back a deleted file.
- **Previews for data files** (Ctrl+Shift+V or the **Preview** button): CSV and TSV files as a table you can sort and filter, JSON as a tree you can fold (with the line and column of any mistake), and SVG files as a picture you can zoom.
- **Shell** (a tab in the bottom panel): `ls`, `cd`, `tree`, `cat`, `head`, `tail`, `wc`, `touch`, `mkdir`, `rm`, `mv`, `cp`, `echo ... > file`, `grep`, `find`, `open`, `run`, `calc` and more, on your project's files. File names in the output open in the editor; Tab completes, Up and Down bring back earlier commands, and `&&` chains them.
- **Notes** (a tab in the bottom panel): notes for each project, saved with it.
- **Focus timer** (View > Focus Timer): 25-minute Pomodoro, 50, 15, 90 or any number of minutes. The countdown sits in the status bar, keeps going if you reload, chimes at the end and offers a break.
- **Your coding activity** (View menu or Home): time spent coding today, this week and this month, your streak, a year-long heatmap and your languages. A minute counts when you type in it; nothing leaves the browser.
- **Project templates** (File > Save Project as Template): start new projects from your own setups. They appear on the Home page.
- **Run on save** (Settings > Editor, or Run > Toggle Run on Save): Ctrl+S also runs the file.
- **Save code as an image** (File menu or right-click): a PNG of the selection or file in your theme's colours, to download or copy.
- **Zen mode** (Ctrl+K Z): just the code, centred. Esc twice leaves.
- **Project statistics** (View menu): files, lines of code, comments and blank lines per language, and the largest files.
- Cursor style, relative line numbers and smooth caret animation in Settings.

## Source Control

A local history for every project, like a small Git with no setup: open **Source Control** (Ctrl+Shift+G).

- **Changes** lists every file added, changed or deleted since the last commit, with line counts. Click one to see a side-by-side (or inline) **diff**; untick files to leave them out of a commit.
- **Commit** saves a snapshot of the whole project. Leave the message empty and Dexna writes one ("Update main.py").
- **History**: see what any commit changed, compare it with your files now, **restore** a version, or undo the last commit.
- **Change markers** next to the line numbers show added (green), changed (blue) and deleted (red) lines. Click one to open the diff.
- **File History** and **Compare with Last Commit** on a tab's right-click menu. **Compare Active File With...** compares two files, or a file with the clipboard.

Commits are stored in this browser (IndexedDB), next to the projects.

## Toolbox

Developer tools in the sidebar, all running in the browser:

| Tool | What it does |
| --- | --- |
| Regex tester | Live matches, capture groups (numbered and named) and replace. Runs in a worker and stops after a second, so a runaway pattern cannot freeze the page |
| JSON | Validate (with line and column), format, minify, sort keys, generate TypeScript interfaces |
| Encode / decode | Base64, Base64 URL, URL, HTML entities, hex, binary and Unicode escapes, both directions |
| Hash | MD5, SHA-1, SHA-256, SHA-384, SHA-512 and CRC-32 |
| UUIDs and passwords | UUID v4 and v7, passwords with a strength meter, random numbers |
| Timestamps | Unix seconds or milliseconds to dates in UTC and your time zone, and back |
| Colors | Any CSS color to hex, RGB and HSL, WCAG contrast, tints and shades |
| Number bases | Decimal, hex, octal and binary of any size |
| JWT decoder | Header, claims, and when it expires (decoded only, never sent anywhere) |
| Text | Counts, case conversion, line tools, lorem ipsum |
| Compare text | Paste two versions and see the diff |

Every result has Copy and Insert (into the editor at the cursor).

## Running code

- Python runs in a background worker, so the UI never freezes. `input()`, a working **Stop** button and a kernel restart all work.
- **Debugger** (Python): breakpoints, step over/into/out, call stack, locals and globals, watch expressions and a debug console.
- Interactive Python console that shares your program's variables, a variable explorer, and `# %%` cells with "Run Cell" lenses.
- matplotlib figures show inline and in a Plots tab. Files your program creates appear in the Explorer.
- **Tests** (the Tests tab, or Run > Run All Tests, Ctrl+Shift+;): finds tests in `test_*.py` and `*_test.py` files: functions named `test_...` with plain `assert`, `Test...` classes, and `unittest.TestCase` classes. Run all of them, one file, one test, or only the ones that failed. Each test gets a check or a cross next to it in the editor, and a failure shows the failing line, the message and the values of the names on that line (`total  0.30000000000000004`). No need to install pytest; tests that need pytest fixtures are skipped with a note.
- **Coverage** (Run > Run with Coverage): marks every line that ran in green and every line that did not in red, and prints the percentage for each file. Run > Clear Coverage removes the marks.
- **Profiler** (Run > Run with Profiler): a table of every function with its calls, own time and total time, sortable, with only your code or everything. Click a row to jump to the function.
- **Run settings** (Run > Run Settings): command-line arguments (`sys.argv`), environment variables (`os.environ`) and answers for `input()`, typed in the dialog or read from a file in the project. They are saved per file with the project; the prepared answers show in the terminal as if typed, and after them `input()` asks as usual.
- Terminal with ANSI colours and clickable tracebacks. Runtime errors are highlighted in the editor.

## Packages

- **Python**: install and uninstall from Pyodide's package set or PyPI in the Packages view. Missing imports install automatically when you run.
- **JavaScript and TypeScript**: import any npm package by name (`import dayjs from "dayjs"`). It loads from esm.sh, and the Packages view can search npm and pin versions.
- **Lua**: 17 popular libraries (json, inspect, middleclass, classic, lume, luafun, serpent, tween, flux, semver, memoize, argparse, log, Moses, 30log, stateful, ansicolors). **Add** downloads the library's single `.lua` file into your project, pinned to an exact version, so `require("json")` just works; **Example** creates a file that shows how to use it.
- **Web pages**: 28 popular libraries (Chart.js, D3, three.js, p5.js, Phaser, Kaboom, PixiJS, Matter.js, GSAP, Bootstrap, Pico CSS, Font Awesome, Alpine.js, Leaflet, Tone.js and more), or search the thousands on **cdnjs**. Adding one puts its `<script>` or `<link>` tag into your page; library stylesheets go before your own, so your CSS still wins. The view lists the libraries a page loads, with a button to remove each.
- **SQL**: SQLite has everything built in, so instead there are **sample databases** to practise on: an online shop, a school, a company with a management tree, well-known films, and countries. Each is a `.sql` file that creates and fills the tables and ends with example queries.
- **Online languages** get only the file you run, with their standard library.

## Projects

Multiple projects, upload files or import a ZIP, download a project as a ZIP, and **share links** that pack the whole project into the URL (nothing is uploaded). Everything autosaves to your browser's local storage, and Source Control keeps as many committed versions as you like.

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
| Source Control | Ctrl+Shift+G |
| Split editor | Ctrl+\\ |
| Go back / forward | Alt+Left / Alt+Right |
| Go to symbol in any file | Ctrl+Alt+O |
| Paste from clipboard history | Ctrl+Shift+Alt+V |
| Markdown preview | Ctrl+Shift+V |
| Toggle bookmark / next / previous | Ctrl+Alt+K / Ctrl+Alt+L / Ctrl+Alt+J |
| Zen mode | Ctrl+K Z |

## How it works

| Piece | Role |
| --- | --- |
| `index.html`, `css/`, `js/app.js` | The IDE shell and all UI |
| `js/themes.js` | The 73 themes. UI, editor and terminal colours are derived from a small palette each, with contrast adjustments |
| `js/pyworker.js`, `py/kernel.py`, `py/lsp.py` | Pyodide in a Web Worker, as the Python **kernel** (your code, debugger) and the Python **language server** (jedi, pyflakes, black, isort) |
| `js/runner.js` | A worker that runs JavaScript, TypeScript (compiled by the editor), Lua and SQL |
| `js/langtools.js`, `js/langdata.js` | Completion, hover, signatures, formatting and outlines for every language except Python |
| `js/langmodes.js` | Syntax colours, comment toggling, keyword completion and snippets for the languages Monaco has no full support for, and Emmet for HTML and CSS |
| `js/starters.js` | The preset each new project starts with |
| `js/extras.js` | The diff viewer, change markers, bookmarks, TODOs, text commands, code images, Zen mode, Vim keys, the calculator, statistics and the Markdown preview |
| `js/plus.js` | The shell, CSV / JSON / SVG previews, the focus timer, coding activity, templates and notes |
| `js/prefs.js` | Settings as JSON, project settings, profiles, and the patterns for hidden files and file associations |
| `js/look.js` | Looks, animated backgrounds, your background image, fonts, corners and cursor effects |
| `js/scenes.js` | The landscape backgrounds (forest, mountains, lake, sunset, city, underwater and the rest) |
| `js/scenes2.js` | More landscapes (waterfall, winter cabin, volcano, northern lights, lighthouse, campfire and the rest) |
| `js/cozy.js` | Cozy and retro backgrounds (rainy window, snowy window, fireplace, neon signs, anime sky, outrun, pixel art) |
| `js/flow.js` | Glossy ribbon backgrounds (holographic, liquid glass, chrome, satin, prism) |
| `js/flow2.js` | Liquid marble, glass orbs, layered waves and the pixel-art backgrounds |
| `js/minimal.js` | Minimal black backgrounds (dust, eclipse, dot grid, wave line, sonar, night, drift lines, orbits) |
| `js/calm.js` | Calm backgrounds (graph paper, paper, vignette, clock, moon phase, zen garden, breathe, blueprint, terrazzo) |
| `js/devtools.js` | The Tests and Profile tabs, coverage marks and run settings (the kernel side is in `py/kernel.py`) |
| `js/more.js` | Back and forward, symbols across the project, your own shortcuts and themes, colour swatches |
| `js/power.js` | The split editor, your snippets, clipboard history, local history and run on save |
| `js/scm.js`, `js/diff.js` | Source Control (commits in IndexedDB) and the line diff (Myers' algorithm) behind it |
| `js/toolbox.js` | The Toolbox |
| `js/markdown.js` | The Markdown renderer for the preview (math and diagrams are drawn by KaTeX and Mermaid, loaded only when a file uses them) |
| `js/assistant.js`, `js/ai-worker.js` | The Assistant: the chat panel, and the worker that runs the model with WebLLM on WebGPU |
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

Monaco, Pyodide, jedi, pyflakes, black, isort, wasmoon, SQLite, StyLua, sql-formatter, clang-format, gofmt, luaparse, Emmet (emmet-monaco-es), monaco-vim, WebLLM with Qwen2.5-Coder, IBM Plex Sans and JetBrains Mono (both under the SIL Open Font License). Online runs use Judge0 CE, Compiler Explorer and Wandbox.
