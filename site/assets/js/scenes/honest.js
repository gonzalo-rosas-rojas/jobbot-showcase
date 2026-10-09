// Act 08 · 09:00 · The window closes. The one peak of the page. The 24-hour dial reaches its end, the sun
// comes up out of it (a circular clip-path growing from the dial) and the night turns to paper. On the paper:
// one giant word, and the five rules the code enforces, each with the file that enforces it.
// Everything before this scene is quiet on purpose so that this one lands.

import { clamp, lerp, smooth, easeInOut } from "../util.js";

const WORD = "HONEST.";

export function createHonest(root) {
  const paper = root.querySelector(".paper");
  const h = root.querySelector(".honest");
  const rules = [...root.querySelectorAll(".rules li")];
  const foot = root.querySelector(".paper-end");
  const html = document.documentElement;

  // the word, one clipped letter at a time (the plain text stays for screen readers via aria-label)
  const letters = [...WORD].map((c) => {
    const outer = document.createElement("span");
    outer.className = "ch";
    outer.setAttribute("aria-hidden", "true");
    const inner = document.createElement("i");
    inner.textContent = c;
    outer.append(inner);
    h.append(outer);
    return inner;
  });
  let onPaper = false;

  return {
    update(p, ctx) {
      const vw = ctx ? ctx.vw : window.innerWidth;
      const vh = ctx ? ctx.vh : window.innerHeight;
      const narrow = vw < 760;

      // where the dial sits when docked (mirrors rig.js), so the sun rises from the very same place
      const gutter = narrow ? 18 : Math.min(64, vw * 0.042);
      const dock = narrow ? 84 : clamp(vw * 0.082, 86, 116);
      const cx = vw - gutter - dock / 2 - 6;
      const cy = 54 + dock / 2 + 6;
      const reach = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy)) + 8;
      // the sun starts growing with the act (it is a few pixels at first, easeInOut), so that it is already
      // coming up when act 7 has finished leaving: no empty beat between the two
      const r = reach * easeInOut(smooth(0, 0.28, p));
      paper.style.clipPath = `circle(${r.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`;

      const cover = r / reach;
      const now = cover > 0.55;
      if (now !== onPaper) {
        onPaper = now;
        html.classList.toggle("on-paper", now);
      }
      html.classList.toggle("paper-rising", p > 0.04 && !now);

      letters.forEach((l, i) => {
        const k = smooth(0.2 + i * 0.022, 0.34 + i * 0.022, p);
        l.style.transform = `translate3d(0,${((1 - k) * 112).toFixed(1)}%,0)`;
      });
      rules.forEach((li, i) => {
        const k = smooth(0.42 + i * 0.07, 0.5 + i * 0.07, p);
        li.style.opacity = k.toFixed(3);
        li.style.transform = `translate3d(0,${lerp(14, 0, k).toFixed(1)}px,0)`;
      });
      const end = smooth(0.86, 0.94, p);
      foot.style.opacity = end.toFixed(3);
      // invisible means unreachable: the button must not take the keyboard before it has appeared
      foot.style.visibility = end < 0.02 ? "hidden" : "visible";
    },
  };
}
