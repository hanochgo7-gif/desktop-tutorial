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
