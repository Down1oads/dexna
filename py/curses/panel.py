"""curses.panel: windows stacked on top of each other, drawn in order by update_panels()."""
import curses


class error(curses.error):
    pass


_stack = []  # bottom first


class panel:
    def __init__(self, win):
        self._win = win
        self._hidden = False
        self._user = None

    def above(self):
        i = _stack.index(self)
        return _stack[i + 1] if i + 1 < len(_stack) else None

    def below(self):
        i = _stack.index(self)
        return _stack[i - 1] if i > 0 else None

    def bottom(self):
        _stack.remove(self)
        _stack.insert(0, self)

    def top(self):
        _stack.remove(self)
        _stack.append(self)

    def hide(self):
        self._hidden = True

    def show(self):
        self._hidden = False
        self.top()

    def hidden(self):
        return self._hidden

    def move(self, y, x):
        self._win.mvwin(y, x)

    def replace(self, win):
        self._win = win

    def window(self):
        return self._win

    def set_userptr(self, obj):
        self._user = obj

    def userptr(self):
        return self._user


def new_panel(win):
    p = panel(win)
    _stack.append(p)
    return p


def bottom_panel():
    return _stack[0] if _stack else None


def top_panel():
    return _stack[-1] if _stack else None


def update_panels():
    for p in _stack:
        if not p._hidden:
            p._win.noutrefresh()
