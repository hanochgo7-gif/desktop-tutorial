/* דף הבית (css/simple.css): עצירה של הדגמת הרנטגן בפתיחה (WCAG 2.2.2).
   ההדגמה עצמה היא אנימציית CSS אחת. כאן רק: כפתור עצירה, ועצירה אוטומטית כשהפתיחה מחוץ למסך או שהלשונית מוסתרת.
   בלי JS, או ב"הפחתת תנועה", אין תנועה בכלל: הטלפון מראה פריים אחד שבו רואים את שני האתרים. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, fig = d.querySelector('.hx-fig');
  if (!fig || !root.classList.contains('motion')) return;
  var btn = fig.querySelector('.hx-pause'), label = btn && btn.querySelector('span');
  var held = false, away = false;
  function sync() {
    fig.classList.toggle('is-paused', held || away || d.hidden);
    if (!btn) return;
    btn.setAttribute('aria-pressed', held ? 'true' : 'false');
    label.textContent = held ? 'הפעלת ההדגמה' : 'עצירת ההדגמה';
  }
  if (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () { held = !held; sync(); });
  }
  d.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { away = !es[es.length - 1].isIntersecting; sync(); }).observe(fig);
  // "עצירת אנימציות" בתפריט הנגישות עוצר מיד
  new MutationObserver(function () { if (root.classList.contains('a11y-no-motion')) { held = true; sync(); } }).observe(root, { attributes: true, attributeFilter: ['class'] });
  sync();
})();
