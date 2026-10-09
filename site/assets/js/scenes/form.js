// Act 04 · 02:14 · Fill. A form is typed by the scroll position: a known field fills letter by letter, an
// unknown one is framed and left for a person. The point of the scene is the refusal, so it ends on a stamp.
// All names, mails and the company are fictional.

import { clamp, lerp, smooth } from "../util.js";

const T0 = 0.1; // typing starts
const T1 = 0.6; // typing ends

export function createForm(root) {
  const copy = root.querySelector(".a4-copy");
  const form = root.querySelector(".form");
  const stamp = root.querySelector(".stamp");
  const fill = root.querySelector("#f-fill");
  const need = root.querySelector("#f-need");
  const fields = [...root.querySelectorAll(".fld[data-text]")].map((el) => ({
    el,
    val: el.querySelector(".val"),
    text: el.dataset.text,
    n: -1,
  }));
  const blanks = [...root.querySelectorAll(".fld.blank")];
  let lastFill = -1;
  let lastNeed = -1;

  // phones: the form hangs from just under the docked dial and the headline sits at the bottom. On a short phone the room
  // between them is smaller than the form, so the form is scaled (from its top edge) to the room, never below 0.62.
  // Measured when the window changes size, not per frame.
  let fit = 1;
  let fitKey = "";
  const measure = (vw, vh) => {
    const key = vw + "x" + vh;
    if (key === fitKey) return;
    fitKey = key;
    if (vw >= 760) {
      fit = 1;
      return;
    }
    // the form's height with every field typed (a long value can wrap), read in one go so that nothing is painted in between
    const typed = fields.map((fd) => fd.val.textContent);
    fields.forEach((fd) => { fd.val.textContent = fd.text; });
    const height = form.offsetHeight;
    fields.forEach((fd, i) => { fd.val.textContent = typed[i]; });
    // 60 px kept under the form: a gap to the headline and the stamp, which hangs below the form's corner
    fit = clamp((copy.offsetTop - 60 - form.offsetTop) / height, 0.62, 1);
  };

  return {
    resize() {
      fitKey = "";
    },
    update(p, ctx, _cur, fx) {
      const narrow = ctx && ctx.vw < 760;
      measure(ctx ? ctx.vw : window.innerWidth, ctx ? ctx.vh : window.innerHeight);
      const inn = fx.inn;
      const out = fx.out;
      const vis = inn * (1 - out);
      copy.style.opacity = vis.toFixed(3);
      copy.style.transform = `translate3d(0,${((1 - inn) * 5 - out * 4).toFixed(2)}vh,0)`;

      // the form rises from a slight tilt, like the plates before it
      const tilt = (1 - inn) * 12;
      const y = narrow ? 0 : -50;
      form.style.transform = narrow
        ? `translate3d(0,${((1 - inn) * 6).toFixed(2)}vh,0) scale(${fit.toFixed(4)})`
        : `translate3d(0,${y}%,0) perspective(1600px) rotateX(${tilt.toFixed(2)}deg)`;
      form.style.opacity = vis.toFixed(3);
      form.style.visibility = vis < 0.01 ? "hidden" : "visible";

      // typing
      const f = clamp((p - T0) / (T1 - T0)) * fields.length;
      let done = 0;
      fields.forEach((fd, i) => {
        const local = clamp(f - i);
        const n = Math.floor(local * fd.text.length + (local > 0 && local < 1 ? 1 : 0));
        const count = clamp(n, 0, fd.text.length);
        if (count !== fd.n) {
          fd.n = count;
          fd.val.textContent = fd.text.slice(0, count);
        }
        fd.el.classList.toggle("is-typing", local > 0 && local < 1);
        if (local >= 1) done++;
      });
      if (done !== lastFill) {
        lastFill = done;
        fill.textContent = String(done);
      }

      // the two questions it cannot answer get framed, one after the other
      const flagAt = [0.66, 0.71];
      let flagged = 0;
      blanks.forEach((b, i) => {
        const on = p >= flagAt[i];
        b.classList.toggle("is-flag", on);
        if (on) flagged++;
      });
      if (flagged !== lastNeed) {
        lastNeed = flagged;
        need.textContent = String(flagged);
      }

      const s = smooth(0.76, 0.82, p) * (1 - out);
      stamp.style.opacity = s.toFixed(3);
      stamp.style.transform = `rotate(-8deg) scale(${lerp(1.55, 1, smooth(0.76, 0.82, p)).toFixed(3)})`;
    },
  };
}
