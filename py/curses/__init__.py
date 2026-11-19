"""curses for Dexna.

Python in the browser has no terminal for the real curses library to drive, so this module draws
windows into a character grid that Dexna shows in the terminal panel, and reads keys from it.
It follows the standard curses API: initscr/endwin/wrapper, windows and subwindows, pads, colours
and attributes, line drawing, getch/getkey/get_wch/getstr with nodelay/timeout/halfdelay, keypad,
echo/noecho, cbreak/raw, curs_set, napms, beep, and resizing.
"""
import json as _json
import sys as _sys
import time as _time

from dexna_bridge import post as _post, wait_reply as _wait, has_channel as _has_channel

__all__ = []
version = b"2.2"
ncurses_version = (6, 4, 0)


class error(Exception):
    pass


ERR = -1
OK = 0

# ---------------------------------------------------------------- attributes and colours
A_NORMAL = 0
A_ATTRIBUTES = 0xFFFFFF00
A_CHARTEXT = 0xFF
A_COLOR = 0xFF00
A_STANDOUT = 0x10000
A_UNDERLINE = 0x20000
A_REVERSE = 0x40000
A_BLINK = 0x80000
A_DIM = 0x100000
A_BOLD = 0x200000
A_ALTCHARSET = 0x400000
A_INVIS = 0x800000
A_PROTECT = 0x1000000
A_HORIZONTAL = A_LEFT = A_LOW = A_RIGHT = A_TOP = A_VERTICAL = 0
A_ITALIC = 0x80000000
WA_NORMAL, WA_STANDOUT, WA_UNDERLINE, WA_REVERSE, WA_BLINK, WA_DIM, WA_BOLD = A_NORMAL, A_STANDOUT, A_UNDERLINE, A_REVERSE, A_BLINK, A_DIM, A_BOLD

COLOR_BLACK, COLOR_RED, COLOR_GREEN, COLOR_YELLOW, COLOR_BLUE, COLOR_MAGENTA, COLOR_CYAN, COLOR_WHITE = range(8)
COLORS = 256
COLOR_PAIRS = 256
_pairs = {0: (-1, -1)}
_colors = {}  # init_color: number -> (r, g, b) in 0..1000
_color_on = False


def color_pair(n):
    return (int(n) & 0xFF) << 8


def pair_number(attr):
    return (int(attr) & A_COLOR) >> 8


def start_color():
    global _color_on
    _color_on = True
    _module.COLORS = 256
    _module.COLOR_PAIRS = 256


def has_colors():
    return True


def can_change_color():
    return True


def use_default_colors():
    _pairs[0] = (-1, -1)


def assume_default_colors(fg, bg):
    _pairs[0] = (fg, bg)


def init_pair(n, fg, bg):
    if not 1 <= n < COLOR_PAIRS:
        raise error("init_pair() returned ERR")
    _pairs[n] = (fg, bg)
    _screen.dirty = True


def pair_content(n):
    return _pairs.get(n, (COLOR_WHITE, COLOR_BLACK))


def init_color(n, r, g, b):
    _colors[n] = (r, g, b)
    _screen.dirty = True


def color_content(n):
    if n in _colors:
        return _colors[n]
    base = [(0, 0, 0), (680, 0, 0), (0, 680, 0), (680, 680, 0), (0, 0, 680), (680, 0, 680), (0, 680, 680), (680, 680, 680)]
    return base[n] if 0 <= n < 8 else (500, 500, 500)


# ---------------------------------------------------------------- keys
KEY_CODE_YES = 0o400
KEY_MIN = KEY_BREAK = 0o401
KEY_DOWN, KEY_UP, KEY_LEFT, KEY_RIGHT, KEY_HOME, KEY_BACKSPACE, KEY_F0 = 0o402, 0o403, 0o404, 0o405, 0o406, 0o407, 0o410
for _i in range(1, 64):
    globals()[f"KEY_F{_i}"] = KEY_F0 + _i
KEY_DL, KEY_IL, KEY_DC, KEY_IC, KEY_EIC, KEY_CLEAR, KEY_EOS, KEY_EOL = 0o510, 0o511, 0o512, 0o513, 0o514, 0o515, 0o516, 0o517
KEY_SF, KEY_SR, KEY_NPAGE, KEY_PPAGE, KEY_STAB, KEY_CTAB, KEY_CATAB, KEY_ENTER = 0o520, 0o521, 0o522, 0o523, 0o524, 0o525, 0o526, 0o527
KEY_PRINT, KEY_LL, KEY_A1, KEY_A3, KEY_B2, KEY_C1, KEY_C3, KEY_BTAB = 0o532, 0o533, 0o534, 0o535, 0o536, 0o537, 0o540, 0o541
KEY_BEG, KEY_END = 0o542, 0o550
KEY_SLEFT, KEY_SRIGHT, KEY_SHOME, KEY_SEND, KEY_SDC = 0o611, 0o622, 0o607, 0o602, 0o577
KEY_MOUSE, KEY_RESIZE = 0o631, 0o632
KEY_MAX = 0o777
_KEYS = {"KEY_DOWN": KEY_DOWN, "KEY_UP": KEY_UP, "KEY_LEFT": KEY_LEFT, "KEY_RIGHT": KEY_RIGHT, "KEY_HOME": KEY_HOME, "KEY_END": KEY_END,
         "KEY_BACKSPACE": KEY_BACKSPACE, "KEY_DC": KEY_DC, "KEY_IC": KEY_IC, "KEY_NPAGE": KEY_NPAGE, "KEY_PPAGE": KEY_PPAGE,
         "KEY_BTAB": KEY_BTAB, "KEY_RESIZE": KEY_RESIZE, "KEY_ENTER": KEY_ENTER, "KEY_SLEFT": KEY_SLEFT, "KEY_SRIGHT": KEY_SRIGHT}
