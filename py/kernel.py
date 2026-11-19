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

from dexna_bridge import post, wait_reply, has_channel, flush as _flush_output

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

# Show what was printed before a pause right away: while time.sleep runs, Python blocks the worker,
# so output waiting to be sent would otherwise only appear after the sleep.
_orig_sleep = time.sleep


def _dexna_sleep(secs):
    if isinstance(secs, (str, bytes, bytearray)) or secs is None or isinstance(secs, complex):
        raise TypeError(f"'{type(secs).__name__}' object cannot be interpreted as an integer")
    secs = float(secs)
    if secs != secs:
        raise ValueError("Invalid value NaN (not a number)")
    if secs < 0:
        raise ValueError("sleep length must be non-negative")
    try:
        sys.stdout.flush()
        sys.stderr.flush()
        _flush_output()
    except Exception:
        pass
    # Sleep in short steps: Python checks for the Stop button between steps, never inside one.
    end = time.monotonic() + secs
    while True:
        left = end - time.monotonic()
        if left <= 0:
            return None
        _orig_sleep(min(0.05, left))


_dexna_sleep.__doc__ = _orig_sleep.__doc__
time.sleep = _dexna_sleep


# asyncio.run: the browser's own event loop cannot be waited on from a normal (synchronous) program,
# so programs get a small event loop of their own. It runs timers, tasks, gather, queues and so on;
# it has no sockets (networking in the browser goes through pyodide.http instead).
import asyncio
import selectors
from asyncio import selector_events as _selector_events


class _NoSocketSelector(selectors.BaseSelector):
    def register(self, fileobj, events, data=None):
        raise OSError("Sockets are not available to programs running in the browser")

    def unregister(self, fileobj):
        raise KeyError(fileobj)

    loop = None

    def select(self, timeout=None):
        # Nothing can arrive from outside: wait for the next timer, in short steps (time.sleep notices
        # Stop), and wake up early when something was scheduled meanwhile, such as asyncio's own
        # handling of Stop, which cancels the program's tasks.
        end = time.monotonic() + (0.05 if timeout is None else max(0.0, timeout))
        while True:
            left = end - time.monotonic()
            if left <= 0 or (self.loop is not None and self.loop._ready):
                return []
            time.sleep(min(0.05, left))

    def close(self):
        pass

    def get_map(self):
        return {}


class _DexnaEventLoop(_selector_events.BaseSelectorEventLoop):
    def __init__(self):
        selector = _NoSocketSelector()
        super().__init__(selector)
        selector.loop = self

    def _make_self_pipe(self):
        pass

    def _close_self_pipe(self):
        pass

    def _write_to_self(self):
        pass


_orig_asyncio_run = asyncio.run


def _dexna_asyncio_run(main, *, debug=None, loop_factory=None):
    from asyncio import events
    # the browser's loop counts as "running" for the whole page; step it aside while the program's loop runs
    outer = events._get_running_loop()
    events._set_running_loop(None)
    try:
        with asyncio.Runner(debug=debug, loop_factory=loop_factory or _DexnaEventLoop) as runner:
            return runner.run(main)
    finally:
        events._set_running_loop(outer)


_dexna_asyncio_run.__doc__ = _orig_asyncio_run.__doc__
asyncio.run = _dexna_asyncio_run

# threads: say why they are missing instead of "can't start new thread"
import threading

_orig_thread_start = threading.Thread.start


def _dexna_thread_start(self):
    try:
        return _orig_thread_start(self)
    except RuntimeError as e:
        raise RuntimeError("can't start new thread: Python in the browser (Pyodide) has no threads. "
                           "Call the function directly, or use asyncio for things that run side by side.") from None


threading.Thread.start = _dexna_thread_start

# getpass: read the password like input() (the terminal cannot hide what you type)
import getpass


def _dexna_getpass(prompt="Password: ", stream=None):
    return input(prompt)


getpass.getpass = _dexna_getpass

# exit() and quit() close sys.stdin before stopping, which would break input() for every later run
class _DexnaQuitter:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f"Use {self.name}() or Ctrl-D (i.e. EOF) to exit"

    def __call__(self, code=None):
        raise SystemExit(code)


builtins.exit = _DexnaQuitter("exit")
builtins.quit = _DexnaQuitter("quit")

# warnings: show file names the way the editor does (main.py:3, not the full path)
import warnings

