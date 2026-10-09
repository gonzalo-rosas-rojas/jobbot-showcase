// Act 07 · 08:45 · Approve. The only place a person speaks (the italic serif) and the only place the colour
// mint appears: green means a decision a human made. One proposal is approved, then the five squares of the
// gate fill one by one (config: first_n_reviewed = 5). Same five squares that sat empty on the gate plate in act 03.

import { clamp, smooth } from "../util.js";

export function createApprove(root) {
  const copy = root.querySelector(".a7-copy");
  const card = root.querySelector(".a7-card");
  const btn = root.querySelector(".pc-btn");
  const lab = btn.querySelector(".lab");
  const bar = btn.querySelector(".bar");
  const squares = [...root.querySelectorAll(".five i")];
  const label = root.querySelector(".five-label");
  let lastText = "";
  let lastCount = -1;

  return {
    update(p, ctx, _cur, fx) {
      const narrow = ctx && ctx.vw < 760;
      const inn = fx.inn;
      const out = fx.late; // leaves as the sun comes up (act 8 starts growing it at once), not before
      const vis = inn * (1 - out);
      copy.style.opacity = vis.toFixed(3);
      // phones: a shorter lift on the way out (the docked dial sits just above the headline)
      copy.style.transform = `translate3d(0,${((1 - inn) * 5 - out * (narrow ? 1.5 : 4)).toFixed(2)}vh,0)`;
      card.style.opacity = vis.toFixed(3);
      card.style.transform = narrow ? `translate3d(0,${((1 - inn) * 6).toFixed(2)}vh,0)` : `translate3d(0,calc(-50% + ${((1 - inn) * 6).toFixed(2)}vh),0)`;
      card.style.visibility = vis < 0.01 ? "hidden" : "visible";

      // the button: press, send, sent
      const press = smooth(0.14, 0.17, p) * (1 - smooth(0.17, 0.2, p));
      btn.style.transform = `scale(${(1 - press * 0.035).toFixed(4)})`;
      const sending = smooth(0.18, 0.32, p);
      bar.style.transform = `scaleX(${sending.toFixed(3)})`;
      const text = p < 0.18 ? "APPROVE" : p < 0.32 ? "SENDING" : "SENT";
      if (text !== lastText) {
        lastText = text;
        lab.textContent = text;
        btn.classList.toggle("is-sent", text === "SENT");
        card.classList.toggle("is-sent", text === "SENT");
      }

      // five approvals, one after another
      const n = p < 0.34 ? 0 : clamp(Math.floor((p - 0.34) / 0.12) + 1, 0, 5);
      if (n !== lastCount) {
        lastCount = n;
        squares.forEach((s, i) => s.classList.toggle("on", i < n));
        label.textContent = n === 5 ? "5 / 5 APPROVED. IT RUNS BY ITSELF NOW." : `APPROVED ${n} / 5`;
        label.classList.toggle("is-done", n === 5);
      }
    },
  };
}
