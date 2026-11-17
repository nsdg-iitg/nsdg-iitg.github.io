/* The home page's band diagram. Scroll position sets the bias and the light,
   and one schematic device goes from equilibrium to a solar cell, an LED and a
   memory. It reads the progress (--sc-p) that the scroll engine publishes on
   the section. Everything is a schematic and is labelled as one on the page. */
(function () {
  'use strict';
  var act = document.getElementById('device');
  var svg = document.getElementById('bd');
  var jv = document.getElementById('jv');
  if (!act || !svg || !jv) return;

  var NS = 'http://www.w3.org/2000/svg';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- small helpers ---------------------------------------------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ss(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
  function el(parent, name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    parent.appendChild(e);
    return e;
  }
  /* A label with a subscript, e.g. E + C. */
  function sub(parent, attrs, main, small) {
    var t = el(parent, 'text', attrs, main);
    if (small) el(t, 'tspan', { dy: 4, 'font-size': '0.72em' }, small);
    return t;
  }
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  /* ---- the device ------------------------------------------------------- */
  var EG = 1.6, VBI = 1.2, VOC = 1.0, VLED = 1.5, VMEM = 0.9;
  var X = { m0: 36, etl: 92, abs: 222, htl: 658, m1: 788, end: 844 };
  var S = 100, Y0 = 262;
  function Y(E) { return Y0 - E * S; }
  function ax(u) { return X.abs + u * (X.htl - X.abs); }      /* u: 0..1 across the perovskite */

  function bands(V) {
    var sh = V - VBI;                    /* electron energy of the left side, relative to the right */
    return {
      ecL: EG + sh, ecR: EG, evL: sh, evR: 0,
      etlC: EG + sh - 0.1, etlV: sh - 0.6,
      htlC: EG + 0.6, htlV: 0.1,
      efL: EG + sh - 0.2, efR: 0.2
    };
  }
  /* band edge energy at any u, including the transport layers (u < 0, u > 1) */
  function edge(b, which, u) {
    if (which === 'c') {
      if (u < 0) return lerp(b.ecL, b.etlC, clamp(-u / 0.03, 0, 1));
      if (u > 1) return lerp(b.ecR, b.htlC, clamp((u - 1) / 0.03, 0, 1));
      return lerp(b.ecL, b.ecR, u);
    }
    if (u < 0) return lerp(b.evL, b.etlV, clamp(-u / 0.03, 0, 1));
    if (u > 1) return lerp(b.evR, b.htlV, clamp((u - 1) / 0.03, 0, 1));
    return lerp(b.evL, b.evR, u);
  }

  /* ---- what the scroll position means ----------------------------------- */
  var P_SUN = 0.13, P_LED = 0.42, P_MEM = 0.66;
  function memV(m) {
    if (m < 0.10) return lerp(VLED, 0, ss(0, 0.10, m));
    if (m < 0.35) return lerp(0, VMEM, (m - 0.10) / 0.25);
    if (m < 0.55) return lerp(VMEM, 0, (m - 0.35) / 0.20);
    if (m < 0.80) return lerp(0, -VMEM, (m - 0.55) / 0.25);
    return lerp(-VMEM, 0, (m - 0.80) / 0.20);
  }
  function memF(m) { return m < 0.55 ? ss(0.27, 0.35, m) : 1 - ss(0.72, 0.80, m); }
  function stateAt(p) {
    var s = { p: p, m: -1, f: 0 };
    s.light = ss(P_SUN, P_SUN + 0.04, p) * (1 - ss(P_LED - 0.03, P_LED + 0.01, p));
    if (p < P_MEM) {
      s.V = VOC * ss(0.20, 0.37, p) + (VLED - VOC) * ss(P_LED + 0.02, 0.60, p);
    } else {
      s.m = (p - P_MEM) / (1 - P_MEM);
      s.V = memV(s.m);
      s.f = memF(s.m);
    }
    s.inject = clamp((s.V - 1.05) / 0.35, 0, 1) * (1 - s.light);
    s.field = clamp((VBI - s.V) / VBI, 0, 1.6);
    s.ions = s.m < 0 ? 0 : ss(0.02, 0.12, s.m);
    s.step = p < P_SUN ? 0 : p < P_LED ? 1 : p < P_MEM ? 2 : 3;
    return s;
  }

  /* ---- build the drawing once -------------------------------------------- */
  svg.setAttribute('viewBox', '0 0 880 580');
  var gBack = el(svg, 'g', { 'class': 'bd-back' });
  el(gBack, 'rect', { x: X.etl, y: 20, width: X.abs - X.etl, height: 520, 'class': 'bd-layer bd-layer--etl' });
  el(gBack, 'rect', { x: X.abs, y: 20, width: X.htl - X.abs, height: 520, 'class': 'bd-layer bd-layer--abs' });
  el(gBack, 'rect', { x: X.htl, y: 20, width: X.m1 - X.htl, height: 520, 'class': 'bd-layer bd-layer--htl' });
  [X.etl, X.abs, X.htl, X.m1].forEach(function (x) { el(gBack, 'line', { x1: x, x2: x, y1: 20, y2: 540, 'class': 'bd-wall' }); });
  var names = el(svg, 'g', { 'class': 'bd-names' });
  el(names, 'text', { x: (X.m0 + X.etl) / 2, y: 566, 'text-anchor': 'middle' }, 'Contact');
  el(names, 'text', { x: (X.etl + X.abs) / 2, y: 566, 'text-anchor': 'middle' }, 'Electron layer');
  el(names, 'text', { x: (X.abs + X.htl) / 2, y: 566, 'text-anchor': 'middle' }, 'Perovskite');
  el(names, 'text', { x: (X.htl + X.m1) / 2, y: 566, 'text-anchor': 'middle' }, 'Hole layer');
  el(names, 'text', { x: (X.m1 + X.end) / 2, y: 566, 'text-anchor': 'middle' }, 'Contact');

  var metalL = el(svg, 'rect', { x: X.m0, width: X.etl - X.m0, 'class': 'bd-metal' });
  var metalR = el(svg, 'rect', { x: X.m1, width: X.end - X.m1, 'class': 'bd-metal' });
  var metalLt = el(svg, 'line', { x1: X.m0, x2: X.etl, 'class': 'bd-ef' });
  var metalRt = el(svg, 'line', { x1: X.m1, x2: X.end, 'class': 'bd-ef' });

  var sun = el(svg, 'g', { 'class': 'bd-sun' });
  var sunRays = [0.2, 0.46, 0.72].map(function (u) {
    var g = el(sun, 'g', {});
    el(g, 'path', { d: 'M0 0 q5 7 0 14 q-5 7 0 14 q5 7 0 14 q-5 7 0 14 l0 8 m-5 -8 l5 9 l5 -9', 'class': 'bd-ray bd-ray--in' });
    return { g: g, u: u };
  });
  sub(sun, { x: ax(0.2) - 26, y: 60, 'class': 'bd-tag bd-tag--sun' }, 'hν');

  var filament = el(svg, 'path', { 'class': 'bd-filament' });
  var pEc = el(svg, 'path', { 'class': 'bd-band bd-band--c' });
  var pEv = el(svg, 'path', { 'class': 'bd-band bd-band--v' });
  var pEf = el(svg, 'path', { 'class': 'bd-ef bd-ef--flat' });
  var pEfn = el(svg, 'path', { 'class': 'bd-ef bd-ef--n' });
  var pEfp = el(svg, 'path', { 'class': 'bd-ef bd-ef--p' });
  var tEc = sub(svg, { 'class': 'bd-tag bd-tag--c' }, 'E', 'C');
  var tEv = sub(svg, { 'class': 'bd-tag bd-tag--v' }, 'E', 'V');
  var tEf = sub(svg, { 'class': 'bd-tag' }, 'E', 'F');
  var tEfn = sub(svg, { 'class': 'bd-tag bd-tag--c' }, 'E', 'Fn');
  var tEfp = sub(svg, { 'class': 'bd-tag bd-tag--v', 'text-anchor': 'end' }, 'E', 'Fp');
  var tIon = el(svg, 'text', { 'class': 'bd-tag bd-tag--ion', 'text-anchor': 'middle' }, 'Mobile ions');

  var N = 7, pairs = [];
  for (var i = 0; i < N; i++) {
    pairs.push({
      ph: i / N, x0: 0.12 + 0.76 * rnd(), xm: 0.3 + 0.4 * rnd(), tilt: -30 + 60 * rnd(),
      e: el(svg, 'circle', { r: 5.5, 'class': 'bd-e' }),
      h: el(svg, 'circle', { r: 5.5, 'class': 'bd-h' }),
      ray: el(svg, 'path', { d: 'M0 0 q5 -7 0 -14 q-5 -7 0 -14 q5 -7 0 -14 l0 -8 m-5 8 l5 -9 l5 9', 'class': 'bd-ray bd-ray--out' })
    });
  }
  var NI = 10, ions = [];
  for (i = 0; i < NI; i++) {
    ions.push({ u0: 0.07 + 0.86 * rnd(), d0: (rnd() - 0.5) * 0.9, u1: 0.04 + 0.92 * i / (NI - 1), w: rnd() * 6.28, c: el(svg, 'circle', { r: 6, 'class': 'bd-ion' }) });
  }
  var hops = [0, 1, 2].map(function () { return el(svg, 'circle', { r: 3.5, 'class': 'bd-e bd-e--hop' }); });

  /* ---- the small current-voltage plot ------------------------------------ */
  jv.setAttribute('viewBox', '0 0 260 190');
  var JX0 = 26, JX1 = 250, JY0 = 12, JY1 = 172;
  var gD = el(jv, 'g', { 'class': 'jv-diode' });
  var gL = el(jv, 'g', { 'class': 'jv-loop' });
  var dAxV = el(gD, 'line', { 'class': 'jv-axis' }), dAxJ = el(gD, 'line', { 'class': 'jv-axis' });
  var clip = el(el(jv, 'defs', {}), 'clipPath', { id: 'jv-clip' });
  el(clip, 'rect', { x: JX0 - 2, y: JY0 - 2, width: JX1 - JX0 + 4, height: JY1 - JY0 + 4 });
  var dDark = el(gD, 'path', { 'class': 'jv-curve jv-curve--ghost', 'clip-path': 'url(#jv-clip)' });
  var dCurve = el(gD, 'path', { 'class': 'jv-curve', 'clip-path': 'url(#jv-clip)' });
  var dVoc = sub(gD, { 'class': 'jv-tag', 'text-anchor': 'middle' }, 'V', 'OC');
  var dJsc = sub(gD, { 'class': 'jv-tag', 'text-anchor': 'end' }, 'J', 'SC');
  var dTv = el(gD, 'text', { 'class': 'jv-tag', 'text-anchor': 'end' }, 'V');
  var dTj = el(gD, 'text', { 'class': 'jv-tag' }, 'J');
  el(gL, 'line', { x1: JX0, x2: JX1, y1: (JY0 + JY1) / 2, y2: (JY0 + JY1) / 2, 'class': 'jv-axis' });
  el(gL, 'line', { x1: (JX0 + JX1) / 2, x2: (JX0 + JX1) / 2, y1: JY0, y2: JY1, 'class': 'jv-axis' });
  el(gL, 'text', { x: JX1, y: (JY0 + JY1) / 2 - 6, 'class': 'jv-tag', 'text-anchor': 'end' }, 'V');
  el(gL, 'text', { x: (JX0 + JX1) / 2 + 7, y: JY0 + 9, 'class': 'jv-tag' }, 'I');
  var lTrace = el(gL, 'path', { 'class': 'jv-curve jv-curve--mem' });
  var lSet = el(gL, 'text', { x: 214, y: 44, 'class': 'jv-tag jv-tag--mem', 'text-anchor': 'middle' }, 'SET');
  var lReset = el(gL, 'text', { x: 60, y: 150, 'class': 'jv-tag jv-tag--mem', 'text-anchor': 'middle' }, 'RESET');
  var dot = el(jv, 'circle', { r: 5, 'class': 'jv-dot' });

  var A = 0.16, J0 = 1 / (Math.exp(VOC / A) - 1);
  function Jd(V, light) { return J0 * (Math.exp(V / A) - 1) - light; }
  function memI(m) { return lerp(0.13, 1, memF(m)) * memV(m) / VMEM; }
  /* the loop is fixed, so sample it once and reveal it by length */
  var loopPts = [];
  for (i = 0; i <= 180; i++) {
    var mm = 0.10 + 0.90 * i / 180;
    loopPts.push([lerp(JX0, JX1, (memV(mm) / VMEM * 0.88 + 1) / 2), lerp(JY1, JY0, (memI(mm) * 0.88 + 1) / 2)]);
  }

  /* ---- the readouts beside the drawing ----------------------------------- */
  var thumb = document.getElementById('bias-thumb');
  var lamp = document.getElementById('lamp');
  var steps = act.querySelectorAll('[data-step]');
  var stateWord = document.getElementById('device-state');
  var WORDS = ['Equilibrium', 'Solar cell', 'LED', 'Memory'];
  var lastStep = -1;

  /* ---- draw one frame ----------------------------------------------------- */
  function pathBand(b, which) {
    var L = which === 'c' ? [b.etlC, b.ecL, b.ecR, b.htlC] : [b.etlV, b.evL, b.evR, b.htlV];
    return 'M' + X.etl + ' ' + Y(L[0]) + 'H' + X.abs + 'V' + Y(L[1]) + 'L' + X.htl + ' ' + Y(L[2]) + 'V' + Y(L[3]) + 'H' + X.m1;
  }
  function place(node, x, y) { node.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'); }
  function show(node, o) { node.style.opacity = o < 0.004 ? 0 : o.toFixed(3); }

  function draw(s, t, dt) {
    var b = bands(s.V), u, k;
    pEc.setAttribute('d', pathBand(b, 'c'));
    pEv.setAttribute('d', pathBand(b, 'v'));

    /* contacts: filled states up to the Fermi level */
    metalL.setAttribute('y', Y(b.efL)); metalL.setAttribute('height', Math.max(0, 540 - Y(b.efL)));
    metalR.setAttribute('y', Y(b.efR)); metalR.setAttribute('height', Math.max(0, 540 - Y(b.efR)));
    metalLt.setAttribute('y1', Y(b.efL)); metalLt.setAttribute('y2', Y(b.efL));
    metalRt.setAttribute('y1', Y(b.efR)); metalRt.setAttribute('y2', Y(b.efR));

    /* quasi-Fermi levels. Under light at short circuit they bend towards the
       blocking side; at open circuit and in the dark they are flat. */
    var bend = 0.5 * s.light * clamp(1 - s.V / VOC, 0, 1);
    var dn = 'M' + X.etl + ' ' + Y(b.efL), dp = 'M' + X.m1 + ' ' + Y(b.efR) + 'H' + X.htl;
    for (k = 0; k <= 24; k++) {
      u = k / 24;
      dn += 'L' + ax(u).toFixed(1) + ' ' + Y(b.efL + bend * Math.pow(u, 2.2)).toFixed(1);
      dp += 'L' + ax(1 - u).toFixed(1) + ' ' + Y(b.efR - bend * Math.pow(u, 2.2)).toFixed(1);
    }
    pEfn.setAttribute('d', dn); pEfp.setAttribute('d', dp);
    pEf.setAttribute('d', 'M' + X.etl + ' ' + Y(b.efR) + 'H' + X.m1);
    var split = clamp((Math.abs(s.V) + bend) / 0.07, 0, 1);
    show(pEf, 1 - split); show(tEf, 1 - split);
    show(pEfn, split); show(pEfp, split); show(tEfn, split); show(tEfp, split);

    place(tEc, ax(0.80), Y(lerp(b.ecL, b.ecR, 0.80)) - 14);
    place(tEv, ax(0.14), Y(lerp(b.evL, b.evR, 0.14)) + 26);
    place(tEf, ax(0.5) - 10, Y(b.efR) - 10);
    place(tEfn, X.m0, Y(b.efL) - 10);
    place(tEfp, X.end, Y(b.efR) - 10);

    /* light coming in */
    show(sun, s.light);
    sunRays.forEach(function (r, j) {
      var top = Y(lerp(b.ecL, b.ecR, r.u)) - 150, fall = ((t * 0.5 + j * 0.37) % 1) * 26;
      place(r.g, ax(r.u), Math.max(24, top) + fall);
    });

    /* electrons and holes */
    var led = s.inject > 0.002, amount = led ? s.inject : s.light;
    var rate = led ? 0.20 + 0.16 * s.inject : 0.10 + 0.26 * clamp(s.field, 0, 1);
    pairs.forEach(function (q, j) {
      q.ph += dt * rate;
      if (q.ph >= 1) { q.ph -= 1; q.x0 = 0.12 + 0.76 * rnd(); q.xm = 0.3 + 0.4 * rnd(); }
      var w = q.ph, xe, xh, o, glow = 0;
      if (led) {
        var go = ss(0, 0.78, w);
        xe = lerp(-0.24, q.xm, go); xh = lerp(1.24, q.xm, go);
        o = ss(0, 0.08, w) * (1 - ss(0.76, 0.86, w));
        glow = Math.sin(Math.PI * clamp((w - 0.76) / 0.24, 0, 1));
      } else {
        var out = ss(0.08, 1, w);
        xe = lerp(q.x0, -0.24, out); xh = lerp(q.x0, 1.24, out);
        o = ss(0, 0.1, w) * (1 - ss(0.86, 1, w));
      }
      place(q.e, ax(xe), Y(edge(b, 'c', xe)) - 9);
      place(q.h, ax(xh), Y(edge(b, 'v', xh)) + 9);
      show(q.e, o * amount); show(q.h, o * amount);
      var mid = Y((lerp(b.ecL, b.ecR, q.xm) + lerp(b.evL, b.evR, q.xm)) / 2);
      var rise = clamp((w - 0.76) / 0.24, 0, 1) * 70;
      q.ray.setAttribute('transform', 'translate(' + ax(q.xm).toFixed(1) + ' ' + (mid - 18).toFixed(1) + ') rotate(' + q.tilt.toFixed(0) + ') translate(0 ' + (-rise).toFixed(1) + ')');
      show(q.ray, glow * s.inject);
    });

    /* mobile ions and the filament they form */
    var fd = '';
    ions.forEach(function (n, j) {
      var uu = lerp(n.u0, n.u1, s.f) + (still ? 0 : Math.sin(t * 0.9 + n.w) * 0.006 * (1 - s.f));
      var mid = (lerp(b.ecL, b.ecR, uu) + lerp(b.evL, b.evR, uu)) / 2;
      var yy = Y(mid + n.d0 * (1 - s.f)), xx = ax(uu);
      place(n.c, xx, yy); show(n.c, s.ions);
      fd += (j ? 'L' : 'M') + xx.toFixed(1) + ' ' + yy.toFixed(1);
    });
    filament.setAttribute('d', fd); show(filament, s.ions * s.f * s.f);
    place(tIon, ax(0.62), Y(lerp(b.evL, b.evR, 0.62)) + 26);
    show(tIon, s.ions * (1 - s.f) * 0.9);
    var flow = s.f > 0.6 && Math.abs(s.V) > 0.04 ? ss(0.6, 1, s.f) * clamp(Math.abs(s.V) / 0.3, 0, 1) : 0;
    hops.forEach(function (c, j) {
      var w = ((t * 0.42 + j / 3) % 1); if (s.V < 0) w = 1 - w;
      var uu = lerp(0.04, 0.96, w), mid = (lerp(b.ecL, b.ecR, uu) + lerp(b.evL, b.evR, uu)) / 2;
      place(c, ax(uu), Y(mid) - 11); show(c, flow * Math.sin(Math.PI * w));
    });

    /* current-voltage plot */
    var mem = s.m < 0 ? 0 : ss(0.05, 0.11, s.m);
    show(gD, 1 - mem); show(gL, mem);
    if (mem < 1) {
      var jNow = Jd(s.V, s.light), jMax = Math.max(1.5, jNow * 1.18), vA = -0.35, vB = 1.7, jA = -1.5;
      var px = function (v) { return lerp(JX0, JX1, (v - vA) / (vB - vA)); };
      var py = function (j) { return lerp(JY1, JY0, (clamp(j, jA, jMax * 3) - jA) / (jMax - jA)); };
      dAxV.setAttribute('x1', JX0); dAxV.setAttribute('x2', JX1); dAxV.setAttribute('y1', py(0)); dAxV.setAttribute('y2', py(0));
      dAxJ.setAttribute('x1', px(0)); dAxJ.setAttribute('x2', px(0)); dAxJ.setAttribute('y1', JY0); dAxJ.setAttribute('y2', JY1);
      var d1 = '', d2 = '';
      for (k = 0; k <= 60; k++) {
        var v = lerp(vA, vB, k / 60);
        d1 += (k ? 'L' : 'M') + px(v).toFixed(1) + ' ' + py(Jd(v, s.light)).toFixed(1);
        d2 += (k ? 'L' : 'M') + px(v).toFixed(1) + ' ' + py(Jd(v, 0)).toFixed(1);
      }
      dCurve.setAttribute('d', d1); dDark.setAttribute('d', d2); show(dDark, s.light * 0.6);
      place(dVoc, px(VOC), py(0) + 16); place(dJsc, px(0) - 6, py(-1) + 4);
      show(dVoc, s.light); show(dJsc, s.light);
      place(dTv, JX1, py(0) - 6); place(dTj, px(0) + 7, JY0 + 9);
      if (mem < 0.5) { dot.setAttribute('cx', px(s.V)); dot.setAttribute('cy', py(jNow)); }
    }
    if (mem > 0) {
      var upto = clamp((s.m - 0.10) / 0.90, 0, 1) * 180, d3 = '', last = loopPts[0];
      for (k = 0; k <= Math.floor(upto); k++) { d3 += (k ? 'L' : 'M') + loopPts[k][0].toFixed(1) + ' ' + loopPts[k][1].toFixed(1); last = loopPts[k]; }
      lTrace.setAttribute('d', d3 || 'M0 0');
      if (mem >= 0.5) { dot.setAttribute('cx', last[0]); dot.setAttribute('cy', last[1]); }
      show(lSet, ss(0.30, 0.36, s.m)); show(lReset, ss(0.74, 0.80, s.m));
    }

    /* readouts */
    if (thumb) thumb.style.transform = 'translateX(' + ((s.V + VMEM) / (VLED + VMEM) * 100).toFixed(2) + '%)';
    if (lamp) lamp.style.opacity = (0.22 + 0.78 * s.light).toFixed(2);
    if (s.step !== lastStep) {
      lastStep = s.step;
      for (k = 0; k < steps.length; k++) steps[k].classList.toggle('is-on', +steps[k].getAttribute('data-step') === s.step);
      if (stateWord) stateWord.textContent = WORDS[s.step];
      act.setAttribute('data-state', s.step);
    }
  }

  /* ---- run ---------------------------------------------------------------- */
  function progress() {
    var v = parseFloat(act.style.getPropertyValue('--sc-p'));
    if (!isNaN(v)) return clamp(v, 0, 1);
    var r = act.getBoundingClientRect(), span = r.height - window.innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }
  var t0 = performance.now(), tPrev = t0, seen = true, shown = -1;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { seen = en[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(act);
  }
  function frame(now) {
    var dt = Math.min(0.05, (now - tPrev) / 1000); tPrev = now;
    if (seen) {
      var p = progress();
      /* ease the drawing towards the scroll position so a wheel notch glides */
      shown = shown < 0 ? p : shown + (p - shown) * (still ? 1 : Math.min(1, dt * 9));
      if (Math.abs(p - shown) < 0.0004) shown = p;
      draw(stateAt(shown), still ? 0.35 : (now - t0) / 1000, still ? 0 : dt);
    }
    requestAnimationFrame(frame);
  }
  if (still) pairs.forEach(function (q, j) { q.ph = 0.18 + 0.6 * j / N; });
  /* test hook: lets the page be driven to an exact state for screenshots */
  window.NSDGDevice = { draw: function (p) { shown = p; draw(stateAt(p), 0.35, 0); } };
  requestAnimationFrame(frame);
})();
