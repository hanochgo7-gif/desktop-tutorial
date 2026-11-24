/* מדידה: שכבת אירועים אחת לכל האתר.
   כל אירוע נדחף ל-window.dataLayer (ל-GTM או לבדיקה), ואם הוגדר GA_ID גם ל-GA4 במצב הסכמה מצומצם (בלי עוגיות עד הסכמה).
   אירועים: cta_click, whatsapp_click, phone_click, generate_lead, view_item, add_to_list, remove_from_list, list_send, search, filter, assistant_open, page_view. */
(function () {
  'use strict';
  var dl = window.dataLayer = window.dataLayer || [];
  var page = (document.body && document.body.dataset.page) || location.pathname.split('/').pop().replace('.html', '') || 'home';
  var sent = {};
  function track(name, params) {
    params = params || {}; params.page = page;
    var key = name + JSON.stringify(params); if (sent[key] && Date.now() - sent[key] < 800) return; sent[key] = Date.now();
    dl.push(Object.assign({ event: name }, params));
    if (window.gtag && window.GA_ID) window.gtag('event', name, params);
    if (window.TRACK_DEBUG) console.log('[track]', name, params);
  }
  window.track = track;

  // מקור התנועה (utm) נשמר להפעלה הנוכחית, כדי שיופיע בפנייה בוואטסאפ ולא ילך לאיבוד
  try {
    var q = new URLSearchParams(location.search), src = q.get('utm_source') || q.get('ref');
    if (src) sessionStorage.setItem('rotem-src', [src, q.get('utm_medium'), q.get('utm_campaign')].filter(Boolean).join('/'));
  } catch (e) {}
  function source() { try { return sessionStorage.getItem('rotem-src') || ''; } catch (e) { return ''; } }
  function context(el) {
    var sec = el.closest('section[id], [data-section]'); var id = sec ? (sec.dataset.section || sec.id) : '';
    return el.dataset.track || id || page;
  }
  // כל קישור וואטסאפ מקבל שורת מקור (עמוד, מקטע ו-utm) כדי שרותם תדע מאיפה הגיעה הפנייה
  function withSource(href, ctx) {
    try {
      var m = href.match(/^([^?]+)\?text=([^&]*)(.*)$/); var base = m ? m[1] : href, t = m ? decodeURIComponent(m[2].replace(/\+/g, ' ')) : '', rest = m ? m[3] : '';
      var tag = 'מהאתר: ' + (document.title.split('|')[0].trim()) + (ctx && ctx !== page ? ' / ' + ctx : '') + (source() ? ' / ' + source() : '');
      if (t.indexOf('מהאתר:') >= 0) return href;
      return base + '?text=' + encodeURIComponent((t ? t + '\n\n' : '') + tag) + rest;
    } catch (e) { return href; }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a, button'); if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/wa\.me|whatsapp/.test(href)) { var ctx = context(a); track('whatsapp_click', { context: ctx }); a.href = withSource(a.href, ctx); return; }
    if (href.indexOf('tel:') === 0) { track('phone_click', { context: context(a) }); return; }
    if (a.dataset.track) { track('cta_click', { label: a.dataset.track, context: context(a) }); return; }
    if (/#contact$/.test(href) || /\?goal=/.test(href)) { track('cta_click', { label: 'book', context: context(a) }); return; }
  }, true);
  track('page_view', { source: source() });

  // GA4, רק אם הוגדר מזהה. מצב הסכמה: בלי עוגיות עד שהגולשת מאשרת (הפעלה: window.gtag('consent','update',{analytics_storage:'granted'}))
  if (window.GA_ID) {
    window.gtag = window.gtag || function () { dl.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date()); window.gtag('config', window.GA_ID, { send_page_view: true, anonymize_ip: true });
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(window.GA_ID); document.head.appendChild(s);
  }
})();
