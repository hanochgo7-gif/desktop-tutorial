/* קרודו הנדסה · הדירה בהדמיה בדף הבית.
   "מבט של בודק" מנגן סרטון שעובר מהדירה הרגילה לתמונה של הבודק (הפריים האחרון שלו זהה לה).
   בלי סרטון, או כשמבקשים פחות תנועה, התמונה מתחלפת בפס סריקה או מיד.
   בחירה בממצא, בסיכה או ברשימה, מקרבת אליו ומראה תקריב להמחשה מתחת לתמונה. */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var root = $('[data-apt]');
  if (!root) return;
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stage = $('.apt__stage', root), move = $('.apt__move', root), vid = $('.apt__vid', root);
  var btn = $('[data-eye]', root), say = $('[data-eye-say]', root);
  var close = $('.apt__close', root), ccap = $('span', close), cimg = null; // התמונה בתקריב נוצרת בבחירה הראשונה
  var pins = $$('.apt__pin', root), finds = $$('.find[data-f]');
  var eye = false, cur = null, run = 0;

  function track(event, data) {
    var o = { event: event };
    for (var k in data) o[k] = data[k];
    (window.dataLayer = window.dataLayer || []).push(o);
  }
  function pinOf(f) { return pins.filter(function (b) { return b.dataset.f === f; })[0]; }

  pins.forEach(function (b) { b.style.left = b.dataset.x * 100 + '%'; b.style.top = b.dataset.y * 100 + '%'; });

  // הסרטון נטען רק כשהאזור מתקרב למסך, ולא כשמבקשים לחסוך בנתונים או בתנועה
  var save = navigator.connection && navigator.connection.saveData;
  if (vid && !REDUCED && !save && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      vid.preload = 'auto';
      vid.src = innerWidth < 700 ? vid.dataset.srcS : vid.dataset.src;
    }, { rootMargin: '600px 0px' });
    io.observe(root);
  }

  // המצלמה: מקרבת לממצא הנבחר בלי לצאת מגבולות התמונה. התוויות נפתחות לצד שיש בו מקום
  function frame() {
    var W = stage.clientWidth, H = stage.clientHeight;
    if (!W) return;
    var p = cur && pinOf(cur), c = p ? p.dataset.cam.split(' ').map(Number) : [0.5, 0.5, 1];
    var w = W * c[2], h = H * c[2];
    var ox = Math.min(0, Math.max(W - w, W / 2 - c[0] * w)), oy = Math.min(0, Math.max(H - h, H / 2 - c[1] * h));
    move.style.setProperty('--s', c[2]);
    move.style.transform = 'translate(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px) scale(' + c[2] + ')';
    pins.forEach(function (b) { b.classList.toggle('flip', ox + b.dataset.x * w < W / 2); });
  }
  if (window.ResizeObserver) new ResizeObserver(frame).observe(stage); else addEventListener('resize', frame);

  function show(f) {
    cur = f;
    pins.forEach(function (b) { b.classList.toggle('on', b.dataset.f === f); });
    finds.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.f === f ? 'true' : 'false'); });
    frame();
    var p = f && pinOf(f);
    close.hidden = !p;
    if (p) {
      if (!cimg) {
        cimg = document.createElement('img');
        cimg.width = 1200; cimg.height = 896; cimg.decoding = 'async';
        close.insertBefore(cimg, close.firstChild);
      }
      if (cimg.getAttribute('src') !== p.dataset.close) cimg.src = p.dataset.close;
      cimg.alt = p.dataset.alt;
      ccap.textContent = p.dataset.cap;
      say.textContent = p.dataset.say;
    } else {
      say.textContent = eye ? say.dataset.on : say.dataset.off;
    }
  }

  // how: 'video' (סרטון), 'sweep' (פס סריקה) או 'instant' (מיד)
  function setEye(on, how) {
    var my = ++run;
    eye = on;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    root.classList.remove('playing', 'sweep', 'instant');
    if (vid && !vid.paused) vid.pause();
    if (!on) {
      root.classList.remove('inspecting');
      pins.forEach(function (b) { b.tabIndex = -1; });
      show(null);
      return;
    }
    function done(kind) {
      if (my !== run) return;
      if (kind) root.classList.add(kind);
      root.classList.add('inspecting');
      pins.forEach(function (b) { b.tabIndex = 0; });
      if (!cur) say.textContent = say.dataset.on;
    }
    if (how !== 'video' || !vid || !vid.currentSrc) { done(how === 'instant' ? 'instant' : 'sweep'); return; }
    var started = false, finished = false;
    function fallback() {
      if (started || finished || my !== run) return;
      finished = true;
      vid.pause();
      done('sweep');
    }
    vid.addEventListener('playing', function () {
      if (my !== run) return;
      started = true;
      vid.playbackRate = 1.25;
      root.classList.add('playing');
    }, { once: true });
    vid.addEventListener('ended', function () {
      if (finished || my !== run) return;
      finished = true;
      done('instant');
      setTimeout(function () { if (my === run) root.classList.remove('playing'); }, 250);
    }, { once: true });
    vid.addEventListener('error', fallback, { once: true });
    try { vid.currentTime = 0; } catch (x) { /* */ }
    var pr = vid.play();
    if (pr && pr.catch) pr.catch(fallback);
    setTimeout(fallback, 1500);
  }

  // לחיצה על ממצא שכבר נבחר מחזירה לכל הדירה
  function pick(f) {
    if (!eye || root.classList.contains('playing')) setEye(true, 'instant');
    show(cur === f ? null : f);
    if (cur) track('finding_open', { finding: f });
  }

  btn.addEventListener('click', function () {
    setEye(!eye, REDUCED ? 'instant' : 'video');
    track('inspector_view', { on: eye });
  });
  pins.forEach(function (b) { b.addEventListener('click', function () { pick(b.dataset.f); }); });
  finds.forEach(function (b) {
    b.addEventListener('click', function () {
      pick(b.dataset.f);
      // בטלפון הרשימה מתחת לתמונה: מביאים את התמונה למסך
      var r = stage.getBoundingClientRect();
      if (cur && (r.top < 60 || r.bottom > innerHeight)) root.scrollIntoView({ block: 'start', behavior: REDUCED ? 'auto' : 'smooth' });
    });
  });
})();
