/* קרודו הנדסה · התנהגות האתר: תפריט נייד, מבט של בודק, טופס לוואטסאפ, הדפסה ומדידת לחיצות.
   בלי אנימציות גלילה: כל התוכן גלוי מההתחלה. */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function track(event, data) {
    var o = { event: event };
    for (var k in data) o[k] = data[k];
    (window.dataLayer = window.dataLayer || []).push(o);
  }

  // ---------- תפריט נייד ----------
  var menu = $('#menu'), openBtn = $('[data-menu-open]');
  if (menu && openBtn) {
    var open = function () {
      menu.hidden = false;
      openBtn.setAttribute('aria-expanded', 'true');
      document.documentElement.style.overflow = 'hidden';
      var first = $('a, button', menu);
      if (first) first.focus();
    };
    var close = function (focusBack) {
      menu.hidden = true;
      openBtn.setAttribute('aria-expanded', 'false');
      document.documentElement.style.overflow = '';
      if (focusBack !== false) openBtn.focus();
    };
    openBtn.addEventListener('click', open);
    menu.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-menu-close], a');
      if (!t) return;
      close(t.hasAttribute('data-menu-close') && t.tagName === 'BUTTON');
    });
    menu.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { close(); return; }
      if (ev.key !== 'Tab') return;
      var f = $$('a, button', menu), a = f[0], z = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); }
      else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); }
    });
    // תפריט פתוח שהמסך התרחב מעבר לנקודת השבירה: סוגרים אותו
    var wide = window.matchMedia && matchMedia('(min-width: 1121px)');
    if (wide && wide.addEventListener) wide.addEventListener('change', function (m) { if (m.matches && !menu.hidden) close(false); });
  }

  // ---------- מבט של בודק (הדירה בעמוד הבית) ----------
  var FIND = {};
  try { FIND = JSON.parse(($('#k-findings') || {}).textContent || '{}'); } catch (err) { FIND = {}; }
  $$('[data-eye]').forEach(function (btn) {
    var host = document.getElementById(btn.getAttribute('data-eye'));
    if (!host || !host._k) { btn.hidden = true; return; }
    var api = host._k, fig = btn.closest('figure') || document, say = $('[data-eye-say]', fig), on = false;
    function setSay(t) { if (say) say.textContent = t; }
    function pick(o, byUser) {
      api.pins.forEach(function (x) { x.b.classList.toggle('active', x === o); });
      var f = FIND[o.p.id];
      if (f) setSay(f[0] + ': ' + f[1]);
      if (byUser) track('finding_open', { finding: o.p.id });
    }
    btn.addEventListener('click', function () {
      on = !on;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      api.show(on ? 'all' : '');
      api.pins.forEach(function (o) { o.b.classList.remove('active'); });
      setSay(on ? say.getAttribute('data-on') : say.getAttribute('data-off'));
      // בטלפון רואים ממצא אחד בכל פעם: הראשון נפתח, והשאר בלחיצה על הנקודות
      if (on && api.el.classList.contains('compact')) pick(api.pins[0], false);
      track('inspector_view', { on: on });
    });
    api.pins.forEach(function (o) {
      o.b.addEventListener('click', function () { pick(o, true); });
      var f = FIND[o.p.id];
      if (f) o.b.setAttribute('aria-label', f[0] + '. ' + f[1]);
    });
  });

  // ---------- טופס: נפתח כהודעה מוכנה בוואטסאפ ----------
  $$('[data-quote]').forEach(function (f) {
    var err = $('.quote__err', f);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = function (n) { var el = f.elements[n]; if (!el) return ''; if (el.length && el[0] && el[0].type === 'radio') { for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value; return ''; } return (el.value || '').trim(); };
      var type = v('type'), name = v('name'), note = v('note'), data = { type: type, name: name, note: note };
      if (!type && !note) {
        err.textContent = 'בחרו סוג בדיקה, או כתבו בקצרה במה מדובר.';
        var first = f.querySelector('input[name="type"]');
        if (first) first.focus();
        return;
      }
      err.textContent = '';
      var lines = ['שלום רביד' + (name ? ', כאן ' + name : '') + '.'];
      if (type) lines.push('סוג הבדיקה: ' + type);
      $$('[data-msg]', f).forEach(function (el) {
        var x = (el.value || '').trim(), u = el.getAttribute('data-unit');
        if (!x) return;
        data[el.name] = x;
        lines.push(el.getAttribute('data-msg') + ': ' + x + (u && /^[\d.,\s]+$/.test(x) ? ' ' + u : ''));
      });
      if (note) lines.push(note);
      lines.push('(נשלח מהאתר)');
      var url = 'https://wa.me/972547560711?text=' + encodeURIComponent(lines.join('\n'));
      track('form_submit', { type: type || 'other' });
      // העתק במייל: כבוי עד שרביד מאשר כתובת (data-copy-to, וגם connect-src ב-CSP)
      var to = f.getAttribute('data-copy-to');
      if (to && window.fetch) {
        fetch(to, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.assign({ _subject: 'פנייה מהאתר: ' + (type || 'אחר'), _honey: v('_honey') }, data)) }).catch(function () {});
      }
      var w = window.open(url, '_blank');
      if (w) { try { w.opener = null; } catch (x) { /* */ } } else { location.href = url; }
    });
    f.addEventListener('change', function () { if (err.textContent) err.textContent = ''; });
  });

  // ---------- הרחבות שפתוחות במחשב ומקופלות בטלפון ----------
  if (window.matchMedia && matchMedia('(min-width: 761px)').matches) $$('details[data-open-wide]').forEach(function (d) { d.open = true; });

  // ---------- הדפסה ----------
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  // ---------- מדידה: לחיצות על וואטסאפ, חיוג והורדות ----------
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[data-wa], a[data-tel], a[data-vcf], a[data-pdf], a[data-sample]');
    if (!a) return;
    if (a.hasAttribute('data-wa')) track('whatsapp_click', { source: a.getAttribute('data-wa') });
    else if (a.hasAttribute('data-tel')) track('phone_click', { source: a.getAttribute('data-tel') });
    else if (a.hasAttribute('data-vcf')) track('vcard_download', {});
    else if (a.hasAttribute('data-sample')) track('sample_report_download', {});
    else track('checklist_download', {});
  });
})();
