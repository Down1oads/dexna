// The preset a new project starts with, one per language. Where Visual Studio has a template
// (C#, Visual Basic, F#, C++, and JavaScript/TypeScript Node.js apps) it is used as-is; the web page uses
// VS Code's "!" boilerplate; other languages use the standard new-project template of their usual tools. "@@" marks where the cursor goes.
// Every starter compiles and runs as-is.
const L = (...lines) => lines.join("\n") + "\n";

export const STARTERS = {
  // ---------------- run on your device ----------------
  python: L(
    "def main():",
    '    print("Hello, world!")',
    "    @@",
    "",
    "",
    'if __name__ == "__main__":',
    "    main()",
  ),
  javascript: L("console.log('Hello world');", "@@"), // Visual Studio: Node.js Console App
  typescript: L("console.log('Hello world');", "@@"), // Visual Studio: TypeScript Node.js Console App
  lua: L('print("Hello, world!")', "@@"),
  sql: L("-- A fresh in-memory SQLite database is created every time you run this file.", "SELECT 'Hello, world!' AS greeting;", "", "@@"),
  // Web page: VS Code's "!" (Emmet) HTML boilerplate, linked to a style sheet and a script
  web: L(
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '    <meta charset="UTF-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    "    <title>Document</title>",
    '    <link rel="stylesheet" href="style.css">',
    "</head>",
    "<body>",
    "    @@",
    '    <script src="script.js"></script>',
    "</body>",
    "</html>",
  ),

  // ---------------- online ----------------
  csharp: L( // Visual Studio: C# Console App (.NET Framework)
    "using System;",
    "using System.Collections.Generic;",
    "using System.Linq;",
    "using System.Text;",
    "using System.Threading.Tasks;",
    "",
    "namespace ConsoleApp1",
    "{",
    "    internal class Program",
    "    {",
    "        static void Main(string[] args)",
    "        {",
    "            @@",
    "        }",
    "    }",
    "}",
  ),
  java: L( // Visual Studio Code: Java project
    "public class Main {",
    "    public static void main(String[] args) throws Exception {",
    '        System.out.println("Hello, World!");',
    "        @@",
    "    }",
    "}",
  ),
  c: L( // Visual Studio style (the C++ Console App template, in C)
    "// main.c : This file contains the 'main' function. Program execution begins and ends there.",
    "//",
    "",
    "#include <stdio.h>",
    "",
    "int main()",
    "{",
    '    printf("Hello World!\\n");',
    "    @@",
    "}",
  ),
  cpp: L( // Visual Studio: C++ Console App
    "// main.cpp : This file contains the 'main' function. Program execution begins and ends there.",
    "//",
    "",
    "#include <iostream>",
    "",
    "int main()",
    "{",
    '    std::cout << "Hello World!\\n";',
    "    @@",
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
  perl: L("use strict;", "use warnings;", "", 'print "Hello, world!\\n";', "@@"),
  dart: L("void main() {", "  print('Hello, world!');", "  @@", "}"),
  scala: L(
    "object Main {",
    "  def main(args: Array[String]): Unit = {",
    '    println("Hello, world!")',
    "    @@",
    "  }",
    "}",
  ),
  r: L('cat("Hello, world!\\n")', "@@"),
  haskell: L("main :: IO ()", "main = do", '  putStrLn "Hello, world!"', "  @@"),
  elixir: L('IO.puts("Hello, world!")', "@@"),
  pascal: L("program Main;", "", "begin", "  writeln('Hello, world!');", "  @@", "end."),
  fortran: L("program main", "  implicit none", '  print *, "Hello, world!"', "  @@", "end program main"),
  groovy: L('println "Hello, world!"', "@@"),
  clojure: L('(println "Hello, world!")', "@@"),
  ocaml: L('let () = print_endline "Hello, world!"', "@@"),
  fsharp: L("// For more information see https://aka.ms/fsharp-console-apps", 'printfn "Hello from F#"', "@@"), // Visual Studio: F# Console App
  vb: L( // Visual Studio: Visual Basic Console App (.NET Framework)
    "Module Module1",
    "",
    "    Sub Main()",
    "        @@",
    "    End Sub",
    "",
    "End Module",
  ),
  objc: L(
    "#import <Foundation/Foundation.h>",
    "",
    "int main(int argc, const char *argv[]) {",
    "    @autoreleasepool {",
    '        printf("Hello, world!\\n");',
    "        @@",
    "    }",
    "    return 0;",
    "}",
  ),
  d: L("import std.stdio;", "", "void main() {", '    writeln("Hello, world!");', "    @@", "}"),
  erlang: L("-module(main).", "-export([main/1]).", "", "main(_Args) ->", '    io:fwrite("Hello, world!~n"),', "    @@", "    ok."),
  lisp: L('(format t "Hello, world!~%")', "@@"),
  prolog: L(":- initialization(main).", "", "main :-", "    write('Hello, world!'), nl,", "    @@", "    halt."),
  cobol: L(
    "       IDENTIFICATION DIVISION.",
    "       PROGRAM-ID. HELLO.",
    "       PROCEDURE DIVISION.",
    '           DISPLAY "Hello, world!".',
    "           @@",
    "           STOP RUN.",
  ),
  bash: L("#!/bin/bash", "", 'echo "Hello, world!"', "@@"),
  julia: L('println("Hello, world!")', "@@"),
  zig: L( // zig init
    'const std = @import("std");',
    "",
    "pub fn main() !void {",
    "    const stdout = std.io.getStdOut().writer();",
    '    try stdout.print("Hello, world!\\n", .{});',
    "    @@",
    "}",
  ),
  nim: L('echo "Hello, world!"', "@@"),
  crystal: L('puts "Hello, world!"', "@@"),
  ada: L( // GNAT Studio / Alire: a main procedure
    "with Ada.Text_IO; use Ada.Text_IO;",
    "",
    "procedure Main is",
    "begin",
    '   Put_Line ("Hello, world!");',
    "   @@",
    "end Main;",
  ),
  odin: L("package main", "", 'import "core:fmt"', "", "main :: proc() {", '\tfmt.println("Hello, world!")', "\t@@", "}"),
  raku: L("say 'Hello, world!';", "@@"),
  vala: L("void main () {", '    print ("Hello, world!\\n");', "    @@", "}"),
  mojo: L("def main():", '    print("Hello, world!")', "    @@"),
  modula2: L(
    "MODULE Main;",
    "",
    "FROM StrIO IMPORT WriteString, WriteLn;",
    "",
    "BEGIN",
    '   WriteString ("Hello, world!");',
    "   WriteLn;",
    "   @@",
    "END Main.",
  ),
  basic: L('Print "Hello, world!"', "@@"),
  octave: L("disp('Hello, world!')", "@@"),
  asm: L(
    "section .data",
    '    msg db "Hello, world!", 10',
    "    len equ $ - msg",
    "",
    "section .text",
    "    global _start",
    "",
    "_start:",
    "    mov rax, 1          ; write(stdout, msg, len)",
    "    mov rdi, 1",
    "    mov rsi, msg",
    "    mov rdx, len",
    "    syscall",
    "    @@",
    "    mov rax, 60         ; exit(0)",
    "    xor rdi, rdi",
    "    syscall",
  ),
};

/** Extra files some presets come with (the web page's style sheet and script). */
export const STARTER_FILES = {
  web: { "style.css": "", "script.js": "" },
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
