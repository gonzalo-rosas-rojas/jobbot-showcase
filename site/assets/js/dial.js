// The 24-hour dial: the one memorable object of the page. Midnight is at the top, so the working window
// (18:00 -> 09:00) sweeps over the top and the hours Gonza is busy (09:00 -> 18:00) are hatched at the bottom.
// Everything is generated here so the HTML stays small and the geometry has a single source of truth.

import { WINDOW_END, WINDOW_START, clockText } from "./util.js";
import { t as tr } from "./i18n.js";

const NS = "http://www.w3.org/2000/svg";
const C = 300; // centre of the 600 x 600 drawing
const R_RING = 262;
const R_RUN = R_RING - 22; // run dots, and the arc of the "OCCUPIED" caption
const R_BUSY = R_RING - 52; // inner edge of the busy hours
const R_SWEEP_OUT = R_RING - 54;
const R_SWEEP_IN = 30;
const R_TICK_MAJOR = R_RING + 20; // every third hour
const R_TICK_MINOR = R_RING + 12;
const R_TICK_QUARTER = R_RING + 6;
const R_LABEL = R_RING + 42; // the hour numbers
const Y_TIME = C + 132; // the big digits under the hub
const Y_CAPTION = C + 166;
const SWEEP_SPAN_DEG = 70; // how far behind the hand the sweep trails
const FACE_TINT = "#9db4ff";
const WINDOW_HOURS = (24 - WINDOW_START + WINDOW_END) % 24; // 18:00 -> 09:00: 15
const DEG_PER_HOUR = 360 / 24;

const angleOf = (hour) => ((hour % 24) / 24) * 360; // clockwise from the top
const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};
const fixed2 = (n) => n.toFixed(2); // fixed decimals for SVG coordinates and angles
const largeArc = (deg0, deg1) => (deg1 - deg0 > 180 ? 1 : 0); // the SVG arc flag for a sweep of more than half a turn

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

/** Annular sector path between two radii, going clockwise from deg0 to deg1 (deg1 > deg0). */
function sector(r0, r1, deg0, deg1) {
  const large = largeArc(deg0, deg1);
  const [x0, y0] = polar(r1, deg0);
  const [x1, y1] = polar(r1, deg1);
  const [x2, y2] = polar(r0, deg1);
  const [x3, y3] = polar(r0, deg0);
  return `M${fixed2(x0)} ${fixed2(y0)} A${r1} ${r1} 0 ${large} 1 ${fixed2(x1)} ${fixed2(y1)} L${fixed2(x2)} ${fixed2(y2)} A${r0} ${r0} 0 ${large} 0 ${fixed2(x3)} ${fixed2(y3)}Z`;
}

function arcPath(r, deg0, deg1) {
  const large = largeArc(deg0, deg1);
  const [x0, y0] = polar(r, deg0);
  const [x1, y1] = polar(r, deg1);
  return `M${fixed2(x0)} ${fixed2(y0)} A${r} ${r} 0 ${large} 1 ${fixed2(x1)} ${fixed2(y1)}`;
}

