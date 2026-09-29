/* תפריט נגישות: העדפות נשמרות בדפדפן */
(function () {
  var root = document.documentElement, KEY = 'rg-a11y';
  var btn = document.getElementById('a11y-btn'), panel = document.getElementById('a11y-panel');
  if (!btn || !panel) return;
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  function apply() {
    var list = panel.querySelectorAll('[data-a11y]');
    for (var i = 0; i < list.length; i++) {
      var k = list[i].getAttribute('data-a11y'), on = !!state[k];
      root.classList.toggle('a11y-' + k, on);
      list[i].setAttribute('aria-pressed', String(on));
    }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    if (window.syncSiteVideos) window.syncSiteVideos();
  }
  function open(o) {
    panel.hidden = !o; btn.setAttribute('aria-expanded', String(o));
    if (o) { var f = panel.querySelector('button'); if (f) f.focus(); } else btn.focus();
  }
  btn.addEventListener('click', function () { open(panel.hidden); });
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a11y]');
    if (b) {
      var k = b.getAttribute('data-a11y');
      if (k === 'text-1' && !state[k]) state['text-2'] = false;
      if (k === 'text-2' && !state[k]) state['text-1'] = false;
      state[k] = !state[k]; apply(); return;
    }
    if (e.target.closest('#a11y-reset')) { state = {}; apply(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) open(false);
    if (e.key === 'Tab' && !panel.hidden) {
      var items = [btn].concat(Array.prototype.slice.call(panel.querySelectorAll('button, a')));
      var i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
  document.addEventListener('click', function (e) { if (!panel.hidden && !e.target.closest('#a11y-panel, #a11y-btn')) open(false); });
  apply();
})();
