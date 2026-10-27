/* Google Analytics 4 ו-Google Ads של HG Studio, במצב ההסכמה המתקדם של Google (Consent Mode v2).
   לפני אישור בהודעת העוגיות (js/consent.js) לא נשמרות עוגיות: Google מקבלת רק אותות אנונימיים, כדי להעריך המרות מפרסום.
   אחרי לחיצה על "מאשר" נשמרות עוגיות והמדידה מלאה. התאמה אישית של פרסומות (רימרקטינג) כבויה תמיד.
   רץ רק ב-hgpro.io (לא בתצוגות מקדימות ולא בבדיקות), ונטען רק אחרי הפעולה הראשונה של הגולש או חמש שניות אחרי שהעמוד מוצג, כדי לא להאט את האתר.
   מודד גם פניות: וואטסאפ, טלפון ומייל (כאירוע generate_lead), צפייה בסרטונים, כניסה לאתרים של לקוחות,
   לחיצות על העבודות בדף הבית ושאלות נפוצות שנפתחות. אירועי הבריף והמחשבון נשלחים מ-hanoch.js. */
(function () {
  'use strict';
  var ID = 'G-YKRG71FB41';
  // תג Google נוסף מחשבון הפרסום (נוצר בגוגל אדס). מקבל את אותם צפיות ופניות, תחת אותה הסכמה
  var TAG2 = 'G-2D3GJNTP97';
  // Google Ads: מזהה ההמרה (AW-...) ותווית ההמרה של "פנייה" מחשבון Google Ads. ריקים = כבוי.
  // כשממלאים אותם, כל לחיצה על וואטסאפ, טלפון או מייל נרשמת גם כהמרה בקמפיין (רק אחרי אישור בהודעת העוגיות, כמו Analytics)
  var ADS = '';
  var ADS_LEAD = '';
  if (!/(^|\.)hgpro\.io$/.test(location.hostname)) return;
  // בלי מנגנון ההסכמה לא נטען בכלל
  if (!window.hgConsent) return;
  start();

  function start() {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  // ברירת המחדל: הכול חסום, בלי עוגיות. מזהה הקליק מהמודעה עובר בכתובת בין העמודים במקום בעוגייה
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 });
  gtag('set', 'url_passthrough', true);
  gtag('set', 'ads_data_redaction', true);
  window.hgConsent.onGrant(function () { gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted' }); });
  gtag('js', new Date());
  gtag('config', ID);
  if (TAG2) gtag('config', TAG2);
  if (ADS) gtag('config', ADS);

  var loaded = false;
  function load() {
    if (loaded) return; loaded = true;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
  }
  // הסקריפט של גוגל כבד (כ-180KB): נטען עם הפעולה הראשונה של הגולש (גלילה, מגע, מקלדת), ואם לא היתה כזו, חמש שניות אחרי שהעמוד נטען.
  // כל מה שנמדד לפני כן מחכה בתור (dataLayer) ונשלח ברגע שהסקריפט מגיע, כך שאף צפייה לא הולכת לאיבוד
  function later() { setTimeout(function () { ('requestIdleCallback' in window) ? requestIdleCallback(load, { timeout: 2000 }) : load(); }, 5000); }
  // בדף המעבר לוואטסאפ (/go/) התג נטען מיד, כדי שהצפייה תישלח לפני שהגולש עובר לוואטסאפ
  var GO = /^\/go\//.test(location.pathname);
  if (GO) load();
  else if (document.readyState === 'complete') later(); else addEventListener('load', later);
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) { addEventListener(t, load, { once: true, passive: true }); });

  // מאיזה חלק בעמוד הגיעה הלחיצה
  function where(el) {
    var sec = el.closest('[id], section, header, footer, nav, dialog');
    if (!sec) return 'page';
    return sec.id || sec.className.toString().split(' ')[0] || sec.tagName.toLowerCase();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : e.target.parentElement;
    if (!t) return;
    var a = t.closest('a[href]');
    if (a) {
      var href = a.getAttribute('href') || '';
      var lead = null;
      if (/wa\.me|api\.whatsapp\.com/.test(href)) lead = 'whatsapp';
      else if (/^tel:/.test(href)) lead = 'phone';
      else if (/^mailto:/.test(href)) lead = 'email';
      if (lead) {
        var from = a.classList.contains('brief-wa') ? 'brief_form' : where(a);
        // הפנייה נשלחת במפורש לשני התגים, כדי שגם תג הפרסום יקבל אותה (בלי send_to היא מגיעה רק לתג הראשון)
        var to = TAG2 ? [ID, TAG2] : [ID];
        gtag('event', lead + '_click', { link_location: from, send_to: to });
        gtag('event', 'generate_lead', { method: lead, link_location: from, send_to: to });
        // וואטסאפ עובר דרך דף המעבר hgpro.io/go/wa, שגוגל אדס סופר כפנייה
        if (lead === 'whatsapp' && !GO) {
          e.preventDefault();
          var go = '/go/wa?u=' + encodeURIComponent(a.href);
          // מזהה הקליק של המודעה (gclid / gbraid / wbraid / _gl) עובר הלאה בכתובת, כדי שגוגל אדס ידע איזו מודעה הביאה את הפנייה גם בלי עוגיות
          var q = new URLSearchParams(location.search);
          ['gclid', 'gbraid', 'wbraid', '_gl', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { if (q.get(k)) go += '&' + k + '=' + encodeURIComponent(q.get(k)); });
          if (a.target === '_blank') window.open(go, '_blank', 'noopener'); else location.href = go;
        }
        if (ADS && ADS_LEAD) gtag('event', 'conversion', { send_to: ADS + '/' + ADS_LEAD });
        return;
      }
      // עבודות בדף הבית: איזו עבודה מושכת, ואם נכנסים לסיפור או לאתר החי
      var pf = a.closest('.pf');
      if (pf) {
        var nm = pf.querySelector('.pf-name');
        gtag('event', 'proof_click', { project: nm ? nm.textContent.trim() : '', target: a.target === '_blank' ? 'live_site' : 'case_story' });
        if (a.target === '_blank') gtag('event', 'visit_client_site', { link_url: a.href });
        return;
      }
      if (a.classList.contains('p-live') || a.classList.contains('case-live')) {
        gtag('event', 'visit_client_site', { link_url: a.href });
        return;
      }
    }
    var v = t.closest('.tour-play, button[data-film], .film-play');
    if (v) {
      var fig = v.closest('figure');
      var name = (fig && fig.querySelector('figcaption b') && fig.querySelector('figcaption b').textContent.trim()) || v.getAttribute('data-film-label') || v.textContent.trim();
      gtag('event', 'video_play', { video_title: name.slice(0, 80) });
    }
  }, true);
  // פנייה שנשמרה מטופס באתר (למשל בקשה לשיחה חוזרת, js/callback.js)
  document.addEventListener('hg:lead', function (e) {
    var m = (e.detail && e.detail.method) || 'form', to = TAG2 ? [ID, TAG2] : [ID];
    gtag('event', 'generate_lead', { method: m, link_location: m + '_form', send_to: to });
    if (ADS && ADS_LEAD) gtag('event', 'conversion', { send_to: ADS + '/' + ADS_LEAD });
  });
  // שאלה נפוצה שנפתחת: מה מעסיק את מי שעוד לא פנה
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d.tagName === 'DETAILS' && d.open && d.closest('.faq')) { var h = d.querySelector('h3'); gtag('event', 'faq_open', { question: h ? h.textContent.trim().slice(0, 90) : '' }); }
  }, true);
  }
})();
