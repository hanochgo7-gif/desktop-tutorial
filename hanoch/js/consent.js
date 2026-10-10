/* הסכמה לעוגיות סטטיסטיקה (Google Analytics) – ללא תלויות.
   ברירת המחדל: אין סטטיסטיקה. Google Analytics נטען רק אחרי לחיצה על "מאשר", והבחירה נשמרת בדפדפן בלבד.
   כל קישור או כפתור עם data-consent-open פותח את ההודעה מחדש כדי לשנות את הבחירה. */
(function () {
  'use strict';
  var KEY = 'hg-consent', VERSION = 1;
  var EN = document.documentElement.lang === 'en';
  var T = function (he, en) { return EN ? en : he; };
  var ROOT = (document.body && document.body.getAttribute('data-root')) || '';

  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.v === VERSION ? v : null; } catch (e) { return null; }
  }
  function write(analytics) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics: analytics, at: new Date().toISOString().slice(0, 10) })); } catch (e) { /* אחסון חסום: הבחירה תחול רק בביקור הזה */ }
  }
  // מחיקת עוגיות Google Analytics אחרי ביטול הסכמה
  function clearGa() {
    var host = location.hostname, parts = host.split('.'), domains = ['', host];
    for (var i = 0; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!/^_ga/.test(name)) return;
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
    'background:rgba(14,14,16,.96);color:#ede8de;border:1px solid rgba(237,232,222,.16);box-shadow:0 20px 50px rgba(0,0,0,.5);' +
    'font-family:var(--f-body,system-ui,sans-serif);font-size:.95rem;line-height:1.6}' +
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
    '.menu-open .consent,.case-open .consent{visibility:hidden}';

  var box = null;
  function build() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    box = document.createElement('section');
    box.className = 'consent';
    box.setAttribute('aria-label', T('הסכמה לעוגיות', 'Cookie consent'));
    box.innerHTML =
      '<p class="consent__text">' + T(
        'כדי לדעת אילו עמודים עוזרים לגולשים, אני משתמש ב-Google Analytics. הכלי שומר עוגיות בדפדפן שלכם, ונטען רק אם תאשרו. בלי אישור האתר עובד בדיוק אותו דבר.',
        'To learn which pages help visitors, I use Google Analytics. It stores cookies in your browser and loads only if you agree. Without it, the site works exactly the same.') +
      ' <a href="' + ROOT + T('privacy.html', 'en-privacy.html') + '#cookies">' + T('פרטים במדיניות הפרטיות', 'Details in the privacy policy') + '</a></p>' +
      '<div class="consent__actions">' +
        '<button type="button" class="consent__btn" data-choice="yes">' + T('מאשר סטטיסטיקה', 'Allow analytics') + '</button>' +
        '<button type="button" class="consent__btn" data-choice="no">' + T('בלי סטטיסטיקה', 'No analytics') + '</button>' +
      '</div>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-choice]');
      if (b) choose(b.getAttribute('data-choice') === 'yes');
    });
    document.body.appendChild(box);
  }
  function show() { if (!box) build(); box.hidden = false; }
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

  function init() {
    if (!state && !embedded) show();
    document.addEventListener('click', function (e) {
      var o = e.target.closest && e.target.closest('[data-consent-open]');
      if (!o) return;
      e.preventDefault(); show();
      var first = box.querySelector('[data-choice]'); if (first) first.focus();
    });
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
