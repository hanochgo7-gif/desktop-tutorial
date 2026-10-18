/* עמוד הבית: הלילה, בחירת עבודות לפי תחום ופס הפנייה בטלפון.
   הלילה: שעון דבוק שמתקדם עם הגלילה, צבע שעובר מדמדומים לבוקר, וסרטונים שמתנגנים רק כשרואים אותם.
   בלי JavaScript הכול מוצג כרגיל: השעות כתובות בטקסט, והתמונות מחכות במקום הסרטונים. */
(function () {
  'use strict';
  var root = document.documentElement;
  var EN = root.lang === 'en';
  var T = function (he, en) { return EN ? en : he; };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var small = window.matchMedia('(max-width: 900px)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !root.classList.contains('motion');
  var IO = 'IntersectionObserver' in window;

  /* ---------- וידאו: נטען רק כשמתקרבים, מתנגן רק כשרואים ---------- */
  function src(v) { return (small && v.dataset.srcM) || v.dataset.src; }
  function poster(v) { if (!v.poster) v.poster = (small && v.dataset.posterM) || v.dataset.poster; }
  function play(v) {
    if (!v.src) {
      v.src = src(v);
      // שרת שלא שולח בחלקים (אייפון): מורידים את הקובץ שלם ומנגנים מהזיכרון
      v.addEventListener('error', function () {
        if (v.dataset.blob || !window.fetch) return;
        v.dataset.blob = '1';
        fetch(src(v)).then(function (r) { return r.blob(); }).then(function (b) { v.src = URL.createObjectURL(b); if (!paused) v.play().catch(function () { }); }).catch(function () { });
      }, { once: true });
    }
    var p = v.play(); if (p && p.catch) p.catch(function () { });
  }

  /* ---------- הלילה ---------- */
  var night = $('#night');
  var paused = reduce;
  if (night) {
    var items = $$('.nt', night), vids = $$('video', night);
    var clock = $('.nc-time', night), state = $('.nc-state', night), btn = $('.night-pause', night);
    try { if (sessionStorage.getItem('hg-night-paused') === '1') paused = true; } catch (e) { }
    function label() {
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.textContent = paused ? T('הפעלת הסרטונים', 'Play videos') : T('עצירת הסרטונים', 'Pause videos');
    }
    label();
    btn.addEventListener('click', function () {
      paused = !paused; label();
      try { sessionStorage.setItem('hg-night-paused', paused ? '1' : '0'); } catch (e) { }
      vids.forEach(function (v) { if (paused) v.pause(); else if (v.dataset.seen) play(v); });
    });

    var at = -1;
    function setScene(i) {
      if (i === at) return;
      at = i;
      var it = items[i];
      night.dataset.phase = it.dataset.phase;
      state.textContent = it.dataset.state;
      var t = it.dataset.time;
      if (!reduce && window.gsap && window.ScrambleTextPlugin) gsap.to(clock, { duration: 0.6, ease: 'none', scrambleText: { text: t, chars: '0123456789', speed: 0.9 } });
      else clock.textContent = t;
    }

    if (IO) {
      // התמונות נטענות מוקדם, כדי שאף פעם לא יופיע ריבוע שחור
      var near = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) { poster(e.target); near.unobserve(e.target); } });
      }, { rootMargin: '1000px 0px' });
      vids.forEach(function (v) { near.observe(v); });
      // מתנגן רק כשרואים את רובו, נעצר כשיוצא מהמסך
      var view = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) { v.dataset.seen = '1'; if (!paused) play(v); }
          else if (!v.paused) v.pause();
        });
      }, { threshold: 0.35 });
      vids.forEach(function (v) { view.observe(v); });
      // הסצנה שבאמצע המסך קובעת את השעה ואת הצבע
      var mid = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) setScene(items.indexOf(e.target)); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      // כניסה: הסרט עולה, והטלפון מגיע אחריו
      var inn = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); inn.unobserve(e.target); } });
      }, { threshold: 0.2 });
      items.forEach(function (it) { mid.observe(it); inn.observe(it); });
    } else {
      vids.forEach(poster);
      items.forEach(function (it) { it.classList.add('is-in'); });
    }

    // פס ההתקדמות בשעון: כמה מהלילה כבר עבר
    var clockBox = $('.night-clock', night), ticking = false;
    function progress() {
      ticking = false;
      var r = night.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * 0.5 - r.top) / (r.height - vh * 0.5)));
      clockBox.style.setProperty('--nt-p', p.toFixed(3));
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
    progress();

    /* הפרסומת המלאה: נפתחת בחלון, עם קול */
    var ad = $('.nt-ad', night), dlg = null, opener = null;
    if (ad) ad.addEventListener('click', function () {
      opener = ad;
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.className = 'film-dlg night-dlg';
        dlg.setAttribute('aria-label', T('הפרסומת של HG Studio: אתר שלא נסגר בשבע', 'HG Studio ad: a website that doesn’t close at seven'));
        var base = ad.dataset.ad;
        dlg.innerHTML = '<button class="film-close mono" type="button">' + T('סגירה ✕', 'Close ✕') + '</button>' +
          '<video class="film-video night-ad" controls playsinline preload="metadata" poster="' + base + '.webp">' +
          '<source src="' + base + '-m.mp4" type="video/mp4" media="(max-width: 700px)"><source src="' + base + '.mp4" type="video/mp4">' +
          (EN ? '<track kind="subtitles" srclang="en" label="English" src="' + base + '.en.vtt" default>' : '') + '</video>';
        document.body.appendChild(dlg);
        var close = function () { var v = $('video', dlg); v.pause(); if (dlg.open) dlg.close(); };
        $('.film-close', dlg).addEventListener('click', close);
        dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
        dlg.addEventListener('close', function () { $('video', dlg).pause(); root.classList.remove('film-open'); if (opener) opener.focus(); });
      }
      vids.forEach(function (v) { v.pause(); });
      dlg.showModal();
      root.classList.add('film-open');
      requestAnimationFrame(function () { dlg.classList.add('is-in'); });
      var v = $('video', dlg); v.currentTime = 0;
      var p = v.play(); if (p && p.catch) p.catch(function () { });
    });
  }

  /* ---------- עבודות לפי תחום: הכרטיס המתאים נגלל למרכז ומסומן ---------- */
  var chips = $$('.pf-chip');
  chips.forEach(function (c) {
    c.addEventListener('click', function (e) {
      var card = document.getElementById('pf-' + c.dataset.pf);
      if (!card) return;
      e.preventDefault();
      chips.forEach(function (o) { o.removeAttribute('aria-current'); });
      c.setAttribute('aria-current', 'true');
      $$('.pf.is-picked').forEach(function (p) { p.classList.remove('is-picked'); });
      card.classList.add('is-picked');
      var list = card.parentElement;
      // בטלפון הרשימה נגללת הצידה: מזיזים רק אותה, בלי להקפיץ את העמוד
      if (list.scrollWidth > list.clientWidth + 4) {
        var r = card.getBoundingClientRect(), lr = list.getBoundingClientRect();
        list.scrollBy({ left: r.left + r.width / 2 - (lr.left + lr.width / 2), behavior: reduce ? 'auto' : 'smooth' });
      } else {
        card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
      var link = $('.pf-links a', card); if (link) link.focus({ preventScroll: true });
    });
  });

  /* ---------- פס פנייה בטלפון: אחרי הפתיחה, ולא ליד הטופס ---------- */
  var dockEl = $('.hm-dock');
  if (dockEl) {
    try {
      var from = sessionStorage.getItem('hg-src');
      if (from) $$('[data-wa]').forEach(function (a) { a.href += encodeURIComponent('\n' + T('הגעתי דרך: ', 'Came via: ') + from); });
    } catch (e) { }
    var hero = $('.hero'), contact = $('#contact');
    var heroIn = true, contactIn = false;
    var sync = function () { root.classList.toggle('dock-on', !heroIn && !contactIn); };
    if (IO && contact) {
      new IntersectionObserver(function (en) { contactIn = en[0].isIntersecting; sync(); }, { rootMargin: '0px 0px -30% 0px' }).observe(contact);
      // בעמוד הבית: אחרי הפתיחה. בעמודים בלי פתיחה: אחרי חצי מסך של גלילה
      if (hero) new IntersectionObserver(function (en) { heroIn = en[0].isIntersecting; sync(); }, { rootMargin: '0px 0px -60% 0px' }).observe(hero);
      else {
        var past = function () { var v = window.scrollY < window.innerHeight * 0.5; if (v !== heroIn) { heroIn = v; sync(); } };
        window.addEventListener('scroll', past, { passive: true }); past();
      }
    } else root.classList.add('dock-on');
  }
})();

