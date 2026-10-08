"""Copies the demo build of the panel (fictional data) into site/demo/ as it is. The panel has its own dark theme,
which the page asks for in the address (?theme=dark), so nothing in it is rewritten.
Usage: python scripts/build-demo.py [path/to/panel/docs/demo/index.html]"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT = os.path.join(HERE, "..", "..", "pega", ".claude", "worktrees", "estacion-viva", "docs", "demo", "index.html")
src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
dst = os.path.join(HERE, "..", "site", "demo", "index.html")

html = open(src, encoding="utf-8").read()
open(dst, "w", encoding="utf-8", newline="\n").write(html)
print("demo copied: %d bytes" % len(html.encode("utf-8")))
