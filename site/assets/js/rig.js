// The fixed layers that travel across acts: the 24-hour dial and the real panel (an iframe of the demo
// build, fictional data) lying on a plane in 3D. Both are positioned from the global act position `u`
// (act index + local progress), so the camera moves are plain keyframes in one place.

import { isPhone, clamp, lerp, qaWarn, smooth, track } from "./util.js";

const PANEL_W = 1920; // the size the panel is drawn at inside its iframe, before the plane scales it
const PANEL_H = 1080;
const HUD_H = 56; // the top bar's height (`.hud` in main.css)
const HUD_GAP = 20; // air under the top bar
const PHONE_PANEL_SHARE = 0.9; // the docked panel's size as a share of the size that fills the window (phones)...
const DESKTOP_PANEL_SHARE = 0.8; // ...and on wide screens, when it fits
const PHONE_PEEK_GAP = 22; // phones: the panel's top edge is this far under act 2's last line

const DOCK_TOP = 54; // gap from the top of the window to the docked dial's frame
const DOCK_MARGIN = 6; // gap between the docked dial and its gutter and top

/** Where the dial sits once docked in the top right corner: its size, the gutter to the window's edge and its centre. */
export function dockGeometry(vw) {
  const narrow = isPhone(vw);
  const gutter = narrow ? 18 : Math.min(64, vw * 0.042);
  const size = narrow ? 84 : clamp(vw * 0.082, 86, 116);
  return { gutter, size, x: vw - gutter - size / 2 - DOCK_MARGIN, y: DOCK_TOP + size / 2 + DOCK_MARGIN };
}

