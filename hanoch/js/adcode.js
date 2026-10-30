/* קוד מודעה בהודעת הוואטסאפ: כל מודעה מקבלת קוד קצר משלה (למשל M12), שמגיע בכתובת כ-utm_content.
   בלחיצה על וואטסאפ הקוד נוסף לסוף ההודעה ("קוד: M12", ובעמודים באנגלית "Code: M12"), כך שכל פנייה שמגיעה לוואטסאפ אומרת מאיזו מודעה היא באה,
   גם בלי עוגיות. הגולש רואה את הקוד בהודעה ויכול למחוק אותו לפני ששולח.
   בלי אישור עוגיות הקוד לא נשמר בדפדפן: הוא עובר לעמוד הבא באתר רק בכתובת (hgad=M12), כמו מזהה הקליק של גוגל.
   אחרי אישור הוא נזכר עד סגירת הלשונית.
   נטען לפני js/ga.js, כדי שהקוד כבר יהיה בקישור כשהלחיצה עוברת לדף המעבר /go/wa. */
(function () {
  'use strict';
  var KEY = 'hg-ad';
  // רק קוד קצר ונקי: אותיות באנגלית, ספרות, מקף וקו תחתון. ערך אחר (למשל שם מודעה ארוך עם רווחים) לא נכנס להודעה
  function clean(v) { v = String(v || '').trim().toUpperCase(); return /^[A-Z0-9_-]{1,24}$/.test(v) ? v : ''; }
  var q = new URLSearchParams(location.search);
  var here = clean(q.get('utm_content')) || clean(q.get('hgad'));

  function saved() { try { return clean(sessionStorage.getItem(KEY)); } catch (e) { return ''; } }
  function remember() { if (here) try { sessionStorage.setItem(KEY, here); } catch (e) { /* אחסון חסום */ } }
  if (window.hgConsent) window.hgConsent.onGrant(remember);

  function code() { return here || (window.hgConsent && window.hgConsent.analytics() ? saved() : ''); }

  // מוסיף את הקוד לטקסט של קישור וואטסאפ (פעם אחת בלבד)
  function tag(href) {
    var c = code();
    if (!c) return href;
    try {
      var u = new URL(href, location.href);
      if (!/^(wa\.me|api\.whatsapp\.com)$/.test(u.hostname)) return href;
      var text = u.searchParams.get('text') || '';
      if (/(קוד|Code): [A-Z0-9_-]+\s*$/.test(text)) return href;
      var label = document.documentElement.lang === 'en' ? 'Code: ' : 'קוד: ';
      u.searchParams.set('text', (text ? text.replace(/\s+$/, '') + '\n\n' : '') + label + c);
      // wa.me מבין רווח כ-%20 ולא כ-+
      return u.toString().replace(/\+/g, '%20');
    } catch (e) { return href; }
  }

  // בלי אישור עוגיות: הקוד עובר בכתובת של הקישור לעמוד הבא באתר. בלי עוגייה ובלי אחסון
  function carry(a) {
    if (!here || (window.hgConsent && window.hgConsent.analytics())) return;
    var u;
    try { u = new URL(a.href); } catch (e) { return; }
    if (u.origin !== location.origin || /^\/go\//.test(u.pathname) || (u.pathname === location.pathname && u.search === location.search)) return;
    if (u.searchParams.get('utm_content') || u.searchParams.get('hgad')) return;
    u.searchParams.set('hgad', here);
    a.href = u.href;
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (/wa\.me|api\.whatsapp\.com/.test(a.getAttribute('href') || '')) a.href = tag(a.href);
    else carry(a);
  }, true);

  window.hgAd = { code: code, tag: tag };
})();
