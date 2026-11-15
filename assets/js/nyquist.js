/* Nyquist: impedance, C–V and J–V analysis in the browser. No data leaves the page.
   Parts: table reader, plots, Mott–Schottky analysis, equivalent-circuit fitting, J–V analysis. */
(function () {
'use strict';
var Q = 1.602176634e-19, KB = 1.380649e-23, EPS0 = 8.8541878128e-14; /* C, J/K, F/cm */

/* ---------- numbers and text ---------- */
function isNum(x) { return typeof x === 'number' && isFinite(x); }
function sup(n) { return String(n).replace(/[-0-9]/g, function (c) { return ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' })[c]; }); }
function sci(x, d) { if (!isNum(x)) return '–'; if (x === 0) return '0'; var e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e); var s = m.toFixed(d == null ? 2 : d); if (Math.abs(parseFloat(s)) >= 10) { e += 1; s = (m / 10).toFixed(d == null ? 2 : d); } return s + ' × 10' + sup(e); }
function fix(x, d) { return isNum(x) ? x.toFixed(d) : '–'; }
var PFX = [[1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f']];
function si(x, unit) { if (!isNum(x)) return '–'; if (x === 0) return '0 ' + unit; var a = Math.abs(x); for (var i = 0; i < PFX.length; i++) if (a >= PFX[i][0] * 0.9995) return (x / PFX[i][0]).toPrecision(4).replace(/\.?0+$/, '') + ' ' + PFX[i][1] + unit; return sci(x) + ' ' + unit; }

/* ---------- table reader ---------- */
function parseTable(text) {
  var lines = String(text).replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && !/^[#%!]/.test(l); });
  if (!lines.length) return null;
  var probe = lines.slice(Math.max(0, lines.length - 12));
  function cnt(ch) { return probe.reduce(function (s, l) { return s + l.split(ch).length - 1; }, 0); }
  var delim = cnt('\t') >= probe.length ? '\t' : cnt(';') >= probe.length ? ';' : cnt(',') >= probe.length ? ',' : null;
  var decComma = delim !== ',' && probe.some(function (l) { return /\d,\d/.test(l); });
  function split(l) { return (delim ? l.split(delim) : l.split(/\s+/)).map(function (t) { return t.trim().replace(/^"|"$/g, ''); }); }
  function num(t) { if (decComma) t = t.replace(',', '.'); return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t) ? parseFloat(t) : NaN; }
  var rows = [], header = null, ncol = 0;
  lines.forEach(function (l) {
    var tk = split(l), v = tk.map(num), nn = v.filter(isNum).length;
    if (nn >= 2 && nn >= tk.length - 1) { rows.push(v); ncol = Math.max(ncol, tk.length); }
    else if (!rows.length && tk.length >= 2) header = tk;
  });
  if (rows.length < 3) return null;
  var cols = []; for (var j = 0; j < ncol; j++) cols.push(rows.map(function (r) { return isNum(r[j]) ? r[j] : NaN; }));
  var heads = []; for (j = 0; j < ncol; j++) heads.push(header && header[j] ? header[j] : 'Column ' + (j + 1));
  return { heads: heads, cols: cols, n: rows.length };
}
var GUESS = {
  f: /freq|^f\b|^f[\s_(/[]|\bhz\b/i, zre: /z'(?!')|z′(?!′)|zre|re\s*\(?z|z[\s_]*real|^z1\b|^r\b|^rs\b/i, zim: /z''|z″|z′′|zim|im\s*\(?z|z[\s_]*imag|^z2\b|^x\b/i,
  zmod: /\|z\||zmod|z[\s_]*mag|^z\b|^z[\s_(/[]/i, ph: /phase|theta|θ|phi|deg/i, v: /volt|bias|^v\b|^v[\s_(/[]|vdc|potential/i, j: /curr|^j\b|^i\b|^j[\s_(/[]|^i[\s_(/[]|amp|ma\b/i, c: /^c\b|^c[\s_(/[]|capac|^cp\b|^cs\b/i
};
function guessCol(t, key, taken) { for (var j = 0; j < t.heads.length; j++) if (taken.indexOf(j) < 0 && GUESS[key].test(t.heads[j])) return j; return -1; }

/* ---------- small numerics ---------- */
function linfit(x, y) { var n = x.length, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0; for (var i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i]; syy += y[i] * y[i]; }
  var d = n * sxx - sx * sx; if (!(Math.abs(d) > 0)) return null; var b = (n * sxy - sx * sy) / d, a = (sy - b * sx) / n; var st = syy - sy * sy / n, sr = 0; for (i = 0; i < n; i++) { var e = y[i] - a - b * x[i]; sr += e * e; }
  return { a: a, b: b, r2: st > 0 ? 1 - sr / st : 1, n: n }; }
function solve(A, b) { var n = b.length, M = A.map(function (r, i) { return r.concat([b[i]]); });
  for (var c = 0; c < n; c++) { var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-300) return null; var t = M[c]; M[c] = M[p]; M[p] = t;
    for (r = c + 1; r < n; r++) { var f = M[r][c] / M[c][c]; for (var k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  var x = new Array(n); for (c = n - 1; c >= 0; c--) { var s = M[c][n]; for (k = c + 1; k < n; k++) s -= M[c][k] * x[k]; x[c] = s / M[c][c]; } return x; }
function invert(A) { var n = A.length, out = []; for (var j = 0; j < n; j++) { var e = new Array(n).fill(0); e[j] = 1; var c = solve(A, e); if (!c) return null; out.push(c); } return out[0].map(function (_, i) { return out.map(function (col) { return col[i]; }); }); }

/* ---------- Mott–Schottky ---------- */
/* V in volts, C in farads, area in cm². Returns 1/C_A² and the straight-line fit over [va, vb]. */
function mottSchottky(V, C, area, epsr, T, va, vb) {
  var eps = epsr * EPS0, idx = V.map(function (_, i) { return i; }).filter(function (i) { return isNum(V[i]) && isNum(C[i]) && C[i] > 0; }).sort(function (a, b) { return V[a] - V[b]; });
  var v = idx.map(function (i) { return V[i]; }), ca = idx.map(function (i) { return C[i] / area; }), y = ca.map(function (c) { return 1 / (c * c); });
  var out = { v: v, ca: ca, y: y, eps: eps };
  if (v.length < 4) return out;
  if (va == null || vb == null) { var w = autoWindow(v, y); va = w[0]; vb = w[1]; }
  out.va = Math.min(va, vb); out.vb = Math.max(va, vb);
  var xs = [], ys = []; for (var i = 0; i < v.length; i++) if (v[i] >= out.va - 1e-12 && v[i] <= out.vb + 1e-12) { xs.push(v[i]); ys.push(y[i]); }
  if (xs.length >= 3) { var f = linfit(xs, ys); if (f && f.b !== 0) { out.fit = f; out.vint = -f.a / f.b; out.vth = KB * T / Q; out.vbi = (f.b < 0 ? out.vint : -out.vint) + out.vth; out.N = 2 / (Q * eps * Math.abs(f.b)); } }
  var i0 = 0; for (i = 1; i < v.length; i++) if (Math.abs(v[i]) < Math.abs(v[i0])) i0 = i;
  out.v0 = v[i0]; out.w0 = eps / ca[i0];
  /* apparent doping profile N(W) = 2 / (q ε |d(1/C²)/dV|), W = ε/C */
  out.pw = []; out.pn = []; for (i = 1; i < v.length - 1; i++) { var dy = (y[i + 1] - y[i - 1]) / (v[i + 1] - v[i - 1]); if (isNum(dy) && dy !== 0) { out.pw.push(eps / ca[i] * 1e7); out.pn.push(2 / (Q * eps * Math.abs(dy))); } }
  return out;
}
/* Longest window with R² ≥ 0.995 (steepest if several of that length); else the best R² among windows of at least a quarter of the points. */
function autoWindow(v, y) {
  var n = v.length, minLen = Math.max(4, Math.round(n / 4)), best = null, fall = null;
  var span = Math.max.apply(null, y) - Math.min.apply(null, y);
  for (var i = 0; i + minLen <= n; i++) for (var j = i + minLen; j <= n; j++) {
    var f = linfit(v.slice(i, j), y.slice(i, j)); if (!f) continue; var rise = Math.abs(f.b) * (v[j - 1] - v[i]);
    if (!fall || f.r2 > fall.r2) fall = { r2: f.r2, i: i, j: j };
    if (f.r2 >= 0.995 && rise > 0.15 * span && (!best || j - i > best.len || (j - i === best.len && rise > best.rise))) best = { len: j - i, rise: rise, i: i, j: j };
  }
  var w = best || fall || { i: 0, j: n }; return [v[w.i], v[w.j - 1]];
}

/* ---------- equivalent circuit ---------- */
/* Grammar: series with "-" or "+", parallel with "|" (binds tighter), brackets. Elements by first letter:
   R resistor, C capacitor, L inductor, Q constant-phase element (Q, n), W Warburg (σ). */
var ELEM = { R: [['', 'Ω']], C: [['', 'F']], L: [['', 'H']], Q: [['', 'S·sⁿ'], ['n', '']], W: [['σ', 'Ω·s⁻¹ᐟ²']] };
function parseCircuit(src) {
  var s = String(src).replace(/\s+/g, ''), pos = 0, names = [];
  function fail(m) { throw new Error(m); }
  function factor() { if (s[pos] === '(') { pos++; var e = series(); if (s[pos] !== ')') fail('A closing bracket is missing.'); pos++; return e; }
    var m = /^[A-Za-z][A-Za-z0-9_]*/.exec(s.slice(pos)); if (!m) fail(pos >= s.length ? 'The circuit ends too early.' : 'Unexpected "' + s[pos] + '" in the circuit.');
    var name = m[0], type = name[0].toUpperCase(); if (!ELEM[type]) fail('Unknown element "' + name + '". Use R, C, L, Q (constant-phase element) or W (Warburg).');
    if (names.indexOf(name) >= 0) fail('The element name "' + name + '" is used twice.'); names.push(name); pos += name.length; return { t: 'e', type: type, name: name }; }
  function par() { var a = [factor()]; while (s[pos] === '|') { pos++; a.push(factor()); } return a.length > 1 ? { t: 'p', k: a } : a[0]; }
  function series() { var a = [par()]; while (s[pos] === '-' || s[pos] === '+') { pos++; a.push(par()); } return a.length > 1 ? { t: 's', k: a } : a[0]; }
  if (!s) fail('Enter a circuit, for example Rs-(R1|C1).');
  var ast = series(); if (pos < s.length) fail('Unexpected "' + s[pos] + '" in the circuit.');
  var params = []; (function walk(n) { if (n.t === 'e') { n.i = params.length; ELEM[n.type].forEach(function (d) { params.push({ el: n.name, type: n.type, sub: d[0], unit: d[1], label: n.name + (d[0] ? ' ' + d[0] : '') }); }); } else n.k.forEach(walk); })(ast);
  return { ast: ast, params: params, src: s };
}
function zOf(n, w, p) { /* returns [re, im] */
  if (n.t === 'e') { var a = p[n.i];
    if (n.type === 'R') return [a, 0]; if (n.type === 'C') return [0, -1 / (w * a)]; if (n.type === 'L') return [0, w * a];
    if (n.type === 'Q') { var nn = p[n.i + 1], m = 1 / (a * Math.pow(w, nn)), th = -nn * Math.PI / 2; return [m * Math.cos(th), m * Math.sin(th)]; }
    var s = a / Math.sqrt(w); return [s, -s]; }
  var i, z;
  if (n.t === 's') { var re = 0, im = 0; for (i = 0; i < n.k.length; i++) { z = zOf(n.k[i], w, p); re += z[0]; im += z[1]; } return [re, im]; }
  var yr = 0, yi = 0; for (i = 0; i < n.k.length; i++) { z = zOf(n.k[i], w, p); var d = z[0] * z[0] + z[1] * z[1]; yr += z[0] / d; yi -= z[1] / d; }
  var dd = yr * yr + yi * yi; return [yr / dd, -yi / dd];
}
/* Starting values from the data: series resistance from the smallest Z′, the remaining resistance shared by the arcs,
   time constants from the peaks of −Z″ (or spread over the frequency range). shift moves the time constants. */
function guessParams(ck, f, zre, zim, shift) {
  var n = f.length, ord = f.map(function (_, i) { return i; }).sort(function (a, b) { return f[b] - f[a]; });
  var rs = Math.max(Math.min.apply(null, zre), 1e-6 * Math.max.apply(null, zre)), rtot = Math.max(Math.max.apply(null, zre) - rs, rs * 1e-3);
  var groups = [], lone = [], seriesR = [];
  (function walk(nd, inPar) { if (nd.t === 'e') { if (!inPar) (nd.type === 'R' ? seriesR : lone).push(nd); return; }
    if (nd.t === 'p') { var g = { R: [], X: [] }; (function col(m) { if (m.t === 'e') (m.type === 'R' ? g.R : g.X).push(m); else m.k.forEach(col); })(nd); groups.push(g); return; }
    nd.k.forEach(function (c) { walk(c, inPar); }); })(ck.ast, false);
  var peaks = []; for (var k = 2; k < n - 2; k++) { var y = -zim[ord[k]]; if (y > 0 && y >= -zim[ord[k - 1]] && y >= -zim[ord[k + 1]] && y > -zim[ord[k - 2]] && y > -zim[ord[k + 2]]) { if (!peaks.length || Math.log10(peaks[peaks.length - 1] / f[ord[k]]) > 0.7) peaks.push(f[ord[k]]); } }
  var lf = f.map(Math.log10), lo = Math.min.apply(null, lf), hi = Math.max.apply(null, lf), ng = Math.max(groups.length, 1);
  var fg = []; for (k = 0; k < ng; k++) fg.push(peaks.length >= ng ? peaks[Math.round(k * (peaks.length - 1) / Math.max(ng - 1, 1))] : Math.pow(10, hi - (k + 0.5) * (hi - lo) / ng));
  var p = new Array(ck.params.length).fill(1);
  seriesR.forEach(function (e, i) { p[e.i] = i === 0 ? rs : rtot / (seriesR.length + groups.length); });
  var nArcR = groups.reduce(function (s, g) { return s + (g.R.length ? 1 : 0); }, 0) || 1;
  groups.forEach(function (g, gi) { var R = rtot / nArcR, tau = 1 / (2 * Math.PI * fg[gi]) * Math.pow(10, (shift || 0) * (gi % 2 ? -1 : 1));
    g.R.forEach(function (e, i) { p[e.i] = R / g.R.length * (i ? 0.5 : 1); });
    g.X.forEach(function (e) { if (e.type === 'C') p[e.i] = tau / R; else if (e.type === 'L') p[e.i] = R * tau; else if (e.type === 'Q') { p[e.i + 1] = 0.9; p[e.i] = Math.pow(tau, 0.9) / R; } else p[e.i] = R * Math.sqrt(2 * Math.PI * fg[gi]); }); });
  var wmin = 2 * Math.PI * Math.pow(10, lo);
  lone.forEach(function (e) { if (e.type === 'C') p[e.i] = 1 / (wmin * rtot); else if (e.type === 'L') p[e.i] = rs / (2 * Math.PI * Math.pow(10, hi)) * 0.1; else if (e.type === 'Q') { p[e.i + 1] = 0.9; p[e.i] = 1 / (Math.pow(wmin, 0.9) * rtot); } else p[e.i] = rtot * Math.sqrt(wmin) * 0.3; });
  return p;
}
/* Levenberg–Marquardt in log-parameters (all quantities are positive). weight: 'mod' divides residuals by |Z|, 'unit' does not. */
function fitCircuit(ck, f, zre, zim, p0, fixed, weight) {
  var n = f.length, np = p0.length, free = []; for (var i = 0; i < np; i++) if (!fixed[i]) free.push(i);
  var w = f.map(function (x) { return 2 * Math.PI * x; }), wt = f.map(function (_, k) { return weight === 'unit' ? 1 : Math.max(Math.hypot(zre[k], zim[k]), 1e-300); });
  var isN = ck.params.map(function (d) { return d.sub === 'n'; });
  function clamp(p) { for (var i = 0; i < np; i++) { if (!(p[i] > 1e-300)) p[i] = 1e-300; if (isN[i]) p[i] = Math.min(1, Math.max(0.2, p[i])); } return p; }
  function resid(p) { var r = new Array(2 * n); for (var k = 0; k < n; k++) { var z = zOf(ck.ast, w[k], p); r[2 * k] = (z[0] - zre[k]) / wt[k]; r[2 * k + 1] = (z[1] - zim[k]) / wt[k]; } return r; }
  function ss(r) { var s = 0; for (var k = 0; k < r.length; k++) s += r[k] * r[k]; return s; }
  function jac(p) { var J = []; free.forEach(function (i) { var a = p.slice(), b = p.slice(), h = 1e-5; a[i] = p[i] * Math.exp(h); b[i] = p[i] * Math.exp(-h); var ra = resid(a), rb = resid(b); J.push(ra.map(function (v, k) { return (v - rb[k]) / (2 * h); })); }); return J; }
  function normal(J, r) { var m = free.length, A = [], g = []; for (var a = 0; a < m; a++) { A.push(new Array(m)); var s = 0; for (var k = 0; k < r.length; k++) s += J[a][k] * r[k]; g.push(s); for (var b = 0; b <= a; b++) { s = 0; for (k = 0; k < r.length; k++) s += J[a][k] * J[b][k]; A[a][b] = s; A[b][a] = s; } } return { A: A, g: g }; }
  var p = clamp(p0.slice()), r = resid(p), s0 = ss(r), lam = 1e-3, it = 0;
  if (!isFinite(s0)) return null;
  for (; it < 300 && free.length; it++) {
    var N = normal(jac(p), r), done = false;
    for (var tr = 0; tr < 12; tr++) {
      var A = N.A.map(function (row, a) { var c = row.slice(); c[a] += lam * (row[a] || 1e-12); return c; }), d = solve(A, N.g.map(function (x) { return -x; }));
      if (d) { var q = p.slice(); free.forEach(function (i, a) { q[i] = p[i] * Math.exp(Math.max(-3, Math.min(3, d[a]))); }); clamp(q); var rq = resid(q), s1 = ss(rq);
        if (isFinite(s1) && s1 < s0) { var rel = (s0 - s1) / s0; p = q; r = rq; s0 = s1; lam = Math.max(lam / 5, 1e-12); if (rel < 1e-10) done = true; break; } }
      lam *= 6; if (tr === 11) done = true;
    }
    if (done) break;
  }
  var dof = Math.max(2 * n - free.length, 1), err = new Array(np).fill(NaN);
  if (free.length) { var cov = invert(normal(jac(p), r).A); if (cov) free.forEach(function (i, a) { var v = cov[a][a] * s0 / dof; err[i] = v >= 0 ? Math.sqrt(v) : NaN; }); }
  return { p: p, err: err, chi2: s0 / dof, iter: it, n: n };
}
function fitBest(ck, f, zre, zim, fixed, weight, start, keep) {
  var best = null, starts = start ? [start] : [0, 1, -1, 2].map(function (sh) { var g = guessParams(ck, f, zre, zim, sh); if (keep) fixed.forEach(function (fx, i) { if (fx && keep[i] > 0) g[i] = keep[i]; }); return g; });
  starts.forEach(function (p0) { var r = fitCircuit(ck, f, zre, zim, p0, fixed, weight); if (r && (!best || r.chi2 < best.chi2)) best = r; });
  return best;
}
/* Quantities derived for each parallel branch that holds one resistor and one C or Q. */
function derived(ck, p) { var out = [];
  (function walk(n) { if (n.t === 'e') return; if (n.t === 'p') { var R = n.k.filter(function (e) { return e.t === 'e' && e.type === 'R'; }), X = n.k.filter(function (e) { return e.t === 'e' && (e.type === 'C' || e.type === 'Q'); });
      if (R.length === 1 && X.length === 1 && n.k.length === 2) { var r = p[R[0].i], x = X[0], c = x.type === 'C' ? p[x.i] : Math.pow(p[x.i] * Math.pow(r, 1 - p[x.i + 1]), 1 / p[x.i + 1]); out.push({ name: R[0].name + '|' + x.name, C: c, tau: r * c, f: 1 / (2 * Math.PI * r * c), cpe: x.type === 'Q' }); } }
    n.k.forEach(walk); })(ck.ast); return out; }

/* ---------- J–V analysis ---------- */
function interp(x, y, x0) { for (var i = 1; i < x.length; i++) if ((x[i - 1] - x0) * (x[i] - x0) <= 0 && x[i] !== x[i - 1]) return y[i - 1] + (y[i] - y[i - 1]) * (x0 - x[i - 1]) / (x[i] - x[i - 1]); return NaN; }
function nearest(x, x0, m) { var idx = x.map(function (_, i) { return i; }).sort(function (a, b) { return Math.abs(x[a] - x0) - Math.abs(x[b] - x0); }).slice(0, m).sort(function (a, b) { return a - b; }); return idx; }
/* Splits a file into sweeps wherever the voltage changes direction. Each sweep is returned sorted by rising voltage. */
function jvSweeps(V, J) { var pts = []; for (var i = 0; i < V.length; i++) if (isNum(V[i]) && isNum(J[i])) pts.push([V[i], J[i]]); var out = [], cur = [], dir = 0;
  pts.forEach(function (p) { if (cur.length) { var d = Math.sign(p[0] - cur[cur.length - 1][0]); if (d !== 0 && dir !== 0 && d !== dir) { out.push({ dir: dir, pts: cur }); cur = [cur[cur.length - 1]]; dir = d; } else if (d !== 0) dir = d; } cur.push(p); });
  if (cur.length) out.push({ dir: dir, pts: cur });
  return out.filter(function (s) { return s.pts.length >= 5; }).map(function (s) { var q = s.pts.slice().sort(function (a, b) { return a[0] - b[0]; }); return { dir: s.dir, v: q.map(function (p) { return p[0]; }), j: q.map(function (p) { return p[1]; }) }; }); }
/* Illuminated curve. v in V, j in mA/cm², pin in mW/cm². The curve is turned so that J_SC and V_OC are positive. */
function jvLight(v, j, pin) { var o = { v: v.slice(), j: j.slice() }, j0 = interp(o.v, o.j, 0), extrap = false;
  if (!isNum(j0)) { var k = nearest(o.v, 0, 2), f0 = linfit(k.map(function (i) { return o.v[i]; }), k.map(function (i) { return o.j[i]; })); j0 = f0 ? f0.a : NaN; extrap = true; }
  if (!isNum(j0) || j0 === 0) return { error: 'The current at zero voltage could not be found.' };
  if (j0 < 0) o.j = o.j.map(function (x) { return -x; });
  function cross() { for (var i = 1; i < o.v.length; i++) if (o.j[i - 1] > 0 && o.j[i] <= 0) return o.v[i - 1] + (o.v[i] - o.v[i - 1]) * o.j[i - 1] / (o.j[i - 1] - o.j[i]); return NaN; }
  var voc = cross(); if (!isNum(voc)) { o.v = o.v.map(function (x) { return -x; }).reverse(); o.j.reverse(); voc = cross(); }
  if (!isNum(voc) || !(voc > 0)) return { error: 'The curve does not cross J = 0, so V_OC cannot be found. Check that this is an illuminated curve that extends beyond V_OC.' };
  o.voc = voc; o.jsc = Math.abs(j0); o.extrap = extrap;
  var im = -1, pm = -Infinity; for (var i = 0; i < o.v.length; i++) { if (o.v[i] < 0 || o.v[i] > voc) continue; var pw = o.v[i] * o.j[i]; if (pw > pm) { pm = pw; im = i; } }
  if (im < 0) return { error: 'No points lie between short circuit and open circuit.' };
  o.vmpp = o.v[im]; if (im > 0 && im < o.v.length - 1) { var x1 = o.v[im - 1], x2 = o.v[im], x3 = o.v[im + 1], y1 = x1 * o.j[im - 1], y2 = pm, y3 = x3 * o.j[im + 1], den = (x1 - x2) * (x1 - x3) * (x2 - x3), A = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / den, B = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / den; if (A < 0) { var xv = -B / (2 * A); if (xv > x1 && xv < x3) { var C0 = y1 - A * x1 * x1 - B * x1; o.vmpp = xv; pm = A * xv * xv + B * xv + C0; } } }
  o.pmax = pm; o.jmpp = pm / o.vmpp; o.ff = pm / (o.voc * o.jsc); o.pce = pm / pin * 100;
  function slopeR(x0) { var k = nearest(o.v, x0, 5); if (x0 === 0) { var wide = o.v.map(function (_, i) { return i; }).filter(function (i) { return Math.abs(o.v[i]) <= 0.2 * voc; }); if (wide.length > 5) k = wide; } var f = linfit(k.map(function (i) { return o.v[i]; }), k.map(function (i) { return o.j[i]; })); return f && f.b < 0 ? -1000 / f.b : NaN; } /* Ω cm² */
  o.rs = slopeR(voc); o.rsh = slopeR(0); return o; }
/* Dark curve. v in V, j in mA/cm². Forward bias is taken as the polarity with the larger current.
   G(V) = d ln J / d ln V; its peak is the diffusion-to-drift transition voltage V_α (Andrabi and Mallajosyula, Sol. Energy 264, 112020 (2023)). */
function jvDark(v, j, T) { var o = { v: v.slice(), j: j.slice() }, vt = KB * T / Q, i;
  var mp = 0, mn = 0; for (i = 0; i < o.v.length; i++) { if (o.v[i] > 0) mp = Math.max(mp, Math.abs(o.j[i])); else if (o.v[i] < 0) mn = Math.max(mn, Math.abs(o.j[i])); }
  if (mn > mp) { o.v = o.v.map(function (x) { return -x; }).reverse(); o.j.reverse(); }
  var jz = interp(o.v, o.j, 0); if (isNum(jz) && interp(o.v, o.j, Math.max.apply(null, o.v)) < 0) o.j = o.j.map(function (x) { return -x; });
  o.ja = o.j.map(Math.abs);
  var k0 = nearest(o.v, 0, 5), f0 = linfit(k0.map(function (i) { return o.v[i]; }), k0.map(function (i) { return o.j[i]; })); o.rsh = f0 && f0.b > 0 && Math.max.apply(null, k0.map(function (i) { return Math.abs(o.v[i]); })) < 0.3 ? 1000 / f0.b : NaN;
  var fv = [], fj = []; for (i = 0; i < o.v.length; i++) if (o.v[i] > 0 && o.j[i] > 0) { fv.push(o.v[i]); fj.push(o.j[i]); }
  if (fv.length < 8) { o.error = 'Fewer than eight forward-bias points with positive current.'; return o; }
  var lv = fv.map(Math.log), lj = fj.map(Math.log), h = 2; o.gv = []; o.g = []; o.nv = []; o.n = [];
  for (i = h; i < fv.length - h; i++) { var a = linfit(lv.slice(i - h, i + h + 1), lj.slice(i - h, i + h + 1)), b = linfit(fv.slice(i - h, i + h + 1), lj.slice(i - h, i + h + 1)); if (a) { o.gv.push(fv[i]); o.g.push(a.b); } if (b && b.b > 0) { o.nv.push(fv[i]); o.n.push(1 / (vt * b.b)); } }
  var ig = 0; for (i = 1; i < o.g.length; i++) if (o.g[i] > o.g[ig]) ig = i;
  o.valpha = o.gv[ig]; o.gmax = o.g[ig]; o.edge = ig === 0 || ig === o.g.length - 1;
  if (!o.edge) { var y1 = o.g[ig - 1], y2 = o.g[ig], y3 = o.g[ig + 1], x1 = o.gv[ig - 1], x2 = o.gv[ig], x3 = o.gv[ig + 1], den = (x1 - x2) * (x1 - x3) * (x2 - x3), A = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / den, B = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / den; if (A < 0) { var xv = -B / (2 * A); if (xv > x1 && xv < x3) { o.valpha = xv; o.gmax = y1 + A * (xv * xv - x1 * x1) + B * (xv - x1); } } }
  if (o.n.length) { var im = 0; for (i = 1; i < o.n.length; i++) if (o.n[i] < o.n[im]) im = i; var lo = im, hi = im; while (lo > 0 && o.n[lo - 1] <= 1.15 * o.n[im]) lo--; while (hi < o.n.length - 1 && o.n[hi + 1] <= 1.15 * o.n[im]) hi++;
    var xs = [], ys = []; for (i = 0; i < fv.length; i++) if (fv[i] >= o.nv[lo] - 1e-12 && fv[i] <= o.nv[hi] + 1e-12) { xs.push(fv[i]); ys.push(lj[i]); } var ff = xs.length >= 3 ? linfit(xs, ys) : null;
    if (ff && ff.b > 0) { o.nid = 1 / (vt * ff.b); o.j0 = Math.exp(ff.a); o.fa = xs[0]; o.fb = xs[xs.length - 1]; o.fr2 = ff.r2; } }
  var kt = []; for (i = Math.max(0, fv.length - 5); i < fv.length; i++) kt.push(i); var ft = linfit(kt.map(function (i) { return fv[i]; }), kt.map(function (i) { return fj[i]; })); o.rs = ft && ft.b > 0 ? 1000 / ft.b : NaN;
  o.fv = fv; o.fj = fj; return o; }

var Core = { parseTable: parseTable, mottSchottky: mottSchottky, parseCircuit: parseCircuit, zOf: zOf, guessParams: guessParams, fitCircuit: fitCircuit, fitBest: fitBest, derived: derived, jvSweeps: jvSweeps, jvLight: jvLight, jvDark: jvDark, linfit: linfit, EPS0: EPS0, Q: Q, KB: KB };
if (typeof module !== 'undefined' && module.exports) { module.exports = Core; return; }
window.NyquistCore = Core;

/* =====================================================================  page  ===================================================================== */
var root = document.getElementById('nyq'); if (!root) return;
function $(s, el) { return (el || root).querySelector(s); }
function $$(s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
function val(id) { var v = parseFloat($('#' + id).value); return isFinite(v) ? v : NaN; }
function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; }

/* ---------- plots ---------- */
function niceTicks(lo, hi, n) { var span = hi - lo; if (!(span > 0)) { span = Math.abs(lo) || 1; lo -= span / 2; hi += span / 2; span = hi - lo; }
  var step = Math.pow(10, Math.floor(Math.log10(span / n))), e = span / n / step; step *= e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1; var t = []; for (var v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) t.push(Math.abs(v) < step * 1e-9 ? 0 : v); return { t: t, step: step }; }
function plot(host, o) {
  var W = o.w || 520, H = o.h || 340, m = { l: 62, r: 16, t: 14, b: 46 }, ink = css('--ink'), muted = css('--muted'), line = css('--line'), font = 'Inter, system-ui, sans-serif';
  var pw = W - m.l - m.r, ph = H - m.t - m.b, S = o.series.filter(function (s) { return s.x.length; });
  function tr(v, log) { return log ? Math.log10(v) : v; }
  function range(key, log) { var lo = Infinity, hi = -Infinity; S.forEach(function (s) { s[key].forEach(function (v) { if (!isNum(v) || (log && !(v > 0))) return; v = tr(v, log); if (v < lo) lo = v; if (v > hi) hi = v; }); }); if (lo === Infinity) { lo = 0; hi = 1; } if (lo === hi) { lo -= 0.5; hi += 0.5; } return [lo, hi]; }
  var xr = range('x', o.xlog), yr = range('y', o.ylog);
  if (o.zero) { if (yr[0] > 0) yr[0] = 0; if (o.zero === 'xy' && xr[0] > 0) xr[0] = 0; }
  function pad(r, log) { var p = (r[1] - r[0]) * 0.05; return log ? [Math.floor(r[0] - 1e-9), Math.ceil(r[1] + 1e-9)] : [r[0] - (o.zero && r[0] === 0 ? 0 : p), r[1] + p]; }
  xr = pad(xr, o.xlog); yr = pad(yr, o.ylog);
  if (o.equal) { var ux = (xr[1] - xr[0]) / pw, uy = (yr[1] - yr[0]) / ph, u = Math.max(ux, uy); xr[1] = xr[0] + u * pw; yr[1] = yr[0] + u * ph; }
  function X(v) { return m.l + (tr(v, o.xlog) - xr[0]) / (xr[1] - xr[0]) * pw; }
  function Y(v) { return m.t + ph - (tr(v, o.ylog) - yr[0]) / (yr[1] - yr[0]) * ph; }
  var g = '';
  function axis(r, log, isX) { var out = '', exp = 0, tk;
    if (log) { tk = []; var st = Math.max(1, Math.ceil((r[1] - r[0]) / 8)); for (var e = Math.ceil(r[0]); e <= r[1] + 1e-9; e += st) tk.push(e); }
    else { tk = niceTicks(r[0], r[1], isX ? 5 : 5).t; var mx = Math.max(Math.abs(r[0]), Math.abs(r[1])); if (mx >= 1e4 || (mx < 1e-2 && mx > 0)) exp = Math.floor(Math.log10(mx)); }
    tk.forEach(function (v) { var pos = isX ? m.l + (v - r[0]) / (r[1] - r[0]) * pw : m.t + ph - (v - r[0]) / (r[1] - r[0]) * ph; if (pos < (isX ? m.l : m.t) - 0.5 || pos > (isX ? m.l + pw : m.t + ph) + 0.5) return;
      var lab = log ? '10<tspan dy="-5" font-size="9">' + (v < 0 ? '−' + (-v) : v) + '</tspan>' : String(+(v / Math.pow(10, exp)).toPrecision(6)).replace('-', '−');
      out += isX ? '<line x1="' + pos + '" x2="' + pos + '" y1="' + m.t + '" y2="' + (m.t + ph) + '" stroke="' + line + '"/><text x="' + pos + '" y="' + (m.t + ph + 16) + '" text-anchor="middle">' + lab + '</text>'
                 : '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + pos + '" y2="' + pos + '" stroke="' + line + '"/><text x="' + (m.l - 7) + '" y="' + (pos + 4) + '" text-anchor="end">' + lab + '</text>'; });
    return { svg: out, exp: exp }; }
  var ax = axis(xr, o.xlog, true), ay = axis(yr, o.ylog, false);
  function lab(t, e) { return esc(t) + (e ? ' <tspan>(×10</tspan><tspan dy="-5" font-size="9">' + String(e).replace('-', '−') + '</tspan><tspan dy="5">)</tspan>' : ''); }
  g += '<g font-family="' + font + '" font-size="11" fill="' + muted + '">' + ax.svg + ay.svg + '</g>';
  if (o.band) g += '<rect x="' + X(o.band[0]) + '" y="' + m.t + '" width="' + Math.max(0, X(o.band[1]) - X(o.band[0])) + '" height="' + ph + '" fill="' + css('--accent') + '" opacity=".08"/>';
  g += '<rect x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="none" stroke="' + muted + '"/>';
  g += '<clipPath id="' + host.id + 'c"><rect x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '"/></clipPath><g clip-path="url(#' + host.id + 'c)">';
  S.forEach(function (s) { var col = css(s.color || '--accent'), pts = []; for (var i = 0; i < s.x.length; i++) { var a = s.x[i], b = s.y[i]; if (!isNum(a) || !isNum(b) || (o.xlog && !(a > 0)) || (o.ylog && !(b > 0))) continue; pts.push([X(a), Y(b)]); }
    if (s.line) g += '<polyline fill="none" stroke="' + col + '" stroke-width="' + (s.width || 2) + '"' + (s.dash ? ' stroke-dasharray="5 4"' : '') + ' points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>';
    else pts.forEach(function (p) { g += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (s.r || 2.6) + '" fill="' + (s.hollow ? 'none' : col) + '" stroke="' + col + '" stroke-width="1.2"/>'; }); });
  g += '</g><g font-family="' + font + '" font-size="12.5" fill="' + ink + '"><text x="' + (m.l + pw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + lab(o.xlabel, ax.exp) + '</text><text transform="translate(15 ' + (m.t + ph / 2) + ') rotate(-90)" text-anchor="middle">' + lab(o.ylabel, ay.exp) + '</text></g>';
  var leg = S.filter(function (s) { return s.label; }); if (leg.length > 1) { var lx = m.l + 10, ly = m.t + (o.legend === 'bottom' ? ph - 8 - (leg.length - 1) * 16 : 16); if (o.legend === 'right') lx = m.l + pw - 120;
    leg.forEach(function (s, i) { var col = css(s.color || '--accent'), y = ly + i * 16; g += (s.line ? '<line x1="' + lx + '" x2="' + (lx + 18) + '" y1="' + (y - 4) + '" y2="' + (y - 4) + '" stroke="' + col + '" stroke-width="2"/>' : '<circle cx="' + (lx + 9) + '" cy="' + (y - 4) + '" r="3" fill="' + col + '"/>') + '<text x="' + (lx + 24) + '" y="' + y + '" font-family="' + font + '" font-size="11.5" fill="' + ink + '">' + esc(s.label) + '</text>'; }); }
  host.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.ylabel + ' against ' + o.xlabel) + '">' + g + '</svg>';
}
function download(name, text, mime) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
root.addEventListener('click', function (e) { var b = e.target.closest('[data-svg]'); if (!b) return; var host = document.getElementById(b.getAttribute('data-svg')), svg = host && host.querySelector('svg'); if (!svg) return;
  var c = svg.cloneNode(true); var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', css('--surface')); c.insertBefore(bg, c.firstChild);
  download(b.getAttribute('data-svg') + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + c.outerHTML, 'image/svg+xml'); });

/* ---------- tabs ---------- */
$$('.nyq-tabs button').forEach(function (b) { b.addEventListener('click', function () { $$('.nyq-tabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); }); $$('.nyq-pane').forEach(function (p) { p.hidden = p.id !== b.getAttribute('data-pane'); }); redraw(); }); });

/* ---------- data sets (one per tab) ---------- */
var sets = {};
function dataset(key, roles, onChange) {
  var box = $('#' + key + '-data'), st = { table: null, map: {}, name: '' }; sets[key] = st;
  box.innerHTML = '<div class="nyq-load"><label class="btn btn-ghost nyq-file">Open data file<input type="file" accept=".csv,.txt,.dat,.tsv,.z,.mpt,text/*" hidden></label><button type="button" class="btn btn-ghost" data-act="paste">Paste data</button>' + (Array.isArray(EXAMPLE[key]) ? '<select class="nyq-samples" aria-label="Sample data"><option value="">Load sample data…</option>' + EXAMPLE[key].map(function (x, i) { return '<option value="' + i + '">' + x.name + '</option>'; }).join('') + '</select>' : '<button type="button" class="btn btn-ghost" data-act="example">Load example</button>') + '</div>' +
    '<textarea class="nyq-paste" rows="5" hidden placeholder="Paste the columns here, then press Read"></textarea><button type="button" class="btn nyq-read" hidden>Read</button><p class="nyq-status muted small" role="status">No data loaded. Text files with columns separated by commas, tabs, semicolons or spaces are accepted.</p><div class="nyq-cols"></div>';
  var status = $('.nyq-status', box), cols = $('.nyq-cols', box), ta = $('.nyq-paste', box), rd = $('.nyq-read', box);
  function load(text, name) { var t = parseTable(text); if (!t) { status.textContent = 'This file could not be read as a table of numbers. It needs at least two columns and three rows.'; status.className = 'nyq-status small nyq-bad'; return; }
    st.table = t; st.name = name; var taken = []; st.map = {};
    roles.forEach(function (r) { var j = guessCol(t, r.key, taken); if (j < 0 && !r.optional) { for (var k = 0; k < t.heads.length; k++) if (taken.indexOf(k) < 0) { j = k; break; } } st.map[r.key] = j; if (j >= 0) taken.push(j); });
    status.className = 'nyq-status muted small'; status.textContent = name + ': ' + t.n + ' rows, ' + t.heads.length + ' columns. Check that each quantity below points to the right column.';
    cols.innerHTML = roles.map(function (r) { return '<label class="nyq-f"><span>' + r.label + '</span><select data-role="' + r.key + '">' + (r.optional ? '<option value="-1">none</option>' : '') + t.heads.map(function (h, j) { return '<option value="' + j + '"' + (st.map[r.key] === j ? ' selected' : '') + '>' + esc(h) + '</option>'; }).join('') + '</select></label>'; }).join('');
    $$('select', cols).forEach(function (s) { s.addEventListener('change', function () { st.map[s.getAttribute('data-role')] = parseInt(s.value, 10); onChange(false); }); });
    onChange(true); }
  $('input[type=file]', box).addEventListener('change', function (e) { var fl = e.target.files[0]; if (!fl) return; var r = new FileReader(); r.onload = function () { load(r.result, fl.name); }; r.readAsText(fl); e.target.value = ''; });
  box.addEventListener('dragover', function (e) { e.preventDefault(); }); box.addEventListener('drop', function (e) { e.preventDefault(); var fl = e.dataTransfer.files[0]; if (!fl) return; var r = new FileReader(); r.onload = function () { load(r.result, fl.name); }; r.readAsText(fl); });
  $('[data-act=paste]', box).addEventListener('click', function () { ta.hidden = !ta.hidden; rd.hidden = ta.hidden; if (!ta.hidden) ta.focus(); });
  rd.addEventListener('click', function () { load(ta.value, 'Pasted data'); });
  var exb = $('[data-act=example]', box), exs = $('.nyq-samples', box);
  if (exb) exb.addEventListener('click', function () { load(EXAMPLE[key](), 'Example data'); });
  if (exs) exs.addEventListener('change', function () { var x = EXAMPLE[key][+exs.value]; if (exs.value === '' || !x) return; if (x.before) x.before(); load(x.text(), 'Sample data, ' + x.name.toLowerCase()); });
  st.col = function (k) { var j = st.map[k]; return st.table && j >= 0 ? st.table.cols[j] : null; };
  st.load = load; return st;
}
function sample() { return { area: val('s-area'), epsr: val('s-eps'), T: val('s-T'), d: val('s-d') }; }
function sampleOK(msgEl) { var s = sample(); if (!(s.area > 0) || !(s.epsr > 0) || !(s.T > 0)) { msgEl.innerHTML = '<p class="nyq-bad">Enter the device area, the relative permittivity and the temperature in the Sample box above.</p>'; return null; } return s; }
function rows(list) { return '<dl class="nyq-res">' + list.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>'; }
function notes(list) { return list.length ? '<ul class="nyq-notes">' + list.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' : ''; }

/* ---------- example data (synthetic) ---------- */
function noise(i) { var x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }
var EXAMPLE = {
  ms: function () { var sm = sample(), o = 'Voltage (V)\tCapacitance (F)\n', eps = (sm.epsr > 0 ? sm.epsr : 11.7) * EPS0, N = 2e16, vbi = 0.75, A = sm.area > 0 ? sm.area : 0.1; for (var i = 0; i <= 40; i++) { var v = -2 + i * 0.065, c = A * Math.sqrt(Q * eps * N / (2 * (vbi - v - 0.0259))); o += v.toFixed(3) + '\t' + (c * (1 + 0.004 * noise(i))).toExponential(5) + '\n'; } return o; },
  eis: [
    { name: 'One semicircle', circuit: 'Rs-(R1|C1)', p: [15, 600, 4e-8], lo: 1, hi: 6 },
    { name: 'Two unequal semicircles', circuit: 'Rs-(R1|Q1)-(R2|Q2)', p: [12, 180, 2.2e-7, 0.92, 520, 6e-5, 0.88], lo: -1, hi: 6 },
    { name: 'Semicircle with an inductive loop', circuit: 'Rs-(R1|Q1|(R2-L2))', p: [10, 400, 1.2e-7, 0.93, 600, 400], lo: -2, hi: 6 }
  ].map(function (x) { x.before = function () { $('#eis-ckt').value = x.circuit; $('#eis-preset').value = $('#eis-preset option[value="' + x.circuit + '"]') ? x.circuit : ''; };
    x.text = function () { var ck = parseCircuit(x.circuit), o = 'Frequency (Hz)\tZ\' (Ohm)\t-Z\'\' (Ohm)\n', n = Math.round((x.hi - x.lo) * 10); for (var i = 0; i <= n; i++) { var f = Math.pow(10, x.hi - i * 0.1), z = zOf(ck.ast, 2 * Math.PI * f, x.p), m = Math.hypot(z[0], z[1]); o += f.toExponential(4) + '\t' + (z[0] + 0.004 * m * noise(i)).toExponential(5) + '\t' + (-z[1] + 0.004 * m * noise(i + 99)).toExponential(5) + '\n'; } return o; }; return x; }),
  jv: (function () {
    /* single-diode model, solved for J at each V; J in mA/cm² */
    function diode(v, P) { var jj = 0, vt = 0.02585; for (var it = 0; it < 300; it++) { var vd = v - jj * P.rs * 1e-3, e = Math.exp(Math.min(vd / (P.n * vt), 60)), F = P.j0 * (e - 1) + vd / P.rsh * 1e3 - P.jph - jj, dF = -P.j0 * e * P.rs * 1e-3 / (P.n * vt) - P.rs / P.rsh - 1, st = F / dF; jj -= st; if (Math.abs(st) < 1e-12) break; } return jj; }
    function sweep(P, va, vb, n, seed) { var o = ''; for (var i = 0; i <= n; i++) { var v = va + (vb - va) * i / n, jj = diode(v, P); o += v.toFixed(4) + '\t' + (jj * (1 + 0.002 * noise(i + seed)) + 0.004 * (P.jph ? 1 : 0) * noise(i + seed + 50)).toExponential(5) + '\n'; } return o; }
    var rev = { jph: 22.4, j0: 2e-9, n: 1.6, rs: 4, rsh: 2500 }, fwd = { jph: 22.3, j0: 6e-9, n: 1.6, rs: 6.5, rsh: 1400 }, dark = { jph: 0, j0: 2e-9, n: 1.6, rs: 4, rsh: 4e5 }, head = 'Voltage (V)\tCurrent density (mA/cm2)\n';
    return [
      { name: 'Illuminated, one sweep', mode: 'light', text: function () { return head + sweep(rev, -0.1, 1.15, 62, 3); } },
      { name: 'Illuminated, reverse and forward sweeps', mode: 'light', text: function () { return head + sweep(rev, 1.15, -0.1, 62, 3) + sweep(fwd, -0.1, 1.15, 62, 31).split('\n').slice(1).join('\n'); } },
      { name: 'Dark', mode: 'dark', text: function () { return head + sweep(dark, -0.5, 1.5, 100, 11); } }
    ].map(function (x) { x.before = function () { $('#jv-mode').value = x.mode; $('#jv-ju').value = '1'; }; return x; });
  })()
};

/* ---------- 1. Mott–Schottky ---------- */
var msRes = null;
var msSet = dataset('ms', [{ key: 'v', label: 'Voltage' }, { key: 'c', label: 'Capacitance' }], function (fresh) { if (fresh) { $('#ms-va').value = ''; $('#ms-vb').value = ''; } runMS(); });
function runMS() {
  var out = $('#ms-out'), V = msSet.col('v'), C = msSet.col('c'); msRes = null; if (!V || !C) { out.innerHTML = ''; drawMS(); return; }
  var s = sampleOK(out); if (!s) { drawMS(); return; }
  var cu = parseFloat($('#ms-cu').value), va = val('ms-va'), vb = val('ms-vb'), auto = !isNum(va) || !isNum(vb);
  var r = mottSchottky(V, C.map(function (c) { return c * cu; }), s.area, s.epsr, s.T, auto ? null : va, auto ? null : vb); msRes = r;
  if (auto && isNum(r.va)) { $('#ms-va').value = +r.va.toFixed(3); $('#ms-vb').value = +r.vb.toFixed(3); }
  if (!r.fit) { out.innerHTML = '<p class="nyq-bad">A straight line could not be fitted. The fit range needs at least three points with positive capacitance.</p>'; drawMS(); return; }
  var nt = [], dcm = s.d * 1e-7;
  if (r.fit.r2 < 0.99) nt.push('The fit is not a good straight line (R² = ' + fix(r.fit.r2, 3) + '). Narrow the fit range to the linear part of 1/C² before using the numbers.');
  if (isNum(s.d) && s.d > 0) { if (r.w0 > 0.8 * dcm) nt.push('The depletion width at ' + fix(r.v0, 2) + ' V (' + fix(r.w0 * 1e7, 0) + ' nm) is close to the layer thickness (' + s.d + ' nm). The layer is fully depleted, the capacitance is near the geometric value, and the doping density is then only an upper limit.');
    var nmin = 2 * r.eps * Math.abs(r.vbi) / (Q * dcm * dcm); if (r.N < nmin) nt.push('The doping density is below ' + sci(nmin, 1) + ' cm⁻³, the value at which the depletion width at zero bias equals the layer thickness. A density this low cannot be resolved in a layer of this thickness.'); }
  else nt.push('Enter the layer thickness in the Sample box to check whether the layer is fully depleted.');
  if (r.vbi < 0 || r.vbi > 3) nt.push('The intercept gives an unusual V_bi. Check the sign convention of the voltage column and the fit range.');
  nt.push('In perovskite and organic devices, mobile ions and injected carriers can give an apparent slope in 1/C². The result is reliable only where C is measured at a frequency above the ionic response and below the series-resistance roll-off.');
  out.innerHTML = rows([['V<sub>bi</sub>', fix(r.vbi, 3) + ' V'], ['Doping density N', sci(r.N) + ' cm⁻³'], ['Voltage intercept', fix(r.vint, 3) + ' V'], ['Slope of 1/C²', sci(r.fit.b) + ' cm⁴ F⁻² V⁻¹'], ['Depletion width at ' + fix(r.v0, 2) + ' V', fix(r.w0 * 1e7, 1) + ' nm'], ['R² of the fit', fix(r.fit.r2, 4) + ' (' + r.fit.n + ' points)']]) +
    '<p class="muted small">V<sub>bi</sub> is the intercept corrected by k<sub>B</sub>T/q (' + fix(r.vth * 1e3, 1) + ' mV). The slope is ' + (r.fit.b < 0 ? 'negative' : 'positive') + '; with the bias defined as positive on the p side, a negative slope is the usual depletion behaviour.</p>' + notes(nt) +
    '<p><button type="button" class="btn btn-ghost" id="ms-csv">Download results (CSV)</button></p>';
  $('#ms-csv').addEventListener('click', function () { var t = 'quantity,value,unit\nV_bi,' + r.vbi + ',V\nN,' + r.N + ',cm^-3\nintercept,' + r.vint + ',V\nslope,' + r.fit.b + ',cm^4 F^-2 V^-1\nW(' + r.v0 + ' V),' + r.w0 * 1e7 + ',nm\nR2,' + r.fit.r2 + ',\nfit_from,' + r.va + ',V\nfit_to,' + r.vb + ',V\n\nV (V),C (F/cm^2),1/C^2 (cm^4/F^2)\n' + r.v.map(function (v, i) { return v + ',' + r.ca[i] + ',' + r.y[i]; }).join('\n'); download('mott-schottky.csv', t, 'text/csv'); });
  drawMS();
}
function drawMS() { var r = msRes; if (!r || !r.v.length) { ['ms-p1', 'ms-p2', 'ms-p3'].forEach(function (id) { $('#' + id).innerHTML = '<p class="nyq-empty muted">The plot appears here after data is loaded.</p>'; }); return; }
  var S = [{ x: r.v, y: r.y, label: 'Measured' }]; if (r.fit) { var a = Math.min(r.va, r.vint), b = Math.max(r.vb, r.vint); S.push({ x: [a, b], y: [r.fit.a + r.fit.b * a, r.fit.a + r.fit.b * b], line: 1, color: '--c-model', label: 'Linear fit' }); }
  plot($('#ms-p1'), { series: S, xlabel: 'Voltage (V)', ylabel: '1/C² (cm⁴ F⁻²)', zero: 'y', band: r.fit ? [r.va, r.vb] : null, legend: r.fit && r.fit.b < 0 ? 'bottom' : 'top' });
  plot($('#ms-p2'), { w: 380, h: 290, series: [{ x: r.v, y: r.ca.map(function (c) { return c * 1e9; }) }], xlabel: 'Voltage (V)', ylabel: 'Capacitance (nF cm⁻²)' });
  plot($('#ms-p3'), { w: 380, h: 290, series: [{ x: r.pw, y: r.pn }], xlabel: 'Depletion width W = ε/C (nm)', ylabel: 'Apparent doping density (cm⁻³)', ylog: true });
}
['ms-va', 'ms-vb', 'ms-cu'].forEach(function (id) { $('#' + id).addEventListener('change', runMS); });
$('#ms-auto').addEventListener('click', function () { $('#ms-va').value = ''; $('#ms-vb').value = ''; runMS(); });

/* ---------- 2. equivalent-circuit fit ---------- */
var eis = { ck: null, res: null, data: null, fixed: [], start: null };
var eisSet = dataset('eis', [{ key: 'f', label: 'Frequency (Hz)' }, { key: 'zre', label: 'First impedance column' }, { key: 'zim', label: 'Second impedance column' }], function (fresh) { if (fresh) { var t = eisSet.table, h = t.heads[eisSet.map.zre] + ' ' + t.heads[eisSet.map.zim]; $('#eis-fmt').value = /\|z\||mod|mag|phase|theta|deg/i.test(h) ? 'polar' : 'cart'; if ($('#eis-fmt').value === 'cart') { var raw = (eisSet.col('zim') || []).filter(isNum), sum = raw.reduce(function (x, y) { return x + y; }, 0); $('#eis-neg').checked = /^\s*[-−–]/.test(t.heads[eisSet.map.zim]) || sum > 0; } $('#eis-fa').value = ''; $('#eis-fb').value = ''; } runEIS(true); });
function eisData() { var f = eisSet.col('f'), a = eisSet.col('zre'), b = eisSet.col('zim'); eis.data = null; if (!f || !a || !b) return;
  var polar = $('#eis-fmt').value === 'polar', neg = $('#eis-neg').checked, fa = val('eis-fa'), fb = val('eis-fb'), d = { f: [], zre: [], zim: [], all: { f: [], zre: [], zim: [] } };
  for (var i = 0; i < f.length; i++) { if (!isNum(f[i]) || !(f[i] > 0) || !isNum(a[i]) || !isNum(b[i])) continue; var re = polar ? a[i] * Math.cos(b[i] * Math.PI / 180) : a[i], im = polar ? a[i] * Math.sin(b[i] * Math.PI / 180) : (neg ? -b[i] : b[i]);
    d.all.f.push(f[i]); d.all.zre.push(re); d.all.zim.push(im); if ((isNum(fa) && f[i] < fa) || (isNum(fb) && f[i] > fb)) continue; d.f.push(f[i]); d.zre.push(re); d.zim.push(im); }
  if (d.f.length >= 4) eis.data = d; }
function runEIS(reguess) {
  var out = $('#eis-out'), err = $('#eis-err'); err.textContent = ''; eisData();
  try { var ck = parseCircuit($('#eis-ckt').value); if (!eis.ck || eis.ck.src !== ck.src) { eis.ck = ck; eis.fixed = ck.params.map(function () { return false; }); eis.start = null; reguess = true; } cedSync(eis.ck.ast); }
  catch (e) { err.textContent = e.message; eis.res = null; out.innerHTML = ''; drawEIS(); return; }
  if (!eis.data) { eis.res = null; out.innerHTML = eisSet.table ? '<p class="nyq-bad">Fewer than four usable points. Check the columns and the frequency range.</p>' : ''; drawEIS(); return; }
  var d = eis.data; if (2 * d.f.length <= eis.ck.params.length) { err.textContent = 'The circuit has more parameters than the data can determine.'; return; }
  var r = fitBest(eis.ck, d.f, d.zre, d.zim, eis.fixed, $('#eis-wt').value, reguess ? null : eis.start, eis.start); eis.res = r;
  if (!r) { out.innerHTML = '<p class="nyq-bad">The fit failed. Try a simpler circuit or change the starting values.</p>'; drawEIS(); return; }
  eis.start = r.p.slice(); showEIS(); drawEIS();
}
function showEIS() { var r = eis.res, ck = eis.ck, out = $('#eis-out'), nt = [], big = false;
  var h = '<table class="nyq-tab"><thead><tr><th>Element</th><th>Value</th><th>Std. error</th><th>Hold</th></tr></thead><tbody>' + ck.params.map(function (d, i) { var e = r.err[i]; if (isNum(e) && e > 0.5 && !eis.fixed[i]) big = true;
    return '<tr><td>' + esc(d.label) + (d.unit ? ' <span class="muted">(' + d.unit + ')</span>' : '') + '</td><td><input type="text" class="nyq-pv" data-i="' + i + '" value="' + r.p[i].toPrecision(5) + '" aria-label="' + esc(d.label) + '"></td><td>' + (eis.fixed[i] ? 'held' : isNum(e) ? (e * 100 < 0.1 ? '< 0.1' : (e * 100).toPrecision(2)) + ' %' : '–') + '</td><td><input type="checkbox" class="nyq-fx" data-i="' + i + '"' + (eis.fixed[i] ? ' checked' : '') + ' aria-label="Hold ' + esc(d.label) + ' fixed"></td></tr>'; }).join('') + '</tbody></table>';
  var dv = derived(ck, r.p); if (dv.length) h += rows(dv.map(function (d) { return [esc(d.name), (d.cpe ? 'C<sub>eff</sub> = ' : 'C = ') + si(d.C, 'F') + ', τ = ' + si(d.tau, 's') + ', peak at ' + si(d.f, 'Hz')]; }));
  var rms = Math.sqrt(r.chi2); h += '<p class="muted small">' + ($('#eis-wt').value === 'unit' ? 'RMS residual ' + si(rms, 'Ω') : 'RMS relative residual ' + (rms * 100).toPrecision(2) + ' %') + ' over ' + r.n + ' points.' + (dv.some(function (d) { return d.cpe; }) ? ' C<sub>eff</sub> = (Q R<sup>1−n</sup>)<sup>1/n</sup> for a constant-phase element in parallel with a resistor.' : '') + '</p>';
  if ($('#eis-wt').value !== 'unit' && rms > 0.05) nt.push('The fit does not follow the data closely (residual above 5 %). The circuit may be missing an element, or the starting values led to a poor solution. Edit a value and press Fit again.');
  if (big) nt.push('Some standard errors are above 50 %. Those elements are not determined by this data. Hold them fixed or use a simpler circuit.');
  ck.params.forEach(function (d, i) { if (d.sub === 'n' && r.p[i] < 0.6) nt.push(esc(d.el) + ' has n = ' + r.p[i].toFixed(2) + '. A value this far below 1 usually means the arc contains more than one process, or diffusion.'); });
  h += notes(nt) + '<p><button type="button" class="btn" id="eis-fit">Fit from these values</button> <button type="button" class="btn btn-ghost" id="eis-re">New automatic start</button> <button type="button" class="btn btn-ghost" id="eis-csv">Download results (CSV)</button></p>';
  out.innerHTML = h;
  $$('.nyq-fx', out).forEach(function (c) { c.addEventListener('change', function () { eis.fixed[+c.getAttribute('data-i')] = c.checked; }); });
  function readStart() { $$('.nyq-pv', out).forEach(function (inp) { var v = parseFloat(inp.value); if (v > 0) eis.start[+inp.getAttribute('data-i')] = v; }); }
  $('#eis-fit').addEventListener('click', function () { readStart(); runEIS(false); });
  $('#eis-re').addEventListener('click', function () { runEIS(true); });
  $('#eis-csv').addEventListener('click', function () { var d = eis.data, w, t = 'circuit,' + ck.src + '\nelement,value,unit,relative std error\n' + ck.params.map(function (p, i) { return p.label + ',' + r.p[i] + ',' + p.unit + ',' + (eis.fixed[i] ? 'held' : r.err[i]); }).join('\n') + '\n\nf (Hz),Z\' (Ohm),Z\'\' (Ohm),fit Z\' (Ohm),fit Z\'\' (Ohm)\n' + d.f.map(function (f, i) { w = zOf(ck.ast, 2 * Math.PI * f, r.p); return f + ',' + d.zre[i] + ',' + d.zim[i] + ',' + w[0] + ',' + w[1]; }).join('\n'); download('circuit-fit.csv', t, 'text/csv'); });
}
function drawEIS() { var d = eis.data, r = eis.res; if (!d) { ['eis-p1', 'eis-p2', 'eis-p3'].forEach(function (id) { $('#' + id).innerHTML = '<p class="nyq-empty muted">The plot appears here after data is loaded.</p>'; }); return; }
  var a = d.all, fit = { f: [], re: [], im: [] }; if (r) { var lo = Math.log10(Math.min.apply(null, d.f)), hi = Math.log10(Math.max.apply(null, d.f)); for (var i = 0; i <= 240; i++) { var f = Math.pow(10, lo + (hi - lo) * i / 240), z = zOf(eis.ck.ast, 2 * Math.PI * f, r.p); fit.f.push(f); fit.re.push(z[0]); fit.im.push(z[1]); } }
  function mod(re, im) { return re.map(function (v, i) { return Math.hypot(v, im[i]); }); } function ph(re, im) { return re.map(function (v, i) { return -Math.atan2(im[i], v) * 180 / Math.PI; }); }
  plot($('#eis-p1'), { series: [{ x: a.zre, y: a.zim.map(function (v) { return -v; }), label: 'Measured' }, { x: fit.re, y: fit.im.map(function (v) { return -v; }), line: 1, color: '--c-model', label: 'Fit' }], xlabel: 'Z′ (Ω)', ylabel: '−Z″ (Ω)', equal: true, h: 360 });
  plot($('#eis-p2'), { w: 380, h: 290, series: [{ x: a.f, y: mod(a.zre, a.zim), label: 'Measured' }, { x: fit.f, y: mod(fit.re, fit.im), line: 1, color: '--c-model', label: 'Fit' }], xlabel: 'Frequency (Hz)', ylabel: '|Z| (Ω)', xlog: true, ylog: true, legend: 'bottom' });
  plot($('#eis-p3'), { w: 380, h: 290, series: [{ x: a.f, y: ph(a.zre, a.zim), label: 'Measured' }, { x: fit.f, y: ph(fit.re, fit.im), line: 1, color: '--c-model', label: 'Fit' }], xlabel: 'Frequency (Hz)', ylabel: '−Phase (degrees)', xlog: true });
}

/* ---------- circuit drawing and graphical editing ---------- */
/* The drawing is made from the same tree as the circuit text. A click selects an element; the buttons add an element
   in series or in parallel with the selection, change it or remove it. The text and the drawing always agree. */
var ced = { tree: null, sel: null };
function cedClone(n) { return n.t === 'e' ? { t: 'e', type: n.type, name: n.name } : { t: n.t, k: n.k.map(cedClone) }; }
function cedNorm(n) { if (n.t === 'e') return n; var k = []; n.k.map(cedNorm).forEach(function (c) { if (c.t === n.t) k = k.concat(c.k); else k.push(c); }); return k.length === 1 ? k[0] : { t: n.t, k: k }; }
function cedText(n, inside) { if (n.t === 'e') return n.name; var s = n.k.map(function (c) { return cedText(c, true); }).join(n.t === 's' ? '-' : '|'); return inside ? '(' + s + ')' : s; }
function cedAt(path) { var n = ced.tree; for (var i = 0; i < path.length; i++) n = n.k[path[i]]; return n; }
function cedNames(n, out) { if (n.t === 'e') out.push(n.name); else n.k.forEach(function (c) { cedNames(c, out); }); return out; }
function cedNew(type) { var used = cedNames(ced.tree, []), i = 1; while (used.indexOf(type + i) >= 0) i++; return { t: 'e', type: type, name: type + i }; }
function cedSize(n) { if (n.t === 'e') return { w: 66, h: 46 }; var z = n.k.map(cedSize); if (n.t === 's') return { w: z.reduce(function (a, b) { return a + b.w; }, 0), h: Math.max.apply(null, z.map(function (b) { return b.h; })) };
  return { w: Math.max.apply(null, z.map(function (b) { return b.w; })) + 28, h: z.reduce(function (a, b) { return a + b.h; }, 0) + 6 * (z.length - 1) }; }
function cedSymbol(type, cx, cy, col) { var a = 'fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  if (type === 'R') return '<rect x="' + (cx - 15) + '" y="' + (cy - 6) + '" width="30" height="12" rx="1.5" ' + a + '/>' + cedWire(cx - 33, cx - 15, cy, col) + cedWire(cx + 15, cx + 33, cy, col);
  if (type === 'C') return '<path d="M' + (cx - 3.5) + ' ' + (cy - 10) + 'v20M' + (cx + 3.5) + ' ' + (cy - 10) + 'v20" ' + a + '/>' + cedWire(cx - 33, cx - 3.5, cy, col) + cedWire(cx + 3.5, cx + 33, cy, col);
  if (type === 'L') return '<path d="M' + (cx - 16) + ' ' + cy + 'a4 5 0 0 1 8 0a4 5 0 0 1 8 0a4 5 0 0 1 8 0a4 5 0 0 1 8 0" ' + a + '/>' + cedWire(cx - 33, cx - 16, cy, col) + cedWire(cx + 16, cx + 33, cy, col);
  if (type === 'Q') return '<path d="M' + (cx - 8) + ' ' + (cy - 9) + 'l7 9l-7 9M' + (cx + 1) + ' ' + (cy - 9) + 'l7 9l-7 9" ' + a + '/>' + cedWire(cx - 33, cx - 1, cy, col) + cedWire(cx + 8, cx + 33, cy, col);
  return '<rect x="' + (cx - 15) + '" y="' + (cy - 7) + '" width="30" height="14" rx="1.5" ' + a + '/><text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="10" font-weight="600" fill="' + col + '">W</text>' + cedWire(cx - 33, cx - 15, cy, col) + cedWire(cx + 15, cx + 33, cy, col); }
function cedWire(x1, x2, y, col) { return '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + y + '" y2="' + y + '" stroke="' + col + '" stroke-width="1.6"/>'; }
function cedDraw(n, x, cy, path, C) { var z = cedSize(n), out = '', key = path.join('.'), on = ced.sel === key;
  if (n.t === 'e') { var col = on ? C.acc : C.ink, cx = x + z.w / 2;
    return '<g class="ced-el" data-path="' + key + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + ELNAME[n.type] + ' ' + esc(n.name) + '">' + (on ? '<rect x="' + (x + 5) + '" y="' + (cy - 21) + '" width="' + (z.w - 10) + '" height="36" rx="6" fill="' + C.acc + '" opacity=".12"/>' : '') + '<rect x="' + x + '" y="' + (cy - 22) + '" width="' + z.w + '" height="40" fill="transparent"/>' + cedSymbol(n.type, cx, cy, col) + '<text x="' + cx + '" y="' + (cy - 12) + '" text-anchor="middle" font-size="10.5" fill="' + col + '">' + esc(n.name) + '</text></g>'; }
  if (n.t === 's') { var px = x; n.k.forEach(function (c, i) { var cz = cedSize(c); out += cedDraw(c, px, cy, path.concat(i), C); px += cz.w; }); }
  else { var top = cy - z.h / 2, y1 = null, y2 = null; n.k.forEach(function (c, i) { var cz = cedSize(c), ccy = top + cz.h / 2, inner = z.w - 28, off = x + 14 + (inner - cz.w) / 2; if (y1 == null) y1 = ccy; y2 = ccy;
      out += cedWire(x + 14, off, ccy, C.ink) + cedDraw(c, off, ccy, path.concat(i), C) + cedWire(off + cz.w, x + z.w - 14, ccy, C.ink); top += cz.h + 6; });
    out += cedWire(x, x + 14, cy, C.ink) + cedWire(x + z.w - 14, x + z.w, cy, C.ink) + '<path d="M' + (x + 14) + ' ' + y1 + 'V' + y2 + 'M' + (x + z.w - 14) + ' ' + y1 + 'V' + y2 + '" fill="none" stroke="' + C.ink + '" stroke-width="1.6"/>'; }
  if (on) out += '<rect x="' + (x + 2) + '" y="' + (cy - z.h / 2 - 1) + '" width="' + (z.w - 4) + '" height="' + (z.h + 2) + '" rx="8" fill="' + C.acc + '" fill-opacity=".07" stroke="' + C.acc + '" stroke-dasharray="4 3"/>';
  return out; }
var ELNAME = { R: 'Resistor', C: 'Capacitor', L: 'Inductor', Q: 'Constant-phase element', W: 'Warburg element' };
function cedRender() { var host = $('#eis-draw'); if (!host || !ced.tree) return; if (ced.sel != null) { try { if (!cedAt(ced.sel === '' ? [] : ced.sel.split('.').map(Number))) ced.sel = null; } catch (e) { ced.sel = null; } }
  var z = cedSize(ced.tree), W = z.w + 36, H = z.h + 16, C = { ink: css('--ink'), acc: css('--accent') }, cy = H / 2;
  host.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" style="max-width:' + Math.round(W * 1.25) + 'px" font-family="Inter, system-ui, sans-serif" role="group" aria-label="Circuit drawing">' + cedWire(6, 18, cy, C.ink) + cedWire(W - 18, W - 6, cy, C.ink) + '<circle cx="6" cy="' + cy + '" r="3" fill="' + C.ink + '"/><circle cx="' + (W - 6) + '" cy="' + cy + '" r="3" fill="' + C.ink + '"/>' + cedDraw(ced.tree, 18, cy, [], C) + '</svg>';
  var n = ced.sel == null ? null : cedAt(ced.sel === '' ? [] : ced.sel.split('.').map(Number));
  $('#ced-what').textContent = n == null ? 'Nothing is selected. A new element is added to the whole circuit. Click an element to select it.' : n.t === 'e' ? 'Selected: ' + ELNAME[n.type].toLowerCase() + ' ' + n.name + '.' : 'Selected: the ' + (n.t === 's' ? 'series' : 'parallel') + ' group ' + cedText(n, true) + '.';
  $('#ced-del').disabled = n == null || ced.sel === ''; $('#ced-up').disabled = n == null || ced.sel === ''; $('#ced-chg').disabled = !n || n.t !== 'e'; }
function cedSync(ast) { var t = cedNorm(cedClone(ast)); if (ced.tree && cedText(t, false) === cedText(ced.tree, false)) return; ced.tree = t; cedRender(); }
function cedCommit() { ced.tree = cedNorm(ced.tree); $('#eis-ckt').value = cedText(ced.tree, false); var pre = $('#eis-preset'); pre.value = $$('option', pre).some(function (o) { return o.value === $('#eis-ckt').value; }) ? $('#eis-ckt').value : ''; runEIS(true); cedRender(); }
function cedPath() { return ced.sel == null || ced.sel === '' ? [] : ced.sel.split('.').map(Number); }
function cedFind(node, target, path) { if (node === target) return path; if (node.t === 'e') return null; for (var i = 0; i < node.k.length; i++) { var r = cedFind(node.k[i], target, path.concat(i)); if (r) return r; } return null; }
function cedAdd(kind) { if (!ced.tree) return; var path = cedPath(), el = cedNew($('#ced-type').value), target = cedAt(path), parent = path.length ? cedAt(path.slice(0, -1)) : null, idx = path[path.length - 1];
  if (parent && parent.t === kind) parent.k.splice(idx + 1, 0, el);
  else if (target.t === kind) target.k.push(el);
  else { var grp = { t: kind, k: [target, el] }; if (parent) parent.k[idx] = grp; else ced.tree = grp; }
  ced.tree = cedNorm(ced.tree); var np = cedFind(ced.tree, el, []); ced.sel = np ? np.join('.') : null; cedCommit(); }
if ($('#eis-draw')) {
  $('#eis-draw').addEventListener('click', function (e) { var g = e.target.closest('.ced-el'); ced.sel = g ? (ced.sel === g.getAttribute('data-path') ? null : g.getAttribute('data-path')) : null; cedRender(); if (g) { var again = $('.ced-el[data-path="' + g.getAttribute('data-path') + '"]'); if (again) again.focus({ preventScroll: true }); } });
  $('#eis-draw').addEventListener('keydown', function (e) { var g = e.target.closest('.ced-el'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  $('#ced-ser').addEventListener('click', function () { cedAdd('s'); });
  $('#ced-par').addEventListener('click', function () { cedAdd('p'); });
  $('#ced-up').addEventListener('click', function () { var p = cedPath(); if (!p.length) return; ced.sel = p.slice(0, -1).join('.'); cedRender(); });
  $('#ced-del').addEventListener('click', function () { var p = cedPath(); if (!p.length) return; cedAt(p.slice(0, -1)).k.splice(p[p.length - 1], 1); ced.sel = null; cedCommit(); });
  $('#ced-chg').addEventListener('click', function () { var n = cedAt(cedPath()); if (!n || n.t !== 'e') return; var type = $('#ced-type').value; if (n.type === type) return; n.name = ''; var el = cedNew(type); n.type = type; n.name = el.name; cedCommit(); });
}
$('#eis-preset').addEventListener('change', function (e) { if (e.target.value) { $('#eis-ckt').value = e.target.value; runEIS(true); } });
$('#eis-ckt').addEventListener('change', function () { $('#eis-preset').value = ''; runEIS(true); });
['eis-fmt', 'eis-neg', 'eis-fa', 'eis-fb', 'eis-wt'].forEach(function (id) { $('#' + id).addEventListener('change', function () { runEIS(true); }); });

/* ---------- 3. J–V ---------- */
var jv = null;
var jvSet = dataset('jv', [{ key: 'v', label: 'Voltage (V)' }, { key: 'j', label: 'Current or current density' }], function (fresh) { if (fresh && jvSet.table) { var h = jvSet.table.heads[jvSet.map.j] || ''; var u = /ma\s*\/?\s*cm/i.test(h) ? '1' : /a\s*\/?\s*cm/i.test(h) ? '1000' : /a\s*\/?\s*m/i.test(h) ? '0.1' : /\(\s*ma\s*\)|\bma\b/i.test(h) ? 'mA' : /\(\s*a\s*\)|current\s*\(a|\bamp/i.test(h) ? 'A' : null; if (u) $('#jv-ju').value = u; } runJV(); });
function runJV() { var out = $('#jv-out'), V = jvSet.col('v'), J = jvSet.col('j'); jv = null; if (!V || !J) { out.innerHTML = ''; drawJV(); return; }
  var s = sampleOK(out); if (!s) { drawJV(); return; }
  var u = $('#jv-ju').value, k = u === 'A' ? 1000 / s.area : u === 'mA' ? 1 / s.area : parseFloat(u), sw = jvSweeps(V, J.map(function (x) { return x * k; }));
  if (!sw.length) { out.innerHTML = '<p class="nyq-bad">Fewer than five usable points. Check the columns.</p>'; drawJV(); return; }
  var mode = $('#jv-mode').value; if (mode === 'auto') { var a = sw[0], j0 = interp(a.v, a.j, 0), mx = Math.max.apply(null, a.j.map(Math.abs)); mode = isNum(j0) && Math.abs(j0) > 0.02 * mx ? 'light' : 'dark'; }
  var nt = [], h = '';
  if (mode === 'light') { var pin = val('jv-pin'); if (!(pin > 0)) { out.innerHTML = '<p class="nyq-bad">Enter the incident power density.</p>'; drawJV(); return; }
    var res = sw.map(function (x) { var r = jvLight(x.v, x.j, pin); r.dir = x.dir; r.label = sw.length === 1 ? 'Sweep' : x.dir < 0 ? 'Reverse sweep' : 'Forward sweep'; return r; }), ok = res.filter(function (r) { return !r.error; });
    jv = { mode: 'light', res: ok };
    if (!ok.length) { out.innerHTML = '<p class="nyq-bad">' + res[0].error + '</p>'; drawJV(); return; }
    var q = [['V<sub>OC</sub> (V)', function (r) { return fix(r.voc, 3); }], ['J<sub>SC</sub> (mA cm⁻²)', function (r) { return fix(r.jsc, 2); }], ['Fill factor (%)', function (r) { return fix(r.ff * 100, 1); }], ['PCE (%)', function (r) { return fix(r.pce, 2); }], ['V<sub>MPP</sub> (V)', function (r) { return fix(r.vmpp, 3); }], ['J<sub>MPP</sub> (mA cm⁻²)', function (r) { return fix(r.jmpp, 2); }], ['P<sub>max</sub> (mW cm⁻²)', function (r) { return fix(r.pmax, 2); }], ['R at V<sub>OC</sub> (Ω cm²)', function (r) { return isNum(r.rs) ? r.rs.toPrecision(3) : '–'; }], ['R at short circuit (Ω cm²)', function (r) { return isNum(r.rsh) ? r.rsh.toPrecision(3) : '–'; }]];
    h += '<table class="nyq-tab nyq-jvt"><thead><tr><th>Quantity</th>' + ok.map(function (r) { return '<th>' + r.label + '</th>'; }).join('') + '</tr></thead><tbody>' + q.map(function (row) { return '<tr><td>' + row[0] + '</td>' + ok.map(function (r) { return '<td>' + row[1](r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    var rv = ok.filter(function (r) { return r.dir < 0; })[0], fw = ok.filter(function (r) { return r.dir > 0; })[0];
    if (ok.length >= 2 && rv && fw) { jv.hi = (rv.pce - fw.pce) / rv.pce; h += rows([['Hysteresis index', fix(jv.hi, 3)]]) + '<p class="muted small">Hysteresis index = (PCE<sub>reverse</sub> − PCE<sub>forward</sub>)/PCE<sub>reverse</sub>.</p>'; if (ok.length > 2) nt.push('The file holds ' + ok.length + ' sweeps. The hysteresis index uses the first reverse and the first forward sweep.'); }
    else if (ok.length === 1) nt.push('The file holds one sweep, so hysteresis cannot be assessed. Load a file with a reverse and a forward sweep for the hysteresis index.');
    if (ok.some(function (r) { return r.extrap; })) nt.push('The data do not include V = 0, so J<sub>SC</sub> is extrapolated from the two nearest points.');
    nt.push('The resistances are the inverse slopes of the curve at V<sub>OC</sub> and at short circuit. They estimate R<sub>s</sub> and R<sub>sh</sub> only for a device that follows the single-diode model; in perovskite cells both depend on scan rate and direction.');
    nt.push('PCE uses the incident power and the area entered here. J<sub>SC</sub> should be checked against the integrated EQE.');
    h += '<p class="muted small">The curve is shown with J<sub>SC</sub> and V<sub>OC</sub> positive, whatever the sign convention of the file.</p>'; }
  else { var d = jvDark(sw[0].v, sw[0].j, s.T); jv = { mode: 'dark', d: d };
    if (d.error) { out.innerHTML = '<p class="nyq-bad">' + d.error + '</p>'; drawJV(); return; }
    h += rows([['Transition voltage V<sub>α</sub>', fix(d.valpha, 3) + ' V'], ['Peak of G = d ln J / d ln V', fix(d.gmax, 1)], ['Ideality factor', isNum(d.nid) ? fix(d.nid, 2) : '–'], ['J<sub>0</sub>', isNum(d.j0) ? sci(d.j0) + ' mA cm⁻²' : '–'], ['Exponential region', isNum(d.fa) ? fix(d.fa, 2) + ' to ' + fix(d.fb, 2) + ' V' : '–'], ['R near 0 V (shunt)', isNum(d.rsh) ? sci(d.rsh) + ' Ω cm²' : '–'], ['dV/dJ at highest bias', isNum(d.rs) ? d.rs.toPrecision(3) + ' Ω cm²' : '–']]) +
      '<p class="muted small">V<sub>α</sub> is the voltage at which the logarithmic slope G(V) = d ln J / d ln V peaks, where the current changes from diffusion-limited to drift-limited. After A. B. Andrabi and A. T. Mallajosyula, Sol. Energy 264, 112020 (2023).</p>';
    if (d.edge) nt.push('G(V) is largest at the end of the voltage range, so no peak is resolved. Extend the sweep to higher forward bias to find V<sub>α</sub>.');
    if (isNum(d.nid) && (d.nid < 0.9 || d.nid > 4)) nt.push('The ideality factor lies outside the range of 1 to 2 expected for diffusion and trap-assisted recombination. The exponential region may be masked by the shunt or by series resistance.');
    if (sw.length > 1) nt.push('The file holds ' + sw.length + ' sweeps. Only the first sweep is analysed.');
    nt.push('The ideality factor and J<sub>0</sub> come from a straight-line fit of ln J against V over the region where the local ideality factor is within 15 % of its minimum. dV/dJ at the highest bias is an upper limit for the series resistance.'); }
  out.innerHTML = h + notes(nt) + '<p><button type="button" class="btn btn-ghost" id="jv-csv">Download results (CSV)</button></p>';
  $('#jv-csv').addEventListener('click', function () { var t; if (jv.mode === 'light') { t = 'quantity,' + jv.res.map(function (r) { return r.label; }).join(',') + '\n' + [['V_OC (V)', 'voc'], ['J_SC (mA/cm2)', 'jsc'], ['FF', 'ff'], ['PCE (%)', 'pce'], ['V_MPP (V)', 'vmpp'], ['J_MPP (mA/cm2)', 'jmpp'], ['P_max (mW/cm2)', 'pmax'], ['R at V_OC (Ohm cm2)', 'rs'], ['R at short circuit (Ohm cm2)', 'rsh']].map(function (r) { return r[0] + ',' + jv.res.map(function (x) { return x[r[1]]; }).join(','); }).join('\n') + (isNum(jv.hi) ? '\nhysteresis index,' + jv.hi : '') + '\n'; jv.res.forEach(function (r) { t += '\n' + r.label + '\nV (V),J (mA/cm2),P (mW/cm2)\n' + r.v.map(function (v, i) { return v + ',' + r.j[i] + ',' + v * r.j[i]; }).join('\n') + '\n'; }); }
    else { var d = jv.d; t = 'V_alpha (V),' + d.valpha + '\npeak G,' + d.gmax + '\nideality factor,' + d.nid + '\nJ0 (mA/cm2),' + d.j0 + '\nfit from (V),' + d.fa + '\nfit to (V),' + d.fb + '\nR near 0 V (Ohm cm2),' + d.rsh + '\ndV/dJ at highest bias (Ohm cm2),' + d.rs + '\n\nV (V),G = dlnJ/dlnV\n' + d.gv.map(function (v, i) { return v + ',' + d.g[i]; }).join('\n') + '\n\nV (V),J (mA/cm2)\n' + d.v.map(function (v, i) { return v + ',' + d.j[i]; }).join('\n'); }
    download('jv-analysis.csv', t, 'text/csv'); });
  drawJV();
}
function drawJV() { var ids = ['jv-p1', 'jv-p2', 'jv-p3'], cap = { 'jv-c1': '', 'jv-c2': '', 'jv-c3': '' };
  if (!jv || (jv.mode === 'light' && !jv.res.length) || (jv.mode === 'dark' && jv.d.error)) { ids.forEach(function (id) { $('#' + id).innerHTML = '<p class="nyq-empty muted">The plot appears here after data is loaded.</p>'; }); $('#jv-f3').hidden = false; return; }
  var cols = ['--accent', '--c-model', '--c-light', '--c-energy'];
  if (jv.mode === 'light') { var S = [], P = []; jv.res.forEach(function (r, i) { var keep = r.v.map(function (v, k) { return k; }).filter(function (k) { return r.v[k] >= -0.25 * r.voc && r.j[k] > -0.35 * r.jsc; });
      S.push({ x: keep.map(function (k) { return r.v[k]; }), y: keep.map(function (k) { return r.j[k]; }), line: 1, color: cols[i % 4], label: r.label }); S.push({ x: [r.vmpp], y: [r.jmpp], color: cols[i % 4], r: 5, hollow: 1 });
      var kp = keep.filter(function (k) { return r.v[k] >= 0 && r.v[k] <= r.voc; }); P.push({ x: kp.map(function (k) { return r.v[k]; }), y: kp.map(function (k) { return r.v[k] * r.j[k]; }), line: 1, color: cols[i % 4], label: r.label }); });
    plot($('#jv-p1'), { series: S, xlabel: 'Voltage (V)', ylabel: 'Current density (mA cm⁻²)', legend: 'bottom' });
    plot($('#jv-p2'), { w: 380, h: 290, series: P, xlabel: 'Voltage (V)', ylabel: 'Power density (mW cm⁻²)', zero: 'y' });
    $('#jv-c1').textContent = 'Illuminated J–V. The open circle marks the maximum power point.'; $('#jv-c2').textContent = 'Output power density.'; $('#jv-f3').hidden = true; }
  else { var d = jv.d, fit = { x: [], y: [] }; if (isNum(d.nid)) { var vt = KB * val('s-T') / Q; [d.fa - 0.05, d.fb + 0.05].forEach(function (v) { fit.x.push(v); fit.y.push(d.j0 * Math.exp(v / (d.nid * vt))); }); }
    plot($('#jv-p1'), { series: [{ x: d.v, y: d.ja, label: 'Measured |J|' }, { x: fit.x, y: fit.y, line: 1, color: '--c-model', label: 'Exponential fit' }], xlabel: 'Voltage (V)', ylabel: '|J| (mA cm⁻²)', ylog: true, band: isNum(d.fa) ? [d.fa, d.fb] : null });
    var gm = Math.max.apply(null, d.g);
    plot($('#jv-p2'), { w: 380, h: 290, series: [{ x: d.gv, y: d.g, line: 1, width: 1.4 }, { x: d.gv, y: d.g, r: 2 }, { x: [d.valpha, d.valpha], y: [0, gm * 1.05], line: 1, dash: 1, color: '--c-model', width: 1.4 }], xlabel: 'Voltage (V)', ylabel: 'G = d ln J / d ln V', zero: 'y' });
    plot($('#jv-p3'), { w: 380, h: 290, series: [{ x: d.nv, y: d.n.map(function (x) { return Math.min(x, 10); }) }], xlabel: 'Voltage (V)', ylabel: 'Local ideality factor', zero: 'y' });
    $('#jv-c1').textContent = 'Dark J–V on a logarithmic scale. The shaded band is the exponential region used for the fit.'; $('#jv-c2').textContent = 'Logarithmic slope G(V). The dashed line marks the transition voltage.'; $('#jv-f3').hidden = false; }
}
['jv-mode', 'jv-ju', 'jv-pin'].forEach(function (id) { $('#' + id).addEventListener('change', runJV); });

/* ---------- shared ---------- */
function redraw() { drawMS(); drawEIS(); drawJV(); cedRender(); }
['s-area', 's-eps', 's-T', 's-d'].forEach(function (id) { $('#' + id).addEventListener('change', function () { runMS(); runJV(); }); });
new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
try { cedSync(parseCircuit($('#eis-ckt').value).ast); } catch (e) {}
redraw();
})();
