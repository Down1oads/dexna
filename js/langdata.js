// Curated reference data for the online languages: keywords, common library functions, members.
// Format of each line:  name | signature | description
// This powers completion, hover and parameter hints. It is not a full language server.

const parse = (block) => block.trim().split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((r) => r[0]).map(([name, sig = "", doc = ""]) => ({ name, sig, doc }));
const words = (s) => s.trim().split(/\s+/);

export const LANG_DATA = {
  csharp: {
    keywords: words("abstract as async await base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly record ref return sbyte sealed short sizeof static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile while yield"),
    types: words("Console String Math List Dictionary HashSet Queue Stack StringBuilder DateTime TimeSpan Task Random Convert Environment Guid Array Enumerable File Path Regex Tuple Exception ArgumentException InvalidOperationException Func Action Nullable"),
    statics: {
      Console: parse(`
WriteLine | (value) | Writes the value followed by a line break.
Write | (value) | Writes the value without a line break.
ReadLine | () | Reads a line of input. Returns null at the end of the input.
Read | () | Reads the next character as an int, or -1 at the end.
ReadKey | () | Reads the next key press.
Clear | () | Clears the console.
Error | | The standard error stream.
OutputEncoding | | The encoding used for output.`),
      Math: parse(`
Abs | (x) | Absolute value.
Max | (a, b) | The larger of two values.
Min | (a, b) | The smaller of two values.
Pow | (x, y) | x raised to the power y.
Sqrt | (x) | Square root.
Floor | (x) | Largest integer less than or equal to x.
Ceiling | (x) | Smallest integer greater than or equal to x.
Round | (x [, digits]) | Rounds to the nearest value.
Truncate | (x) | Integral part of x.
Sign | (x) | -1, 0 or 1.
Clamp | (value, min, max) | Limits value to a range.
Sin | (x) | Sine (radians).
Cos | (x) | Cosine (radians).
Tan | (x) | Tangent (radians).
Log | (x [, base]) | Natural logarithm, or logarithm in a given base.
Log10 | (x) | Base 10 logarithm.
Exp | (x) | e raised to x.
PI | | The constant pi.
E | | The constant e.`),
      string: parse(`
Join | (separator, values) | Joins values with a separator.
Format | (format, args...) | Formats a string, e.g. string.Format("{0} is {1}", a, b).
IsNullOrEmpty | (s) | True if s is null or "".
IsNullOrWhiteSpace | (s) | True if s is null, empty or only spaces.
Concat | (a, b, ...) | Joins strings.
Empty | | The empty string.`),
      Convert: parse(`
ToInt32 | (value) | Converts to int.
ToDouble | (value) | Converts to double.
ToString | (value) | Converts to string.
ToBoolean | (value) | Converts to bool.
ToChar | (value) | Converts to char.`),
      Environment: parse(`
NewLine | | The line break for this platform.
Exit | (code) | Ends the program.
GetEnvironmentVariable | (name) | Reads an environment variable.`),
      DateTime: parse(`
Now | | The current local date and time.
UtcNow | | The current UTC date and time.
Today | | Today's date.
Parse | (s) | Parses a date.`),
      Task: parse(`
Delay | (milliseconds) | A task that completes after a delay. Use with await.
Run | (action) | Runs work on a thread pool thread.
WhenAll | (tasks) | Waits for all tasks.
FromResult | (value) | A completed task holding a value.`),
      File: parse(`
ReadAllText | (path) | Reads a whole file as text.
WriteAllText | (path, text) | Writes text to a file.
Exists | (path) | True if the file exists.`),
      Guid: parse(`NewGuid | () | Creates a new random GUID.`),
      Enumerable: parse(`
Range | (start, count) | A sequence of consecutive integers.
Repeat | (value, count) | A sequence repeating one value.
Empty | () | An empty sequence.`),
    },
    instance: parse(`
Length | | Number of characters, or array elements.
Count | | Number of elements (or Count() in LINQ).
Substring | (start [, length]) | Part of a string.
Split | (separator) | Splits a string into an array.
Trim | () | Removes spaces from both ends.
TrimStart | () | Removes spaces from the start.
TrimEnd | () | Removes spaces from the end.
ToUpper | () | Upper-case copy.
ToLower | () | Lower-case copy.
Contains | (value) | True if the value is present.
StartsWith | (prefix) | True if it starts with prefix.
EndsWith | (suffix) | True if it ends with suffix.
Replace | (old, new) | Replaces all occurrences.
IndexOf | (value) | Position of the first match, or -1.
PadLeft | (width [, char]) | Pads on the left.
PadRight | (width [, char]) | Pads on the right.
ToString | () | Text form of the value.
ToCharArray | () | The characters as an array.
Add | (item) | Adds an item to a collection.
AddRange | (items) | Adds many items.
Remove | (item) | Removes an item.
RemoveAt | (index) | Removes the item at an index.
Insert | (index, item) | Inserts an item.
Clear | () | Removes everything.
Sort | () | Sorts in place.
Reverse | () | Reverses the order.
ContainsKey | (key) | True if the dictionary has the key.
TryGetValue | (key, out value) | Gets a value if the key exists.
Keys | | The dictionary keys.
Values | | The dictionary values.
Where | (predicate) | LINQ: keeps items that match.
Select | (selector) | LINQ: transforms each item.
OrderBy | (key) | LINQ: sorts ascending.
OrderByDescending | (key) | LINQ: sorts descending.
GroupBy | (key) | LINQ: groups by a key.
First | () | LINQ: first item (throws if empty).
FirstOrDefault | () | LINQ: first item or the default.
Last | () | LINQ: last item.
Any | ([predicate]) | LINQ: true if any item matches.
All | (predicate) | LINQ: true if all items match.
Sum | ([selector]) | LINQ: total.
Min | () | LINQ: smallest.
Max | () | LINQ: largest.
Average | () | LINQ: mean.
Take | (n) | LINQ: first n items.
Skip | (n) | LINQ: skips n items.
Distinct | () | LINQ: removes duplicates.
ToList | () | LINQ: copies into a List.
ToArray | () | LINQ: copies into an array.
ToDictionary | (key, value) | LINQ: builds a dictionary.
Append | (value) | Adds text to a StringBuilder.
AppendLine | ([value]) | Adds text and a line break to a StringBuilder.`),
  },

  java: {
    keywords: words("abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try var void volatile while record sealed permits yield true false null"),
    types: words("String Integer Double Long Boolean Character Object Math System List ArrayList LinkedList Map HashMap TreeMap Set HashSet TreeSet Queue Deque ArrayDeque PriorityQueue Stack Arrays Collections Optional Scanner StringBuilder Random Thread LocalDate LocalDateTime Stream IntStream Collectors Objects Exception RuntimeException"),
    statics: {
      "System.out": parse(`
println | (x) | Prints a value and a line break.
print | (x) | Prints a value without a line break.
printf | (format, args...) | Prints formatted text, e.g. printf("%d items%n", n).`),
      System: parse(`
currentTimeMillis | () | Milliseconds since 1970.
nanoTime | () | A high-resolution timer in nanoseconds.
exit | (status) | Ends the program.
lineSeparator | () | The line break for this platform.
arraycopy | (src, srcPos, dest, destPos, length) | Copies part of an array.
getProperty | (key) | Reads a system property.
in | | The standard input stream.
out | | The standard output stream.
err | | The standard error stream.`),
      Math: parse(`
abs | (x) | Absolute value.
max | (a, b) | The larger value.
min | (a, b) | The smaller value.
pow | (a, b) | a raised to b.
sqrt | (x) | Square root.
floor | (x) | Largest integer not above x.
ceil | (x) | Smallest integer not below x.
round | (x) | Nearest integer.
random | () | A random double in [0, 1).
sin | (x) | Sine (radians).
cos | (x) | Cosine (radians).
log | (x) | Natural logarithm.
hypot | (x, y) | Square root of x*x + y*y.
floorMod | (x, y) | Modulo that is never negative for positive y.
PI | | The constant pi.
E | | The constant e.`),
      Integer: parse(`
parseInt | (s) | Parses text as an int.
valueOf | (s) | An Integer from text or an int.
toString | (i) | Text form of an int.
toBinaryString | (i) | Binary text.
toHexString | (i) | Hex text.
compare | (a, b) | Compares two ints.
sum | (a, b) | Adds two ints.
MAX_VALUE | | Largest int.
MIN_VALUE | | Smallest int.`),
      Double: parse(`
parseDouble | (s) | Parses text as a double.
valueOf | (s) | A Double from text or a double.
compare | (a, b) | Compares two doubles.
isNaN | (x) | True if x is not a number.`),
      String: parse(`
valueOf | (x) | Text form of any value.
format | (format, args...) | Formats like printf and returns the text.
join | (separator, items) | Joins items with a separator.`),
      Arrays: parse(`
sort | (array) | Sorts an array in place.
toString | (array) | Text form of an array, e.g. [1, 2, 3].
deepToString | (array) | Text form of a nested array.
asList | (items...) | A fixed-size list view of the items.
fill | (array, value) | Sets every element.
copyOf | (array, newLength) | A copy with a new length.
equals | (a, b) | True if the arrays have equal contents.
stream | (array) | A Stream over the elements.`),
      Collections: parse(`
sort | (list) | Sorts a list.
reverse | (list) | Reverses a list.
shuffle | (list) | Randomly reorders a list.
max | (collection) | The largest element.
min | (collection) | The smallest element.
swap | (list, i, j) | Swaps two elements.
unmodifiableList | (list) | A read-only view.
emptyList | () | An empty immutable list.`),
      List: parse(`
of | (items...) | An immutable list of the items.
copyOf | (collection) | An immutable copy.`),
      Map: parse(`
of | (k1, v1, ...) | An immutable map.
entry | (key, value) | A key/value pair.`),
      Objects: parse(`
equals | (a, b) | Null-safe equality.
hash | (values...) | A hash code for the values.
requireNonNull | (obj) | Throws if obj is null.
isNull | (obj) | True if obj is null.`),
      Character: parse(`
isDigit | (c) | True for 0-9.
isLetter | (c) | True for letters.
isLetterOrDigit | (c) | True for letters and digits.
isUpperCase | (c) | True for capital letters.
toUpperCase | (c) | Upper-case version.
toLowerCase | (c) | Lower-case version.`),
      Thread: parse(`sleep | (millis) | Pauses the current thread.`),
      IntStream: parse(`
range | (start, end) | Ints from start up to end (exclusive).
rangeClosed | (start, end) | Ints from start to end (inclusive).`),
      Collectors: parse(`
toList | () | Collects into a List.
toSet | () | Collects into a Set.
joining | ([separator]) | Joins strings.
groupingBy | (classifier) | Groups into a Map.
counting | () | Counts elements.`),
      Optional: parse(`
of | (value) | An Optional holding a value.
empty | () | An empty Optional.
ofNullable | (value) | Empty if the value is null.`),
    },
    instance: parse(`
length | () | Number of characters.
charAt | (index) | The character at an index.
substring | (begin [, end]) | Part of a string.
indexOf | (x) | Position of the first match, or -1.
split | (regex) | Splits into an array.
trim | () | Removes spaces from both ends.
strip | () | Removes whitespace from both ends.
toUpperCase | () | Upper-case copy.
toLowerCase | () | Lower-case copy.
equals | (other) | True if equal.
equalsIgnoreCase | (other) | Equality ignoring case.
contains | (x) | True if present.
startsWith | (prefix) | True if it starts with prefix.
endsWith | (suffix) | True if it ends with suffix.
replace | (old, new) | Replaces text.
isEmpty | () | True if empty.
toCharArray | () | The characters as an array.
repeat | (n) | Repeats the string n times.
compareTo | (other) | Orders two values.
add | (item) | Adds to a collection.
get | (index or key) | Gets an element or map value.
set | (index, item) | Replaces an element.
remove | (index or item) | Removes an element.
size | () | Number of elements.
clear | () | Removes everything.
addAll | (collection) | Adds many elements.
sort | (comparator) | Sorts a list.
forEach | (action) | Runs an action for each element.
stream | () | A Stream over the elements.
subList | (from, to) | A view of part of a list.
put | (key, value) | Adds a map entry.
getOrDefault | (key, default) | A value, or a default if missing.
containsKey | (key) | True if the map has the key.
keySet | () | The keys of a map.
values | () | The values of a map.
entrySet | () | The key/value pairs of a map.
putIfAbsent | (key, value) | Adds only if the key is missing.
merge | (key, value, function) | Combines with an existing value.
computeIfAbsent | (key, function) | Creates a value if missing.
filter | (predicate) | Stream: keeps matches.
map | (function) | Stream: transforms elements.
mapToInt | (function) | Stream: transforms to ints.
collect | (collector) | Stream: gathers results.
sum | () | Stream: total.
count | () | Stream: number of elements.
sorted | () | Stream: sorted copy.
distinct | () | Stream: removes duplicates.
limit | (n) | Stream: first n elements.
reduce | (identity, op) | Stream: folds into one value.
anyMatch | (predicate) | Stream: true if any match.
toList | () | Stream: collects into a List.
nextLine | () | Scanner: reads a line.
nextInt | () | Scanner: reads an int.
nextDouble | () | Scanner: reads a double.
next | () | Scanner: reads a word.
hasNext | () | Scanner: true if there is more input.
hasNextLine | () | Scanner: true if there is another line.
hasNextInt | () | Scanner: true if the next token is an int.
append | (x) | StringBuilder: adds text.
insert | (index, x) | StringBuilder: inserts text.
reverse | () | StringBuilder: reverses the text.
toString | () | Text form of the object.`),
  },

  c: {
    keywords: words("auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while _Bool bool true false NULL"),
    types: [],
    functions: parse(`
printf | (format, ...) | Prints formatted text. %d int, %s string, %f double, %c char, %p pointer.
scanf | (format, ...) | Reads formatted input, e.g. scanf("%d", &n).
puts | (s) | Prints a string and a line break.
putchar | (c) | Prints one character.
getchar | () | Reads one character.
fgets | (buf, size, stream) | Reads a line into a buffer, e.g. fgets(buf, 100, stdin).
sprintf | (buf, format, ...) | Formats into a buffer.
snprintf | (buf, size, format, ...) | Formats into a buffer with a size limit.
fopen | (path, mode) | Opens a file.
fclose | (file) | Closes a file.
fprintf | (file, format, ...) | Prints formatted text to a file or stderr.
malloc | (size) | Allocates memory. Free it with free.
calloc | (count, size) | Allocates zeroed memory.
realloc | (ptr, size) | Resizes allocated memory.
free | (ptr) | Releases allocated memory.
atoi | (s) | Text to int.
atof | (s) | Text to double.
rand | () | A pseudo-random int.
srand | (seed) | Seeds rand, e.g. srand(time(NULL)).
exit | (status) | Ends the program.
abs | (x) | Absolute value of an int.
qsort | (base, n, size, compare) | Sorts an array.
strlen | (s) | Length of a string.
strcpy | (dest, src) | Copies a string.
strncpy | (dest, src, n) | Copies at most n characters.
strcmp | (a, b) | Compares strings: 0 if equal.
strcat | (dest, src) | Appends a string.
strchr | (s, c) | First occurrence of a character.
strstr | (haystack, needle) | First occurrence of a substring.
memset | (ptr, value, n) | Fills memory.
memcpy | (dest, src, n) | Copies memory.
sqrt | (x) | Square root.
pow | (x, y) | x raised to y.
sin | (x) | Sine (radians).
cos | (x) | Cosine (radians).
fabs | (x) | Absolute value of a double.
floor | (x) | Rounds down.
ceil | (x) | Rounds up.
log | (x) | Natural logarithm.
exp | (x) | e raised to x.
isdigit | (c) | True for 0-9.
isalpha | (c) | True for letters.
toupper | (c) | Upper-case character.
tolower | (c) | Lower-case character.
time | (ptr) | Seconds since 1970.`),
  },

  cpp: {
    keywords: words("alignas alignof and auto bool break case catch char class const constexpr const_cast continue decltype default delete do double dynamic_cast else enum explicit export extern false final float for friend goto if inline int long mutable namespace new noexcept nullptr operator override private protected public register reinterpret_cast return short signed sizeof static static_assert static_cast struct switch template this throw true try typedef typeid typename union unsigned using virtual void volatile while"),
    types: words("string vector map unordered_map set unordered_set pair array queue stack deque priority_queue list optional tuple unique_ptr shared_ptr cout cin cerr endl size_t int64_t"),
    statics: {
      "std": parse(`
cout | | Standard output stream. Use with <<.
cin | | Standard input stream. Use with >>.
cerr | | Standard error stream.
endl | | Ends a line and flushes the output.
string | | Text type.
vector | <T> | A growable array.
map | <K, V> | Sorted key/value pairs.
unordered_map | <K, V> | Hash-based key/value pairs.
set | <T> | Sorted unique values.
unordered_set | <T> | Hash-based unique values.
pair | <A, B> | Two values together.
make_pair | (a, b) | Builds a pair.
tuple | <...> | A fixed group of values.
optional | <T> | A value that may be absent.
unique_ptr | <T> | A pointer that owns its object.
make_unique | <T>(args...) | Creates an object owned by a unique_ptr.
shared_ptr | <T> | A reference-counted pointer.
make_shared | <T>(args...) | Creates an object owned by a shared_ptr.
sort | (first, last [, compare]) | Sorts a range.
reverse | (first, last) | Reverses a range.
find | (first, last, value) | Finds a value in a range.
count | (first, last, value) | Counts matches.
max | (a, b) | The larger value.
min | (a, b) | The smaller value.
swap | (a, b) | Swaps two values.
accumulate | (first, last, init) | Sums a range (include <numeric>).
getline | (stream, str) | Reads a line, e.g. getline(cin, s).
to_string | (value) | Number to string.
stoi | (s) | String to int.
stod | (s) | String to double.
abs | (x) | Absolute value.
sqrt | (x) | Square root.
pow | (x, y) | x raised to y.
unique | (first, last) | Removes consecutive duplicates.
lower_bound | (first, last, value) | First element not less than value.
iota | (first, last, value) | Fills with increasing values.`),
    },
    instance: parse(`
push_back | (x) | Adds to the end.
pop_back | () | Removes the last element.
emplace_back | (args...) | Builds an element in place at the end.
size | () | Number of elements.
empty | () | True if empty.
clear | () | Removes everything.
begin | () | Iterator to the first element.
end | () | Iterator past the last element.
front | () | The first element.
back | () | The last element.
at | (i) | Element i with bounds checking.
insert | (pos, x) | Inserts an element.
erase | (pos) | Removes an element.
resize | (n) | Changes the size.
reserve | (n) | Reserves capacity.
substr | (pos [, len]) | Part of a string.
find | (x) | Finds a value or substring.
append | (s) | Adds text to a string.
c_str | () | C-style string pointer.
length | () | Length of a string.
count | (key) | Number of entries with a key.
first | | The key of a pair or map entry.
second | | The value of a pair or map entry.`),
  },

  go: {
    keywords: words("break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var true false nil iota"),
    types: words("int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float32 float64 string bool byte rune error any complex128 uintptr"),
    functions: parse(`
append | (slice, items...) | Adds items to a slice and returns it.
len | (v) | Length of a string, slice, map or channel.
cap | (v) | Capacity of a slice or channel.
make | (type, size...) | Creates a slice, map or channel.
new | (type) | Allocates a zero value and returns a pointer.
copy | (dst, src) | Copies slice elements.
delete | (map, key) | Removes a map entry.
panic | (v) | Stops the program with an error.
recover | () | Catches a panic inside a deferred function.
close | (ch) | Closes a channel.
print | (args...) | Built-in print to stderr.
println | (args...) | Built-in println to stderr.`),
    statics: {
      fmt: parse(`
Println | (a ...any) | Prints values with spaces and a line break.
Printf | (format string, a ...any) | Prints formatted text, e.g. Printf("%d %s\\n", n, s).
Print | (a ...any) | Prints values.
Sprintf | (format string, a ...any) | Formats into a string.
Sprint | (a ...any) | Joins values into a string.
Sprintln | (a ...any) | Joins values with spaces and a line break.
Errorf | (format string, a ...any) | Builds an error.
Scan | (a ...any) | Reads space-separated values from input.
Scanln | (a ...any) | Reads values up to a line break.
Scanf | (format string, a ...any) | Reads formatted input.
Fprintf | (w io.Writer, format string, a ...any) | Prints formatted text to a writer such as os.Stderr.`),
      strings: parse(`
Contains | (s, substr string) bool | True if substr is in s.
HasPrefix | (s, prefix string) bool | True if s starts with prefix.
HasSuffix | (s, suffix string) bool | True if s ends with suffix.
Split | (s, sep string) []string | Splits s around sep.
Join | (elems []string, sep string) string | Joins strings with sep.
Replace | (s, old, new string, n int) string | Replaces the first n matches.
ReplaceAll | (s, old, new string) string | Replaces all matches.
ToUpper | (s string) string | Upper-case copy.
ToLower | (s string) string | Lower-case copy.
TrimSpace | (s string) string | Removes spaces at both ends.
Trim | (s, cutset string) string | Removes characters at both ends.
Fields | (s string) []string | Splits around whitespace.
Index | (s, substr string) int | Position of substr, or -1.
Repeat | (s string, count int) string | Repeats s.
Count | (s, substr string) int | Counts non-overlapping matches.
EqualFold | (s, t string) bool | Equality ignoring case.
Builder | | A efficient string builder (strings.Builder).`),
      strconv: parse(`
Itoa | (i int) string | int to string.
Atoi | (s string) (int, error) | string to int.
ParseFloat | (s string, bitSize int) (float64, error) | string to float.
ParseInt | (s string, base, bitSize int) (int64, error) | string to int64.
ParseBool | (s string) (bool, error) | string to bool.
FormatInt | (i int64, base int) string | int64 to string in a base.
Quote | (s string) string | A quoted Go string literal.`),
      math: parse(`
Sqrt | (x float64) float64 | Square root.
Pow | (x, y float64) float64 | x raised to y.
Abs | (x float64) float64 | Absolute value.
Max | (x, y float64) float64 | The larger value.
Min | (x, y float64) float64 | The smaller value.
Floor | (x float64) float64 | Rounds down.
Ceil | (x float64) float64 | Rounds up.
Round | (x float64) float64 | Rounds to nearest.
Log | (x float64) float64 | Natural logarithm.
Sin | (x float64) float64 | Sine (radians).
Cos | (x float64) float64 | Cosine (radians).
Inf | (sign int) float64 | Positive or negative infinity.
Pi | | The constant pi.
MaxInt64 | | Largest int64.`),
      sort: parse(`
Ints | (x []int) | Sorts ints.
Strings | (x []string) | Sorts strings.
Float64s | (x []float64) | Sorts floats.
Slice | (x any, less func(i, j int) bool) | Sorts a slice with a comparison function.
SearchInts | (a []int, x int) int | Binary search in sorted ints.`),
      os: parse(`
Args | | Command-line arguments.
Exit | (code int) | Ends the program.
Stdin | | Standard input.
Stdout | | Standard output.
Stderr | | Standard error.
Getenv | (key string) string | Reads an environment variable.
ReadFile | (name string) ([]byte, error) | Reads a whole file.`),
      time: parse(`
Now | () Time | The current time.
Sleep | (d Duration) | Pauses the program.
Since | (t Time) Duration | Time elapsed since t.
Second | | One second.
Millisecond | | One millisecond.
After | (d Duration) <-chan Time | A channel that receives after d.
Duration | | A length of time.`),
      errors: parse(`
New | (text string) error | Creates an error.
Is | (err, target error) bool | True if err matches target.
As | (err error, target any) bool | Finds an error of a type.
Unwrap | (err error) error | The wrapped error.`),
      bufio: parse(`
NewReader | (rd io.Reader) *Reader | A buffered reader, e.g. bufio.NewReader(os.Stdin).
NewScanner | (r io.Reader) *Scanner | A line scanner, e.g. bufio.NewScanner(os.Stdin).
NewWriter | (w io.Writer) *Writer | A buffered writer.`),
      sync: parse(`
WaitGroup | | Waits for goroutines to finish: Add, Done, Wait.
Mutex | | A mutual exclusion lock: Lock, Unlock.
Once | | Runs a function exactly once.`),
    },
    instance: parse(`
Add | (n int) | WaitGroup: counts n more goroutines.
Done | () | WaitGroup: one goroutine finished.
Wait | () | WaitGroup: blocks until the count is zero.
Lock | () | Mutex: acquires the lock.
Unlock | () | Mutex: releases the lock.
Scan | () | Scanner: advances to the next line. Returns false at the end.
Text | () | Scanner: the current line.
ReadString | (delim byte) | Reader: reads up to a delimiter, e.g. ReadString('\\n').
WriteString | (s string) | Writes text.
String | () | Text form of a Builder or error.
Error | () | The error message.`),
  },

  rust: {
    keywords: words("as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while"),
    types: words("String str Vec Option Result Box Rc Arc RefCell HashMap HashSet BTreeMap BTreeSet VecDeque i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char Some None Ok Err"),
    functions: parse(`
println! | ("{}", value) | Prints with a line break. {} uses Display, {:?} uses Debug, {:>5} aligns.
print! | ("{}", value) | Prints without a line break.
eprintln! | ("{}", value) | Prints to standard error.
format! | ("{}", value) | Builds a String.
vec! | [a, b, c] | Creates a Vec.
assert! | (condition) | Panics if false.
assert_eq! | (left, right) | Panics if not equal.
panic! | ("message") | Stops the program.
dbg! | (value) | Prints a value with its source line, and returns it.
todo! | () | Marks unfinished code.
matches! | (value, pattern) | True if value matches the pattern.
write! | (f, "{}", value) | Writes formatted text to a writer.
writeln! | (f, "{}", value) | Like write! with a line break.`),
    statics: {
      String: parse(`
new | () | An empty String.
from | (s) | A String from &str.
with_capacity | (n) | An empty String with room for n bytes.`),
      Vec: parse(`
new | () | An empty Vec.
with_capacity | (n) | An empty Vec with room for n items.
from | (array) | A Vec from an array.`),
      HashMap: parse(`new | () | An empty HashMap (use std::collections::HashMap).`),
      HashSet: parse(`new | () | An empty HashSet (use std::collections::HashSet).`),
      std: parse(`
io | | Input and output: stdin(), stdout().
collections | | HashMap, HashSet, BTreeMap, VecDeque...
cmp | | min, max, Ordering.
fmt | | Formatting traits: Display, Debug.
mem | | swap, replace, take.
env | | Environment and arguments.
process | | exit.
thread | | spawn, sleep.
time | | Instant, Duration.`),
    },
    instance: parse(`
len | () | Number of items.
is_empty | () | True if empty.
push | (item) | Adds to the end of a Vec.
push_str | (s) | Adds text to a String.
pop | () | Removes and returns the last item.
iter | () | Iterates by reference.
iter_mut | () | Iterates by mutable reference.
into_iter | () | Iterates by value.
map | (|x| ...) | Transforms each item.
filter | (|x| ...) | Keeps items that match.
collect | () | Gathers items, e.g. collect::<Vec<_>>().
sum | () | Adds the items.
fold | (init, |acc, x| ...) | Folds into one value.
enumerate | () | Pairs items with their index.
zip | (other) | Pairs items from two iterators.
rev | () | Reverses an iterator.
take | (n) | First n items.
skip | (n) | Skips n items.
any | (|x| ...) | True if any item matches.
all | (|x| ...) | True if all items match.
count | () | Number of items.
min | () | Smallest item.
max | () | Largest item.
cloned | () | Clones each item.
unwrap | () | The value, or panics on None/Err.
expect | ("message") | Like unwrap with a message.
unwrap_or | (default) | The value, or a default.
unwrap_or_default | () | The value, or the type's default.
ok_or | (err) | Option into Result.
and_then | (|x| ...) | Chains a fallible step.
clone | () | A deep copy.
to_string | () | Converts to a String.
to_owned | () | An owned copy.
as_str | () | Borrows a String as &str.
chars | () | Iterates over characters.
bytes | () | Iterates over bytes.
lines | () | Iterates over lines.
split | (pattern) | Splits text.
split_whitespace | () | Splits around whitespace.
trim | () | Removes spaces at both ends.
parse | () | Parses text, e.g. parse::<i32>().
contains | (x) | True if present.
join | (separator) | Joins items.
sort | () | Sorts in place.
sort_by | (|a, b| ...) | Sorts with a comparison.
reverse | () | Reverses in place.
first | () | The first item as an Option.
last | () | The last item as an Option.
get | (index or key) | An item as an Option.
insert | (key, value) | Inserts an entry or item.
remove | (index or key) | Removes an item.
entry | (key) | A map entry for in-place updates.
or_insert | (default) | Inserts a default if missing.
keys | () | Iterates over map keys.
values | () | Iterates over map values.
read_line | (&mut buf) | Reads a line of input into a String.`),
  },

  kotlin: {
    keywords: words("abstract annotation as break by catch class companion const constructor continue crossinline data do else enum external false final finally for fun get if import in infix init inline inner interface internal is it lateinit lazy noinline null object open operator out override package private protected public reified return sealed set super suspend this throw true try typealias val var vararg when where while"),
    types: words("Int Long Double Float Boolean Char String Any Unit Nothing List MutableList Map MutableMap Set MutableSet Array Pair Triple Sequence Regex StringBuilder"),
    functions: parse(`
println | (value) | Prints with a line break.
print | (value) | Prints without a line break.
readln | () | Reads a line of input (throws at the end).
readLine | () | Reads a line, or null at the end.
listOf | (items...) | An immutable list.
mutableListOf | (items...) | A mutable list.
mapOf | (key to value, ...) | An immutable map.
mutableMapOf | (key to value, ...) | A mutable map.
setOf | (items...) | An immutable set.
arrayOf | (items...) | An array.
intArrayOf | (items...) | An IntArray.
emptyList | () | An empty list.
repeat | (times) { } | Runs a block n times.
require | (condition) | Throws if false.
check | (condition) | Throws if false (state check).
error | (message) | Throws an IllegalStateException.
TODO | () | Marks unfinished code.
lazy | { } | A value computed on first use.
with | (obj) { } | Runs a block with obj as this.
run | { } | Runs a block and returns its result.
let | { } | Runs a block with it as the value.
also | { } | Runs a block and returns the original value.
apply | { } | Configures an object and returns it.`),
    instance: parse(`
size | | Number of elements.
length | | Number of characters.
isEmpty | () | True if empty.
isNotEmpty | () | True if not empty.
forEach | { } | Runs a block for each element.
map | { } | Transforms each element.
filter | { } | Keeps elements that match.
reduce | { acc, x -> } | Folds into one value.
fold | (init) { acc, x -> } | Folds with a starting value.
sum | () | Adds the elements.
sorted | () | A sorted copy.
sortedBy | { } | Sorted by a key.
sortedDescending | () | A copy sorted high to low.
groupBy | { } | Groups into a map.
first | () | The first element.
last | () | The last element.
firstOrNull | () | The first element or null.
take | (n) | First n elements.
drop | (n) | Skips n elements.
joinToString | (separator) | Joins into a string.
toInt | () | Text to Int.
toDouble | () | Text to Double.
toIntOrNull | () | Text to Int, or null.
toString | () | Text form.
split | (delimiter) | Splits text.
trim | () | Removes spaces at both ends.
uppercase | () | Upper-case copy.
lowercase | () | Lower-case copy.
substring | (start, end) | Part of a string.
contains | (x) | True if present.
startsWith | (prefix) | True if it starts with prefix.
indexOf | (x) | Position of the first match, or -1.
add | (item) | Adds to a mutable collection.
remove | (item) | Removes from a mutable collection.
get | (index or key) | Gets an element or value.
put | (key, value) | Adds a map entry.
getOrDefault | (key, default) | A value, or a default.
containsKey | (key) | True if the map has the key.
keys | | The map keys.
values | | The map values.
entries | | The map entries.
any | { } | True if any element matches.
all | { } | True if all elements match.
none | { } | True if no element matches.
count | { } | Number of matching elements.
find | { } | The first match or null.
zip | (other) | Pairs elements from two lists.
distinct | () | Removes duplicates.
reversed | () | A reversed copy.
toList | () | Copies into a List.
toMutableList | () | Copies into a MutableList.
withIndex | () | Pairs elements with their index.
mapIndexed | { i, x -> } | Transforms with the index.
flatMap | { } | Transforms and flattens.
associate | { } | Builds a map from elements.
chunked | (size) | Splits into lists of a size.
coerceIn | (min, max) | Limits a value to a range.`),
  },

  php: {
    keywords: words("abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum extends final finally fn for foreach function global if implements include instanceof insteadof interface isset list match namespace new or print private protected public readonly require return static switch throw trait try unset use var while xor yield true false null"),
    types: words("int float string bool array object mixed void null self static callable iterable"),
    functions: parse(`
echo | value | Prints values.
print_r | ($value) | Prints a readable form of a value.
var_dump | ($value) | Prints a value with its type.
strlen | ($s) | Length of a string in bytes.
count | ($array) | Number of elements.
str_replace | ($search, $replace, $subject) | Replaces text.
substr | ($s, $start [, $length]) | Part of a string.
strpos | ($haystack, $needle) | Position of text, or false.
str_contains | ($haystack, $needle) | True if the text is present.
str_starts_with | ($haystack, $needle) | True if it starts with the text.
explode | ($separator, $string) | Splits a string into an array.
implode | ($separator, $array) | Joins an array into a string.
trim | ($s) | Removes spaces at both ends.
strtoupper | ($s) | Upper-case copy.
strtolower | ($s) | Lower-case copy.
ucfirst | ($s) | Capitalizes the first letter.
sprintf | ($format, ...$values) | Formats into a string.
printf | ($format, ...$values) | Prints formatted text.
number_format | ($num, $decimals) | Formats a number.
array_map | ($callback, $array) | Transforms each element.
array_filter | ($array [, $callback]) | Keeps elements that match.
array_reduce | ($array, $callback, $initial) | Folds into one value.
array_merge | (...$arrays) | Joins arrays.
array_keys | ($array) | The keys of an array.
array_values | ($array) | The values of an array.
array_slice | ($array, $offset [, $length]) | Part of an array.
array_sum | ($array) | Sum of the values.
array_push | (&$array, ...$values) | Adds to the end.
array_pop | (&$array) | Removes the last element.
array_key_exists | ($key, $array) | True if the key exists.
in_array | ($needle, $haystack) | True if the value is in the array.
range | ($start, $end [, $step]) | An array of consecutive values.
sort | (&$array) | Sorts values.
usort | (&$array, $callback) | Sorts with a comparison function.
ksort | (&$array) | Sorts by key.
isset | ($var) | True if set and not null.
empty | ($var) | True if empty.
intval | ($v) | Converts to int.
floatval | ($v) | Converts to float.
json_encode | ($value) | Converts to JSON.
json_decode | ($json, $assoc) | Parses JSON.
date | ($format [, $timestamp]) | Formats a date, e.g. date("Y-m-d").
time | () | Seconds since 1970.
rand | ($min, $max) | A random int.
max | ($a, $b) | The larger value.
min | ($a, $b) | The smaller value.
abs | ($x) | Absolute value.
round | ($x [, $precision]) | Rounds.
floor | ($x) | Rounds down.
ceil | ($x) | Rounds up.
sqrt | ($x) | Square root.
fgets | (STDIN) | Reads a line from input.
trim | ($s) | Removes spaces at both ends.
preg_match | ($pattern, $subject, &$matches) | Regular expression match.
preg_replace | ($pattern, $replacement, $subject) | Regular expression replace.`),
  },

  ruby: {
    keywords: words("BEGIN END alias and begin break case class def defined? do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield"),
    types: words("String Integer Float Array Hash Symbol Range Struct Time Math Kernel Comparable Enumerable"),
    functions: parse(`
puts | (value) | Prints with a line break.
print | (value) | Prints without a line break.
p | (value) | Prints the inspect form of a value.
gets | () | Reads a line of input (nil at the end).
require | ('name') | Loads a library.
format | (fmt, args...) | Formats a string like printf.
rand | ([max]) | A random number.
sleep | (seconds) | Pauses the program.
raise | (error) | Raises an exception.`),
    instance: parse(`
each | { |x| } | Runs a block for each element.
map | { |x| } | Transforms each element.
select | { |x| } | Keeps elements that match.
reject | { |x| } | Drops elements that match.
reduce | (init) { |acc, x| } | Folds into one value.
inject | (init) { |acc, x| } | Folds into one value.
sort | | A sorted copy.
sort_by | { |x| } | Sorted by a key.
min | | The smallest element.
max | | The largest element.
sum | | Adds the elements.
size | | Number of elements.
length | | Number of elements or characters.
first | ([n]) | The first element(s).
last | ([n]) | The last element(s).
push | (item) | Adds to the end.
pop | | Removes the last element.
shift | | Removes the first element.
unshift | (item) | Adds to the front.
join | (separator) | Joins elements into a string.
split | (separator) | Splits a string.
upcase | | Upper-case copy.
downcase | | Lower-case copy.
capitalize | | Capitalizes the first letter.
strip | | Removes spaces at both ends.
chomp | | Removes a trailing line break.
reverse | | A reversed copy.
include? | (x) | True if present.
empty? | | True if empty.
nil? | | True if nil.
to_s | | Converts to a String.
to_i | | Converts to an Integer.
to_f | | Converts to a Float.
to_a | | Converts to an Array.
times | { |i| } | Runs a block n times.
upto | (n) { |i| } | Counts up to n.
downto | (n) { |i| } | Counts down to n.
each_with_index | { |x, i| } | Runs a block with the index.
each_with_object | (obj) { |x, o| } | Runs a block carrying an object.
zip | (other) | Pairs elements from two arrays.
uniq | | Removes duplicates.
flatten | | Flattens nested arrays.
compact | | Removes nils.
group_by | { |x| } | Groups into a hash.
partition | { |x| } | Splits into two arrays.
take | (n) | First n elements.
drop | (n) | Skips n elements.
any? | { |x| } | True if any element matches.
all? | { |x| } | True if all elements match.
count | | Number of elements.
find | { |x| } | The first match.
sample | | A random element.
shuffle | | A shuffled copy.
keys | | The hash keys.
values | | The hash values.
fetch | (key, default) | A hash value, with a default.`),
  },

  swift: {
    keywords: words("associatedtype break case catch class continue default defer deinit do else enum extension fallthrough false fileprivate for func guard if import in init inout internal is let nil open operator private protocol public repeat return self Self static struct subscript super switch throw throws true try typealias var where while async await actor"),
    types: words("Int Double Float Bool String Character Array Dictionary Set Optional Any Void Date"),
    functions: parse(`
print | (items...) | Prints with a line break.
readLine | () | Reads a line of input, or nil.
min | (a, b) | The smaller value.
max | (a, b) | The larger value.
abs | (x) | Absolute value.
zip | (a, b) | Pairs elements from two sequences.
stride | (from:to:by:) | A sequence that steps by an amount.
fatalError | (message) | Stops the program.
precondition | (condition) | Stops if false.`),
    instance: parse(`
count | | Number of elements.
isEmpty | | True if empty.
append | (item) | Adds to the end.
contains | (x) | True if present.
map | { } | Transforms each element.
filter | { } | Keeps elements that match.
reduce | (initial) { } | Folds into one value.
sorted | () | A sorted copy.
joined | (separator:) | Joins into a string.
split | (separator:) | Splits into pieces.
uppercased | () | Upper-case copy.
lowercased | () | Lower-case copy.
first | | The first element.
last | | The last element.
enumerated | () | Pairs elements with their index.
forEach | { } | Runs a block for each element.
dropFirst | ([n]) | Skips the first elements.
prefix | (n) | First n elements.
hasPrefix | (s) | True if it starts with s.
hasSuffix | (s) | True if it ends with s.
trimmingCharacters | (in:) | Removes characters at both ends.`),
  },
};
