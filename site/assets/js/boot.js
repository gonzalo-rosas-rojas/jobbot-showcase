// Runs before the stylesheet is parsed: marks the page as one that runs scripts, so the styles that hide things for the
// animation (and only those) apply. Without scripts the class never appears and the page stays a readable document.
document.documentElement.classList.add("js");
