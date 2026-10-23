# Design notes

Why *The Night Shift* looks and moves the way it does. Written for whoever picks this up next (including its
author), so it records decisions and their reasons, and says plainly what is unfinished.

## The idea

A job-search bot does its work while its owner is away, so the page is built around the hours it runs: 18:00 to
09:00. Scroll position is the time of night. A 24-hour dial in the corner is the clock, the sky behind everything
goes from dusk through the dark hours to dawn, and the last screen is the morning: the sun comes up out of the
dial and the night turns to paper.

One idea per screen, about thirty words at most, and every claim on a screen is backed by something the visitor
can see move or can find in the code.

## Rules the whole sheet follows

- **Three type voices.** Condensed caps and mono are the machine. One italic serif is the human (it appears twice,
  where a person speaks). Nothing else is italic.
- **Colour has jobs, and they are the panel's.** Gold means "your turn" or the key figure. Mint appears once, on the
  approval that sends. Everything else is a cool blue-tinted neutral on a night that changes hue with the hour. The
  tokens are the panel's own (its *Tinta* theme is this night, its *Papel* theme is the morning on the last
  screen), so going from the story into the live panel does not change palette. The reasoning and the
  colour-blindness checks are in the panel's colour notes, which are not published; the contrast minimums of both
  themes are a Rust test in jobbot (`both_themes_keep_every_pair_of_colours_legible` in
  [`src/panel/mod.rs`](https://github.com/GonzaloRosas/jobbot/blob/main/src/panel/mod.rs)).
- **Motion is tied to scroll or to a data change, never to a timer.** Only `transform`, `opacity` and `clip-path`
  animate. The only loops are the cue under the hero and the cursor blink in the form, and reduced motion stops both.
- **The big gesture happens once.** Everything before the last act is quiet on purpose so that "HONEST." lands.
- **Fictional on purpose.** Companies, people and offers are invented. Counts about the code are measured.

## How it is built

| Layer | What it is |
| --- | --- |
| `engine.js` | Reads native scroll, smooths the read position (instant under reduced motion), turns it into a global night position `u` and a local progress `p` per act, and hands each scene `fx` = `{inn, out, late}` for the crossfades (`late` is `out` half a hand-over later; only act 7 uses it). `u` jumps by up to 0.09 when two acts overlap, so anything that must be continuous across a hand-over reads an act's own `p` instead. |
| Acts | Tall `<section>`s with a `position: sticky` stage. Acts 3 to 8 overlap the previous one by 130vh, so there is never an empty screen between two ideas. |
| `rig.js` | The fixed layers that travel across acts: the real panel on a 3D plane (an iframe of the demo build) and the dial. Keyframes live in one place. The panel carries its own dial and clock, so the story's dial yields while the plane is on screen: it fades over `u` 0.60 to 0.84 and is back in its corner when the plane has left (act 2's own progress 0.93 to 0.99). The docked panel takes the free column to the right of act 2's copy and is never cut (`min(0.8 × fill, column width, free height)`; 0.8 × fill on large screens, smaller on a laptop). It leaves with act 2's copy (progress 0.912 to 0.956), not before. On phones everything is stacked from measured boxes: the hero dial sits under the scroll cue (the end of the hero copy is read from the DOM, so it holds for any phone and any font), and the docked panel peeks up from under act 2's copy (its top edge is 22 px under the copy's last line). The dial also comes back a little later there (progress 0.95 to 1.0), when act 2's copy has gone. |
| `sky.js` | One canvas: gradient, stars, a seeded skyline whose windows light up and go out. |
| `scenes/*.js` | One module per act. Each owns its DOM and exposes `update(p, ctx, isCurrent, fx)`. |
| `camera.js` | Zooms the two diagrams (acts 5 and 6) and follows the action by rewriting the SVG `viewBox`, then pulls back. On phones it is 2× inside the picture's own box. On wide screens (over 760 px wide and at least 600 px tall) the diagram lives in a window to the right of the copy (below the dial, above the city, edges faded) and the camera starts close on the first node and the token, follows the token and ends on the whole picture, so the subject is large at every scroll position instead of a small drawing in an empty sky. Short wide windows keep the plain centred diagram. On phones the window is as tall as the width allows (0.78 of it) unless the copy under the diagram needs the room; on a short phone it gets shorter, down to the picture's own 2:1 shape (`phoneRatio`). |
| `try.js` | "Use the panel": the demo panel full screen, made `inert` behind it and with the keyboard returned to the button on close. While the panel is on screen in the story, the live copy grows out of that very rectangle (the plane the visitor was just looking at comes forward); anywhere else it grows as a circle from the button, the same gesture as the sun. The overlay's own copy of the panel is loaded lazily (when the pointer or the focus reaches a "Use the panel" button, or on the click), so a visitor who never opens it never pays for a second copy. |

