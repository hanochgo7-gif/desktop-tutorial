/* דף הבית: סרטונים שנטענים רק כשמגיעים אליהם, בדיקה חינמית ובריף מהיר שפותחים וואטסאפ עם הודעה מוכנה.
   ההודעה נפתחת דרך קישור אמיתי בעמוד (a.brief-wa), כדי ש-js/ga.js ימדוד אותה כפנייה ויעביר אותה דרך /go/wa. */
(function () {
  'use strict';
  var WA = 'https://wa.me/972545522053?text=';
  // פחות תנועה: לפי הגדרת המערכת או לפי "עצירת אנימציות" בתפריט הנגישות (הסקריפט בראש העמוד מסמן motion רק כשאין אף אחד מהם)
  var reduce = !document.documentElement.classList.contains('motion');

  // סרטונים: נטענים ומתנגנים רק כשהם על המסך, ונעצרים כשיוצאים ממנו. מי שביקש פחות תנועה רואה תמונה בלבד
  var vids = [].slice.call(document.querySelectorAll('.phone video, .cineframe video'));
  var small = matchMedia('(max-width: 700px)').matches;
  vids.forEach(function (v) { if (reduce) { v.removeAttribute('autoplay'); v.pause(); } });
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (v.dataset.src && !v.src) { v.src = (small && v.dataset.srcM) ? v.dataset.srcM : v.dataset.src; }
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else v.pause();
      });
    }, { rootMargin: '120px' });
    vids.forEach(function (v) { io.observe(v); });
  }

  // הסמלים של החבילות: הסרטון נטען ומתנגן רק כשהכרטיס על המסך, ומחליף את התמונה בהדרגה
  var arts = [].slice.call(document.querySelectorAll('.plan-art'));
  if (!reduce && 'IntersectionObserver' in window) {
    var aio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var box = e.target, v = box.querySelector('video');
        if (!v) return;
        if (e.isIntersecting) {
          if (v.dataset.src && !v.src) { v.src = v.dataset.src; v.addEventListener('playing', function () { box.classList.add('is-playing'); }, { once: true }); }
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else v.pause();
      });
    }, { threshold: .35 });
    arts.forEach(function (a) { aio.observe(a); });
  }

  // קישור וואטסאפ אחד בעמוד שדרכו נשלחות ההודעות מהטפסים. data-form אומר ל-js/ga.js מאיזה טופס הגיעה ההודעה
  var link = document.createElement('a');
  link.className = 'brief-wa'; link.target = '_blank'; link.rel = 'noopener'; link.hidden = true;
  document.body.appendChild(link);
  function send(text, form) { link.href = WA + encodeURIComponent(text); link.setAttribute('data-form', form); link.click(); }
  // מדידה ב-Analytics (js/ga.js מגדיר את gtag רק ב-hgpro.io): אילו שאלות נענו, בלי התשובות עצמן
  function track(n, p) { if (window.gtag) window.gtag('event', n, p); }

  var check = document.querySelector('.check-form');
  if (check) check.addEventListener('submit', function (e) {
    e.preventDefault();
    var url = (check.elements.url.value || '').trim();
    send(check.getAttribute('data-wa') + (url || '(אשלח את הכתובת כאן)'), 'check_form');
  });

  var brief = document.querySelector('.brief-form');
  if (brief) {
    var started = false, answered = {}, counted = false;
    brief.addEventListener('change', function (e) {
      if (!started) { started = true; track('brief_start', { form_id: 'home_brief' }); }
      var n = e.target.name;
      if (e.target.type === 'radio' && !answered[n]) { answered[n] = 1; track('brief_answer', { form_id: 'home_brief', field: n }); }
    });
    brief.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = brief.elements, parts = [];
      var biz = f.biz.value, need = f.need.value, when = f.when.value;
      var name = f.name ? f.name.value.trim() : '';
      track('brief_submit', { form_id: 'home_brief', has_phone: !!(f.phone && f.phone.value.trim()) });
      // ההודעה בשורות, בלי לוכסנים של זכר ונקבה
      if (biz) parts.push('העסק: ' + biz);
      if (need) parts.push('מה צריך: ' + need);
      if (when) parts.push('מתי: ' + when);
      send('היי חנוך, ' + (name ? 'אני ' + name + ', ' : '') + 'הגעתי מהאתר.' + (parts.length ? '\n' + parts.join('\n') : ' אשמח לשיחת היכרות.'), 'brief_form');
    });
    // בריף עם טלפון שנשמר במערכת הפניות (js/hgos.js) הוא פנייה, ונספר פעם אחת
    brief.addEventListener('hgos:sent', function (e) {
      if (counted || !e.detail.ok || e.detail.hp) return;
      counted = true;
      document.dispatchEvent(new CustomEvent('hg:lead', { detail: { method: 'brief_form' } }));
    });
  }
})();
