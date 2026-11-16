/* גלילה חלקה לעמודים הפנימיים (שירותים, מאמרים, גלריה), באותה תחושה של דף הבית:
   רק במחשב עם עכבר, לא למי שביקש פחות תנועה, וחלון פתוח עוצר את הגלילה מאחוריו. */
(function () {
  var d = document;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { reduce = reduce || !!JSON.parse(localStorage.getItem('hanoch-a11y') || '{}')['a11y-no-motion']; } catch (e) {}
  if (reduce || !matchMedia('(pointer: fine)').matches || !window.Lenis) return;
  var lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true,
    prevent: function (n) { return !!(n.closest && n.closest('.ht-panel, .ht-body, .a11y__panel, dialog, [data-lenis-prevent]')); } });
  (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
  addEventListener('load', function () { lenis.resize(); });
  d.addEventListener('load', function (e) { if (e.target.tagName === 'IMG') { clearTimeout(lenis._rz); lenis._rz = setTimeout(function () { lenis.resize(); }, 150); } }, true);
  new MutationObserver(function () { if (d.querySelector('dialog[open]')) lenis.stop(); else lenis.start(); })
    .observe(d.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  // קישורים בתוך העמוד (תוכן עניינים במאמר): נסיעה חלקה, ומשך לפי המרחק
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var el = d.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); if (!el) return;
    e.preventDefault();
    lenis.resize();
    var dist = Math.abs(el.getBoundingClientRect().top);
    lenis.scrollTo(el, { offset: -88, duration: Math.min(1.4, Math.max(.6, .45 + .35 * Math.log2(1 + dist / innerHeight))) });
    if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
  });
})();
