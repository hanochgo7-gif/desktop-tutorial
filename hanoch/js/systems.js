/* אולם התצוגה של המערכות: כל אחת מ-20 המערכות רצה כאן כממשק אמיתי וקטן, על עסק לדוגמה.
   לוחצים, גוררים וממלאים, ואם לא נוגעים, הדוגמה מציגה את עצמה לבד אחרי רגע.
   רק הדוגמה הפעילה רצה, ורק כשהיא על המסך. */
(function () {
  'use strict';

  const EN = document.documentElement.lang === 'en';
  const T = (he, en) => (EN ? en : he);

  const root = document.querySelector('[data-showroom]');
  if (!root) return;
  const motion = document.documentElement.classList.contains('motion');
  root.classList.add('sr-js');

  const $ = (s, el) => (el || root).querySelector(s);
  const $$ = (s, el) => Array.from((el || root).querySelectorAll(s));
  const cats = $$('.sr-cat'), panels = $$('.sr-panel'), items = $$('.sr-item');
  const screen = $('.sr-screen'), urlEl = $('.sr-url'), capTitle = $('.sr-cap-title'), capHint = $('.sr-cap-hint');

  /* ---------- כלים קטנים ---------- */
  let timers = [], touched = false, current = null, visible = false;
  const frames = new Set();
  const raf = (fn) => { const id = requestAnimationFrame((t) => { frames.delete(id); fn(t); }); frames.add(id); };
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
  const every = (fn, ms) => { timers.push(setInterval(fn, ms)); };
  // צעד אוטומטי: קורה רק אם המבקר עוד לא התחיל לשחק בעצמו
  const auto = (fn, ms) => later(() => { if (!touched) fn(); }, ms);
  const LOC = EN ? 'en-US' : 'he-IL';
  const nis = (n) => (EN ? '₪' + Math.round(n).toLocaleString(LOC) : Math.round(n).toLocaleString(LOC) + ' ₪');
  const fmt = (n) => Math.round(n).toLocaleString(LOC);
  // שעה לתצוגה: בעברית כמו שהיא, באנגלית בפורמט 12 שעות
  const clock = (t) => {
    if (!EN) return t;
    const h = +t.slice(0, 2), m = t.slice(3, 5);
    return (h % 12 || 12) + ':' + m + (h < 12 ? ' AM' : ' PM');
  };
  function tween(from, to, ms, step, done) {
    if (!motion) { step(to); if (done) done(); return; }
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      step(from + (to - from) * e);
      if (k < 1) raf(tick); else if (done) done();
    };
    raf(tick);
  }
  function type(el, text, ms, done) {
    let i = 0; el.classList.add('d-caret'); el.textContent = '';
    const step = () => {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) later(step, motion ? ms : 0); else { el.classList.remove('d-caret'); if (done) done(); }
    };
    step();
  }
  function toast(html, ms) {
    const old = $('.d-toast', screen); if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'd-toast'; t.innerHTML = '<span class="d-check"></span><span>' + html + '</span>';
    screen.appendChild(t);
    later(() => t.remove(), ms || 3200);
  }
  function stop() {
    screen.querySelectorAll('video').forEach((v) => v.pause());
    timers.forEach(clearTimeout); timers = [];
    frames.forEach(cancelAnimationFrame); frames.clear();
  }
  const DAYS = EN ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  function spark(vals, w, h) {
    const max = Math.max(...vals) * 1.1, min = Math.min(...vals) * 0.8;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - ((v - min) / (max - min)) * h]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return { line, area: line + ` L${w} ${h} L0 ${h} Z` };
  }

  /* ---------- 21 הדוגמאות ---------- */
  const D = {};

  D.shop = {
    url: 'noy-ceramics.co.il', hint: T('נסו: הוסיפו מוצר לסל', 'Try it: add something to the cart'),
    run(s) {
      const P = [['mug', T('ספל אבן חול', 'Sandstone mug'), 149], ['vase', T('אגרטל גלים', 'Wave vase'), 289], ['bowl', T('קערת הגשה', 'Serving bowl'), 219]];
      const FREE = 400;
      s.innerHTML = `<div class="d-wrap">
        <div class="d-row"><span class="d-h">${T('נוי · קרמיקה בעבודת יד', 'Noy · Handmade ceramics')}</span><span class="d-sp d-cart">${T('סל', 'Cart')} <b>0</b></span></div>
        <div class="d-shop-grid">${P.map((p, i) => `<div class="d-card d-prod"><div class="d-prod-img"><img src="work/systems/${p[0]}.webp" alt="" width="420" height="420"></div><div>${p[1]}</div><div class="d-row"><span class="d-num">${nis(p[2])}</span><button class="d-btn d-sp" type="button" data-i="${i}">${T('הוספה', 'Add')}</button></div></div>`).join('')}</div>
        <div class="d-card" style="padding:12px 14px;display:grid;gap:9px">
          <div class="d-row"><span class="d-sub d-ship">${T(`עוד ${nis(FREE)} למשלוח חינם`, `${nis(FREE)} away from free shipping`)}</span><span class="d-sp d-num d-total" style="font-size:1.3em">${nis(0)}</span><button class="d-btn hot d-checkout" type="button" disabled>${T('לתשלום', 'Checkout')}</button></div>
          <div class="d-bar"><i></i></div>
        </div></div>`;
      let n = 0, total = 0;
      const cart = $('.d-cart', s);
      const add = (i, btn) => {
        const img = btn.closest('.d-prod').querySelector('img');
        const r0 = img.getBoundingClientRect(), r1 = cart.getBoundingClientRect(), rs = s.getBoundingClientRect();
        const fly = document.createElement('i');
        fly.className = 'd-fly';
        fly.style.backgroundImage = `url("${img.getAttribute('src')}")`;
        fly.style.left = (r0.left - rs.left + r0.width / 2 - 23) + 'px';
        fly.style.top = (r0.top - rs.top + r0.height / 2 - 23) + 'px';
        s.appendChild(fly);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          fly.style.transform = `translate(${r1.left - r0.left - r0.width / 2 + r1.width / 2}px, ${r1.top - r0.top - r0.height / 2 + r1.height / 2}px) scale(.3)`;
          fly.style.opacity = '.4';
        }));
        later(() => {
          fly.remove();
          n++; const from = total; total += P[i][2];
          $('b', cart).textContent = n; cart.classList.remove('bump'); void cart.offsetWidth; cart.classList.add('bump');
          tween(from, total, 600, (v) => { $('.d-total', s).textContent = nis(v); });
          $('.d-bar i', s).style.width = Math.min(100, total / FREE * 100) + '%';
          $('.d-ship', s).textContent = total >= FREE ? T('המשלוח עלינו ✓', 'Free shipping unlocked ✓') : T('עוד ' + nis(FREE - total) + ' למשלוח חינם', nis(FREE - total) + ' away from free shipping');
          $('.d-checkout', s).disabled = false;
        }, motion ? 760 : 0);
      };
      $$('.d-prod .d-btn', s).forEach((b) => b.addEventListener('click', () => add(+b.dataset.i, b)));
      $('.d-checkout', s).addEventListener('click', () => go('pay'));
      auto(() => add(1, $$('.d-prod .d-btn', s)[1]), 1400);
      auto(() => add(0, $$('.d-prod .d-btn', s)[0]), 3000);
    }
  };

  D.pay = {
    url: 'noy-ceramics.co.il/checkout', hint: T('נסו: בחרו אמצעי תשלום ושלמו', 'Try it: pick a payment method and pay'),
    run(s) {
      s.innerHTML = `<div class="d-wrap"><div class="d-card d-pay">
        <div class="d-row"><span class="d-h">${T('תשלום מאובטח', 'Secure checkout')}</span><span class="d-sp d-pill ok">${T('מוצפן', 'Encrypted')}</span></div>
        <div class="d-row"><span class="d-sub">${T('אגרטל גלים · משלוח חינם', 'Wave vase · Free shipping')}</span><span class="d-sp d-num" style="font-size:1.7em">${nis(289)}</span></div>
        <div class="d-methods"><button class="d-method on" type="button" data-m="card">${T('כרטיס אשראי', 'Credit card')}</button><button class="d-method" type="button" data-m="bit">${T('ביט', 'Bit')}</button><button class="d-method" type="button" data-m="apple">Apple Pay</button></div>
        <div class="d-fields"></div>
        <button class="d-btn hot d-go" type="button">${T('תשלום', 'Pay')} ${nis(289)}</button>
      </div></div>`;
      const f = $('.d-fields', s);
      const views = {
        card: '<div class="d-cardnum"><div class="d-input"><span class="d-mono d-cn"></span></div><div class="d-row" style="gap:8px"><div class="d-input" style="flex:1"><span class="d-mono">08/29</span></div><div class="d-input" style="flex:1"><span class="d-mono">•••</span></div></div></div>',
        bit: '<div class="d-input"><span class="d-sub">' + T('בקשת תשלום תישלח לטלפון', 'A payment request goes to your phone') + '</span><span class="d-sp d-mono">054-•••-••53</span></div>',
        apple: '<div class="d-input" style="justify-content:center"><span class="d-sub">' + T('אישור מהיר עם Face ID או טביעת אצבע', 'Confirm in a tap with Face ID or Touch ID') + '</span></div>'
      };
      const show = (m) => {
        $$('.d-method', s).forEach((b) => b.classList.toggle('on', b.dataset.m === m));
        f.innerHTML = views[m];
        if (m === 'card') type($('.d-cn', f), '4580 1234 5678 9012', 55);
      };
      $$('.d-method', s).forEach((b) => b.addEventListener('click', () => show(b.dataset.m)));
      show('card');
      const pay = () => {
        const g = $('.d-go', s); g.disabled = true; g.innerHTML = '<span class="d-spin"></span> ' + T('מאשרים…', 'Processing…');
        later(() => {
          s.innerHTML = `<div class="d-wrap"><div class="d-done d-pop"><span class="d-check"></span><div class="d-h">${T('התשלום התקבל', 'Payment received')}</div><div class="d-sub">${nis(289)} · ${T('קבלה נשלחה למייל של הלקוח', 'Receipt emailed to the customer')}</div><button class="d-btn alt d-inv" type="button">${T('לראות את הקבלה', 'View receipt')}</button></div></div>`;
          $('.d-inv', s).addEventListener('click', () => go('invoice'));
        }, motion ? 1500 : 200);
      };
      $('.d-go', s).addEventListener('click', pay);
      auto(pay, 3600);
    }
  };

  D.invoice = {
    url: T('noy-ceramics.co.il · קבלות', 'noy-ceramics.co.il · receipts'), hint: T('הקבלה נוצרת לבד אחרי כל תשלום', 'A receipt is created automatically after every payment'),
    run(s) {
      const no = 1042 + Math.floor(Math.random() * 30);
      s.innerHTML = `<div class="d-wrap"><div class="d-card d-doc">
        <div class="d-row"><span class="d-h">${T('קבלה', 'Receipt')} ${no}</span><span class="d-sp d-sub">${new Date().toLocaleDateString(LOC)}</span></div>
        <div class="d-sub">${T('נוי קרמיקה · עוסק פטור', 'Noy Ceramics · VAT-exempt business')}</div>
        <div class="d-lines"></div>
      </div><div class="d-row" style="justify-content:center"><button class="d-btn alt d-again" type="button">${T('תשלום נוסף לדוגמה', 'Run another sample payment')}</button></div></div>`;
      const L = [[T('לקוחה', 'Customer'), T('מיכל לוי', 'Michal Levi')], [T('אגרטל גלים', 'Wave vase'), nis(289)], [T('משלוח', 'Shipping'), T('חינם', 'Free')], [T('אמצעי תשלום', 'Payment method'), T('אשראי ••9012', 'Card ••9012')], [T('סה״כ שולם', 'Total paid'), nis(289), 'total']];
      const box = $('.d-lines', s);
      L.forEach((l, i) => later(() => {
        const d = document.createElement('div');
        d.className = 'd-line d-up' + (l[2] ? ' ' + l[2] : ''); d.innerHTML = `<span>${l[0]}</span><span>${l[1]}</span>`;
        box.appendChild(d);
      }, 350 + i * 380));
      later(() => {
        const st = document.createElement('span'); st.className = 'd-stamp d-pop'; st.textContent = T('שולם', 'Paid');
        box.appendChild(st);
        toast(T('הקבלה נשלחה ל-<b>michal@…</b> ונשמרה בהנהלת החשבונות', 'Receipt sent to <b>michal@…</b> and filed in the books'), 3600);
      }, 350 + L.length * 380 + 200);
      $('.d-again', s).addEventListener('click', () => go('invoice', true));
    }
  };

  D.quote = {
    url: T('taam-events.co.il/הצעת-מחיר', 'taam-events.co.il/quote'), hint: T('נסו: הזיזו את מספר האורחים', 'Try it: change the guest count'),
    run(s) {
      const MENU = EN ? { 'Basic': 65, 'Plus': 89, 'Premium': 120 } : { 'בסיסי': 65, 'מורחב': 89, 'פרימיום': 120 };
      const EXTRA = EN
        ? { 'Wait staff': (g) => Math.ceil(g / 40) * 450, 'Drinks bar': (g) => g * 12, 'Dessert station': () => 1400 }
        : { 'מלצרים': (g) => Math.ceil(g / 40) * 450, 'עמדת שתייה': (g) => g * 12, 'עמדת קינוחים': () => 1400 };
      s.innerHTML = `<div class="d-wrap">
        <div class="d-row"><span class="d-h">${T('כמה יעלה האירוע שלכם?', 'What will your event cost?')}</span><span class="d-sp d-pill hot">${T('מחירים לדוגמה', 'Sample prices')}</span></div>
        <div class="d-card" style="padding:14px 16px;display:grid;gap:8px"><div class="d-row"><span>${T('מספר אורחים', 'Guests')}</span><span class="d-sp d-num d-g" style="font-size:1.4em">80</span></div><input class="d-range" type="range" min="20" max="300" step="10" value="80" aria-label="${T('מספר אורחים', 'Number of guests')}"></div>
        <div class="d-grid" style="gap:8px"><span class="d-sub">${T('תפריט', 'Menu')}</span><div class="d-opts d-menu">${Object.keys(MENU).map((m, i) => `<button class="d-opt${i === 1 ? ' on' : ''}" type="button" data-m="${m}">${T(`${m} · ${MENU[m]} ₪ לאורח`, `${m} · ${nis(MENU[m])}/guest`)}</button>`).join('')}</div></div>
        <div class="d-grid" style="gap:8px"><span class="d-sub">${T('תוספות', 'Add-ons')}</span><div class="d-opts d-extra">${Object.keys(EXTRA).map((m) => `<button class="d-opt" type="button" aria-pressed="false" data-x="${m}">${m}</button>`).join('')}</div></div>
        <div class="d-row" style="margin-top:auto"><div><div class="d-price">${EN ? '<span>₪</span><span class="d-num d-p">0</span>' : '<span class="d-num d-p">0</span><span>₪</span>'}</div><div class="d-sub d-per"></div></div><button class="d-btn hot d-sp d-send" type="button">${T('לקבל הצעה מסודרת', 'Get a detailed quote')}</button></div>
      </div>`;
      const st = { g: 80, m: T('מורחב', 'Plus'), x: new Set() };
      let shown = 0;
      const calc = () => {
        let p = st.g * MENU[st.m]; st.x.forEach((k) => { p += EXTRA[k](st.g); });
        $('.d-g', s).textContent = st.g;
        $('.d-per', s).textContent = T('כ-' + nis(p / st.g) + ' לאורח', 'About ' + nis(p / st.g) + ' per guest');
        const from = shown; shown = p;
        tween(from, p, 450, (v) => { $('.d-p', s).textContent = fmt(v); });
      };
      const range = $('.d-range', s);
      range.addEventListener('input', () => { st.g = +range.value; calc(); });
      $$('.d-menu .d-opt', s).forEach((b) => b.addEventListener('click', () => { st.m = b.dataset.m; $$('.d-menu .d-opt', s).forEach((o) => o.classList.toggle('on', o === b)); calc(); }));
      $$('.d-extra .d-opt', s).forEach((b) => b.addEventListener('click', () => { const k = b.dataset.x; st.x.has(k) ? st.x.delete(k) : st.x.add(k); b.classList.toggle('on', st.x.has(k)); b.setAttribute('aria-pressed', st.x.has(k)); calc(); }));
      $('.d-send', s).addEventListener('click', () => toast(T(`ההצעה נשלחה לעסק: <b>${st.g} אורחים, תפריט ${st.m}</b>`, `Quote request sent: <b>${st.g} guests, ${st.m} menu</b>`)));
      calc();
      auto(() => tween(80, 150, 1200, (v) => { st.g = Math.round(v / 10) * 10; range.value = st.g; calc(); }), 1300);
      auto(() => $$('.d-extra .d-opt', s)[0].click(), 3000);
    }
  };

  D.booking = {
    url: T('dana-clinic.co.il/תור', 'dana-clinic.co.il/book'), hint: T('נסו: בחרו יום ושעה', 'Try it: pick a day and a time'),
    run(s) {
      const now = new Date(), days = [];
      for (let d = 1; days.length < 5; d++) { const t = new Date(now); t.setDate(now.getDate() + d); if (t.getDay() !== 6) days.push(t); }
      const SLOTS = ['09:00', '10:00', '11:30', '13:00', '15:00', '16:30', '18:00', '19:00'];
      const dm = (t) => (EN ? t.toLocaleDateString(LOC, { month: 'short', day: 'numeric' }) : `${t.getDate()}.${t.getMonth() + 1}`);
      s.innerHTML = `<div class="d-wrap">
        <div class="d-row"><span class="d-h">${T('דנה · קליניקה לקוסמטיקה', 'Dana · Skin clinic')}</span><span class="d-sp d-pill">${T('טיפול פנים · 60 דק׳', 'Facial · 60 min')}</span></div>
        <div class="d-days">${days.map((t, i) => `<button class="d-day" type="button" data-i="${i}">${DAYS[t.getDay()]}<small>${dm(t)}</small></button>`).join('')}</div>
        <div class="d-slots"></div>
        <div class="d-row" style="margin-top:auto"><span class="d-sub d-sel">${T('בחרו יום', 'Pick a day')}</span><button class="d-btn hot d-sp d-book" type="button" disabled>${T('קביעת תור', 'Book')}</button></div>
      </div>`;
      let day = -1, slot = null;
      const taken = (i, t) => ((i * 7 + t.charCodeAt(1) * 3 + t.charCodeAt(3)) % 3) === 0;
      const paint = () => {
        $('.d-slots', s).innerHTML = SLOTS.map((t) => `<button class="d-slot${taken(day, t) ? ' taken' : ''}${slot === t ? ' on' : ''}" type="button" data-t="${t}">${clock(t)}</button>`).join('');
        $$('.d-slot', s).forEach((b) => b.addEventListener('click', () => { slot = b.dataset.t; paint(); }));
        $('.d-sel', s).textContent = slot ? T(`יום ${DAYS[days[day].getDay()]}, ${slot}`, `${DAYS[days[day].getDay()]}, ${clock(slot)}`) : T('בחרו שעה', 'Pick a time');
        $('.d-book', s).disabled = !slot;
      };
      const pick = (i) => { day = i; slot = null; $$('.d-day', s).forEach((b) => b.classList.toggle('on', +b.dataset.i === i)); paint(); };
      $$('.d-day', s).forEach((b) => b.addEventListener('click', () => pick(+b.dataset.i)));
      $('.d-book', s).addEventListener('click', () => {
        toast(T(`התור נקבע ל<b>יום ${DAYS[days[day].getDay()]} ב-${slot}</b>. תזכורת תישלח יום לפני`, `Booked for <b>${DAYS[days[day].getDay()]} at ${clock(slot)}</b>. A reminder goes out the day before`), 3800);
        const b = $(`.d-slot[data-t="${slot}"]`, s); if (b) b.classList.add('taken');
        slot = null; $('.d-book', s).disabled = true; $('.d-sel', s).textContent = T('נשמר ביומן של דנה', 'Saved to Dana’s calendar');
      });
      auto(() => pick(1), 1200);
      auto(() => { const b = $$('.d-slot:not(.taken)', s)[2]; if (b) b.click(); }, 2300);
      auto(() => $('.d-book', s).click(), 3500);
    }
  };

  D.courses = {
    url: T('rachel-math.co.il/אזור-אישי', 'rachel-math.co.il/my-account'), hint: T('נסו: סמנו שיעור שסיימתם', 'Try it: tick off a lesson you finished'),
    run(s) {
      s.innerHTML = `<div class="d-wrap" style="justify-content:center;align-items:center"><div class="d-card d-up" style="width:min(320px,100%);padding:20px;display:grid;gap:10px">
        <div class="d-h">${T('כניסה לאזור האישי', 'Sign in to your account')}</div>
        <div class="d-input"><span class="d-mono d-em"></span></div>
        <div class="d-input"><span class="d-mono d-pw"></span></div>
        <button class="d-btn d-login" type="button">${T('כניסה', 'Sign in')}</button></div></div>`;
      let entered = false;
      const dash = () => {
        if (entered) return; entered = true;
        const L = EN
          ? ['Quadratic equations', 'Functions and graphs', 'Arithmetic sequences', 'Probability', 'Calculus: derivatives']
          : ['משוואות ריבועיות', 'פונקציות וגרפים', 'סדרות חשבוניות', 'הסתברות', 'חדו״א: נגזרות'];
        const done = new Set([0, 1]);
        s.innerHTML = `<div class="d-wrap">
          <div class="d-row"><div class="d-ring"><span class="d-pc"></span></div><div><div class="d-h">${T('היי נועה', 'Hi Noa')}</div><div class="d-sub">${T('מתמטיקה · 5 יחידות', 'Math · Advanced track')}</div><span class="d-pill hot" style="margin-top:6px">${T('השיעור הבא: מחר 17:00 בזום', 'Next lesson: tomorrow, 5:00 PM on Zoom')}</span></div></div>
          <div class="d-card d-scroll" style="flex:1">${L.map((l, i) => `<div class="d-lesson${done.has(i) ? ' done' : ''}" role="button" tabindex="0" data-i="${i}"><span class="d-tick"></span><span class="d-ln">${l}</span><span class="d-sp d-sub">${i < 3 ? T('שיעור מוקלט', 'Recorded lesson') : T('דף עבודה', 'Worksheet')}</span></div>`).join('')}</div>
        </div>`;
        const ring = $('.d-ring', s);
        let pc = 0;
        const upd = () => { const to = done.size / L.length * 100; tween(pc, to, 700, (v) => { ring.style.background = `conic-gradient(var(--signal) ${v}%, rgba(20,20,22,.08) 0)`; $('.d-pc', s).textContent = Math.round(v) + '%'; }); pc = to; };
        $$('.d-lesson', s).forEach((el) => {
          const flip = () => { const i = +el.dataset.i; done.has(i) ? done.delete(i) : done.add(i); el.classList.toggle('done', done.has(i)); upd(); };
          el.addEventListener('click', flip);
          el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
        });
        upd();
        auto(() => $$('.d-lesson', s)[2].click(), 2000);
      };
      type($('.d-em', s), 'noa@gmail.com', 60, () => {
        $('.d-pw', s).textContent = '••••••••';
        later(dash, motion ? 600 : 0);
      });
      $('.d-login', s).addEventListener('click', () => { touched = true; dash(); });
    }
  };

  D.crm = {
    url: T('פניות מהאתר → Google Sheets', 'Website leads → Google Sheets'), hint: T('נסו: שלחו פנייה לדוגמה', 'Try it: send a sample lead'),
    run(s) {
      const N = EN
        ? [['Yael Cohen', 'Facial'], ['Avi Mizrahi', 'Event quote'], ['Ronit Shoshan', 'Trial lesson'], ['Daniel Peretz', 'Online store'], ['Maya Azoulay', 'Website upgrade']]
        : [['יעל כהן', 'טיפול פנים'], ['אבי מזרחי', 'הצעת מחיר לאירוע'], ['רונית שושן', 'שיעור ניסיון'], ['דניאל פרץ', 'חנות אונליין'], ['מאיה אזולאי', 'שדרוג אתר']];
      s.innerHTML = `<div class="d-wrap">
        <div class="d-flow"><span class="d-pill">${T('טופס באתר', 'Website form')}</span><span class="d-pipe"><i></i></span><span class="d-pill ok">Google Sheets</span><span class="d-pipe"><i></i></span><span class="d-pill hot">${T('התראה אליכם', 'Alert to you')}</span></div>
        <div class="d-card d-scroll" style="flex:1"><table class="d-table"><thead><tr><th>${T('שם', 'Name')}</th><th>${T('מתעניין ב', 'Interested in')}</th><th>${T('טלפון', 'Phone')}</th><th>${T('מקור', 'Source')}</th><th>${T('שעה', 'Time')}</th></tr></thead><tbody></tbody></table></div>
        <div class="d-row"><span class="d-sub d-count">${T('0 פניות היום', '0 leads today')}</span><button class="d-btn hot d-sp d-send" type="button">${T('שליחת פנייה לדוגמה', 'Send a sample lead')}</button></div>
      </div>`;
      let k = 0;
      const tb = $('tbody', s);
      const send = () => {
        const n = N[k % N.length]; k++;
        $$('.d-pipe', s).forEach((p, i) => { p.classList.remove('go'); void p.offsetWidth; later(() => p.classList.add('go'), i * 450); });
        later(() => {
          const t = new Date(); const tr = document.createElement('tr'); tr.className = 'new';
          const hm = EN ? t.toLocaleTimeString(LOC, { hour: 'numeric', minute: '2-digit' }) : `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
          tr.innerHTML = `<td>${n[0]}</td><td>${n[1]}</td><td class="d-mono">05${k}-••••${(k * 37) % 90 + 10}</td><td>${(EN ? ['Google', 'Instagram', 'WhatsApp'] : ['גוגל', 'אינסטגרם', 'וואטסאפ'])[k % 3]}</td><td class="d-mono">${hm}</td>`;
          tb.prepend(tr);
          $('.d-count', s).textContent = k + (k === 1 ? T(' פנייה היום', ' lead today') : T(' פניות היום', ' leads today'));
          toast(T(`פנייה חדשה: <b>${n[0]}</b> · ${n[1]}`, `New lead: <b>${n[0]}</b> · ${n[1]}`), 2600);
        }, motion ? 950 : 0);
      };
      $('.d-send', s).addEventListener('click', send);
      auto(send, 1000);
      auto(send, 4200);
    }
  };

  D.dash = {
    url: 'admin · noy-ceramics.co.il', hint: T('הנתונים מתעדכנים בזמן אמת', 'Numbers update in real time'),
    run(s) {
      const vals = [12, 15, 11, 18, 21, 17, 24, 22, 28, 26, 31, 29, 35, 38];
      s.innerHTML = `<div class="d-wrap">
        <div class="d-kpis"><div class="d-card d-kpi"><span class="d-sub">${T('הזמנות היום', 'Orders today')}</span><span class="d-num d-k1">14</span></div><div class="d-card d-kpi"><span class="d-sub">${T('הכנסות החודש', 'Revenue this month')}</span><span class="d-num d-k2">${fmt(18420)}</span></div><div class="d-card d-kpi"><span class="d-sub">${T('לקוחות חדשים', 'New customers')}</span><span class="d-num d-k3">63</span></div></div>
        <div class="d-card d-chart"><div class="d-row"><span class="d-sub">${T('הזמנות · 14 ימים אחרונים', 'Orders · last 14 days')}</span><span class="d-sp d-pill ok d-trend">+24%</span></div><svg viewBox="0 0 300 110" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4f1a" stop-opacity=".28"/><stop offset="1" stop-color="#ff4f1a" stop-opacity="0"/></linearGradient></defs><path class="d-area" fill="url(#dg)"/><path class="d-line" fill="none" stroke="#ff4f1a" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg></div>
        <div class="d-orders"></div>
      </div>`;
      const draw = () => { const p = spark(vals, 300, 104); $('.d-line', s).setAttribute('d', p.line); $('.d-area', s).setAttribute('d', p.area); };
      draw();
      const ORD = EN
        ? [['Michal L.', 'Wave vase', 289], ['Ori B.', 'Mug set', 520], ['Shiran T.', 'Serving bowl', 219], ['Tomer G.', 'Sandstone mug', 149]]
        : [['מיכל ל.', 'אגרטל גלים', 289], ['אורי ב.', 'סט ספלים', 520], ['שירן ט.', 'קערת הגשה', 219], ['תומר ג.', 'ספל אבן חול', 149]];
      const box = $('.d-orders', s);
      let k1 = 14, k2 = 18420, k3 = 63, o = 0;
      const tick = () => {
        const r = ORD[o++ % ORD.length];
        const el = document.createElement('div'); el.className = 'd-card d-order d-up';
        el.innerHTML = `<span class="d-check"></span><span>${r[0]} · ${r[1]}</span><span class="d-sp d-num">${nis(r[2])}</span>`;
        box.prepend(el); while (box.children.length > 3) box.lastChild.remove();
        tween(k1, k1 + 1, 500, (v) => { $('.d-k1', s).textContent = Math.round(v); }); k1++;
        tween(k2, k2 + r[2], 900, (v) => { $('.d-k2', s).textContent = fmt(v); }); k2 += r[2];
        if (o % 2) { k3++; $('.d-k3', s).textContent = k3; }
        vals[vals.length - 1] += 1; draw();
      };
      tick();
      every(tick, 2600);
    }
  };

  D.film = {
    url: 'hgpro.io', hint: T('נסו: החליפו סרט והפעילו קול', 'Try it: switch films and turn the sound on'),
    run(s) {
      const small = matchMedia('(max-width: 700px)').matches;
      const FILMS = [
        ['hg', T('HG · פרסומת בושם', 'HG · Fragrance'), 'hg', T('פרסומת בושם · 30 שניות · נוצרה כולה ב-AI', 'Fragrance commercial · 30 seconds · made entirely with AI')],
        ['ad', T('לפני שהעיר מתעוררת', 'Before the City Wakes'), EN ? 'ad-en' : 'ad', T('סרט פרסומת · 60 שניות · נוצר כולו ב-AI', 'Commercial · 60 seconds · made entirely with AI')]];
      s.innerHTML = `<div class="d-film"><video muted playsinline loop preload="metadata"></video>
        <div class="d-opts d-film-opts">${FILMS.map((f, i) => `<button class="d-opt${i ? '' : ' on'}" type="button" data-f="${i}">${f[1]}</button>`).join('')}</div>
        <div class="d-film-ui"><span class="d-film-tag"></span>
        <button class="d-btn hot d-film-snd" type="button" aria-pressed="false">${T('הפעלת קול', 'Sound on')}</button></div></div>`;
      const v = $('video', s), b = $('.d-film-snd', s), tag = $('.d-film-tag', s);
      const load = (i) => {
        const f = FILMS[i];
        v.poster = 'work/film/' + f[0] + '.webp'; v.src = 'work/film/' + f[2] + (small ? '-m' : '') + '.mp4';
        v.setAttribute('aria-label', f[1]); tag.textContent = f[3];
        $$('.d-film-opts .d-opt', s).forEach((o) => o.classList.toggle('on', +o.dataset.f === i));
        if (motion || !v.muted) v.play().catch(() => { });
      };
      $$('.d-film-opts .d-opt', s).forEach((o) => o.addEventListener('click', (e) => { e.stopPropagation(); touched = true; load(+o.dataset.f); }));
      b.addEventListener('click', () => {
        touched = true; v.muted = !v.muted;
        if (!v.muted) { v.currentTime = 0; v.play().catch(() => { }); }
        b.setAttribute('aria-pressed', String(!v.muted)); b.textContent = v.muted ? T('הפעלת קול', 'Sound on') : T('השתקה', 'Mute');
      });
      load(0);
    }
  };

  D.bot = {
    url: 'dana-clinic.co.il', hint: T('נסו: בחרו שאלה או כתבו משהו', 'Try it: pick a question or type your own'),
    run(s) {
      const QA = EN ? [
        ['How much is a facial?', 'A classic facial is ₪380 and takes about an hour. There’s also a treatment for sensitive skin at ₪420.'],
        ['Any openings this week?', 'Yes! There’s a spot on Tuesday at 11:30 AM and on Thursday at 6:00 PM. Want me to hold one for you?'],
        ['Where are you located?', '12 Herzl St, Ramat Gan, 2nd floor. There’s street parking right across from the building.'],
        ['Can I talk to Dana?', 'Of course. Tap below and I’ll move the chat to Dana’s WhatsApp, with everything you’ve already asked.']
      ] : [
        ['כמה עולה טיפול פנים?', 'טיפול פנים קלאסי עולה 380 ₪ ונמשך כשעה. יש גם טיפול מותאם לעור רגיש, ב-420 ₪.'],
        ['יש תור פנוי השבוע?', 'כן! יש מקום ביום שלישי ב-11:30 וביום חמישי ב-18:00. לשריין לכם אחד?'],
        ['איפה אתם נמצאים?', 'רחוב הרצל 12, רמת גן, קומה 2. יש חניה כחולה־לבנה ממש מול הבניין.'],
        ['אפשר לדבר עם דנה?', 'בטח. לחצו כאן ואעביר את השיחה לוואטסאפ של דנה, עם כל מה שכבר שאלתם.']
      ];
      s.innerHTML = `<div class="d-wrap">
        <div class="d-row"><span class="d-check" style="background:var(--signal)"></span><span class="d-h">${T('העוזר של דנה', 'Dana’s assistant')}</span><span class="d-sp d-pill ok">${T('זמין 24/7', 'Available 24/7')}</span></div>
        <div class="d-chat"></div>
        <div class="d-sugg">${QA.map((q, i) => `<button class="d-opt" type="button" data-i="${i}">${q[0]}</button>`).join('')}</div>
        <form class="d-row d-ask"><input class="d-input" style="flex:1;border:0;font:inherit" placeholder="${T('כתבו שאלה…', 'Ask a question…')}" aria-label="${T('שאלה לעוזר', 'Question for the assistant')}"><button class="d-btn" type="submit">${T('שליחה', 'Send')}</button></form>
      </div>`;
      const chat = $('.d-chat', s);
      const msg = (who, html) => { const m = document.createElement('div'); m.className = 'd-msg ' + who; m.innerHTML = html; chat.appendChild(m); chat.scrollTop = chat.scrollHeight; return m; };
      const reply = (html, extra) => {
        const t = msg('bot', '<span class="d-typing"><i></i><i></i><i></i></span>');
        later(() => { t.innerHTML = html; if (extra) extra(t); chat.scrollTop = chat.scrollHeight; }, motion ? 1000 : 0);
      };
      msg('bot', T('היי! אני העוזר של קליניקת דנה. אפשר לשאול אותי על טיפולים, מחירים ותורים.', 'Hi! I’m the assistant at Dana’s clinic. Ask me about treatments, prices and appointments.'));
      const ask = (i) => {
        msg('me', QA[i][0]);
        reply(QA[i][1], i === 3 ? (t) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'd-btn hot'; b.style.marginTop = '8px'; b.textContent = T('להמשיך בוואטסאפ', 'Continue on WhatsApp');
          b.addEventListener('click', () => toast(T('השיחה עברה לוואטסאפ של דנה, <b>עם כל ההקשר</b>', 'The chat moved to Dana’s WhatsApp, <b>with the full context</b>')));
          t.appendChild(document.createElement('br')); t.appendChild(b);
        } : null);
      };
      $$('.d-sugg .d-opt', s).forEach((b) => b.addEventListener('click', () => ask(+b.dataset.i)));
      $('.d-ask', s).addEventListener('submit', (e) => {
        e.preventDefault(); const inp = $('input', s), q = inp.value.trim(); if (!q) return; inp.value = '';
        msg('me', q.replace(/[<>&]/g, ''));
        reply(T('בעוזר האמיתי, כאן תגיע תשובה לפי המידע של העסק שלכם: מחירים, שעות, שירותים ומדיניות. בדוגמה הזו אפשר לבחור אחת מהשאלות למטה.', 'In the real assistant, this is where an answer based on your business info appears: prices, hours, services and policies. In this demo, pick one of the questions below.'));
      });
      auto(() => ask(0), 1600);
      auto(() => ask(1), 5200);
    }
  };

  D.visuals = {
    url: T('צילום בטלפון → הפקת סטודיו', 'Phone photo → studio shot'), hint: T('נסו: גררו את הקו', 'Try it: drag the line'),
    run(s) {
      s.innerHTML = `<div class="d-ba" role="slider" tabindex="0" aria-label="${T('לפני ואחרי', 'Before and after')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
        <img src="work/systems/before.webp" alt="${T('צילום טלפון רגיל של אגרטל במטבח', 'An ordinary phone photo of a vase in a kitchen')}" width="640" height="800">
        <img class="d-ba-after" src="work/systems/after.webp" alt="${T('אותו אגרטל בצילום סטודיו שהופק בבינה מלאכותית', 'The same vase in an AI-generated studio shot')}" width="640" height="800">
        <span class="d-ba-line"></span><span class="d-ba-tag" style="left:14px">${T('לפני: צילום בטלפון', 'Before: phone photo')}</span><span class="d-ba-tag" style="right:14px;background:var(--signal);color:#141416">${T('אחרי: הפקה ב-AI', 'After: AI studio shot')}</span></div>`;
      const ba = $('.d-ba', s);
      const set = (x) => { x = Math.max(0, Math.min(100, x)); ba.style.setProperty('--x', x + '%'); ba.setAttribute('aria-valuenow', Math.round(x)); };
      const at = (e) => { const r = ba.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
      let drag = false;
      ba.addEventListener('pointerdown', (e) => { drag = true; touched = true; try { ba.setPointerCapture(e.pointerId); } catch (err) { } at(e); });
      ba.addEventListener('pointermove', (e) => { if (drag) at(e); });
      ba.addEventListener('pointerup', () => { drag = false; });
      ba.addEventListener('keydown', (e) => { const x = parseFloat(ba.style.getPropertyValue('--x')) || 50; if (e.key === 'ArrowLeft') set(x - 5); if (e.key === 'ArrowRight') set(x + 5); });
      set(50);
      auto(() => tween(50, 88, 1100, set, () => auto(() => tween(88, 12, 1800, set, () => auto(() => tween(12, 50, 900, set), 500)), 400)), 900);
    }
  };

  D.object = {
    url: T('תלת־ממד מתוך האתרים שבניתי', '3D, from sites I’ve built'), hint: T('נסו: גררו כדי לסובב', 'Try it: drag to rotate'),
    run(s) {
      const R = [['gotovski', T('ש. גוטובסקי', 'S. Gotovski')], ['ams', 'AMS'], ['allenbis', T('אלנביס', 'Allenbis')], ['clinic', T('רותם', 'Rotem')], ['falafel', '4X4'], ['rachel', T('רחלי', 'Racheli')]];
      s.innerHTML = `<div class="d-obj"><i></i><div class="d-opts">${R.map((r, i) => `<button class="d-opt${i ? '' : ' on'}" type="button" data-id="${r[0]}">${r[1]}</button>`).join('')}</div></div>`;
      const box = $('.d-obj', s), sp = $('i', box), N = 48;
      let f = 0, v = motion ? 10 : 0, drag = null;
      const show = () => { const i = ((Math.floor(f) % N) + N) % N; sp.style.backgroundPosition = (i / (N - 1) * 100) + '% 0'; };
      const use = (id) => { sp.style.backgroundImage = `url("work/relics/${id}-real.webp")`; $$('.d-opt', box).forEach((b) => b.classList.toggle('on', b.dataset.id === id)); };
      use('gotovski');
      $$('.d-opt', box).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); use(b.dataset.id); }));
      box.addEventListener('pointerdown', (e) => { if (e.target.closest('.d-opt')) return; drag = { x: e.clientX, t: performance.now() }; v = 0; touched = true; box.classList.add('drag'); try { box.setPointerCapture(e.pointerId); } catch (err) { } });
      box.addEventListener('pointermove', (e) => { if (!drag) return; const now = performance.now(), dt = Math.max(8, now - drag.t) / 1000, df = (e.clientX - drag.x) / box.clientWidth * N * 1.2; f += df; v = df / dt; drag.x = e.clientX; drag.t = now; show(); });
      const end = () => { drag = null; box.classList.remove('drag'); };
      box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!drag) { f += v * dt; v += ((motion ? 10 : 0) - v) * Math.min(1, dt * 2); show(); }
        raf(loop);
      };
      show(); raf(loop);
      auto(() => use('falafel'), 3800);
    }
  };

  D.sim = {
    url: T('gotovski.co.il · הדמיה', 'gotovski.co.il · simulation'), hint: T('ההדמיה המלאה נמצאת בתיק העבודות', 'The full simulation is in the portfolio'),
    run(s) {
      s.innerHTML = `<div style="position:absolute;inset:0;background:#0b0d10 url('work/sim-poster-960.webp') center/cover"></div>
        <div class="d-wrap" style="justify-content:flex-end;background:linear-gradient(transparent 40%,rgba(10,10,11,.85))"><div style="color:#fff;display:grid;gap:10px;justify-items:start">
          <span class="d-pill hot" style="background:var(--signal);color:#141416">${T('הדמיה חיה בתלת־ממד', 'Live 3D simulation')}</span>
          <div class="d-h" style="font-size:1.5em">${T('מה קורה כשהחשמל נופל?', 'What happens when the power goes out?')}</div>
          <div style="opacity:.75;max-width:40ch">${T('לקוחות של ש. גוטובסקי לוחצים על כפתור ורואים איך הגנרטורים מתניעים. ככה מסבירים מערכת מורכבת בלי מילה אחת.', 'S. Gotovski’s customers press a button and watch the generators kick in. A complex system, explained without a single word.')}</div>
          <button class="d-btn hot d-go" type="button">${T('לנסות את ההדמיה', 'Try the simulation')}</button></div></div>`;
      $('.d-go', s).addEventListener('click', () => { location.href = T('work.html#demo', 'en-work.html#demo'); });
    }
  };

  D.seo = {
    url: 'google.com', hint: T('המחשה: איך האתר מטפס בגוגל עם תשתית נכונה', 'Illustration: how a site climbs Google on the right foundation'),
    run(s) {
      const STEPS = [[T('חודש ראשון', 'First month'), 7], [T('אחרי 3 חודשים', 'After 3 months'), 4], [T('אחרי 6 חודשים', 'After 6 months'), 2]];
      s.innerHTML = `<div class="d-wrap">
        <div class="d-input"><span style="font-size:1em"></span></div>
        <div class="d-opts d-when">${STEPS.map((t, i) => `<button class="d-opt${i ? '' : ' on'}" type="button" data-i="${i}">${t[0]}</button>`).join('')}</div>
        <div class="d-serp" style="position:relative;flex:1"></div>
        <div class="d-sub">${T('המחשה בלבד. אף אחד לא יכול להבטיח מקום בגוגל, אבל אפשר לבנות את הבסיס הכי חזק.', 'Illustration only. Nobody can guarantee a spot on Google, but you can build the strongest possible foundation.')}</div>
      </div>`;
      type($('.d-input span', s), T('קרמיקה בעבודת יד תל אביב', 'handmade ceramics tel aviv'), 45);
      const serp = $('.d-serp', s), H = 58;
      const rows = [];
      for (let i = 0; i < 7; i++) {
        const me = i === 0;
        const r = document.createElement('div'); r.className = 'd-card d-res' + (me ? ' me' : ' ghost');
        r.style.cssText = 'position:absolute;inset-inline:0;top:0';
        r.innerHTML = me ? '<div class="d-mono">noy-ceramics.co.il</div><div class="d-rt">' + T('נוי קרמיקה · כלים בעבודת יד מהסטודיו בתל אביב', 'Noy Ceramics · Handmade tableware from a Tel Aviv studio') + '</div>' : '<div class="d-mono">&nbsp;</div><div class="d-rt">' + T('תוצאה אחרת בחיפוש', 'Another search result') + '</div>';
        serp.appendChild(r); rows.push(r);
      }
      const place = (pos) => {
        const vis = Math.min(pos, 5); // מקום 6 ומטה כבר בעמוד השני
        let p = 1;
        rows.slice(1).forEach((r) => { if (p === vis) p++; r.style.transform = `translateY(${(p - 1) * H}px)`; r.style.opacity = p <= 5 ? 1 : 0; p++; });
        rows[0].style.transform = `translateY(${(vis - 1) * H}px)`;
        rows[0].querySelector('.d-mono').textContent = 'noy-ceramics.co.il · ' + (pos > 5 ? T('עמוד 2 בגוגל', 'page 2 on Google') : T('מקום ' + pos, 'position ' + pos));
      };
      const pick = (i) => { $$('.d-when .d-opt', s).forEach((b) => b.classList.toggle('on', +b.dataset.i === i)); place(STEPS[i][1]); };
      $$('.d-when .d-opt', s).forEach((b) => b.addEventListener('click', () => pick(+b.dataset.i)));
      pick(0);
      auto(() => pick(1), 2400);
      auto(() => pick(2), 4600);
    }
  };

  D.ads = {
    url: T('קמפיין קיץ · מדידה', 'Summer campaign · tracking'), hint: T('כל פנייה ורכישה נמדדות לפי המקור שלהן', 'Every lead and sale is tracked to its source'),
    run(s) {
      const st = { imp: 12400, clk: 620, lead: 41 };
      s.innerHTML = `<div class="d-wrap">
        <div class="d-row"><span class="d-h">${T('קמפיין קיץ', 'Summer campaign')}</span><span class="d-sp d-pill hot">${T('מספרים לדוגמה', 'Sample numbers')}</span></div>
        <div class="d-card d-funnel" style="padding:14px 16px">
          <div class="d-fstep"><span>${T('חשיפות', 'Impressions')}</span><div class="d-bar"><i style="width:100%"></i></div><span class="d-num d-f1"></span></div>
          <div class="d-fstep"><span>${T('קליקים', 'Clicks')}</span><div class="d-bar"><i class="d-b2"></i></div><span class="d-num d-f2"></span></div>
          <div class="d-fstep"><span>${T('פניות', 'Leads')}</span><div class="d-bar"><i class="d-b3"></i></div><span class="d-num d-f3"></span></div>
        </div>
        <div class="d-row"><span class="d-sub">${T('אירועים אחרונים', 'Recent events')}</span><span class="d-sp d-sub d-cpl"></span></div>
        <div class="d-log"></div>
      </div>`;
      const paint = () => {
        $('.d-f1', s).textContent = fmt(st.imp); $('.d-f2', s).textContent = fmt(st.clk); $('.d-f3', s).textContent = st.lead;
        $('.d-b2', s).style.width = (st.clk / st.imp * 100 * 8) + '%'; $('.d-b3', s).style.width = (st.lead / st.clk * 100 * 3) + '%';
        $('.d-cpl', s).textContent = T('עלות לפנייה: ', 'Cost per lead: ') + nis(1850 / st.lead);
      };
      const EV = EN
        ? [['WhatsApp message', 'Instagram'], ['Purchase · ₪289', 'Google'], ['Form submitted', 'Facebook'], ['Call from the site', 'Google']]
        : [['פנייה בוואטסאפ', 'אינסטגרם'], ['רכישה · 289 ₪', 'גוגל'], ['השארת פרטים', 'פייסבוק'], ['חיוג מהאתר', 'גוגל']];
      let e = 0;
      const tick = () => {
        const ev = EV[e++ % EV.length];
        st.imp += 180 + Math.floor(Math.random() * 120); st.clk += 9 + Math.floor(Math.random() * 6); st.lead += 1; paint();
        const log = $('.d-log', s), d = document.createElement('div');
        d.innerHTML = `<span class="d-check"></span><span>${ev[0]}</span><span class="d-sp d-pill">${ev[1]}</span>`;
        log.prepend(d); while (log.children.length > 3) log.lastChild.remove();
      };
      paint(); tick();
      every(tick, 2400);
    }
  };

  D.blog = {
    url: T('noy-ceramics.co.il/מגזין', 'noy-ceramics.co.il/journal'), hint: T('נסו: פרסמו מאמר חדש', 'Try it: publish a new post'),
    run(s) {
      const vals = [120, 160, 150, 230, 290, 340, 420, 510, 560, 690, 780, 910];
      const POSTS = EN
        ? ['How to choose a mug that lasts for years', 'Five ideas for a holiday table', 'Sandstone vs. porcelain: what’s the difference?', 'Guide: caring for your ceramics']
        : ['איך בוחרים ספל שיחזיק שנים', 'חמישה רעיונות לשולחן חג', 'מה ההבדל בין אבן חול לפורצלן', 'מדריך: לטפל בכלי קרמיקה'];
      s.innerHTML = `<div class="d-wrap">
        <div class="d-card d-chart"><div class="d-row"><span class="d-sub">${T('כניסות מגוגל בחודש · 12 חודשים', 'Monthly visits from Google · 12 months')}</span><span class="d-sp d-num d-v" style="font-size:1.3em"></span></div><svg viewBox="0 0 300 110" preserveAspectRatio="none" aria-hidden="true"><path class="d-area" fill="rgba(255,79,26,.14)"/><path class="d-line" fill="none" stroke="#ff4f1a" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg></div>
        <div class="d-grid d-posts" style="gap:8px"></div>
        <div class="d-row" style="margin-top:auto"><span class="d-sub">${T('המחשה', 'Illustration')}</span><button class="d-btn hot d-sp d-pub" type="button">${T('פרסום מאמר חדש', 'Publish a new post')}</button></div>
      </div>`;
      const draw = () => { const p = spark(vals, 300, 104); $('.d-line', s).setAttribute('d', p.line); $('.d-area', s).setAttribute('d', p.area); $('.d-v', s).textContent = fmt(vals[vals.length - 1]); };
      let k = 0;
      const post = (fresh) => {
        const d = document.createElement('div'); d.className = 'd-card d-order' + (fresh ? ' d-up' : '');
        d.innerHTML = `<span class="d-pill${fresh ? ' hot' : ''}">${fresh ? T('חדש', 'New') : T('מאמר', 'Post')}</span><span>${POSTS[k++ % POSTS.length]}</span>`;
        const box = $('.d-posts', s); box.prepend(d); while (box.children.length > 3) box.lastChild.remove();
      };
      post(); post(); draw();
      $('.d-pub', s).addEventListener('click', () => { post(true); const last = vals[vals.length - 1]; tween(last, last + 90, 800, (v) => { vals[vals.length - 1] = v; draw(); }); });
      auto(() => $('.d-pub', s).click(), 2200);
    }
  };

  D.news = {
    url: 'noy-ceramics.co.il', hint: T('ההרשמה נכנסת לרשימה, והמייל יוצא לבד', 'Sign-ups land on your list, and the email sends itself'),
    run(s) {
      s.innerHTML = `<div class="d-wrap" style="justify-content:center"><div class="d-card d-up" style="padding:20px;display:grid;gap:10px;max-width:380px;margin:0 auto;width:100%">
        <div class="d-h">${T('10% הנחה להזמנה הראשונה', '10% off your first order')}</div><div class="d-sub">${T('הצטרפו לרשימה וקבלו קודם את הסדרות החדשות.', 'Join the list and be first to see new collections.')}</div>
        <div class="d-row"><div class="d-input" style="flex:1"><span class="d-mono d-em"></span></div><button class="d-btn hot d-join" type="button">${T('הצטרפות', 'Join')}</button></div></div></div>`;
      const join = () => {
        const em = $('.d-em', s).textContent || 'shira@gmail.com';
        s.innerHTML = EN
          ? `<div class="d-wrap"><div class="d-row d-up"><span class="d-check"></span><span>You’re in! The email is on its way to <span class="d-mono">${em}</span></span></div>
          <div class="d-card d-up" style="flex:1;overflow:hidden;animation-delay:.5s"><div style="padding:12px 16px;border-bottom:1px solid rgba(20,20,22,.08)" class="d-sub">From: Noy Ceramics · Subject: Welcome, here’s your discount</div>
          <div style="padding:18px 16px;display:grid;gap:10px"><div style="height:110px;border-radius:10px;background:#efe9de url('work/systems/after.webp') center 35%/cover"></div><div class="d-h">So glad you’re here</div><div class="d-sub">Your code for your first order:</div><span class="d-pill hot d-mono" style="justify-self:start;font-size:1em">NOY10</span></div></div></div>`
          : `<div class="d-wrap"><div class="d-row d-up"><span class="d-check"></span><span>נרשמת! המייל כבר בדרך ל-<span class="d-mono">${em}</span></span></div>
          <div class="d-card d-up" style="flex:1;overflow:hidden;animation-delay:.5s"><div style="padding:12px 16px;border-bottom:1px solid rgba(20,20,22,.08)" class="d-sub">מאת: נוי קרמיקה · נושא: ברוכים הבאים, הנה ההנחה שלכם</div>
          <div style="padding:18px 16px;display:grid;gap:10px"><div style="height:110px;border-radius:10px;background:#efe9de url('work/systems/after.webp') center 35%/cover"></div><div class="d-h">שמחים שהצטרפתם</div><div class="d-sub">הקוד שלכם להזמנה הראשונה:</div><span class="d-pill hot d-mono" style="justify-self:start;font-size:1em">NOY10</span></div></div></div>`;
      };
      type($('.d-em', s), 'shira@gmail.com', 60);
      $('.d-join', s).addEventListener('click', () => { touched = true; join(); });
      auto(join, 2600);
    }
  };

  D.brandkit = {
    url: T('שפה מותגית · שלושה כיוונים', 'Brand identity · three directions'), hint: T('נסו: עברו בין הכיוונים', 'Try it: switch between directions'),
    run(s) {
      const B = [
        { n: T('חם', 'Warm'), bg: '#efe6d6', fg: '#3a2418', logo: '#c4552b', lc: '#fff', font: '"Frank Ruhl Libre", serif', sw: ['#c4552b', '#e9cba7', '#3a2418', '#8b9a7a'] },
        { n: T('נקי', 'Clean'), bg: '#ffffff', fg: '#111', logo: '#111', lc: '#fff', font: '"IBM Plex Sans Hebrew", sans-serif', sw: ['#111111', '#f2f2f2', '#9aa0a6', '#2f6bff'] },
        { n: T('נועז', 'Bold'), bg: '#121214', fg: '#ede8de', logo: '#ff4f1a', lc: '#121214', font: 'var(--f-display)', sw: ['#ff4f1a', '#ede8de', '#121214', '#ffb59c'] }
      ];
      s.innerHTML = `<div class="d-brand"><div class="d-brand-hero"><div class="d-logo">${T('נ', 'N')}</div><div class="d-bn" style="font-size:2.2em;line-height:1.1">${T('נוי קרמיקה', 'Noy Ceramics')}</div><div class="d-bt" style="opacity:.7">${T('כלים שנוצרו ביד, לשולחן שמספר סיפור', 'Made by hand, for a table with a story')}</div><div class="d-swatches"><i></i><i></i><i></i><i></i></div></div>
        <div class="d-brand-bar">${B.map((b, i) => `<button class="d-opt${i ? '' : ' on'}" type="button" data-i="${i}">${b.n}</button>`).join('')}</div></div>`;
      const br = $('.d-brand', s);
      let cur = 0;
      const set = (i) => {
        cur = i; const b = B[i];
        br.style.background = b.bg; br.style.color = b.fg;
        const lg = $('.d-logo', s); lg.style.background = b.logo; lg.style.color = b.lc; lg.style.fontFamily = b.font; lg.style.borderRadius = ['50%', '14px', '4px'][i];
        $('.d-bn', s).style.fontFamily = b.font;
        $$('.d-swatches i', s).forEach((el, k) => { el.style.background = b.sw[k]; });
        $$('.d-brand-bar .d-opt', s).forEach((el) => el.classList.toggle('on', +el.dataset.i === i));
      };
      $$('.d-brand-bar .d-opt', s).forEach((el) => el.addEventListener('click', () => { touched = true; set(+el.dataset.i); }));
      set(0);
      every(() => { if (!touched) set((cur + 1) % B.length); }, 2600);
    }
  };

  D.copy = {
    url: 'noy-ceramics.co.il', hint: T('אותו עסק, טקסט אחר', 'Same business, different words'),
    run(s) {
      const TX = EN ? {
        before: { h: 'Welcome to our website', p: 'We offer a wide range of quality ceramic products at attractive prices. Contact us for more details.', b: 'Contact us' },
        after: { h: 'Made by hand, for a table with a story.', p: 'Every mug is thrown on the wheel in our Tel Aviv studio and fired twice. No two are alike, and that’s the whole point.', b: 'Find yours' }
      } : {
        before: { h: 'ברוכים הבאים לאתר שלנו', p: 'אנחנו מציעים מגוון רחב של מוצרי קרמיקה איכותיים במחירים אטרקטיביים. צרו קשר לפרטים נוספים.', b: 'צור קשר' },
        after: { h: 'כלים שנוצרו ביד, לשולחן שמספר סיפור.', p: 'כל ספל נזרק על האבניים בסטודיו שלנו בתל אביב ונשרף פעמיים. אין שניים זהים, וזה בדיוק העניין.', b: 'לבחור את שלכם' }
      };
      s.innerHTML = `<div class="d-wrap"><div class="d-opts"><button class="d-opt" type="button" data-k="before">${T('לפני', 'Before')}</button><button class="d-opt" type="button" data-k="after">${T('אחרי', 'After')}</button></div>
        <div class="d-site"><h4 class="d-th"></h4><p class="d-sub d-tp" style="font-size:1em;max-width:40ch"></p><span class="d-btn d-tb" style="justify-self:start"></span></div></div>`;
      const set = (k) => {
        $$('.d-opt', s).forEach((b) => b.classList.toggle('on', b.dataset.k === k));
        const t = TX[k];
        $('.d-tb', s).textContent = t.b; $('.d-tb', s).classList.toggle('hot', k === 'after');
        $('.d-th', s).style.fontFamily = k === 'after' ? 'var(--f-display)' : 'Arial, sans-serif';
        if (k === 'after') { type($('.d-th', s), t.h, 35); $('.d-tp', s).textContent = t.p; } else { $('.d-th', s).textContent = t.h; $('.d-tp', s).textContent = t.p; }
      };
      $$('.d-opt', s).forEach((b) => b.addEventListener('click', () => set(b.dataset.k)));
      set('before');
      auto(() => set('after'), 1800);
    }
  };

  D.lang = {
    url: 'noy-ceramics.co.il', hint: T('נסו: החליפו שפה. גם הכיוון מתהפך', 'Try it: switch languages. The direction flips too'),
    run(s) {
      // הדוגמה עצמה רב־לשונית בכוונה: העברית כאן היא אחת השפות להחלפה, גם בעמוד האנגלי
      const L = {
        he: ['עברית', 'rtl', 'כלים שנוצרו ביד.', 'קרמיקה מהסטודיו בתל אביב, ישר לשולחן שלכם.', 'לחנות'],
        en: ['English', 'ltr', 'Made by hand.', 'Ceramics from our Tel Aviv studio, straight to your table.', 'Shop now'],
        ru: ['Русский', 'ltr', 'Сделано вручную.', 'Керамика из нашей студии в Тель-Авиве — прямо к вашему столу.', 'В магазин'],
        ar: ['العربية', 'rtl', 'صُنعت يدويًا.', 'خزف من الاستوديو في تل أبيب، مباشرة إلى مائدتكم.', 'إلى المتجر'],
        fr: ['Français', 'ltr', 'Fait à la main.', 'Céramiques de notre atelier de Tel-Aviv, directement à votre table.', 'Boutique']
      };
      const keys = EN ? ['en', 'he', 'ar', 'ru', 'fr'] : Object.keys(L);
      s.innerHTML = `<div class="d-wrap"><div class="d-langs">${keys.map((k) => `<button class="d-opt" type="button" data-k="${k}" lang="${k}">${L[k][0]}</button>`).join('')}</div>
        <div class="d-site"><div class="d-row" style="gap:14px"><img src="work/systems/vase.webp" alt="" width="420" height="420" style="width:120px;height:120px;object-fit:contain"><div style="display:grid;gap:10px"><h4 class="d-lh"></h4><p class="d-sub d-lp" style="font-size:1em"></p><span class="d-btn hot d-lb" style="justify-self:start"></span></div></div></div></div>`;
      let cur = 0;
      const set = (i) => {
        cur = i; const k = keys[i], site = $('.d-site', s);
        $$('.d-langs .d-opt', s).forEach((b) => b.classList.toggle('on', b.dataset.k === k));
        site.classList.add('fade');
        later(() => {
          site.dir = L[k][1]; site.lang = k;
          $('.d-lh', s).textContent = L[k][2]; $('.d-lp', s).textContent = L[k][3]; $('.d-lb', s).textContent = L[k][4];
          site.classList.remove('fade');
        }, motion ? 280 : 0);
      };
      $$('.d-langs .d-opt', s).forEach((b, i) => b.addEventListener('click', () => { touched = true; set(i); }));
      set(0);
      every(() => { if (!touched) set((cur + 1) % keys.length); }, 2200);
    }
  };

  D.migrate = {
    url: 'wix → noy-ceramics.co.il', hint: T('העמודים עוברים, וגוגל ממשיך למצוא אתכם', 'Your pages move over, and Google keeps finding you'),
    run(s) {
      const P = EN
        ? [['/about-us', '/about'], ['/shop', '/shop'], ['/blank-3', '/workshops'], ['/contact-1', '/contact'], ['/blog', '/journal'], ['/product-page/mug', '/shop/mug']]
        : [['/about-us', '/אודות'], ['/shop', '/חנות'], ['/blank-3', '/סדנאות'], ['/contact-1', '/צור-קשר'], ['/blog', '/מגזין'], ['/product-page/mug', '/חנות/ספל']];
      s.innerHTML = `<div class="d-wrap">
        <div class="d-row"><span class="d-h">${T('הגירה מ-Wix', 'Wix migration')}</span><span class="d-sp d-pill d-st">${T('מתחילים…', 'Starting…')}</span></div>
        <div class="d-bar"><i class="d-pg"></i></div>
        <div class="d-card d-scroll" style="flex:1"><table class="d-table"><thead><tr><th>${T('כתובת ישנה', 'Old URL')}</th><th>${T('כתובת חדשה', 'New URL')}</th><th>${T('הפניה', 'Redirect')}</th></tr></thead><tbody></tbody></table></div>
        <div class="d-kpis"><div class="d-card d-kpi"><span class="d-sub">${T('עמודים', 'Pages')}</span><span class="d-num d-m1">0</span></div><div class="d-card d-kpi"><span class="d-sub">${T('הפניות 301', '301 redirects')}</span><span class="d-num d-m2">0</span></div><div class="d-card d-kpi"><span class="d-sub">${T('קישורים שבורים', 'Broken links')}</span><span class="d-num">0</span></div></div>
      </div>`;
      const tb = $('tbody', s);
      P.forEach((p, i) => later(() => {
        const tr = document.createElement('tr'); tr.className = 'new';
        tr.innerHTML = `<td class="d-mono">${p[0]}</td><td>${p[1]}</td><td><span class="d-pill ok">✓</span></td>`;
        tb.appendChild(tr);
        $('.d-pg', s).style.width = ((i + 1) / P.length * 100) + '%';
        $('.d-m1', s).textContent = i + 1; $('.d-m2', s).textContent = (i + 1) * 3;
        $('.d-st', s).textContent = i + 1 < P.length ? T('מעבירים…', 'Moving…') : T('הושלם', 'Done');
        if (i + 1 === P.length) { $('.d-st', s).classList.add('ok'); toast(T('כל הכתובות הישנות מפנות לחדשות. <b>גוגל ממשיך למצוא אתכם</b>', 'Every old URL now points to its new page. <b>Google keeps finding you</b>'), 3600); }
      }, 500 + i * 520));
    }
  };

  /* ---------- ניווט ---------- */
  function run(id, force) {
    if (!D[id]) return;
    if (id === current && !force) return;
    stop(); touched = false; current = id;
    const it = items.find((b) => b.dataset.demo === id);
    urlEl.textContent = D[id].url;
    capTitle.textContent = it ? $('.sr-i-desc', it).textContent : '';
    capHint.textContent = D[id].hint;
    screen.classList.remove('is-in'); void screen.offsetWidth; screen.classList.add('is-in');
    screen.setAttribute('aria-label', T('דוגמה חיה: ', 'Live demo: ') + (it ? $('.sr-i-name', it).textContent : ''));
    if (visible) D[id].run(screen); else screen.innerHTML = '';
  }

  function playVideo(cat) {
    cats.forEach((c) => {
      const v = $('video', c);
      if (c === cat && motion && visible) {
        if (!v.src) {
          if (window.HG && HG.setVideo) HG.setVideo(v, v.dataset.src); else v.src = v.dataset.src;
          v.addEventListener('playing', () => c.classList.add('is-playing'), { once: true });
          v.addEventListener('error', () => c.classList.remove('is-playing'), { once: true });
        }
        if (window.HG && HG.playVideo) HG.playVideo(v); else { const p = v.play(); if (p && p.catch) p.catch(() => { }); }
      } else if (v.src) { if (window.HG && HG.pauseVideo) HG.pauseVideo(v); else v.pause(); }
    });
  }

  function selectCat(cat, demo) {
    cats.forEach((c) => { const on = c === cat; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on); c.tabIndex = on ? 0 : -1; });
    panels.forEach((p) => p.classList.toggle('is-on', p.dataset.cat === cat.dataset.cat));
    const panel = panels.find((p) => p.dataset.cat === cat.dataset.cat);
    const pick = demo ? $(`.sr-item[data-demo="${demo}"]`, panel) : $('.sr-item', panel);
    selectItem(pick);
    playVideo(cat);
    const rail = $('.sr-cats');
    if (rail.scrollWidth > rail.clientWidth + 4) rail.scrollTo({ left: cat.offsetLeft - (rail.clientWidth - cat.offsetWidth) / 2, behavior: motion ? 'smooth' : 'auto' });
  }

  function selectItem(btn, force) {
    if (!btn) return;
    $$('.sr-item', btn.closest('.sr-panel')).forEach((b) => { const on = b === btn; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    run(btn.dataset.demo, force);
  }

  // מעבר בין דוגמאות קשורות: מהחנות לתשלום, מהתשלום לקבלה
  function go(id, force) {
    const btn = items.find((b) => b.dataset.demo === id);
    if (!btn) return;
    const panel = btn.closest('.sr-panel'), cat = cats.find((c) => c.dataset.cat === panel.dataset.cat);
    if (!cat.classList.contains('is-on')) selectCat(cat, id); else selectItem(btn, force);
  }

  cats.forEach((c, i) => {
    c.addEventListener('click', () => { if (!c.classList.contains('is-on')) selectCat(c); });
    c.addEventListener('keydown', (e) => {
      const fwd = getComputedStyle(c).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'; // ימין לשמאל: שמאלה זה קדימה
      const back = fwd === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
      const d = e.key === fwd ? 1 : e.key === back ? -1 : 0;
      if (!d) return; e.preventDefault();
      const n = cats[(i + d + cats.length) % cats.length]; n.focus(); selectCat(n);
    });
  });
  items.forEach((b) => b.addEventListener('click', () => selectItem(b)));
  screen.addEventListener('pointerdown', () => { touched = true; });
  screen.addEventListener('keydown', () => { touched = true; });

  // רק כשהאולם על המסך: מחוץ למסך הכול עוצר, וחוזר מההתחלה כשחוזרים
  new IntersectionObserver((en) => {
    const was = visible; visible = en[0].isIntersecting;
    if (visible === was) return;
    const cat = cats.find((c) => c.classList.contains('is-on'));
    if (visible) { if (current) run(current, true); playVideo(cat); }
    else { stop(); playVideo(null); }
  }, { rootMargin: '120px 0px' }).observe(root);

  cats.forEach((c) => { c.tabIndex = c.classList.contains('is-on') ? 0 : -1; });
  selectCat(cats[0]);
})();