_orig_formatwarning = warnings.formatwarning
warnings.formatwarning = lambda *a, **kw: _orig_formatwarning(*a, **kw).replace(PROJECT + "/", "")

# help(): print the documentation instead of trying to open a pager
import pydoc


def _dexna_pager(text, title=""):
    sys.stdout.write(pydoc.plain(text) + "\n")


pydoc.pager = _dexna_pager
pydoc.getpager = lambda: _dexna_pager

# os.system: "cls" / "clear" clear the terminal; other commands cannot run in the browser
_orig_system = os.system


def _dexna_system(command):
    cmd = str(command).strip().lower()
    if cmd in ("cls", "clear", "clear -x", "tput clear"):
        sys.stdout.flush()
        sys.stderr.flush()
        post("clear", "")
        return 0
    sys.stderr.write(f"[Dexna] os.system({command!r}) cannot run here: programs in the browser cannot start other programs.\n")
    return -1


os.system = _dexna_system

_HINTS = {
    "turtle": "turtle draws in a desktop window, which Python in the browser does not have. matplotlib can draw instead (plots show in the Plots tab).",
    "tkinter": "tkinter opens desktop windows, which Python in the browser does not have. For a user interface, try a web page project (HTML/CSS/JavaScript).",
    "_tkinter": "tkinter opens desktop windows, which Python in the browser does not have.",
    "pygame": "pygame needs a desktop window and sound device, which Python in the browser does not have.",
    "readline": "readline is not available in the browser; input() works without it.",
}

if PROJECT not in sys.path:
    sys.path.insert(0, PROJECT)
if "/home/pyodide/.dexna" not in sys.path:
    sys.path.append("/home/pyodide/.dexna")  # Dexna's curses (a project file called curses.py still wins)


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
        if fn.startswith(PROJECT) or fn in ("<console>", "<cell>"):
            break
        tb = tb.tb_next
    frames = traceback.extract_tb(tb) if tb is not None else []
    if any(f.filename.startswith("<dexna") for f in frames):
        # leave Dexna's own helpers (like its time.sleep) out, so the traceback shows only your code
        mine = [f for f in frames if not f.filename.startswith("<dexna")]
        text = ("Traceback (most recent call last):\n" + "".join(traceback.format_list(mine)) if mine else "") + "".join(traceback.format_exception_only(type(e), e))
    else:
        text = "".join(traceback.format_exception(type(e), e, tb))
    text = text.replace(PROJECT + "/", "")
    if isinstance(e, ModuleNotFoundError) and (e.name or "").split(".")[0] in _HINTS:
        text += f"[Dexna] {_HINTS[e.name.split('.')[0]]}\n"
    return text


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


# ---------------------------------------------------------------- run options
class _QueuedStdin:
    """Serves prepared input lines first (echoing them like typing), then falls back to the keyboard."""

    def __init__(self, text, fallback):
        self.lines = text.splitlines(True) if text else []
        if self.lines and not self.lines[-1].endswith("\n"):
            self.lines[-1] += "\n"
        self.fallback = fallback

    def readline(self, size=-1):
        if self.lines:
            line = self.lines.pop(0)
            sys.stdout.write(line)  # show it in the terminal as if it had been typed
            return line
        return self.fallback.readline()

    def read(self, size=-1):
        if self.lines:
            text, self.lines = "".join(self.lines), []
            return text
        return self.fallback.read()

    def readlines(self):
        out = []
        while True:
            line = self.readline()
            if not line:
                return out
            out.append(line)

    def __iter__(self):
        return self

    def __next__(self):
        line = self.readline()
        if not line:
            raise StopIteration
        return line

    def isatty(self):
        return False

    def fileno(self):
        raise io.UnsupportedOperation("fileno")

    @property
    def encoding(self):
        return "utf-8"


def _rel(path):
    return path[len(PROJECT) + 1:] if path.startswith(PROJECT + "/") else path


