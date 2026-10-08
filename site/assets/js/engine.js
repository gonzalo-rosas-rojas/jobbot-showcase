// Scroll engine. One smoothed scroll position drives everything; each act gets a local progress `p` (0..1)
// while its sticky stage is pinned, plus the global "u" (act index + p) used by the fixed layers
// (sky, dial, panel plane). Scrolling stays native: nothing is hijacked, we only smooth what we read.
// The loop sleeps as soon as the page stops moving.

import { clamp, lerp, reducedMotion } from "./util.js";

const smoothPx = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

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

  function render() {
    // find the act whose pinned range contains the (smoothed) scroll position
    let idx = 0;
    for (let i = 0; i < items.length; i++) if (sy >= items[i].top - 1) idx = i;
    const cur = items[idx];
    const p = clamp((sy - cur.top) / cur.range);
    let nightT = lerp(cur.nightFrom, cur.nightTo, p);
    // where two acts overlap, the hour glides from the old act's value to the new one's instead of jumping
    if (idx > 0) {
      const pv = items[idx - 1];
      const ovl = pv.top + pv.height - vh - cur.top;
      if (ovl > 1 && sy < cur.top + ovl) {
        const pt = lerp(pv.nightFrom, pv.nightTo, clamp((sy - pv.top) / pv.range));
        const t = clamp((sy - cur.top) / ovl);
        nightT = lerp(pt, nightT, t * t * (3 - 2 * t));
      }
    }
    const ctx = { vw, vh, sy, idx, p, u: idx + p, nightT, total: clamp(sy / docH), items };
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const near = sy + vh * 1.2 > it.top && sy < it.top + it.height + vh * 0.2;
      it.p = clamp((sy - it.top) / it.range);
      if (near) {
        it.el.style.setProperty("--p", it.p.toFixed(4));
        // hand-over between overlapping acts: the old one fades out in the first half of the overlap and the
        // new one fades in during the second half, so two headlines are never on screen together
        const F = 0.3 * vh;
        const local = sy - it.top;
        const fx = {
          inn: i === 0 ? 1 : smoothPx(F * 0.5, F, local),
          out: i === items.length - 1 ? 0 : smoothPx(it.range - F, it.range - F * 0.5, local),
        };
        if (it.scene && it.scene.update) it.scene.update(it.p, ctx, i === idx, fx);
      }
    }
    onFrame(ctx);
  }

  function tick(now) {
    raf = 0;
    const dt = Math.min(64, now - last) / 1000;
    last = now;
    target = window.scrollY;
    const k = RM ? 1 : 1 - Math.exp(-dt * 9);
    sy += (target - sy) * k;
    if (Math.abs(target - sy) < 0.2) sy = target;
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
  window.addEventListener("resize", () => {
    measure();
    for (const it of items) if (it.scene && it.scene.resize) it.scene.resize({ vw, vh });
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
    wake,
    /** jump with no smoothing (used by screenshots and the "reduced motion" path) */
    snap() {
      sy = target = window.scrollY;
      render();
    },
  };
}
