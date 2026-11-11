// Shared by the tests: where the site lives, a few readers for its files, and a static file server for the browser tests.

import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { extname, join, normalize, posix, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const SITE = join(ROOT, "site");

export const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
export const readSite = (rel) => readFileSync(join(SITE, rel), "utf8");
export const sizeOf = (siteRel) => statSync(join(SITE, siteRel)).size;

/**
 * The start tags of an HTML document as { name, attrs } (attribute names lower-cased, values as written).
 * Comments are dropped first. It is a reader for this site's hand-written markup, not a general HTML parser.
 */
export function startTags(html) {
  const tags = [];
  const source = html.replace(/<!--[\s\S]*?-->/g, "");
  const tag = /<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
  const attr = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const m of source.matchAll(tag)) {
    const attrs = {};
    for (const a of m[2].matchAll(attr)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? "";
    tags.push({ name: m[1].toLowerCase(), attrs });
  }
  return tags;
}

/** The modules a module imports, as specifiers, in source order (static and dynamic). */
export function importSpecifiers(source) {
  const found = [];
  const re = /^\s*import\s*(?:[^'";]*?\sfrom\s*)?["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/gm;
  for (const m of source.matchAll(re)) found.push(m[1] ?? m[2]);
  return found;
}

/** A site-relative path ("assets/js/main.js") resolved from another site-relative file. */
export const fromFile = (file, specifier) => posix.normalize(posix.join(posix.dirname(file), specifier));

/** Every module reachable from `entry` (site-relative), the entry first, in discovery order. */
export function moduleGraph(entry) {
  const seen = [];
  const walk = (file) => {
    if (seen.includes(file)) return;
    seen.push(file);
    for (const spec of importSpecifiers(readSite(file))) walk(fromFile(file, spec));
  };
  walk(entry);
  return seen;
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * Serves site/ on 127.0.0.1 at a port the system picks. Nothing is cached, so every run sees the files as they are.
 * `log` receives { path, at } for each request, in the order they arrive. `slow(path)` returns how many ms to hold the
 * answer for that path (a test uses it to make a file arrive late).
 */
export function serveSite({ log = () => {}, slow = () => 0 } = {}) {
  const server = createServer((req, res) => setTimeout(() => answer(req, res), slow(new URL(req.url, "http://localhost").pathname)));
  function answer(req, res) {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    log({ path, at: performance.now() });
    const file = resolve(SITE, normalize("." + (path.endsWith("/") ? path + "index.html" : path)));
    let body;
    try {
      if (file !== SITE && !file.startsWith(SITE + sep)) throw new Error("outside the site");
      body = readFileSync(file);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" }).end(body);
  }
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      ok({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => { server.close(done); server.closeAllConnections(); }),
      });
    });
  });
}
