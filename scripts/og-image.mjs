// Rebuilds the two images that go with the page's address: the preview card (site/assets/og.jpg, 1200x630) and the iOS
// home-screen icon (site/assets/apple-touch-icon.png, 180x180). Run it from the repository root whenever the first screen
// changes:
//
//   node scripts/og-image.mjs
//
// The card is a screenshot of the first screen of the story, taken in the same headless Chrome the tests use, with the
// page's own fonts, at the size LinkedIn, Slack and WhatsApp show (1.91:1). The icon is the page's own favicon (the SVG in
// the <link rel="icon"> of index.html) on the page's theme colour, so there is a single drawing. Needs Chrome (CHROME_PATH
// if it is not in a usual place) and no packages.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { launchChrome, until } from "../tests/lib/chrome.mjs";
import { SITE, readSite, serveSite } from "../tests/lib/site.mjs";

const CARD = { width: 1200, height: 630, quality: 82 };
const ICON = { size: 180 };

const html = readSite("index.html");
const favicon = decodeURIComponent(html.match(/<link rel="icon" href="data:image\/svg\+xml,([^"]+)"/)[1]).replaceAll("'", '"');
const background = html.match(/<meta name="theme-color" content="(#[0-9a-f]{6})"/i)[1];

const server = await serveSite();
const chrome = await launchChrome(CARD);
try {
  // the card: the first frame of the story, once the headline has finished rising and the fonts are in
  const page = await chrome.newPage({ width: CARD.width, height: CARD.height });
  await page.goto(`${server.origin}/`);
  await page.waitFor(`document.fonts.status === "loaded"`, "the fonts");
  await page.waitFor(`document.querySelectorAll(".a1-copy .ch").length > 0`, "the headline to be split");
  await until(async () => (await page.eval(`document.getAnimations().filter((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity).length`)) === 0, "the headline to finish rising");
  await page.frames(5);
  const card = await page.send("Page.captureScreenshot", { format: "jpeg", quality: CARD.quality });
  writeFileSync(join(SITE, "assets/og.jpg"), Buffer.from(card.data, "base64"));
  await page.close();

  // the icon: the favicon drawing filling a square of the theme colour
  const iconPage = await chrome.newPage({ width: ICON.size, height: ICON.size });
  const markup = `<!doctype html><body style="margin:0;background:${background}">${favicon.replace("<svg", `<svg width="${ICON.size}" height="${ICON.size}"`)}</body>`;
  await iconPage.goto("data:text/html;charset=utf-8," + encodeURIComponent(markup));
  const icon = await iconPage.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(SITE, "assets/apple-touch-icon.png"), Buffer.from(icon.data, "base64"));
  await iconPage.close();
} finally {
  await chrome.close();
  await server.close();
}
console.log("wrote site/assets/og.jpg and site/assets/apple-touch-icon.png");
