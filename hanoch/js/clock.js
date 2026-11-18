/* שעון ישראל בכותרת העליונה (tools/header.py): שעה ודקה, מתעדכן בתחילת כל דקה. */
(function () {
  'use strict';
  var el = document.querySelector('[data-clock]');
  if (!el || !window.Intl || !Intl.DateTimeFormat) return;
  var fmt;
  try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch (e) { return; }
  (function tick() {
    var now = new Date();
    el.textContent = fmt.format(now);
    el.setAttribute('datetime', now.toISOString());
    setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
  })();
  // תפריט בטלפון: נסגר בלחיצה בחוץ או ב-Escape (בדף הבית js/ux.js עושה את זה)
  var menu = document.querySelector('.top .menu');
  if (menu && !document.querySelector('script[src*="ux.js"]')) {
    document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
  }
})();
