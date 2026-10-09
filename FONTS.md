# Font licensing

**Read this before publishing anything built with this tool.**

The code here is MIT. The fonts are not. This file exists because the two are easy to conflate, and the conflation has a sharp edge.

## The distinction that matters

**Using a font** — setting type with it, exporting a PDF, presenting a deck — is what a "免费商用 / free for commercial use" grant normally covers.

**Redistributing the font file** — shipping the binary inside an artifact you hand to other people — is a separate right. Most Chinese free-for-commercial-use fonts are silent on it, and silence is not permission.

`--embed-cjk` base64s the font subset into the output HTML. That file now *contains* the font. Keeping it on your own machine or handing it to an audience is ordinary use; committing it to a public repo, or shipping it inside a product, is redistribution.

This repository therefore commits no built decks. `.gitignore` excludes them. Build your own locally.

## The MIT trap

The Chinese faces come from [中文网字计划](https://github.com/KonghaYao/chinese-free-web-font-storage) as `@chinese-fonts/*` on npm. Every one of those packages declares `"license": "MIT"` in `package.json`, and ships an MIT `LICENSE` file.

**That MIT belongs to the packaging project, not to the fonts.** It covers the subsetting tooling and the repository, and it is copyright KonghaYao (江夏尧). The fonts inside carry their own notices, and they do not agree with it:

| Font | `--hand` | Embedded copyright notice | Redistribution |
|---|---|---|---|
| 瑞美加张清平硬笔行书 | `pen` | `Free for commercial used`, 52type.com | Stated permissive, still not explicit about the binary |
| 演示悠然小楷 | fallback | `Copyright © 2020 by keynoteart x mengxiangyuan x QiuyePPT. All rights reserved.` | Not granted in the file |
| 鸿雷行书简体 | `marker` | `Copyright © 2022 by 林鸿雷. All rights reserved.` | Not granted in the file |
| 千图笔锋手写体 | `scrawl` | Shanghai PinTu Network Technology, license points at 58pic.com | Check 58pic's current terms |
| 霞鹜文楷 Screen | `tidy` | SIL Open Font License 1.1 | **Granted** — OFL permits redistribution |

The 林鸿雷 and keynoteart faces are widely published as free for commercial use, but their own metadata says *all rights reserved*, and I could not verify the governing grant from a primary source. Treat the table as a starting point for your own check, not as legal advice — I am not a lawyer and this is not one.

## Japanese and Latin faces

These are the easy ones. Every Japanese face (`Yusei Magic`, `Zen Kurenaido`, `Yuji Boku`, `Yuji Syuku`, `Yuji Mai`, `Yomogi`, `Klee One`) and both Latin faces (`Shantell Sans`, `Kalam`/`Caveat`) come from Google Fonts under the **SIL Open Font License 1.1**, which explicitly permits redistribution, embedding, and bundling, provided the font is not sold on its own and keeps its reserved name.

A deck using only Japanese and Latin text, built with `--embed-cjk`, is safe to publish as a file.

## Practical guidance

| What you're doing | Safe route |
|---|---|
| Presenting a deck yourself | Anything. Use `--embed-cjk`. |
| Emailing a PDF to colleagues | Fine — a PDF subsets glyphs, which most grants treat as use |
| Publishing an HTML deck publicly | Drop `--embed-cjk` (CDN links), or use `tidy` / Japanese-only hands |
| Shipping this inside a product | Verify each face against its source first |
| Committing a built deck to git | Don't — build locally instead |

If you want a deck that is unambiguously redistributable, use `--hand tidy`: 霞鹜文楷 is OFL, as are its Latin and Japanese partners. It is the most typeset-looking hand, which is the trade.

## Fixing the defaults for your own use

`--hand marker` currently defaults to 鸿雷行书简体 — the best-looking option, and the one with the least clear redistribution grant. If your use case is publishing rather than presenting, change the `--zh` slot in `assets/sketch.css` and the `HANDS` entry in `scripts/build.py` to a face you have verified.
