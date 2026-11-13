// The world behind everything. It changes with the hour of the night shift: dusk, deep night, dawn, and
// a city skyline whose windows go dark while the bot keeps working and come back on at the end.
// A fixed canvas, redrawn every FRAME_MS (~20 fps, for the twinkle) while the tab is visible; the hour and the scroll
// position only change what that redraw paints.
// Nothing here is an image: stars, gradient and buildings are generated from a fixed seed.

import { mixRgb, rgb, mulberry32, clamp, track, reducedMotion } from "./util.js";

const FRAME_MS = 50;

// The sky at given hours: top and horizon colours, the warm glow (colour, alpha) and the stars' alpha.
const STOPS = [
  { at: 0.0, top: "#0b1226", hor: "#222c50", warm: "#ff9440", warmAlpha: 0.42, starAlpha: 0.12 },
  { at: 1.2, top: "#090e1d", hor: "#1c2441", warm: "#d9703a", warmAlpha: 0.26, starAlpha: 0.5 },
  { at: 2.6, top: "#05080f", hor: "#0e1630", warm: "#3a4a7c", warmAlpha: 0.1, starAlpha: 0.9 },
  { at: 10.0, top: "#04060b", hor: "#0a1224", warm: "#27386a", warmAlpha: 0.07, starAlpha: 1.0 },
  { at: 12.6, top: "#070b17", hor: "#18203a", warm: "#5a5a8a", warmAlpha: 0.14, starAlpha: 0.75 },
  { at: 14.0, top: "#101830", hor: "#3a4468", warm: "#ffb27a", warmAlpha: 0.42, starAlpha: 0.3 },
  { at: 15.0, top: "#243050", hor: "#8c8da0", warm: "#ffd9a8", warmAlpha: 0.55, starAlpha: 0.05 },
];

// fraction of lit windows through the night (people go to bed, then wake up)
const LIT = [[0, 0.55], [1, 0.62], [3, 0.46], [5.5, 0.2], [8, 0.07], [11, 0.04], [12.8, 0.12], [14, 0.3], [15, 0.22]];

function sample(nightT) {
  let i = 0;
  while (i < STOPS.length - 2 && nightT > STOPS[i + 1].at) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = clamp((nightT - a.at) / (b.at - a.at));
  return {
    top: mixRgb(rgb(a.top), rgb(b.top), t),
    hor: mixRgb(rgb(a.hor), rgb(b.hor), t),
    warm: mixRgb(rgb(a.warm), rgb(b.warm), t),
    warmAlpha: a.warmAlpha + (b.warmAlpha - a.warmAlpha) * t,
    starAlpha: a.starAlpha + (b.starAlpha - a.starAlpha) * t,
  };
}

/** One skyline layer: building heights and widths in the given ranges; windows on a grid whose cells are `cell` + `gap` px (`cell` is the grid's own size; the drawn window is `size` in skyline). */
function makeLayer(rand, { minH, maxH, minW, maxW, cell, gap }) {
  const buildings = [];
  let x = -40;
  while (x < 2600) {
    const w = minW + rand() * (maxW - minW);
    const h = minH + rand() * rand() * (maxH - minH) + (maxH - minH) * 0.1 * rand();
    const wins = [];
    for (let wx = 6; wx < w - cell - 3; wx += cell + gap) {
      for (let wy = 8; wy < h - cell - 4; wy += cell + gap + 2) {
        if (rand() < 0.82) wins.push({ x: wx, y: wy, thr: rand() });
      }
    }
    buildings.push({ x, w, h, wins });
    x += w + (rand() < 0.3 ? 4 + rand() * 18 : 0);
  }
  return buildings;
}

