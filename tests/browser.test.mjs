// Checks that need a browser: they open the site in a headless Chrome of their own (own profile in a temporary folder,
// no fixed port) served from a static server on a port the system picks. They are skipped, with a message, when
// Chrome is not found; set CHROME_PATH to its location, or SHOWCASE_REQUIRE_BROWSER=1 to make a missing Chrome a failure.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { findChrome, launchChrome, until } from "./lib/chrome.mjs";
import { serveSite } from "./lib/site.mjs";

const required = process.env.SHOWCASE_REQUIRE_BROWSER === "1";
const skip = !required && !findChrome() ? "Chrome was not found: set CHROME_PATH to run the browser tests" : false;

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

let server;
let chrome;
let panelDelayMs = 0; // set by the test that needs the panel to arrive late

before(async () => {
  if (skip) return;
  server = await serveSite({ slow: (path) => (path === "/demo/index.html" ? panelDelayMs : 0) });
  chrome = await launchChrome(DESKTOP);
});

after(async () => {
  await chrome?.close();
  await server?.close();
});

/** Opens the page in a new tab of the test browser. `scripting: false` turns JavaScript off; `reducedMotion` asks for less motion. */
async function open(search, { size = DESKTOP, scripting = true, reducedMotion = false, beforeLoad } = {}) {
  const page = await chrome.newPage(size);
  await page.reducedMotion(reducedMotion);
  await page.scripting(scripting);
  await beforeLoad?.(page);
  await page.goto(`${server.origin}/${search}`);
  return page;
}

const demoRequests = (page) => page.requests.filter((r) => new URL(r.url).pathname === "/demo/index.html");
const scrollRange = (page) => page.eval("document.documentElement.scrollHeight - innerHeight");
const actTop = (page, id) => page.eval(`document.getElementById("${id}").getBoundingClientRect().top + scrollY`);

/** Scrolls the whole story from the top to the bottom in steps of a bit less than a screen. */
async function walkTheStory(page) {
  const range = await scrollRange(page);
  const step = Math.round((await page.eval("innerHeight")) * 0.7);
  for (let y = 0; y < range; y += step) await page.scrollTo(y);
  await page.scrollTo(range);
}

describe("the story in a browser", { skip }, () => {
  for (const [name, search, size] of [
    ["in English on a desktop", "?qa=1", DESKTOP],
    ["in Spanish on a desktop", "?lang=es&qa=1", DESKTOP],
    ["in English on a phone", "?qa=1", PHONE],
  ]) {
    it(`scrolls from the first screen to the last ${name} with nothing in the console and nothing asked of another origin`, async () => {
      const page = await open(search, { size });
      await page.waitFor(`document.documentElement.classList.contains("js")`, "the scripts to start");
      await walkTheStory(page);
      assert.equal(await page.eval(`document.documentElement.classList.contains("on-paper")`), true, "the walk did not reach the closing act");
      assert.deepEqual(page.problemLines(), []);
      const foreign = page.requests.filter((r) => /^https?:/.test(r.url) && new URL(r.url).origin !== server.origin);
      assert.deepEqual(foreign.map((r) => r.url), []);
      await page.close();
    });
  }

  it("writes the story in Spanish, with the language the address asks for", async () => {
    const page = await open("?lang=es&qa=1");
    assert.equal(await page.eval("document.documentElement.lang"), "es");
    assert.match(await page.eval(`document.getElementById("h1").textContent`), /El bot trabaja/);
    await page.close();
  });

  it("offers the testing hook only when the address says ?qa=1", async () => {
    const plain = await open("");
    assert.equal(await plain.eval(`typeof window.__night`), "undefined");
    await plain.close();
    const qa = await open("?qa=1");
    assert.equal(await qa.eval(`typeof window.__night`), "object");
    await qa.close();
  });
});

