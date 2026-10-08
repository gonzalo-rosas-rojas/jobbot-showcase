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
  screen), so going from the story into the live panel does not change palette. The reasoning and the contrast
  and colour-blindness checks are in the panel repository's `docs/COLOR.md`.
- **Motion is tied to scroll or to a data change, never to a timer.** Only `transform`, `opacity` and `clip-path`
  animate. The only loops are the cue under the hero and the cursor blink in the form, and reduced motion stops both.
- **The big gesture happens once.** Everything before the last act is quiet on purpose so that "HONEST." lands.
- **Fictional on purpose.** Companies, people and offers are invented. Counts about the code are measured.

## How it is built

| Layer | What it is |
| --- | --- |
| `engine.js` | Reads native scroll, smooths the read position (instant under reduced motion), turns it into a global night position `u` and a local progress `p` per act, and hands each scene `fx` = `{inn, out}` for the crossfades. |
| Acts | Tall `<section>`s with a `position: sticky` stage. Acts 3 to 8 overlap the previous one by 130vh, so there is never an empty screen between two ideas. |
| `rig.js` | The fixed layers that travel across acts: the real panel on a 3D plane (an iframe of the demo build) and the dial. Keyframes live in one place. |
| `sky.js` | One canvas: gradient, stars, a seeded skyline whose windows light up and go out. |
| `scenes/*.js` | One module per act. Each owns its DOM and exposes `update(p, ctx, isCurrent, fx)`. |
| `camera.js` | On phones, zooms the two diagrams (acts 5 and 6) to 2× and follows the action by rewriting the SVG `viewBox`, then pulls back. |
| `try.js` | "Use the panel": the demo panel full screen, made `inert` behind it and with the keyboard returned to the button on close. While the panel is on screen in the story, the live copy grows out of that very rectangle (the plane the visitor was just looking at comes forward); anywhere else it grows as a circle from the button, the same gesture as the sun. |

The panel is the real product page. Its demo build swaps the server calls for an in-page mock, so what the visitor
sees is the actual interface and not a mock-up of it.

## The acts

| Act | Time | Claim | Backed by |
| --- | --- | --- | --- |
| 1 | 18:00 | The bot works the hours I don't. | The window module: nothing automatic runs during busy hours. |
| 2 | 19:00 | Public boards only. No logins, no keys. | A threshold slider over a labelled sample; the default threshold of 60 is the real one. |
| 3 | 22:00 | Five layers between an offer and a send. | Posting, score (the real six weights), CV, answers, gate. |
| 4 | 02:00 | It leaves blanks. It never invents. | The form fills what it can and flags what it can't. |
| 5 | 04:00 | One Rust program, on my own PC. | The real module chain; lines, tests and dependencies from `receipts.json`. |
| 6 | 07:00 | Silence is not the end. | The tracker's twelve states; "ghosted" can return. |
| 7 | 08:45 | The bot proposes. I approve the first five. | `first_n_reviewed = 5`, `daily_cap = 25`. |
| 8 | 09:00 | Honest. | Five rules, each with the file that enforces it. |

## Decisions worth remembering

- **No libraries, no fonts, no images.** Everything is hand-written and the page has a strict CSP. This costs some
  polish (system font stacks mean the condensed display face is Bahnschrift on Windows and a fallback elsewhere)
  and buys a page that cannot break because a CDN did, and that a reviewer can read end to end.
- **Native scroll, smoothed read position, not scroll hijacking.** The browser still owns scrolling, so keyboard,
  touch, find-in-page and anchors keep working.
- **Overlap instead of padding.** The first version left a quarter of the scroll empty between acts. Overlapping
  sections with an out-then-in crossfade removed the dead frames.
- **The act-1 to act-2 seam stays flush** because the panel plane's keyframes are keyed to it.
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
  only a simulation says so) is in the panel repository, `docs/superpowers/specs/2026-10-07-del-relato-al-panel-design.md`.
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

- 35 browser tests drive the panel in real Chromium against a real server and real SQLite files (23 existing, 12
  new: the fluid layer, the themes, the trip/sun/dial, the approval sequence, and the last day, the path to a send,
  the threshold, trust and the path of one application). 62 more test the panel's data in Rust. A further Rust test reads the
  panel's colour tokens and fails if any text pair falls below its contrast minimum in either theme.
- Scrolling the whole story at 60 fps: frame times stay at the display rate with a 4× CPU slowdown in headless
  Chromium. That is a smoke test, not a device lab.
- Console: no errors across the full scroll, desktop and phone width.
- Keyboard: only the skip link is focusable at the top; "Use the panel" joins from act 2; the closing screen's
  button is unreachable until it has appeared.
- Reduced motion: no smoothing, no looping animation, no letter ritual, the overlay opens instantly.

## Known limits

- The visual level is deliberately *defensible*, not a clone of the best award-site reels: those lean on
  photographic or 3D assets, and this page draws everything in code. Closing that gap needs authored imagery.
- The demo panel is in Spanish (it is the product's language). The page around it is English.
- The palette is derived from colour theory (OKLCH, WCAG, colour-blind simulation), not matched to the reference
  frames. One pair stays weak by design: green and red are nearly the same under protanopia in the light theme
  (ΔE 3), so no state relies on colour alone (a "!" and "vencida" for late, a "✓" and "Aprobada" for confirmed).
- Tested in Chromium only. Safari and Firefox are untested; View Transitions degrade to instant changes.
- No licence or hosting chosen. The jobbot source is private.
