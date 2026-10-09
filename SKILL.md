---
name: handwritten-slides
description: Build presentation decks where the type, boxes, arrows, charts and annotations all look hand-drawn on paper — wobbly ink outlines, marker highlights, sticky notes, sketched bar and line charts. Use this whenever the user asks for slides, a deck, or a presentation in a handwritten, hand-drawn, sketch, doodle, whiteboard, blackboard, notebook or napkin style, and whenever they say 手写风格 / 手绘 / 手书 / 板書 / ホワイトボード風 slides, ppt, 幻灯片, プレゼン, or スライド. Also use it when someone wants a talk or explainer to feel personal and drawn rather than corporate, when they ask to make an existing deck look hand-drawn, or when they want sketch-style diagrams and charts inside a presentation. Output is a single self-contained HTML file that presents in the browser and prints to PDF.
---

# Handwritten Slides

Produce a deck that reads like someone thought it through on paper: ink that wobbles, boxes whose corners overshoot, arrows drawn in one confident stroke, charts filled with hachure strokes instead of flat colour.

The output is **one self-contained HTML file**. Arrow keys to present, `f` for fullscreen, `o` for an overview grid, Cmd/Ctrl-P prints one slide per landscape page for PDF.

## Workflow

1. **Plan the deck in prose first.** One line per slide: the single claim it makes, and the one visual that carries it. Show this list to the user before building anything longer than ~6 slides — restructuring is cheap here and expensive later.
2. **Write `slides.html`** — a bare fragment containing only `<section class="slide">` blocks. No `<html>`, no `<head>`, no styles.
3. **Build:**
   ```bash
   python3 <skill>/scripts/build.py slides.html -o deck.html \
       --title "Deck title" --lang zh --hand marker --embed-cjk --paper grid --rough 2
   ```
   `--hand` picks the handwriting set — `marker` (default), `pen` (most legible, for text-dense decks), `scrawl` (loosest), `tidy` (closest to print). `--lang` (`zh` `ja` `en`) decides which face wins the shared CJK glyphs. `--paper` is `grid` `dot` `plain`, `--theme` is `paper` (default, cool white), `cream` (warm off-white, easiest on the eyes for long decks and the best match for the handwriting faces) or `board` (chalkboard), `--rough` sets global wobble (1 tidy → 3 loose).

   For any deck containing Chinese or Japanese, pass `--embed-cjk`. It subsets the hand's CJK faces to the deck's own characters and inlines them, which removes a CDN dependency that has never been verified and cuts the font payload from megabytes to tens or low hundreds of KB. Only the scripts the deck uses get embedded. It needs `npm` and network at build time; without those, drop the flag and the deck falls back to CDN links.

   `--jitter` (default 1) nudges each CJK character slightly — kana and kanji included — standing in for the glyph alternates CJK fonts don't have. Set `0` to switch it off.

   If the user asks for something "more hand-drawn" or "less hand-drawn", change `--hand` before touching anything else — it moves the look further than `--rough` does. `references/fonts.md` explains what each hand is made of.
4. **Present the file** to the user. Mention that opening it locally gives full font fidelity, and that Cmd-P → Save as PDF exports it.

Keep `slides.html` around and rebuild after edits — never hand-edit the built `deck.html`.

## Slide anatomy

```html
<section class="slide">
  <div class="stage">
    <p class="eyebrow">Section 02</p>
    <h2>为什么手写更容易被记住</h2>
    <p class="lead">因为 <span data-sketch="highlight">不完美</span> 会留下痕迹。</p>
  </div>
</section>
```

Everything lives inside `.stage`. The canvas is 1280×720 and scales to any screen; write layout in px against that.

## Drawing

Add `data-sketch="…"` to any element and a hand-drawn shape gets fitted to it after the fonts land. The wobble is seeded from the element, so it stays put across resize, reveal and print instead of shimmering.

| `data-sketch` | Draws | Typical use |
|---|---|---|
| `box` | wobbly rounded outline behind the element | cards, panels, grouped ideas |
| `circle` | looping over-drawn ellipse | circling one word or number |
| `underline` / `strike` | pen stroke under / through text | emphasis, corrections |
| `highlight` | fat marker swipe behind text | the one phrase per slide that matters |
| `cloud` | lumpy cloud outline | soft or speculative ideas |
| `bracket` | hand-drawn `[` or `]` | grouping a list, adding an aside |
| `check` / `cross` | ✓ or ✗ in two strokes | comparison tables |
| `arrow` | straight or bent arrow between two elements | flow, causality, "leads to" |
| `bars` | sketched bar chart with hachure fill | 2–6 quantities |
| `plot` | sketched line chart, multi-series | trend over time |

