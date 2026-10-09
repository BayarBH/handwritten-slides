#!/usr/bin/env python3
"""Subset a Chinese webfont down to the characters a deck actually uses, and
inline it as base64.

Reason to bother: the CDN copies of these fonts are split into 70–300
unicode-range subsets totalling 3–17MB, and two of the best faces sit behind
percent-encoded Chinese URLs that may or may not resolve. A deck uses a few
hundred distinct characters. Subsetting turns a fragile multi-megabyte CDN
dependency into ~100KB of base64 that travels inside the file.

    python3 scripts/embed_font.py slides.html --font hlxsjt -o zh-font.css

Then paste the emitted @font-face into the deck, or pass --into deck.html.
"""
import argparse
import base64
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile

from fontTools.merge import Merger
from fontTools.subset import Subsetter
from fontTools.ttLib import TTFont

# Curated: name -> (npm package, css family). Rendered and eyeballed before
# being listed; see references/fonts.md for what each one looks like.
FONTS = {
    # Chinese — 中文网字计划, one dist dir per face
    "hlxsjt":     ("@chinese-fonts/hlxsjt", "hongleixingshu"),
    "qtbfsxt":    ("@chinese-fonts/qtbfsxt", "qiantubifengshouxieti"),
    "blbbsxt":    ("@chinese-fonts/blbbsxt", "bailubangbangshouxieti"),
    "rmjzqpybxs": ("@chinese-fonts/rmjzqpybxs", "瑞美加张清平硬笔行书"),
    "ysyrxk":     ("@chinese-fonts/ysyrxk", "slideyouran"),
    "jxzk":       ("@chinese-fonts/jxzk", "jiangxizhuokai"),
    # Japanese — Fontsource mirrors of Google Fonts, index.css at package root
    "yusei-magic":   ("@fontsource/yusei-magic", "Yusei Magic"),
    "zen-kurenaido": ("@fontsource/zen-kurenaido", "Zen Kurenaido"),
    "yuji-boku":     ("@fontsource/yuji-boku", "Yuji Boku"),
    "yuji-syuku":    ("@fontsource/yuji-syuku", "Yuji Syuku"),
    "yuji-mai":      ("@fontsource/yuji-mai", "Yuji Mai"),
    "yomogi":        ("@fontsource/yomogi", "Yomogi"),
    "klee-one":      ("@fontsource/klee-one", "Klee One"),
}

KANA = re.compile(r"[\u3040-\u30FF\u31F0-\u31FF]")
HAN = re.compile(r"[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]")
PUNCT = re.compile(r"[\u3000-\u303F\uFF00-\uFFEF]")
CJK = re.compile(r"[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]")
# Fontsource writes "@font-face {" with a space and quotes its format(); the
# Chinese packages write "@font-face{" minified. Tolerate both.
FACE_RE = re.compile(r"@font-face\s*\{(.*?)\}", re.S)


def deck_chars(paths):
    chars = set()
    for p in paths:
        text = open(p, encoding="utf-8").read()
        text = re.sub(r"<[^>]+>", " ", text)      # strip tags; keep tag text
        chars |= set(CJK.findall(text))
    return chars


def split_scripts(chars):
    """-> (han, kana, punct). Punctuation goes to whichever face is used, so
    it is returned separately rather than assigned here."""
    return ({c for c in chars if HAN.match(c)},
            {c for c in chars if KANA.match(c)},
            {c for c in chars if PUNCT.match(c)})


def fetch(pkg, workdir):
    """npm pack into workdir and return the unpacked package root."""
    out = subprocess.run(["npm", "pack", pkg, "--silent"], cwd=workdir,
                         capture_output=True, text=True)
    tgz = sorted(glob.glob(os.path.join(workdir, "*.tgz")))
    if not tgz:
        sys.exit("could not download %s: %s" % (pkg, out.stderr.strip()[:200]))
    subprocess.run(["tar", "xzf", os.path.basename(tgz[-1])], cwd=workdir, check=True)
    return os.path.join(workdir, "package")


