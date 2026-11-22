/* דף הבית, "כל עסק. שפה משלו." (css/chapters.css). חדר ההקרנה עצמו (הפתיחה, המצלמה, הפרקים שנפרשים ממסך): js/room.js.
   כאן: התנועה בתוך כל פרק (--p לפי הגלילה), רצף הפריימים של AMS, הכותרת העליונה שמקבלת את צבעי העולם שמתחתיה,
   אולם המערכות שנטען כשמתקרבים, והיועץ (assistant.js) שנטען רק אחרי מגע ראשון או כמה שניות. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, body = d.body;

  /* ---------- היועץ: נטען מאוחר ---------- */
  var chatDone = false;
  function chat() {
    if (chatDone) return; chatDone = true;
    var s = d.createElement('script'); s.src = '/js/assistant.js?v=3'; s.defer = true; body.appendChild(s);
  }
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) { addEventListener(ev, chat, { once: true, passive: true }); });
  addEventListener('load', function () { setTimeout(chat, 6000); });

  function still() { return !root.classList.contains('motion') || root.classList.contains('a11y-no-motion'); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function inOut(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  /* =========================================================
     אולם המערכות: systems.css, sys-b.css ו-systems.js נטענים רק כשהאזור במרחק מסך וחצי
     ========================================================= */
  var sys = d.getElementById('systems');
  if (sys) (function () {
    var done = false;
    function css(href) { return new Promise(function (ok) { var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = l.onerror = ok; d.head.appendChild(l); }); }
    function load() {
      if (done) return; done = true;
      Promise.all([css('/css/systems.css?v=3'), css('/css/sys-b.css?v=2')]).then(function () {
        var s = d.createElement('script'); s.src = '/js/systems.js?v=4';
        s.onload = s.onerror = function () { sys.classList.add('sys-ready'); };
        body.appendChild(s);
      });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '150% 0px' });
      io.observe(sys);
    } else load();
    // מקלדת: מי שמגיע לאזור בטאב לפני שהוא נטען, מקבל אותו מיד
    sys.addEventListener('focusin', load);
  })();

  /* =========================================================
     העבודות: תנועה בתוך כל פרק, והכותרת מחליפה שפה
     ========================================================= */
  var HDR = 36, ticking = false;
  var chs = [].slice.call(d.querySelectorAll('.ch'));
  // המקום של פרק בעמוד, בלי getBoundingClientRect: פרק שמונח על מסך (js/room.js) מוטה, וזה לא משנה את המקום שלו
  function absTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
  var tops = [];
  function measure() { tops = chs.map(function (c) { return { top: absTop(c), h: c.offsetHeight }; }); }

  /* AMS: רצף הפריימים של המתאמן (13 תמונות קטנות) נטען רק כשהפרק מתקרב, ואז הגלילה בוחרת פריים */
  var amsImg = d.querySelector('.ams-frame'), amsTicks = amsImg ? [].slice.call(d.querySelectorAll('.ams-ticks i')) : [], frames = [], amsAt = -1;
  if (amsImg && 'IntersectionObserver' in window) {
    var fio = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; fio.disconnect();
      if (still()) return;
      frames = amsImg.dataset.frames.split(' ').map(function (src) { var i = new Image(); i.decoding = 'async'; i.src = src; return i; });
    }, { rootMargin: '100% 0px' });
    fio.observe(amsImg);
  }
  function amsFrame(p) {
    if (!frames.length) return;
    var k = Math.round(clamp(p, 0, 1) * (frames.length - 1));
    if (k === amsAt || !frames[k].complete || !frames[k].naturalWidth) return;
    amsAt = k; amsImg.src = frames[k].src;
    amsTicks.forEach(function (t, i) { t.classList.toggle('on', i === k); });
  }
  /* --p לכל פרק: 0 כשהוא נכנס מלמטה, .5 כשהוא מלא על המסך, 1 כשהוא יוצא */
  function progress(vh) {
    chs.forEach(function (c, i) {
      var p = .5;
      if (!still() && tops[i]) p = clamp((vh - (tops[i].top - scrollY)) / (vh + tops[i].h), 0, 1);
      var v = p.toFixed(3);
      if (c._p !== v) { c.style.setProperty('--p', v); c._p = v; }
      if (c.classList.contains('ch-ams')) amsFrame(p);
    });
  }
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      progress(innerHeight);
      // הצבעים של הכותרת: לפי מה שבאמת נראה מתחת לקו שלה
      var theme = '', under = d.elementsFromPoint(innerWidth / 2, HDR);
      for (var i = 0; i < under.length; i++) {
        if (under[i].closest('.top, .a11y, .ht-btn, .consent, #dock, .room')) continue;
        var t = under[i].closest('[data-theme]'); if (t) { theme = t.dataset.theme; break; }
      }
      if (theme === 'studio') theme = '';
      if ((body.dataset.theme || '') !== theme) { if (theme) body.dataset.theme = theme; else delete body.dataset.theme; }
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  var calm = function () { return still() ? 'auto' : 'smooth'; };
  [].forEach.call(d.querySelectorAll('.ba-range'), function (r) {
    r.addEventListener('focus', function () {
      var b = r.closest('.ba-screen').getBoundingClientRect();
      if (b.top < 72 || b.bottom > innerHeight) r.closest('.ba-fig').scrollIntoView({ block: 'center', behavior: calm() });
    });
  });
  var rz;
  function relayout() { clearTimeout(rz); rz = setTimeout(function () { measure(); onScroll(); }, 100); }
  addEventListener('resize', relayout);
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(d.getElementById('main'));
  measure(); onScroll();
})();