`lang.js` reads `?lang=es|en` from the story's own address (English when it is missing or anything else) and appends it to the address of both copies of the panel, so a panel build that reads it switches language. The v1 build in `site/demo/` does not read it (it is Spanish only), so today the parameter is passed and ignored.

The panel is the real product page. Its demo build swaps the server calls for an in-page mock, so what the visitor
sees is the actual interface and not a mock-up of it.

## The acts

| Act | Time | Claim | Backed by |
| --- | --- | --- | --- |
| 1 | 18:00 | The bot works the hours I don't. | The window module: nothing automatic runs during busy hours. |
| 2 | 19:00 | Public boards only. No logins, no keys. | A threshold slider over a labelled sample; the default threshold of 60 is the real one. |
| 3 | 22:30 | Five layers between an offer and a send. | Posting, score (the real six weights), CV, answers, gate. |
| 4 | 02:14 | It leaves blanks. It never invents. | The form fills what it can and flags what it can't. |
| 5 | 04:00 | One Rust program, on my own PC. | The real module chain; lines, tests and dependencies from `receipts.json`. |
| 6 | 07:00 | Silence is not the end. | The tracker's twelve states; "ghosted" can return. |
| 7 | 08:45 | The bot proposes. I approve the first five. | `first_n_reviewed = 5`, `daily_cap = 25`. |
| 8 | 09:00 | Honest. | Five rules, each with the file that enforces it. |

## Decisions worth remembering

- **No libraries, no images, three own fonts.** Everything is hand-written and the page has a strict CSP (`font-src 'self'`).
  The three voices travel with the page as subset woff2 files under `site/assets/fonts/` (Barlow Condensed 700 for the
  condensed headlines, Instrument Serif Italic for the one italic word, Geist Mono 400 for the instruments; all OFL 1.1,
  53 KB together, origin and hashes in `site/assets/fonts/VENDORED.md`). `font-display: block`, with the system faces the
  piece first used (Bahnschrift, Palatino, Cascadia) kept behind them as fallbacks. This buys a page that looks the same on
  every machine, cannot break because a CDN did, and that a reviewer can read end to end.
- **Native scroll, smoothed read position, not scroll hijacking.** The browser still owns scrolling, so keyboard,
  touch, find-in-page and anchors keep working.
- **Overlap instead of padding.** The first version left a quarter of the scroll empty between acts. Overlapping
  sections with an out-then-in crossfade removed the dead frames.
- **The act-1 to act-2 seam stays flush** because the panel plane's keyframes are keyed to it.
- **One clock per frame.** While the panel is on screen its own dial and clock are the only ones; the story's dial
  steps aside and returns when the panel leaves (the sun of act 8 still comes out of it).
- **The hand-over from act 2 to act 3 has no empty side.** The panel used to leave about 25 vh before act 2's copy
  did; now both leave in the same window and the dial comes back into it.
- **Between acts 7 and 8 there is no empty beat.** Act 7 leaves over its last 30 vh (`late`), and the sun starts
  growing with act 8 (`easeInOut` over its first 0.28 of progress, the same curve as before), so it is already
  rising when the last of act 7 is gone. It used to be a 37 vh stretch with nothing but sky and city.
- **Phones are a stack, not a small desk.** Every collision of the phone version came from laying the desktop composition out in 390 px (the dial under the headline, the panel over the counters, the form over the dial). The phone has its own composition: hero copy on top and the dial under it; headline, counters and slider on top and the panel peeking up under them; the form hanging under the docked dial and the headline under the form. Positions come from measured boxes (`rig.js`, `form.js`, the two diagram scenes), and every phone-only timing or size sits behind `vw < 760` / `max-width: 760px`, so the desktop composition is untouched. Checked with a scan that judges the boxes every 40 px of scroll (copy against dial, panel and its counters; copy against copy of the same act) at 390x844, 430x932, 360x740 and 375x667.
- **The panel is loaded twice on purpose.** One iframe that travels from the plane to the overlay was tried and does not work without changing the look. A plain move reloads the panel; `Element.moveBefore()` (Chromium 133 and later only) keeps it running, but the same iframe then has to be laid out twice: the plane lays the panel out at 1920x1080 and scales it, the overlay lays it out at the window's size, so at the hand-over the panel visibly reflows inside the rectangle the gesture starts from, and there is nothing left to cross-fade into when the overlay closes. Two copies, the overlay's loaded lazily, keep the gesture as approved.
- **Phones get a camera, not a different diagram.** Redrawing the architecture vertically would be a second
  artwork to maintain. A zoom that follows the token reuses the one drawing and keeps its labels at about 10 px or more.
