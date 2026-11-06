// Editor intelligence for every language Dexna runs, beyond Python (which has its own server):
// snippets for all languages, Lua and SQL completion/hover/signatures, Lua syntax errors,
// formatting for Lua (StyLua) and SQL (sql-formatter), and outlines for JS/TS/Lua/SQL.

/* ------------------------------------------------------------------ */
/* Snippets                                                            */
/* ------------------------------------------------------------------ */
const S = (label, detail, body) => ({ label, detail, body });

const SNIPPETS = {
  python: [
    S("def", "function", 'def ${1:name}(${2:args}):\n\t${0:pass}'),
    S("class", "class with __init__", 'class ${1:Name}:\n\tdef __init__(self${2:, args}):\n\t\t${0:pass}'),
    S("dataclass", "dataclass", '@dataclass\nclass ${1:Name}:\n\t${2:field}: ${3:int}${0}'),
    S("for", "for loop", 'for ${1:item} in ${2:items}:\n\t${0:pass}'),
    S("forenum", "for with enumerate", 'for ${1:i}, ${2:item} in enumerate(${3:items}):\n\t${0:pass}'),
    S("while", "while loop", 'while ${1:condition}:\n\t${0:pass}'),
    S("if", "if statement", 'if ${1:condition}:\n\t${0:pass}'),
    S("ifelse", "if / else", 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${0:pass}'),
    S("try", "try / except", 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${0:raise}'),
    S("with", "with open(...)", 'with open(${1:"file.txt"}, ${2:"r"}) as ${3:f}:\n\t${0:data = f.read()}'),
    S("listcomp", "list comprehension", '[${1:x} for ${2:x} in ${3:items}${4: if ${5:condition}}]'),
    S("dictcomp", "dict comprehension", '{${1:k}: ${2:v} for ${3:k}, ${4:v} in ${5:items}}'),
    S("lambda", "lambda", 'lambda ${1:x}: ${0:x}'),
    S("asyncdef", "async function", 'async def ${1:name}(${2:args}):\n\t${0:pass}'),
    S("ifmain", "if __name__ == '__main__'", 'if __name__ == "__main__":\n\t${0:main()}'),
    S("main", "main() function and entry point", 'def main():\n\t${0:pass}\n\n\nif __name__ == "__main__":\n\tmain()'),
  ],
  javascript: [
    S("log", "console.log", 'console.log(${0});'),
    S("fn", "function", 'function ${1:name}(${2:args}) {\n\t${0}\n}'),
    S("afn", "arrow function", 'const ${1:name} = (${2:args}) => {\n\t${0}\n};'),
    S("async", "async function", 'async function ${1:name}(${2:args}) {\n\t${0}\n}'),
    S("class", "class", 'class ${1:Name} {\n\tconstructor(${2:args}) {\n\t\t${0}\n\t}\n}'),
    S("for", "for loop", 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${0}\n}'),
    S("forof", "for...of", 'for (const ${1:item} of ${2:items}) {\n\t${0}\n}'),
    S("forin", "for...in", 'for (const ${1:key} in ${2:object}) {\n\t${0}\n}'),
    S("foreach", "array forEach", '${1:array}.forEach((${2:item}) => {\n\t${0}\n});'),
    S("map", "array map", '${1:array}.map((${2:item}) => ${0:item})'),
    S("filter", "array filter", '${1:array}.filter((${2:item}) => ${0:true})'),
    S("reduce", "array reduce", '${1:array}.reduce((${2:acc}, ${3:item}) => ${0:acc}, ${4:0})'),
    S("if", "if statement", 'if (${1:condition}) {\n\t${0}\n}'),
    S("ifelse", "if / else", 'if (${1:condition}) {\n\t${2}\n} else {\n\t${0}\n}'),
    S("switch", "switch", 'switch (${1:value}) {\n\tcase ${2:x}:\n\t\t${0}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}'),
    S("try", "try / catch", 'try {\n\t${1}\n} catch (${2:error}) {\n\t${0:console.error(error);}\n}'),
    S("imp", "import", 'import { ${2} } from "${1:./module}";'),
    S("exp", "export function", 'export function ${1:name}(${2:args}) {\n\t${0}\n}'),
    S("timeout", "setTimeout", 'setTimeout(() => {\n\t${0}\n}, ${1:1000});'),
    S("sleep", "sleep helper", 'const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));'),
    S("promise", "new Promise", 'new Promise((resolve, reject) => {\n\t${0}\n})'),
    S("fetch", "fetch JSON", 'const ${1:res} = await fetch("${2:https://}");\nconst ${3:data} = await ${1:res}.json();${0}'),
    S("input", "read a line", 'const ${1:answer} = await input("${2:Prompt: }");${0}'),
  ],
  typescript: [
    S("interface", "interface", 'interface ${1:Name} {\n\t${2:key}: ${3:string};${0}\n}'),
    S("type", "type alias", 'type ${1:Name} = ${0};'),
    S("enum", "enum", 'enum ${1:Name} {\n\t${2:A},\n\t${0:B},\n}'),
    S("tfn", "typed function", 'function ${1:name}(${2:arg}: ${3:string}): ${4:void} {\n\t${0}\n}'),
    S("generic", "generic function", 'function ${1:name}<${2:T}>(${3:value}: ${2:T}): ${2:T} {\n\t${0:return ${3:value};}\n}'),
    S("tclass", "class with typed members", 'class ${1:Name} {\n\tconstructor(private ${2:value}: ${3:string}) {}\n\n\t${0}\n}'),
    S("union", "discriminated union", 'type ${1:Shape} =\n\t| { kind: "${2:a}"; ${3:x}: number }\n\t| { kind: "${4:b}"; ${5:y}: number };${0}'),
  ],
  csharp: [
    S("main", "program with Main", 'using System;\n\nclass Program\n{\n\tstatic void Main()\n\t{\n\t\t${0}\n\t}\n}'),
    S("cw", "Console.WriteLine", 'Console.WriteLine(${0});'),
    S("read", "read a line", 'string ${1:line} = Console.ReadLine();${0}'),
    S("for", "for loop", 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++)\n{\n\t${0}\n}'),
    S("foreach", "foreach", 'foreach (var ${1:item} in ${2:items})\n{\n\t${0}\n}'),
    S("class", "class", 'class ${1:Name}\n{\n\tpublic ${2:int} ${3:Value} { get; set; }\n\n\t${0}\n}'),
    S("if", "if", 'if (${1:condition})\n{\n\t${0}\n}'),
    S("try", "try / catch", 'try\n{\n\t${1}\n}\ncatch (Exception ${2:e})\n{\n\t${0:Console.WriteLine(${2:e}.Message);}\n}'),
  ],
  java: [
    S("main", "class with main", 'import java.util.*;\n\npublic class Main {\n\tpublic static void main(String[] args) {\n\t\t${0}\n\t}\n}'),
    S("sout", "System.out.println", 'System.out.println(${0});'),
    S("scanner", "Scanner for input", 'Scanner ${1:in} = new Scanner(System.in);${0}'),
    S("for", "for loop", 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${0}\n}'),
    S("foreach", "for each", 'for (${1:String} ${2:item} : ${3:items}) {\n\t${0}\n}'),
    S("class", "class", 'class ${1:Name} {\n\tprivate ${2:int} ${3:value};\n\n\t${0}\n}'),
    S("try", "try / catch", 'try {\n\t${1}\n} catch (${2:Exception} ${3:e}) {\n\t${0:e.printStackTrace();}\n}'),
  ],
  c: [
    S("main", "program with main", '#include <stdio.h>\n\nint main(void) {\n\t${0}\n\treturn 0;\n}'),
    S("printf", "printf", 'printf("${1:%d}\\n", ${2:value});${0}'),
    S("for", "for loop", 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${0}\n}'),
    S("if", "if", 'if (${1:condition}) {\n\t${0}\n}'),
    S("struct", "struct", 'typedef struct {\n\t${1:int} ${2:field};\n} ${3:Name};${0}'),
  ],
  cpp: [
    S("main", "program with main", '#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {\n\t${0}\n\treturn 0;\n}'),
    S("cout", "cout", 'cout << ${1:value} << endl;${0}'),
    S("cin", "read with getline", 'string ${1:line};\ngetline(cin, ${1:line});${0}'),
    S("for", "for loop", 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${0}\n}'),
    S("forrange", "range for", 'for (const auto& ${1:item} : ${2:items}) {\n\t${0}\n}'),
    S("class", "class", 'class ${1:Name} {\npublic:\n\t${1:Name}() {}\n\t${0}\n};'),
    S("vec", "vector", 'vector<${1:int}> ${2:v};${0}'),
  ],
  go: [
    S("main", "program with main", 'package main\n\nimport "fmt"\n\nfunc main() {\n\t${0:fmt.Println("hello")}\n}'),
    S("fn", "function", 'func ${1:name}(${2:args}) ${3:int} {\n\t${0}\n}'),
    S("for", "for loop", 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t${0}\n}'),
    S("forr", "for range", 'for ${1:i}, ${2:v} := range ${3:items} {\n\t${0}\n}'),
    S("iferr", "if err != nil", 'if err != nil {\n\t${0:return err}\n}'),
    S("struct", "struct", 'type ${1:Name} struct {\n\t${2:Field} ${3:string}\n}${0}'),
    S("println", "fmt.Println", 'fmt.Println(${0})'),
  ],
  rust: [
    S("main", "fn main", 'fn main() {\n\t${0:println!("hello");}\n}'),
    S("fn", "function", 'fn ${1:name}(${2:arg}: ${3:i32}) -> ${4:i32} {\n\t${0}\n}'),
    S("for", "for loop", 'for ${1:i} in ${2:0..10} {\n\t${0}\n}'),
    S("println", "println!", 'println!("${1:{}}", ${2:value});${0}'),
    S("struct", "struct", 'struct ${1:Name} {\n\t${2:field}: ${3:i32},\n}${0}'),
    S("match", "match", 'match ${1:value} {\n\t${2:pattern} => ${3:result},\n\t_ => ${0:other},\n}'),
    S("readline", "read a line", 'let mut ${1:line} = String::new();\nstd::io::stdin().read_line(&mut ${1:line}).unwrap();${0}'),
  ],
  kotlin: [
    S("main", "fun main", 'fun main() {\n\t${0:println("hello")}\n}'),
    S("fun", "function", 'fun ${1:name}(${2:arg}: ${3:Int}): ${4:Int} {\n\t${0}\n}'),
    S("for", "for loop", 'for (${1:i} in ${2:0 until 10}) {\n\t${0}\n}'),
    S("class", "data class", 'data class ${1:Name}(val ${2:field}: ${3:String})${0}'),
    S("readln", "read a line", 'val ${1:line} = readln()${0}'),
    S("when", "when", 'when (${1:value}) {\n\t${2:x} -> ${3:result}\n\telse -> ${0}\n}'),
  ],
  swift: [
    S("print", "print", 'print(${0})'),
    S("func", "function", 'func ${1:name}(_ ${2:arg}: ${3:Int}) -> ${4:Int} {\n\t${0}\n}'),
    S("for", "for in", 'for ${1:i} in ${2:0..<10} {\n\t${0}\n}'),
    S("struct", "struct", 'struct ${1:Name} {\n\tvar ${2:field}: ${3:String}\n}${0}'),
    S("readline", "read a line", 'let ${1:line} = readLine() ?? ""${0}'),
    S("guard", "guard let", 'guard let ${1:value} = ${2:optional} else {\n\t${0:return}\n}'),
  ],
  php: [
    S("php", "PHP file", '<?php\n\n${0}'),
    S("fn", "function", 'function ${1:name}(${2:$arg}) {\n\t${0}\n}'),
    S("for", "for loop", 'for ($${1:i} = 0; $${1:i} < ${2:$n}; $${1:i}++) {\n\t${0}\n}'),
    S("foreach", "foreach", 'foreach (${1:$items} as ${2:$item}) {\n\t${0}\n}'),
    S("class", "class", 'class ${1:Name} {\n\tpublic function __construct(private ${2:$value}) {}\n\n\t${0}\n}'),
    S("echo", "echo line", 'echo ${1:"hello"} . "\\n";${0}'),
  ],
  ruby: [
    S("def", "method", 'def ${1:name}(${2:args})\n\t${0}\nend'),
    S("class", "class", 'class ${1:Name}\n\tdef initialize(${2:args})\n\t\t${0}\n\tend\nend'),
    S("each", "each", '${1:items}.each do |${2:item}|\n\t${0}\nend'),
    S("times", "times", '${1:5}.times do |${2:i}|\n\t${0}\nend'),
    S("if", "if", 'if ${1:condition}\n\t${0}\nend'),
    S("gets", "read a line", '${1:line} = gets.to_s.chomp${0}'),
    S("puts", "puts", 'puts ${0}'),
  ],
  lua: [
    S("function", "function", 'function ${1:name}(${2:args})\n\t${0}\nend'),
    S("localfn", "local function", 'local function ${1:name}(${2:args})\n\t${0}\nend'),
    S("for", "numeric for", 'for ${1:i} = ${2:1}, ${3:10} do\n\t${0}\nend'),
    S("forp", "for pairs", 'for ${1:k}, ${2:v} in pairs(${3:t}) do\n\t${0}\nend'),
    S("fori", "for ipairs", 'for ${1:i}, ${2:v} in ipairs(${3:t}) do\n\t${0}\nend'),
    S("if", "if", 'if ${1:condition} then\n\t${0}\nend'),
    S("ifelse", "if / else", 'if ${1:condition} then\n\t${2}\nelse\n\t${0}\nend'),
    S("while", "while", 'while ${1:condition} do\n\t${0}\nend'),
    S("repeat", "repeat until", 'repeat\n\t${0}\nuntil ${1:condition}'),
    S("class", "class with metatable", 'local ${1:Class} = {}\n${1:Class}.__index = ${1:Class}\n\nfunction ${1:Class}.new(${2:args})\n\tlocal self = setmetatable({}, ${1:Class})\n\t${0}\n\treturn self\nend'),
    S("require", "require a module", 'local ${1:mod} = require("${2:module}")'),
    S("pcall", "protected call", 'local ok, ${1:err} = pcall(function()\n\t${0}\nend)\nif not ok then\n\tprint("error:", ${1:err})\nend'),
    S("module", "module table", 'local M = {}\n\nfunction M.${1:name}(${2:args})\n\t${0}\nend\n\nreturn M'),
  ],
  sql: [
    S("sel", "SELECT ... FROM", 'SELECT ${2:*}\nFROM ${1:table}${0};'),
    S("selw", "SELECT with WHERE", 'SELECT ${2:*}\nFROM ${1:table}\nWHERE ${3:condition}${0};'),
    S("join", "JOIN", '${1:INNER} JOIN ${2:table} ${3:t} ON ${3:t}.${4:id} = ${5:other}.${6:id}${0}'),
    S("ins", "INSERT INTO", 'INSERT INTO ${1:table} (${2:columns})\nVALUES (${3:values});${0}'),
    S("upd", "UPDATE", 'UPDATE ${1:table}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition};${0}'),
    S("del", "DELETE FROM", 'DELETE FROM ${1:table}\nWHERE ${2:condition};${0}'),
    S("ct", "CREATE TABLE", 'CREATE TABLE ${1:table} (\n\tid INTEGER PRIMARY KEY,\n\t${2:name} TEXT NOT NULL${0}\n);'),
    S("cti", "CREATE INDEX", 'CREATE INDEX ${1:idx_name} ON ${2:table} (${3:column});${0}'),
    S("view", "CREATE VIEW", 'CREATE VIEW ${1:name} AS\nSELECT ${2:*}\nFROM ${3:table};${0}'),
    S("cte", "WITH (common table expression)", 'WITH ${1:cte} AS (\n\tSELECT ${2:*}\n\tFROM ${3:table}\n)\nSELECT * FROM ${1:cte};${0}'),
    S("win", "window function", '${1:ROW_NUMBER}() OVER (PARTITION BY ${2:column} ORDER BY ${3:column} ${4:DESC})${0}'),
    S("grp", "GROUP BY with HAVING", 'SELECT ${1:column}, COUNT(*) AS n\nFROM ${2:table}\nGROUP BY ${1:column}\nHAVING COUNT(*) > ${3:1}\nORDER BY n DESC;${0}'),
    S("case", "CASE expression", 'CASE\n\tWHEN ${1:condition} THEN ${2:result}\n\tELSE ${3:other}\nEND${0}'),
    S("trig", "CREATE TRIGGER", 'CREATE TRIGGER ${1:name} AFTER INSERT ON ${2:table}\nBEGIN\n\t${0}\nEND;'),
  ],
};

/* ------------------------------------------------------------------ */
/* Lua reference                                                       */
/* ------------------------------------------------------------------ */
const LUA_KEYWORDS = ["and", "break", "do", "else", "elseif", "end", "false", "for", "function", "goto", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while"];
// [name, signature, description]
const LUA_API = [
  ["print", "(...)", "Prints its arguments to the terminal, separated by tabs, using tostring."],
  ["type", "(v)", 'Returns the type of v as a string: "nil", "number", "string", "boolean", "table", "function", "thread" or "userdata".'],
  ["tostring", "(v)", "Converts any value to a string. Uses the __tostring metamethod if there is one."],
  ["tonumber", "(e [, base])", "Converts e to a number, or returns nil (fail) if it is not a valid number."],
  ["pairs", "(t)", "Iterates over all key/value pairs of a table, in no particular order."],
  ["ipairs", "(t)", "Iterates over t[1], t[2], ... until the first nil."],
  ["next", "(table [, index])", "Returns the next key/value pair after index. Used to traverse a table."],
  ["select", "(n, ...)", 'With a number n, returns arguments after the n-th. With "#", returns the argument count.'],
  ["require", "(modname)", "Loads a module (a .lua file in your project) once and returns what it returned."],
  ["pcall", "(f, ...)", "Calls f in protected mode. Returns true plus results, or false plus the error."],
  ["xpcall", "(f, msgh, ...)", "Like pcall, but calls msgh to build the error message (for example debug.traceback)."],
  ["error", "(message [, level])", "Raises an error with the given message."],
  ["assert", "(v [, message])", "Raises an error if v is false or nil; otherwise returns all its arguments."],
  ["setmetatable", "(table, metatable)", "Sets the metatable of a table and returns the table."],
  ["getmetatable", "(object)", "Returns the metatable of object, or nil."],
  ["rawget", "(table, index)", "Gets table[index] without invoking metamethods."],
  ["rawset", "(table, index, value)", "Sets table[index] = value without invoking metamethods."],
  ["rawequal", "(v1, v2)", "Checks equality without invoking __eq."],
  ["rawlen", "(v)", "Returns the length of a table or string without invoking __len."],
  ["load", "(chunk [, chunkname [, mode [, env]]])", "Compiles a chunk of Lua code (string or function) and returns it as a function."],
  ["collectgarbage", "([opt [, arg]])", 'Controls the garbage collector, for example collectgarbage("count") returns memory in KB.'],
  ["string.len", "(s)", "Returns the length of a string in bytes."],
  ["string.sub", "(s, i [, j])", "Returns the substring from i to j (inclusive). Negative values count from the end."],
  ["string.upper", "(s)", "Returns s in upper case."],
  ["string.lower", "(s)", "Returns s in lower case."],
  ["string.rep", "(s, n [, sep])", "Returns s repeated n times, separated by sep."],
  ["string.reverse", "(s)", "Returns s reversed."],
  ["string.format", "(fmt, ...)", "Formats like C printf: %d integer, %s string, %f float, %q quoted, %x hex, %5.2f width and precision."],
  ["string.find", "(s, pattern [, init [, plain]])", "Finds the first match of a pattern. Returns start and end indices (and captures), or nil."],
  ["string.match", "(s, pattern [, init])", "Returns the captures of the first match of pattern, or nil."],
  ["string.gmatch", "(s, pattern)", "Returns an iterator over all matches of pattern in s."],
  ["string.gsub", "(s, pattern, repl [, n])", "Replaces matches of pattern. repl can be a string, table or function. Returns the new string and the count."],
  ["string.byte", "(s [, i [, j]])", "Returns the numeric codes of the characters s[i..j]."],
  ["string.char", "(...)", "Builds a string from numeric character codes."],
  ["table.insert", "(list, [pos,] value)", "Inserts value at position pos (default: the end)."],
  ["table.remove", "(list [, pos])", "Removes and returns the element at pos (default: the last)."],
  ["table.concat", "(list [, sep [, i [, j]]])", "Joins the elements of a list into one string."],
  ["table.sort", "(list [, comp])", "Sorts the list in place. comp(a, b) returns true if a should come first."],
  ["table.unpack", "(list [, i [, j]])", "Returns the elements of the list as multiple values."],
  ["table.pack", "(...)", "Returns a new table with all arguments and the field n holding their count."],
  ["table.move", "(a1, f, e, t [, a2])", "Copies elements a1[f..e] to a2[t..]."],
  ["math.abs", "(x)", "Absolute value."],
  ["math.ceil", "(x)", "Smallest integer greater than or equal to x."],
  ["math.floor", "(x)", "Largest integer less than or equal to x."],
  ["math.max", "(x, ...)", "Largest of its arguments."],
  ["math.min", "(x, ...)", "Smallest of its arguments."],
  ["math.sqrt", "(x)", "Square root."],
  ["math.sin", "(x)", "Sine of x (radians)."],
  ["math.cos", "(x)", "Cosine of x (radians)."],
  ["math.tan", "(x)", "Tangent of x (radians)."],
  ["math.asin", "(x)", "Arc sine."],
  ["math.acos", "(x)", "Arc cosine."],
  ["math.atan", "(y [, x])", "Arc tangent of y/x, using both signs to find the quadrant."],
  ["math.exp", "(x)", "e raised to the power x."],
  ["math.log", "(x [, base])", "Logarithm of x in the given base (default: e)."],
  ["math.fmod", "(x, y)", "Remainder of x / y, rounded towards zero."],
  ["math.modf", "(x)", "Integral and fractional parts of x."],
  ["math.tointeger", "(x)", "x as an integer if it has an exact integer value, else nil."],
  ["math.type", "(x)", 'Returns "integer", "float", or nil if x is not a number.'],
  ["math.random", "([m [, n]])", "Random float in [0,1), or a random integer in [1,m] or [m,n]."],
  ["math.randomseed", "([x [, y]])", "Seeds the random number generator."],
  ["math.huge", "", "A float larger than any number (infinity)."],
  ["math.pi", "", "The value of pi."],
  ["math.maxinteger", "", "Largest integer."],
  ["math.mininteger", "", "Smallest integer."],
  ["os.time", "([table])", "Current time as a number, or the time for a table with year, month, day, hour, min, sec."],
  ["os.date", "([format [, time]])", 'Formats a time. Use "*t" for a table, or strftime-style formats like "%Y-%m-%d".'],
  ["os.clock", "()", "CPU time used by the program, in seconds. Good for timing code."],
  ["os.getenv", "(varname)", "Value of an environment variable. Always nil in the browser."],
  ["os.difftime", "(t2, t1)", "Seconds between two times."],
  ["io.write", "(...)", "Writes its arguments to the terminal without a newline."],
  ["io.read", "([format])", 'Reads a line from the terminal. Formats: "l" (default) a line, "n" a number, "L" a line with newline.'],
  ["io.lines", "()", "Iterator over lines typed into the terminal."],
  ["coroutine.create", "(f)", "Creates a coroutine from function f."],
  ["coroutine.resume", "(co, ...)", "Starts or continues a coroutine. Returns true plus yielded values, or false plus an error."],
  ["coroutine.yield", "(...)", "Suspends the running coroutine, passing values back to resume."],
  ["coroutine.status", "(co)", 'Returns "running", "suspended", "normal" or "dead".'],
  ["coroutine.wrap", "(f)", "Creates a coroutine and returns a function that resumes it."],
  ["coroutine.isyieldable", "()", "True if the running coroutine can yield."],
  ["coroutine.close", "(co)", "Closes a suspended or dead coroutine."],
  ["utf8.char", "(...)", "Builds a UTF-8 string from code points."],
  ["utf8.codepoint", "(s [, i [, j]])", "Code points of the characters in s."],
  ["utf8.len", "(s [, i [, j]])", "Number of UTF-8 characters in s."],
  ["utf8.codes", "(s)", "Iterator over (position, code point) pairs."],
  ["utf8.charpattern", "", "Pattern matching exactly one UTF-8 byte sequence."],
];
const LUA_LIBS = ["string", "table", "math", "os", "io", "coroutine", "utf8"];
const LUA_DOC = new Map(LUA_API.map(([n, sig, d]) => [n, { sig, d }]));

/* ------------------------------------------------------------------ */
/* SQL reference                                                       */
/* ------------------------------------------------------------------ */
const SQL_KEYWORDS = ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET", "DISTINCT", "ALL", "AS", "JOIN", "INNER JOIN", "LEFT JOIN", "LEFT OUTER JOIN", "CROSS JOIN", "NATURAL JOIN", "ON", "USING", "UNION", "UNION ALL", "INTERSECT", "EXCEPT", "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM", "CREATE TABLE", "CREATE TEMP TABLE", "CREATE INDEX", "CREATE UNIQUE INDEX", "CREATE VIEW", "CREATE TRIGGER", "DROP TABLE", "DROP INDEX", "DROP VIEW", "ALTER TABLE", "ADD COLUMN", "RENAME TO", "RENAME COLUMN", "DROP COLUMN", "PRIMARY KEY", "FOREIGN KEY", "REFERENCES", "NOT NULL", "NULL", "UNIQUE", "DEFAULT", "CHECK", "AUTOINCREMENT", "CONSTRAINT", "IF NOT EXISTS", "IF EXISTS", "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE", "GLOB", "IS NULL", "IS NOT NULL", "EXISTS", "CASE", "WHEN", "THEN", "ELSE", "END", "WITH", "WITH RECURSIVE", "OVER", "PARTITION BY", "ROWS BETWEEN", "UNBOUNDED PRECEDING", "CURRENT ROW", "ASC", "DESC", "NULLS FIRST", "NULLS LAST", "BEGIN", "COMMIT", "ROLLBACK", "TRANSACTION", "PRAGMA", "EXPLAIN", "EXPLAIN QUERY PLAN", "VACUUM", "INSERT OR REPLACE INTO", "INSERT OR IGNORE INTO", "ON CONFLICT", "DO UPDATE SET", "RETURNING", "INTEGER", "TEXT", "REAL", "BLOB", "NUMERIC", "TRUE", "FALSE", "CAST", "COLLATE", "ESCAPE"];
const SQL_FUNCS = [
  ["count", "(*) | (expr)", "Number of rows, or of non-NULL values of expr."],
  ["sum", "(expr)", "Sum of the non-NULL values. NULL if there are none."],
  ["total", "(expr)", "Like sum, but returns 0.0 instead of NULL for no rows."],
  ["avg", "(expr)", "Average of the non-NULL values."],
  ["min", "(expr) | (a, b, ...)", "Smallest value (aggregate with one argument, scalar with more)."],
  ["max", "(expr) | (a, b, ...)", "Largest value (aggregate with one argument, scalar with more)."],
  ["group_concat", "(expr [, sep])", "Joins values of a group into one string."],
  ["abs", "(x)", "Absolute value."],
  ["round", "(x [, digits])", "Rounds x to the given number of decimal digits."],
  ["random", "()", "A pseudo-random 64-bit integer."],
  ["length", "(x)", "Characters in a string (or bytes in a blob)."],
  ["lower", "(s)", "Lower-case copy of s."],
  ["upper", "(s)", "Upper-case copy of s."],
  ["trim", "(s [, chars])", "Removes characters (default spaces) from both ends."],
  ["ltrim", "(s [, chars])", "Removes characters from the left end."],
  ["rtrim", "(s [, chars])", "Removes characters from the right end."],
  ["substr", "(s, start [, length])", "Substring starting at 1-based position start."],
  ["replace", "(s, find, repl)", "Replaces every occurrence of find with repl."],
  ["instr", "(s, find)", "1-based position of the first occurrence of find, or 0."],
  ["printf", "(format, ...)", "Formats like C printf."],
  ["format", "(format, ...)", "Alias of printf."],
  ["hex", "(x)", "Hexadecimal text for a blob or string."],
  ["quote", "(x)", "SQL literal text for x."],
  ["char", "(code, ...)", "String built from Unicode code points."],
  ["unicode", "(s)", "Code point of the first character."],
  ["coalesce", "(a, b, ...)", "First argument that is not NULL."],
  ["ifnull", "(a, b)", "a, or b if a is NULL."],
  ["nullif", "(a, b)", "NULL if a = b, else a."],
  ["iif", "(cond, then, else)", "then if cond is true, otherwise else."],
  ["typeof", "(x)", 'Storage type: "null", "integer", "real", "text" or "blob".'],
  ["date", "(time, modifier, ...)", "Date as YYYY-MM-DD. Example: date('now', '-7 days')."],
  ["time", "(time, modifier, ...)", "Time as HH:MM:SS."],
  ["datetime", "(time, modifier, ...)", "Date and time as YYYY-MM-DD HH:MM:SS."],
  ["strftime", "(format, time, modifier, ...)", "Formats a date, e.g. strftime('%Y', date_col)."],
  ["julianday", "(time, ...)", "Julian day number, handy for date differences."],
  ["json", "(text)", "Validates and minifies JSON text."],
  ["json_extract", "(json, path, ...)", "Extracts a value from JSON, e.g. json_extract(col, '$.name')."],
  ["json_array", "(...)", "Builds a JSON array."],
  ["json_object", "(key, value, ...)", "Builds a JSON object."],
  ["json_group_array", "(expr)", "Aggregates values into a JSON array."],
  ["json_each", "(json)", "Table-valued function: one row per element."],
  ["row_number", "() OVER (...)", "Sequential number of the row within its partition."],
  ["rank", "() OVER (...)", "Rank with gaps for ties."],
  ["dense_rank", "() OVER (...)", "Rank without gaps for ties."],
  ["ntile", "(n) OVER (...)", "Splits the partition into n buckets."],
  ["lag", "(expr [, offset [, default]]) OVER (...)", "Value from a previous row."],
  ["lead", "(expr [, offset [, default]]) OVER (...)", "Value from a following row."],
  ["first_value", "(expr) OVER (...)", "Value of the first row in the window frame."],
  ["last_value", "(expr) OVER (...)", "Value of the last row in the window frame."],
  ["cume_dist", "() OVER (...)", "Cumulative distribution of the row."],
  ["percent_rank", "() OVER (...)", "Relative rank from 0 to 1."],
  ["changes", "()", "Rows changed by the most recent INSERT, UPDATE or DELETE."],
  ["last_insert_rowid", "()", "Rowid of the most recent successful INSERT."],
  ["sqlite_version", "()", "Version of SQLite."],
];
const SQL_FUNC_DOC = new Map(SQL_FUNCS.map(([n, sig, d]) => [n, { sig, d }]));
const SQL_NOT_ALIAS = new Set(["where", "join", "on", "inner", "left", "right", "outer", "cross", "natural", "group", "order", "limit", "using", "union", "set", "values", "having", "except", "intersect", "select", "as", "window", "returning"]);

/** Tables and columns defined by CREATE TABLE / CREATE VIEW statements in `text`. */
function parseSqlSchema(text) {
  const tables = new Map();
  const clean = text.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /create\s+(?:temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?["`[]?(\w+)["`\]]?\s*\(/gi;
  let m;
  while ((m = re.exec(clean))) {
    let depth = 1, i = re.lastIndex, start = i;
    for (; i < clean.length && depth; i++) { if (clean[i] === "(") depth++; else if (clean[i] === ")") depth--; }
    const body = clean.slice(start, i - 1);
    const parts = []; let cur = "", d = 0;
    for (const ch of body) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && !d) { parts.push(cur); cur = ""; } else cur += ch; }
    parts.push(cur);
    const cols = [];
    for (const p of parts) {
      const t = p.trim().match(/^["`[]?(\w+)["`\]]?\s*(\w+)?/);
      if (!t || /^(primary|foreign|unique|check|constraint)$/i.test(t[1])) continue;
      cols.push({ name: t[1], type: (t[2] || "").toUpperCase() });
    }
    tables.set(m[1], cols);
  }
  const vre = /create\s+(?:temp(?:orary)?\s+)?view\s+(?:if\s+not\s+exists\s+)?["`[]?(\w+)["`\]]?/gi;
  while ((m = vre.exec(clean))) if (!tables.has(m[1])) tables.set(m[1], []);
  return tables;
}

function sqlAliases(text, schema) {
  const out = new Map();
  const re = /\b(?:from|join)\s+(\w+)(?:\s+as)?\s+(\w+)/gi;
  let m;
  while ((m = re.exec(text))) if (schema.has(m[1]) && !SQL_NOT_ALIAS.has(m[2].toLowerCase())) out.set(m[2], m[1]);
  return out;
}

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */
const loadedScripts = new Map();
/**
 * Load a classic script that exposes a global (UMD). It is evaluated with `define`/`exports`
 * hidden, otherwise the editor's AMD loader would swallow it instead of creating the global.
 */
function loadScript(url) {
  if (!loadedScripts.has(url)) {
    loadedScripts.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`${url} (${r.status})`); return r.text(); })
      .then((code) => { new Function("define", "exports", "module", "require", code).call(window); })
      .catch((e) => { loadedScripts.delete(url); throw new Error("Could not load " + url + ": " + e.message); }));
  }
  return loadedScripts.get(url);
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

/**
 * @param monaco the Monaco namespace
 * @param ctx { libs, getSettings(), minimalEdit(model, text), toast(msg, kind) }
 */
export function registerLanguageTools(monaco, ctx) {
  const L = monaco.languages;
  const K = L.CompletionItemKind;
  const md = (head, doc) => ({ value: (head ? "```\n" + head + "\n```\n" : "") + (doc || "") });

  /* ---- snippets for every language ---- */
  for (const [lang, list] of Object.entries(SNIPPETS)) {
    L.registerCompletionItemProvider(lang, {
      provideCompletionItems(model, position) {
        const w = model.getWordUntilPosition(position);
        const range = new monaco.Range(position.lineNumber, w.startColumn, position.lineNumber, w.endColumn);
        const before = model.getLineContent(position.lineNumber).slice(0, w.startColumn - 1);
        if (/[.:]\s*$/.test(before)) return { suggestions: [] }; // not after a member access
        return {
          suggestions: list.map((s) => ({
            label: s.label, kind: K.Snippet, detail: s.detail, documentation: { value: "```\n" + s.body.replace(/\$\{\d+:?([^}]*)\}/g, "$1").replace(/\$0/g, "") + "\n```" },
            insertText: s.body, insertTextRules: L.CompletionItemInsertTextRule.InsertAsSnippet, range, sortText: "9" + s.label,
          })),
        };
      },
    });
  }

  /* ---- Lua ---- */
  const luaDeclared = (code) => {
    const names = new Set();
    for (const m of code.matchAll(/\blocal\s+function\s+([A-Za-z_]\w*)/g)) names.add(m[1]);
    for (const m of code.matchAll(/\bfunction\s+([A-Za-z_][\w]*)\s*\(/g)) names.add(m[1]);
    for (const m of code.matchAll(/\blocal\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)/g)) m[1].split(",").forEach((n) => names.add(n.trim()));
    for (const m of code.matchAll(/\bfor\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s+(?:=|in)\b/g)) m[1].split(",").forEach((n) => names.add(n.trim()));
    for (const m of code.matchAll(/\bfunction\s+(?:[\w.]+[.:])?\w*\s*\(([^)]*)\)/g)) m[1].split(",").map((s) => s.trim()).filter((s) => /^[A-Za-z_]\w*$/.test(s)).forEach((n) => names.add(n));
    for (const m of code.matchAll(/^\s*([A-Za-z_]\w*)\s*=[^=]/gm)) names.add(m[1]);
    LUA_KEYWORDS.forEach((k) => names.delete(k));
    return names;
  };
  const luaMethodsIn = (code) => [...code.matchAll(/\bfunction\s+[\w.]+:(\w+)\s*\(([^)]*)\)/g)].map((m) => ({ name: m[1], params: m[2] }));
  const luaFieldsOf = (code, owner) => [...code.matchAll(new RegExp(`\\bfunction\\s+${owner}\\.(\\w+)\\s*\\(([^)]*)\\)`, "g"))].map((m) => ({ name: m[1], params: m[2] }));

  L.registerCompletionItemProvider("lua", {
    triggerCharacters: [".", ":"],
    provideCompletionItems(model, position) {
      const w = model.getWordUntilPosition(position);
      const range = new monaco.Range(position.lineNumber, w.startColumn, position.lineNumber, w.endColumn);
      const before = model.getLineContent(position.lineNumber).slice(0, w.startColumn - 1);
      if (/^\s*--/.test(before)) return { suggestions: [] };
      const code = model.getValue();
      const out = [];
      const mem = /([A-Za-z_]\w*)\s*([.:])\s*$/.exec(before);
      if (mem) {
        const [, owner, op] = mem;
        if (op === "." && LUA_LIBS.includes(owner)) {
          for (const [n, sig, d] of LUA_API) if (n.startsWith(owner + ".")) {
            const short = n.slice(owner.length + 1);
            out.push({ label: short, kind: sig ? K.Function : K.Constant, detail: owner + "." + short + sig, documentation: md(owner + "." + short + sig, d), insertText: sig && sig !== "()" ? short + "($0)" : short, insertTextRules: L.CompletionItemInsertTextRule.InsertAsSnippet, range });
          }
        } else if (op === ":") {
          for (const m of luaMethodsIn(code)) out.push({ label: m.name, kind: K.Method, detail: `${owner}:${m.name}(${m.params})`, insertText: m.name + "($0)", insertTextRules: L.CompletionItemInsertTextRule.InsertAsSnippet, range });
          for (const [n, sig, d] of LUA_API) if (n.startsWith("string.")) { const short = n.slice(7); out.push({ label: short, kind: K.Method, detail: `string method${sig}`, documentation: md(n + sig, d), insertText: short + "($0)", insertTextRules: L.CompletionItemInsertTextRule.InsertAsSnippet, range }); }
        } else {
          for (const f of luaFieldsOf(code, owner)) out.push({ label: f.name, kind: K.Function, detail: `${owner}.${f.name}(${f.params})`, insertText: f.name + "($0)", insertTextRules: L.CompletionItemInsertTextRule.InsertAsSnippet, range });
        }
        return { suggestions: out };
      }
      for (const k of LUA_KEYWORDS) out.push({ label: k, kind: K.Keyword, insertText: k, range, sortText: "5" + k });
      for (const [n, sig, d] of LUA_API) if (!n.includes(".")) out.push({ label: n, kind: K.Function, detail: n + sig, documentation: md(n + sig, d), insertText: sig ? n + "($0)" : n, insertTextRules: L.CompletionItemInsertTextRule.InsertAsSnippet, range, sortText: "3" + n });
      for (const lib of LUA_LIBS) out.push({ label: lib, kind: K.Module, detail: "library", insertText: lib, range, sortText: "4" + lib });
      for (const n of luaDeclared(code)) out.push({ label: n, kind: K.Variable, detail: "in this file", insertText: n, range, sortText: "1" + n });
      return { suggestions: out };
    },
  });

  L.registerHoverProvider("lua", {
    provideHover(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const w = model.getWordAtPosition(position);
      if (!w) return null;
      // qualified name: expand over dots, e.g. string.format
      let s = w.startColumn - 1, e = w.endColumn - 1;
      while (s > 1 && line[s - 1] === "." && /\w/.test(line[s - 2] || "")) { s--; while (s > 0 && /\w/.test(line[s - 1])) s--; }
      const qualified = line.slice(s, e);
      const doc = LUA_DOC.get(qualified) || LUA_DOC.get(w.word) || (LUA_LIBS.includes(w.word) ? { sig: "", d: `The ${w.word} library.` } : null);
      if (doc) return { range: new monaco.Range(position.lineNumber, s + 1, position.lineNumber, e + 1), contents: [md((LUA_DOC.has(qualified) ? qualified : w.word) + doc.sig, doc.d)] };
      if (LUA_KEYWORDS.includes(w.word)) return { contents: [md(w.word, "Lua keyword")] };
      const fn = new RegExp(`function\\s+[\\w.:]*\\b${w.word}\\s*\\(([^)]*)\\)`).exec(model.getValue());
      if (fn) return { contents: [md(`function ${w.word}(${fn[1]})`, "Defined in this file")] };
      return null;
    },
  });

  L.registerSignatureHelpProvider("lua", {
    signatureHelpTriggerCharacters: ["(", ","],
    provideSignatureHelp(model, position) {
      const before = model.getValueInRange(new monaco.Range(Math.max(1, position.lineNumber - 10), 1, position.lineNumber, position.column));
      let depth = 0, idx = 0, i = before.length - 1;
      for (; i >= 0; i--) {
        const c = before[i];
        if (c === ")" || c === "]" || c === "}") depth++;
        else if (c === "(" || c === "[" || c === "{") { if (!depth) break; depth--; }
        else if (c === "," && !depth) idx++;
      }
      if (i < 0 || before[i] !== "(") return null;
      const name = /([A-Za-z_][\w.:]*)\s*$/.exec(before.slice(0, i))?.[1];
      if (!name) return null;
      let sig = null, doc = "";
      const known = LUA_DOC.get(name) || LUA_DOC.get(name.replace(/^.*:/, "string."));
      if (known) { sig = name + known.sig; doc = known.d; }
      else {
        const fn = new RegExp(`function\\s+[\\w.:]*\\b${name.replace(/^.*[.:]/, "")}\\s*\\(([^)]*)\\)`).exec(model.getValue());
        if (fn) sig = `${name}(${fn[1]})`;
      }
      if (!sig) return null;
      const params = (/\((.*)\)/.exec(sig)?.[1] || "").replace(/[[\]]/g, "").split(",").map((p) => p.trim()).filter(Boolean);
      return { value: { signatures: [{ label: sig, documentation: doc ? { value: doc } : undefined, parameters: params.map((p) => ({ label: p })) }], activeSignature: 0, activeParameter: Math.min(idx, Math.max(0, params.length - 1)) }, dispose() {} };
    },
  });

  /* Lua syntax errors (luaparse) */
  const luaTimers = new WeakMap();
  const lintLua = async (model) => {
    if (model.isDisposed()) return;
    try { await loadScript(ctx.libs.luaparse); } catch (_) { return; }
    const version = model.getVersionId();
    const markers = [];
    try { window.luaparse.parse(model.getValue(), { luaVersion: "5.3", locations: true }); }
    catch (e) {
      if (e && typeof e.line === "number") {
        const lineText = model.getLineContent(Math.min(e.line, model.getLineCount()));
        const word = /^\w+/.exec(lineText.slice(Math.max(0, e.column - 1)))?.[0];
        markers.push({ startLineNumber: e.line, startColumn: Math.max(1, e.column), endLineNumber: e.line, endColumn: Math.max(1, e.column) + Math.max(1, word ? word.length : 1), severity: monaco.MarkerSeverity.Error, message: String(e.message).replace(/^\[\d+:\d+\]\s*/, ""), source: "luaparse" });
      }
    }
    if (!model.isDisposed() && model.getVersionId() === version) monaco.editor.setModelMarkers(model, "luaparse", markers);
  };

  /* ---- SQL ---- */
  L.registerCompletionItemProvider("sql", {
    triggerCharacters: ["."],
    provideCompletionItems(model, position) {
      const w = model.getWordUntilPosition(position);
      const range = new monaco.Range(position.lineNumber, w.startColumn, position.lineNumber, w.endColumn);
      const before = model.getLineContent(position.lineNumber).slice(0, w.startColumn - 1);
      if (/^\s*--/.test(before)) return { suggestions: [] };
      const text = model.getValue();
      const schema = parseSqlSchema(text);
      const aliases = sqlAliases(text, schema);
      const out = [];
      const colItem = (table, c) => ({ label: c.name, kind: K.Field, detail: `${table}.${c.name} ${c.type}`.trim(), insertText: c.name, range, sortText: "1" + c.name });
      const qual = /(\w+)\.\s*$/.exec(before);
      if (qual) {
        const t = schema.has(qual[1]) ? qual[1] : aliases.get(qual[1]);
        if (t) for (const c of schema.get(t)) out.push(colItem(t, c));
        return { suggestions: out };
      }
      const wantTable = /\b(from|join|into|update|table|view|index\s+on)\s+$/i.test(before);
      for (const [t, cols] of schema) out.push({ label: t, kind: K.Class, detail: `table (${cols.length} column${cols.length === 1 ? "" : "s"})`, documentation: md(cols.map((c) => `${c.name} ${c.type}`.trim()).join("\n")), insertText: t, range, sortText: wantTable ? "0" + t : "2" + t });
      if (wantTable) return { suggestions: out };
      for (const [t, cols] of schema) for (const c of cols) out.push(colItem(t, c));
      for (const k of SQL_KEYWORDS) out.push({ label: k, kind: K.Keyword, insertText: k, range, sortText: "5" + k });
      for (const [n, sig, d] of SQL_FUNCS) out.push({ label: n, kind: K.Function, detail: n + sig, documentation: md(n + sig, d), insertText: n + "($0)", insertTextRules: L.CompletionItemInsertTextRule.InsertAsSnippet, range, sortText: "4" + n });
      return { suggestions: out };
    },
  });

  L.registerHoverProvider("sql", {
    provideHover(model, position) {
      const w = model.getWordAtPosition(position);
      if (!w) return null;
      const f = SQL_FUNC_DOC.get(w.word.toLowerCase());
      const after = model.getLineContent(position.lineNumber)[w.endColumn - 1];
      if (f && after === "(") return { contents: [md(w.word.toLowerCase() + f.sig, f.d)] };
      const text = model.getValue();
      const schema = parseSqlSchema(text);
      if (schema.has(w.word)) return { contents: [md("table " + w.word, schema.get(w.word).map((c) => `${c.name} ${c.type}`.trim()).join("\n"))] };
      const alias = sqlAliases(text, schema).get(w.word);
      if (alias) return { contents: [md(`${w.word} (alias of ${alias})`)] };
      for (const [t, cols] of schema) { const c = cols.find((x) => x.name === w.word); if (c) return { contents: [md(`${t}.${c.name} ${c.type}`.trim())] }; }
      if (SQL_KEYWORDS.includes(w.word.toUpperCase())) return { contents: [md(w.word.toUpperCase(), "SQL keyword")] };
      return null;
    },
  });

  /* ---- formatting ---- */
  L.registerDocumentFormattingEditProvider("sql", {
    displayName: "sql-formatter",
    async provideDocumentFormattingEdits(model) {
      try { await loadScript(ctx.libs.sqlformatter); } catch (e) { ctx.toast("Could not load the SQL formatter: " + e.message, "error"); return []; }
      try {
        const text = window.sqlFormatter.format(model.getValue(), { language: "sqlite", tabWidth: ctx.getSettings().tabSize, keywordCase: "upper", dataTypeCase: "upper", linesBetweenQueries: 2 });
        const ed = ctx.minimalEdit(model, text.replace(/\s+$/, "") + "\n");
        return ed ? [ed] : [];
      } catch (e) { ctx.toast("Cannot format: " + String(e.message).split("\n")[0], "error"); return []; }
    },
  });

  let stylua = null;
  const getStylua = () => (stylua ||= (async () => {
    const mod = await import(ctx.libs.stylua + "stylua_lib_web.js");
    await mod.default({ module_or_path: ctx.libs.stylua + "stylua_lib_bg.wasm" });
    return mod;
  })().catch((e) => { stylua = null; throw e; }));
  L.registerDocumentFormattingEditProvider("lua", {
    displayName: "StyLua",
    async provideDocumentFormattingEdits(model) {
      let mod;
      try { mod = await getStylua(); } catch (e) { ctx.toast("Could not load the Lua formatter: " + e.message, "error"); return []; }
      try {
        const cfg = mod.Config.new();
        cfg.indent_type = mod.IndentType.Spaces;
        cfg.indent_width = ctx.getSettings().tabSize;
        cfg.column_width = Math.max(40, ctx.getSettings().lineLength + 12);
        const text = mod.formatCode(model.getValue(), cfg, undefined, mod.OutputVerification.None);
        const ed = ctx.minimalEdit(model, text);
        return ed ? [ed] : [];
      } catch (e) { ctx.toast("Cannot format: " + String(e.message || e).split("\n")[0], "error"); return []; }
    },
  });

  /* ---- attach Lua linting to every Lua model ---- */
  const attach = (model) => {
    if (model.getLanguageId() !== "lua" || luaTimers.has(model)) return;
    luaTimers.set(model, 0);
    const run = () => { clearTimeout(luaTimers.get(model)); luaTimers.set(model, setTimeout(() => lintLua(model), 400)); };
    model.onDidChangeContent(run);
    run();
  };
  monaco.editor.onDidCreateModel(attach);
  monaco.editor.getModels().forEach(attach);

  /* ---- outline ---- */
  const KIND_MAP = { class: "class", interface: "interface", enum: "enum", function: "function", method: "method", constructor: "method", const: "constant", let: "variable", var: "variable", type: "type", module: "class", property: "variable", getter: "method", setter: "method" };

  async function symbols(model) {
    const lang = model.getLanguageId();
    if (lang === "lua") {
      try { await loadScript(ctx.libs.luaparse); } catch (_) { return []; }
      let ast;
      try { ast = window.luaparse.parse(model.getValue(), { luaVersion: "5.3", locations: true }); } catch (_) { return null; } // keep the previous outline while there is a syntax error
      const nameOf = (id) => id ? (id.type === "Identifier" ? id.name : id.type === "MemberExpression" ? `${nameOf(id.base)}${id.indexer}${id.identifier.name}` : "") : "";
      const out = [];
      const walk = (nodes, list, top) => {
        for (const n of nodes || []) {
          const loc = n.loc;
          const span = { line: loc.start.line, col: loc.start.column + 1, endLine: loc.end.line, endCol: loc.end.column + 1 };
          if (n.type === "FunctionDeclaration" && n.identifier) {
            const name = nameOf(n.identifier);
            const item = { name, kind: n.identifier.indexer === ":" ? "method" : "function", detail: "(" + n.parameters.map((p) => (p.type === "VarargLiteral" ? "..." : p.name)).join(", ") + ")", ...span, children: [] };
            list.push(item);
            walk(n.body, item.children, false);
          } else if (n.type === "LocalStatement" && top) {
            n.variables.forEach((v, i) => {
              const init = n.init[i];
              if (init && init.type === "FunctionDeclaration") { const it = { name: v.name, kind: "function", detail: "(" + init.parameters.map((p) => (p.type === "VarargLiteral" ? "..." : p.name)).join(", ") + ")", ...span, children: [] }; list.push(it); walk(init.body, it.children, false); }
              else list.push({ name: v.name, kind: /^[A-Z][A-Z0-9_]*$/.test(v.name) ? "constant" : "variable", detail: "", ...span, children: [] });
            });
          } else if (["IfStatement", "WhileStatement", "ForNumericStatement", "ForGenericStatement", "DoStatement", "RepeatStatement"].includes(n.type)) {
            if (n.clauses) n.clauses.forEach((c) => walk(c.body, list, false)); else walk(n.body, list, false);
          }
        }
      };
      walk(ast.body, out, true);
      return out;
    }
    if (lang === "sql") {
      const out = [];
      model.getLinesContent().forEach((line, i) => {
        const m = /^\s*create\s+(?:temp(?:orary)?\s+)?(?:unique\s+)?(table|view|index|trigger)\s+(?:if\s+not\s+exists\s+)?["`[]?(\w+)/i.exec(line);
        if (m) out.push({ name: m[2], kind: m[1].toLowerCase() === "table" ? "table" : m[1].toLowerCase(), detail: "", line: i + 1, col: 1, endLine: i + 1, endCol: line.length + 1, children: [] });
      });
      return out;
    }
    if (lang === "javascript" || lang === "typescript") {
      const get = lang === "javascript" ? L.typescript.getJavaScriptWorker : L.typescript.getTypeScriptWorker;
      try {
        const client = await withTimeout(get().then((w) => w(model.uri)), 4000);
        const tree = await withTimeout(client.getNavigationTree(model.uri.toString()), 4000);
        const conv = (item) => {
          const s = item.spans[0];
          const a = model.getPositionAt(s.start), b = model.getPositionAt(s.start + s.length);
          const ns = item.nameSpan ? model.getPositionAt(item.nameSpan.start) : a;
          return { name: item.text, kind: KIND_MAP[item.kind] || "variable", detail: "", line: ns.lineNumber, col: ns.column, endLine: b.lineNumber, endCol: b.column, children: (item.childItems || []).filter((c) => !/^</.test(c.text) && c.kind !== "property" || c.kind === "property").map(conv) };
        };
        return (tree.childItems || []).filter((c) => !/^["']use /.test(c.text)).map(conv);
      } catch (_) { return null; }
    }
    return [];
  }

  return { symbols };
}