class _Coverage:
    """Which lines of the project's own files ran (sys.monitoring, so it costs little)."""

    def __init__(self):
        self.hits = {}
        self.mon = getattr(sys, "monitoring", None)
        self.tool = None

    def __enter__(self):
        m = self.mon
        if m is not None:
            for tool in (m.COVERAGE_ID, 4, 5):
                try:
                    m.use_tool_id(tool, "dexna-coverage")
                    self.tool = tool
                    break
                except ValueError:
                    continue
        if self.tool is not None:
            def on_line(code, line):
                f = code.co_filename
                if f.startswith(PROJECT + "/"):
                    self.hits.setdefault(f, set()).add(line)
                return m.DISABLE  # each line only needs to be seen once
            m.register_callback(self.tool, m.events.LINE, on_line)
            m.set_events(self.tool, m.events.LINE)
        else:  # older Python: a trace function
            def tracer(frame, event, arg):
                if not frame.f_code.co_filename.startswith(PROJECT + "/"):
                    return None
                if event == "line":
                    self.hits.setdefault(frame.f_code.co_filename, set()).add(frame.f_lineno)
                return tracer
            self.old_trace = sys.gettrace()
            sys.settrace(tracer)
        return self

    def __exit__(self, *exc):
        if self.tool is not None:
            self.mon.set_events(self.tool, 0)
            self.mon.register_callback(self.tool, self.mon.events.LINE, None)
            self.mon.free_tool_id(self.tool)
        else:
            sys.settrace(self.old_trace)
        return False

    @staticmethod
    def executable(path):
        """Every line that holds code (not blank lines, comments or docstrings)."""
        try:
            with open(path, encoding="utf-8") as fh:
                code = compile(fh.read(), path, "exec")
        except Exception:
            return set()
        lines, stack = set(), [code]
        while stack:
            c = stack.pop()
            for _, _, ln in c.co_lines():
                if ln is not None:
                    lines.add(ln)
            stack.extend(k for k in c.co_consts if isinstance(k, types.CodeType))
        try:  # a docstring is not code you need to run
            tree = ast.parse(open(path, encoding="utf-8").read())
            for node in ast.walk(tree):
                if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.body:
                    first = node.body[0]
                    if isinstance(first, ast.Expr) and isinstance(getattr(first, "value", None), ast.Constant) and isinstance(first.value.value, str):
                        lines -= set(range(first.lineno, (first.end_lineno or first.lineno) + 1))
        except Exception:
            pass
        lines.discard(0)
        return lines

    def report(self):
        out = {}
        for path, hit in self.hits.items():
            lines = self.executable(path)
            if lines:
                out[_rel(path)] = {"hit": sorted(hit & lines), "missed": sorted(lines - hit)}
        return out


def _profile_rows(prof):
    import pstats
    st = pstats.Stats(prof)
    rows = []
    for (fname, line, func), (cc, nc, tt, ct, callers) in st.stats.items():
        mine = fname.startswith(PROJECT + "/")
        if fname.startswith("<dexna") or "dexna_bridge" in fname:
            continue
        rows.append({"file": _rel(fname) if mine else (fname if fname != "~" else ""), "line": line, "func": func, "calls": nc, "prim": cc, "own": tt, "total": ct, "mine": mine})
    rows.sort(key=lambda r: -r["total"])
    return rows[:400]


# ---------------------------------------------------------------- entry points
def _dexna_run(path, debug, breakpoints_json, stop_on_entry, opts_json="{}"):
    import linecache
    linecache.clearcache()  # tracebacks and warnings must quote the files as they are now
    _purge_project_modules()
    os.chdir(PROJECT)
    full = os.path.join(PROJECT, path)
    with open(full, encoding="utf-8") as fh:
        src = fh.read()
    ns = _reset()
    ns["__file__"] = full
    opts = json.loads(opts_json or "{}")
    sys.argv = [full] + [str(a) for a in opts.get("args") or []]
    saved_env = dict(os.environ)
    os.environ.update({str(k): str(v) for k, v in (opts.get("env") or {}).items()})
    saved_stdin = sys.stdin
    if opts.get("stdin"):
        sys.stdin = _QueuedStdin(opts["stdin"], saved_stdin)
    mode = opts.get("mode") or "run"
    extra = {}
    try:
        _setup_mpl()
    except Exception:
        pass
    ok = True
    t0 = time.perf_counter()
    cov = prof = None
    try:
        code = compile(src, full, "exec")
        if debug:
            bps = {k: set(v) for k, v in json.loads(breakpoints_json).items()}
            Debugger(bps, stop_on_entry).run(code, ns)
        elif mode == "coverage":
            cov = _Coverage()
            with cov:
                exec(code, ns)
        elif mode == "profile":
            try:
                import cProfile as _prof_mod
            except ImportError:
                import profile as _prof_mod
            prof = _prof_mod.Profile()
            prof.enable()
            try:
                exec(code, ns)
            finally:
                prof.disable()
        else:
            exec(code, ns)
    except SystemExit as e:
        # like real Python: sys.exit("message") prints the message; sys.exit(3) just ends with that code
        if e.code not in (None, 0):
            ok = False
            if not isinstance(e.code, int):
                sys.stderr.write(f"{e.code}\n")
    except BaseException as e:
        ok = False
        sys.stderr.write(_format_exc(e))
    finally:
        elapsed = time.perf_counter() - t0
        sys.stdin = saved_stdin
        os.environ.clear()
        os.environ.update(saved_env)
        try:
            if cov is not None:
                extra["coverage"] = cov.report()
            if prof is not None:
                extra["profile"] = _profile_rows(prof)
        except Exception as e:
            sys.stderr.write(f"[Dexna] Could not collect the {mode} results: {e}\n")
        try:
            _flush_plots()
        except Exception:
            pass
        sys.stdout.flush()
        sys.stderr.flush()
    return json.dumps({"ok": ok, "time": elapsed, **extra})


