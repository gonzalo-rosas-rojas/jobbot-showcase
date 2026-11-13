// Scroll engine. One smoothed scroll position drives everything; each act gets a local progress `p` (0..1)
// while its sticky stage is pinned, plus the global "u" (act index + p) used by the fixed layers
// (sky, dial, panel plane). Scrolling stays native: nothing is hijacked, we only smooth what we read.
// The loop sleeps as soon as the page stops moving.

import { clamp, lerp, reducedMotion, smooth } from "./util.js";

const SNAP_SLACK_PX = 1; // an act counts as reached this many px before its top, so sub-pixel layout never skips it
const NEAR_AHEAD = 1.2; // an act is updated from this many viewport heights before it reaches the screen...
const NEAR_BEHIND = 0.2; // ...until this many viewport heights after it has left
const SMOOTHING_RATE = 9; // 1 / s: how fast the read position catches up with the scroll position
const SETTLE_PX = 0.2; // closer than this to the scroll position, the read position lands on it and the loop sleeps

export function createEngine({ acts, onFrame }) {
  const RM = reducedMotion();
  const items = acts.map((a) => ({ ...a, top: 0, height: 0, range: 1, p: 0 }));
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let docH = 1;
  let sy = window.scrollY;
  let target = sy;
  let last = performance.now();
  let raf = 0;

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    const sc = window.scrollY;
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      it.top = r.top + sc;
      it.height = r.height;
      it.range = Math.max(1, r.height - vh);
    }
    docH = Math.max(1, document.documentElement.scrollHeight - vh);
  }

  /** the hour of the night at the read position, `p` being the progress of act `idx` */
  function nightAt(idx, p) {
    const cur = items[idx];
    let nightT = lerp(cur.nightFrom, cur.nightTo, p);
    // where two acts overlap, the hour glides from the old act's value to the new one's instead of jumping
    if (idx > 0) {
      const pv = items[idx - 1];
      const ovl = pv.top + pv.height - vh - cur.top;
      if (ovl > 1 && sy < cur.top + ovl) {
        const pt = lerp(pv.nightFrom, pv.nightTo, clamp((sy - pv.top) / pv.range));
        const t = clamp((sy - cur.top) / ovl);
        nightT = lerp(pt, nightT, smooth(0, 1, t));
      }
    }
    return nightT;
  }

  /** how far act `i` has faded in and out (see `handOver` below) */
  function handOverFx(i, it) {
    // hand-over between overlapping acts: the old one fades out in the first half of the overlap and the
    // new one fades in during the second half, so two headlines are never on screen together
    const handOver = 0.3 * vh;
    const local = sy - it.top;
    return {
      inn: i === 0 ? 1 : smooth(handOver * 0.5, handOver, local),
      out: i === items.length - 1 ? 0 : smooth(it.range - handOver, it.range - handOver * 0.5, local),
      // the same exit, half a hand-over later: it ends exactly when the pinned stage is released. Only act 7
      // uses it, so that the sun of act 8 (which grows from the first pixel) takes over without an empty beat.
      late: i === items.length - 1 ? 0 : smooth(it.range - handOver * 0.5, it.range, local),
    };
  }

  function render() {
    // find the act whose pinned range contains the (smoothed) scroll position
    let idx = 0;
    for (let i = 0; i < items.length; i++) if (sy >= items[i].top - SNAP_SLACK_PX) idx = i;
    const cur = items[idx];
    const p = clamp((sy - cur.top) / cur.range);
    const nightT = nightAt(idx, p);
    const ctx = { vw, vh, sy, idx, p, u: idx + p, nightT, total: clamp(sy / docH), items };
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const near = sy + vh * NEAR_AHEAD > it.top && sy < it.top + it.height + vh * NEAR_BEHIND;
      it.p = clamp((sy - it.top) / it.range);
      if (near) {
        it.el.style.setProperty("--p", it.p.toFixed(4));
        if (it.scene && it.scene.update) it.scene.update(it.p, ctx, i === idx, handOverFx(i, it));
      }
    }
    onFrame(ctx);
  }

  function tick(now) {
    raf = 0;
    const dt = Math.min(64, now - last) / 1000;
    last = now;
    target = window.scrollY;
    const k = RM ? 1 : 1 - Math.exp(-dt * SMOOTHING_RATE);
    sy += (target - sy) * k;
    if (Math.abs(target - sy) < SETTLE_PX) sy = target;
    render();
    if (sy !== target) raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (!raf && document.visibilityState === "visible") {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  window.addEventListener("scroll", wake, { passive: true });
  function refit() {
    measure();
    for (const it of items) if (it.scene && it.scene.resize) it.scene.resize({ vw, vh });
  }
  window.addEventListener("resize", () => {
    refit();
    wake();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else wake();
  });

  measure();
  sy = target = window.scrollY;
  render();
  return {
    measure,
    /** measure again and tell the scenes that keep measurements (the window changed, or a web font changed the boxes) */
    refit,
    wake,
    /** jump with no smoothing (used by screenshots and the "reduced motion" path) */
    snap() {
      sy = target = window.scrollY;
      render();
    },
  };
}
