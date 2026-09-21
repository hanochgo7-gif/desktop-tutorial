/* ש. גוטובסקי – סקריפט האתר (ללא תלויות) */
(function () {
  'use strict';

  /* ---------- כותרת דביקה: צל בגלילה ---------- */
  var header = document.querySelector('.header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- תפריט נייד ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');
  function closeMenu() {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'פתיחת תפריט');
    menu.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      if (open) { closeMenu(); return; }
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'סגירת תפריט');
      menu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 960) closeMenu(); });
  }

  /* ---------- סימון הקישור הפעיל בניווט ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    var activeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { activeObserver.observe(s); });
  }

  /* ---------- חשיפה בגלילה ---------- */
  var reveals = document.querySelectorAll('.reveal');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- לייטבוקס לגלריה ---------- */
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbCaption = document.getElementById('lightbox-caption');
  var lbClose = document.getElementById('lightbox-close');
  if (lightbox && lbImg && typeof lightbox.showModal === 'function') {
    document.querySelectorAll('.gallery__item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var caption = btn.getAttribute('data-caption') || '';
        lbImg.src = btn.getAttribute('data-full');
        lbImg.alt = caption;
        if (lbCaption) lbCaption.textContent = caption;
        lightbox.showModal();
      });
    });
    if (lbClose) lbClose.addEventListener('click', function () { lightbox.close(); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) lightbox.close(); });
    lightbox.addEventListener('close', function () { lbImg.src = ''; });
  }

  /* ---------- טופס: עדיין לא מחובר לשירות שליחה ---------- */
  var form = document.getElementById('contact-form');
  var notice = document.getElementById('form-notice');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (notice) { notice.hidden = false; notice.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    });
  }

  /* ---------- שנה בכותרת התחתונה ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();

/* ---------- תוספות לגרסה הקולנועית ---------- */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* כותרת: מצב "מעל ההירו" מתחלף למצב מלא אחרי גלילה קצרה */
  var header = document.querySelector('.header');
  if (header && document.body.classList.contains('has-hero')) {
    var onHeroScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', onHeroScroll, { passive: true });
    onHeroScroll();
  }

  /* פרלקסה עדינה לתמונות עם data-parallax */
  var pItems = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (pItems.length && !reduce) {
    var ticking = false;
    var updateParallax = function () {
      ticking = false;
      var vh = window.innerHeight;
      pItems.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var f = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        var shift = (r.top + r.height / 2 - vh / 2) * f * -1;
        el.style.transform = 'translateY(' + shift.toFixed(1) + 'px)';
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); } }, { passive: true });
    updateParallax();
  }

  /* מונים: data-count = יעד; data-count-years = שנת התחלה (מחושב לשנה הנוכחית) */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count], [data-count-years]'));
  counters.forEach(function (el) {
    if (el.hasAttribute('data-count-years')) {
      el.setAttribute('data-count', String(new Date().getFullYear() - parseInt(el.getAttribute('data-count-years'), 10)));
    }
  });
  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    if (reduce) { el.textContent = String(target); return; }
    var start = null, dur = 1200;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && counters.length) {
    var cObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cObs.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  }

  /* קרוסלת המלצות */
  var track = document.getElementById('testimonial-track');
  if (track) {
    document.querySelectorAll('.carousel__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = track.querySelector('.testimonial');
        var step = card ? card.getBoundingClientRect().width + 18 : 320;
        var dir = btn.getAttribute('data-dir') === 'next' ? -1 : 1; /* RTL: הבא = שמאלה */
        track.scrollBy({ left: dir * step, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  }
})();
