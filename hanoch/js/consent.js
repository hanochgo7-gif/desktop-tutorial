/* הסכמה לעוגיות של Google Analytics, Google Ads והפיקסל של Meta, ללא תלויות.
   ברירת המחדל: בלי עוגיות. Google מקבלת רק אותות אנונימיים (מצב הסכמה מתקדם, js/ga.js), ועוגיות נשמרות רק אחרי לחיצה על "מאשר". הבחירה נשמרת בדפדפן בלבד.
   גרסה 2: הנוסח כולל גם מדידת פרסום, ולכן מי שאישר בגרסה 1 מתבקש לאשר שוב.
   גרסה 3: הנוסח כולל גם את Meta (פייסבוק ואינסטגרם, js/meta.js), ולכן מי שאישר קודם מתבקש לאשר שוב.
   כל קישור או כפתור עם data-consent-open פותח את ההודעה מחדש כדי לשנות את הבחירה. */
(function () {
  'use strict';
  var KEY = 'hg-consent', VERSION = 3;
  var EN = document.documentElement.lang === 'en';
  var T = function (he, en) { return EN ? en : he; };
  var ROOT = (document.body && document.body.getAttribute('data-root')) || '';

  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.v === VERSION ? v : null; } catch (e) { return null; }
  }
  function write(analytics) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics: analytics, at: new Date().toISOString().slice(0, 10) })); } catch (e) { /* אחסון חסום: הבחירה תחול רק בביקור הזה */ }
  }
  // מחיקת עוגיות Google Analytics, Google Ads ו-Meta אחרי ביטול הסכמה
  function clearGa() {
    var host = location.hostname, parts = host.split('.'), domains = ['', host];
    for (var i = 0; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!/^(_ga|_gcl_|_fbp|_fbc)/.test(name)) return;
      domains.forEach(function (d) { document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : ''); });
    });
  }

  var state = read();
  var granted = !!(state && state.analytics);
  var listeners = [];
  window.hgConsent = {
    analytics: function () { return granted; },
    onGrant: function (fn) { if (granted) fn(); else listeners.push(fn); }
  };

  var CSS =
    '.consent{position:fixed;z-index:126;bottom:18px;inset-inline-start:18px;width:min(440px,calc(100vw - 36px));padding:1rem 1.1rem;border-radius:16px;' +
    'background:#0e0e10;color:#ede8de;border:1px solid rgba(237,232,222,.16);box-shadow:0 20px 50px rgba(0,0,0,.5);' +
    'font-family:var(--f-body,"Rubik",system-ui,sans-serif);font-size:.95rem;line-height:1.6}' +
    '.consent[hidden]{display:none}' +
    '.consent__text{margin:0 0 .85rem}' +
    '.consent__text a{color:var(--signal,#ff4f1a);text-decoration:underline;text-underline-offset:3px}' +
    '.consent__actions{display:flex;gap:.6rem;flex-wrap:wrap}' +
    '.consent__btn{flex:1 1 0;min-width:9.5rem;min-height:44px;padding:.6rem 1rem;border-radius:99px;border:1px solid rgba(237,232,222,.55);' +
    'background:transparent;color:#ede8de;font:inherit;font-family:var(--f-mono,ui-monospace,monospace);font-size:.85rem;cursor:pointer}' +
    '.consent__btn:hover{background:rgba(237,232,222,.1)}' +
    '.consent__btn:focus-visible,.consent__text a:focus-visible{outline:2px solid var(--signal,#ff4f1a);outline-offset:3px}' +
    '@media (max-width:600px){.consent{bottom:80px;padding:.85rem .95rem;font-size:.875rem;line-height:1.55}.consent__text{margin-bottom:.7rem}' +
    '.consent__btn{min-width:0;padding:.5rem .7rem;font-size:.8rem;white-space:nowrap}}' +
    // טלפון קטן (רוחב עד 400 או גובה עד 700): אותו נוסח בדיוק, בעימוד צפוף יותר, כדי שההודעה לא תסתיר את הכפתורים של המסך הראשון
    '@media (max-width:400px),(max-width:600px) and (max-height:700px){.consent{padding:.7rem .8rem;font-size:.8125rem;line-height:1.45;border-radius:14px}.consent__text{margin-bottom:.55rem}.consent__actions{gap:.45rem}.consent__btn{font-size:.78rem;padding:.4rem .6rem}}' +
    '.menu-open .consent,.case-open .consent{visibility:hidden}';

  var box = null;
  function build() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    box = document.createElement('section');
    box.className = 'consent';
    box.setAttribute('aria-label', T('הסכמה לעוגיות', 'Cookie consent'));
    box.innerHTML =
      '<p class="consent__text">' + T(
        'כדי לדעת אילו עמודים ופרסומים עובדים, אני משתמש בכלים של Google ו-Meta. עוגיות נשמרות רק אם תאשרו. בלי אישור, Meta לא מקבלת כלום, Google מקבלת רק אותות אנונימיים, והאתר עובד אותו דבר.',
        'To learn which pages and ads work, I use Google and Meta tools. Cookies are stored only if you agree. Without consent, Meta receives nothing, Google receives only anonymous signals, and the site works the same.') +
      ' <a href="' + ROOT + T('privacy.html', 'en-privacy.html') + '#cookies">' + T('פרטים במדיניות הפרטיות', 'Details in the privacy policy') + '</a></p>' +
      '<div class="consent__actions">' +
        '<button type="button" class="consent__btn" data-choice="yes">' + T('לאשר עוגיות', 'Allow cookies') + '</button>' +
        '<button type="button" class="consent__btn" data-choice="no">' + T('בלי עוגיות', 'No cookies') + '</button>' +
      '</div>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-choice]');
      if (b) choose(b.getAttribute('data-choice') === 'yes');
    });
    document.body.appendChild(box);
  }
  // יושבת מעל כפתור הצ'אט, באותה פינה. המיקום נקבע לפני שההודעה מוצגת, כדי שלא תזוז מול העיניים
  function lift() {
    var b = document.querySelector('.ht-btn');
    if (!b || !b.offsetHeight) return;
    box.style.bottom = Math.round((parseFloat(b.style.bottom) || parseFloat(getComputedStyle(b).bottom) || 18) + b.offsetHeight + 12) + 'px';
  }
  function show() { if (!box) build(); lift(); box.hidden = false; }
  function hide() { if (box) box.hidden = true; }

  function choose(yes) {
    var was = granted;
    write(yes); granted = yes; hide();
    if (yes && !was) { var l = listeners; listeners = []; l.forEach(function (fn) { fn(); }); }
    if (!yes && was) { clearGa(); location.reload(); }
  }

  var embedded = false;
  try { embedded = window.top !== window; } catch (e) { embedded = true; }

  // בחירה שנעשתה בלשונית או בחלון האב (למשל ההדמיה שמוטמעת בתיק העבודות) חלה גם כאן
  addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    var s = read();
    if (s && s.analytics && !granted) { granted = true; var l = listeners; listeners = []; l.forEach(function (fn) { fn(); }); }
  });

  // בעמודים עם כפתור הצ'אט, ההודעה מופיעה רק אחרי שהכפתור במקומו (עד 3 שניות). כך היא לא קופצת למעלה אחרי שכבר נראתה
  function ask() {
    var chat = document.querySelector('script[src*="assistant.js"]');
    if (!chat || document.documentElement.hasAttribute('data-launcher')) show();
    else {
      var t = setTimeout(show, 3000);
      document.addEventListener('hg:launcher', function () { clearTimeout(t); show(); }, { once: true });
    }
  }

  function init() {
    if (!state && !embedded) {
      // ההודעה מחכה לגלילה הראשונה או ל-8 שניות, כדי שהמסך הראשון, עם הכותרת ודרכי הפנייה, ייראה שלם.
      // זה לא משנה מה נאסף: עד שמאשרים לא נשמרת שום עוגייה (js/ga.js)
      var asked = false, wait;
      var go = function () { if (asked) return; asked = true; clearTimeout(wait); removeEventListener('scroll', go); ask(); };
      addEventListener('scroll', go, { passive: true });
      wait = setTimeout(go, 8000);
    }
    document.addEventListener('click', function (e) {
      var o = e.target.closest && e.target.closest('[data-consent-open]');
      if (!o) return;
      e.preventDefault(); show();
      var first = box.querySelector('[data-choice]'); if (first) first.focus();
    });
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