Shared modifiers: `data-sketch-color="ink\|red\|blue\|green\|pencil"`, `data-sketch-fill="yellow\|mint\|blue\|pink"`, `data-sketch-pad="12"`, `data-rough="3"`.

```html
<!-- a card, hachure-filled -->
<div class="card" data-sketch="box" data-sketch-fill="mint">…</div>

<!-- an arrow between two elements on the same slide -->
<div id="a" class="card" data-sketch="box">数据</div>
<div id="b" class="card" data-sketch="box">结论</div>
<div data-sketch="arrow" data-from="#a" data-to="#b" data-bend="0.18"></div>

<!-- charts: the element supplies the box, the data lives in attributes -->
<div style="height:300px" data-sketch="bars"
     data-values="42,68,55" data-labels="Q1,Q2,Q3" data-sketch-fill="yellow"></div>
<div style="height:300px" data-sketch="plot"
     data-values="3,5,4,9,12;2,3,3,4,5" data-labels="Jan,Feb,Mar,Apr,May"
     data-colors="red,pencil"></div>
```

Arrow elements are invisible markers — give them no content, and place them anywhere inside `.stage`.

Layout and paper classes (`.cols-2`, `.sticky`, `.tape`, `.note`, `ul.bullets`, `ol.steps`, `blockquote.q`, `.big`) are catalogued with copy-paste markup in `references/components.md`. Read that file when composing slides.

## Progressive reveal

Mark elements `data-step` and they appear one keypress at a time, in document order. Reach for it when the slide argues in stages; skip it when the slide is a single picture.

```html
<li data-step>先有假设</li>
<li data-step>再有实验</li>
```

## Content discipline

Hand-drawn style collapses under density — a wall of text in a handwriting face is harder to read than the same wall in Helvetica, not easier. So the constraint is the point:

- **One claim per slide.** If a slide needs "and", it is two slides.
- **Aim for under ~30 words** of body text. Titles carry meaning; the body carries evidence.
- **Draw the relationship, not the decoration.** An arrow should mean *causes*, *becomes*, *feeds*. Boxes should mean *these belong together*. Sketch marks that mean nothing read as clip art.
- **Spend the highlight once per slide.** Marker on every other phrase is marker on nothing.
- **Let numbers be big.** `.big` at 108px with a small hand-written label beats a sentence containing the same figure.
- **Vary the shape of consecutive slides.** Title → three sticky notes → one diagram → one big number → two-column comparison. Six bullet slides in a row look drawn by a tired person.
- Use pen colour semantically: red for the problem or the delta, blue for the alternative, pencil for asides.

## Verify before delivering

- Build succeeds and reports the expected slide count.
- No slide overflows 720px — long lists are the usual culprit; split them.
- Every `data-from` / `data-to` selector resolves to an element **on the same slide**.
- Chart `data-values` has the same count as `data-labels`.
- CJK deck built with `--embed-cjk`? The build prints how many characters were embedded and names any the font lacks. Without the flag, check the CDN URL resolves — `references/fonts.md` has the one-line curl.
- Japanese deck? `--lang ja` is what puts the Japanese face ahead of the Chinese one; without it the kanji take Simplified shapes.
- The deck still parses as one idea when read at overview scale.

## Reference files

- `references/components.md` — full markup catalogue: layouts, sticky notes, comparison grids, flow diagrams, quote and number slides. Read before composing.
- `references/fonts.md` — which handwriting faces load, per-language behaviour, offline fallbacks, and how to swap them.
- `demo/slides.html` — a finished 12-slide fragment exercising every component. The fastest way to see idiomatic markup is to read it.
- `demo/specimen.html` — the four hands side by side. Build with `--all-fonts` and show it when the user is undecided about the look.
- `assets/sketch.js`, `assets/sketch.css` — the engine. Edit these to add a new `data-sketch` shape; each decorator is a small function on the `draw` object.
