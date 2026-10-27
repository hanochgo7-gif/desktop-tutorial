/* פיקסל של Meta (פייסבוק ואינסטגרם) של HG Studio.
   נטען רק אחרי לחיצה על "מאשר עוגיות" בהודעת העוגיות (js/consent.js). בלי אישור לא נטען כלום ושום דבר לא נשלח ל-Meta.
   רץ רק ב-hgpro.io. מודד צפייה בעמוד (PageView), ופנייה (Lead) בטלפון, במייל ובוואטסאפ.
   לחיצה על וואטסאפ עוברת דרך דף המעבר /go/wa (ראו js/ga.js), ולכן הפנייה בוואטסאפ נספרת שם, עם קוד המודעה מההודעה. */
(function () {
  'use strict';
  // מזהה הפיקסל ממנהל האירועים של Meta (Events Manager), מספר של 15 או 16 ספרות. ריק = כבוי
  var PIXEL = '';
  if (!/^\d{10,20}$/.test(PIXEL)) return;
  if (!/(^|\.)hgpro\.io$/.test(location.hostname)) return;
  if (!window.hgConsent) return;
  var GO = /^\/go\/wa\/?$/.test(location.pathname);

  window.hgConsent.onGrant(function () {
    if (window.fbq) return;
    // התור של Meta: אירועים שנשלחים לפני שהסקריפט נטען מחכים בו ונשלחים כשהוא מגיע
    var q = window.fbq = function () { q.callMethod ? q.callMethod.apply(q, arguments) : q.queue.push(arguments); };
    if (!window._fbq) window._fbq = q;
    q.push = q; q.loaded = true; q.version = '2.0'; q.queue = [];
    var s = document.createElement('script');
    s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
    fbq('init', PIXEL);
    fbq('track', 'PageView');
    if (GO) {
      // קוד המודעה, אם נוסף להודעה (js/adcode.js)
      var text = '';
      try { text = new URL(new URLSearchParams(location.search).get('u') || '').searchParams.get('text') || ''; } catch (e) { /* כתובת לא תקינה */ }
      var m = /קוד: ([A-Z0-9_-]{1,24})\s*$/.exec(text);
      fbq('track', 'Lead', m ? { content_name: 'whatsapp', ad_code: m[1] } : { content_name: 'whatsapp' });
    }
  });

  if (GO) return;
  document.addEventListener('click', function (e) {
    if (!window.fbq || !window.hgConsent.analytics()) return;
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '', method = /^tel:/.test(href) ? 'phone' : /^mailto:/.test(href) ? 'email' : '';
    if (!method) return;
    var c = window.hgAd && window.hgAd.code();
    fbq('track', 'Lead', c ? { content_name: method, ad_code: c } : { content_name: method });
  }, true);
})();
