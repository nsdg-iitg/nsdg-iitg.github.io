// Private edit page. A member opens it with their own link, changes the form and sends it.
// Nothing changes on the website until the administrator approves the change on GitHub.
(function () {
  var app = document.getElementById('edit-app'); if (!app) return;
  var endpoint = app.getAttribute('data-endpoint');
  var params = new URLSearchParams(location.search);
  var who = params.get('who') || '', key = params.get('key') || '', areaSlug = params.get('area') || '';
  var LINK_NAMES = { scholar: 'Google Scholar', orcid: 'ORCID', linkedin: 'LinkedIn', github: 'GitHub', irins: 'IRINS profile' };

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function show() { app.textContent = ''; for (var i = 0; i < arguments.length; i++) app.appendChild(arguments[i]); }
  function send(data) {
    if (areaSlug) data.area = areaSlug; else data.who = who;
    data.key = key;
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
  function readPhoto(file, max) {
    max = max || 640;
    return new Promise(function (done) {
      if (!file) return done('');
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);   // PNG figures keep a white background
        cx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src); done(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { done(''); };
      img.src = URL.createObjectURL(file);
    });
  }

  var TYPE_NAMES = { journal: 'Journal article', conference: 'Conference paper', preprint: 'Preprint', ip: 'Patent or copyright', talk: 'Talk' };
  // The fields of one paper. With types and areas it is a group paper, without them an "other" paper.
  function paperInputs(box, types, areas, o) {
    o = o || {};
    var type = null, checks = [];
    if (types) { type = el('select'); types.forEach(function (t) { var op = el('option', '', TYPE_NAMES[t] || t); op.value = t; type.appendChild(op); }); box.appendChild(field('Type', type)); }
    var title = input(o.title), authors = input(o.authors), venue = input(o.venue), year = input(o.year || '', 'number'), details = input(o.details), doi = input(o.doi);
    box.appendChild(field('Title', title)); box.appendChild(field('Authors', authors, 'For example: A. Baruah, A. T. Mallajosyula'));
    box.appendChild(field('Journal or conference', venue)); box.appendChild(field('Year', year));
    box.appendChild(field('Volume and pages (optional)', details)); box.appendChild(field('DOI (optional)', doi, 'For example: 10.1088/1361-6463/ae27de'));
    if (areas) {
      var fs = el('fieldset', 'edit-checks'); fs.appendChild(el('legend', 'edit-label', 'Research areas'));
      areas.forEach(function (a) { var l = el('label'); var c = el('input'); c.type = 'checkbox'; c.value = a; l.appendChild(c); l.appendChild(document.createTextNode(' ' + a)); fs.appendChild(l); checks.push(c); });
      box.appendChild(fs);
    }
    return { read: function () {
      return { type: type ? type.value : '', title: title.value.trim(), authors: authors.value.trim(), venue: venue.value.trim(), year: year.value, details: details.value.trim(), doi: doi.value.trim(),
        areas: checks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }) };
    } };
  }

  function memberForm(f, linkKeys, info) {
    var form = el('form', 'edit-form');
    form.appendChild(el('h2', '', f.name || who));
    var role = input(f.role), topic = input(f.topic), email = input(f.email, 'email');
    form.appendChild(field('Position', role, 'For example: PhD Scholar, Electronics and Electrical Engineering'));
    var now = f.category === 'alumni' ? input(f.now) : null;   // only alumni have a current position; needs the current Worker
    if (now) form.appendChild(field('Current position', now, 'Shown on your card and page as "Now: …". For example: Postdoctoral researcher, IISc Bangalore'));
    form.appendChild(field('Research topic (one line)', topic));
    form.appendChild(field('Email', email));
    var links = {};
    linkKeys.forEach(function (k) { links[k] = input((f.links || {})[k], 'url'); form.appendChild(field(LINK_NAMES[k] || k, links[k], 'Full address starting with https://')); });
    var body = area(f.body, 14);
    form.appendChild(field('About your research', body, 'Leave an empty line between paragraphs. Use **two stars** for bold and *one star* for italic.'));
    var hi = area((f.highlights || []).join('\n'), 4), edu = area((f.education || []).join('\n'), 4);
    form.appendChild(field('Highlights (one per line, optional)', hi, 'Short key results, shown at the side of the page.'));
    form.appendChild(field('Education (one per line)', edu, 'For example: M.Tech, VLSI, NIT Manipur'));
    // Papers, in two groups
    form.appendChild(el('h3', 'edit-sub', 'Publications with this group'));
    form.appendChild(el('p', 'edit-hint', 'These are on the group Publications page and on your page.'));
    var gl = el('ul', 'edit-papers');
    (info.groupPapers || []).forEach(function (g) { gl.appendChild(el('li', '', g.title + (g.year ? ' (' + g.year + ')' : ''))); });
    if (!gl.firstChild) gl.appendChild(el('li', 'muted', 'None listed yet.'));
    form.appendChild(gl);
    var gbox = el('details', 'edit-box'); gbox.appendChild(el('summary', '', 'Add a paper with this group'));
    var g = paperInputs(gbox, info.types || [], info.areas || []);
    form.appendChild(gbox);

    form.appendChild(el('h3', 'edit-sub', 'Other publications'));
    form.appendChild(el('p', 'edit-hint', 'Papers from before you joined the group, or outside it. They are shown only on your page, under "Other publications", and are not counted in the group list.'));
    var rows = el('div', 'edit-rows'), others = [];
    function addRow(o) {
      var box = el('div', 'edit-box'); var r = paperInputs(box, null, null, o || {});
      var rm = el('button', 'cite-btn', 'Remove this paper'); rm.type = 'button';
      rm.addEventListener('click', function () { others.splice(others.indexOf(r), 1); box.remove(); });
      box.appendChild(rm); rows.appendChild(box); others.push(r);
    }
    (f.other || []).forEach(addRow);
    form.appendChild(rows);
    var more = el('button', 'btn ghost', 'Add another paper'); more.type = 'button';
    more.addEventListener('click', function () { addRow(); }); form.appendChild(more);

    var photo = el('input'); photo.type = 'file'; photo.accept = 'image/jpeg,image/png';
    form.appendChild(field('New photo (optional)', photo, 'A clear head-and-shoulders picture. Leave empty to keep the current one.'));
    submitter(form, 'Send for approval', function () {
      return readPhoto(photo.files[0]).then(function (data) {
        var l = {}; linkKeys.forEach(function (k) { l[k] = links[k].value; });
        var gp = g.read();
        return send({ action: 'save', photo: data, groupPaper: gp.title || gp.authors || gp.venue ? gp : null,
          fields: { role: role.value, topic: topic.value, now: now ? now.value : undefined, email: email.value, links: l, body: body.value, highlights: hi.value, education: edu.value, other: others.map(function (r) { return r.read(); }) } });
      });
    });
    return form;
  }

  // Research page form: texts, the people listed, figure captions and one new figure
  function areaForm(a, members) {
    var form = el('form', 'edit-form');
    form.appendChild(el('h2', '', a.title || areaSlug));
    var title = input(a.title), short = input(a.short), lead = area(a.lead, 3), cardLead = area(a.card_lead, 2), methods = area(a.methods, 3), body = area(a.body, 18);
    form.appendChild(field('Title', title));
    form.appendChild(field('Short name', short, 'One or two words, shown above the title on the cards.'));
    form.appendChild(field('Summary', lead, 'Two or three lines, shown at the top of the page and on the Research page.'));
    form.appendChild(field('Home page card text (optional)', cardLead, 'A shorter summary for the home page card. Leave empty to use the summary.'));
    form.appendChild(field('Methods (optional)', methods, 'Separate the items with a middle dot ·'));
    form.appendChild(field('Page text', body, 'Leave an empty line between paragraphs. Start a heading with ###, a list item with -, and use **two stars** for bold.'));
    var fs = el('fieldset', 'edit-checks'); fs.appendChild(el('legend', 'edit-label', 'People working on this topic'));
    var picks = [];
    members.concat(a.people.filter(function (p) { return members.indexOf(p) < 0; })).forEach(function (m) {
      var l = el('label'); var c = el('input'); c.type = 'checkbox'; c.value = m; c.checked = a.people.indexOf(m) >= 0;
      l.appendChild(c); l.appendChild(document.createTextNode(' ' + m)); fs.appendChild(l); picks.push(c);
    });
    form.appendChild(fs);
    form.appendChild(el('h3', 'edit-sub', 'Figures'));
    form.appendChild(el('p', 'edit-hint', 'Change a caption, or remove a figure from the page. Removed pictures stay in the website files.'));
    var rows = el('div', 'edit-rows'), figs = [];
    (a.figures || []).forEach(function (f) {
      var box = el('div', 'edit-box edit-fig');
      var img = el('img'); img.src = f.src; img.alt = ''; img.loading = 'lazy'; box.appendChild(img);
      var cap = area(f.caption, 3); box.appendChild(field('Caption', cap));
      var item = { src: f.src, cap: cap };
      var rm = el('button', 'cite-btn', 'Remove this figure'); rm.type = 'button';
      rm.addEventListener('click', function () { figs.splice(figs.indexOf(item), 1); box.remove(); });
      box.appendChild(rm); rows.appendChild(box); figs.push(item);
    });
    if (!figs.length) rows.appendChild(el('p', 'muted', 'No figures yet.'));
    form.appendChild(rows);
    var nbox = el('details', 'edit-box'); nbox.appendChild(el('summary', '', 'Add a new figure'));
    var nimg = el('input'); nimg.type = 'file'; nimg.accept = 'image/jpeg,image/png';
    var ncap = area('', 3);
    nbox.appendChild(field('Picture', nimg, 'A JPG or PNG. Large pictures are reduced to 1400 pixels wide before sending.'));
    nbox.appendChild(field('Caption', ncap, 'For a published figure, end with the source, for example: From A. Baruah et al., J. Phys. D 59, 015112 (2026).'));
    form.appendChild(nbox);
    submitter(form, 'Send for approval', function () {
      return readPhoto(nimg.files[0], 1400).then(function (data) {
        return send({ action: 'area-save', newFigure: data ? { image: data, caption: ncap.value } : null,
          fields: { title: title.value, short: short.value, lead: lead.value, card_lead: cardLead.value, methods: methods.value, body: body.value,
            people: picks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
            figures: figs.map(function (f) { return { src: f.src, caption: f.cap.value }; }) } });
      });
    });
    return form;
  }

  function linkList(items) {
    var list = el('ul', 'edit-links');
    items.forEach(function (m) {
      var li = el('li'); li.appendChild(el('strong', '', m.slug));
      var a = el('a', '', 'Open'); a.href = m.link; li.appendChild(a);
      var b = el('button', 'cite-btn', 'Copy link'); b.type = 'button';
      b.addEventListener('click', function () { navigator.clipboard.writeText(m.link).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy link'; }, 1500); }); });
      li.appendChild(b); list.appendChild(li);
    });
    return list;
  }

  function adminView(info) {
    var wrap = el('div');
    // 1. Private links
    var s1 = el('section', 'edit-form'); s1.appendChild(el('h2', '', 'Private links for members'));
    s1.appendChild(el('p', 'muted', 'Send each member only their own link. A link can change only that member\'s page, and every change waits for your approval.'));
    s1.appendChild(linkList(info.members)); wrap.appendChild(s1);

    // 1b. Research page links (needs the current Worker)
    if (info.areaLinks) {
      var s1b = el('section', 'edit-form'); s1b.appendChild(el('h2', '', 'Private links for research pages'));
      s1b.appendChild(el('p', 'muted', 'A research page link can change only the text, people and figures of that page. Every change waits for your approval.'));
      s1b.appendChild(linkList(info.areaLinks)); wrap.appendChild(s1b);
    }

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
  if (areaSlug && key) {
    return send({ action: 'area-load' }).then(function (j) {
      if (j.area) show(areaForm(j.area, j.members || []));
      else show(el('p', 'edit-status bad', j.error || 'This edit link is not valid.'));
    });
  }
  if (!who || !key) return show(el('p', '', 'This page opens only from a private edit link. Please ask the group administrator for your link.'));
  send({ action: who === 'admin' ? 'admin-load' : 'load' }).then(function (j) {
    if (j.members) show(adminView(j));
    else if (j.fields) show(memberForm(j.fields, j.linkKeys || [], j));
    else show(el('p', 'edit-status bad', j.error || 'This edit link is not valid.'));
  });
})();
