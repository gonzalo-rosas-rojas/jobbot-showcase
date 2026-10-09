// "Use the panel": the same demo build that sits on the plane, full screen and live, for anyone who would
// rather click than scroll. While the panel is on screen in the story, it comes forward from where it was: the live
// copy grows out of that very rectangle. Anywhere else it opens as a circle growing from the button, the same
// gesture as the sun in act 8. Escape (or the button) closes it back to the exact place in the story.

import { withLang } from "./lang.js";

const html = document.documentElement;

export function createTry() {
  const root = document.getElementById("try");
  const frame = root.querySelector(".try-frame");
  const closeBtn = root.querySelector(".try-close");
  const openers = [...document.querySelectorAll("[data-try]")];
  const behind = [...document.body.children].filter((el) => el !== root);
  let opener = null;
  let open = false;

  const load = () => {
    if (!frame.getAttribute("src")) frame.setAttribute("src", withLang(frame.dataset.src));
  };

  // The panel handles its own Escape (keys help, drawer, cursor). Only when none of them is up does Escape leave.
  const watchFrame = () => {
    let doc = null;
    try { doc = frame.contentDocument; } catch (e) { /* not reachable: the close button still works */ }
    if (!doc || doc.__tryWatched) return;
    doc.__tryWatched = true;
    doc.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !open) return;
      const busy = doc.querySelector(".keys, .pal, #detail.open, #app li.cur");
      if (!busy) close();
    }, true);
  };

  // The panel of the story, when it is there to be seen: its box on screen, or nothing.
  function planeBox() {
    const plane = document.getElementById("plane");
    if (!plane) return null;
    const look = getComputedStyle(plane);
    if (look.visibility === "hidden" || parseFloat(look.opacity) < 0.5) return null;
    const r = plane.getBoundingClientRect();
    return r.width < 120 || r.height < 80 ? null : r;
  }

  function setOrigin(from) {
    const r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : null;
    const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const y = r ? r.top + r.height / 2 : window.innerHeight / 2;
    root.style.setProperty("--ox", x.toFixed(0) + "px");
    root.style.setProperty("--oy", y.toFixed(0) + "px");
  }

  function show(from) {
    if (open) return;
    open = true;
    opener = from || document.activeElement;
    load();
    setOrigin(from);
    // from the panel's own place if it is on screen (else from the button), without animating the switch itself
    const box = planeBox();
    root.classList.add("no-anim");
    root.classList.toggle("from-plane", !!box);
    if (box) {
      root.style.setProperty("--px", box.left.toFixed(1) + "px");
      root.style.setProperty("--py", box.top.toFixed(1) + "px");
      root.style.setProperty("--sx", (box.width / window.innerWidth).toFixed(4));
      root.style.setProperty("--sy", (box.height / window.innerHeight).toFixed(4));
    }
    void root.offsetWidth;
    root.classList.remove("no-anim");
    behind.forEach((el) => el.setAttribute("inert", ""));
    root.removeAttribute("inert");
    html.classList.add("try-open");
    // one frame later so the circle grows from its start instead of appearing already open
    requestAnimationFrame(() => root.classList.add("is-open"));
    window.setTimeout(() => { try { frame.focus(); } catch (e) { closeBtn.focus(); } }, 120);
  }

  function close() {
    if (!open) return;
    open = false;
    root.classList.remove("is-open");
    root.setAttribute("inert", "");
    behind.forEach((el) => el.removeAttribute("inert"));
    html.classList.remove("try-open");
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  openers.forEach((b) => {
    b.addEventListener("click", () => show(b));
    // warm the demo while the pointer approaches, so the click opens something already alive
    b.addEventListener("pointerenter", load, { once: true });
    b.addEventListener("focus", load, { once: true });
  });
  closeBtn.addEventListener("click", close);
  frame.addEventListener("load", watchFrame);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) close();
  });
  return { show, close, get isOpen() { return open; } };
}