for _i in range(1, 13):
    _KEYS[f"KEY_F{_i}"] = KEY_F0 + _i
_KEY_NAMES = {v: k for k, v in _KEYS.items()}
# what a terminal sends for these keys when keypad mode is off
_ESC_SEQ = {"KEY_UP": "\x1b[A", "KEY_DOWN": "\x1b[B", "KEY_RIGHT": "\x1b[C", "KEY_LEFT": "\x1b[D", "KEY_HOME": "\x1b[H", "KEY_END": "\x1b[F",
            "KEY_DC": "\x1b[3~", "KEY_IC": "\x1b[2~", "KEY_PPAGE": "\x1b[5~", "KEY_NPAGE": "\x1b[6~", "KEY_BTAB": "\x1b[Z"}

# ---------------------------------------------------------------- line drawing characters
_ACS = {
    "ULCORNER": "┌", "LLCORNER": "└", "URCORNER": "┐", "LRCORNER": "┘", "LTEE": "├", "RTEE": "┤", "BTEE": "┴", "TTEE": "┬",
    "HLINE": "─", "VLINE": "│", "PLUS": "┼", "S1": "⎺", "S9": "⎽", "DIAMOND": "◆", "CKBOARD": "▒", "DEGREE": "°", "PLMINUS": "±",
    "BULLET": "·", "LARROW": "←", "RARROW": "→", "DARROW": "↓", "UARROW": "↑", "BOARD": "▒", "LANTERN": "␋", "BLOCK": "█",
    "S3": "⎻", "S7": "⎼", "LEQUAL": "≤", "GEQUAL": "≥", "PI": "π", "NEQUAL": "≠", "STERLING": "£",
}
_ACS_CHARS = []
for _name, _ch in _ACS.items():
    _ACS_CHARS.append(_ch)
    globals()["ACS_" + _name] = A_ALTCHARSET | (len(_ACS_CHARS) - 1)
for _alias, _name in {"BSSB": "ULCORNER", "SSBB": "LLCORNER", "BBSS": "URCORNER", "SBBS": "LRCORNER", "SBSS": "RTEE", "SSSB": "LTEE",
                      "SSBS": "BTEE", "BSSS": "TTEE", "BSBS": "HLINE", "SBSB": "VLINE", "SSSS": "PLUS"}.items():
    globals()["ACS_" + _alias] = globals()["ACS_" + _name]


def _cell(ch, attr=0):
    """A character (str or int, maybe with attributes) -> (one character, attributes)."""
    if isinstance(ch, int):
        attr |= ch & ~A_CHARTEXT & ~A_ALTCHARSET & 0xFFFFFFFF
        if ch & A_ALTCHARSET:
            i = ch & A_CHARTEXT
            return (_ACS_CHARS[i] if i < len(_ACS_CHARS) else "?"), attr
        return chr(ch & A_CHARTEXT), attr
    if isinstance(ch, bytes):
        ch = ch.decode("utf-8", "replace")
    return (ch[:1] or " "), attr


# ---------------------------------------------------------------- the screen Dexna shows
class _Screen:
    def __init__(self):
        self.rows, self.cols = 24, 80
        self.chars = []
        self.attrs = []
        self.cursor = (0, 0)
        self.cursor_vis = 1
        self.dirty = True
        self.last = None
        self.open = False

    def resize(self, rows, cols):
        self.rows, self.cols = max(2, rows), max(10, cols)
        self.chars = [[" "] * self.cols for _ in range(self.rows)]
        self.attrs = [[0] * self.cols for _ in range(self.rows)]
        self.dirty = True

    def send(self):
        if not self.open:
            return
        lines = []
        styles = {}
        for y in range(self.rows):
            runs, row_c, row_a = [], self.chars[y], self.attrs[y]
            start = 0
            for x in range(1, self.cols + 1):
                if x == self.cols or row_a[x] != row_a[start]:
                    a = row_a[start]
                    if a not in styles:
                        styles[a] = _style(a)
                    runs.append(["".join(row_c[start:x]), a])
                    start = x
            lines.append(runs)
        frame = _json.dumps({"op": "frame", "lines": lines, "styles": {str(k): v for k, v in styles.items()},
                             "cursor": [self.cursor[0], self.cursor[1], self.cursor_vis]}, separators=(",", ":"))
        if frame != self.last:
            self.last = frame
            _post("curses", frame)
        self.dirty = False


