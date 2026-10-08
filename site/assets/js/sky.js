// The world behind everything. It changes with the hour of the night shift: dusk, deep night, dawn, and
// a city skyline whose windows go dark while the bot keeps working and come back on at the end.
// A fixed canvas, drawn when the hour changes and at ~20 fps (twinkle) while the tab is visible.
// Nothing here is an image: stars, gradient and buildings are generated from a fixed seed.

import { mixRgb, rgb, mulberry32, clamp, track, reducedMotion } from "./util.js";

// [nightT, top, horizon, warm glow colour, warm alpha, stars alpha]
const STOPS = [
  [0.0, "#0b1226", "#222c50", "#ff9440", 0.42, 0.12],
  [1.2, "#090e1d", "#1c2441", "#d9703a", 0.26, 0.5],
  [2.6, "#05080f", "#0e1630", "#3a4a7c", 0.1, 0.9],
  [10.0, "#04060b", "#0a1224", "#27386a", 0.07, 1.0],
  [12.6, "#070b17", "#18203a", "#5a5a8a", 0.14, 0.75],
  [14.0, "#101830", "#3a4468", "#ffb27a", 0.42, 0.3],
  [15.0, "#243050", "#8c8da0", "#ffd9a8", 0.55, 0.05],
];

// fraction of lit windows through the night (people go to bed, then wake up)
const LIT = [[0, 0.55], [1, 0.62], [3, 0.46], [5.5, 0.2], [8, 0.07], [11, 0.04], [12.8, 0.12], [14, 0.3], [15, 0.22]];

function sample(nightT) {
  let i = 0;
  while (i < STOPS.length - 2 && nightT > STOPS[i + 1][0]) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = clamp((nightT - a[0]) / (b[0] - a[0]));
  return {
    top: mixRgb(rgb(a[1]), rgb(b[1]), t),
    hor: mixRgb(rgb(a[2]), rgb(b[2]), t),
    warm: mixRgb(rgb(a[3]), rgb(b[3]), t),
    warmA: a[4] + (b[4] - a[4]) * t,
    stars: a[5] + (b[5] - a[5]) * t,
  };
}

function makeLayer(rand, count, minH, maxH, minW, maxW, winSize, gap) {
  const buildings = [];
  let x = -40;
  while (x < 2600) {
    const w = minW + rand() * (maxW - minW);
    const h = minH + rand() * rand() * (maxH - minH) + (maxH - minH) * 0.1 * rand();
    const wins = [];
    for (let wx = 6; wx < w - winSize - 3; wx += winSize + gap) {
      for (let wy = 8; wy < h - winSize - 4; wy += winSize + gap + 2) {
        if (rand() < 0.82) wins.push({ x: wx, y: wy, thr: rand() });
      }
    }
    buildings.push({ x, w, h, wins });
    x += w + (rand() < 0.3 ? 4 + rand() * 18 : 0);
  }
  void count;
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
  const far = makeLayer(rand, 0, 40, 170, 30, 70, 2.2, 3);
  const mid = makeLayer(rand, 0, 50, 230, 40, 90, 3, 4);
  const near = makeLayer(rand, 0, 30, 130, 60, 130, 4, 6);

  let w = 0;
  let h = 0;
  let dpr = 1;
  let nightT = 0;
  let scrollY = 0;
  let timer = 0;
  const still = reducedMotion();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw(performance.now());
  }

  function skyline(layer, baseY, scale, offset, body, winRgb, winAlpha, lit) {
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
        const s = layer === near ? 3.4 : layer === mid ? 2.6 : 1.8;
        g.fillRect(bx + wn.x * scale, baseY - bh + wn.y * scale, s * scale, s * scale * 1.15);
      }
    }
  }

  function draw(now) {
    const s = sample(nightT);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lg = g.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, `rgb(${s.top})`);
    lg.addColorStop(0.62, `rgb(${mixRgb(s.top, s.hor, 0.5)})`);
    lg.addColorStop(0.9, `rgb(${s.hor})`);
    lg.addColorStop(1, `rgb(${mixRgb(s.hor, s.warm, 0.35 + s.warmA * 0.5)})`);
    g.fillStyle = lg;
    g.fillRect(0, 0, w, h);
    // warm band hugging the horizon
    const hg = g.createRadialGradient(w * 0.5, h * 1.02, 0, w * 0.5, h * 1.02, Math.max(w * 0.75, h * 0.9));
    hg.addColorStop(0, `rgba(${s.warm},${s.warmA})`);
    hg.addColorStop(0.5, `rgba(${s.warm},${(s.warmA * 0.28).toFixed(3)})`);
    hg.addColorStop(1, `rgba(${s.warm},0)`);
    g.fillStyle = hg;
    g.fillRect(0, 0, w, h);

    // stars drift up slowly as you scroll; they never move faster than the content
    const drift = scrollY * 0.012;
    const tw = now / 1000;
    for (const st of stars) {
      const y = (((st.y * h - drift) % h) + h) % h;
      const a = st.a * s.stars * (still ? 1 : 0.72 + 0.28 * Math.sin(tw * st.sp + st.ph));
      if (a < 0.02) continue;
      g.fillStyle = `rgba(236,232,221,${a.toFixed(3)})`;
      g.beginPath();
      g.arc(st.x * w, y, st.r, 0, Math.PI * 2);
      g.fill();
    }

    // the city: three layers, windows lit according to the hour
    const lit = track(LIT, nightT);
    const unit = clamp(h / 900, 0.7, 1.5);
    const baseY = h + 2;
    const body = (k) => `rgb(${mixRgb(s.top, s.hor, k).map((v) => Math.round(v * 0.55)).join(",")})`;
    skyline(far, baseY, unit * 0.9, 40 + scrollY * 0.004, body(0.55), "255,214,150", 0.35, lit * 0.9);
    skyline(mid, baseY, unit, 140 + scrollY * 0.01, body(0.25), "255,205,130", 0.6, lit);
    skyline(near, baseY, unit * 1.05, 300 + scrollY * 0.02, body(0.0), "255,196,110", 0.85, lit * 0.8);
  }

  function loop() {
    if (document.visibilityState === "visible") draw(performance.now());
    timer = window.setTimeout(loop, 50);
  }

  window.addEventListener("resize", resize);
  resize();
  if (!still) loop();
  void timer;

  return {
    update(t, sy) {
      nightT = t;
      scrollY = sy;
      if (still) draw(0);
    },
  };
}
