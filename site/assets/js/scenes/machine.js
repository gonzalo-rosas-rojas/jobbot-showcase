// Act 05 · 04:00 · Machine room. The real chain of modules (names taken from src/ and crates/) is drawn by the scroll:
// each wire strokes in, each node appears, and a gold token (one application) travels the chain to the
// person at the end. Then the layer under it is drawn, and the counted numbers arrive from
// data/receipts.json, which scripts/receipts.py writes. Nothing here is a claim the repo can't back.

import { isPhone, clamp, fmtCount, lerp, qaWarn, smooth, easeOutExpo, track } from "../util.js";
import { WIDE_CLOSE, createCamera, isWide, createRoomFit, createWideCamera } from "../camera.js";
import { t as tr } from "../i18n.js";

// when each node appears (scroll progress inside the act); order matches the SVG
const NODE_AT = [0.05, 0.11, 0.17, 0.23, 0.3, 0.36, 0.42, 0.48, 0.56, 0.6, 0.64];
// wire draw ranges, in SVG order: three row-1 links, the elbow, three row-2 links, the layer under
const WIRE_AT = [[0.08, 0.11], [0.14, 0.17], [0.2, 0.23], [0.24, 0.3], [0.33, 0.36], [0.39, 0.42], [0.45, 0.48], [0.52, 0.64]];

// the token follows the chain through the centre of each node (SVG units)
const ROUTE = [[85, 72], [320, 72], [555, 72], [790, 72], [790, 150], [85, 150], [85, 228], [320, 228], [555, 228], [705, 228]];
const LEGS = ROUTE.slice(1).map((pt, i) => Math.hypot(pt[0] - ROUTE[i][0], pt[1] - ROUTE[i][1]));
const TOTAL = LEGS.reduce((a, b) => a + b, 0);

// the drawing's own size (SVG units) and the places the cameras look at
const VIEW = { w: 880, h: 440 };
const VIEW_MID_X = VIEW.w / 2; // the cameras end up centred on the picture's middle
const PHONE_CLOSE_W = 440; // phones: the visible width while following the token (2x), pulling back to VIEW.w
const LAYER_UNDER_Y_PHONE = 330; // phones: where the camera drops to look at the layer under the chain
const LAYER_UNDER_Y_WIDE = 300; // wide screens: the same
const PICTURE_MID_Y = 220; // where both end up, with the whole picture in view

function onRoute(f) {
  let d = clamp(f) * TOTAL;
  for (let i = 0; i < LEGS.length; i++) {
    if (d <= LEGS[i] || i === LEGS.length - 1) {
      const t = LEGS[i] ? d / LEGS[i] : 1;
      return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * t, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * t];
    }
    d -= LEGS[i];
  }
  return ROUTE[ROUTE.length - 1];
}

const counters = (root) => ({ lines: root.querySelector("#r-lines"), tests: root.querySelector("#r-tests"), deps: root.querySelector("#r-deps") });

/** The three figures, not counted yet: dashes rather than invented values. */
const resetFigures = (out) => {
  for (const el of Object.values(out)) el.textContent = "–";
};

/** The three figures written from the receipts; `k` (0..1) is how far the count-up has got. */
const writeFigures = (out, j, k = 1) => {
  out.lines.textContent = fmtCount(j.rust_lines * k);
  out.tests.textContent = fmtCount(j.offline_tests * k);
  out.deps.textContent = fmtCount(j.dependencies * k);
};

/** Reads data/receipts.json, writes the note under the figures and hands the numbers to `then`. A failure to read it is
 *  reported (with ?qa=1) and leaves the dashes; an error thrown by `then` is not that, and is left to show. */
function loadReceipts(note, then) {
  fetch("data/receipts.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then(
      (j) => {
        if (j && j.counted_on) note.textContent = tr("machine.note", j);
        then(j);
      },
      (e) => qaWarn("machine: data/receipts.json is not usable, the counters stay as dashes", e),
    );
}

/** With reduced motion nothing counts up: the three figures are written once, finished, and the note under them with them. */
export function showReceipts(root) {
  const out = counters(root);
  resetFigures(out);
  loadReceipts(root.querySelector("#r-note"), (j) => writeFigures(out, j));
}

