/* Google Analytics 4 ו-Google Ads של HG Studio, במצב ההסכמה המתקדם של Google (Consent Mode v2).
   לפני אישור בהודעת העוגיות (js/consent.js) לא נשמרות עוגיות: Google מקבלת רק אותות אנונימיים, כדי להעריך המרות מפרסום.
   אחרי לחיצה על "מאשר" נשמרות עוגיות והמדידה מלאה. התאמה אישית של פרסומות (רימרקטינג) כבויה תמיד.
   רץ רק ב-hgpro.io (לא בתצוגות מקדימות ולא בבדיקות), ונטען רק אחרי הפעולה הראשונה של הגולש או חמש שניות אחרי שהעמוד מוצג, כדי לא להאט את האתר.
   מה נמדד:
   - לחיצה על וואטסאפ, טלפון או מייל: whatsapp_click / phone_click / email_click. זו כוונה, עוד לא פנייה.
   - פנייה (generate_lead): רק כשפרטים נשמרו באמת במערכת הפניות, למשל בקשה לשיחה חוזרת או בריף עם טלפון (האירוע hg:lead).
   - צפייה בסרטונים, כניסה לאתרים של לקוחות, לחיצות על העבודות, שאלות נפוצות שנפתחות, ועד איפה בעמוד הגיעו (section_view).
   אירועי הבריף בדף הבית נשלחים מ-home.js, ובדפים האחרים מ-hanoch.js.
   Google Ads סופר פנייה לפי ביקור בדף המעבר /go/wa, בכלל שמוגדר בנכס של Google Analytics. לכן אין כאן תג המרה נפרד של Ads:
   תג כזה היה סופר כל לחיצה על וואטסאפ פעמיים. */
(function () {
  'use strict';
  var ID = 'G-YKRG71FB41';
  // תג Google נוסף מחשבון הפרסום (נוצר בגוגל אדס). מקבל את אותם צפיות ופניות, תחת אותה הסכמה
  var TAG2 = 'G-2D3GJNTP97';
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
  // סוג העמוד, כדי להשוות בדוחות בין דף הבית, דפי השירות, המאמרים והעבודות
  var path = location.pathname;
  var group = /^\/services\//.test(path) ? 'service' : /^\/blog\//.test(path) ? 'blog' : /^\/go\//.test(path) ? 'handoff'
    : /work|archive/.test(path) ? 'work' : /^\/(index\.html|en\.html)?$/.test(path) ? 'home' : 'other';
  gtag('config', ID, { content_group: group });
  if (TAG2) gtag('config', TAG2, { content_group: group });

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
  var GO = /^\/go\//.test(path);
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
        // בדף המעבר הלחיצה כבר נספרה בעמוד הקודם
        if (GO) return;
        var from = a.classList.contains('brief-wa') ? (a.getAttribute('data-form') || 'brief_form') : where(a);
        // נשלח במפורש לשני התגים, כדי שגם תג הפרסום יקבל אותו
        var to = TAG2 ? [ID, TAG2] : [ID];
        gtag('event', lead + '_click', { method: lead, link_location: from, cta_id: a.getAttribute('data-cta') || from, send_to: to });
        // וואטסאפ עובר דרך דף המעבר hgpro.io/go/wa, שגוגל אדס סופר כפנייה
        if (lead === 'whatsapp') {
          e.preventDefault();
          var go = '/go/wa?u=' + encodeURIComponent(a.href);
          // מזהה הקליק של המודעה (gclid / gbraid / wbraid / fbclid / _gl) עובר הלאה בכתובת, כדי לדעת איזו מודעה הביאה את הפנייה גם בלי עוגיות
          var q = new URLSearchParams(location.search);
          ['gclid', 'gbraid', 'wbraid', 'fbclid', '_gl', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { if (q.get(k)) go += '&' + k + '=' + encodeURIComponent(q.get(k)); });
          if (a.target === '_blank') window.open(go, '_blank', 'noopener'); else location.href = go;
        }
        return;
      }
      // עבודות בדף הבית: איזו עבודה מושכת, ואם נכנסים לסיפור או לאתר החי
      var pf = a.closest('.pf, .card');
      if (pf) {
        var nm = pf.querySelector('.pf-name, h3');
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
  // פנייה שנשמרה באמת במערכת הפניות (בקשה לשיחה חוזרת, בריף עם טלפון): זו הפנייה שסופרים
  document.addEventListener('hg:lead', function (e) {
    var m = (e.detail && e.detail.method) || 'form', to = TAG2 ? [ID, TAG2] : [ID];
    gtag('event', 'generate_lead', { method: m, form_id: m, lead_source: 'website', send_to: to });
  });
  // שאלה נפוצה שנפתחת: מה מעסיק את מי שעוד לא פנה (בדף הבית ובדפי השירות והמאמרים)
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d.tagName === 'DETAILS' && d.open && d.closest('.faq, .sv-faq')) { var h = d.querySelector('h3, summary'); gtag('event', 'faq_open', { question: h ? h.textContent.trim().slice(0, 90) : '' }); }
  }, true);
  // עד איפה בעמוד מגיעים: אירוע אחד לכל חלק בעמוד, בפעם הראשונה שהוא ממלא את חצי המסך העליון
  if ('IntersectionObserver' in window) {
    var seen = {};
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var id = en.target.id;
        if (!en.isIntersecting || !id || seen[id]) return;
        seen[id] = 1;
        so.unobserve(en.target);
        gtag('event', 'section_view', { section: id });
      });
    }, { rootMargin: '0px 0px -50% 0px' });
    var watch = function () { [].forEach.call(document.querySelectorAll('main > section[id]'), function (s) { so.observe(s); }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  }
  }
})();
