/* תפריט נגישות – ללא תלויות. שומר את ההעדפות בדפדפן של המשתמש בלבד. */
(function () {
  'use strict';
  var KEY = 'gutovski-a11y';
  var OPTIONS = [
    { cls: 'a11y-font-lg',  label: 'הגדלת טקסט',        group: 'font' },
    { cls: 'a11y-font-xl',  label: 'הגדלת טקסט נוספת',  group: 'font' },
    { cls: 'a11y-contrast', label: 'ניגודיות גבוהה' },
    { cls: 'a11y-links',    label: 'הדגשת קישורים' },
    { cls: 'a11y-readable', label: 'גופן קריא' },
    { cls: 'a11y-no-motion',label: 'עצירת אנימציות' },
    { cls: 'a11y-cursor',   label: 'סמן עכבר גדול' },
    { cls: 'a11y-focus',    label: 'הדגשת מיקוד מקלדת' }
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
    '<button class="a11y__btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="a11y-panel" aria-label="פתיחת תפריט נגישות" title="נגישות">' +
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M20 8.5a1 1 0 0 0-1.2-.8L13.5 9h-3L5.2 7.7A1 1 0 0 0 4 8.5a1 1 0 0 0 .8 1.2L10 11v3l-2.4 6.2a1 1 0 0 0 1.9.7L12 15.3l2.5 5.6a1 1 0 0 0 1.9-.7L14 14v-3l5.2-1.3A1 1 0 0 0 20 8.5z"/></svg>' +
    '</button>' +
    '<div class="a11y__panel" id="a11y-panel" role="dialog" aria-labelledby="a11y-title" data-open="false">' +
      '<div class="a11y__head"><h2 id="a11y-title">התאמות נגישות</h2><button class="a11y__close" type="button" aria-label="סגירת תפריט נגישות">×</button></div>' +
      '<ul class="a11y__list">' + OPTIONS.map(function (o) {
        return '<li><button type="button" data-cls="' + o.cls + '" data-group="' + (o.group || '') + '" aria-pressed="false">' + o.label + '</button></li>';
      }).join('') + '</ul>' +
      '<div class="a11y__foot"><a href="' + (document.body.getAttribute('data-root') || '') + 'accessibility.html">הצהרת נגישות</a><button class="a11y__reset" type="button">איפוס</button></div>' +
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
  });
  wrap.querySelector('.a11y__reset').addEventListener('click', function () { state = {}; apply(); });

  apply();
})();