/* טלפון: כרטיסי החבילות מציגים ארבע שורות ראשונות, והשאר נפתח בלחיצה. התוכן כולו בדף, רק מקופל */
(function () {
  'use strict';
  if (!window.matchMedia('(max-width: 900px)').matches) return;
  var EN = document.documentElement.lang === 'en';
  var n = 0;
  Array.prototype.forEach.call(document.querySelectorAll('.tier .tier-list, .care-plan .tier-list'), function (ul) {
    var extra = ul.children.length - 4;
    if (extra < 2) return;
    ul.id = ul.id || 'tl-' + (++n);
    ul.classList.add('is-clamped');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tl-more mono';
    b.setAttribute('aria-controls', ul.id); b.setAttribute('aria-expanded', 'false');
    var label = function (open) { b.textContent = open ? (EN ? 'Show less' : 'פחות') : (EN ? '+ ' + extra + ' more included' : '+ עוד ' + extra + ' שכלולים'); };
    label(false);
    b.addEventListener('click', function () {
      var open = ul.classList.toggle('is-clamped') === false;
      b.setAttribute('aria-expanded', open ? 'true' : 'false'); label(open);
      if (open) { var li = ul.children[4]; if (li) { li.tabIndex = -1; li.focus({ preventScroll: true }); } }
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
    ul.insertAdjacentElement('afterend', b);
  });
})();
