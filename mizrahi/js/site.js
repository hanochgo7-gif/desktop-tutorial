/* י. מזרחי בניה ושות׳ – התנהגות האתר. בלי ספריות. כל רכיב עובד גם בלי JS (התוכן גלוי, הקישורים אמיתיים). */
(function () {
  'use strict';
  var S = window.SITE || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- measurement
     Events always go to dataLayer (harmless without tags). GA4 / Google Ads load only after consent,
     and only when their ids are configured in tools/config.py. */
  window.dataLayer = window.dataLayer || [];
  function track(name, params) {
    params = params || {};
    params.page = location.pathname.split('/').pop() || 'index.html';
    window.dataLayer.push(Object.assign({ event: name }, params));
    if (window.gtag && consent() === 'yes') {
      window.gtag('event', name, params);
      var label = S.adsLabels && S.adsLabels[name];
      if (S.ads && label) window.gtag('event', 'conversion', { send_to: S.ads + '/' + label });
    }
  }
  window.mzTrack = track;

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-track]');
    if (!a) return;
    track(a.getAttribute('data-track'), { cta: a.getAttribute('data-cta') || '', text: (a.textContent || '').trim().slice(0, 60) });
  });

  // project pages viewed and moving between service pages
  var svc = { 'private-homes.html': 'private', 'residential-buildings.html': 'residential', 'public-buildings.html': 'public' };
  var here = location.pathname.split('/').pop();
  if (svc[here]) {
    var prev = '';
    try { prev = sessionStorage.getItem('mz_last_service') || ''; sessionStorage.setItem('mz_last_service', svc[here]); } catch (err) { /* private mode */ }
    track('service_view', { service: svc[here] });
    if (prev && prev !== svc[here]) track('service_switch', { from: prev, to: svc[here] });
  }
  if (here === 'projects.html') track('projects_view', {});

  /* ---------------------------------------------------------------- consent (only when a tag is configured) */
  function consent() { try { return localStorage.getItem('mz_consent'); } catch (err) { return null; } }
  function loadTags() {
    if (!(S.ga4 || S.ads) || window.gtag) return;
    var id = S.ga4 || S.ads;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    if (S.ga4) window.gtag('config', S.ga4, { anonymize_ip: true });
    if (S.ads) window.gtag('config', S.ads);
  }
  var grants = [];
  window.hgConsent = { onGrant: function (fn) { if (consent() === 'yes') fn(); else grants.push(fn); } };
  function setConsent(v) {
    try { localStorage.setItem('mz_consent', v); } catch (err) { /* ignore */ }
    if (v === 'yes') { loadTags(); grants.splice(0).forEach(function (fn) { fn(); }); }
  }
  function showConsent() {
    if ($('.consent')) return;
    var box = document.createElement('div');
    box.className = 'consent'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'הגדרות עוגיות');
    box.innerHTML = '<p>נשמח למדוד איך משתמשים באתר (Google Analytics) ואילו מודעות הביאו פניות. זה נעשה רק אם תאשרו. <a href="privacy.html">פרטים</a></p>' +
      '<div class="row"><button type="button" class="btn btn-small" data-c="yes">אישור</button><button type="button" class="btn btn-small btn-light" data-c="no">לא, תודה</button></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      setConsent(b.getAttribute('data-c')); box.remove();
    });
    $('button', box).focus();
  }
  if (S.ga4 || S.ads || S.hgos) {
    $$('[data-consent-open]').forEach(function (b) { b.hidden = false; b.addEventListener('click', showConsent); });
    if (consent() === 'yes') loadTags();
    else if (!consent()) setTimeout(showConsent, 1200);
  }

  /* ---------------------------------------------------------------- menu */
  var btn = $('.menu-btn'), menu = $('#menu');
  if (btn && menu) {
    var setMenu = function (open) {
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'סגירה' : 'תפריט';
      menu.hidden = !open;
      document.documentElement.style.overflow = open ? 'hidden' : '';
      if (open) { var f = $('a', menu); if (f) f.focus(); }
    };
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); } });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1080 && !menu.hidden) setMenu(false); });
  }

  /* ---------------------------------------------------------------- hero: 1963 and today, crossfading */
  var slides = $$('.hero .slide');
  var pause = $('.slides-pause');
  if (slides.length > 1 && !reduce) {
    var i = 0, timer = null, paused = false;
    var next = function () {
      slides[i].classList.remove('is-on');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-on');
      var cap = $('.rail-cap'), fc = $('figcaption', slides[i]);
      if (cap && fc) cap.textContent = fc.textContent;
    };
    var start = function () { if (!timer && !paused) timer = setInterval(next, 6500); };
    var stop = function () { clearInterval(timer); timer = null; };
    // the second photograph loads only once the page has settled
    var later = function () {
      slides.forEach(function (s) {
        var im = $('img', s);
        if (!im || !im.getAttribute('data-src')) return;
        im.loading = 'eager';
        im.srcset = im.getAttribute('data-srcset'); im.src = im.getAttribute('data-src');
        im.removeAttribute('data-srcset'); im.removeAttribute('data-src');
      });
      start();
    };
    if (document.readyState === 'complete') setTimeout(later, 1500); else window.addEventListener('load', function () { setTimeout(later, 1500); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    if (pause) pause.addEventListener('click', function () {
      paused = !paused;
      pause.setAttribute('aria-pressed', String(paused));
      pause.textContent = paused ? 'המשך החלפת התמונות' : 'עצירת החלפת התמונות';
      if (paused) stop(); else start();
    });
  } else if (pause) {
    pause.hidden = true;
  }

  /* ---------------------------------------------------------------- process row: buttons and progress */
  var row = $('.steps');
  if (row) {
    var bar = $('.process .progress span');
    var prevB = $('.process [data-dir="prev"]'), nextB = $('.process [data-dir="next"]');
    var update = function () {
      var max = row.scrollWidth - row.clientWidth;
      var pos = Math.abs(row.scrollLeft); // RTL scrollLeft runs negative
      var p = max > 0 ? pos / max : 1;
      if (bar) bar.style.width = Math.max(12, p * 100) + '%';
      if (prevB) prevB.disabled = pos < 4;
      if (nextB) nextB.disabled = pos > max - 4;
    };
    var step = function (dir) {
      var w = ($('.step', row) || {}).offsetWidth || 300;
      row.scrollBy({ left: (dir === 'next' ? -1 : 1) * (w + 32), behavior: reduce ? 'auto' : 'smooth' });
    };
    if (prevB) prevB.addEventListener('click', function () { step('prev'); });
    if (nextB) nextB.addEventListener('click', function () { step('next'); });
    row.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------------------------------------------------------- the checklist: pick a project, see what to ask */
  $$('.checklist').forEach(function (box) {
    var cols = $$('.check-col[data-for]', box);
    var share = $('[data-share-check]', box);
    var current = function () { var c = $('input[type=radio]:checked', box); return c ? c.value : 'private'; };
    var render = function (animate) {
      var k = current();
      cols.forEach(function (c) {
        var on = c.getAttribute('data-for') === k;
        c.hidden = !on;
        c.classList.toggle('just-in', on && animate && !reduce);
      });
      if (share) {
        var lines = [];
        $$('.check-col:not([hidden])', box).forEach(function (c) {
          lines.push('*' + $('h3', c).textContent + '*');
          $$('li', c).forEach(function (li) { lines.push('- ' + li.textContent); });
        });
        var label = ($('input[type=radio]:checked + span', box) || {}).textContent || '';
        share.href = 'https://wa.me/?text=' + encodeURIComponent('מה לשאול כל קבלן (' + label + '):\n' + lines.join('\n'));
      }
    };
    box.addEventListener('change', function (e) {
      if (!e.target.matches('input[type=radio]')) return;
      render(true);
      track('checklist_type', { type: current() });
      // carry the choice into the form on the same page, so the visitor does not choose twice
      var map = { private: 'בית פרטי', residential: 'בניין מגורים', public: 'מבנה ציבורי' };
      var formRadio = document.querySelector('.lead-form input[name=type][value="' + map[current()] + '"]');
      if (formRadio && !document.querySelector('.lead-form input[name=type]:checked')) formRadio.checked = true;
    });
    var pr = $('[data-print]', box);
    if (pr) pr.addEventListener('click', function () { track('checklist_print', { type: current() }); window.print(); });
    render(false);
  });

  /* ---------------------------------------------------------------- the lead form */
  var params = new URLSearchParams(location.search);
  $$('.lead-form').forEach(function (form) {
    var started = Date.now();
    var status = $('.form-status', form);
    var submit = $('button[type=submit]', form);
    if (params.get('ask') === 'projects') {
      var msg = $('textarea[name=message]', form);
      if (msg && !msg.value) msg.value = 'אשמח לקבל רשימת פרויקטים שביצעתם, בסוג ובהיקף דומים לפרויקט שלי.';
    }
    var show = function (field, bad) {
      var wrap = field.closest('.field'); var err = wrap && $('.err', wrap);
      if (wrap) wrap.classList.toggle('has-err', bad);
      if (err) err.hidden = !bad;
      field.setAttribute('aria-invalid', String(bad));
    };
    var phoneOk = function (v) {
      var d = v.replace(/[^\d+]/g, '').replace(/^\+?972/, '0');
      return /^0\d{8,9}$/.test(d);
    };
    var nameF = $('input[name=name]', form), phoneF = $('input[name=phone]', form);
    [nameF, phoneF].forEach(function (f) {
      if (!f) return;
      f.addEventListener('blur', function () {
        if (!f.value.trim()) return;
        show(f, f === phoneF ? !phoneOk(f.value) : f.value.trim().length < 2);
      });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true') show(f, f === phoneF ? !phoneOk(f.value) : f.value.trim().length < 2); });
    });
    var say = function (text, cls) {
      status.className = 'form-status ' + (cls || '');
      status.textContent = text;
      status.focus();
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var badName = !nameF.value.trim() || nameF.value.trim().length < 2;
      var badPhone = !phoneOk(phoneF.value);
      show(nameF, badName); show(phoneF, badPhone);
      if (badName || badPhone) { (badName ? nameF : phoneF).focus(); track('lead_form_error', { name: badName, phone: badPhone }); return; }
      // a bot fills hidden fields and submits within a second; people do neither
      if ($('input[name=hgos_hp]', form).value || Date.now() - started < 1500) { say('הפנייה התקבלה.', 'ok'); return; }

      var type = ($('input[name=type]:checked', form) || {}).value || '';
      var where = ($('input[name=location]', form) || {}).value || '';
      var message = ($('textarea[name=message]', form) || {}).value || '';
      var lead = {
        name: nameF.value.trim(), phone: phoneF.value.trim(), message: message.trim(), form: 'פנייה מהאתר',
        fields: [['סוג הפרויקט', type], ['מיקום', where.trim()], ['עמוד', document.title]].filter(function (f) { return f[1]; }),
      };
      var done = function () {
        form.classList.add('sent');
        say('תודה, ' + lead.name + '. הפנייה התקבלה, ונחזור אליכם בהקדם לשיחה ראשונה.', 'ok');
        track('lead_form_submit', { type: type || 'לא צוין' });
      };

      if (S.hgos && window.HGOS) {
        submit.setAttribute('aria-busy', 'true'); submit.disabled = true;
        window.HGOS.send(lead).then(function (r) {
          submit.removeAttribute('aria-busy'); submit.disabled = false;
          if (r && r.ok) done();
          else say('השליחה לא הצליחה, כנראה בגלל תקלה בחיבור. נסו שוב בעוד רגע' + (S.phone ? ', או התקשרו ' + S.phone : '') + '.', 'bad');
        });
      } else if (S.email) {
        var body = ['שם: ' + lead.name, 'טלפון: ' + lead.phone, type && 'סוג: ' + type, where && 'מיקום: ' + where, message && '\n' + message]
          .filter(Boolean).join('\n');
        location.href = 'mailto:' + S.email + '?subject=' + encodeURIComponent('פנייה מהאתר: ' + (type || 'פרויקט בנייה')) + '&body=' + encodeURIComponent(body);
        form.classList.add('sent');
        say('נפתחה הודעת אימייל מוכנה עם הפרטים. שלחו אותה, ונחזור אליכם.', 'ok');
        track('lead_form_submit', { type: type || 'לא צוין', via: 'mailto' });
      } else {
        say('האתר בגרסת תצוגה והטופס עוד לא מחובר, לכן הפנייה לא נשלחה. הבדיקה עברה: כל הפרטים תקינים.', '');
        track('lead_form_preview', { type: type });
      }
    });
  });

  /* ---------------------------------------------------------------- projects filter */
  var pf = $('.proj-filter');
  if (pf) pf.addEventListener('change', function () {
    var v = ($('input:checked', pf) || {}).value || '';
    $$('.proj').forEach(function (p) { p.hidden = v && p.getAttribute('data-type') !== v; });
  });

  /* ---------------------------------------------------------------- entrances: heading, then text, then picture */
  if (!reduce && 'IntersectionObserver' in window) {
    var groups = [
      ['.intro', '.intro-h, .intro-text, .intro-pic, .intro-small'],
      ['.what', '.what-h, .svc-table tr'],
      ['.heritage', '.h-sec, .heritage-lead, .tile-photo, .tile-color'],
      ['.process', '.h-sec, .step'],
      ['.checklist', '.h-sec, .lead, .check-tabs, .check-col'],
      ['.work-empty', '.h-sec, .lead, .btn'],
      ['.faq', '.h-sec, .faq-list details, .faq-pic'],
      ['.svc-who', '.h-sec, .who-list li'],
      ['.svc-phases', '.h-sec, .phases li'],
      ['.svc-prep', '.h-sec, .lead, .prep-list li'],
      ['.about-story', '.h-sec, .lead, .about-pic'],
      ['.about-process', '.h-sec, .phases li'],
      ['.contact', '.card'],
      ['.pair', '.pair-a, .pair-b'],
      ['.contact-page', '.card, .after .h-sec, .after-list li, .after-pic'],
      ['.page-top', '.page-lead'],
      ['.svc-hero', '.svc-hero-pic'],
      ['.site-foot', '.sign, .foot-nav, .foot-name'],
    ];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    groups.forEach(function (g) {
      $$(g[0]).forEach(function (sec) {
        $$(g[1], sec).forEach(function (el, n) {
          if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // already in view: leave it
          el.classList.add('rv');
          el.style.setProperty('--d', Math.min(n, 6) * 80 + 'ms');
          io.observe(el);
        });
      });
    });
  }
})();