/** The hatch and the face's gradient, which the shapes below point at by id. */
function drawDefs(defs) {
  const hatch = el("pattern", { id: "hatch", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  el("line", { x1: 0, y1: 0, x2: 0, y2: 7, class: "hatch-line" }, hatch);
  const grad = el("radialGradient", { id: "dial-face", cx: "50%", cy: "42%", r: "62%" }, defs);
  el("stop", { offset: "0%", "stop-color": FACE_TINT, "stop-opacity": ".085" }, grad);
  el("stop", { offset: "70%", "stop-color": FACE_TINT, "stop-opacity": ".025" }, grad);
  el("stop", { offset: "100%", "stop-color": FACE_TINT, "stop-opacity": ".0" }, grad);
}

/** The dial face: a faint cool surface, instrument rings and a crosshair. */
function drawFace(svg) {
  el("circle", { cx: C, cy: C, r: R_RING, fill: "url(#dial-face)" }, svg);
  for (const r of [196, 132, 70]) el("circle", { cx: C, cy: C, r, class: "ring-inner" }, svg);
  el("line", { x1: C - R_RING, y1: C, x2: C + R_RING, y2: C, class: "cross" }, svg);
  el("line", { x1: C, y1: C - R_RING, x2: C, y2: C + R_RING, class: "cross" }, svg);
}

/** Busy hours 09:00 -> 18:00, hatched, with the caption that runs along an arc in `defs`. */
function drawBusyHours(svg, defs) {
  const busy0 = angleOf(WINDOW_END);
  const busy1 = angleOf(WINDOW_START);
  el("path", { d: sector(R_BUSY, R_RING, busy0, busy1), fill: "url(#hatch)", class: "busy" }, svg);
  el("path", { d: arcPath(R_BUSY, busy0, busy1), class: "hair" }, svg);
  // the arc the "OCCUPIED" caption runs along (the textPath below points at it by id)
  const [labelX0, labelY0] = polar(R_RUN, busy1);
  const [labelX1, labelY1] = polar(R_RUN, busy0);
  el("path", { id: "busy-label-path", d: `M${fixed2(labelX0)} ${fixed2(labelY0)} A${R_RUN} ${R_RUN} 0 0 0 ${fixed2(labelX1)} ${fixed2(labelY1)}`, fill: "none" }, defs);
  const t = el("text", { class: "dial-micro busy-label", "text-anchor": "middle" }, svg);
  const tp = el("textPath", { href: "#busy-label-path", startOffset: "50%" }, t);
  tp.textContent = tr("dial.busy");
}

/** The window rail (the part that lights up as the night goes by) and the two paths `update` redraws. */
function drawWindow(svg) {
  el("path", { d: arcPath(R_RING, angleOf(WINDOW_START), angleOf(WINDOW_START) + WINDOW_HOURS * DEG_PER_HOUR), class: "rail" }, svg);
  const lit = el("path", { d: "", class: "rail-lit" }, svg);
  const sweep = el("path", { d: "", class: "sweep" }, svg);
  return { lit, sweep };
}

/** Ticks: every hour on the whole dial, every quarter inside the window, and the number at every third hour. */
function drawTicks(svg) {
  for (let h = 0; h < 24; h++) {
    const inWindow = h >= WINDOW_START || h < WINDOW_END;
    const deg = angleOf(h);
    const [x0, y0] = polar(R_RING, deg);
    const [x1, y1] = polar(h % 3 === 0 ? R_TICK_MAJOR : R_TICK_MINOR, deg);
    el("line", { x1: fixed2(x0), y1: fixed2(y0), x2: fixed2(x1), y2: fixed2(y1), class: "tick" + (inWindow ? " tick-win" : "") }, svg);
    if (inWindow) {
      for (let q = 1; q < 4; q++) {
        const dq = deg + q * 3.75;
        const [qx0, qy0] = polar(R_RING, dq);
        const [qx1, qy1] = polar(R_TICK_QUARTER, dq);
        el("line", { x1: fixed2(qx0), y1: fixed2(qy0), x2: fixed2(qx1), y2: fixed2(qy1), class: "tick tick-q" }, svg);
      }
    }
    if (h % 3 === 0) {
      const [nx, ny] = polar(R_LABEL, deg);
      const n = el("text", { x: fixed2(nx), y: fixed2(ny + 5), class: "dial-num", "text-anchor": "middle" }, svg);
      n.textContent = String(h).padStart(2, "0");
    }
  }
}

/** Hourly runs inside the window; the 6-hourly discovery runs are the big ones. */
function drawRuns(svg) {
  const runs = [];
  for (let k = 0; k <= WINDOW_HOURS; k++) {
    const hour = (WINDOW_START + k) % 24;
    const deg = angleOf(hour);
    const [x, y] = polar(R_RUN, deg);
    const big = k % 6 === 0;
    const dot = el("circle", { cx: fixed2(x), cy: fixed2(y), r: big ? 6.5 : 3.2, class: "run" + (big ? " run-big" : "") }, svg);
    runs.push({ k, dot });
  }
  return runs;
}

function drawHand(svg) {
  const hand = el("g", { class: "hand", transform: `rotate(${angleOf(WINDOW_START)} ${C} ${C})` }, svg);
  el("line", { x1: C, y1: C + 18, x2: C, y2: C - (R_RING - 6), class: "hand-line" }, hand);
  el("circle", { cx: C, cy: C - (R_RING - 6), r: 5.5, class: "hand-tip" }, hand);
  el("circle", { cx: C, cy: C, r: 7, class: "hub" }, svg);
  return hand;
}

/** The readout below the hub: big digits, then a caption. Returns the digits' element. */
function drawReadout(svg) {
  const time = el("text", { x: C, y: Y_TIME, class: "dial-time", "text-anchor": "middle" }, svg);
  time.textContent = "18:00";
  const cap = el("text", { x: C, y: Y_CAPTION, class: "dial-micro", "text-anchor": "middle" }, svg);
  cap.textContent = tr("dial.local");
  return time;
}

export function createDial(host) {
  const svg = el("svg", { viewBox: "-60 -60 720 720", role: "img", "aria-label": tr("dial.aria") });
  svg.classList.add("dial-svg");
  host.appendChild(svg);

  // the order of the drawing is the order of the layers
  const defs = el("defs", {}, svg);
  drawDefs(defs);
  drawFace(svg);
  drawBusyHours(svg, defs);
  const { lit, sweep } = drawWindow(svg);
  drawTicks(svg);
  const runs = drawRuns(svg);
  const hand = drawHand(svg);
  const time = drawReadout(svg);

  let lastRuns = -1;
  let lastText = "";

  return {
    svg,
    /** nightT is hours since 18:00, 0..15 */
    update(nightT) {
      const hourAbs = WINDOW_START + nightT;
      const deg = angleOf(hourAbs);
      const start = angleOf(WINDOW_START);
      const end = start + nightT * DEG_PER_HOUR;
      hand.setAttribute("transform", `rotate(${fixed2(deg)} ${C} ${C})`);
      lit.setAttribute("d", nightT > 0.01 ? arcPath(R_RING, start, end) : "");
      sweep.setAttribute("d", nightT > 0.01 ? sector(R_SWEEP_IN, R_SWEEP_OUT, Math.max(start, end - SWEEP_SPAN_DEG), end) : "");
      const passed = Math.floor(nightT + 1e-6);
      if (passed !== lastRuns) {
        lastRuns = passed;
        for (const r of runs) {
          r.dot.classList.toggle("run-done", r.k <= passed);
          r.dot.classList.toggle("run-now", r.k === passed);
        }
      }
      const txt = clockText(nightT);
      if (txt !== lastText) {
        lastText = txt;
        time.textContent = txt;
      }
    },
  };
}
