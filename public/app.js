(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return String(n).replace('.', ','); };

  /* ---------- aperto / chiuso (orario di Lecco) ---------- */
  // Fasce orarie (ora di Lecco). Si può simulare un orario con ?ora=12:30 (e ?giorno=lun) nell'indirizzo.
  function openState() {
    var q = new URLSearchParams(location.search);
    var p = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    var get = function (t) { return p.filter(function (x) { return x.type === t; })[0].value; };
    var day = (q.get('giorno') || get('weekday')).toLowerCase();
    var min = parseInt(get('hour'), 10) % 24 * 60 + parseInt(get('minute'), 10);
    if (/^\d{1,2}:\d{2}$/.test(q.get('ora') || '')) { var hm = q.get('ora').split(':'); min = +hm[0] * 60 + +hm[1]; }
    var H = function (h, m) { return h * 60 + (m || 0); };
    if (day.indexOf('lun') === 0) return { open: false, txt: 'Oggi chiuso · riapriamo domani alle 7:45', band: 'colazione' };
    if (min < H(7, 45)) return { open: false, txt: 'Chiuso · apriamo alle 7:45', band: 'colazione' };
    if (min >= H(23)) return { open: false, txt: 'Chiuso · riapriamo domani alle 7:45', band: 'colazione' };
    if (min >= H(22)) return { open: true, txt: 'Quasi in chiusura · alle 23', band: 'chiusura', menu: 'bere', tag: 'tra poco' };
    if (min >= H(20)) return { open: true, txt: 'Aperto ora · fino alle 23', band: 'cena', menu: 'cena', tag: 'adesso' };
    if (min >= H(18)) return { open: true, txt: 'Aperto ora · fino alle 23', band: 'aperitivo', menu: 'aperitivo', tag: 'adesso' };
    if (min >= H(15)) return { open: true, txt: 'Aperto ora · fino alle 23', band: null, menu: 'bere' };
    if (min >= H(12)) return { open: true, txt: 'Aperto ora · fino alle 23', band: 'pranzo', menu: 'pranzo', tag: 'adesso' };
    return { open: true, txt: 'Aperto ora · fino alle 23', band: 'colazione', menu: 'colazione', tag: 'adesso' };
  }
  var state = openState();
  var T = window.t || function (x) { return x; };
  var status = $('status');
  // fascia attuale evidenziata negli orari, nelle schede e nelle categorie del menu
  var current = state.open ? state.menu : null;
  function applyState() {
    if (status) {
      $('statustxt').textContent = T(state.txt);
      status.classList.toggle('closed', !state.open);
      status.classList.toggle('soon', state.band === 'chiusura');
    }
    Array.prototype.forEach.call(document.querySelectorAll('.hrow[data-band]'), function (row) {
      var b = row.firstChild, on = state.open && row.getAttribute('data-band') === state.band;
      row.classList.toggle('now', on);
      b.textContent = T(b.getAttribute('data-l')) + (on ? ' · ' + T(state.tag) : '');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tab[data-band], .cats a[data-band]'), function (el) {
      var on = el.getAttribute('data-band') === current;
      el.classList.toggle('is-now', on);
      if (on) el.setAttribute('data-now', T('adesso'));
    });
  }
  applyState();

  /* ---------- tema chiaro / scuro ---------- */
  var themeBtn = document.querySelector('.theme');
  function themeLabel() {
    var dark = document.documentElement.dataset.theme === 'dark';
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', dark);
      themeBtn.setAttribute('aria-label', T(dark ? 'Tema chiaro' : 'Tema scuro'));
      themeBtn.setAttribute('title', T(dark ? 'Tema chiaro' : 'Tema scuro'));
    }
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#1B1310' : '#F6EFE6');
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      themeLabel();
    });
  }
  themeLabel();
  document.addEventListener('langchange', function () { applyState(); themeLabel(); relabelReviews(); });

  /* ---------- barra di avanzamento + rivelazione allo scorrimento ---------- */
  var bar = document.querySelector('.pbar');
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  var ticking = false;
  function onScroll() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
    reveals = reveals.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (reduce || (r.top < window.innerHeight * 0.92 && r.bottom > 0)) { el.classList.add('in'); return false; }
      return true;
    });
  }
  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  onScroll();

  var relabelReviews = function () {};

  /* ---------- schede del menu ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      var panel = $(t.getAttribute('aria-controls'));
      if (panel) {
        panel.hidden = !on;
        if (on && !reduce) {
          Array.prototype.forEach.call(panel.children, function (c, i) {
            c.animate([{ opacity: 0, transform: 'translateY(18px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 450, delay: i * 80, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
          });
        }
      }
    });
    if (focus) tab.focus();
  }
  if (tabs.length) {
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (n >= 0) { e.preventDefault(); select(tabs[(n + tabs.length) % tabs.length], true); }
      });
    });
    var first = tabs.filter(function (t) { return t.classList.contains('is-now'); })[0] || tabs[0];
    select(first);
  }

  // pagina del menu: si apre sulla sezione della fascia attuale
  var sec = current && !location.hash && $(current);
  if (sec && document.querySelector('.msec')) {
    setTimeout(function () {
      var top = sec.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    }, 700);
  }

  /* ---------- filtri allergeni e dieta ---------- */
  var active = {};
  var fbtns = Array.prototype.slice.call(document.querySelectorAll('.fchip'));
  var fclear = document.querySelector('.fclear');
  function applyFilters() {
    var any = Object.keys(active).some(function (k) { return active[k]; });
    Array.prototype.forEach.call(document.querySelectorAll('.item[data-allergens]'), function (item) {
      var al = (item.getAttribute('data-allergens') || '').split(',');
      var diet = item.getAttribute('data-diet') || '';
      var ok = true;
      if (active.glutine && al.indexOf('glutine') > -1) ok = false;
      if (active.latte && al.indexOf('latte') > -1) ok = false;
      if (active.vegetariano && !/vegetariano|vegano/.test(diet)) ok = false;
      if (active.vegano && diet !== 'vegano') ok = false;
      var was = item.hidden;
      item.hidden = !ok;
      if (ok && was && !reduce) { item.classList.remove('popin'); void item.offsetWidth; item.classList.add('popin'); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.items'), function (box) {
      var shown = box.querySelectorAll('.item:not([hidden])').length;
      var msg = box.querySelector('.empty');
      if (!shown && any) {
        if (!msg) { msg = document.createElement('p'); msg.className = 'empty'; box.appendChild(msg); }
        msg.textContent = T('Nessun piatto corrisponde ai filtri scelti.');
      } else if (msg) { msg.remove(); }
    });
    if (fclear) fclear.hidden = !any;
  }
  fbtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-f');
      active[k] = !active[k];
      // vegano implica vegetariano: i due filtri non hanno senso insieme
      if (k === 'vegano' && active.vegano) active.vegetariano = false;
      if (k === 'vegetariano' && active.vegetariano) active.vegano = false;
      fbtns.forEach(function (x) { x.setAttribute('aria-pressed', !!active[x.getAttribute('data-f')]); });
      applyFilters();
    });
  });
  if (fclear) fclear.addEventListener('click', function () {
    active = {};
    fbtns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
    applyFilters();
  });
  document.addEventListener('langchange', applyFilters);

  /* ---------- numeri ---------- */
  function countUp(el, to, dec, suffix, dur) {
    if (!el) return;
    if (reduce) { el.textContent = (dec ? fmt(to.toFixed(dec)) : to) + suffix; return; }
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3), v = to * e;
      el.textContent = (dec ? fmt(v.toFixed(dec)) : Math.round(v)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- recensioni Google in tempo reale ---------- */
  var wrap = $('qwrap');
  if (!wrap) return;
  var dots = $('dots');
  var data = [], seen = {}, cur = 0, timer = 0, lastCount = null;

  function fig(r, i) {
    var f = document.createElement('figure');
    var q = document.createElement('blockquote');
    q.textContent = '“' + r.text + '”';
    var c = document.createElement('figcaption');
    c.textContent = r.name + ' · ' + '★'.repeat(r.rating);
    f.append(q, c);
    f.dataset.i = i;
    return f;
  }
  function show(i, userAction) {
    if (!data.length) return;
    cur = (i + data.length) % data.length;
    Array.prototype.forEach.call(wrap.children, function (f, k) { f.classList.toggle('on', k === cur); });
    Array.prototype.forEach.call(dots.children, function (d, k) {
      if (k === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    if (userAction) restart();
  }
  function restart() {
    clearInterval(timer);
    if (!reduce) timer = setInterval(function () { show(cur + 1); }, 7000);
  }
  function add(r, fresh) {
    if (seen[r.id]) return;
    seen[r.id] = 1;
    var i = data.push(r) - 1;
    var f = fig(r, i);
    wrap.appendChild(f);
    var d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-label', reviewLabel(i));
    d.addEventListener('click', function () { show(i, true); });
    dots.appendChild(d);
    if (fresh) {
      var tag = document.createElement('span');
      tag.className = 'newtag';
      tag.textContent = T('Nuova');
      f.querySelector('figcaption').appendChild(tag);
      show(i, true);
    }
  }
  function reviewLabel(i) { return T('Recensione') + ' ' + (i + 1) + ' ' + T('di') + ' ' + data.length; }
  relabelReviews = function () {
    Array.prototype.forEach.call(dots.children, function (d, i) { d.setAttribute('aria-label', reviewLabel(i)); });
    Array.prototype.forEach.call(document.querySelectorAll('.newtag'), function (n) { n.textContent = T('Nuova'); });
  };
  function setStats(s) {
    var first = lastCount === null;
    ['count', 'count2'].forEach(function (id) {
      var el = $(id); if (!el) return;
      if (first) countUp(el, s.count, 0, '', 1500);
      else { el.textContent = s.count; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    ['avg', 'avg2'].forEach(function (id) {
      var el = $(id); if (!el) return;
      if (first) countUp(el, s.avg, 1, '★', 1500); else el.textContent = fmt(s.avg) + '★';
    });
    lastCount = s.count;
  }

  // scorrimento con il dito (o il mouse) a sinistra e a destra tra le recensioni
  var sx = null, sy = 0;
  wrap.parentNode.style.touchAction = 'pan-y';
  wrap.parentNode.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
  wrap.parentNode.addEventListener('pointerup', function (e) {
    if (sx === null) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) show(cur + (dx < 0 ? 1 : -1), true);
  });
  wrap.parentNode.addEventListener('pointercancel', function () { sx = null; });
  wrap.parentNode.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') show(cur + 1, true);
    if (e.key === 'ArrowLeft') show(cur - 1, true);
  });

  // Con il server Node le recensioni arrivano da /api/reviews (e si aggiornano dal vivo);
  // senza server (sito statico) si legge il file fisso /reviews.json.
  function load(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }
  function start(d, live) {
    d.reviews.forEach(function (r) { add(r, false); });
    setStats(d.stats);
    show(0);
    restart();
    if (!live || !window.EventSource) return;
    var es = new EventSource('/api/events');
    es.addEventListener('review', function (e) {
      var x = JSON.parse(e.data);
      add(x.review, true);
      setStats(x.stats);
    });
    es.addEventListener('stats', function (e) { setStats(JSON.parse(e.data).stats); });
  }
  load('/api/reviews').then(function (d) { start(d, true); }, function () {
    return load('/reviews.json').then(function (d) { start(d, false); });
  }).catch(function () {});
})();