describe("loading the panel", { skip }, () => {
  it("does not ask for the panel until the page has loaded", async () => {
    const page = await open("");
    await until(() => demoRequests(page).length > 0, "the panel to be requested");
    assert.ok(demoRequests(page)[0].at > page.loadedAt, "the panel was requested before the page's load event");
    await page.close();
  });

  it("asks for the panel once, with the language of the address", async () => {
    const page = await open("?lang=es");
    await until(() => demoRequests(page).length > 0, "the panel to be requested");
    await page.frames(5);
    assert.equal(demoRequests(page).length, 1);
    assert.equal(new URL(demoRequests(page)[0].url).searchParams.get("lang"), "es");
    await page.close();
  });

  // the idle callback is taken away, so only the scroll can start the panel
  const noIdle = (page) => page.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.requestIdleCallback = () => 0;` });

  it("starts it sooner when the visitor scrolls toward it", async () => {
    const page = await open("", { beforeLoad: noIdle });
    await page.frames(10);
    assert.equal(demoRequests(page).length, 0, "the panel was requested with nothing to start it");
    await page.scrollTo(Math.round((await actTop(page, "a2")) * 0.1));
    await until(() => demoRequests(page).length > 0, "the panel to be requested");
    await page.close();
  });

  it("never shows the panel before it has content, even when the visitor jumps straight to it", async () => {
    panelDelayMs = 600;
    const page = await open("?qa=1", { beforeLoad: noIdle });
    await page.scrollTo(await actTop(page, "a2"));
    assert.equal(await page.eval(`getComputedStyle(document.getElementById("plane")).visibility`), "hidden", "the panel should wait for its content");
    const state = () => page.eval(`(() => {
      const plane = document.getElementById("plane");
      const doc = plane.querySelector("iframe").contentDocument;
      return { visible: getComputedStyle(plane).visibility === "visible", ready: doc.readyState === "complete" && doc.body.children.length > 0 };
    })()`);
    const seen = [];
    await until(async () => {
      const s = await state();
      seen.push(s);
      return s.visible;
    }, "the panel to appear");
    assert.ok(seen.every((s) => !s.visible || s.ready), "the panel was on screen before it had loaded");
    panelDelayMs = 0;
    await page.close();
  });
});

describe("with the preference for reduced motion", { skip }, () => {
  const skyPicture = `(() => {
    const canvas = document.getElementById("sky");
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height / 2).data;
    let h = 2166136261;
    for (let i = 0; i < data.length; i += 7) h = Math.imul(h ^ data[i], 16777619);
    return h;
  })()`;
  const runningCssAnimations = `document.getAnimations().filter((a) => a instanceof CSSAnimation && a.playState === "running").map((a) => a.animationName)`;

  it("(control) the hero cue loops, its headline rises letter by letter and the stars twinkle without it", async () => {
    const page = await open("");
    assert.ok((await page.eval(runningCssAnimations)).includes("cue"));
    assert.ok((await page.eval(`document.querySelectorAll(".a1-copy .ch").length`)) > 0);
    const before = await page.eval(skyPicture);
    await page.waitFor(`${skyPicture} !== ${before}`, "the stars to twinkle");
    await page.close();
  });

  it("runs no CSS animation of its own and builds the hero headline without letters", async () => {
    const page = await open("", { reducedMotion: true });
    await page.frames(5);
    assert.deepEqual(await page.eval(runningCssAnimations), []);
    assert.equal(await page.eval(`document.querySelectorAll(".a1-copy .ch").length`), 0);
    await page.close();
  });

  it("leaves the sky as it is until the hour changes", async () => {
    const page = await open("", { reducedMotion: true });
    const still = await page.eval(skyPicture);
    // the absence of a redraw can only be shown by waiting: long enough for ten of the sky's 50 ms ticks
    await new Promise((r) => setTimeout(r, 500));
    assert.equal(await page.eval(skyPicture), still);
    await page.scrollTo(2000);
    assert.notEqual(await page.eval(skyPicture), still, "the sky should follow the scroll");
    await page.close();
  });

  // Jumps down the page and reports how far act 2's progress is from where the scroll position puts it, at its worst over
  // the second to fifth frames (the first frame can still show the old position: the page learns of a scroll in that frame).
  const lagBehindScroll = async (page) => {
    await page.scrollTo(await actTop(page, "a2")); // act 2 is on screen and has settled
    return page.eval(`new Promise((done) => {
      const act = document.getElementById("a2");
      const top = act.getBoundingClientRect().top + scrollY;
      window.scrollTo(0, top + 1200);
      const gap = () => {
        const want = Math.min(1, Math.max(0, (scrollY - top) / (act.offsetHeight - innerHeight)));
        return Math.abs(parseFloat(act.style.getPropertyValue("--p")) - want);
      };
      let frame = 0;
      let worst = 0;
      const step = () => {
        if (++frame > 1) worst = Math.max(worst, gap());
        if (frame < 5) requestAnimationFrame(step);
        else done(worst);
      };
      requestAnimationFrame(step);
    })`);
  };

  it("(control) the page eases toward the scroll position without it", async () => {
    const page = await open("");
    assert.ok((await lagBehindScroll(page)) > 0.02);
    await page.close();
  });

  it("reads the scroll position as it is, with no smoothing", async () => {
    const page = await open("", { reducedMotion: true });
    assert.ok((await lagBehindScroll(page)) < 0.001);
    await page.close();
  });

  it("opens the live panel with no transition", async () => {
    const page = await open("", { reducedMotion: true });
    assert.equal(await page.eval(`getComputedStyle(document.getElementById("try")).transitionDuration`), "0s");
    await page.close();
    const control = await open("");
    assert.notEqual(await control.eval(`getComputedStyle(document.getElementById("try")).transitionDuration`), "0s");
    await control.close();
  });
});

describe("without JavaScript", { skip }, () => {
  /** Whether an element can be read: shown, opaque, not clipped away, and inside the width of the screen. */
  const readable = `(el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.left < -1 || r.right > innerWidth + 1) return false;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === "none" || s.visibility !== "visible" || parseFloat(s.opacity) < 1 || s.clipPath !== "none") return false;
    }
    return true;
  }`;
  const story = ".kicker, .lede, .h2, .h7, .sub, .note, .cap, .steps li, .honest, .rules li, .foot";

  for (const [name, size] of [["a desktop", DESKTOP], ["a phone", PHONE]]) {
    it(`shows every line of the eight acts on ${name}`, async () => {
      const page = await open("", { size, scripting: false });
      const unreadable = await page.eval(`(() => {
        const readable = ${readable};
        return [...document.querySelectorAll(".act")].flatMap((act) =>
          [...act.querySelectorAll("h1, ${story}")].filter((el) => el.textContent.trim() && !readable(el)).map((el) => act.id + " " + (el.className || el.tagName) + ": " + el.textContent.trim().slice(0, 40)));
      })()`);
      assert.deepEqual(unreadable, []);
      assert.equal(await page.eval(`document.querySelectorAll(".act").length`), 8);
      await page.close();
    });

    it(`has no empty screens between the acts on ${name}`, async () => {
      const page = await open("", { size, scripting: false });
      const tails = await page.eval(`[...document.querySelectorAll(".act")].map((act) => {
        const end = Math.max(...[...act.querySelectorAll("*")].map((el) => el.getBoundingClientRect().bottom));
        return { id: act.id, blank: Math.round(act.getBoundingClientRect().bottom - end), height: act.getBoundingClientRect().height };
      })`);
      for (const { id, blank, height } of tails) {
        assert.ok(blank <= 200, `${id} ends ${blank} px after its last line`);
        assert.ok(height < 3000, `${id} is ${height} px tall`);
      }
      await page.close();
    });

    it(`shows the links of the closing act on ${name}`, async () => {
      const page = await open("", { size, scripting: false });
      assert.equal(await page.eval(`(${readable})(document.querySelector(".paper-end a"))`), true);
      await page.close();
    });
  }

  it("takes no room for the panel, the sky or the dial, and asks for nothing but the page's files", async () => {
    const page = await open("", { scripting: false });
    const boxes = await page.eval(`["#sky", ".rig", "#dial", ".grain", "#try"].map((s) => [s, getComputedStyle(document.querySelector(s)).display])`);
    assert.deepEqual(boxes.filter(([, display]) => display !== "none"), []);
    assert.deepEqual(demoRequests(page), []);
    // Chrome reports the scripts it was told not to run as blocked; that is the setting of this test, not a fault of the page
    const faults = page.problems.filter((p) => !/^network Script .* csp$/.test(`${p.kind} ${p.text}`));
    assert.deepEqual(faults, []);
    await page.close();
  });

  it("tells the visitor what the animated version needs and links to the demo and the source", async () => {
    const page = await open("", { scripting: false });
    const note = await page.eval(`(() => {
      const p = document.querySelector("p.noscript");
      return p && { shown: getComputedStyle(p).display !== "none", text: p.textContent, links: [...p.querySelectorAll("a")].map((a) => a.getAttribute("href")) };
    })()`);
    assert.ok(note, "no note for visitors without JavaScript");
    assert.equal(note.shown, true);
    assert.match(note.text, /JavaScript/);
    assert.ok(note.links.some((h) => h.startsWith("demo/")), "no link to the demo");
    assert.ok(note.links.some((h) => h.includes("github.com/gonzalo-rosas-rojas/jobbot-showcase")), "no link to the source");
    await page.close();
  });

  it("(control) the note is not shown when scripts run", async () => {
    const page = await open("");
    assert.equal(await page.eval(`document.querySelector("p.noscript") === null`), true);
    await page.close();
  });
});
