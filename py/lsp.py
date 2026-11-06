# Dexna language services: completion, hover, signatures, navigation, lint, format.
import ast
import json
import os
import sys

PROJECT = "/home/pyodide/project"
if PROJECT not in sys.path:
    sys.path.insert(0, PROJECT)

jedi = None
_project = None


def _dexna_init_jedi():
    global jedi, _project
    import jedi as _j
    jedi = _j
    jedi.settings.case_insensitive_completion = True
    jedi.settings.add_bracket_after_function = False
    _project = jedi.Project(PROJECT, added_sys_path=[PROJECT])
    # Warm up the cache with common modules so the first completion is fast.
    try:
        jedi.Script("import os, sys, math\nos.", path=PROJECT + "/__warm__.py", project=_project).complete(2, 3)
    except Exception:
        pass


def _script(src, path):
    return jedi.Script(src, path=os.path.join(PROJECT, path), project=_project)


def _rel(p):
    p = str(p) if p else ""
    return p[len(PROJECT) + 1:] if p.startswith(PROJECT + "/") else p


def lsp_complete(src, path, line, col):
    out = []
    try:
        comps = _script(src, path).complete(line, col)
    except Exception:
        return "[]"
    for i, c in enumerate(comps[:300]):
        item = {"label": c.name, "kind": c.type, "detail": c.description,
                "insert": c.name, "sort": f"{i:04d}"}
        if c.name.startswith("_"):
            item["sort"] = "z" + item["sort"]
        out.append(item)
    return json.dumps(out)


def lsp_resolve(src, path, line, col, name):
    """Documentation for one completion item (fetched lazily)."""
    try:
        for c in _script(src, path).complete(line, col):
            if c.name == name:
                sigs = c.get_signatures()
                return json.dumps({"signature": sigs[0].to_string() if sigs else "",
                                   "doc": c.docstring(raw=True)[:4000]})
    except Exception:
        pass
    return json.dumps(None)


def lsp_hover(src, path, line, col):
    try:
        names = _script(src, path).help(line, col)
    except Exception:
        return json.dumps(None)
    if not names:
        return json.dumps(None)
    n = names[0]
    try:
        sigs = n.get_signatures()
    except Exception:
        sigs = []
    head = sigs[0].to_string() if sigs else (n.description or n.name)
    if n.type == "keyword":
        head = n.name
    doc = ""
    try:
        doc = n.docstring(raw=True)
    except Exception:
        pass
    mod = n.module_name or ""
    return json.dumps({"head": head, "type": n.type, "module": mod, "doc": doc[:6000]})


def lsp_signatures(src, path, line, col):
    try:
        sigs = _script(src, path).get_signatures(line, col)
    except Exception:
        return "[]"
    out = []
    for s in sigs[:5]:
        try:
            doc = s.docstring(raw=True)
        except Exception:
            doc = ""
        out.append({"label": s.to_string(), "params": [p.to_string() for p in s.params],
                    "index": s.index if s.index is not None else -1, "doc": doc[:3000]})
    return json.dumps(out)


def _locs(names):
    out = []
    for n in names:
        if n.line is None:
            continue
        mp = str(n.module_path) if n.module_path else None
        out.append({"path": _rel(mp) if mp else None, "abs": mp, "line": n.line,
                    "col": n.column, "name": n.name, "project": bool(mp and mp.startswith(PROJECT + "/")),
                    "builtin": n.in_builtin_module()})
    return out


def lsp_definition(src, path, line, col):
    try:
        s = _script(src, path)
        names = s.goto(line, col, follow_imports=True, follow_builtin_imports=True)
        if not names:
            names = s.infer(line, col)
    except Exception:
        return "[]"
    return json.dumps(_locs(names))


def lsp_references(src, path, line, col):
    try:
        names = _script(src, path).get_references(line, col)
    except Exception:
        return "[]"
    return json.dumps([l for l in _locs(names) if l["project"] or l["path"] == path])


def lsp_highlights(src, path, line, col):
    try:
        names = _script(src, path).get_references(line, col, scope="file")
    except Exception:
        return "[]"
    return json.dumps([{"line": n.line, "col": n.column, "len": len(n.name)} for n in names if n.line])


