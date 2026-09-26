/* ש. גוטובסקי – סקריפט ראשי
   אנימציות עם GSAP + ScrollTrigger כשהן זמינות; ללא GSAP, בהפחתת תנועה
   או כשמופעל "עצירת אנימציות" בתפריט הנגישות – הכול מוצג מיד ובלי תנועה. */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var mqDesktop = window.matchMedia('(min-width: 1000px)');

  function noMotion() { return mqReduce.matches || root.classList.contains('a11y-no-motion'); }

  /* ---------- עמודי מאמר ומסמכים נפתחים תמיד מלמעלה (גם כשהדפדפן או המציג שומרים גלילה קודמת) ---------- */
  if (!body.classList.contains('has-hero') && !location.hash) {
    if ('scrollRestoration' in history) { try { history.scrollRestoration = 'manual'; } catch (e) {} }
    var toTop = function () { try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); } root.scrollTop = 0; body.scrollTop = 0; };
    toTop();
    window.addEventListener('pageshow', toTop);
    window.addEventListener('load', function () { setTimeout(toTop, 0); });
  }
  function hasGsap() { return !!(window.gsap && window.ScrollTrigger); }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- כותרת עליונה: צבע לפי הקטע, הסתרה בגלילה ---------- */
  var header = $('.header');
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      if (y > 300 && y > lastY + 6 && !body.classList.contains('menu-open')) header.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 300) header.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var themed = $$('[data-theme]').filter(function (el) { return !el.classList.contains('header'); });
  if (header && themed.length && 'IntersectionObserver' in window) {
    var themeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) header.setAttribute('data-theme', e.target.getAttribute('data-theme')); });
    }, { rootMargin: '-40px 0px -85% 0px', threshold: 0 });
    themed.forEach(function (el) { themeIO.observe(el); });
  }

  /* ---------- תפריט מסך מלא ---------- */
  var toggle = $('.nav-toggle');
  var menu = $('#mobile-menu');
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
    menu.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
    body.style.overflow = open ? 'hidden' : '';
    if (open && header) { header.classList.remove('is-hidden'); header.setAttribute('data-theme', 'dark'); }
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });
  }

  /* ---------- תפריט נפתח: תחומי פעילות ---------- */
  $$('.nav__item--sub').forEach(function (li) {
    var caret = $('.nav__caret', li);
    if (!caret) return;
    function setSub(open) { li.classList.toggle('is-open', open); caret.setAttribute('aria-expanded', String(open)); }
    caret.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); setSub(!li.classList.contains('is-open')); });
    document.addEventListener('click', function (e) { if (!li.contains(e.target)) setSub(false); });
    li.addEventListener('keydown', function (e) { if (e.key === 'Escape' && li.classList.contains('is-open')) { setSub(false); caret.focus(); } });
    li.addEventListener('mouseleave', function () { setSub(false); });
  });

  /* ---------- קישור פעיל בניווט ---------- */
  var navLinks = $$('.nav a[href^="#"]');
  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navIO.observe(s); });
  }

  /* ---------- פיצול כותרות למילים (לאנימציה) ---------- */
  $$('[data-split]').forEach(function (el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    var out = '';
    Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeType === 3) {
        out += node.textContent.split(/(\s+)/).map(function (t) { return /^\s+$/.test(t) || !t ? t : '<span class="w"><span>' + t + '</span></span>'; }).join('');
      } else if (node.nodeType === 1) {
        var inner = node.textContent.split(/(\s+)/).map(function (t) { return /^\s+$/.test(t) || !t ? t : '<span class="w"><span>' + t + '</span></span>'; }).join('');
        out += '<' + node.tagName.toLowerCase() + (node.className ? ' class="' + node.className + '"' : '') + '>' + inner + '</' + node.tagName.toLowerCase() + '>';
      }
    });
    el.innerHTML = out;
  });

  /* ---------- מניפסט: פיצול למילים ---------- */
  $$('[data-scrub-text]').forEach(function (el) {
    if (el.dataset.scrubDone) return;
    el.dataset.scrubDone = '1';
    var out = '';
    Array.prototype.forEach.call(el.childNodes, function (node) {
      var cls = node.nodeType === 1 ? node.className : '';
      var text = node.textContent;
      var words = text.split(/(\s+)/).map(function (t) { return /^\s+$/.test(t) || !t ? t : '<span class="sw' + (cls ? ' ' + cls : '') + '">' + t + '</span>'; }).join('');
      out += words;
    });
    el.innerHTML = out;
  });

  /* ---------- חשיפה בגלילה (נפילה ללא GSAP) ---------- */
  var reveals = $$('.reveal');
  /* כניסה מדורגת: בתוך [data-stagger] כל פריט מקבל השהיה לפי מקומו (עד 8), והקבוצה נחשפת יחד */
  $$('[data-stagger]').forEach(function (box) {
    $$('.reveal', box).forEach(function (el, i) { el.style.setProperty('--i', String(Math.min(i, 8))); });
  });
  if (noMotion() || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var box = e.target.closest('[data-stagger]');
        (box ? $$('.reveal', box) : [e.target]).forEach(function (el) { el.classList.add('is-visible'); revIO.unobserve(el); });
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { revIO.observe(el); });
  }

  /* ---------- טקסט שמחליק בהובר, אות אחר אות (כפתורים וקישורי התפריט) ---------- */
  if (!noMotion() && mqFine.matches) {
    $$('.btn, .nav > ul > li > a, .nav__sub-all, .ann__link').forEach(function (el) {
      var tn = Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); });
      if (tn.length !== 1) return;
      var t = tn[0].textContent.trim();
      var w = document.createElement('span'); w.className = 'tw';
      [0, 1].forEach(function (k) {
        var row = document.createElement('span'); if (k) row.setAttribute('aria-hidden', 'true');
        Array.from(t).forEach(function (ch, i) { var c = document.createElement('span'); c.className = 'ch'; c.textContent = ch; c.style.setProperty('--i', String(Math.min(i, 22))); row.appendChild(c); });
        w.appendChild(row);
      });
      tn[0].parentNode.replaceChild(w, tn[0]);
      el.classList.add('has-tw');
    });
  }

  /* ---------- שלבי העבודה: אקורדיון שמחליף תמונה, מתקדם אוטומטית עם פס התקדמות ---------- */
  $$('[data-steps]').forEach(function (box) {
    var items = $$('.steps__item', box), imgs = $$('.steps__media img', box);
    var tag = $('.steps__tag', box), cap = $('.steps__captext', box), list = $('.steps__list', box);
    var cur = 0, timer = null, running = false, paused = false, DUR = 7000;
    var auto = !noMotion() && 'IntersectionObserver' in window;
    items.forEach(function (it) { var bar = document.createElement('span'); bar.className = 'steps__bar'; it.appendChild(bar); });
    function resetBar(it) { var bar = $('.steps__bar', it); if (!bar) return; bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)'; void bar.offsetWidth; bar.style.transition = ''; bar.style.transform = ''; }
    function schedule() {
      clearTimeout(timer);
      if (running && !paused && auto) { box.classList.add('is-running'); timer = setTimeout(function () { openStep((cur + 1) % items.length); }, DUR); }
      else box.classList.remove('is-running');
    }
    function openStep(i) {
      cur = (i + items.length) % items.length;
      items.forEach(function (it, j) { var on = j === cur; it.classList.toggle('is-open', on); $('.steps__btn', it).setAttribute('aria-expanded', String(on)); });
      var k = parseInt(items[cur].dataset.img, 10);
      imgs.forEach(function (im, j) {
        im.classList.toggle('is-on', j === k);
        if (j === k) { if (tag) tag.textContent = im.dataset.tag || ''; if (cap) cap.textContent = im.dataset.cap || ''; }
      });
      resetBar(items[cur]);
      schedule();
    }
    items.forEach(function (item, i) {
      $('.steps__btn', item).addEventListener('click', function () { openStep(i); });
    });
    if (auto && list) {
      var ctrl = document.createElement('div'); ctrl.className = 'steps__ctrl';
      ctrl.innerHTML = '<button type="button" data-step="-1" aria-label="השלב הקודם"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button><button type="button" data-step="1" aria-label="השלב הבא"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button><span>השלבים מתחלפים לבד. העכבר מעליהם עוצר.</span>';
      list.appendChild(ctrl);
      $$('[data-step]', ctrl).forEach(function (b) { b.addEventListener('click', function () { openStep(cur + parseInt(b.dataset.step, 10)); }); });
      function pause() { paused = true; clearTimeout(timer); box.classList.remove('is-running'); var bar = $('.steps__bar', items[cur]); if (bar) { bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)'; } }
      function resume() { if (!paused) return; paused = false; if (running) openStep(cur); }
      box.addEventListener('mouseenter', pause);
      box.addEventListener('mouseleave', resume);
      box.addEventListener('focusin', pause);
      box.addEventListener('focusout', function (e) { if (!box.contains(e.relatedTarget)) resume(); });
      box.addEventListener('touchstart', function () { pause(); }, { passive: true });
      var sIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !running) { running = true; openStep(cur); }
          else if (!e.isIntersecting && running) { clearTimeout(timer); box.classList.remove('is-running'); running = false; }
        });
      }, { threshold: 0.35 });
      sIO.observe(box);
    }
  });

  /* ---------- תרשים צינור: הצמתים נכנסות בזו אחר זו, הקווים זורמים ---------- */
  $$('[data-pipe]').forEach(function (pipe) {
    $$('.pipe__node', pipe).forEach(function (n, i) { n.style.transitionDelay = (i * 120) + 'ms'; });
    $$('.pipe__flow', pipe).forEach(function (f, i) { f.style.transitionDelay = (i * 120 + 200) + 'ms'; });
    if (noMotion() || !('IntersectionObserver' in window)) { pipe.classList.add('is-in'); return; }
    var pIO = new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) { pipe.classList.add('is-in'); pIO.disconnect(); } }); }, { threshold: 0.3 });
    pIO.observe(pipe);
  });

  /* ---------- לוגואי לקוחות: מרקיזה שמאיצה ומחליפה כיוון לפי הגלילה ---------- */
  var mqTrack = $('.marquee__track');
  if (mqTrack && !noMotion()) {
    var mqList = $('.marquee__list', mqTrack);
    var mqW = mqList ? mqList.getBoundingClientRect().width : 0;
    if (mqW > 0) {
      mqTrack.classList.add('is-js');
      var mqPos = 0, mqSpeed = .5, mqWant = .5, mqBase = .5, mqDir = 1, mqLastY = window.scrollY, mqLastT = performance.now(), mqTimer = null;
      window.addEventListener('scroll', function () {
        var now = performance.now(), dy = window.scrollY - mqLastY, dt = Math.max(16, now - mqLastT);
        var v = dy / dt * 1000;
        if (Math.abs(v) > 40) { mqDir = v > 0 ? 1 : -1; mqWant = mqDir * Math.min(Math.abs(v) * 0.004, 4); }
        mqLastY = window.scrollY; mqLastT = now;
        clearTimeout(mqTimer); mqTimer = setTimeout(function () { mqWant = mqBase * mqDir; }, 300);
      }, { passive: true });
      window.addEventListener('resize', function () { mqW = mqList.getBoundingClientRect().width; });
      (function mqTick() {
        mqSpeed += (mqWant - mqSpeed) * .08;
        mqPos = (((mqPos + mqSpeed) % mqW) + mqW) % mqW;
        mqTrack.style.transform = 'translateX(' + mqPos.toFixed(2) + 'px)';
        requestAnimationFrame(mqTick);
      })();
    }
  }

  /* ---------- פס הודעה: נסגר ונזכר ליום ---------- */
  var ann = $('#ann');
  if (ann) {
    var annKey = 'annClosedAt', closedAt = 0;
    try { closedAt = parseInt(localStorage.getItem(annKey) || '0', 10); } catch (e) {}
    if (!closedAt || Date.now() - closedAt > 86400000) {
      ann.hidden = false; body.classList.add('has-ann');
      var annClose = $('.ann__close', ann);
      if (annClose) annClose.addEventListener('click', function () { ann.hidden = true; body.classList.remove('has-ann'); try { localStorage.setItem(annKey, String(Date.now())); } catch (e) {} });
    }
  }

  /* ---------- שעה במשרד (שעון ישראל) ---------- */
  var clocks = $$('[data-clock]');
  var officeEls = $$('[data-office]');
  if (clocks.length || officeEls.length) {
    /* שעות המשרד: א׳–ה׳ 8:00–16:00, ו׳ עד 12:00 (שעון ישראל) */
    var HOURS = { 0: [8, 16], 1: [8, 16], 2: [8, 16], 3: [8, 16], 4: [8, 16], 5: [8, 12] };
    var DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
    var partsFmt = null;
    try { partsFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' }); } catch (e) {}
    var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    function israelNow() {
      var d = new Date();
      if (!partsFmt) return { day: d.getDay(), h: d.getHours(), m: d.getMinutes() };
      var o = {};
      partsFmt.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
      return { day: WD[o.weekday] || 0, h: parseInt(o.hour, 10) % 24, m: parseInt(o.minute, 10) };
    }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tickClock() {
      var now = israelNow();
      var t = pad(now.h) + ':' + pad(now.m);
      clocks.forEach(function (c) { c.textContent = t; });
      if (!officeEls.length) return;
      var hrs = HOURS[now.day], cur = now.h + now.m / 60, open = !!hrs && cur >= hrs[0] && cur < hrs[1], text;
      if (open) {
        text = 'המשרד פתוח עכשיו · עונים עד ' + pad(hrs[1]) + ':00';
      } else if (hrs && cur < hrs[0]) {
        text = 'המשרד סגור · נפתח היום ב-' + pad(hrs[0]) + ':00';
      } else {
        var nd = (now.day + 1) % 7, steps = 1;
        while (!HOURS[nd]) { nd = (nd + 1) % 7; steps++; }
        text = 'המשרד סגור · ' + (steps === 1 ? 'נפתח מחר' : 'נפתח ביום ' + DAY_NAMES[nd]) + ' ב-' + pad(HOURS[nd][0]) + ':00';
      }
      officeEls.forEach(function (el) { el.textContent = text; var li = el.closest('.footer__office'); if (li) li.classList.toggle('is-open', open); });
    }
    tickClock(); setInterval(tickClock, 30000);
  }

  /* ---------- שאלות נפוצות: פתיחה וסגירה בגובה מונפש ---------- */
  $$('details.faq__item').forEach(function (d) {
    var sum = $('summary', d); if (!sum || !d.animate) return;
    var anim = null;
    sum.addEventListener('click', function (e) {
      if (noMotion()) return;
      e.preventDefault();
      if (anim) { anim.cancel(); anim = null; }
      d.style.overflow = 'hidden';
      var from = d.offsetHeight, to, closing = d.open;
      if (closing) { to = sum.offsetHeight; } else { d.open = true; to = d.offsetHeight; }
      anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: closing ? 320 : 480, easing: 'cubic-bezier(.22,.61,.36,1)' });
      anim.onfinish = function () { if (closing) d.open = false; d.style.overflow = ''; anim = null; };
      anim.oncancel = function () { d.style.overflow = ''; };
    });
  });

  /* ---------- טעינה מטושטשת: התמונה המלאה מתגלה מעל הגרסה הזעירה ---------- */
  $$('.lqip img').forEach(function (img) {
    var box = img.closest('.lqip');
    function done() { box.classList.add('is-loaded'); }
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener('load', done); img.addEventListener('error', done); }
  });

  /* ---------- לוגו בפוטר: נפתח כשמגיעים לתחתית ---------- */
  var fmark = $('.footer__mark');
  if (fmark) {
    if (noMotion() || !('IntersectionObserver' in window)) fmark.classList.add('is-in');
    else {
      var fIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { fmark.classList.add('is-in'); fIO.disconnect(); } });
      }, { threshold: 0.35 });
      fIO.observe(fmark);
    }
  }

  /* ---------- מונים ---------- */
  var yearNow = new Date().getFullYear();
  $$('[data-count-years]').forEach(function (el) { el.dataset.count = String(yearNow - parseInt(el.dataset.countYears, 10)); el.textContent = el.dataset.count; });
  function runCounter(el) {
    var to = parseInt(el.dataset.count, 10);
    if (isNaN(to) || el.dataset.counted) return;
    el.dataset.counted = '1';
    if (noMotion()) { el.textContent = String(to); return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    var cIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); cIO.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cIO.observe(el); });
  } else { counters.forEach(runCounter); }

  /* ---------- תחומי פעילות: תמונה שעוקבת אחרי העכבר ---------- */
  var preview = $('#fields-preview');
  var fieldsList = $('#fields-list');
  if (preview && fieldsList && mqFine.matches) {
    var pimgs = $$('img', preview);
    var px = 0, py = 0, tx = 0, ty = 0, raf = null;
    function loop() {
      px += (tx - px) * 0.14; py += (ty - py) * 0.14;
      preview.style.transform = 'translate(' + (px - 180) + 'px,' + (py - 135) + 'px)' + (preview.classList.contains('is-on') ? ' scale(1)' : ' scale(.85)');
      raf = requestAnimationFrame(loop);
    }
    fieldsList.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; if (!raf) loop(); });
    $$('.field', fieldsList).forEach(function (a) {
      a.addEventListener('mouseenter', function () {
        if (noMotion()) return;
        var src = a.dataset.preview;
        pimgs.forEach(function (im) { im.classList.toggle('is-on', im.dataset.src === src); });
        preview.classList.add('is-on');
      });
    });
    fieldsList.addEventListener('mouseleave', function () { preview.classList.remove('is-on'); });
  }

  /* ---------- קרוסלת המלצות ---------- */
  var track = $('#testimonial-track');
  if (track) {
    $$('.carousel__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = track.querySelector('.testimonial');
        var step = card ? card.getBoundingClientRect().width + 20 : 320;
        var dir = btn.dataset.dir === 'next' ? -1 : 1; /* RTL: הבא = שמאלה */
        track.scrollBy({ left: dir * step, behavior: noMotion() ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- גלריה: גל בגריד (כניסה מהמרכז החוצה) ---------- */
  var galleryGrid = $('#gallery-grid');
  function galleryWave(items) {
    if (noMotion() || !items.length || !items[0].animate || !galleryGrid) return;
    var cols = getComputedStyle(galleryGrid).gridTemplateColumns.split(' ').length || 1;
    var rows = Math.ceil(items.length / cols);
    var cx = (cols - 1) / 2, cy = Math.min((rows - 1) / 2, 1.5); /* מרכז המסך הראשון */
    items.forEach(function (el, i) {
      var d = Math.hypot((i % cols) - cx, Math.floor(i / cols) - cy);
      el.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }],
        { duration: 450, delay: Math.min(d * 70, 600), easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'backwards' });
    });
  }
  function galleryVisible() { return $$('.gallery__item', galleryGrid).filter(function (el) { return el.offsetParent !== null; }); }

  /* ---------- גלריה: טאבים לסינון עם סמן מחליק ---------- */
  var gtabs = $('[data-gallery-tabs]');
  var galleryMore = $('[data-gallery-more]');
  if (gtabs && galleryGrid) {
    var tabBtns = $$('.gtabs__tab', gtabs), marker = $('.gtabs__marker', gtabs), gItems = $$('.gallery__item', galleryGrid);
    function moveMarker(btn) {
      var r = btn.getBoundingClientRect(), pr = gtabs.getBoundingClientRect();
      marker.style.width = r.width + 'px';
      marker.style.transform = 'translateX(' + (r.left - pr.left - gtabs.clientLeft + gtabs.scrollLeft) + 'px)';
    }
    function applyFilter(f, animate) {
      var expanded = galleryGrid.classList.contains('is-expanded'), shown = [];
      gItems.forEach(function (el) {
        var ok = f === 'all' || el.dataset.cat === f;
        el.classList.toggle('is-off', !ok);
        el.classList.toggle('is-forced', ok && f !== 'all');
        if (ok && (expanded || f !== 'all' || !el.classList.contains('gallery__item--more'))) shown.push(el);
      });
      if (galleryMore) galleryMore.hidden = expanded || f !== 'all';
      if (animate) galleryWave(shown);
    }
    function selectTab(btn, animate) {
      tabBtns.forEach(function (b) { var on = b === btn; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      moveMarker(btn);
      applyFilter(btn.dataset.f, animate);
    }
    tabBtns.forEach(function (b, i) {
      b.addEventListener('click', function () { if (b.getAttribute('aria-selected') !== 'true') selectTab(b, true); });
      b.addEventListener('keydown', function (e) {
        var j = i; /* RTL: חץ שמאלה = הבא */
        if (e.key === 'ArrowLeft') j = i + 1; else if (e.key === 'ArrowRight') j = i - 1;
        else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabBtns.length - 1; else return;
        e.preventDefault(); j = (j + tabBtns.length) % tabBtns.length; tabBtns[j].focus(); selectTab(tabBtns[j], true);
      });
    });
    var initMarker = function () { moveMarker(tabBtns.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0] || tabBtns[0]); };
    initMarker();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(initMarker);
    window.addEventListener('resize', initMarker);
    /* כניסה ראשונה של הגריד: גל מהמרכז */
    if (!noMotion() && 'IntersectionObserver' in window) {
      var gIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { gIO.disconnect(); galleryWave(galleryVisible()); } });
      }, { threshold: 0.05 });
      gIO.observe(galleryGrid);
    }
  }

  /* ---------- גלריה: הצגת שאר התמונות ---------- */
  if (galleryMore && galleryGrid) {
    galleryMore.addEventListener('click', function () {
      galleryGrid.classList.add('is-expanded');
      galleryMore.setAttribute('aria-expanded', 'true');
      galleryMore.hidden = true;
      var first = galleryGrid.querySelector('.gallery__item--more');
      if (first) {
        var extra = $$('.gallery__item--more', galleryGrid);
        if (gtabs) galleryWave(extra);
        else if (window.gsap && !noMotion()) {
          window.gsap.fromTo(extra, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .8, stagger: .04, ease: 'power3.out', overwrite: 'auto' });
        }
        first.focus({ preventScroll: true });
        first.scrollIntoView({ block: 'start', behavior: noMotion() ? 'auto' : 'smooth' });
      }
    });
  }

  /* ---------- לייטבוקס עם ניווט ---------- */
  var lightbox = $('#lightbox');
  var lbImg = $('#lightbox-img');
  var lbCap = $('#lightbox-caption');
  var lbCount = $('#lightbox-count');
  var lbAll = $$('.gallery__item');
  var lbItems = lbAll;
  var lbIndex = 0;
  if (lightbox && lbImg && typeof lightbox.showModal === 'function' && lbItems.length) {
    function lbShow(i) {
      lbIndex = (i + lbItems.length) % lbItems.length;
      var btn = lbItems[lbIndex];
      var img = btn.querySelector('img');
      lbImg.src = btn.dataset.full || (img && img.src) || '';
      lbImg.alt = img ? img.alt : '';
      if (lbCap) lbCap.textContent = btn.dataset.caption || '';
      if (lbCount) lbCount.textContent = (lbIndex + 1) + ' / ' + lbItems.length;
      /* טעינה מוקדמת של השכנות */
      [1, -1].forEach(function (d) { var n = lbItems[(lbIndex + d + lbItems.length) % lbItems.length]; if (n && n.dataset.full) { var pre = new Image(); pre.src = n.dataset.full; } });
    }
    lbAll.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.closest('.case__gallery');
        lbItems = (group ? $$('.gallery__item', group) : lbAll).filter(function (b) { return b.offsetParent !== null; });
        if (!lbItems.length) lbItems = lbAll;
        lbShow(Math.max(0, lbItems.indexOf(btn))); lightbox.showModal();
      });
    });
    $$('[data-lb-dir]', lightbox).forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); lbShow(lbIndex + parseInt(b.dataset.lbDir, 10)); });
    });
    lightbox.addEventListener('keydown', function (e) {
      /* RTL: חץ שמאלה = הבאה */
      if (e.key === 'ArrowLeft') { e.preventDefault(); lbShow(lbIndex + 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); lbShow(lbIndex - 1); }
    });
    /* החלקה במובייל */
    var tx0 = null;
    lightbox.addEventListener('touchstart', function (e) { tx0 = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      if (tx0 === null) return;
      var dx = e.changedTouches[0].clientX - tx0; tx0 = null;
      if (Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
    var lbClose = $('#lightbox-close');
    if (lbClose) lbClose.addEventListener('click', function () { lightbox.close(); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) lightbox.close(); });
    lightbox.addEventListener('close', function () { lbImg.src = ''; var cur = lbItems[lbIndex]; if (cur && cur.offsetParent) cur.focus({ preventScroll: true }); });
  }

  /* ---------- אימות שדות בטופס (הודעה ליד השדה) ---------- */
  function fieldMessage(input) {
    var v = input.validity;
    if (v.valueMissing) return input.type === 'checkbox' ? 'יש לאשר כדי שנוכל לחזור אליכם' : 'שדה חובה';
    if (input.type === 'email' && (v.typeMismatch || v.patternMismatch)) return 'כתובת המייל לא תקינה';
    if (input.type === 'tel' && (v.patternMismatch || v.typeMismatch)) return 'מספר הטלפון לא תקין';
    return 'הערך לא תקין';
  }
  function initValidation(formEl) {
    var fields = $$('input:not([type="hidden"]):not(.form__honey), select, textarea', formEl);
    fields.forEach(function (input) {
      var wrap = input.closest('.field') || input.closest('.consent');
      if (!wrap) return;
      var err = wrap.querySelector('.field__error');
      if (!err) { err = document.createElement('small'); err.className = 'field__error'; err.hidden = true; err.id = (input.id || input.name) + '-error'; wrap.appendChild(err); }
      var described = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (described.indexOf(err.id) < 0) { described.push(err.id); input.setAttribute('aria-describedby', described.join(' ')); }
      function check(show) {
        var ok = input.checkValidity();
        wrap.classList.toggle('is-invalid', !ok && show);
        input.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok && show) { err.textContent = fieldMessage(input); err.hidden = false; } else { err.hidden = true; }
        return ok;
      }
      input.addEventListener('blur', function () { if (input.value || input.type === 'checkbox') check(true); });
      input.addEventListener('input', function () { if (wrap.classList.contains('is-invalid')) check(true); });
      input.addEventListener('change', function () { check(wrap.classList.contains('is-invalid') || input.type === 'checkbox'); });
      input._check = check;
    });
    return function validateAll() {
      var firstBad = null;
      fields.forEach(function (input) { if (input._check && !input._check(true) && !firstBad) firstBad = input; });
      if (firstBad) { firstBad.focus(); firstBad.scrollIntoView({ block: 'center', behavior: noMotion() ? 'auto' : 'smooth' }); }
      return !firstBad;
    };
  }

  /* ---------- טופס: שליחה למייל המשרד דרך FormSubmit ---------- */
  var form = $('#contact-form');
  var notice = $('#form-notice');
  var WA = 'https://wa.me/972502703674?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%A2%D7%95%D7%96%D7%99%2C%20%D7%9E%D7%93%D7%91%D7%A8%20____%20.%20%D7%9E%D7%AA%D7%99%20%D7%AA%D7%94%D7%99%D7%94%20%D7%A4%D7%A0%D7%95%D7%99%20%D7%9C%D7%A9%D7%99%D7%97%D7%94%3F';
  var THANKS = 'תודה! הפנייה התקבלה ונחזור אליכם בהקדם.';
  function showNotice(html, ok) {
    if (!notice) return;
    notice.innerHTML = html;
    notice.classList.toggle('form__notice--ok', !!ok);
    notice.hidden = false;
    notice.scrollIntoView({ block: 'nearest', behavior: noMotion() ? 'auto' : 'smooth' });
  }
  if (form) {
    var next = $('#f-next');
    if (next) next.value = location.origin + location.pathname + '?sent=1#contact';
    if (/[?&]sent=1/.test(location.search)) {
      showNotice(THANKS, true);
      try { history.replaceState(null, '', location.pathname + '#contact'); } catch (err) {}
    }
    var validateForm = initValidation(form);
    form.addEventListener('submit', function (e) {
      if (!validateForm()) { e.preventDefault(); return; }
      if (!window.fetch || !window.FormData) return;
      e.preventDefault();
      var btn = form.querySelector('[type="submit"]');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'שולח…'; }
      var data = new FormData(form);
      data.delete('_next');
      fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
        .then(function () { form.reset(); showNotice(THANKS, true); })
        .catch(function () { showNotice('השליחה לא הצליחה כרגע. אפשר לכתוב לנו <a href="' + WA + '" target="_blank" rel="noopener">בוואטסאפ</a> או <a href="mailto:Office@gotovski.co.il">במייל</a>.', false); })
        .then(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
    });
  }

  /* ---------- טופס פנייה מהירה (טלפון בלבד) ---------- */
  var qf = $('[data-quick-form]');
  if (qf) {
    var qn = $('[data-quick-next]'); if (qn) qn.value = location.origin + location.pathname + '?sent=1#contact';
    var qnotice = $('[data-quick-notice]', qf);
    qf.addEventListener('submit', function (e) {
      if (!qf.checkValidity()) { e.preventDefault(); qf.reportValidity(); return; }
      if (!window.fetch || !window.FormData) return;
      e.preventDefault();
      var b = qf.querySelector('[type="submit"]'); var lbl = b ? b.textContent : '';
      if (b) { b.disabled = true; b.textContent = 'שולח…'; }
      var d = new FormData(qf); d.delete('_next');
      fetch(qf.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), { method: 'POST', body: d, headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
        .then(function () { qf.reset(); if (qnotice) { qnotice.textContent = 'תודה! נחזור אליכם בהקדם.'; qnotice.classList.add('form__notice--ok'); qnotice.hidden = false; } })
        .catch(function () { if (qnotice) { qnotice.innerHTML = 'השליחה לא הצליחה. התקשרו <a href="tel:+972502703674">050-270-3674</a> או כתבו <a href="' + WA + '" target="_blank" rel="noopener">בוואטסאפ</a>.'; qnotice.classList.remove('form__notice--ok'); qnotice.hidden = false; } })
        .then(function () { if (b) { b.disabled = false; b.textContent = lbl; } });
    });
  }

  /* ---------- פרויקטים: מפה עם סיכות שנדלקות בגלילה ---------- */
  var mapPanel = $('#projects-map');
  var caseEls = $$('.case[data-pin]');
  if (mapPanel && caseEls.length) {
    var pinEls = $$('.map__pin', mapPanel);
    var mapCaption = $('#projects-map-caption');
    var casesList = caseEls[0].parentElement;
    var activeCase = null;
    function setActive(li) {
      if (li === activeCase) return;
      activeCase = li;
      caseEls.forEach(function (c) { c.classList.toggle('is-active', c === li); });
      casesList.classList.toggle('has-active', !!li);
      var pin = li ? li.dataset.pin : '';
      pinEls.forEach(function (p) { p.classList.toggle('is-on', p.dataset.pin === pin); });
      if (mapCaption) {
        var cityEl = mapCaption.querySelector('.map-panel__city'), nameEl = mapCaption.querySelector('.map-panel__name');
        if (li) {
          var t = li.querySelector('.case__title');
          var city = (t && t.querySelector('em')) ? t.querySelector('em').textContent.replace(/^[\s–-]+/, '') : '';
          var name = t ? t.childNodes[0].textContent.trim() : '';
          if (cityEl) cityEl.textContent = city; if (nameEl) nameEl.textContent = name;
        } else { if (cityEl) cityEl.textContent = ''; if (nameEl) nameEl.textContent = 'גללו בין הפרויקטים'; }
      }
    }
    if ('IntersectionObserver' in window) {
      var caseIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target); });
      }, { rootMargin: '-40% 0px -45% 0px', threshold: 0 });
      caseEls.forEach(function (c) { caseIO.observe(c); });
    }
    caseEls.forEach(function (c) { c.addEventListener('mouseenter', function () { setActive(c); }); });
    /* לחיצה על סיכה מגלגלת לפרויקט */
    pinEls.forEach(function (p) {
      p.style.cursor = 'pointer';
      p.addEventListener('click', function () {
        var target = caseEls.filter(function (c) { return c.dataset.pin === p.dataset.pin; })[0];
        if (target) target.scrollIntoView({ block: 'center', behavior: noMotion() ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- מד קריאה (עמודי מאמר) ---------- */
  var progress = $('.progress');
  if (progress) {
    var pTick = false;
    function setProgress() {
      pTick = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
    }
    window.addEventListener('scroll', function () { if (!pTick) { pTick = true; requestAnimationFrame(setProgress); } }, { passive: true });
    setProgress();
  }

  /* ---------- שנה בכותרת התחתונה ---------- */
  var year = $('#year');
  if (year) year.textContent = String(yearNow);

  /* ======================================================================
     אנימציות GSAP (רק כשהספרייה נטענה ואין הפחתת תנועה)
     ====================================================================== */
  var loader = $('#loader');
  var loaderNum = $('#loader-num');

  function finishLoader() { if (loader) loader.classList.add('is-done'); }

  function heroIntroStatic() {
    finishLoader();
    /* ללא GSAP: תנועת "רחפן" איטית לתמונת ההירו ב-CSS */
    if (!noMotion()) root.classList.add('hero-drift');
  }

  /* חשיפה לפי נראות בפועל (IntersectionObserver) – עובד בכל דפדפן ובכל מיכל גלילה */
  function whenVisible(el, cb, margin) {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } });
    }, { threshold: 0.01, rootMargin: margin || '0px 0px -8% 0px' });
    io.observe(el);
  }

  function initGsap() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    gsap.defaults({ ease: 'power3.out' });
    var hidden = []; /* כל מה שהוסתר – לשחרור ברשת הביטחון */
    function hide(targets, vars) { gsap.set(targets, vars); Array.prototype.push.apply(hidden, gsap.utils.toArray(targets)); }

    /* מסך טעינה + כניסת הירו */
    var heroLines = $$('.hero .line > span');
    var heroFades = $$('[data-hero-fade], [data-hero-kicker]');
    var heroImg = $('#hero-img');
    hide(heroLines, { yPercent: 110 });
    hide(heroFades, { autoAlpha: 0, y: 24 });
    if (heroImg) gsap.set(heroImg, { scale: 1.1 });

    var intro = gsap.timeline({ onComplete: function () { finishLoader(); if (header) gsap.set(header, { clearProps: 'transform,opacity,visibility' }); } });
    if (loader && !loader.classList.contains('is-done')) {
      loader.style.animation = 'none';
      var n = { v: 0 };
      intro.to(n, { v: 100, duration: 1.0, ease: 'power2.inOut', onUpdate: function () { if (loaderNum) loaderNum.textContent = String(Math.round(n.v)); } })
           .to(loader, { yPercent: -101, duration: .8, ease: 'power4.inOut' }, '+=0.1');
    }
    /* ההדר יורד מלמעלה, ואחריו ההירו נכנס בהדרגה (בלי מסך טעינה) */
    if (header && body.classList.contains('has-hero')) {
      header.style.transition = 'none';
      gsap.set(header, { y: -90, autoAlpha: 0 });
      intro.to(header, { y: 0, autoAlpha: 1, duration: 1, ease: 'power4.out', onComplete: function () { gsap.set(header, { clearProps: 'transform,opacity,visibility' }); header.style.transition = ''; } }, 0);
    }
    intro.to(heroImg, { scale: 1, duration: 3, ease: 'power2.out' }, header ? '<0.15' : '<0.1')
         .to(heroLines, { yPercent: 0, duration: 1.1, stagger: .12, ease: 'power4.out' }, '<0.15')
         .to(heroFades, { autoAlpha: 1, y: 0, duration: .9, stagger: .1 }, '<0.5');
    /* תנועת "רחפן": ריחוף איטי ומתמשך של התמונה (זום עדין + סחיפה), הלוך ושוב */
    if (heroImg) {
      intro.add(function () {
        gsap.to(heroImg, { scale: 1.12, xPercent: -2, yPercent: 1.6, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1, overwrite: 'auto' });
      }, '>-1.5');
    }
    /* רשת ביטחון: אם משהו מנע מהפתיחה לרוץ, משחררים הכול אחרי 3.5 שניות */
    setTimeout(function () { if (loader && !loader.classList.contains('is-done')) { intro.progress(1); finishLoader(); } }, 3500);

    /* פרלקסה עדינה להירו (אם אין גלילה – פשוט לא זז) */
    gsap.to('.hero__media', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* כותרות: מילים שעולות כשהכותרת נראית */
    $$('[data-split]').forEach(function (el) {
      if (el.closest('.hero')) return;
      var words = $$('.w > span', el);
      hide(words, { yPercent: 110 });
      whenVisible(el, function () { gsap.to(words, { yPercent: 0, duration: 1, stagger: .045, ease: 'power4.out', overwrite: 'auto' }); });
    });

    /* חשיפת תמונות */
    $$('[data-img-reveal]').forEach(function (box) {
      var img = box.querySelector('img');
      hide(box, { clipPath: 'inset(0 0 100% 0)' });
      gsap.set(img, { scale: 1.25 });
      whenVisible(box, function () {
        gsap.to(box, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'power4.inOut', overwrite: 'auto' });
        gsap.to(img, { scale: 1, duration: 1.8, ease: 'power3.out' });
      });
    });
    $$(($('[data-gallery-tabs]') ? '' : '.gallery__item:not(.gallery__item--more), ') + '.article-card > img, .stats li').forEach(function (box) {
      hide(box, { autoAlpha: 0, y: 40 });
      whenVisible(box, function () { gsap.to(box, { autoAlpha: 1, y: 0, duration: .9, overwrite: 'auto' }); }, '0px 0px -4% 0px');
    });

    /* פרלקסה לתמונות מסומנות */
    $$('[data-parallax]').forEach(function (img) {
      var amt = parseFloat(img.dataset.parallax) || 0.1;
      gsap.fromTo(img, { yPercent: -amt * 100 }, { yPercent: amt * 100, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* מניפסט: מילים שמתמלאות בגלילה, עם השלמה אוטומטית כשהפסקה נראית */
    var sw = $$('.manifesto .sw');
    var mp = $('.manifesto p');
    if (sw.length && mp) {
      hide(sw, { opacity: .18 });
      var scrub = gsap.to(sw, { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: mp, start: 'top 80%', end: 'bottom 45%', scrub: .4 } });
      whenVisible(mp, function () {
        setTimeout(function () {
          if (scrub.scrollTrigger && scrub.scrollTrigger.progress < .05) { scrub.scrollTrigger.kill(); gsap.to(sw, { opacity: 1, stagger: .02, duration: .8, overwrite: 'auto' }); }
        }, 1500);
      });
    }

    /* תהליך: קו שנמשך ושלבים שנדלקים */
    var pline = $('#process-line'), plist = $('#process-list');
    if (pline && plist) {
      var horiz = mqDesktop.matches;
      gsap.fromTo(pline, horiz ? { scaleX: 0 } : { scaleY: 0 }, horiz ? { scaleX: 1 } : { scaleY: 1 }, { ease: 'none', scrollTrigger: { trigger: plist, start: 'top 70%', end: 'bottom 60%', scrub: true } });
      $$('li', plist).forEach(function (li) { whenVisible(li, function () { li.classList.add('is-on'); }, '0px 0px -25% 0px'); });
    }

    /* קריאה לפעולה: הטבעת מסתובבת בגלילה */
    var ring = $('.cta__ring');
    if (ring) gsap.to(ring, { rotate: 90, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* כפתורים מגנטיים */
    if (mqFine.matches) {
      $$('[data-magnetic]').forEach(function (btn) {
        var xTo = gsap.quickTo(btn, 'x', { duration: .5, ease: 'power3' }), yTo = gsap.quickTo(btn, 'y', { duration: .5, ease: 'power3' });
        btn.addEventListener('mousemove', function (e) {
          var r = btn.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * .3); yTo((e.clientY - (r.top + r.height / 2)) * .3);
        });
        btn.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
      });
    }

    /* סמן מותאם */
    var cursor = $('#cursor');
    if (cursor && mqFine.matches) {
      var cx = gsap.quickTo(cursor, 'x', { duration: .25, ease: 'power3' }), cy = gsap.quickTo(cursor, 'y', { duration: .25, ease: 'power3' });
      window.addEventListener('mousemove', function (e) { cx(e.clientX); cy(e.clientY); cursor.classList.remove('is-hidden'); }, { passive: true });
      document.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
      document.addEventListener('mouseover', function (e) { cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .gallery__item, .field')); });
    }

    /* עדכון מיקומים אחרי טעינת תמונות/גופנים */
    window.addEventListener('load', function () { ST.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });

    /* רשת ביטחון אחרונה: שום דבר לא נשאר מוסתר אם הצופה לא הצליח לזהות אותו */
    function releaseAll() {
      ST.getAll().forEach(function (t) { t.kill(true); });
      gsap.globalTimeline.clear();
      gsap.set(hidden.concat(['.header', '.hero__media', '#hero-img', '[data-img-reveal] img', '[data-parallax]', '#process-line', '.cta__ring', '[data-magnetic]']), { clearProps: 'all' });
      finishLoader();
    }
    window.addEventListener('error', releaseAll);

    /* כיבוי כשמפעילים "עצירת אנימציות" בתפריט הנגישות */
    var mo = new MutationObserver(function () {
      if (!root.classList.contains('a11y-no-motion')) return;
      mo.disconnect();
      releaseAll();
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- פרויקטים: גלילה אופקית טבעית עם כפתורים וגרירה ---------- */
  var hview = $('#hscroll-viewport');
  if (hview) {
    $$('.hscroll__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = hview.querySelector('.pcard');
        var step = card ? card.getBoundingClientRect().width + 24 : 400;
        var dir = btn.dataset.dir === 'next' ? -1 : 1; /* RTL: הבא = שמאלה */
        hview.scrollBy({ left: dir * step, behavior: noMotion() ? 'auto' : 'smooth' });
      });
    });
    if (mqFine.matches) {
      var dragging = false, startX = 0, startLeft = 0, moved = false;
      hview.addEventListener('mousedown', function (e) { dragging = true; moved = false; startX = e.clientX; startLeft = hview.scrollLeft; hview.classList.add('is-dragging'); });
      window.addEventListener('mousemove', function (e) { if (!dragging) return; var dx = e.clientX - startX; if (Math.abs(dx) > 4) moved = true; hview.scrollLeft = startLeft - dx; });
      window.addEventListener('mouseup', function () { dragging = false; hview.classList.remove('is-dragging'); });
      hview.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    }
  }

  /* ======================================================================
     שכבת "גלריה" (בהשראת Aker, לפי אישור): המילה הגדולה, גלולת הניווט,
     כרטיס מתחלף בהירו, קווים ותוויות שנכתבות, רשימה עם תמונה, מפה
     שמדפדפת לבד, מספרים שעולים, גרעין, מעבר בין דפים
     ====================================================================== */
  (function galleryLayer() {
    var still = noMotion();

    /* המילה "ש.גוטובסקי" אות־אות + "בע״מ" קטן */
    $$('[data-wordmark]').forEach(function (el) {
      var word = 'ש.גוטובסקי', ltd = 'בע״מ';
      el.innerHTML = '';
      Array.from(word).forEach(function (ch, i) {
        var s = document.createElement('span'), b = document.createElement('i');
        b.textContent = ch; b.style.setProperty('--i', String(i)); s.appendChild(b); el.appendChild(s);
      });
      var ls = document.createElement('span'), lb = document.createElement('i');
      ls.className = 'wordmark__ltd'; lb.textContent = ltd; lb.style.setProperty('--i', String(word.length)); ls.appendChild(lb); el.appendChild(ls);
    });

    /* אנימציית פתיחה: פעם אחת בכל ביקור, 6 שניות, עם דילוג */
    var intro = $('#intro');
    if (intro) {
      var seen = false, ever = false;
      try { seen = !!sessionStorage.getItem('introSeen'); ever = !!localStorage.getItem('introSeenEver'); } catch (e) {}
      if (seen || still) { intro.remove(); root.classList.remove('intro-on'); }
      else {
        /* ביקור ראשון: הבנייה המלאה (6 שניות). ביקור חוזר: התחנה כבר גמורה, 2 שניות */
        var introMs = ever ? 2000 : 6000;
        if (ever) intro.classList.add('intro--quick');
        root.classList.add('intro-on');
        var introT = null;
        var introDone = function () {
          clearTimeout(introT);
          if (!intro.classList.contains('is-done')) {
            intro.classList.add('is-done');
            try { sessionStorage.setItem('introSeen', '1'); localStorage.setItem('introSeenEver', String(Date.now())); } catch (e) {}
            root.classList.remove('intro-on');
            document.dispatchEvent(new CustomEvent('intro:done'));
            setTimeout(function () { intro.remove(); }, 900);
          }
        };
        introT = setTimeout(introDone, introMs);
        var skipBtn = $('[data-intro-skip]', intro);
        if (skipBtn) skipBtn.addEventListener('click', introDone);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') introDone(); });
      }
    }

    /* המילה נמדדת ומותאמת לרוחב הפנוי (הגופן הדק משתנה בין דפדפנים) */
    var fitTimer = null;
    function fitWords() {
      $$('[data-wordmark]').forEach(function (el) {
        el.style.fontSize = '';
        var box = el.parentElement, cont = el.closest('.container') || box, cs = getComputedStyle(cont);
        var avail = cont.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var feedEl = box.classList.contains('hero__bottom') ? $('.feed', box) : null;
        if (feedEl && window.innerWidth > 760) avail -= feedEl.getBoundingClientRect().width + 24;
        var w = el.scrollWidth;
        if (w > avail && avail > 0) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * avail / w * 0.98) + 'px';
      });
    }
    fitWords();
    window.addEventListener('load', fitWords);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWords);
    window.addEventListener('resize', function () { clearTimeout(fitTimer); fitTimer = setTimeout(fitWords, 120); });

    /* גלולת הניווט: הכיתוב מתחלף בין "תפריט" ל"סגירה" */
    var pillBtn = $('.navpill__btn'), pillTxt = $('.navpill__txt');
    if (pillBtn && pillTxt) {
      var syncPill = function () { pillTxt.textContent = pillBtn.getAttribute('aria-expanded') === 'true' ? 'סגירה' : 'תפריט'; };
      pillBtn.addEventListener('click', function () { setTimeout(syncPill, 0); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setTimeout(syncPill, 0); });
      $$('#mobile-menu a').forEach(function (a) { a.addEventListener('click', function () { setTimeout(syncPill, 0); }); });
    }

    /* גרעין פילם על משטחים כהים */
    $$('.band, .article-hero, .cta').forEach(function (sec) {
      if ($('.grain', sec)) return;
      var g = document.createElement('span'); g.className = 'grain'; g.setAttribute('aria-hidden', 'true');
      sec.insertBefore(g, sec.firstChild);
    });

    /* תווית שנכתבת אות אחר אות */
    function typeIn(el) {
      if (el.dataset.typed) return; el.dataset.typed = '1';
      if (still) { el.classList.add('is-typed'); return; }
      var nodes = Array.prototype.slice.call(el.childNodes), k = 0;
      nodes.forEach(function (n) {
        if (n.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        Array.from(n.textContent).forEach(function (ch) {
          var s = document.createElement('span'); s.className = 'c'; s.textContent = ch;
          (function (sp, idx) { setTimeout(function () { sp.style.opacity = '1'; }, 40 * idx); })(s, k++);
          frag.appendChild(s);
        });
        el.replaceChild(frag, n);
      });
      setTimeout(function () { el.classList.add('is-typed'); }, 40 * k + 50);
    }

    /* קטע שנכנס לתצוגה: הקווים נמתחים, התוויות נכתבות, המספרים עולים */
    var secs = $$('.section, .hero, .band, .article-hero, .footer, .quick, .cta, .mapsec, .marquee, .standards');
    function enter(sec) {
      sec.classList.add('in');
      $$('.kicker, .hero__kicker', sec).forEach(typeIn);
    }
    if (still || !('IntersectionObserver' in window)) { secs.forEach(enter); }
    else {
      var secIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { enter(e.target); secIO.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      secs.forEach(function (s) { secIO.observe(s); });
    }

    /* מספרים: כל ספרה עולה מהקו */
    $$('[data-digits-years]').forEach(function (el) { el.dataset.digits = String(new Date().getFullYear() - parseInt(el.dataset.digitsYears, 10)); });
    $$('[data-digits]').forEach(function (el) {
      el.innerHTML = '';
      Array.from(el.dataset.digits).forEach(function (ch, i) {
        var s = document.createElement('span'), b = document.createElement('i');
        b.textContent = ch; b.style.setProperty('--i', String(i)); s.appendChild(b); el.appendChild(s);
      });
    });

    /* הירו: כרטיס שמתחלף כל 5 שניות */
    var feed = $('#feed');
    if (feed) {
      var fItems = $$('.feed__item', feed), fDots = $('.feed__dots', feed), fi = 0, fTimer = null;
      if (fDots) fItems.forEach(function (_, i) { var d = document.createElement('i'); if (!i) d.className = 'on'; fDots.appendChild(d); });
      function showFeed(n) {
        fi = n;
        fItems.forEach(function (it, i) { it.classList.remove('is-on', 'is-prev', 'is-next'); it.classList.add(i === n ? 'is-on' : (i < n ? 'is-prev' : 'is-next')); });
        if (fDots) $$('i', fDots).forEach(function (d, i) { d.classList.toggle('on', i === n); });
      }
      function feedStart() { if (still || fItems.length < 2) return; clearInterval(fTimer); fTimer = setInterval(function () { showFeed((fi + 1) % fItems.length); }, 5000); }
      feed.addEventListener('mouseenter', function () { clearInterval(fTimer); });
      feed.addEventListener('mouseleave', feedStart);
      feed.addEventListener('focusin', function () { clearInterval(fTimer); });
      feed.addEventListener('focusout', feedStart);
      feedStart();
    }

    /* רשימה ממוספרת: התמונה עוקבת אחרי השורה */
    var rows = $$('#rows .row'), stageImgs = $$('#stage img'), stageCap = $('#stage .cap');
    if (rows.length && stageImgs.length) {
      function pick(i) {
        rows.forEach(function (r, k) { r.classList.toggle('is-on', k === i); });
        stageImgs.forEach(function (im, k) { im.classList.toggle('is-on', k === i); });
        if (stageCap && stageImgs[i] && stageImgs[i].dataset.cap) stageCap.textContent = stageImgs[i].dataset.cap;
      }
      rows.forEach(function (r, i) {
        r.addEventListener('mouseenter', function () { pick(i); });
        r.addEventListener('focus', function () { pick(i); });
      });
    }

    /* מפה שמדפדפת לבד: סיכה נדלקת, כרטיס מתחלף, פס מתמלא */
    var mapcard = $('#mapcard');
    if (mapcard) {
      var mItems = $$('.mapcard__item', mapcard), mPins = $$('#home-map .pin'), mNav = $('#mapnav'), mi = 0, mTimer = null, mPaused = false, mSeen = false;
      if (mNav) mItems.forEach(function (_, i) { var b = document.createElement('b'); if (!i) b.className = 'on'; mNav.appendChild(b); });
      function goMap(n) {
        mi = n;
        mItems.forEach(function (it, i) { it.classList.toggle('is-on', i === n); });
        var pin = mItems[n].dataset.pin;
        mPins.forEach(function (p) { p.classList.toggle('on', p.dataset.pin === pin); });
        $$('.mapsec__bg img[data-pin]').forEach(function (im) { im.classList.toggle('is-on', im.dataset.pin === pin); });
        if (mNav) $$('b', mNav).forEach(function (b, i) { b.classList.toggle('on', i === n); });
        var bar = $('.mapcard__bar i', mapcard);
        if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
        clearTimeout(mTimer);
        if (!mPaused && !still) mTimer = setTimeout(function () { goMap((mi + 1) % mItems.length); }, 4500);
      }
      function pinIndex(p) { for (var i = 0; i < mItems.length; i++) if (mItems[i].dataset.pin === p.dataset.pin) return i; return 0; }
      mPins.forEach(function (p) {
        p.addEventListener('mouseenter', function () { mPaused = true; mapcard.classList.remove('run'); clearTimeout(mTimer); goMap(pinIndex(p)); });
        p.addEventListener('mouseleave', function () { mPaused = false; mapcard.classList.add('run'); goMap(mi); });
        p.addEventListener('click', function () { mPaused = true; mapcard.classList.remove('run'); clearTimeout(mTimer); goMap(pinIndex(p)); });
      });
      if (mNav) $$('b', mNav).forEach(function (b, i) { b.addEventListener('click', function () { goMap(i); }); });
      mapcard.addEventListener('mouseenter', function () { mPaused = true; mapcard.classList.remove('run'); clearTimeout(mTimer); });
      mapcard.addEventListener('mouseleave', function () { mPaused = false; mapcard.classList.add('run'); goMap(mi); });
      if (still || !('IntersectionObserver' in window)) { goMap(0); }
      else {
        var mIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { if (!mSeen) { mSeen = true; mapcard.classList.add('run'); } goMap(mi); } else { clearTimeout(mTimer); } });
        }, { threshold: 0.3 });
        mIO.observe(mapcard);
      }
    }

    /* מעבר בין דפים: וילון כהה קצר בכניסה וביציאה */
    if (!still) {
      var veil = document.createElement('div'); veil.className = 'veil on'; veil.setAttribute('aria-hidden', 'true');
      body.appendChild(veil);
      requestAnimationFrame(function () { requestAnimationFrame(function () { veil.classList.remove('on'); }); });
      window.addEventListener('pageshow', function () { veil.classList.remove('on'); });
      document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest('a[href]');
        if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
        var href = a.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
        var url; try { url = new URL(a.href, location.href); } catch (err) { return; }
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
        e.preventDefault();
        veil.classList.add('on');
        setTimeout(function () { location.href = a.href; }, 340);
      });
    }
  })();

  function boot() {
    if (!noMotion() && hasGsap()) { try { initGsap(); return; } catch (err) { /* נפילה למצב סטטי */ } }
    heroIntroStatic();
  }
  /* GSAP נטען עם defer לפני הקובץ הזה; ליתר ביטחון ממתינים לטעינה אם עדיין לא זמין */
  /* כשאנימציית הפתיחה רצה, כניסת ההירו מחכה לסיומה */
  function startBoot() {
    if (root.classList.contains('intro-on')) document.addEventListener('intro:done', boot, { once: true });
    else boot();
  }
  if (hasGsap() || noMotion()) startBoot();
  else {
    var tries = 0;
    var wait = setInterval(function () { if (hasGsap() || ++tries > 20) { clearInterval(wait); startBoot(); } }, 50);
  }
})();
