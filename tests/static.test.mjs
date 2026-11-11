// Checks that need no browser: what the page refers to, what it is allowed to load, what its policy says, and what it weighs.
// Run with `node --test tests/` from the repository root (Node 20 or later, no packages).

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { describe, it } from "node:test";
import { SITE, fromFile, importSpecifiers, moduleGraph, read, readSite, sizeOf, startTags } from "./lib/site.mjs";

// The most the first load may weigh (HTML, stylesheet, the page's own scripts and fonts), in bytes. It is what the page
// weighed when the budget was set, plus 5 %. When a change goes over it, either the change is too heavy or this number
// is a decision to take on purpose, in the same commit.
const FIRST_LOAD_BUDGET_BYTES = 218962; // 208535 bytes measured, plus 5 %

const html = readSite("index.html");
const css = readSite("assets/css/main.css");
const tags = startTags(html);
const ENTRY = tags.find((t) => t.name === "script" && t.attrs.type === "module").attrs.src;

const stripCssComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");
const external = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const bare = (ref) => ref.split(/[?#]/)[0];
const jsFiles = () => moduleGraph(ENTRY);

/** Every url(...) in the stylesheet that is not a data: URL. */
function cssUrls(text) {
  const urls = [];
  for (const m of stripCssComments(text).matchAll(/url\(\s*"([^"]*)"\s*\)|url\(\s*'([^']*)'\s*\)|url\(\s*([^"')\s][^)]*)\)/g)) {
    const ref = (m[1] ?? m[2] ?? m[3]).trim();
    if (!ref.startsWith("data:")) urls.push(ref);
  }
  return urls;
}

/** Everything index.html asks the browser to fetch for the page itself (links to other pages are not that). */
function htmlResources() {
  const refs = [];
  for (const { name, attrs } of tags) {
    if (name === "link" && attrs.href && !attrs.href.startsWith("data:")) refs.push(attrs.href);
    if (["script", "img", "source", "iframe", "embed"].includes(name) && attrs.src) refs.push(attrs.src);
    if (name === "iframe" && attrs["data-src"]) refs.push(attrs["data-src"]);
  }
  return refs;
}

/** The files the scripts fetch by address: fetch("...") with a literal. */
function fetchedBySource(file) {
  return [...readSite(file).matchAll(/\bfetch\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
}

describe("the files the page refers to", () => {
  it("exist for every resource index.html asks for", () => {
    for (const ref of htmlResources()) assert.ok(sizeOf(bare(ref)) > 0, `index.html refers to ${ref}, which is missing or empty`);
  });

  it("exist for every url() in the stylesheet", () => {
    for (const ref of cssUrls(css)) {
      const file = posix.join("assets/css", bare(ref));
      assert.ok(sizeOf(file) > 0, `main.css refers to ${ref}, which is missing or empty`);
    }
  });

  it("exist for every module a script imports and every file a script fetches", () => {
    for (const file of jsFiles()) {
      for (const spec of importSpecifiers(readSite(file))) {
        assert.ok(sizeOf(fromFile(file, spec)) > 0, `${file} imports ${spec}, which is missing or empty`);
      }
      for (const ref of fetchedBySource(file)) assert.ok(sizeOf(bare(ref)) > 0, `${file} fetches ${ref}, which is missing or empty`);
    }
  });
});

describe("what the page may load", () => {
  it("is all served from the page's own origin", () => {
    const refs = [...htmlResources(), ...cssUrls(css), ...jsFiles().flatMap((f) => [...importSpecifiers(readSite(f)), ...fetchedBySource(f)])];
    assert.ok(refs.length > 20, "the check found suspiciously few references to look at");
    for (const ref of refs) assert.doesNotMatch(ref, external, `${ref} is not on the page's own origin`);
  });

  it("holds no web address in a script except an XML namespace and the text of a link", () => {
    for (const file of jsFiles()) {
      const left = readSite(file)
        .replaceAll("http://www.w3.org/2000/svg", "")
        .replace(/href="https?:\/\/[^"]*"/g, "");
      assert.doesNotMatch(left, /https?:\/\//, `${file} holds a web address that is neither a namespace nor a link`);
    }
  });

  it("holds no @import in the stylesheet", () => {
    assert.doesNotMatch(stripCssComments(css), /@import/);
  });
});

describe("the Content-Security-Policy", () => {
  const meta = tags.find((t) => t.name === "meta" && (t.attrs["http-equiv"] || "").toLowerCase() === "content-security-policy");
  const policy = meta?.attrs.content ?? "";

  it("is the one the README describes", () => {
    const quoted = read("README.md").match(/`(default-src[^`]*)`/);
    assert.ok(quoted, "the README does not quote the policy");
    const norm = (s) => s.split(";").map((d) => d.trim().replace(/\s+/g, " ")).filter(Boolean);
    assert.deepEqual(norm(policy), norm(quoted[1]));
  });

  it("allows nothing beyond the page's own origin, data: images and nothing at all by default", () => {
    const directives = Object.fromEntries(policy.split(";").map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([name, ...sources]) => [name, sources]));
    assert.deepEqual(directives["default-src"], ["'none'"]);
    for (const [name, sources] of Object.entries(directives)) {
      const allowed = name === "img-src" ? ["'self'", "data:"] : ["'self'", "'none'"];
      for (const s of sources) assert.ok(allowed.includes(s), `${name} allows ${s}`);
    }
  });

  it("is not broken by the page as written: no inline script, style or event handler", () => {
    for (const { name, attrs } of tags) {
      if (name === "script") assert.ok(attrs.src, "a <script> without src is an inline script");
      assert.notEqual(name, "style", "a <style> element is inline style");
      for (const attr of Object.keys(attrs)) {
        assert.notEqual(attr, "style", `<${name}> has a style attribute`);
        assert.doesNotMatch(attr, /^on/, `<${name}> has the event handler ${attr}`);
      }
    }
  });

  it("is not broken by the markup the scripts write", () => {
    for (const file of jsFiles()) {
      assert.doesNotMatch(readSite(file), /<[a-z][^>]*\s(?:style|on[a-z]+)\s*=/i, `${file} writes markup with a style attribute or an event handler`);
      assert.doesNotMatch(readSite(file), /setAttribute\(\s*["'](?:style|on[a-z]+)["']/i, `${file} sets a style attribute or an event handler`);
    }
  });
});

describe("the vendored fonts", () => {
  const notes = readSite("assets/fonts/VENDORED.md");
  const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
  const rows = [...notes.matchAll(/^\|\s*`([^`]+\.woff2)`.*\|\s*(\d+)\s*\|\s*`([0-9a-f]{64})`\s*\|\s*$/gm)].map((m) => ({ file: m[1], bytes: Number(m[2]), sha: m[3] }));

  it("are the files VENDORED.md lists, no more and no fewer", () => {
    const onDisk = readdirSync(join(SITE, "assets/fonts")).filter((f) => f.endsWith(".woff2")).sort();
    assert.deepEqual(rows.map((r) => r.file).sort(), onDisk);
  });

  it("match the size and sha256 VENDORED.md declares", () => {
    assert.ok(rows.length > 0);
    for (const { file, bytes, sha } of rows) {
      const data = readFileSync(join(SITE, "assets/fonts", file));
      assert.equal(data.length, bytes, `${file}: size`);
      assert.equal(sha256(data), sha, `${file}: sha256`);
    }
  });

  it("have a licence text that matches the sha256 VENDORED.md declares (line endings normalised to LF, as it says)", () => {
    const licences = [...notes.matchAll(/^\|\s*`(licenses\/[^`]+)`.*\|\s*`([0-9a-f]{64})`\s*\|\s*$/gm)];
    assert.equal(licences.length, rows.length, "one licence per face");
    for (const [, file, sha] of licences) {
      const text = readFileSync(join(SITE, "assets/fonts", file), "utf8").replace(/\r\n/g, "\n");
      assert.equal(sha256(text), sha, file);
    }
  });

  it("weigh what the README and DESIGN.md say", () => {
    const total = rows.reduce((sum, r) => sum + r.bytes, 0);
    const readme = Number(read("README.md").match(/(\d+) KB in total/)[1]);
    const design = Number(read("docs/DESIGN.md").match(/(\d+) KB together/)[1]);
    assert.equal(readme, Math.round(total / 1024));
    assert.equal(design, Math.round(total / 1024));
    assert.match(notes, new RegExp(`Total: ${total} bytes`));
  });
});

describe("site/data/receipts.json", () => {
  const receipts = JSON.parse(readSite("data/receipts.json"));
  // the fields the story reads: machine.js for the three counters and i18n.js for the Spanish note
  const readByTheStory = { rust_lines: "machine.js", offline_tests: "machine.js", dependencies: "machine.js", rust_files: "i18n.js", counted_on: "machine.js" };

  it("has every field the story reads, as a count or a date", () => {
    for (const key of Object.keys(readByTheStory)) {
      if (key === "counted_on") assert.match(receipts[key], /^\d{4}-\d{2}-\d{2}$/, key);
      else assert.ok(Number.isInteger(receipts[key]) && receipts[key] >= 0, `${key} is a count`);
    }
  });

  it("is still read under those names by the scripts", () => {
    for (const [key, file] of Object.entries(readByTheStory)) {
      const source = readSite(file === "machine.js" ? "assets/js/scenes/machine.js" : "assets/js/i18n.js");
      assert.ok(source.includes(key), `${file} no longer reads ${key}`);
    }
  });

  it("is consistent: offline tests are the tests that are not ignored", () => {
    assert.equal(receipts.offline_tests, receipts.test_functions - receipts.ignored_tests);
  });
});

describe("the first load", () => {
  const preloaded = tags.filter((t) => t.name === "link" && t.attrs.rel === "modulepreload").map((t) => t.attrs.href);

  it("preloads every module the entry script imports, directly or not, and no other", () => {
    const needed = moduleGraph(ENTRY).filter((f) => f !== ENTRY);
    assert.deepEqual([...preloaded].sort(), [...needed].sort());
  });

  it("weighs no more than its budget", () => {
    const fonts = [...stripCssComments(css).matchAll(/@font-face[^}]*url\(\s*["']?([^"')]+)/g)].map((m) => posix.join("assets/css", m[1]));
    const files = ["index.html", "assets/css/main.css", ...moduleGraph(ENTRY), ...fonts];
    const bootScripts = tags.filter((t) => t.name === "script" && t.attrs.src && t.attrs.type !== "module").map((t) => t.attrs.src);
    const weight = [...new Set([...files, ...bootScripts])].reduce((sum, f) => sum + sizeOf(f), 0);
    assert.ok(weight <= FIRST_LOAD_BUDGET_BYTES, `the first load weighs ${weight} bytes; the budget is ${FIRST_LOAD_BUDGET_BYTES}`);
  });
});
