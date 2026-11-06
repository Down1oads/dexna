// Editor support for the languages Monaco does not cover well on its own: syntax colors, comment
// toggling (Ctrl+/), bracket matching, keyword completion and snippets.
//
// A language either gets a small generated tokenizer (`mode`) or borrows the tokenizer of a close
// relative that ships with Monaco (`borrow`, e.g. Crystal uses Ruby's). Languages Monaco already
// colors (Perl, Dart, Scala, ...) only get completion and snippets here.

const S = (label, detail, body) => ({ label, detail, body });
const words = (s) => (s || "").split(/\s+/).filter(Boolean);

/* ------------------------------------------------------------------ */
/* Language definitions                                                */
/* ------------------------------------------------------------------ */
export const MODES = {
  haskell: {
    mode: { line: "--", block: ["{-", "-}"], upperIsType: true, chars: true },
    keywords: "case class data default deriving do else foreign if import in infix infixl infixr instance let module newtype of then type where qualified as hiding forall",
    types: "Int Integer Float Double Bool Char String IO Maybe Either Just Nothing Left Right True False",
    builtins: "putStrLn putStr print show read getLine getContents interact map filter foldr foldl sum product length head tail take drop zip reverse concat concatMap return mapM_ forM_ lines words unwords unlines elem maximum minimum fst snd replicate",
    snippets: [
      S("main", "main :: IO ()", "main :: IO ()\nmain = do\n\t${0}"),
      S("fn", "function with type", "${1:name} :: ${2:Int} -> ${3:Int}\n${1:name} ${4:x} = ${0:x}"),
      S("if", "if / then / else", "if ${1:condition}\n\tthen ${2}\n\telse ${0}"),
      S("case", "case expression", "case ${1:value} of\n\t${2:pattern} -> ${3}\n\t_ -> ${0}"),
      S("data", "data type", "data ${1:Name} = ${2:Con} ${3:Int}\n\tderiving (Show, Eq)"),
      S("where", "where clause", "where\n\t${1:name} = ${0}"),
      S("let", "let in do", "let ${1:name} = ${0}"),
      S("comp", "list comprehension", "[${1:x} | ${2:x} <- ${3:xs}${4:, ${5:condition}}]"),
    ],
  },
  fortran: {
    mode: { line: "!", ignoreCase: true, strings: ['"', "'"] },
    keywords: "program end module use implicit none integer real double precision complex logical character parameter dimension allocatable intent in out inout function subroutine call return if then else elseif endif do enddo while select case default exit cycle contains print write read open close format type interface stop allocate deallocate result recursive pure elemental only public private save data",
    builtins: "size sum product abs sqrt sin cos tan exp log mod max min len trim adjustl adjustr int nint real dble huge tiny maxval minval allocated present",
    snippets: [
      S("program", "program", "program ${1:main}\n\timplicit none\n\t${0}\nend program ${1:main}"),
      S("do", "do loop", "do ${1:i} = ${2:1}, ${3:n}\n\t${0}\nend do"),
      S("dowhile", "do while", "do while (${1:condition})\n\t${0}\nend do"),
      S("if", "if / then", "if (${1:condition}) then\n\t${0}\nend if"),
      S("ifelse", "if / else", "if (${1:condition}) then\n\t${2}\nelse\n\t${0}\nend if"),
      S("function", "function", "function ${1:name}(${2:x}) result(${3:r})\n\t${4:real}, intent(in) :: ${2:x}\n\t${4:real} :: ${3:r}\n\t${0}\nend function ${1:name}"),
      S("subroutine", "subroutine", "subroutine ${1:name}(${2:x})\n\t${0}\nend subroutine ${1:name}"),
      S("print", "print *", "print *, ${0}"),
    ],
  },
  groovy: {
    borrow: "java",
    keywords: "def class interface enum trait extends implements import package return if else for while switch case default break continue try catch finally throw new in as instanceof true false null static final private public protected void",
    builtins: "println print each eachWithIndex collect findAll find inject sum size times upto",
    snippets: [
      S("println", "println", "println ${0}"),
      S("def", "method", "def ${1:name}(${2:args}) {\n\t${0}\n}"),
      S("class", "class", "class ${1:Name} {\n\t${0}\n}"),
      S("each", "each closure", "${1:list}.each { ${2:it} ->\n\t${0}\n}"),
      S("for", "for in", "for (${1:item} in ${2:items}) {\n\t${0}\n}"),
      S("if", "if", "if (${1:condition}) {\n\t${0}\n}"),
    ],
  },
  ocaml: {
    mode: { block: ["(*", "*)"], nest: true, upperIsType: true },
    keywords: "let rec in and match with function fun if then else begin end type of module struct sig open include val mutable when as try raise exception external for to downto do done while assert lazy object method new class inherit",
    types: "int float string bool char unit list array option ref",
    builtins: "print_endline print_string print_int print_float print_newline printf read_line string_of_int int_of_string string_of_float float_of_int List Array String Printf",
    snippets: [
      S("let", "let binding", "let ${1:name} = ${0}"),
      S("fn", "function", "let ${1:name} ${2:x} =\n\t${0}"),
      S("rec", "recursive function", "let rec ${1:name} ${2:x} =\n\t${0}"),
      S("main", "let () =", "let () =\n\t${0}"),
      S("match", "match", "match ${1:value} with\n| ${2:pattern} -> ${3}\n| _ -> ${0}"),
      S("if", "if / then / else", "if ${1:condition} then ${2} else ${0}"),
      S("for", "for loop", "for ${1:i} = ${2:0} to ${3:n} do\n\t${0}\ndone"),
      S("printf", "Printf.printf", 'Printf.printf "${1:%d}\\n" ${0}'),
    ],
  },
  dlang: {
    mode: { line: "//", block: ["/*", "*/"], strings: ['"', "`"], chars: true },
    keywords: "abstract alias align asm assert auto break case cast catch class const continue debug default delegate deprecated do else enum export extern false final finally for foreach foreach_reverse function goto if immutable import in inout interface invariant is lazy mixin module new nothrow null out override package pragma private protected public pure ref return scope shared static struct super switch synchronized template this throw true try typeid typeof union unittest version while with",
    types: "bool byte ubyte short ushort int uint long ulong float double real char wchar dchar string void size_t",
    builtins: "writeln writefln write readln to format std stdio",
    snippets: [
      S("main", "main", "void main() {\n\t${0}\n}"),
      S("writeln", "writeln", "writeln(${0});"),
      S("foreach", "foreach", "foreach (${1:item}; ${2:items}) {\n\t${0}\n}"),
      S("for", "for loop", "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${0}\n}"),
      S("if", "if", "if (${1:condition}) {\n\t${0}\n}"),
      S("struct", "struct", "struct ${1:Name} {\n\t${0}\n}"),
      S("class", "class", "class ${1:Name} {\n\t${0}\n}"),
    ],
  },
  erlang: {
    mode: { line: "%", upperIsVariable: true, atomQuote: true, directives: /-[a-z_]+/ },
    keywords: "after and andalso band begin bnot bor bsl bsr bxor case catch cond div end fun if let not of or orelse receive rem try when xor",
    builtins: "io format fwrite lists map filter foldl foldr seq length hd tl spawn self element setelement ok error true false",
    snippets: [
      S("module", "module header", "-module(${1:main}).\n-export([${2:main/1}]).\n${0}"),
      S("fn", "function", "${1:name}(${2:Args}) ->\n\t${0:ok}."),
      S("case", "case", "case ${1:Expr} of\n\t${2:Pattern} ->\n\t\t${3:ok};\n\t_ ->\n\t\t${0:ok}\nend"),
      S("if", "if", "if\n\t${1:Guard} ->\n\t\t${2:ok};\n\ttrue ->\n\t\t${0:ok}\nend"),
      S("receive", "receive", "receive\n\t${1:Msg} ->\n\t\t${0:ok}\nend"),
      S("fwrite", "io:fwrite", 'io:fwrite("${1:~p~n}", [${0}]),'),
    ],
  },
  commonlisp: {
    mode: { line: ";", block: ["#|", "|#"], lisp: true },
    keywords: "defun defvar defparameter defconstant defmacro let let* lambda if when unless cond case loop do dolist dotimes progn setf setq return return-from format defstruct defclass defmethod defgeneric quote function and or not t nil labels flet multiple-value-bind handler-case",
    builtins: "car cdr cons list append length reverse mapcar reduce remove-if remove-if-not member assoc nth first rest print princ terpri read-line parse-integer write-line concatenate string= equal eq eql",
    snippets: [
      S("defun", "defun", "(defun ${1:name} (${2:args})\n\t${0})"),
      S("let", "let", "(let ((${1:x} ${2:0}))\n\t${0})"),
      S("if", "if", "(if ${1:condition}\n\t${2:then}\n\t${0:else})"),
      S("cond", "cond", "(cond ((${1:test}) ${2})\n\t(t ${0}))"),
      S("dolist", "dolist", "(dolist (${1:x} ${2:list})\n\t${0})"),
      S("dotimes", "dotimes", "(dotimes (${1:i} ${2:10})\n\t${0})"),
      S("format", "format t", '(format t "${1:~a~%}" ${0})'),
    ],
  },
  prolog: {
    mode: { line: "%", block: ["/*", "*/"], upperIsVariable: true, strings: ['"'], atomQuote: true },
    keywords: "is mod rem not halt initialization dynamic discontiguous module use_module",
    builtins: "write writeln print nl read format atom number var nonvar findall bagof setof assert asserta assertz retract length append member reverse nth0 nth1 msort sort between succ plus atom_codes atom_length atom_chars number_codes",
    snippets: [
      S("main", "main with initialization", ":- initialization(main).\n\nmain :-\n\t${0},\n\thalt."),
      S("rule", "rule", "${1:head}(${2:X}) :-\n\t${0}."),
      S("fact", "fact", "${1:name}(${0:value})."),
      S("write", "write and newline", "write(${0}), nl"),
      S("format", "format", "format(\"${1:~w~n}\", [${0}])"),
    ],
  },
  cobol: {
    mode: { line: "*>", ignoreCase: true, strings: ['"', "'"], ident: /[A-Za-z][\w-]*/, fixedComment: true },
    keywords: "IDENTIFICATION ENVIRONMENT DATA PROCEDURE DIVISION SECTION PROGRAM-ID WORKING-STORAGE LOCAL-STORAGE FILE-CONTROL CONFIGURATION DISPLAY ACCEPT MOVE TO ADD SUBTRACT MULTIPLY DIVIDE COMPUTE GIVING IF ELSE END-IF PERFORM UNTIL VARYING FROM BY TIMES END-PERFORM STOP RUN PIC PICTURE VALUE EVALUATE WHEN OTHER END-EVALUATE STRING DELIMITED INTO END-STRING NOT AND OR GOBACK EXIT INITIALIZE OCCURS REDEFINES",
    snippets: [
      S("program", "program skeleton", "       IDENTIFICATION DIVISION.\n       PROGRAM-ID. ${1:HELLO}.\n       DATA DIVISION.\n       WORKING-STORAGE SECTION.\n       PROCEDURE DIVISION.\n           ${0}\n           STOP RUN."),
      S("display", "DISPLAY", 'DISPLAY "${0}"'),
      S("perform", "PERFORM VARYING", "PERFORM VARYING ${1:I} FROM 1 BY 1 UNTIL ${1:I} > ${2:10}\n    ${0}\nEND-PERFORM"),
      S("if", "IF", "IF ${1:condition}\n    ${0}\nEND-IF"),
      S("pic", "data item", "01 ${1:NAME} PIC ${2:9(4)} VALUE ${0:0}."),
    ],
  },
  nasm: {
    mode: { line: ";", ignoreCase: true, strings: ['"', "'", "`"], labels: true, ident: /[A-Za-z_.$][\w.$]*/ },
    keywords: "mov movzx movsx add sub mul imul div idiv inc dec neg push pop call ret jmp je jne jz jnz jg jge jl jle ja jae jb jbe cmp test and or xor not shl shr sar lea syscall int nop loop cqo cdq xchg",
    types: "section segment global extern db dw dd dq resb resw resd resq equ times bits default rel byte word dword qword",
    builtins: "rax rbx rcx rdx rsi rdi rbp rsp r8 r9 r10 r11 r12 r13 r14 r15 eax ebx ecx edx esi edi ebp esp ax bx cx dx al bl cl dl ah bh ch dh",
    snippets: [
      S("exit", "exit(code) syscall", "mov rax, 60\nmov rdi, ${1:0}\nsyscall"),
      S("write", "write(stdout) syscall", "mov rax, 1\nmov rdi, 1\nmov rsi, ${1:msg}\nmov rdx, ${2:len}\nsyscall"),
      S("data", "string constant", '${1:msg} db "${2:Hello}", 10\n${3:len} equ $ - ${1:msg}'),
      S("loop", "counted loop", "mov rcx, ${1:10}\n.${2:loop}:\n\t${0}\n\tloop .${2:loop}"),
    ],
  },
  zig: {
    mode: { line: "//", strings: ['"'], chars: true, at: true },
    keywords: "const var fn pub return if else while for switch break continue defer errdefer try catch orelse struct enum union error test comptime inline export extern packed align unreachable undefined null true false and or usingnamespace threadlocal noreturn anytype",
    types: "u8 u16 u32 u64 u128 usize i8 i16 i32 i64 i128 isize f16 f32 f64 bool void type anyerror comptime_int comptime_float",
    builtins: "std debug print io heap mem fmt ArrayList allocator",
    snippets: [
      S("main", "main", "pub fn main() !void {\n\t${0}\n}"),
      S("print", "std.debug.print", 'std.debug.print("${1:{}}\\n", .{${0}});'),
      S("fn", "function", "fn ${1:name}(${2:x}: ${3:i32}) ${4:i32} {\n\t${0}\n}"),
      S("for", "for loop", "for (${1:items}) |${2:item}| {\n\t${0}\n}"),
      S("while", "while loop", "while (${1:condition}) {\n\t${0}\n}"),
      S("if", "if", "if (${1:condition}) {\n\t${0}\n}"),
      S("struct", "struct", "const ${1:Name} = struct {\n\t${0}\n};"),
      S("test", "test block", 'test "${1:name}" {\n\t${0}\n}'),
    ],
  },
  nim: {
    mode: { line: "#", block: ["#[", "]#"], strings: ['"'], chars: true },
    keywords: "addr and as asm bind block break case cast concept const continue converter defer discard distinct div do elif else end enum except export finally for from func if import in include interface is isnot iterator let macro method mixin mod nil not notin object of or out proc ptr raise ref return shl shr static template try tuple type using var when while xor yield true false",
    types: "int int8 int16 int32 int64 uint float float32 float64 string bool char seq array set Table",
    builtins: "echo len add readLine stdin stdout write writeLine parseInt toUpperAscii split strip join items pairs high low inc dec",
    snippets: [
      S("proc", "procedure", "proc ${1:name}(${2:x}: ${3:int}): ${4:int} =\n\t${0}"),
      S("for", "for loop", "for ${1:i} in ${2:0 ..< 10}:\n\t${0}"),
      S("if", "if", "if ${1:condition}:\n\t${0}"),
      S("while", "while", "while ${1:condition}:\n\t${0}"),
      S("type", "object type", "type\n\t${1:Name} = object\n\t\t${0}"),
      S("echo", "echo", "echo ${0}"),
    ],
  },
  crystal: {
    borrow: "ruby",
    keywords: "def end class module struct if elsif else unless while until case when then do return yield begin rescue ensure raise require include extend property getter setter private protected abstract alias self nil true false",
    builtins: "puts print p gets each map select reduce times upto to_s to_i size",
    snippets: [
      S("def", "method", "def ${1:name}(${2:x})\n\t${0}\nend"),
      S("class", "class", "class ${1:Name}\n\tdef initialize(${2:@name : String})\n\tend\n\t${0}\nend"),
      S("each", "each block", "${1:items}.each do |${2:item}|\n\t${0}\nend"),
      S("if", "if", "if ${1:condition}\n\t${0}\nend"),
      S("puts", "puts", "puts ${0}"),
    ],
  },
  ada: {
    mode: { line: "--", ignoreCase: true, strings: ['"'] },
    keywords: "abort abs abstract accept access aliased all and array at begin body case constant declare delay delta digits do else elsif end entry exception exit for function generic goto if in interface is limited loop mod new not null of or others out overriding package pragma private procedure protected raise range record rem renames requeue return reverse select separate some subtype synchronized tagged task terminate then type until use when while with xor",
    types: "Integer Float Boolean Character String Natural Positive Long_Integer Duration",
    builtins: "Put_Line Put Get_Line Get New_Line Ada Text_IO Integer_Text_IO Float_Text_IO Image Value Length First Last",
    snippets: [
      S("procedure", "main procedure", "with Ada.Text_IO; use Ada.Text_IO;\n\nprocedure ${1:Main} is\nbegin\n\t${0}\nend ${1:Main};"),
      S("put", "Put_Line", 'Put_Line (${0:"text"});'),
      S("for", "for loop", "for ${1:I} in ${2:1} .. ${3:10} loop\n\t${0}\nend loop;"),
      S("while", "while loop", "while ${1:condition} loop\n\t${0}\nend loop;"),
      S("if", "if", "if ${1:condition} then\n\t${0}\nend if;"),
      S("function", "function", "function ${1:Name} (${2:X} : ${3:Integer}) return ${4:Integer} is\nbegin\n\treturn ${0:X};\nend ${1:Name};"),
      S("declare", "declare block", "declare\n\t${1:X} : ${2:Integer} := ${3:0};\nbegin\n\t${0}\nend;"),
    ],
  },
  odin: {
    mode: { line: "//", block: ["/*", "*/"], nest: true, strings: ['"', "`"], chars: true, hash: true },
    keywords: "package import proc struct enum union map dynamic distinct using if else when for in not_in switch case break continue fallthrough defer return or_return or_else nil true false cast transmute auto_cast context foreign bit_set matrix where",
    types: "int uint i8 i16 i32 i64 u8 u16 u32 u64 f16 f32 f64 bool b8 string cstring rune rawptr any typeid uintptr",
    builtins: "fmt println printf print len cap append make delete new free core os strings",
    snippets: [
      S("main", "main", "main :: proc() {\n\t${0}\n}"),
      S("proc", "procedure", "${1:name} :: proc(${2:x}: ${3:int}) -> ${4:int} {\n\t${0}\n}"),
      S("println", "fmt.println", "fmt.println(${0})"),
      S("for", "for range", "for ${1:i} in ${2:0..<10} {\n\t${0}\n}"),
      S("if", "if", "if ${1:condition} {\n\t${0}\n}"),
      S("struct", "struct", "${1:Name} :: struct {\n\t${0}\n}"),
    ],
  },
  raku: {
    borrow: "perl",
    keywords: "my our has sub method class role grammar token rule if elsif else unless for while until loop given when default return say print put die try CATCH use is does",
    builtins: "say print put prompt get lines words split join map grep sort elems push pop shift unshift",
    snippets: [
      S("sub", "sub", "sub ${1:name}(${2:\\$x}) {\n\t${0}\n}"),
      S("for", "for loop", "for ${1:@items} -> ${2:\\$item} {\n\t${0}\n}"),
      S("if", "if", "if ${1:condition} {\n\t${0}\n}"),
      S("class", "class", "class ${1:Name} {\n\thas ${2:\\$.name};\n\t${0}\n}"),
      S("say", "say", "say ${0};"),
    ],
  },
  vala: {
    borrow: "csharp",
    keywords: "using namespace class interface struct enum public private protected internal static abstract virtual override async yield new this base return if else for foreach while do switch case default break continue try catch finally throw var void owned unowned weak signal delegate construct get set null true false",
    types: "int uint long ulong double float bool char string unichar size_t",
    builtins: "print stdout stdin printf read_line GLib",
    snippets: [
      S("main", "main", "void main () {\n\t${0}\n}"),
      S("print", "print", 'print ("${1:%s}\\n", ${0});'),
      S("class", "class", "public class ${1:Name} : Object {\n\t${0}\n}"),
      S("foreach", "foreach", "foreach (${1:var} ${2:item} in ${3:items}) {\n\t${0}\n}"),
      S("if", "if", "if (${1:condition}) {\n\t${0}\n}"),
    ],
  },
  mojo: {
    borrow: "python",
    keywords: "def fn struct trait var let alias inout owned borrowed ref read mut out if elif else for while return raise try except finally with import from as in not and or pass break continue True False None",
    types: "Int Int8 Int16 Int32 Int64 UInt8 Float32 Float64 Bool String List Dict SIMD",
    builtins: "print len range input",
    snippets: [
      S("main", "main", "def main():\n\t${0}"),
      S("fn", "function", "fn ${1:name}(${2:x}: ${3:Int}) -> ${4:Int}:\n\t${0:return x}"),
      S("struct", "struct", "struct ${1:Name}:\n\tvar ${2:value}: ${3:Int}\n\n\tfn __init__(out self, ${2:value}: ${3:Int}):\n\t\tself.${2:value} = ${2:value}"),
      S("for", "for loop", "for ${1:i} in range(${2:10}):\n\t${0}"),
      S("if", "if", "if ${1:condition}:\n\t${0}"),
    ],
  },
  modula2: {
    borrow: "m3",
    keywords: "MODULE BEGIN END FROM IMPORT EXPORT VAR CONST TYPE PROCEDURE IF THEN ELSIF ELSE WHILE DO FOR TO BY REPEAT UNTIL LOOP EXIT RETURN CASE OF WITH RECORD ARRAY POINTER SET DEFINITION IMPLEMENTATION AND OR NOT DIV MOD",
    types: "INTEGER CARDINAL REAL LONGREAL BOOLEAN CHAR BITSET",
    builtins: "WriteString WriteLn WriteInt WriteCard ReadString ReadInt StrIO NumberIO InOut INC DEC ABS",
    snippets: [
      S("module", "program module", "MODULE ${1:Main};\n\nFROM StrIO IMPORT WriteString, WriteLn;\n\nBEGIN\n\t${0}\nEND ${1:Main}."),
      S("write", "WriteString and WriteLn", 'WriteString ("${0}"); WriteLn;'),
      S("for", "FOR loop", "FOR ${1:i} := ${2:1} TO ${3:10} DO\n\t${0}\nEND;"),
      S("while", "WHILE loop", "WHILE ${1:condition} DO\n\t${0}\nEND;"),
      S("if", "IF", "IF ${1:condition} THEN\n\t${0}\nEND;"),
      S("procedure", "PROCEDURE", "PROCEDURE ${1:Name} (${2:x}: INTEGER);\nBEGIN\n\t${0}\nEND ${1:Name};"),
    ],
  },
  freebasic: {
    borrow: "vb",
    keywords: "Dim As Integer Long Single Double String Boolean If Then ElseIf Else End For To Step Next Do Loop While Wend Until Select Case Function Sub Return Exit Print Input Sleep Const Type Shared Declare And Or Not Mod",
    builtins: "Print Input Len Str Val Mid Left Right UCase LCase Chr Asc Int Abs Sqr Rnd Randomize Timer Color Locate Cls",
    snippets: [
      S("print", "Print", 'Print "${0}"'),
      S("dim", "Dim variable", "Dim ${1:name} As ${2:Integer} = ${0:0}"),
      S("for", "For loop", "For ${1:i} As Integer = ${2:1} To ${3:10}\n\t${0}\nNext"),
      S("if", "If", "If ${1:condition} Then\n\t${0}\nEnd If"),
      S("while", "While loop", "While ${1:condition}\n\t${0}\nWend"),
      S("function", "Function", "Function ${1:Name}(ByVal ${2:x} As Integer) As Integer\n\tReturn ${0:x}\nEnd Function"),
      S("sub", "Sub", "Sub ${1:Name}()\n\t${0}\nEnd Sub"),
    ],
  },
  octave: {
    mode: { line: "%", line2: "#", block: ["%{", "%}"], strings: ['"', "'"] },
    keywords: "function end endfunction if elseif else endif for endfor while endwhile do until switch case otherwise endswitch return break continue try catch end_try_catch unwind_protect global persistent",
    builtins: "disp printf fprintf sprintf zeros ones eye rand size length numel sum prod mean max min abs sqrt floor ceil round mod plot input num2str str2num linspace find any all isempty strcat strsplit cellfun",
    snippets: [
      S("function", "function", "function ${1:result} = ${2:name}(${3:x})\n\t${0}\nend"),
      S("for", "for loop", "for ${1:i} = ${2:1}:${3:10}\n\t${0}\nend"),
      S("while", "while loop", "while ${1:condition}\n\t${0}\nend"),
      S("if", "if", "if ${1:condition}\n\t${0}\nend"),
      S("printf", "printf", 'printf("${1:%d}\\n", ${0});'),
      S("disp", "disp", "disp(${0})"),
    ],
  },
  // Monaco colors these already: completion and snippets only
  julia: {
    keywords: "function end if elseif else for while in return break continue let local global const struct mutable abstract type module using import export begin do try catch finally macro quote true false nothing",
    builtins: "println print readline parse length push! pop! map filter reduce sum collect range zeros ones string typeof",
    snippets: [
      S("function", "function", "function ${1:name}(${2:x})\n\t${0}\nend"),
      S("for", "for loop", "for ${1:i} in ${2:1:10}\n\t${0}\nend"),
      S("if", "if", "if ${1:condition}\n\t${0}\nend"),
      S("struct", "struct", "struct ${1:Name}\n\t${2:field}::${3:Int}\nend"),
      S("println", "println", "println(${0})"),
    ],
  },
  perl: {
    keywords: "my our local sub if elsif else unless while until for foreach last next redo return use require package print say die warn eval do",
    builtins: "print printf say chomp chop split join push pop shift unshift keys values each scalar length substr index sprintf sort reverse map grep open close",
    snippets: [
      S("sub", "sub", "sub ${1:name} {\n\tmy (${2:\\$arg}) = @_;\n\t${0}\n}"),
      S("foreach", "foreach", "foreach my ${1:\\$item} (${2:@items}) {\n\t${0}\n}"),
      S("if", "if", "if (${1:condition}) {\n\t${0}\n}"),
      S("print", "print with newline", 'print "${0}\\n";'),
    ],
  },
  dart: {
    keywords: "void var final const if else for while do switch case default break continue return class extends implements with abstract new this super import async await try catch finally throw null true false late required",
    builtins: "print stdin readLineSync List Map Set String int double bool",
    snippets: [
      S("main", "main", "void main() {\n\t${0}\n}"),
      S("print", "print", "print(${0});"),
      S("for", "for loop", "for (var ${1:i} = 0; ${1:i} < ${2:10}; ${1:i}++) {\n\t${0}\n}"),
      S("forin", "for in", "for (final ${1:item} in ${2:items}) {\n\t${0}\n}"),
      S("class", "class", "class ${1:Name} {\n\t${0}\n}"),
      S("fn", "function", "${1:void} ${2:name}(${3}) {\n\t${0}\n}"),
    ],
  },
  scala: {
    keywords: "object class trait case def val var if else match for while yield return import extends with new this null true false given using enum then do",
    builtins: "println print StdIn readLine List Map Set Seq Vector Option Some None",
    snippets: [
      S("main", "main object", "object ${1:Main} {\n\tdef main(args: Array[String]): Unit = {\n\t\t${0}\n\t}\n}"),
      S("def", "method", "def ${1:name}(${2:x}: ${3:Int}): ${4:Int} = ${0}"),
      S("println", "println", "println(${0})"),
      S("match", "match", "${1:value} match {\n\tcase ${2:x} => ${3}\n\tcase _ => ${0}\n}"),
      S("for", "for", "for (${1:i} <- ${2:0 until 10}) {\n\t${0}\n}"),
      S("case", "case class", "case class ${1:Name}(${2:value}: ${3:Int})"),
    ],
  },
  r: {
    keywords: "function if else for while repeat break next return in TRUE FALSE NULL NA library",
    builtins: "print cat paste paste0 c list vector data.frame length sum mean median sd max min seq rep apply sapply lapply readLines nchar toupper sprintf",
    snippets: [
      S("fn", "function", "${1:name} <- function(${2:x}) {\n\t${0}\n}"),
      S("for", "for loop", "for (${1:i} in ${2:1:10}) {\n\t${0}\n}"),
      S("if", "if", "if (${1:condition}) {\n\t${0}\n}"),
      S("cat", "cat with newline", 'cat(${0}, "\\n")'),
      S("df", "data.frame", "${1:df} <- data.frame(${2:x} = ${3:c(1, 2, 3)})"),
    ],
  },
  elixir: {
    keywords: "def defp defmodule do end if else unless case cond fn when with for receive try rescue after import alias require use true false nil",
    builtins: "IO puts inspect gets Enum map filter reduce each String List Map length",
    snippets: [
      S("defmodule", "module", "defmodule ${1:Name} do\n\t${0}\nend"),
      S("def", "function", "def ${1:name}(${2:x}) do\n\t${0}\nend"),
      S("puts", "IO.puts", "IO.puts(${0})"),
      S("case", "case", "case ${1:value} do\n\t${2:pattern} -> ${3}\n\t_ -> ${0}\nend"),
      S("pipe", "Enum pipeline", "${1:list}\n|> Enum.map(fn ${2:x} -> ${3:x} end)\n|> Enum.${0:sum}()"),
    ],
  },
  pascal: {
    keywords: "program begin end var const type procedure function if then else for to downto do while repeat until case of record array string integer real boolean char writeln write readln read uses and or not div mod",
    builtins: "writeln write readln read length copy pos inc dec ord chr trunc round abs sqrt",
    snippets: [
      S("program", "program", "program ${1:Main};\n\nbegin\n\t${0}\nend."),
      S("writeln", "writeln", "writeln(${0});"),
      S("for", "for loop", "for ${1:i} := ${2:1} to ${3:10} do\nbegin\n\t${0}\nend;"),
      S("if", "if", "if ${1:condition} then\nbegin\n\t${0}\nend;"),
      S("procedure", "procedure", "procedure ${1:Name}(${2:x}: Integer);\nbegin\n\t${0}\nend;"),
      S("function", "function", "function ${1:Name}(${2:x}: Integer): Integer;\nbegin\n\t${1:Name} := ${0:x};\nend;"),
    ],
  },
  clojure: {
    keywords: "def defn defn- let fn if when cond case do loop recur ns require import doseq for nil true false",
    builtins: "println print str map filter reduce first rest cons conj assoc get count range inc dec read-line",
    snippets: [
      S("defn", "defn", "(defn ${1:name} [${2:x}]\n\t${0})"),
      S("let", "let", "(let [${1:x} ${2:1}]\n\t${0})"),
      S("if", "if", "(if ${1:condition}\n\t${2}\n\t${0})"),
      S("println", "println", "(println ${0})"),
      S("doseq", "doseq", "(doseq [${1:x} ${2:xs}]\n\t${0})"),
    ],
  },
  fsharp: {
    keywords: "let mutable rec fun function match with if then elif else for in to do while type module open of member new return yield async true false",
    builtins: "printfn printf sprintf List Array Seq Map String stdin ReadLine",
    snippets: [
      S("let", "function", "let ${1:name} ${2:x} =\n\t${0}"),
      S("printfn", "printfn", 'printfn "${1:%A}" ${0}'),
      S("match", "match", "match ${1:value} with\n| ${2:pattern} -> ${3}\n| _ -> ${0}"),
      S("for", "for in", "for ${1:x} in ${2:xs} do\n\t${0}"),
      S("type", "record type", "type ${1:Name} = { ${2:Value}: ${3:int} }"),
    ],
  },
  vb: {
    keywords: "Module End Sub Function Dim As Integer String Boolean Double If Then ElseIf Else For To Step Next Each In While Do Loop Select Case Return Class Public Private Shared New Imports Nothing True False And Or Not",
    builtins: "Console WriteLine ReadLine Write Math CStr CInt",
    snippets: [
      S("sub", "Sub", "Sub ${1:Name}()\n\t${0}\nEnd Sub"),
      S("function", "Function", "Function ${1:Name}(${2:x} As Integer) As Integer\n\tReturn ${0:x}\nEnd Function"),
      S("cw", "Console.WriteLine", "Console.WriteLine(${0})"),
      S("for", "For loop", "For ${1:i} As Integer = ${2:0} To ${3:9}\n\t${0}\nNext"),
      S("if", "If", "If ${1:condition} Then\n\t${0}\nEnd If"),
      S("dim", "Dim", "Dim ${1:name} As ${2:Integer} = ${0:0}"),
    ],
  },
  "objective-c": {
    keywords: "@interface @implementation @end @property @autoreleasepool @selector @protocol self super nil YES NO if else for while return int void char float double BOOL id",
    builtins: "NSLog NSString NSArray NSMutableArray NSDictionary NSNumber printf alloc init",
    snippets: [
      S("main", "main", "int main(int argc, const char *argv[]) {\n\t@autoreleasepool {\n\t\t${0}\n\t}\n\treturn 0;\n}"),
      S("nslog", "NSLog", 'NSLog(@"${1:%@}", ${0});'),
      S("interface", "class interface", "@interface ${1:Name} : NSObject\n${0}\n@end"),
      S("impl", "class implementation", "@implementation ${1:Name}\n${0}\n@end"),
      S("for", "for loop", "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${0}\n}"),
    ],
  },
  shell: {
    keywords: "if then else elif fi for in do done while until case esac function return local export read echo printf exit",
    builtins: "echo printf read cd ls cat grep sed awk wc sort head tail test",
    snippets: [
      S("if", "if", "if [[ ${1:condition} ]]; then\n\t${0}\nfi"),
      S("for", "for loop", "for ${1:i} in ${2:{1..10}}; do\n\t${0}\ndone"),
      S("while", "while read", "while read -r ${1:line}; do\n\t${0}\ndone"),
      S("fn", "function", "${1:name}() {\n\t${0}\n}"),
      S("case", "case", "case \"\\$${1:var}\" in\n\t${2:pattern})\n\t\t${0}\n\t\t;;\nesac"),
    ],
  },
  html: {
    snippets: [
      S("html:5", "HTML page (same as ! + Tab)", '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t${0}\n</body>\n</html>'),
      S("link:css", "style sheet link", '<link rel="stylesheet" href="${1:style.css}">'),
      S("script:src", "script file", '<script src="${1:script.js}"></script>'),
    ],
  },
  css: {
    snippets: [
      S("flexcenter", "center with flexbox", "display: flex;\njustify-content: center;\nalign-items: center;"),
      S("grid", "grid with columns", "display: grid;\ngrid-template-columns: repeat(${1:3}, 1fr);\ngap: ${2:16px};"),
      S("media", "media query", "@media (max-width: ${1:600px}) {\n\t${0}\n}"),
      S("keyframes", "animation", "@keyframes ${1:name} {\n\tfrom { ${2:opacity: 0;} }\n\tto { ${3:opacity: 1;} }\n}"),
      S("root", "CSS variables", ":root {\n\t--${1:accent}: ${2:#3b82f6};\n}"),
    ],
  },
};