def _style(a):
    """Attributes -> what the browser needs to draw them."""
    fg, bg = _pairs.get(pair_number(a), (-1, -1))
    s = {}
    if fg is not None and fg >= 0:
        s["f"] = _rgb(fg)
    if bg is not None and bg >= 0:
        s["b"] = _rgb(bg)
    if a & (A_REVERSE | A_STANDOUT):
        s["r"] = 1
    if a & A_BOLD:
        s["w"] = 1
    if a & A_DIM:
        s["d"] = 1
    if a & A_UNDERLINE:
        s["u"] = 1
    if a & A_ITALIC:
        s["i"] = 1
    if a & A_INVIS:
        s["h"] = 1
    if a & A_BLINK:
        s["k"] = 1
    return s


def _rgb(n):
    """A colour number -> an index into the theme's 16 terminal colours, or #rrggbb."""
    if n in _colors:
        r, g, b = (round(v * 255 / 1000) for v in _colors[n])
        return f"#{r:02x}{g:02x}{b:02x}"
    if n < 16:
        return n
    if n < 232:  # the 6x6x6 colour cube
        n -= 16
        lv = [0, 95, 135, 175, 215, 255]
        return f"#{lv[n // 36]:02x}{lv[(n // 6) % 6]:02x}{lv[n % 6]:02x}"
    v = 8 + (n - 232) * 10
    return f"#{v:02x}{v:02x}{v:02x}"


_screen = _Screen()
_state = {"echo": True, "cbreak": False, "raw": False, "delay": None, "pending": [], "started": False, "ended": False}


def _ask_size():
    try:
        r = _json.loads(_wait("curses-size", "") or "{}")
        return int(r.get("r", 24)), int(r.get("c", 80))
    except Exception:
        return 24, 80


def _read_key(delay):
    """The next key as a string ("a", "\\n", "KEY_UP"...), or None when nothing came in time."""
    if _state["pending"]:
        return _state["pending"].pop(0)
    if not _has_channel():
        raise error("Reading keys needs cross-origin isolation. Reload the page to enable it.")
    if _state["delay"] is not None and delay < 0:
        delay = _state["delay"]
    try:
        r = _json.loads(_wait("curses-key", _json.dumps({"t": delay})) or "{}")
    except ValueError:
        r = {}
    rows, cols = r.get("r"), r.get("c")
    k = r.get("k") or None
    if k == "KEY_RESIZE" and rows and cols:
        resizeterm(rows, cols)
    if k == "\x03" and not _state["raw"]:
        raise KeyboardInterrupt
    return k


