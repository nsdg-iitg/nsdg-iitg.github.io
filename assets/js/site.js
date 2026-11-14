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

  // Light / dark toggle (remembered per visitor)
  var tt = document.querySelector('.theme-toggle');
  if (tt) {
    tt.addEventListener('click', function () {
      var root = document.documentElement;
      var current = root.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // Publications filter
  var search = document.getElementById('pub-search');
  if (!search) return;
  var chips = document.querySelectorAll('.chip');
  var sections = document.querySelectorAll('.pub-section');
  var countEl = document.getElementById('pub-count');
  var type = 'all';

  function apply() {
    var q = search.value.trim().toLowerCase();
    var shown = 0;
    sections.forEach(function (sec) {
      var typeOk = type === 'all' || sec.dataset.type === type;
      var any = false;
      sec.querySelectorAll('.pub').forEach(function (li) {
        var ok = typeOk && (!q || li.textContent.toLowerCase().indexOf(q) !== -1);
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
