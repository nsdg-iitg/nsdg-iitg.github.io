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

  // Every page opens in light; the toggle switches the current page only
  var tt = document.querySelector('.theme-toggle');
  if (tt) {
    tt.addEventListener('click', function () {
      var root = document.documentElement;
      var current = root.getAttribute('data-mode') || 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-mode', next);
    });
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
