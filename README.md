# The Night Shift

A scroll-driven walkthrough of **jobbot**, a Rust program that runs a job search between 18:00 and 09:00: it reads
public job boards, scores what it finds, tailors a CV, fills the forms, and stops at every point where a person
should decide. The page is the clock: scrolling moves the night from 18:00 to 09:00.

Everything on the page is fictional data. The few numbers about the code (lines, tests, dependencies) are counted
from the real repository by `scripts/receipts.py`, and the rules on the last screen each point at the file that
enforces them. The jobbot source is private for now.

At the end of the story, **Use the panel** opens the real panel (the page a Rust server renders) as a live demo on
fictional data, growing out of the panel the story was showing. It moves the way the story does (a trip between
sections, a sun from the board's counters) and it has a keyboard layer: `1`–`4` switch section, `J`/`K` move through applications, `Enter` opens
one, `Esc` closes, `?` lists the keys.

## Run it

No build step and no dependencies: static files.

```
python scripts/serve.py          # http://127.0.0.1:8790, binds to localhost only, no caching
```

Open `http://127.0.0.1:8790/`. The demo panel alone is at `/demo/index.html?scenario=urgent`
(`calm`, `urgent`, `stop`, `empty` and `window` change the mood of the board). It has two themes that share this
page's palette: add `&theme=dark` or `&theme=light`, or press `T` inside it (the story asks for the dark one).

## Refresh the inputs

```
python scripts/receipts.py <path to the jobbot repo>      # rewrites site/data/receipts.json
python scripts/build-demo.py <path to panel docs/demo/index.html>   # copies the demo build as it is
```

The demo build comes from the panel's own repository (`node scripts/build-demo.mjs`), which swaps the panel's
`fetch` calls for an in-page mock with fictional data.

## What is in here

```
site/index.html          the eight acts, as plain semantic sections
site/assets/css/main.css one stylesheet: tokens, type voices, every act, the narrow-screen block
site/assets/js/          engine (scroll), rig (3D panel plane + dial), sky (canvas), try (live demo overlay),
                         camera (zoom for the diagrams on phones), scenes/ (one module per act)
site/demo/               the panel, built with fictional data
site/data/receipts.json  the counted numbers
docs/DESIGN.md           why it looks and moves the way it does
```

No framework, no CDN, no web fonts, no images: the page ships its own strict Content-Security-Policy
(`default-src 'none'; script-src 'self'; style-src 'self'; frame-src 'self'`), so it also runs from any static host.

## Status

Not published. License and hosting are undecided.
