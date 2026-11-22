(function () {
  // Mobile menu
  var btn = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Light is the default. The visitor's choice is remembered and applies to every page.
  var tt = document.querySelector('.theme-toggle');
  if (tt) {
    tt.addEventListener('click', function () {
      var root = document.documentElement;
      var next = root.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
      if (next === 'dark') root.setAttribute('data-mode', 'dark'); else root.removeAttribute('data-mode');
      try { localStorage.setItem('nsdg-mode', next); } catch (e) {}
    });
  }

  var head = document.querySelector('.site-header');
  if (head) {
    var onScroll = function () { head.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // Publications filter
  var search = document.getElementById('pub-search');
  if (!search) return;
  var chips = document.querySelectorAll('.chip');
  var sections = document.querySelectorAll('.pub-section');
  var countEl = document.getElementById('pub-count');
  var type = 'all';
  // so that typing MAPbI3 finds MAPbI₃
  function plain(t) { return t.toLowerCase().replace(/[\u2080-\u2089]/g, function (c) { return String(c.charCodeAt(0) - 0x2080); }); }

  function apply() {
    var q = plain(search.value.trim());
    var shown = 0;
    sections.forEach(function (sec) {
      var typeOk = type === 'all' || sec.dataset.type === type;
      var any = false;
      sec.querySelectorAll('.pub').forEach(function (li) {
        var ok = typeOk && (!q || plain(li.textContent).indexOf(q) !== -1);
        li.classList.toggle('hidden', !ok);
        if (ok) { any = true; shown++; }
      });
      sec.querySelectorAll('.year').forEach(function (h) {
        var list = h.nextElementSibling;
        var vis = list && list.querySelector('.pub:not(.hidden)');
        h.classList.toggle('hidden', !vis);
        if (list) list.classList.toggle('hidden', !vis);
      });
      sec.classList.toggle('hidden', !any);
    });
    countEl.textContent = shown + (shown === 1 ? ' item' : ' items');
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      type = c.dataset.type;
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      apply();
    });
  });
  search.addEventListener('input', apply);
  apply();
})();

// Lightbox for gallery photos, lab photos and paper figures
(function () {
  var groups = document.querySelectorAll('.gallery, .figs, .lab-photos');
  if (!groups.length) return;
  var box = document.createElement('div');
  box.className = 'lb';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Image viewer');
  box.innerHTML = '<button class="lb-close" aria-label="Close">&times;</button>' +
    '<button class="lb-prev" aria-label="Previous">&#8249;</button>' +
    '<button class="lb-next" aria-label="Next">&#8250;</button>' +
    '<img alt=""><p class="lb-cap"></p><p class="lb-count"></p>';
  document.body.appendChild(box);
  var img = box.querySelector('img'), cap = box.querySelector('.lb-cap'), cnt = box.querySelector('.lb-count');
  var items = [], idx = 0, lastFocus = null;

  function show(i) {
    idx = (i + items.length) % items.length;
    var it = items[idx];
    img.src = it.src; img.alt = it.alt;
    cap.textContent = it.cap;
    cnt.textContent = items.length > 1 ? (idx + 1) + ' / ' + items.length : '';
    box.querySelector('.lb-prev').style.display = items.length > 1 ? '' : 'none';
    box.querySelector('.lb-next').style.display = items.length > 1 ? '' : 'none';
  }
  function open(list, i) {
    items = list; lastFocus = document.activeElement;
    show(i); box.classList.add('open'); document.body.classList.add('lb-lock');
    box.querySelector('.lb-close').focus();
  }
  function close() {
    box.classList.remove('open'); document.body.classList.remove('lb-lock');
    img.removeAttribute('src');
    if (lastFocus) lastFocus.focus();
  }
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
  box.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });
  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  });

  Array.prototype.forEach.call(groups, function (g) {
    var figs = g.querySelectorAll('figure');
    var list = Array.prototype.map.call(figs, function (f) {
      var a = f.querySelector('a'), im = f.querySelector('img'), fc = f.querySelector('figcaption');
      return { src: a ? a.getAttribute('href') : im.getAttribute('src'), alt: im ? im.alt : '', cap: fc ? fc.textContent.trim() : '' };
    });
    Array.prototype.forEach.call(figs, function (f, i) {
      var t = f.querySelector('a') || f.querySelector('img');
      if (!t) return;
      t.addEventListener('click', function (e) { e.preventDefault(); open(list, i); });
    });
  });
})();


