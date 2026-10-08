// The fixed layers that travel across acts: the 24-hour dial and the real panel (an iframe of the demo
// build, fictional data) lying on a plane in 3D. Both are positioned from the global act position `u`
// (act index + local progress), so the camera moves are plain keyframes in one place.

import { clamp, lerp, smooth, track } from "./util.js";

export function createRig({ dialHost, dial, plane, iframe }) {
  let heroSize = 600;
  let W = 1920;
  let H = 1080;
  let docked = null;
  let tabNow = "";

  function layout(vw, vh) {
    const narrow = vw < 760;
    heroSize = narrow ? Math.min(vw * 0.86, vh * 0.46) : Math.min(vh * 0.94, vw * 0.54);
    dialHost.style.setProperty("--dial", heroSize.toFixed(1) + "px");
    W = iframe.offsetWidth || 1920;
    H = iframe.offsetHeight || 1080;
  }

  function setTab(name) {
    if (name === tabNow) return;
    try {
      const doc = iframe.contentDocument;
      const b = doc && doc.querySelector('[data-tab="' + name + '"]');
      if (b) {
        b.click();
        tabNow = name;
      }
    } catch (e) {
      /* cross-origin or not loaded yet: harmless, the next frame tries again */
    }
  }

  iframe.addEventListener("load", () => {
    tabNow = "";
  });

  function update(ctx) {
    const { vw, vh, u } = ctx;
    const narrow = vw < 760;
    const gutter = narrow ? 18 : Math.min(64, vw * 0.042);

    // ---- dial: hero object -> small clock docked at the top right
    const dockSize = narrow ? 84 : clamp(vw * 0.082, 86, 116);
    const hx = narrow ? vw * 0.5 : vw * 0.72;
    const hy = narrow ? vh * 0.64 : vh * 0.62;
    const dx = vw - gutter - dockSize / 2 - 6;
    const dy = 54 + dockSize / 2 + 6;
    const d = smooth(0.2, 0.55, u);
    const size = lerp(heroSize, dockSize, d);
    const cx = lerp(hx, dx, d);
    const cy = lerp(hy, dy, d);
    const scale = size / heroSize;
    dialHost.style.transform = `translate3d(${(cx - size / 2).toFixed(1)}px,${(cy - size / 2).toFixed(1)}px,0) scale(${scale.toFixed(4)})`;
    const isDocked = d > 0.6;
    if (isDocked !== docked) {
      docked = isDocked;
      dialHost.classList.toggle("is-docked", isDocked);
    }
    dial.update(ctx.nightT);

    // ---- panel plane: rises tilted, flattens until it fills the screen (the dive), then docks at the right
    const fit = Math.min((vw * (narrow ? 0.98 : 1)) / W, (vh * (narrow ? 0.88 : 1)) / H);
    const dockK = narrow ? 0.9 : 0.8;
    const sDock = fit * dockK;
    const left = narrow ? 0 : vw * 0.4;
    const dockTx = narrow ? 0 : left + (W * sDock) / 2 - vw / 2;
    const dockTy = narrow ? vh * 0.5 : vh * 0.012; // phone: the panel peeks up from the bottom, under the copy
    const s = track([[0.14, fit * 0.46], [0.5, fit * 0.62], [0.95, fit], [1.0, fit], [1.18, sDock], [1.84, sDock], [1.91, sDock * 0.94]], u);
    const rx = track([[0.14, 74], [0.5, 46], [0.95, 2], [1.0, 0]], u);
    const rz = track([[0.14, -22], [0.5, -11], [1.0, 0]], u);
    const tx = track([[0.14, 0], [0.5, vw * 0.03], [1.0, 0], [1.18, dockTx]], u);
    const ty = track([[0.14, vh * 0.62], [0.5, vh * 0.06], [1.0, 0], [1.18, dockTy]], u);
    const op = track([[0.12, 0], [0.34, 1], [1.84, 1], [1.91, 0]], u);
    plane.style.opacity = op.toFixed(3);
    plane.style.visibility = op < 0.01 ? "hidden" : "visible";
    plane.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`;

    // the panel itself changes tab while we talk about it
    if (u < 1.35) setTab("hoy");
    else if (u < 2.0) setTab("cola");
  }

  return { layout, update, setTab };
}
