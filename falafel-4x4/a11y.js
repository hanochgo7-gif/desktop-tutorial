/* תפריט נגישות – קייטרינג 4X4. ללא תלויות. ההעדפות נשמרות רק בדפדפן של המבקר. */
(function () {
  'use strict';
  var KEY = 'falafel4x4-a11y';
  var OPTIONS = [
    { cls: 'a11y-font-lg',   label: 'הגדלת טקסט',       group: 'font' },
    { cls: 'a11y-font-xl',   label: 'הגדלה נוספת',      group: 'font' },
    { cls: 'a11y-contrast',  label: 'ניגודיות גבוהה' },
    { cls: 'a11y-links',     label: 'הדגשת קישורים' },
    { cls: 'a11y-readable',  label: 'גופן קריא' },
    { cls: 'a11y-no-motion', label: 'עצירת אנימציות' },
    { cls: 'a11y-cursor',    label: 'סמן עכבר גדול' },
    { cls: 'a11y-focus',     label: 'הדגשת מיקוד מקלדת' }
  ];
  var CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24'%3E%3Cpath d='M4 2l16 9-7 2-3 7z' fill='%23151314' stroke='%23fff' stroke-width='1.5'/%3E%3C/svg%3E\") 4 2, auto";
  var css =
    '.a11y{position:fixed;bottom:22px;right:22px;z-index:61;font-family:Rubik,system-ui,sans-serif}' +
    '.a11y__btn{width:54px;height:54px;border-radius:50%;background:#22b8dc;color:#fff;border:0;display:grid;place-content:center;cursor:pointer;box-shadow:0 14px 30px -10px rgba(0,0,0,.5)}' +
    '.a11y__btn svg{width:30px;height:30px}' +
    '.a11y__panel{display:none;position:absolute;bottom:66px;right:0;width:min(310px,calc(100vw - 24px));background:#fffdf6;color:#1b1917;border-radius:18px;padding:1rem;box-shadow:0 30px 60px -20px rgba(0,0,0,.55)}' +
    '.a11y__panel[data-open="true"]{display:block}' +
    '.a11y__head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem}' +
    '.a11y__head h2{font-family:Karantina,sans-serif;font-size:1.9rem;line-height:1;margin:0}' +
    '.a11y__close{background:none;border:0;font-size:1.7rem;width:40px;height:40px;cursor:pointer;color:inherit}' +
    '.a11y__list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:.45rem}' +
    '.a11y__list button{width:100%;min-height:52px;border:1.5px solid rgba(27,25,23,.18);border-radius:12px;background:#f1e7d0;color:#1b1917;font:inherit;font-size:.92rem;cursor:pointer;padding:.4rem}' +
    '.a11y__list button[aria-pressed="true"]{background:#151314;color:#f2b705;border-color:#151314}' +
    '.a11y__foot{display:flex;justify-content:space-between;align-items:center;margin-top:.8rem;font-size:.92rem}' +
    '.a11y__foot a{color:#1b1917}' +
    '.a11y__reset{background:none;border:0;text-decoration:underline;cursor:pointer;font:inherit;color:inherit}' +
    '@media (max-width:900px){.a11y{bottom:92px;right:12px}.a11y__btn{width:48px;height:48px}}' +
    '@media print{.a11y{display:none}}' +
    'html.a11y-font-lg{font-size:112.5%}html.a11y-font-xl{font-size:125%}' +
    'html.a11y-contrast section,html.a11y-contrast header,html.a11y-contrast footer,html.a11y-contrast main{filter:contrast(1.3)}' +
    'html.a11y-links a{text-decoration:underline!important;text-underline-offset:3px}' +
    'html.a11y-readable body,html.a11y-readable h1,html.a11y-readable h2,html.a11y-readable h3,html.a11y-readable b,html.a11y-readable legend{font-family:Arial,Helvetica,sans-serif!important;letter-spacing:.01em}' +
    'html.a11y-no-motion *,html.a11y-no-motion *::before,html.a11y-no-motion *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}' +
    'html.a11y-no-motion .cover{display:none}html.a11y-no-motion .pourclip{clip-path:none}' +
    'html.a11y-cursor,html.a11y-cursor *{cursor:' + CURSOR + '!important}' +
    'html.a11y-focus :focus{outline:4px solid #f2b705!important;outline-offset:3px!important}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.documentElement;
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }

  var wrap = document.createElement('div');
  wrap.className = 'a11y';
  wrap.innerHTML =
    '<button class="a11y__btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="a11y-panel" aria-label="פתיחת תפריט נגישות" title="נגישות">' +
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M20 8.5a1 1 0 0 0-1.2-.8L13.5 9h-3L5.2 7.7A1 1 0 0 0 4 8.5a1 1 0 0 0 .8 1.2L10 11v3l-2.4 6.2a1 1 0 0 0 1.9.7L12 15.3l2.5 5.6a1 1 0 0 0 1.9-.7L14 14v-3l5.2-1.3A1 1 0 0 0 20 8.5z"/></svg>' +
    '</button>' +
    '<div class="a11y__panel" id="a11y-panel" role="dialog" aria-labelledby="a11y-title" data-open="false">' +
      '<div class="a11y__head"><h2 id="a11y-title">התאמות נגישות</h2><button class="a11y__close" type="button" aria-label="סגירת תפריט נגישות">×</button></div>' +
      '<ul class="a11y__list">' + OPTIONS.map(function (o) {
        return '<li><button type="button" data-cls="' + o.cls + '" data-group="' + (o.group || '') + '" aria-pressed="false">' + o.label + '</button></li>';
      }).join('') + '</ul>' +
      '<div class="a11y__foot"><a href="accessibility.html">הצהרת נגישות</a><button class="a11y__reset" type="button">איפוס</button></div>' +
    '</div>';
  document.body.appendChild(wrap);

  var btn = wrap.querySelector('.a11y__btn');
  var panel = wrap.querySelector('.a11y__panel');

  function apply() {
    OPTIONS.forEach(function (o) { root.classList.toggle(o.cls, !!state[o.cls]); });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* אחסון חסום – ממשיכים בלי לשמור */ }
    panel.querySelectorAll('[data-cls]').forEach(function (b) {
      b.setAttribute('aria-pressed', state[b.getAttribute('data-cls')] ? 'true' : 'false');
    });
  }
  function isOpen() { return panel.getAttribute('data-open') === 'true'; }
  function open() { panel.setAttribute('data-open', 'true'); btn.setAttribute('aria-expanded', 'true'); panel.querySelector('[data-cls]').focus(); }
  function close() { panel.setAttribute('data-open', 'false'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }

  btn.addEventListener('click', function () { isOpen() ? close() : open(); });
  wrap.querySelector('.a11y__close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) close(); });
  document.addEventListener('click', function (e) { if (isOpen() && !wrap.contains(e.target)) close(); });
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cls]');
    if (!b) return;
    var cls = b.getAttribute('data-cls'), group = b.getAttribute('data-group');
    var next = !state[cls];
    if (group) OPTIONS.forEach(function (o) { if (o.group === group) state[o.cls] = false; });
    state[cls] = next;
    apply();
  });
  wrap.querySelector('.a11y__reset').addEventListener('click', function () { state = {}; apply(); });
  apply();
})();
