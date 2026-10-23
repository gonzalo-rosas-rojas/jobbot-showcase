"""Counts real numbers about the Rust project (read-only) and writes site/data/receipts.json.
Nothing here names a company or a person: only counts. Run it again before publishing.
Usage: python scripts/receipts.py <path/to/jobbot/repo>"""
import datetime, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2:
    sys.exit(__doc__)
REPO = sys.argv[1]


def rust_files(sub):
    root = os.path.join(REPO, sub)
    for d, _, files in os.walk(root):
        for f in files:
            if f.endswith(".rs"):
                yield os.path.join(d, f)


lines = tests = ignored = files = 0
for sub in ("src", "tests", "crates"):
    for p in rust_files(sub):
        files += 1
        text = open(p, encoding="utf-8", errors="replace").read()
        lines += text.count("\n") + (0 if text.endswith("\n") else 1)
        tests += len(re.findall(r"#\[(?:tokio::)?test\b", text))
        ignored += len(re.findall(r"#\[ignore\b", text))

deps = 0
section = ""
for line in open(os.path.join(REPO, "Cargo.toml"), encoding="utf-8"):
    s = line.strip()
    if s.startswith("["):
        section = s
        continue
    # The workspace's own crates (`path = ...`) are not dependencies.
    if section == "[dependencies]" and s and not s.startswith("#") and "=" in s and not re.search(r"\bpath\s*=", s):
        deps += 1

out = {"rust_lines": lines, "rust_files": files, "test_functions": tests,
       "offline_tests": tests - ignored, "ignored_tests": ignored, "dependencies": deps,
       "counted_on": datetime.date.today().isoformat(),
       "note": "Counted from src/, tests/ and crates/ with scripts/receipts.py; tests are #[test] and #[tokio::test] attributes (offline = not #[ignore]), not a test run; dependencies are the third-party [dependencies] in Cargo.toml."}
dst = os.path.join(HERE, "..", "site", "data", "receipts.json")
json.dump(out, open(dst, "w", encoding="utf-8"), indent=1)
print(json.dumps(out, indent=1))
