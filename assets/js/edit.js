// Private edit page. A member opens it with their own link, changes the form and sends it.
// Nothing changes on the website until the administrator approves the change on GitHub.
(function () {
  var app = document.getElementById('edit-app'); if (!app) return;
  var endpoint = app.getAttribute('data-endpoint');
  var params = new URLSearchParams(location.search);
  var who = params.get('who') || '', key = params.get('key') || '';
  var LINK_NAMES = { scholar: 'Google Scholar', orcid: 'ORCID', linkedin: 'LinkedIn', github: 'GitHub', irins: 'IRINS profile' };

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function show() { app.textContent = ''; for (var i = 0; i < arguments.length; i++) app.appendChild(arguments[i]); }
  function send(data) {
    data.who = who; data.key = key;
    return fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { error: 'The server could not be reached. Please try again later.' }; });
  }
  function field(label, input, hint) {
    var w = el('label', 'edit-field'); w.appendChild(el('span', 'edit-label', label)); w.appendChild(input);
    if (hint) w.appendChild(el('span', 'edit-hint', hint)); return w;
  }
  function input(value, type) { var i = el('input'); i.type = type || 'text'; i.value = value || ''; return i; }
  function area(value, rows) { var t = el('textarea'); t.rows = rows; t.value = value || ''; return t; }
  function status(form) { var s = el('p', 'edit-status'); s.setAttribute('role', 'status'); form.appendChild(s); return s; }
  function submitter(form, label, work) {
    var btn = el('button', 'btn', label); btn.type = 'submit'; form.appendChild(btn);
    var st = status(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); btn.disabled = true; st.className = 'edit-status'; st.textContent = 'Sending…';
      work().then(function (j) {
        btn.disabled = false;
        if (j.done) { st.className = 'edit-status ok'; st.textContent = 'Sent for approval. It will appear on the website once the administrator approves it.'; }
        else { st.className = 'edit-status bad'; st.textContent = j.error || 'Something went wrong. Please try again.'; }
      });
    });
  }
  // Shrink a chosen photo in the browser, so that only a small JPG is sent
  function readPhoto(file) {
    return new Promise(function (done) {
      if (!file) return done('');
      var img = new Image();
      img.onload = function () {
        var max = 640, k = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src); done(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { done(''); };
      img.src = URL.createObjectURL(file);
    });
  }

  function memberForm(f, linkKeys) {
    var form = el('form', 'edit-form');
    form.appendChild(el('h2', '', f.name || who));
    var role = input(f.role), topic = input(f.topic), email = input(f.email, 'email');
    form.appendChild(field('Position', role, 'For example: PhD Scholar, Electronics and Electrical Engineering'));
    form.appendChild(field('Research topic (one line)', topic));
    form.appendChild(field('Email', email));
    var links = {};
    linkKeys.forEach(function (k) { links[k] = input((f.links || {})[k], 'url'); form.appendChild(field(LINK_NAMES[k] || k, links[k], 'Full address starting with https://')); });
    var body = area(f.body, 14);
    form.appendChild(field('About your research', body, 'Leave an empty line between paragraphs. Use **two stars** for bold and *one star* for italic.'));
    var hi = area((f.highlights || []).join('\n'), 4), edu = area((f.education || []).join('\n'), 4);
    form.appendChild(field('Highlights (one per line, optional)', hi, 'Short key results, shown at the side of the page.'));
    form.appendChild(field('Education (one per line)', edu, 'For example: M.Tech, VLSI, NIT Manipur'));
    var photo = el('input'); photo.type = 'file'; photo.accept = 'image/jpeg,image/png';
    form.appendChild(field('New photo (optional)', photo, 'A clear head-and-shoulders picture. Leave empty to keep the current one.'));
    submitter(form, 'Send for approval', function () {
      return readPhoto(photo.files[0]).then(function (data) {
        var l = {}; linkKeys.forEach(function (k) { l[k] = links[k].value; });
        return send({ action: 'save', photo: data, fields: { role: role.value, topic: topic.value, email: email.value, links: l, body: body.value, highlights: hi.value, education: edu.value } });
      });
    });
    return form;
  }

  function adminView(info) {
    var wrap = el('div');
    // 1. Private links
    var s1 = el('section', 'edit-form'); s1.appendChild(el('h2', '', 'Private links for members'));
    s1.appendChild(el('p', 'muted', 'Send each member only their own link. A link can change only that member\'s page, and every change waits for your approval.'));
    var list = el('ul', 'edit-links');
    info.members.forEach(function (m) {
      var li = el('li'); li.appendChild(el('strong', '', m.slug));
      var a = el('a', '', 'Open'); a.href = m.link; li.appendChild(a);
      var b = el('button', 'cite-btn', 'Copy link'); b.type = 'button';
      b.addEventListener('click', function () { navigator.clipboard.writeText(m.link).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy link'; }, 1500); }); });
      li.appendChild(b); list.appendChild(li);
    });
    s1.appendChild(list); wrap.appendChild(s1);

    // 2. News
    var f2 = el('form', 'edit-form'); f2.appendChild(el('h2', '', 'Add a news item'));
    var nd = input(new Date().toISOString().slice(0, 10), 'date'), nt = input(''), nx = area('', 3), nl = input('');
    f2.appendChild(field('Date', nd)); f2.appendChild(field('Title', nt)); f2.appendChild(field('Text', nx));
    f2.appendChild(field('Link (optional)', nl, 'A page on this site such as /people/abinash-baruah/, or a full https:// address'));
    submitter(f2, 'Send for approval', function () { return send({ action: 'add-news', news: { date: nd.value, title: nt.value, text: nx.value, link: nl.value } }); });
    wrap.appendChild(f2);

    // 3. Publication
    var f3 = el('form', 'edit-form'); f3.appendChild(el('h2', '', 'Add a publication'));
    var pt = el('select'); info.types.forEach(function (t) { var o = el('option', '', { journal: 'Journal article', conference: 'Conference paper', preprint: 'Preprint', ip: 'Patent or copyright', talk: 'Talk' }[t] || t); o.value = t; pt.appendChild(o); });
    var py = input(String(new Date().getFullYear()), 'number'), ptitle = input(''), pa = input(''), pv = input(''), pd = input(''), pdoi = input(''), pn = input('');
    f3.appendChild(field('Type', pt)); f3.appendChild(field('Year', py)); f3.appendChild(field('Title', ptitle));
    f3.appendChild(field('Authors', pa, 'For example: A. Baruah, A. T. Mallajosyula'));
    f3.appendChild(field('Journal or conference', pv)); f3.appendChild(field('Volume and pages (optional)', pd, 'For example: 59, 015112'));
    f3.appendChild(field('DOI (optional)', pdoi, 'For example: 10.1088/1361-6463/ae27de')); f3.appendChild(field('Badge (optional)', pn, 'For example: Open access'));
    function checks(title, values) {
      var box = el('fieldset', 'edit-checks'); box.appendChild(el('legend', 'edit-label', title)); var all = [];
      values.forEach(function (v) { var l = el('label'); var c = el('input'); c.type = 'checkbox'; c.value = v; l.appendChild(c); l.appendChild(document.createTextNode(' ' + v)); box.appendChild(l); all.push(c); });
      f3.appendChild(box); return function () { return all.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }); };
    }
    var people = checks('Group members who are authors (the paper is shown on their pages)', info.members.map(function (m) { return m.slug; }));
    var areas = checks('Research areas', info.areas);
    submitter(f3, 'Send for approval', function () { return send({ action: 'add-paper', paper: { type: pt.value, year: py.value, title: ptitle.value, authors: pa.value, venue: pv.value, details: pd.value, doi: pdoi.value, note: pn.value, people: people(), areas: areas() } }); });
    wrap.appendChild(f3);
    return wrap;
  }

  if (!endpoint) return show(el('p', '', 'Editing is not switched on for this website.'));
  if (!who || !key) return show(el('p', '', 'This page opens only from a private edit link. Please ask the group administrator for your link.'));
  send({ action: who === 'admin' ? 'admin-load' : 'load' }).then(function (j) {
    if (j.members) show(adminView(j));
    else if (j.fields) show(memberForm(j.fields, j.linkKeys || []));
    else show(el('p', 'edit-status bad', j.error || 'This edit link is not valid.'));
  });
})();
