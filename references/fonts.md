# Fonts

Two things make a deck look drawn rather than typeset, and only one of them is "pick a handwriting font":

1. **Glyph repetition.** Most handwriting fonts store one shape per character, so every `a` on the slide is pixel-identical. Real handwriting never repeats. This is the biggest tell.
2. **CJK falling out of voice.** The Latin renders as handwriting and the Chinese or Japanese drops to a system sans, so one slide carries two hands.

The `--hand` presets address both.

## The hands

| `--hand` | Latin | Chinese | Japanese | Weights | Reach for it when |
|---|---|---|---|---|---|
| `marker` *(default)* | Shantell Sans, INFM 100 / BNCE 12 | 鸿雷行书简体 | Yusei Magic | 400 / 700 | Presenting live, slides are sparse |
| `pen` | Shantell Sans, INFM 45 / BNCE 0 | 瑞美加张清平硬笔行书 | Zen Kurenaido | 300 / 500 | Text-dense decks, or one people read alone |
| `scrawl` | Shantell Sans, INFM 100 / BNCE 45 / SPAC 5 | 千图笔锋手写体 | Yuji Boku, Yuji Mai for display | 500 / 800 | Covers, section breaks, decks under ten slides |
| `tidy` | Caveat + Kalam | 霞鹜文楷 Screen | Klee One | 400 / 700 | Weak projector, or the audience sits far back |

A hand is four slots — Latin, Chinese, Japanese, and the Shantell axis settings — composed into a font stack further down the stylesheet. Change a slot, not a stack.

### Weight is half the job

The commonest failure is not "the Chinese font isn't handwritten enough" — it is a **stroke-weight mismatch**. 演示悠然小楷 and 瑞美加张清平硬笔行书 are fine hands, but they are light. Set beside Shantell Sans at marker weight, the Chinese reads faint and the English reads bold, and the eye reports that as *the English is drawn, the Chinese is typeset* even though both are handwriting.

So each hand sets `--hand-body-weight` and `--hand-display-weight` to match its CJK faces: `pen` pulls the Latin down to 300, `scrawl` pushes it to 500. If you swap in a different CJK face, re-balance these before judging the result.

The same trap exists in Japanese, and it is easy to walk into because the obvious picks are both light. Yomogi and Klee One are the two Japanese faces everyone reaches for, and neither can stand next to marker-weight Latin. Of the free Japanese handwriting faces, **Yusei Magic is the only one at genuine marker weight**, which is why `marker` uses it.

### Per-character jitter

Shantell Sans varies Latin through `rlig` alternates. **No Chinese font offers this** and none is likely to: three variants of 6,763 glyphs is twenty thousand drawings. So every 的 on a slide is otherwise pixel-identical, which is the loudest remaining tell.

The deck adds the variation at render time instead — each CJK character is wrapped in an inline-block and given a seeded rotation, vertical offset, and scale, keyed on the character *and* its position so repeats genuinely differ. `--jitter` controls it: `0` off, `1` default, `2` loose. Code and `.mono` spans are skipped, transforms don't move the layout box (so the sketch measurements stay right), and the text stays exactly copyable.

`demo/specimen.html` shows all four side by side. Build it with `--all-fonts` and flip through before committing.

## Why Shantell Sans

It ships an `rlig` feature, on by default, that **cycles through several alternates of each glyph** — so repeated letters differ down the line. That fixes tell #1, and no static handwriting face can.

It also exposes variable axes the presets drive directly:

| Axis | Tag | Range | Does |
|---|---|---|---|
| Weight | `wght` | 300–800 | normal weight |
| Bounce | `BNCE` | −100–100 | lifts glyphs off the baseline |
| Informality | `INFM` | 0–100 | irregular shaping and proportion |
| Spacing | `SPAC` | 0–100 | extra side bearings |

`BNCE` and `INFM` are what "more hand-drawn" means as a dial. Push `INFM` first; `BNCE` past about 50 costs readability faster than it buys character.

Any element carrying `data-hand` re-resolves these, which is how one deck shows several hands.

## The Google Fonts request

Axes must be listed **lowercase registered first, then uppercase custom, each group alphabetical**:

```
family=Shantell+Sans:wght,BNCE,INFM,SPAC@300..800,-100..100,0..100,0..100
```

Get the order wrong and the API returns 400 for the *entire* request — every family in that URL fails, not just the malformed one. That is why `build.py` gives Shantell Sans its own `<link>` and never bundles it with the plain families.

## Chinese faces and the CDN caveat

The Chinese handwriting faces come from 中文网字计划 (`@chinese-fonts/*` on npm) via jsDelivr. Each is split into 130–142 `unicode-range` subsets of roughly 48KB with `font-display: swap`, so a deck downloads only the characters it shows — typically 0.7–1.5MB rather than the 6–8MB full face.

| Font | Package | Character | Weight |
|---|---|---|---|
| 鸿雷行书简体 | `hlxsjt` | running-hand pen, connected strokes | medium |
| 瑞美加张清平硬笔行书 | `rmjzqpybxs` | hard-pen running script, written by hand character by character | light |
| 千图笔锋手写体 | `qtbfsxt` | brush-tip, visible entry and exit strokes | heavy |
| 白路棒棒手写体 | `blbbsxt` | thick marker, signature-like | very heavy |
| 演示悠然小楷 | `ysyrxk` | small regular script | light |
| 江西拙楷 | `jxzk` | reads as heavy printed kai, not handwriting — avoid | heavy |

