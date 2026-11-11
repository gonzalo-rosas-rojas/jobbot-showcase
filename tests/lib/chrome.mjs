// A small Chrome driver for the browser tests: no packages, no ports. Chrome is started headless with a profile in a
// temporary folder and talks to this process over a pipe (--remote-debugging-pipe, the Chrome DevTools Protocol with
// NUL-terminated JSON messages), so nothing listens on the machine and two runs never collide. Only the process started
// here is ever stopped.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

/** The Chrome to use: $CHROME_PATH if set, else the first usual install location, else null. */
export function findChrome() {
  if (process.env.CHROME_PATH) return existsSync(process.env.CHROME_PATH) ? process.env.CHROME_PATH : null;
  return CANDIDATES.find((p) => existsSync(p)) ?? null;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Re-checks `check` every `every` ms until it returns something truthy, and returns that. Fails with `what` after `ms`. */
export async function until(check, what, { ms = 8000, every = 25 } = {}) {
  const end = performance.now() + ms;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (performance.now() > end) throw new Error(`timed out after ${ms} ms waiting for ${what}`);
    await wait(every);
  }
}

export async function launchChrome({ width = 1440, height = 900 } = {}) {
  const exe = findChrome();
  if (!exe) throw new Error("Chrome not found");
  const profile = mkdtempSync(path.join(os.tmpdir(), "showcase-chrome-"));
  const child = spawn(
    exe,
    [
      "--headless=new",
      "--remote-debugging-pipe",
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--mute-audio",
      "--force-color-profile=srgb",
      // a CI runner does not let Chrome set up its own sandbox (unprivileged user namespaces are restricted)
      ...(process.env.CI ? ["--no-sandbox"] : []),
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] },
  );
  const [, , , toChrome, fromChrome] = child.stdio;
  const exited = new Promise((r) => child.once("exit", r));
  const killOnExit = () => child.kill();
  process.once("exit", killOnExit);

  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  let buffer = "";
  fromChrome.setEncoding("utf8");
  fromChrome.on("data", (chunk) => {
    buffer += chunk;
    for (let end = buffer.indexOf("\0"); end >= 0; end = buffer.indexOf("\0")) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (message.id !== undefined) {
        const call = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) call.fail(new Error(`${call.method}: ${message.error.message}`));
        else call.ok(message.result);
      } else for (const fn of listeners) fn(message);
    }
  });
  toChrome.on("error", () => {}); // Chrome closing the pipe is not an error of the test

  const send = (method, params = {}, sessionId) =>
    new Promise((ok, fail) => {
      const id = ++nextId;
      pending.set(id, { ok, fail, method });
      toChrome.write(JSON.stringify({ id, method, params, sessionId }) + "\0");
    });

  async function newPage({ width: w = width, height: h = height } = {}) {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const page = await createPage({ send: (m, p) => send(m, p, sessionId), listen: (fn) => listeners.add((msg) => msg.sessionId === sessionId && fn(msg)), width: w, height: h });
    page.close = () => send("Target.closeTarget", { targetId });
    return page;
  }

  async function close() {
    process.off("exit", killOnExit);
    child.kill();
    await exited;
    // Chrome may hold a file for a moment after it exits
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }

  return { version: (await send("Browser.getVersion")).product, newPage, close };
}

async function createPage({ send, listen, width, height }) {
  const problems = []; // console errors and warnings, exceptions, failed loads, CSP violations: { kind, text }
  const requests = []; // { url, type, at } for every request the page (and its frames) made
  const log = []; // every console message, for the tests that look for one in particular
  const waiters = new Set();
  let loadedAt = null;

  listen(({ method, params }) => {
    if (method === "Runtime.consoleAPICalled") {
      const text = params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      log.push({ kind: params.type, text });
      if (["error", "warning", "assert"].includes(params.type)) problems.push({ kind: "console." + params.type, text });
    } else if (method === "Runtime.exceptionThrown") {
      const d = params.exceptionDetails;
      problems.push({ kind: "exception", text: d.exception?.description || d.text });
    } else if (method === "Log.entryAdded") {
      const e = params.entry;
      if (e.level === "error" || e.level === "warning") problems.push({ kind: "log." + e.level, text: e.text + (e.url ? " " + e.url : "") });
    } else if (method === "Network.requestWillBeSent") {
      requests.push({ url: params.request.url, type: params.type, at: params.timestamp });
    } else if (method === "Network.loadingFailed" && !params.canceled) {
      problems.push({ kind: "network", text: `${params.type} ${params.errorText} ${params.blockedReason ?? ""}`.trim() });
    } else if (method === "Page.loadEventFired") {
      loadedAt = params.timestamp;
      for (const w of waiters) w();
    }
  });

  for (const domain of ["Page", "Runtime", "Log", "Network"]) await send(`${domain}.enable`);
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  // a Content-Security-Policy violation is an event inside the page: turn each one into a console error
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `document.addEventListener("securitypolicyviolation", (e) => console.error("CSP violation: " + e.violatedDirective + " " + (e.blockedURI || "")));`,
  });

  const page = {
    problems,
    requests,
    log,
    send,
    get loadedAt() { return loadedAt; },

    /** Opens the address and resolves when the page's load event has fired. Messages from earlier pages are forgotten. */
    async goto(url) {
      problems.length = requests.length = log.length = 0;
      loadedAt = null;
      const loaded = new Promise((r) => waiters.add(r));
      await send("Page.navigate", { url });
      await loaded;
      waiters.clear();
    },

    /** Runs an expression in the page and returns its value (a promise is awaited). */
    async eval(expression) {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(`in the page: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
      return r.result.value;
    },

    /** Waits until an expression evaluated in the page is truthy, and returns its value. */
    waitFor: (expression, what, options) => until(() => page.eval(expression), what ?? expression, options),

    /** Resolves after the page has drawn `n` more frames. */
    frames: (n = 2) => page.eval(`new Promise((done) => { let n = ${n}; const step = () => (--n > 0 ? requestAnimationFrame(step) : done(true)); requestAnimationFrame(step); })`),

    /** Scrolls to a position and waits for the page to draw what that position shows. */
    async scrollTo(y) {
      await page.eval(`window.scrollTo(0, ${y})`);
      await page.frames(3);
    },

    scripting: (enabled) => send("Emulation.setScriptExecutionDisabled", { value: !enabled }),

    reducedMotion: (on) => send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: on ? "reduce" : "no-preference" }] }),

    resize: (w, h) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false }),

    /** Messages of the kinds that mean something is wrong, as readable lines. */
    problemLines: () => problems.map((p) => `${p.kind}: ${p.text}`),
  };
  return page;
}
