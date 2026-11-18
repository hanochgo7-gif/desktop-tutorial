/* הכותרת העליונה (tools/header.py) בכל העמודים: רקע שחור אחרי שמתחילים לגלול,
   ותפריט בטלפון שנסגר בלחיצה בחוץ, ב-Escape או במעבר לקישור בתוך העמוד. */
(function () {
  'use strict';
  var d = document, top = d.querySelector('.top');
  if (!top) return;
  var ticking = false;
  function update() { ticking = false; top.classList.toggle('is-scrolled', window.scrollY > 8); }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  var menu = top.querySelector('.menu');
  if (!menu) return;
  function sync() { d.documentElement.classList.toggle('menu-open', menu.open); }
  menu.addEventListener('toggle', sync);
  d.addEventListener('click', function (e) {
    if (!menu.open) return;
    if (!menu.contains(e.target)) { menu.open = false; return; }
    if (e.target.closest('.menu-sheet a')) menu.open = false;
  });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
})();
