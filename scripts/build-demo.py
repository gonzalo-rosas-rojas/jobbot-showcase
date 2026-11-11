"""Copies the published demo build of the panel (fictional data) into site/demo/ as it is: the page and the fonts/ folder
the build writes next to it (the five faces and their licences). The panel has its own dark theme, which the page asks
for in the address (?theme=dark), so nothing in it is rewritten; its inline scripts are pinned by CSP hashes, so an edit
here would stop them from running.

The source path is required on purpose. This script replaces the panel that the whole story shows (on the 3D plane and
in the "Use the panel" overlay), and the story's contract with it (the address rig.js sets, the elements try.js looks at
for Escape) belongs to one specific build. There is no default, so running it can never switch the piece to another
panel version by accident: whoever runs it says which build it is.

Make the build in the panel's sources with `node build.mjs demo --publish --out <dir>/index.html`.

The commit of the panel's repository that the build was made from is required too, and is written to
site/demo/BUILD.txt together with the UTC time of the copy, so the demo can always be traced to a version of the program.

Usage: python scripts/build-demo.py <dir>/index.html <commit>"""
import datetime, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEMO = os.path.join(HERE, "..", "site", "demo")
COMMIT = re.compile(r"[0-9a-f]{7,40}")


def write_build_record(demo_dir, commit, now=None):
    """Writes demo_dir/BUILD.txt: the commit the demo was built from and the UTC time of the copy. Returns the text."""
    if not COMMIT.fullmatch(commit):
        raise ValueError("the commit must be 7 to 40 hex digits, got %r" % commit)
    now = now or datetime.datetime.now(datetime.timezone.utc)
    text = "commit: %s\ndate: %s\n" % (commit, now.strftime("%Y-%m-%dT%H:%M:%SZ"))
    with open(os.path.join(demo_dir, "BUILD.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    return text


def copy_demo(src, commit):
    if not COMMIT.fullmatch(commit):
        raise ValueError("the commit must be 7 to 40 hex digits, got %r" % commit)
    if not os.path.isfile(src):
        raise ValueError("the demo build to copy was not found: %s" % src)
    html = open(src, encoding="utf-8").read()
    # a build that still carries server markers would ask a static host for files it does not have
    for marker in ("__ASSETS__", "__NONCE__"):
        if marker in html:
            raise ValueError("%s is still in the build; make it with --publish" % marker)
    fonts_src = os.path.join(os.path.dirname(os.path.abspath(src)), "fonts")
    if not os.path.isdir(fonts_src):
        raise ValueError("the build has no fonts/ folder next to its page: %s" % fonts_src)

    with open(os.path.join(DEMO, "index.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    fonts_dst = os.path.join(DEMO, "fonts")
    shutil.rmtree(fonts_dst, ignore_errors=True)
    shutil.copytree(fonts_src, fonts_dst)
    write_build_record(DEMO, commit)
    print("demo copied: %d bytes and fonts/ (%d files) from %s, commit %s" % (
        len(html.encode("utf-8")), sum(len(f) for _, _, f in os.walk(fonts_dst)), os.path.dirname(os.path.abspath(src)), commit))


def main(argv):
    if len(argv) == 2 and argv[1] in ("-h", "--help"):
        print(__doc__)
        return
    if len(argv) != 3:
        sys.exit("build-demo: a path and a commit are required (there is no default).\n\n" + __doc__)
    try:
        copy_demo(argv[1], argv[2])
    except ValueError as err:
        sys.exit("build-demo: %s" % err)


if __name__ == "__main__":
    main(sys.argv)
