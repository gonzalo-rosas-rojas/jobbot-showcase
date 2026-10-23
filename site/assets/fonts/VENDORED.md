# Vendored fonts

Three faces, all SIL Open Font License 1.1, served from this folder (`font-src 'self'`, nothing is requested from another host).
They are the subset woff2 files produced and verified for the sibling project; this repo only **copies** them (no download happened here).
Origin record, with the pinned commits, the download hashes of the original TTFs, the OTS check and the exact `pyftsubset` commands:
the `VENDORED.md` kept with the panel's front-end sources, which are not published (generated 2026-10-08 with fonttools 4.66.1, brotli 1.2.0, opentype-sanitizer 9.2.0). Its public part (the pinned commits, the git blobs of the original TTFs, the Unicode ranges, the fonttools and ots versions and these same three subset sha256) is in jobbot's [`THIRD_PARTY_NOTICES.md`](https://github.com/GonzaloRosas/jobbot/blob/main/THIRD_PARTY_NOTICES.md).

Copied on 2026-10-09. The sha256 below are recalculated here from the files in this folder; they match the "subset" hashes of the origin record.

| file | family, weight, style | used for | origin | bytes | sha256 |
|---|---|---|---|---|---|
| `barlow-condensed-700.woff2` | Barlow Condensed, 700, normal | the condensed headlines and the dial time (`--display`) | google/fonts @ 2eb0b48d, `ofl/barlowcondensed/BarlowCondensed-Bold.ttf` | 18516 | `fdd760515b0e74f20baad8d00d6317b51c83f54f26755232ddbc59bcabf0f060` |
| `instrument-serif-400italic.woff2` | Instrument Serif, 400, italic | the italic voice (`--serif`) | google/fonts @ 2eb0b48d, `ofl/instrumentserif/InstrumentSerif-Italic.ttf` | 17552 | `bde7dc8f24f537bca4535f1007f2f8f7ba6059b6584e961c869581a476e28d81` |
| `geist-mono-400.woff2` | Geist Mono, 400, normal | the mono voice (`--mono`) | vercel/geist-font tag v1.7.2 (a73329da), `fonts/GeistMono/ttf/GeistMono-Regular.ttf` | 18060 | `2702e93f28bcb81633d91a18fc5ce31f6cc61bd0f386347a645eb478b7f655e9` |

Total: 54128 bytes (52.9 KB) for the three faces.

Unicode ranges kept in every face: `U+0020-007E, U+00A0-00FF, U+0100-017F, U+2000-206F, U+20A0-20CF, U+2190-21FF` (Latin, Latin-1, Latin Extended-A,
general punctuation, currency symbols, basic arrows); layout features kept: all (`--layout-features=*`); hinting dropped.

## Licences

The OFL text of each family is next to the fonts, in `licenses/`. They are the upstream files with line endings normalised to LF
(the sibling repository's checkout had CRLF; with LF the sha256 equals the one of the upstream file, which is what the origin record pins).

| file | upstream file | sha256 |
|---|---|---|
| `licenses/OFL-barlow-condensed.txt` | google/fonts @ 2eb0b48d, `ofl/barlowcondensed/OFL.txt` | `186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f` |
| `licenses/OFL-instrument-serif.txt` | google/fonts @ 2eb0b48d, `ofl/instrumentserif/OFL.txt` | `129ed7618959716959f2941fdd5b49e0ad6e6c1d78726761786a00253d865521` |
| `licenses/OFL-geist-mono.txt` | vercel/geist-font @ v1.7.2 (a73329da), `LICENSE.txt` | `930853ee1daa68554d9e35c8a9175affb74f699fad9a5da6ee5ebe76379d9137` |

The Inter faces that the sibling repository also holds are **not** used here and were not copied.

## How they are used

`@font-face` blocks in `site/assets/css/main.css`, `font-display: block` (this is a cinematic piece, the three files weigh 53 KB and come from the
same host, so a short invisible period is better than a visible swap of metrics). The system fonts the piece used before stay behind them in the
`--display`, `--serif` and `--mono` stacks, so a failed load still reads.