export function createMachine(root) {
  const copy = root.querySelector(".a5-copy");
  const caps = [...root.querySelectorAll(".cap")];
  const stats = root.querySelector(".stats");
  const note = root.querySelector("#r-note");
  const arch = root.querySelector(".arch");
  const nodes = [...root.querySelectorAll(".node")];
  const wires = [...root.querySelectorAll(".wire")];
  const token = root.querySelector(".token");
  const camera = createCamera(arch.querySelector("svg"), VIEW);
  const wideCam = createWideCamera(arch, arch.querySelector("svg"), VIEW);
  const room = createRoomFit(camera, copy, arch); // phones: the camera's window fits the free room (see camera.js)
  const out = counters(root);

  // the counted numbers; if the file is missing the figures stay as dashes rather than invented values
  let receipts = null;
  loadReceipts(note, (j) => { receipts = j; });
  resetFigures(out);

  function updateCopy(ctx, fx) {
    const inn = fx.inn;
    const gone = fx.out;
    const vis = inn * (1 - gone);
    copy.style.opacity = vis.toFixed(3);
    // phones: a shorter lift on the way out, so the headline does not climb into the diagram above it
    copy.style.transform = `translate3d(0,${((1 - inn) * 5 - gone * (isPhone(ctx.vw) ? 1.5 : 4)).toFixed(2)}vh,0)`;
    arch.style.opacity = vis.toFixed(3);
  }

  function updateChain(p, gone) {
    // two captions, one after the other
    caps[0].style.opacity = (smooth(0.03, 0.08, p) * (1 - smooth(0.48, 0.52, p))).toFixed(3);
    caps[1].style.opacity = (smooth(0.54, 0.58, p) * (1 - gone)).toFixed(3);

    nodes.forEach((n, i) => {
      n.style.opacity = smooth(NODE_AT[i], NODE_AT[i] + 0.035, p).toFixed(3);
    });
    wires.forEach((w, i) => {
      const [a, b] = WIRE_AT[i];
      w.style.strokeDashoffset = (1 - smooth(a, b, p)).toFixed(4);
    });

    // one application travelling the chain, then waiting for the person
    const f = smooth(0.06, 0.5, p);
    const [x, y] = onRoute(f);
    token.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    token.style.opacity = (smooth(0.04, 0.08, p) * (1 - gone)).toFixed(3);
    return [x, y];
  }

  // phone: follow the token a beat behind it, drop to the layer under the chain, then pull back (a viewBox at
  // 2x). Wide screens get the same move in a window right of the copy, starting as close as the phone does in
  // absolute size, so that the subject is big at every scroll position and the picture is whole at the end.
  function updateCamera(p, ctx, [x, y]) {
    const [tx, ty] = onRoute(smooth(0.1, 0.52, p));
    const down = smooth(0.52, 0.62, p);
    const pullBack = smooth(0.7, 0.86, p);
    // a value that starts at `from`, goes to `downTo` as the camera drops, then to `pulledTo` as it pulls back
    const settle = (from, downTo, pulledTo) => lerp(lerp(from, downTo, down), pulledTo, pullBack);
    const cx = settle(tx, VIEW_MID_X, VIEW_MID_X);
    const { vw, vh } = ctx;
    if (isWide(vw, vh)) {
      camera.reset();
      const frame = wideCam.measure(vw, vh);
      // how close the camera wants to be, in window px per SVG unit: biggest on the first node, whole picture at the end
      const want = WIDE_CLOSE * (vh / 1080) * track([[0, 1.25], [0.1, 1.25], [0.3, 1], [0.5, 0.82], [0.62, 0.63], [0.7, 0.63], [0.86, 0], [1, 0]], p);
      const zoom = frame.zoomFor(want);
      // centred on the token itself: at this zoom the window shows the nodes around it, and the empty part ahead of it
      // is where the next node is about to appear
      frame.aim({ cx: settle(x, VIEW_MID_X, VIEW_MID_X), cy: settle(y, LAYER_UNDER_Y_WIDE, PICTURE_MID_Y), zoom });
    } else {
      wideCam.reset();
      if (isPhone(vw)) camera.aim(cx, settle(ty, LAYER_UNDER_Y_PHONE, PICTURE_MID_Y), lerp(PHONE_CLOSE_W, VIEW.w, pullBack));
      else camera.reset();
    }
  }

  function updateReceipts(p) {
    const s = smooth(0.62, 0.7, p);
    stats.style.opacity = s.toFixed(3);
    note.style.opacity = smooth(0.7, 0.78, p).toFixed(3);
    if (receipts) {
      const k = easeOutExpo(smooth(0.64, 0.86, p));
      writeFigures(out, receipts, k);
    }
  }

  return {
    resize: room.reset,
    update(p, ctx, _cur, fx) {
      room.fit(ctx.vw, ctx.vh);
      updateCopy(ctx, fx);
      const tokenAt = updateChain(p, fx.out);
      updateCamera(p, ctx, tokenAt);
      updateReceipts(p);
    },
  };
}
