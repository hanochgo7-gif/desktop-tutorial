/* קרודו הנדסה · התנהגות האתר: תפריט, כניסות, מבט של בודק, סיור, הדוח, הטופס */
(function () {
  'use strict';
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_IO = 'IntersectionObserver' in window;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function track(event, data) {
    var o = { event: event };
    for (var k in data) o[k] = data[k];
    (window.dataLayer = window.dataLayer || []).push(o);
  }

  // ---------- תפריט נייד ----------
  var menu = $('#menu'), openBtn = $('[data-menu-open]');
  if (menu && openBtn) {
    var open = function () {
      menu.hidden = false;
      openBtn.setAttribute('aria-expanded', 'true');
      document.documentElement.style.overflow = 'hidden';
      var first = $('a, button', menu);
      if (first) first.focus();
    };
    var close = function (focusBack) {
      menu.hidden = true;
      openBtn.setAttribute('aria-expanded', 'false');
      document.documentElement.style.overflow = '';
      if (focusBack !== false) openBtn.focus();
    };
    openBtn.addEventListener('click', open);
    menu.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-menu-close], a');
      if (!t) return;
      close(t.hasAttribute('data-menu-close') && t.tagName === 'BUTTON');
    });
    menu.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { close(); return; }
      if (ev.key !== 'Tab') return;
      var f = $$('a, button', menu), a = f[0], z = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); }
      else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); }
    });
  }

  // ---------- כניסות בגלילה (פעם אחת) ----------
  var reveals = $$('[data-reveal]');
  if (HAS_IO && !REDUCED) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); rio.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el, i) {
      // מדרגות קטנות בין אחים באותה רשימה
      var sib = el.parentElement ? $$(':scope > [data-reveal], :scope > li > [data-reveal]', el.parentElement) : [];
      var k = Math.max(0, sib.indexOf(el));
      if (k) el.style.transitionDelay = Math.min(k, 6) * 70 + 'ms';
      rio.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ---------- מבט של בודק ----------
  var FIND = {};
  try { FIND = JSON.parse(($('#k-findings') || {}).textContent || '{}'); } catch (err) { FIND = {}; }
  $$('[data-eye]').forEach(function (btn) {
    var host = document.getElementById(btn.getAttribute('data-eye'));
    if (!host || !host._k) { btn.hidden = true; return; }
    var api = host._k, fig = btn.closest('figure') || document, say = $('[data-eye-say]', fig), on = false;
    function setSay(t) { if (say) say.textContent = t; }
    btn.addEventListener('click', function () {
      on = !on;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      api.show(on ? 'all' : '');
      api.pins.forEach(function (o) { o.b.classList.remove('active'); });
      if (on) api.scan();
      setSay(on ? say.getAttribute('data-on') : say.getAttribute('data-off'));
      track('inspector_view', { on: on });
    });
    api.pins.forEach(function (o) {
      o.b.addEventListener('click', function () {
        api.pins.forEach(function (x) { x.b.classList.toggle('active', x === o); });
        var f = FIND[o.p.id];
        if (f) setSay(f[0] + ': ' + f[1]);
        track('finding_open', { finding: o.p.id });
      });
      var f = FIND[o.p.id];
      if (f) o.b.setAttribute('aria-label', f[0] + '. ' + f[1]);
    });
  });

  // ---------- סיור בתחנות: המצלמה עוברת לפי הגלילה ----------
  $$('[data-tour]').forEach(function (wrap) {
    var host = document.getElementById(wrap.getAttribute('data-tour'));
    if (!host || !host._k || !HAS_IO) return;
    var api = host._k, current = '';
    var marks = $$('.step', wrap);
    var head = $('.tour__head', wrap);
    function go(cam, show, id) {
      if (id === current) return;
      current = id;
      api.go(cam);
      api.show(show);
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var s = en.target;
        if (s === head) go('overview', '', 'head');
        else go(s.getAttribute('data-cam'), s.getAttribute('data-show'), s.getAttribute('data-step'));
      });
    }, { rootMargin: '-42% 0px -42% 0px' });
    if (head) io.observe(head);
    marks.forEach(function (m) { io.observe(m); });
  });

  // ---------- הדוח: מסגרת אחת, שלושה מרחקים ----------
  var rep = $('[data-report]');
  if (rep) {
    var frame = $('.report__frame', rep), sheet = $('.sheet', rep), stage = $('.report__stage', rep);
    var targets = { 2: $('[data-target="text"]', sheet), 3: $('[data-target="detail"]', sheet) };
    var ZOOM = { 1: 1, 2: 1.8, 3: 2.4 }, dist = 0;
    var center = function (el) {
      var x = 0, y = 0, n = el;
      while (n && n !== sheet) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 };
    };
    var apply = function (d) {
      var fw = frame.clientWidth, fh = frame.clientHeight, s = (fw / 960) * ZOOM[d], tx = 0, ty = 0;
      if (d > 1 && targets[d]) {
        var c = center(targets[d]);
        tx = Math.min(0, Math.max(fw - 960 * s, fw / 2 - c.x * s));
        ty = Math.min(0, Math.max(fh - 1200 * s, fh / 2 - c.y * s));
      }
      sheet.style.setProperty('--ss', s.toFixed(4));
      sheet.style.setProperty('--sx', tx.toFixed(1) + 'px');
      sheet.style.setProperty('--sy', ty.toFixed(1) + 'px');
      stage.setAttribute('data-d', d);
    };
    var onScroll = function () {
      var r = rep.getBoundingClientRect(), span = r.height - innerHeight;
      var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      var d = REDUCED ? 1 : (p < 0.3 ? 1 : p < 0.64 ? 2 : 3);
      if (d !== dist) { dist = d; apply(d); }
    };
    var ticking = false;
    addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; onScroll(); });
    }, { passive: true });
    addEventListener('resize', function () { apply(dist || 1); });
    apply(1); dist = 1; onScroll();
  }

  // ---------- הוכחות: שם אחד מואר בכל פעם ----------
  var creds = $('[data-creds]');
  if (creds && !REDUCED) {
    var ns = $$('.n', creds), ci = 0, timer = 0;
    var lit = function () { ns.forEach(function (n, i) { n.classList.toggle('is-lit', i === ci); }); ci = (ci + 1) % ns.length; };
    if (HAS_IO) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting && !timer) { lit(); timer = setInterval(lit, 2000); }
          else if (!en.isIntersecting && timer) { clearInterval(timer); timer = 0; }
        });
      }).observe(creds);
    }
  }

  // ---------- טופס: נפתח כהודעה מוכנה בוואטסאפ ----------
  $$('[data-quote]').forEach(function (f) {
    var err = $('.quote__err', f);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = function (n) { var el = f.elements[n]; if (!el) return ''; if (el.length && el[0] && el[0].type === 'radio') { for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value; return ''; } return (el.value || '').trim(); };
      var type = v('type'), city = v('city'), size = v('size'), name = v('name'), note = v('note');
      if (!type && !note) {
        err.textContent = 'בחרו סוג בדיקה, או כתבו בקצרה במה מדובר.';
        var first = f.querySelector('input[name="type"]');
        if (first) first.focus();
        return;
      }
      err.textContent = '';
      var lines = ['שלום רביד' + (name ? ', כאן ' + name : '') + '.'];
      if (type) lines.push('סוג הבדיקה: ' + type);
      if (city) lines.push('עיר: ' + city);
      if (size) lines.push('גודל: ' + size + (/^[\d.,\s]+$/.test(size) ? ' מ״ר' : ''));
      if (note) lines.push(note);
      lines.push('(נשלח מהאתר)');
      var url = 'https://wa.me/972547560711?text=' + encodeURIComponent(lines.join('\n'));
      track('form_submit', { type: type || 'other' });
      // העתק במייל: כבוי עד שרביד מאשר כתובת (data-copy-to)
      var to = f.getAttribute('data-copy-to');
      if (to && window.fetch) {
        fetch(to, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ _subject: 'פנייה מהאתר: ' + (type || 'אחר'), name: name, type: type, city: city, size: size, note: note, _honey: v('_honey') }) }).catch(function () {});
      }
      var w = window.open(url, '_blank');
      if (w) { try { w.opener = null; } catch (x) { /* */ } } else { location.href = url; }
    });
    f.addEventListener('change', function () { if (err.textContent) err.textContent = ''; });
  });

  // ---------- הדפסה ----------
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  // ---------- מדידה: לחיצות על וואטסאפ וחיוג ----------
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[data-wa], a[data-tel], a[data-vcf], a[data-pdf], a[data-sample]');
    if (!a) return;
    if (a.hasAttribute('data-wa')) track('whatsapp_click', { source: a.getAttribute('data-wa') });
    else if (a.hasAttribute('data-tel')) track('phone_click', { source: a.getAttribute('data-tel') });
    else if (a.hasAttribute('data-vcf')) track('vcard_download', {});
    else if (a.hasAttribute('data-sample')) track('sample_report_download', {});
    else track('checklist_download', {});
  });
})();
