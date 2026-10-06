/*
 * The order system, as seen from the pages (store and store screen).
 * With order.api set in demo-data.js (e.g. "/api") it talks to the Cloudflare function in functions/api.
 * Without it, while order.example is true (the demo), the same calls run on this browser's storage: the store screen
 * opened in this browser sees the orders, so the whole flow can be tried without a server.
 * With neither, ALLENBIS_API is null and the site sends orders on WhatsApp only.
 */
(() => {
  'use strict';
  const CFG = (window.ALLENBIS_DEMO || {}).order || {};
  const BASE = typeof CFG.api === 'string' && CFG.api ? CFG.api.replace(/\/$/, '') : '';
  const REF = (window.ALLENBIS_COMMERCE_CONFIG || {}).referral || {};
  const REF_REWARD = REF.rewardMinor || 2500, REF_MIN = REF.minimumOrderMinor || 0;
  const WELCOME = { amount: ((window.ALLENBIS_COMMERCE_CONFIG || {}).welcome || {}).amountMinor || 2000, min: ((window.ALLENBIS_COMMERCE_CONFIG || {}).welcome || {}).minimumOrderMinor || 0 };
  const DEMO_PIN = '1234';
  const STATUSES = ['received', 'accepted', 'collecting', 'on_the_way', 'delivered', 'cancelled'];

  /* ---------- server mode ---------- */
  async function call(path, opts = {}) {
    const res = await fetch(BASE + path, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || `http ${res.status}`); e.status = res.status; throw e; }
    return data;
  }
  const server = {
    mode: 'server',
    createOrder: o => call('/orders', { method: 'POST', body: JSON.stringify(o) }),
    getOrder: (id, token) => call(`/orders/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`),
    credit: code => call(`/credit?code=${encodeURIComponent(code)}`).then(r => r.credit || 0),
    stock: () => call('/stock'),
    admin: pin => {
      const h = { headers: { 'x-store-pin': pin } };
      return {
        orders: since => call(`/admin/orders${since ? `?since=${since}` : ''}`, h),
        setStatus: (id, status) => call(`/admin/orders/${encodeURIComponent(id)}`, { ...h, method: 'POST', body: JSON.stringify({ status }) }),
        stock: () => call('/admin/stock', h),
        setStock: (id, oos, price) => call('/admin/stock', { ...h, method: 'POST', body: JSON.stringify({ id, oos, price }) })
      };
    },
    // the server tells us about changes when we ask again
    watch: (fn, ms = 10000) => { const t = setInterval(fn, ms); return () => clearInterval(t); }
  };

  /* ---------- demo mode: the same rules, on this browser's storage ---------- */
  const K = { orders: 'allenbis-demo-orders', refs: 'allenbis-demo-refs', stock: 'allenbis-demo-stock' };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} dispatchEvent(new Event('allenbis-demo-change')); };
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randCode = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => ALPHA[x % ALPHA.length]).join('');
  const later = v => new Promise(r => setTimeout(() => r(v), 150));
  const fail = (msg, status) => { const e = new Error(msg); e.status = status; return Promise.reject(e); };
  const local = {
    mode: 'local',
    demoPin: DEMO_PIN,
    createOrder(o) {
      const orders = read(K.orders, []), refs = read(K.refs, {});
      const phone = String(o.phone || '').replace(/[\s-]/g, '');
      const previous = orders.some(x => x.phone === phone && x.status !== 'cancelled');
      let benefit = null, benefitAmount = 0, refCode = null;
      const want = o.benefit;
      if (want && want.amount > 0) {
        const ref = refs[String(want.code || '').toUpperCase()];
        if (want.kind === 'ref' && ref && ref.phone !== phone && !previous && (o.total || 0) + want.amount >= REF_MIN) { benefit = 'ref'; benefitAmount = Math.min(want.amount, REF_REWARD); refCode = String(want.code).toUpperCase(); }
        else if (want.kind === 'credit' && ref && ref.phone === phone && ref.credit > 0) { benefit = 'credit'; benefitAmount = Math.min(want.amount, ref.credit); ref.credit -= benefitAmount; }
        else if (want.kind === 'welcome' && !previous && (o.total || 0) + want.amount >= WELCOME.min) { benefit = 'welcome'; benefitAmount = Math.min(want.amount, WELCOME.amount); }
      }
      const rejected = want && want.amount > 0 ? want.amount - benefitAmount : 0;
      const now = Date.now();
      const order = { id: randCode(5), token: randCode(16), created_at: now, updated_at: now, status: 'received', name: o.name, phone, street: o.street, apt: o.apt, note: o.note, pay: o.pay, lang: o.lang,
        items: o.lines.reduce((n, l) => n + l[1], 0), total: (o.total || 0) + rejected, lines: o.lines, summary: o.summary, benefit, benefit_amount: benefitAmount, ref_code: refCode, ref_paid: 0 };
      orders.unshift(order);
      let mine = Object.keys(refs).find(c => refs[c].phone === phone);
      if (!mine) { mine = randCode(6); refs[mine] = { phone, credit: 0, earned: 0 }; }
      write(K.orders, orders.slice(0, 200)); write(K.refs, refs);
      return later({ id: order.id, token: order.token, myCode: mine, benefit, benefitAmount, rejected, total: order.total });
    },
    getOrder(id, token) {
      const o = read(K.orders, []).find(x => x.id === id && x.token === token);
      return o ? later({ id: o.id, status: o.status, createdAt: o.created_at, updatedAt: o.updated_at }) : fail('not found', 404);
    },
    credit: code => later((read(K.refs, {})[String(code || '').toUpperCase()] || {}).credit || 0),
    stock: () => later(read(K.stock, {})),
    admin(pin) {
      const ok = () => pin === DEMO_PIN ? null : fail('wrong pin', 401);
      return {
        orders: () => ok() || later(read(K.orders, []).map(({ token, ...o }) => o)),
        setStatus(id, status) {
          if (ok()) return ok();
          if (!STATUSES.includes(status)) return fail('bad status', 400);
          const orders = read(K.orders, []), refs = read(K.refs, {});
          const o = orders.find(x => x.id === id);
          if (!o) return fail('not found', 404);
          o.status = status; o.updated_at = Date.now();
          if (status === 'delivered' && o.ref_code && !o.ref_paid && refs[o.ref_code]) { refs[o.ref_code].credit += REF_REWARD; refs[o.ref_code].earned += REF_REWARD; o.ref_paid = 1; }
          write(K.orders, orders); write(K.refs, refs);
          return later({ ok: true });
        },
        stock: () => ok() || later(read(K.stock, {})),
        setStock(id, oos, price) {
          if (ok()) return ok();
          const s = read(K.stock, {});
          if (!oos && !price) delete s[id]; else s[id] = { oos: !!oos, price: price || null };
          write(K.stock, s);
          return later({ ok: true });
        }
      };
    },
    // this page and other tabs of this browser hear about changes at once; a slow check covers the rest
    watch(fn, ms = 4000) {
      const onStore = e => { if (Object.values(K).includes(e.key)) fn(); };
      addEventListener('storage', onStore);
      addEventListener('allenbis-demo-change', fn);
      const t = setInterval(fn, ms);
      return () => { removeEventListener('storage', onStore); removeEventListener('allenbis-demo-change', fn); clearInterval(t); };
    }
  };

  window.ALLENBIS_API = BASE ? server : CFG.example ? local : null;
  if (window.ALLENBIS_API) window.ALLENBIS_API.STATUSES = STATUSES;
})();
