(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const CATALOG = window.ALLENBIS_CATALOG || { categories: [], products: [] };
  const CFG = window.ALLENBIS_COMMERCE_CONFIG || {};
  const ALL = CATALOG.categories[0] || 'הכל';
  const MAX_QTY = 99;
  const cur = CATALOG.currency || 'ILS';
  const money = new Intl.NumberFormat('he-IL', { style: 'currency', currency: cur });
  const moneyWhole = new Intl.NumberFormat('he-IL', { style: 'currency', currency: cur, maximumFractionDigits: 0 });
  const fmt = minor => (minor % 100 ? money : moneyWhole).format(minor / 100);

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const norm = s => String(s ?? '').normalize('NFKD').replace(/[֑-ׇ̀-ͯ]/g, '')
    .replace(/[״"׳'`־\-–—.,/()]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  const label = c => c === 'מידע בלבד' ? 'מוצרי עישון 18+' : c;
  const labelHtml = c => esc(label(c)).replace('18+', '<span dir="ltr">18+</span>');
  const isAdult = c => label(c).includes('18+');
  const canBuy = p => !!p && p.buy === true && p.availability !== 'out_of_stock';
  const hasPrice = p => ['verified', 'owner-configured'].includes(p.priceReview?.status) && Number.isFinite(p.price) && p.price >= 0;
  const minor = p => Math.round(p.price * 100);
  const imgOf = p => p.imageReview?.status === 'verified' && p.img ? p.img : 'fallback.svg';
  const priceText = p => !p.buy ? 'ללא מכירה' : hasPrice(p) ? fmt(minor(p)) : 'מחיר יעודכן';
  const metaText = p => [p.sub, p.size, p.variant].filter(Boolean).join(', ').replaceAll('מידע בלבד', 'ללא מכירה');

  const products = CATALOG.products.filter(p => p && p.active !== false);
  const byId = new Map(products.map(p => [p.id, p]));
  products.forEach(p => { p._s = norm([p.name, p.sub, label(p.category), p.size, p.variant].filter(Boolean).join(' ')); });

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

  let statusTimer;
  function announce(msg) {
    clearTimeout(statusTimer);
    $('status').textContent = '';
    statusTimer = setTimeout(() => { $('status').textContent = msg; }, 60);
  }

  /* ---------- Dialogs ---------- */
  let lastFocus = null;
  function openDialog(id) {
    const d = $(id);
    if (d.open) return;
    lastFocus = document.activeElement;
    d.showModal();
  }
  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
    d.addEventListener('close', () => {
      if (lastFocus && document.contains(lastFocus) && !document.querySelector('dialog[open]')) lastFocus.focus({ preventScroll: true });
    });
  });

  /* ---------- Categories ---------- */
  const counts = products.reduce((m, p) => (m[p.category] = (m[p.category] || 0) + 1, m), {});
  const cats = [ALL, ...CATALOG.categories.slice(1).filter(c => counts[c])];

  function renderCats() {
    $('cats').innerHTML = cats.map(c => `<button type="button" class="cat" data-c="${esc(c)}" aria-pressed="${c === cat}">${labelHtml(c)}${c === ALL ? '' : `<span class="c" aria-label="${counts[c]} מוצרים">${counts[c]}</span>`}</button>`).join('');
  }
  $('cats').addEventListener('click', e => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    const c = b.dataset.c;
    if (isAdult(c) && !adultOk) { pendingCat = c; openDialog('age'); return; }
    selectCat(c);
  });
  let pendingCat = null;
  $('ageYes').addEventListener('click', () => {
    adultOk = true;
    try { sessionStorage.setItem('age18', '1'); } catch {}
    $('age').close();
    if (pendingCat) selectCat(pendingCat);
    pendingCat = null;
  });

  function selectCat(c) {
    cat = c;
    renderCats();
    renderGrid(true);
    const bar = $('catbar');
    if (bar.getBoundingClientRect().top <= parseFloat(getComputedStyle(bar).top) + 1) {
      window.scrollTo({ top: window.scrollY + $('catalog').getBoundingClientRect().top - bar.offsetHeight - $('top').offsetHeight - 4 });
    }
    $('cats').querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /* ---------- Grid ---------- */
  function visible() {
    const q = norm(query);
    const words = q ? q.split(' ') : [];
    return products.filter(p => {
      if (cat !== ALL && p.category !== cat) return false;
      return words.every(w => p._s.includes(w));
    });
  }

  function buyHtml(p) {
    const tag = `<span class="tag${p.buy && hasPrice(p) ? '' : ' soft'}"><bdi>${esc(priceText(p))}</bdi></span>`;
    if (!canBuy(p)) return tag;
    const n = cart[p.id] || 0;
    const name = esc(p.name);
    if (!n) return `${tag}<button type="button" class="add" data-add="${p.id}" aria-label="הוספת ${name} לסל"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>`;
    return `${tag}<span class="step"><button type="button" data-dec="${p.id}" aria-label="הפחתת ${name}">−</button><output aria-label="כמות ${name}: ${n}">${n}</output><button type="button" data-add="${p.id}" aria-label="הוספת עוד ${name}"${n >= MAX_QTY ? ' disabled' : ''}>+</button></span>`;
  }

  function cardHtml(p) {
    const img = imgOf(p);
    return `<article class="card${cart[p.id] ? ' in' : ''}" data-id="${p.id}">
<div class="pic"><img src="${esc(img)}" alt="${img === 'fallback.svg' ? '' : esc(p.name)}" loading="lazy" decoding="async" width="640" height="480">${img === 'fallback.svg' ? '<span class="note">תמונה בקרוב</span>' : ''}</div>
<h3><bdi>${esc(p.name)}</bdi></h3><p class="meta">${esc(metaText(p))}</p>
<div class="buy">${buyHtml(p)}</div></article>`;
  }

  function renderGrid(speak) {
    const list = visible();
    const where = cat === ALL ? 'כל המוצרים' : label(cat);
    const text = query ? `${list.length} תוצאות ל״${query}״ ב${where}` : `${where}: ${list.length} מוצרים`;
    $('count').textContent = text;
    $('catalog').innerHTML = list.length ? list.map(cardHtml).join('') :
      `<div class="empty"><p>לא מצאנו מוצרים שמתאימים ל״${esc(query)}״${cat === ALL ? '' : ' בקטגוריה הזו'}.</p>${cat === ALL ? '' : '<button type="button" data-all>חיפוש בכל המוצרים</button>'}</div>`;
    if (speak) announce(text);
  }

  function refreshCard(id) {
    const card = $('catalog').querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!card) return;
    const p = byId.get(id);
    const hadFocus = card.contains(document.activeElement) ? (document.activeElement.dataset.dec ? 'dec' : 'add') : null;
    card.querySelector('.buy').innerHTML = buyHtml(p);
    card.classList.toggle('in', !!cart[id]);
    if (hadFocus) (card.querySelector(`[data-${hadFocus}]`) || card.querySelector('[data-add]'))?.focus();
  }

  $('catalog').addEventListener('click', e => {
    if (e.target.closest('[data-all]')) { selectCat(ALL); return; }
    const add = e.target.closest('[data-add]');
    const dec = e.target.closest('[data-dec]');
    if (add) change(add.dataset.add, 1);
    else if (dec) change(dec.dataset.dec, -1);
  });

  /* ---------- Search ---------- */
  let searchTimer;
  $('q').addEventListener('input', e => {
    if (e.isComposing) return;
    query = $('q').value.trim();
    $('searchBox').classList.toggle('has-q', !!$('q').value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderGrid(true), 120);
  });
  $('q').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('catalog').scrollIntoView({ block: 'start' }); }
  });
  $('clearQ').addEventListener('click', () => {
    $('q').value = '';
    query = '';
    $('searchBox').classList.remove('has-q');
    renderGrid(true);
    $('q').focus();
  });

  /* ---------- Cart ---------- */
  function lines() {
    return Object.entries(cart).map(([id, q]) => ({ p: byId.get(id), q })).filter(l => l.p);
  }
  function totals() {
    let sum = 0, items = 0, unpriced = 0;
    for (const { p, q } of lines()) {
      items += q;
      if (hasPrice(p)) sum += minor(p) * q; else unpriced += q;
    }
    return { sum, items, unpriced };
  }
  function save() {
    if (!store.set('allenbis-cart', cart)) announce('לא ניתן לשמור את הסל במכשיר הזה. הוא יישמר עד סגירת הדף.');
  }

  function change(id, delta, quiet) {
    const p = byId.get(id);
    if (!canBuy(p)) return;
    const before = cart[id] || 0;
    const after = Math.max(0, Math.min(MAX_QTY, before + delta));
    if (after === before) return;
    if (after) cart[id] = after; else delete cart[id];
    save();
    refreshCard(id);
    updateCartUi();
    if ($('cart').open) renderCart();
    if (!quiet) announce(after > before ? `${p.name} נוסף לסל. כמות: ${after}.` : after ? `כמות ${p.name}: ${after}.` : `${p.name} הוסר מהסל.`);
  }

  function updateCartUi() {
    const { sum, items } = totals();
    $('cartCount').textContent = items;
    $('cartSum').hidden = !items;
    $('cartSum').textContent = fmt(sum);
    $('cartLabel').textContent = `סל הקניות, ${items} פריטים`;
    document.body.classList.toggle('has-items', items > 0);
    $('barText').textContent = items === 1 ? 'פריט אחד בסל' : `${items} פריטים בסל`;
    $('barSum').textContent = fmt(sum);
  }

  function lineHtml(p, q, controls) {
    const price = hasPrice(p) ? fmt(minor(p) * q) : 'מחיר יעודכן';
    const unit = hasPrice(p) && q > 1 ? ` (${fmt(minor(p))} ליחידה)` : '';
    const ctl = controls ? `<span class="step"><button type="button" data-dec="${p.id}" aria-label="הפחתת ${esc(p.name)}">−</button><output aria-label="כמות: ${q}">${q}</output><button type="button" data-add="${p.id}" aria-label="הוספת עוד ${esc(p.name)}"${q >= MAX_QTY ? ' disabled' : ''}>+</button></span>` : `<b>×${q}</b>`;
    return `<div class="line" data-line="${p.id}"><img src="${esc(imgOf(p))}" alt="" loading="lazy" width="56" height="56"><div><div class="t"><bdi>${esc(p.name)}</bdi></div><div class="p"><bdi>${esc(price)}</bdi>${esc(unit)}</div></div>${ctl}</div>`;
  }

  function welcomeHint(sum) {
    const w = CFG.welcome;
    if (!w?.enabled) return '';
    const gap = (w.minimumOrderMinor || 0) - sum;
    return gap > 0
      ? `<div class="hint">עוד <bdi>${fmt(gap)}</bdi> ומקבלים <bdi>${fmt(w.amountMinor)}</bdi> הנחה בהזמנה הראשונה.</div>`
      : `<div class="hint">בהזמנה הראשונה: <bdi>${fmt(w.amountMinor)}</bdi> הנחת היכרות.</div>`;
  }

  function renderCart() {
    const ls = lines();
    const { sum, items, unpriced } = totals();
    if (!ls.length) {
      $('cartBody').innerHTML = `<div class="panel-empty"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9Z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg><p>הסל עדיין ריק.</p></div>`;
      $('cartFoot').innerHTML = `<button class="primary" type="button" data-close>לבחירת מוצרים</button>`;
      return;
    }
    const keep = document.activeElement?.closest?.('[data-line]') ? [document.activeElement.closest('[data-line]').dataset.line, document.activeElement.dataset.dec ? 'dec' : 'add'] : null;
    $('cartBody').innerHTML = ls.map(({ p, q }) => lineHtml(p, q, true)).join('');
    $('cartFoot').innerHTML = `<div class="totals">
<div class="row big"><span>סה״כ (${items} פריטים)</span><bdi>${fmt(sum)}</bdi></div>
${unpriced ? `<div class="muted">${unpriced === 1 ? 'למוצר אחד' : `ל-${unpriced} מוצרים`} בסל עדיין אין מחיר, והוא לא נכלל בסכום.</div>` : ''}
${welcomeHint(sum)}</div>
<button class="primary" type="button" id="checkout">להמשך הזמנה</button>
<button class="secondary" type="button" id="emptyCart">ריקון הסל</button>`;
    if (keep) {
      const row = $('cartBody').querySelector(`[data-line="${CSS.escape(keep[0])}"]`);
      (row?.querySelector(`[data-${keep[1]}]`) || row?.querySelector('[data-add]'))?.focus();
      if (!row) $('cartTitle').focus?.();
    }
  }

  $('cartBody').addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    const dec = e.target.closest('[data-dec]');
    if (add) change(add.dataset.add, 1);
    else if (dec) {
      const id = dec.dataset.dec;
      if (cart[id] === 1) {
        const row = dec.closest('.line');
        const next = row.nextElementSibling || row.previousElementSibling;
        change(id, -1);
        const target = next && $('cartBody').querySelector(`[data-line="${CSS.escape(next.dataset.line)}"] [data-dec]`);
        (target || $('cart').querySelector('.x')).focus();
      } else change(id, -1);
    }
  });
  $('cartFoot').addEventListener('click', e => {
    if (e.target.closest('#checkout')) { $('cart').close(); openDialog('notice'); }
    if (e.target.closest('#emptyCart')) {
      const ids = Object.keys(cart);
      ids.forEach(id => delete cart[id]);
      save();
      ids.forEach(refreshCard);
      updateCartUi();
      renderCart();
      $('cart').querySelector('.x').focus();
      announce('הסל רוקן.');
    }
  });
  const openCart = () => { renderCart(); openDialog('cart'); };
  $('openCart').addEventListener('click', openCart);
  $('bar').addEventListener('click', openCart);

  /* ---------- Budget basket ---------- */
  const B = CFG.budget || {};
  const pool = products.filter(p => canBuy(p) && hasPrice(p) && minor(p) > 0 && imgOf(p) !== 'fallback.svg' &&
    (!Array.isArray(B.categories) || B.categories.includes(p.category)));
  const cheapest = pool.reduce((m, p) => Math.min(m, minor(p)), Infinity);
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
      if (total + minor(p) <= limit) { picked.set(p.id, 1); total += minor(p); count++; }
    }
    let grew = true;
    while (grew && count < maxItems) {
      grew = false;
      for (const id of shuffle([...picked.keys()])) {
        const p = byId.get(id);
        if (count < maxItems && picked.get(id) < maxPer && total + minor(p) <= limit) {
          picked.set(id, picked.get(id) + 1); total += minor(p); count++; grew = true;
        }
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
      for (const { p, q } of basket.lines) change(p.id, q, true);
      $('basket').close();
      announce(`${basket.count} פריטים נוספו לסל.`);
      openCart();
    }
  });

  /* ---------- Perks & delivery stages ---------- */
  const icon = d => `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const perks = [`<li>${icon('<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17h4l3-7h4l1 7M9 8h3"/>')}<span><b>משלוח עד הבית</b><small>מעקב אחרי כל שלב בדרך</small></span></li>`];
  if (CFG.welcome?.enabled) perks.push(`<li>${icon('<path d="M20 12v8H4v-8M2 7h20v5H2zM12 20V7M12 7H8a2 2 0 1 1 2-3l2 3 2-3a2 2 0 1 1 2 3z"/>')}<span><b><bdi>${fmt(CFG.welcome.amountMinor)}</bdi> הנחה בהזמנה הראשונה</b><small>בהזמנה מעל <bdi>${fmt(CFG.welcome.minimumOrderMinor)}</bdi></small></span></li>`);
  if (CFG.referral?.enabled) perks.push(`<li>${icon('<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M17 8v6M14 11h6"/>')}<span><b>חבר מביא חבר</b><small><bdi>${fmt(CFG.referral.rewardMinor)}</bdi> לכל חבר שמזמין</small></span></li>`);
  $('perks').innerHTML = perks.join('');
  $('stages').innerHTML = (CFG.deliveryStages || []).map((s, i) => `<li><span>${i + 1}</span>${esc(s.label)}</li>`).join('');

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

  renderCats();
  renderGrid(false);
  updateCartUi();
})();
