/* דף הבית: סרטונים שנטענים רק כשמגיעים אליהם, בדיקה חינמית ובריף מהיר שפותחים וואטסאפ עם הודעה מוכנה.
   ההודעה נפתחת דרך קישור אמיתי בעמוד (a.brief-wa), כדי ש-js/ga.js ימדוד אותה כפנייה ויעביר אותה דרך /go/wa. */
(function () {
  'use strict';
  var WA = 'https://wa.me/972545522053?text=';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // סרטונים: נטענים ומתנגנים רק כשהם על המסך, ונעצרים כשיוצאים ממנו. מי שביקש פחות תנועה רואה תמונה בלבד
  var vids = [].slice.call(document.querySelectorAll('.phone video'));
  vids.forEach(function (v) { if (reduce) { v.removeAttribute('autoplay'); v.pause(); } });
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (v.dataset.src && !v.src) { v.src = v.dataset.src; }
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else v.pause();
      });
    }, { rootMargin: '120px' });
    vids.forEach(function (v) { io.observe(v); });
  }

  // קישור וואטסאפ אחד בעמוד שדרכו נשלחות ההודעות מהטפסים
  var link = document.createElement('a');
  link.className = 'brief-wa'; link.target = '_blank'; link.rel = 'noopener'; link.hidden = true;
  document.body.appendChild(link);
  function send(text) { link.href = WA + encodeURIComponent(text); link.click(); }

  var check = document.querySelector('.check-form');
  if (check) check.addEventListener('submit', function (e) {
    e.preventDefault();
    var url = (check.elements.url.value || '').trim();
    send(check.getAttribute('data-wa') + (url || '(אשלח את הכתובת כאן)'));
  });

  var brief = document.querySelector('.brief-form');
  if (brief) brief.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = brief.elements, parts = [];
    var biz = f.biz.value, need = f.need.value, when = f.when.value;
    if (biz) parts.push('יש לי ' + biz);
    if (need) parts.push('אני מחפש/ת ' + need);
    if (when) parts.push('לגבי זמנים: ' + when);
    send('היי חנוך, הגעתי מהאתר. ' + (parts.length ? parts.join(', ') + '.' : 'אשמח לשיחת היכרות.'));
  });
})();
