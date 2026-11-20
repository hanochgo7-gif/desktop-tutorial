/* דף הבית, הפתיחה "לפני. אחרי.": האתר הקודם של ש. גוטובסקי נבנה מחדש על מסך הטלפון (CSS, css/atelier.css),
   ואחר כך האתר החדש נגלל לבד כמו אגודל: ארבע עצירות, מהפתיחה ועד יצירת הקשר, ונעצר.
   כאן: הגלילה בטלפון, כפתור השהיה (WCAG 2.2.2) ו"לראות שוב".
   התמונות של הגלילה נטענות רק אחרי שהעמוד נטען. מי שביקש פחות תנועה מקבל לפני ואחרי סטטיים, בלי כל זה.
   בנוסף: היועץ (assistant.js) נטען רק אחרי מגע ראשון או כמה שניות, כדי שהמסך הראשון יהיה קל. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;

  /* ---------- היועץ: נטען מאוחר ---------- */
  var chatDone = false;
  function chat() {
    if (chatDone) return; chatDone = true;
    var s = d.createElement('script'); s.src = '/js/assistant.js?v=3'; s.defer = true; d.body.appendChild(s);
  }
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) { addEventListener(ev, chat, { once: true, passive: true }); });
  addEventListener('load', function () { setTimeout(chat, 6000); });

  var hero = d.querySelector('.rn');
  if (!hero) return;
  function still() { return !root.classList.contains('motion') || root.classList.contains('a11y-no-motion'); }
  var strip = hero.querySelector('.rn-strip'), ctrl = hero.querySelector('.rn-ctrl');
  var pauseB = hero.querySelector('.rn-pause'), replayB = hero.querySelector('.rn-replay'), stage = hero.querySelector('.rn-stage');
  var saver = !!(navigator.connection && navigator.connection.saveData);
  var H = +strip.dataset.h, STOPS = strip.dataset.stops.split(' ').map(Number);
  var MOVE = 1100, HOLD = 1400;
  var scroll = null, timer = 0, waitScroll = false, running = false, paused = false, ready = false, loading = false;

  /* ---------- התמונות של האתר החדש לכל האורך ---------- */
  function load(cb) {
    if (ready) { if (cb) cb(); return; }
    if (cb) load.cbs = (load.cbs || []).concat(cb);
    if (loading) return; loading = true;
    var list = strip.dataset.tiles.split(' '), left = list.length;
    list.forEach(function (src) {
      var img = new Image(); img.alt = ''; img.decoding = 'async'; img.width = 585; img.height = 3966;
      var done = function () {
        if (--left) return;
        ready = true; var c = load.cbs || []; load.cbs = []; c.forEach(function (f) { f(); });
      };
      img.onload = function () { (img.decode ? img.decode() : Promise.resolve()).then(done, done); };
      img.onerror = function () { loading = false; };
      img.src = src; strip.appendChild(img);
    });
  }

  function setPaused(p) {
    paused = p;
    hero.classList.toggle('is-paused', p);
    pauseB.setAttribute('aria-pressed', p ? 'true' : 'false');
    pauseB.querySelector('span').textContent = p ? 'המשך' : 'השהיה';
    if (scroll) { if (p) scroll.pause(); else scroll.play(); }
    if (!p && waitScroll) { waitScroll = false; timer = setTimeout(go, 300); }
  }

  function end() {
    running = false; clearTimeout(timer); waitScroll = false;
    if (d.activeElement === pauseB) replayB.focus();
    pauseB.hidden = true;
    if (paused) setPaused(false);
  }

  /* ---------- הגלילה: תנועה, עצירה, תנועה ---------- */
  function go() {
    timer = 0;
    if (!running || still()) return end();
    if (paused) { waitScroll = true; return; }
    if (!ready) {
      // התמונות עוד לא כאן: מחכים עד ארבע שניות, ואם לא, נשארים על המסך הראשון של האתר החדש
      var gave = setTimeout(end, 4000);
      return load(function () { clearTimeout(gave); if (running) go(); });
    }
    var kf = [], t = 0, total = (STOPS.length - 1) * MOVE + (STOPS.length - 2) * HOLD;
    var at = function (y, easing) { var k = { transform: 'translateY(' + (-y / H * 100).toFixed(4) + '%)', offset: t / total }; if (easing) k.easing = easing; kf.push(k); };
    for (var i = 0; i < STOPS.length; i++) {
      if (i > 0) { t += MOVE; at(STOPS[i], i < STOPS.length - 1 ? 'linear' : null); }
      else at(STOPS[0], 'cubic-bezier(.6, 0, .22, 1)');
      if (i > 0 && i < STOPS.length - 1) { t += HOLD; at(STOPS[i], 'cubic-bezier(.6, 0, .22, 1)'); }
    }
    hero.classList.add('is-scroll');
    scroll = strip.animate(kf, { duration: total, fill: 'forwards' });
    scroll.onfinish = end;
  }

  function start() {
    running = true; pauseB.hidden = false; ctrl.hidden = false;
  }

  // הבנייה ב-CSS נגמרת: חצי שנייה, ואז הגלילה
  hero.addEventListener('animationend', function (e) {
    if (e.animationName !== 'rn-new' || !running) return;
    timer = setTimeout(go, 500);
  });

  function replay() {
    if (still()) return;
    clearTimeout(timer); waitScroll = false;
    if (scroll) { scroll.cancel(); scroll = null; }
    if (paused) setPaused(false);
    hero.classList.remove('is-scroll');
    hero.classList.add('is-reset');
    void hero.offsetWidth;
    hero.classList.remove('is-reset');
    hero.classList.add('is-again');
    start();
  }

  pauseB.addEventListener('click', function () { setPaused(!paused); });
  replayB.addEventListener('click', replay);

  // מתפריט הנגישות אפשר לעצור את כל התנועה באמצע: הגלילה נעצרת והמסך עובר ללפני ואחרי הסטטיים
  new MutationObserver(function () {
    if (!still()) return;
    clearTimeout(timer); waitScroll = false;
    if (scroll) { scroll.cancel(); scroll = null; }
    hero.classList.remove('is-scroll', 'is-paused');
    running = false; ctrl.hidden = true;
  }).observe(root, { attributes: true, attributeFilter: ['class'] });

  if (still()) return;
  start();
  // התמונות של הגלילה (כ-300KB) נטענות רק כשהבנייה מתחילה ואחרי שהעמוד נטען, כדי לא להתחרות במסך הראשון
  if (!saver) {
    var gate = 2, open = function () { if (--gate) return; if ('requestIdleCallback' in window) requestIdleCallback(function () { load(); }, { timeout: 800 }); else load(); };
    setTimeout(open, 1200);
    if (d.readyState === 'complete') open(); else addEventListener('load', open);
  }
})();