/* ------------------------------------------------------------------ */
/* A small Monarch tokenizer from a few facts about the language        */
/* ------------------------------------------------------------------ */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

function monarch(def) {
  const m = def.mode;
  const ident = m.ident || (m.lisp ? /[A-Za-z_*+!?<>=\/-][\w*+!?<>=\/-]*/ : /[A-Za-z_]\w*/);
  const cases = { "@keywords": "keyword", "@types": "type", "@builtins": "predefined", "@default": "identifier" };
  const root = [];
  if (m.fixedComment) root.push([/^.{6}\*.*$/, "comment"]);
  if (m.directives) root.push([new RegExp("^" + m.directives.source), "keyword"]);
  if (m.labels) root.push([/^\s*[A-Za-z_.$][\w.$]*:/, "type.identifier"]);
  if (m.at) root.push([/@\w+/, "annotation"]);
  if (m.hash) root.push([/[#@]\w+/, "annotation"]);
  root.push({ include: "@whitespace" });
  if (m.upperIsType) root.push([/[A-Z][\w']*/, { cases: { "@keywords": "keyword", "@builtins": "predefined", "@default": "type.identifier" } }]);
  if (m.upperIsVariable) root.push([/[A-Z_][\w]*/, "variable"]);
  root.push([ident, { cases }]);
  root.push([/0[xX][0-9a-fA-F_]+/, "number.hex"], [/\d[\d_]*(\.\d+)?([eE][+-]?\d+)?/, "number"]);
  root.push([/[{}()[\]]/, "@brackets"], [/[;,.]/, "delimiter"], [/[=<>!~?:&|+\-*/^%]+/, "operator"]);
  if (m.chars) root.push([/'(\\.|[^\\'])'/, "string"]);
  const strings = m.strings || ['"'];
  const tokenizer = { root, whitespace: [[/\s+/, "white"]] };
  const ws = tokenizer.whitespace;
  if (m.block) {
    const [open, close] = m.block;
    ws.push([new RegExp(esc(open)), "comment", "@comment"]);
    tokenizer.comment = [[new RegExp(esc(close)), "comment", "@pop"], ...(m.nest ? [[new RegExp(esc(open)), "comment", "@push"]] : []), [/./, "comment"]];
  }
  if (m.line) ws.push([new RegExp(esc(m.line) + ".*$"), "comment"]);
  if (m.line2) ws.push([new RegExp(esc(m.line2) + ".*$"), "comment"]);
  strings.forEach((q, i) => {
    root.push([new RegExp(esc(q)), "string", "@str" + i]);
    tokenizer["str" + i] = [[new RegExp(`[^\\\\${esc(q)}]+`), "string"], [/\\./, "string.escape"], [new RegExp(esc(q)), "string", "@pop"]];
  });
  if (m.atomQuote && !strings.includes("'")) root.push([/'[^']*'/, "string"]);
  return {
    ignoreCase: !!m.ignoreCase, defaultToken: "", keywords: words(def.keywords), types: words(def.types), builtins: words(def.builtins), tokenizer,
  };
}

function config(def) {
  const m = def.mode || {};
  const quotes = (m.strings || ['"']).map((q) => ({ open: q, close: q, notIn: ["string", "comment"] }));
  return {
    comments: { ...(m.line ? { lineComment: m.line } : {}), ...(m.block ? { blockComment: m.block } : {}) },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [{ open: "{", close: "}" }, { open: "[", close: "]" }, { open: "(", close: ")" }, ...quotes],
    surroundingPairs: [{ open: "{", close: "}" }, { open: "[", close: "]" }, { open: "(", close: ")" }, ...quotes.map(({ open, close }) => ({ open, close }))],
    ...(m.lisp ? { wordPattern: /[A-Za-z_*+!?<>=\/-][\w*+!?<>=\/-]*/ } : m.ident ? { wordPattern: m.ident } : {}),
  };
}

/** Register colors, comment toggling, keyword completion and snippets for every language in MODES. */
export function registerLanguageModes(monaco) {
  const L = monaco.languages;
  const K = L.CompletionItemKind;
  const known = new Set(L.getLanguages().map((l) => l.id));
  for (const [id, def] of Object.entries(MODES)) {
    if (!known.has(id)) L.register({ id });
    if (def.mode) {
      L.setMonarchTokensProvider(id, monarch(def));
      L.setLanguageConfiguration(id, config(def));
    } else if (def.borrow) {
      window.require([`vs/basic-languages/${def.borrow}/${def.borrow}`], (mod) => {
        const base = mod.language; // the relative's tokenizer, knowing this language's keywords too
        const extra = words(def.keywords).filter((k) => !(base.keywords || []).includes(k));
        L.setMonarchTokensProvider(id, { ...base, keywords: [...(base.keywords || []), ...extra, ...(base.ignoreCase ? extra.map((k) => k.toLowerCase()) : [])] });
        L.setLanguageConfiguration(id, mod.conf);
      });
    }
    const kw = words(def.keywords), types = words(def.types), fns = words(def.builtins), snips = def.snippets || [];
    if (!kw.length && !snips.length) continue;
    L.registerCompletionItemProvider(id, {
      provideCompletionItems(model, position) {
        const w = model.getWordUntilPosition(position);
        const range = new monaco.Range(position.lineNumber, w.startColumn, position.lineNumber, w.endColumn);
        const before = model.getLineContent(position.lineNumber).slice(0, w.startColumn - 1)
          .replace(/"(\\.|[^"\\])*"/g, '""').replace(/'(\\.|[^'\\])*'/g, "''"); // a comment marker inside a string does not count
        const lc = def.mode?.line || (id === "perl" || id === "shell" || id === "r" || id === "julia" || id === "elixir" ? "#" : id === "vb" || id === "freebasic" ? "'" : id === "clojure" ? ";" : "//");
        if (before.includes(lc) || (def.mode?.line2 && before.includes(def.mode.line2))) return { suggestions: [] }; // inside a comment
        if (/[.:]\s*$/.test(before) && id !== "commonlisp") return { suggestions: [] }; // members: not ours to guess
        const seen = new Set(snips.map((x) => x.label)), out = []; // a snippet replaces the keyword it is named after, so Tab expands it
        const add = (label, kind, sort, extra = {}) => { if (seen.has(label)) return; seen.add(label); out.push({ label, kind, insertText: label, range, sortText: sort + label, ...extra }); };
        for (const s of snips) out.push({
          label: s.label, kind: K.Snippet, detail: s.detail, insertText: s.body, insertTextRules: L.CompletionItemInsertTextRule.InsertAsSnippet, range, sortText: "9" + s.label,
          documentation: { value: "```\n" + s.body.replace(/\$\{\d+:?([^}]*)\}/g, "$1").replace(/\$0/g, "").replace(/\\\$/g, "$") + "\n```" },
        });
        for (const k of kw) add(k, K.Keyword, "6");
        for (const t of types) add(t, K.Class, "4");
        for (const f of fns) add(f, K.Function, "5");
        return { suggestions: out };
      },
    });
  }
}

/** Emmet in HTML and CSS, like VS Code: "!" + Tab gives a page, "ul>li*3" + Tab expands. Loaded on first use. */
let emmetLoaded = null;
export function loadEmmet(monaco, url) {
  emmetLoaded ||= import(url)
    .then((m) => {
      // Emmet reads the tokenizer state of the line, which Monaco has not computed yet right after a file is
      // replaced: tokenize the line first, and never let a failure surface as an error
      const L = monaco.languages, register = L.registerCompletionItemProvider;
      L.registerCompletionItemProvider = (lang, provider) => register.call(L, lang, {
        ...provider,
        provideCompletionItems(model, position, ...rest) {
          try { model.tokenization?.forceTokenization?.(position.lineNumber); } catch (_) {}
          try { return provider.provideCompletionItems(model, position, ...rest); } catch (_) { return undefined; }
        },
      });
      try { m.emmetHTML(monaco, ["html"]); m.emmetCSS(monaco, ["css"]); } finally { L.registerCompletionItemProvider = register; }
      return true;
    })
    .catch(() => false);
  return emmetLoaded;
}
