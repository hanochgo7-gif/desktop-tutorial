/* "שאחזור אליכם בשעה שנוחה לכם?": חלון קטן עם שם, טלפון, יום ושעה.
   הבקשה נכנסת ל-HG OS כליד (js/hgos.js), עם המודעה שהביאה את הגולש, ומשימת החזרה שם נקבעת לשעה שבחרו.
   כל כפתור עם data-callback פותח את החלון. הכפתורים מוסתרים (hidden) עד שהקובץ נטען, כדי שבלי JavaScript לא יופיע כפתור שלא עושה כלום.
   אם השמירה נכשלת, החלון מציע לשלוח את אותה בקשה בוואטסאפ, כדי שאף פנייה לא תלך לאיבוד. */
(function () {
  'use strict';
  var PHONE = '054-5522053', WA = 'https://wa.me/972545522053?text=';
  // השעות שבהן אני חוזר לפניות, לפי שעון ישראל. יום שישי רק בבוקר, ובשבת לא
  var SLOTS = [['בבוקר', 9, 12], ['בצהריים', 12, 15], ['אחר הצהריים', 15, 18], ['בערב', 18, 20]];
  var FRIDAY = [['בבוקר', 9, 12]];
  var DAYS_AHEAD = 5;
  var DAY = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var TZ = 'Asia/Jerusalem';

  // התאריך והשעה עכשיו בישראל, גם כשהמחשב של הגולש בחו"ל
  function israelNow() {
    var o = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour + (+o.minute) / 60 };
  }
  // ההפרש של שעון ישראל מ-UTC באותו יום (+02:00 בחורף, +03:00 בקיץ)
  function offset(y, m, d) {
    try {
      var name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' }).formatToParts(new Date(Date.UTC(y, m - 1, d, 12)))
        .filter(function (p) { return p.type === 'timeZoneName'; })[0].value;
      var m2 = /([+-]\d{2}):?(\d{2})/.exec(name);
      return m2 ? m2[1] + ':' + m2[2] : '+02:00';
    } catch (e) { return '+02:00'; }
  }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var hh = function (h) { return pad(h) + ':00'; };

  // הימים הקרובים שיש בהם עוד חלון פנוי (היום רק אם נשארה לפחות שעה עד סוף חלון)
  function days() {
    var now = israelNow(), out = [];
    var base = Date.UTC(now.y, now.m - 1, now.d);
    for (var i = 0; out.length < DAYS_AHEAD && i < 10; i++) {
      var dt = new Date(base + i * 864e5), wd = dt.getUTCDay();
      var slots = wd === 6 ? [] : wd === 5 ? FRIDAY : SLOTS;
      if (i === 0) slots = slots.filter(function (s) { return s[2] - now.h >= 1; });
      if (!slots.length) continue;
      var y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
      out.push({ key: y + '-' + pad(m) + '-' + pad(d), y: y, m: m, d: d, today: i === 0, slots: slots,
        name: i === 0 ? 'היום' : i === 1 ? 'מחר' : 'יום ' + DAY[wd], date: d + '.' + m, wd: wd });
    }
    return out;
  }

  var CSS =
    '.cb{margin:auto;width:min(480px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;overflow-x:hidden;overscroll-behavior:contain;padding:0;border-radius:22px;border:1px solid rgba(237,232,222,.16);' +
    'background:#121214;color:#ede8de;font:inherit;font-size:1rem;line-height:1.55;box-shadow:0 30px 80px rgba(0,0,0,.6)}' +
    '.cb::backdrop{background:rgba(5,5,6,.72);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}' +
    'html:has(.cb[open]){overflow:hidden}' +
    '@media (prefers-reduced-motion:no-preference){.cb[open]{animation:cb-in .2s cubic-bezier(.22,1,.36,1)}.cb[open]::backdrop{animation:cb-fade .2s ease}}' +
    '@keyframes cb-in{from{opacity:0;transform:scale(.97)}}@keyframes cb-fade{from{opacity:0}}' +
    '.cb form,.cb .cb-done{padding:22px 22px 20px}' +
    '.cb h2{margin:0 0 .35rem;font-size:1.35rem;line-height:1.25;font-weight:800;padding-inline-end:44px;text-wrap:balance}' +
    '.cb .cb-sub{margin:0 0 1.1rem;color:rgba(237,232,222,.7);font-size:.95rem;text-wrap:pretty}.cb .cb-num{white-space:nowrap}' +
    '.cb-x{position:absolute;top:12px;inset-inline-end:12px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(237,232,222,.28);background:transparent;color:inherit;font-size:1.4rem;line-height:1;cursor:pointer}' +
    '.cb-x:hover{background:rgba(237,232,222,.1)}' +
    '.cb-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1rem}' +
    '.cb-field{display:grid;gap:.3rem;font-size:.9rem;color:rgba(237,232,222,.75)}' +
    '.cb input[type=text],.cb input[type=tel]{width:100%;box-sizing:border-box;min-height:50px;padding:.6rem .9rem;border-radius:14px;border:1.5px solid rgba(237,232,222,.28);background:#0a0a0b;color:#ede8de;font:inherit;font-size:1rem}' +
    '.cb input[type=tel]{text-align:right}' +
    '.cb input[aria-invalid=true]{border-color:#ff7a52}' +
    '.cb fieldset{border:0;margin:0 0 .9rem;padding:0;min-width:0}' +
    '.cb legend{font-weight:700;margin-bottom:.5rem;padding:0}' +
    '.cb-chips{display:flex;flex-wrap:wrap;gap:8px}' +
    '.cb-chips label{position:relative}' +
    '.cb-chips input{position:absolute;opacity:0;pointer-events:none}' +
    '.cb-chips span{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;min-height:48px;padding:.4rem .95rem;border-radius:99px;border:1.5px solid rgba(237,232,222,.28);cursor:pointer;font-size:.95rem;line-height:1.2;transition:background .15s,border-color .15s}' +
    '.cb-chips small{font-size:.75rem;opacity:.7}' +
    '.cb-chips input:checked+span{background:#ede8de;color:#0a0a0b;border-color:#ede8de;font-weight:600}' +
    '.cb-chips input:focus-visible+span,.cb button:focus-visible,.cb a:focus-visible,.cb input:focus-visible{outline:3px solid #ff4f1a;outline-offset:3px}' +
    '.cb-go{width:100%;min-height:52px;margin-top:.4rem;border:0;border-radius:99px;background:#ff4f1a;color:#0a0a0b;font:inherit;font-weight:700;font-size:1.05rem;cursor:pointer;transition:transform 140ms cubic-bezier(.22,1,.36,1),background-color 180ms ease}' +
    '.cb-go:active{transform:scale(.97)}@media (hover:hover) and (pointer:fine){.cb-go:hover{background:#ff6a3d}}' +
    '.cb-go[disabled]{opacity:.6;cursor:wait}' +
    '.cb-err{margin:-.4rem 0 .9rem;color:#ff9b7d;font-size:.9rem}.cb-err:empty{display:none}' +
    '.cb-note{margin:.7rem 0 0;color:rgba(237,232,222,.6);font-size:.82rem}' +
    '.cb a{color:#ede8de;text-underline-offset:3px}' +
    '.cb-wa{display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin-top:.8rem;padding:.6rem 1.3rem;border-radius:99px;background:#25d366;color:#06301a!important;font-weight:700;text-decoration:none}' +
    '.cb-done p{margin:.4rem 0 0;color:rgba(237,232,222,.8)}' +
    '.cb-done .cb-go{margin-top:1.2rem}' +
    '.cb .hp{position:absolute;inset-inline-start:0;top:0;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);opacity:0;pointer-events:none}' +
    '.cb-line{display:block;margin-top:.35rem}' +
    '.cb-link{background:none;border:0;padding:.5em 0;margin:-.5em 0;font:inherit;color:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}' +
    '@media (max-width:420px){.cb-row{grid-template-columns:1fr}.cb form,.cb .cb-done{padding:18px 16px 16px}}';

  var dlg, form, err, chosen;
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build() {
    dlg = el('<dialog class="cb" aria-labelledby="cb-h" data-lenis-prevent></dialog>');
    dlg.innerHTML =
      '<button type="button" class="cb-x" aria-label="סגירה">×</button>' +
      '<form novalidate>' +
        '<h2 id="cb-h">שאחזור אליכם בשעה שנוחה לכם?</h2>' +
        '<p class="cb-sub">השאירו שם וטלפון ובחרו מתי נוח לכם. אתקשר בעצמי מהמספר <span class="cb-num" dir="ltr">' + PHONE + '</span>, בלי התחייבות.</p>' +
        '<div class="cb-row">' +
          '<label class="cb-field">שם<input type="text" name="name" autocomplete="name" maxlength="80" required aria-describedby="cb-err"></label>' +
          '<label class="cb-field">טלפון<input type="tel" name="phone" inputmode="tel" autocomplete="tel" dir="ltr" maxlength="20" required aria-describedby="cb-err"></label>' +
        '</div>' +
        '<p class="cb-err" id="cb-err" role="alert"></p>' +
        '<fieldset><legend>באיזה יום?</legend><div class="cb-chips" data-days></div></fieldset>' +
        '<fieldset data-times-box><legend>באיזו שעה?</legend><div class="cb-chips" data-times></div></fieldset>' +
        '<label class="cb-field" style="margin-bottom:.4rem">על מה נדבר? (לא חובה)<input type="text" name="message" maxlength="200" placeholder="למשל: אתר לקליניקה"></label>' +
        '<input class="hp" type="text" name="hgos_hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<button class="cb-go" type="submit">לקבוע שיחה חוזרת</button>' +
        '<p class="cb-note">השם והטלפון נשמרים במערכת הפניות שלי רק כדי שאחזור אליכם. <a href="/privacy.html#crm">פרטיות</a></p>' +
      '</form>';
    form = dlg.querySelector('form'); err = dlg.querySelector('.cb-err');
    dlg.querySelector('.cb-x').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    form.addEventListener('change', function (e) { if (e.target.name === 'day') times(); });
    form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid')) { e.target.removeAttribute('aria-invalid'); err.textContent = ''; } });
    form.addEventListener('submit', submit);
    document.body.appendChild(dlg);
  }

  // ימים: "בהקדם" ועוד הימים הקרובים. אחרי בחירת יום מופיעות השעות שלו
  var list = [];
  function fill() {
    list = days();
    var html = '<label><input type="radio" name="day" value="asap" checked><span>בהקדם</span></label>';
    list.forEach(function (d) { html += '<label><input type="radio" name="day" value="' + d.key + '"><span>' + d.name + (d.today ? '' : '<small>' + d.date + '</small>') + '</span></label>'; });
    dlg.querySelector('[data-days]').innerHTML = html;
    times();
  }
  function times() {
    var key = form.elements.day.value, d = list.filter(function (x) { return x.key === key; })[0];
    var box = dlg.querySelector('[data-times-box]');
    box.hidden = !d;
    if (!d) return;
    dlg.querySelector('[data-times]').innerHTML = d.slots.map(function (s, i) {
      return '<label><input type="radio" name="time" value="' + i + '"' + (i === 0 ? ' checked' : '') + '><span>' + s[0] + '<small dir="ltr">' + hh(s[1]) + '-' + hh(s[2]) + '</small></span></label>';
    }).join('');
  }

  // מה נבחר: זמן החזרה (ISO בשעון ישראל) ותיאור קריא
  function when() {
    var key = form.elements.day.value, d = list.filter(function (x) { return x.key === key; })[0];
    var si = +(form.elements.time && form.elements.time.value) || 0;
    if (!d) {
      // "בהקדם": בתוך שעות החזרה זה באמת בהקדם. בערב, בלילה ובשבת זה החלון הקרוב, כדי שהאישור יגיד מתי ושהמשימה ב-HG OS תקבל מועד
      // נבדק מול החלונות המלאים של היום: גם בשעה האחרונה של חלון (שכבר לא מוצעת לבחירה) מתקשרים בהקדם
      var n0 = israelNow(), nh = n0.h, first = list[0], wd0 = new Date(Date.UTC(n0.y, n0.m - 1, n0.d)).getUTCDay();
      var todayAll = wd0 === 6 ? [] : wd0 === 5 ? FRIDAY : SLOTS;
      if (!first || todayAll.some(function (x) { return nh >= x[1] && nh < x[2]; })) return { label: 'בהקדם האפשרי' };
      d = first; si = 0;
    }
    var s = d.slots[si];
    var now = israelNow(), start = s[1];
    // היום, כשהחלון כבר התחיל: מתקשרים בעוד רבע שעה
    var at = d.today && now.h > start ? new Date(Date.now() + 15 * 6e4).toISOString()
      : d.key + 'T' + hh(start) + ':00' + offset(d.y, d.m, d.d);
    var day = d.today ? 'היום' : d.name === 'מחר' ? 'מחר (' + d.date + ')' : 'ביום ' + DAY[d.wd] + ' ' + d.date;
    return { at: at, label: day + ', ' + s[0] + ' (בין ' + hh(s[1]) + ' ל-' + hh(s[2]) + ')' };
  }

  // מדידה ב-Analytics (js/ga.js מגדיר את gtag רק ב-hgpro.io): פתיחת החלון ושדה שנתקעו בו, בלי התוכן שנכתב
  function track(n, p) { if (window.gtag) window.gtag('event', n, p); }
  function bad(input, msg) { input.setAttribute('aria-invalid', 'true'); err.textContent = msg; input.focus(); track('callback_error', { field: input.name }); return false; }
  function valid() {
    var f = form.elements;
    [f.name, f.phone].forEach(function (i) { i.removeAttribute('aria-invalid'); });
    err.textContent = '';
    if (!f.name.value.trim()) return bad(f.name, 'איך לפנות אליכם? כתבו שם.');
    var digits = f.phone.value.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 15) return bad(f.phone, 'צריך מספר טלפון מלא, למשל 050-1234567.');
    return true;
  }

  function submit(e) {
    e.preventDefault();
    if (!valid()) return;
    var f = form.elements, w = when(), btn = form.querySelector('.cb-go');
    chosen = { name: f.name.value.trim(), phone: f.phone.value.trim(), message: f.message.value.trim(), when: w };
    var lead = { form: 'בקשה לשיחה חוזרת', name: chosen.name, phone: chosen.phone, message: chosen.message || undefined, hp: f.hgos_hp.value,
      callback_at: w.at, callback_label: w.label, fields: [['מתי נוח לחזור', w.label]] };
    if (!window.HGOS) return failed();
    btn.disabled = true; btn.textContent = 'שומר…';
    window.HGOS.send(lead).then(function (r) {
      btn.disabled = false; btn.textContent = 'לקבוע שיחה חוזרת';
      if (!r || !r.ok) return failed();
      done();
      // שדה המלכודת מלא רק אצל בוטים: השרת מתעלם מהם, וגם המדידה לא סופרת אותם
      if (!lead.hp) document.dispatchEvent(new CustomEvent('hg:lead', { detail: { method: 'callback' } }));
    });
  }

  function done() {
    form.hidden = true;
    var box = el('<div class="cb-done" role="status" tabindex="-1"><h2 id="cb-h2">תודה, ' + esc(chosen.name) + '.</h2>' +
      '<p>אחזור אליכם ' + esc(chosen.when.at ? chosen.when.label : 'בהקדם האפשרי') + ', מהמספר <span class="cb-num" dir="ltr">' + PHONE + '</span>.</p>' +
      '<button type="button" class="cb-go">סגירה</button></div>');
    box.querySelector('.cb-go').addEventListener('click', function () { dlg.close(); });
    dlg.appendChild(box); box.focus();
  }
  // השמירה לא הצליחה: אותה בקשה בוואטסאפ, בלחיצה אחת
  function failed() {
    var text = 'היי חנוך, אשמח שתחזור אליי ' + chosen.when.label + '. ' + chosen.name + ', ' + chosen.phone + (chosen.message ? '. ' + chosen.message : '');
    err.innerHTML = 'משהו לא עבד אצלי בשמירה. אפשר לשלוח לי את אותה בקשה בוואטסאפ, בלחיצה אחת:<br><a class="cb-wa" href="' + WA + encodeURIComponent(text) + '" target="_blank" rel="noopener">לשלוח בוואטסאפ</a><br>או לחייג: <a href="tel:+972545522053" dir="ltr">' + PHONE + '</a>';
    // הפוקוס עובר לקישור, וכך גם ההודעה נגללת למסך (הכפתור נחסם בזמן השמירה, והפוקוס היה נופל לדף)
    err.querySelector('a').focus();
  }

  function open() {
    if (!dlg) build();
    if (dlg.open) return;
    form.hidden = false;
    var old = dlg.querySelector('.cb-done'); if (old) old.remove();
    err.textContent = '';
    fill();
    dlg.showModal();
    // במחשב מתחילים ישר בשם. בטלפון לא, כדי שהמקלדת לא תסתיר את הימים והשעות
    if (matchMedia('(pointer: fine)').matches) form.elements.name.focus();
  }

  function init() {
    if (!window.HTMLDialogElement) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    Array.prototype.forEach.call(document.querySelectorAll('[data-callback], [data-callback-show]'), function (b) { b.hidden = false; });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-callback]');
      if (!b) return;
      e.preventDefault();
      var menu = b.closest('details'); if (menu) menu.open = false;
      var at = b.closest('[id]');
      track('callback_open', { cta_id: b.getAttribute('data-cta') || (at ? at.id : 'page') });
      open();
    });
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
