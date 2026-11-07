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
