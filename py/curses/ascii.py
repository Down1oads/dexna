"""curses.ascii: names for the ASCII control characters, and character tests."""

NUL, SOH, STX, ETX, EOT, ENQ, ACK, BEL, BS, TAB, HT, LF, NL, VT, FF, CR, SO, SI = 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 10, 10, 11, 12, 13, 14, 15
DLE, DC1, DC2, DC3, DC4, NAK, SYN, ETB, CAN, EM, SUB, ESC, FS, GS, RS, US, SP, DEL = 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 127

controlnames = ["NUL", "SOH", "STX", "ETX", "EOT", "ENQ", "ACK", "BEL", "BS", "HT", "LF", "VT", "FF", "CR", "SO", "SI",
                "DLE", "DC1", "DC2", "DC3", "DC4", "NAK", "SYN", "ETB", "CAN", "EM", "SUB", "ESC", "FS", "GS", "RS", "US", "SP"]


def _ctoi(c):
    return ord(c) if isinstance(c, str) else c


def isalnum(c): return isalpha(c) or isdigit(c)
def isalpha(c): return isupper(c) or islower(c)
def isascii(c): return 0 <= _ctoi(c) <= 127
def isblank(c): return _ctoi(c) in (9, 32)
def iscntrl(c): return 0 <= _ctoi(c) <= 31 or _ctoi(c) == 127
def isdigit(c): return 48 <= _ctoi(c) <= 57
def isgraph(c): return 33 <= _ctoi(c) <= 126
def islower(c): return 97 <= _ctoi(c) <= 122
def isprint(c): return 32 <= _ctoi(c) <= 126
def ispunct(c): return isgraph(c) and not isalnum(c)
def isspace(c): return _ctoi(c) in (9, 10, 11, 12, 13, 32)
def isupper(c): return 65 <= _ctoi(c) <= 90
def isxdigit(c): return isdigit(c) or 65 <= _ctoi(c) <= 70 or 97 <= _ctoi(c) <= 102
def isctrl(c): return 0 <= _ctoi(c) < 32
def ismeta(c): return _ctoi(c) > 127


def ascii(c):
    return chr(_ctoi(c) & 0x7F) if isinstance(c, str) else _ctoi(c) & 0x7F


def ctrl(c):
    return chr(_ctoi(c) & 0x1F) if isinstance(c, str) else _ctoi(c) & 0x1F


def alt(c):
    return chr(_ctoi(c) | 0x80) if isinstance(c, str) else _ctoi(c) | 0x80


def unctrl(c):
    bits = _ctoi(c)
    rep = "?" if bits == 0x7F else ("^" + chr((bits & 0x7F) | 0x20).upper() if isctrl(bits & 0x7F) else chr(bits & 0x7F))
    return ("!" + rep) if bits & 0x80 else rep
