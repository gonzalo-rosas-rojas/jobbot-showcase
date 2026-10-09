// The 24-hour dial: the one memorable object of the page. Midnight is at the top, so the working window
// (18:00 -> 09:00) sweeps over the top and the hours Gonza is busy (09:00 -> 18:00) are hatched at the bottom.
// Everything is generated here so the HTML stays small and the geometry has a single source of truth.

import { clockText } from "./util.js";

const NS = "http://www.w3.org/2000/svg";
const C = 300; // centre of the 600 x 600 drawing
const R_RING = 262;
const WINDOW_START = 18; // hour of day
const WINDOW_END = 9;

const angleOf = (hour) => ((hour % 24) / 24) * 360; // clockwise from the top
const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};
const f = (n) => n.toFixed(2);

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

/** Annular sector path between two radii, going clockwise from deg0 to deg1 (deg1 > deg0). */
function sector(r0, r1, deg0, deg1) {
  const large = deg1 - deg0 > 180 ? 1 : 0;
  const [x0, y0] = polar(r1, deg0);
  const [x1, y1] = polar(r1, deg1);
  const [x2, y2] = polar(r0, deg1);
  const [x3, y3] = polar(r0, deg0);
  return `M${f(x0)} ${f(y0)} A${r1} ${r1} 0 ${large} 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${r0} ${r0} 0 ${large} 0 ${f(x3)} ${f(y3)}Z`;
}

function arcPath(r, deg0, deg1) {
  const large = deg1 - deg0 > 180 ? 1 : 0;
  const [x0, y0] = polar(r, deg0);
  const [x1, y1] = polar(r, deg1);
  return `M${f(x0)} ${f(y0)} A${r} ${r} 0 ${large} 1 ${f(x1)} ${f(y1)}`;
}