# ---------------------------------------------------------------- tests
def _assert_detail(tb, test_file):
    """The failing line in the test file, and the values of the names on it."""
    frames = [f for f in traceback.walk_tb(tb) if f[0].f_code.co_filename == test_file]
    if not frames:
        frames = [f for f in traceback.walk_tb(tb) if f[0].f_code.co_filename.startswith(PROJECT + "/")]
    if not frames:
        return None, None, {}
    frame, line = frames[-1]
    import linecache
    src = linecache.getline(frame.f_code.co_filename, line).strip()
    values = {}
    try:
        for node in ast.walk(ast.parse(src if not src.startswith(("elif", "else")) else "pass")):
            if isinstance(node, ast.Name) and node.id in frame.f_locals and not node.id.startswith("__"):
                v = frame.f_locals[node.id]
                if not callable(v) or isinstance(v, (list, dict, tuple, set)):
                    values[node.id] = _repr.repr(v)
            elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and len(values) < 8:
                try:  # show what a simple call like f(2) returned
                    seg = ast.unparse(node)
                    if len(seg) < 60 and all(isinstance(a, (ast.Constant, ast.Name)) for a in node.args):
                        values[seg] = _repr.repr(eval(compile(seg, "<dexna-test>", "eval"), frame.f_globals, dict(frame.f_locals)))
                except Exception:
                    pass
    except SyntaxError:
        pass
    return line, src, values


