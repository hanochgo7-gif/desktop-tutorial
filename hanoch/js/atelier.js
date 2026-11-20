/* אטלייה: הסרט בפתיחה (עם כפתור עצירה), כניסה אחת איטית, דהייה בגלילה,
   סרט נבחר שמתנגן בשקט כשהוא על המסך, וחלון לצפייה בסרט המלא.
   מי שביקש פחות תנועה (מהמערכת או מתפריט הנגישות) מקבל הכול סטטי: תמונה במקום סרט, בלי כניסות. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  function still() { return !root.classList.contains('motion') || root.classList.contains('a11y-no-motion'); }
  var saver = !!(navigator.connection && navigator.connection.saveData);
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  /* ---------- הסרט בפתיחה ---------- */
  var hero = d.querySelector('.at-hero');
  if (hero) {
    var reel = hero.querySelector('video'), btn = hero.querySelector('.at-pause');
    var userPaused = still() || saver;
    var sync = function () {
      if (!btn) return;
      var on = reel && !reel.paused;
      btn.setAttribute('aria-pressed', on ? 'false' : 'true');
      btn.setAttribute('aria-label', on ? 'עצירת הסרט ברקע' : 'הפעלת הסרט ברקע');
      btn.classList.toggle('is-paused', !on);
    };
    if (reel) {
      reel.src = innerWidth > 900 ? reel.dataset.srcLg : reel.dataset.srcSm;
      reel.addEventListener('play', sync); reel.addEventListener('pause', sync);
      var start = function () { var p = reel.play(); if (p && p.then) p.then(sync, sync); else sync(); };
      if (userPaused) { reel.removeAttribute('autoplay'); reel.preload = 'metadata'; reel.pause(); sync(); }
      else { reel.preload = 'auto'; start(); }
      if (btn) btn.addEventListener('click', function () { if (reel.paused) { userPaused = false; start(); } else { userPaused = true; reel.pause(); } });
      // דפדפנים שחוסמים הפעלה אוטומטית מאפשרים אותה אחרי מגע ראשון בדף
      var kick = function () { if (!userPaused && reel.paused) start(); };
      ['touchstart', 'pointerdown', 'keydown'].forEach(function (ev) { addEventListener(ev, kick, { once: true, passive: true }); });
      d.addEventListener('visibilitychange', function () { if (d.hidden) reel.pause(); else if (!userPaused) start(); });
      // הסרט לא מתנגן כשהפתיחה מחוץ למסך
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { if (!userPaused) start(); } else reel.pause();
      }).observe(hero);
    }
    sync();
    requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('is-in'); }); });
  }

  /* ---------- דהייה בגלילה ---------- */
  var items = [].slice.call(d.querySelectorAll('[data-rv]'));
  if (still() || !('IntersectionObserver' in window)) items.forEach(function (el) { el.classList.add('is-in'); });
  else {
    var rv = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); rv.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    items.forEach(function (el) { rv.observe(el); });
  }

  /* ---------- הסרט הנבחר: לולאה שקטה כשהוא על המסך ---------- */
  var loops = [].slice.call(d.querySelectorAll('.at-feature video[data-src]'));
  if (!still() && !saver && 'IntersectionObserver' in window) {
    var lio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.intersectionRatio >= 0.4) { if (!v.src) v.src = v.dataset.src; play(v); }
        else if (v.src) v.pause();
      });
    }, { threshold: [0, 0.4] });
    loops.forEach(function (v) { lio.observe(v); });
  }

  /* ---------- תמונות מתחת למסך הראשון: נטענות רק כשהן מתקרבות ----------
     (הדפדפן טוען תמונות "עצלות" כבר כמה מסכים מראש. כאן הן מוסתרות עד שהן במרחק מסך אחד) */
  var near = [].slice.call(d.querySelectorAll('[data-near]'));
  if ('IntersectionObserver' in window) {
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-near'); nio.unobserve(e.target); } });
    }, { rootMargin: '100% 0px 100% 0px' });
    near.forEach(function (el) { nio.observe(el); });
  } else near.forEach(function (el) { el.classList.add('is-near'); });

  /* ---------- עבודות: הקלטת הגלילה של כל אתר מתנגנת רק כשרוב המסך שלה נראה ----------
     הסרטון נטען רק בפעם הראשונה שהוא מגיע למסך. כפתור קטן בפינה עוצר אותו (WCAG 2.2.2) */
  var screens = [].slice.call(d.querySelectorAll('.wk-screen video[data-src]'));
  if (!still() && !saver && 'IntersectionObserver' in window) {
    var ICON = '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/></svg><svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.intersectionRatio >= 0.6) {
          if (!v.src) { v.src = innerWidth >= 900 ? v.dataset.src : v.dataset.srcSm; v.addEventListener('playing', function () { v.classList.add('is-on'); }); }
          if (!v.dataset.held) play(v);
        } else if (v.src) v.pause();
      });
    }, { threshold: [0, 0.6] });
    screens.forEach(function (v) {
      var name = (v.closest('.wk-item').querySelector('.wk-name') || {}).textContent || '';
      var b = d.createElement('button');
      b.type = 'button'; b.className = 'wk-play'; b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', 'עצירת ההקלטה של האתר של ' + name); b.innerHTML = ICON;
      b.addEventListener('click', function () {
        var hold = !v.dataset.held;
        if (hold) { v.dataset.held = '1'; v.pause(); } else { delete v.dataset.held; if (v.src) play(v); }
        b.setAttribute('aria-pressed', hold ? 'true' : 'false');
        b.setAttribute('aria-label', (hold ? 'הפעלת' : 'עצירת') + ' ההקלטה של האתר של ' + name);
      });
      v.parentNode.appendChild(b);
      sio.observe(v);
    });
  }

  /* ---------- לפני ואחרי: התפר נגרר (טווח רגיל, עובד גם במקלדת ובקורא מסך) ----------
     כשההשוואה מגיעה למסך, התפר זז פעם אחת קצת הצידה וחוזר, כדי לרמוז שאפשר להזיז אותו */
  [].forEach.call(d.querySelectorAll('.ba-range'), function (r) {
    var scr = r.closest('.ba-screen'), touched = false;
    var set = function (v) { scr.style.setProperty('--cut', v + '%'); };
    var say = function () { r.setAttribute('aria-valuetext', r.value + '% מהאתר החדש'); };
    r.addEventListener('input', function () { touched = true; set(r.value); say(); });
    say();
    set(r.value);
    if (still() || !('IntersectionObserver' in window)) return;
    var hint = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      hint.disconnect();
      setTimeout(function () {
        var t0 = null, from = +r.value;
        var step = function (t) {
          if (touched) return;
          if (t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / 1600), v = from + 14 * Math.sin(k * Math.PI);
          set(v.toFixed(2));
          if (k < 1) requestAnimationFrame(step); else set(r.value);
        };
        requestAnimationFrame(step);
      }, 500);
    }, { threshold: 0.6 });
    hint.observe(scr);
  });

  /* ---------- חלון לצפייה בסרט המלא ---------- */
  var dlg = d.querySelector('.at-film-lb');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var vid = dlg.querySelector('video'), ttl = dlg.querySelector('.pm-lb-t'), last = null;
  [].forEach.call(d.querySelectorAll('[data-film]'), function (b) {
    b.addEventListener('click', function () {
      last = b;
      dlg.classList.toggle('is-v', b.dataset.v === 'v');
      ttl.textContent = b.dataset.title || '';
      vid.src = b.dataset.film;
      vid.muted = !b.dataset.sound;
      dlg.showModal();
      play(vid);
    });
  });
  function shut() { vid.pause(); vid.removeAttribute('src'); vid.load(); if (dlg.open) dlg.close(); }
  dlg.querySelector('.pm-lb-x').addEventListener('click', shut);
  dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('pm-lb-in')) shut(); });
  dlg.addEventListener('close', function () { vid.pause(); if (last) last.focus(); });
})();