export function createDial(host) {
  const svg = el("svg", { viewBox: "-60 -60 720 720", role: "img", "aria-label": "24-hour dial of the night shift, 18:00 to 09:00" });
  svg.classList.add("dial-svg");
  host.appendChild(svg);

  const defs = el("defs", {}, svg);
  const hatch = el("pattern", { id: "hatch", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  el("line", { x1: 0, y1: 0, x2: 0, y2: 7, class: "hatch-line" }, hatch);
  const grad = el("radialGradient", { id: "dial-face", cx: "50%", cy: "42%", r: "62%" }, defs);
  el("stop", { offset: "0%", "stop-color": "#9db4ff", "stop-opacity": ".085" }, grad);
  el("stop", { offset: "70%", "stop-color": "#9db4ff", "stop-opacity": ".025" }, grad);
  el("stop", { offset: "100%", "stop-color": "#9db4ff", "stop-opacity": ".0" }, grad);

  // the dial face: a faint cool surface, instrument rings and a crosshair
  el("circle", { cx: C, cy: C, r: R_RING, fill: "url(#dial-face)" }, svg);
  for (const r of [196, 132, 70]) el("circle", { cx: C, cy: C, r, class: "ring-inner" }, svg);
  el("line", { x1: C - R_RING, y1: C, x2: C + R_RING, y2: C, class: "cross" }, svg);
  el("line", { x1: C, y1: C - R_RING, x2: C, y2: C + R_RING, class: "cross" }, svg);

  // busy hours 09:00 -> 18:00, hatched
  const busy0 = angleOf(WINDOW_END);
  const busy1 = angleOf(WINDOW_START);
  el("path", { d: sector(R_RING - 52, R_RING, busy0, busy1), fill: "url(#hatch)", class: "busy" }, svg);
  el("path", { d: arcPath(R_RING - 52, busy0, busy1), class: "hair" }, svg);
  // the arc the "OCCUPIED" caption runs along (the textPath below points at it by id)
  el("path", { id: "busy-label-path", d: `M${f(polar(R_RING - 22, busy1)[0])} ${f(polar(R_RING - 22, busy1)[1])} A${R_RING - 22} ${R_RING - 22} 0 0 0 ${f(polar(R_RING - 22, busy0)[0])} ${f(polar(R_RING - 22, busy0)[1])}`, fill: "none" }, defs);
  const t = el("text", { class: "dial-micro busy-label", "text-anchor": "middle" }, svg);
  const tp = el("textPath", { href: "#busy-label-path", startOffset: "50%" }, t);
  tp.textContent = "OCCUPIED  09:00 - 18:00";

  // window rail (the part that lights up as the night goes by)
  el("path", { d: arcPath(R_RING, angleOf(WINDOW_START), angleOf(WINDOW_START) + 225), class: "rail" }, svg);
  const lit = el("path", { d: "", class: "rail-lit" }, svg);
  const sweep = el("path", { d: "", class: "sweep" }, svg);

  // ticks: every hour on the whole dial, every quarter inside the window
  const ticks = [];
  for (let h = 0; h < 24; h++) {
    const inWindow = h >= WINDOW_START || h < WINDOW_END;
    const deg = angleOf(h);
    const [x0, y0] = polar(R_RING, deg);
    const [x1, y1] = polar(R_RING + (h % 3 === 0 ? 20 : 12), deg);
    el("line", { x1: f(x0), y1: f(y0), x2: f(x1), y2: f(y1), class: "tick" + (inWindow ? " tick-win" : "") }, svg);
    if (inWindow) {
      for (let q = 1; q < 4; q++) {
        const dq = deg + q * 3.75;
        const [qx0, qy0] = polar(R_RING, dq);
        const [qx1, qy1] = polar(R_RING + 6, dq);
        el("line", { x1: f(qx0), y1: f(qy0), x2: f(qx1), y2: f(qy1), class: "tick tick-q" }, svg);
      }
    }
    if (h % 3 === 0) {
      const [nx, ny] = polar(R_RING + 42, deg);
      const n = el("text", { x: f(nx), y: f(ny + 5), class: "dial-num", "text-anchor": "middle" }, svg);
      n.textContent = String(h).padStart(2, "0");
    }
  }

  // hourly runs inside the window; the 6-hourly discovery runs are the big ones
  const runs = [];
  for (let k = 0; k <= 15; k++) {
    const hour = (WINDOW_START + k) % 24;
    const deg = angleOf(hour);
    const [x, y] = polar(R_RING - 22, deg);
    const big = k % 6 === 0;
    const dot = el("circle", { cx: f(x), cy: f(y), r: big ? 6.5 : 3.2, class: "run" + (big ? " run-big" : "") }, svg);
    runs.push({ k, dot });
  }

  // hand
  const hand = el("g", { class: "hand", transform: `rotate(${angleOf(WINDOW_START)} ${C} ${C})` }, svg);
  el("line", { x1: C, y1: C + 18, x2: C, y2: C - (R_RING - 6), class: "hand-line" }, hand);
  el("circle", { cx: C, cy: C - (R_RING - 6), r: 5.5, class: "hand-tip" }, hand);
  el("circle", { cx: C, cy: C, r: 7, class: "hub" }, svg);

  // readout below the hub: big digits, then a caption
  const time = el("text", { x: C, y: C + 132, class: "dial-time", "text-anchor": "middle" }, svg);
  time.textContent = "18:00";
  const cap = el("text", { x: C, y: C + 166, class: "dial-micro", "text-anchor": "middle" }, svg);
  cap.textContent = "LOCAL TIME";

  let lastRuns = -1;
  let lastText = "";

  return {
    svg,
    /** nightT is hours since 18:00, 0..15 */
    update(nightT) {
      const hourAbs = WINDOW_START + nightT;
      const deg = angleOf(hourAbs);
      const start = angleOf(WINDOW_START);
      const end = start + nightT * 15; // 15 degrees per hour
      hand.setAttribute("transform", `rotate(${f(deg)} ${C} ${C})`);
      lit.setAttribute("d", nightT > 0.01 ? arcPath(R_RING, start, end) : "");
      sweep.setAttribute("d", nightT > 0.01 ? sector(30, R_RING - 54, Math.max(start, end - 70), end) : "");
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
