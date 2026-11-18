/* חדר העריכה: השעון בכותרת, פתיחת התריס בפתיחה וקוד הזמן שקורא את הסרט עצמו,
   המוניטור של תוכנית הסרטים, והמחיקה של הפריים הראשי בעבודות.
   מי שביקש פחות תנועה (או "עצירת אנימציות" בתפריט הנגישות) מקבל הכול סטטי: התריס פתוח, קוד הזמן עומד, המוניטור מראה תמונה. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var still = function () { return !root.classList.contains('motion') || root.classList.contains('a11y-no-motion'); };

  /* ---------- שעון ישראל בכותרת ---------- */
  var clock = d.querySelector('[data-clock]');
  if (clock && window.Intl && Intl.DateTimeFormat) {
    var fmtClock;
    try { fmtClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch (e) { fmtClock = null; }
    if (fmtClock) {
      var tickClock = function () {
        var now = new Date();
        clock.textContent = fmtClock.format(now);
        clock.setAttribute('datetime', now.toISOString());
        setTimeout(tickClock, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
      };
      tickClock();
    }
  }

  /* ---------- קוד זמן בפריימים (24fps) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tc(t) {
    var f = Math.floor((t || 0) * 24);
    return pad(Math.floor(f / 86400)) + ':' + pad(Math.floor(f / 1440) % 60) + ':' + pad(Math.floor(f / 24) % 60) + ':' + pad(f % 24);
  }
  function follow(v, out, live) {
    var step = function () {
      if (live() && !v.paused && !still()) out.textContent = tc(v.currentTime);
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
      if (monTc) follow(mon, monTc, function () { return monSeen; });
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
