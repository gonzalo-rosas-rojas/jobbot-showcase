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
    for dirpath, _, names in os.walk(root):
        for name in names:
            if name.endswith(".rs"):
                yield os.path.join(dirpath, name)


def count_rust():
    """Counts the Rust files under src/, tests/ and crates/: returns (files, lines, tests, ignored)."""
    files = lines = tests = ignored = 0
    for sub in ("src", "tests", "crates"):
        for p in rust_files(sub):
            files += 1
            text = open(p, encoding="utf-8", errors="replace").read()
            lines += text.count("\n") + (0 if text.endswith("\n") else 1)
            tests += len(re.findall(r"#\[(?:tokio::)?test\b", text))
            ignored += len(re.findall(r"#\[ignore\b", text))
    return files, lines, tests, ignored


def manifests():
    yield os.path.join(REPO, "Cargo.toml")
    crates = os.path.join(REPO, "crates")
    for name in sorted(os.listdir(crates)) if os.path.isdir(crates) else ():
        path = os.path.join(crates, name, "Cargo.toml")
        if os.path.isfile(path):
            yield path


def is_external_dependency(section, stripped):
    """True for a line of [dependencies] that names a third-party crate. The workspace's own crates (`path = ...`) are not."""
    return (
        section == "[dependencies]"
        and stripped
        and not stripped.startswith("#")
        and "=" in stripped
        and not re.search(r"\bpath\s*=", stripped)
    )


files, lines, tests, ignored = count_rust()

# One program in several crates: a crate two of them use counts once.
deps = set()
for manifest in manifests():
    section = ""
    for line in open(manifest, encoding="utf-8"):
        stripped = line.strip()
        if stripped.startswith("["):
            section = stripped
            continue
        if is_external_dependency(section, stripped):
            deps.add(re.split(r"[\s.=]", stripped, maxsplit=1)[0])

out = {"rust_lines": lines, "rust_files": files, "test_functions": tests,
       "offline_tests": tests - ignored, "ignored_tests": ignored, "dependencies": len(deps),
       "counted_on": datetime.date.today().isoformat(),
       "note": "Counted from src/, tests/ and crates/ with scripts/receipts.py; tests are #[test] and #[tokio::test] attributes (offline = not #[ignore]), not a test run; dependencies are the distinct third-party crates in [dependencies] of Cargo.toml and crates/*/Cargo.toml."}
dst = os.path.join(HERE, "..", "site", "data", "receipts.json")
with open(dst, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=1)
print(json.dumps(out, indent=1))