# ---------------------------------------------------------------- windows
class window:
    def __init__(self, nlines, ncols, begin_y, begin_x, parent=None, pad=False):
        self._parent = parent
        self._pad = pad
        self._lines, self._cols = max(1, nlines), max(1, ncols)
        self._by, self._bx = begin_y, begin_x
        if parent is None:
            self._chars = [[" "] * self._cols for _ in range(self._lines)]
            self._attrs = [[0] * self._cols for _ in range(self._lines)]
            self._oy = self._ox = 0
        else:  # a subwindow draws into its parent's cells
            root = parent
            self._oy, self._ox = begin_y - parent._by + parent._oy, begin_x - parent._bx + parent._ox
            while root._parent is not None:
                root = root._parent
            self._chars, self._attrs = root._chars, root._attrs
        self._y = self._x = 0
        self._attr = 0
        self._bkgd = (" ", 0)
        self._keypad = False
        self._delay = -1
        self._scroll = False
        self._top, self._bottom = 0, self._lines - 1
        self._leave = False
        self._immed = False
        self._touched = set(range(self._lines))  # rows changed since this window was last refreshed

    # --- helpers
    def _put(self, y, x, ch, attr):
        self._chars[self._oy + y][self._ox + x] = ch
        bg = self._bkgd[1]
        a = attr | (bg & ~A_COLOR if pair_number(attr) else bg)
        self._attrs[self._oy + y][self._ox + x] = a
        w, yy = self, y
        while w is not None:  # this row, and the same row in every parent window, need sending again
            w._touched.add(yy)
            if w._parent is not None:
                yy += w._oy - w._parent._oy
            w = w._parent

    def _touch_all(self):
        self._touched = set(range(self._lines))

    def _check(self, y, x):
        if not (0 <= y < self._lines and 0 <= x < self._cols):
            raise error("curses function returned NULL" if y < 0 or x < 0 else "addwstr() returned ERR")

    def _newline(self):
        self._x = 0
        if self._y < self._bottom:
            self._y += 1
        elif self._scroll:
            self.scroll(1)
        else:
            raise error("addwstr() returned ERR")

    def _write(self, text, attr):
        for ch in text:
            if ch == "\n":
                self.clrtoeol()
                self._newline()
                continue
            if ch == "\t":
                for _ in range(8 - self._x % 8):
                    self._write(" ", attr)
                continue
            if ch == "\r":
                self._x = 0
                continue
            self._put(self._y, self._x, ch, attr)
            self._x += 1
            if self._x >= self._cols:
                if self._y == self._lines - 1 and not self._scroll:
                    self._x = self._cols - 1
                    raise error("addwstr() returned ERR")  # like curses: writing into the last cell is an error
                self._newline()
        if self._immed:
            self.refresh()

    @staticmethod
    def _args(args, n):
        """(y, x, rest...) or (rest...): the optional position comes first in curses calls."""
        if len(args) >= n + 2:
            return args[0], args[1], args[2:]
        return None, None, args

    # --- writing
    def addstr(self, *args):
        y, x, rest = self._args(args, 1)
        if y is not None:
            self.move(y, x)
        text = rest[0]
        if isinstance(text, bytes):
            text = text.decode("utf-8", "replace")
        attr = rest[1] if len(rest) > 1 else self._attr
        self._write(str(text), attr)

    def addnstr(self, *args):
        y, x, rest = self._args(args, 2)
        if y is not None:
            self.move(y, x)
        text, n = rest[0], rest[1]
        self.addstr(str(text)[:n], *(rest[2:] or (self._attr,)))

    def addch(self, *args):
        y, x, rest = self._args(args, 1)
        if y is not None:
            self.move(y, x)
        ch, attr = _cell(rest[0], rest[1] if len(rest) > 1 else self._attr)
        if ch == "\n":
            self._write("\n", attr)
            return
        self._put(self._y, self._x, ch, attr)
        self._x += 1
        if self._x >= self._cols:
            if self._y == self._lines - 1 and not self._scroll:
                self._x = self._cols - 1
                return
            self._newline()

    def insstr(self, *args):
        self._touch_all()
        y, x, rest = self._args(args, 1)
        if y is not None:
            self.move(y, x)
        text, attr = str(rest[0]), rest[1] if len(rest) > 1 else self._attr
        row_c, row_a = self._chars[self._oy + self._y], self._attrs[self._oy + self._y]
        a, b = self._ox + self._x, self._ox + self._cols
        cells = list(text) + row_c[a:b]
        attrs = [attr] * len(text) + row_a[a:b]
        row_c[a:b], row_a[a:b] = cells[: b - a], attrs[: b - a]

    def insnstr(self, *args):
        y, x, rest = self._args(args, 2)
        if y is not None:
            self.move(y, x)
        self.insstr(str(rest[0])[: rest[1]], *(rest[2:] or (self._attr,)))

    def insch(self, *args):
        y, x, rest = self._args(args, 1)
        if y is not None:
            self.move(y, x)
        ch, attr = _cell(rest[0], rest[1] if len(rest) > 1 else self._attr)
        sy, sx = self._y, self._x
        self.insstr(ch, attr)
        self._y, self._x = sy, sx

    def delch(self, *args):
        self._touch_all()
        if len(args) == 2:
            self.move(*args)
        row_c, row_a = self._chars[self._oy + self._y], self._attrs[self._oy + self._y]
        a, b = self._ox + self._x, self._ox + self._cols
        row_c[a:b] = row_c[a + 1:b] + [self._bkgd[0]]
        row_a[a:b] = row_a[a + 1:b] + [self._bkgd[1]]

    def echochar(self, ch, attr=None):
        self.addch(ch, self._attr if attr is None else attr)
        self.refresh()

    def inch(self, *args):
        y, x = (args if args else (self._y, self._x))
        ch, a = self._chars[self._oy + y][self._ox + x], self._attrs[self._oy + y][self._ox + x]
        code = ord(ch)
        if code > 255:
            code = ord("?")
        return code | (a & ~A_CHARTEXT)

    def instr(self, *args):
        y, x = (args[0], args[1]) if len(args) >= 2 else (self._y, self._x)
        n = args[2] if len(args) == 3 else args[0] if len(args) == 1 else self._cols
        row = self._chars[self._oy + y][self._ox + x: self._ox + min(self._cols, x + n)]
        return "".join(row).encode()

    def chgat(self, *args):
        self._touch_all()
        a = list(args)
        attr = a.pop()
        num = -1
        y, x = self._y, self._x
        if len(a) == 1:
            num = a[0]
        elif len(a) == 2:
            y, x = a
        elif len(a) == 3:
            y, x, num = a
        end = self._cols if num < 0 else min(self._cols, x + num)
        for i in range(x, end):
            self._attrs[self._oy + y][self._ox + i] = attr

    # --- position and size
    def move(self, y, x):
        self._check(y, x)
        self._y, self._x = y, x

    def getyx(self):
        return self._y, self._x

    def getbegyx(self):
        return self._by, self._bx

    def getmaxyx(self):
        return self._lines, self._cols

    def getparyx(self):
        return (self._by - self._parent._by, self._bx - self._parent._bx) if self._parent else (-1, -1)

    def mvwin(self, y, x):
        self._by, self._bx = y, x
        self._touch_all()

    def mvderwin(self, y, x):
        if self._parent:
            self._oy, self._ox = self._parent._oy + y, self._parent._ox + x

    def resize(self, nlines, ncols):
        if self._parent is not None:
            self._lines, self._cols = nlines, ncols
            return
        ch, at = self._chars, self._attrs
        self._chars = [[(ch[y][x] if y < len(ch) and x < len(ch[0]) else " ") for x in range(ncols)] for y in range(nlines)]
        self._attrs = [[(at[y][x] if y < len(at) and x < len(at[0]) else 0) for x in range(ncols)] for y in range(nlines)]
        self._lines, self._cols = nlines, ncols
        self._bottom = nlines - 1
        self._y, self._x = min(self._y, nlines - 1), min(self._x, ncols - 1)
        self._touch_all()

    def enclose(self, y, x):
        return self._by <= y < self._by + self._lines and self._bx <= x < self._bx + self._cols

    # --- clearing
    def erase(self):
        for y in range(self._lines):
            for x in range(self._cols):
                self._put(y, x, self._bkgd[0], 0)
        self._y = self._x = 0

    def clear(self):
        self.erase()
        self._touch_all()
        _screen.dirty = True

    def clrtoeol(self):
        for x in range(self._x, self._cols):
            self._put(self._y, x, self._bkgd[0], 0)

    def clrtobot(self):
        self.clrtoeol()
        for y in range(self._y + 1, self._lines):
            for x in range(self._cols):
                self._put(y, x, self._bkgd[0], 0)

    def deleteln(self):
        self.insdelln(-1)

    def insertln(self):
        self.insdelln(1)

    def insdelln(self, n):
        self._touch_all()
        rows = [(list(self._chars[self._oy + y][self._ox:self._ox + self._cols]), list(self._attrs[self._oy + y][self._ox:self._ox + self._cols])) for y in range(self._lines)]
        blank = ([self._bkgd[0]] * self._cols, [self._bkgd[1]] * self._cols)
        if n > 0:
            rows = rows[: self._y] + [blank] * n + rows[self._y:]
            rows = rows[: self._lines]
        else:
            rows = rows[: self._y] + rows[self._y - n:] + [blank] * (-n)
        for y, (c, a) in enumerate(rows):
            self._chars[self._oy + y][self._ox:self._ox + self._cols] = c
            self._attrs[self._oy + y][self._ox:self._ox + self._cols] = a

    def scroll(self, lines=1):
        self._touch_all()
        for _ in range(abs(lines)):
            rng = range(self._top, self._bottom) if lines > 0 else range(self._bottom, self._top, -1)
            for y in rng:
                src = y + 1 if lines > 0 else y - 1
                self._chars[self._oy + y][self._ox:self._ox + self._cols] = self._chars[self._oy + src][self._ox:self._ox + self._cols]
                self._attrs[self._oy + y][self._ox:self._ox + self._cols] = self._attrs[self._oy + src][self._ox:self._ox + self._cols]
            edge = self._bottom if lines > 0 else self._top
            self._chars[self._oy + edge][self._ox:self._ox + self._cols] = [self._bkgd[0]] * self._cols
            self._attrs[self._oy + edge][self._ox:self._ox + self._cols] = [self._bkgd[1]] * self._cols

    def scrollok(self, flag):
        self._scroll = bool(flag)

    def setscrreg(self, top, bottom):
        self._top, self._bottom = top, bottom

    def idlok(self, flag):
        pass

    def idcok(self, flag):
        pass

    def leaveok(self, flag):
        self._leave = bool(flag)

    def immedok(self, flag):
        self._immed = bool(flag)

    def clearok(self, flag):
        _screen.dirty = True

    def syncok(self, flag):
        pass

    # --- attributes and background
    def attron(self, a):
        self._attr |= a

    def attroff(self, a):
        self._attr &= ~a

    def attrset(self, a):
        self._attr = a

    def standout(self):
        self._attr |= A_STANDOUT

    def standend(self):
        self._attr = 0

    def attr_get(self):
        return self._attr, pair_number(self._attr)

    def bkgdset(self, ch, attr=0):
        c, a = _cell(ch, attr)
        self._bkgd = (c, a)

    def bkgd(self, ch, attr=0):
        old = self._bkgd
        self.bkgdset(ch, attr)
        for y in range(self._lines):
            for x in range(self._cols):
                if self._chars[self._oy + y][self._ox + x] == old[0]:
                    self._chars[self._oy + y][self._ox + x] = self._bkgd[0]
                self._attrs[self._oy + y][self._ox + x] = (self._attrs[self._oy + y][self._ox + x] & ~(old[1])) | self._bkgd[1]

    def getbkgd(self):
        return ord(self._bkgd[0]) | self._bkgd[1]

    # --- lines and borders
    def border(self, ls=0, rs=0, ts=0, bs=0, tl=0, tr=0, bl=0, br=0):
        d = lambda v, dflt: _cell(v or dflt)
        L, R, T, B = d(ls, ACS_VLINE), d(rs, ACS_VLINE), d(ts, ACS_HLINE), d(bs, ACS_HLINE)
        TL, TR, BL, BR = d(tl, ACS_ULCORNER), d(tr, ACS_URCORNER), d(bl, ACS_LLCORNER), d(br, ACS_LRCORNER)
        h, w = self._lines - 1, self._cols - 1
        for x in range(1, w):
            self._put(0, x, T[0], T[1] | self._attr)
            self._put(h, x, B[0], B[1] | self._attr)
        for y in range(1, h):
            self._put(y, 0, L[0], L[1] | self._attr)
            self._put(y, w, R[0], R[1] | self._attr)
        self._put(0, 0, TL[0], TL[1] | self._attr)
        self._put(0, w, TR[0], TR[1] | self._attr)
        self._put(h, 0, BL[0], BL[1] | self._attr)
        self._put(h, w, BR[0], BR[1] | self._attr)

    def box(self, vertch=0, horch=0):
        self.border(vertch, vertch, horch, horch)

    def hline(self, *args):
        y, x, rest = self._args(args, 2)
        y, x = (self._y, self._x) if y is None else (y, x)
        ch, attr = _cell(rest[0], self._attr)
        for i in range(x, min(self._cols, x + rest[1])):
            self._put(y, i, ch, attr)

    def vline(self, *args):
        y, x, rest = self._args(args, 2)
        y, x = (self._y, self._x) if y is None else (y, x)
        ch, attr = _cell(rest[0], self._attr)
        for i in range(y, min(self._lines, y + rest[1])):
            self._put(i, x, ch, attr)

    # --- showing
    def noutrefresh(self, *args):
        if self._pad:
            pminrow, pmincol, sminrow, smincol, smaxrow, smaxcol = args
            src_y, src_x, dst_y, dst_x = pminrow, pmincol, sminrow, smincol
            h, w = smaxrow - sminrow + 1, smaxcol - smincol + 1
        else:
            src_y = src_x = 0
            dst_y, dst_x = self._by, self._bx
            h, w = self._lines, self._cols
        rows = range(h) if self._pad else sorted(r for r in self._touched if r < h)
        self._touched = set()
        for y in rows:
            sy, ty = self._oy + src_y + y, dst_y + y
            if not (0 <= ty < _screen.rows) or sy >= len(self._chars):
                continue
            for x in range(w):
                sx, tx = self._ox + src_x + x, dst_x + x
                if 0 <= tx < _screen.cols and sx < len(self._chars[0]):
                    _screen.chars[ty][tx] = self._chars[sy][sx]
                    _screen.attrs[ty][tx] = self._attrs[sy][sx]
        if not self._leave:
            _screen.cursor = (dst_y + self._y - (src_y if self._pad else 0), dst_x + self._x - (src_x if self._pad else 0))
        _screen.dirty = True

    def refresh(self, *args):
        self.noutrefresh(*args)
        doupdate()

    def redrawwin(self):
        self._touch_all()

    def redrawln(self, beg, num):
        self._touched.update(range(beg, beg + num))

    def touchwin(self):
        self._touch_all()

    def touchline(self, start, count, changed=True):
        if changed:
            self._touched.update(range(start, start + count))

    def untouchwin(self):
        self._touched = set()

    def is_wintouched(self):
        return bool(self._touched)

    def is_linetouched(self, line):
        return line in self._touched

    def overlay(self, dest, *args):
        self._copy(dest, True, *args)

    def overwrite(self, dest, *args):
        self._copy(dest, False, *args)

    def _copy(self, dest, skip_blank, *args):
        if args:
            sminrow, smincol, dminrow, dmincol, dmaxrow, dmaxcol = args
        else:
            sminrow = smincol = 0
            dminrow, dmincol = self._by - dest._by, self._bx - dest._bx
            dmaxrow, dmaxcol = dminrow + self._lines - 1, dmincol + self._cols - 1
        for y in range(dminrow, dmaxrow + 1):
            for x in range(dmincol, dmaxcol + 1):
                sy, sx = sminrow + y - dminrow, smincol + x - dmincol
                if 0 <= sy < self._lines and 0 <= sx < self._cols and 0 <= y < dest._lines and 0 <= x < dest._cols:
                    ch = self._chars[self._oy + sy][self._ox + sx]
                    if skip_blank and ch == " ":
                        continue
                    dest._put(y, x, ch, self._attrs[self._oy + sy][self._ox + sx])

    # --- subwindows
    def subwin(self, *args):
        if len(args) == 2:
            nlines, ncols, by, bx = self._lines - (args[0] - self._by), self._cols - (args[1] - self._bx), args[0], args[1]
        else:
            nlines, ncols, by, bx = args
        nlines = nlines or self._lines - (by - self._by)
        ncols = ncols or self._cols - (bx - self._bx)
        return window(nlines, ncols, by, bx, parent=self)

    def derwin(self, *args):
        if len(args) == 2:
            nlines, ncols, by, bx = 0, 0, args[0], args[1]
        else:
            nlines, ncols, by, bx = args
        return self.subwin(nlines or self._lines - by, ncols or self._cols - bx, self._by + by, self._bx + bx)

    def subpad(self, *args):
        return self.derwin(*args)

    # --- input
    def keypad(self, flag):
        self._keypad = bool(flag)

    def nodelay(self, flag):
        self._delay = 0 if flag else -1

    def timeout(self, ms):
        self._delay = ms

    def notimeout(self, flag):
        pass

    def _key(self):
        if self._touched:
            self.refresh()
        elif _screen.dirty:
            doupdate()
        k = _read_key(self._delay)
        if k is None:
            return None
        if k.startswith("KEY_") and len(k) > 4:
            if not self._keypad and k in _ESC_SEQ:
                seq = _ESC_SEQ[k]
                _state["pending"].extend(seq[1:])
                return seq[0]
        return k

    def getch(self, *yx):
        if yx:
            self.move(*yx)
        k = self._key()
        if k is None:
            return -1
        if k.startswith("KEY_") and len(k) > 4:
            return _KEYS.get(k, -1)
        if k == "\x7f" and self._keypad:
            return KEY_BACKSPACE
        code = ord(k)
        if code > 255:  # getch returns bytes: queue the rest of the character's UTF-8 bytes
            b = k.encode("utf-8")
            _state["pending"].extend(chr(c) for c in b[1:])
            code = b[0]
        if _state["echo"] and code >= 32 and code != 127:
            self.addch(k)
            self.refresh()
        return code

    def getkey(self, *yx):
        if yx:
            self.move(*yx)
        k = self._key()
        if k is None:
            raise error("no input")
        if k == "\x7f" and self._keypad:
            return "KEY_BACKSPACE"
        if _state["echo"] and len(k) == 1 and k >= " ":
            self.addch(k)
            self.refresh()
        return k

    def get_wch(self, *yx):
        if yx:
            self.move(*yx)
        k = self._key()
        if k is None:
            raise error("no input")
        if k.startswith("KEY_") and len(k) > 4:
            return _KEYS.get(k, -1)
        if k == "\x7f" and self._keypad:
            return KEY_BACKSPACE
        if _state["echo"] and k >= " ":
            self.addch(k)
            self.refresh()
        return k

    def getstr(self, *args):
        y, x = (args[0], args[1]) if len(args) >= 2 else (None, None)
        n = args[2] if len(args) == 3 else args[0] if len(args) == 1 else 1023
        if y is not None:
            self.move(y, x)
        out = []
        old_delay, self._delay = self._delay, -1
        try:
            while True:
                k = _read_key(-1)
                if k in ("\n", "\r", "KEY_ENTER"):
                    break
                if k in ("\x7f", "\x08", "KEY_BACKSPACE"):
                    if out:
                        out.pop()
                        if _state["echo"]:
                            self._x = max(0, self._x - 1)
                            self._put(self._y, self._x, " ", 0)
                            self.refresh()
                    continue
                if not k or k.startswith("KEY_") or len(out) >= n:
                    continue
                out.append(k)
                if _state["echo"]:
                    self.addch(k)
                    self.refresh()
        finally:
            self._delay = old_delay
        return "".join(out).encode("utf-8")

    def __repr__(self):
        return f"<curses.window {self._lines}x{self._cols} at {self._by},{self._bx}>"


