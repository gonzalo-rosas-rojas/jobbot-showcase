"""Copies the published demo build of the panel (fictional data) into site/demo/ as it is: the page and the fonts/ folder
the build writes next to it (the five faces and their licences). The panel has its own dark theme, which the page asks
for in the address (?theme=dark), so nothing in it is rewritten; its inline scripts are pinned by CSP hashes, so an edit
here would stop them from running.

The source path is required on purpose. This script replaces the panel that the whole story shows (on the 3D plane and
in the "Use the panel" overlay), and the story's contract with it (the address rig.js sets, the elements try.js looks at
for Escape) belongs to one specific build. There is no default, so running it can never switch the piece to another
panel version by accident: whoever runs it says which build it is.

Make the build in the panel's sources with `node build.mjs demo --publish --out <dir>/index.html`.

Usage: python scripts/build-demo.py <dir>/index.html"""
import os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEMO = os.path.join(HERE, "..", "site", "demo")

if len(sys.argv) == 2 and sys.argv[1] in ("-h", "--help"):
    print(__doc__)
    sys.exit(0)
if len(sys.argv) != 2:
    sys.exit("build-demo: a path is required (there is no default).\n\n" + __doc__)

src = sys.argv[1]
if not os.path.isfile(src):
    sys.exit("build-demo: the demo build to copy was not found: %s" % src)
html = open(src, encoding="utf-8").read()
# a build that still carries server markers would ask a static host for files it does not have
for marker in ("__ASSETS__", "__NONCE__"):
    if marker in html:
        sys.exit("build-demo: %s is still in the build; make it with --publish" % marker)
fonts_src = os.path.join(os.path.dirname(os.path.abspath(src)), "fonts")
if not os.path.isdir(fonts_src):
    sys.exit("build-demo: the build has no fonts/ folder next to its page: %s" % fonts_src)

open(os.path.join(DEMO, "index.html"), "w", encoding="utf-8", newline="\n").write(html)
fonts_dst = os.path.join(DEMO, "fonts")
shutil.rmtree(fonts_dst, ignore_errors=True)
shutil.copytree(fonts_src, fonts_dst)
print("demo copied: %d bytes and fonts/ (%d files) from %s" % (
    len(html.encode("utf-8")), sum(len(f) for _, _, f in os.walk(fonts_dst)), os.path.dirname(os.path.abspath(src))))
