/*
 * Store screen: new orders as they arrive (with a sound), one tap per status, sold-out items and prices.
 * Runs on admin.html, and in the demo also inside the site (the "store screen" button on the tracking screen).
 * Talks to the order system through api.js (window.ALLENBIS_API).
 */
(() => {
  'use strict';
  if (window.ALLENBIS_STORE_SCREEN) return;
  const API = window.ALLENBIS_API || null;
  const CATALOG = window.ALLENBIS_CATALOG || { products: [] };
  const byId = new Map(CATALOG.products.map(p => [p.id, p]));
  const money = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
  const fmt = minor => money.format((minor || 0) / 100).replace(/\.00(?=\D*$)/, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} } };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

  const STATUS = {
    received: { name: 'חדשה', next: 'accepted', act: 'אישור ההזמנה' },
    accepted: { name: 'אושרה', next: 'collecting', act: 'התחלנו לאסוף' },
    collecting: { name: 'באיסוף', next: 'on_the_way', act: 'יצאה לשליח' },
    on_the_way: { name: 'בדרך', next: 'delivered', act: 'נמסרה' },
    delivered: { name: 'נמסרה' },
    cancelled: { name: 'בוטלה' }
  };
  const OPEN = new Set(['received', 'accepted', 'collecting', 'on_the_way']);
  const BENEFIT = { welcome: 'הנחת היכרות', ref: 'הנחת חבר מביא חבר', credit: 'זיכוי חבר מביא חבר' };
  const ADULT = new Set(['אלכוהול 18+', 'אביזרי עישון', 'מידע בלבד']);

  const CSS = `
.ss{--ss-bg:#eef2f7;--ss-card:#fff;--ss-ink:#14203a;--ss-muted:#56627a;--ss-line:#d6deea;--ss-sign:#1b4396;--ss-soft:#e3eaf7;--ss-ok:#146c43;--ss-ok-soft:#e2f3ea;--ss-warn:#8a2a12;--ss-warn-soft:#fdeee8;--ss-new:#ffd84d;
  background:var(--ss-bg);color:var(--ss-ink);font-family:"Assistant",system-ui,-apple-system,"Segoe UI",Arial,sans-serif;min-height:100%;direction:rtl;text-align:right}
.ss *{box-sizing:border-box}
:where(.ss) button,:where(.ss) input{font:inherit;color:inherit}
.ss button{cursor:pointer}
.ss-top{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:12px 16px;background:var(--ss-sign);color:#fff}
.ss-top h1{margin:0;font:400 1.25rem/1.2 "Secular One","Assistant",sans-serif;flex:1;min-width:140px}
.ss-top h1 small{display:block;font:600 .8125rem/1.3 "Assistant",sans-serif;opacity:.8}
.ss-top .ss-demo{background:#ffd84d;color:#2b2100;border-radius:6px;padding:0 6px;font-size:.75rem;font-weight:800;margin-inline-start:6px;vertical-align:middle}
.ss-tool{border:1.5px solid rgba(255,255,255,.45);background:transparent;color:#fff;border-radius:999px;min-height:40px;padding:0 14px;font-weight:700}
.ss-tool[aria-pressed="true"]{background:#fff;color:var(--ss-sign);border-color:#fff}
.ss-body{padding:14px 16px 40px;max-width:980px;margin:0 auto}
.ss-tabs{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.ss-tab{border:1.5px solid var(--ss-line);background:var(--ss-card);border-radius:999px;min-height:40px;padding:0 16px;font-weight:700}
.ss-tab[aria-pressed="true"]{background:var(--ss-ink);color:#fff;border-color:var(--ss-ink)}
.ss-tab b{display:inline-block;min-width:22px;border-radius:999px;background:var(--ss-new);color:#2b2100;margin-inline-start:6px;padding:0 6px;font-size:.8125rem}
.ss-list{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.ss-empty{background:var(--ss-card);border-radius:16px;padding:28px 16px;text-align:center;color:var(--ss-muted)}
.ss-o{background:var(--ss-card);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px;border:2px solid transparent}
.ss-o.new{border-color:var(--ss-new);box-shadow:0 0 0 4px rgba(255,216,77,.35)}
.ss-o.flash{animation:ss-flash 1s ease-out 3}
@keyframes ss-flash{50%{box-shadow:0 0 0 10px rgba(255,216,77,.6)}}
@media (prefers-reduced-motion:reduce){.ss-o.flash{animation:none}}
.ss-o header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ss-id{font:800 1.125rem/1 ui-monospace,Menlo,monospace;letter-spacing:.04em;direction:ltr}
.ss-time{color:var(--ss-muted);font-size:.875rem}
.ss-pill{margin-inline-start:auto;border-radius:999px;padding:2px 10px;font-weight:800;font-size:.8125rem;background:var(--ss-soft);color:var(--ss-sign)}
.ss-pill.received{background:var(--ss-new);color:#2b2100}
.ss-pill.delivered{background:var(--ss-ok-soft);color:var(--ss-ok)}
.ss-pill.cancelled{background:var(--ss-warn-soft);color:var(--ss-warn)}
.ss-who{font-weight:800;font-size:1.0625rem}
.ss-links{display:flex;gap:8px;flex-wrap:wrap}
.ss-links a{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border-radius:999px;background:var(--ss-soft);color:var(--ss-sign);font-weight:700;text-decoration:none}
.ss-addr{margin:0;line-height:1.45}
.ss-note{margin:0;background:var(--ss-soft);border-radius:10px;padding:6px 10px;font-size:.9375rem}
.ss-flags{display:flex;gap:6px;flex-wrap:wrap}
.ss-flag{border-radius:6px;padding:1px 8px;font-size:.8125rem;font-weight:800;background:var(--ss-warn-soft);color:var(--ss-warn)}
.ss-items{margin:0;padding:0;list-style:none;border-top:1px solid var(--ss-line);border-bottom:1px solid var(--ss-line);padding-block:6px}
.ss-items li{display:flex;gap:8px;padding:3px 0}
.ss-items li b{min-width:30px}
.ss-items li small{color:var(--ss-muted)}
.ss-sum{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-weight:800}
.ss-sum span{font-weight:600;color:var(--ss-muted)}
.ss-o details{font-size:.875rem;color:var(--ss-muted)}
.ss-o details pre{white-space:pre-wrap;font:inherit;margin:6px 0 0;color:var(--ss-ink)}
.ss-acts{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:2px}
.ss-go{border:0;background:var(--ss-sign);color:#fff;border-radius:12px;min-height:48px;font-weight:800;font-size:1.0625rem}
.ss-o.new .ss-go{background:#e4002b}
.ss-x{border:1.5px solid var(--ss-line);background:var(--ss-card);border-radius:12px;min-height:48px;padding:0 14px;font-weight:700;color:var(--ss-warn)}
.ss-go:disabled,.ss-x:disabled{opacity:.55}
.ss-login{max-width:360px;margin:8vh auto;background:var(--ss-card);border-radius:20px;padding:22px;display:grid;gap:12px}
.ss-login h2{margin:0;font:400 1.375rem/1.2 "Secular One","Assistant",sans-serif}
.ss-login input,.ss-search{border:1.5px solid var(--ss-line);border-radius:12px;min-height:48px;padding:0 14px;background:var(--ss-card);width:100%;font-size:1.125rem}
.ss-login input{letter-spacing:.3em;text-align:center;direction:ltr}
.ss-hint{margin:0;color:var(--ss-muted);font-size:.9375rem}
.ss-err{margin:0;color:var(--ss-warn);font-weight:700;min-height:1.4em}
.ss-st{display:grid;gap:8px}
.ss-st h3{margin:12px 0 2px;font-size:1rem}
.ss-row{background:var(--ss-card);border-radius:14px;padding:10px 12px;display:grid;grid-template-columns:1fr auto;gap:8px 12px;align-items:center}
.ss-row.changed{box-shadow:inset 3px 0 0 var(--ss-sign)}
.ss-row .nm{font-weight:700}
.ss-row .nm small{display:block;font-weight:500;color:var(--ss-muted)}
.ss-row form{display:flex;gap:8px;align-items:center;flex-wrap:wrap;grid-column:1/-1}
.ss-row label{display:inline-flex;align-items:center;gap:6px;min-height:40px;font-weight:700}
.ss-row input[type=checkbox]{width:20px;height:20px}
.ss-row input[type=number]{width:110px;border:1.5px solid var(--ss-line);border-radius:10px;min-height:40px;padding:0 10px;direction:ltr;background:var(--ss-card)}
.ss-row button{border:0;background:var(--ss-sign);color:#fff;border-radius:10px;min-height:40px;padding:0 14px;font-weight:700}
.ss-row button.reset{background:transparent;color:var(--ss-sign);border:1.5px solid var(--ss-line)}
.ss-row .was{color:var(--ss-muted);font-size:.875rem}
.ss :focus-visible{outline:3px solid #ffbf00;outline-offset:2px}
@media (prefers-color-scheme:dark){.ss.standalone{--ss-bg:#0a0f1e;--ss-card:#131b31;--ss-ink:#eaf0ff;--ss-muted:#9ba9c6;--ss-line:#28334f;--ss-soft:#1c2a52;--ss-ok-soft:#123a2a;--ss-ok:#7fdcaa;--ss-warn-soft:#3a1d14;--ss-warn:#ffb59c}
  .ss.standalone .ss-tab[aria-pressed="true"]{background:#ffd84d;color:#14203a;border-color:#ffd84d}
  .ss.standalone .ss-links a{color:#8fb4ff}}`;

  let root = null, pin = null, tab = 'orders', filter = 'open', orders = [], stock = {}, seen = null, unwatch = null, clock = null, q = '', embedded = false;
  let sound = ls.get('allenbis-store-sound') !== '0';
  let lastSig = '';
  const baseTitle = document.title;
  const demo = API?.mode === 'local';

  /* ---------- sound for a new order ---------- */
  let ctx = null;
  const unlockAudio = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch {} };
  function ding() {
    if (!sound || !ctx) return;
    const t0 = ctx.currentTime;
    [[880, 0], [1320, 0.18], [880, 0.5], [1320, 0.68]].forEach(([f, at]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(0.35, t0 + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.16);
      o.connect(g).connect(ctx.destination); o.start(t0 + at); o.stop(t0 + at + 0.18);
    });
  }

  const ago = t => {
    const m = Math.floor((Date.now() - t) / 60000);
    const hhmm = new Date(t).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
    return `${hhmm} · ${m < 1 ? 'עכשיו' : m < 60 ? `לפני ${m} דק׳` : `לפני ${Math.floor(m / 60)} שע׳`}`;
  };
  const intlPhone = p => String(p || '').replace(/\D/g, '').replace(/^0/, '972');

  function shell(inner) {
    root.innerHTML = `<div class="ss${embedded ? '' : ' standalone'}">
<div class="ss-top"><h1>מסך החנות${demo ? '<span class="ss-demo">הדגמה</span>' : ''}<small>אלנביס · הזמנות ומלאי</small></h1>
${pin ? `<button type="button" class="ss-tool" data-sound aria-pressed="${sound}">${sound ? 'צליל פועל' : 'צליל כבוי'}</button>${embedded ? '' : '<button type="button" class="ss-tool" data-logout>יציאה</button>'}` : ''}${embedded ? '<button type="button" class="ss-tool" data-close>חזרה לאתר</button>' : ''}</div>
<div class="ss-body">${inner}</div></div>`;
  }

  function login(err) {
    stop();
    if (!API) { shell('<div class="ss-login"><h2>מערכת ההזמנות לא מוגדרת</h2><p class="ss-hint">כדי שהזמנות יגיעו למסך הזה, צריך להגדיר את מערכת ההזמנות (order.api בקובץ demo-data.js). ההסבר המלא נמצא ב-HANDOFF.md.</p></div>'); return; }
    shell(`<form class="ss-login" id="ssLogin"><h2>כניסה למסך החנות</h2>
<label for="ssPin" class="ss-hint">קוד החנות</label><input id="ssPin" type="password" inputmode="numeric" autocomplete="current-password" required>
<p class="ss-err" role="alert">${esc(err || '')}</p>
${demo ? `<p class="ss-hint">הדגמה: הקוד הוא <b dir="ltr">${API.demoPin}</b>. ההזמנות כאן הן אלה שנשלחו מהאתר בדפדפן הזה.</p>` : ''}
<button type="submit" class="ss-go">כניסה</button></form>`);
    root.querySelector('#ssPin').focus();
  }

  async function enter(p) {
    pin = p;
    try {
      const [o, s] = await Promise.all([API.admin(p).orders(), API.admin(p).stock()]);
      ss.set('allenbis-store-pin', p);
      orders = o; stock = s || {};
      seen = new Set(orders.map(x => x.id));
      lastSig = sig();
      render();
      unwatch = API.watch(refresh, demo ? 3000 : 10000);
      clock = setInterval(() => { if (tab === 'orders') renderOrders(); }, 30000);
    } catch (e) {
      pin = null; ss.set('allenbis-store-pin', null);
      login(e.status === 401 ? 'הקוד לא נכון.' : e.status === 503 ? 'קוד החנות (STORE_PIN) עוד לא הוגדר בשרת.' : 'אין חיבור למערכת ההזמנות. נסו שוב בעוד רגע.');
    }
  }
  function stop() { unwatch?.(); unwatch = null; clearInterval(clock); clock = null; }
  const sig = () => JSON.stringify(orders.map(o => [o.id, o.status, o.updated_at]));

  async function refresh() {
    if (!pin) return;
    let o;
    try { o = await API.admin(pin).orders(); } catch (e) { if (e.status === 401) login('צריך להיכנס שוב.'); return; }
    orders = o;
    const fresh = orders.filter(x => !seen.has(x.id));
    fresh.forEach(x => seen.add(x.id));
    if (sig() === lastSig) return;
    lastSig = sig();
    if (fresh.some(x => x.status === 'received')) { ding(); if (tab !== 'orders' || filter !== 'open') { tab = 'orders'; filter = 'open'; render(); } }
    if (tab === 'orders') renderOrders(new Set(fresh.map(x => x.id)));
    else renderTabs();
    setTitle();
  }
  function setTitle() {
    if (embedded) return;
    const n = orders.filter(o => o.status === 'received').length;
    document.title = n ? `(${n}) הזמנה חדשה · ${baseTitle}` : baseTitle;
  }

  function tabsHtml() {
    const open = orders.filter(o => OPEN.has(o.status)).length, nw = orders.filter(o => o.status === 'received').length;
    return `<div class="ss-tabs" role="group" aria-label="תצוגה">
<button type="button" class="ss-tab" data-tab="orders" data-filter="open" aria-pressed="${tab === 'orders' && filter === 'open'}">פתוחות (${open})${nw ? `<b aria-label="${nw} חדשות">${nw}</b>` : ''}</button>
<button type="button" class="ss-tab" data-tab="orders" data-filter="done" aria-pressed="${tab === 'orders' && filter === 'done'}">הסתיימו</button>
<button type="button" class="ss-tab" data-tab="stock" aria-pressed="${tab === 'stock'}">מלאי ומחירים</button></div>`;
  }
  function render() {
    shell(`${tabsHtml()}<div id="ssMain"></div>`);
    if (tab === 'orders') renderOrders(); else renderStock();
    setTitle();
  }
  function renderTabs() { const t = root.querySelector('.ss-tabs'); if (t) t.outerHTML = tabsHtml(); }

  function orderHtml(o, flash) {
    const st = STATUS[o.status] || { name: o.status };
    const lines = (o.lines || []).map(([id, q]) => { const p = byId.get(id); return `<li><b>${q}×</b><span>${esc(p ? p.name : id)}${p?.size ? ` <small>${esc(p.size)}</small>` : ''}</span></li>`; }).join('');
    const flags = [];
    if ((o.lines || []).some(([id]) => ADULT.has(byId.get(id)?.category))) flags.push('18+ · לבדוק תעודה');
    if (/לבדיקה: הרחוב לא ברשימת/.test(o.summary || '')) flags.push('לבדוק כתובת: מחוץ לרשימה');
    if (o.lang === 'en') flags.push('הלקוח הזמין באנגלית');
    const gift = (o.summary || '').match(/^מתנה מגלגל המזל: .*$/m);
    return `<article class="ss-o${o.status === 'received' ? ' new' : ''}${flash ? ' flash' : ''}" data-id="${esc(o.id)}" aria-labelledby="ss-${esc(o.id)}">
<header><span class="ss-id" id="ss-${esc(o.id)}">${esc(o.id)}</span><span class="ss-time">${ago(o.created_at)}</span><span class="ss-pill ${esc(o.status)}">${esc(st.name)}</span></header>
<div class="ss-who">${esc(o.name)}</div>
<div class="ss-links"><a href="tel:${esc(String(o.phone).replace(/[^\d+]/g, ''))}" dir="ltr">${esc(String(o.phone).replace(/^(0\d{1,2})(\d{7})$/, '$1-$2'))}</a><a href="https://wa.me/${intlPhone(o.phone)}" target="_blank" rel="noopener">וואטסאפ</a></div>
<p class="ss-addr">${esc(o.street)}${o.apt ? `, ${esc(o.apt)}` : ''}</p>
${o.note ? `<p class="ss-note">הערה: ${esc(o.note)}</p>` : ''}
${flags.length ? `<div class="ss-flags">${flags.map(f => `<span class="ss-flag">${esc(f)}</span>`).join('')}</div>` : ''}
<ul class="ss-items">${lines}${gift ? `<li><b>1×</b><span>${esc(gift[0])}</span></li>` : ''}</ul>
<div class="ss-sum">${o.items} פריטים · ${fmt(o.total)}<span>${esc(o.pay || '')}</span></div>
${o.benefit ? `<div class="ss-hint">כולל ${esc(BENEFIT[o.benefit] || o.benefit)}: −${fmt(o.benefit_amount)}</div>` : ''}
${o.summary ? `<details><summary>ההודעה המלאה מהלקוח</summary><pre>${esc(o.summary)}</pre></details>` : ''}
${st.next ? `<div class="ss-acts"><button type="button" class="ss-go" data-set="${st.next}">${esc(st.act)}</button><button type="button" class="ss-x" data-set="cancelled">ביטול</button></div>` : ''}</article>`;
  }
  function renderOrders(flash = new Set()) {
    const main = root.querySelector('#ssMain');
    if (!main) return;
    renderTabs();
    const list = filter === 'open'
      ? orders.filter(o => OPEN.has(o.status)).sort((a, b) => a.created_at - b.created_at)
      : orders.filter(o => !OPEN.has(o.status)).sort((a, b) => b.updated_at - a.updated_at);
    const focusId = document.activeElement?.closest?.('.ss-o')?.dataset.id;
    const openIds = [...main.querySelectorAll('.ss-o details[open]')].map(d => d.closest('.ss-o').dataset.id);
    main.innerHTML = list.length ? `<div class="ss-list">${list.map(o => orderHtml(o, flash.has(o.id))).join('')}</div>`
      : `<p class="ss-empty">${filter === 'open' ? 'אין הזמנות פתוחות. הזמנה חדשה תופיע כאן מיד, עם צליל.' : 'עוד אין הזמנות שהסתיימו.'}</p>`;
    openIds.forEach(id => { const d = main.querySelector(`.ss-o[data-id="${CSS.escape(id)}"] details`); if (d) d.open = true; });
    if (focusId) main.querySelector(`.ss-o[data-id="${CSS.escape(focusId)}"] button`)?.focus();
  }

  /* ---------- stock and prices ---------- */
  const priceOf = p => Number.isFinite(p.price) ? Math.round(p.price * 100) : null;
  function rowHtml(p) {
    const s = stock[p.id] || {};
    const base = priceOf(p);
    const price = s.price ?? base;
    return `<div class="ss-row${stock[p.id] ? ' changed' : ''}"><div class="nm">${esc(p.name)}<small>${esc([p.size, p.category].filter(Boolean).join(' · '))}</small></div>
<div class="was">${base != null ? `באתר: ${fmt(base)}` : 'בלי מחיר באתר'}</div>
<form data-stock="${p.id}"><label><input type="checkbox" name="oos"${s.oos ? ' checked' : ''}> אזל</label>
<label>מחיר ₪ <input type="number" name="price" min="0.1" step="0.1" inputmode="decimal" value="${price != null ? (price / 100).toFixed(2).replace(/\.00$/, '') : ''}" aria-label="מחיר בשקלים, ${esc(p.name)}"></label>
<button type="submit">שמירה</button>${stock[p.id] ? '<button type="button" class="reset" data-reset>חזרה למקור</button>' : ''}</form></div>`;
  }
  function renderStock() {
    const main = root.querySelector('#ssMain');
    main.innerHTML = `<div class="ss-st"><p class="ss-hint">מה שמסמנים כאן מופיע באתר תוך דקה: מוצר שאזל לא ניתן להוספה לסל, ומחיר חדש מחליף את המחיר באתר.</p>
<input class="ss-search" id="ssQ" type="search" placeholder="חיפוש מוצר" aria-label="חיפוש מוצר" value="${esc(q)}"><div id="ssRows"></div></div>`;
    renderRows();
  }
  function renderRows() {
    const box = root.querySelector('#ssRows');
    if (!box) return;
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const all = CATALOG.products.filter(p => p.active !== false && p.buy);
    const changed = all.filter(p => stock[p.id]);
    const hits = words.length ? all.filter(p => { const t = `${p.name} ${p.sub || ''} ${p.category} ${p.size || ''}`.toLowerCase(); return words.every(w => t.includes(w)); }) : [];
    box.innerHTML = (changed.length && !words.length ? `<h3>שינויים פעילים (${changed.length})</h3>${changed.map(rowHtml).join('')}` : '')
      + (words.length ? (hits.length ? hits.slice(0, 40).map(rowHtml).join('') : '<p class="ss-empty">לא נמצא מוצר.</p>')
        : `<p class="ss-empty">${changed.length ? 'כדי לשנות מוצר נוסף, חפשו אותו.' : 'חפשו מוצר כדי לסמן שאזל או לשנות מחיר.'}</p>`);
  }

  function onClick(e) {
    unlockAudio();
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.dataset.sound !== undefined) { sound = !sound; ls.set('allenbis-store-sound', sound ? '1' : '0'); b.setAttribute('aria-pressed', String(sound)); b.textContent = sound ? 'צליל פועל' : 'צליל כבוי'; if (sound) ding(); return; }
    if (b.dataset.logout !== undefined) { pin = null; ss.set('allenbis-store-pin', null); setTitle(); login(); return; }
    if (b.dataset.tab) { tab = b.dataset.tab; if (b.dataset.filter) filter = b.dataset.filter; render(); root.querySelector(`.ss-tab[aria-pressed="true"]`)?.focus(); return; }
    if (b.dataset.set) {
      const id = b.closest('.ss-o').dataset.id, to = b.dataset.set;
      if (to === 'cancelled' && !confirm(`לבטל את הזמנה ${id}? הלקוח יראה שההזמנה בוטלה.`)) return;
      b.closest('.ss-acts').querySelectorAll('button').forEach(x => { x.disabled = true; });
      API.admin(pin).setStatus(id, to).then(() => { const o = orders.find(x => x.id === id); if (o) { o.status = to; o.updated_at = Date.now(); } lastSig = sig(); renderOrders(); setTitle(); })
        .catch(() => { alert('לא הצלחנו לעדכן. בדקו את החיבור ונסו שוב.'); renderOrders(); });
      return;
    }
    if (b.dataset.reset !== undefined) saveStock(b.closest('form').dataset.stock, false, null);
  }
  function saveStock(id, oos, price) {
    API.admin(pin).setStock(id, oos, price).then(() => {
      if (!oos && !price) delete stock[id]; else stock[id] = { oos, price };
      renderRows();
    }).catch(() => alert('לא הצלחנו לשמור. נסו שוב.'));
  }
  function onSubmit(e) {
    e.preventDefault();
    unlockAudio();
    if (e.target.id === 'ssLogin') { const v = e.target.querySelector('#ssPin').value.trim(); if (v) enter(v); return; }
    const id = e.target.dataset.stock;
    if (!id) return;
    const p = byId.get(id);
    const oos = e.target.oos.checked;
    const typed = Math.round(parseFloat(e.target.price.value) * 100);
    const price = Number.isFinite(typed) && typed > 0 && typed !== priceOf(p) ? typed : null;
    saveStock(id, oos, price);
  }
  function onInput(e) { if (e.target.id === 'ssQ') { q = e.target.value; renderRows(); } }

  window.ALLENBIS_STORE_SCREEN = {
    mount(el, opts = {}) {
      if (root) this.unmount();
      root = el; embedded = !!opts.embedded;
      if (!document.getElementById('ss-css')) { const st = document.createElement('style'); st.id = 'ss-css'; st.textContent = CSS; document.head.append(st); }
      root.addEventListener('click', onClick);
      root.addEventListener('submit', onSubmit);
      root.addEventListener('input', onInput);
      const saved = ss.get('allenbis-store-pin') || (embedded && demo ? API.demoPin : null);
      if (API && saved) { shell('<p class="ss-empty">טוען הזמנות…</p>'); enter(saved); } else login();
    },
    unmount() {
      stop();
      if (!root) return;
      root.removeEventListener('click', onClick);
      root.removeEventListener('submit', onSubmit);
      root.removeEventListener('input', onInput);
      root.innerHTML = '';
      root = null;
      if (!embedded) document.title = baseTitle;
    }
  };
})();