# ---------------------------------------------------------------- module functions
stdscr = None
LINES = 24
COLS = 80


def initscr():
    global stdscr, LINES, COLS
    _sys.stdout.flush()
    rows, cols = _ask_size()
    _screen.resize(rows, cols)
    _screen.open = True
    _screen.last = None
    _post("curses", _json.dumps({"op": "open"}))
    LINES, COLS = _module.LINES, _module.COLS = rows, cols
    stdscr = _module.stdscr = window(rows, cols, 0, 0)
    _state.update(echo=True, cbreak=False, raw=False, delay=None, pending=[], started=True, ended=False)
    # this module stays loaded between runs: start every program from a clean slate
    _pairs.clear()
    _pairs[0] = (-1, -1)
    _colors.clear()
    _screen.cursor_vis = 1
    if "curses.panel" in _sys.modules:
        _sys.modules["curses.panel"]._stack.clear()
    _screen.send()
    return stdscr


def endwin():
    if _screen.open:
        _screen.open = False
        _post("curses", _json.dumps({"op": "close"}))
    _state["ended"] = True


def isendwin():
    return _state["ended"]


def setupterm(term=None, fd=-1):
    pass


def doupdate():
    _screen.send()


def newwin(*args):
    if len(args) == 2:
        nlines, ncols, by, bx = args[0], args[1], 0, 0
    else:
        nlines, ncols, by, bx = args
    return window(nlines or (_screen.rows - by), ncols or (_screen.cols - bx), by, bx)


