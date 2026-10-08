// Small math helpers shared by every scene. No dependencies.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const smoother = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };
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
      const t = (x - x0) / (x1 - x0);
      const e = t * t * (3 - 2 * t);
      return v0 + (v1 - v0) * e;
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

/** Night time in hours since 18:00 (0..15) -> "HH:MM". */
export function clockText(nightT) {
  const total = Math.round(((18 + nightT) % 24) * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return pad2(h) + ":" + pad2(m);
}

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
