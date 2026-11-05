# Dexna kernel: runs user programs, the interactive console and the debugger.
import ast
import base64
import builtins
import importlib.util
import io
import json
import os
import reprlib
import sys
import time
import traceback
import types

from dexna_bridge import post, wait_reply, has_channel

PROJECT = "/home/pyodide/project"
_ns = {}
_repr = reprlib.Repr()
_repr.maxstring = 160
_repr.maxother = 160
_repr.maxlist = _repr.maxtuple = _repr.maxdict = _repr.maxset = 12


def _reset():
    global _ns
    _ns = {"__name__": "__main__", "__builtins__": builtins, "__doc__": None}
    return _ns


_reset()
if PROJECT not in sys.path:
    sys.path.insert(0, PROJECT)


def _rel(path):
    return path[len(PROJECT) + 1:] if path.startswith(PROJECT + "/") else path


# ---------------------------------------------------------------- matplotlib
def _setup_mpl():
    if "matplotlib" not in sys.modules and importlib.util.find_spec("matplotlib") is None:
        return
    os.environ["MPLBACKEND"] = "AGG"
    import matplotlib
    matplotlib.use("AGG")
    import matplotlib.pyplot as plt
    if getattr(plt, "_dexna", False):
        return

    def show(*args, **kwargs):
        for num in plt.get_fignums():
            fig = plt.figure(num)
            buf = io.BytesIO()
            fig.savefig(buf, format="png", dpi=110, bbox_inches="tight")
            post("plot", base64.b64encode(buf.getvalue()).decode())
        plt.close("all")

    plt.show = show
    plt._dexna = True


def _flush_plots():
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is not None and getattr(plt, "_dexna", False) and plt.get_fignums():
        plt.show()


# ---------------------------------------------------------------- imports
def _top_level_imports(src):
    """Absolute top-level module names imported by `src` (relative imports are skipped)."""
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return set()
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.update(a.name.split(".")[0] for a in node.names)
        elif isinstance(node, ast.ImportFrom) and not node.level and node.module:
            names.add(node.module.split(".")[0])
    return names


def _project_module_names():
    out = set()
    for root, dirs, files in os.walk(PROJECT):
        for f in files:
            if f.endswith(".py"):
                out.add(f[:-3])
        out.update(dirs)
    return out


def _dexna_missing_imports(sources):
    """Imports that are neither installed, stdlib, nor modules of the project."""
    local = _project_module_names()
    wanted = set()
    for src in sources:
        wanted |= _top_level_imports(src)
    out = []
    for n in sorted(wanted):
        if n in local or n in sys.builtin_module_names or n in sys.stdlib_module_names or n == "__future__":
            continue
        try:
            if importlib.util.find_spec(n) is not None:
                continue
        except Exception:
            continue
        out.append(n)
    return out


def _purge_project_modules():
    for name, mod in list(sys.modules.items()):
        f = getattr(mod, "__file__", None) or ""
        if f.startswith(PROJECT + "/"):
            del sys.modules[name]
    importlib.invalidate_caches()


# ---------------------------------------------------------------- errors
def _format_exc(e):
    tb = e.__traceback__
    while tb is not None:
        fn = tb.tb_frame.f_code.co_filename
        if fn.startswith(PROJECT) or fn == "<console>":
            break
        tb = tb.tb_next
    text = "".join(traceback.format_exception(type(e), e, tb))
    return text.replace(PROJECT + "/", "")


# ---------------------------------------------------------------- summaries
def _summary(name, v):
    t = type(v)
    size = ""
    shape = getattr(v, "shape", None)
    if isinstance(shape, tuple):
        size = "×".join(map(str, shape))
    else:
        try:
            if not isinstance(v, (str, bytes)) and hasattr(v, "__len__"):
                size = str(len(v))
            elif isinstance(v, (str, bytes)):
                size = str(len(v))
        except Exception:
            pass
    try:
        r = _repr.repr(v)
    except Exception as ex:
        r = f"<repr failed: {ex}>"
    expandable = isinstance(v, (dict, list, tuple, set)) or hasattr(v, "__dict__") and not isinstance(v, type)
    return {"name": name, "type": t.__qualname__, "module": t.__module__, "size": size,
            "value": r, "expandable": bool(expandable)}


def _visible(k, v):
    return not (k.startswith("_") or isinstance(v, types.ModuleType)
                or k in ("In", "Out", "exit", "quit", "get_ipython"))


def _vars_of(d):
    out = []
    for k, v in list(d.items()):
        if _visible(k, v):
            s = _summary(k, v)
            s["kind"] = ("function" if isinstance(v, (types.FunctionType, types.BuiltinFunctionType))
                         else "class" if isinstance(v, type) else "data")
            out.append(s)
    return out


def _dexna_vars():
    return json.dumps(_vars_of(_ns))


def _dexna_inspect(path):
    """Children of a variable, addressed as 'name', 'name[0]', 'name.attr'."""
    try:
        obj = eval(path, _ns)
    except Exception as e:
        return json.dumps({"error": str(e)})
    items = []
    if isinstance(obj, dict):
        for i, (k, v) in enumerate(obj.items()):
            if i >= 200:
                break
            s = _summary(repr(k), v)
            s["path"] = f"{path}[{k!r}]"
            items.append(s)
    elif isinstance(obj, (list, tuple)):
        for i, v in enumerate(obj[:200]):
            s = _summary(f"[{i}]", v)
            s["path"] = f"{path}[{i}]"
            items.append(s)
    elif isinstance(obj, set):
        for i, v in enumerate(list(obj)[:200]):
            s = _summary(f"{{{i}}}", v)
            s["path"] = None
            items.append(s)
    else:
        for k, v in list(getattr(obj, "__dict__", {}).items())[:200]:
            if k.startswith("__"):
                continue
            s = _summary(k, v)
            s["path"] = f"{path}.{k}"
            items.append(s)
    return json.dumps({"items": items})


