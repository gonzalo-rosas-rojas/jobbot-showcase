// Act 05 · 04:00 · Machine room. The real chain of modules (names taken from src/ and crates/) is drawn by the scroll:
// each wire strokes in, each node appears, and a gold token (one application) travels the chain to the
// person at the end. Then the layer under it is drawn, and the counted numbers arrive from
// data/receipts.json, which scripts/receipts.py writes. Nothing here is a claim the repo can't back.

import { clamp, lerp, smooth, easeOutExpo, track } from "../util.js";
import { createCamera, createWideCamera, phoneRatio } from "../camera.js";

// when each node appears (scroll progress inside the act); order matches the SVG
const NODE_AT = [0.05, 0.11, 0.17, 0.23, 0.3, 0.36, 0.42, 0.48, 0.56, 0.6, 0.64];
// wire draw ranges, in SVG order: three row-1 links, the elbow, three row-2 links, the layer under
const WIRE_AT = [[0.08, 0.11], [0.14, 0.17], [0.2, 0.23], [0.24, 0.3], [0.33, 0.36], [0.39, 0.42], [0.45, 0.48], [0.52, 0.64]];

// the token follows the chain through the centre of each node (SVG units)
const ROUTE = [[85, 72], [320, 72], [555, 72], [790, 72], [790, 150], [85, 150], [85, 228], [320, 228], [555, 228], [705, 228]];
const LEGS = ROUTE.slice(1).map((pt, i) => Math.hypot(pt[0] - ROUTE[i][0], pt[1] - ROUTE[i][1]));
const TOTAL = LEGS.reduce((a, b) => a + b, 0);
const CLOSE = 2.3; // wide screens: window px per SVG unit at the closest the camera gets

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

export function createMachine(root) {
  const copy = root.querySelector(".a5-copy");
  const caps = [...root.querySelectorAll(".cap")];
  const stats = root.querySelector(".stats");
  const note = root.querySelector("#r-note");
  const arch = root.querySelector(".arch");
  const nodes = [...root.querySelectorAll(".node")];
  const wires = [...root.querySelectorAll(".wire")];
  const token = root.querySelector(".token");
  const camera = createCamera(arch.querySelector("svg"), { w: 880, h: 440 });
  const wideCam = createWideCamera(arch, arch.querySelector("svg"), { w: 880, h: 440 });
  // phones: the camera's window is as tall as the free room between the dial and the copy (the diagram is not squeezed on
  // a tall phone and does not run into its own caption on a short one)
  let roomKey = "";
  const fitRoom = (vw, vh) => {
    const key = vw + "x" + vh;
    if (key === roomKey) return;
    roomKey = key;
    if (vw < 760) camera.setRatio(phoneRatio(copy.offsetTop - 12 - arch.offsetTop, arch.offsetWidth));
  };
  const out = { lines: root.querySelector("#r-lines"), tests: root.querySelector("#r-tests"), deps: root.querySelector("#r-deps") };
  const fmt = (n) => Math.round(n).toLocaleString("en-US");

  // the counted numbers; if the file is missing the figures stay as dashes rather than invented values
  let receipts = null;
  fetch("data/receipts.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      receipts = j;
      if (j && j.counted_on) note.textContent = `Counted on ${j.counted_on} by scripts/receipts.py: ${j.rust_files} Rust files; tests are #[test]s not marked #[ignore], not a test run.`;
    })
    .catch(() => {});
  for (const el of Object.values(out)) el.textContent = "–";

  return {
    resize() {
      roomKey = "";
    },
    update(p, ctx, _cur, fx) {
      fitRoom(ctx ? ctx.vw : window.innerWidth, ctx ? ctx.vh : window.innerHeight);
      const inn = fx.inn;
      const gone = fx.out;
      const vis = inn * (1 - gone);
      copy.style.opacity = vis.toFixed(3);
      // phones: a shorter lift on the way out, so the headline does not climb into the diagram above it
      copy.style.transform = `translate3d(0,${((1 - inn) * 5 - gone * (ctx && ctx.vw < 760 ? 1.5 : 4)).toFixed(2)}vh,0)`;
      arch.style.opacity = vis.toFixed(3);

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

      // phone: follow the token a beat behind it, drop to the layer under the chain, then pull back (a viewBox at
      // 2x). Wide screens get the same move in a window right of the copy, starting as close as the phone does in
      // absolute size, so that the subject is big at every scroll position and the picture is whole at the end.
      const [tx, ty] = onRoute(smooth(0.1, 0.52, p));
      const down = smooth(0.52, 0.62, p);
      const wide = smooth(0.7, 0.86, p);
      const cx = lerp(lerp(tx, 440, down), 440, wide);
      const vw = ctx ? ctx.vw : window.innerWidth;
      const vh = ctx ? ctx.vh : window.innerHeight;
      if (vw > 760 && vh >= 600) {
        camera.aim(false);
        // how close the camera wants to be, in window px per SVG unit: biggest on the first node, whole picture at the end
        const want = CLOSE * (vh / 1080) * track([[0, 1.25], [0.1, 1.25], [0.3, 1], [0.5, 0.82], [0.62, 0.63], [0.7, 0.63], [0.86, 0], [1, 0]], p);
        const zoom = wideCam.zoomFor(vw, vh, want);
        // centred on the token itself: at this zoom the window shows the nodes around it, and the empty part ahead of it
        // is where the next node is about to appear
        wideCam.aim(vw, vh, lerp(lerp(x, 440, down), 440, wide), lerp(lerp(y, 300, down), 220, wide), zoom);
      } else {
        wideCam.off();
        camera.aim(vw < 760, cx, lerp(lerp(ty, 330, down), 220, wide), lerp(440, 880, wide));
      }

      // the receipts
      const s = smooth(0.62, 0.7, p);
      stats.style.opacity = s.toFixed(3);
      note.style.opacity = smooth(0.7, 0.78, p).toFixed(3);
      if (receipts) {
        const k = easeOutExpo(smooth(0.64, 0.86, p));
        out.lines.textContent = fmt(receipts.rust_lines * k);
        out.tests.textContent = fmt((receipts.offline_tests ?? receipts.test_functions) * k);
        out.deps.textContent = fmt(receipts.dependencies * k);
      }
    },
  };
}
