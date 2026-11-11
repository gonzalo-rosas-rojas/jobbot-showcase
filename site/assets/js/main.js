// Boot: build the fixed layers, wire the acts to the engine, keep the HUD honest.

import { QA, clockText } from "./util.js";
import { createDial } from "./dial.js";
import { createSky } from "./sky.js";
import { createRig } from "./rig.js";
import { createEngine } from "./engine.js";
import { createHero } from "./scenes/hero.js";
import { createRead } from "./scenes/read.js";
import { createLayers } from "./scenes/layers.js";
import { createForm } from "./scenes/form.js";
import { createMachine, showReceipts } from "./scenes/machine.js";
import { createFollow } from "./scenes/follow.js";
import { createApprove } from "./scenes/approve.js";
import { createHonest } from "./scenes/honest.js";
import { createTry } from "./try.js";
import { withLang } from "./lang.js";
import { applyLanguage, restoreScroll, t as tr } from "./i18n.js";

// the page's text in this address's language, before any scene reads it
applyLanguage();
// boot.js decided, before the stylesheet, which page this is: the animated one ("js" on <html>), or the document that
// reduced motion and no scripts get ("still", here). The decision is made once and nothing below asks again.
const STILL = document.documentElement.classList.contains("still");

function startStory() {
  const SCENES = { hero: createHero, read: createRead, layers: createLayers, form: createForm, machine: createMachine, follow: createFollow, approve: createApprove, honest: createHonest };

  const dialHost = document.getElementById("dial");
  const plane = document.getElementById("plane");
  const iframe = plane.querySelector("iframe");

  // The panel on the plane weighs more than the rest of the page together and is not on screen until the hero has been
  // scrolled a little (rig.js starts fading it in at u 0.12). So it does not compete with the page's own files: it starts
  // once the page has loaded and painted and the browser is idle, or sooner if the visitor scrolls toward it. The address
  // is set here, not in the HTML, so that ?lang= of this address reaches the panel in its one request.
  const PANEL_NEAR = 0.03; // the story position (act index + progress) at which the panel starts loading regardless
  let panelStarted = false;
  function startPanel() {
    if (panelStarted) return;
    panelStarted = true;
    iframe.src = withLang(iframe.dataset.src);
  }
  const whenIdle = (fn) => ("requestIdleCallback" in window ? window.requestIdleCallback(fn, { timeout: 1000 }) : window.setTimeout(fn, 300));
  const afterFirstPaint = () => requestAnimationFrame(() => requestAnimationFrame(() => whenIdle(startPanel)));
  if (document.readyState === "complete") afterFirstPaint();
  else window.addEventListener("load", afterFirstPaint, { once: true });

  const dial = createDial(dialHost);
  const sky = createSky(document.getElementById("sky"));
  const rig = createRig({ dialHost, dial, plane, iframe, heroCopy: document.querySelector(".a1-copy"), readCopy: document.querySelector(".a2-copy") });
  const clockEl = document.getElementById("clock");
  const labelEl = document.getElementById("act-label");
  const progEl = document.getElementById("progress");

  const acts = [...document.querySelectorAll(".act")].map((el) => {
    const make = SCENES[el.dataset.scene];
    return {
      el,
      label: el.dataset.label || "",
      nightFrom: parseFloat(el.dataset.from),
      nightTo: parseFloat(el.dataset.to),
      scene: make ? make(el) : null,
    };
  });

  const tryPanel = createTry();
  let lastLabel = "";
  let lastClock = "";
  let panelSeen = false;
  const engine = createEngine({
    acts,
    onFrame(ctx) {
      if (ctx.u > PANEL_NEAR) startPanel();
      sky.update(ctx.nightT, ctx.sy);
      rig.update(ctx);
      const c = clockText(ctx.nightT);
      if (c !== lastClock) {
        lastClock = c;
        clockEl.textContent = c;
      }
      const lab = acts[ctx.idx] ? acts[ctx.idx].label : "";
      if (lab !== lastLabel) {
        lastLabel = lab;
        labelEl.textContent = lab;
      }
      // the panel is on screen from act 2 on, so that is when "Use the panel" shows up in the HUD
      const seen = ctx.idx >= 1;
      if (seen !== panelSeen) {
        panelSeen = seen;
        document.documentElement.classList.toggle("panel-seen", seen);
      }
      progEl.style.transform = `scaleX(${ctx.total.toFixed(4)})`;
    },
  });

  function relayout() {
    rig.layout(window.innerWidth, window.innerHeight);
    engine.refit();
    engine.snap();
  }
  window.addEventListener("resize", relayout);
  relayout();
  // coming from the other language: the same point of the night
  if (restoreScroll()) engine.snap();
  // the iframe knows its size only after layout; once the demo has loaded, lay out again
  iframe.addEventListener("load", () => {
    if (!iframe.getAttribute("src")) return; // the empty document every iframe starts with is not the panel
    rig.setReady(true);
    relayout();
  });
  // the phone layout is measured from the copy's boxes, which move when a web font replaces its fallback: measure again then
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  // a hook for screenshots and tests, only when the address says ?qa=1: jump to a scroll position with no smoothing
  if (QA) window.__night = { snap: () => engine.snap(), rig, tryPanel };
}

// Reduced motion: no scroll engine, no sky, no scene, and the panel is not requested until someone presses "Use the panel".
// What needs scripts and moves nothing still runs: the language (above), the button that opens the panel, the closing word
// in the visitor's language, the counted figures and where the reader was when they switched language.
function startStill() {
  createTry({ warm: false });
  document.getElementById("h8").textContent = tr("honest.word");
  showReceipts(document.getElementById("a5"));
  restoreScroll();
}

if (STILL) startStill();
else startStory();
