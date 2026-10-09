// A camera for the two diagrams on a phone. Drawn whole in 358 px they are 40% of their size and the labels
// can't be read, so the camera zooms in, follows the action and pulls back for the whole picture. It is
// only a viewBox, so the art stays plain SVG and wide screens never touch it.

const RATIO = 0.78; // visible height / visible width

/** Phones: the diagram's box is as tall as the width allows (RATIO) unless the copy under it needs the room; then the camera
 *  looks through a shorter window (never below 0.5, which is the picture's own 2:1 shape). `room` is the free height in px. */
export function phoneRatio(room, width) {
  return Math.min(RATIO, Math.max(0.5, room / Math.max(1, width)));
}

export function createCamera(svg, base) {
  const home = `0 0 ${base.w} ${base.h}`;
  let on = false;
  let ratio = RATIO;

  const clampTo = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

  return {
    setRatio(r) {
      ratio = r;
    },
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
      const h = w * ratio;
      const x = clampTo(cx - w / 2, Math.min(0, base.w - w), Math.max(0, base.w - w));
      const y = clampTo(cy - h / 2, Math.min(0, base.h - h), Math.max(0, base.h - h));
      svg.setAttribute("viewBox", `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
    },
  };
}

// The same camera for wide screens. There, `box` is a window to the right of the copy (CSS, `.arch`), and the
// diagram is not shrunk to a small picture in the middle of an empty sky: the camera starts close on the first node
// and the token, follows the token, and pulls back until the whole picture is in the window. The art is still one
// plain SVG and the move is still a viewBox, so nothing is drawn twice and the phone path above is untouched.
// zoom 1 = the whole picture, centred in the window with a small margin; zoom 2 = twice as close.
export function createWideCamera(box, svg, base) {
  const home = `0 0 ${base.w} ${base.h}`;
  const FIT = 0.9; // share of the window the whole picture takes at zoom 1
  const SLACK = 0.06; // how far past the picture's edge the camera may look, as a share of its size
  let bw = 0;
  let bh = 0;
  let key = "";
  let on = false;
  let lastFade = "";

  const clampTo = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

  return {
    /** the scale (window px per SVG unit) at zoom 1 for the window as it is now; 0 while it has no size */
    base(vw, vh) {
      const k = vw + "x" + vh;
      if (k !== key || !bw) {
        key = k;
        bw = box.clientWidth;
        bh = box.clientHeight;
      }
      return bw > 40 && bh > 40 ? Math.min(bw / base.w, bh / base.h) * FIT : 0;
    },
    /** the zoom that gives `k` window px per SVG unit (never less than the whole picture) */
    zoomFor(vw, vh, k) {
      const k0 = this.base(vw, vh);
      return k0 ? Math.max(1, k / k0) : 1;
    },
    // centre (cx, cy) in SVG units, zoom as above
    aim(vw, vh, cx, cy, zoom) {
      const k0 = this.base(vw, vh);
      if (!k0) return;
      const k = k0 * zoom;
      // the window's left edge fades over a wider strip while the camera is close, so that a node cut by it dissolves
      // instead of showing a torn word; with the whole picture in view the strip is short
      const fade = (28 + 150 * Math.min(1, Math.max(0, (zoom - 1.1) / 0.4))).toFixed(0) + "px";
      if (fade !== lastFade) {
        lastFade = fade;
        box.style.setProperty("--fade", fade);
      }
      const w = bw / k;
      const h = bh / k;
      const x = clampTo(cx - w / 2, -SLACK * base.w, base.w * (1 + SLACK) - w);
      const y = clampTo(cy - h / 2, -SLACK * base.h, base.h * (1 + SLACK) - h);
      svg.setAttribute("viewBox", `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
      on = true;
    },
    off() {
      if (on) {
        svg.setAttribute("viewBox", home);
        on = false;
      }
    },
  };
}
