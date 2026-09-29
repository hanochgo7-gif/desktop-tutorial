(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const CATALOG = window.ALLENBIS_CATALOG || { categories: [], products: [] };
  const CFG = window.ALLENBIS_COMMERCE_CONFIG || {};
  const DEMO = window.ALLENBIS_DEMO || {};
  const ALL = CATALOG.categories[0] || 'הכל';
  const MAX_QTY = 99;
  const FALLBACK = 'fallback.svg';
  const cur = CATALOG.currency || 'ILS';
  const money = new Intl.NumberFormat('he-IL', { style: 'currency', currency: cur });
  const moneyWhole = new Intl.NumberFormat('he-IL', { style: 'currency', currency: cur, maximumFractionDigits: 0 });
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
  const label = c => LABELS[c] || c;
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
  const priceText = p => !p.buy ? 'ללא מכירה' : hasPrice(p) ? fmt(unit(p)) : 'מחיר יעודכן';
  const metaText = p => !p.buy ? 'לא נמכר באתר' : [p.sub, p.size, p.variant].filter(Boolean).join(', ');
  const ART = (window.ALLENBIS_DEMO || {}).art || {};
  const demoTag = on => on ? ' <span class="demo">דוגמה</span>' : '';

  const products = CATALOG.products.filter(p => p && p.active !== false);
  const byId = new Map(products.map(p => [p.id, p]));
  products.forEach(p => { p._s = norm([p.name, p.sub, label(p.category), p.size, p.variant].filter(Boolean).join(' ')); p._w = p._s.split(' '); p._c = norm(label(p.category)); });
  const pick = ids => (ids || []).map(id => byId.get(id)).filter(Boolean);

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
    return `<span class="sr-only">${fmt(minor)}</span><span class="pm-v" aria-hidden="true"><span class="pm-s">${sh}</span>${ag ? `<span class="pm-a">${String(ag).padStart(2, '0')}</span>` : ''}<span class="pm-c">₪</span></span>`;
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
    return `${(Math.round(unit(p) / base * 100) / 100).toFixed(2)}₪ ל-100 ${liquid ? 'מ״ל' : 'גר׳'}`;
  }
  function priceHtml(p) {
    if (!(p.buy && hasPrice(p))) return `<span class="price"><span class="tag soft"><bdi>${esc(priceText(p))}</bdi></span></span>`;
    const sale = onSale(p);
    const up = unitPrice(p);
    return `<span class="price"><span class="tag${sale ? ' sale' : ''}">${sale ? '<span class="tag-flag" aria-hidden="true">מבצע</span>' : ''}${pm(unit(p))}</span>${sale ? `<span class="was">במקום <s><bdi>${fmt(regular(p))}</bdi></s></span>` : up ? `<span class="unitp"><bdi>${up}</bdi></span>` : ''}</span>`;
  }
  const stickers = p => [onSale(p) ? '<span class="sticker sale">מבצע!</span>' : '', bestIds.has(p.id) ? '<span class="sticker hot">הכי<br>נמכר</span>' : ''].join('');

  function controlsHtml(p) {
    const name = esc(p.name);
    if (!p.buy) return '';
    if (!canBuy(p)) return '<span class="oos-note">אזל במלאי</span>';
    if (isBlocked(p)) return '<span class="hours-note">אלכוהול נמכר בין 06:00 ל-23:00</span>';
    const n = cart[p.id] || 0;
    if (!n) return `<button type="button" class="add" data-add="${p.id}" aria-label="הוספת ${name} לסל">${plusIcon}</button>`;
    return `<span class="step"><button type="button" data-dec="${p.id}" aria-label="הפחתת ${name}">−</button><output aria-label="כמות ${name}: ${n}">${n}</output><button type="button" data-add="${p.id}" aria-label="הוספת עוד ${name}"${n >= MAX_QTY ? ' disabled' : ''}>+</button></span>`;
  }
  const buyHtml = p => priceHtml(p) + controlsHtml(p);

  const bestIds = new Set(DEMO.bestsellers?.ids || []);
  function cardHtml(p) {
    const name = esc(p.name);
    if (isRestricted(p)) {
      return `<article class="card plain${cart[p.id] ? ' in' : ''}" data-id="${p.id}"><h3 class="name"><bdi>${name}</bdi></h3><p class="meta">${esc(metaText(p))}</p><div class="buy">${buyHtml(p)}</div></article>`;
    }
    const img = imgOf(p);
    const badges = stickers(p);
    return `<article class="card${cart[p.id] ? ' in' : ''}${canBuy(p) ? '' : ' oos'}" data-id="${p.id}">
<div class="badges" aria-hidden="true">${badges}</div>
<button type="button" class="pic" data-open="${p.id}" tabindex="-1" aria-hidden="true"><img src="${esc(img)}" alt="" loading="lazy" decoding="async" width="640" height="480">${img === FALLBACK ? '<span class="note">תמונה בקרוב</span>' : ''}</button>
<h3><button type="button" class="name" data-open="${p.id}"><bdi>${name}</bdi></button></h3><p class="meta">${esc(metaText(p))}</p>
<div class="buy">${buyHtml(p)}</div></article>`;
  }

  function refreshCards(id) {
    const p = byId.get(id);
    document.querySelectorAll(`.slot[data-id="${CSS.escape(id)}"]`).forEach(slot => {
      slot.querySelector('.qa')?.remove();
      slot.querySelector('.prod').insertAdjacentHTML('beforeend', slotAdd(p));
      slot.classList.toggle('in', !!cart[id]);
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
    const firstOrder = !orders.length;
    const w = CFG.welcome;
    const welcome = w?.enabled && firstOrder && sub >= (w.minimumOrderMinor || 0) ? w.amountMinor : 0;
    const fee = items && FREE_FROM && sub >= FREE_FROM ? 0 : items ? FEE : 0;
    return { sub, savings: full - sub, items, unpriced, blocked, welcome, fee, total: Math.max(0, sub - welcome) + fee };
  }
  function save() {
    if (!store.set('allenbis-cart', cart)) announce('לא ניתן לשמור את הסל במכשיר הזה. הוא יישמר עד סגירת הדף.');
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
      const msg = after > before ? `${p.name} נוסף לסל` : after ? `${p.name}: ${after}` : `${p.name} הוסר מהסל`;
      announce(msg + '.');
      if (after > before && !$('cart').open) toast(msg);
    }
  }

  function freeHtml(sub, dark) {
    if (!FREE_FROM || !FEE) return '';
    const gap = FREE_FROM - sub;
    const pct = Math.min(100, Math.round(sub / FREE_FROM * 100));
    const text = gap > 0 ? `עוד <bdi>${fmt(gap)}</bdi> למשלוח חינם` : 'המשלוח עליכם, חינם';
    return dark ? `${text}<span class="meter" aria-hidden="true"><i style="width:${pct}%"></i></span>`
      : `<div class="free">${text}${demoTag(D.example)}<div class="meter" aria-hidden="true"><i style="width:${pct}%"></i></div></div>`;
  }

  function updateCartUi() {
    const t = totals();
    $('cartCount').textContent = t.items;
    $('cartSum').hidden = !t.items;
    $('cartSum').textContent = fmt(t.sub);
    $('cartLabel').textContent = `סל הקניות, ${t.items} פריטים`;
    document.body.classList.toggle('has-items', t.items > 0);
    $('barText').textContent = t.items === 1 ? 'פריט אחד בסל' : `${t.items} פריטים בסל`;
    $('barSum').textContent = fmt(t.sub);
    $('barProg').innerHTML = freeHtml(t.sub, true);
  }

  function lineHtml(p, q, controls) {
    const img = imgOf(p);
    const price = hasPrice(p) ? fmt(unit(p) * q) : 'מחיר יעודכן';
    const each = hasPrice(p) && q > 1 ? ` (${fmt(unit(p))} ליחידה)` : '';
    const ctl = controls ? `<span class="step"><button type="button" data-dec="${p.id}" aria-label="הפחתת ${esc(p.name)}">−</button><output aria-label="כמות: ${q}">${q}</output><button type="button" data-add="${p.id}" aria-label="הוספת עוד ${esc(p.name)}"${q >= MAX_QTY || !sellable(p) ? ' disabled' : ''}>+</button></span>` : `<b>×${q}</b>`;
    const pic = img ? `<img src="${esc(img)}" alt="" loading="lazy" width="56" height="56">` : '<span class="noimg" aria-hidden="true">18+</span>';
    const warn = isBlocked(p) ? '<div class="p" style="color:var(--warn)">לא ניתן לקנות עכשיו (23:00–06:00)</div>' : '';
    return `<div class="line${isBlocked(p) ? ' blocked' : ''}" data-line="${p.id}">${pic}<div><div class="t"><bdi>${esc(p.name)}</bdi></div><div class="p"><bdi>${esc(price)}</bdi>${esc(each)}</div>${warn}</div>${ctl}</div>`;
  }

  function miniHtml(p) {
    return `<div class="m"><img src="${esc(imgOf(p))}" alt="" loading="lazy"><div class="t"><bdi>${esc(p.name)}</bdi></div><div class="r"><bdi>${fmt(unit(p))}</bdi><button type="button" class="add" data-add="${p.id}" aria-label="הוספת ${esc(p.name)} לסל">${plusIcon}</button></div></div>`;
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
  const shortName = p => p.name.split(/\s[—–-]\s|\s\d|\s\(/)[0].split(' ').slice(0, 2).join(' ');
  const reasonText = (r, p) => r.replace(/ל\{n\}/, () => { const n = shortName(p); return /^[A-Za-z0-9]/.test(n) ? `ל-${n}` : `ל${n}`; }).replace('{n}', () => shortName(p));

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
  function companions(ls, limit = 4) {
    const inCart = new Set(ls.map(l => l.p.id));
    const kinds = new Set(ls.map(l => kindOf(l.p)));
    const items = ls.reduce((n, l) => n + l.q, 0);
    const lightning = ls.some(l => /lightning/i.test(l.p.name));
    const want = new Map();
    const add = (kind, w, why, pref, from) => {
      if (kinds.has(kind) && !(from && kindOf(from) === kind)) return;
      const cur = want.get(kind) || { w: 0, top: 0 };
      cur.w += w;
      if (w > cur.top) Object.assign(cur, { top: w, why, pref: pref || [] });
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

  function rackHtml(ls) {
    const { list, type } = companions(ls);
    if (!list.length) return '';
    const card = ({ p, why }) => {
      const src = hasCut(p.id) ? `images/cut/${p.id}.webp` : imgOf(p);
      return `<div class="rk"><span class="rk-why">${esc(why)}</span><span class="rk-img"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></span><div class="rk-t"><bdi>${esc(p.name)}</bdi></div><div class="rk-row"><span class="rk-price${onSale(p) ? ' sale' : ''}">${pm(unit(p))}</span><button type="button" class="add" data-add="${p.id}" aria-label="הוספת ${esc(p.name)} לסל (${esc(why)})">${plusIcon}</button></div></div>`;
    };
    return `<section class="rack" aria-labelledby="rackTitle"><div class="rack-head"><h3 id="rackTitle">ליד הקופה</h3>${type ? `<span>מתאים לסל ${esc(type)}</span>` : ''}</div><div class="rack-grid">${list.map(card).join('')}</div></section>`;
  }

  function renderCart() {
    const ls = lines();
    const t = totals();
    if (!ls.length) {
      $('cartBody').innerHTML = ART.emptyCart ? `<div class="panel-empty"><img class="art-img" src="${esc(ART.emptyCart)}" alt=""><p>הסל עדיין ריק.</p></div>` : `<div class="panel-empty"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9Z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg><p>הסל עדיין ריק.</p></div>`;
      $('cartFoot').innerHTML = `<button class="primary" type="button" data-close>לבחירת מוצרים</button>`;
      return;
    }
    $('cartBody').innerHTML = freeHtml(t.sub) + ls.map(({ p, q }) => lineHtml(p, q, true)).join('') + rackHtml(ls);
    $('cartFoot').innerHTML = `${t.blocked ? '<p class="warn-box">בין 23:00 ל-06:00 אסור למכור אלכוהול. הסירו את המוצרים המסומנים כדי להמשיך.</p>' : ''}
<div class="totals">${totalsHtml(t)}</div>
<button class="primary" type="button" id="toCheckout"${t.blocked ? ' disabled' : ''}>לתשלום · <bdi>${fmt(t.total)}</bdi></button>
<button class="secondary" type="button" id="emptyCart">ריקון הסל</button>`;
  }

  function totalsHtml(t) {
    return `<div class="row"><span>מוצרים (${t.items})</span><bdi>${fmt(t.sub + t.savings)}</bdi></div>
${t.savings ? `<div class="row good"><span>חסכת במבצעים</span><bdi>−${fmt(t.savings)}</bdi></div>` : ''}
${t.welcome ? `<div class="row good"><span>הנחת היכרות להזמנה ראשונה</span><bdi>−${fmt(t.welcome)}</bdi></div>` : ''}
<div class="row"><span>משלוח${demoTag(D.example)}</span><bdi>${t.fee ? fmt(t.fee) : 'חינם'}</bdi></div>
<div class="row big"><span>סה״כ</span><bdi>${fmt(t.total)}</bdi></div>
${t.unpriced ? `<div class="muted">${t.unpriced === 1 ? 'למוצר אחד' : `ל-${t.unpriced} מוצרים`} בסל עדיין אין מחיר, והוא לא נכלל בסכום.</div>` : ''}
${!t.welcome && CFG.welcome?.enabled && !orders.length ? `<div class="muted">בהזמנה ראשונה מעל <bdi>${fmt(CFG.welcome.minimumOrderMinor)}</bdi> מקבלים <bdi>${fmt(CFG.welcome.amountMinor)}</bdi> הנחה.</div>` : ''}`;
  }

  $('cartFoot').addEventListener('click', e => {
    if (e.target.closest('#toCheckout')) { $('cart').close(); openCheckout(); }
    if (e.target.closest('#emptyCart')) {
      const ids = Object.keys(cart);
      ids.forEach(id => delete cart[id]);
      save();
      ids.forEach(refreshCards);
      updateCartUi();
      renderCart();
      $('cart').querySelector('.x').focus();
      announce('הסל רוקן.');
    }
  });
  const openCart = () => { renderCart(); openDialog('cart'); };
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
    $('pdBody').innerHTML = `${img ? `<div class="pd-img"><img src="${esc(img)}" alt="${img === FALLBACK ? '' : esc(p.name)}"></div>` : ''}
<h3><bdi>${esc(p.name)}</bdi></h3>
<dl class="facts"><dt>קטגוריה</dt><dd>${labelHtml(p.category)}</dd>${p.sub && !isRestricted(p) ? `<dt>סוג</dt><dd>${esc(p.sub)}</dd>` : ''}${p.size ? `<dt>גודל</dt><dd>${esc(p.size)}</dd>` : ''}${onSale(p) ? `<dt>מחיר רגיל</dt><dd><bdi>${fmt(regular(p))}</bdi></dd>` : ''}</dl>
<div class="buy" id="pdBuy">${buyHtml(p)}</div>
${related.length ? `<section class="upsell" aria-labelledby="relTitle"><h3 id="relTitle">מתאים עם</h3><div class="mini">${related.map(miniHtml).join('')}</div></section>` : ''}`;
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
    $('cats').innerHTML = cats.map(c => `<button type="button" class="cat" data-cat="${esc(c)}" aria-pressed="${c === cat}">${labelHtml(c)}${c === ALL ? '' : `<span class="c" aria-label="${counts[c]} מוצרים">${counts[c]}</span>`}</button>`).join('');
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
      box.innerHTML = (rec.length ? `<h3>חיפשת לאחרונה</h3><div class="chips">${rec.map(r => `<button type="button" class="chip" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : '') +
        `<h3>מחפשים הרבה${demoTag(true)}</h3><div class="chips">${(DEMO.popularSearches || []).map(r => `<button type="button" class="chip" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div>`;
    } else {
      const words = norm(q).split(' ').filter(Boolean);
      const hits = products.map(p => [p, score(p, words)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]);
      const catHits = cats.slice(1).filter(c => norm(label(c)).includes(norm(q)));
      box.innerHTML = (catHits.length ? `<h3>קטגוריות</h3><div class="chips">${catHits.map(c => `<button type="button" class="chip" data-cat="${esc(c)}">${labelHtml(c)}</button>`).join('')}</div>` : '') +
        (hits.length ? `<h3>מוצרים</h3>${hits.map((p, i) => {
          const img = imgOf(p);
          return `<div class="opt" role="option" id="opt${i}" aria-selected="false" data-open="${p.id}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<span class="noimg" aria-hidden="true">18+</span>'}<span><span class="t"><bdi>${esc(p.name)}</bdi></span><br><span class="c">${labelHtml(p.category)}</span></span><span class="p"><bdi>${esc(priceText(p))}</bdi></span></div>`;
        }).join('')}` : `<p class="none">לא מצאנו מוצרים ל״${esc(q)}״. נסו מילה אחרת.</p>`);
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
    const where = cat === ALL ? 'כל המוצרים' : label(cat);
    $('catalogTitle').innerHTML = query ? 'תוצאות חיפוש' : cat === ALL ? where : labelHtml(cat);
    $('catalog').classList.toggle('list', RESTRICTED.has(cat));
    const text = query ? `${shown.length} תוצאות ל״${query}״${cat === ALL ? '' : ` ב${where}`}` : `${shown.length} מוצרים`;
    $('count').textContent = text;
    let html = shown.map(cardHtml).join('');
    if (RESTRICTED.has(cat) || (query && shown.some(isRestricted))) html = `<p class="legal">לפי החוק, מוצרי עישון מוצגים בשם ובמחיר בלבד, בלי תמונות ובלי מבצעים. מכירה מגיל 18 בלבד.</p>` + html;
    if (hideRestricted) html += `<button type="button" class="to-smoke" data-cat="מידע בלבד"><span>מוצרי עישון ואביזרי עישון<small>מוצגים ברשימה נפרדת, מגיל 18</small></span><span aria-hidden="true">←</span></button>`;
    $('catalog').innerHTML = shown.length ? html :
      `<div class="empty"><p>לא מצאנו מוצרים ל״${esc(query)}״${cat === ALL ? '' : ' בקטגוריה הזו'}.</p>${cat === ALL ? '' : `<button type="button" data-cat="${esc(ALL)}">חיפוש בכל המוצרים</button>`}</div>`;
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
    const name = esc(p.name);
    return `<button type="button" class="qa${n ? ' on' : ''}" data-add="${p.id}" aria-label="${n ? `הוספת עוד ${name}, בסל ${n}` : `הוספת ${name} לסל`}">${n ? `<b>${n}</b>` : plusIcon}</button>`;
  }
  // Cutout photos: id -> [width, height, real height in cm]. Sizes on the shelf follow the real product.
  const CUT = window.ALLENBIS_CUT || {};
  const hasCut = id => Array.isArray(CUT[id]);
  function slotHtml(p) {
    const flag = !canBuy(p) && p.buy ? '<span class="flag">אזל</span>' : isBlocked(p) ? '<span class="flag">06:00–23:00</span>' : '';
    const sale = onSale(p);
    const priced = p.buy && hasPrice(p);
    const up = unitPrice(p);
    const low = sale ? `<span class="s-was">במקום <bdi>${fmt(regular(p))}</bdi></span>` : `${up ? `<bdi>${up}</bdi>` : ''}<span class="s-bar" aria-hidden="true"></span>`;
    const tag = `<span class="stag${sale ? ' sale' : ''}${priced ? '' : ' soft'}">${sale ? '<span class="s-flag" aria-hidden="true">מבצע</span>' : ''}<span class="t-name"><bdi>${esc(p.name)}</bdi></span><span class="s-price">${priced ? pm(unit(p)) : esc(priceText(p))}</span><span class="s-unit">${low}</span></span>`;
    return `<div class="slot${canBuy(p) ? '' : ' oos'}${cart[p.id] ? ' in' : ''}" data-id="${p.id}"><div class="prod"><button type="button" class="face${hasCut(p.id) ? ' cut' : ' box'}" data-open="${p.id}"${hasCut(p.id) ? ` data-cut="${p.id}"` : ''} aria-label="${esc(p.name)}, ${esc(priceText(p))}"><img src="${esc(hasCut(p.id) ? `images/cut/${p.id}.webp` : imgOf(p))}" alt="" loading="lazy" decoding="async"></button>${flag}${slotAdd(p)}<span class="stickers" aria-hidden="true">${stickers(p)}</span></div>${tag}</div>`;
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
      return `<section class="aisle" aria-label="${esc(label(c))}"><div class="aisle-sign" aria-hidden="true"><small>מעבר ${i + 1}</small>${labelHtml(c)}</div><div class="unit ${kind}${PEG.has(c) ? ' peg' : ''}" style="--n:${shelfCols}">${shelves}${kind === 'dry' ? '' : doorsHtml()}</div></section>`;
    }).join('') + (cat === ALL ? `<button type="button" class="to-smoke" data-cat="מידע בלבד"><span>מוצרי עישון ואביזרי עישון<small>מוצגים ברשימה נפרדת, מגיל 18</small></span><span aria-hidden="true">←</span></button>` : '');
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
        for (let i = n - 1; i >= 0; i--) html += img(i ? 'bk' : '', `bottom:${(i * step).toFixed(1)}px;left:calc(50% - ${(w / 2).toFixed(1)}px + ${i % 2 ? 2 : -1}px);transform:rotate(${i % 2 ? -1.2 : 0.8}deg)`);
        f.innerHTML = `<span class="pile" style="height:${(h + (n - 1) * step).toFixed(1)}px">${html}</span>`;
      } else {
        const n = Math.max(1, Math.min(3, Math.floor(fw * 0.98 / (w * 0.9))));
        const gap = -w * 0.1;
        for (let i = 0; i < n; i++) html += img(i === Math.floor((n - 1) / 2) ? 'fr' : 'sd', `margin-inline:${(gap / 2).toFixed(1)}px`);
        // one facing only and room left: a second unit peeks from behind
        if (n === 1 && fw - w > w * 0.3) html = img('bk peek', `margin-inline-end:${(-w * 0.72).toFixed(1)}px`) + html;
        f.innerHTML = html;
      }
    }
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
    announce(view === 'shelf' ? 'תצוגת מדפים' : 'תצוגת רשימה');
  });
  if ('ResizeObserver' in window) new ResizeObserver(() => {
    if (!shelfMode()) return;
    if (colsFor(($('catbar').clientWidth || 360) - 40) !== shelfCols) renderShelves();
    else if (Math.abs($('aisles').clientWidth - shelfW) > 12) { shelfW = $('aisles').clientWidth; $('aisles').querySelectorAll('.unit').forEach(stockUnit); }
  }).observe($('catbar'));

  /* ---------- Home sections ---------- */
  function rail(id, title, list, demo, extra = '') {
    if (!list.length) return '';
    return `<section aria-labelledby="${id}-t"><div class="sec-head"><h2 id="${id}-t">${esc(title)}${demoTag(demo)}</h2>${extra}<div class="nav"><button type="button" data-scroll="${id}" data-dir="1" aria-label="הקודם">→</button><button type="button" data-scroll="${id}" data-dir="-1" aria-label="הבא">←</button></div></div><div class="rail" id="${id}">${list.map(cardHtml).join('')}</div></section>`;
  }
  const railable = p => !isRestricted(p) && canBuy(p) && imgOf(p) !== FALLBACK;
  const bundles = (DEMO.bundles?.items || []).map(b => ({ ...b, lines: b.items.map(([id, q]) => ({ p: byId.get(id), q })).filter(l => l.p && !isRestricted(l.p)) })).filter(b => b.lines.length);

  function bundleHtml(b) {
    const total = b.lines.reduce((s, { p, q }) => s + (hasPrice(p) ? unit(p) * q : 0), 0);
    const count = b.lines.reduce((s, l) => s + l.q, 0);
    return `<article class="bundle">${b.img ? `<img class="cover" src="${esc(b.img)}" alt="" loading="lazy">` : ''}<h3>${esc(b.title)}</h3><p>${esc(b.text)}</p><div class="thumbs" aria-hidden="true">${b.lines.slice(0, 5).map(({ p, q }) => `<span><img src="${esc(imgOf(p))}" alt="" loading="lazy">${q > 1 ? `<b>×${q}</b>` : ''}</span>`).join('')}</div><div class="row"><span><b><bdi>${fmt(total)}</bdi></b> · ${count} מוצרים</span><button type="button" data-bundle="${esc(b.id)}">הוספת החבילה</button></div></article>`;
  }

  function renderHome() {
    const again = [];
    for (const o of orders.slice().reverse()) for (const [id] of o.lines) { const p = byId.get(id); if (p && railable(p) && !again.includes(p)) again.push(p); }
    const under10 = products.filter(p => railable(p) && hasPrice(p) && unit(p) <= 1000).sort((a, b) => unit(a) - unit(b));
    const dealList = pick(Object.keys(deals)).filter(railable);
    $('homeSections').innerHTML =
      rail('r-again', 'קנה שוב', again.slice(0, 12), false, orders.length ? '<button type="button" class="again-btn" data-again>הזמנה חוזרת</button>' : '') +
      rail('r-deals', 'מבצעים', dealList, DEMO.deals?.example) +
      rail('r-best', 'הכי נמכרים', pick(DEMO.bestsellers?.ids).filter(railable), DEMO.bestsellers?.example) +
      (bundles.length ? `<section aria-labelledby="b-t"><div class="sec-head"><h2 id="b-t">חבילות מוכנות${demoTag(DEMO.bundles?.example)}</h2></div><div class="bundles">${bundles.map(bundleHtml).join('')}</div></section>` : '') +
      rail('r-10', 'עד 10 ₪', under10);
  }

  /* ---------- Global clicks ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    const add = t.closest('[data-add]');
    const dec = t.closest('[data-dec]');
    if (add) { change(add.dataset.add, 1); return; }
    if (dec) { change(dec.dataset.dec, -1); return; }
    const open = t.closest('[data-open]');
    if (open) { closeSuggest(); pushRecent($('q').value); openProduct(open.dataset.open); return; }
    const c = t.closest('[data-cat]');
    if (c && !t.closest('#suggest')) { requestCat(c.dataset.cat); return; }
    const sc = t.closest('[data-scroll]');
    if (sc) { const r = $(sc.dataset.scroll); r.scrollBy({ left: -+sc.dataset.dir * r.clientWidth * 0.9, behavior: 'smooth' }); return; }
    const b = t.closest('[data-bundle]');
    if (b) { addLines(bundles.find(x => x.id === b.dataset.bundle).lines, 'החבילה נוספה לסל'); return; }
    if (t.closest('[data-again]') && orders.length) {
      addLines(orders[orders.length - 1].lines.map(([id, q]) => ({ p: byId.get(id), q })).filter(l => l.p), 'ההזמנה האחרונה נוספה לסל');
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
    const note = skipped ? ` (${skipped} מוצרים לא זמינים כרגע)` : '';
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
  function renderBasket() {
    $('basketBody').innerHTML = `<p class="note-box">בתקציב של <bdi>${fmt(budgetMinor)}</bdi> הרכבנו ${basket.count} פריטים. לא מתאים? אפשר לערבב שוב.</p>` +
      basket.lines.map(({ p, q }) => lineHtml(p, q, false)).join('');
    $('basketFoot').innerHTML = `<div class="totals"><div class="row big"><span>סה״כ</span><bdi>${fmt(basket.total)}</bdi></div><div class="muted">נשארו <bdi>${fmt(budgetMinor - basket.total)}</bdi> מהתקציב.</div></div>
<button class="primary" type="button" id="basketAdd">הוספת הכול לסל</button>
<button class="secondary" type="button" id="basketShuffle">ערבוב מחדש</button>`;
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
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) return fail('כתבו סכום במספרים, למשל 100.');
    budgetMinor = Math.round(parseFloat(raw) * 100);
    const max = B.maxMinor || 100000;
    if (budgetMinor > max) return fail(`אפשר להרכיב סל עד ${fmt(max)}.`);
    if (!pool.length) return fail('בונה הסלים לא זמין כרגע.');
    if (budgetMinor < cheapest) return fail(`המוצר הזול ביותר עולה ${fmt(cheapest)}. נסו סכום גבוה יותר.`);
    $('budgetErr').textContent = '';
    $('budget').removeAttribute('aria-invalid');
    basket = buildBasket(budgetMinor);
    renderBasket();
    openDialog('basket');
  });
  $('basketFoot').addEventListener('click', e => {
    if (e.target.closest('#basketShuffle')) {
      basket = buildBasket(budgetMinor);
      renderBasket();
      $('basketShuffle').focus();
      announce(`ערבבנו מחדש: ${basket.count} פריטים, ${fmt(basket.total)}.`);
    }
    if (e.target.closest('#basketAdd')) {
      $('basket').close();
      addLines(basket.lines, `${basket.count} פריטים נוספו לסל`);
      openCart();
    }
  });

  /* ---------- Checkout (demo) ---------- */
  function openCheckout() {
    const t = totals();
    $('coTotals').innerHTML = totalsHtml(t);
    $('coSubmit').innerHTML = `שליחת הזמנת דוגמה · <bdi>${fmt(t.total)}</bdi>`;
    openDialog('checkout');
  }
  function fieldErr(id, msg) {
    $(id).setAttribute('aria-invalid', msg ? 'true' : 'false');
    $(id + 'Err').textContent = msg;
    return !msg;
  }
  $('coForm').addEventListener('submit', e => {
    e.preventDefault();
    const phone = $('coPhone').value.replace(/[\s-]/g, '');
    const ok = [
      fieldErr('coName', $('coName').value.trim().length < 2 ? 'כתבו שם, כדי שהשליח ידע למי למסור.' : ''),
      fieldErr('coPhone', /^(05\d{8}|0[2-489]\d{7}|07\d{8})$/.test(phone) ? '' : 'כתבו מספר טלפון ישראלי, למשל 050-1234567.'),
      fieldErr('coStreet', /\d/.test($('coStreet').value) && $('coStreet').value.trim().length > 3 ? '' : 'כתבו רחוב ומספר בית, למשל אלנבי 1.')
    ];
    if (ok.includes(false)) { $('coForm').querySelector('[aria-invalid="true"]').focus(); return; }
    const t = totals();
    const order = { at: Date.now(), lines: lines().filter(l => !isBlocked(l.p)).map(({ p, q }) => [p.id, q]), total: t.total, items: t.items, pay: $('coForm').pay.value, advance: 0 };
    orders.push(order);
    orders = orders.slice(-10);
    store.set('allenbis-orders', orders);
    const ids = Object.keys(cart);
    ids.forEach(id => delete cart[id]);
    save();
    ids.forEach(refreshCards);
    updateCartUi();
    $('coForm').reset();
    $('checkout').close();
    renderHome();
    updateTrackPill();
    openTrack();
    announce('הזמנת הדוגמה התקבלה.');
  });

  /* ---------- Tracking (demo) ---------- */
  const STAGES = CFG.deliveryStages || [];
  const stageAt = [0, 2, 6, 15, ETA]; // minutes after ordering (example timeline)
  function stageOf(o) {
    const mins = (Date.now() - o.at) / 60000 + (o.advance || 0);
    let s = 0;
    stageAt.forEach((m, i) => { if (mins >= m) s = i; });
    return { s: Math.min(s, STAGES.length - 1), left: Math.max(0, Math.ceil(ETA - mins)) };
  }
  const active = () => { const o = orders[orders.length - 1]; if (!o) return null; const st = stageOf(o); return st.s < STAGES.length - 1 || Date.now() - o.at < 3600e3 ? o : null; };
  function renderTrack() {
    const o = orders[orders.length - 1];
    if (!o) { $('trackBody').innerHTML = '<p class="panel-empty">אין הזמנה פעילה.</p>'; return; }
    const { s, left } = stageOf(o);
    const done = s >= STAGES.length - 1;
    $('trackBody').innerHTML = `${ART.courier ? `<img class="art-img wide" src="${esc(ART.courier)}" alt="">` : ''}<p class="note-box" style="margin-bottom:0">הזמנת דוגמה: ${o.items} פריטים, <bdi>${fmt(o.total)}</bdi>, תשלום ב${esc(o.pay)}. לא נשלחה לחנות.</p>
<div class="eta">${done ? '<b>נמסר</b>' : `<b>${left}</b><span>דקות בערך עד שזה אצלך</span>`}</div>
<ol class="stages">${STAGES.map((st, i) => `<li class="${i < s ? 'done' : i === s ? (done ? 'done' : 'now') : ''}"><span>${i < s || done ? '✓' : i + 1}</span><p>${esc(st.label)}</p></li>`).join('')}</ol>
<div style="display:grid;gap:10px;margin-top:18px">${done ? '' : '<button class="secondary" type="button" id="trackNext">הדגמה: לשלב הבא</button>'}<button class="primary" type="button" data-close>חזרה לחנות</button></div>`;
  }
  let trackTimer;
  function openTrack() { renderTrack(); openDialog('track'); clearInterval(trackTimer); trackTimer = setInterval(() => { if ($('track').open) renderTrack(); else clearInterval(trackTimer); }, 15000); }
  $('trackBody').addEventListener('click', e => {
    if (!e.target.closest('#trackNext')) return;
    const o = orders[orders.length - 1];
    const { s } = stageOf(o);
    const mins = (Date.now() - o.at) / 60000;
    o.advance = Math.max(o.advance || 0, (stageAt[s + 1] ?? ETA) - mins + 0.01);
    store.set('allenbis-orders', orders);
    renderTrack();
    updateTrackPill();
    ($('trackNext') || $('track').querySelector('.primary')).focus();
    announce(STAGES[stageOf(o).s].label);
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
    const { s } = stageOf(o);
    pill.innerHTML = `<i aria-hidden="true"></i>${esc(STAGES[s]?.label || 'המשלוח שלי')}`;
  }
  setInterval(updateTrackPill, 30000);

  /* ---------- Delivery info ---------- */
  $('etaText').textContent = `עד ${ETA} דק׳`;
  $('areaText').textContent = [D.hours, D.area].filter(Boolean).join(' · ');
  $('footInfo').textContent = `אלנביס · ${[D.hours, D.area].filter(Boolean).join(' · ')}`;
  $('openInfo').setAttribute('aria-label', `משלוח עד ${ETA} דקות, ${D.hours || ''} ${D.area || ''}. פרטים על משלוחים`);
  $('openInfo').addEventListener('click', () => {
    $('infoBody').innerHTML = `<dl class="facts pd" style="font-size:1rem;margin-top:14px">
<dt>זמן משלוח</dt><dd>עד ${ETA} דקות</dd>
<dt>שעות</dt><dd>${esc(D.hours || '')}</dd>
<dt>אזור</dt><dd>${esc(D.area || '')}</dd>
<dt>דמי משלוח</dt><dd><bdi>${fmt(FEE)}</bdi>${demoTag(D.example)}</dd>
<dt>משלוח חינם</dt><dd>מעל <bdi>${fmt(FREE_FROM)}</bdi>${demoTag(D.example)}</dd></dl>
<p class="note-box">אלכוהול נמכר ונמסר רק בין 06:00 ל-23:00, לפי החוק. מוצרי עישון ואלכוהול נמכרים מגיל 18 בלבד.</p>`;
    openDialog('info');
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
  }
  function renderA11y() {
    const sw = (k, t) => `<div class="a11y-row"><span id="l-${k}">${t}</span><button type="button" role="switch" aria-labelledby="l-${k}" aria-checked="${!!a11y[k]}" data-k="${k}">${a11y[k] ? 'פעיל' : 'כבוי'}</button></div>`;
    $('a11yBody').innerHTML = `<div class="a11y-row"><span id="l-text">גודל טקסט</span><div class="seg" role="group" aria-labelledby="l-text">${sizes.map(s => `<button type="button" data-size="${s}" aria-pressed="${a11y.text === s}">${s}%</button>`).join('')}</div></div>` +
      sw('hc', 'ניגודיות גבוהה') + sw('ul', 'הדגשת קישורים') + sw('nomo', 'עצירת אנימציות');
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
  $('a11yReset').addEventListener('click', () => { a11y = { ...a11yDefault }; store.set(A11Y_KEY, a11y); applyA11y(); renderA11y(); announce('ההתאמות אופסו.'); });
  const openA11y = () => { renderA11y(); openDialog('a11y'); };
  $('openA11y').addEventListener('click', openA11y);
  $('a11yFab').addEventListener('click', openA11y);
  applyA11y();

  /* ---------- Sticky offsets ---------- */
  const top = $('top');
  const setTop = () => document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px');
  if ('ResizeObserver' in window) new ResizeObserver(setTop).observe(top); else setTop();

  renderTiles();
  renderHome();
  renderCats();
  renderGrid(false);
  updateCartUi();
  updateTrackPill();
})();
