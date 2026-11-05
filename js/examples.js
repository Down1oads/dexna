// Starter projects shown in "Open an example…".
export const EXAMPLES = [
  {
    id: "welcome",
    name: "Welcome to Dexna",
    desc: "Tour of the IDE: modules, input(), files, cells",
    entry: "main.py",
    files: {
      "main.py": `"""Welcome to Dexna — a Python IDE that runs entirely in your browser.

Press F5 (or Ctrl+Enter) to run this file.
"""
from helpers.greet import greet, banner
from helpers import stats

print(banner("Dexna"))

name = input("What's your name? ")
print(greet(name))

numbers = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
print("mean  :", stats.mean(numbers))
print("median:", stats.median(numbers))

# Programs can read and write files in the project — check the Explorer after running!
with open("notes.txt", "w") as f:
    f.write(f"{name} ran Dexna and the median was {stats.median(numbers)}\\n")
print("Wrote notes.txt ✔")

# Tips:
#  • Hover a name for docs, Ctrl+Click (or F12) to jump to its definition.
#  • F6 starts the debugger; click the gutter to add breakpoints.
#  • The Console tab keeps the variables of your last run — try typing \`numbers\`.
`,
      "helpers/__init__.py": "",
      "helpers/greet.py": `def greet(name: str) -> str:
    """Return a friendly greeting for *name*."""
    name = name.strip() or "stranger"
    return f"Hello, {name}! 👋"


def banner(text: str, width: int = 32) -> str:
    """Draw *text* inside a box."""
    line = "─" * width
    return f"┌{line}┐\\n│{text.center(width)}│\\n└{line}┘"
`,
      "helpers/stats.py": `from typing import Sequence


def mean(xs: Sequence[float]) -> float:
    """Arithmetic mean."""
    return sum(xs) / len(xs)


def median(xs: Sequence[float]) -> float:
    """Middle value of the sorted data."""
    s = sorted(xs)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2
`,
    },
  },
  {
    id: "plotting",
    name: "Plotting with Matplotlib",
    desc: "NumPy + Matplotlib charts rendered in the Plots tab",
    entry: "plots.py",
    files: {
      "plots.py": `import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 4 * np.pi, 400)

fig, axes = plt.subplots(1, 2, figsize=(10, 4))
axes[0].plot(x, np.sin(x), label="sin(x)")
axes[0].plot(x, np.cos(x), label="cos(x)", linestyle="--")
axes[0].set_title("Trigonometry")
axes[0].legend()
axes[0].grid(alpha=.3)

rng = np.random.default_rng(42)
data = rng.normal(0, 1, 5_000)
axes[1].hist(data, bins=50, color="#7c6cff", edgecolor="white")
axes[1].set_title("Normal distribution")
plt.tight_layout()
plt.show()

# A second figure: a 2D field
X, Y = np.meshgrid(np.linspace(-3, 3, 200), np.linspace(-3, 3, 200))
Z = np.sin(X ** 2 + Y ** 2) * np.exp(-0.2 * (X ** 2 + Y ** 2))
plt.figure(figsize=(5, 4))
plt.contourf(X, Y, Z, levels=30, cmap="viridis")
plt.colorbar()
plt.title("sin(r²)·e^(-r²/5)")
plt.show()
print("Figures are in the Plots tab →")
`,
    },
  },
  {
    id: "pandas",
    name: "Data analysis with pandas",
    desc: "Load a CSV, group, aggregate and chart it",
    entry: "analysis.py",
    files: {
      "analysis.py": `import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("sales.csv", parse_dates=["date"])
print(df.head(), "\\n")

df["revenue"] = df["units"] * df["price"]
summary = df.groupby("region")["revenue"].agg(["sum", "mean", "count"]).sort_values("sum", ascending=False)
print(summary.round(2), "\\n")

monthly = df.set_index("date").groupby("region")["revenue"].resample("ME").sum().unstack(0)
monthly.plot(marker="o", figsize=(8, 4), title="Monthly revenue by region")
plt.ylabel("Revenue ($)")
plt.tight_layout()
plt.show()

summary.to_csv("summary.csv")
print("Saved summary.csv — open it from the Explorer.")
`,
      "sales.csv": `date,region,product,units,price
2026-01-04,North,Widget,12,9.99
2026-01-09,South,Gadget,5,24.50
2026-01-15,East,Widget,7,9.99
2026-01-21,West,Gizmo,3,49.00
2026-01-28,North,Gadget,9,24.50
2026-02-02,South,Widget,15,9.99
2026-02-10,East,Gizmo,4,49.00
2026-02-14,West,Widget,11,9.99
2026-02-20,North,Gizmo,6,49.00
2026-02-27,South,Gadget,8,24.50
2026-03-03,East,Gadget,10,24.50
2026-03-09,West,Gadget,6,24.50
2026-03-15,North,Widget,20,9.99
2026-03-22,South,Gizmo,2,49.00
2026-03-29,East,Widget,9,9.99
2026-04-04,West,Gizmo,7,49.00
2026-04-11,North,Gadget,14,24.50
2026-04-18,South,Widget,18,9.99
2026-04-25,East,Gizmo,5,49.00
2026-04-30,West,Widget,13,9.99
`,
    },
  },
  {
    id: "debugger",
    name: "Debugger playground",
    desc: "Breakpoints, stepping, watches and the call stack",
    entry: "debug_me.py",
    breakpoints: { "debug_me.py": [6] },
    files: {
      "debug_me.py": `def bubble_sort(items):
    """Sort a list in place — step through it with F10/F11!"""
    n = len(items)
    for i in range(n):
        swapped = False
        for j in range(n - i - 1):
            if items[j] > items[j + 1]:
                items[j], items[j + 1] = items[j + 1], items[j]
                swapped = True
        if not swapped:
            break
    return items


def fib(n):
    """Recursive Fibonacci — watch the call stack grow."""
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


data = [5, 2, 9, 1, 7]
print("sorted:", bubble_sort(data))
print("fib(6) =", fib(6))

# Press F6 to debug. A breakpoint is set on line 6.
# Add watch expressions like  items[j]  or  n - i  in the Run & Debug view.
`,
    },
  },
  {
    id: "game",
    name: "Guess the number",
    desc: "An interactive game using input()",
    entry: "game.py",
    files: {
      "game.py": `import random

secret = random.randint(1, 100)
print("I'm thinking of a number between 1 and 100.")

for attempt in range(1, 8):
    guess = input(f"Guess #{attempt}: ")
    if not guess.strip().isdigit():
        print("  Please enter a whole number.")
        continue
    guess = int(guess)
    if guess < secret:
        print("  Higher ↑")
    elif guess > secret:
        print("  Lower ↓")
    else:
        print(f"  🎉 Correct! You got it in {attempt} tries.")
        break
else:
    print(f"Out of guesses — it was {secret}.")
`,
    },
  },
  {
    id: "cells",
    name: "Scientific scratchpad (cells)",
    desc: "# %% cells you can run one at a time in the console",
    entry: "scratch.py",
    files: {
      "scratch.py": `# %% [Setup]
# Click "▶ Run Cell" above a cell (or press Ctrl+Shift+Enter inside it).
# Cells share the Console's namespace, like a notebook.
import math
import statistics as st

samples = [math.sin(i / 3) * 10 + i for i in range(30)]
print(f"{len(samples)} samples ready")

# %% [Describe]
print("mean :", round(st.mean(samples), 3))
print("stdev:", round(st.stdev(samples), 3))
max(samples)

# %% [Plot]
import matplotlib.pyplot as plt
plt.plot(samples, "o-")
plt.title("samples")
plt.show()
`,
    },
  },
  {
    id: "rich",
    name: "Pretty terminal with rich",
    desc: "Auto-installs a PyPI package; ANSI colours in the terminal",
    entry: "fancy.py",
    packages: ["rich"],
    files: {
      "fancy.py": `from rich.console import Console
from rich.table import Table
from rich.tree import Tree

console = Console(force_terminal=True, width=80, color_system="truecolor")
console.rule("[bold magenta]Dexna ❤ rich")

table = Table(title="Planets")
table.add_column("Name", style="cyan")
table.add_column("Moons", justify="right", style="green")
table.add_column("Rings", justify="center")
for name, moons, rings in [("Mercury", 0, "✗"), ("Earth", 1, "✗"), ("Jupiter", 95, "✓"), ("Saturn", 146, "✓")]:
    table.add_row(name, str(moons), rings)
console.print(table)

tree = Tree("📁 project")
tree.add("📄 fancy.py")
tree.add("📁 data").add("📄 planets.json")
console.print(tree)
console.print("[bold green]Done![/] [dim]Packages imported here are installed automatically.[/]")
`,
    },
  },
  {
    id: "oop",
    name: "Bank system (OOP, packages)",
    desc: "Classes, dataclasses, exceptions and a multi-file package",
    entry: "app.py",
    files: {
      "app.py": `from bank import Bank, InsufficientFunds

bank = Bank("Dexna Savings")
alice = bank.open_account("Alice", 100)
bob = bank.open_account("Bob")

bank.transfer(alice, bob, 40)
print(bank.report())

try:
    bank.transfer(bob, alice, 500)
except InsufficientFunds as e:
    print("⚠", e)
`,
      "bank/__init__.py": `from .models import Account, InsufficientFunds
from .service import Bank

__all__ = ["Account", "Bank", "InsufficientFunds"]
`,
      "bank/models.py": `from dataclasses import dataclass, field


class InsufficientFunds(Exception):
    """Raised when an account can't cover a withdrawal."""


@dataclass
class Account:
    owner: str
    balance: float = 0.0
    history: list[str] = field(default_factory=list)

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("amount must be positive")
        self.balance += amount
        self.history.append(f"+{amount:.2f}")

    def withdraw(self, amount: float) -> None:
        if amount > self.balance:
            raise InsufficientFunds(f"{self.owner} has only {self.balance:.2f}, needs {amount:.2f}")
        self.balance -= amount
        self.history.append(f"-{amount:.2f}")
`,
      "bank/service.py": `from .models import Account


class Bank:
    def __init__(self, name: str):
        self.name = name
        self.accounts: list[Account] = []

    def open_account(self, owner: str, initial: float = 0) -> Account:
        acct = Account(owner)
        if initial:
            acct.deposit(initial)
        self.accounts.append(acct)
        return acct

    def transfer(self, src: Account, dst: Account, amount: float) -> None:
        src.withdraw(amount)
        dst.deposit(amount)

    def report(self) -> str:
        lines = [f"== {self.name} =="]
        lines += [f"{a.owner:<8} {a.balance:>10.2f}  {' '.join(a.history)}" for a in self.accounts]
        return "\\n".join(lines)
`,
    },
  },
  {
    id: "sympy",
    name: "Symbolic math with SymPy",
    desc: "Solve, differentiate and integrate symbolically",
    entry: "symbolic.py",
    files: {
      "symbolic.py": `import sympy as sp

x, y = sp.symbols("x y")
expr = sp.sin(x) * sp.exp(x)

print("f(x)      =", expr)
print("f'(x)     =", sp.diff(expr, x))
print("∫ f(x) dx =", sp.integrate(expr, x))
print("roots of x² - 5x + 6:", sp.solve(x**2 - 5*x + 6, x))
print("series of cos(x):", sp.series(sp.cos(x), x, 0, 8))
sp.pprint(sp.Integral(sp.sqrt(1 / x), x), use_unicode=True)
`,
    },
  },
];

export const BLANK = {
  name: "Untitled project",
  entry: "main.py",
  files: { "main.py": 'print("Hello from Dexna!")\n' },
};