def newpad(nlines, ncols):
    return window(nlines, ncols, 0, 0, pad=True)


def noecho():
    _state["echo"] = False


def echo(flag=True):
    _state["echo"] = bool(flag)


def cbreak(flag=True):
    _state["cbreak"] = bool(flag)


def nocbreak():
    _state["cbreak"] = False
    _state["delay"] = None


def raw(flag=True):
    _state["raw"] = bool(flag)


def noraw():
    _state["raw"] = False


def halfdelay(tenths):
    _state["delay"] = max(1, min(255, tenths)) * 100


def nl(flag=True):
    pass


def nonl():
    pass


def qiflush(flag=True):
    pass


def noqiflush():
    pass


def intrflush(flag):
    pass


def meta(flag):
    pass


def typeahead(fd):
    pass


def curs_set(visibility):
    old = _screen.cursor_vis
    _screen.cursor_vis = int(visibility)
    _screen.dirty = True
    return old


def napms(ms):
    _sys.stdout.flush()
    _time.sleep(ms / 1000)
    return 0


def delay_output(ms):
    return napms(ms)


def beep():
    _post("curses", _json.dumps({"op": "beep"}))


def flash():
    _post("curses", _json.dumps({"op": "flash"}))


def flushinp():
    _state["pending"].clear()
    if _has_channel():
        while _read_key(0) is not None:
            pass


