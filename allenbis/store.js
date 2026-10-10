(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  // Language: Hebrew by default, English for visitors who pick EN (switching reloads the page)
  const LANG = (() => {
    const q = new URLSearchParams(location.search).get('lang');
    try {
      if (q === 'en' || q === 'he') localStorage.setItem('allenbis-lang', q);
      return localStorage.getItem('allenbis-lang') === 'en' ? 'en' : 'he';
    } catch { return q === 'en' ? 'en' : 'he'; }
  })();
  const L = (he, en) => LANG === 'en' ? en : he;
  // English names for products (catalog-en.js); Hebrew stays the source of truth
  const EN = window.ALLENBIS_EN || {};
  // The page is written in Hebrew; in English, swap every [data-en] text and [data-en-*] attribute
  if (LANG === 'en') {
    const root = document.documentElement;
    root.lang = 'en';
    root.dir = 'ltr';
    document.title = 'Allenbis | Drinks, snacks & more to your door in 20 min · Tel Aviv 24/7';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Allenbis: a 24/7 convenience store in central Tel Aviv. Drinks, snacks, candy, ice cream and phone accessories delivered in up to 20 minutes.');
    document.querySelectorAll('[data-en]').forEach(el => { el.innerHTML = el.dataset.en; });
    for (const a of ['placeholder', 'aria-label', 'title']) document.querySelectorAll(`[data-en-${a}]`).forEach(el => el.setAttribute(a, el.getAttribute(`data-en-${a}`)));
  }
  {
    const b = document.getElementById('langBtn');
    if (b) {
      b.textContent = LANG === 'en' ? 'עב' : 'EN';
      b.lang = LANG === 'en' ? 'he' : 'en';
      b.addEventListener('click', () => {
        try { localStorage.setItem('allenbis-lang', LANG === 'en' ? 'he' : 'en'); } catch {}
        const u = new URL(location.href);
        u.searchParams.delete('lang');
        if (LANG !== 'en') u.searchParams.set('lang', 'en');
        location.replace(u);
      });
    }
  }
  const CATALOG = window.ALLENBIS_CATALOG || { categories: [], products: [] };
  const CFG = window.ALLENBIS_COMMERCE_CONFIG || {};
  const DEMO = window.ALLENBIS_DEMO || {};
  const ALL = CATALOG.categories[0] || 'הכל';
  const MAX_QTY = 99;
  const FALLBACK = 'fallback.svg';
  const cur = CATALOG.currency || 'ILS';
  const money = new Intl.NumberFormat(L('he-IL', 'en-IL'), { style: 'currency', currency: cur });
  const moneyWhole = new Intl.NumberFormat(L('he-IL', 'en-IL'), { style: 'currency', currency: cur, maximumFractionDigits: 0 });
  const fmt = minor => (minor % 100 ? money : moneyWhole).format(minor / 100);

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const norm = s => String(s ?? '').normalize('NFKD').replace(/[֑-ׇ̀-ͯ]/g, '')
    .replace(/[״"׳'`’־\-–—.,/()]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  /* ---------- Rules ---------- */
  // Israeli law limits how tobacco and smoking products (rolling papers included) may be shown online:
  // name, price and basic details only – no images, promotions, bundles or cross-selling.
  const RESTRICTED = new Set(['אביזרי עישון', 'מידע בלבד']);
  const LABELS = { 'מידע בלבד': 'מוצרי עישון 18+', 'אביזרי עישון': 'אביזרי עישון 18+' };
  const ALCOHOL = 'אלכוהול 18+';
  const label = c => (LANG === 'en' && window.ALLENBIS_EN?.cats?.[c]) || LABELS[c] || c;
  const labelHtml = c => esc(label(c)).replace('18+', '<span dir="ltr">18+</span>');
  const isAdult = c => label(c).includes('18+');
  const isRestricted = p => RESTRICTED.has(p.category);
  const jerusalemHour = () => +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Jerusalem' }).format(new Date());
  // Off-premises alcohol sales are prohibited 23:00–06:00, deliveries included.
  const alcoholClosed = () => { const h = jerusalemHour(); return h >= 23 || h < 6; };
  const isBlocked = p => p.category === ALCOHOL && alcoholClosed();

  const oos = new Set(DEMO.outOfStock?.ids || []);
  const deals = DEMO.deals?.items || {};
  const hasPrice = p => ['verified', 'owner-configured'].includes(p.priceReview?.status) && Number.isFinite(p.price) && p.price >= 0;
  const regular = p => Math.round(p.price * 100);
  const unit = p => (hasPrice(p) && deals[p.id] && deals[p.id] < regular(p) && !isRestricted(p)) ? deals[p.id] : regular(p);
  const onSale = p => hasPrice(p) && unit(p) < regular(p);
  const canBuy = p => !!p && p.buy === true && p.availability !== 'out_of_stock' && !oos.has(p.id);
  const sellable = p => canBuy(p) && !isBlocked(p);
  const imgOf = p => isRestricted(p) ? null : (p.imageReview?.status === 'verified' && p.img ? p.img : FALLBACK);
  const priceText = p => !p.buy ? L('ללא מכירה', 'Not for sale') : hasPrice(p) ? fmt(unit(p)) : L('מחיר יעודכן', 'Price coming soon');
  const metaText = p => !p.buy ? L('לא נמכר באתר', 'Not sold online') : [subOf(p), sizeOf(p), p.variant].filter(Boolean).join(', ');
  const ART = (window.ALLENBIS_DEMO || {}).art || {};
  // signs catch the light one after another, not all at once
  const shineDelay = p => ((parseInt(p.id.slice(1), 10) || 0) % 9) * 0.55;
  const demoTag = on => on ? ` <span class="demo">${L('דוגמה', 'Example')}</span>` : '';

  const products = CATALOG.products.filter(p => p && p.active !== false);
  const byId = new Map(products.map(p => [p.id, p]));
  products.forEach(p => { p._s = norm([p.name, EN.names?.[p.id], p.sub, EN.subs?.[p.sub], LABELS[p.category] || p.category, EN.cats?.[p.category], p.size, p.variant].filter(Boolean).join(' ')); p._w = p._s.split(' '); p._c = norm(label(p.category)); });
  const pick = ids => (ids || []).map(id => byId.get(id)).filter(Boolean);
  const nm = p => (LANG === 'en' && EN.names?.[p.id]) || p.name;
  const subOf = p => p.sub && ((LANG === 'en' && EN.subs?.[p.sub]) || p.sub);
  const sizeOf = p => p.size && ((LANG === 'en' && EN.sizes?.[p.size]) || p.size);
  const UI = EN.ui || {};

  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
  };

  let cat = ALL;
  let query = '';
  let adultOk = false;
  try { adultOk = sessionStorage.getItem('age18') === '1'; } catch {}
  const cart = Object.create(null);
  {
    const saved = store.get('allenbis-cart', {});
    if (saved && typeof saved === 'object') for (const [id, q] of Object.entries(saved)) {
      if (canBuy(byId.get(id)) && Number.isSafeInteger(q) && q > 0) cart[id] = Math.min(q, MAX_QTY);
    }
  }
  let orders = (store.get('allenbis-orders', []) || []).filter(o => o && Array.isArray(o.lines));

  /* ---------- Order system (api.js): live orders, "bring a friend", stock from the store screen ---------- */
  const API = window.ALLENBIS_API || null;
  const CODE = /^[A-Z2-9]{4,12}$/;
  let myCode = store.get('allenbis-mycode', null);
  if (!CODE.test(myCode || '')) myCode = null;
  let myCredit = 0;
  let refCode = store.get('allenbis-ref', null);
  if (!CODE.test(refCode || '') || refCode === myCode) refCode = null;
  const BENEFIT_HE = { welcome: 'הנחת היכרות להזמנה ראשונה', ref: 'הנחת חבר מביא חבר', credit: 'זיכוי חבר מביא חבר' };
  const BENEFIT_EN = { welcome: 'First-order discount', ref: 'Friend discount', credit: 'Referral credit' };
  const benefitName = b => b ? L(BENEFIT_HE[b.kind], BENEFIT_EN[b.kind]) : L('ההנחה', 'Discount');

  /* ---------- Multi-buy deals: "3 for ₪20" across the products of a group ---------- */
  const MULTI = (DEMO.multibuy?.items || []).map(d => ({ ...d, products: d.products.filter(id => { const p = byId.get(id); return p && p.category !== ALCOHOL && !RESTRICTED.has(p.category); }) }))
    .filter(d => d.qty > 1 && d.price > 0 && d.products.length);
  const dealOf = new Map();
  for (const d of MULTI) for (const id of d.products) if (!dealOf.has(id)) dealOf.set(id, d);
  const dealName = d => (LANG === 'en' && d.en) || d.label;
  // Groups of `qty` units pay `price`; the most expensive units go into groups first (the best deal for the customer).
  function multibuy(ls) {
    const out = [];
    for (const d of MULTI) {
      const units = [];
      for (const { p, q } of ls) if (d.products.includes(p.id) && hasPrice(p) && !isBlocked(p)) for (let i = 0; i < q; i++) units.push(unit(p));
      units.sort((a, b) => b - a);
      const groups = Math.floor(units.length / d.qty);
      let saving = 0;
      for (let g = 0; g < groups; g++) saving += Math.max(0, units.slice(g * d.qty, (g + 1) * d.qty).reduce((a, b) => a + b, 0) - d.price);
      out.push({ d, count: units.length, groups, saving, missing: units.length ? (d.qty - units.length % d.qty) % d.qty : d.qty });
    }
    return out;
  }

  /* ---------- Lucky wheel state: one spin per order, every spin wins ---------- */
  const WH = CFG.wheel || {};
  const PRIZES = (WH.prizes?.length ? WH.prizes : DEMO.wheel?.prizes || []).filter(z => z && (z.type === 'off' ? z.minor > 0 : z.type === 'gift' && byId.get(z.product)));
  const WHEEL_MIN = WH.minimumOrderMinor || 0;
  const prizeName = z => z ? (LANG === 'en' && z.en ? z.en : z.label) : '';
  const wonPrefix = z => L(/^\d/.test(z?.label || '') ? 'זכיתם ב-' : 'זכיתם ב', 'You won ');
  let spin = store.get('allenbis-spin', null);
  if (!spin || !PRIZES[spin.i] || PRIZES[spin.i].label !== spin.label) spin = null;
  const setSpin = v => { spin = v; v ? store.set('allenbis-spin', v) : (() => { try { localStorage.removeItem('allenbis-spin'); } catch {} })(); };
  // off: no wheel · need: below the minimum · ready: may spin · won: prize applies · paused: won, but the basket dropped below the minimum
  // held: won, but the first-order discount is worth more and the two don't combine
  function wheelState(sub) {
    if (!WH.enabled || !PRIZES.length) return 'off';
    if (spin) return sub >= WHEEL_MIN ? 'won' : 'paused';
    return sub >= WHEEL_MIN ? 'ready' : 'need';
  }

  const D = DEMO.delivery || {};
  const ETA = D.etaMinutes || 20;
  const FEE = D.feeMinor || 0;
  const FREE_FROM = D.freeFromMinor || 0;

  /* ---------- Announcements ---------- */
  let statusTimer, toastTimer;
  function announce(msg) {
    clearTimeout(statusTimer);
    $('status').textContent = '';
    statusTimer = setTimeout(() => { $('status').textContent = msg; }, 60);
  }
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
  }

  /* ---------- Dialogs ---------- */
  const focusStack = [];
  function openDialog(id) {
    const d = $(id);
    if (d.open) return;
    focusStack.push(document.activeElement);
    d.showModal();
  }
  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
    d.addEventListener('close', () => {
      const f = focusStack.pop();
      if (f && document.contains(f) && f.offsetParent !== null) f.focus({ preventScroll: true });
    });
  });

  /* ---------- Cards ---------- */
  const plusIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  /* Supermarket price: shekels big, agorot raised. Screen readers get the plain amount. */
  const pm = minor => {
    const sh = Math.floor(minor / 100), ag = minor % 100;
    const c = '<span class="pm-c">₪</span>';
    return `<span class="sr-only">${fmt(minor)}</span><span class="pm-v" aria-hidden="true">${LANG === 'en' ? c : ''}<span class="pm-s">${sh}</span>${ag ? `<span class="pm-a">${String(ag).padStart(2, '0')}</span>` : ''}${LANG === 'en' ? '' : c}</span>`;
  };
  // Price per 100 ml / 100 g, only when the size is written in the product name or size field.
  const SIZE = /(\d+(?:\.\d+)?)\s*(מ["״]?ל|ליטר|גרם|ג['׳]|ק["״]ג)/;
  function unitPrice(p) {
    if (!hasPrice(p) || isRestricted(p)) return '';
    const m = `${p.name} ${p.size || ''}`.match(SIZE);
    if (!m) return '';
    const n = parseFloat(m[1]);
    const liquid = /^מ|ליטר/.test(m[2]);
    const base = /ליטר|ק/.test(m[2]) ? n * 1000 : n;
    if (!base) return '';
    const per = (Math.round(unit(p) / base * 100) / 100).toFixed(2);
    return L(`${per}₪ ל-100 ${liquid ? 'מ״ל' : 'גר׳'}`, `₪${per} per 100 ${liquid ? 'ml' : 'g'}`);
  }
  function priceHtml(p) {
    if (!(p.buy && hasPrice(p))) return `<span class="price"><span class="tag soft"><bdi>${esc(priceText(p))}</bdi></span></span>`;
    const sale = onSale(p);
    const up = unitPrice(p);
    return `<span class="price"><span class="tag${sale ? ' sale' : ''}">${sale ? `<span class="tag-flag" aria-hidden="true">${L('מבצע', 'SALE')}</span>` : ''}${pm(unit(p))}</span>${sale ? `<span class="was">${L('במקום', 'was')} <s><bdi>${fmt(regular(p))}</bdi></s></span>` : up ? `<span class="unitp"><bdi>${up}</bdi></span>` : ''}</span>`;
  }
  const stickers = p => [onSale(p) ? `<span class="sticker sale">${L('מבצע!', 'SALE!')}</span>` : '', bestIds.has(p.id) ? `<span class="sticker hot">${L('הכי<br>נמכר', 'Best<br>seller')}</span>` : ''].join('');

  function controlsHtml(p) {
    const name = esc(nm(p));
    if (!p.buy) return '';
    if (!canBuy(p)) return `<span class="oos-note">${L('אזל במלאי', 'Out of stock')}</span>`;
    if (isBlocked(p)) return `<span class="hours-note">${L('אלכוהול נמכר בין 06:00 ל-23:00', 'Alcohol is sold 06:00–23:00')}</span>`;
    const n = cart[p.id] || 0;
    if (!n) return `<button type="button" class="add" data-add="${p.id}" aria-label="${L(`הוספת ${name} לסל`, `Add ${name} to cart`)}">${plusIcon}</button>`;
    return `<span class="step"><button type="button" data-dec="${p.id}" aria-label="${L(`הפחתת ${name}`, `One less ${name}`)}">−</button><output aria-label="${L(`כמות ${name}: ${n}`, `${name} quantity: ${n}`)}">${n}</output><button type="button" data-add="${p.id}" aria-label="${L(`הוספת עוד ${name}`, `One more ${name}`)}"${n >= MAX_QTY ? ' disabled' : ''}>+</button></span>`;
  }
  const buyHtml = p => priceHtml(p) + controlsHtml(p);

  const bestIds = new Set(DEMO.bestsellers?.ids || []);
  function cardHtml(p) {
    const name = esc(nm(p));
    if (isRestricted(p)) {
      return `<article class="card plain${cart[p.id] ? ' in' : ''}" data-id="${p.id}"><h3 class="name"><bdi>${name}</bdi></h3><p class="meta">${esc(metaText(p))}</p><div class="buy">${buyHtml(p)}</div></article>`;
    }
    const img = imgOf(p);
    const badges = stickers(p);
    return `<article class="card${cart[p.id] ? ' in' : ''}${canBuy(p) ? '' : ' oos'}" data-id="${p.id}">
<div class="badges" aria-hidden="true">${badges}</div>
<button type="button" class="pic" data-open="${p.id}" tabindex="-1" aria-hidden="true"><img src="${esc(img)}" alt="" loading="lazy" decoding="async" width="640" height="480">${img === FALLBACK ? `<span class="note">${L('תמונה בקרוב', 'Photo coming soon')}</span>` : ''}</button>
<h3><button type="button" class="name" data-open="${p.id}"><bdi>${name}</bdi></button></h3><p class="meta">${esc(metaText(p))}</p>
${dealOf.has(p.id) ? `<p class="deal-chip"><span class="shine" style="--d:${shineDelay(p)}s">${esc(dealName(dealOf.get(p.id)))}</span></p>` : ''}
<div class="buy">${buyHtml(p)}</div></article>`;
  }

  function refreshCards(id) {
    const p = byId.get(id);
    document.querySelectorAll(`.slot[data-id="${CSS.escape(id)}"]`).forEach(slot => {
      slot.querySelector('.qa')?.remove();
      slot.querySelector('.prod').insertAdjacentHTML('beforeend', slotAdd(p));
      slot.classList.toggle('in', !!cart[id]);
      const f = slot.querySelector('.face.cut');
      if (f) syncFacings(f);
    });
    document.querySelectorAll(`.card[data-id="${CSS.escape(id)}"]`).forEach(card => {
      card.querySelector('.buy').innerHTML = buyHtml(p);
      card.classList.toggle('in', !!cart[id]);
    });
    if ($('product').open && $('pdBody').dataset.id === id) $('pdBuy').innerHTML = buyHtml(p);
  }

  /* ---------- Focus keeping across re-renders ---------- */
  function rememberFocus() {
    const a = document.activeElement;
    if (!a || !(a.dataset.add || a.dataset.dec)) return null;
    const scope = a.closest('[id]');
    return { id: a.dataset.add || a.dataset.dec, kind: a.dataset.dec ? 'dec' : 'add', scope: scope?.id };
  }
  function restoreFocus(m, fallback) {
    if (!m || (document.activeElement && document.activeElement !== document.body && document.contains(document.activeElement))) return;
    const scope = m.scope && $(m.scope);
    const sel = k => `[data-${k}="${CSS.escape(m.id)}"]`;
    const t = scope && (scope.querySelector(sel(m.kind)) || scope.querySelector(sel('add')) || scope.querySelector(sel('dec')));
    (t || fallback)?.focus({ preventScroll: true });
  }

  /* ---------- Cart ---------- */
  const lines = () => Object.entries(cart).map(([id, q]) => ({ p: byId.get(id), q })).filter(l => l.p);
  function totals() {
    let sub = 0, full = 0, items = 0, unpriced = 0, blocked = 0;
    for (const { p, q } of lines()) {
      items += q;
      if (isBlocked(p)) blocked += q;
      if (hasPrice(p)) { sub += unit(p) * q; full += regular(p) * q; } else unpriced += q;
    }
    const deals = multibuy(lines());
    const multi = deals.reduce((a, x) => a + x.saving, 0);
    sub -= multi;
    // one money benefit per order: the biggest of the first-order discount, a friend's code and earned credit
    const firstOrder = !orders.length;
    const w = CFG.welcome, R = CFG.referral;
    const offers = [];
    if (w?.enabled && firstOrder && sub >= (w.minimumOrderMinor || 0)) offers.push({ kind: 'welcome', amount: w.amountMinor });
    if (R?.enabled && API && firstOrder && refCode && sub > 0 && sub >= (R.minimumOrderMinor || 0)) offers.push({ kind: 'ref', code: refCode, amount: Math.min(R.rewardMinor, sub) });
    if (API && myCode && myCredit > 0 && sub > 0) offers.push({ kind: 'credit', code: myCode, amount: Math.min(myCredit, sub) });
    const ben = offers.sort((a, b) => b.amount - a.amount)[0] || null;
    let welcome = ben ? ben.amount : 0;
    const fee = items && FREE_FROM && sub >= FREE_FROM ? 0 : items ? FEE : 0;
    const stack = !!CFG.stacking?.wheelWithMonetaryBenefit;
    let wheel = items ? wheelState(sub) : 'off';
    let prize = wheel === 'won' ? PRIZES[spin.i] : null;
    if (welcome && !stack) {
      if (wheel === 'need' || wheel === 'ready') wheel = 'off';
      if (prize) {
        // one benefit per order: keep whichever is worth more
        const worth = prize.type === 'off' ? prize.minor : unit(byId.get(prize.product));
        if (worth > welcome) welcome = 0; else { prize = null; wheel = 'held'; }
      }
    }
    const wheelOff = prize?.type === 'off' ? Math.min(prize.minor, Math.max(0, sub - welcome)) : 0;
    return { sub, savings: full - sub - multi, multi, deals, items, unpriced, blocked, welcome, benefit: welcome ? ben : null, fee, wheel, prize, wheelOff, total: Math.max(0, sub - welcome - wheelOff) + fee };
  }
  function save() {
    if (!store.set('allenbis-cart', cart)) announce(L('לא ניתן לשמור את הסל במכשיר הזה. הוא יישמר עד סגירת הדף.', "Your cart can't be saved on this device. It stays until you close the page."));
  }

  function change(id, delta, quiet) {
    const p = byId.get(id);
    if (!sellable(p)) return;
    const before = cart[id] || 0;
    const after = Math.max(0, Math.min(MAX_QTY, before + delta));
    if (after === before) return;
    const focus = rememberFocus();
    if (after) cart[id] = after; else delete cart[id];
    save();
    refreshCards(id);
    updateCartUi();
    if ($('cart').open) renderCart();
    restoreFocus(focus, $('cart').open ? $('cart').querySelector('.x') : null);
    if (!quiet) {
      const msg = after > before ? L(`${nm(p)} נוסף לסל`, `${nm(p)} added to cart`) : after ? `${nm(p)}: ${after}` : L(`${nm(p)} הוסר מהסל`, `${nm(p)} removed from cart`);
      announce(msg + '.');
      if (after > before && !$('cart').open) toast(msg);
    }
  }

  function freeHtml(sub, dark) {
    if (!FREE_FROM || !FEE) return '';
    const gap = FREE_FROM - sub;
    const pct = Math.min(100, Math.round(sub / FREE_FROM * 100));
    const text = gap > 0 ? L(`עוד <bdi>${fmt(gap)}</bdi> למשלוח חינם`, `<bdi>${fmt(gap)}</bdi> more for free delivery`) : L('המשלוח עליכם, חינם', 'Delivery is on us');
    return dark ? `${text}<span class="meter" aria-hidden="true"><i style="width:${pct}%"></i></span>`
      : `<div class="free">${text}${demoTag(D.example)}<div class="meter" aria-hidden="true"><i style="width:${pct}%"></i></div></div>`;
  }

  function updateCartUi() {
    const t = totals();
    roll($('cartCount'), t.items);
    $('cartSum').hidden = !t.items;
    countTo($('cartSum'), t.sub, 'cartSum');
    $('cartLabel').textContent = L(`סל הקניות, ${t.items} פריטים`, `Cart, ${t.items} items`);
    document.body.classList.toggle('has-items', t.items > 0);
    $('barText').textContent = t.items === 1 ? L('פריט אחד בסל', '1 item in cart') : L(`${t.items} פריטים בסל`, `${t.items} items in cart`);
    countTo($('barSum'), t.sub, 'barSum');
    $('barProg').innerHTML = freeHtml(t.sub, true);
  }

  function lineHtml(p, q, controls) {
    const img = imgOf(p);
    const price = hasPrice(p) ? fmt(unit(p) * q) : L('מחיר יעודכן', 'Price coming soon');
    const each = hasPrice(p) && q > 1 ? ` (${fmt(unit(p))} ${L('ליחידה', 'each')})` : '';
    const ctl = controls ? `<span class="step"><button type="button" data-dec="${p.id}" aria-label="${L('הפחתת', 'One less')} ${esc(nm(p))}">−</button><output aria-label="${L('כמות', 'Quantity')}: ${q}">${q}</output><button type="button" data-add="${p.id}" aria-label="${L('הוספת עוד', 'One more')} ${esc(nm(p))}"${q >= MAX_QTY || !sellable(p) ? ' disabled' : ''}>+</button></span>` : `<b>×${q}</b>`;
    const pic = img ? `<img src="${esc(img)}" alt="" loading="lazy" width="56" height="56">` : '<span class="noimg" aria-hidden="true">18+</span>';
    const warn = isBlocked(p) ? `<div class="p" style="color:var(--warn)">${L('לא ניתן לקנות עכשיו (23:00–06:00)', "Can't be bought now (23:00–06:00)")}</div>` : '';
    const rm = controls ? `<button type="button" class="rm" data-rm="${p.id}">${L(`הסרת ${esc(nm(p))} מהסל`, `Remove ${esc(nm(p))} from cart`)}</button>` : '';
    return `<div class="line${isBlocked(p) ? ' blocked' : ''}" data-line="${p.id}">${pic}<div><div class="t"><bdi>${esc(nm(p))}</bdi></div><div class="p"><bdi>${esc(price)}</bdi>${esc(each)}</div>${warn}${rm}</div>${ctl}</div>`;
  }

  function miniHtml(p) {
    return `<div class="m"><img src="${esc(imgOf(p))}" alt="" loading="lazy"><div class="t"><bdi>${esc(nm(p))}</bdi></div><div class="r"><bdi>${fmt(unit(p))}</bdi><button type="button" class="add" data-add="${p.id}" aria-label="${esc(L(`הוספת ${nm(p)} לסל`, `Add ${nm(p)} to cart`))}">${plusIcon}</button></div></div>`;
  }

  /* ---------- "ליד הקופה": what people usually also need ---------- */
  // Every product gets a kind; a basket's kinds decide which other kinds it probably still needs.
  const KIND_BY_SUB = {
    'מוגזים': 'soda', 'ללא סוכר': 'soda', 'סודה': 'mixer', 'טוניק': 'mixer', 'מים מוגזים': 'mixer', 'מים': 'water',
    'תה קר': 'juice', 'מיץ': 'juice', 'משקה קל': 'juice', 'מאלט': 'juice', 'אנרגיה': 'energy', 'קפה קר': 'coffee', 'משקה חלב': 'milk',
    'סוכריות': 'candy', 'שימורים': 'canned', 'מהיר': 'instant', 'נשנוש': 'crackers', 'פיצוחים': 'nuts',
    'מטען': 'charger', 'כבל': 'cable', 'רכב': 'car', 'מעמד': 'car', 'אוזניות': 'earphones', 'מתאם': 'adapter', 'סוללה': 'powerbank'
  };
  const KIND_BY_CAT = { 'חטיפים': 'salty', 'ממתקים': 'choc', 'עוגיות': 'cookies', 'גלידות': 'icecream', 'מזון': 'food' };
  const KIND_BY_ID = { p173: 'ice', p176: 'game', p77: 'mint', p78: 'mint' };
  function kindOf(p) {
    if (p._k) return p._k;
    let k = KIND_BY_ID[p.id];
    if (!k && p.category === ALCOHOL) k = /ערק/.test(p.name) ? 'arak' : /לייבל|J&B|וויסקי/i.test(p.name) ? 'whisky' : 'vodka';
    if (!k && isRestricted(p)) k = 'smoke';
    return (p._k = k || KIND_BY_SUB[p.sub] || KIND_BY_CAT[p.category] || 'other');
  }
  // trigger kind → [kind it needs, weight, reason, preferred products]. {n} = the product in the basket.
  // Smoking products never appear as suggestions (the law bans promoting them), and alcohol is never pushed.
  const PAIRS = {
    vodka: [['ice', 10, 'קרח ל{n}'], ['mixer', 9, 'לערבב עם {n}', ['p16', 'p14']], ['juice', 5, 'לערבב עם {n}', ['p32']], ['soda', 5, 'לערבב עם {n}', ['p5', 'p3']], ['nuts', 5, 'פיצוחים לשולחן', ['p111']], ['salty', 4, 'נשנוש לצד השתייה']],
    whisky: [['ice', 10, 'קרח ל{n}'], ['soda', 8, 'וויסקי-קולה', ['p3', 'p1']], ['mixer', 5, 'סודה ל{n}', ['p14', 'p20']], ['nuts', 6, 'פיצוחים לשולחן', ['p111', 'p114']]],
    arak: [['ice', 10, 'קרח לערק'], ['juice', 9, 'ערק אשכוליות', ['p33', 'p34']], ['mixer', 5, 'סודה לערק', ['p14', 'p20']], ['nuts', 7, 'גרעינים לערק', ['p112', 'p113', 'p111']]],
    salty: [['soda', 8, 'שתייה מתוקה ל{n}', ['p3', 'p1']], ['juice', 4, 'משהו לשתות עם {n}'], ['choc', 4, 'משהו מתוק אחרי המלוח'], ['water', 3, 'מים ליד']],
    nuts: [['soda', 6, 'שתייה ליד הפיצוחים', ['p3']], ['game', 6, 'שש-בש עם הפיצוחים'], ['water', 3, 'מים ליד']],
    choc: [['milk', 6, 'שוקו קר ליד המתוק', ['p40']], ['coffee', 6, 'קפה קר ל{n}', ['p38']], ['water', 3, 'מים ליד', ['p18']], ['icecream', 3, 'וגם גלידה?']],
    candy: [['soda', 4, 'שתייה ליד הממתקים'], ['water', 3, 'מים ליד', ['p18']], ['choc', 3, 'עוד משהו מתוק']],
    cookies: [['milk', 8, 'שוקו ל{n}', ['p40']], ['coffee', 7, 'קפה קר ל{n}', ['p38']], ['icecream', 3, 'גלידה עם העוגיות']],
    icecream: [['icecream', 5, 'עוד אחת למקפיא'], ['cookies', 4, 'עוגיות לגלידה', ['p79']], ['water', 3, 'מים ליד', ['p18']]],
    energy: [['choc', 5, 'אנרגיה מתוקה'], ['salty', 4, 'חטיף ליד {n}'], ['mint', 3, 'לרענן'], ['water', 3, 'מים ליד', ['p18']]],
    coffee: [['cookies', 6, 'עוגייה לקפה'], ['choc', 5, 'משהו מתוק לקפה']],
    milk: [['cookies', 7, 'עוגיות לשוקו'], ['choc', 3, 'שוקולד ליד']],
    soda: [['salty', 8, 'חטיף ליד {n}'], ['ice', 4, 'קרח לשתייה'], ['choc', 3, 'משהו מתוק']],
    juice: [['salty', 6, 'חטיף ליד {n}'], ['choc', 3, 'משהו מתוק']],
    water: [['salty', 3, 'משהו לנשנש'], ['mint', 3, 'משהו קטן לדרך']],
    mixer: [['ice', 6, 'קרח לשתייה'], ['salty', 4, 'חטיף ליד']],
    ice: [['soda', 6, 'משהו לקרר', ['p3']], ['mixer', 4, 'טוניק או סודה'], ['salty', 3, 'חטיף ליד']],
    instant: [['soda', 5, 'שתייה לארוחה', ['p1']], ['water', 5, 'מים לארוחה', ['p18']], ['choc', 4, 'קינוח אחרי']],
    canned: [['crackers', 7, 'קרקרים ל{n}', ['p109']], ['instant', 3, 'ארוחה חמה'], ['water', 3, 'מים ליד']],
    crackers: [['canned', 6, 'טונה לקרקרים', ['p101']], ['juice', 3, 'משהו לשתות']],
    food: [['soda', 4, 'שתייה לארוחה'], ['water', 4, 'מים לארוחה']],
    charger: [['cable', 10, 'כבל ל{n}'], ['powerbank', 4, 'סוללה לדרך']],
    cable: [['charger', 10, 'ראש מטען לכבל', ['p115']], ['powerbank', 4, 'סוללה לדרך']],
    powerbank: [['cable', 10, 'כבל לסוללה']],
    car: [['cable', 8, 'כבל לרכב'], ['car', 5, 'להשלים את הרכב']],
    earphones: [['powerbank', 3, 'סוללה לדרך']],
    adapter: [['earphones', 5, 'אוזניות למתאם', ['p125']]],
    game: [['nuts', 8, 'פיצוחים לשש-בש', ['p112', 'p113']], ['soda', 5, 'שתייה למשחק', ['p3']], ['coffee', 3, 'קפה למשחק']],
    smoke: [['mint', 6, 'משהו קטן לקופה'], ['coffee', 5, 'קפה ליד', ['p38']], ['water', 4, 'מים ליד', ['p18']], ['energy', 3, 'אנרגיה ליד']]
  };
  const TECH = new Set(['charger', 'cable', 'car', 'earphones', 'adapter', 'powerbank']);
  const SWEET = new Set(['choc', 'candy', 'cookies', 'icecream']);
  const DRINK = new Set(['soda', 'juice', 'water', 'mixer', 'energy', 'coffee', 'milk']);
  const shortName = p => nm(p).split(/\s[—–-]\s|,|\s\d|\s\(/)[0].split(' ').slice(0, 2).join(' ');
  // English for the reasons and basket types (Hebrew is the key)
  const REASON_EN = {
    'קרח ל{n}': 'Ice for the {n}', 'לערבב עם {n}': 'Mix with {n}', 'פיצוחים לשולחן': 'Nuts for the table', 'נשנוש לצד השתייה': 'A snack with the drinks',
    'וויסקי-קולה': 'Whisky & cola', 'סודה ל{n}': 'Soda for the {n}', 'קרח לערק': 'Ice for the arak', 'ערק אשכוליות': 'Arak & grapefruit',
    'סודה לערק': 'Soda for the arak', 'גרעינים לערק': 'Seeds with arak', 'שתייה מתוקה ל{n}': 'A sweet drink with the {n}',
    'משהו לשתות עם {n}': 'Something to drink with the {n}', 'משהו מתוק אחרי המלוח': 'Something sweet after the salty', 'מים ליד': 'Water on the side',
    'שתייה ליד הפיצוחים': 'A drink with the nuts', 'שש-בש עם הפיצוחים': 'Backgammon with the nuts', 'שוקו קר ליד המתוק': 'Cold chocolate milk with the sweets',
    'קפה קר ל{n}': 'Iced coffee with the {n}', 'וגם גלידה?': 'Ice cream too?', 'שתייה ליד הממתקים': 'A drink with the candy', 'עוד משהו מתוק': 'Something else sweet',
    'שוקו ל{n}': 'Chocolate milk with the {n}', 'גלידה עם העוגיות': 'Ice cream with the cookies', 'עוד אחת למקפיא': 'One more for the freezer',
    'עוגיות לגלידה': 'Cookies with the ice cream', 'אנרגיה מתוקה': 'Sweet energy', 'חטיף ליד {n}': 'A snack with the {n}', 'לרענן': 'Freshen up',
    'עוגייה לקפה': 'A cookie with the coffee', 'משהו מתוק לקפה': 'Something sweet with the coffee', 'עוגיות לשוקו': 'Cookies with the chocolate milk',
    'שוקולד ליד': 'Chocolate on the side', 'קרח לשתייה': 'Ice for the drinks', 'משהו מתוק': 'Something sweet', 'משהו לנשנש': 'Something to snack on',
    'משהו קטן לדרך': 'A little something for the road', 'חטיף ליד': 'A snack on the side', 'משהו לקרר': 'Something to chill', 'טוניק או סודה': 'Tonic or soda',
    'שתייה לארוחה': 'A drink with the meal', 'מים לארוחה': 'Water with the meal', 'קינוח אחרי': 'Dessert after', 'קרקרים ל{n}': 'Crackers with the {n}',
    'ארוחה חמה': 'A hot meal', 'טונה לקרקרים': 'Tuna for the crackers', 'משהו לשתות': 'Something to drink', 'כבל ל{n}': 'A cable for the {n}',
    'סוללה לדרך': 'A power bank for the road', 'ראש מטען לכבל': 'A charger for the cable', 'כבל לסוללה': 'A cable for the power bank',
    'כבל לרכב': 'A cable for the car', 'להשלים את הרכב': 'Complete the car kit', 'אוזניות למתאם': 'Earphones for the adapter',
    'פיצוחים לשש-בש': 'Seeds for backgammon', 'שתייה למשחק': 'A drink for the game', 'קפה למשחק': 'Coffee for the game', 'משהו קטן לקופה': 'A little extra',
    'קפה ליד': 'Coffee on the side', 'אנרגיה ליד': 'Energy on the side', 'קרח למסיבה': 'Ice for the party', 'בקבוק גדול לכולם': 'A big bottle for everyone',
    'ללילה ארוך': 'For a long night', 'קפה ללילה': 'Coffee for the night', 'מים תמיד צריך': 'Water, always', 'משהו מתוק לדרך': 'Something sweet for the road'
  };
  const TYPE_EN = { 'ערב שתייה': 'a night of drinks', 'מסיבה': 'a party', 'סלולר': 'your phone', 'ערב סרט': 'a movie night', 'ארוחה מהירה': 'a quick meal',
    'לילה לבן': 'an all-nighter', 'מתוק': 'a sweet tooth', 'שתייה': 'drinks', 'נשנושים': 'snacking' };
  const tr = r => LANG === 'en' ? (REASON_EN[r] || r) : r;
  const reasonText = (r, p) => LANG === 'en' ? tr(r).replace('{n}', () => shortName(p))
    : r.replace(/ל\{n\}/, () => { const n = shortName(p); return /^[A-Za-z0-9]/.test(n) ? `ל-${n}` : `ל${n}`; }).replace('{n}', () => shortName(p));

  function basketType(kinds, items) {
    const has = k => kinds.has(k), any = set => [...kinds].some(k => set.has(k));
    if (has('vodka') || has('whisky') || has('arak')) return 'ערב שתייה';
    if (items >= 8) return 'מסיבה';
    if (any(TECH)) return 'סלולר';
    if (has('salty') && (has('soda') || has('juice'))) return 'ערב סרט';
    if (has('instant') || has('canned') || has('food') || has('crackers')) return 'ארוחה מהירה';
    if (has('energy') || has('coffee')) return 'לילה לבן';
    if (any(SWEET)) return 'מתוק';
    if (any(DRINK)) return 'שתייה';
    if (has('salty') || has('nuts')) return 'נשנושים';
    return '';
  }

  // Four suggestions for a basket: [{ p, why }], plus the basket type.
  function companions(ls, limit = 4, skip = new Set()) {
    const inCart = new Set([...ls.map(l => l.p.id), ...skip]);
    const kinds = new Set(ls.map(l => kindOf(l.p)));
    const items = ls.reduce((n, l) => n + l.q, 0);
    const lightning = ls.some(l => /lightning/i.test(l.p.name));
    const want = new Map();
    const add = (kind, w, why, pref, from) => {
      if (kinds.has(kind) && !(from && kindOf(from) === kind)) return;
      const cur = want.get(kind) || { w: 0, top: 0 };
      cur.w += w;
      if (w > cur.top) Object.assign(cur, { top: w, why: from ? why : tr(why), pref: pref || [] });
      want.set(kind, cur);
    };
    for (const { p, q } of ls) {
      for (const [kind, w, why, pref] of PAIRS[kindOf(p)] || []) {
        const cablePref = kind === 'cable' ? (lightning ? ['p119'] : ['p120', 'p118']) : pref;
        add(kind, w * (1 + 0.15 * Math.min(q - 1, 3)), reasonText(why, p), cablePref, p);
      }
    }
    const h = jerusalemHour();
    if (items >= 6 || kinds.has('vodka') || kinds.has('whisky')) { add('ice', 4, 'קרח למסיבה'); add('nuts', 3, 'פיצוחים לשולחן', ['p111']); add('soda', 2, 'בקבוק גדול לכולם', ['p3']); }
    if (h >= 22 || h < 5) { add('energy', 3, 'ללילה ארוך', ['p27']); add('coffee', 2, 'קפה ללילה', ['p38']); }
    // what people forget, as a last resort
    add('water', 1.5, 'מים תמיד צריך', ['p18']); add('mint', 1.2, 'משהו קטן לקופה', ['p77']); add('choc', 1, 'משהו מתוק לדרך', ['p67']); add('ice', 0.8, 'קרח לשתייה');
    const ok = x => x && !inCart.has(x.id) && sellable(x) && !isRestricted(x) && x.category !== ALCOHOL && hasPrice(x) && (hasCut(x.id) || imgOf(x) !== FALLBACK);
    const out = [], used = new Set();
    // a basket that already has a drink (or something sweet) needs another one less
    const anyOf = set => [...kinds].some(k => set.has(k));
    const damp = [[DRINK, anyOf(DRINK)], [SWEET, anyOf(SWEET)]];
    for (const [kind, v] of want) for (const [set, on] of damp) if (on && set.has(kind) && !kinds.has(kind)) v.w *= 0.5;
    for (const [kind, v] of [...want].sort((a, b) => b[1].w - a[1].w)) {
      const pool = products.filter(x => kindOf(x) === kind && ok(x) && !used.has(x.id));
      const pick = v.pref.map(id => pool.find(x => x.id === id)).find(Boolean) || pool.sort((a, b) => (bestIds.has(b.id) - bestIds.has(a.id)) || (onSale(b) - onSale(a)) || (unit(a) - unit(b)))[0];
      if (!pick) continue;
      used.add(pick.id);
      out.push({ p: pick, why: v.why });
      if (out.length >= limit) break;
    }
    return { list: out, type: basketType(kinds, items) };
  }

  /* ---------- Free delivery: products that close the gap ---------- */
  function gapPicks(gap, ls) {
    if (gap <= 0 || gap > 2500) return [];
    const inCart = new Set(ls.map(l => l.p.id));
    // impulse buys only, unless the basket is already about the phone
    const tech = ls.some(l => TECH.has(kindOf(l.p)));
    const IMPULSE = new Set(['שתייה', 'חטיפים', 'ממתקים', 'עוגיות', 'גלידות', 'מזון']);
    const goes = new Set(companions(ls, 8).list.map(c => c.p.id));
    const ok = p => !inCart.has(p.id) && sellable(p) && !isRestricted(p) && p.category !== ALCOHOL && (tech || IMPULSE.has(p.category)) && hasPrice(p) && (hasCut(p.id) || imgOf(p) !== FALLBACK) && unit(p) >= gap;
    const rank = (a, b) => (goes.has(b.id) - goes.has(a.id)) || (bestIds.has(b.id) - bestIds.has(a.id)) || (unit(a) - unit(b));
    for (const slack of [1000, 2000, 3500]) {
      const list = products.filter(p => ok(p) && unit(p) <= gap + slack).sort(rank).slice(0, 3);
      if (list.length) return list;
    }
    return [];
  }
  function gapHtml(t, ls, picks) {
    if (!picks.length) return '';
    const both = t.wheel === 'need' && WHEEL_MIN === FREE_FROM;
    const head = both ? L('הוסיפו אחד מאלה: משלוח חינם וגם סיבוב בגלגל המזל', 'Add one of these: free delivery plus a spin of the lucky wheel')
      : L('הוסיפו אחד מאלה והמשלוח חינם', 'Add one of these and delivery is free');
    const card = p => `<div class="gf"><img src="${esc(hasCut(p.id) ? `images/cut/${p.id}.webp` : imgOf(p))}" alt="" loading="lazy"><span class="gf-t"><bdi>${esc(nm(p))}</bdi><b><bdi>${fmt(unit(p))}</bdi></b></span><button type="button" class="add" data-add="${p.id}" aria-label="${esc(L(`הוספת ${nm(p)} לסל`, `Add ${nm(p)} to cart`))}">${plusIcon}</button></div>`;
    return `<section class="gapfill" aria-label="${esc(head)}"><h3>${head}</h3><div class="gf-row">${picks.map(card).join('')}</div></section>`;
  }
  const wheelIcon = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>';
  function wheelHtml(t) {
    if (t.wheel === 'ready') return `<div class="wheel-cta">${wheelIcon}<span><b>${L('הגעתם ל-', 'You reached ')}<bdi>${fmt(WHEEL_MIN)}</bdi>!</b> ${L('מגיע לכם סיבוב בגלגל המזל. כל סיבוב זוכה.', 'You get a spin of the lucky wheel. Every spin wins.')}</span><button type="button" class="btn-tag" id="spinOpen">${L('לסובב', 'Spin')}</button></div>`;
    if (t.wheel === 'won') return `<div class="wheel-cta won">${wheelIcon}<span>${wonPrefix(t.prize)}<b>${esc(prizeName(t.prize))}</b>. ${L('הפרס נוסף להזמנה.', 'It is added to your order.')}</span></div>`;
    return '';
  }
  function giftLineHtml(t) {
    if (t.prize?.type !== 'gift') return '';
    const p = byId.get(t.prize.product);
    const src = hasCut(p.id) ? `images/cut/${p.id}.webp` : imgOf(p);
    return `<div class="line gift"><img src="${esc(src)}" alt="" loading="lazy" width="56" height="56"><div><div class="t"><bdi>${esc(nm(p))}</bdi></div><div class="p">${L('מתנה מגלגל המזל', 'Lucky wheel gift')}</div></div><b class="free-tag">${L('חינם', 'Free')}</b></div>`;
  }

  function rackHtml(ls, skip = new Set()) {
    const { list, type } = companions(ls, 4, skip);
    if (!list.length) return '';
    const card = ({ p, why }) => {
      const src = hasCut(p.id) ? `images/cut/${p.id}.webp` : imgOf(p);
      return `<div class="rk"><span class="rk-why">${esc(why)}</span><span class="rk-img"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></span><div class="rk-t"><bdi>${esc(nm(p))}</bdi></div><div class="rk-row"><span class="rk-price${onSale(p) ? ' sale' : ''}">${pm(unit(p))}</span><button type="button" class="add" data-add="${p.id}" aria-label="${L(`הוספת ${esc(nm(p))} לסל`, `Add ${esc(nm(p))} to cart`)} (${esc(why)})">${plusIcon}</button></div></div>`;
    };
    return `<section class="rack" aria-labelledby="rackTitle"><div class="rack-head"><h3 id="rackTitle">${L('ליד הקופה', 'At the checkout')}</h3>${type ? `<span>${L(`מתאים לסל ${esc(type)}`, `Made for ${esc(TYPE_EN[type] || type)}`)}</span>` : ''}</div><div class="rack-grid">${list.map(card).join('')}</div></section>`;
  }

  function renderCart() {
    const ls = lines();
    const t = totals();
    const undoBar = undo ? `<div class="undo" id="cartUndo" role="status"><span><bdi>${esc(undo.name)}</bdi> ${L('הוסר מהסל', 'removed')}</span><button type="button" id="undoBtn">${L('ביטול', 'Undo')}</button></div>` : '';
    if (!ls.length) {
      $('cartBody').innerHTML = undoBar + (ART.emptyCart ? `<div class="panel-empty"><img class="art-img" src="${esc(ART.emptyCart)}" alt=""><p>${L('הסל עדיין ריק.', 'Your cart is empty.')}</p></div>` : `<div class="panel-empty"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9Z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg><p>${L('הסל עדיין ריק.', 'Your cart is empty.')}</p></div>`);
      $('cartFoot').innerHTML = `<button class="primary" type="button" data-close>${L('לבחירת מוצרים', 'Start shopping')}</button>`;
      return;
    }
    const tip = store.get('allenbis-swiped', false) ? '' : `<p class="swipe-tip">${L('אפשר להחליק מוצר הצידה כדי להוציא אותו מהסל.', 'Swipe a product sideways to remove it.')}</p>`;
    const picks = gapPicks(FREE_FROM && FEE ? FREE_FROM - t.sub : 0, ls);
    const lastOfDeal = new Map();
    ls.forEach(({ p }) => { const d = dealOf.get(p.id); if (d) lastOfDeal.set(d.id, p.id); });
    const dealBar = p => {
      const d = dealOf.get(p.id);
      if (!d || lastOfDeal.get(d.id) !== p.id) return '';
      const x = t.deals.find(z => z.d.id === d.id);
      if (!x || !x.count) return '';
      const done = x.groups && !x.missing;
      const msg = done ? L(`✓ ${esc(dealName(d))} · חסכתם <bdi>${fmt(x.saving)}</bdi>`, `✓ ${esc(dealName(d))} · you save <bdi>${fmt(x.saving)}</bdi>`)
        : L(`עוד ${x.missing} ומקבלים ${esc(dealName(d))}`, `${x.missing} more for ${esc(dealName(d))}`) + (x.groups ? L(` (כבר חסכתם <bdi>${fmt(x.saving)}</bdi>)`, ` (already saving <bdi>${fmt(x.saving)}</bdi>)`) : '');
      return `<div class="dealbar${done ? ' done' : ''}"><span>${msg}</span>${done ? '' : `<button type="button" data-add="${p.id}" aria-label="${esc(L(`עוד ${nm(p)}`, `One more ${nm(p)}`))}">${L('+ עוד אחד', '+ one more')}</button>`}</div>`;
    };
    $('cartBody').innerHTML = undoBar + freeHtml(t.sub) + gapHtml(t, ls, picks) + wheelHtml(t) + ls.map(({ p, q }) => `<div class="swipe" data-swipe="${p.id}"><span class="swipe-bg" aria-hidden="true"><span>${trashIcon}${L('הסרה', 'Remove')}</span><span>${trashIcon}${L('הסרה', 'Remove')}</span></span>${lineHtml(p, q, true)}</div>${dealBar(p)}`).join('') + giftLineHtml(t) + tip + rackHtml(ls, new Set(picks.map(p => p.id)));
    $('cartFoot').innerHTML = `${t.blocked ? `<p class="warn-box">${L('בין 23:00 ל-06:00 אסור למכור אלכוהול. הסירו את המוצרים המסומנים כדי להמשיך.', 'Alcohol can\'t be sold 23:00–06:00. Remove the marked items to continue.')}</p>` : ''}
<div class="totals">${totalsHtml(t)}</div>
<button class="primary" type="button" id="toCheckout"${t.blocked ? ' disabled' : ''}>${L('לתשלום', 'Checkout')} · <bdi>${fmt(t.total)}</bdi></button>
<button class="secondary" type="button" id="emptyCart">${L('ריקון הסל', 'Empty cart')}</button>`;
    countAll($('cartFoot'), 'cart');
  }

  function totalsHtml(t) {
    return `<div class="row"><span>${L('מוצרים', 'Items')} (${t.items})</span><bdi>${fmt(t.sub + t.savings + t.multi)}</bdi></div>
${t.savings ? `<div class="row good"><span>${L('חסכת במבצעים', 'You saved')}</span><bdi>−<span data-count="save" data-v="${t.savings}">${fmt(t.savings)}</span></bdi></div>` : ''}
${t.multi ? `<div class="row good"><span>${L('מבצעי כמות', 'Multi-buy deals')}</span><bdi>−<span data-count="multi" data-v="${t.multi}">${fmt(t.multi)}</span></bdi></div>` : ''}
${t.welcome ? `<div class="row good"><span>${benefitName(t.benefit)}</span><bdi>−<span data-count="ben" data-v="${t.welcome}">${fmt(t.welcome)}</span></bdi></div>` : ''}
${t.wheelOff ? `<div class="row good"><span>${L('גלגל המזל', 'Lucky wheel')}</span><bdi>−${fmt(t.wheelOff)}</bdi></div>` : ''}
${t.prize?.type === 'gift' ? `<div class="row good"><span>${L('מתנה מהגלגל', 'Wheel gift')}: ${esc(prizeName(t.prize))}</span><bdi>${L('חינם', 'Free')}</bdi></div>` : ''}
${t.wheel === 'held' ? `<div class="muted">${L(`הפרס מהגלגל (${esc(prizeName(PRIZES[spin.i]))}) לא מצטרף ל${benefitName(t.benefit)}, ששווה יותר ממנו.`, `Your wheel prize (${esc(prizeName(PRIZES[spin.i]))}) doesn't combine with your ${benefitName(t.benefit).toLowerCase()}, which is worth more.`)}</div>` : ''}
${t.wheel === 'paused' ? `<div class="muted">${L(`הפרס מהגלגל (${esc(prizeName(PRIZES[spin.i]))}) יחזור כשהסל יגיע ל-`, `Your wheel prize (${esc(prizeName(PRIZES[spin.i]))}) comes back at `)}<bdi>${fmt(WHEEL_MIN)}</bdi>.</div>` : ''}
<div class="row"><span>${L('משלוח', 'Delivery')}${demoTag(D.example)}</span><bdi>${t.fee ? fmt(t.fee) : L('חינם', 'Free')}</bdi></div>
<div class="row big"><span>${L('סה״כ', 'Total')}</span><bdi data-count="total" data-v="${t.total}">${fmt(t.total)}</bdi></div>
${t.unpriced ? `<div class="muted">${L(`${t.unpriced === 1 ? 'למוצר אחד' : `ל-${t.unpriced} מוצרים`} בסל עדיין אין מחיר, והוא לא נכלל בסכום.`, `${t.unpriced} item(s) in your cart have no price yet and aren't in the total.`)}</div>` : ''}
${refCode && API && !orders.length && t.benefit?.kind !== 'ref' && t.items ? `<div class="muted">${t.sub < (CFG.referral?.minimumOrderMinor || 0)
  ? L(`הנחת החבר (<bdi>${fmt(CFG.referral.rewardMinor)}</bdi>) נכנסת בהזמנה מ-<bdi>${fmt(CFG.referral.minimumOrderMinor)}</bdi>. חסרים עוד <bdi>${fmt(CFG.referral.minimumOrderMinor - t.sub)}</bdi>.`, `Your friend discount (<bdi>${fmt(CFG.referral.rewardMinor)}</bdi>) applies from <bdi>${fmt(CFG.referral.minimumOrderMinor)}</bdi>. Add <bdi>${fmt(CFG.referral.minimumOrderMinor - t.sub)}</bdi> more.`)
  : L('ההנחה מהחבר לא מצטרפת להנחה אחרת, ולכן נכנסה ההנחה הגדולה יותר.', "Your friend discount doesn't combine with other discounts, so the bigger one applies.")}</div>` : ''}
${!t.welcome && !refCode && CFG.welcome?.enabled && !orders.length ? `<div class="muted">${L('בהזמנה ראשונה מעל', 'First order over')} <bdi>${fmt(CFG.welcome.minimumOrderMinor)}</bdi> ${L('מקבלים', 'gets')} <bdi>${fmt(CFG.welcome.amountMinor)}</bdi> ${L('הנחה.', 'off.')}</div>` : ''}`;
  }

  $('cartFoot').addEventListener('click', e => {
    if (e.target.closest('#toCheckout')) { $('cart').close(); openCheckout(); }
    if (e.target.closest('#emptyCart')) {
      const ids = Object.keys(cart);
      ids.forEach(id => delete cart[id]);
      setSpin(null);
      save();
      ids.forEach(refreshCards);
      updateCartUi();
      renderCart();
      $('cart').querySelector('.x').focus();
      announce(L('הסל רוקן.', 'Cart emptied.'));
    }
  });
  const openCart = () => { renderCart(); openDialog('cart'); };

  /* ---------- Lucky wheel ---------- */
  const WHEEL_COLORS = [['#1b4396', '#fff'], ['#ffd84d', '#14203a'], ['#e4002b', '#fff'], ['#fff', '#1b4396']];
  function drawWheel() {
    const n = PRIZES.length, a = 360 / n, r = 100;
    const pt = deg => { const t = (deg - 90) * Math.PI / 180; return `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`; };
    let g = '';
    PRIZES.forEach((z, i) => {
      const [bg, fg] = WHEEL_COLORS[i % WHEEL_COLORS.length];
      g += `<path d="M0 0 L${pt(i * a - a / 2)} A${r} ${r} 0 0 1 ${pt(i * a + a / 2)} Z" fill="${bg}" stroke="#14203a" stroke-width="1.5"/>`;
      const words = prizeName(z).split(' ');
      const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [words.join(' ')];
      g += `<g transform="rotate(${i * a}) translate(0 -64)"><text text-anchor="middle" fill="${fg}" font-size="10.5" font-weight="800" font-family="Assistant, sans-serif">${lines.map((l, k) => `<tspan x="0" dy="${k ? 12 : (lines.length - 1) * -6}">${esc(l)}</tspan>`).join('')}</text></g>`;
    });
    $('wheelSvg').innerHTML = `<g id="wheelRot">${g}</g><circle r="104" fill="none" stroke="#14203a" stroke-width="6"/><circle r="18" fill="#14203a"/><circle r="12" fill="#ffd84d"/>`;
  }
  function openWheel() {
    if (spin) return;
    drawWheel();
    $('wheelMsg').textContent = L('כל סיבוב זוכה. סיבוב אחד להזמנה.', 'Every spin wins. One spin per order.');
    $('spinBtn').hidden = false; $('spinBtn').disabled = false;
    $('wheelDone').hidden = true;
    openDialog('wheel');
  }
  $('spinBtn').addEventListener('click', () => {
    if (spin) return;
    const t = totals();
    if (t.wheel !== 'ready') return;
    const choices = PRIZES.map((z, i) => i).filter(i => PRIZES[i].type !== 'gift' || canBuy(byId.get(PRIZES[i].product)));
    const i = choices[Math.random() * choices.length | 0];
    const a = 360 / PRIZES.length;
    const end = 360 * 5 + (360 - i * a) + (Math.random() - 0.5) * a * 0.6;
    $('spinBtn').disabled = true;
    const done = () => {
      setSpin({ i, label: PRIZES[i].label });
      $('wheelMsg').innerHTML = `${wonPrefix(PRIZES[i])}<b>${esc(prizeName(PRIZES[i]))}</b>! ${L('הפרס נוסף להזמנה.', 'It is added to your order.')}`;
      $('spinBtn').hidden = true;
      $('wheelDone').hidden = false;
      $('wheelDone').focus();
      updateCartUi();
      if ($('cart').open) renderCart();
      announce(`${wonPrefix(PRIZES[i])}${prizeName(PRIZES[i])}`);
    };
    const rot = $('wheelRot');
    if (calm()) { rot.setAttribute('transform', `rotate(${end % 360})`); done(); return; }
    rot.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${end}deg)` }], { duration: 4200, easing: 'cubic-bezier(.12,.7,.12,1)', fill: 'forwards' }).finished.then(done);
  });

  /* ---------- Swipe a line out of the cart ---------- */
  const trashIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
  let undo = null, undoTimer;
  function removeLine(id) {
    const p = byId.get(id), q = cart[id];
    if (!p || !q) return;
    const at = Object.keys(cart).indexOf(id);
    delete cart[id];
    save();
    refreshCards(id);
    updateCartUi();
    undo = { id, q, at, name: nm(p) };
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { undo = null; $('cartUndo')?.remove(); }, 6000);
    renderCart();
    announce(L(`${nm(p)} הוסר מהסל. אפשר לבטל.`, `${nm(p)} removed from cart. You can undo.`));
  }
  let sw = null;
  const SWIPE_OUT = 0.35;
  $('cartBody').addEventListener('pointerdown', e => {
    const row = e.target.closest('.swipe');
    if (!row || e.target.closest('button') || e.button > 0) return;
    sw = { row, line: row.querySelector('.line'), x: e.clientX, y: e.clientY, dx: 0, on: false, pid: e.pointerId };
  });
  $('cartBody').addEventListener('pointermove', e => {
    if (!sw || e.pointerId !== sw.pid) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
      if (Math.abs(dx) < 10) return;
      sw.on = true;
      sw.row.setPointerCapture(e.pointerId);
      sw.row.classList.add('dragging');
    }
    sw.dx = dx;
    sw.line.style.transform = `translateX(${dx}px)`;
    sw.row.classList.toggle('arm', Math.abs(dx) > sw.row.clientWidth * SWIPE_OUT);
  });
  const endSwipe = e => {
    if (!sw || e.pointerId !== sw.pid) return;
    const { row, line, dx, on } = sw;
    sw = null;
    if (!on) return;
    row.classList.remove('dragging');
    if (e.type === 'pointerup' && Math.abs(dx) > row.clientWidth * SWIPE_OUT) {
      line.style.transform = `translateX(${dx > 0 ? 110 : -110}%)`;
      store.set('allenbis-swiped', true);
      setTimeout(() => removeLine(row.dataset.swipe), calm() ? 0 : 180);
    } else {
      line.style.transform = '';
      row.classList.remove('arm');
    }
  };
  $('cartBody').addEventListener('pointerup', endSwipe);
  $('cartBody').addEventListener('pointercancel', endSwipe);
  $('cartBody').addEventListener('click', e => {
    if (e.target.closest('#spinOpen')) { openWheel(); return; }
    const rm = e.target.closest('[data-rm]');
    if (rm) { removeLine(rm.dataset.rm); $('undoBtn')?.focus(); return; }
    if (e.target.closest('#undoBtn') && undo) {
      const { id, q, at, name } = undo;
      undo = null;
      clearTimeout(undoTimer);
      if (canBuy(byId.get(id))) {
        // back in its old place in the list
        const rows = Object.entries(cart);
        rows.splice(at, 0, [id, q]);
        rows.forEach(([k]) => delete cart[k]);
        rows.forEach(([k, v]) => { cart[k] = v; });
      }
      save();
      refreshCards(id);
      updateCartUi();
      renderCart();
      $('cart').querySelector('.x').focus();
      announce(L(`${name} חזר לסל.`, `${name} is back in your cart.`));
    }
  });
  $('openCart').addEventListener('click', openCart);
  $('bar').addEventListener('click', openCart);

  /* ---------- Product detail ---------- */
  function openProduct(id) {
    const p = byId.get(id);
    if (!p) return;
    const img = imgOf(p);
    const goes = isRestricted(p) ? [] : companions([{ p, q: 1 }], 4).list.map(c => c.p);
    const related = isRestricted(p) ? [] : [...goes, ...products.filter(x => x.category === p.category && x.id !== p.id), ...pick([...bestIds])]
      .filter((x, i, a) => a.indexOf(x) === i && sellable(x) && !isRestricted(x) && imgOf(x) !== FALLBACK && x.id !== p.id).slice(0, 8);
    $('pdBody').dataset.id = id;
    $('pdBody').innerHTML = `${img ? `<div class="pd-img"><img src="${esc(img)}" alt="${img === FALLBACK ? '' : esc(nm(p))}"></div>` : ''}
<h3><bdi>${esc(nm(p))}</bdi></h3>
<dl class="facts"><dt>${L('קטגוריה', 'Category')}</dt><dd>${labelHtml(p.category)}</dd>${p.sub && !isRestricted(p) ? `<dt>${L('סוג', 'Type')}</dt><dd>${esc(subOf(p))}</dd>` : ''}${p.size ? `<dt>${L('גודל', 'Size')}</dt><dd>${esc(sizeOf(p))}</dd>` : ''}${onSale(p) ? `<dt>${L('מחיר רגיל', 'Regular price')}</dt><dd><bdi>${fmt(regular(p))}</bdi></dd>` : ''}</dl>
${dealOf.has(p.id) ? `<p class="deal-chip big">${L('מבצע', 'Deal')}: ${esc(dealName(dealOf.get(p.id)))}<small>${L('אפשר לערבב', 'Mix and match')}: ${dealOf.get(p.id).products.map(id => esc(nm(byId.get(id)))).join(' · ')}</small></p>` : ''}
<div class="buy" id="pdBuy">${buyHtml(p)}</div>
${related.length ? `<section class="upsell" aria-labelledby="relTitle"><h3 id="relTitle">${L('מתאים עם', 'Goes well with')}</h3><div class="mini">${related.map(miniHtml).join('')}</div></section>` : ''}`;
    openDialog('product');
  }

  /* ---------- Categories, tiles, browsing ---------- */
  const counts = products.reduce((m, p) => (m[p.category] = (m[p.category] || 0) + 1, m), {});
  const cats = [ALL, ...CATALOG.categories.slice(1).filter(c => counts[c])];
  const art = DEMO.categoryArt || {};

  function renderTiles() {
    $('tiles').innerHTML = cats.slice(1).map(c => {
      const a = art[c];
      const src = a ? (a.includes('/') ? a : imgOf(byId.get(a) || {})) : null;
      const pic = RESTRICTED.has(c) || !src ? `<span class="art text" aria-hidden="true" dir="ltr">18+</span>` : `<span class="art${a.includes('/') ? ' full' : ''}"><img src="${esc(src)}" alt="" loading="lazy"></span>`;
      return `<li><button type="button" class="tile" data-cat="${esc(c)}">${pic}<span>${labelHtml(c)}</span></button></li>`;
    }).join('');
  }

  function renderCats() {
    $('cats').innerHTML = cats.map(c => `<button type="button" class="cat" data-cat="${esc(c)}" aria-pressed="${c === cat}">${labelHtml(c)}${c === ALL ? '' : `<span class="c" aria-label="${counts[c]} ${L('מוצרים', 'products')}">${counts[c]}</span>`}</button>`).join('');
  }

  let pendingCat = null;
  function requestCat(c) {
    if (isAdult(c) && !adultOk) { pendingCat = c; openDialog('age'); return; }
    selectCat(c, true);
  }
  $('ageYes').addEventListener('click', () => {
    adultOk = true;
    try { sessionStorage.setItem('age18', '1'); } catch {}
    $('age').close();
    if (pendingCat) selectCat(pendingCat, true);
    pendingCat = null;
  });

  function setBrowsing() {
    document.body.classList.toggle('browsing', cat !== ALL || !!query);
  }
  function selectCat(c, scroll) {
    cat = c;
    renderCats();
    renderGrid(true);
    setBrowsing();
    if (scroll) scrollToCatalog();
    $('cats').querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function scrollToCatalog() {
    const y = window.scrollY + $('catalogTitle').getBoundingClientRect().top - $('top').offsetHeight;
    window.scrollTo({ top: Math.max(0, y) });
  }
  $('home').addEventListener('click', e => {
    e.preventDefault();
    query = ''; $('q').value = ''; $('searchBox').classList.remove('has-q');
    selectCat(ALL, false);
    window.scrollTo({ top: 0 });
  });

  /* ---------- Search ---------- */
  const SYN = DEMO.synonyms || {};
  function near(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
  }
  function score(p, words) {
    let s = 0;
    for (const w of words) {
      if (w.length > 3 && p._c.includes(w.slice(0, -1))) { s += 2; continue; }
      const alts = [w, ...(SYN[w] || []).map(norm)];
      if (alts.some(a => p._s.includes(a))) { s += p._s.startsWith(w) ? 3 : 2; continue; }
      if (w.length >= 4 && p._w.some(x => x.length >= 3 && (near(w, x) || near(w, x.slice(0, w.length))))) { s += 1; continue; }
      return 0;
    }
    return s;
  }
  function search(q) {
    const words = norm(q).split(' ').filter(Boolean);
    if (!words.length) return products.slice();
    return products.map(p => [p, score(p, words)]).filter(x => x[1] > 0).map(x => x[0]);
  }

  let suggestIdx = -1;
  const recent = () => store.get('allenbis-recent', []) || [];
  function pushRecent(q) {
    q = q.trim();
    if (!q) return;
    store.set('allenbis-recent', [q, ...recent().filter(x => x !== q)].slice(0, 5));
  }

  function renderSuggest() {
    const q = $('q').value.trim();
    const box = $('suggest');
    suggestIdx = -1;
    $('q').removeAttribute('aria-activedescendant');
    if (!q) {
      const rec = recent();
      box.innerHTML = (rec.length ? `<h3>${L('חיפשת לאחרונה', 'Recent searches')}</h3><div class="chips">${rec.map(r => `<button type="button" class="chip" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : '') +
        `<h3>${L('מחפשים הרבה', 'Popular')}${demoTag(true)}</h3><div class="chips">${((LANG === 'en' && UI.popularSearches) || DEMO.popularSearches || []).map(r => `<button type="button" class="chip" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div>`;
    } else {
      const words = norm(q).split(' ').filter(Boolean);
      const hits = products.map(p => [p, score(p, words)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]);
      const catHits = cats.slice(1).filter(c => norm(label(c)).includes(norm(q)));
      box.innerHTML = (catHits.length ? `<h3>${L('קטגוריות', 'Categories')}</h3><div class="chips">${catHits.map(c => `<button type="button" class="chip" data-cat="${esc(c)}">${labelHtml(c)}</button>`).join('')}</div>` : '') +
        (hits.length ? `<h3>${L('מוצרים', 'Products')}</h3>${hits.map((p, i) => {
          const img = imgOf(p);
          return `<div class="opt" role="option" id="opt${i}" aria-selected="false" data-open="${p.id}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<span class="noimg" aria-hidden="true">18+</span>'}<span><span class="t"><bdi>${esc(nm(p))}</bdi></span><br><span class="c">${labelHtml(p.category)}</span></span><span class="p"><bdi>${esc(priceText(p))}</bdi></span></div>`;
        }).join('')}` : `<p class="none">${L(`לא מצאנו מוצרים ל״${esc(q)}״. נסו מילה אחרת.`, `Nothing found for “${esc(q)}”. Try another word.`)}</p>`);
    }
    box.hidden = false;
    $('q').setAttribute('aria-expanded', 'true');
  }
  function closeSuggest() {
    $('suggest').hidden = true;
    $('q').setAttribute('aria-expanded', 'false');
    $('q').removeAttribute('aria-activedescendant');
  }
  function applySearch(scroll) {
    query = $('q').value.trim();
    $('searchBox').classList.toggle('has-q', !!$('q').value);
    renderGrid(true);
    setBrowsing();
    if (scroll) scrollToCatalog();
  }

  let searchTimer;
  $('q').addEventListener('input', e => {
    if (e.isComposing) return;
    $('searchBox').classList.toggle('has-q', !!$('q').value);
    renderSuggest();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => applySearch(false), 160);
  });
  $('q').addEventListener('focus', renderSuggest);
  $('q').addEventListener('keydown', e => {
    const opts = [...$('suggest').querySelectorAll('.opt')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!opts.length) return;
      e.preventDefault();
      suggestIdx = (suggestIdx + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
      opts.forEach((o, i) => o.setAttribute('aria-selected', String(i === suggestIdx)));
      $('q').setAttribute('aria-activedescendant', opts[suggestIdx].id);
      opts[suggestIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestIdx >= 0 && opts[suggestIdx]) { const id = opts[suggestIdx].dataset.open; closeSuggest(); pushRecent($('q').value); openProduct(id); return; }
      closeSuggest();
      pushRecent($('q').value);
      applySearch(true);
      $('q').blur();
    } else if (e.key === 'Escape') {
      closeSuggest();
    }
  });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('#searchBox')) closeSuggest(); });
  $('searchBox').addEventListener('focusout', e => { if (!$('searchBox').contains(e.relatedTarget)) setTimeout(() => { if (!$('searchBox').contains(document.activeElement)) closeSuggest(); }, 0); });
  $('suggest').addEventListener('click', e => {
    const chip = e.target.closest('[data-q]');
    if (chip) { $('q').value = chip.dataset.q; pushRecent(chip.dataset.q); closeSuggest(); applySearch(true); }
    const c = e.target.closest('[data-cat]');
    if (c) { $('q').value = ''; query = ''; $('searchBox').classList.remove('has-q'); closeSuggest(); requestCat(c.dataset.cat); }
  });
  $('clearQ').addEventListener('click', () => {
    $('q').value = '';
    applySearch(false);
    $('q').focus();
  });

  /* ---------- Grid ---------- */
  function renderGrid(speak) {
    let list = query ? search(query) : products.slice();
    if (cat !== ALL) list = list.filter(p => p.category === cat);
    const hideRestricted = cat === ALL && !query;
    const shown = hideRestricted ? list.filter(p => !isRestricted(p)) : list;
    const where = cat === ALL ? L('כל המוצרים', 'All products') : label(cat);
    $('catalogTitle').innerHTML = query ? L('תוצאות חיפוש', 'Search results') : cat === ALL ? where : labelHtml(cat);
    $('catalog').classList.toggle('list', RESTRICTED.has(cat));
    const text = query ? L(`${shown.length} תוצאות ל״${query}״${cat === ALL ? '' : ` ב${where}`}`, `${shown.length} results for “${query}”${cat === ALL ? '' : ` in ${where}`}`) : L(`${shown.length} מוצרים`, `${shown.length} products`);
    $('count').textContent = text;
    let html = shown.map(cardHtml).join('');
    if (RESTRICTED.has(cat) || (query && shown.some(isRestricted))) html = `<p class="legal">${L('לפי החוק, מוצרי עישון מוצגים בשם ובמחיר בלבד, בלי תמונות ובלי מבצעים. מכירה מגיל 18 בלבד.', 'By Israeli law, smoking products are listed by name and price only, with no images or promotions. 18+ only.')}</p>` + html;
    if (hideRestricted) html += `<button type="button" class="to-smoke" data-cat="מידע בלבד"><span>${L('מוצרי עישון ואביזרי עישון', 'Tobacco and smoking accessories')}<small>${L('מוצגים ברשימה נפרדת, מגיל 18', 'Listed separately, 18+')}</small></span><span aria-hidden="true">${L('←', '→')}</span></button>`;
    $('catalog').innerHTML = shown.length ? html :
      `<div class="empty"><p>${L(`לא מצאנו מוצרים ל״${esc(query)}״${cat === ALL ? '' : ' בקטגוריה הזו'}.`, `Nothing found for “${esc(query)}”${cat === ALL ? '' : ' in this category'}.`)}</p>${cat === ALL ? '' : `<button type="button" data-cat="${esc(ALL)}">${L('חיפוש בכל המוצרים', 'Search all products')}</button>`}</div>`;
    applyView();
    if (speak) announce(`${where}: ${text}`);
  }

  /* ---------- Store shelves ---------- */
  // Photo back panel + CSS planks; drinks and alcohol sit in a fridge, ice cream in a freezer.
  const FRIDGE = { 'שתייה': 'fridge', 'אלכוהול 18+': 'fridge', 'גלידות': 'freezer' };
  // Blister packs hang on pegboard hooks, like the phone-accessories wall in a real store
  const PEG = new Set(['אביזרי סלולר']);
  let view = store.get('allenbis-view', 'shelf') === 'grid' ? 'grid' : 'shelf';
  let shelfCols = 0, shelfW = 0;
  const colsFor = w => Math.max(3, Math.min(8, Math.floor(w / 150)));
  const shelfMode = () => view === 'shelf' && !query && !RESTRICTED.has(cat);

  function slotAdd(p) {
    if (!p.buy || !canBuy(p) || isBlocked(p)) return '';
    const n = cart[p.id] || 0;
    const name = esc(nm(p));
    return `<button type="button" class="qa${n ? ' on' : ''}" data-add="${p.id}" aria-label="${n ? L(`הוספת עוד ${name}, בסל ${n}`, `One more ${name}, ${n} in cart`) : L(`הוספת ${name} לסל`, `Add ${name} to cart`)}">${n ? `<b>${n}</b>` : plusIcon}</button>`;
  }
  // Cutout photos: id -> [width, height, real height in cm]. Sizes on the shelf follow the real product.
  const CUT = window.ALLENBIS_CUT || {};
  const hasCut = id => Array.isArray(CUT[id]);
  function slotHtml(p) {
    const flag = !canBuy(p) && p.buy ? `<span class="flag">${L('אזל', 'Sold out')}</span>` : isBlocked(p) ? '<span class="flag">06:00–23:00</span>' : '';
    const sale = onSale(p);
    const priced = p.buy && hasPrice(p);
    const up = unitPrice(p);
    const low = sale ? `<span class="s-was">${L('במקום', 'was')} <bdi>${fmt(regular(p))}</bdi></span>` : `${up ? `<bdi>${up}</bdi>` : ''}<span class="s-bar" aria-hidden="true"></span>`;
    const tag = `<span class="stag${sale ? ' sale' : ''}${priced ? '' : ' soft'}">${sale ? `<span class="s-flag" aria-hidden="true">${L('מבצע', 'SALE')}</span>` : ''}<span class="t-name"><bdi>${esc(nm(p))}</bdi></span><span class="s-price">${priced ? pm(unit(p)) : esc(priceText(p))}</span><span class="s-unit">${low}</span></span>`;
    return `<div class="slot${canBuy(p) ? '' : ' oos'}${cart[p.id] ? ' in' : ''}" data-id="${p.id}"><div class="prod"><button type="button" class="face${hasCut(p.id) ? ' cut' : ' box'}" data-open="${p.id}"${hasCut(p.id) ? ` data-cut="${p.id}"` : ''} aria-label="${esc(nm(p))}, ${esc(priceText(p))}"><img src="${esc(hasCut(p.id) ? `images/cut/${p.id}.webp` : imgOf(p))}" alt="" loading="lazy" decoding="async"></button>${flag}${slotAdd(p)}<span class="stickers" aria-hidden="true">${stickers(p)}</span>${dealOf.has(p.id) ? `<span class="wobbler" aria-hidden="true"><span class="shine" style="--d:${shineDelay(p)}s">${esc((LANG === 'en' ? dealOf.get(p.id).signEn : dealOf.get(p.id).sign) || dealName(dealOf.get(p.id)))}</span></span>` : ''}</div>${tag}</div>`;
  }
  // Glass-door cooler: one door per 3 columns, a frame between doors and a handle on each.
  function doorsHtml() {
    const per = Math.min(3, shelfCols);
    let html = '<span class="glass" aria-hidden="true"></span>';
    for (let k = 0; k < shelfCols; k += per) {
      const end = Math.min(k + per, shelfCols);
      if (k) html += `<span class="mullion" style="--k:${k}" aria-hidden="true"></span>`;
      // LED strips glowing on both sides of every door
      html += `<span class="led" style="--k:${k};--o:${k ? '2px' : '-7px'}" aria-hidden="true"></span>`;
      html += `<span class="led" style="--k:${end};--o:-13px" aria-hidden="true"></span>`;
      html += `<span class="handle" style="--k:${k};--o:${k ? '1px' : '-10px'}" aria-hidden="true"></span>`;
    }
    return html;
  }
  function renderShelves() {
    const box = $('aisles');
    shelfCols = colsFor(($('catbar').clientWidth || 360) - 40);
    const groups = (cat === ALL ? cats.slice(1) : [cat])
      .filter(c => !RESTRICTED.has(c))
      .map(c => [c, products.filter(p => p.category === c)])
      .filter(([, list]) => list.length);
    box.innerHTML = groups.map(([c, list], i) => {
      const rows = [];
      for (let r = 0; r < list.length; r += shelfCols) rows.push(list.slice(r, r + shelfCols));
      const kind = FRIDGE[c] || 'dry';
      const shelves = rows.map(row => `<div class="shelf">${row.map(slotHtml).join('')}${'<div class="slot vacant" aria-hidden="true"><div class="prod"></div><span class="stag"></span></div>'.repeat(shelfCols - row.length)}</div>`).join('');
      return `<section class="aisle" aria-label="${esc(label(c))}"><div class="aisle-sign" aria-hidden="true"><small>${L('מעבר', 'Aisle')} ${i + 1}</small>${labelHtml(c)}</div><div class="unit ${kind}${PEG.has(c) ? ' peg' : ''}" style="--n:${shelfCols}">${shelves}${kind === 'dry' ? '' : doorsHtml()}</div></section>`;
    }).join('') + (cat === ALL ? `<button type="button" class="to-smoke" data-cat="מידע בלבד"><span>${L('מוצרי עישון ואביזרי עישון', 'Tobacco and smoking accessories')}<small>${L('מוצגים ברשימה נפרדת, מגיל 18', 'Listed separately, 18+')}</small></span><span aria-hidden="true">${L('←', '→')}</span></button>` : '');
    box.querySelectorAll('.unit').forEach(stockUnit);
    shelfW = box.clientWidth;
  }
  // Stock a unit like a real shelf: every product at its real relative size, repeated side by side
  // (bottles, cans) or piled up (flat bars and packs) to fill its space.
  function stockUnit(u) {
    const faces = [...u.querySelectorAll('.face.cut')];
    if (!faces.length) return;
    const peg = u.classList.contains('peg');
    const fw = faces[0].clientWidth, fh = faces[0].clientHeight - (peg ? 16 : 0);
    if (!fw || fh <= 0) return;
    const tallest = Math.max(14, ...faces.map(f => CUT[f.dataset.cut][2]));
    for (const f of faces) {
      const [iw, ih, cm] = CUT[f.dataset.cut];
      const ar = iw / ih;
      let h = fh * Math.pow((cm || tallest * 0.8) / tallest, 0.85), w = h * ar;
      if (w > fw * 0.92) { w = fw * 0.92; h = w / ar; }
      const img = (cls, style) => `<img class="${cls}" src="images/cut/${f.dataset.cut}.webp" alt="" loading="lazy" decoding="async" style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;${style}">`;
      let html = '';
      if (peg) {
        // front pack on the hook, the next one hanging just behind it
        f.innerHTML = img('bk hang', `margin-inline-end:${(-w + 7).toFixed(1)}px;margin-top:-4px`) + img('fr', '');
        continue;
      }
      if (ar >= 1.3) {
        // flat products: a pile, top of the pile first so the front one is drawn last
        const step = h * 0.56;
        const n = Math.max(1, Math.min(4, Math.floor((fh * 0.82 - h) / step) + 1));
        for (let i = n - 1; i >= 0; i--) html += img(i ? 'bk' : 'fr', `bottom:${(i * step).toFixed(1)}px;left:calc(50% - ${(w / 2).toFixed(1)}px + ${i % 2 ? 2 : -1}px);transform:rotate(${i % 2 ? -1.2 : 0.8}deg)`);
        f.innerHTML = `<span class="pile" style="height:${(h + (n - 1) * step).toFixed(1)}px">${html}</span>`;
      } else {
        const n = Math.max(1, Math.min(3, Math.floor(fw * 0.98 / (w * 0.9))));
        const gap = -w * 0.1;
        for (let i = 0; i < n; i++) html += img(i === Math.floor((n - 1) / 2) ? 'fr' : 'sd', `margin-inline:${(gap / 2).toFixed(1)}px`);
        // one facing only and room left: a second unit peeks from behind
        if (n === 1 && fw - w > w * 0.3) html = img('bk peek', `margin-inline-end:${(-w * 0.72).toFixed(1)}px`) + html;
        f.innerHTML = html;
      }
      syncFacings(f);
    }
  }
  // Units in the basket are gone from the shelf: the front one always stays, the rest leave a gap.
  function syncFacings(f) {
    const q = cart[f.dataset.cut] || 0;
    f.querySelectorAll('img:not(.fr)').forEach((im, i) => im.classList.toggle('taken', i < q));
  }
  function applyView() {
    const shelves = shelfMode();
    $('aisles').hidden = !shelves;
    $('catalog').hidden = shelves;
    $('viewToggle').hidden = !!query || RESTRICTED.has(cat);
    $('viewToggle').querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    if (shelves) renderShelves();
  }
  $('viewToggle').addEventListener('click', e => {
    const b = e.target.closest('[data-view]');
    if (!b || b.dataset.view === view) return;
    view = b.dataset.view;
    store.set('allenbis-view', view);
    applyView();
    announce(view === 'shelf' ? L('תצוגת מדפים', 'Shelf view') : L('תצוגת רשימה', 'List view'));
  });
  if ('ResizeObserver' in window) new ResizeObserver(() => {
    if (!shelfMode()) return;
    if (colsFor(($('catbar').clientWidth || 360) - 40) !== shelfCols) renderShelves();
    else if (Math.abs($('aisles').clientWidth - shelfW) > 12) { shelfW = $('aisles').clientWidth; $('aisles').querySelectorAll('.unit').forEach(stockUnit); }
  }).observe($('catbar'));

  /* ---------- Night mode ---------- */
  // On by itself 20:00–06:00 Israel time; the moon button overrides it for this visit.
  const nightHours = () => { const h = jerusalemHour(); return h >= 20 || h < 6; };
  let nightPick = null;
  try { const v = sessionStorage.getItem('allenbis-night'); if (v === '1' || v === '0') nightPick = v === '1'; } catch {}
  const isNight = () => nightPick ?? nightHours();
  function applyNight() {
    const on = isNight() && !document.documentElement.classList.contains('hc');
    const was = document.documentElement.classList.contains('night');
    document.documentElement.classList.toggle('night', on);
    $('nightBtn').setAttribute('aria-pressed', String(on));
    $('nightLabel').textContent = on ? L('מצב לילה פעיל. מעבר למצב יום', 'Night mode on. Switch to day mode') : L('מעבר למצב לילה', 'Switch to night mode');
    if (was !== on && $('homeSections').childElementCount) renderHome();
  }
  $('nightBtn').addEventListener('click', () => {
    nightPick = !document.documentElement.classList.contains('night');
    try { sessionStorage.setItem('allenbis-night', nightPick ? '1' : '0'); } catch {}
    applyNight();
    announce(nightPick ? L('מצב לילה', 'Night mode') : L('מצב יום', 'Day mode'));
  });
  setInterval(applyNight, 5 * 60e3);
  // Late-night picks: energy, coffee, munchies, ice, a charger for the dead phone. Never alcohol.
  const NIGHT_IDS = ['p27', 'p29', 'p24', 'p38', 'p44', 'p49', 'p42', 'p104', 'p89', 'p173', 'p128', 'p118', 'p18', 'p77'];

  /* ---------- Home sections ---------- */
  function rail(id, title, list, demo, extra = '') {
    if (!list.length) return '';
    return `<section aria-labelledby="${id}-t"><div class="sec-head"><h2 id="${id}-t">${esc(title)}${demoTag(demo)}</h2>${extra}<div class="nav"><button type="button" data-scroll="${id}" data-dir="1" aria-label="${L('הקודם', 'Previous')}">${L('→', '←')}</button><button type="button" data-scroll="${id}" data-dir="-1" aria-label="${L('הבא', 'Next')}">${L('←', '→')}</button></div></div><div class="rail" id="${id}">${list.map(cardHtml).join('')}</div></section>`;
  }
  const railable = p => !isRestricted(p) && canBuy(p) && imgOf(p) !== FALLBACK;
  const bundles = (DEMO.bundles?.items || []).map(b => ({ ...b, lines: b.items.map(([id, q]) => ({ p: byId.get(id), q })).filter(l => l.p && !isRestricted(l.p)) })).filter(b => b.lines.length);

  function bundleHtml(b) {
    const total = b.lines.reduce((s, { p, q }) => s + (hasPrice(p) ? unit(p) * q : 0), 0);
    const count = b.lines.reduce((s, l) => s + l.q, 0);
    return `<article class="bundle">${b.img ? `<img class="cover" src="${esc(b.img)}" alt="" loading="lazy">` : ''}<h3>${esc(LANG === 'en' && UI.bundles?.[b.id]?.title || b.title)}</h3><p>${esc(LANG === 'en' && UI.bundles?.[b.id]?.text || b.text)}</p><div class="thumbs" aria-hidden="true">${b.lines.slice(0, 5).map(({ p, q }) => `<span><img src="${esc(imgOf(p))}" alt="" loading="lazy">${q > 1 ? `<b>×${q}</b>` : ''}</span>`).join('')}</div><div class="row"><span><b><bdi>${fmt(total)}</bdi></b> · ${count} ${L('מוצרים', 'items')}</span><button type="button" data-bundle="${esc(b.id)}">${L('הוספת החבילה', 'Add bundle')}</button></div></article>`;
  }

  function multiCard(d) {
    const ps = d.products.map(id => byId.get(id)).filter(p => sellable(p) && hasPrice(p));
    if (!ps.length) return '';
    const first = ps[0];
    const was = ps.slice().sort((a, b) => unit(b) - unit(a)).slice(0, 1).map(p => unit(p) * d.qty)[0];
    return `<article class="mb"><span class="mb-sign">${esc(dealName(d))}</span><div class="mb-pics">${ps.slice(0, 4).map(p => `<button type="button" data-open="${p.id}" aria-label="${esc(nm(p))}"><img src="${esc(hasCut(p.id) ? `images/cut/${p.id}.webp` : imgOf(p))}" alt="" loading="lazy"></button>`).join('')}</div>
<p class="mb-t">${L('אפשר לערבב', 'Mix and match')} · ${L('עד', 'up to')} <bdi>${fmt(Math.max(0, was - d.price))}</bdi> ${L('הנחה', 'off')}</p><button type="button" class="mb-add" data-multi="${esc(d.id)}">${L(`הוספת ${d.qty} לסל`, `Add ${d.qty} to cart`)}</button></article>`;
  }
  function renderHome() {
    const again = [];
    for (const o of orders.slice().reverse()) for (const [id] of o.lines) { const p = byId.get(id); if (p && railable(p) && !again.includes(p)) again.push(p); }
    const under10 = products.filter(p => railable(p) && hasPrice(p) && unit(p) <= 1000).sort((a, b) => unit(a) - unit(b));
    const dealList = pick(Object.keys(deals)).filter(railable);
    const night = document.documentElement.classList.contains('night');
    $('homeSections').innerHTML = friendHtml(false) +
      (night ? rail('r-night', L(`הלילה עוד צעיר · אצלך תוך ${ETA} דק׳`, `The night is young · at your door in ${ETA} min`), pick(NIGHT_IDS).filter(p => railable(p) && canBuy(p)), false).replace('<section ', '<section class="night-rail" ') : '') +
      rail('r-again', L('קנה שוב', 'Buy again'), again.slice(0, 12), false, orders.length ? `<button type="button" class="again-btn" data-again>${L('הזמנה חוזרת', 'Reorder')}</button>` : '') +
      rail('r-deals', L('מבצעים', 'Deals'), dealList, DEMO.deals?.example) +
      (MULTI.length ? `<section aria-labelledby="mb-t"><div class="sec-head"><h2 id="mb-t">${L('מבצעי כמות', 'Multi-buy deals')}${demoTag(DEMO.multibuy?.example)}</h2></div><div class="mb-row">${MULTI.map(multiCard).join('')}</div></section>` : '') +
      rail('r-best', L('הכי נמכרים', 'Best sellers'), pick(DEMO.bestsellers?.ids).filter(railable), DEMO.bestsellers?.example) +
      (bundles.length ? `<section aria-labelledby="b-t"><div class="sec-head"><h2 id="b-t">${L('חבילות מוכנות', 'Ready-made bundles')}${demoTag(DEMO.bundles?.example)}</h2></div><div class="bundles">${bundles.map(bundleHtml).join('')}</div></section>` : '') +
      rail('r-10', L('עד 10 ₪', 'Under ₪10'), under10);
  }

  /* ---------- Taking a product off the shelf ---------- */
  const calm = () => document.documentElement.classList.contains('nomo') || matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Motion: counting sums, rolling digits, rotating words, a coupon you tear, a turning sign ----------
   * Plain-JS ports of effects from React Bits (CountUp, Counter, RotatingText, TearTicket, CircularText, ShinyText),
   * https://github.com/DavidHDev/react-bits, MIT + Commons Clause, see THIRD_PARTY_NOTICES.md.
   * All of them stand still with "stop animations" or the system's reduced-motion setting. */
  const counted = new Map();
  function countTo(el, to, key, from = counted.has(key) ? counted.get(key) : to) {
    counted.set(key, to);
    cancelAnimationFrame(el._count);
    if (calm() || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = Math.min(900, 380 + Math.abs(to - from) / 6);
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
      if (k < 1) el._count = requestAnimationFrame(tick);
    };
    el._count = requestAnimationFrame(tick);
  }
  // A sum that just appeared (a first saving) counts up from zero; one that went away starts from zero next time.
  function countAll(root, scope) {
    const seen = new Set();
    root.querySelectorAll('[data-count]').forEach(el => {
      const key = `${scope}-${el.dataset.count}`;
      seen.add(key);
      countTo(el, +el.dataset.v, key, counted.has(key) ? counted.get(key) : el.dataset.count === 'total' ? +el.dataset.v : 0);
    });
    for (const k of counted.keys()) if (k.startsWith(scope + '-') && !seen.has(k) && !k.endsWith('-total')) counted.set(k, 0);
  }
  // Digits that roll like a departure board
  const DIGITS = '0123456789'.split('').map(d => `<span>${d}</span>`).join('');
  function roll(el, n, from) {
    const s = String(n);
    if (calm()) { el.textContent = s; el._v = s; return; }
    const prev = String(from ?? el._v ?? s);
    let box = el.querySelector('.roll');
    if (!box || box.children.length !== s.length) {
      const start = prev.padStart(s.length, '0').slice(-s.length);
      el.innerHTML = `<span class="sr-only">${s}</span><span class="roll" aria-hidden="true">${[...start].map(d => `<span class="rd"><span style="transform:translateY(-${d * 10}%)">${DIGITS}</span></span>`).join('')}</span>`;
      box = el.querySelector('.roll');
      void box.offsetWidth;
    } else el.firstChild.textContent = s;
    [...s].forEach((d, i) => { box.children[i].firstChild.style.transform = `translateY(-${d * 10}%)`; });
    el._v = s;
  }
  // The hero line: "<Bamba> to your door."
  const ROT_WORDS = LANG === 'en' ? ['Bamba', 'Cold Coke', 'Ice', 'A charger', 'Ice cream', 'Bissli', 'Red Bull'] : ['במבה', 'קולה קרה', 'קרח', 'מטען', 'גלידה', 'ביסלי', 'רד בול'];
  function startRotator() {
    const h = $('heroTitle');
    if (!h || calm()) return;
    h.innerHTML = `<span class="sr-only">${esc(h.textContent)}</span><span aria-hidden="true"><span class="rot"></span> ${L('עד הדלת שלך.', 'to your door.')}</span>`;
    const box = h.querySelector('.rot');
    let i = 0, cur = null;
    const next = () => {
      if (cur && (document.hidden || calm())) return;
      const word = ROT_WORDS[i++ % ROT_WORDS.length];
      const w = document.createElement('span');
      w.className = 'rot-w';
      w.innerHTML = [...word].map((c, k) => `<span class="rc" style="animation-delay:${k * 32}ms">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
      if (cur) { const old = cur; old.classList.add('out'); old.querySelectorAll('.rc').forEach((c, k) => { c.style.animationDelay = `${k * 22}ms`; }); setTimeout(() => old.remove(), 600); }
      box.append(w);
      box.style.width = `${w.offsetWidth}px`;
      cur = w;
    };
    next();
    setInterval(next, 2600);
  }
  // Night: a round "open 24/7" sign turning slowly by the neon
  function circleText() {
    const n = document.querySelector('.neon');
    if (!n) return;
    const text = L('פתוח 24/7 • משלוחים עד הדלת • ', 'OPEN 24/7 • DELIVERY TO YOUR DOOR • ');
    // Hebrew runs right to left around the circle; numbers inside it still read left to right
    const chars = LANG === 'en' ? [...text] : text.split(/([0-9/]+)/).flatMap((part, i) => i % 2 ? [...part].reverse() : [...part]);
    const step = 360 / chars.length, dir = LANG === 'en' ? 1 : -1;
    n.insertAdjacentHTML('beforeend', `<span class="n-ring" aria-hidden="true"><span class="n-spin${dir < 0 ? ' ccw' : ''}">${chars.map((c, i) => `<span style="transform:rotate(${(dir * i * step).toFixed(2)}deg)">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</span><b>★</b></span>`);
  }
  // A friend's discount as a coupon: drag the stub (or tap it) and it tears off and falls
  let tear = null;
  const tearSide = () => (document.documentElement.dir === 'ltr' ? 1 : -1); // which way is "out" for the stub
  function dropStub(stub, angle) {
    const card = stub.closest('.ticket');
    const done = () => {
      stub.remove();
      card.classList.add('torn');
      store.set('allenbis-ref-torn', refCode);
      card.querySelector('.tk-saved').textContent = L('✓ שמור לכם', '✓ Saved for you');
      toast(L('ההנחה מחבר שמורה לכם', 'Your friend discount is saved'));
      card.querySelector('h2').setAttribute('tabindex', '-1');
      card.querySelector('h2').focus({ preventScroll: true });
    };
    if (calm()) return done();
    card.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-tearSide() * 4}px)` }, { transform: 'translateX(0)' }], { duration: 260, easing: 'ease-out' });
    const t0 = performance.now(), side = tearSide(), spin = 140 + Math.random() * 120;
    let x = 0, y = 0, vx = side * (90 + Math.random() * 80), vy = -120, last = t0;
    const fall = now => {
      const dt = Math.min(0.034, (now - last) / 1000), age = (now - t0) / 1000;
      last = now;
      vy += 2400 * dt; x += vx * dt; y += vy * dt; angle += -side * spin * dt;
      stub.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${angle.toFixed(1)}deg)`;
      stub.style.opacity = String(Math.max(0, 1 - Math.max(0, age - 0.18) / 0.45));
      if (age < 0.65) requestAnimationFrame(fall); else done();
    };
    stub.classList.add('free');
    requestAnimationFrame(fall);
  }
  document.addEventListener('pointerdown', e => {
    const stub = e.target.closest('[data-tear]');
    if (!stub || calm() || e.button) return;
    tear = { stub, id: e.pointerId, x: e.clientX, y: e.clientY, a: 0, moved: false };
    stub.dataset.dragged = '';
    stub.setPointerCapture(e.pointerId);
    stub.classList.add('held');
  });
  document.addEventListener('pointermove', e => {
    if (!tear || e.pointerId !== tear.id) return;
    const out = (e.clientX - tear.x) * tearSide(), down = e.clientY - tear.y;
    const pull = Math.max(0, down * 0.55 + out * 0.85);
    if (pull > 6) tear.moved = true;
    tear.a = Math.min(34, pull / 2.4);
    tear.stub.style.transform = `rotate(${(-tearSide() * tear.a).toFixed(2)}deg)`;
    if (tear.a >= 24) { const { stub, a } = tear; tear = null; stub.classList.remove('held'); dropStub(stub, -tearSide() * a); }
  });
  const letGo = e => {
    if (!tear || e.pointerId !== tear.id) return;
    const { stub, moved } = tear;
    tear = null;
    stub.classList.remove('held');
    stub.dataset.dragged = moved ? '1' : '';
    stub.style.transition = 'transform .35s cubic-bezier(.3,1.6,.5,1)';
    stub.style.transform = '';
    setTimeout(() => { stub.style.transition = ''; }, 360);
  };
  document.addEventListener('pointerup', letGo);
  document.addEventListener('pointercancel', letGo);
  document.addEventListener('click', e => {
    const stub = e.target.closest('[data-tear]');
    if (!stub || stub.classList.contains('free')) return;
    if (stub.dataset.dragged) { stub.dataset.dragged = ''; return; }
    if (calm()) return dropStub(stub, 0);
    // a tap tears it for you: the stub swings open, then lets go
    const a = -tearSide() * 26;
    stub.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${a}deg)` }], { duration: 260, easing: 'cubic-bezier(.5,0,.7,1)' }).onfinish = () => dropStub(stub, a);
  });
  // The picture that flies: the next unit on the shelf (or the product photo on a card).
  function flySource(btn) {
    if (btn.closest('dialog')) return null;
    const host = btn.closest('.slot, .card');
    const im = host && (host.querySelector('.face.cut img:not(.fr):not(.taken)') || host.querySelector('.face img.fr, .face img, .pic img'));
    if (!im || !im.complete || !im.naturalWidth) return null;
    const r = im.getBoundingClientRect();
    return r.width && r.bottom > 0 && r.top < innerHeight ? { src: im.currentSrc || im.src, r } : null;
  }
  function cartTarget() {
    const bar = $('bar'), b = bar.getBoundingClientRect();
    return b.height && b.top < innerHeight ? bar : $('openCart');
  }
  function bump(el) { if (!calm()) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' }); }
  function fly(from) {
    const to = cartTarget();
    if (!from || calm()) { bump(to); return; }
    const t = to.getBoundingClientRect(), r = from.r;
    const el = document.createElement('img');
    el.src = from.src; el.alt = ''; el.className = 'flyer';
    Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.append(el);
    const dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2);
    const k = Math.min(1, 34 / Math.max(r.width, r.height));
    const lift = Math.min(120, 40 + Math.abs(dy) * 0.25);
    el.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.35}px,${dy * 0.35 - lift}px) scale(${(1 + k) / 1.6}) rotate(-10deg)`, opacity: 1, offset: 0.4 },
      { transform: `translate(${dx}px,${dy}px) scale(${k}) rotate(6deg)`, opacity: 0.5 }
    ], { duration: 680, easing: 'cubic-bezier(.4,0,.25,1)' }).finished.then(() => { el.remove(); bump(to); }, () => el.remove());
  }

  /* ---------- Global clicks ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    const add = t.closest('[data-add]');
    const dec = t.closest('[data-dec]');
    if (add) {
      const id = add.dataset.add, before = cart[id] || 0, from = flySource(add);
      change(id, 1);
      if ((cart[id] || 0) > before) fly(from);
      return;
    }
    if (dec) { change(dec.dataset.dec, -1); return; }
    const open = t.closest('[data-open]');
    if (open) { closeSuggest(); pushRecent($('q').value); openProduct(open.dataset.open); return; }
    const c = t.closest('[data-cat]');
    if (c && !t.closest('#suggest')) { requestCat(c.dataset.cat); return; }
    const sc = t.closest('[data-scroll]');
    if (sc) { const r = $(sc.dataset.scroll); r.scrollBy({ left: -+sc.dataset.dir * r.clientWidth * 0.9 * (LANG === 'en' ? -1 : 1), behavior: 'smooth' }); return; }
    const mb = t.closest('[data-multi]');
    if (mb) { const d = MULTI.find(x => x.id === mb.dataset.multi); const p = d && d.products.map(id => byId.get(id)).find(x => sellable(x)); if (p) addLines([{ p, q: d.qty }], L(`${d.qty} × ${nm(p)} נוספו לסל`, `${d.qty} × ${nm(p)} added to cart`)); return; }
    const b = t.closest('[data-bundle]');
    if (b) { addLines(bundles.find(x => x.id === b.dataset.bundle).lines, L('החבילה נוספה לסל', 'Bundle added to cart')); return; }
    if (t.closest('[data-again]') && orders.length) {
      addLines(orders[orders.length - 1].lines.map(([id, q]) => ({ p: byId.get(id), q })).filter(l => l.p), L('ההזמנה האחרונה נוספה לסל', 'Your last order was added to the cart'));
    }
  });

  function addLines(ls, msg) {
    let skipped = 0;
    for (const { p, q } of ls) {
      if (!sellable(p)) { skipped++; continue; }
      cart[p.id] = Math.min(MAX_QTY, (cart[p.id] || 0) + q);
      refreshCards(p.id);
    }
    save();
    updateCartUi();
    const note = skipped ? L(` (${skipped} מוצרים לא זמינים כרגע)`, ` (${skipped} items unavailable right now)`) : '';
    toast(msg + note);
    announce(msg + note);
    if ($('cart').open) renderCart();
  }

  /* ---------- Budget basket ---------- */
  const B = CFG.budget || {};
  const pool = products.filter(p => sellable(p) && hasPrice(p) && unit(p) > 0 && imgOf(p) && imgOf(p) !== FALLBACK && !isRestricted(p) &&
    (!Array.isArray(B.categories) || B.categories.includes(p.category)));
  const cheapest = pool.reduce((m, p) => Math.min(m, unit(p)), Infinity);
  let basket = null;
  let budgetMinor = 0;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function buildBasket(limit) {
    const maxItems = B.maxItems || 30, maxPer = B.maxPerProduct || 5;
    const groups = {};
    for (const p of shuffle([...pool])) (groups[p.category] ||= []).push(p);
    const order = [];
    const keys = shuffle(Object.keys(groups));
    for (let i = 0; keys.some(k => groups[k][i]); i++) for (const k of keys) if (groups[k][i]) order.push(groups[k][i]);
    const picked = new Map();
    let total = 0, count = 0;
    for (const p of order) {
      if (count >= maxItems) break;
      if (total + unit(p) <= limit) { picked.set(p.id, 1); total += unit(p); count++; }
    }
    let grew = true;
    while (grew && count < maxItems) {
      grew = false;
      for (const id of shuffle([...picked.keys()])) {
        const p = byId.get(id);
        if (count < maxItems && picked.get(id) < maxPer && total + unit(p) <= limit) { picked.set(id, picked.get(id) + 1); total += unit(p); count++; grew = true; }
      }
    }
    return { lines: [...picked].map(([id, q]) => ({ p: byId.get(id), q })), total, count };
  }
  /* ---------- The quiz: plan, people, taste, budget → a basket that fits ---------- */
  const PLANS = {
    movie: { label: 'ערב סרט', en: 'a movie night', per: 35, w: { salty: 3, soda: 3, choc: 2, candy: 1.5, icecream: 1, juice: 1 } },
    // A date is always for two: dessert to share, good chocolate, something bubbly and a mint for later
    date: { label: 'דייט', en: 'a date', per: 45, people: 2, w: { icecream: 3, choc: 2.5, cookies: 1.5, mixer: 1.5, juice: 1, mint: 1 },
      pref: ['p181', 'p89', 'p67', 'p88', 'p20', 'p62', 'p73', 'p77'], must: ['p181'] },
    party: { label: 'חברים', en: 'friends', per: 40, w: { soda: 3, salty: 3, nuts: 2, mixer: 1, juice: 1, candy: 1, ice: 1.5 } },
    night: { label: 'לילה לבן', en: 'an all-nighter', per: 30, w: { energy: 3, coffee: 2, choc: 2, salty: 1.5, mint: 1, water: 1 } },
    snack: { label: 'נשנוש', en: 'a snack', per: 30, w: { choc: 2.5, salty: 2, cookies: 1.5, soda: 1, juice: 1, candy: 1, icecream: 1 } },
    meal: { label: 'ארוחה מהירה', en: 'a quick meal', per: 40, w: { instant: 3, soda: 2, canned: 1, crackers: 1, water: 1, choc: 1 } }
  };
  const FOR_WHOM = LANG === 'en' ? { 1: 'for one', 2: 'for two', 4: 'for 3–5', 7: 'for 6+' } : { 1: 'לאחד', 2: 'לשניים', 4: 'ל-3–5', 7: 'ל-6 ומעלה' };
  const planName = k => LANG === 'en' ? PLANS[k].en : PLANS[k].label;
  const SALTY = new Set(['salty', 'nuts', 'crackers']);
  const sugarFree = p => kindOf(p) === 'water' || ['p14', 'p20'].includes(p.id) || /ללא סוכר|זירו|zero|מקס|max|free|sugarfree|ultra/i.test(`${p.name} ${p.sub || ''}`);
  const quizPool = products.filter(p => sellable(p) && hasPrice(p) && unit(p) > 0 && !isRestricted(p) && p.category !== ALCOHOL && (hasCut(p.id) || imgOf(p) !== FALLBACK));
  const answers = { plan: null, people: 0, taste: new Set() };

  function quizWeights(a) {
    const w = { ...PLANS[a.plan].w };
    const t = a.taste, sweet = t.has('sweet'), salty = t.has('salty');
    const mul = (set, f) => { for (const k of Object.keys(w)) if (set.has(k)) w[k] *= f; };
    if (sweet && !salty) { mul(SWEET, 1.8); mul(SALTY, 0.3); if (!w.choc) w.choc = 2; if (!w.cookies) w.cookies = 1; }
    if (salty && !sweet) { mul(SALTY, 1.8); mul(SWEET, 0.3); if (!w.salty) w.salty = 2; }
    if (sweet && salty) { mul(SWEET, 1.3); mul(SALTY, 1.3); }
    if (t.has('drinks')) { mul(DRINK, 1.7); if (!w.water) w.water = 1; }
    if (t.has('icecream')) w.icecream = Math.max(w.icecream || 0, 3);
    if (t.has('nosugar')) { w.water = (w.water || 0) + 1.5; delete w.juice; }
    if (a.people >= 6 && !w.ice) w.ice = 1;
    return w;
  }
  // Big bottles for a crowd, single-serve for one
  const sizeFit = (p, people) => {
    if (!DRINK.has(kindOf(p))) return 1;
    const big = /1\.5 ליטר|רביעיית/.test(p.name);
    return people >= 3 ? (big ? 2.2 : 0.6) : people === 1 ? (big ? 0.5 : 1.4) : (big ? 1.5 : 0.9);
  };
  function quizBasket(a, limit) {
    const w = quizWeights(a);
    const maxItems = B.maxItems || 30, maxPer = B.maxPerProduct || 5;
    const byKind = {};
    for (const p of quizPool) {
      const k = kindOf(p);
      if (!w[k] || (a.taste.has('nosugar') && DRINK.has(k) && !sugarFree(p))) continue;
      const special = PLANS[a.plan].pref?.includes(p.id) ? 2.5 : 1;
      const score = special * (bestIds.has(p.id) ? 1.3 : 1) * (onSale(p) ? 1.2 : 1) * sizeFit(p, a.people) * (0.6 + Math.random() * 0.8);
      (byKind[k] ||= []).push({ p, score });
    }
    for (const k in byKind) byKind[k] = byKind[k].sort((x, y) => y.score - x.score).map(x => x.p);
    const picked = new Map(), taken = {};
    const capOf = p => kindOf(p) === 'ice' ? Math.ceil(a.people / 5) : maxPer;
    const fits = p => total + unit(p) <= limit && (picked.get(p.id) || 0) < capOf(p);
    const newShare = a.people >= 3 ? 0.5 : 0.75;
    let total = 0, count = 0;
    // the plan's signature product goes in first whenever it's in stock and fits the budget (Franui for a date)
    for (const id of PLANS[a.plan].must || []) {
      const p = quizPool.find(x => x.id === id);
      if (!p || !fits(p)) continue;
      picked.set(id, 1); total += unit(p); count++; taken[kindOf(p)] = (taken[kindOf(p)] || 0) + 1;
    }
    while (count < maxItems) {
      const kinds = Object.keys(byKind).filter(k => byKind[k].some(fits));
      if (!kinds.length) break;
      const ws = kinds.map(k => w[k] / (1 + (taken[k] || 0) * 1.2));
      let k;
      if (count < 3) k = kinds[ws.indexOf(Math.max(...ws))];
      else { let r = Math.random() * ws.reduce((x, y) => x + y, 0); k = kinds.find((_, i) => (r -= ws[i]) <= 0) || kinds[0]; }
      const list = byKind[k].filter(fits);
      const fresh = list.find(p => !picked.has(p.id)), again = list.find(p => picked.has(p.id));
      const p = fresh && (!again || Math.random() < newShare) ? fresh : again || fresh;
      picked.set(p.id, (picked.get(p.id) || 0) + 1);
      total += unit(p); count++; taken[k] = (taken[k] || 0) + 1;
    }
    return { lines: [...picked].map(([id, q]) => ({ p: byId.get(id), q })), total, count };
  }
  const suggestBudget = a => Math.max(40, Math.round(PLANS[a.plan].per * a.people / 10) * 10);

  let qzStep = 0;
  function showStep(n, focus) {
    qzStep = n;
    $('quiz').querySelectorAll('.qz-step').forEach(el => { el.hidden = +el.dataset.step !== n; });
    $('quiz').querySelectorAll('.qz-dots i').forEach((d, i) => d.classList.toggle('on', i <= n));
    $('qzBack').hidden = n === 0;
    if (n === 3) {
      const sug = suggestBudget(answers);
      if (!$('budget').dataset.touched) $('budget').value = sug;
      $('qzHint').textContent = L(`הצעה ל${planName(answers.plan)} ${FOR_WHOM[answers.people]}: ${fmt(sug * 100)}. אפשר לשנות.`, `Suggested for ${planName(answers.plan)} ${FOR_WHOM[answers.people]}: ${fmt(sug * 100)}. Change it if you like.`);
      document.querySelector('#quiz .quick').innerHTML = [...new Set([Math.round(sug * 0.7 / 10) * 10, sug, Math.round(sug * 1.5 / 10) * 10])]
        .filter(v => v >= 20).map(v => `<button type="button" data-amount="${v}">${L(`‏${v} ₪`, `₪${v}`)}</button>`).join('');
    }
    if (focus) {
      const q = $(`qzQ${n}`);
      q.focus({ preventScroll: true });
      const top = $('top').getBoundingClientRect().bottom;
      if (q.getBoundingClientRect().top < top + 8) q.scrollIntoView({ block: 'start' });
      announce(L(`שאלה ${n + 1} מתוך 4`, `Question ${n + 1} of 4`));
    }
  }
  $('quiz').addEventListener('click', e => {
    const b = e.target.closest('[data-q]');
    if (b) {
      const { q, v } = b.dataset;
      if (q === 'taste') {
        answers.taste.has(v) ? answers.taste.delete(v) : answers.taste.add(v);
        b.setAttribute('aria-pressed', String(answers.taste.has(v)));
        return;
      }
      b.parentElement.querySelectorAll('[data-q]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      if (q === 'plan') answers.plan = v; else answers.people = +v;
      delete $('budget').dataset.touched;
      // plans with a fixed number of people (a date) skip "how many"
      const fixed = q === 'plan' && PLANS[v].people;
      if (fixed) {
        answers.people = fixed;
        $('quiz').querySelectorAll('[data-q="people"]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.v === fixed)));
      }
      showStep(qzStep + (fixed ? 2 : 1), true);
      return;
    }
    if (e.target.closest('#qzNext')) showStep(3, true);
    if (e.target.closest('#qzBack')) showStep(qzStep === 2 && PLANS[answers.plan]?.people ? 0 : Math.max(0, qzStep - 1), true);
  });
  $('budget').addEventListener('input', () => { $('budget').dataset.touched = '1'; });
  showStep(0, false);

  function renderBasket() {
    const a = !answers.plan ? '' : L(`סל ל${planName(answers.plan)} ${FOR_WHOM[answers.people]}${answers.taste.has('nosugar') ? ', שתייה בלי סוכר' : ''}, `, `A basket for ${planName(answers.plan)} ${FOR_WHOM[answers.people]}${answers.taste.has('nosugar') ? ', sugar-free drinks' : ''}, `);
    $('basketBody').innerHTML = `<p class="note-box">${esc(a)}${L('בתקציב של', 'on a budget of')} <bdi>${fmt(budgetMinor)}</bdi>: ${L(`הרכבנו ${basket.count} פריטים. לא מתאים? אפשר לערבב שוב.`, `${basket.count} items. Not quite right? Shuffle again.`)}</p>` +
      basket.lines.map(({ p, q }) => lineHtml(p, q, false)).join('');
    $('basketFoot').innerHTML = `<div class="totals"><div class="row big"><span>${L('סה״כ', 'Total')}</span><bdi>${fmt(basket.total)}</bdi></div><div class="muted">${L('נשארו', 'Left over:')} <bdi>${fmt(budgetMinor - basket.total)}</bdi>${L(' מהתקציב.', '')}</div></div>
<button class="primary" type="button" id="basketAdd">${L('הוספת הכול לסל', 'Add all to cart')}</button>
<button class="secondary" type="button" id="basketShuffle">${L('ערבוב מחדש', 'Shuffle again')}</button>`;
  }
  document.querySelector('.quick').addEventListener('click', e => {
    const b = e.target.closest('[data-amount]');
    if (!b) return;
    $('budget').value = b.dataset.amount;
    $('budgetForm').requestSubmit();
  });
  $('budget').addEventListener('input', () => { $('budgetErr').textContent = ''; $('budget').removeAttribute('aria-invalid'); });
  $('budgetForm').addEventListener('submit', e => {
    e.preventDefault();
    const raw = $('budget').value.trim().replace(/[₪,\s]/g, '') || $('budget').placeholder;
    const fail = msg => { $('budgetErr').textContent = msg; $('budget').setAttribute('aria-invalid', 'true'); $('budget').focus(); };
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) return fail(L('כתבו סכום במספרים, למשל 100.', 'Enter an amount in numbers, e.g. 100.'));
    budgetMinor = Math.round(parseFloat(raw) * 100);
    const max = B.maxMinor || 100000;
    if (budgetMinor > max) return fail(L(`אפשר להרכיב סל עד ${fmt(max)}.`, `Baskets go up to ${fmt(max)}.`));
    if (!pool.length) return fail(L('בונה הסלים לא זמין כרגע.', 'The basket builder is unavailable right now.'));
    if (budgetMinor < cheapest) return fail(L(`המוצר הזול ביותר עולה ${fmt(cheapest)}. נסו סכום גבוה יותר.`, `The cheapest item is ${fmt(cheapest)}. Try a higher amount.`));
    $('budgetErr').textContent = '';
    $('budget').removeAttribute('aria-invalid');
    basket = answers.plan ? quizBasket(answers, budgetMinor) : buildBasket(budgetMinor);
    if (!basket.count) return fail(L('לא מצאנו מוצרים שמתאימים לבחירות בתקציב הזה. נסו סכום גבוה יותר.', 'Nothing matches your choices on this budget. Try a higher amount.'));
    renderBasket();
    openDialog('basket');
  });
  $('basketFoot').addEventListener('click', e => {
    if (e.target.closest('#basketShuffle')) {
      basket = answers.plan ? quizBasket(answers, budgetMinor) : buildBasket(budgetMinor);
      renderBasket();
      $('basketShuffle').focus();
      announce(L(`ערבבנו מחדש: ${basket.count} פריטים, ${fmt(basket.total)}.`, `Shuffled: ${basket.count} items, ${fmt(basket.total)}.`));
    }
    if (e.target.closest('#basketAdd')) {
      $('basket').close();
      addLines(basket.lines, L(`${basket.count} פריטים נוספו לסל`, `${basket.count} items added to cart`));
      openCart();
    }
  });

  /* ---------- Delivery area: is this street ours? ---------- */
  const AREA = DEMO.area || {};
  const streetKey = v => norm(v).replace(/^(רחוב|רח|שדרות|שד|sderot|rehov)\s+/, '').replace(/\s*\d.*$/, '').trim();
  const STREETS = [...(AREA.streets || []), ...(AREA.streets?.length ? UI.streets || [] : [])].map(n => [n, streetKey(n)]);
  function checkStreet(v) {
    const k = streetKey(v);
    if (k.length < 2 || !STREETS.length) return null;
    const hit = STREETS.find(([, s]) => s === k) || (k.length >= 3 && STREETS.find(([, s]) => s.startsWith(k) || k.startsWith(s + ' '))) || (k.length >= 4 && STREETS.find(([, s]) => near(k, s)));
    return hit ? { ok: true, name: hit[0] } : { ok: false };
  }
  function areaHtml(v) {
    const r = checkStreet(v);
    if (!r) return '';
    return r.ok ? `<span class="ok">✓ <bdi>${esc(r.name)}</bdi> · ${L('באזור המשלוחים', 'we deliver here')}</span>`
      : `<span class="no">${L(`לא מצאנו את הרחוב באזור המשלוחים (${esc(D.area || '')}). אפשר עדיין לשלוח, והחנות תבדוק.`, `This street isn't on our delivery list (${esc(AREA_NAME || '')}). You can still send the order and the store will check.`)}</span>`;
  }
  let areaTimer;
  $('coStreet').addEventListener('input', () => { clearTimeout(areaTimer); areaTimer = setTimeout(() => { $('coArea').innerHTML = areaHtml($('coStreet').value); }, 250); });

  /* ---------- Checkout: the order goes to the store (order system), or as a WhatsApp message ---------- */
  const WA = String(DEMO.order?.whatsapp || '').replace(/\D/g, '');
  const DEMO_STORE = API?.mode === 'local';
  let pending = null, placing = false;
  function coStep(send) {
    $('coForm').hidden = send; $('coFoot').hidden = send;
    $('coSend').hidden = !send; $('coSendFoot').hidden = !send;
  }
  const submitLabel = t => `${API ? L('שליחת ההזמנה לחנות', 'Send order to the store') : L('המשך לשליחה', 'Continue')} · <bdi>${fmt(t.total)}</bdi>`;
  function openCheckout() {
    const t = totals();
    coStep(false);
    $('coIntro').textContent = DEMO_STORE
      ? L('הדגמה: ההזמנה נשמרת בדפדפן הזה ומגיעה ל"מסך החנות", שם אפשר לאשר אותה ולראות את המעקב מתעדכן כאן. באתר האמיתי היא מגיעה לחנות.', 'Demo: the order is saved in this browser and reaches the "store screen", where you can accept it and watch tracking update here. On the live site it goes to the store.')
      : API ? L('ממלאים פרטים, וההזמנה נשלחת ישר לחנות. אפשר לעקוב כאן אחרי כל שלב, עד שהיא אצלכם.', 'Fill in your details and your order goes straight to the store. You can follow every step here until it reaches you.')
      : WA ? L('ממלאים פרטים, ובלחיצה אחת ההזמנה נשלחת לחנות בוואטסאפ. החנות מאשרת את ההזמנה בהודעה חוזרת.', 'Fill in your details and your order goes to the store on WhatsApp in one tap. The store confirms it in a reply.')
      : L('ממלאים פרטים, וההזמנה נפתחת כהודעה מוכנה בוואטסאפ. מספר החנות עוד לא הוגדר, אז אפשר לשלוח את ההודעה למי שרוצים (למשל לעצמכם, לבדיקה).', "Fill in your details and your order opens as a ready WhatsApp message. The store's number isn't set yet, so you can send it to anyone (yourself, as a test).");
    $('coTotals').innerHTML = totalsHtml(t);
    $('coSubmit').innerHTML = submitLabel(t);
    openDialog('checkout');
  }
  function fieldErr(id, msg) {
    $(id).setAttribute('aria-invalid', msg ? 'true' : 'false');
    $(id + 'Err').textContent = msg;
    return !msg;
  }
  function orderMessage(t, f) {
    const ls = lines().filter(l => !isBlocked(l.p));
    const out = ['הזמנה חדשה מהאתר – אלנביס', ''];
    for (const { p, q } of ls) out.push(`${q} × ${p.name} – ${hasPrice(p) ? fmt(unit(p) * q) : 'מחיר יעודכן'}`);
    out.push('', `מוצרים: ${fmt(t.sub + t.multi)}`);
    for (const x of t.deals) if (x.saving) out.push(`${x.d.label}: −${fmt(x.saving)}`);
    if (t.welcome) out.push(`${BENEFIT_HE[t.benefit.kind]}${t.benefit.code ? ` (קוד ${t.benefit.code})` : ''}: −${fmt(t.welcome)}`);
    if (t.wheelOff) out.push(`גלגל המזל: −${fmt(t.wheelOff)}`);
    if (t.prize?.type === 'gift') out.push(`מתנה מגלגל המזל: ${byId.get(t.prize.product).name} (חינם)`);
    out.push(`משלוח: ${t.fee ? fmt(t.fee) : 'חינם'}`, `סה״כ לתשלום: ${fmt(t.total)}`, `תשלום: ${f.pay}`, '');
    out.push(`שם: ${f.name}`, `טלפון: ${f.phone}`, `כתובת: ${f.street}${f.apt ? `, ${f.apt}` : ''}`);
    if (f.note) out.push(`הערה לשליח: ${f.note}`);
    if (f.area === false) out.push('לבדיקה: הרחוב לא ברשימת אזור המשלוחים.');
    if (LANG === 'en') out.push('הלקוח הזמין באנגלית.');
    if (ls.some(l => isAdult(l.p.category))) out.push('', 'בהזמנה יש מוצרים מגיל 18: אציג תעודה מזהה לשליח.');
    return out.join('\n');
  }
  // The WhatsApp step: the usual way without an order system, and the way out when it can't be reached
  function showWa(failed) {
    const text = pending.text;
    $('coPreview').textContent = text;
    $('coSendNote').textContent = failed ? L('לא הצלחנו להעביר את ההזמנה לחנות כרגע. אפשר לשלוח אותה בוואטסאפ, עם כל הפרטים:', "We couldn't reach the store just now. You can send the order on WhatsApp instead, with all the details:")
      : WA ? L('זו ההודעה שתישלח לחנות. בלחיצה על הכפתור וואטסאפ נפתח עם ההודעה מוכנה, ונשאר רק ללחוץ על שליחה.', 'This is the message the store will get (in Hebrew, for the staff). The button opens WhatsApp with it ready; just tap send.')
      : L('זו ההודעה שתישלח. מספר החנות עוד לא הוגדר, אז וואטסאפ ייפתח ותבחרו למי לשלוח אותה.', "This is the message that will be sent (in Hebrew, for the staff). The store's number isn't set yet, so WhatsApp opens and you choose who to send it to.");
    $('coWa').href = `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
    $('coWaText').textContent = WA ? L('שליחה לחנות בוואטסאפ', 'Send to the store on WhatsApp') : L('פתיחה בוואטסאפ', 'Open in WhatsApp');
    coStep(true);
    $('coSendTitle').focus();
  }
  $('coForm').addEventListener('submit', e => {
    e.preventDefault();
    if (placing) return;
    const phone = $('coPhone').value.replace(/[\s-]/g, '');
    const ok = [
      fieldErr('coName', $('coName').value.trim().length < 2 ? L('כתבו שם, כדי שהשליח ידע למי למסור.', 'Enter a name so the courier knows who to hand it to.') : ''),
      fieldErr('coPhone', /^(05\d{8}|0[2-489]\d{7}|07\d{8})$/.test(phone) ? '' : L('כתבו מספר טלפון ישראלי, למשל 050-1234567.', 'Enter an Israeli phone number, e.g. 050-1234567.')),
      fieldErr('coStreet', /\d/.test($('coStreet').value) && $('coStreet').value.trim().length > 3 ? '' : L('כתבו רחוב ומספר בית, למשל אלנבי 1.', 'Enter a street and number, e.g. Allenby 1.')),
      fieldErr('coTerms', $('coTerms').checked ? '' : L('כדי להזמין צריך לאשר את התקנון ואת מדיניות הביטולים.', 'Please accept the terms and the cancellation policy to order.'))
    ];
    if (ok.includes(false)) { $('coForm').querySelector('[aria-invalid="true"]').focus(); return; }
    const t = totals();
    const f = { name: $('coName').value.trim(), phone: $('coPhone').value.trim(), street: $('coStreet').value.trim(), apt: $('coApt').value.trim(), note: $('coNote').value.trim(), pay: $('coForm').pay.value };
    const area = checkStreet(f.street);
    if (area) f.area = area.ok;
    const text = orderMessage(t, f);
    pending = { at: Date.now(), lines: lines().filter(l => !isBlocked(l.p)).map(({ p, q }) => [p.id, q]), total: t.total, items: t.items, pay: f.pay, advance: 0, text };
    if (API) placeOrder(t, f); else showWa(false);
  });
  async function placeOrder(t, f) {
    const btn = $('coSubmit');
    placing = true;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    btn.textContent = L('שולחים לחנות…', 'Sending to the store…');
    try {
      const r = await API.createOrder({ name: f.name, phone: f.phone, street: f.street, apt: f.apt, note: f.note, pay: f.pay, lang: LANG, lines: pending.lines, total: t.total, summary: pending.text,
        benefit: t.benefit ? { kind: t.benefit.kind, code: t.benefit.code || null, amount: t.welcome } : null });
      if (CODE.test(r.myCode || '')) { myCode = r.myCode; store.set('allenbis-mycode', myCode); }
      if (refCode) { refCode = null; try { localStorage.removeItem('allenbis-ref'); } catch {} }
      if (r.benefit === 'credit') myCredit = Math.max(0, myCredit - (r.benefitAmount || 0));
      finishOrder({ id: r.id, token: r.token, total: r.total ?? t.total, status: 'received', updatedAt: Date.now(), rejected: r.rejected || 0 });
    } catch {
      showWa(true);
    } finally {
      placing = false;
      btn.disabled = false; btn.removeAttribute('aria-busy');
      btn.innerHTML = submitLabel(t);
    }
  }
  $('coBack').addEventListener('click', () => { coStep(false); $('coSubmit').focus(); });
  $('coCopy').addEventListener('click', async () => {
    if (!pending) return;
    try { await navigator.clipboard.writeText(pending.text); announce(L('ההודעה הועתקה.', 'Message copied.')); toast(L('ההודעה הועתקה', 'Message copied')); }
    catch { announce(L('לא הצלחנו להעתיק. אפשר לסמן את ההודעה ולהעתיק ידנית.', "Couldn't copy. Select the message and copy it by hand.")); }
  });
  // Sending: the basket becomes the latest order
  function finishOrder(extra) {
    const { text, ...order } = pending;
    pending = null;
    setSpin(null);
    orders.push({ ...order, ...extra });
    orders = orders.slice(-10);
    store.set('allenbis-orders', orders);
    const ids = Object.keys(cart);
    ids.forEach(id => delete cart[id]);
    save();
    ids.forEach(refreshCards);
    updateCartUi();
    $('coForm').reset();
    $('coArea').innerHTML = '';
    setTimeout(() => {
      $('checkout').close();
      renderHome();
      updateTrackPill();
      openTrack();
      announce(extra.id ? L(`ההזמנה נשלחה לחנות, מספר ${extra.id}. אפשר לעקוב אחריה כאן.`, `Your order reached the store, number ${extra.id}. You can follow it here.`)
        : L('ההזמנה נפתחה בוואטסאפ. אחרי השליחה החנות תאשר אותה.', 'Your order opened in WhatsApp. Once you send it, the store will confirm.'));
    }, extra.id ? 0 : 300);
  }
  $('coWa').addEventListener('click', () => { if (pending) finishOrder({}); });

  const PAY_EN = { 'ביט': 'Bit', 'אשראי לשליח': 'card to the courier', 'מזומן': 'cash' };
  /* ---------- Tracking: live from the store screen, or an estimate for WhatsApp orders ---------- */
  const STAGES = CFG.deliveryStages || [];
  const stageAt = [0, 2, 6, 15, ETA]; // minutes after ordering (example timeline)
  const stageIdx = id => Math.max(0, STAGES.findIndex(x => x.id === id));
  const LIVE_STAGE = { received: 'received', accepted: 'received', collecting: 'collecting', on_the_way: 'on_the_way', delivered: 'delivered' };
  function stageOf(o) {
    const mins = (Date.now() - o.at) / 60000 + (o.advance || 0);
    if (o.id) {
      let s = stageIdx(LIVE_STAGE[o.status] || 'received');
      // "almost there" isn't a button on the store screen: it shows a few minutes after the courier leaves
      if (o.status === 'on_the_way' && STAGES.some(x => x.id === 'nearby') && Date.now() - (o.updatedAt || o.at) > 5 * 60000) s = stageIdx('nearby');
      return { s, left: Math.max(1, Math.ceil(ETA - mins)), cancelled: o.status === 'cancelled' };
    }
    let s = 0;
    stageAt.forEach((m, i) => { if (mins >= m) s = i; });
    return { s: Math.min(s, STAGES.length - 1), left: Math.max(0, Math.ceil(ETA - mins)) };
  }
  const liveEnded = o => o.status === 'delivered' || o.status === 'cancelled';
  const active = () => {
    const o = orders[orders.length - 1];
    if (!o) return null;
    if (o.id) return (liveEnded(o) ? Date.now() - (o.updatedAt || o.at) < 3600e3 : Date.now() - o.at < 6 * 3600e3) ? o : null;
    const st = stageOf(o);
    return st.s < STAGES.length - 1 || Date.now() - o.at < 3600e3 ? o : null;
  };
  // One picture per stage: order received, basket being packed, courier riding, almost there, at the door
  const STAGE_ICONS = {
    received: '<path d="M9 3h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V4a1 1 0 0 1 1-1z"/><path d="m9 13 2 2 4-4"/>',
    collecting: '<path d="M5 8h14l-1.2 10.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9Z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
    on_the_way: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    nearby: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    delivered: '<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'
  };
  const stageIcon = (id, i) => STAGE_ICONS[id]
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${STAGE_ICONS[id]}</svg>`
    : String(i + 1);
  const stageName = id => (LANG === 'en' && UI.stages?.[id]) || STAGES.find(x => x.id === id)?.label || id;
  function statusLine(o) {
    if (o.status === 'received') return L('ההזמנה הגיעה לחנות ומחכה לאישור.', 'Your order reached the store and is waiting to be accepted.');
    if (o.status === 'accepted') return L('החנות אישרה את ההזמנה.', 'The store accepted your order.');
    return o.status === 'cancelled' ? '' : L('המצב כאן מתעדכן ישר מהחנות.', 'This updates straight from the store.');
  }
  function renderTrack() {
    const o = orders[orders.length - 1];
    if (!o) { $('trackBody').innerHTML = `<p class="panel-empty">${L('אין הזמנה פעילה.', 'No active order.')}</p>`; return; }
    const { s, left, cancelled } = stageOf(o);
    const done = s >= STAGES.length - 1;
    const pay = L(esc(o.pay), esc(PAY_EN[o.pay] || o.pay));
    const head = o.id
      ? L(`הזמנה <b dir="ltr">${esc(o.id)}</b> · ${o.items} פריטים, <bdi>${fmt(o.total)}</bdi>, תשלום ב${pay}. ${statusLine(o)}`, `Order <b>${esc(o.id)}</b> · ${o.items} items, <bdi>${fmt(o.total)}</bdi>, paying by ${pay}. ${statusLine(o)}`)
      : L(`${o.items} פריטים, <bdi>${fmt(o.total)}</bdi>, תשלום ב${pay}. ההזמנה נשלחה בוואטסאפ, והחנות מאשרת אותה שם. הזמנים כאן משוערים.`, `${o.items} items, <bdi>${fmt(o.total)}</bdi>, paying by ${pay}. Your order was sent on WhatsApp and the store confirms it there. Times here are estimates.`);
    const rejected = o.rejected ? `<p class="muted" style="margin:8px 0 0">${L(`ההנחה לא אושרה במלואה (למשל, הנחת היכרות והנחת חבר הן להזמנה ראשונה בלבד), ולכן הסכום עודכן ל-<bdi>${fmt(o.total)}</bdi>.`, `The discount wasn't fully approved (for example, the welcome and friend discounts are for a first order only), so the total is now <bdi>${fmt(o.total)}</bdi>.`)}</p>` : '';
    const storeBtn = DEMO_STORE && o.id ? `<button class="secondary" type="button" id="openStoreScreen">${L('מסך החנות (הדגמה): לאשר ולעדכן', 'Store screen (demo): accept and update')}</button>` : '';
    $('trackBody').innerHTML = cancelled
      ? `<p class="note-box">${head}</p><div class="eta"><b>${L('ההזמנה בוטלה', 'Order cancelled')}</b></div><p>${L('החנות ביטלה את ההזמנה. אם זה לא ברור, כדאי לפנות לחנות.', 'The store cancelled this order. If that\'s unexpected, please contact the store.')}</p>
<div style="display:grid;gap:10px;margin-top:18px">${storeBtn}<button class="primary" type="button" data-close>${L('חזרה לחנות', 'Back to the store')}</button></div>`
      : `${ART.courier ? `<img class="art-img wide" src="${esc(ART.courier)}" alt="">` : ''}<p class="note-box" style="margin-bottom:0">${head}</p>${rejected}
<div class="eta">${done ? `<b>${L('נמסר', 'Delivered')}</b>` : `<b data-roll="${left}">${left}</b><span>${L('דקות בערך עד שזה אצלך', 'minutes, roughly, until it reaches you')}</span>`}</div>
<ol class="stages">${STAGES.map((st, i) => `<li class="${i < s ? 'done' : i === s ? (done ? 'done' : 'now') : ''}"><span aria-hidden="true">${stageIcon(st.id, i)}</span><p>${esc(stageName(st.id))}</p></li>`).join('')}</ol>
${done ? friendHtml(true) : ''}
<div style="display:grid;gap:10px;margin-top:18px">${done || o.id ? '' : `<button class="secondary" type="button" id="trackNext">${L('הדגמה: לשלב הבא', 'Demo: next step')}</button>`}${done ? '' : storeBtn}<button class="primary" type="button" data-close>${L('חזרה לחנות', 'Back to the store')}</button></div>
${done ? '' : friendHtml(true)}`;
    const eta = $('trackBody').querySelector('[data-roll]');
    if (eta) { roll(eta, +eta.dataset.roll, etaShown); etaShown = +eta.dataset.roll; }
  }
  let etaShown = null;
  let trackTimer, unwatch = null;
  function openTrack() {
    renderTrack();
    openDialog('track');
    clearInterval(trackTimer);
    trackTimer = setInterval(() => { if ($('track').open) renderTrack(); else clearInterval(trackTimer); }, 15000);
    const o = orders[orders.length - 1];
    if (API && o?.id && !liveEnded(o) && !unwatch) { unwatch = API.watch(refreshLive, DEMO_STORE ? 4000 : 8000); refreshLive(); }
  }
  $('track').addEventListener('close', () => { unwatch?.(); unwatch = null; });
  const STATUS_SAY = {
    accepted: () => L('החנות אישרה את ההזמנה', 'The store accepted your order'),
    cancelled: () => L('החנות ביטלה את ההזמנה', 'The store cancelled your order'),
    delivered: () => L('ההזמנה נמסרה. בתיאבון!', 'Delivered. Enjoy!')
  };
  let liveBusy = false;
  async function refreshLive() {
    const o = orders[orders.length - 1];
    if (!API || !o?.id || !o.token || liveBusy) return;
    liveBusy = true;
    try {
      const r = await API.getOrder(o.id, o.token);
      if (r.status && r.status !== o.status) {
        o.status = r.status; o.updatedAt = r.updatedAt || Date.now();
        store.set('allenbis-orders', orders);
        const say = (STATUS_SAY[o.status] || (() => stageName(o.status)))();
        announce(say); toast(say);
        if ($('track').open && !$('track').contains(document.activeElement)) renderTrack();
        else if ($('track').open) { const id = document.activeElement.id; renderTrack(); ($(id) || $('track').querySelector('.primary'))?.focus(); }
        if (liveEnded(o)) { unwatch?.(); unwatch = null; }
        if (o.status === 'delivered' && myCode) refreshCredit();
      }
    } catch {} finally { liveBusy = false; }
    updateTrackPill();
  }
  $('trackBody').addEventListener('click', e => {
    if (e.target.closest('#openStoreScreen')) { $('track').close(); openStoreScreen(true); return; }
    if (!e.target.closest('#trackNext')) return;
    const o = orders[orders.length - 1];
    const { s } = stageOf(o);
    const mins = (Date.now() - o.at) / 60000;
    o.advance = Math.max(o.advance || 0, (stageAt[s + 1] ?? ETA) - mins + 0.01);
    store.set('allenbis-orders', orders);
    renderTrack();
    updateTrackPill();
    ($('trackNext') || $('track').querySelector('.primary')).focus();
    announce(stageName(STAGES[stageOf(o).s].id));
  });
  function updateTrackPill() {
    let pill = $('trackPill');
    const o = active();
    if (!o) { pill?.remove(); return; }
    if (!pill) {
      pill = document.createElement('button');
      pill.id = 'trackPill'; pill.type = 'button'; pill.className = 'track-pill';
      pill.setAttribute('aria-haspopup', 'dialog');
      pill.addEventListener('click', openTrack);
      $('openInfo').after(pill);
    }
    const { s, cancelled } = stageOf(o);
    pill.classList.toggle('off', !!cancelled);
    pill.innerHTML = `<i aria-hidden="true"></i>${esc(cancelled ? L('ההזמנה בוטלה', 'Order cancelled') : o.status === 'accepted' ? L('החנות אישרה', 'Accepted') : stageName(STAGES[s]?.id) || L('המשלוח שלי', 'My delivery'))}`;
  }
  setInterval(() => { const o = active(); if (o?.id && !liveEnded(o) && !unwatch) refreshLive(); else updateTrackPill(); }, DEMO_STORE ? 5000 : 30000);

  /* ---------- Store screen, demo only: the same page the store uses, over the site ---------- */
  function openStoreScreen(back) {
    const go = () => { window.ALLENBIS_STORE_SCREEN.mount($('ssRoot'), { embedded: true }); openDialog('storeScreen'); };
    $('storeScreen').dataset.back = back ? '1' : '';
    if (window.ALLENBIS_STORE_SCREEN) return go();
    const sc = document.createElement('script');
    sc.src = 'admin.js';
    sc.onload = go;
    sc.onerror = () => toast(L('מסך החנות לא נטען', "The store screen didn't load"));
    document.head.append(sc);
  }
  $('storeScreen').addEventListener('close', () => {
    window.ALLENBIS_STORE_SCREEN?.unmount?.();
    refreshLive();
    if ($('storeScreen').dataset.back && active()) setTimeout(openTrack, 50);
  });

  /* ---------- Bring a friend ---------- */
  const R_REWARD = CFG.referral?.rewardMinor || 2500;
  const shareUrl = () => `${CFG.referralBaseUrl || location.origin + location.pathname}?ref=${myCode}`;
  const shareText = () => L(`קבלו ${fmt(R_REWARD)} הנחה על ההזמנה הראשונה באלנביס, משלוח עד הדלת תוך ${ETA} דקות: ${shareUrl()}`, `Get ${fmt(R_REWARD)} off your first Allenbis order, delivered in ${ETA} minutes: ${shareUrl()}`);
  function friendHtml(compact) {
    if (!API || !CFG.referral?.enabled) return '';
    const min = CFG.referral.minimumOrderMinor;
    if (!compact && refCode && !orders.length) {
      const torn = store.get('allenbis-ref-torn', null) === refCode;
      return `<section class="friend got ticket${torn ? ' torn' : ''}" aria-labelledby="fr-t"><div class="tk-body"><p class="tk-kick">${L('חבר שלח לכם', 'A friend sent you')}</p><h2 id="fr-t"><bdi>${fmt(R_REWARD)}</bdi> ${L('הנחה', 'off')}</h2><p>${min ? L(`להזמנה הראשונה מעל ${fmt(min)}. נכנסת לבד בקופה.`, `On your first order over ${fmt(min)}. Applied by itself at checkout.`) : L('להזמנה הראשונה. נכנסת לבד בקופה.', 'On your first order. Applied by itself at checkout.')}</p><p class="tk-saved" role="status">${torn ? L('✓ שמור לכם', '✓ Saved for you') : ''}</p></div>
${torn ? '' : `<button type="button" class="tk-stub" data-tear aria-label="${L('קריעת הקופון ושמירת ההנחה', 'Tear off the coupon to save the discount')}"><span aria-hidden="true">${L('קרעו<br>ושמרו', 'Tear<br>to save')}</span></button>`}</section>`;
    }
    if (!myCode) return '';
    return `<section class="friend${compact ? ' compact' : ''}" aria-labelledby="fr-t${compact ? 2 : ''}"><h2 id="fr-t${compact ? 2 : ''}">${L('חבר מביא חבר', 'Bring a friend')}</h2>
<p>${L(`שלחו לחבר את הקישור שלכם: הוא מקבל ${fmt(R_REWARD)} הנחה על ההזמנה הראשונה, ואתם מקבלים ${fmt(R_REWARD)} זיכוי כשההזמנה שלו נמסרת.`, `Send a friend your link: they get ${fmt(R_REWARD)} off their first order, and you get ${fmt(R_REWARD)} credit once it's delivered.`)}</p>
${myCredit ? `<p class="credit">${L('הזיכוי שלכם', 'Your credit')}: <b><bdi>${fmt(myCredit)}</bdi></b> · ${L('נכנס לבד להזמנה הבאה', 'applies to your next order')}</p>` : ''}
<div class="friend-btns"><a class="primary wa" href="https://wa.me/?text=${encodeURIComponent(shareText())}" target="_blank" rel="noopener">${L('שליחה לחבר בוואטסאפ', 'Send on WhatsApp')}</a><button type="button" class="secondary" data-copyref>${L('העתקת הקישור', 'Copy link')}</button></div>
<p class="code">${L('הקוד שלכם', 'Your code')}: <b dir="ltr">${esc(myCode)}</b></p></section>`;
  }
  document.addEventListener('click', async e => {
    if (!e.target.closest('[data-copyref]')) return;
    try { await navigator.clipboard.writeText(shareUrl()); toast(L('הקישור הועתק', 'Link copied')); announce(L('הקישור הועתק.', 'Link copied.')); }
    catch { toast(shareUrl()); }
  });
  async function refreshCredit() {
    if (!API || !myCode) return;
    try {
      const c = await API.credit(myCode);
      if (Number.isInteger(c) && c !== myCredit) { myCredit = c; renderHome(); updateCartUi(); if ($('cart').open) renderCart(); }
    } catch {}
  }

  /* ---------- Sold out and price changes from the store screen ---------- */
  function applyStock(s) {
    if (!s || typeof s !== 'object') return;
    const gone = [];
    let changed = false;
    for (const [id, v] of Object.entries(s)) {
      const p = byId.get(id);
      if (!p || !v) continue;
      if (v.oos && !oos.has(id)) { oos.add(id); changed = true; if (cart[id]) { gone.push(nm(p)); delete cart[id]; } }
      if (Number.isInteger(v.price) && v.price > 0 && !(hasPrice(p) && regular(p) === v.price)) {
        p.price = v.price / 100;
        p.priceReview = { ...(p.priceReview || {}), status: 'owner-configured' };
        delete deals[id];
        changed = true;
      }
    }
    if (!changed) return;
    if (gone.length) { save(); toast(L(`אזל מהמלאי והוסר מהסל: ${gone.join(', ')}`, `Sold out, removed from your cart: ${gone.join(', ')}`)); }
    renderHome();
    renderGrid(false);
    applyView();
    updateCartUi();
    if ($('cart').open) renderCart();
  }

  /* ---------- Delivery info ---------- */
  const AREA_NAME = LANG === 'en' ? (UI.area || D.area) : D.area;
  $('etaText').textContent = L(`עד ${ETA} דק׳`, `Up to ${ETA} min`);
  $('areaText').textContent = [D.hours, AREA_NAME].filter(Boolean).join(' · ');
  $('footInfo').textContent = `${L('אלנביס', 'Allenbis')} · ${[D.hours, AREA_NAME].filter(Boolean).join(' · ')}`;
  $('openInfo').setAttribute('aria-label', L(`משלוח עד ${ETA} דקות, ${D.hours || ''} ${D.area || ''}. פרטים על משלוחים`, `Delivery in up to ${ETA} minutes, ${D.hours || ''} ${AREA_NAME || ''}. Delivery details`));
  $('openInfo').addEventListener('click', () => {
    $('infoBody').innerHTML = `<dl class="facts pd" style="font-size:1rem;margin-top:14px">
<dt>${L('זמן משלוח', 'Delivery time')}</dt><dd>${L(`עד ${ETA} דקות`, `Up to ${ETA} minutes`)}</dd>
<dt>${L('שעות', 'Hours')}</dt><dd>${esc(D.hours || '')}</dd>
<dt>${L('אזור', 'Area')}</dt><dd>${esc(AREA_NAME || '')}</dd>
<dt>${L('דמי משלוח', 'Delivery fee')}</dt><dd><bdi>${fmt(FEE)}</bdi>${demoTag(D.example)}</dd>
<dt>${L('משלוח חינם', 'Free delivery')}</dt><dd>${L('מעל', 'over')} <bdi>${fmt(FREE_FROM)}</bdi>${demoTag(D.example)}</dd></dl>
<p class="note-box">${L('אלכוהול נמכר ונמסר רק בין 06:00 ל-23:00, לפי החוק. מוצרי עישון ואלכוהול נמכרים מגיל 18 בלבד.', 'By law, alcohol is sold and delivered only 06:00–23:00. Tobacco and alcohol are 18+ only.')}</p>
${STREETS.length ? `<div class="fld addr-fld"><label for="infoStreet">${L('מגיעים אליכם? בדקו את הרחוב', 'Do we deliver to you? Check your street')}${demoTag(AREA.example)}</label><input id="infoStreet" autocomplete="street-address" placeholder="${L('למשל: דיזנגוף 50', 'e.g. Dizengoff 50')}" aria-describedby="infoArea"><p class="addr-check" id="infoArea" aria-live="polite"></p></div>` : ''}`;
    openDialog('info');
  });

  $('infoBody').addEventListener('input', e => {
    if (e.target.id !== 'infoStreet') return;
    clearTimeout(areaTimer);
    areaTimer = setTimeout(() => { $('infoArea').innerHTML = areaHtml(e.target.value); }, 250);
  });

  /* ---------- Accessibility preferences ---------- */
  const A11Y_KEY = 'allenbis-a11y';
  const a11yDefault = { text: 100, hc: false, ul: false, nomo: false };
  let a11y = { ...a11yDefault, ...(store.get(A11Y_KEY, {}) || {}) };
  const sizes = [100, 115, 130, 150];
  function applyA11y() {
    const root = document.documentElement;
    root.style.setProperty('--text-scale', sizes.includes(a11y.text) ? a11y.text / 100 : 1);
    for (const k of ['hc', 'ul', 'nomo']) root.classList.toggle(k, !!a11y[k]);
    applyNight();
  }
  function renderA11y() {
    const sw = (k, t) => `<div class="a11y-row"><span id="l-${k}">${t}</span><button type="button" role="switch" aria-labelledby="l-${k}" aria-checked="${!!a11y[k]}" data-k="${k}">${a11y[k] ? L('פעיל', 'On') : L('כבוי', 'Off')}</button></div>`;
    $('a11yBody').innerHTML = `<div class="a11y-row"><span id="l-text">${L('גודל טקסט', 'Text size')}</span><div class="seg" role="group" aria-labelledby="l-text">${sizes.map(s => `<button type="button" data-size="${s}" aria-pressed="${a11y.text === s}">${s}%</button>`).join('')}</div></div>` +
      sw('hc', L('ניגודיות גבוהה', 'High contrast')) + sw('ul', L('הדגשת קישורים', 'Underline links')) + sw('nomo', L('עצירת אנימציות', 'Stop animations'));
  }
  $('a11yBody').addEventListener('click', e => {
    const s = e.target.closest('[data-size]');
    const k = e.target.closest('[data-k]');
    if (!s && !k) return;
    if (s) a11y.text = +s.dataset.size;
    if (k) a11y[k.dataset.k] = !a11y[k.dataset.k];
    store.set(A11Y_KEY, a11y);
    applyA11y();
    const sel = s ? `[data-size="${s.dataset.size}"]` : `[data-k="${k.dataset.k}"]`;
    renderA11y();
    $('a11yBody').querySelector(sel).focus();
  });
  $('a11yReset').addEventListener('click', () => { a11y = { ...a11yDefault }; store.set(A11Y_KEY, a11y); applyA11y(); renderA11y(); announce(L('ההתאמות אופסו.', 'Settings reset.')); });
  const openA11y = () => { renderA11y(); openDialog('a11y'); };
  $('openA11y').addEventListener('click', openA11y);
  $('a11yFab').addEventListener('click', openA11y);
  applyA11y();

  /* ---------- Sticky offsets ---------- */
  const top = $('top');
  const setTop = () => document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px');
  if ('ResizeObserver' in window) new ResizeObserver(setTop).observe(top); else setTop();

  startRotator();
  circleText();
  renderTiles();
  renderHome();
  renderCats();
  renderGrid(false);
  updateCartUi();
  updateTrackPill();

  // Links from the product and category pages: ?p=<id> opens a product, ?c=<category> opens an aisle
  const qs = new URLSearchParams(location.search);
  // A friend's link: ?ref=<code> gives a discount on the first order
  const refIn = (qs.get('ref') || '').toUpperCase();
  if (refIn) {
    if (!API || !CFG.referral?.enabled || !CODE.test(refIn)) {}
    else if (refIn === myCode) toast(L('זה הקישור שלכם. שלחו אותו לחברים', 'That\'s your own link. Send it to friends'));
    else if (orders.length) toast(L('ההנחה מחבר היא להזמנה ראשונה', 'The friend discount is for a first order'));
    else { refCode = refIn; store.set('allenbis-ref', refCode); renderHome(); updateCartUi(); toast(L(`קיבלתם ${fmt(R_REWARD)} הנחה מחבר`, `A friend sent you ${fmt(R_REWARD)} off`)); }
    const u = new URL(location.href);
    u.searchParams.delete('ref');
    try { history.replaceState(history.state, '', u); } catch {}
  }
  if (API) {
    API.stock().then(applyStock).catch(() => {});
    refreshCredit();
    const o = active();
    if (o?.id && !liveEnded(o)) refreshLive();
  }
  if (qs.get('c') && cats.includes(qs.get('c'))) requestCat(qs.get('c'));
  if (qs.get('p') && byId.get(qs.get('p'))) openProduct(qs.get('p'));
})();
