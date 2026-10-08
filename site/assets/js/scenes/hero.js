// Act 01 · 18:00 · The window opens. A giant headline, the dial, and a scroll cue. The headline rises
// letter by letter once (a ritual of opening, 30 ms per letter), then lifts away as the panel arrives.

import { smooth, reducedMotion } from "../util.js";

function splitLetters(root) {
  let i = 0;
  root.querySelectorAll("[data-split]").forEach((node) => {
    const text = node.textContent;
    node.textContent = "";
    // screen readers get the plain text; the animated letters are decoration
    const sr = document.createElement("span");
    sr.className = "sr";
    sr.textContent = text;
    const vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    node.append(sr, vis);
    const whole = node.dataset.split === "word";
    for (const word of whole ? [text] : text.split(/(\s+)/)) {
      if (/^\s+$/.test(word)) {
        vis.append(document.createTextNode(" "));
        continue;
      }
      const w = document.createElement("span");
      w.className = "word";
      for (const c of whole ? [word] : word) {
        const outer = document.createElement("span");
        outer.className = "ch";
        const inner = document.createElement("i");
        inner.textContent = c;
        inner.style.animationDelay = 260 + i * 30 + "ms";
        outer.append(inner);
        w.append(outer);
        i++;
      }
      vis.append(w);
    }
  });
}

export function createHero(root) {
  if (!reducedMotion()) splitLetters(root);
  const copy = root.querySelector(".a1-copy");
  const cue = root.querySelector(".cue");
  const lede = root.querySelector(".lede");
  const beat = root.querySelector(".beat");
  return {
    update(p) {
      const b = smooth(0.3, 0.4, p) * (1 - smooth(0.58, 0.7, p));
      beat.style.opacity = b.toFixed(3);
      beat.style.transform = `translate3d(0,${((1 - smooth(0.3, 0.4, p)) * 4).toFixed(2)}vh,0)`;
      const out = smooth(0.08, 0.26, p);
      copy.style.opacity = (1 - out).toFixed(3);
      copy.style.transform = `translate3d(0,${(-out * 9).toFixed(2)}vh,0)`;
      cue.style.opacity = (1 - smooth(0.02, 0.1, p)).toFixed(3);
      lede.style.opacity = (1 - smooth(0.05, 0.2, p)).toFixed(3);
    },
  };
}
