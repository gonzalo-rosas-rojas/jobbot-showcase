"""Counts real numbers about the Rust project (read-only) and writes site/data/receipts.json.
Nothing here names a company or a person: only counts. Run it again before publishing.
Usage: python scripts/receipts.py [path/to/jobbot/repo]"""
import datetime, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = sys.argv[1] if len(sys.argv) > 1 else "."


def rust_files(sub):
    root = os.path.join(REPO, sub)
    for d, _, files in os.walk(root):
        for f in files:
            if f.endswith(".rs"):
                yield os.path.join(d, f)


lines = tests = files = 0
for sub in ("src", "tests"):
    for p in rust_files(sub):
        files += 1
        text = open(p, encoding="utf-8", errors="replace").read()
        lines += text.count("\n") + 1
        tests += len(re.findall(r"#\[(?:tokio::)?test\b", text))

deps = 0
section = ""
for line in open(os.path.join(REPO, "Cargo.toml"), encoding="utf-8"):
    s = line.strip()
    if s.startswith("["):
        section = s
        continue
    if section == "[dependencies]" and s and not s.startswith("#") and "=" in s:
        deps += 1

out = {"rust_lines": lines, "rust_files": files, "test_functions": tests, "dependencies": deps,
       "counted_on": datetime.date.today().isoformat(),
       "note": "Counted from src/ and tests/ with scripts/receipts.py; test functions are #[test] and #[tokio::test] attributes, not a test run."}
dst = os.path.join(HERE, "..", "site", "data", "receipts.json")
json.dump(out, open(dst, "w", encoding="utf-8"), indent=1)
print(json.dumps(out, indent=1))
