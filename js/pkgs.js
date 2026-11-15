// More packages: Lua libraries (single files downloaded into the project), libraries for web pages
// (script and link tags from jsDelivr, or anything on cdnjs), and sample databases for SQL.

/* =====================================================================
 * Lua: single-file libraries, pinned to a commit
 * ===================================================================== */
export const LUA_LIBS = [
  { module: "json", repo: "rxi/json.lua", commit: "dbf4b2dd2eb7c23be2773c89eb059dadd6436f94", path: "json.lua", desc: "Encode and decode JSON", use: 'local json = require("json")\nprint(json.encode({ name = "Ada", langs = { "Lua", "C" } }))\nlocal t = json.decode(\'{"x": 1, "y": [2, 3]}\')\nprint(t.x, t.y[2])' },
  { module: "inspect", repo: "kikito/inspect.lua", commit: "a8ca3120dfec48801036eaeff9335ab7a096dd24", path: "inspect.lua", desc: "Print any table in a readable way", use: 'local inspect = require("inspect")\nprint(inspect({ a = 1, b = { 2, 3 }, c = "x" }))' },
  { module: "middleclass", repo: "kikito/middleclass", commit: "359f0e2742f51ca77801b513ec91eb9029de8de4", path: "middleclass.lua", desc: "Classes with inheritance and mixins", use: 'local class = require("middleclass")\nlocal Animal = class("Animal")\nfunction Animal:initialize(name) self.name = name end\nfunction Animal:speak() return self.name .. " makes a sound" end\nlocal Dog = class("Dog", Animal)\nfunction Dog:speak() return self.name .. " barks" end\nprint(Dog:new("Rex"):speak())' },
  { module: "classic", repo: "rxi/classic", commit: "e5610756c98ac2f8facd7ab90c94e1a097ecd2c6", path: "classic.lua", desc: "A tiny class module", use: 'local Object = require("classic")\nlocal Point = Object:extend()\nfunction Point:new(x, y) self.x, self.y = x, y end\nlocal p = Point(3, 4)\nprint(p.x, p.y)' },
  { module: "lume", repo: "rxi/lume", commit: "98847e7812cf28d3d64b289b03fad71dc704547d", path: "lume.lua", desc: "Handy functions for maths, tables and strings", use: 'local lume = require("lume")\nprint(lume.round(3.14159, 0.01))\nprint(table.concat(lume.map({ 1, 2, 3 }, function(x) return x * 10 end), ", "))\nprint(lume.uuid())' },
  { module: "fun", repo: "luafun/luafun", commit: "057ede73d78b0e6bdbb354b35492d28c7950f857", path: "fun.lua", desc: "Functional programming: map, filter, reduce, ranges", use: 'local fun = require("fun")\nprint(fun.range(1, 10):filter(function(x) return x % 2 == 0 end):map(function(x) return x * x end):sum())' },
  { module: "serpent", repo: "pkulchenko/serpent", commit: "139fc18263bc5ffecc1729147891f1eb383046bf", path: "src/serpent.lua", desc: "Serialize tables to Lua source and back", use: 'local serpent = require("serpent")\nprint(serpent.line({ 1, 2, name = "x" }, { comment = false }))' },
  { module: "tween", repo: "kikito/tween.lua", commit: "9cdcd39339ec9e8b9c1a08e65aa0a8f2aab62172", path: "tween.lua", desc: "Tweening and easing functions", use: 'local tween = require("tween")\nlocal pos = { x = 0 }\nlocal t = tween.new(2, pos, { x = 100 }, "outQuad")\nfor i = 1, 4 do t:update(0.5) print(pos.x) end' },
  { module: "flux", repo: "rxi/flux", commit: "bb330231b87eabf84fbd68322f13a6320db30a41", path: "flux.lua", desc: "A fast, small tweening library", use: 'local flux = require("flux")\nlocal o = { x = 0 }\nflux.to(o, 1, { x = 10 }):ease("linear")\nflux.update(0.5)\nprint(o.x)' },
  { module: "semver", repo: "kikito/semver.lua", commit: "a4b708ba243208d46e575da870af969dca46a94d", path: "semver.lua", desc: "Compare version numbers like 1.2.3", use: 'local v = require("semver")\nprint(v("1.2.3") < v("1.10.0"))\nprint(v("2.0.0"):nextMinor())' },
  { module: "memoize", repo: "kikito/memoize.lua", commit: "bd7a8b8694649f1388d7b0e09ebda62ae036843f", path: "memoize.lua", desc: "Cache the results of slow functions", use: 'local memoize = require("memoize")\nlocal function slow(n) local s = 0 for i = 1, n do s = s + i end return s end\nlocal fast = memoize(slow)\nprint(fast(1000000), fast(1000000))' },
  { module: "argparse", repo: "mpeterv/argparse", commit: "412e6aca393e365f92c0315dfe50181b193f1ace", path: "src/argparse.lua", desc: "Command line argument parsing", use: 'local argparse = require("argparse")\nlocal parser = argparse("greet", "Says hello")\nparser:argument("name")\nparser:flag("-l --loud")\nlocal args = parser:parse({ "Ada", "--loud" })\nprint(args.name, args.loud)' },
  { module: "log", repo: "rxi/log.lua", commit: "7396ae2ee6d68829aecbc96d0b2ee1e5620c1ed7", path: "log.lua", desc: "Simple logging with levels", use: 'local log = require("log")\nlog.usecolor = false\nlog.info("starting")\nlog.warn("careful")' },
  { module: "moses", repo: "Yonaba/Moses", commit: "6fe8d76d50a22d85fe064aaa80390b72381befed", path: "moses.lua", desc: "Utility belt for tables, arrays and functions", use: 'local M = require("moses")\nprint(M.sum({ 1, 2, 3, 4 }))\nprint(table.concat(M.range(1, 5), " "))' },
  { module: "30log", repo: "Yonaba/30log", commit: "173f45756d99426d89990388e5d8c8e38b9695b9", path: "30log.lua", desc: "Object orientation in 30 lines", use: 'local class = require("30log")\nlocal Window = class("Window", { width = 100 })\nprint(Window:new().width)' },
  { module: "stateful", repo: "kikito/stateful.lua", commit: "bf0da2b5a9201a9a31223a1b5b0d0bef2817c71c", path: "stateful.lua", desc: "States for middleclass objects", deps: ["middleclass"], use: 'local class = require("middleclass")\nlocal Stateful = require("stateful")\nlocal Enemy = class("Enemy")\nEnemy:include(Stateful)\nfunction Enemy:speak() return "..." end\nlocal Angry = Enemy:addState("Angry")\nfunction Angry:speak() return "Grr!" end\nlocal e = Enemy:new()\ne:gotoState("Angry")\nprint(e:speak())' },
  { module: "ansicolors", repo: "kikito/ansicolors.lua", commit: "a788ef99bbb54b3f1e22aaa34e2c99a44cb0606a", path: "ansicolors.lua", desc: "Colors in terminal output", use: 'local colors = require("ansicolors")\nprint(colors("%{red}Red %{green}green %{reset}normal"))' },
];

