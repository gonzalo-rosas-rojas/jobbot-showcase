// Small math helpers shared by every scene. No dependencies.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** `v` kept inside [lo, hi]; when the range is empty (lo > hi) the middle of the two. */
export const clampTo = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Interpolates a keyframe list [[x, value], ...] (x ascending) at position `x`, with smoothstep between keys. */
export function track(keys, x) {
  if (x <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [x0, v0] = keys[i];
    const [x1, v1] = keys[i + 1];
    if (x >= x0 && x <= x1) {
      return v0 + (v1 - v0) * smooth(x0, x1, x);
    }
  }
  return last[1];
}

/** Hex "#rrggbb" -> [r, g, b]. */
export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixRgb(a, b, t) {
  return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
}

/** Deterministic PRNG so the star field never changes between visits. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pad2 = (n) => String(n).padStart(2, "0");

/** The hour of day (0..23) at which the night shift starts: the dial and the clock both count from it. */
export const WINDOW_START = 18;
/** The hour of day at which it ends. */
export const WINDOW_END = 9;

/** Night time in hours since WINDOW_START (0..15) -> "HH:MM". */
export function clockText(nightT) {
  const total = Math.round(((WINDOW_START + nightT) % 24) * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return pad2(h) + ":" + pad2(m);
}

/** Widest viewport (px) that gets the phone composition; the stylesheet's `max-width: 760px` is the same line. */
export const PHONE_MAX_W = 760;

/** The phone composition: up to and including PHONE_MAX_W, like the stylesheet's `max-width`. */
export const isPhone = (vw) => vw <= PHONE_MAX_W;

/** A count as the page writes it: rounded to a whole number, English thousands separators. */
export const fmtCount = (n) => Math.round(n).toLocaleString("en-US");

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True when the address carries ?qa=1: the testing hook (window.__night) and the development warnings are on. */
export const QA = new URLSearchParams(window.location.search).get("qa") === "1";

/** console.warn for something the page recovers from on its own but a developer should see; silent for visitors. */
export const qaWarn = (...args) => {
  if (QA) console.warn(...args);
};