export function createSky(canvas) {
  const g = canvas.getContext("2d", { alpha: false });
  const rand = mulberry32(20261007);
  const stars = Array.from({ length: 280 }, () => ({
    x: rand(),
    y: Math.pow(rand(), 1.4) * 0.9,
    r: 0.35 + rand() * rand() * 1.5,
    a: 0.35 + rand() * 0.65,
    ph: rand() * Math.PI * 2,
    sp: 0.4 + rand() * 1.6,
  }));
  const far = makeLayer(rand, { minH: 40, maxH: 170, minW: 30, maxW: 70, cell: 2.2, gap: 3 });
  const mid = makeLayer(rand, { minH: 50, maxH: 230, minW: 40, maxW: 90, cell: 3, gap: 4 });
  const near = makeLayer(rand, { minH: 30, maxH: 130, minW: 60, maxW: 130, cell: 4, gap: 6 });

  let w = 0;
  let h = 0;
  let dpr = 1;
  let nightT = 0;
  let scrollY = 0;
  const still = reducedMotion();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw(performance.now());
  }

  // style: { scale, offset, body (fill), winRgb ("r,g,b"), winAlpha, lit (share of lit windows), size (drawn window size) }
  function skyline(layer, baseY, { scale, offset, body, winRgb, winAlpha, lit, size }) {
    for (const b of layer) {
      const bx = b.x * scale - offset;
      if (bx > w + 10 || bx + b.w * scale < -10) continue;
      const bh = b.h * scale;
      g.fillStyle = body;
      g.fillRect(bx, baseY - bh, b.w * scale + 0.5, bh + 2);
      if (winAlpha <= 0) continue;
      for (const wn of b.wins) {
        const a = clamp((lit - wn.thr) / 0.1) * winAlpha;
        if (a < 0.03) continue;
        g.fillStyle = `rgba(${winRgb},${a.toFixed(3)})`;
        g.fillRect(bx + wn.x * scale, baseY - bh + wn.y * scale, size * scale, size * scale * 1.15);
      }
    }
  }

  function paintSky(s) {
    const lg = g.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, `rgb(${s.top})`);
    lg.addColorStop(0.62, `rgb(${mixRgb(s.top, s.hor, 0.5)})`);
    lg.addColorStop(0.9, `rgb(${s.hor})`);
    lg.addColorStop(1, `rgb(${mixRgb(s.hor, s.warm, 0.35 + s.warmAlpha * 0.5)})`);
    g.fillStyle = lg;
    g.fillRect(0, 0, w, h);
    // warm band hugging the horizon
    const hg = g.createRadialGradient(w * 0.5, h * 1.02, 0, w * 0.5, h * 1.02, Math.max(w * 0.75, h * 0.9));
    hg.addColorStop(0, `rgba(${s.warm},${s.warmAlpha})`);
    hg.addColorStop(0.5, `rgba(${s.warm},${(s.warmAlpha * 0.28).toFixed(3)})`);
    hg.addColorStop(1, `rgba(${s.warm},0)`);
    g.fillStyle = hg;
    g.fillRect(0, 0, w, h);
  }

  function paintStars(s, now) {
    // stars drift up slowly as you scroll; they never move faster than the content
    const drift = scrollY * 0.012;
    const tw = now / 1000;
    for (const st of stars) {
      const y = (((st.y * h - drift) % h) + h) % h;
      const a = st.a * s.starAlpha * (still ? 1 : 0.72 + 0.28 * Math.sin(tw * st.sp + st.ph));
      if (a < 0.02) continue;
      g.fillStyle = `rgba(236,232,221,${a.toFixed(3)})`;
      g.beginPath();
      g.arc(st.x * w, y, st.r, 0, Math.PI * 2);
      g.fill();
    }
  }

  // the city: three layers, windows lit according to the hour
  function paintCity(s) {
    const lit = track(LIT, nightT);
    const unit = clamp(h / 900, 0.7, 1.5);
    const baseY = h + 2;
    const body = (k) => `rgb(${mixRgb(s.top, s.hor, k).map((v) => Math.round(v * 0.55)).join(",")})`;
    skyline(far, baseY, { scale: unit * 0.9, offset: 40 + scrollY * 0.004, body: body(0.55), winRgb: "255,214,150", winAlpha: 0.35, lit: lit * 0.9, size: 1.8 });
    skyline(mid, baseY, { scale: unit, offset: 140 + scrollY * 0.01, body: body(0.25), winRgb: "255,205,130", winAlpha: 0.6, lit, size: 2.6 });
    skyline(near, baseY, { scale: unit * 1.05, offset: 300 + scrollY * 0.02, body: body(0.0), winRgb: "255,196,110", winAlpha: 0.85, lit: lit * 0.8, size: 3.4 });
  }

  function draw(now) {
    const s = sample(nightT);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintSky(s);
    paintStars(s, now);
    paintCity(s);
  }

  function loop() {
    if (document.visibilityState === "visible") draw(performance.now());
    window.setTimeout(loop, FRAME_MS);
  }

  window.addEventListener("resize", resize);
  resize();
  if (!still) loop();

  return {
    update(hour, scroll) {
      nightT = hour;
      scrollY = scroll;
      if (still) draw(0);
    },
  };
}
