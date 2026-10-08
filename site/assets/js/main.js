// Boot: build the fixed layers, wire the acts to the engine, keep the HUD honest.

import { clockText, reducedMotion } from "./util.js";
import { createDial } from "./dial.js";
import { createSky } from "./sky.js";
import { createRig } from "./rig.js";
import { createEngine } from "./engine.js";
import { createHero } from "./scenes/hero.js";
import { createRead } from "./scenes/read.js";
import { createLayers } from "./scenes/layers.js";
import { createForm } from "./scenes/form.js";
import { createMachine } from "./scenes/machine.js";
import { createFollow } from "./scenes/follow.js";
import { createApprove } from "./scenes/approve.js";
import { createHonest } from "./scenes/honest.js";
import { createTry } from "./try.js";

document.documentElement.classList.add("js");
if (reducedMotion()) document.documentElement.classList.add("reduced");

const SCENES = { hero: createHero, read: createRead, layers: createLayers, form: createForm, machine: createMachine, follow: createFollow, approve: createApprove, honest: createHonest };

const dialHost = document.getElementById("dial");
const plane = document.getElementById("plane");
const iframe = plane.querySelector("iframe");
const dial = createDial(dialHost);
const sky = createSky(document.getElementById("sky"));
const rig = createRig({ dialHost, dial, plane, iframe });
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
  engine.measure();
  engine.snap();
}
window.addEventListener("resize", relayout);
relayout();
// the iframe knows its size only after layout; once the demo has loaded, lay out again
iframe.addEventListener("load", relayout);
// a hook for screenshots and tests: jump to a scroll position with no smoothing
window.__night = { snap: () => engine.snap(), rig, tryPanel };
