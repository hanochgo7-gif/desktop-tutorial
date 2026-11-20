/* או או — סל, הזמנה, תפריט, הסכמה ומדידה, ותכונות עמוד ("שלפו קלף", לשוניות, טפסים). ללא תלויות. */
(function () {
  'use strict';
  var C = window.OUOU_CONFIG;
  var P = C.product;
  var A = C.analytics || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var on = function (el, ev, fn) { if (el) el.addEventListener(ev, fn); };
  var MAX = P.maxPerOrder || 50;

  /* ---------- storage (may be blocked) ---------- */
  var mem = {};
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } }
  function set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }

  var qty = Math.max(0, parseInt(get('ouou-cart-v1'), 10) || 0);
  var pickQty = 1;

  /* ---------- static values from config ---------- */
  $$('[data-price]').forEach(function (el) { el.textContent = P.price; });
  $$('[data-phone]').forEach(function (el) { el.textContent = C.phoneDisplay; });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  var waBase = 'https://wa.me/' + C.whatsapp;
  function wa(text) { return waBase + '?text=' + encodeURIComponent(text); }
  $$('[data-wa-link]').forEach(function (a) { a.href = wa('היי רויטל, יש לי שאלה על המשחק או או'); a.target = '_blank'; a.rel = 'noopener'; });
  if (C.email) { var er = $('[data-email-row]'), el = $('[data-email-link]'); er.hidden = false; el.href = 'mailto:' + C.email; el.textContent = C.email; }
  if (C.instagram) { $('[data-ig-row]').hidden = false; $('[data-ig-link]').href = C.instagram; }
  if (C.paymentUrl) {
    $('[data-pay-note]').textContent = 'בלחיצה תועברו לדף תשלום מאובטח.';
    $('[data-submit-label]').textContent = 'להמשך לתשלום';
  }

  /* ---------- consent + analytics ---------- */
  var hasAnalytics = !!(A.ga4 || A.metaPixel || A.tiktokPixel);
  var consent = get('ouou-consent'); // 'yes' | 'no' | null
  function loadScript(src) { var s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }
  function startAnalytics() {
    if (A.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', A.ga4);
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + A.ga4);
    }
    if (A.metaPixel) {
      /* eslint-disable */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', A.metaPixel); window.fbq('track', 'PageView');
    }
    if (A.tiktokPixel) {
      window.ttq = window.ttq || []; var q = window.ttq;
      ['page', 'track', 'identify'].forEach(function (m) { q[m] = function () { q.push([m].concat([].slice.call(arguments))); }; });
      loadScript('https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + A.tiktokPixel + '&lib=ttq');
      q.page();
    }
  }
  // אירועי מסחר אחידים לכל הכלים
  function track(name, data) {
    if (consent !== 'yes') return;
    var value = data && data.value, map = { add_to_cart: ['AddToCart', 'AddToCart'], begin_checkout: ['InitiateCheckout', 'InitiateCheckout'], generate_lead: ['Lead', 'SubmitForm'], purchase_request: ['Purchase', 'CompletePayment'] };
    if (window.gtag) window.gtag('event', name, { currency: 'ILS', value: value });
    if (window.fbq && map[name]) window.fbq('track', map[name][0], { currency: 'ILS', value: value });
    if (window.ttq && window.ttq.track && map[name]) window.ttq.track(map[name][1], { currency: 'ILS', value: value });
  }
  var banner = $('[data-consent]');
  if (hasAnalytics) {
    $('[data-consent-open]').hidden = false;
    if (consent === 'yes') startAnalytics(); else if (!consent) banner.hidden = false;
    on($('[data-consent-yes]'), 'click', function () { consent = 'yes'; set('ouou-consent', 'yes'); banner.hidden = true; startAnalytics(); });
    on($('[data-consent-no]'), 'click', function () { consent = 'no'; set('ouou-consent', 'no'); banner.hidden = true; });
    on($('[data-consent-open]'), 'click', function () { banner.hidden = false; });
  }

  /* ---------- header + mobile menu ---------- */
  var top = $('.top');
  function onScroll() { top.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var menuBtn = $('[data-menu]'), mnav = $('#mnav');
  function setMenu(open) { menuBtn.setAttribute('aria-expanded', open); mnav.hidden = !open; document.body.classList.toggle('menu-open', open); }
  on(menuBtn, 'click', function () { setMenu(mnav.hidden); });
  $$('a', mnav).forEach(function (a) { on(a, 'click', function () { setMenu(false); }); });

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg) {
    var t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, 2400);
  }

  /* ---------- cart ---------- */
  function money(n) { return n.toLocaleString('he-IL'); }
  function subtotal() { return qty * P.price; }
  function render() {
    var c = $('[data-cart-count]'); c.textContent = qty; c.hidden = qty === 0;
    $('[data-cart-empty]').hidden = qty > 0;
    $('[data-cart-full]').hidden = qty === 0;
    $('[data-cart-qty-out]').textContent = qty;
    $$('[data-subtotal]').forEach(function (el) { el.textContent = money(subtotal()); });
    var hint = $('[data-free-hint]');
    if (C.freeShippingFrom && qty > 0) {
      var left = C.freeShippingFrom - subtotal();
      hint.hidden = false;
      hint.textContent = left > 0 ? 'עוד ' + money(left) + ' ₪ והמשלוח עלינו.' : 'המשלוח עלינו.';
    } else hint.hidden = true;
    renderShip();
  }
  function setQty(n) { qty = Math.max(0, Math.min(MAX, n)); set('ouou-cart-v1', String(qty)); render(); }
  function add(n) { setQty(qty + n); track('add_to_cart', { value: n * P.price }); openDrawer('cart'); }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]'); if (b) { setMenu(false); add(1); }
  });
  $$('[data-qty]').forEach(function (b) {
    on(b, 'click', function () { pickQty = Math.max(1, Math.min(MAX, pickQty + parseInt(b.dataset.qty, 10))); $('[data-qty-out]').textContent = pickQty; });
  });
  on($('[data-add-qty]'), 'click', function () { add(pickQty); });
  $$('[data-cart-qty]').forEach(function (b) {
    on(b, 'click', function () { setQty(qty + parseInt(b.dataset.cartQty, 10)); if (qty === 0) toast('הסל ריק'); });
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
    drawer.hidden = false; scrim.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(function () { ($('[data-view]:not([hidden]) input, [data-view]:not([hidden]) button', drawer) || $('.x', drawer)).focus(); }, 30);
  }
  function closeDrawer() {
    drawer.hidden = true; scrim.hidden = true; document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$('[data-open-cart]').forEach(function (b) { on(b, 'click', function () { openDrawer('cart'); }); });
  $$('[data-close]').forEach(function (b) { on(b, 'click', closeDrawer); });
  on(scrim, 'click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !mnav.hidden) setMenu(false);
    if (drawer.hidden) return;
    if (e.key === 'Escape') closeDrawer();
    if (e.key === 'Tab') {
      var f = $$('button, a[href], input, select, textarea', drawer).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  on($('[data-go-checkout]'), 'click', function () { view('checkout'); track('begin_checkout', { value: subtotal() }); $('#c-name').focus(); });
  on($('[data-back]'), 'click', function () { view('cart'); });
  if (location.hash === '#cart') openDrawer('cart');

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
    var r = $('input[name="ship"]:checked'), id = r ? r.value : C.shipping[0].id;
    return C.shipping.filter(function (s) { return s.id === id; })[0];
  }
  function shipPrice(s) {
    if (C.freeShippingFrom && subtotal() >= C.freeShippingFrom) return 0;
    return s.price;
  }
  function renderShip() {
    var s = currentShip(), p = shipPrice(s);
    $('[data-ship-sum]').textContent = p == null ? 'יאושר יחד עם ההזמנה' : (p === 0 ? 'חינם' : p + ' ₪');
    var tr = $('[data-total-row]'); tr.hidden = p == null;
    if (p != null) $('[data-total]').textContent = money(subtotal() + p);
    $('#c-addr').required = !!s.needsAddress;
  }
  on(shipBox, 'change', renderShip);

  var giftT = $('[data-gift-toggle]'), giftBox = $('[data-gift]');
  on(giftT, 'change', function () { giftBox.hidden = !giftT.checked; $('#c-rname').required = giftT.checked; });

  function validate(form) {
    var bad = null;
    $$('input, select, textarea', form).forEach(function (f) {
      if (f.type === 'radio') return;
      var ok = f.checkValidity() && !(f.required && f.type !== 'checkbox' && !f.value.trim());
      if (f.type === 'tel' && f.value && !/^[0-9+\-\s()]{9,}$/.test(f.value)) ok = false;
      f.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok && !bad) bad = f;
    });
    return bad;
  }
  function labelOf(f) { var l = $('label[for="' + f.id + '"]') || f.closest('label'); return l ? l.textContent.replace(/\s*\(.*\)\s*/, '').trim() : 'שדה'; }
  function orderId() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return 'OU-' + p(d.getDate()) + p(d.getMonth() + 1) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  var checkout = $('[data-checkout]');
  on(checkout, 'submit', function (e) {
    e.preventDefault();
    var err = $('[data-err]', checkout);
    if (qty === 0) { err.textContent = 'הסל ריק.'; return; }
    var bad = validate(checkout);
    if (bad) { err.textContent = bad.name === 'agree' ? 'צריך לאשר את התקנון.' : 'נא למלא: ' + labelOf(bad); bad.focus(); return; }
    err.textContent = '';
    var d = new FormData(checkout), s = currentShip(), sp = shipPrice(s), id = orderId();
    var lines = [
      'הזמנה חדשה מהאתר – או או', 'מספר הזמנה: ' + id, '',
      'כמות: ' + qty + ' × ' + P.price + ' ₪ = ' + money(subtotal()) + ' ₪',
      'משלוח: ' + s.label + (sp == null ? ' (מחיר לאישור)' : ' – ' + (sp === 0 ? 'חינם' : sp + ' ₪'))
    ];
    if (sp != null) lines.push('סה"כ: ' + money(subtotal() + sp) + ' ₪');
    lines.push('', 'שם: ' + d.get('name'), 'טלפון: ' + d.get('phone'));
    if (d.get('email')) lines.push('מייל: ' + d.get('email'));
    lines.push('כתובת: ' + [d.get('addr'), d.get('city')].filter(Boolean).join(', '));
    if (d.get('gift')) {
      lines.push('', '🎁 מתנה', 'למקבל: ' + d.get('rname') + (d.get('rphone') ? ', ' + d.get('rphone') : ''));
      if (d.get('note')) lines.push('ברכה: ' + d.get('note'));
    }
    if (d.get('notes')) lines.push('', 'הערות: ' + d.get('notes'));
    track('purchase_request', { value: subtotal() });
    if (C.paymentUrl) {
      window.location.href = C.paymentUrl.replace('{total}', subtotal() + (sp || 0)).replace('{order}', id);
      return;
    }
    var url = wa(lines.join('\n'));
    $('[data-order-id]').textContent = id;
    $('[data-done-link]').href = url;
    window.open(url, '_blank', 'noopener');
    setQty(0); checkout.reset(); giftBox.hidden = true; view('done');
  });

  /* ---------- lead forms (business / workshops) ---------- */
  $$('[data-lead-form]').forEach(function (form) {
    on(form, 'submit', function (e) {
      e.preventDefault();
      var err = $('[data-err]', form), bad = validate(form);
      if (bad) { err.textContent = 'נא למלא: ' + labelOf(bad); bad.focus(); return; }
      err.textContent = '';
      var msg = [form.dataset.leadForm || 'פנייה מהאתר'];
      $$('input, select, textarea', form).forEach(function (f) {
        if (f.value && f.value.trim()) msg.push(labelOf(f) + ': ' + f.value.trim());
      });
      track('generate_lead');
      window.open(wa(msg.join('\n')), '_blank', 'noopener');
      toast('פותח וואטסאפ…');
    });
  });
  // מילוי מראש מכפתורים כמו "הפעלה מונחית"
  $$('[data-lead-type]').forEach(function (b) {
    on(b, 'click', function () { var s = $('#b-type'); if (s) s.value = b.dataset.leadType; });
  });

  /* ---------- tabs ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(t) {
    tabs.forEach(function (x) {
      var sel = x === t; x.setAttribute('aria-selected', sel); x.tabIndex = sel ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !sel;
    });
  }
  tabs.forEach(function (t, i) {
    on(t, 'click', function () { selectTab(t); });
    on(t, 'keydown', function (e) {
      var d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // RTL
      if (!d) return; var n = tabs[(i + d + tabs.length) % tabs.length]; selectTab(n); n.focus();
    });
  });

  /* ---------- print rules ---------- */
  on($('[data-print]'), 'click', function () {
    $$('.panel').forEach(function (p) { p.dataset.wasHidden = p.hidden; p.hidden = false; });
    window.print();
    $$('.panel').forEach(function (p) { p.hidden = p.dataset.wasHidden === 'true'; });
  });

  /* ---------- how-to-play video: captions follow the clip ---------- */
  var vid = $('[data-howto-video]');
  if (vid) {
    var caps = $$('[data-cue]');
    on(vid, 'timeupdate', function () {
      var t = vid.currentTime, active = null;
      caps.forEach(function (c) { if (t >= parseFloat(c.dataset.cue)) active = c; });
      caps.forEach(function (c) { c.classList.toggle('is-on', c === active); });
    });
    caps.forEach(function (c) { on(c, 'click', function () { vid.currentTime = parseFloat(c.dataset.cue) + .05; vid.play(); }); });
  }

  /* ---------- draw a card ---------- */
  var big = $('[data-bigcard]');
  if (big) {
    // הקלפים שכבר פורסמו בפלייר. להוסיף קלפים נוספים רק באישור רויטל.
    var CARDS = [
      ['לשיר', 'לרקוד'], ['מציב גבולות', 'מאפשר'], ['לוקח סיכונים', 'הולך על בטוח'],
      ['לצאת חכם', 'לצאת צודק'], ['אוהב להיות במרכז', 'מעדיף לעמוד בצד']
    ];
    var status = $('[data-draw-status]'), shareBtn = $('[data-share]'), picks = $$('[data-pick]'), order = [], cur = -1;
    var shuffle = function () { order = CARDS.map(function (_, i) { return i; }); for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; } };
    on($('[data-draw]'), 'click', function () {
      if (!order.length) shuffle();
      var idx = order.pop(); if (idx === cur && order.length) { order.unshift(idx); idx = order.pop(); }
      cur = idx; var c = CARDS[idx];
      picks[0].textContent = c[0]; picks[1].textContent = c[1];
      picks.forEach(function (p) { p.setAttribute('aria-pressed', 'false'); p.setAttribute('aria-label', 'אני יותר ' + p.textContent); });
      big.classList.remove('has-pick');
      if (big.classList.contains('is-open')) { big.classList.remove('is-shuffle'); void big.offsetWidth; big.classList.add('is-shuffle'); }
      big.classList.add('is-open');
      status.textContent = c[0] + ' או ' + c[1] + '? בחרו מה מתאר אתכם יותר.';
      this.textContent = 'קלף אחר';
      shareBtn.hidden = true;
    });
    picks.forEach(function (p) {
      on(p, 'click', function () {
        if (cur < 0) return;
        picks.forEach(function (x) { x.setAttribute('aria-pressed', x === p ? 'true' : 'false'); });
        big.classList.add('has-pick');
        status.textContent = 'נבחר. עכשיו שאלו מישהו לידכם מה הוא חושב שבחרתם. בקופסה מחכים עוד 72 קלפים כאלה.';
        shareBtn.hidden = false;
      });
    });
    on(shareBtn, 'click', function () {
      var c = CARDS[cur], text = 'בחרתי בשקט: ' + c[0] + ' או ' + c[1] + '? תנחשו מה אני יותר 😉', url = location.href.split('#')[0] + '#draw';
      if (navigator.share) navigator.share({ text: text, url: url }).catch(function () {});
      else window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank', 'noopener');
    });
  }

  render();
})();
