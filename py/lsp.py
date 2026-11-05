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
