/* דף הבית, "כל עסק. שפה משלו." (css/chapters.css)
   1. הפתיחה: קו כתום אחד יורד על המשטח. מעליו האתר הקודם של ש. גוטובסקי כבר בנוי מחדש, והמשטח צבוע בעולם שלו.
      אחר כך הקו עובר ללקוח הבא, כל אחד בצבעים שלו. כפתור השהיה (WCAG 2.2.2), עוצר כשהפתיחה לא על המסך.
      בלי JS, או למי שביקש פחות תנועה: חצי-חצי סטטי, לפני ואחרי, עם הקו באמצע.
   2. העבודות: בדסקטופ הפרקים נערמים (CSS sticky). כאן רק מחשבים כמה הפרק היוצא מכוסה (--out),
      והכותרת העליונה מקבלת את הצבעים של העולם שמתחתיה (data-theme על body).
   3. היועץ (assistant.js) נטען רק אחרי מגע ראשון או כמה שניות, כדי שהמסך הראשון יהיה קל. */
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
     1. הפתיחה
     ========================================================= */
  var field = d.getElementById('field');
  if (field) (function () {
    var sweep = field.querySelector('.sweep'), screen = field.querySelector('.hx-screen'), btn = field.querySelector('.hx-pause');
    var layers = {}, shots = {};
    [].forEach.call(field.querySelectorAll('.world'), function (el) { layers[el.dataset.w] = el; });
    [].forEach.call(screen.querySelectorAll('img'), function (el) { shots[el.dataset.w] = el; });
    var CYCLE = ['gotovski', 'ams', 'chef', 'clinic', 'allenbis'];
    var SW = 1600, HOLD0 = 1000, HOLD = 2800;
    var saver = !!(navigator.connection && navigator.connection.saveData);
    var geo = { H: 1, sTop: 0, sH: 1 };

    function measure() {
      var f = field.getBoundingClientRect(), s = screen.getBoundingClientRect();
      geo.H = f.height || 1; geo.sTop = s.top - f.top; geo.sH = s.height || 1;
    }
    function ready(k) { var i = shots[k]; return i && i.getAttribute('src') && i.complete && i.naturalWidth > 0; }

    /* התמונות של שאר הלקוחות נטענות רק אחרי שהעמוד נטען */
    function loadRest() {
      var sm = innerWidth < 900;
      [].forEach.call(screen.querySelectorAll('img[data-src]'), function (i) { i.src = sm ? i.dataset.srcSm : i.dataset.src; });
    }

    var shownA = null, shownB = null;
    function show(a, b) {
      if (a === shownA && b === shownB) return;
      Object.keys(layers).forEach(function (k) {
        var on = k === a || k === b;
        layers[k].classList.toggle('on', on); shots[k].classList.toggle('on', on);
        layers[k].style.zIndex = shots[k].style.zIndex = k === b ? 2 : 1;
        if (k !== b) { layers[k].style.clipPath = ''; shots[k].style.clipPath = ''; }
      });
      shownA = a; shownB = b;
    }
    function render(a, b, p) {
      show(a, b);
      if (b) {
        var y = p * geo.H;
        layers[b].style.clipPath = 'inset(0 0 ' + ((1 - p) * 100).toFixed(3) + '% 0)';
        var q = clamp((y - geo.sTop) / geo.sH, 0, 1);
        shots[b].style.clipPath = 'inset(0 0 ' + ((1 - q) * 100).toFixed(3) + '% 0)';
        sweep.style.transform = 'translateY(' + (y - 1).toFixed(1) + 'px)';
        sweep.style.opacity = clamp(Math.min(p, 1 - p) * 14, 0, 1);
      } else sweep.style.opacity = 0;
      field.dataset.now = b && p > .5 ? b : a;
    }

    /* מצב: עולם נוכחי, עולם הבא, שלב (החזקה או קו) ומתי התחיל */
    var cur = 'old', next = null, phase = 'hold', t0 = 0, paused = false, visible = true, live = false, raf = 0, ci = -1;
    function pickNext() {
      for (var n = 1; n <= CYCLE.length; n++) {
        var k = CYCLE[(ci + n) % CYCLE.length];
        if (k !== cur && ready(k)) { ci = (ci + n) % CYCLE.length; return k; }
      }
      return null;
    }
    function frame(now) {
      raf = 0;
      if (!live) return;
      if (paused || !visible || d.hidden) { t0 = now - (frame.el || 0); return; }
      var el = now - t0; frame.el = el;
      if (phase === 'hold') {
        render(cur, null, 0);
        if (el >= (cur === 'old' ? HOLD0 : HOLD)) {
          next = pickNext();
          if (next) { phase = 'sweep'; t0 = now; frame.el = 0; measure(); }
        }
      } else {
        var k = clamp(el / SW, 0, 1);
        render(cur, next, inOut(k));
        if (k >= 1) { cur = next; next = null; phase = 'hold'; t0 = now; frame.el = 0; render(cur, null, 0); }
      }
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && live) raf = requestAnimationFrame(frame); }

    function setPaused(p) {
      paused = p;
      btn.setAttribute('aria-pressed', p ? 'true' : 'false');
      btn.querySelector('span').textContent = p ? 'המשך' : 'השהיה';
      btn.setAttribute('aria-label', p ? 'המשך ההדגמה' : 'השהיית ההדגמה');
      kick();
    }
    function stop() {
      live = false; cancelAnimationFrame(raf); raf = 0;
      field.classList.remove('is-live'); btn.hidden = true;
      Object.keys(layers).forEach(function (k) { layers[k].classList.remove('on'); shots[k].classList.remove('on'); layers[k].style.cssText = ''; shots[k].style.cssText = ''; });
      sweep.style.cssText = ''; shownA = shownB = null; delete field.dataset.now;
    }
    function start() {
      if (live || still()) return;
      live = true; field.classList.add('is-live'); btn.hidden = false;
      measure(); cur = 'old'; phase = 'hold'; t0 = performance.now(); frame.el = 0; render('old', null, 0); kick();
    }

    // בדיקות ותמונות מסך: מצב קבוע לפי זמן (window.__heroAt(1.2) וכן הלאה), כאילו כל התמונות כבר כאן
    function worldAt(n) { return n === 0 ? 'old' : CYCLE[(n - 1) % CYCLE.length]; }
    window.__heroAt = function (t) {
      stop(); field.classList.add('is-live'); measure(); loadRest();
      var ms = t * 1000, n = 0, at = 0;
      for (;;) {
        var hold = n === 0 ? HOLD0 : HOLD;
        if (ms < at + hold) return render(worldAt(n), null, 0);
        at += hold;
        if (ms < at + SW) return render(worldAt(n), worldAt(n + 1), inOut((ms - at) / SW));
        at += SW; n++;
      }
    };

    btn.addEventListener('click', function () { setPaused(!paused); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }).observe(field);
    d.addEventListener('visibilitychange', kick);
    addEventListener('resize', measure);
    // מתפריט הנגישות אפשר לעצור את כל התנועה באמצע: חוזרים לחצי-חצי הסטטי
    new MutationObserver(function () { if (still()) stop(); else start(); }).observe(root, { attributes: true, attributeFilter: ['class'] });

    // הבנייה מתחילה מיד (הקו יורד כשנייה אחרי הציור הראשון). שאר הלקוחות נטענים רק אחרי שהעמוד נטען
    start();
    var rest = function () { if (!saver) { if ('requestIdleCallback' in window) requestIdleCallback(loadRest, { timeout: 1500 }); else setTimeout(loadRest, 300); } };
    if (d.readyState === 'complete') rest(); else addEventListener('load', rest);
  })();

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
     2. העבודות: פרקים נערמים, והכותרת מחליפה שפה
     ========================================================= */
  var stack = d.getElementById('work');
  var stackEls = stack ? [].slice.call(stack.children) : [];
    var stacked = matchMedia('(min-width: 900px) and (min-height: 680px)');
  var HDR = 36, ticking = false;
  var chs = [].slice.call(d.querySelectorAll('.ch'));

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
  /* --p לכל פרק: 0 כשהוא נכנס, .5 כשהוא מלא על המסך, 1 כשהוא יוצא (או כשהבא כיסה אותו) */
  function progress(vh) {
    chs.forEach(function (c) {
      var p = .5;
      if (!still()) {
        if (stacked.matches) p = clamp((vh - (flowTop(c) - scrollY)) / (2 * vh), 0, 1);
        else { var r = c.getBoundingClientRect(); p = clamp((vh - r.top) / (vh + r.height), 0, 1); }
      }
      c.style.setProperty('--p', p.toFixed(4));
      if (c.classList.contains('ch-ams')) amsFrame(p);
    });
  }
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var vh = innerHeight;
      progress(vh);
      if (stacked.matches && !still()) {
        stackEls.forEach(function (el, i) {
          var nx = stackEls[i + 1]; if (!nx) return;
          var out = clamp(1 - nx.getBoundingClientRect().top / vh, 0, 1);
          el.style.setProperty('--out', out.toFixed(4));
        });
      }
      // הצבעים של הכותרת: לפי מה שבאמת נראה מתחת לקו שלה (לא לפי מלבנים, כי פרק דביק נשאר "במקום" גם אחרי שכוסה)
      var theme = '', under = d.elementsFromPoint(innerWidth / 2, HDR);
      for (var i = 0; i < under.length; i++) {
        if (under[i].closest('.top, .a11y, .ht-btn, .consent, #dock')) continue;
        var t = under[i].closest('[data-theme]'); if (t) { theme = t.dataset.theme; break; }
      }
      if (theme === 'studio') theme = '';
      if ((body.dataset.theme || '') !== theme) { if (theme) body.dataset.theme = theme; else delete body.dataset.theme; }
    });
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* מקלדת: פרק דביק מסתיר את מה שבתוכו (WCAG 2.4.11). כשמשהו בתוך הערימה מקבל מיקוד,
     גוללים למקום הטבעי של הפרק שלו, ואז הוא כולו על המסך */
  function flowTop(el) {
    var y = stack.getBoundingClientRect().top + scrollY;
    for (var i = 0; i < stackEls.length && stackEls[i] !== el; i++) y += stackEls[i].offsetHeight;
    return y;
  }
  var calm = function () { return still() ? 'auto' : 'smooth'; };
  if (stack) stack.addEventListener('focusin', function (e) {
    var sec = e.target.closest('.stack > *'); if (!sec) return;
    var r = e.target.getBoundingClientRect();
    var hidden = r.top < 72 || r.bottom > innerHeight - 60;
    if (!hidden) return;
    if (stacked.matches) {
      var off = r.top - sec.getBoundingClientRect().top;
      scrollTo({ top: flowTop(sec) + Math.max(0, off + r.height - innerHeight + 90), behavior: 'instant' });
    } else e.target.scrollIntoView({ block: 'center', behavior: calm() });
  });
  [].forEach.call(d.querySelectorAll('.ba-range'), function (r) {
    r.addEventListener('focus', function () {
      var b = r.closest('.ba-screen').getBoundingClientRect();
      if (b.top < 72 || b.bottom > innerHeight) r.closest('.ba-fig').scrollIntoView({ block: 'center', behavior: calm() });
    });
  });
  addEventListener('resize', onScroll);
  onScroll();
})();
