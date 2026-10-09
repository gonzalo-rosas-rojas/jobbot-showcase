// Act 02 · 19:00 · Read. The panel docks to the right, and on the left the bot's first decision is made
// visible: a score threshold slides over a (synthetic) distribution of 412 offers and the counts follow
// the scroll, forwards and backwards. The default threshold of 60 is the real one; the scores are a
// labelled sample, never real offers.

import { clamp, lerp, smooth, easeOutExpo, mulberry32, track } from "../util.js";

const N = 412;
const BINS = 40;

function makeScores() {
  const rand = mulberry32(412);
  const scores = [];
  for (let i = 0; i < N; i++) {
    // sum of uniforms ~ bell-shaped, centred near 47 with a longer right tail
    const g = (rand() + rand() + rand() + rand() - 2) * 1.8;
    const tail = rand() < 0.08 ? rand() * 28 : 0;
    scores.push(clamp(Math.round(47 + g * 15 + tail), 4, 98, 0));
  }
  return scores.sort((a, b) => a - b);
}

export function createRead(root) {
  const scores = makeScores();
  const hist = root.querySelector(".hist");
  const read = root.querySelector("#s-read");
  const pass = root.querySelector("#s-pass");
  const top = root.querySelector("#s-top");
  const thEl = root.querySelector("#s-th");
  const knob = root.querySelector(".knob");
  const fill = root.querySelector(".slider-fill");
  const sliderTrack = root.querySelector(".slider-track");
  const copy = root.querySelector(".a2-copy");

  // histogram: BINS bars, heights from the sample
  const counts = new Array(BINS).fill(0);
  for (const s of scores) counts[Math.min(BINS - 1, Math.floor((s / 100) * BINS))]++;
  const maxC = Math.max(...counts);
  const bars = counts.map((c, i) => {
    const b = document.createElement("i");
    b.style.setProperty("--h", (c / maxC).toFixed(3));
    b.dataset.v = String(Math.round(((i + 0.5) / BINS) * 100));
    hist.append(b);
    return b;
  });

  const countAbove = (th) => {
    let lo = 0;
    let hi = scores.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (scores[m] >= th) hi = m;
      else lo = m + 1;
    }
    return scores.length - lo;
  };

  let lastTh = -1;
  const fmt = (n) => n.toLocaleString("en-US");

  // The knob and the fill move with transforms (the knob by translateX in px of the track's width, the fill by scaleX),
  // so no frame writes layout properties. The width is read when the window changes size, not per frame. Both land on
  // whole device pixels, which is where layout (left and width in %) used to snap them: same crisp knob, same crisp end.
  let trackW = 0;
  let dpr = 1;
  const measure = () => {
    trackW = sliderTrack.offsetWidth;
    dpr = window.devicePixelRatio || 1;
  };
  const onPixel = (px) => Math.round(px * dpr) / dpr;

  return {
    resize: measure,
    update(p, ctx, _cur, fx) {
      // text column: arrives with the dock, leaves before the next act. On phones the panel docks below the copy, so
      // the copy arrives once the panel has settled there instead of while it is still flying down through that place.
      const narrow = ctx && ctx.vw < 760;
      const inn = narrow ? smooth(0.17, 0.25, p) : smooth(0.0, 0.1, p);
      const out = fx.out;
      copy.style.opacity = (inn * (1 - out)).toFixed(3);
      // phones: it settles from 2 vh below its place (not 5), so that it never dips onto the panel peeking up under it
      copy.style.transform = `translate3d(0,${((1 - inn) * (narrow ? 2 : 5) - out * 4).toFixed(2)}vh,0)`;

      // the offers being read (eases out, then holds)
      const r = Math.round(N * easeOutExpo(smooth(0.06, 0.62, p)));
      read.textContent = fmt(r);

      // threshold: starts at the real default (60), tightens to 78, relaxes back to 60
      const th = Math.round(track([[0, 60], [0.3, 60], [0.5, 78], [0.72, 78], [0.88, 60], [1, 60]], p));
      const above = Math.round(countAbove(th) * smooth(0.06, 0.5, p));
      pass.textContent = fmt(above);
      top.textContent = String(scores[scores.length - 1]);
      thEl.textContent = String(th);
      const pos = th / 100;
      if (!trackW) measure();
      const at = onPixel(pos * trackW);
      knob.style.transform = `translate3d(${at.toFixed(2)}px,0,0)`;
      fill.style.transform = `scaleX(${(at / trackW).toFixed(5)})`;
      if (th !== lastTh) {
        lastTh = th;
        for (const b of bars) b.classList.toggle("on", +b.dataset.v >= th);
      }
      root.classList.toggle("is-tight", th > 70);
    },
  };
}
