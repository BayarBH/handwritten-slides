#!/usr/bin/env python3
"""Assemble a slides fragment into one self-contained HTML deck.

    python3 scripts/build.py slides.html -o deck.html --title "..." --lang zh

The fragment holds only <section class="slide">...</section> blocks. Everything
else — fonts, CSS, the sketch engine — gets inlined here, so the output is a
single file you can mail, open offline, or print to PDF.
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")



# --- font registry -----------------------------------------------------------
# Each Google entry is its own <link>. Shantell Sans is isolated on purpose: it
# is the only request using custom variable axes, and a malformed axis list
# makes the API return 400 for the WHOLE request — isolating it means a failure
# there can't take the other faces down with it.
G = "https://fonts.googleapis.com/css2?%s&display=swap"
GOOGLE = {
    # wght,BNCE,INFM,SPAC — lowercase registered axes first, then uppercase
    # custom ones, each group alphabetical. That order is what the API requires.
    "shantell": G % "family=Shantell+Sans:wght,BNCE,INFM,SPAC@300..800,-100..100,0..100,0..100",
    "caveat":   G % "family=Caveat:wght@400..700&family=Kalam:wght@300;400;700",
    "klee":      G % "family=Klee+One:wght@400;600",
    "yomogi":    G % "family=Yomogi",
    "yusei":     G % "family=Yusei+Magic",
    "kurenaido": G % "family=Zen+Kurenaido",
    "yujiboku":  G % "family=Yuji+Boku",
    "yujimai":   G % "family=Yuji+Mai",
    "courier":   G % "family=Courier+Prime:wght@400;700",
}
# Chinese faces. Paths with Chinese characters are percent-encoded, and that
# encoding has never been exercised against the live CDN — prefer --embed-zh,
# which pulls the same font from the npm registry and inlines a subset.
CDN = "https://cdn.jsdelivr.net/npm/@chinese-fonts/%s@3.0.0/dist/%s/result.css"
CN = {
    "hongleixingshu": CDN % ("hlxsjt", "%E9%B8%BF%E9%9B%B7%E8%A1%8C%E4%B9%A6%E7%AE%80%E4%BD%93"),
    "qiantubifeng":   CDN % ("qtbfsxt", "%E5%8D%83%E5%9B%BE%E7%AC%94%E9%94%8B%E6%89%8B%E5%86%99%E4%BD%93"),
    "yingbi":         CDN % ("rmjzqpybxs",
                             "%E7%91%9E%E7%BE%8E%E5%8A%A0%E5%BC%A0%E6%B8%85%E5%B9%B3"
                             "%E7%A1%AC%E7%AC%94%E8%A1%8C%E4%B9%A6"),
    # ASCII path — the safe fallback that every hand keeps in its stack
    "slideyouran": CDN % ("ysyrxk", "slideyouran-Regular2_0"),
    "wenkai": "https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont@1.7.0/style.css",
}
# google links, chinese CDN links, embed key for zh, embed key for ja.
# The Japanese faces are picked to match each hand's stroke weight: Yusei Magic
# is the only marker-weight Japanese hand here, and Yomogi and Klee One are both
# light — pairing either with marker-weight Latin is the same mismatch that made
# Chinese decks look half-typeset.
HANDS = {
    "marker": (["shantell", "yusei", "courier"],
               ["hongleixingshu", "slideyouran"], "hlxsjt", "yusei-magic"),
    "pen":    (["shantell", "kurenaido", "courier"],
               ["yingbi", "slideyouran"], "rmjzqpybxs", "zen-kurenaido"),
    "scrawl": (["shantell", "yujiboku", "yujimai", "courier"],
               ["qiantubifeng", "slideyouran"], "qtbfsxt", "yuji-boku"),
    "tidy":   (["caveat", "klee", "courier"], ["wenkai"], None, None),
}


def font_links(hand, all_fonts=False, skip_cn=False):
    if all_fonts:
        g, c = list(GOOGLE), list(CN)
    else:
        g, c = HANDS[hand][0], HANDS[hand][1]
    urls = [GOOGLE[k] for k in g] + ([] if skip_cn else [CN[k] for k in c])
    return "\n".join('<link href="%s" rel="stylesheet">' % u for u in urls)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fragment", help="HTML fragment containing the .slide sections")
    ap.add_argument("-o", "--out", default="deck.html")
    ap.add_argument("--title", default="Deck")
    ap.add_argument("--lang", default="zh", help="zh | ja | en — picks the CJK font order")
    ap.add_argument("--hand", default="marker", choices=list(HANDS),
                    help="marker (default) | pen | scrawl | tidy — see references/fonts.md")
    ap.add_argument("--all-fonts", action="store_true",
                    help="load every hand's fonts, for specimen decks that switch hand per slide")
    ap.add_argument("--embed-cjk", "--embed-zh", dest="embed_cjk", action="store_true",
                    help="subset the hand's CJK faces to this deck's characters and inline "
                         "them — removes the CDN dependency and is the reliable option. "
                         "Only the scripts the deck actually uses get embedded.")
    ap.add_argument("--jitter", default="1.0",
                    help="per-character nudge for CJK, standing in for the glyph alternates "
                         "Chinese fonts lack. 0 off, 1 default, 2 loose")
    ap.add_argument("--theme", default="paper", choices=["paper", "cream", "board"])
    ap.add_argument("--paper", default="grid", choices=["grid", "dot", "plain"])
    ap.add_argument("--rough", default="2", help="global wobble, 1 = tidy, 3 = loose")
    args = ap.parse_args()

    slides = read(args.fragment)
    if "class=\"slide\"" not in slides and "class='slide'" not in slides:
        sys.exit("error: fragment has no <section class=\"slide\"> blocks")

    count = len(re.findall(r'class="[^"]*\bslide\b', slides))
    shell = read(os.path.join(ASSETS, "shell.html"))
    out = (shell
           .replace("{{CSS}}", read(os.path.join(ASSETS, "sketch.css")))
           .replace("{{JS}}", read(os.path.join(ASSETS, "sketch.js")))
           .replace("{{SLIDES}}", slides)
           .replace("{{TITLE}}", args.title)
           .replace("{{FONTLINKS}}", font_links(args.hand, args.all_fonts, args.embed_cjk))
           .replace("{{HAND}}", args.hand)
           .replace("{{LANG}}", args.lang)
           .replace("{{THEME}}", args.theme)
           .replace("{{PAPER}}", args.paper)
           .replace("{{ROUGH}}", args.rough)
           .replace("{{JITTER}}", args.jitter))

    embedded = ""
    if args.embed_cjk:
        import embed_font
        import tempfile, shutil, base64
        chars = embed_font.deck_chars([args.fragment])
        han, kana, punct = embed_font.split_scripts(chars)
        jobs = []                                  # (embed key, characters)
        if args.all_fonts:
            for h in HANDS.values():
                if h[2]:
                    jobs.append((h[2], han | punct))
                if h[3]:
                    jobs.append((h[3], kana | han | punct))
        else:
            zh_key, ja_key = HANDS[args.hand][2], HANDS[args.hand][3]
            # A Japanese deck takes its kanji from the Japanese face, so the
            # Chinese one would only add weight nobody sees.
            if zh_key and han and args.lang != "ja":
                jobs.append((zh_key, han | punct))
            if ja_key and (kana or args.lang == "ja"):
                jobs.append((ja_key, kana | han | punct))
        if not jobs:
            print("note: nothing to embed for --hand %s" % args.hand)
        for key, subset in jobs:
            if not subset:
                continue
            wd = tempfile.mkdtemp(prefix="embedfont-")
            try:
                family, woff2, got = embed_font.build(key, subset, wd)
                b64 = base64.b64encode(open(woff2, "rb").read()).decode()
                embedded += ('@font-face{font-family:"%s";font-style:normal;font-weight:400;'
                             'font-display:block;src:url(data:font/woff2;base64,%s) '
                             'format("woff2");}\n' % (family, b64))
                print("  embedded %s: %d/%d chars, %.0f KB"
                      % (family, len(got), len(subset), len(b64) / 1024))
            finally:
                shutil.rmtree(wd, ignore_errors=True)
    out = out.replace("<style>", "<style>\n" + embedded, 1)

    with open(args.out, "w", encoding="utf-8") as f:
        f.write(out)
    print("built %s — %d slides, hand=%s, %.0f KB"
          % (args.out, count, "all" if args.all_fonts else args.hand,
             os.path.getsize(args.out) / 1024))


if __name__ == "__main__":
    main()
