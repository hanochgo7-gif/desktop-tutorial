/* בריף קצר בסוף דף הבית: נשמר כליד ב-HG OS (דרך hgos.js), ואחר כך מציע להמשיך בוואטסאפ עם תקציר מוכן */
(function () {
  var f = document.querySelector('.pm-brief');
  var dock = document.getElementById('dock'), contact = document.getElementById('contact');
  // סרגל הכפתורים התחתון בטלפון מוסתר כשאזור יצירת הקשר על המסך, כדי שלא יכסה את הטופס
  if (dock && contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { dock.classList.toggle('is-off', es[0].isIntersecting); }, { threshold: 0.08 }).observe(contact);
  }
  if (!f) return;
  var msg = f.querySelector('.pm-brief-msg'), btn = f.querySelector('button[type=submit]');
  function val(n) { var el = f.elements[n]; return el ? String(el.value || '').trim() : ''; }
  function picked(n) { return [].slice.call(f.querySelectorAll('input[name="' + n + '"]:checked')).map(function (i) { return i.value; }).join(', '); }
  function wa() {
    var t = 'היי חנוך, שלחתי בריף מהאתר. ' + (val('company') ? 'העסק: ' + val('company') + '. ' : '') + (picked('need') ? 'מה צריך: ' + picked('need') + '. ' : '');
    return 'https://wa.me/972545522053?text=' + encodeURIComponent(t);
  }
  // נרשם על window כדי לרוץ לפני hgos.js (שמאזין על document), וכך פנייה חסרה לא נשלחת
  window.addEventListener('submit', function (e) {
    if (e.target !== f) return;
    e.preventDefault();
    f.classList.remove('is-bad');
    var phone = val('phone').replace(/[^\d+]/g, ''), email = val('email');
    if (!val('name') || (phone.length < 9 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
      f.classList.add('is-bad');
      msg.textContent = 'חסר שם, וטלפון או מייל כדי שאוכל לחזור אליכם.';
      (val('name') ? f.elements.phone : f.elements.name).focus();
      e.stopPropagation();
      return;
    }
    btn.disabled = true; msg.textContent = 'שולח...';
    if (!window.HGOS) done({ detail: { ok: false } });
  }, true);
  function done(e) {
    btn.disabled = false;
    if (e.detail && e.detail.ok) {
      f.classList.add('is-sent');
      msg.innerHTML = 'תודה, הבריף אצלי. אחזור אליכם בהקדם. רוצים להמשיך כבר עכשיו? <a href="' + wa() + '" target="_blank" rel="noopener">להמשיך בוואטסאפ ←</a>';
      if (window.gtag) gtag('event', 'generate_lead', { form: 'brief' });
    } else {
      msg.innerHTML = 'משהו לא נשלח. אפשר לכתוב לי ישירות <a href="' + wa() + '" target="_blank" rel="noopener">בוואטסאפ</a> או להתקשר ל-<a href="tel:+972545522053" dir="ltr">054-5522053</a>.';
    }
  }
  f.addEventListener('hgos:sent', done);
})();
