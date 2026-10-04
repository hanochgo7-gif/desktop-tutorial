/* Google Analytics 4 של HGPRO.
   רץ רק ב-hgpro.io (לא בתצוגות מקדימות ולא בבדיקות), ונטען רק אחרי שהעמוד מוצג, כדי לא להאט את האתר.
   מודד גם פניות: וואטסאפ, טלפון ומייל (כאירוע generate_lead), צפייה בסרטונים וכניסה לאתרים של לקוחות. */
(function () {
  'use strict';
  var ID = 'G-YKRG71FB41';
  if (!/(^|\.)hgpro\.io$/.test(location.hostname)) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', ID);

  var loaded = false;
  function load() {
    if (loaded) return; loaded = true;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
  }
  function later() { ('requestIdleCallback' in window) ? requestIdleCallback(load, { timeout: 3000 }) : setTimeout(load, 1500); }
  if (document.readyState === 'complete') later(); else addEventListener('load', later);
  ['pointerdown', 'keydown', 'scroll'].forEach(function (t) { addEventListener(t, load, { once: true, passive: true }); });

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
        gtag('event', lead + '_click', { link_location: from });
        gtag('event', 'generate_lead', { method: lead, link_location: from });
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
})();
