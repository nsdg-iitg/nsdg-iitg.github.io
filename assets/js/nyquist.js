/* Nyquist: impedance and C–V analysis in the browser. No data leaves the page.
   Parts: table reader, plots, Mott–Schottky analysis, equivalent-circuit fitting, trap density of states from C–f. */
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
  zmod: /\|z\||zmod|z[\s_]*mag|^z\b|^z[\s_(/[]/i, ph: /phase|theta|θ|phi|deg/i, v: /volt|bias|^v\b|^v[\s_(/[]|vdc|potential/i, c: /^c\b|^c[\s_(/[]|capac|^cp\b|^cs\b/i
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

/* ---------- trap density of states from C–f (Walter et al.) ---------- */
/* f in Hz, C in F, area in cm², W in cm. N_t(E_ω) = −(V_bi / (q W)) (dC/dω) ω / (k_B T), E_ω = k_B T ln(ω0/ω). */
function trapDOS(f, C, area, vbi, W, T, nu0, win) {
  var idx = f.map(function (_, i) { return i; }).filter(function (i) { return isNum(f[i]) && f[i] > 0 && isNum(C[i]); }).sort(function (a, b) { return f[a] - f[b]; });
  var fs = idx.map(function (i) { return f[i]; }), ca = idx.map(function (i) { return C[i] / area; }), lw = fs.map(function (x) { return Math.log(2 * Math.PI * x); });
  var h = Math.max(1, Math.floor((win || 5) / 2)), kT = KB * T, out = { f: fs, ca: ca, E: [], Nt: [], fd: [], dc: [] };
  for (var i = 0; i < fs.length; i++) { var a = Math.max(0, i - h), b = Math.min(fs.length, i + h + 1); if (b - a < 3) continue; var ft = linfit(lw.slice(a, b), ca.slice(a, b)); if (!ft) continue;
    out.fd.push(fs[i]); out.dc.push(-ft.b); out.E.push(kT / Q * Math.log(2 * Math.PI * nu0 / (2 * Math.PI * fs[i]))); out.Nt.push(-vbi * ft.b / (W * kT)); }
  return out;
}
function trapz(x, y) { var s = 0; for (var i = 1; i < x.length; i++) s += 0.5 * (y[i] + y[i - 1]) * (x[i] - x[i - 1]); return s; }

var Core = { parseTable: parseTable, mottSchottky: mottSchottky, parseCircuit: parseCircuit, zOf: zOf, guessParams: guessParams, fitCircuit: fitCircuit, fitBest: fitBest, derived: derived, trapDOS: trapDOS, linfit: linfit, EPS0: EPS0, Q: Q, KB: KB };
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
  dos: function () { var o = 'Frequency (Hz)\tCapacitance (F)\n', kT = 0.02585, A = sample().area > 0 ? sample().area : 0.1; function erfc(x) { var t = 1 / (1 + 0.3275911 * Math.abs(x)), y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x); return x >= 0 ? y : 2 - y; }
    for (var i = 0; i <= 60; i++) { var f = Math.pow(10, 1 + i * 0.0833), E = kT * Math.log(1e12 / f), c = A * (2.2e-8 + 1.4e-8 * 0.5 * erfc((0.42 - E) / (Math.SQRT2 * 0.035))); o += f.toExponential(4) + '\t' + (c * (1 + 0.0015 * noise(i + 7))).toExponential(5) + '\n'; } return o; }
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
    '<p><button type="button" class="btn btn-ghost" id="ms-csv">Download results (CSV)</button> <button type="button" class="btn btn-ghost" id="ms-todos">Use V<sub>bi</sub> and W in the trap density tab</button></p>';
  $('#ms-csv').addEventListener('click', function () { var t = 'quantity,value,unit\nV_bi,' + r.vbi + ',V\nN,' + r.N + ',cm^-3\nintercept,' + r.vint + ',V\nslope,' + r.fit.b + ',cm^4 F^-2 V^-1\nW(' + r.v0 + ' V),' + r.w0 * 1e7 + ',nm\nR2,' + r.fit.r2 + ',\nfit_from,' + r.va + ',V\nfit_to,' + r.vb + ',V\n\nV (V),C (F/cm^2),1/C^2 (cm^4/F^2)\n' + r.v.map(function (v, i) { return v + ',' + r.ca[i] + ',' + r.y[i]; }).join('\n'); download('mott-schottky.csv', t, 'text/csv'); });
  $('#ms-todos').addEventListener('click', function () { $('#dos-vbi').value = +r.vbi.toFixed(3); $('#dos-w').value = +(r.w0 * 1e7).toFixed(1); runDOS(); $('.nyq-tabs [data-pane=pane-dos]').click(); });
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
var eisSet = dataset('eis', [{ key: 'f', label: 'Frequency (Hz)' }, { key: 'zre', label: 'First impedance column' }, { key: 'zim', label: 'Second impedance column' }], function (fresh) { if (fresh) { var t = eisSet.table, h = t.heads[eisSet.map.zre] + ' ' + t.heads[eisSet.map.zim]; $('#eis-fmt').value = /\|z\||mod|mag|phase|theta|deg/i.test(h) ? 'polar' : 'cart'; eisData(); if (eis.data) { var pos = eis.data.zim.filter(function (v) { return v > 0; }).length; if ($('#eis-fmt').value === 'cart' && pos > eis.data.zim.length * 0.6) { $('#eis-neg').checked = !$('#eis-neg').checked; } } $('#eis-fa').value = ''; $('#eis-fb').value = ''; } runEIS(true); });
function eisData() { var f = eisSet.col('f'), a = eisSet.col('zre'), b = eisSet.col('zim'); eis.data = null; if (!f || !a || !b) return;
  var polar = $('#eis-fmt').value === 'polar', neg = $('#eis-neg').checked, fa = val('eis-fa'), fb = val('eis-fb'), d = { f: [], zre: [], zim: [], all: { f: [], zre: [], zim: [] } };
  for (var i = 0; i < f.length; i++) { if (!isNum(f[i]) || !(f[i] > 0) || !isNum(a[i]) || !isNum(b[i])) continue; var re = polar ? a[i] * Math.cos(b[i] * Math.PI / 180) : a[i], im = polar ? a[i] * Math.sin(b[i] * Math.PI / 180) : (neg ? -b[i] : b[i]);
    d.all.f.push(f[i]); d.all.zre.push(re); d.all.zim.push(im); if ((isNum(fa) && f[i] < fa) || (isNum(fb) && f[i] > fb)) continue; d.f.push(f[i]); d.zre.push(re); d.zim.push(im); }
  if (d.f.length >= 4) eis.data = d; }
function runEIS(reguess) {
  var out = $('#eis-out'), err = $('#eis-err'); err.textContent = ''; eisData();
  try { var ck = parseCircuit($('#eis-ckt').value); if (!eis.ck || eis.ck.src !== ck.src) { eis.ck = ck; eis.fixed = ck.params.map(function () { return false; }); eis.start = null; reguess = true; } }
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
  h += notes(nt) + '<p><button type="button" class="btn" id="eis-fit">Fit from these values</button> <button type="button" class="btn btn-ghost" id="eis-re">New automatic start</button> <button type="button" class="btn btn-ghost" id="eis-csv">Download results (CSV)</button> <button type="button" class="btn btn-ghost" id="eis-todos">Use this data for C–f</button></p>';
  out.innerHTML = h;
  $$('.nyq-fx', out).forEach(function (c) { c.addEventListener('change', function () { eis.fixed[+c.getAttribute('data-i')] = c.checked; }); });
  function readStart() { $$('.nyq-pv', out).forEach(function (inp) { var v = parseFloat(inp.value); if (v > 0) eis.start[+inp.getAttribute('data-i')] = v; }); }
  $('#eis-fit').addEventListener('click', function () { readStart(); runEIS(false); });
  $('#eis-re').addEventListener('click', function () { runEIS(true); });
  $('#eis-csv').addEventListener('click', function () { var d = eis.data, w, t = 'circuit,' + ck.src + '\nelement,value,unit,relative std error\n' + ck.params.map(function (p, i) { return p.label + ',' + r.p[i] + ',' + p.unit + ',' + (eis.fixed[i] ? 'held' : r.err[i]); }).join('\n') + '\n\nf (Hz),Z\' (Ohm),Z\'\' (Ohm),fit Z\' (Ohm),fit Z\'\' (Ohm)\n' + d.f.map(function (f, i) { w = zOf(ck.ast, 2 * Math.PI * f, r.p); return f + ',' + d.zre[i] + ',' + d.zim[i] + ',' + w[0] + ',' + w[1]; }).join('\n'); download('circuit-fit.csv', t, 'text/csv'); });
  $('#eis-todos').addEventListener('click', function () { var d = eis.data.all, t = 'Frequency (Hz)\tCapacitance (F)\n'; for (var i = 0; i < d.f.length; i++) { var m = d.zre[i] * d.zre[i] + d.zim[i] * d.zim[i]; t += d.f[i] + '\t' + (-d.zim[i] / m / (2 * Math.PI * d.f[i])) + '\n'; } $('#dos-cu').value = '1'; sets.dos.load(t, 'From the impedance data, C = Im(1/Z)/ω'); $('.nyq-tabs [data-pane=pane-dos]').click(); });
}
function drawEIS() { var d = eis.data, r = eis.res; if (!d) { ['eis-p1', 'eis-p2', 'eis-p3'].forEach(function (id) { $('#' + id).innerHTML = '<p class="nyq-empty muted">The plot appears here after data is loaded.</p>'; }); return; }
  var a = d.all, fit = { f: [], re: [], im: [] }; if (r) { var lo = Math.log10(Math.min.apply(null, d.f)), hi = Math.log10(Math.max.apply(null, d.f)); for (var i = 0; i <= 240; i++) { var f = Math.pow(10, lo + (hi - lo) * i / 240), z = zOf(eis.ck.ast, 2 * Math.PI * f, r.p); fit.f.push(f); fit.re.push(z[0]); fit.im.push(z[1]); } }
  function mod(re, im) { return re.map(function (v, i) { return Math.hypot(v, im[i]); }); } function ph(re, im) { return re.map(function (v, i) { return -Math.atan2(im[i], v) * 180 / Math.PI; }); }
  plot($('#eis-p1'), { series: [{ x: a.zre, y: a.zim.map(function (v) { return -v; }), label: 'Measured' }, { x: fit.re, y: fit.im.map(function (v) { return -v; }), line: 1, color: '--c-model', label: 'Fit' }], xlabel: 'Z′ (Ω)', ylabel: '−Z″ (Ω)', equal: true, h: 360 });
  plot($('#eis-p2'), { w: 380, h: 290, series: [{ x: a.f, y: mod(a.zre, a.zim), label: 'Measured' }, { x: fit.f, y: mod(fit.re, fit.im), line: 1, color: '--c-model', label: 'Fit' }], xlabel: 'Frequency (Hz)', ylabel: '|Z| (Ω)', xlog: true, ylog: true, legend: 'bottom' });
  plot($('#eis-p3'), { w: 380, h: 290, series: [{ x: a.f, y: ph(a.zre, a.zim), label: 'Measured' }, { x: fit.f, y: ph(fit.re, fit.im), line: 1, color: '--c-model', label: 'Fit' }], xlabel: 'Frequency (Hz)', ylabel: '−Phase (degrees)', xlog: true });
}
$('#eis-preset').addEventListener('change', function (e) { if (e.target.value) { $('#eis-ckt').value = e.target.value; runEIS(true); } });
$('#eis-ckt').addEventListener('change', function () { $('#eis-preset').value = ''; runEIS(true); });
['eis-fmt', 'eis-neg', 'eis-fa', 'eis-fb', 'eis-wt'].forEach(function (id) { $('#' + id).addEventListener('change', function () { runEIS(true); }); });

/* ---------- 3. trap density of states ---------- */
var dosRes = null;
var dosSet = dataset('dos', [{ key: 'f', label: 'Frequency (Hz)' }, { key: 'c', label: 'Capacitance' }], function () { runDOS(); });
function runDOS() { var out = $('#dos-out'), f = dosSet.col('f'), C = dosSet.col('c'); dosRes = null; if (!f || !C) { out.innerHTML = ''; drawDOS(); return; }
  var s = sampleOK(out); if (!s) { drawDOS(); return; }
  var vbi = val('dos-vbi'), W = val('dos-w'), nu0 = val('dos-nu'), cu = parseFloat($('#dos-cu').value), win = parseInt($('#dos-win').value, 10);
  if (!(vbi > 0) || !(W > 0) || !(nu0 > 0)) { dosRes = trapDOS(f, C.map(function (c) { return c * cu; }), s.area, 1, 1, s.T, 1e12, win); dosRes.partial = true; out.innerHTML = '<p class="nyq-bad">Enter V<sub>bi</sub>, the depletion width W and the attempt-to-escape frequency to obtain the trap density. V<sub>bi</sub> and W can be taken from the Mott–Schottky tab.</p>'; drawDOS(); return; }
  var r = trapDOS(f, C.map(function (c) { return c * cu; }), s.area, vbi, W * 1e-7, s.T, nu0, win); dosRes = r;
  var ea = val('dos-ea'), eb = val('dos-eb'), E = [], N = []; for (var i = r.E.length - 1; i >= 0; i--) { if ((isNum(ea) && r.E[i] < ea) || (isNum(eb) && r.E[i] > eb)) continue; E.push(r.E[i]); N.push(Math.max(r.Nt[i], 0)); }
  if (E.length < 3) { out.innerHTML = '<p class="nyq-bad">Fewer than three points fall in the chosen energy range.</p>'; drawDOS(); return; }
  var ip = 0; for (i = 1; i < N.length; i++) if (N[i] > N[ip]) ip = i; var tot = trapz(E, N), nt = [], negs = r.Nt.filter(function (v) { return v < 0; }).length;
  if (ip === 0 || ip === N.length - 1) nt.push('The largest value is at the edge of the energy range, so no peak is resolved. A wider frequency range or another temperature is needed to find the peak.');
  if (negs > r.Nt.length * 0.25) nt.push('The capacitance rises with frequency over part of the range (negative values, shown as gaps). This is usually series resistance or inductance at high frequency, not traps.');
  nt.push('The energy scale depends on the attempt-to-escape frequency: a factor of 10 in ν₀ shifts all energies by ' + fix(KB * s.T / Q * Math.log(10) * 1e3, 0) + ' meV. Take ν₀ from temperature-dependent C–f or DLTS where possible.');
  nt.push('In perovskite devices the low-frequency rise of the capacitance often comes from mobile ions or electrode polarisation. A density of states from that range should not be assigned to electronic traps without a check against temperature and bias.');
  out.innerHTML = rows([['Peak energy E<sub>ω</sub>', fix(E[ip], 3) + ' eV'], ['Peak density', sci(N[ip]) + ' cm⁻³ eV⁻¹'], ['Integrated trap density', sci(tot) + ' cm⁻³'], ['Energy range used', fix(E[0], 3) + ' to ' + fix(E[E.length - 1], 3) + ' eV']]) +
    '<p class="muted small">E<sub>ω</sub> = k<sub>B</sub>T ln(2πν₀/ω) is measured from the band edge. N<sub>t</sub>(E<sub>ω</sub>) = −(V<sub>bi</sub>/qW) (dC/dω) ω/k<sub>B</sub>T, after Walter et al., J. Appl. Phys. 80, 4411 (1996).</p>' + notes(nt) + '<p><button type="button" class="btn btn-ghost" id="dos-csv">Download results (CSV)</button></p>';
  $('#dos-csv').addEventListener('click', function () { download('trap-density.csv', 'peak energy,' + E[ip] + ',eV\npeak density,' + N[ip] + ',cm^-3 eV^-1\nintegrated density,' + tot + ',cm^-3\n\nf (Hz),E_omega (eV),-dC/dln(omega) (F/cm^2),N_t (cm^-3 eV^-1)\n' + r.fd.map(function (x, i) { return x + ',' + r.E[i] + ',' + r.dc[i] + ',' + r.Nt[i]; }).join('\n'), 'text/csv'); });
  drawDOS();
}
function drawDOS() { var r = dosRes; if (!r || !r.f.length) { ['dos-p1', 'dos-p2', 'dos-p3'].forEach(function (id) { $('#' + id).innerHTML = '<p class="nyq-empty muted">The plot appears here after data is loaded.</p>'; }); return; }
  plot($('#dos-p1'), { w: 380, h: 290, series: [{ x: r.f, y: r.ca.map(function (c) { return c * 1e9; }) }], xlabel: 'Frequency (Hz)', ylabel: 'Capacitance (nF cm⁻²)', xlog: true });
  plot($('#dos-p2'), { w: 380, h: 290, series: [{ x: r.fd, y: r.dc.map(function (c) { return c * 1e9; }) }], xlabel: 'Frequency (Hz)', ylabel: '−dC/d ln ω (nF cm⁻²)', xlog: true });
  if (r.partial) $('#dos-p3').innerHTML = '<p class="nyq-empty muted">The trap density appears here after V<sub>bi</sub>, W and ν₀ are entered.</p>';
  else { var ea = val('dos-ea'), eb = val('dos-eb'); plot($('#dos-p3'), { series: [{ x: r.E, y: r.Nt, line: 1, width: 1.2 }, { x: r.E, y: r.Nt }], xlabel: 'Demarcation energy (eV)', ylabel: 'Trap density of states (cm⁻³ eV⁻¹)', ylog: true, band: isNum(ea) && isNum(eb) ? [ea, eb] : null }); }
}
['dos-vbi', 'dos-w', 'dos-nu', 'dos-cu', 'dos-win', 'dos-ea', 'dos-eb'].forEach(function (id) { $('#' + id).addEventListener('change', runDOS); });

/* ---------- shared ---------- */
function redraw() { drawMS(); drawEIS(); drawDOS(); }
['s-area', 's-eps', 's-T', 's-d'].forEach(function (id) { $('#' + id).addEventListener('change', function () { runMS(); runDOS(); }); });
new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
redraw();
})();
