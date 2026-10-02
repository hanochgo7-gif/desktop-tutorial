/* מחשבון הצעת מחיר – קייטרינג 4X4.
   רץ בדפדפן בלבד. הבחירות נשמרות רק בדפדפן של המבקר, ונשלחות לניסים רק כשהמבקר לוחץ "שליחה". */
(function () {
  'use strict';

  /* מחירים בשקלים. כל עוד ערך הוא null, הקבלה מציגה "בהצעה של ניסים" ולא מחיר.
     ברגע שממלאים מחיר לכל דוכן ותוספת, הקבלה מחשבת הערכה בעצמה. */
  var PRICING = {
    perGuest: { falafel: null, sabich: null, burger: null },        // לאורח, לכל דוכן שנבחר
    extras:   { fries: null, kids: null, drinks: null, vegan: null }, // לאורח
    minimum:  null                                                   // מינימום להזמנה
  };

  var PHONE = '972509112552';
  var KEY = 'falafel4x4-quote';
  var STATIONS = { falafel: 'פלאפל ב-4 טעמים', sabich: 'סביח אורגינל', burger: 'בר בורגר עשיר' };
  var EXTRAS = { fries: "צ'יפס חם", kids: 'מנות ילדים', drinks: 'שתייה קלה', vegan: 'קציצה טבעונית' };
  var PACKS = {
    falafel: { st: ['falafel'], ex: ['fries'] },
    classic: { st: ['falafel', 'sabich'], ex: ['fries'] },
    all:     { st: ['falafel', 'sabich', 'burger'], ex: ['fries', 'drinks'] }
  };

  var form = document.getElementById('qb');
  if (!form) return;
  function $(id) { return document.getElementById(id); }
  var range = $('q-guests'), num = $('q-guests-n');
  var FIELDS = ['q-type', 'q-date', 'q-time', 'q-place', 'q-name'];
  var R = {
    no: $('r-no'), today: $('r-today'), guests: $('r-guests'), st: $('r-st'), ex: $('r-ex'),
    event: $('r-event'), when: $('r-when'), qty: $('r-qty'), price: $('r-price'), warn: $('r-warn'), send: $('q-send')
  };

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* אחסון חסום */ } }
  function newNo() { return '4X4-' + String(Math.floor(1000 + Math.random() * 9000)); }
  function clamp(n) { n = Math.round(+n || 0); return Math.max(10, Math.min(1000, n)); }
  function fmt(n) { return Math.round(n).toLocaleString('he-IL'); }
  function up(n, step) { return Math.ceil(n / step) * step; }
  function has(arr, v) { return arr.indexOf(v) > -1; }
  function checked(name) {
    return [].slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (i) { return i.value; });
  }
  function setChecked(name, vals) {
    form.querySelectorAll('input[name="' + name + '"]').forEach(function (i) { i.checked = has(vals, i.value); });
  }
  function same(a, b) { return a.length === b.length && a.every(function (x) { return has(b, x); }); }

  var saved = load() || {};
  var quoteNo = saved.no || newNo();

  function read() {
    return {
      no: quoteNo,
      guests: clamp(num.value || range.value),
      st: checked('st'), ex: checked('ex'),
      type: $('q-type').value, date: $('q-date').value, time: $('q-time').value,
      place: $('q-place').value.trim(), name: $('q-name').value.trim()
    };
  }
  function restore(s) {
    if (s.guests) { num.value = s.guests; range.value = Math.min(s.guests, +range.max); }
    if (s.st) setChecked('st', s.st);
    if (s.ex) setChecked('ex', s.ex);
    FIELDS.forEach(function (id) { var k = id.slice(2); if (s[k] != null) $(id).value = s[k]; });
  }

  function quantities(s) {
    var out = [];
    if (!s.st.length) return out;
    var share = s.guests * 1.25 / s.st.length;
    if (has(s.st, 'falafel')) { out.push(['כדורי פלאפל', up(share * 5, 10)]); out.push(['פיתות לפלאפל', up(share, 5)]); }
    if (has(s.st, 'sabich')) out.push(['מנות סביח', up(share, 5)]);
    if (has(s.st, 'burger')) out.push(['קציצות על הגריל', up(share, 5)]);
    if (has(s.ex, 'fries')) out.push(["ק\"ג צ'יפס", up(s.guests * 0.15, 1)]);
    if (has(s.ex, 'drinks')) out.push(["בקבוקי שתייה של 1.5 ליטר", up(s.guests / 3, 1)]);
    return out;
  }
  function price(s) {
    if (!s.st.length) return null;
    var per = 0, ok = true;
    s.st.forEach(function (k) { if (PRICING.perGuest[k] == null) ok = false; else per += PRICING.perGuest[k]; });
    s.ex.forEach(function (k) { if (PRICING.extras[k] == null) ok = false; else per += PRICING.extras[k]; });
    return ok ? Math.max(per * s.guests, PRICING.minimum || 0) : null;
  }
  function dateInfo(v) {
    if (!v) return null;
    var d = new Date(v + 'T12:00:00'), t = new Date();
    t.setHours(12, 0, 0, 0);
    if (isNaN(d)) return null;
    return {
      label: d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' }),
      days: Math.round((d - t) / 864e5)
    };
  }
  function countdown(days) {
    if (days === 0) return 'היום';
    if (days === 1) return 'מחר';
    return 'עוד ' + fmt(days) + ' ימים';
  }

  function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  function setText(el, txt) { if (el.textContent !== txt) { el.textContent = txt; bump(el); } }

  function render() {
    var s = read();
    save(s);
    if (document.activeElement !== num && +num.value !== s.guests) num.value = s.guests;

    setText(R.guests, fmt(s.guests));
    setText(R.st, s.st.length ? s.st.map(function (k) { return STATIONS[k]; }).join(' + ') : 'עוד לא נבחר');
    setText(R.ex, s.ex.length ? s.ex.map(function (k) { return EXTRAS[k]; }).join(', ') : 'בלי תוספות');
    setText(R.event, [s.type, s.place].filter(Boolean).join(' · '));
    var di = dateInfo(s.date);
    setText(R.when, di ? di.label + (s.time ? ', ' + s.time : '') + (di.days >= 0 ? ' (' + countdown(di.days) + ')' : '') : 'עוד לא נבחר תאריך');

    var q = quantities(s);
    R.qty.innerHTML = q.length
      ? q.map(function (x) { return '<li><span>' + x[0] + '</span><b>' + fmt(x[1]) + '</b></li>'; }).join('')
      : '<li class="empty">בחרו דוכן כדי לראות כמויות</li>';

    var p = price(s);
    setText(R.price, p ? '≈ ₪' + fmt(p) : 'בהצעה של ניסים');

    var warn = '';
    if (!s.st.length) warn = 'בחרו לפחות דוכן אחד כדי לשלוח הצעה.';
    else if (di && di.days < 0) warn = 'התאריך שבחרתם כבר עבר. בחרו תאריך עתידי.';
    else if (di && di.days <= 3) warn = 'האירוע ממש בקרוב. הכי מהיר להתקשר לניסים: <a href="tel:0509112552">050-911-2552</a>';
    R.warn.innerHTML = warn;
    R.warn.hidden = !warn;
    R.send.disabled = !s.st.length || !!(di && di.days < 0);

    document.querySelectorAll('.pack').forEach(function (b) {
      var pk = PACKS[b.getAttribute('data-pack')];
      b.setAttribute('aria-pressed', same(pk.st, s.st) && same(pk.ex, s.ex) ? 'true' : 'false');
    });
  }

  function message(s) {
    var di = dateInfo(s.date), q = quantities(s), p = price(s);
    var L = [
      "היי ניסים, בניתי הצעה באתר של קייטרינג 4X4 (מס' " + s.no + '):',
      '• אורחים: ' + fmt(s.guests),
      '• על השולחן: ' + s.st.map(function (k) { return STATIONS[k]; }).join(', '),
      s.ex.length ? '• תוספות: ' + s.ex.map(function (k) { return EXTRAS[k]; }).join(', ') : null,
      '• סוג האירוע: ' + s.type,
      di ? '• תאריך: ' + di.label + (s.time ? ', שעת הגשה ' + s.time : '') : null,
      s.place ? '• מיקום: ' + s.place : null,
      s.name ? '• שם: ' + s.name : null,
      q.length ? '' : null,
      q.length ? 'הערכת כמויות מהאתר: ' + q.map(function (x) { return fmt(x[1]) + ' ' + x[0]; }).join(', ') : null,
      p ? 'הערכת מחיר מהאתר: ₪' + fmt(p) : null
    ];
    return L.filter(function (x) { return x !== null; }).join('\n');
  }

  range.addEventListener('input', function () { num.value = range.value; });
  num.addEventListener('input', function () { if (num.value) range.value = Math.min(clamp(num.value), +range.max); });
  num.addEventListener('blur', render);
  form.querySelectorAll('.step-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = clamp(+num.value + +b.getAttribute('data-step'));
      num.value = n; range.value = Math.min(n, +range.max); render();
    });
  });
  form.addEventListener('input', render);
  form.addEventListener('change', render);

  document.querySelectorAll('.pack').forEach(function (b) {
    b.addEventListener('click', function () {
      var pk = PACKS[b.getAttribute('data-pack')];
      setChecked('st', pk.st); setChecked('ex', pk.ex); render();
    });
  });

  R.send.addEventListener('click', function () {
    if (R.send.disabled) return;
    window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(message(read())), '_blank', 'noopener');
  });
  $('q-print').addEventListener('click', function () {
    document.documentElement.classList.add('print-quote');
    window.print();
  });
  window.addEventListener('afterprint', function () { document.documentElement.classList.remove('print-quote'); });
  $('q-reset').addEventListener('click', function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* אחסון חסום */ }
    quoteNo = newNo();
    form.reset();
    R.no.textContent = quoteNo;
    render();
  });

  var today = new Date();
  $('q-date').min = today.toISOString().slice(0, 10);
  R.today.textContent = today.toLocaleDateString('he-IL');
  R.no.textContent = quoteNo;
  restore(saved);
  render();
})();