def lsp_rename(src, path, line, col, new_name):
    try:
        ref = _script(src, path).rename(line, col, new_name=new_name)
        changed = {}
        for p, ch in ref.get_changed_files().items():
            changed[_rel(str(p))] = ch.get_new_code()
        return json.dumps({"files": changed})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ---------------------------------------------------------------- symbols
def lsp_symbols(src):
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return "[]"

    def walk(nodes, depth=0):
        out = []
        for n in nodes:
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                kind = "class" if isinstance(n, ast.ClassDef) else ("method" if depth else "function")
                detail = ""
                if not isinstance(n, ast.ClassDef):
                    try:
                        detail = "(" + ast.unparse(n.args) + ")"
                    except Exception:
                        pass
                out.append({"name": n.name, "kind": kind, "detail": detail, "line": n.lineno,
                            "col": n.col_offset + 1, "endLine": n.end_lineno, "endCol": (n.end_col_offset or 0) + 1,
                            "children": walk(n.body, depth + 1)})
            elif depth == 0 and isinstance(n, (ast.Assign, ast.AnnAssign)):
                targets = n.targets if isinstance(n, ast.Assign) else [n.target]
                for t in targets:
                    if isinstance(t, ast.Name):
                        out.append({"name": t.id, "kind": "constant" if t.id.isupper() else "variable",
                                    "detail": "", "line": n.lineno, "col": n.col_offset + 1,
                                    "endLine": n.end_lineno, "endCol": (n.end_col_offset or 0) + 1, "children": []})
        return out

    return json.dumps(walk(tree.body))


# ---------------------------------------------------------------- lint
_ERRORS = {"UndefinedName", "UndefinedExport", "UndefinedLocal", "DuplicateArgument",
           "ReturnOutsideFunction", "YieldOutsideFunction", "ContinueOutsideLoop",
           "BreakOutsideLoop", "TwoStarredExpressions", "TooManyExpressionsInStarredAssignment",
           "ForwardAnnotationSyntaxError", "PercentFormatInvalidFormat"}
_UNNECESSARY = {"UnusedImport", "UnusedVariable", "UnusedAnnotation", "RedefinedWhileUnused"}


def lsp_lint(src, path):
    out = []
    try:
        tree = compile(src, path, "exec", ast.PyCF_ONLY_AST)
    except SyntaxError as e:
        line = e.lineno or 1
        col = e.offset or 1
        end_line = getattr(e, "end_lineno", None) or line
        end_col = getattr(e, "end_offset", None) or col + 1
        if end_line == line and end_col <= col:
            end_col = col + 1
        out.append({"line": line, "col": col, "endLine": end_line, "endCol": end_col,
                    "severity": "error", "message": f"SyntaxError: {e.msg}", "code": "syntax"})
        return json.dumps(out)
    try:
        from pyflakes import checker
    except ImportError:
        return json.dumps(out)
    w = checker.Checker(tree, filename=path)
    lines = src.split("\n")
    for m in w.messages:
        name = type(m).__name__
        ln = m.lineno
        col = (m.col or 0) + 1
        text = m.message % m.message_args
        end = col + 1
        src_line = lines[ln - 1] if 0 < ln <= len(lines) else ""
        # extend the squiggle over the identifier
        j = col - 1
        while j < len(src_line) and (src_line[j].isalnum() or src_line[j] in "_."):
            j += 1
        if j > col - 1:
            end = j + 1
        if name == "UnusedImport" and m.message_args:
            mod = str(m.message_args[0]).split(" as ")[-1].split(".")[-1]
            k = src_line.find(mod)
            if k >= 0:
                col, end = k + 1, k + 1 + len(mod)
        out.append({"line": ln, "col": col, "endLine": ln, "endCol": max(end, col + 1),
                    "severity": "error" if name in _ERRORS else "warning",
                    "unnecessary": name in _UNNECESSARY, "message": text, "code": name})
    return json.dumps(out)


