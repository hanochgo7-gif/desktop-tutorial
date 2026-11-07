/* דף הבית בגרסת פרימיום: חשיפה עדינה בגלילה, ותצוגת העבודות בפתיחה שמתחלפת לבד.
   ההחלפה עוצרת כשהעכבר על התצוגה, כשהיא מחוץ למסך, ולמי שביקש פחות תנועה. */
(function () {
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var items = document.querySelectorAll('.pm-reveal');
  if ('IntersectionObserver' in window && !still) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  var show = document.querySelector('.pm-show');
  if (!show) return;
  var big = show.querySelectorAll('.pm-screens img'), small = show.querySelectorAll('.pm-phone-in img');
  var num = show.querySelector('.pm-cap-n'), txt = show.querySelector('.pm-cap-t'), url = show.querySelector('.pm-url');
  var S = [
    ['AMS', 'אגרוף תאילנדי ואימון אישי', 'ams.hgpro.io'],
    ['בר ליפשיץ', 'שף פרטי · מצפה מתת', 'bar-lifschitz'],
    ['רותם גוטובסקי', 'קליניקה לקוסמטיקה טיפולית', 'rotem-gotovski'],
    ['ש. גוטובסקי', 'תשתיות דלק מאז 1972', 's-gotovski'],
    ['אלנביס', 'חנות שתייה וחטיפים עד הבית', 'allenbis']
  ];
  var i = 0, timer = 0, hover = false, seen = true;
  function go(n) {
    big[i].classList.remove('on'); small[i] && small[i].classList.remove('on');
    i = n % big.length;
    big[i].classList.add('on'); small[i] && small[i].classList.add('on');
    txt.classList.add('out');
    setTimeout(function () {
      txt.innerHTML = '<b>' + S[i][0] + '</b> · ' + S[i][1];
      num.textContent = '0' + (i + 1) + ' / 0' + big.length;
      url.textContent = S[i][2];
      txt.classList.remove('out');
    }, 380);
  }
  function tick() { clearTimeout(timer); timer = setTimeout(function () { if (!hover && seen && !document.hidden) go(i + 1); tick(); }, 4800); }
  if (still) return;
  show.addEventListener('mouseenter', function () { hover = true; });
  show.addEventListener('mouseleave', function () { hover = false; });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; }).observe(show);
  tick();
})();

/* סרטים: הפתיחה מנגנת קטעים מהסרטים, האריחים מתנגנים כשהם על המסך, ולחיצה פותחת את הסרט המלא */
(function () {
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saver = navigator.connection && navigator.connection.saveData;
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  var reel = document.querySelector('.pm-reel video');
  if (reel && !still && !saver) {
    reel.src = innerWidth > 900 ? reel.dataset.srcLg : reel.dataset.srcSm;
    reel.preload = 'auto';
    play(reel);
    document.addEventListener('visibilitychange', function () { document.hidden ? reel.pause() : play(reel); });
  }

  var tiles = document.querySelectorAll('.pm-film-btn video');
  if ('IntersectionObserver' in window && !still && !saver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; play(v); } else if (v.src) v.pause();
      });
    }, { threshold: 0.35 });
    tiles.forEach(function (v) { io.observe(v); });
  }

  var dlg = document.querySelector('.pm-lightbox');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var vid = dlg.querySelector('video'), ttl = dlg.querySelector('.pm-lb-t'), last = null;
  document.querySelectorAll('.pm-film-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      last = b;
      dlg.classList.toggle('is-v', b.dataset.v === 'v');
      ttl.textContent = b.dataset.title;
      vid.src = b.dataset.film;
      dlg.showModal();
      play(vid);
    });
  });
  function shut() { vid.pause(); vid.removeAttribute('src'); vid.load(); if (dlg.open) dlg.close(); }
  dlg.querySelector('.pm-lb-x').addEventListener('click', shut);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) shut(); });
  dlg.addEventListener('close', function () { vid.pause(); if (last) last.focus(); });
})();