def parse_css(css_path):
    css = open(css_path, encoding="utf-8").read()
    base = os.path.dirname(css_path)
    faces = []
    for block in FACE_RE.findall(css):
        m = re.search(r"url\(['\"]?\.?/?([^'\") ]+\.woff2)['\"]?\)", block)
        r = re.search(r"unicode-range:([^;}]+)", block)
        w = re.search(r"font-weight:\s*(\d+)", block)
        if not (m and r):
            continue
        if w and w.group(1) != "400":      # fontsource ships several weights
            continue
        ranges = []
        for tok in r.group(1).split(","):
            tok = tok.strip().upper().lstrip("U+")
            a, _, b = tok.partition("-")
            ranges.append((int(a, 16), int(b or a, 16)))
        faces.append((os.path.join(base, m.group(1).lstrip("./")), ranges))
    return faces


def covers(cp, ranges):
    return any(a <= cp <= b for a, b in ranges)


def build(font_key, chars, workdir):
    pkg, family = FONTS[font_key]
    root = fetch(pkg, workdir)
    cssfiles = sorted(glob.glob(os.path.join(root, "dist", "*", "result.css")))
    if cssfiles:                                        # 中文网字计划 layout
        css = next((c for c in cssfiles
                    if not any(w in c for w in ("Bold", "Light", "Medium", "Thin"))), cssfiles[0])
    else:                                               # fontsource layout
        css = os.path.join(root, "index.css")
    if not os.path.exists(css):
        sys.exit("no font CSS found in %s" % pkg)
    faces = parse_css(css)

    pieces, got = [], set()
    for i, (path, ranges) in enumerate(faces):
        want = {c for c in chars if covers(ord(c), ranges)}
        if not want or not os.path.exists(path):
            continue
        f = TTFont(path)
        sub = Subsetter()
        sub.populate(text="".join(sorted(want)))
        sub.subset(f)
        piece = os.path.join(workdir, "piece%03d.ttf" % i)
        f.flavor = None
        f.save(piece)
        pieces.append(piece)
        got |= want

    if not pieces:
        sys.exit("none of the deck's characters were found in %s" % font_key)

    out = os.path.join(workdir, "merged.ttf")
    if len(pieces) == 1:
        shutil.copy(pieces[0], out)
    else:
        Merger().merge(pieces).save(out)

    final = TTFont(out)
    sub = Subsetter()
    sub.populate(text="".join(sorted(got)))
    sub.subset(final)
    final.flavor = "woff2"
    woff2 = os.path.join(workdir, "final.woff2")
    final.save(woff2)
    return family, woff2, got


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sources", nargs="+", help="slide fragment(s) to scan for characters")
    ap.add_argument("--font", required=True, choices=sorted(FONTS))
    ap.add_argument("-o", "--out", default="zh-font.css")
    ap.add_argument("--into", help="built deck HTML to inject the @font-face into")
    args = ap.parse_args()

    chars = deck_chars(args.sources)
    if not chars:
        sys.exit("no CJK characters found in %s" % ", ".join(args.sources))

    workdir = tempfile.mkdtemp(prefix="embedfont-")
    try:
        family, woff2, got = build(args.font, chars, workdir)
        b64 = base64.b64encode(open(woff2, "rb").read()).decode()
        rule = ('@font-face{font-family:"%s";font-style:normal;font-weight:400;'
                'font-display:block;src:url(data:font/woff2;base64,%s) format("woff2");}'
                % (family, b64))
        open(args.out, "w", encoding="utf-8").write(rule)
        kb = len(b64) / 1024
        print("%s: %d/%d chars, %.0f KB inlined -> %s"
              % (family, len(got), len(chars), kb, args.out))
        missing = chars - got
        if missing:
            print("  not in this font: %s" % "".join(sorted(missing))[:60])
        if args.into:
            html = open(args.into, encoding="utf-8").read()
            html = html.replace("<style>", "<style>\n" + rule + "\n", 1)
            open(args.into, "w", encoding="utf-8").write(html)
            print("  injected into %s" % args.into)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    main()
