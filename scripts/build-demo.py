"""Copies the demo build of the panel (fictional data) into site/demo/ as it is. The panel has its own dark theme,
which the page asks for in the address (?theme=dark), so nothing in it is rewritten.

The source path is required on purpose. This script replaces the panel that the whole story shows (on the 3D plane and
in the "Use the panel" overlay), and the story's contract with it (the tab buttons that rig.js clicks, the elements that
try.js looks at for Escape) belongs to one specific build. There is no default, so running it can never switch the
piece to another panel version by accident: whoever runs it says which build it is.

Usage: python scripts/build-demo.py <path/to/panel/docs/demo/index.html>"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))

if len(sys.argv) == 2 and sys.argv[1] in ("-h", "--help"):
    print(__doc__)
    sys.exit(0)
if len(sys.argv) != 2:
    sys.exit("build-demo: a path is required (there is no default).\n\n" + __doc__)

src = sys.argv[1]
dst = os.path.join(HERE, "..", "site", "demo", "index.html")
if not os.path.isfile(src):
    sys.exit("build-demo: the demo build to copy was not found: %s" % src)

html = open(src, encoding="utf-8").read()
open(dst, "w", encoding="utf-8", newline="\n").write(html)
print("demo copied: %d bytes from %s" % (len(html.encode("utf-8")), os.path.abspath(src)))