# ---------------------------------------------------------------- debugger
class Debugger:
    def __init__(self, breakpoints, stop_on_entry):
        self.bps = breakpoints
        self.mode = "step" if stop_on_entry else "continue"
        self.target = 0

    @staticmethod
    def _depth(frame):
        d = 0
        while frame is not None:
            d += 1
            frame = frame.f_back
        return d

    def run(self, code, ns):
        sys.settrace(self.trace_call)
        try:
            exec(code, ns)
        finally:
            sys.settrace(None)

    def trace_call(self, frame, event, arg):
        if not frame.f_code.co_filename.startswith(PROJECT + "/"):
            return None
        return self.trace_line

    def trace_line(self, frame, event, arg):
        if event == "line":
            fn = _rel(frame.f_code.co_filename)
            ln = frame.f_lineno
            stop = False
            if ln in self.bps.get(fn, ()):
                stop = True
            elif self.mode == "step":
                stop = True
            elif self.mode == "over" and self._depth(frame) <= self.target:
                stop = True
            elif self.mode == "out" and self._depth(frame) < self.target:
                stop = True
            if stop:
                self.pause(frame, fn, ln)
        elif event == "exception" and self.mode != "continue":
            pass
        return self.trace_line

    def pause(self, frame, fn, ln):
        stack = []
        f = frame
        while f is not None:
            if f.f_code.co_filename.startswith(PROJECT + "/"):
                stack.append({"name": f.f_code.co_name, "file": _rel(f.f_code.co_filename), "line": f.f_lineno})
            f = f.f_back
        info = {"file": fn, "line": ln, "stack": stack, "locals": _vars_of(frame.f_locals)}
        if frame.f_locals is not frame.f_globals:
            info["globals"] = _vars_of(frame.f_globals)
        cmd = wait_reply("paused", json.dumps(info))
        while True:
            if cmd.startswith("eval:"):
                expr = cmd[5:]
                try:
                    res = _repr.repr(eval(expr, frame.f_globals, frame.f_locals))
                except Exception as e:
                    res = f"{type(e).__name__}: {e}"
                cmd = wait_reply("eval-result", json.dumps({"expr": expr, "result": res}))
                continue
            if cmd.startswith("bps:"):
                self.bps = {k: set(v) for k, v in json.loads(cmd[4:]).items()}
                cmd = wait_reply("ack", "")
                continue
            break
        if cmd == "stop":
            raise KeyboardInterrupt("debugger stopped")
        self.mode = cmd
        self.target = self._depth(frame)
        post("resumed", "")


# ---------------------------------------------------------------- entry points
def _dexna_run(path, debug, breakpoints_json, stop_on_entry):
    _purge_project_modules()
    os.chdir(PROJECT)
    full = os.path.join(PROJECT, path)
    with open(full, encoding="utf-8") as fh:
        src = fh.read()
    ns = _reset()
    ns["__file__"] = full
    sys.argv = [full]
    try:
        _setup_mpl()
    except Exception:
        pass
    ok = True
    t0 = time.perf_counter()
    try:
        code = compile(src, full, "exec")
        if debug:
            bps = {k: set(v) for k, v in json.loads(breakpoints_json).items()}
            Debugger(bps, stop_on_entry).run(code, ns)
        else:
            exec(code, ns)
    except SystemExit as e:
        if e.code not in (None, 0):
            ok = False
            sys.stderr.write(f"SystemExit: {e.code}\n")
    except BaseException as e:
        ok = False
        sys.stderr.write(_format_exc(e))
    finally:
        try:
            _flush_plots()
        except Exception:
            pass
        sys.stdout.flush()
        sys.stderr.flush()
    return json.dumps({"ok": ok, "time": time.perf_counter() - t0})


async def _dexna_repl(src):
    from pyodide.code import eval_code_async
    try:
        _setup_mpl()
    except Exception:
        pass
    ok = True
    t0 = time.perf_counter()
    try:
        res = await eval_code_async(src, _ns, filename="<console>")
        if res is not None:
            _ns["_"] = res
            print(repr(res))
    except SystemExit:
        pass
    except BaseException as e:
        ok = False
        sys.stderr.write(_format_exc(e))
    finally:
        try:
            _flush_plots()
        except Exception:
            pass
        sys.stdout.flush()
        sys.stderr.flush()
    return json.dumps({"ok": ok, "time": time.perf_counter() - t0})


def _dexna_is_complete(src):
    """'complete', 'incomplete' or 'invalid' — used by the console for multi-line input."""
    import codeop
    try:
        if src.rstrip("\n").endswith(":") or src.endswith("\\"):
            return "incomplete"
        r = codeop.compile_command(src, "<console>", "exec")
        if r is None:
            return "incomplete"
        # a block statement is only finished by a blank line
        lines = src.rstrip("\n").split("\n")
        if len(lines) > 1 and lines[-1].startswith((" ", "\t")):
            return "incomplete"
        return "complete"
    except (SyntaxError, OverflowError, ValueError):
        return "invalid"


def _dexna_list_packages():
    import micropip
    pk = micropip.list()
    return json.dumps(sorted(({"name": p.name, "version": p.version, "source": p.source} for p in pk.values()),
                             key=lambda x: x["name"].lower()))
