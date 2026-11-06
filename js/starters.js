// The text a new project starts with, one per language. "@@" marks where the cursor goes.
// Compiled languages follow the usual new-project template of their tooling (C# is the current .NET console template).
const L = (...lines) => lines.join("\n") + "\n";

export const STARTERS = {
  python: L(
    "def main():",
    '    print("Hello, world!")',
    "    @@",
    "",
    "",
    'if __name__ == "__main__":',
    "    main()",
  ),
  javascript: L('console.log("Hello, world!");', "@@"),
  typescript: L('const greeting: string = "Hello, world!";', "console.log(greeting);", "@@"),
  lua: L('print("Hello, world!")', "@@"),
  sql: L("-- A fresh in-memory SQLite database is created every time you run this file.", "SELECT 'Hello, world!' AS greeting;", "", "@@"),
  csharp: L('Console.WriteLine("Hello, world!");', "@@"),
  java: L(
    "public class Main {",
    "    public static void main(String[] args) {",
    '        System.out.println("Hello, world!");',
    "        @@",
    "    }",
    "}",
  ),
  c: L(
    "#include <stdio.h>",
    "",
    "int main(void) {",
    '    printf("Hello, world!\\n");',
    "    @@",
    "    return 0;",
    "}",
  ),
  cpp: L(
    "#include <iostream>",
    "",
    "int main() {",
    '    std::cout << "Hello, world!" << std::endl;',
    "    @@",
    "    return 0;",
    "}",
  ),
  go: L(
    "package main",
    "",
    'import "fmt"',
    "",
    "func main() {",
    '\tfmt.Println("Hello, world!")',
    "\t@@",
    "}",
  ),
  rust: L("fn main() {", '    println!("Hello, world!");', "    @@", "}"),
  kotlin: L("fun main() {", '    println("Hello, world!")', "    @@", "}"),
  swift: L('print("Hello, world!")', "@@"),
  php: L("<?php", "", 'echo "Hello, world!\\n";', "@@"),
  ruby: L('puts "Hello, world!"', "@@"),
};

/** The starter for a language, with the cursor marker removed: { text, line, column } (1-based). */
export function starterFor(id) {
  const raw = STARTERS[id];
  if (raw == null) return { text: "", line: 1, column: 1 };
  const idx = raw.indexOf("@@");
  if (idx < 0) return { text: raw, line: raw.split("\n").length, column: 1 };
  const before = raw.slice(0, idx);
  const line = before.split("\n").length;
  const column = before.length - before.lastIndexOf("\n");
  return { text: raw.slice(0, idx) + raw.slice(idx + 2), line, column };
}
