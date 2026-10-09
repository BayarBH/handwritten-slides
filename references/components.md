# Component catalogue

Copy-paste markup for slide bodies. Every block goes inside `<section class="slide"><div class="stage">…</div></section>`.

- [Slide archetypes](#slide-archetypes)
- [Text](#text)
- [Lists](#lists)
- [Paper objects](#paper-objects)
- [Diagrams](#diagrams)
- [Charts](#charts)
- [Layout helpers](#layout-helpers)

---

## Slide archetypes

### Title

```html
<section class="slide">
  <div class="stage center-all">
    <div>
      <p class="eyebrow">2026 / 内部分享</p>
      <h1>把想法<span data-sketch="highlight">画</span>出来</h1>
      <p class="lead pencil">手写风格 slide 的做法与理由</p>
    </div>
  </div>
</section>
```

### Section divider

```html
<div class="stage center-all">
  <div>
    <p class="big" data-sketch="circle" data-sketch-color="red">02</p>
    <h2 style="margin-top:20px">工具与用法</h2>
  </div>
</div>
```

### One big number

```html
<div class="stage center-all">
  <div>
    <p class="big" data-sketch="underline" data-sketch-color="red">3.4×</p>
    <p class="lead" style="margin-top:18px">手绘图示下的回忆准确率提升</p>
    <p class="small pencil">n=180，两周后复测</p>
  </div>
</div>
```

### Quote

```html
<div class="stage center-all">
  <blockquote class="q" style="max-width:900px;text-align:left">
    <p class="lead">一张图的价值，在于它逼你先想清楚。</p>
    <p class="small pencil" style="margin-top:16px">— 某个凌晨三点的自己</p>
  </blockquote>
</div>
```

### Two-column comparison

```html
<div class="stage">
  <h2>两种做法</h2>
  <div class="cols-2" style="margin-top:36px">
    <div class="card" data-sketch="box" data-sketch-color="pencil">
      <h3>模板化</h3>
      <ul class="bullets">
        <li>三十秒做完</li>
        <li>看过就忘</li>
      </ul>
    </div>
    <div class="card" data-sketch="box" data-sketch-color="red" data-sketch-fill="yellow">
      <h3>手绘</h3>
      <ul class="bullets">
        <li>先想清楚再落笔</li>
        <li>记得住</li>
      </ul>
    </div>
  </div>
</div>
```

---

## Text

| Class | Size | Use |
|---|---|---|
| `h1` | 76px | title slide only |
| `h2` | 50px | slide headline |
| `h3` | 32px | card headline |
| `.big` | 108px | a single number or word |
| `.lead` | 31px | the one sentence that matters |
| `p`, `li` | 26px | body |
| `.small` | 21px | captions, sources |
| `.eyebrow` | 22px | uppercase pencil label above a headline |
| `.note` | 20px | margin scribble, tilted, max 260px wide |
| `code`, `.mono` | typewriter face | code, identifiers, file names |

Colour spans: `.red` `.blue` `.green` `.pencil`.

```html
<h2>结论 <span class="red">先</span> 说</h2>
<p>剩下的都是 <span data-sketch="underline" data-sketch-color="blue">证据</span>。</p>
<p class="note">这一页讲不完，<br>放到 Q&amp;A。</p>
```

---

## Lists

```html
<!-- hand-drawn squarish bullets -->
<ul class="bullets">
  <li>一次只讲一件事</li>
  <li>把关系画出来</li>
</ul>

<!-- arrow bullets, for consequences -->
<ul class="bullets arrow">
  <li>先量，再改</li>
</ul>

<!-- numbered circles, for real sequences only -->
<ol class="steps">
  <li>写 slides.html</li>
  <li>跑 build.py</li>
  <li>浏览器打开</li>
</ol>
```

Four items is comfortable, six is the ceiling. Beyond that, split the slide or turn the list into a diagram.

---

## Paper objects

### Sticky notes

Tilt alternates automatically by position, so three in a row look pinned by hand.

```html
<div class="cols-3">
  <div class="sticky"><h3>快</h3><p>一个文件，直接开。</p></div>
  <div class="sticky mint"><h3>准</h3><p>抖动有种子，不闪。</p></div>
  <div class="sticky pink"><h3>省</h3><p>零依赖。</p></div>
</div>
```

```html
<!-- ivory: reads as plain paper laid on paper -->
<div class="sticky cream"><h3>乳白</h3><p>不抢文字。</p></div>
```

Colours: default yellow, `.cream` (ivory), `.mint`, `.blue`, `.pink`.

`.cream` is the quiet one — on the default paper it sits at 1.02 contrast from the ground, so no colour separation is possible and the note is read entirely through its shadow, the way a white memo sheet on white paper is. It carries a two-layer shadow (tight contact plus soft ambient) and a hairline inset edge to do that. Reach for it when the note should read as paper rather than as a coloured marker: quotes, definitions, anything where the text matters more than the flag. Mixing three ivory notes in a row looks like a stack of cards; mixing ivory with one yellow makes the yellow the point.

### Washi tape

Needs a positioned parent.

```html
<div class="sticky" style="position:relative">
  <span class="tape"></span>
  <p>贴上去的。</p>
</div>
```

### Card with hachure fill

```html
<div class="card" data-sketch="box" data-sketch-fill="mint" data-sketch-gap="11" data-sketch-angle="-38">
  <h3>填充是笔触，不是色块</h3>
  <p>斜线间距用 <code>data-sketch-gap</code> 调。</p>
</div>
```

`data-sketch-sharp` gives square corners instead of rounded; `data-sketch-pad` changes the gap between the outline and the content.

---

## Diagrams

Build flow diagrams from positioned boxes plus arrow markers. Give every node an `id`; arrows find the edge automatically and leave a gap.

```html
<div class="stage">
  <h2>生成管线</h2>
  <div class="row center" style="margin-top:80px">
    <div id="n1" class="card" data-sketch="box">原始题目</div>
    <div style="width:70px"></div>
    <div id="n2" class="card" data-sketch="box" data-sketch-fill="yellow">结构化解析</div>
    <div style="width:70px"></div>
    <div id="n3" class="card" data-sketch="box">题库</div>
  </div>

  <div data-sketch="arrow" data-from="#n1" data-to="#n2"></div>
  <div data-sketch="arrow" data-from="#n2" data-to="#n3"></div>

  <div id="n4" class="card" style="width:260px;margin:90px auto 0" data-sketch="box" data-sketch-color="red">人工抽检</div>
  <div data-sketch="arrow" data-from="#n4" data-to="#n2" data-bend="0.22" data-sketch-color="red"></div>
</div>
```

Arrow options: `data-bend="0.2"` curves it (negative bends the other way), `data-head="none"` for a plain connector, `data-gap="18"` widens the standoff, `data-sketch-color` sets the pen. Without `data-from`/`data-to`, use raw stage coordinates: `data-points="180,300 620,300"`.

### Cloud and bracket

```html
<span data-sketch="cloud" data-sketch-color="blue">还没验证的部分</span>

<div style="display:inline-block" data-sketch="bracket" data-sketch-side="left">
  <p>这三条是同一件事</p>
</div>
```

### Check / cross in a comparison

Size them with an empty box.

```html
<span style="display:inline-block;width:30px;height:30px" data-sketch="check" data-sketch-color="green"></span>
<span style="display:inline-block;width:30px;height:30px" data-sketch="cross" data-sketch-color="red"></span>
```

---

## Charts

The element defines the plot box — always give it an explicit height.

```html
<!-- bars -->
<div style="height:320px;margin-top:30px" data-sketch="bars"
     data-values="18,44,62,71"
     data-labels="2023,2024,2025,2026"
     data-fills="pencil,pencil,yellow,mint"
     data-suffix="%"></div>
```

`data-values` comma-separated · `data-labels` axis labels · `data-fills` per-bar wash, or `data-sketch-fill` for all · `data-max` forces the scale · `data-suffix` appends to the printed number.

```html
<!-- line chart, two series -->
<div style="height:320px" data-sketch="plot"
     data-values="3,5,4,9,12,15;2,3,3,4,5,5"
     data-labels="Jan,Feb,Mar,Apr,May,Jun"
     data-colors="red,pencil"
     data-dots="none"></div>
```

Series are separated by `;`, colours map to series in order. Charts are deliberately approximate — for exact readings put the number on the slide as text.

---

## Layout helpers

| Class | Effect |
|---|---|
| `.cols-2` / `.cols-3` | equal-width grid, 40px / 28px gutter |
| `.row` | horizontal flex, 32px gap; add `.center` to centre vertically |
| `.fill` | flex child that takes the remaining width |
| `.center-all` | centres a single block in the whole slide, text centred |
| `.spread` | space-between on one baseline |
| `.bottom` | pins a strip to the bottom margin of the slide |

The stage padding is 56px vertical / 72px horizontal. Bleeding to the paper edge means positioning absolutely inside `.stage` with negative offsets.

---

## Themes

`--theme` swaps the whole palette, not just the background — the pens, grid, and washes are re-mixed for the ground they sit on.

| Theme | Ground | Notes |
|---|---|---|
| `paper` *(default)* | `#FAFAF4` cool off-white | Neutral; safest for screenshots and mixed content |
| `cream` | `#F7F0DE` warm off-white | Warmest match for the handwriting faces; easiest on the eyes over a long deck |
| `board` | `#23332C` dark green | Chalkboard; pens invert to chalk tints |

Cream pairs best with `--paper dot` or `--paper plain`; the grid is deliberately faint (1.24 contrast, same subtlety as the default theme) so it reads as ruling rather than as a table.

Every foreground in each theme clears WCAG against the surface it actually sits on, including ink over a highlighter swipe. If you retint a theme, re-check rather than trusting the eye — a warm ground swallows cool inks, and the obvious lighter pencil grey lands at 4.07, under the 4.5 floor.
