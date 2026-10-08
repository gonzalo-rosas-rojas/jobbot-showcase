// Act 06 · 07:00 · Follow. After the send, an application lives on five real states (src/tracker.rs):
// submitted, replied, technical_test, interview, offer. A gold token walks them one reply at a time while
// the funnel band narrows (demo numbers: 38, 11, 4, 3, 1). Then the branch the code comments on:
// ghosted is not terminal, a late answer can move it again.

import { lerp, smooth } from "../util.js";
import { createCamera } from "../camera.js";

const XS = [50, 250, 450, 650, 850];
const Y = 170;
const AT = [0.1, 0.24, 0.38, 0.52]; // when the token leaves stop k for stop k+1
const STEP = 0.09;

export function createFollow(root) {
  const copy = root.querySelector(".a6-copy");
  const viz = root.querySelector(".a6-viz");
  const rect = root.querySelector("#bandRect");
  const spine = root.querySelector(".spine");
  const stops = [...root.querySelectorAll(".stop")];
  const token = root.querySelector(".token");
  const ghost = root.querySelector(".node.ghost");
  const gIn = root.querySelector(".ghost-in");
  const gOut = root.querySelector(".ghost-out");
  const head = root.querySelector(".ghost-head");
  const label = root.querySelector(".ghost-label");
  const hit = new Array(stops.length).fill(false);
  const camera = createCamera(viz.querySelector("svg"), { w: 900, h: 440 });

  return {
    update(p, ctx, _cur, fx) {
      const inn = fx.inn;
      const gone = fx.out;
      const vis = inn * (1 - gone);
      copy.style.opacity = vis.toFixed(3);
      copy.style.transform = `translate3d(0,${((1 - inn) * 5 - gone * 4).toFixed(2)}vh,0)`;
      viz.style.opacity = vis.toFixed(3);

      // the token: a staircase of smooth steps, one per reply
      let f = 0;
      for (const a of AT) f += smooth(a, a + STEP, p);
      const x = XS[0] + f * 200;
      token.setAttribute("transform", `translate(${x.toFixed(1)} ${Y})`);
      rect.setAttribute("width", (x + 36).toFixed(1));
      spine.style.strokeDashoffset = (1 - f / 4).toFixed(4);

      stops.forEach((s, k) => {
        const when = k === 0 ? 0.03 : AT[k - 1] + STEP * 0.6;
        s.style.opacity = smooth(when - 0.03, when, p).toFixed(3);
        const on = f >= k - 0.02 && p > 0.03;
        if (on !== hit[k]) {
          hit[k] = on;
          s.classList.toggle("is-hit", on);
        }
      });

      // phone only: follow the token a beat behind it along the line, then slide right to frame the ghosted branch
      let lag = 0;
      for (const a of AT) lag += smooth(a + 0.03, a + STEP + 0.03, p);
      const branch = smooth(0.56, 0.72, p);
      camera.aim(
        ctx && ctx.vw < 760,
        lerp(XS[0] + lag * 200 + 80, 500, branch),
        lerp(Y, 230, branch),
        lerp(450, 560, branch),
      );

      // ghosted: a branch that is not a dead end
      ghost.style.opacity = smooth(0.62, 0.7, p).toFixed(3);
      gIn.style.strokeDashoffset = (1 - smooth(0.6, 0.68, p)).toFixed(4);
      gOut.style.strokeDashoffset = (1 - smooth(0.72, 0.86, p)).toFixed(4);
      head.style.opacity = smooth(0.85, 0.88, p).toFixed(3);
      label.style.opacity = smooth(0.84, 0.9, p).toFixed(3);
    },
  };
}