def ungetch(ch):
    _state["pending"].insert(0, ch if isinstance(ch, str) else (_KEY_NAMES.get(ch) or chr(ch)))


def unget_wch(ch):
    ungetch(ch)


def keyname(k):
    if k in _KEY_NAMES:
        return _KEY_NAMES[k].encode()
    if k < 32:
        return f"^{chr(k + 64)}".encode()
    if k == 127:
        return b"^?"
    return chr(k).encode("latin-1", "replace")


def has_key(k):
    return k in _KEY_NAMES


def termname():
    return b"xterm-256color"


def longname():
    return b"Dexna terminal"


def baudrate():
    return 38400


def erasechar():
    return b"\x7f"


def killchar():
    return b"\x15"


def has_ic():
    return True


def has_il():
    return True


def is_term_resized(nlines, ncols):
    return (nlines, ncols) != (_screen.rows, _screen.cols)


def resizeterm(nlines, ncols):
    global LINES, COLS
    _screen.resize(nlines, ncols)
    LINES, COLS = _module.LINES, _module.COLS = nlines, ncols
    if stdscr is not None:
        stdscr.resize(nlines, ncols)


def resize_term(nlines, ncols):
    resizeterm(nlines, ncols)


def update_lines_cols():
    global LINES, COLS
    LINES, COLS = _module.LINES, _module.COLS = _screen.rows, _screen.cols


