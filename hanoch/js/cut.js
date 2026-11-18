/* חדר העריכה: פתיחת התריס בפתיחה וקוד הזמן שקורא את הסרט עצמו,
   המוניטור של תוכנית הסרטים, והמחיקה של הפריים הראשי בעבודות.
   מי שביקש פחות תנועה (או "עצירת אנימציות" בתפריט הנגישות) מקבל הכול סטטי: התריס פתוח, קוד הזמן עומד, המוניטור מראה תמונה. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var still = function () { return !root.classList.contains('motion') || root.classList.contains('a11y-no-motion'); };

  // השעון בכותרת: js/clock.js (אותו קובץ בכל העמודים)

  /* ---------- קוד זמן בפריימים, לפי קצב הפריימים האמיתי של כל קובץ (ffprobe: 24, ו-Unforgettable ב-30) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tc(t, fps) {
    fps = fps || 24;
    var f = Math.floor((t || 0) * fps), s = Math.floor(f / fps);
    return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60) + ':' + pad(f % fps);
  }
  function follow(v, out, live, rate) {
    var step = function () {
      if (live() && !v.paused && !still()) out.textContent = tc(v.currentTime, rate ? rate() : 24);
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(step); else requestAnimationFrame(step);
    };
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(step); else requestAnimationFrame(step);
  }

  /* ---------- SM-1: פתיחה קרה ---------- */
  var hero = d.querySelector('.cut-open');
  if (hero) {
    var reel = hero.querySelector('video'), heroTc = hero.querySelector('[data-tc]');
    var open = function () { hero.classList.add('is-open'); };
    if (still() || !reel) open();
    else {
      // התריס נפתח עם הפריים הראשון, ולכל המאוחר אחרי שנייה (רשת איטית, חיסכון בסוללה)
      reel.addEventListener('playing', open, { once: true });
      setTimeout(open, 1000);
    }
    if (reel) {
      var seen = true;
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; }).observe(hero);
      var state = function () { hero.classList.toggle('is-rolling', !reel.paused); };
      reel.addEventListener('play', state); reel.addEventListener('pause', state); reel.addEventListener('playing', state);
      if (heroTc) follow(reel, heroTc, function () { return seen; });
    }
  }

  /* ---------- SM-4: מוניטור לתוכנית ההקרנה (מחשב בלבד) ---------- */
  var prog = d.querySelector('.prog');
  if (prog) {
    var items = [].slice.call(prog.querySelectorAll('.prog-item'));
    var mon = prog.querySelector('.prog-monitor video'), now = prog.querySelector('.prog-now'), monTc = prog.querySelector('[data-tc-monitor]');
    var wide = matchMedia('(min-width: 980px)');
    var current = null, wait = 0, armed = false, monSeen = false;
    var show = function (b) {
      if (!b || b === current) return;
      if (current) current.removeAttribute('aria-current');
      current = b; b.setAttribute('aria-current', 'true');
      if (now) {
        now.textContent = b.querySelector('.prog-t').textContent;
        if (b.querySelector('.prog-t').lang === 'en') now.setAttribute('lang', 'en'); else now.removeAttribute('lang');
      }
      if (!mon || !wide.matches) return;
      mon.poster = b.dataset.poster;
      if (monTc) monTc.textContent = tc(0);
      if (still() || !armed) { mon.removeAttribute('src'); mon.load(); return; }
      mon.src = b.dataset.loop;
      var p = mon.play(); if (p && p.catch) p.catch(function () {});
    };
    var soon = function (b) { clearTimeout(wait); wait = setTimeout(function () { show(b); }, 125); };
    items.forEach(function (b) {
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') soon(b); });
      b.addEventListener('focus', function () { soon(b); });
    });
    show(items[0]);
    // הסרטון במוניטור נטען רק כשהתוכנית על המסך, ונעצר כשהיא יוצאת ממנו
    if (mon && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        monSeen = es[0].isIntersecting;
        if (!wide.matches || still()) return;
        if (monSeen) {
          if (!armed) { armed = true; var c = current; current = null; show(c || items[0]); }
          else { var p = mon.play(); if (p && p.catch) p.catch(function () {}); }
        } else if (mon.src) mon.pause();
      }, { threshold: 0.35 }).observe(prog.querySelector('.prog-monitor'));
      if (monTc) follow(mon, monTc, function () { return monSeen; }, function () { return current ? +current.dataset.fps || 24 : 24; });
    }
  }

  /* ---------- SM-5: הפריים הראשי בעבודות נחשף בניגוב, פעם אחת ---------- */
  var feat = d.querySelector('.take--feature');
  if (feat) {
    if (still() || !('IntersectionObserver' in window)) feat.classList.add('is-in');
    else {
      var fio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { feat.classList.add('is-in'); fio.disconnect(); }
      }, { threshold: 0.25 });
      fio.observe(feat);
    }
  }
})();
