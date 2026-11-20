/* או או — סל, הזמנה, תפריט, הסכמה ומדידה, ותכונות עמוד. ללא תלויות. */
(function () {
  'use strict';
  var C = window.OUOU_CONFIG;
  var P = C.product;
  var A = C.analytics || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var on = function (el, ev, fn) { if (el) el.addEventListener(ev, fn); };
  var MAX = P.maxPerOrder || 50;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- storage: local → session → memory ---------- */
  var mem = {}, store = null;
  ['localStorage', 'sessionStorage'].some(function (k) {
    try { var s = window[k]; s.setItem('__t', '1'); s.removeItem('__t'); store = s; return true; } catch (e) { return false; }
  });
  function get(k) { try { return store ? store.getItem(k) : mem[k] || null; } catch (e) { return mem[k] || null; } }
  function set(k, v) { mem[k] = v; try { if (store) store.setItem(k, v); } catch (e) {} }

  var qty = Math.max(0, parseInt(get('ouou-cart-v1'), 10) || 0);
  var pending = null; try { pending = JSON.parse(get('ouou-pending') || 'null'); } catch (e) {}
  function setPending(p) { pending = p; set('ouou-pending', p ? JSON.stringify(p) : ''); }
  var pickQty = 1;

  /* ---------- static values from config ---------- */
  $$('[data-price]').forEach(function (el) { el.textContent = P.price; });
  $$('[data-phone]').forEach(function (el) { el.textContent = C.phoneDisplay; });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  $$('[data-tel]').forEach(function (a) { a.href = 'tel:' + C.phoneDisplay.replace(/\D/g, ''); });
  var waBase = 'https://api.whatsapp.com/send?phone=' + C.whatsapp;
  function wa(text) { return waBase + '&text=' + encodeURIComponent(text); }
  $$('[data-wa-link]').forEach(function (a) { a.href = wa('היי רויטל, יש לי שאלה על המשחק או או'); a.target = '_blank'; a.rel = 'noopener'; });
  if (C.email) { var er = $('[data-email-row]'), el = $('[data-email-link]'); er.hidden = false; el.href = 'mailto:' + C.email; el.textContent = C.email; }
  if (C.instagram) { $('[data-ig-row]').hidden = false; $('[data-ig-link]').href = C.instagram; }
  if (C.paymentUrl) {
    $('[data-pay-note]').innerHTML = '<b>תשלום מאובטח.</b> בלחיצה תועברו לדף התשלום של חברת הסליקה.';
    $('[data-submit-label]').textContent = 'להמשך לתשלום מאובטח';
  }

  /* ---------- consent + analytics ---------- */
  var hasAnalytics = !!(A.ga4 || A.metaPixel || A.tiktokPixel);
  var consent = get('ouou-consent');
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
  function setMenu(open, refocus) {
    menuBtn.setAttribute('aria-expanded', open); mnav.hidden = !open; document.body.classList.toggle('menu-open', open);
    if (!open && refocus) menuBtn.focus();
  }
  on(menuBtn, 'click', function () { setMenu(mnav.hidden); });
  $$('a', mnav).forEach(function (a) { on(a, 'click', function () { setMenu(false); }); });

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg) {
    var t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- cart ---------- */
  function money(n) { return n.toLocaleString('he-IL'); }
  function subtotal() { return qty * P.price; }
  function render() {
    var c = $('[data-cart-count]'); c.textContent = qty; c.hidden = qty === 0;
    $('[data-cart-empty]').hidden = qty > 0;
    $('[data-cart-full]').hidden = qty === 0;
    $$('[data-cart-qty-out]').forEach(function (o) { o.textContent = qty; });
    $$('[data-subtotal]').forEach(function (el) { el.textContent = money(subtotal()); });
    var hint = $('[data-free-hint]');
    if (C.freeShippingFrom && qty > 0) {
      var left = C.freeShippingFrom - subtotal();
      hint.hidden = false;
      hint.textContent = left > 0 ? 'עוד ' + money(left) + ' ₪ והמשלוח עלינו.' : 'המשלוח עלינו.';
    } else hint.hidden = true;
    renderShip();
  }
  var warnedStorage = false;
  function setQty(n) {
    qty = Math.max(0, Math.min(MAX, n)); set('ouou-cart-v1', String(qty)); render();
    if (!store && qty > 0 && !warnedStorage) { warnedStorage = true; toast('הדפדפן חוסם שמירה: הסל נשמר רק בעמוד הזה'); }
  }
  // "להזמנה": one product, so go straight to the details form
  function showPending() {
    $('[data-order-id]').textContent = pending.id; $('[data-done-link]').href = pending.url;
    openDrawer('done'); doneAt = Date.now();
  }
  function order(n) {
    if (pending && qty > 0 && !n) { showPending(); return; }
    if (n) setQty(n); else if (qty === 0) setQty(1);
    track('add_to_cart', { value: subtotal() });
    openDrawer('checkout');
    track('begin_checkout', { value: subtotal() });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-order], [data-add]'); if (!b) return;
    setMenu(false); order();
  });
  $$('[data-qty]').forEach(function (b) {
    on(b, 'click', function () { pickQty = Math.max(1, Math.min(MAX, pickQty + parseInt(b.dataset.qty, 10))); $('[data-qty-out]').textContent = pickQty; });
  });
  on($('[data-add-qty]'), 'click', function () { order(pickQty); });
  $$('[data-cart-qty]').forEach(function (b) {
    on(b, 'click', function () {
      var n = qty + parseInt(b.dataset.cartQty, 10);
      if (n < 1 && !$('[data-view="checkout"]').hidden) n = 1; // keep at least one inside the form
      setQty(n); if (qty === 0) toast('הסל ריק');
    });
  });

  /* ---------- drawer ---------- */
  var drawer = $('[data-drawer]'), scrim = $('[data-scrim]'), lastFocus = null, closeT, openedAt = 0, doneAt = 0;
  var titles = { cart: 'הסל שלכם', checkout: 'פרטים למשלוח', done: 'נשאר לשלוח בוואטסאפ', thanks: 'ההזמנה נשלחה' };
  function view(name) {
    $$('[data-view]', drawer).forEach(function (v) { v.hidden = v.dataset.view !== name; });
    $('[data-drawer-title]').textContent = titles[name];
    var b = $('.drawer__body:not([hidden])', drawer); if (b && !drawer.hidden) b.scrollTop = 0;
  }
  function focusHead() { setTimeout(function () { $('[data-drawer-title]').focus(); }, 30); }
  function openDrawer(name) {
    clearTimeout(closeT); drawer.classList.remove('is-closing'); scrim.classList.remove('is-closing');
    if (drawer.hidden) { lastFocus = document.activeElement; if (lastFocus && lastFocus.closest && lastFocus.closest('#mnav')) lastFocus = menuBtn; }
    openedAt = Date.now();
    view(name || 'cart');
    drawer.hidden = false; scrim.hidden = false; document.body.style.overflow = 'hidden';
    var body = $('.drawer__body:not([hidden])', drawer); if (body) body.scrollTop = 0;
    document.body.classList.add('drawer-open');
    focusHead();
  }
  function closeDrawer() {
    if (drawer.hidden || drawer.classList.contains('is-closing')) return;
    drawer.classList.add('is-closing'); scrim.classList.add('is-closing');
    document.body.style.overflow = ''; document.body.classList.remove('drawer-open');
    clearTimeout(closeT);
    closeT = setTimeout(function () {
      drawer.hidden = true; scrim.hidden = true;
      drawer.classList.remove('is-closing'); scrim.classList.remove('is-closing');
    }, reduce ? 0 : 220);
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
  }
  $$('[data-open-cart]').forEach(function (b) { on(b, 'click', function () { if (pending && qty > 0) showPending(); else openDrawer('cart'); }); });
  $$('[data-close]').forEach(function (b) { on(b, 'click', closeDrawer); });
  on(scrim, 'click', function () { if (Date.now() - openedAt > 450) closeDrawer(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !mnav.hidden) { setMenu(false, true); return; }
    if (drawer.hidden) return;
    if (e.key === 'Escape') closeDrawer();
    if (e.key === 'Tab') {
      var f = $$('button, a[href], input, select, textarea, summary, [tabindex="-1"]', drawer).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  on($('[data-go-checkout]'), 'click', function () { view('checkout'); track('begin_checkout', { value: subtotal() }); focusHead(); });
  on($('[data-back]'), 'click', function () { view('cart'); setTimeout(function () { $('[data-go-checkout]').focus(); }, 30); });
  if (location.hash === '#cart') openDrawer('cart');
  if (location.hash === '#order') order();

  /* ---------- checkout ---------- */
  var checkout = $('[data-checkout]');
  var shipBox = $('[data-ship-options]');
  C.shipping.forEach(function (s, i) {
    var l = document.createElement('label'); l.className = 'radio';
    l.innerHTML = '<input type="radio" name="ship" value="' + s.id + '"' + (i === 0 ? ' checked' : '') + '><span></span><span></span>';
    l.children[1].textContent = s.label;
    l.children[2].textContent = s.price == null ? 'מחיר יאושר בוואטסאפ' : (s.price === 0 ? 'חינם' : s.price + ' ₪');
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
  var giftT = $('[data-gift-toggle]'), giftBox = $('[data-gift]');
  function renderShip() {
    var s = currentShip(), p = shipPrice(s), gift = giftT && giftT.checked;
    $('[data-ship-sum]').textContent = p == null ? 'מאושר לפני התשלום' : (p === 0 ? 'חינם' : p + ' ₪');
    var tr = $('[data-total-row]'); tr.hidden = p == null;
    if (p != null) $('[data-total]').textContent = money(subtotal() + p);
    var addr = $('#c-addr'), addrField = $('[data-field="addr"]');
    addr.required = !!s.needsAddress;
    addrField.hidden = !s.needsAddress;
    $('[data-city-label]').textContent = !s.needsAddress
      ? (gift ? 'עיר של המקבל/ת (לנקודת איסוף קרובה אליו/ה)' : 'עיר (כדי למצוא נקודת איסוף קרובה)')
      : (gift ? 'עיר של המקבל/ת' : 'עיר');
    $('[data-addr-label]').textContent = gift ? 'כתובת המקבל/ת: רחוב ומספר בית' : 'רחוב ומספר בית';
  }
  on(shipBox, 'change', renderShip);
  on(giftT, 'change', function () {
    giftBox.hidden = !giftT.checked;
    $('#c-rname').required = giftT.checked; $('#c-rphone').required = giftT.checked;
    renderShip();
  });

  /* validation: specific messages, under each field, all at once */
  function phoneOk(v) {
    var d = v.replace(/\D/g, '').replace(/^972/, '0');
    return /^0(5\d{8}|[2-489]\d{7}|7\d{8})$/.test(d) && !/(\d)\1{6}$/.test(d);
  }
  var MSG = {
    name: 'נא לכתוב שם מלא', phone: 'נא לכתוב מספר טלפון', city: 'נא לכתוב עיר', addr: 'נא לכתוב רחוב ומספר בית',
    rname: 'נא לכתוב את שם המקבל/ת', rphone: 'נא לכתוב את הטלפון של המקבל/ת', org: 'נא לכתוב שם', agree: 'צריך לאשר את התקנון כדי להמשיך'
  };
  function errFor(f) {
    var v = (f.value || '').trim();
    if (f.type === 'checkbox') return f.required && !f.checked ? (MSG[f.name] || 'נא לסמן') : '';
    if (f.closest('[hidden]')) return '';
    if (f.required && !v) return MSG[f.name] || 'נא למלא את השדה';
    if (v && f.type === 'tel' && !phoneOk(v)) return 'המספר לא תקין. לדוגמה: 050-1234567';
    if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'כתובת המייל לא תקינה. לדוגמה: name@gmail.com';
    return '';
  }
  function showErr(f, msg) {
    f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var box = f.id && document.getElementById(f.id + '-err');
    if (!box && f.name === 'agree') box = $('#c-agree-err');
    if (box) box.textContent = msg;
  }
  function recount(form) {
    var n = $$('[aria-invalid="true"]', form).filter(function (f) { return !f.closest('[hidden]'); }).length, err = $('[data-err]', form);
    if (err) err.textContent = !n ? '' : n === 1 ? 'נשאר שדה אחד לתיקון' : 'נשארו ' + n + ' שדות לתיקון';
  }
  function validate(form) {
    var bad = [];
    $$('input, select, textarea', form).forEach(function (f) {
      if (f.type === 'radio') return;
      var m = errFor(f); showErr(f, m); if (m) bad.push(f);
    });
    form.dataset.tried = '1';
    return bad;
  }
  [checkout].concat($$('[data-lead-form]')).forEach(function (form) {
    // live: only clear or reword an error that is already shown — never add one mid-interaction (no layout jumps)
    on(form, 'input', function (e) {
      var f = e.target; if (!form.dataset.tried || f.getAttribute('aria-invalid') !== 'true') return;
      var m = errFor(f); if (!m) showErr(f, '');
      recount(form);
    });
    on(form, 'focusout', function (e) {
      var f = e.target; if (!form.dataset.tried || f.getAttribute('aria-invalid') !== 'true' || !f.matches('input, textarea')) return;
      var m = errFor(f); if (m) showErr(f, m);
    });
    on(form, 'change', function (e) { if (form.dataset.tried && e.target.type === 'checkbox' && e.target.checked) { showErr(e.target, ''); recount(form); } });
  });

  function orderId() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return 'OU-' + p(d.getDate()) + p(d.getMonth() + 1) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  on(checkout, 'submit', function (e) {
    e.preventDefault();
    var err = $('[data-err]', checkout);
    if (qty === 0) setQty(1);
    var bad = validate(checkout);
    if (bad.length) {
      err.textContent = bad.length === 1 ? 'יש שדה אחד לתיקון' : 'יש ' + bad.length + ' שדות לתיקון';
      bad[0].focus(); return;
    }
    err.textContent = '';
    var d = new FormData(checkout), s = currentShip(), sp = shipPrice(s), id = orderId(), gift = !!d.get('gift');
    var lines = [
      'היי רויטל, הזמנה חדשה מהאתר', 'מספר הזמנה: ' + id, '',
      'או או × ' + qty + ' = ' + money(subtotal()) + ' ₪',
      'משלוח: ' + s.label + (sp == null ? ' (מחיר לאישור)' : ' – ' + (sp === 0 ? 'חינם' : sp + ' ₪'))
    ];
    if (sp != null) lines.push('סה"כ: ' + money(subtotal() + sp) + ' ₪');
    lines.push('', 'שם: ' + d.get('name'), 'טלפון: ' + d.get('phone'));
    if (d.get('email')) lines.push('מייל לקבלה: ' + d.get('email'));
    if (gift) {
      lines.push('', '*מתנה – לשלוח ישר למקבל/ת*', 'שם המקבל/ת: ' + d.get('rname'), 'טלפון המקבל/ת: ' + d.get('rphone'));
      if (d.get('note')) lines.push('ברכה: ' + d.get('note'));
    }
    lines.push((gift ? 'כתובת למשלוח (המקבל/ת): ' : 'כתובת למשלוח: ') + [s.needsAddress ? d.get('addr') : '', d.get('city')].filter(Boolean).join(', ') + (s.needsAddress ? '' : ' (נקודת איסוף)'));
    if (d.get('notes')) lines.push('', 'הערות: ' + d.get('notes'));
    track('purchase_request', { value: subtotal() });
    if (C.paymentUrl) { window.location.href = C.paymentUrl.replace('{total}', subtotal() + (sp || 0)).replace('{order}', id); return; }
    var url = wa(lines.join('\n'));
    setPending({ id: id, url: url });
    $('[data-order-id]').textContent = id;
    $('[data-done-link]').href = url;
    window.open(url, '_blank', 'noopener');
    view('done'); focusHead(); doneAt = Date.now();   // the cart stays until the customer confirms they sent it
  });
  on($('[data-edit-order]'), 'click', function () { view('checkout'); focusHead(); });
  on($('[data-sent]'), 'click', function () {
    if (Date.now() - doneAt < 900) return; // a double-tap on submit must not confirm
    setPending(null);
    setQty(0); checkout.reset(); delete checkout.dataset.tried; giftBox.hidden = true;
    $$('.field__err', checkout).forEach(function (b) { b.textContent = ''; });
    renderShip(); view('thanks'); focusHead();
  });

  /* ---------- lead forms (business / workshops) ---------- */
  $$('[data-lead-form]').forEach(function (form) {
    on(form, 'submit', function (e) {
      e.preventDefault();
      var err = $('[data-err]', form), bad = validate(form);
      if (bad.length) { err.textContent = bad.length === 1 ? 'יש שדה אחד לתיקון' : 'יש ' + bad.length + ' שדות לתיקון'; bad[0].focus(); return; }
      err.textContent = '';
      var msg = ['היי רויטל, ' + (form.dataset.leadForm || 'פנייה מהאתר')];
      $$('input, select, textarea', form).forEach(function (f) {
        var l = $('label[for="' + f.id + '"]');
        if (f.value && f.value.trim()) msg.push((f.dataset.msg || (l ? l.textContent.replace(/\s*\(.*\)\s*/, '').replace(/\?$/, '').trim() : f.name)) + ': ' + f.value.trim());
      });
      track('generate_lead');
      var url = wa(msg.join('\n'));
      window.open(url, '_blank', 'noopener');
      var done = document.createElement('div'); done.className = 'lead-done'; done.setAttribute('tabindex', '-1');
      done.innerHTML = '<p class="done__h">עוד צעד אחד: שולחים את ההודעה בוואטסאפ</p><p>פתחנו וואטסאפ עם הפרטים. הפנייה מגיעה לרויטל רק אחרי שלוחצים <b>״שליחה״</b> שם.</p>' +
        '<p><a class="btn btn--main" target="_blank" rel="noopener">פתיחת וואטסאפ שוב</a></p>';
      $('a', done).href = url;
      form.hidden = true; form.parentNode.insertBefore(done, form.nextSibling); done.focus();
    });
  });
  $$('[data-lead-type]').forEach(function (b) {
    on(b, 'click', function () { var s = $('#b-type'); if (s) s.value = b.dataset.leadType; setTimeout(function () { var n = $('#b-name'); if (n) n.focus({ preventScroll: true }); }, 400); });
  });

  /* ---------- sticky mobile buy bar ---------- */
  var bar = $('[data-buybar]'), anchor = $('.hero, .phero');
  if (bar && 'IntersectionObserver' in window) {
    var heroVisible = true, nearBuy = false;
    var update = function () {
      var show = !heroVisible && !nearBuy;
      bar.classList.toggle('is-on', show); bar.setAttribute('aria-hidden', !show);
      $('button', bar).tabIndex = show ? 0 : -1;
      document.body.classList.toggle('has-buybar', show);
    };
    if (anchor) new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting; update(); }).observe(anchor);
    var seen = new Map();
    var io2 = new IntersectionObserver(function (es) { es.forEach(function (x) { seen.set(x.target, x.isIntersecting); }); nearBuy = Array.from(seen.values()).some(Boolean); update(); });
    $$('#buy, .last, #lead, .box-strip, #business, .biz').forEach(function (el) { io2.observe(el); });
  }

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

  /* ---------- how-to-play video: pause control, captions follow the clip ---------- */
  var vid = $('[data-howto-video]');
  if (vid) {
    var pp = $('[data-vid-toggle]');
    var sync = function () { if (pp) { pp.classList.toggle('is-paused', vid.paused); pp.querySelector('span').textContent = vid.paused ? 'הפעלת הסרטון' : 'השהיית הסרטון'; } };
    if (reduce) { vid.removeAttribute('autoplay'); vid.pause(); }
    on(pp, 'click', function () { if (vid.paused) vid.play(); else vid.pause(); });
    on(vid, 'play', sync); on(vid, 'pause', sync); sync();
    var caps = $$('[data-cue]');
    on(vid, 'timeupdate', function () {
      var t = vid.currentTime, active = null;
      caps.forEach(function (c) { if (t >= parseFloat(c.dataset.cue)) active = c; });
      caps.forEach(function (c) { c.classList.toggle('is-on', c === active); });
    });
    caps.forEach(function (c) {
      c.setAttribute('role', 'button');
      on(c, 'click', function () { vid.currentTime = parseFloat(c.dataset.cue) + .05; });
      on(c, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } });
    });
  }

  /* ---------- draw a card ---------- */
  var big = $('[data-bigcard]');
  if (big) {
    // הקלפים שכבר פורסמו בפלייר. להוסיף קלפים נוספים רק באישור רויטל.
    var CARDS = [
      ['לשיר', 'לרקוד'], ['מציב גבולות', 'מאפשר'], ['לוקח סיכונים', 'הולך על בטוח'],
      ['לצאת חכם', 'לצאת צודק'], ['אוהב להיות במרכז', 'מעדיף לעמוד בצד']
    ];
    var status = $('[data-draw-status]'), shareBtn = $('[data-share]'), picks = $$('[data-pick]'), order_ = [], cur = -1;
    var front = $('.bigcard__front', big); front.inert = true;
    var shuffle = function () { order_ = CARDS.map(function (_, i) { return i; }); for (var i = order_.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order_[i]; order_[i] = order_[j]; order_[j] = t; } };
    on($('[data-draw]'), 'click', function () {
      if (!order_.length) shuffle();
      var idx = order_.pop(); if (idx === cur && order_.length) { order_.unshift(idx); idx = order_.pop(); }
      cur = idx; var c = CARDS[idx];
      picks[0].textContent = c[0]; picks[1].textContent = c[1];
      picks.forEach(function (p) { p.setAttribute('aria-pressed', 'false'); p.setAttribute('aria-label', 'אני יותר ' + p.textContent); });
      front.inert = false;
      big.classList.remove('has-pick');
      if (big.classList.contains('is-open')) { big.classList.remove('is-shuffle'); void big.offsetWidth; big.classList.add('is-shuffle'); }
      big.classList.add('is-open');
      status.textContent = c[0] + ' או ' + c[1] + '? הקישו על המילה שמתארת אתכם יותר.';
      this.textContent = 'קלף אחר';
      shareBtn.hidden = true;
    });
    picks.forEach(function (p) {
      on(p, 'click', function () {
        if (cur < 0) return;
        picks.forEach(function (x) { x.setAttribute('aria-pressed', x === p ? 'true' : 'false'); });
        big.classList.add('has-pick');
        status.textContent = 'נבחר. עכשיו שאלו מישהו לידכם מה הוא חושב שבחרתם. ככה נראה כל תור במשחק, ובקופסה מחכים עוד 72 קלפים.';
        shareBtn.hidden = false; var ob = $('[data-draw-order]'); if (ob) ob.hidden = false;
      });
    });
    on(shareBtn, 'click', function () {
      var c = CARDS[cur], text = 'בחרתי בשקט: ' + c[0] + ' או ' + c[1] + '? מכירים אותי? תנחשו מה בחרתי', url = location.href.split('#')[0] + '#draw';
      if (navigator.share) navigator.share({ text: text, url: url }).catch(function () {});
      else window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text + '\n' + url), '_blank', 'noopener');
    });
  }

  render();
})();
