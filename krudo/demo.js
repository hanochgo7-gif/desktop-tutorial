/* קרודו הנדסה, הדמיה: עין הבודק בפתיחה, סיור הבדיקה בגלילה, בחירת מסלול, וטופס שנפתח בוואטסאפ */
(function () {
  'use strict';
  var WA = '972547560711';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // פתיחה: הדירה כמו שהקונה רואה אותה, ובלחיצה פס סריקה חושף את מה שהבודק רואה
  var heroFig = $('.hero-vis'), heroBox = $('#hero-stage'), eyeBtn = $('#eye-btn');
  var hero = KrudoScene.build(heroBox);
  hero.el.classList.add('hero-scene');
  var seen = false;
  eyeBtn.addEventListener('click', function () {
    if (seen) { $('#tour').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
    seen = true; eyeBtn.setAttribute('aria-pressed', 'true');
    hero.el.classList.add('scanning');
    // הממצאים נחשפים לפי המקום שלהם על המסך, כשהפס עובר עליהם
    var r = hero.el.getBoundingClientRect();
    var show = function () { hero.el.classList.add('eye'); heroFig.classList.add('seen'); hero.follow(400); };
    if (reduce) show(); else {
      $$('.k-x, .k-dot', hero.el).forEach(function (n) {
        var q = n.getBoundingClientRect(), x = r.right - (q.left + q.width / 2);
        n.style.transitionDelay = Math.max(0, Math.min(1, x / r.width)) * 1.2 + 's';
      });
      requestAnimationFrame(show);
      setTimeout(function () { $$('.k-x, .k-dot', hero.el).forEach(function (n) { n.style.transitionDelay = ''; }); }, 2000);
    }
  });

  // סיור: כל כרטיס שמגיע למרכז המסך מזיז את המצלמה לתחנה שלו
  var tour = KrudoScene.build($('#tour-stage'));
  tour.el.classList.add('tour');
  var steps = $$('.step'), count = $('.tour-count b');
  function activate(step) {
    steps.forEach(function (s) { s.classList.toggle('is-on', s === step); });
    tour.go(step.dataset.st);
    count.textContent = steps.indexOf(step) + 1;
  }
  activate(steps[0]);
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) activate(e.target); });
  }, { rootMargin: matchMedia('(min-width: 960px)').matches ? '-45% 0px -45% 0px' : '-62% 0px -24% 0px' });
  steps.forEach(function (s) { io.observe(s); });
  // לחיצה על סיכה בסיור קופצת לכרטיס שלה
  $$('.k-pin', tour.el).forEach(function (p) {
    p.addEventListener('click', function () { var s = $('.step[data-st="' + p.dataset.st + '"]'); if (s) s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
  });
  $$('.k-pin', hero.el).forEach(function (p) {
    p.addEventListener('click', function () { var s = $('.step[data-st="' + p.dataset.st + '"]'); if (s) s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
  });

  // מסלול: יד שנייה או דירה חדשה. מדגיש את התחנות שהכי חשובות לכם, ומתאים את ההודעה בוואטסאפ
  var NAMES = { used: 'דירה יד שנייה', new: 'דירה חדשה מקבלן' };
  var note = $('.path-note'), path = '';
  function setPath(p) {
    path = p || '';
    $$('.pick-b').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.path === path)); });
    $$('.path').forEach(function (a) { a.classList.toggle('is-picked', a.dataset.path === path); });
    steps.forEach(function (s) { s.classList.toggle('dim', !!path && s.dataset.for.split(' ').indexOf(path) < 0); });
    note.hidden = !path;
    if (path) note.firstElementChild.textContent = 'מודגש מה שהכי חשוב ב' + NAMES[path] + '.';
    var r = $('input[name=type][value="' + (path === 'used' ? 'יד שנייה' : path === 'new' ? 'דירה חדשה מקבלן' : '') + '"]');
    if (r) r.checked = true;
    dockLink();
  }
  $$('.pick-b').forEach(function (b) {
    b.addEventListener('click', function () { setPath(b.dataset.path); $('#tour').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
  });
  $('.path-note .linkbtn').addEventListener('click', function () { setPath(''); });
  $$('.path .btn').forEach(function (a) {
    a.addEventListener('click', function () { var r = $('input[name=type][value="' + a.dataset.type + '"]'); if (r) r.checked = true; });
  });

  function waUrl(text) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text); }
  function dockLink() {
    $('#dock-wa').href = waUrl('היי רביד, הגעתי מהאתר. אשמח לתאם בדק בית' + (path ? ' ל' + NAMES[path] : '') + '.');
  }
  dockLink();

  // הטופס: ארבעה פרטים, נפתחים כהודעה מוכנה בוואטסאפ
  var form = $('#form'), err = $('.form-err');
  form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid')) { e.target.removeAttribute('aria-invalid'); err.textContent = ''; } });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements, name = f.name.value.trim(), phone = f.phone.value.trim();
    if (!name) { f.name.setAttribute('aria-invalid', 'true'); err.textContent = 'איך לפנות אליכם? כתבו שם.'; f.name.focus(); return; }
    if (phone.replace(/\D/g, '').length < 9) { f.phone.setAttribute('aria-invalid', 'true'); err.textContent = 'צריך מספר טלפון מלא.'; f.phone.focus(); return; }
    var type = (form.querySelector('input[name=type]:checked') || {}).value;
    var text = 'היי רביד, הגעתי מהאתר ואשמח לתאם בדק בית.\nשם: ' + name + '\nטלפון: ' + phone + (f.where.value.trim() ? '\nהנכס: ' + f.where.value.trim() : '') + (type ? '\nסוג הבדיקה: ' + type : '');
    window.open(waUrl(text), '_blank', 'noopener');
  });

  // בטלפון הסרגל התחתון יורד כשהטופס על המסך
  var dock = $('#dock');
  new IntersectionObserver(function (es) { dock.classList.toggle('away', es[0].isIntersecting); }, { threshold: .15 }).observe($('#contact'));
})();
