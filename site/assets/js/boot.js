// Runs before the stylesheet is parsed and decides, once, which page this is. The class "js" on <html> means the animated
// page: the styles that hide things for the animation (and only those) apply. Without scripts the class never appears and
// the page stays a readable document. A visitor who asks for reduced motion gets that same document, with "still" in place
// of "js": main.js then starts only what moves nothing (the language switch, the panel button, the counted figures), and
// the stylesheet's rules for the page without scripts apply as they are.
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("still");
else document.documentElement.classList.add("js");
