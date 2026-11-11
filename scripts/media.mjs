// Rebuilds the three stills of the README (docs/shot-hero.jpg, docs/shot-panel.jpg, docs/shot-dawn.jpg) from the site served
// locally, in the headless Chrome the tests use. Run it from the repository root when the page changes:
//
//   node scripts/media.mjs
//
// The three moments are the same as ever: the first screen (18:00), the panel docked next to the copy of the second act (21:06)
// and the sun rising over the skyline in the last act (08:56). Each is a 1440x900 JPEG of quality 82. Needs Chrome (CHROME_PATH if
// it is not in a usual place) and no packages.
//
// docs/hero.gif is not made here: it is a recording of the scroll, and its name and path must stay (another repository links to
// it). The file in the repository is the original 960x540 recording at 20 frames a second made lighter with ffmpeg: 10 frames a
// second, 640 pixels wide, a palette of its own of 64 colours. From the repository root, with the original as hero-original.gif:
//
//   ffmpeg -i hero-original.gif -vf "fps=10,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" -loop 0 docs/hero.gif
//
// (Do not run it again on the lighter file: it would lose quality twice.)

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { launchChrome } from "../tests/lib/chrome.mjs";
import { ROOT, serveSite } from "../tests/lib/site.mjs";

const SIZE = { width: 1440, height: 900 };
const QUALITY = 82;

// where in the story each still is taken: [file, act id, progress through the act]
const MOMENTS = [
  ["shot-hero.jpg", "a1", 0],
  ["shot-panel.jpg", "a2", 0.6],
  ["shot-dawn.jpg", "a8", 0.115],
];

const server = await serveSite();
const chrome = await launchChrome(SIZE);
try {
  const page = await chrome.newPage(SIZE);
  await page.goto(`${server.origin}/?qa=1`);
  await page.waitFor(`document.documentElement.classList.contains("js") && document.fonts.status === "loaded"`, "the page to start");
  // the panel on the plane has to be in before the second still
  await page.waitFor(`(() => { const f = document.querySelector("#plane iframe"); return f.getAttribute("src") && f.contentDocument.readyState === "complete" && f.contentDocument.body?.children.length > 0; })()`, "the panel to load");
  for (const [file, act, progress] of MOMENTS) {
    const at = await page.eval(`(() => {
      const el = document.getElementById("${act}");
      return Math.round(el.getBoundingClientRect().top + scrollY + ${progress} * (el.offsetHeight - innerHeight));
    })()`);
    await page.eval(`window.scrollTo(0, ${at}); window.__night.snap()`);
    // the panel's own entrance (it travels to the tab the story asks for) and the sun's last pixels take a moment to finish
    await new Promise((r) => setTimeout(r, 3000));
    await page.frames(10);
    await page.eval(`window.__night.snap()`);
    await page.frames(5);
    const shot = await page.send("Page.captureScreenshot", { format: "jpeg", quality: QUALITY });
    writeFileSync(join(ROOT, "docs", file), Buffer.from(shot.data, "base64"));
    console.log(`wrote docs/${file}`);
  }
  await page.close();
} finally {
  await chrome.close();
  await server.close();
}