// Site root, worked out from this script's own address, so links work wherever the site is hosted
var NSDG_ROOT = (function () {
  var s = document.querySelector('script[src*="assets/js/site.js"]');
  return s ? s.getAttribute('src').replace(/assets\/js\/site\.js.*$/, '') : '/';
})();
var NSDG_INDEX = '';

// Search: one box that looks through people, research pages, papers and news
(function () {
  var btn = document.querySelector('.search-open');
  if (!btn) return;
  var data = null, box, input, list, active = -1;
  function plain(t) { return (t || '').toLowerCase().replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 0x2080); }); }
  function href(u) { if (/^https?:/.test(u)) return u; u = NSDG_ROOT + u.replace(/^\//, ''); return /\/$/.test(u) || u === '' ? u + NSDG_INDEX : u; }
  function build() {
    box = document.createElement('div'); box.className = 'sr'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Search');
    box.innerHTML = '<div class="sr-box"><input type="search" placeholder="Search people, research, papers and news" aria-label="Search this site"><ul class="sr-list"></ul></div>';
    document.body.appendChild(box);
    input = box.querySelector('input'); list = box.querySelector('.sr-list');
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) {
      var links = list.querySelectorAll('a');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!links.length) return; active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links.forEach(function (a, i) { a.classList.toggle('active', i === active); }); links[active].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' && links.length) { e.preventDefault(); links[Math.max(active, 0)].click(); }
    });
  }
  function esc(t) { var d = document.createElement('span'); d.textContent = t || ''; return d.innerHTML; }
  function run() {
    var words = plain(input.value).split(/\s+/).filter(Boolean); active = -1;
    if (!words.length) { list.innerHTML = ''; return; }
    if (!data) { list.innerHTML = '<li class="sr-empty">Loading…</li>'; return; }
    var hits = [];
    data.forEach(function (d) {
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i], s = 0;
        if (d._t.indexOf(w) !== -1) s += 6;
        if (d._s.indexOf(w) !== -1) s += 3;
        if (d._x.indexOf(w) !== -1) s += 1;
        if (!s) return;
        score += s;
      }
      if (d.k === 'Person' || d.k === 'Research') score += 2;
      hits.push([score, d]);
    });
    hits.sort(function (a, b) { return b[0] - a[0]; });
    list.innerHTML = hits.length ? hits.slice(0, 12).map(function (h) { var d = h[1]; return '<li><a href="' + esc(href(d.u)) + '"><span class="sr-kind">' + esc(d.k) + '</span><span class="sr-title">' + esc(d.t) + '</span><span class="sr-sub">' + esc(d.s) + '</span></a></li>'; }).join('') : '<li class="sr-empty">Nothing found. Try a name, a material or a method.</li>';
  }
  function open() {
    if (!box) build();
    box.classList.add('open'); input.value = ''; list.innerHTML = ''; input.focus();
    if (!data) fetch(NSDG_ROOT + 'search.json').then(function (r) { return r.json(); }).then(function (j) {
      j.forEach(function (d) { d._t = plain(d.t); d._s = plain(d.s); d._x = plain(d.x); }); data = j; run();
    }).catch(function () { list.innerHTML = '<li class="sr-empty">Search could not be loaded.</li>'; });
  }
  function close() { if (box) box.classList.remove('open'); btn.focus(); }
  btn.addEventListener('click', open);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && box && box.classList.contains('open')) close();
    else if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
  });
})();

