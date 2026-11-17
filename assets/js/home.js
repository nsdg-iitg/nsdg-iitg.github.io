/* Home page: start the scroll engine and keep the folio (the running chapter
   label in the margin) in step with the chapter on screen. */
(function () {
  'use strict';
  if (window.ScrollCraft) window.ScrollCraft.mount(document.body);
  var folio = document.getElementById('folio');
  var no = document.getElementById('folio-no'), title = document.getElementById('folio-t');
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
  if (!folio || !chapters.length) return;
  var current = null, queued = false;
  function update() {
    queued = false;
    var line = window.innerHeight * 0.5, found = chapters[0];
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].getBoundingClientRect().top <= line) found = chapters[i];
    }
    var foot = document.querySelector('.colophon');
    var atFoot = foot && foot.getBoundingClientRect().top <= line;
    var key = atFoot ? 'foot' : found.id;
    if (key === current) return;
    current = key;
    no.textContent = atFoot ? '' : found.getAttribute('data-chapter');
    title.textContent = atFoot ? 'Colophon' : found.getAttribute('data-title');
    folio.classList.toggle('folio--dark', atFoot || found.getAttribute('data-ground') === 'dark');
    folio.classList.toggle('folio--hidden', !atFoot && (found.id === 'top' || found.id === 'people'));
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