# ---------------------------------------------------------------- format
def lsp_format(src, line_length):
    try:
        import black
        return json.dumps({"code": black.format_str(src, mode=black.Mode(line_length=int(line_length)))})
    except ImportError:
        return json.dumps({"error": "black is not available"})
    except Exception as e:
        msg = str(e).split("\n")[0]
        return json.dumps({"error": f"Cannot format: {msg}"})


def lsp_sort_imports(src, line_length):
    try:
        import isort
        return json.dumps({"code": isort.code(src, profile="black", line_length=int(line_length))})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ---------------------------------------------------------------------------
# Repairs for code written by the Assistant. Small models sometimes get the
# indentation of a line wrong (an `else:` one level off) or drop a colon. Each
# candidate fix is checked with Python's own parser and kept only when the
# error goes away or moves past that line, so a repair never breaks code that
# Python accepts.
# ---------------------------------------------------------------------------
import re as _re

_BRANCH = _re.compile(r"^([ \t]*)(else|elif|except|finally)\b")
_HEADERS = {
    "else": ("if", "elif", "for", "async for", "while", "try", "except"),
    "elif": ("if", "elif"),
    "except": ("try", "except"),
    "finally": ("try", "except", "else"),
}
_HEADER_LINE = _re.compile(r"^[ \t]*(if|elif|else|for|async for|while|try|except|finally|with|async with|def|async def|class|match|case)\b.*$")


def _syntax_error(lines):
    try:
        compile("\n".join(lines), "<assistant>", "exec", ast.PyCF_ONLY_AST)
        return None
    except SyntaxError as e:
        return e
    except Exception:
        return None


def _ind(s):
    return len(s) - len(s.lstrip(" \t"))


def _shift(lines, i, new, children_only):
    """Re-indent line i to `new` spaces, moving its block along: the deeper lines after it,
    and (children_only=False) siblings at its old level too, until the code dedents below it."""
    old = _ind(lines[i])
    delta = new - old
    out = list(lines)
    out[i] = " " * new + lines[i].lstrip(" \t")
    for j in range(i + 1, len(lines)):
        t = lines[j]
        if not t.strip():
            continue
        k = _ind(t)
        if k < old or (children_only and k == old):
            break
        out[j] = " " * max(0, k + delta) + t.lstrip(" \t")
    return out


def _levels_above(lines, i):
    seen, out = set(), []
    for j in range(i - 1, -1, -1):
        t = lines[j]
        if t.strip() and not t.lstrip().startswith("#"):
            k = _ind(t)
            if k not in seen:
                seen.add(k)
                out.append(k)
    return out


def _candidates(lines, i, err):
    msg = err.msg or ""
    t = lines[i]
    m = _BRANCH.match(t)
    if m:  # else/elif/except/finally: line it up with the statement it belongs to
        kw = m.group(2)
        heads, seen = _HEADERS[kw], set()
        for j in range(i - 1, -1, -1):
            s = lines[j].lstrip(" \t")
            if not s or s.startswith("#"):
                continue
            k = _ind(lines[j])
            if any(_re.match(rf"{h}\b", s) for h in heads) and s.rstrip().endswith(":") and k not in seen:
                seen.add(k)
                note = f"lined up '{kw}' with the '{s.split()[0].rstrip(':')}' on line {j + 1}"
                child = next((_ind(x) for x in lines[i + 1:] if x.strip()), None)
                if child == k + 4:  # its block is already where it belongs: move only the line
                    yield lines[:i] + [" " * k + t.lstrip(" \t")] + lines[i + 1:], note
                yield _shift(lines, i, k, True), note
    if "expected ':'" in msg and _HEADER_LINE.match(t) and not t.rstrip().endswith(":"):
        code, _, comment = t.partition("  #")
        yield lines[:i] + [code.rstrip() + ":" + ("  #" + comment if comment else "")] + lines[i + 1:], f"added the missing ':' on line {i + 1}"
    if "expected an indented block" in msg:
        head = next((j for j in range(i - 1, -1, -1) if lines[j].strip() and not lines[j].lstrip().startswith("#")), None)
        if head is not None:
            yield _shift(lines, i, _ind(lines[head]) + 4, False), f"indented the block on line {i + 1}"
    if "indent" in msg or "invalid syntax" in msg:  # try the indentation levels used above
        for k in _levels_above(lines, i):
            if k != _ind(t):
                yield _shift(lines, i, k, False), f"fixed the indentation of line {i + 1}"