// Copy a citation or a BibTeX entry
(function () {
  function bibtex(d) {
    var authors = d.authors.replace(/\*/g, '').split(/,\s*/).join(' and ');
    var last = (d.authors.split(',')[0].replace(/\*/g, '').trim().split(' ').pop() || 'nsdg').toLowerCase().replace(/[^a-z]/g, '');
    var word = (d.title.toLowerCase().match(/[a-z]{4,}/) || ['paper'])[0];
    var f = [['author', authors], ['title', d.title], ['year', d.year]], kind = 'misc';
    if (d.type === 'journal') {
      kind = 'article'; f.push(['journal', d.venue]);
      var m = d.details.match(/^(\d+)(?:\((\d+)\))?,\s*(.+)$/);
      if (m) { f.push(['volume', m[1]]); if (m[2]) f.push(['number', m[2]]); f.push(['pages', m[3].replace('–', '--')]); }
    } else if (d.type === 'conference' || d.type === 'talk') {
      kind = 'inproceedings'; f.push(['booktitle', d.venue]); if (d.details) f.push(['pages', d.details.replace('–', '--')]);
    } else { f.push(['howpublished', d.venue + (d.details ? ', ' + d.details : '')]); }
    if (d.doi) f.push(['doi', d.doi]);
    return '@' + kind + '{' + last + d.year + word + ',\n' + f.map(function (x) { return '  ' + x[0] + ' = {' + x[1] + '}'; }).join(',\n') + '\n}';
  }
  function text(d) {
    return d.authors.replace(/\*/g, '') + ', "' + d.title + '," ' + d.venue + (d.details ? ' ' + d.details : '') + ' (' + d.year + ')' + (d.doi ? '. https://doi.org/' + d.doi : '.');
  }
  function copy(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } finally { a.remove(); } return Promise.resolve();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.pub-actions .cite-btn') : null;
    if (!b) return;
    var d = b.parentNode.dataset, label = b.textContent;
    copy(b.dataset.kind === 'bibtex' ? bibtex(d) : text(d)).then(function () {
      b.textContent = 'Copied'; b.classList.add('done');
      setTimeout(function () { b.textContent = label; b.classList.remove('done'); }, 1400);
    });
  });
})();

// Chat assistant: shown only when chat_endpoint is set in _config.yml. It answers from the website text.
(function () {
  var tag = document.querySelector('script[src*="assets/js/site.js"]');
  var endpoint = tag && tag.getAttribute('data-chat');
  if (!endpoint) return;
  var history = [], busy = false;
  function el(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt) e.textContent = txt; return e; }

  var open = el('button', 'chat-open'); open.type = 'button'; open.setAttribute('aria-expanded', 'false');
  open.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span>Ask about the group</span>';
  var panel = el('section', 'chat-panel'); panel.hidden = true; panel.setAttribute('aria-label', 'Website assistant');
  var head = el('div', 'chat-head'); head.appendChild(el('strong', '', 'Website assistant'));
  var close = el('button', 'chat-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close'); head.appendChild(close);
  var log = el('div', 'chat-log'); log.setAttribute('aria-live', 'polite');
  var form = el('form', 'chat-form');
  var input = el('input'); input.type = 'text'; input.maxLength = 500; input.placeholder = 'Type a question'; input.setAttribute('aria-label', 'Your question');
  var send = el('button', '', 'Send'); send.type = 'submit';
  form.appendChild(input); form.appendChild(send);
  var note = el('p', 'chat-note', 'Answers are generated by AI from the text of this website. Please check the linked page.');
  panel.appendChild(head); panel.appendChild(log); panel.appendChild(form); panel.appendChild(note);
  document.body.appendChild(open); document.body.appendChild(panel);

  // Show plain text, and turn [label](link) and bare links into real links. Nothing else is treated as HTML.
  function fill(node, text) {
    var re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g, last = 0, m;
    while ((m = re.exec(text))) {
      node.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = el('a', '', m[1] || m[3]); a.href = m[2] || m[3];
      if (a.host !== location.host) { a.target = '_blank'; a.rel = 'noopener'; }
      node.appendChild(a); last = re.lastIndex;
    }
    node.appendChild(document.createTextNode(text.slice(last)));
  }
  function add(role, text) {
    var b = el('div', 'chat-msg chat-' + role);
    fill(b, text.replace(/\*\*/g, '')); log.appendChild(b); log.scrollTop = log.scrollHeight; return b;
  }
  function toggle(show) {
    panel.hidden = !show; open.setAttribute('aria-expanded', show ? 'true' : 'false');
    if (show) { if (!log.firstChild) add('bot', 'Ask a question about the group, its research, people or publications.'); input.focus(); }
  }
  open.addEventListener('click', function () { toggle(panel.hidden); });
  close.addEventListener('click', function () { toggle(false); open.focus(); });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { toggle(false); open.focus(); } });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim(); if (!q || busy) return;
    busy = true; send.disabled = true; input.value = '';
    add('user', q); var wait = add('bot', 'Looking through the website…'); wait.classList.add('chat-wait');
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, history: history }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        wait.remove();
        if (j.answer) { add('bot', j.answer); history.push({ role: 'user', text: q }, { role: 'bot', text: j.answer }); }
        else add('bot', j.error || 'The assistant could not answer just now.');
      })
      .catch(function () { wait.remove(); add('bot', 'The assistant could not be reached. Please try again later.'); })
      .then(function () { busy = false; send.disabled = false; input.focus(); });
  });
})();

