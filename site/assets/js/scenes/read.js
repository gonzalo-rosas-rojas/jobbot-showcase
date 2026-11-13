// Act 02 · 19:00 · Read. The panel docks to the right, and on the left the bot's first decision is made
// visible: a score threshold slides over a (synthetic) distribution of 412 offers and the counts follow
// the scroll, forwards and backwards. The default threshold of 60 is the real one; the scores are a
// labelled sample, never real offers.

import { isPhone, clamp, fmtCount, smooth, easeOutExpo, mulberry32, track } from "../util.js";

const N = 412;
const BINS = 40;
const MAX_SCORE = 100; // the scale of a score, and of the slider

// The sample is synthetic: a bell centred near CENTER, SPREAD points wide, with a longer right tail
// (TAIL_CHANCE of the offers get up to TAIL_LEN extra points). The seed is fixed so every visit sees the same offers.
const SEED = 412;
const CENTER = 47;
const SPREAD = 15;
const BELL_GAIN = 1.8;
const TAIL_CHANCE = 0.08;
const TAIL_LEN = 28;

const DEFAULT_THRESHOLD = 60; // the real one
const TIGHT_THRESHOLD = 78; // where the slider tightens to
const TIGHT_FROM = 70; // above this the scene reads as "tight"

function makeScores() {
  const rand = mulberry32(SEED);
  const scores = [];
  for (let i = 0; i < N; i++) {
    // sum of uniforms ~ bell-shaped
    const g = (rand() + rand() + rand() + rand() - 2) * BELL_GAIN;
    const tail = rand() < TAIL_CHANCE ? rand() * TAIL_LEN : 0;
    scores.push(clamp(Math.round(CENTER + g * SPREAD + tail), 4, 98));
  }
  return scores.sort((a, b) => a - b);
}

export function createRead(root) {
  const scores = makeScores();
  const hist = root.querySelector(".hist");
  const read = root.querySelector("#s-read");
  const pass = root.querySelector("#s-pass");
  const topScore = root.querySelector("#s-top");
  const thEl = root.querySelector("#s-th");
  const knob = root.querySelector(".knob");
  const fill = root.querySelector(".slider-fill");
  const sliderTrack = root.querySelector(".slider-track");
  const copy = root.querySelector(".a2-copy");

  // histogram: BINS bars, heights from the sample
  const counts = new Array(BINS).fill(0);
  for (const s of scores) counts[Math.min(BINS - 1, Math.floor((s / MAX_SCORE) * BINS))]++;
  const maxC = Math.max(...counts);
  const binCenters = counts.map((_, i) => Math.round(((i + 0.5) / BINS) * MAX_SCORE));
  const bars = counts.map((c) => {
    const b = document.createElement("i");
    b.style.setProperty("--h", (c / maxC).toFixed(3));
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

  // The knob and the fill move with transforms (the knob by translateX in px of the track's width, the fill by scaleX),
  // so no frame writes layout properties. The width is read when the window changes size, not per frame. Both land on
  // whole device pixels, which is where layout (left and width in %) used to snap them: same crisp knob, same crisp end.
  let trackW = 0;
  let dpr = 1;
  const measure = () => {
    trackW = sliderTrack.offsetWidth;
    dpr = window.devicePixelRatio || 1;
  };
  const toDevicePixel = (px) => Math.round(px * dpr) / dpr;

  return {
    resize: measure,
    update(p, ctx, _cur, fx) {
      // text column: arrives with the dock, leaves before the next act. On phones the panel docks below the copy, so
      // the copy arrives once the panel has settled there instead of while it is still flying down through that place.
      const narrow = isPhone(ctx.vw);
      const inn = narrow ? smooth(0.17, 0.25, p) : smooth(0.0, 0.1, p);
      const out = fx.out;
      copy.style.opacity = (inn * (1 - out)).toFixed(3);
      // phones: it settles from 2 vh below its place (not 5), so that it never dips onto the panel peeking up under it
      copy.style.transform = `translate3d(0,${((1 - inn) * (narrow ? 2 : 5) - out * 4).toFixed(2)}vh,0)`;

      // the offers being read (eases out, then holds)
      const r = Math.round(N * easeOutExpo(smooth(0.06, 0.62, p)));
      read.textContent = fmtCount(r);

      // threshold: starts at the real default, tightens, relaxes back to the default
      const th = Math.round(track([[0, DEFAULT_THRESHOLD], [0.3, DEFAULT_THRESHOLD], [0.5, TIGHT_THRESHOLD], [0.72, TIGHT_THRESHOLD], [0.88, DEFAULT_THRESHOLD], [1, DEFAULT_THRESHOLD]], p));
      const above = Math.round(countAbove(th) * smooth(0.06, 0.5, p));
      pass.textContent = fmtCount(above);
      topScore.textContent = String(scores[scores.length - 1]);
      thEl.textContent = String(th);
      const pos = th / MAX_SCORE;
      if (!trackW) measure();
      const at = toDevicePixel(pos * trackW);
      knob.style.transform = `translate3d(${at.toFixed(2)}px,0,0)`;
      fill.style.transform = `scaleX(${(at / trackW).toFixed(5)})`;
      if (th !== lastTh) {
        lastTh = th;
        bars.forEach((b, i) => b.classList.toggle("on", binCenters[i] >= th));
      }
      root.classList.toggle("is-tight", th > TIGHT_FROM);
    },
  };
}
