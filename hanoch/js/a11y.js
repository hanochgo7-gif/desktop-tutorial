/* תפריט נגישות – ללא תלויות. שומר את ההעדפות בדפדפן של המשתמש בלבד. */
(function () {
  'use strict';
  var KEY = 'hanoch-a11y';
  var EN = document.documentElement.lang === 'en';
  var T = function (he, en) { return EN ? en : he; };
  var OPTIONS = [
    { cls: 'a11y-font-lg',  label: T('הגדלת טקסט', 'Larger text'),              group: 'font' },
    { cls: 'a11y-font-xl',  label: T('הגדלת טקסט נוספת', 'Even larger text'), group: 'font' },
    { cls: 'a11y-contrast', label: T('ניגודיות גבוהה', 'High contrast') },
    { cls: 'a11y-links',    label: T('הדגשת קישורים', 'Highlight links') },
    { cls: 'a11y-readable', label: T('גופן קריא', 'Readable font') },
    { cls: 'a11y-no-motion',label: T('עצירת אנימציות', 'Stop animations') },
    { cls: 'a11y-cursor',   label: T('סמן עכבר גדול', 'Big cursor') },
    { cls: 'a11y-focus',    label: T('הדגשת מיקוד מקלדת', 'Highlight keyboard focus') }
  ];
  var root = document.documentElement;
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }

  function apply() {
    OPTIONS.forEach(function (o) { root.classList.toggle(o.cls, !!state[o.cls]); });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* אחסון חסום – ממשיכים בלי לשמור */ }
    panel.querySelectorAll('[data-cls]').forEach(function (b) {
      b.setAttribute('aria-pressed', state[b.getAttribute('data-cls')] ? 'true' : 'false');
    });
  }

  var wrap = document.createElement('div');
  wrap.className = 'a11y';
  wrap.innerHTML =
    '<button class="a11y__btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="a11y-panel" aria-label="' + T('פתיחת תפריט נגישות', 'Open the accessibility menu') + '" title="' + T('נגישות', 'Accessibility') + '">' +
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M20 8.5a1 1 0 0 0-1.2-.8L13.5 9h-3L5.2 7.7A1 1 0 0 0 4 8.5a1 1 0 0 0 .8 1.2L10 11v3l-2.4 6.2a1 1 0 0 0 1.9.7L12 15.3l2.5 5.6a1 1 0 0 0 1.9-.7L14 14v-3l5.2-1.3A1 1 0 0 0 20 8.5z"/></svg>' +
    '</button>' +
    '<div class="a11y__panel" id="a11y-panel" role="dialog" aria-labelledby="a11y-title" data-open="false" data-lenis-prevent>' +
      '<div class="a11y__head"><h2 id="a11y-title">' + T('התאמות נגישות', 'Accessibility') + '</h2><button class="a11y__close" type="button" aria-label="' + T('סגירת תפריט נגישות', 'Close the accessibility menu') + '">×</button></div>' +
      '<ul class="a11y__list">' + OPTIONS.map(function (o) {
        return '<li><button type="button" data-cls="' + o.cls + '" data-group="' + (o.group || '') + '" aria-pressed="false">' + o.label + '</button></li>';
      }).join('') + '</ul>' +
      '<div class="a11y__foot"><a href="' + (document.body.getAttribute('data-root') || '') + T('accessibility.html', 'en-accessibility.html') + '">' + T('הצהרת נגישות', 'Accessibility statement') + '</a><button class="a11y__reset" type="button">' + T('איפוס', 'Reset') + '</button></div>' +
    '</div>';
  document.body.appendChild(wrap);

  var btn = wrap.querySelector('.a11y__btn');
  var panel = wrap.querySelector('.a11y__panel');
  var closeBtn = wrap.querySelector('.a11y__close');

  function open() { panel.setAttribute('data-open', 'true'); btn.setAttribute('aria-expanded', 'true'); panel.querySelector('[data-cls]').focus(); }
  function close() { panel.setAttribute('data-open', 'false'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }

  btn.addEventListener('click', function () { panel.getAttribute('data-open') === 'true' ? close() : open(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.getAttribute('data-open') === 'true') close(); });
  document.addEventListener('click', function (e) { if (!wrap.contains(e.target) && panel.getAttribute('data-open') === 'true') close(); });

  panel.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cls]');
    if (!b) return;
    var cls = b.getAttribute('data-cls'), group = b.getAttribute('data-group');
    var next = !state[cls];
    if (group) OPTIONS.forEach(function (o) { if (o.group === group) state[o.cls] = false; });
    state[cls] = next;
    apply();
    // עצירת אנימציות משנה את כל הדף (תלת־ממד, חלקיקים, גלילה): טוענים מחדש בגרסה השקטה
    if (cls === 'a11y-no-motion') setTimeout(function () { location.reload(); }, 150);
  });
  wrap.querySelector('.a11y__reset').addEventListener('click', function () { var had = state['a11y-no-motion']; state = {}; apply(); if (had) location.reload(); });

  apply();
})();
