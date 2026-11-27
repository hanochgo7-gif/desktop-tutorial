/* גלילה חלקה לעמודים הפנימיים (שירותים, מאמרים, גלריה), באותה תחושה של דף הבית:
   רק במחשב עם עכבר, לא למי שביקש פחות תנועה, וחלון פתוח עוצר את הגלילה מאחוריו. */
(function () {
  var d = document;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { reduce = reduce || !!JSON.parse(localStorage.getItem('hanoch-a11y') || '{}')['a11y-no-motion']; } catch (e) {}
  if (reduce || !matchMedia('(pointer: fine)').matches || !window.Lenis) return;
  var lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true,
    prevent: function (n) { return !!(n.closest && n.closest('.ht-panel, .ht-body, .a11y__panel, dialog, [data-lenis-prevent]')); } });
  // חשוף לסקריפטים אחרים שצריכים קפיצה מדויקת בגלילה
  window.hgLenis = lenis;
  (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
  addEventListener('load', function () { lenis.resize(); });
  d.addEventListener('load', function (e) { if (e.target.tagName === 'IMG') { clearTimeout(lenis._rz); lenis._rz = setTimeout(function () { lenis.resize(); }, 150); } }, true);
  new MutationObserver(function () { if (d.querySelector('dialog[open]')) lenis.stop(); else lenis.start(); })
    .observe(d.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  // מקלדת: מה שמקבל מיקוד בטאב נגלל אל המסך גם כשהגלילה החלקה פעילה (אחרי פריים)
  d.addEventListener('focusin', function (e) {
    var t = e.target; if (!t || !t.getBoundingClientRect || t === d.body) return;
    requestAnimationFrame(function () {
      var r = t.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.top < 84 || r.bottom > innerHeight - 24) lenis.scrollTo(Math.max(0, scrollY + r.top - innerHeight * .35), { immediate: true, force: true });
    });
  });
  // קישורים בתוך העמוד (תוכן עניינים במאמר): נסיעה חלקה, ומשך לפי המרחק
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var el = d.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); if (!el) return;
    e.preventDefault();
    lenis.resize();
    var dist = Math.abs(el.getBoundingClientRect().top);
    var off = el.hasAttribute('data-scroll-offset') ? -(+el.getAttribute('data-scroll-offset') || 0) : -88;
    lenis.scrollTo(el, { offset: off, duration: Math.min(1.4, Math.max(.6, .45 + .35 * Math.log2(1 + dist / innerHeight))) });
    if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
    // המיקוד עובר ליעד, כמו בקישור רגיל: "דילוג לתוכן" ותוכן העניינים עובדים גם במקלדת ובקורא מסך (ממצא R-10 בביקורת)
    if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  });
})();

/* רשימת הסצנות בעמודי השירות (.sv-aside): הסצנה שעל המסך מסומנת בפס הטאלי, עם aria-current */
(function () {
  var links = [].slice.call(document.querySelectorAll('.sv-aside a[href^="#"]'));
  if (!links.length || !('IntersectionObserver' in window)) return;
  var map = new Map();
  links.forEach(function (a) { var h = document.getElementById(a.getAttribute('href').slice(1)); if (h) map.set(h, a); });
  var on = null;
  function set(a) {
    if (a === on) return;
    if (on) on.removeAttribute('aria-current');
    on = a; if (a) a.setAttribute('aria-current', 'true');
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) set(map.get(e.target)); });
  }, { rootMargin: '-20% 0px -65% 0px' });
  map.forEach(function (a, h) { io.observe(h); });
})();
