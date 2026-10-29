/*
 * HG OS website connector. Sends inquiries from your site's forms to HG OS as new leads, with the source
 * they came from (UTM, Google/Meta click id, referring site). It does not change how your forms behave:
 * the form still does what it did (WhatsApp, email), and the lead is sent alongside, in the background.
 *
 * Install, once per page (before </body>):
 *   <script src="https://hanochgo7-gif.github.io/desktop-tutorial/crm/embed/hgos.js" data-token="YOUR_TOKEN" defer></script>
 *
 * Then either mark a form:  <form data-hgos="בקשת הצעת מחיר"> ... <input name="name"> <input name="phone"> ...
 *   (fields named name / phone / email / company / message are the lead's details; any other field is kept as an answer)
 * or call it from your own code:  HGOS.send({ name, phone, email, message, form: 'בריף', fields: [['מה העסק?', 'קליניקה'], ...] })
 *   A call-back request adds callback_at (ISO time) and callback_label: the follow-up task in HG OS is then due at that time.
 *
 * Privacy: the campaign that brought the visitor (UTM, click id, referring site) is kept in this browser
 * (localStorage "hgos_touch") for 90 days, only to credit the right source. Nothing is sent until they submit
 * a form. Add data-consent="hg" to store and send it only after cookie consent (sites using window.hgConsent):
 * without consent an inquiry carries only its own details and the page address without its query string.
 *
 * A marked form is saved only when it holds a phone or an email (a name alone cannot be answered).
 * After each attempt the form fires a bubbling "hgos:sent" event with detail { ok, form, hp }.
 */
(function () {
  'use strict';
  var script = document.currentScript || document.querySelector('script[data-token][src*="hgos.js"]');
  var TOKEN = script && script.getAttribute('data-token');
  var API = (script && script.getAttribute('data-api')) || 'https://ewddzunakbaxtonysgrd.supabase.co';
  var KEY = 'sb_publishable_gQV6w1bIQz5-84ZhsBrG9Q_gkKi341s'; // public key; the server accepts only the intake call
  var STORE = 'hgos_touch';
  var DAYS = 90;
  var PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid'];

  function read() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) { /* private mode */ } }

  // how the visitor arrived on this page: UTM / click id / outside referrer
  var here = (function () {
    var q = new URLSearchParams(location.search);
    var t = {};
    PARAMS.forEach(function (k) { var v = q.get(k); if (v) t[k] = v.slice(0, 300); });
    var ref = document.referrer && document.referrer.indexOf(location.origin) !== 0 ? document.referrer : '';
    t.landing_page = location.href.split('#')[0].slice(0, 500);
    t.referrer = ref.slice(0, 500);
    t.at = Date.now();
    return t;
  })();
  var isCampaign = function (t) { return PARAMS.some(function (k) { return t[k]; }) || !!t.referrer; };

  // remember it across pages for 90 days: the latest campaign visit is kept, a later plain visit never replaces it.
  // With data-consent="hg" this is stored only after the visitor approves cookies on the site (window.hgConsent);
  // until then only the current page's details go with an inquiry, and nothing is stored.
  function capture() {
    var saved = read();
    if (saved && Date.now() - saved.at > DAYS * 864e5) saved = null;
    if (!saved || isCampaign(here)) write(here);
  }
  var needsConsent = script && script.getAttribute('data-consent') === 'hg';
  if (!needsConsent) capture();
  else if (window.hgConsent) window.hgConsent.onGrant(capture);
  else document.addEventListener('DOMContentLoaded', function () { if (window.hgConsent) window.hgConsent.onGrant(capture); });

  // with data-consent="hg", the campaign goes with an inquiry only after cookie consent
  function mayAttribute() { return !needsConsent || !!(window.hgConsent && window.hgConsent.analytics()); }

  function send(lead) {
    if (!TOKEN) { console.warn('HG OS: missing data-token on the script tag'); return Promise.resolve({ ok: false }); }
    var attribute = mayAttribute();
    var saved = read();
    var t = isCampaign(here) || !saved ? here : saved;
    var page = location.href.split('#')[0];
    var body = { form: lead.form, name: lead.name, phone: lead.phone, email: lead.email, company: lead.company, message: lead.message,
      fields: lead.fields || {}, consent: !!lead.consent, consent_text: lead.consent_text, hp: lead.hp,
      page: attribute ? page : page.split('?')[0],
      callback_at: lead.callback_at, callback_label: lead.callback_label };
    if (attribute) PARAMS.concat(['landing_page', 'referrer']).forEach(function (k) { if (t[k]) body[k] = t[k]; });
    var req = function (keepalive) {
      return fetch(API + '/rest/v1/rpc/crm_web_lead', {
        method: 'POST', keepalive: keepalive,
        headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY },
        body: JSON.stringify({ p_token: TOKEN, p: body }),
      });
    };
    // keepalive lets the request finish even if the form then opens WhatsApp or another page;
    // some browsers refuse it for this kind of request, so try again without it.
    // A reply of { ok: false } counts as not saved, even with HTTP 200
    return req(true).catch(function () { return req(false); })
      .then(function (r) {
        if (!r.ok) return { ok: false };
        return r.json().then(function (j) { return { ok: !(j && j.ok === false) }; }, function () { return { ok: true }; });
      }).catch(function () { return { ok: false }; });
  }

  function fromForm(form) {
    var lead = { form: form.getAttribute('data-hgos') || form.getAttribute('name') || form.id || document.title, fields: [] };
    var first = '', last = '';
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled || el.type === 'password' || el.type === 'file' || el.type === 'submit' || el.name.charAt(0) === '_') return;
      if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
      var v = String(el.value || '').trim();
      if (!v) return;
      var n = el.name.toLowerCase();
      if (n === 'hgos_hp') lead.hp = v;
      else if (n === 'name' || n === 'full_name') lead.name = v;
      else if (n === 'first_name') first = v;
      else if (n === 'last_name') last = v;
      else if (n === 'phone' || n === 'tel' || el.type === 'tel') lead.phone = v;
      else if (n === 'email' || el.type === 'email') lead.email = v;
      else if (n === 'company') lead.company = v;
      else if (n === 'message' || n === 'msg' || el.tagName === 'TEXTAREA') lead.message = v;
      else if (n === 'consent') { lead.consent = true; lead.consent_text = (el.closest('label') || {}).textContent; }
      else {
        // the question: a choice's legend, otherwise the field's own label, otherwise its name
        var legend = el.closest('fieldset') && el.closest('fieldset').querySelector('legend');
        var own = el.labels && el.labels[0] && el.labels[0].textContent;
        var label = ((el.type === 'radio' || el.type === 'checkbox') && legend ? legend.textContent : own || (legend && legend.textContent)) || el.name;
        lead.fields.push([label.trim().slice(0, 60), v.slice(0, 300)]); // a list keeps the order of the form
      }
    });
    if (!lead.name && (first || last)) lead.name = (first + ' ' + last).trim();
    return lead;
  }

  document.addEventListener('submit', function (e) {
    var form = e.target.closest && e.target.closest('form[data-hgos]');
    if (!form) return;
    var lead = fromForm(form);
    if (!lead.phone && !lead.email) return;
    send(lead).then(function (r) {
      form.dispatchEvent(new CustomEvent('hgos:sent', { bubbles: true, detail: { ok: r.ok, form: lead.form, hp: !!lead.hp } }));
    });
  }, true);

  window.HGOS = { send: send, touch: read };
})();
