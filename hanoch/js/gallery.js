/* החפץ של כל פרויקט: סיבוב של 360° שצויר מראש (48 פריימים ברצועת תמונה אחת).
   בשורת הפרויקט החפץ בחומרים אמיתיים, ובסיפור הפרויקט כהולוגרמה. בלי WebGL בכלל,
   כך שזה עובד בכל מכשיר ובכל דפדפן, ולא מתחרה בבמה התלת־ממדית על כרטיס המסך. */
(function () {
  'use strict';

  var root = document.documentElement;
  var N = 48;
  var motion = root.classList.contains('motion');
  var caseEl = document.querySelector('.case');
  var slots = [];
  var running = false, last = 0;
  root.classList.add('gallery-on');

  function setSrc(s) {
    var id = s.getId();
    if (!id || id === s.id) return;
    s.id = id;
    s.frame = -1;
    s.sp.style.backgroundImage = 'url("work/relics/' + id + '-' + s.kind + '.webp")';
  }

  function show(s) {
    var i = ((Math.floor(s.f) % N) + N) % N;
    if (i === s.frame) return;
    s.frame = i;
    s.sp.style.backgroundPosition = (i / (N - 1) * 100) + '% 0';
  }

  function make(el, kind, getId) {
    var sp = document.createElement('i');
    sp.className = 'relic-sprite relic-' + kind;
    el.appendChild(sp);
    var s = { el: el, sp: sp, kind: kind, getId: getId, f: Math.random() * N, v: 0, drag: null, hover: false, visible: false, id: null, frame: -1 };
    slots.push(s);

    el.addEventListener('pointerdown', function (e) {
      s.drag = { x: e.clientX, t: performance.now() };
      s.v = 0;
      try { el.setPointerCapture(e.pointerId); } catch (err) { }
      el.classList.add('is-dragging');
      kick();
    });
    el.addEventListener('pointermove', function (e) {
      if (!s.drag) return;
      var now = performance.now(), dt = Math.max(8, now - s.drag.t) / 1000;
      var df = (e.clientX - s.drag.x) / Math.max(80, el.clientWidth) * N * 0.9;
      s.f += df;
      s.v = df / dt;
      s.drag.x = e.clientX; s.drag.t = now;
      show(s);
    });
    function end() { s.drag = null; el.classList.remove('is-dragging'); }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerenter', function () { s.hover = true; });
    el.addEventListener('pointerleave', function () { s.hover = false; });
    // גרירה היא לא לחיצה: לא פותחים את הפרויקט בטעות
    el.addEventListener('click', function (e) { e.stopPropagation(); });

    if (kind === 'real' && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        s.visible = en[0].isIntersecting;
        if (s.visible) { setSrc(s); show(s); kick(); }
      }, { rootMargin: '300px 0px' }).observe(el);
    } else if (kind === 'real') {
      s.visible = true; setSrc(s); show(s);
    }
    return s;
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var any = false;
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (!s.visible) continue;
      any = true;
      if (!s.drag) {
        var base = motion ? (s.hover ? 26 : 9) : 0;
        s.v += (base - s.v) * (1 - Math.exp(-dt * 2.4));
        s.f += s.v * dt;
      }
      show(s);
    }
    if (any) requestAnimationFrame(frame);
    else running = false;
  }
  function kick() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  document.querySelectorAll('.p-relic').forEach(function (el) {
    make(el, 'real', function () { return el.dataset.relic; });
  });

  // ההולוגרמה בסיפור הפרויקט: פעילה כל עוד הסיפור פתוח
  var caseSlot = document.querySelector('.case-relic');
  if (caseSlot && caseEl) {
    var cs = make(caseSlot, 'holo', function () { return caseEl.dataset.id; });
    var sync = function () {
      cs.visible = !caseEl.hidden;
      if (cs.visible) { setSrc(cs); show(cs); kick(); }
    };
    new MutationObserver(sync).observe(caseEl, { attributes: true, attributeFilter: ['hidden', 'data-id'] });
    sync();
  }

  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
})();