def _loop_breaks(lines, j, i):
    """Can the loop starting on line j (its body ending before line i) end early: its own break, or a return/raise?"""
    k = _ind(lines[j])
    stack = []  # (indent, is_loop) of headers inside the body
    for q in range(j + 1, i):
        s = lines[q]
        if not s.strip() or s.lstrip().startswith("#"):
            continue
        d = _ind(s)
        while stack and stack[-1][0] >= d:
            stack.pop()
        body = s.lstrip()
        if _re.match(r"(return|raise)\b", body) or _re.search(r":\s*(return|raise)\b", body):  # leaves the loop too, so the else means something
            return True
        if _re.search(r"^(if|elif|else|try|except|finally|with)\b[^#]*:\s*break\b", body) and not any(is_loop for _, is_loop in stack):  # `if x: break`
            return True
        if _re.match(r"break\b", body) and not any(is_loop for _, is_loop in stack):
            return True
        if body.rstrip().endswith(":"):
            stack.append((d, bool(_re.match(r"(async\s+)?(for|while)\b", body))))
    return False


def _loop_else(lines):
    """An `else:` attached to a for/while loop whose body ends with an if/elif chain one level in
    almost always belongs to that `if` (beginners rarely mean for-else). Returns (lines, note) or None."""
    for i, t in enumerate(lines):
        m = _re.match(r"^([ \t]*)else\s*:", t)
        if not m:
            continue
        k = _ind(t)
        # the statement this else belongs to: the nearest line above at the same indentation
        j = next((j for j in range(i - 1, -1, -1) if lines[j].strip() and not lines[j].lstrip().startswith("#") and _ind(lines[j]) <= k), None)
        if j is None or _ind(lines[j]) != k or not _re.match(r"(async\s+)?(for|while)\b", lines[j].lstrip()):
            continue
        # a loop's else is certainly a mistake only when it is pointless: the loop has no break of its
        # own (the else always runs), or it is `while True` (it only ends by break, so the else never runs)
        if not (_re.match(r"while\s+(True|1)\s*:", lines[j].lstrip()) or not _loop_breaks(lines, j, i)):
            continue
        # the last statement of the loop body (one level in) must be an if/elif branch
        inner = None
        for q in range(i - 1, j, -1):
            s = lines[q]
            if s.strip() and not s.lstrip().startswith("#") and _ind(s) > k:
                level = min(_ind(lines[r]) for r in range(j + 1, i) if lines[r].strip() and not lines[r].lstrip().startswith("#"))
                if _ind(s) == level and _re.match(r"(if|elif)\b", s.lstrip()):
                    inner = (q, level)
                    break
                if _ind(s) == level:
                    break
        if not inner:
            continue
        q, level = inner
        cand = _shift(lines, i, level, True)
        child = next((_ind(x) for x in lines[i + 1:] if x.strip()), None)
        if child == level + 4:
            cand = lines[:i] + [" " * level + t.lstrip(" \t")] + lines[i + 1:]
        if _syntax_error(cand) is None:
            return cand, f"moved the 'else' on line {i + 1} to the 'if' on line {q + 1} (it was attached to the loop)"
    return None


def lsp_repair(src, semantic=True):
    lines = src.split("\n")
    notes = []
    for _ in range(40):
        err = _syntax_error(lines)
        if err is None or not err.lineno or err.lineno > len(lines):
            break
        i = err.lineno - 1
        fixed = None
        for cand, note in _candidates(lines, i, err):
            e2 = _syntax_error(cand)
            if e2 is None or (e2.lineno or 0) > err.lineno:
                fixed = (cand, note)
                break
        if not fixed:
            break
        lines, note = fixed
        notes.append(note)
    if semantic and _syntax_error(lines) is None:
        for _ in range(10):
            r = _loop_else(lines)
            if not r:
                break
            lines, note = r
            notes.append(note)
    return json.dumps({"code": "\n".join(lines), "notes": notes, "ok": _syntax_error(lines) is None})
