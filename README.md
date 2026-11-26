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
| C and C++ (GCC 16, C++23), Rust 1.100 | [Compiler Explorer](https://godbolt.org), then [Judge0](https://ce.judge0.com) | Completion for `std::`, stdio, string functions, macros and methods, hover docs, parameter hints, format (clang-format), snippets, outline |
| C#, Java, Swift, Dart, Visual Basic | Judge0 first (quick, older compilers). Code that needs a newer version runs again on Compiler Explorer (.NET 10, JDK 25, Swift 6.4, Dart 3.14) automatically | Completion for `Console`, `string`, `Math`, LINQ, `System.out`, `Arrays`, `Collections`, streams and more, hover docs, snippets, outline |
| Go 1.23, Kotlin 2.1, Scala, PHP 8.3 | Judge0 (Compiler Explorer as backup for Go) | Completion for common packages and functions, format (gofmt for Go), snippets, outline |
| Ruby 3.4, Perl 5.44, Haskell (GHC 9.12), Pascal, Fortran, OCaml 5.5, F#, D, COBOL | Compiler Explorer, then Judge0 | Highlighting, comment toggling, keyword completion and snippets |
| R, Elixir, Groovy, Clojure, Objective-C, Erlang, Common Lisp, Prolog, Bash, Assembly (NASM), FreeBASIC, Octave | Judge0 (Wandbox as backup for many) | Same |
| Julia, Zig, Crystal, Ada, Odin, Raku, Vala, Mojo, Modula-2 | Compiler Explorer (Wandbox as backup for Julia and Zig) | Same |
| Nim | Wandbox (slow: often 20 to 30 seconds) | Same |

Octave and Objective-C both use `.m`: a `.m` file is Objective-C when it has `#import`, `@interface` or `int main(...)`, and Octave otherwise (the same rule GitHub uses).

Each language uses whichever service runs current code fastest (checked with a modern-syntax program for every language). When you open a project, Dexna warms up the connection to its service, once you have agreed to online runs. These services are free and shared, so they can be slow or rate limited. If the main service is down, Dexna tries the next one, and if they are all unreachable it tries once more after a moment. Online programs cannot read input while running, so Dexna shows an input box before the run when the code reads from standard input.

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
- **Solid color background**: fill the background with one plain colour. Settings > Background and effects has 16 swatches (blue, navy, sky blue, teal, green, forest green, red, crimson, orange, yellow, purple, pink, brown, grey, white, black) plus a picker for any colour, and there are one-click looks for blue, navy, teal, green, red, orange, purple and pink.
- **Fade backgrounds** that cross-fade slowly between sets of colours, about half a minute each: a sky through dawn, day, dusk and night, ocean blues, embers, neon, pastels, and two soft glows on black. Four come as dithered pixel art too (sky, neon, an ember glow and ocean bands). Each has a matching look.
- **Quiet pixel-art scenes** where almost nothing moves: a torii gate in a still lake (petals drift, the reflection ripples now and then), a lit cabin in the snow with chimney smoke, a lone tree on a hill with slow clouds or fireflies, a pine forest with fog sliding through, an aquarium with a few slow fish, a canyon with a winding river, a harbor with boats by a lamplit dock, a windmill turning over a wheat field, a bamboo grove, the view out of a cave with water dripping, town rooftops where lights go on and off, a stone bridge and willow mirrored in still water, jungle temple ruins, icebergs with drifting floes, a savanna with a giraffe walking past, a castle above a sea of clouds, and a moon base with Earth in the sky. Each has a day version for light themes and a matching look.
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
- **Import File from URL** (File menu, or right-click a folder): downloads a file into the project from any address that allows it (a github.com file page is turned into its raw file); images and other binaries become binary files. **Copy as Markdown Code Block** (editor right-click menu) copies the selection, or the file, inside a fence with its language.
- **The command palette** lists the commands you used last first when nothing is typed. Two files selected in the Explorer can be compared side by side (right-click > Compare the Two Files).
- **Recent Files** (Ctrl+E): the files you opened lately, newest first. **Change Language Mode**: click the language in the status bar to show the file as another language, now or always for its kind of file. **Save Terminal Output** (the save button above the terminal): as a project file, a download, or to the clipboard.
- **References follow your files**: rename or move a file (or several, or a folder) and Dexna offers to fix what points to it: `<img src>`, `<link href>`, `<script src>`, CSS `url()` and `@import`, Markdown links and images, relative JavaScript and TypeScript imports, and Python imports. Files that moved get their own relative paths fixed too, and a reference keeps its style (`./`, no `.js`, `?query`, `#hash`). Settings > Files can do it without asking, or never.
- **Broken references** (to files that are not in the project) are underlined in HTML, CSS, Markdown and JavaScript and listed in Problems; they clear when the file appears.
- **Lock a file** (its tab's or the Explorer's right-click menu): it cannot be typed in by accident, and its tab shows a lock; programs and pulls can still change it. **Find in Folder** (right-click a folder) searches only inside it. **New File from Clipboard** (File menu, or right-click a folder) makes a file of what you copied, guessing its type (Python, JavaScript, HTML, JSON, CSS, SQL, Markdown, CSV and more).
- **Pinned tabs** (a tab's right-click menu): they move to the front, show a pin (click it to unpin), and stay open through Close Others, Close All and a middle click.
- **Reopen Closed Tab** (Alt+Shift+T, or a tab's right-click menu), **Format All Files in the Project** (Edit menu; Local History keeps the versions from before), and **Duplicate Project** (File menu; binary files included).
- **Surround With…** (Ctrl+Alt+S, Edit menu): wrap the selection in a block of the file's language, indented properly: try/except, if, for, with, def and `# %%` in Python; try/catch, if, loops and functions in JavaScript, TypeScript, Java, C#, C, C++, Go, Rust and Lua; tags in HTML; code blocks, bold, links, quotes and `<details>` in Markdown.
- **JSON: Sort Keys** (Text menu) sorts an object's keys at every level. **Add .gitignore…** and **Add License…** (File menu) use GitHub's templates; the .gitignore one suggests the template that fits the project, and the license gets the year and your GitHub name.
- **Select several files** in the Explorer: Ctrl+click (Cmd+click on a Mac) adds or removes one, Shift+click selects a range. Right-click the selection to delete it, move it into a folder or download it as a ZIP; the Delete key deletes it after one question; Escape clears it.
- **File sizes**: hover a file in the Explorer to see its size; Settings > Files can sort the Explorer by size, largest first.
- **Explorer filter**: type in the box above the files to see only those whose path matches (all words, any order), with their folders opened; Enter opens the first, Escape clears it.
- **Line endings**: the status bar shows LF or CRLF for the open file; click it to convert.
- **Text menu**: sort lines (numbers in order), remove duplicates, reverse, shuffle, change case (camelCase, snake_case, PascalCase, kebab-case, CONSTANT_CASE and more), Base64 and URL encode/decode, evaluate math in the selection, insert a UUID or a date.
- **Split editor** (Ctrl+\\): a second editor beside the first, for another file or another part of the same one. Edits show in both. Swap sides with one click; Dexna remembers the split for each project.
- **Markdown out**: **Export as HTML** saves a light, stand-alone page (its images inside, titled from the first heading); **Print or Save as PDF** opens it ready to print. Pasting a link while text is selected in Markdown makes `[text](url)`.
- **Markdown: Format Table** (Shift+Alt+T, cursor in a table) lines up the columns and keeps each column's alignment (`:--`, `:-:`, `--:`).
- **Markdown extras**: **Insert or Update Table of Contents** (Text menu) lists the headings as links with GitHub's anchors, nested by level, between `<!-- toc -->` markers so running it again updates it. The status bar shows the word count and reading time of Markdown and text files, or of the selection.
- **Preview sizes**: the size button above the web preview shows the page as a phone, tablet, laptop or desktop sees it (scaled to fit the pane), or fitted to the pane.
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
- **Run on save** (Settings > Editor, or Run > Toggle Run on Save): Ctrl+S also runs the file. **Run tests on save** (Settings > Editor) runs the project's Python tests each time you save a Python file.
- **Save code as an image** (File menu or right-click): a PNG of the selection or file in your theme's colours, to download or copy.
- **Zen mode** (Ctrl+K Z): just the code, centred. Esc twice leaves.
- **Project Map** (View menu): every file as a dot (coloured by language, sized by length) and an arrow for each import, link, style sheet, script and image one file uses from another, Python imports included. Hover a file to light up its links, click to open it, scroll to zoom, drag to move; files linked to nothing are listed.
- **Replay File History** (File menu): plays back a file's Local History versions one after another, lighting up what each version added or changed. Drag the slider or use the arrow keys, pick the speed, and restore any version.
- **QR codes**: the Share dialog makes a QR code of the project link (and offers a short `?github=` link for projects on GitHub), to open it on a phone; **Show QR Code** does the same for any selected text or link.
- **Project statistics** (View menu): files, lines of code, comments and blank lines per language, and the largest files.
- Cursor style, relative line numbers and smooth caret animation in Settings.

## Source Control

A local history for every project, like a small Git with no setup: open **Source Control** (Ctrl+Shift+G).

- **Changes** lists every file added, changed or deleted since the last commit, with line counts. Click one to see a side-by-side (or inline) **diff**; untick files to leave them out of a commit.
- **Commit** saves a snapshot of the whole project. Leave the message empty and Dexna writes one ("Update main.py").
- **History**: see what any commit changed, compare it with your files now, **restore** a version, or undo the last commit.
- **Change markers** next to the line numbers show added (green), changed (blue) and deleted (red) lines. Click one to open the diff.
- **Patches** (File menu, or the command palette): **Create Patch of Your Changes** writes everything changed since the last commit as a unified diff (the format `git diff` makes) to download, copy or open; **Apply Patch** takes one from a file, the clipboard or the open file (Git's own diffs work too), finds hunks that have moved a little, and says which files it does not fit.
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
- **Debugger** (Python): breakpoints, step over/into/out, call stack, locals and globals, watch expressions and a debug console. **Conditional breakpoints** stop only when an expression is true (`i == 50`), and **logpoints** print a message instead of stopping, with `{expressions}` filled in like an f-string (`i is {i}`); right-click the breakpoint margin, or use Debug: Add Conditional Breakpoint / Add Logpoint. They show as a ring and a blue diamond, and move with their lines as you edit.
- Interactive Python console that shares your program's variables, a variable explorer, and `# %%` cells with "Run Cell" lenses.
- matplotlib figures show inline and in a Plots tab. Files your program creates appear in the Explorer.
- **Jupyter notebooks** (File > New Jupyter Notebook, or open any `.ipynb`): **Notebook: Export as Python Script** writes the notebook as a `.py` file with `# %%` cell markers (Markdown cells become comments), so it still runs cell by cell. code and Markdown cells, Shift+Enter runs a cell and moves on, Ctrl+Enter runs it, Alt+Enter runs it and adds one below. Outputs appear under each cell: printed text, errors, matplotlib figures, and pandas tables as real tables (`display()` works too). Run all stops at the first error, as in Jupyter; Restart and run all starts from a clean slate. Cells share variables with the Python console. `input()` asks inside the cell. Notebooks are saved in the standard format, outputs included, so they open in Jupyter, VS Code and GitHub; **Open as text** shows the JSON.
- **REST client** (File > New HTTP Request File, or any `.http` / `.rest` file): requests separated by `###`, with headers and a body, variables (`@base = https://...`, used as `{{base}}`) and `{{$guid}}`, `{{$timestamp}}`, `{{$randomInt 1 100}}`. Click **Send request** above a request (or Ctrl+Alt+R) and the Response tab shows the status, time, size, headers and the body, with JSON formatted and coloured, to copy or save. Requests go straight from your browser, so an API has to allow requests from web pages (CORS); Dexna explains when one does not.
- **Error Lens** (Settings > Editor, or View > Toggle Error Lens): each problem's message at the end of its line, for errors only or errors and warnings.
- **curses** works: `import curses` (and `curses.wrapper`, windows, subwindows, pads, colours and attributes, line drawing, `getch`/`getkey`/`get_wch`/`getstr` with `nodelay`, `timeout` and `halfdelay`, `curses.textpad`, `curses.panel` and `curses.ascii`). The program's screen appears over the terminal and takes the keyboard; Shift+F5 still stops it, and the terminal comes back when the program ends, even if it crashes.
- **Tests** (the Tests tab, or Run > Run All Tests, Ctrl+Shift+;): finds tests in `test_*.py` and `*_test.py` files: functions named `test_...` with plain `assert`, `Test...` classes, and `unittest.TestCase` classes. Run all of them, one file, one test, or only the ones that failed. Each test gets a check or a cross next to it in the editor, and a failure shows the failing line, the message and the values of the names on that line (`total  0.30000000000000004`). No need to install pytest; tests that need pytest fixtures are skipped with a note.
- **Inline Values** (Run > Run with Inline Values): runs a Python file and writes the last value of each assignment at the end of its line, with how many times the line ran (`total = 10   (ran 5 times)`). Editing a file clears its values; Run > Clear Inline Values removes them all.
- **Coverage** (Run > Run with Coverage): marks every line that ran in green and every line that did not in red, and prints the percentage for each file. Run > Clear Coverage removes the marks.
- **Profiler** (Run > Run with Profiler): a table of every function with its calls, own time and total time, sortable, with only your code or everything. Click a row to jump to the function.
- **Run settings** (Run > Run Settings): command-line arguments (`sys.argv`), environment variables (`os.environ`) and answers for `input()`, typed in the dialog or read from a file in the project. They are saved per file with the project; the prepared answers show in the terminal as if typed, and after them `input()` asks as usual.
- Terminal with ANSI colours and clickable tracebacks. **Ctrl+F** in the terminal, Python console or shell finds text in the output, highlights every match, and steps through them with Enter and Shift+Enter. Runtime errors are highlighted in the editor.

## Packages

- **Python**: install and uninstall from Pyodide's package set or PyPI in the Packages view. A **requirements.txt** in the project is read too: its packages (with their version pins) join the project's and install like any other, when the project opens and whenever the file changes (options lines, URLs and comments are skipped). **Python: Install Packages from requirements.txt** does it on demand. **Python: Write requirements.txt** writes one from the project's packages, with the versions installed now. Missing imports install automatically when you run.
- **JavaScript and TypeScript**: import any npm package by name (`import dayjs from "dayjs"`). It loads from esm.sh, and the Packages view can search npm and pin versions.
- **Lua**: 17 popular libraries (json, inspect, middleclass, classic, lume, luafun, serpent, tween, flux, semver, memoize, argparse, log, Moses, 30log, stateful, ansicolors). **Add** downloads the library's single `.lua` file into your project, pinned to an exact version, so `require("json")` just works; **Example** creates a file that shows how to use it.
- **Web pages**: 28 popular libraries (Chart.js, D3, three.js, p5.js, Phaser, Kaboom, PixiJS, Matter.js, GSAP, Bootstrap, Pico CSS, Font Awesome, Alpine.js, Leaflet, Tone.js and more), or search the thousands on **cdnjs**. Adding one puts its `<script>` or `<link>` tag into your page; library stylesheets go before your own, so your CSS still wins. The view lists the libraries a page loads, with a button to remove each.
- **SQL**: SQLite has everything built in, so instead there are **sample databases** to practise on: an online shop, a school, a company with a management tree, well-known films, and countries. Each is a `.sql` file that creates and fills the tables and ends with example queries.
- **Online languages** get only the file you run, with their standard library.

## Projects

Multiple projects, upload files or import a ZIP, **open a GitHub repository** (File > Open GitHub Repository, or the Home page: `owner/name`, a github.com link, or a link to one folder; all of its files are copied into a new project, images and other binary files included; a link like `…/dexna/?github=owner/name` asks and then opens it), download a project as a ZIP, and **share links** that pack the whole project into the URL (nothing is uploaded). Everything autosaves to your browser's local storage, and Source Control keeps as many committed versions as you like.

## GitHub

Source Control has a **GitHub** section, and every action is also in the command palette (`GitHub: ...`).

- **Sign in** with a personal access token: Dexna explains how to make one (a fine-grained token with Contents: Read and write on the repositories you choose). There is no Dexna server: the browser talks to GitHub directly, and the token is kept in this browser only, never in exported settings, profiles or share links.
- **Open** from a list of your repositories (most recently pushed first; type to filter by name, description or language), or type `owner/name`, paste a link, or type a username to list that person's or organization's public repositories. Private repositories work when signed in. A project opened from a branch stays linked to it.
- **Pull** brings in what changed on GitHub. Files you changed here are never overwritten: if a file changed on both sides, your version is kept and Dexna says which files; pushing then replaces GitHub's version.
- **Commit and Push** sends your changes (edited, new and deleted files, images included) as one commit. Write the message in the GitHub section: a summary and an optional description (left empty, the summary Dexna suggests is used); Ctrl+Enter sends it. If GitHub has newer commits, Dexna asks you to pull first. (The **Commit** button further down is separate: it only saves a snapshot in this browser.)
- **What you changed**: the box lists every file changed since the last pull or push (M, A or D). Click one to see it beside GitHub's version, with **Take GitHub's version** to undo your change. When GitHub has newer commits on the branch, the box says so, with a link to pull them; the refresh button checks again.
- **Branch in the status bar**: a linked project shows its GitHub branch there; click it to switch or create one.
- **Publish a website** (the **Publish website…** button, or GitHub: Publish Website): for a project with an `index.html` at the top or in `docs/`, Dexna pushes your changes, turns on GitHub Pages and waits for it to build; the box then links to the live site.
- **Workflows** (GitHub: Add a Workflow): ready-made GitHub Actions for Python tests (pytest), Python lint (Ruff), Node tests and deploying a static site to Pages; the ones that fit the project come first. After you push, the box shows whether they passed.
- **Forks**: pushing to someone else's repository offers to fork it: Dexna makes your copy on GitHub, links the project to it (your edits stay), pushes there, and **Pull request to owner/repo…** offers your changes to the original. Also GitHub: Fork This Repository.
- **Branches**: click the branch name to switch to another branch or create a new one. Switching works like a checkout: files you have not changed follow the branch, and your own edits stay.
- **Pull requests**: on a branch, **Pull request into main…** opens one (title, description, the branch to merge into, draft or not); the box then links to it and shows whether it is open, merged or closed.
- **What is happening on GitHub**: the box shows the latest GitHub Actions run for the branch (passed, failed or running) and the branch's recent commits, each a link.
- **Compare** files that changed both here and on GitHub: after a pull keeps your version, the box lists them; Compare shows GitHub's version beside yours, with **Use GitHub's version** or **Keep mine**.
- **Links**: GitHub: Open This File on GitHub, and Copy Link to These Lines (the selected lines, as `#L3-L5`).
- **Issues**: the **Issues** button lists the repository's open issues (type to filter by title, label or author; pick one to open it) and creates new ones, with labels. **GitHub: Create Issue from Selection** starts an issue from the selected code: the title from its comment (a `TODO:` loses its prefix), and the description links to those lines on GitHub and quotes the code.
- **Open a gist** (File > Open GitHub Gist, a gist link pasted into Open GitHub Repository, or a `?gist=ID` link): its files open as a new project.
- **Settings Sync** (Settings > Data and privacy, or the command palette): **Upload** keeps your settings, themes, shortcuts, snippets and templates in a secret gist on your GitHub account; **Download** on another device (signed in to the same account) finds it and applies it. Your projects are not touched.
- **Gists**: GitHub: Share as Gist shares any of your open files as a public or secret gist, and copies its link.
- **Publish** creates a new repository from any project, like GitHub's own form: the owner (you or one of your organizations), name, description, public or private, a README (written right there, or the project's own), a `.gitignore` template (one that fits the project's languages is suggested) and a license. Dexna then pushes the project to it and links the two.

## Images and other binary files

**Paste an image** (a screenshot, say) into any file and Dexna saves it in an `images` folder next to that file and inserts a reference to it. **Drag a file from the Explorer into the editor** to insert a reference that fits the file you are editing, with a relative path: `![name](path)` in Markdown, `<img>`, `<link>`, `<script>`, `<audio>` or `<video>` in HTML, `url(...)` or a whole `@font-face` in CSS, a path string in Python and JavaScript. The same is on the Explorer's right-click menu (**Insert Reference**), with **Copy as Data URL** for binary files. The Markdown preview shows the project's images. **Resize or Convert Image** (right-click an image): a new width and height (proportions kept if you like), PNG, JPEG or WebP with a quality setting, a live preview with the new size in bytes, saved as a new file or in place. Right-click a folder for **Download Folder as ZIP**.

Projects hold images, fonts, audio, video and any other binary file next to the code: from uploads (several at once, or dragged in), ZIP files and GitHub. Their bytes are kept in the browser's IndexedDB. Click one in the Explorer to view it (images with their size, audio and video with a player, fonts with a sample). They can be renamed, moved, deleted and downloaded like any file, and go into Download Project as ZIP. The **web preview** loads them wherever the page refers to them: `<img>`, `srcset`, `<audio>`, `<video>`, icons, CSS `url(...)` (fonts too), and at run time `fetch`, `XMLHttpRequest`, `img.src`, `new Audio(...)` and HTML added with `innerHTML`; `fetch("data.json")` works for the project's text files as well. **Python** can open them (`open("photo.png", "rb")`), and binary files a program writes (a saved plot, an image) join the project.

## Works offline and installs as an app

After you have opened Dexna once, it works without a connection: its own files, the editor and every language runtime you have used are kept by the browser, and an **Offline** note appears in the status bar when the connection drops. Online languages, installing packages and GitHub still need a connection. Dexna's own files always come fresh from the network when you are online, so updates arrive at once. **Help > Install Dexna as an App** installs it where the browser allows (Chrome and Edge; Safari has Add to Dock). **Help > Offline Storage** shows what is kept or clears it; your projects and settings are not touched.

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
| Reopen closed tab | Alt+Shift+T |
| Recent files | Ctrl+E |
| Surround with | Ctrl+Alt+S |

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
| `js/cursesview.js`, `py/curses/` | The screen for Python curses programs, and Dexna's curses module |
| `js/notebook.js` | Jupyter notebooks: cells, outputs and the nbformat file |
| `js/pro.js` | Error Lens and the REST client (.http files) |
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