export function createRig({ dialHost, dial, plane, iframe, heroCopy, readCopy }) {
  let heroSize = 600;
  let heroX = 0;
  let heroY = 0;
  let readEnd = 0; // phones: where act 2's copy ends, measured (the panel peeks up from under it)
  let panelW = PANEL_W;
  let panelH = PANEL_H;
  let docked = null;
  let tabNow = "";
  let ready = false; // the panel has loaded: until then the plane stays hidden, so a visitor never sees it empty

  function layout(vw, vh) {
    const narrow = isPhone(vw);
    if (narrow) {
      // Phones are stacked: the hero dial sits under the hero copy (its last line is the scroll cue) and never behind
      // the headline or the lede, as big as the room left to the bottom of the screen allows. The copy's end is
      // measured, so it holds for every phone size and for whatever font the headline ends up in.
      const copyEnd = heroCopy ? heroCopy.offsetTop + heroCopy.offsetHeight : vh * 0.62;
      const gap = 14;
      const floor = 20;
      heroSize = clamp(vh - floor - (copyEnd + gap), 150, vw * 0.86);
      heroX = vw * 0.5;
      heroY = copyEnd + gap + heroSize / 2;
      readEnd = readCopy ? readCopy.offsetTop + readCopy.offsetHeight : vh * 0.54;
    } else {
      heroSize = Math.min(vh * 0.94, vw * 0.54);
      heroX = vw * 0.72;
      heroY = vh * 0.62;
    }
    dialHost.style.setProperty("--dial", heroSize.toFixed(1) + "px");
    panelW = iframe.offsetWidth || PANEL_W;
    panelH = iframe.offsetHeight || PANEL_H;
  }

  function setTab(name) {
    if (name === tabNow) return;
    try {
      const doc = iframe.contentDocument;
      // the v1 panel switches tab with a [data-tab] button; the current panel follows its address (#hoy, #cola, ...)
      const b = doc && doc.querySelector('[data-tab="' + name + '"]');
      if (b) {
        b.click();
        tabNow = name;
      } else if (doc && doc.getElementById("app")) {
        iframe.contentWindow.location.hash = "#" + name;
        tabNow = name;
      }
    } catch (e) {
      // the panel is not reachable (not loaded yet, or served from another origin): the next frame tries again
      qaWarn("rig: could not switch the panel to " + name, e);
    }
  }

  iframe.addEventListener("load", () => {
    tabNow = "";
  });

  /** the dial: hero object -> small clock docked at the top right */
  function updateDial(ctx, uPlane) {
    const { vw, u } = ctx;
    const narrow = isPhone(vw);
    const { size: dockSize, x: dx, y: dy } = dockGeometry(vw);
    const docking = smooth(0.2, 0.55, u);
    const size = lerp(heroSize, dockSize, docking);
    const cx = lerp(heroX, dx, docking);
    const cy = lerp(heroY, dy, docking);
    // The panel carries its own dial and its own clock, so while the plane is on screen (it rises, fills the
    // window, docks, leaves) the story's dial yields: it fades and shrinks a little, then comes back in its
    // corner when the plane has gone. One clock per frame, and never on top of the panel's.
    // (phones: it comes back a little later, after act 2's copy has gone, so that the two are never on screen together)
    const away = smooth(0.6, 0.84, u) * (1 - (narrow ? smooth(1.95, 2.0, uPlane) : smooth(1.93, 1.99, uPlane)));
    const shown = size * (1 - 0.12 * away);
    const scale = shown / heroSize;
    dialHost.style.transform = `translate3d(${(cx - shown / 2).toFixed(1)}px,${(cy - shown / 2).toFixed(1)}px,0) scale(${scale.toFixed(4)})`;
    dialHost.style.opacity = (1 - away).toFixed(3);
    dialHost.style.visibility = away > 0.995 ? "hidden" : "visible";
    const isDocked = docking > 0.6;
    if (isDocked !== docked) {
      docked = isDocked;
      dialHost.classList.toggle("is-docked", isDocked);
    }
    dial.update(ctx.nightT);
  }

  /** the panel plane: rises tilted, flattens until it fills the screen (the dive), then docks at the right */
  function updatePlane(ctx, uPlane) {
    const { vw, vh, u } = ctx;
    const narrow = isPhone(vw);
    const { gutter } = dockGeometry(vw);
    const fit = Math.min((vw * (narrow ? 0.98 : 1)) / panelW, (vh * (narrow ? 0.88 : 1)) / panelH);
    // Docked, the panel sits in the free column to the right of act 2's copy (same width rule as .a2-copy) and
    // stays whole inside the window: it takes 0.8 of the fill size when that fits and shrinks to the column when
    // it does not, so on a laptop it is smaller but never cut. It keeps hugging the right edge.
    const copyRight = gutter + Math.min(vw * 0.34, 520);
    const padL = clamp(vw * 0.014, 16, 36);
    const padR = clamp(vw * 0.012, 12, 28);
    const roomW = vw - padR - (copyRight + padL);
    const roomH = vh - HUD_H - HUD_GAP; // under the HUD
    const sDock = narrow ? fit * PHONE_PANEL_SHARE : Math.min(fit * DESKTOP_PANEL_SHARE, roomW / panelW, roomH / panelH);
    const dockTx = narrow ? 0 : vw - padR - (panelW * sDock) / 2 - vw / 2;
    // phone: the panel peeks up from the bottom, under the copy (its top edge sits a little below the copy's last line)
    const dockTy = narrow ? readEnd + PHONE_PEEK_GAP + (panelH * sDock) / 2 - vh / 2 : (vh + HUD_H) / 2 - vh / 2;
    const planeScale = track([[0.14, fit * 0.46], [0.5, fit * 0.62], [0.95, fit], [1.0, fit], [1.18, sDock], [1.912, sDock], [1.956, sDock * 0.94]], uPlane);
    const rx = track([[0.14, 74], [0.5, 46], [0.95, 2], [1.0, 0]], u);
    const rz = track([[0.14, -22], [0.5, -11], [1.0, 0]], u);
    const tx = track([[0.14, 0], [0.5, vw * 0.03], [1.0, 0], [1.18, dockTx]], u);
    const ty = track([[0.14, vh * 0.62], [0.5, vh * 0.06], [1.0, 0], [1.18, dockTy]], u);
    // it leaves exactly while act 2's copy does (engine hand-over, 1.912 to 1.956), so the right side is never empty
    const op = ready ? track([[0.12, 0], [0.34, 1], [1.912, 1], [1.956, 0]], uPlane) : 0;
    plane.style.opacity = op.toFixed(3);
    plane.style.visibility = op < 0.01 ? "hidden" : "visible";
    plane.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${planeScale.toFixed(4)})`;
  }

  function update(ctx) {
    // `u` jumps from 1.91 to 2.0 when act 3 takes over (the acts overlap). The panel leaves while act 2's copy does,
    // which is after that jump, so it follows act 2's own progress, which does not jump.
    const uPlane = ctx.idx >= 2 ? 1 + ctx.items[1].p : ctx.u;
    updateDial(ctx, uPlane);
    updatePlane(ctx, uPlane);
    // the panel itself changes tab while we talk about it
    if (ctx.u < 1.35) setTab("hoy");
    else if (ctx.u < 2.0) setTab("cola");
  }

  return { layout, update, setTab, setReady: (v) => { ready = v; } };
}
