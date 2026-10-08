// Act 03 · 22:30 · Decide. Five glass plates (posting, score, CV, answers, gate) start as one block, then
// come apart as you scroll. Readable text lives outside the 3D, in the left column and in the tags that
// leader lines tie to each plate; the plates themselves carry only shape and one number (the score).
// The score counts from 0 to 92 while its plate is the active one, forwards and backwards.

import { clamp, lerp, smooth } from "../util.js";

const SW = 560; // plate size in CSS px, before the stage scales it
const SH = 260;
const GAP = 150; // exploded distance between plates (translateZ)
const N = 5;
const A0 = 0.2; // the five captions share the scroll range A0..A1
const A1 = 0.96;
const SPAN = (A1 - A0) / N;
const SCORE = 92;

export function createLayers(root) {
  const copy = root.querySelector(".a3-copy");
  const steps = [...root.querySelectorAll(".steps li")];
  const pips = [...root.querySelectorAll(".pips i")];
  const stack = root.querySelector(".stack");
  const layers = root.querySelector(".layers");
  const plates = [...root.querySelectorAll(".plate")];
  const tagList = root.querySelector(".tags");
  const tags = [...root.querySelectorAll(".tags li")];
  const paths = [...root.querySelectorAll(".leaders path")];
  const num = root.querySelector("#sc-num");
  const scorePlate = root.querySelector(".p-score");
  const bars = [...root.querySelectorAll(".bars i")];
  const tagScore = tags[1].querySelector("span");
  const anchors = plates.map((pl) => {
    const a = document.createElement("b");
    a.className = "anc";
    pl.append(a);
    return a;
  });

  let active = -2;
  let lastScore = -1;

  // step i is "on" between its two boundaries; a short smooth window at each edge
  const on = (i, p, w = 0.016) => {
    const b0 = A0 + i * SPAN;
    const b1 = b0 + SPAN;
    return smooth(b0 - w, b0 + w, p) * (1 - smooth(b1 - w, b1 + w, p));
  };

  // captions swap one after the other, never together: the old one is gone before the new one starts
  const cap = (i, p) => {
    const b0 = A0 + i * SPAN;
    const b1 = b0 + SPAN;
    return smooth(b0 + 0.004, b0 + 0.02, p) * (1 - smooth(b1 - 0.022, b1 - 0.006, p));
  };

  return {
    update(p, ctx, _cur, fx) {
      const { vw, vh } = ctx;
      const narrow = vw < 760;

      const inn = fx.inn;
      const out = fx.out;
      const vis = inn * (1 - out);
      copy.style.opacity = vis.toFixed(3);
      copy.style.transform = `translate3d(0,${((1 - inn) * 5 - out * 4).toFixed(2)}vh,0)`;

      // the block comes apart
      const e = smooth(0.05, 0.28, p);
      layers.style.transform = `rotateX(${lerp(74, 62, e).toFixed(2)}deg) rotateZ(${lerp(-42, -18, e).toFixed(2)}deg)`;

      const k = narrow ? Math.min((0.9 * vw) / 613, (0.44 * vh) / 725) : Math.min((0.46 * vw) / 613, (0.76 * vh) / 725);
      const cx = narrow ? vw * 0.5 : vw * 0.575;
      const cy = narrow ? vh * 0.33 : vh * 0.53;
      const kk = k * lerp(0.9, 1, inn);
      stack.style.transform = `translate3d(${(cx - SW / 2).toFixed(1)}px,${(cy - SH / 2).toFixed(1)}px,0) scale(${kk.toFixed(4)})`;
      stack.style.opacity = vis.toFixed(3);
      stack.style.visibility = vis < 0.01 ? "hidden" : "visible";

      const some = smooth(A0 - 0.03, A0, p);
      let act = -1;
      if (p >= A0 && p < A1 + 0.0001) act = Math.min(N - 1, Math.floor((p - A0) / SPAN));

      for (let i = 0; i < N; i++) {
        const w = on(i, p, 0.03);
        const z = (2 - i) * GAP * e + 26 * w * e;
        plates[i].style.transform = `translateZ(${z.toFixed(1)}px)`;
        plates[i].style.opacity = lerp(1, lerp(0.42, 1, w), some).toFixed(3);
        const c = cap(i, p);
        steps[i].style.opacity = c.toFixed(3);
        steps[i].style.transform = `translate3d(0,${((1 - c) * 1.4).toFixed(2)}vh,0)`;
      }
      if (act !== active) {
        active = act;
        plates.forEach((pl, i) => pl.classList.toggle("is-active", i === act));
        tags.forEach((t, i) => t.classList.toggle("on", i === act));
        paths.forEach((pt, i) => pt.classList.toggle("on", i === act));
        pips.forEach((pp, i) => pp.classList.toggle("on", i <= act));
      }

      // the score counts while its own plate takes the stage
      const sc = Math.round(SCORE * smooth(A0 + SPAN - 0.012, A0 + SPAN + 0.07, p));
      if (sc !== lastScore) {
        lastScore = sc;
        num.textContent = String(sc);
        tagScore.textContent = sc + " / 100";
        scorePlate.style.setProperty("--s", (sc / 100).toFixed(3));
      }
      bars.forEach((b, i) => b.style.setProperty("--k", smooth(A0 + SPAN + i * 0.006, A0 + SPAN + 0.06 + i * 0.006, p).toFixed(3)));

      // leader lines: from each plate's right corner straight to its tag
      if (!narrow) {
        const show = smooth(0.22, 0.3, p) * vis;
        const tx = tagList.offsetLeft;
        for (let i = 0; i < N; i++) {
          const r = anchors[i].getBoundingClientRect();
          const ax = r.left;
          const ay = r.top;
          paths[i].setAttribute("d", `M${(ax - 3).toFixed(1)} ${ay.toFixed(1)}a3 3 0 1 0 6 0a3 3 0 1 0-6 0M${(ax + 3).toFixed(1)} ${ay.toFixed(1)}H${(tx - 2).toFixed(1)}`);
          paths[i].style.opacity = show.toFixed(3);
          tags[i].style.transform = `translate3d(0,${(ay - 21).toFixed(1)}px,0)`;
          tags[i].style.opacity = show.toFixed(3);
        }
      }
    },
  };
}