- **The live panel is opt-in.** The story never needs a click. A visitor who wants to touch the product can, and
  the first thing they see is a line saying the data is fictional and nothing leaves the browser.

## The panel moves like the story

The panel got the same treatment so that it is pleasant to use, not only to look at, and so that arriving in it from
the story does not feel like arriving in a different app. Same palette, same easing curves, and the same objects:

- Moving between sections is a **trip**, the way the story travels from act to act: the page leans toward where you
  are going (further if you skip two or three stops), a light runs along the platform strip, titles rise into
  place, rows come in one after another, and the funnel draws itself and counts. The counters on the board open the
  list they count as the **sun** (a circle growing from the number you pressed), the same gesture as the end of the
  story. Opening an application and stepping to the next one use the View Transitions API, with a title that
  travels from the row into the drawer. When the API is missing, or the visitor prefers reduced motion, the same
  changes happen instantly.
- The board carries the same 24-hour dial as the story: the robot's window over the top, the owner's busy hours
  hatched below, and a hand that sweeps from 18:00 to the current time on first load.
- Approving a proposal fills a bar, then the card is stamped in green and filed ("Aprobada", "Anotada"), so the
  action reads as a sequence rather than a flicker.
- Two themes from one rule set, following the system until chosen (`T`), and `?theme=dark` in the address wins (the
  story's iframes use it).
- **The story's ideas are views of the panel, not decoration.** Each one answers a question Gonza has while using
  it, on real numbers: the 24-hour night becomes "what jobbot did in the last day" (new postings as bars, every move
  of an application as a dot that opens it, the busy hours hatched); the threshold histogram becomes "your threshold"
  (the scores of the week with a line and a slider that only shows what would happen); the five layers between a
  posting and a send become "from posting to send" (the week's postings through the same river as Procesos) and,
  in the drawer, the path of one application with the buttons where it stopped; "I approve the first five" becomes
  "confidence" (five boxes and the day's cap). The brief that rules all of them (one view, one question; time and
  progress run left to right; whatever you see you can touch; one colour, one meaning; only real numbers; what is
  only a simulation says so) comes from a design spec that is not published.
  Left for later on purpose: the "honest rules" screen, because it needs counters of what the gate refused that
  nothing stores today.
- The address follows the section (`#hoy`, `#procesos`, `#procesos/<job>`), so Back closes the drawer first and
  then leaves the section, and a reload comes back to the same place.
- The counters on the board are buttons: each opens the list it counts, with the filter applied.
- Keyboard: `1`–`4` for sections, `J`/`K` to move a cursor or step through applications, `Enter` to open, `Esc` to
  close, `?` for the list.
- The score is drawn as bars, one per factor, as long as the points it gave. The history of an application is a
  line you walk down, newest first.

## Verification

- In the jobbot repository (counted 2026-10-23), 41 browser tests (`tests/panel_browser.rs`) drive the current
  panel (newer than the v1 build in `site/demo/`) in real Chromium against a real server and real SQLite files in a
  temp folder; they need Chromium, so they run with `cargo test --test panel_browser -- --ignored --test-threads=1`.
  139 Rust tests under `src/panel/` cover its server, its data and the page it ships; one of them reads the panel's
  colour tokens and fails if any text pair falls below its contrast minimum in either theme.
- Scrolling the whole story at 60 fps: frame times stay at the display rate with a 4× CPU slowdown in headless
  Chromium. That is a smoke test, not a device lab.
- Console: no errors across the full scroll, desktop and phone width.
- Keyboard: only the skip link is focusable at the top; "Use the panel" joins from act 2; the closing screen's
  button is unreachable until it has appeared.
- Reduced motion: no smoothing, no looping animation, no letter ritual, the overlay opens instantly.

## Known limits

- The visual level is deliberately *defensible*, not a clone of the best award-site reels: those lean on
  photographic or 3D assets, and this page draws everything in code. Closing that gap needs authored imagery.
- The demo panel is in Spanish (it is the product's language). The page around it is English. `?lang=` is passed to the panel but the v1 build ignores it.
- On phones the two diagrams' labels are readable (10 px or more) while the camera follows the token, and small (about 5 px) in the last moment of each act, when it pulls back to show the whole picture. That is the overview, not the reading.
- The palette is derived from colour theory (OKLCH, WCAG, colour-blind simulation), not matched to the reference
  frames. One pair stays weak by design: green and red are nearly the same under protanopia in the light theme
  (ΔE 3), so no state relies on colour alone (a "!" and "vencida" for late, a "✓" and "Aprobada" for confirmed).
- Tested in Chromium only. Safari and Firefox are untested; View Transitions degrade to instant changes.
- MIT licence, hosted on GitHub Pages. The jobbot source is public at https://github.com/GonzaloRosas/jobbot.