/* =====================================================================
 * Web pages: well-known libraries, pinned on jsDelivr
 * ===================================================================== */
const J = (pkg, file) => `https://cdn.jsdelivr.net/npm/${pkg}/${file}`;
export const WEB_LIBS = [
  { name: "Chart.js", desc: "Charts: bar, line, pie and more", files: [J("chart.js@4.4.1", "dist/chart.umd.js")], tags: ["charts"] },
  { name: "D3", desc: "Data-driven documents and visualizations", files: [J("d3@7.8.5", "dist/d3.min.js")], tags: ["charts"] },
  { name: "three.js", desc: "3D graphics with WebGL", files: [J("three@0.149.0", "build/three.min.js")], tags: ["3d"] },
  { name: "p5.js", desc: "Creative coding and sketches", files: [J("p5@1.9.0", "lib/p5.min.js")], tags: ["art"] },
  { name: "Phaser", desc: "2D games", files: [J("phaser@3.70.0", "dist/phaser.min.js")], tags: ["games"] },
  { name: "Kaboom", desc: "Quick, fun 2D games", files: [J("kaboom@3000.1.17", "dist/kaboom.js")], tags: ["games"] },
  { name: "PixiJS", desc: "Fast 2D rendering", files: [J("pixi.js@7.3.3", "dist/pixi.min.js")], tags: ["games"] },
  { name: "Matter.js", desc: "2D physics", files: [J("matter-js@0.19.0", "build/matter.min.js")], tags: ["games"] },
  { name: "GSAP", desc: "Smooth animations", files: [J("gsap@3.12.5", "dist/gsap.min.js")], tags: ["animation"] },
  { name: "anime.js", desc: "Lightweight animations", files: [J("animejs@3.2.2", "lib/anime.min.js")], tags: ["animation"] },
  { name: "Animate.css", desc: "Ready-made CSS animations", files: [J("animate.css@4.1.1", "animate.min.css")], tags: ["animation"] },
  { name: "AOS", desc: "Animate elements as you scroll", files: [J("aos@2.3.4", "dist/aos.css"), J("aos@2.3.4", "dist/aos.js")], tags: ["animation"] },
  { name: "Typed.js", desc: "Typewriter text effect", files: [J("typed.js@2.1.0", "dist/typed.umd.js")], tags: ["animation"] },
  { name: "canvas-confetti", desc: "Confetti bursts", files: [J("canvas-confetti@1.9.2", "dist/confetti.browser.js")], tags: ["fun"] },
  { name: "Bootstrap", desc: "Responsive layout and components", files: [J("bootstrap@5.3.3", "dist/css/bootstrap.min.css"), J("bootstrap@5.3.3", "dist/js/bootstrap.bundle.min.js")], tags: ["css"] },
  { name: "Pico CSS", desc: "Nice-looking pages with plain HTML", files: [J("@picocss/pico@2.0.6", "css/pico.min.css")], tags: ["css"] },
  { name: "Normalize.css", desc: "Consistent defaults across browsers", files: [J("normalize.css@8.0.1", "normalize.css")], tags: ["css"] },
  { name: "Font Awesome", desc: "Icons: <i class=\"fa-solid fa-star\"></i>", files: [J("@fortawesome/fontawesome-free@6.5.1", "css/all.min.css")], tags: ["css"] },
  { name: "Alpine.js", desc: "Interactivity right in your HTML", files: [J("alpinejs@3.13.5", "dist/cdn.min.js")], defer: true, tags: ["ui"] },
  { name: "jQuery", desc: "The classic DOM helper", files: [J("jquery@3.7.1", "dist/jquery.min.js")], tags: ["ui"] },
  { name: "SweetAlert2", desc: "Beautiful pop-up dialogs", files: [J("sweetalert2@11.10.3", "dist/sweetalert2.all.min.js")], tags: ["ui"] },
  { name: "Leaflet", desc: "Interactive maps", files: [J("leaflet@1.9.4", "dist/leaflet.css"), J("leaflet@1.9.4", "dist/leaflet.js")], tags: ["maps"] },
  { name: "Howler.js", desc: "Sound and music", files: [J("howler@2.2.4", "dist/howler.min.js")], tags: ["audio"] },
  { name: "Tone.js", desc: "Make music in the browser", files: [J("tone@14.7.77", "build/Tone.js")], tags: ["audio"] },
  { name: "Lodash", desc: "Utility functions", files: [J("lodash@4.17.21", "lodash.min.js")], tags: ["utils"] },
  { name: "Day.js", desc: "Dates and times", files: [J("dayjs@1.11.10", "dayjs.min.js")], tags: ["utils"] },
  { name: "math.js", desc: "Maths: units, matrices, big numbers", files: [J("mathjs@12.2.1", "lib/browser/math.js")], tags: ["utils"] },
  { name: "Marked", desc: "Turn Markdown into HTML", files: [J("marked@11.1.1", "marked.min.js")], tags: ["utils"] },
];
const isCss = (u) => /\.css(\?|#|$)/i.test(u);
const tagFor = (u, { defer } = {}) => (isCss(u) ? `<link rel="stylesheet" href="${u}">` : `<script src="${u}"${defer ? " defer" : ""}></script>`);
/** Put library tags into an HTML page: stylesheets and scripts at the end of <head>, before your own code runs. */
export function addTags(html, urls, opts = {}) {
  const missing = urls.filter((u) => !html.includes(u));
  if (!missing.length) return html;
  // stylesheets go before your own stylesheet, so your CSS still wins
  const css = missing.filter(isCss);
  const own = /^([ \t]*)<link\b(?=[^>]*\bstylesheet\b)(?![^>]*\bhref\s*=\s*["']https?:)[^>]*>/im.exec(html);
  if (css.length && own) {
    html = html.slice(0, own.index) + css.map((u) => own[1] + tagFor(u, opts) + "\n").join("") + html.slice(own.index);
    return addTags(html, missing.filter((u) => !isCss(u)), opts);
  }
  const block = missing.map((u) => tagFor(u, opts));
  const head = /<\/head\s*>/i.exec(html);
  if (head) {
    const closeIndent = /\n([ \t]*)<\/head/i.exec(html)?.[1] ?? "";
    // match the line above (or one step in from <head> when the head is empty)
    const lines = html.slice(0, head.index).split("\n").filter((l) => l.trim());
    const prev = lines.at(-1) || "";
    const indent = /<head\b/i.test(prev) ? /^[ \t]*/.exec(prev)[0] + "  " : /^[ \t]*/.exec(prev)[0];
    return html.slice(0, head.index).replace(/[ \t]*$/, "") + block.map((t) => indent + t + "\n").join("") + closeIndent + html.slice(head.index);
  }
  const body = /<body[^>]*>/i.exec(html);
  if (body) { const at = body.index; return html.slice(0, at) + block.join("\n") + "\n" + html.slice(at); }
  return block.join("\n") + "\n" + html;
}
/** Library URLs used by a page (script src and stylesheet href on http(s)). */
export function pageLibraries(html) {
  const out = [];
  const re = /<script\b[^>]*\bsrc\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>\s*<\/script>|<link\b[^>]*\bhref\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) if (m[1] || /stylesheet/i.test(m[0])) out.push(m[1] || m[2]);
  return out;
}
export function removeTag(html, url) {
  const esc = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`[ \\t]*<script\\b[^>]*\\bsrc\\s*=\\s*["']${esc}["'][^>]*>\\s*</script>[ \\t]*\\n?|[ \\t]*<link\\b[^>]*\\bhref\\s*=\\s*["']${esc}["'][^>]*>[ \\t]*\\n?`, "gi"), "");
}
const libName = (u) => { const m = /\/npm\/((?:@[^/]+\/)?[^@/]+)@([^/]+)/.exec(u) || /\/ajax\/libs\/([^/]+)\/([^/]+)/.exec(u); return m ? `${m[1]} ${m[2]}` : u.replace(/^https?:\/\//, "").split("/").slice(0, 2).join("/"); };

/* =====================================================================
 * SQL: sample databases
 * ===================================================================== */
const q = (v) => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const insert = (table, cols, rows) => `INSERT INTO ${table} (${cols.join(", ")}) VALUES\n${rows.map((r) => "  (" + r.map(q).join(", ") + ")").join(",\n")};\n`;
function shopDb() {
  const customers = [["Ada", "Lovelace", "London", "2023-01-14"], ["Grace", "Hopper", "New York", "2023-02-03"], ["Alan", "Turing", "Manchester", "2023-02-20"], ["Margaret", "Hamilton", "Boston", "2023-03-11"], ["Linus", "Torvalds", "Portland", "2023-04-02"], ["Katherine", "Johnson", "Hampton", "2023-04-28"], ["Tim", "Berners-Lee", "Oxford", "2023-05-16"], ["Barbara", "Liskov", "Boston", "2023-06-09"], ["Dennis", "Ritchie", "Murray Hill", "2023-07-01"], ["Hedy", "Lamarr", "Vienna", "2023-07-22"]];
  const products = [["Mechanical keyboard", "Accessories", 89.0, 25], ["Wireless mouse", "Accessories", 29.5, 60], ["27-inch monitor", "Displays", 249.0, 12], ["USB-C hub", "Accessories", 39.9, 40], ["Laptop stand", "Furniture", 45.0, 30], ["Desk lamp", "Furniture", 32.0, 18], ["Noise-cancelling headphones", "Audio", 199.0, 15], ["Webcam", "Video", 69.0, 22], ["Office chair", "Furniture", 289.0, 8], ["Portable SSD 1 TB", "Storage", 109.0, 35], ["Microphone", "Audio", 129.0, 10], ["Mouse pad", "Accessories", 12.0, 100]];
  let seed = 7; const rnd = (n) => (seed = (seed * 9301 + 49297) % 233280) % n;
  const orders = [], items = [];
  for (let i = 1; i <= 30; i++) {
    const day = String(1 + rnd(28)).padStart(2, "0"), month = String(1 + rnd(12)).padStart(2, "0");
    orders.push([i, 1 + rnd(customers.length), `2024-${month}-${day}`, ["delivered", "delivered", "delivered", "shipped", "processing"][rnd(5)]]);
    const k = 1 + rnd(3), used = new Set();
    for (let j = 0; j < k; j++) { const p = 1 + rnd(products.length); if (used.has(p)) continue; used.add(p); items.push([i, p, 1 + rnd(3)]); }
  }
  return `-- Sample database: a small online shop.
-- Customers place orders; each order has items, each item is a product.
-- Run this file (F5) to create the tables, then write your own queries below.

CREATE TABLE customers (id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, city TEXT, joined DATE);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, price REAL NOT NULL, stock INTEGER);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), ordered DATE, status TEXT);
CREATE TABLE order_items (order_id INTEGER REFERENCES orders(id), product_id INTEGER REFERENCES products(id), quantity INTEGER);

${insert("customers", ["first_name", "last_name", "city", "joined"], customers)}
${insert("products", ["name", "category", "price", "stock"], products)}
${insert("orders", ["id", "customer_id", "ordered", "status"], orders)}
${insert("order_items", ["order_id", "product_id", "quantity"], items)}
-- Try these:

-- Revenue per category
SELECT p.category, ROUND(SUM(p.price * i.quantity), 2) AS revenue
FROM order_items i JOIN products p ON p.id = i.product_id
GROUP BY p.category ORDER BY revenue DESC;

-- Best customers
SELECT c.first_name || ' ' || c.last_name AS customer, COUNT(DISTINCT o.id) AS orders, ROUND(SUM(p.price * i.quantity), 2) AS spent
FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id
GROUP BY c.id ORDER BY spent DESC LIMIT 5;
`;
}
function schoolDb() {
  const students = ["Maya Chen", "Leo Martins", "Aisha Bello", "Noah Kim", "Sofia Rossi", "Ethan Novak", "Zara Ahmed", "Lucas Silva", "Mia Kowalski", "Omar Haddad", "Chloe Dubois", "Kenji Sato"].map((n, i) => [n, 2006 + (i % 3), ["A", "B", "C"][i % 3]]);
  const courses = [["Mathematics", "Mr. Patel", 5], ["Physics", "Ms. Okafor", 4], ["Programming", "Mr. Lindqvist", 4], ["History", "Ms. García", 3], ["Art", "Mr. Moreau", 2], ["English", "Ms. Walsh", 4]];
  let seed = 11; const rnd = (n) => (seed = (seed * 9301 + 49297) % 233280) % n;
  const grades = [];
  students.forEach((_, s) => courses.forEach((_, c) => { if (rnd(4)) grades.push([s + 1, c + 1, 50 + rnd(51)]); }));
  return `-- Sample database: a school.
-- Students take courses and get a score from 0 to 100.

CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, born INTEGER, class TEXT);
CREATE TABLE courses (id INTEGER PRIMARY KEY, title TEXT NOT NULL, teacher TEXT, hours_per_week INTEGER);
CREATE TABLE grades (student_id INTEGER REFERENCES students(id), course_id INTEGER REFERENCES courses(id), score INTEGER CHECK (score BETWEEN 0 AND 100));

${insert("students", ["name", "born", "class"], students)}
${insert("courses", ["title", "teacher", "hours_per_week"], courses)}
${insert("grades", ["student_id", "course_id", "score"], grades)}
-- Try these:

-- Average score per course
SELECT c.title, ROUND(AVG(g.score), 1) AS average, COUNT(*) AS students
FROM grades g JOIN courses c ON c.id = g.course_id GROUP BY c.id ORDER BY average DESC;

-- Top student in each class
SELECT class, name, average FROM (
  SELECT s.class, s.name, ROUND(AVG(g.score), 1) AS average,
         RANK() OVER (PARTITION BY s.class ORDER BY AVG(g.score) DESC) AS place
  FROM students s JOIN grades g ON g.student_id = s.id GROUP BY s.id
) WHERE place = 1;
`;
}
function companyDb() {
  const deps = [["Engineering", "Berlin"], ["Design", "Lisbon"], ["Sales", "Chicago"], ["Support", "Manila"]];
  const emps = [
    [1, "Iris Novak", "CEO", null, 1, 180000, "2015-03-01"], [2, "Tomás Reyes", "CTO", 1, 1, 160000, "2016-06-15"], [3, "Hana Mori", "Head of Design", 1, 2, 130000, "2017-01-09"],
    [4, "Dev Sharma", "Head of Sales", 1, 3, 125000, "2017-09-04"], [5, "Elena Petrova", "Senior Engineer", 2, 1, 115000, "2018-02-12"], [6, "Sam Okoro", "Engineer", 5, 1, 90000, "2020-05-18"],
    [7, "Lena Fischer", "Engineer", 5, 1, 88000, "2021-08-23"], [8, "Marco Bianchi", "Designer", 3, 2, 82000, "2019-11-11"], [9, "Yuki Tanaka", "Designer", 3, 2, 79000, "2022-03-07"],
    [10, "Ava Johnson", "Account Executive", 4, 3, 76000, "2020-01-20"], [11, "Ben Carter", "Account Executive", 4, 3, 74000, "2021-04-26"], [12, "Rosa Santos", "Support Lead", 1, 4, 70000, "2018-07-30"],
    [13, "Paolo Cruz", "Support Agent", 12, 4, 52000, "2022-10-03"], [14, "Nina Reyes", "Support Agent", 12, 4, 51000, "2023-02-13"], [15, "Felix Wagner", "Junior Engineer", 6, 1, 68000, "2023-09-01"],
  ];
  return `-- Sample database: a company.
-- Employees belong to departments and report to a manager (manager_id), which makes a tree.

CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT);
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, title TEXT, manager_id INTEGER REFERENCES employees(id), department_id INTEGER REFERENCES departments(id), salary INTEGER, hired DATE);

${insert("departments", ["name", "city"], deps)}
${insert("employees", ["id", "name", "title", "manager_id", "department_id", "salary", "hired"], emps)}
-- Try these:

-- Payroll per department
SELECT d.name, COUNT(*) AS people, SUM(e.salary) AS payroll, MAX(e.salary) AS highest
FROM employees e JOIN departments d ON d.id = e.department_id GROUP BY d.id ORDER BY payroll DESC;

-- The whole reporting chain, with a recursive query
WITH RECURSIVE chain(id, name, depth, path) AS (
  SELECT id, name, 0, name FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, c.depth + 1, c.path || ' > ' || e.name FROM employees e JOIN chain c ON e.manager_id = c.id
)
SELECT substr('            ', 1, depth * 2) || name AS org_chart, path FROM chain ORDER BY path;
`;
}
function moviesDb() {
  const directors = [["Christopher Nolan", "United Kingdom", 1970], ["Steven Spielberg", "United States", 1946], ["Hayao Miyazaki", "Japan", 1941], ["Ridley Scott", "United Kingdom", 1937], ["Robert Zemeckis", "United States", 1951], ["Quentin Tarantino", "United States", 1963], ["Bong Joon-ho", "South Korea", 1969], ["Akira Kurosawa", "Japan", 1910], ["Francis Ford Coppola", "United States", 1939], ["Frank Darabont", "United States", 1959], ["Damien Chazelle", "United States", 1985], ["George Miller", "Australia", 1945], ["Jean-Pierre Jeunet", "France", 1953], ["Michael Curtiz", "Hungary", 1886]];
  const d = (n) => directors.findIndex((x) => x[0] === n) + 1;
  const movies = [
    ["The Shawshank Redemption", 1994, "Frank Darabont", "Drama", 142], ["The Godfather", 1972, "Francis Ford Coppola", "Crime", 175], ["The Dark Knight", 2008, "Christopher Nolan", "Action", 152],
    ["Pulp Fiction", 1994, "Quentin Tarantino", "Crime", 154], ["Forrest Gump", 1994, "Robert Zemeckis", "Drama", 142], ["Inception", 2010, "Christopher Nolan", "Science fiction", 148],
    ["Interstellar", 2014, "Christopher Nolan", "Science fiction", 169], ["Spirited Away", 2001, "Hayao Miyazaki", "Animation", 125], ["My Neighbor Totoro", 1988, "Hayao Miyazaki", "Animation", 86],
    ["Parasite", 2019, "Bong Joon-ho", "Thriller", 132], ["Back to the Future", 1985, "Robert Zemeckis", "Science fiction", 116], ["Jurassic Park", 1993, "Steven Spielberg", "Adventure", 127],
    ["Raiders of the Lost Ark", 1981, "Steven Spielberg", "Adventure", 115], ["Alien", 1979, "Ridley Scott", "Horror", 117], ["Gladiator", 2000, "Ridley Scott", "Action", 155],
    ["Casablanca", 1942, "Michael Curtiz", "Romance", 102], ["Seven Samurai", 1954, "Akira Kurosawa", "Action", 207], ["Whiplash", 2014, "Damien Chazelle", "Drama", 106],
    ["Mad Max: Fury Road", 2015, "George Miller", "Action", 120], ["Amélie", 2001, "Jean-Pierre Jeunet", "Romance", 122],
  ].map(([t, y, dn, g, r]) => [t, y, d(dn), g, r]);
  return `-- Sample database: well-known films and their directors.

CREATE TABLE directors (id INTEGER PRIMARY KEY, name TEXT NOT NULL, country TEXT, born INTEGER);
CREATE TABLE movies (id INTEGER PRIMARY KEY, title TEXT NOT NULL, year INTEGER, director_id INTEGER REFERENCES directors(id), genre TEXT, minutes INTEGER);

${insert("directors", ["name", "country", "born"], directors)}
${insert("movies", ["title", "year", "director_id", "genre", "minutes"], movies)}
-- Try these:

-- Films per decade
SELECT (year / 10) * 10 || 's' AS decade, COUNT(*) AS films FROM movies GROUP BY decade ORDER BY decade;

-- Directors with more than one film here, and their average running time
SELECT d.name, COUNT(*) AS films, ROUND(AVG(m.minutes)) AS avg_minutes
FROM movies m JOIN directors d ON d.id = m.director_id GROUP BY d.id HAVING films > 1 ORDER BY films DESC;
`;
}
function countriesDb() {
  const rows = [
    ["India", "Asia", "New Delhi", 1429, 3287263], ["China", "Asia", "Beijing", 1410, 9596961], ["United States", "North America", "Washington, D.C.", 335, 9833520], ["Indonesia", "Asia", "Jakarta", 278, 1904569],
    ["Pakistan", "Asia", "Islamabad", 240, 881913], ["Nigeria", "Africa", "Abuja", 224, 923768], ["Brazil", "South America", "Brasília", 216, 8515767], ["Bangladesh", "Asia", "Dhaka", 173, 148460],
    ["Russia", "Europe", "Moscow", 144, 17098246], ["Mexico", "North America", "Mexico City", 128, 1964375], ["Ethiopia", "Africa", "Addis Ababa", 127, 1104300], ["Japan", "Asia", "Tokyo", 124, 377975],
    ["Philippines", "Asia", "Manila", 117, 300000], ["Egypt", "Africa", "Cairo", 113, 1002450], ["Vietnam", "Asia", "Hanoi", 99, 331212], ["Turkey", "Asia", "Ankara", 85, 783562],
    ["Germany", "Europe", "Berlin", 84, 357022], ["France", "Europe", "Paris", 68, 643801], ["United Kingdom", "Europe", "London", 68, 242495], ["Italy", "Europe", "Rome", 59, 301340],
    ["South Africa", "Africa", "Pretoria", 60, 1221037], ["Kenya", "Africa", "Nairobi", 55, 580367], ["Colombia", "South America", "Bogotá", 52, 1141748], ["South Korea", "Asia", "Seoul", 52, 100210],
    ["Spain", "Europe", "Madrid", 48, 505990], ["Argentina", "South America", "Buenos Aires", 46, 2780400], ["Canada", "North America", "Ottawa", 39, 9984670], ["Morocco", "Africa", "Rabat", 38, 446550],
    ["Peru", "South America", "Lima", 34, 1285216], ["Australia", "Oceania", "Canberra", 26, 7692024], ["Chile", "South America", "Santiago", 20, 756102], ["Sweden", "Europe", "Stockholm", 10.5, 450295],
    ["Norway", "Europe", "Oslo", 5.5, 385207], ["New Zealand", "Oceania", "Wellington", 5.2, 268021], ["Fiji", "Oceania", "Suva", 0.9, 18274], ["Iceland", "Europe", "Reykjavík", 0.4, 103000],
  ];
  return `-- Sample database: countries of the world.
-- Population in millions (rounded, around 2023) and area in square kilometres. Good for practising
-- GROUP BY, ORDER BY and calculations; the figures are approximate.

CREATE TABLE countries (id INTEGER PRIMARY KEY, name TEXT NOT NULL, continent TEXT, capital TEXT, population_millions REAL, area_km2 INTEGER);

${insert("countries", ["name", "continent", "capital", "population_millions", "area_km2"], rows)}
-- Try these:

-- People per square kilometre
SELECT name, ROUND(population_millions * 1000000 / area_km2) AS people_per_km2 FROM countries ORDER BY people_per_km2 DESC LIMIT 10;

-- Totals per continent
SELECT continent, COUNT(*) AS countries, ROUND(SUM(population_millions)) AS population_millions FROM countries GROUP BY continent ORDER BY 3 DESC;
`;
}
export const SQL_SAMPLES = [
  { id: "shop", file: "shop.sql", name: "Online shop", desc: "Customers, products, orders and order items. Joins and totals.", make: shopDb },
  { id: "school", file: "school.sql", name: "School", desc: "Students, courses and grades. Averages and window functions.", make: schoolDb },
  { id: "company", file: "company.sql", name: "Company", desc: "Departments and employees with managers. Recursive queries.", make: companyDb },
  { id: "movies", file: "movies.sql", name: "Films", desc: "Well-known films and their directors.", make: moviesDb },
  { id: "countries", file: "countries.sql", name: "Countries", desc: "Population, area and capitals of 36 countries.", make: countriesDb },
];

/* =====================================================================
 * The views
 * ===================================================================== */
export function createPkgs(A) {
  const { h, icon, toast } = A;
  const ui = { webQuery: "", webResults: null, webLoading: false, webError: "", luaFilter: "", busy: new Set() };
  const files = () => A.project.files;

  /* ----- Lua ----- */
  const luaInstalled = (lib) => files()[lib.module + ".lua"] != null;
  async function installLua(lib, { quiet = false } = {}) {
    for (const dep of lib.deps || []) { const d = LUA_LIBS.find((x) => x.module === dep); if (d && !luaInstalled(d)) await installLua(d, { quiet: true }); }
    if (luaInstalled(lib)) return;
    ui.busy.add(lib.module); A.rerender();
    try {
      const r = await fetch(`${A.cfg.libs.gh}${lib.repo}@${lib.commit}/${lib.path}`);
      if (!r.ok) throw new Error(`the download failed (${r.status})`);
      const src = await r.text();
      const header = `-- ${lib.module}.lua from https://github.com/${lib.repo} (commit ${lib.commit.slice(0, 7)}), added by Dexna's Packages view.\n-- See that page for its license. Use it with: local ${lib.module.replace(/\W/g, "_")} = require("${lib.module}")\n`;
      A.writeFiles({ [lib.module + ".lua"]: header + src });
      (A.project.luaLibs ||= {})[lib.module] = { repo: lib.repo, commit: lib.commit };
      A.persist();
      if (!quiet) toast(`Added ${lib.module}.lua. Use it with require("${lib.module}").`, "ok", 4500);
    } catch (e) { toast(`Could not add ${lib.module}: ${e.message}`, "error"); }
    finally { ui.busy.delete(lib.module); A.rerender(); }
  }
  function removeLua(lib) {
    A.removeFiles([lib.module + ".lua"]);
    if (A.project.luaLibs) delete A.project.luaLibs[lib.module];
    A.persist(); A.rerender();
  }
  function luaExample(lib) {
    let name = `${lib.module}_example.lua`, n = 2;
    while (files()[name] != null) name = `${lib.module}_example${n++}.lua`;
    A.writeFiles({ [name]: lib.use + "\n" });
    A.openFile(name);
  }
  function renderLua({ pkgCard, pkgSection }) {
    const filter = (ui.luaFilterEl ||= h("input", { placeholder: "Filter Lua libraries", spellcheck: "false", oninput: () => { ui.luaFilter = ui.luaFilterEl.value.toLowerCase(); A.rerender(); } }));
    const installed = LUA_LIBS.filter(luaInstalled);
    const shown = LUA_LIBS.filter((l) => !ui.luaFilter || (l.module + " " + l.desc).toLowerCase().includes(ui.luaFilter));
    return [
      h("div", { class: "pkg-search" }, filter),
      h("p", { class: "pkg-hint" }, "Each library is one .lua file. Adding it downloads the file into your project (from GitHub, through jsDelivr), so require(\"name\") just works and it is saved with the project."),
      pkgSection("lua-added", "This project", installed.length, installed.length ? installed.map((l) => pkgCard({ name: l.module, version: l.commit.slice(0, 7), desc: l.desc,
        action: h("span", { class: "pk-acts" }, h("button", { class: "btn sm", title: "Create a file that shows how to use it", onclick: () => luaExample(l) }, "Example"), h("button", { class: "btn icon sm", title: `Delete ${l.module}.lua`, onclick: () => removeLua(l) }, icon("close"))) }))
        : h("p", { class: "pkg-hint" }, "No libraries yet.")),
      pkgSection("lua-all", "Libraries", shown.length, shown.map((l) => pkgCard({ name: l.module, desc: l.desc + (l.deps ? ` (also adds ${l.deps.join(", ")})` : ""), badge: l.repo.split("/")[0],
        action: luaInstalled(l) ? h("span", { class: "pk-done" }, icon("check")) : ui.busy.has(l.module) ? h("span", { class: "pkg-hint" }, "Adding...") : h("button", { class: "btn install", onclick: () => installLua(l) }, "Add") }))),
    ];
  }

  /* ----- Web pages ----- */
  const htmlFiles = () => Object.keys(files()).filter((f) => /\.html?$/i.test(f)).sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
  function targetPage() {
    const cur = A.currentPath();
    if (cur && /\.html?$/i.test(cur)) return cur;
    const all = htmlFiles();
    return all[0] || null;
  }
  function addWeb(urls, opts = {}, name = "") {
    const page = targetPage();
    if (!page) return toast("This project has no HTML page yet. Create index.html first (or start a Web page project).", "error");
    const before = A.textOf(page), after = addTags(before, urls, opts);
    if (after === before) return toast(`${name || "It"} is already on ${page}.`);
    A.writeFiles({ [page]: after });
    toast(`Added ${name || "the library"} to ${page}. Ctrl+Z undoes it.`, "ok");
    A.rerender();
  }
  function removeWeb(page, url) { A.writeFiles({ [page]: removeTag(A.textOf(page), url) }); A.rerender(); }
  let webTimer = 0;
  function searchWeb(qs) {
    ui.webQuery = qs; clearTimeout(webTimer);
    if (!qs.trim()) { ui.webResults = null; ui.webLoading = false; ui.webError = ""; A.rerender(); return; }
    ui.webLoading = true; A.rerender();
    webTimer = setTimeout(async () => {
      try {
        const r = await fetch(`${A.cfg.libs.cdnjsApi}libraries?search=${encodeURIComponent(qs.trim())}&fields=version,description&limit=15`);
        if (!r.ok) throw new Error(`search failed (${r.status})`);
        const data = await r.json();
        if (ui.webQuery !== qs) return;
        ui.webResults = (data.results || []).filter((x) => x.latest);
        ui.webError = "";
      } catch (e) { ui.webError = "Could not reach cdnjs. " + e.message; ui.webResults = []; }
      ui.webLoading = false; A.rerender();
    }, 350);
  }
  function renderWeb({ pkgCard, pkgSection }) {
    const input = (ui.webInput ||= h("input", { placeholder: "Search cdnjs (thousands of libraries)", spellcheck: "false", autocomplete: "off", oninput: () => searchWeb(ui.webInput.value) }));
    const page = targetPage();
    const used = page ? pageLibraries(A.textOf(page)) : [];
    const has = (lib) => page && lib.files.every((u) => used.includes(u));
    const parts = [
      h("div", { class: "pkg-search" }, input),
      h("p", { class: "pkg-hint" }, page ? `Adding a library puts its <script> or <link> tag into ${page}, so your page and the preview load it. Open another .html file to add to that one instead.` : "Create an index.html (or start a Web page project) to add libraries to it."),
      pkgSection("web-page", page ? `On ${page}` : "On this page", used.length, used.length ? used.map((u) => pkgCard({ name: libName(u), desc: u.replace(/^https?:\/\//, ""), action: h("button", { class: "btn icon sm", title: "Remove this tag from the page", onclick: () => removeWeb(page, u) }, icon("close")) }))
        : h("p", { class: "pkg-hint" }, "This page loads no libraries yet.")),
    ];
    if (ui.webQuery.trim()) {
      let body;
      if (ui.webLoading) body = h("p", { class: "pkg-hint" }, "Searching...");
      else if (ui.webError) body = h("p", { class: "pkg-hint err" }, ui.webError);
      else if (!ui.webResults?.length) body = h("p", { class: "pkg-hint" }, "Nothing found.");
      else body = ui.webResults.map((r) => pkgCard({ name: r.name, version: r.version, desc: r.description,
        action: used.includes(r.latest) ? h("span", { class: "pk-done" }, icon("check")) : h("button", { class: "btn install", disabled: !page, onclick: () => addWeb([r.latest], {}, r.name) }, "Add") }));
      parts.push(pkgSection("web-results", "From cdnjs", ui.webResults?.length ?? null, body));
    } else {
      parts.push(pkgSection("web-popular", "Popular", WEB_LIBS.length, WEB_LIBS.map((l) => pkgCard({ name: l.name, version: /@([\d.]+)/.exec(l.files[0])?.[1], desc: l.desc, badge: l.files.some(isCss) && !l.files.every(isCss) ? "CSS + JS" : l.files.every(isCss) ? "CSS" : null,
        action: has(l) ? h("span", { class: "pk-done" }, icon("check")) : h("button", { class: "btn install", disabled: !page, onclick: () => addWeb(l.files, { defer: l.defer }, l.name) }, "Add") }))));
    }
    return parts;
  }

  /* ----- SQL ----- */
  function addSample(s) {
    let name = s.file, n = 2;
    while (files()[name] != null) name = s.file.replace(/\.sql$/, `_${n++}.sql`);
    A.writeFiles({ [name]: s.make() });
    A.openFile(name);
    toast(`Created ${name}. Press F5 to build the database and run the example queries.`, "ok", 4500);
  }
  function renderSql({ pkgCard, pkgSection }) {
    return [
      h("p", { class: "pkg-hint" }, "SQL runs in SQLite inside your browser, with every built-in function (JSON, window functions, recursive queries, maths). There is nothing to install, but these sample databases give you real tables to practise on. Each one is a .sql file that creates the tables, fills them, and ends with example queries."),
      pkgSection("sql-samples", "Sample databases", SQL_SAMPLES.length, SQL_SAMPLES.map((s) => pkgCard({ name: s.name, desc: s.desc, badge: s.file,
        action: h("button", { class: "btn install", onclick: () => addSample(s) }, "Add") }))),
    ];
  }

  return {
    tabs: [["lua", "Lua"], ["web", "Web page"], ["sql", "SQL"]],
    render(lang, helpers) { return lang === "lua" ? renderLua(helpers) : lang === "web" ? renderWeb(helpers) : lang === "sql" ? renderSql(helpers) : []; },
    installLua, addWeb, addSample,
  };
}
