/* sketch.js — hand-drawn SVG engine + deck controller. No dependencies.
   Every shape is seeded from the element's identity, so wobble is stable
   across redraws (resize, font load, print) instead of jittering. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- deterministic randomness ---------- */
  function hashStr(s) {
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function makeRng(seed) {
    var s = (seed >>> 0) || 123456789;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ---------- path primitives ---------- */
  function n(v) { return Math.round(v * 100) / 100; }

  // One bowed pen stroke from A to B.
  function bow(x1, y1, x2, y2, rnd, rough) {
    var len = Math.hypot(x2 - x1, y2 - y1);
    var off = rough * Math.min(1, len / 140);
    if (len < 16) off *= 0.45;
    var r = function () { return (rnd() * 2 - 1) * off; };
    var ax = x1 + (x2 - x1) * 0.3, ay = y1 + (y2 - y1) * 0.3;
    var bx = x1 + (x2 - x1) * 0.7, by = y1 + (y2 - y1) * 0.7;
    return 'M' + n(x1 + r()) + ' ' + n(y1 + r()) +
      'C' + n(ax + r()) + ' ' + n(ay + r()) + ',' +
      n(bx + r()) + ' ' + n(by + r()) + ',' +
      n(x2 + r()) + ' ' + n(y2 + r());
  }
  // Two passes = the doubled contour a pen leaves.
  function line(x1, y1, x2, y2, rnd, rough, passes) {
    var d = '', i, p = passes == null ? 2 : passes;
    for (i = 0; i < p; i++) d += bow(x1, y1, x2, y2, rnd, rough * (i ? 1.4 : 1)) + ' ';
    return d;
  }
  // Catmull-Rom through points -> smooth cubic path.
  function smooth(pts, close) {
    if (pts.length < 2) return '';
    var d = 'M' + n(pts[0][0]) + ' ' + n(pts[0][1]), i, p0, p1, p2, p3, c1x, c1y, c2x, c2y;
    var last = pts.length - 1;
    for (i = 0; i < last; i++) {
      p0 = pts[i - 1] || (close ? pts[last - 1] : pts[0]);
      p1 = pts[i]; p2 = pts[i + 1];
      p3 = pts[i + 2] || (close ? pts[1] : pts[last]);
      c1x = p1[0] + (p2[0] - p0[0]) / 6; c1y = p1[1] + (p2[1] - p0[1]) / 6;
      c2x = p2[0] - (p3[0] - p1[0]) / 6; c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + n(c1x) + ' ' + n(c1y) + ',' + n(c2x) + ' ' + n(c2y) + ',' + n(p2[0]) + ' ' + n(p2[1]);
    }
    return d;
  }

  /* ---------- shapes ---------- */
  // Corners overshoot slightly, the way a hand-drawn box does.
  function rect(x, y, w, h, rnd, rough) {
    var o = function () { return rnd() * rough * 2.2; };
    var d = '';
    d += line(x - o(), y, x + w + o(), y, rnd, rough);
    d += line(x + w, y - o() * 0.5, x + w, y + h + o(), rnd, rough);
    d += line(x + w + o(), y + h, x - o(), y + h, rnd, rough);
    d += line(x, y + h + o() * 0.5, x, y - o(), rnd, rough);
    return d;
  }
  function roundRect(x, y, w, h, r, rnd, rough) {
    var pts = [], i, steps = 44, t, cx, cy, px, py;
    r = Math.min(r, w / 2, h / 2);
    for (i = 0; i <= steps; i++) {
      t = i / steps;
      var per = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
      var s = t * per, ax, ay;
      if (s < w - 2 * r) { ax = x + r + s; ay = y; }
      else if (s < w - 2 * r + Math.PI * r / 2) {
        var a1 = (s - (w - 2 * r)) / (Math.PI * r / 2) * Math.PI / 2;
        ax = x + w - r + r * Math.sin(a1); ay = y + r - r * Math.cos(a1);
      } else if (s < w - 2 * r + Math.PI * r / 2 + h - 2 * r) {
        ax = x + w; ay = y + r + (s - (w - 2 * r + Math.PI * r / 2));
      } else if (s < w - 2 * r + Math.PI * r + h - 2 * r) {
        var a2 = (s - (w - 2 * r + Math.PI * r / 2 + h - 2 * r)) / (Math.PI * r / 2) * Math.PI / 2;
        ax = x + w - r + r * Math.cos(a2); ay = y + h - r + r * Math.sin(a2);
      } else if (s < 2 * (w - 2 * r) + Math.PI * r + h - 2 * r) {
        ax = x + w - r - (s - (w - 2 * r + Math.PI * r + h - 2 * r)); ay = y + h;
      } else if (s < 2 * (w - 2 * r) + Math.PI * r * 1.5 + h - 2 * r) {
        var a3 = (s - (2 * (w - 2 * r) + Math.PI * r + h - 2 * r)) / (Math.PI * r / 2) * Math.PI / 2;
        ax = x + r - r * Math.sin(a3); ay = y + h - r + r * Math.cos(a3);
      } else if (s < 2 * (w - 2 * r) + Math.PI * r * 1.5 + 2 * (h - 2 * r)) {
        ax = x; ay = y + h - r - (s - (2 * (w - 2 * r) + Math.PI * r * 1.5 + h - 2 * r));
      } else {
        var a4 = (s - (2 * (w - 2 * r) + Math.PI * r * 1.5 + 2 * (h - 2 * r))) / (Math.PI * r / 2) * Math.PI / 2;
        ax = x + r - r * Math.cos(a4); ay = y + r - r * Math.sin(a4);
      }
      pts.push([ax + (rnd() * 2 - 1) * rough, ay + (rnd() * 2 - 1) * rough]);
    }
    return smooth(pts, true) + ' ';
  }
  // turns > 1 gives the looping over-draw of a circled annotation.
  function ellipse(cx, cy, rx, ry, rnd, rough, turns) {
    rx = Math.max(rx || 0, 1); ry = Math.max(ry || 0, 1); // zero-size elements would divide by zero
    var steps = Math.max(22, Math.round((rx + ry) / 5));
    var total = Math.PI * 2 * (turns || 1);
    var start = rnd() * Math.PI * 2;
    var pts = [], i, t, k;
    for (i = 0; i <= steps; i++) {
      t = start + total * i / steps;
      k = 1 + (rnd() * 2 - 1) * (rough / Math.max(rx, ry)) * 1.6;
      pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
    }
    return smooth(pts, false) + ' ';
  }
  function cloud(x, y, w, h, rnd, rough) {
    var pts = [], i, steps = 30, t, r, cx = x + w / 2, cy = y + h / 2;
    for (i = 0; i <= steps; i++) {
      t = Math.PI * 2 * i / steps;
      r = 1 + 0.13 * Math.sin(t * 5 + 1) + 0.07 * Math.sin(t * 9);
      pts.push([cx + Math.cos(t) * (w / 2) * r + (rnd() * 2 - 1) * rough,
                cy + Math.sin(t) * (h / 2) * r + (rnd() * 2 - 1) * rough]);
    }
    return smooth(pts, true) + ' ';
  }
  function arrowHead(x1, y1, x2, y2, rnd, rough, size) {
    var a = Math.atan2(y2 - y1, x2 - x1), s = size || 14, sp = 0.42;
    return line(x2, y2, x2 - s * Math.cos(a - sp), y2 - s * Math.sin(a - sp), rnd, rough, 1) +
           line(x2, y2, x2 - s * Math.cos(a + sp), y2 - s * Math.sin(a + sp), rnd, rough, 1);
  }
  function curve(x1, y1, x2, y2, rnd, rough, bend) {
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    var cx = mx - dy / len * len * bend, cy = my + dx / len * len * bend;
    var pts = [], i, t, steps = 18, u;
    for (i = 0; i <= steps; i++) {
      t = i / steps; u = 1 - t;
      pts.push([u * u * x1 + 2 * u * t * cx + t * t * x2 + (rnd() * 2 - 1) * rough,
                u * u * y1 + 2 * u * t * cy + t * t * y2 + (rnd() * 2 - 1) * rough]);
    }
    return { d: smooth(pts, false) + ' ', tip: pts[steps], prev: pts[steps - 2] };
  }
  // Parallel pen strokes, clipped to the shape — the classic sketch fill.
  function hachure(x, y, w, h, rnd, gap, angle) {
    var a = (angle == null ? -45 : angle) * Math.PI / 180;
    var g = gap || 9, d = '', i;
    var diag = Math.hypot(w, h), cx = x + w / 2, cy = y + h / 2;
    var count = Math.ceil(diag / g);
    for (i = -count; i <= count; i++) {
      var ox = -Math.sin(a) * i * g, oy = Math.cos(a) * i * g;
      var x1 = cx + ox - Math.cos(a) * diag / 2, y1 = cy + oy - Math.sin(a) * diag / 2;
      var x2 = cx + ox + Math.cos(a) * diag / 2, y2 = cy + oy + Math.sin(a) * diag / 2;
      d += bow(x1, y1, x2, y2, rnd, 1.1) + ' ';
    }
    return d;
  }

  /* ---------- svg helpers ---------- */
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag), k;
    for (k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
  }
  var clipSeq = 0;
  function put(layer, d, o) {
    o = o || {};
    var p = el('path', {
      d: d, fill: 'none',
      stroke: o.stroke || 'var(--ink)',
      'stroke-width': o.width == null ? 2 : o.width,
      'stroke-linecap': o.cap || 'round',
      'stroke-linejoin': 'round',
      opacity: o.opacity
    });
    if (o.clip) p.setAttribute('clip-path', 'url(#' + o.clip + ')');
    layer.appendChild(p);
    return p;
  }

  /* ---------- geometry in slide space ---------- */
  function boxOf(node, slide, scale) {
    var a = node.getBoundingClientRect(), b = slide.getBoundingClientRect();
    return { x: (a.left - b.left) / scale, y: (a.top - b.top) / scale,
             w: a.width / scale, h: a.height / scale };
  }
  function rectsOf(node, slide, scale) {
    var list = node.getClientRects(), b = slide.getBoundingClientRect(), out = [], i, a;
    for (i = 0; i < list.length; i++) {
      a = list[i];
      if (a.width < 1) continue;
      out.push({ x: (a.left - b.left) / scale, y: (a.top - b.top) / scale,
                 w: a.width / scale, h: a.height / scale });
    }
    return out;
  }

  var PALETTE = { ink: 'var(--ink)', red: 'var(--pen-red)', blue: 'var(--pen-blue)',
                  green: 'var(--pen-green)', pencil: 'var(--pencil)', accent: 'var(--accent)' };
  var WASH = { yellow: 'var(--wash-yellow)', mint: 'var(--wash-mint)', blue: 'var(--wash-blue)',
               pink: 'var(--wash-pink)', pencil: 'var(--pencil)' };

  function colorOf(node) { return PALETTE[node.dataset.sketchColor] || PALETTE.ink; }

  /* ---------- the decorators ---------- */
  var draw = {
    box: function (node, ctx) {
      var b = ctx.box(node), rnd = ctx.rnd, c = colorOf(node);
      var pad = +(node.dataset.sketchPad || 10);
      var x = b.x - pad, y = b.y - pad, w = b.w + pad * 2, h = b.h + pad * 2;
      var fill = node.dataset.sketchFill;
      if (fill && WASH[fill]) {
        var id = 'clip' + (++clipSeq);
        var cp = el('clipPath', { id: id });
        cp.appendChild(el('rect', { x: x, y: y, width: w, height: h, rx: 8 }));
        ctx.defs.appendChild(cp);
        put(ctx.behind, hachure(x, y, w, h, rnd, +(node.dataset.sketchGap || 9),
            node.dataset.sketchAngle), { stroke: WASH[fill], width: 3, clip: id, opacity: 0.85 });
      }
      var d = node.dataset.sketchSharp != null
        ? rect(x, y, w, h, rnd, ctx.rough)
        : roundRect(x, y, w, h, +(node.dataset.sketchRadius || 12), rnd, ctx.rough);
      put(ctx.behind, d, { stroke: c, width: +(node.dataset.sketchWidth || 2.2) });
    },
    circle: function (node, ctx) {
      var b = ctx.box(node), pad = +(node.dataset.sketchPad || 8);
      put(ctx.front, ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + pad + 4, b.h / 2 + pad,
          ctx.rnd, ctx.rough * 1.3, 1.12), { stroke: colorOf(node), width: 2.4 });
    },
    underline: function (node, ctx) {
      ctx.rects(node).forEach(function (b) {
        var y = b.y + b.h * 0.94;
        put(ctx.front, line(b.x - 3, y, b.x + b.w + 3, y + (ctx.rnd() * 3 - 1.5), ctx.rnd, 1.8),
            { stroke: colorOf(node), width: 2.4 });
      });
    },
    strike: function (node, ctx) {
      ctx.rects(node).forEach(function (b) {
        var y = b.y + b.h * 0.55;
        put(ctx.front, line(b.x - 2, y, b.x + b.w + 2, y, ctx.rnd, 1.6, 1),
            { stroke: colorOf(node), width: 2.2 });
      });
    },
    highlight: function (node, ctx) {
      var c = WASH[node.dataset.sketchFill] || WASH.yellow;
      ctx.rects(node).forEach(function (b) {
        var y = b.y + b.h * 0.6;
        put(ctx.behind, line(b.x - 4, y, b.x + b.w + 4, y, ctx.rnd, 2.2, 1),
            { stroke: c, width: b.h * 0.82, cap: 'butt' });
      });
    },
    cloud: function (node, ctx) {
      var b = ctx.box(node), pad = +(node.dataset.sketchPad || 16);
      put(ctx.behind, cloud(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, ctx.rnd, ctx.rough),
          { stroke: colorOf(node), width: 2.2 });
    },
    bracket: function (node, ctx) {
      var b = ctx.box(node), side = node.dataset.sketchSide || 'left', c = colorOf(node);
      var x = side === 'right' ? b.x + b.w + 10 : b.x - 10, k = side === 'right' ? -1 : 1;
      var d = line(x, b.y, x, b.y + b.h, ctx.rnd, 1.6, 1) +
              line(x, b.y, x + 9 * k, b.y - 5, ctx.rnd, 1.4, 1) +
              line(x, b.y + b.h, x + 9 * k, b.y + b.h + 5, ctx.rnd, 1.4, 1);
      put(ctx.front, d, { stroke: c, width: 2.2 });
    },
    check: function (node, ctx) {
      var b = ctx.box(node), s = Math.min(b.w, b.h);
      var d = line(b.x + s * 0.1, b.y + s * 0.55, b.x + s * 0.4, b.y + s * 0.85, ctx.rnd, 1.2, 1) +
              line(b.x + s * 0.4, b.y + s * 0.85, b.x + s * 0.95, b.y + s * 0.15, ctx.rnd, 1.4, 1);
      put(ctx.front, d, { stroke: colorOf(node), width: 2.6 });
    },
    cross: function (node, ctx) {
      var b = ctx.box(node), s = Math.min(b.w, b.h);
      var d = line(b.x + s * 0.15, b.y + s * 0.15, b.x + s * 0.85, b.y + s * 0.85, ctx.rnd, 1.4, 1) +
              line(b.x + s * 0.85, b.y + s * 0.15, b.x + s * 0.15, b.y + s * 0.85, ctx.rnd, 1.4, 1);
      put(ctx.front, d, { stroke: colorOf(node), width: 2.6 });
    },
    arrow: function (node, ctx) {
      var from = node.dataset.from && ctx.slide.querySelector(node.dataset.from);
      var to = node.dataset.to && ctx.slide.querySelector(node.dataset.to);
      var bend = +(node.dataset.bend || 0), c = colorOf(node), p1, p2;
      if (from && to) {
        var a = ctx.box(from), b = ctx.box(to), gap = +(node.dataset.gap || 12);
        p1 = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
        p2 = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
        p1 = edge(a, p2, gap); p2 = edge(b, p1, gap);
      } else {
        var s = (node.dataset.points || '0,0 100,0').trim().split(/\s+/);
        p1 = { x: +s[0].split(',')[0], y: +s[0].split(',')[1] };
        p2 = { x: +s[1].split(',')[0], y: +s[1].split(',')[1] };
      }
      var d, tipFrom;
      if (bend) {
        var cu = curve(p1.x, p1.y, p2.x, p2.y, ctx.rnd, ctx.rough * 0.8, bend);
        d = cu.d; tipFrom = { x: cu.prev[0], y: cu.prev[1] }; p2 = { x: cu.tip[0], y: cu.tip[1] };
      } else {
        d = line(p1.x, p1.y, p2.x, p2.y, ctx.rnd, ctx.rough); tipFrom = p1;
      }
      if (node.dataset.head !== 'none')
        d += arrowHead(tipFrom.x, tipFrom.y, p2.x, p2.y, ctx.rnd, ctx.rough, +(node.dataset.headSize || 15));
      put(ctx.front, d, { stroke: c, width: +(node.dataset.sketchWidth || 2.2) });
    },
    bars: function (node, ctx) {
      var b = ctx.box(node), rnd = ctx.rnd;
      var vals = (node.dataset.values || '').split(',').map(Number);
      var labels = (node.dataset.labels || '').split(',');
      var max = Math.max.apply(null, vals.concat([+(node.dataset.max || 0)])) || 1;
      if (!vals.length || vals.some(isNaN)) return;
      var padB = 34, padL = 8, plotH = b.h - padB, gap = 16;
      var bw = (b.w - padL - gap * (vals.length - 1)) / vals.length;
      var d = line(b.x, b.y + plotH, b.x + b.w, b.y + plotH, rnd, 1.6, 1);
      put(ctx.behind, d, { stroke: PALETTE.pencil, width: 2 });
      vals.forEach(function (v, i) {
        var h = Math.max(4, plotH * (v / max)), x = b.x + padL + i * (bw + gap), y = b.y + plotH - h;
        var id = 'clip' + (++clipSeq), cp = el('clipPath', { id: id });
        cp.appendChild(el('rect', { x: x, y: y, width: bw, height: h }));
        ctx.defs.appendChild(cp);
        var fill = (node.dataset.fills || '').split(',')[i] || node.dataset.sketchFill || 'yellow';
        put(ctx.behind, hachure(x, y, bw, h, rnd, 8, -50), { stroke: WASH[fill] || WASH.yellow, width: 3.5, clip: id });
        put(ctx.behind, rect(x, y, bw, h, rnd, ctx.rough), { stroke: colorOf(node), width: 2 });
        var t = el('text', { x: n(x + bw / 2), y: n(y - 9), 'text-anchor': 'middle', class: 'sk-num' });
        t.textContent = node.dataset.suffix ? v + node.dataset.suffix : v;
        ctx.front.appendChild(t);
        if (labels[i]) {
          var l = el('text', { x: n(x + bw / 2), y: n(b.y + plotH + 24), 'text-anchor': 'middle', class: 'sk-label' });
          l.textContent = labels[i].trim();
          ctx.front.appendChild(l);
        }
      });
    },
    plot: function (node, ctx) {
      var b = ctx.box(node), rnd = ctx.rnd;
      var series = (node.dataset.values || '').split(';');
      var labels = (node.dataset.labels || '').split(',');
      var all = [], padB = 34, padL = 10;
      series.forEach(function (s) { s.split(',').forEach(function (v) { all.push(+v); }); });
      if (!all.length || all.some(isNaN)) return;
      var max = Math.max.apply(null, all.concat([+(node.dataset.max || 0)]));
      var min = Math.min(0, Math.min.apply(null, all));
      var plotH = b.h - padB, plotW = b.w - padL;
      put(ctx.behind, line(b.x, b.y + plotH, b.x + b.w, b.y + plotH, rnd, 1.6, 1), { stroke: PALETTE.pencil, width: 2 });
      put(ctx.behind, line(b.x, b.y, b.x, b.y + plotH, rnd, 1.6, 1), { stroke: PALETTE.pencil, width: 2 });
      var colors = (node.dataset.colors || 'ink,red,blue').split(',');
      series.forEach(function (s, si) {
        var vs = s.split(',').map(Number), pts = [];
        vs.forEach(function (v, i) {
          var x = b.x + padL + plotW * (vs.length === 1 ? 0.5 : i / (vs.length - 1));
          var y = b.y + plotH - plotH * ((v - min) / (max - min || 1));
          pts.push([x + (rnd() * 2 - 1) * 1.6, y + (rnd() * 2 - 1) * 1.6]);
        });
        var col = PALETTE[colors[si] ? colors[si].trim() : 'ink'] || PALETTE.ink;
        put(ctx.front, smooth(pts, false), { stroke: col, width: 2.6 });
        if (node.dataset.dots !== 'none') pts.forEach(function (p) {
          put(ctx.front, ellipse(p[0], p[1], 4.5, 4.5, rnd, 0.9, 1.2), { stroke: col, width: 2 });
        });
      });
      labels.forEach(function (lb, i) {
        if (!lb.trim()) return;
        var x = b.x + padL + plotW * (labels.length === 1 ? 0.5 : i / (labels.length - 1));
        var l = el('text', { x: n(x), y: n(b.y + plotH + 24), 'text-anchor': 'middle', class: 'sk-label' });
        l.textContent = lb.trim();
        ctx.front.appendChild(l);
      });
    }
  };

  // Where a line toward `target` leaves the box, plus a small breathing gap.
  function edge(box, target, gap) {
    var cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    var dx = target.x - cx, dy = target.y - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    var hw = box.w / 2 + gap, hh = box.h / 2 + gap;
    var sx = dx ? hw / Math.abs(dx) : Infinity, sy = dy ? hh / Math.abs(dy) : Infinity;
    var t = Math.min(sx, sy);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  /* ---------- render pass ---------- */
  function renderSlide(slide) {
    var old = slide.querySelectorAll('.sketch-layer');
    for (var i = 0; i < old.length; i++) old[i].remove();

    var stage = slide.querySelector('.stage') || slide;
    var r = stage.getBoundingClientRect();
    if (!r.width) return;
    var W = +(document.body.dataset.width || 1280), H = +(document.body.dataset.height || 720);
    var scale = r.width / W;

    var behind = el('svg', { class: 'sketch-layer behind', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none' });
    var front = el('svg', { class: 'sketch-layer front', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none' });
    var defs = el('defs', {});
    behind.appendChild(defs);
    stage.appendChild(behind);
    stage.appendChild(front);

    var nodes = stage.querySelectorAll('[data-sketch]');
    for (var j = 0; j < nodes.length; j++) {
      var node = nodes[j], kind = node.dataset.sketch;
      if (!draw[kind]) continue;
      var seed = hashStr((node.dataset.seed || '') + kind + j + (node.textContent || '').slice(0, 24));
      var ctx = {
        rnd: makeRng(seed), behind: behind, front: front, defs: defs, slide: stage,
        rough: +(node.dataset.rough || document.body.dataset.rough || 2),
        box: function (nd) { return boxOf(nd, stage, scale); },
        rects: function (nd) { return rectsOf(nd, stage, scale); }
      };
      try { draw[kind](node, ctx); } catch (e) { /* one bad shape shouldn't kill the deck */ }
    }
  }

  function renderAll() {
    var amount = parseFloat(document.body.dataset.jitter || 0);
    var slides = document.querySelectorAll('.slide');
    for (var i = 0; i < slides.length; i++) jitterCJK(slides[i], amount);
    for (var j = 0; j < slides.length; j++) renderSlide(slides[j]);
  }

  /* ---------- CJK jitter ----------
     Shantell Sans varies Latin via rlig alternates. No Chinese face offers
     that, so every 的 on a slide is otherwise pixel-identical — which is the
     single loudest tell that the Chinese is typeset while the English is
     drawn. Nudging each character slightly reproduces the effect at render
     time. Seeded on character AND position so repeats genuinely differ, and
     transforms on inline-block boxes don't move the layout, so the sketch
     measurements taken afterwards stay correct. */
  var CJK_RE = /[\u2E80-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/;

  function jitterCJK(slide, amount) {
    if (!amount || slide.dataset.jittered) return;
    slide.dataset.jittered = '1';
    var walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT, null, false);
    var texts = [], node, i = 0;
    while ((node = walker.nextNode())) {
      if (node.parentNode && node.parentNode.closest &&
          node.parentNode.closest('.sketch-layer, code, .mono')) continue;
      if (CJK_RE.test(node.nodeValue)) texts.push(node);
    }
    texts.forEach(function (t) {
      var frag = document.createDocumentFragment();
      t.nodeValue.split('').forEach(function (ch) {
        if (!CJK_RE.test(ch)) { frag.appendChild(document.createTextNode(ch)); return; }
        var rnd = makeRng(hashStr(ch + '@' + (i++)));
        var s = document.createElement('span');
        s.className = 'jt';
        s.textContent = ch;
        s.style.transform =
          'rotate(' + ((rnd() * 2 - 1) * amount * 1.1).toFixed(2) + 'deg)' +
          ' translateY(' + ((rnd() * 2 - 1) * amount * 0.55).toFixed(2) + 'px)' +
          ' scale(' + (1 + (rnd() * 2 - 1) * amount * 0.007).toFixed(4) + ')';
        frag.appendChild(s);
      });
      t.parentNode.replaceChild(frag, t);
    });
  }

  /* ---------- font check ----------
     The CJK faces come from a CDN and are unicode-range subsetted, so a failed
     load looks like "slightly wrong font" rather than an error. This turns that
     into something you can actually see. Open the deck with #fontcheck. */
  function checkFonts() {
    if (!document.fonts || !document.fonts.check) return [];
    var cs = getComputedStyle(document.body), names = [], first = null;
    ['--font-display', '--font-hand', '--font-mono'].forEach(function (v) {
      var list = (cs.getPropertyValue(v).match(/"[^"]+"/g) || []);
      if (v === '--font-hand' && list.length) first = list[0].slice(1, -1);
      list.forEach(function (q) {
        var n = q.slice(1, -1);
        if (names.indexOf(n) < 0) names.push(n);
      });
    });
    var report = names.map(function (n) {
      var f = '16px "' + n + '"';
      // Subsetted CJK faces only report loaded when probed with CJK text.
      var ok = document.fonts.check(f) || document.fonts.check(f, '手写かな漢');
      return { family: n, available: ok };
    });
    window.__fontReport = report;
    var lead = report.filter(function (r) { return r.family === first; })[0];
    if (lead && !lead.available)
      console.warn('[handwritten-slides] "' + first + '" did not load — the deck is ' +
                   'falling back down the stack. Check the font <link> URLs.');
    if ((location.hash || '').indexOf('fontcheck') >= 0) showFontPanel(report);
    return report;
  }

  function showFontPanel(report) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99;background:#fff;' +
      'border:1px solid #ccc;padding:10px 14px;font:13px/1.6 monospace;max-width:340px';
    d.innerHTML = '<b>font check</b><br>' + report.map(function (r) {
      return (r.available ? '✓ ' : '✗ ') + r.family;
    }).join('<br>');
    document.body.appendChild(d);
  }

  /* ---------- deck controller ---------- */
  var deck = { i: 0, slides: [] };

  function fit() {
    var W = +(document.body.dataset.width || 1280), H = +(document.body.dataset.height || 720);
    var k = Math.min(window.innerWidth / W, window.innerHeight / H);
    document.documentElement.style.setProperty('--scale', k);
  }

  function steps(slide) { return slide.querySelectorAll('[data-step]'); }

  function show(i, stepTo) {
    if (i < 0 || i >= deck.slides.length) return;
    deck.i = i;
    deck.slides.forEach(function (s, k) { s.classList.toggle('active', k === i); });
    var st = steps(deck.slides[i]);
    var target = stepTo === 'end' ? st.length : 0;
    deck.slides[i].dataset.shown = target;
    st.forEach(function (e, k) { e.classList.toggle('revealed', k < target); });
    var c = document.querySelector('.deck-counter');
    if (c) c.textContent = (i + 1) + ' / ' + deck.slides.length;
    jitterCJK(deck.slides[i], parseFloat(document.body.dataset.jitter || 0));
    renderSlide(deck.slides[i]);
    // Sandboxed iframes and some file:// contexts throw here; the deck must survive it.
    try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) { /* deep link is optional */ }
  }

  function next() {
    var s = deck.slides[deck.i], st = steps(s), shown = +(s.dataset.shown || 0);
    if (shown < st.length) {
      st[shown].classList.add('revealed');
      s.dataset.shown = shown + 1;
      renderSlide(s);
      return;
    }
    show(deck.i + 1);
  }
  function prev() {
    var s = deck.slides[deck.i], st = steps(s), shown = +(s.dataset.shown || 0);
    if (shown > 0) {
      st[shown - 1].classList.remove('revealed');
      s.dataset.shown = shown - 1;
      renderSlide(s);
      return;
    }
    if (deck.i > 0) show(deck.i - 1, 'end');
  }

  function boot() {
    deck.slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    fit();
    var start = parseInt((location.hash || '').slice(1), 10);
    show(isNaN(start) ? 0 : Math.min(Math.max(start - 1, 0), deck.slides.length - 1));

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'j') { next(); e.preventDefault(); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'k') { prev(); e.preventDefault(); }
      else if (k === 'Home') show(0);
      else if (k === 'End') show(deck.slides.length - 1);
      else if (k === 'o') document.body.classList.toggle('overview');
      else if (k === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
    });

    // A hash change is a same-document navigation: the browser fires this
    // instead of reloading, so without it a shared #5 link lands on slide 1
    // whenever the page is already open, and back/forward does nothing.
    window.addEventListener('hashchange', function () {
      var n = parseInt((location.hash || '').slice(1), 10);
      if (!isNaN(n) && n - 1 !== deck.i) show(Math.min(Math.max(n - 1, 0), deck.slides.length - 1));
    });

    var sx = 0, sy = 0;
    document.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
    }, { passive: true });

    document.addEventListener('click', function (e) {
      if (document.body.classList.contains('overview')) {
        var s = e.target.closest('.slide');
        if (s) { document.body.classList.remove('overview'); show(deck.slides.indexOf(s)); }
        return;
      }
      if (e.target.closest('a, button, .no-advance')) return;
      (e.clientX < window.innerWidth * 0.25 ? prev : next)();
    });

    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { fit(); renderAll(); }, 120); });
    window.addEventListener('beforeprint', function () { document.body.classList.add('printing'); renderAll(); });
    window.addEventListener('afterprint', function () { document.body.classList.remove('printing'); fit(); renderAll(); });
  }

  // Text metrics move when the handwriting fonts land, so wait before measuring.
  function start() {
    boot();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { fit(); renderAll(); checkFonts(); });
      setTimeout(function () { fit(); renderAll(); }, 1200);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.Sketch = { refresh: renderAll, go: show, next: next, prev: prev, fonts: checkFonts };
})();