The catalogue holds around 80 faces; `scripts/embed_font.py` lists the ones worth using. Judge a candidate by rendering it rather than by its name: several fonts sold as 手写体 render as ordinary printed kai, 江西拙楷 among them.

## Japanese faces

These come from Google Fonts, mirrored on npm as `@fontsource/*` — ASCII paths, no percent-encoding, so the CDN route is safe here in a way it is not for Chinese.

| Font | Package | Character | Weight |
|---|---|---|---|
| Yusei Magic | `yusei-magic` | thick even marker, the only marker-weight option | heavy |
| Zen Kurenaido | `zen-kurenaido` | casual pen, slightly irregular | light |
| Yuji Boku | `yuji-boku` | brush, rough and blunt | medium |
| Yuji Syuku | `yuji-syuku` | brush, the most legible of the Yuji three | medium |
| Yuji Mai | `yuji-mai` | brush, flowing and cursive | light |
| Yomogi | `yomogi` | thin casual hand | light |
| Klee One | `klee-one` | pen-written kai — a typeface, not handwriting | light |

Checked against a working slide vocabulary, all of these cover the kanji a deck needs. Darumadrop One does not — it dropped 11 of 40 test characters and renders tofu — so it is not offered.

## --embed-cjk

```bash
python3 scripts/build.py slides.html -o deck.html --hand marker --embed-cjk
```

This pulls the hand's CJK faces from the npm registry, subsets them to the characters the deck actually contains, and inlines them as base64. No network at display time, and no dependency on a URL nobody has tested.

It embeds only the scripts present in the deck, and a Japanese deck skips the Chinese face entirely — the Japanese face supplies the kanji, so the Chinese one would only be weight nobody sees. Typical output:

```
中文 12 slides   embedded hongleixingshu: 254/256 chars, 197 KB
日本語 3 slides   embedded Yusei Magic: 79/79 chars, 14 KB
```

Compare with 3–17MB of CDN subsets for the same faces. Anything the font lacks is reported, e.g. `not in this font: 「」` — swap those characters or accept the fallback. A Japanese face asked for Simplified Chinese will report a long list, which is expected rather than an error.

**Most of these have Chinese characters in the path**, so `build.py` emits them percent-encoded. That encoding was derived from the published package contents but has never been exercised against the live CDN — which is the reason `--embed-zh` exists and is the recommended path. If you do want the CDN, confirm it first:

```bash
curl -sI -o /dev/null -w '%{http_code}\n' \
  "https://cdn.jsdelivr.net/npm/@chinese-fonts/rmjzqpybxs@3.0.0/dist/%E7%91%9E%E7%BE%8E%E5%8A%A0%E5%BC%A0%E6%B8%85%E5%B9%B3%E7%A1%AC%E7%AC%94%E8%A1%8C%E4%B9%A6/result.css"
```

`200` means it works. Anything else — self-host the woff2 files, or stay on `marker`, whose path is plain ASCII. Both `pen` and `scrawl` list 演示悠然小楷 next in the stack, so a failure degrades to a handwriting face rather than to a system sans.

## Checking what actually loaded

A subsetted CJK face that fails to load looks like "slightly wrong font", not like an error, so the deck probes for it. Open with `#fontcheck` in the URL for a panel listing every declared family and whether it resolved. `window.__fontReport` holds the same data, and a missing lead family logs a console warning on its own.

Probing needs CJK sample text: `document.fonts.check()` with the default Latin test string reports `false` for a correctly-loaded Chinese face, because the Latin subset was never requested.

## Language order

Klee One and the Chinese faces disagree on shared codepoints — 直, 骨, 每 and friends follow Japanese or Chinese drawing conventions. Whichever face sits first takes every character both cover, so `--lang ja` reorders the CJK part of each hand. Set it from the deck's language, not the interface language; a native reader notices and usually cannot name why.

Mixed decks: set `--lang` to the dominant script, override the exception inline with `style="font-family:'Yusei Magic',cursive"`.

Per-character jitter treats kana and kanji alike, so Japanese gets the same variation Chinese does.

## Offline

The stacks fall through to installed faces rather than to sans-serif: Kaiti SC / KaiTi / STKaiti for Chinese, Chalkboard SE / Bradley Hand and generic `cursive` for Latin.

For a fully offline deck, subset first — a full CJK face is 6–10MB:

```bash
pyftsubset font.ttf --text-file=deck-chars.txt --flavor=woff2 --output-file=sub.woff2
```

Then base64 it into an `@font-face` rule and drop the `<link>` tags from `assets/shell.html`.

## Adding a hand

Add a block in `assets/sketch.css` beside the others, then register its font URLs in the `HANDS` dict in `scripts/build.py`:

```css
[data-hand="chalk"] {
  --font-display: "Gloria Hallelujah", "slideyouran", cursive;
  --font-hand:    "Gloria Hallelujah", "slideyouran", cursive;
  --hand-vary: normal;
  --hand-display-weight: 400;
}
```

Other Latin faces worth trying: Playpen Sans (informal, built for annotations and student notes), Patrick Hand (tighter), Architects Daughter, Gloria Hallelujah (looser). For Chinese display at large sizes, Ma Shan Zheng and 钟齐志莽行书 are on Google Fonts as brush and running-script faces — good at 76px, unreadable at 26px, so pair them with a body face instead of using them throughout.

Type sizes assume an x-height near Shantell Sans's. A face with a much smaller x-height needs the base `p, li` size raised from 26px.