// Tools menu in the header: opens on click, closes on a click outside or the Escape key
(function () {
  var drop = document.querySelector('.nav-drop'); if (!drop) return;
  var btn = drop.querySelector('.nav-drop-btn');
  function set(open) { drop.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  btn.addEventListener('click', function (e) { e.stopPropagation(); set(!drop.classList.contains('open')); });
  document.addEventListener('click', function (e) { if (!drop.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drop.classList.contains('open')) { set(false); btn.focus(); } });
})();


// Home page research cards: on wide screens five cards are visible. When the reader scrolls down to
// them, the cards stay in place and slide left until the last card is fully in view, after which the
// page scrolls on as usual. Scrolling back up slides them to the right again.
(function () {
  var pin = document.querySelector('.area-pin'); if (!pin) return;
  var sticky = pin.querySelector('.area-sticky'), win = pin.querySelector('.area-window'), track = pin.querySelector('.area-grid');
  var cards = track ? track.children : []; var VISIBLE = 5, GAP = 14;
  var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var dist = 0, len = 0, top = 0, on = false, ticking = false;
  function off() {
    on = false; pin.classList.remove('hs-on'); pin.style.height = ''; track.style.transform = '';
  }
  function setup() {
    if (cards.length <= VISIBLE || window.innerWidth < 1000 || (motion && motion.matches)) return off();
    pin.classList.add('hs-on'); on = true;
    var w = win.clientWidth - 20;                      // inside the 10px padding on each side
    var cw = (w - GAP * (VISIBLE - 1)) / VISIBLE;
    pin.style.setProperty('--card-w', cw + 'px');
    dist = (cards.length - VISIBLE) * (cw + GAP);
    var header = document.querySelector('.site-header'), hh = header ? header.offsetHeight : 0;
    var sh = sticky.offsetHeight, ih = window.innerHeight;
    if (win.offsetHeight - 20 + hh + 12 > ih) return off();  // screen too short to hold the cards: keep the normal grid
    top = Math.max(hh + 8, Math.round((ih + hh - sh) / 2));
    if (top + sh > ih - 8) top = ih - 8 - sh;           // keep the whole cards in view; the heading may pass under the header
    pin.style.setProperty('--pin-top', top + 'px');
    len = Math.round(dist * 2.4);                      // page scroll used for the sideways slide
    pin.style.height = (sh + len) + 'px';
    update();
  }
  function update() {
    ticking = false; if (!on) return;
    var p = (top - pin.getBoundingClientRect().top) / len;
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    track.style.transform = 'translateX(' + (-p * dist).toFixed(1) + 'px)';
  }
  window.addEventListener('scroll', function () { if (on && !ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', setup);
  if (motion && motion.addEventListener) motion.addEventListener('change', setup);
  window.addEventListener('load', setup);
  setup();
})();