def get_escdelay():
    return 25


def set_escdelay(ms):
    pass


def get_tabsize():
    return 8


def set_tabsize(n):
    pass


def def_prog_mode():
    pass


def def_shell_mode():
    pass


def reset_prog_mode():
    pass


def reset_shell_mode():
    pass


def savetty():
    pass


def resetty():
    pass


def filter():
    pass


def use_env(flag):
    pass


def tigetstr(cap):
    return None


def tigetnum(cap):
    return -2


def tigetflag(cap):
    return -1


def tparm(s, *args):
    return b""


def putp(s):
    pass


# mouse: not available (the program still runs)
BUTTON1_PRESSED = BUTTON1_RELEASED = BUTTON1_CLICKED = BUTTON1_DOUBLE_CLICKED = 0
ALL_MOUSE_EVENTS = REPORT_MOUSE_POSITION = 0


def mousemask(mask):
    return 0, 0


def mouseinterval(ms):
    return 200


def getmouse():
    raise error("getmouse() returned ERR")


def ungetmouse(*args):
    pass


def getsyx():
    return _screen.cursor


def setsyx(y, x):
    _screen.cursor = (y, x)


def wrapper(func, /, *args, **kwds):
    """Set up the screen, call func(stdscr), and always restore the terminal afterwards."""
    try:
        scr = initscr()
        noecho()
        cbreak()
        scr.keypad(1)
        try:
            start_color()
        except Exception:
            pass
        return func(scr, *args, **kwds)
    finally:
        if stdscr is not None:
            stdscr.keypad(0)
            echo()
            nocbreak()
            endwin()


_module = _sys.modules[__name__]
