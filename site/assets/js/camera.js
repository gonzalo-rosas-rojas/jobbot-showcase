// A camera for the two diagrams on a phone. Drawn whole in 358 px they are 40% of their size and the labels
// can't be read, so the camera zooms in, follows the action and pulls back for the whole picture. It is
// only a viewBox, so the art stays plain SVG and wide screens never touch it.

import { clampTo, isPhone } from "./util.js";

const RATIO = 0.78; // visible height / visible width
const ROOM_GAP_PX = 12; // air between the diagram's box and the copy under it

/** Wide screens: window px per SVG unit at the closest the camera gets (both diagram scenes). */
export const WIDE_CLOSE = 2.3;

/** Wide screens (and tall enough) get the diagram in a window beside the copy; everything else uses the phone camera. */
export const isWide = (vw, vh) => !isPhone(vw) && vh >= 600;

/** Phones: the diagram's box is as tall as the width allows (RATIO) unless the copy under it needs the room; then the camera
 *  looks through a shorter window (never below 0.5, which is the picture's own 2:1 shape). `room` is the free height in px. */
export function phoneRatio(room, width) {
  return Math.min(RATIO, Math.max(0.5, room / Math.max(1, width)));
}

/** The viewBox of one diagram: `set` points it at a rectangle, `reset` puts the whole picture back (only if it was moved). */
function createViewport(svg, base) {
  const home = `0 0 ${base.w} ${base.h}`;
  let moved = false;
  return {
    set(x, y, w, h) {
      moved = true;
      svg.setAttribute("viewBox", `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
    },
    reset() {
      if (moved) {
        svg.setAttribute("viewBox", home);
        moved = false;
      }
    },
  };
}

export function createCamera(svg, base) {
  const view = createViewport(svg, base);
  let ratio = RATIO;

  return {
    setRatio(r) {
      ratio = r;
    },
    // centre (cx, cy) and visible width w, in SVG units
    aim(cx, cy, w) {
      const h = w * ratio;
      const x = clampTo(cx - w / 2, Math.min(0, base.w - w), Math.max(0, base.w - w));
      const y = clampTo(cy - h / 2, Math.min(0, base.h - h), Math.max(0, base.h - h));
      view.set(x, y, w, h);
    },
    /** puts the static view back */
    reset: view.reset,
  };
}

/** Phones: the camera's window is as tall as the free room between the dial and the copy (the diagram is not squeezed on a
 *  tall phone and does not run into its own caption on a short one). `copy` is the text under the diagram, `box` the
 *  diagram's own box. `fit(vw, vh)` measures once per window size; `reset()` makes the next `fit` measure again. */
export function createRoomFit(camera, copy, box) {
  let key = "";
  return {
    fit(vw, vh) {
      const k = vw + "x" + vh;
      if (k === key) return;
      key = k;
      if (isPhone(vw)) camera.setRatio(phoneRatio(copy.offsetTop - ROOM_GAP_PX - box.offsetTop, box.offsetWidth));
    },
    reset() {
      key = "";
    },
  };
}

// The same camera for wide screens. There, `box` is a window to the right of the copy (CSS, `.arch`), and the
// diagram is not shrunk to a small picture in the middle of an empty sky: the camera starts close on the first node
// and the token, follows the token, and pulls back until the whole picture is in the window. The art is still one
// plain SVG and the move is still a viewBox, so nothing is drawn twice and the phone path above is untouched.
// zoom 1 = the whole picture, centred in the window with a small margin; zoom 2 = twice as close.
// `measure(vw, vh)` is the only thing that reads the window's size; it returns the frame whose `zoomFor` and `aim` to use.
export function createWideCamera(box, svg, base) {
  const view = createViewport(svg, base);
  const FIT = 0.9; // share of the window the whole picture takes at zoom 1
  const SLACK = 0.06; // how far past the picture's edge the camera may look, as a share of its size
  const FADE_MIN_PX = 28; // width of the window's left-edge fade with the whole picture in view
  const FADE_EXTRA_PX = 150; // how much wider it gets while the camera is close
  const FADE_FROM_ZOOM = 1.1; // the fade starts widening above this zoom...
  const FADE_ZOOM_SPAN = 0.4; // ...and is fully wide this much further in
  let bw = 0;
  let bh = 0;
  let key = "";
  let lastFade = "";

  /** the scale (window px per SVG unit) at zoom 1 for the window as last measured; 0 while it has no size */
  const scale = () => (bw > 40 && bh > 40 ? Math.min(bw / base.w, bh / base.h) * FIT : 0);

  // what the camera can do once the window's size is known: only `measure` hands it out, so it cannot be used unmeasured
  const frame = {
    /** the zoom that gives `k` window px per SVG unit (never less than the whole picture) */
    zoomFor(k) {
      const k0 = scale();
      return k0 ? Math.max(1, k / k0) : 1;
    },
    // centre (cx, cy) in SVG units, zoom as above
    aim({ cx, cy, zoom }) {
      const k0 = scale();
      if (!k0) return;
      const k = k0 * zoom;
      // the window's left edge fades over a wider strip while the camera is close, so that a node cut by it dissolves
      // instead of showing a torn word; with the whole picture in view the strip is short
      const fade = (FADE_MIN_PX + FADE_EXTRA_PX * Math.min(1, Math.max(0, (zoom - FADE_FROM_ZOOM) / FADE_ZOOM_SPAN))).toFixed(0) + "px";
      if (fade !== lastFade) {
        lastFade = fade;
        box.style.setProperty("--fade", fade);
      }
      const w = bw / k;
      const h = bh / k;
      const x = clampTo(cx - w / 2, -SLACK * base.w, base.w * (1 + SLACK) - w);
      const y = clampTo(cy - h / 2, -SLACK * base.h, base.h * (1 + SLACK) - h);
      view.set(x, y, w, h);
    },
  };

  return {
    /** reads the window's size, again only when the browser window changed (or it had none yet); returns the frame to aim */
    measure(vw, vh) {
      const k = vw + "x" + vh;
      if (k !== key || !bw) {
        key = k;
        bw = box.clientWidth;
        bh = box.clientHeight;
      }
      return frame;
    },
    /** puts the whole picture back */
    reset: view.reset,
  };
}