def _dexna_tests(spec_json):
    """Find and run tests: unittest.TestCase classes, Test* classes and test_* functions (pytest style)."""
    import inspect
    import unittest
    spec = json.loads(spec_json)
    only = set(spec.get("only") or [])
    import linecache
    linecache.clearcache()
    _purge_project_modules()
    os.chdir(PROJECT)
    results = []

    def record(tid, rel, name, line, status, t0, message="", detail=None):
        r = {"id": tid, "file": rel, "name": name, "line": line, "status": status, "time": time.perf_counter() - t0, "message": message}
        if detail:
            r.update(detail)
        results.append(r)
        post("test-result", json.dumps(r))

    def failure(e, test_file):
        line, src, values = _assert_detail(e.__traceback__, test_file)
        msg = str(e) or (f"assert {src[len('assert'):].strip()}" if src and src.startswith("assert") else type(e).__name__)
        if not isinstance(e, AssertionError):
            msg = f"{type(e).__name__}: {e}"
        return msg, {"failLine": line, "source": src, "values": values, "trace": _format_exc(e)}

    for rel in spec.get("files", []):
        full = os.path.join(PROJECT, rel)
        modname = "dexna_test_" + rel[:-3].replace("/", "_").replace(".", "_")
        t0 = time.perf_counter()
        try:
            s = importlib.util.spec_from_file_location(modname, full)
            mod = importlib.util.module_from_spec(s)
            sys.modules[modname] = mod
            s.loader.exec_module(mod)
        except BaseException as e:
            msg, det = failure(e, full)
            record(rel, rel, rel, 1, "error", t0, "Could not import the file: " + msg, det)
            continue
        for name, obj in list(vars(mod).items()):
            if getattr(obj, "__module__", None) != modname:
                continue
            if inspect.isfunction(obj) and name.startswith("test"):
                tid = f"{rel}::{name}"
                if only and tid not in only and rel not in only:
                    continue
                line = obj.__code__.co_firstlineno
                t0 = time.perf_counter()
                params = [p for p in inspect.signature(obj).parameters.values() if p.default is inspect.Parameter.empty]
                if params:
                    record(tid, rel, name, line, "skip", t0, f"Needs pytest fixtures ({', '.join(p.name for p in params)}), which Dexna does not provide")
                    continue
                try:
                    obj()
                    record(tid, rel, name, line, "pass", t0)
                except AssertionError as e:
                    msg, det = failure(e, full)
                    record(tid, rel, name, line, "fail", t0, msg, det)
                except BaseException as e:
                    if type(e).__name__ in ("Skipped", "SkipTest"):
                        record(tid, rel, name, line, "skip", t0, str(e))
                        continue
                    if isinstance(e, KeyboardInterrupt):
                        raise
                    msg, det = failure(e, full)
                    record(tid, rel, name, line, "error", t0, msg, det)
            elif inspect.isclass(obj) and (issubclass(obj, unittest.TestCase) or name.startswith("Test")):
                methods = [m for m in dir(obj) if m.startswith("test") and callable(getattr(obj, m))]
                for m in methods:
                    tid = f"{rel}::{name}::{m}"
                    if only and tid not in only and rel not in only and f"{rel}::{name}" not in only:
                        continue
                    fn = getattr(obj, m)
                    line = getattr(getattr(fn, "__code__", None), "co_firstlineno", 1)
                    t0 = time.perf_counter()
                    if issubclass(obj, unittest.TestCase):
                        res = unittest.TestResult()
                        obj(m).run(res)
                        if res.skipped:
                            record(tid, rel, f"{name}.{m}", line, "skip", t0, res.skipped[0][1])
                        elif res.failures or res.errors:
                            case, text = (res.failures or res.errors)[0]
                            status = "fail" if res.failures else "error"
                            last = text.strip().splitlines()[-1] if text.strip() else status
                            ln = None
                            for mt in __import__("re").finditer(r'File "([^"]+)", line (\d+)', text):
                                if mt.group(1) == full:
                                    ln = int(mt.group(2))
                            record(tid, rel, f"{name}.{m}", line, status, t0, last, {"failLine": ln, "source": linecache.getline(full, ln).strip() if ln else "", "values": {}, "trace": text.replace(PROJECT + "/", "")})
                        else:
                            record(tid, rel, f"{name}.{m}", line, "pass", t0)
                    else:  # a plain Test* class, pytest style
                        try:
                            inst = obj()
                            if hasattr(inst, "setup_method"):
                                inst.setup_method(getattr(inst, m))
                            getattr(inst, m)()
                            if hasattr(inst, "teardown_method"):
                                inst.teardown_method(getattr(inst, m))
                            record(tid, rel, f"{name}.{m}", line, "pass", t0)
                        except AssertionError as e:
                            msg, det = failure(e, full)
                            record(tid, rel, f"{name}.{m}", line, "fail", t0, msg, det)
                        except BaseException as e:
                            if isinstance(e, KeyboardInterrupt):
                                raise
                            msg, det = failure(e, full)
                            record(tid, rel, f"{name}.{m}", line, "error", t0, msg, det)
    sys.stdout.flush()
    sys.stderr.flush()
    return json.dumps(results)


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


def _rich(obj):
    """Show a value the way a notebook does: as HTML when it has an HTML form (pandas tables), else its repr."""
    html = None
    try:
        if hasattr(obj, "_repr_html_") and not isinstance(obj, type):
            html = obj._repr_html_()
    except Exception:
        html = None
    if html:
        sys.stdout.flush()
        post("display", json.dumps({"html": html, "text": repr(obj)}))
    else:
        print(repr(obj))


def display(*objs, **kwargs):
    """Show values in the notebook output (like Jupyter's display())."""
    for o in objs:
        _rich(o)


builtins.display = display


async def _dexna_cell(src):
    """Run one notebook cell in the shared namespace; its last expression is displayed."""
    from pyodide.code import eval_code_async
    try:
        _setup_mpl()
    except Exception:
        pass
    ok = True
    t0 = time.perf_counter()
    try:
        res = await eval_code_async(src, _ns, filename="<cell>")
        if res is not None and not src.rstrip().endswith(";"):  # a trailing ; hides the value, as in Jupyter
            _ns["_"] = res
            _rich(res)
    except SystemExit:
        pass
    except BaseException as e:
        ok = False
        sys.stderr.write(_format_exc(e).replace('File "<cell>", ', "Cell, "))
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
