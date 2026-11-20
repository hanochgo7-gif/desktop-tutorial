/* או או — סל, "שלפו קלף", לשוניות, טפסים. ללא תלויות. */
(function () {
  'use strict';
  var C = window.OUOU_CONFIG;
  var P = C.product;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var KEY = 'ouou-cart-v1';

  /* ---------- storage (may be blocked) ---------- */
  function load() { try { return Math.max(0, parseInt(localStorage.getItem(KEY), 10) || 0); } catch (e) { return memQty; } }
  function save(n) { memQty = n; try { localStorage.setItem(KEY, String(n)); } catch (e) {} }
  var memQty = 0;

  var qty = load();
  var pickQty = 1;
  var MAX = 50;

  /* ---------- static values from config ---------- */
  $$('[data-price]').forEach(function (el) { el.textContent = P.price; });
  $$('[data-phone]').forEach(function (el) { el.textContent = C.phoneDisplay; });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  var waBase = 'https://wa.me/' + C.whatsapp;
  $$('[data-wa-link]').forEach(function (a) {
    a.href = waBase + '?text=' + encodeURIComponent('היי רויטל, יש לי שאלה על המשחק או או');
    a.target = '_blank'; a.rel = 'noopener';
  });
  if (C.email) {
    var er = $('[data-email-row]'), el = $('[data-email-link]');
    if (er && el) { er.hidden = false; el.href = 'mailto:' + C.email; el.textContent = C.email; }
  }
  if (C.paymentUrl) {
    var pn = $('[data-pay-note]'); if (pn) pn.textContent = 'בלחיצה תועברו לדף תשלום מאובטח.';
    var sl = $('[data-submit-label]'); if (sl) sl.textContent = 'להמשך לתשלום';
  }

  /* ---------- header ---------- */
  var top = $('.top');
  function onScroll() { top.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg) {
    var t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, 2400);
  }

  /* ---------- cart ---------- */
  function money(n) { return n.toLocaleString('he-IL'); }
  function render() {
    var c = $('[data-cart-count]');
    c.textContent = qty; c.hidden = qty === 0;
    $('[data-cart-empty]').hidden = qty > 0;
    $('[data-cart-full]').hidden = qty === 0;
    $('[data-cart-qty-out]').textContent = qty;
    $$('[data-subtotal]').forEach(function (el) { el.textContent = money(qty * P.price); });
    var hint = $('[data-free-hint]');
    if (C.freeShippingFrom && qty > 0) {
      var left = C.freeShippingFrom - qty * P.price;
      hint.hidden = false;
      hint.textContent = left > 0 ? 'עוד ' + money(left) + ' ₪ ומשלוח חינם.' : 'המשלוח עליי.';
    } else if (hint) { hint.hidden = true; }
    renderShipSum();
  }
  function setQty(n) { qty = Math.max(0, Math.min(MAX, n)); save(qty); render(); }
  function add(n) { setQty(qty + n); openDrawer('cart'); }

  $$('[data-add]').forEach(function (b) { b.addEventListener('click', function () { add(1); }); });
  $$('[data-qty]').forEach(function (b) {
    b.addEventListener('click', function () {
      pickQty = Math.max(1, Math.min(MAX, pickQty + parseInt(b.dataset.qty, 10)));
      $('[data-qty-out]').textContent = pickQty;
    });
  });
  $('[data-add-qty]').addEventListener('click', function () { add(pickQty); });
  $$('[data-cart-qty]').forEach(function (b) {
    b.addEventListener('click', function () { setQty(qty + parseInt(b.dataset.cartQty, 10)); if (qty === 0) toast('הסל ריק'); });
  });

  /* ---------- drawer ---------- */
  var drawer = $('[data-drawer]'), scrim = $('[data-scrim]'), lastFocus = null;
  var titles = { cart: 'הסל שלכם', checkout: 'פרטי ההזמנה', done: 'ההזמנה נשלחה' };
  function view(name) {
    $$('[data-view]', drawer).forEach(function (v) { v.hidden = v.dataset.view !== name; });
    $('[data-drawer-title]').textContent = titles[name];
  }
  function openDrawer(name) {
    lastFocus = document.activeElement;
    view(name || 'cart');
    drawer.hidden = false; scrim.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var f = $('[data-view]:not([hidden]) input, [data-view]:not([hidden]) button', drawer) || $('.x', drawer); f.focus(); }, 30);
  }
  function closeDrawer() {
    drawer.hidden = true; scrim.hidden = true; document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-open-cart]').forEach(function (b) { b.addEventListener('click', function () { openDrawer('cart'); }); });
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (drawer.hidden) return;
    if (e.key === 'Escape') closeDrawer();
    if (e.key === 'Tab') { // focus trap
      var f = $$('button, a[href], input, select, textarea', drawer).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  $('[data-go-checkout]').addEventListener('click', function () { view('checkout'); $('#c-name').focus(); });
  $('[data-back]').addEventListener('click', function () { view('cart'); });

  /* ---------- checkout ---------- */
  var shipBox = $('[data-ship-options]');
  C.shipping.forEach(function (s, i) {
    var l = document.createElement('label'); l.className = 'radio';
    l.innerHTML = '<input type="radio" name="ship" value="' + s.id + '"' + (i === 0 ? ' checked' : '') + '><span></span><span></span>';
    l.children[1].textContent = s.label;
    l.children[2].textContent = s.price == null ? 'מחיר באישור' : (s.price === 0 ? 'חינם' : s.price + ' ₪');
    shipBox.appendChild(l);
  });
  function currentShip() {
    var r = $('input[name="ship"]:checked'); var id = r ? r.value : C.shipping[0].id;
    return C.shipping.filter(function (s) { return s.id === id; })[0];
  }
  function shipPrice(s) {
    if (s.price == null) return null;
    if (C.freeShippingFrom && qty * P.price >= C.freeShippingFrom) return 0;
    return s.price;
  }
  function renderShipSum() {
    var el = $('[data-ship-sum]'); if (!el) return;
    var s = currentShip(), p = shipPrice(s);
    el.textContent = p == null ? 'יאושר יחד עם ההזמנה' : (p === 0 ? 'חינם' : p + ' ₪');
    var addr = $('#c-addr'); if (addr) addr.required = s.id !== 'pickup';
  }
  shipBox.addEventListener('change', renderShipSum);

  var giftT = $('[data-gift-toggle]'), giftBox = $('[data-gift]');
  giftT.addEventListener('change', function () { giftBox.hidden = !giftT.checked; $('#c-rname').required = giftT.checked; });

  function validate(form) {
    var bad = null;
    $$('input, select, textarea', form).forEach(function (f) {
      var ok = f.checkValidity() && !(f.required && f.type !== 'checkbox' && !f.value.trim());
      if (f.type === 'tel' && f.value && !/^[0-9+\-\s()]{9,}$/.test(f.value)) ok = false;
      f.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok && !bad) bad = f;
    });
    return bad;
  }
  function labelOf(f) { var l = f.closest('label') || $('label[for="' + f.id + '"]'); return l ? l.textContent.replace(/\s*\(.*\)\s*/, '').trim() : 'שדה'; }

  var checkout = $('[data-checkout]');
  checkout.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('[data-err]', checkout);
    if (qty === 0) { err.textContent = 'הסל ריק.'; return; }
    var bad = validate(checkout);
    if (bad) {
      err.textContent = bad.name === 'agree' ? 'צריך לאשר את התקנון.' : 'נא למלא: ' + labelOf(bad);
      bad.focus(); return;
    }
    err.textContent = '';
    var d = new FormData(checkout), s = currentShip(), sp = shipPrice(s);
    var lines = [
      'הזמנה חדשה מהאתר – או או',
      '',
      'כמות: ' + qty + ' × ' + P.price + ' ₪ = ' + money(qty * P.price) + ' ₪',
      'משלוח: ' + s.label + (sp == null ? ' (מחיר לאישור)' : ' – ' + (sp === 0 ? 'חינם' : sp + ' ₪')),
      '',
      'שם: ' + d.get('name'),
      'טלפון: ' + d.get('phone')
    ];
    if (d.get('email')) lines.push('מייל: ' + d.get('email'));
    lines.push('כתובת: ' + [d.get('addr'), d.get('city')].filter(Boolean).join(', '));
    if (d.get('gift')) {
      lines.push('', 'מתנה ✓', 'למקבל: ' + d.get('rname') + (d.get('rphone') ? ', ' + d.get('rphone') : ''));
      if (d.get('note')) lines.push('ברכה: ' + d.get('note'));
    }
    var url = waBase + '?text=' + encodeURIComponent(lines.join('\n'));
    if (C.paymentUrl) { window.location.href = C.paymentUrl; return; }
    $('[data-done-link]').href = url;
    window.open(url, '_blank', 'noopener');
    setQty(0); view('done');
  });

  /* ---------- business form ---------- */
  var biz = $('[data-biz-form]');
  biz.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('[data-err]', biz), bad = validate(biz);
    if (bad) { err.textContent = 'נא למלא: ' + labelOf(bad); bad.focus(); return; }
    err.textContent = '';
    var d = new FormData(biz);
    var msg = ['פנייה מהאתר – לעסקים ומנחים', 'שם: ' + d.get('name')];
    if (d.get('org')) msg.push('ארגון: ' + d.get('org'));
    msg.push('נושא: ' + d.get('type'));
    if (d.get('size')) msg.push('כמות / משתתפים: ' + d.get('size'));
    if (d.get('msg')) msg.push('', d.get('msg'));
    window.open(waBase + '?text=' + encodeURIComponent(msg.join('\n')), '_blank', 'noopener');
    toast('פותח וואטסאפ…');
  });

  /* ---------- tabs ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(t) {
    tabs.forEach(function (x) {
      var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // RTL
      if (!d) return; var n = tabs[(i + d + tabs.length) % tabs.length]; selectTab(n); n.focus();
    });
  });

  /* ---------- draw a card ---------- */
  // הקלפים שכבר פורסמו בפלייר. להוסיף כאן קלפים נוספים רק באישור רויטל.
  var CARDS = [
    ['לשיר', 'לרקוד'],
    ['מציב גבולות', 'מאפשר'],
    ['לוקח סיכונים', 'הולך על בטוח'],
    ['לצאת חכם', 'לצאת צודק'],
    ['אוהב להיות במרכז', 'מעדיף לעמוד בצד']
  ];
  var big = $('[data-bigcard]'), status = $('[data-draw-status]'), shareBtn = $('[data-share]');
  var picks = $$('[data-pick]'), order = [], cur = -1;
  function shuffle() { order = CARDS.map(function (_, i) { return i; }); for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; } }
  function draw() {
    if (!order.length) shuffle();
    var idx = order.pop(); if (idx === cur && order.length) { order.unshift(idx); idx = order.pop(); }
    cur = idx;
    var c = CARDS[idx];
    picks[0].textContent = c[0]; picks[1].textContent = c[1];
    picks.forEach(function (p) { p.setAttribute('aria-pressed', 'false'); p.setAttribute('aria-label', 'אני יותר ' + p.textContent); });
    big.classList.remove('has-pick');
    if (big.classList.contains('is-open')) { big.classList.remove('is-shuffle'); void big.offsetWidth; big.classList.add('is-shuffle'); }
    big.classList.add('is-open');
    status.textContent = c[0] + ' או ' + c[1] + '? בחרו מה מתאר אתכם יותר.';
    $('[data-draw]').textContent = 'קלף אחר';
    shareBtn.hidden = true;
  }
  $('[data-draw]').addEventListener('click', draw);
  picks.forEach(function (p) {
    p.addEventListener('click', function () {
      picks.forEach(function (x) { x.setAttribute('aria-pressed', x === p ? 'true' : 'false'); });
      big.classList.add('has-pick');
      status.textContent = 'נבחר. עכשיו שאלו מישהו לידכם מה הוא חושב שבחרתם. בקופסה מחכים עוד 72 קלפים כאלה.';
      shareBtn.hidden = false;
    });
  });
  shareBtn.addEventListener('click', function () {
    var c = CARDS[cur];
    var text = 'בחרתי בשקט: ' + c[0] + ' או ' + c[1] + '? תנחשו מה אני יותר 😉';
    var url = location.href.split('#')[0] + '#draw';
    if (navigator.share) { navigator.share({ text: text, url: url }).catch(function () {}); }
    else { window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank', 'noopener'); }
  });

  render();
})();
