// A camera for the two diagrams on a phone. Drawn whole in 358 px they are 40% of their size and the labels
// can't be read, so the camera zooms in, follows the action and pulls back for the whole picture. It is
// only a viewBox, so the art stays plain SVG and wide screens never touch it.

const RATIO = 0.78; // visible height / visible width

export function createCamera(svg, base) {
  const home = `0 0 ${base.w} ${base.h}`;
  let on = false;

  const clampTo = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

  return {
    // centre (cx, cy) and visible width w, in SVG units; `narrow` false puts the static view back
    aim(narrow, cx, cy, w) {
      if (!narrow) {
        if (on) {
          svg.setAttribute("viewBox", home);
          on = false;
        }
        return;
      }
      on = true;
      const h = w * RATIO;
      const x = clampTo(cx - w / 2, Math.min(0, base.w - w), Math.max(0, base.w - w));
      const y = clampTo(cy - h / 2, Math.min(0, base.h - h), Math.max(0, base.h - h));
      svg.setAttribute("viewBox", `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
    },
  };
}
